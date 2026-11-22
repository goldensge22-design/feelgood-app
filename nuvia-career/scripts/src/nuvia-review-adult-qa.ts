import assert from 'node:assert/strict';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium,type Page } from 'playwright';
const origin=process.env.NUVIA_TEST_ORIGIN ?? 'http://localhost:80';
const base=`${origin}/demo/review`;
const out=resolve(import.meta.dirname,'../../generated-artifacts',process.env.NUVIA_REVIEW_QA_DIR ?? 'nuvia-review-adult-qa');
const began=new Date().toISOString();
const tag=(p:Page,id:string)=>p.getByTestId(id);
const errors:string[]=[];
const results:{width:number;stage:string;status:'PASS'|'FAIL'|'BLOCKED';detail?:string}[]=[];
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/repl/tools/bin/chromium',args:['--no-sandbox']});
const aText='[생각 노트 A] 익숙한 길을 골랐습니다.\n먼저 약속 시간을 살펴보고 싶었습니다.';
const bText='[생각 노트 B] 준비물: 열쇠, 물병, 수첩.\n목록을 다시 보니 우산도 확인해야겠습니다.';
const own='[사용자 원문] 나는 신중하게 정보를 비교합니다.';
const privateMark='[저장하지 않은 활동지 문구] 제출에는 포함하지 않음';
const freeText='[직접 기록] 책상 위에 읽을 책을 두고 짧게 오늘의 메모를 적었습니다.';
const alive=(p:Page,id:string)=>tag(p,id).waitFor({timeout:10000});
const eq=async(p:Page,id:string,v:string)=>assert.equal(await tag(p,id).inputValue(),v);
const fit=async(p:Page)=>assert(await p.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth),p.url());
async function run(width:number,stage:string,f:()=>Promise<void>) {
  try {await f();results.push({width,stage,status:'PASS'});console.log('PASS',width,stage);}
  catch(e){results.push({width,stage,status:'FAIL',detail:String(e)});console.error('FAIL',width,stage,String(e));throw e;}
}
const click=(p:Page,id:string)=>tag(p,id).click({timeout:9000});
const section=(p:Page,i:number)=>tag(p,`input-section-${i}`);
async function match(p:Page) {
  await alive(p,'checkbox-review-link');
  if (!(await tag(p,'checkbox-review-link').isDisabled())) {
    await tag(p,'checkbox-review-link').check();
    await click(p,'button-review-confirm-link');
  }
}
async function getWorksheet(p:Page,alt=false) {
  await click(p,'link-review-to-activity');
  if(await tag(p,'button-review-generate-plans').isVisible())await click(p,'button-review-generate-plans');
  await p.getByTestId(/^option-review-activity-/).nth(alt?1:0).click();
  await click(p,'button-review-open-worksheet');
  await alive(p,'input-worksheet-before');
}
async function record(p:Page,text:string='') {
  if(text)await tag(p,'input-worksheet-before').fill(text);
  await tag(p,'button-review-register').evaluate((b:HTMLButtonElement)=>{b.click();b.click();});
  await click(p,'link-review-planner-card');
  const id=p.url().split('?')[0].split('/').at(-1)!;
  assert.match(id,/^review-card-/);
  if(text){
    assert.equal(await tag(p,'input-review-note-action').inputValue(),'');
    await click(p,'button-review-bring-thought');
    await eq(p,'input-review-note-action',text);
    await p.reload();
    await eq(p,'input-review-note-action',text);
    if(text===aText)await tag(p,'input-review-note-learning').fill('시간만 보지 않고 길을 찾기 쉬운지도 살펴보겠다고 적었습니다.');
    await click(p,'button-review-save-note');
  }
  return id;
}
async function file(p:Page,fmt:string,suffix='') {
  await click(p,`option-format-${fmt}`);
  const event=p.waitForEvent('download',{timeout:25000});
  await tag(p,'button-download').evaluate((b:HTMLButtonElement)=>{b.click();b.click();});
  const d=await event.catch(async e=>{const feedback=tag(p,'status-review-export-feedback');
    throw Error(`${fmt}: ${await feedback.count()?await feedback.innerText():String(e)}`);});
  assert(d.suggestedFilename().endsWith(`.${fmt}`));
  await d.saveAs(`${out}/review-${p.viewportSize()!.width}${suffix}.${fmt}`);
  return d;
}
for(const width of [360,768,1440]){
  const ctx=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
  const p=await ctx.newPage();
  p.setDefaultTimeout(10000);
  p.on('dialog',d=>void d.accept());
  p.on('pageerror',e=>errors.push(`${width}: ${e.message}`));
  let idA='',idB='',idPlan='',idFree='',idFree2='';
  try {
    await run(width,'MY NUVIA layout and supplied scores, five synthetic jobs, LAB search and in-LAB help',async()=>{
      assert.equal((await p.goto(`${base}?lang=ko`))?.status(),200);
      await alive(p,'text-review-start-flow');
      assert.equal(await tag(p,'header-review').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');
      assert.equal(await p.getByText('나를 이해한 결과에서').count(),0);
      await click(p,'button-review-start');
      await alive(p,'card-review-home-profile');
      assert.equal(await p.getByRole('heading',{name:'MY NUVIA',exact:true}).count(),1);
      assert.equal(await tag(p,'header-review').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');
      assert.equal(await tag(p,'badge-review-profile-synthetic').innerText(),'가상 예시 · 실제 검사 결과 아님');
      assert.match(await tag(p,'text-review-actual-profile-status').innerText(),/결과지 연결 필요 · 자료 없음/);
      assert.match(await tag(p,'text-review-profile-date').innerText(),/예시 검사일 · 2026-01-01/);
      assert.doesNotMatch(await tag(p,'text-review-profile-scale').innerText(),/표준점수|IQ|백분위/);
      const scoreRows=tag(p,'list-review-profile-scores').locator('div');
      assert.deepEqual(await scoreRows.locator('dt').allTextContents(),['계획력','주의력','동시처리','순차처리']);
      assert.deepEqual(await scoreRows.locator('dd').allTextContents(),['72','64','58','66']);
      assert.match(await tag(p,'text-review-profile-strengths').innerText(),/계획력 · 목표와 순서 정하기/);
      assert.match(await tag(p,'text-review-profile-growth-points').innerText(),/동시처리 연습/);
      const growth=tag(p,'card-review-home-growth');
      assert.deepEqual(await growth.locator('dt').allTextContents(),['TRAIN','THINK','MANAGE','METACOGNITION']);
      assert.deepEqual(await growth.locator('dd').allTextContents(),['자료 부족','자료 부족','자료 부족','자료 부족']);
      const growthPositions=await tag(p,'list-review-home-growth').locator(':scope > div').evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().y));
      assert(growthPositions.every((y,i)=>i===0||y>growthPositions[i-1]));
      assert(await tag(p,'row-review-score-planning').evaluate(el=>el.classList.contains('bg-blue-soft')));
      assert(await tag(p,'row-review-score-planning').locator('dd').evaluate(el=>el.classList.contains('text-blue')));
      assert(await tag(p,'text-review-profile-strengths').locator('dd span').evaluate(el=>el.classList.contains('bg-orange-50')));
      assert(await tag(p,'text-review-profile-growth-points').locator('dd span').evaluate(el=>el.classList.contains('bg-slate-100')));
      const top=await tag(p,'layout-review-home-top').locator(':scope > section').evaluateAll(nodes=>nodes.map(el=>{const{width,x,y}=el.getBoundingClientRect();return{width,x,y};}));
      const services=tag(p,'layout-review-home-services');
      assert.deepEqual(await services.locator('h3').allTextContents(),['기업 LAB','NUVIA PLANNER','나의 강점 스토리보드']);
      const cards=await services.locator('article').evaluateAll(nodes=>nodes.map(el=>{const{width,height,x,y}=el.getBoundingClientRect();return{width,height,x,y};}));
      if(width>=768){
        assert.equal(top[0].y,top[1].y);assert(top[1].x>top[0].x);
        assert(cards.every(card=>Math.abs(card.width-cards[0].width)<1&&card.height===cards[0].height&&card.y===cards[0].y));
      }else{
        assert(top[1].y>top[0].y);assert(cards[2].y>cards[1].y&&cards[1].y>cards[0].y);
      }
      for(const id of ['link-review-report','link-review-planner','link-review-lab-home','link-review-storyboard','button-language']){
        const box=await tag(p,id).boundingBox();assert(box && box.height>=44 && box.width>=44,id);
      }
      await fit(p);
      await p.screenshot({path:`${out}/my-nuvia-${width}.png`,fullPage:true});
      const jobs=tag(p,'list-review-profile-top-jobs');
      const topFive=[['service','IT 서비스기획'],['operations','운영 지원'],['content','콘텐츠 운영'],['research','조사·자료 정리 지원'],['education','교육 운영 지원']];
      assert.deepEqual(await jobs.locator('li div > span').allTextContents(),[topFive[0][1],topFive[4][1],...topFive.slice(1,4).map(r=>r[1])]);
      assert.equal(await jobs.getByText(/가상 결과지 · 직무 추천 예시 v1/).count(),5);
      for(const [key,name] of topFive){
        await click(p,`button-review-top-job-demo-${key}`);
        assert.equal(await tag(p,'text-review-lab-interest').innerText(),name);
        assert.equal(await tag(p,`option-review-role-${key}`).getAttribute('aria-checked'),'true');
        if(key!=='education')await click(p,'link-review-brand');
      }
      assert.equal(await tag(p,'text-review-lab-interest').innerText(),'교육 운영 지원');
      await p.reload();
      assert.equal(await tag(p,'option-review-role-education').getAttribute('aria-checked'),'true');
      for(const heading of ['내 직무군 역량 분석','기업 추천·기업 탐색','기업·직무 필요역량 찾기'])await p.getByRole('heading',{name:heading,exact:true}).waitFor();
      await tag(p,'input-review-lab-search').fill('누락 점검');
      await click(p,'button-review-lab-search');
      assert.match(await tag(p,'text-review-lab-search-count').innerText(),/가상 자료 1건/);
      assert.match(await tag(p,'view-review-lab-recommendation').innerText(),/입력한 검색 조건 일치/);
      assert.match(await tag(p,'text-review-lab-source').innerText(),/가상 출처 · 실제 채용 공고 아님/);
      await tag(p,'input-review-lab-search').fill('없는 회사 QA');
      await click(p,'button-review-lab-search');
      await alive(p,'view-review-lab-no-data');
      await click(p,'button-review-lab-help');
      assert.match(await tag(p,'view-review-lab-help').innerText(),/합성 응답 · 실제 AI 호출 아님/);
      await tag(p,'input-review-lab-help-company').fill('원격 근무 예시');
      await tag(p,'select-review-lab-help-role').selectOption('research');
      await tag(p,'input-review-lab-help-need').fill('검증 가능한 문서 정리');
      await click(p,'button-review-lab-help-preview');
      const helpResult=tag(p,'view-review-lab-help-result');
      for(const heading of ['기업 탐색 후보','역량 가설 · 검토 필요','확인할 공개자료'])await helpResult.getByRole('heading',{name:heading,exact:true}).waitFor();
      assert.match(await helpResult.innerText(),/솔빛리서치 \(가상\)/);
      assert.match(await helpResult.innerText(),/검증 가능한 문서 정리/);
      await fit(p);
      if(width===360)await p.screenshot({path:`${out}/lab-empty-help-360.png`,fullPage:true});
      await click(p,'button-review-lab-help-back');
      assert.equal(await p.evaluate(()=>document.activeElement?.id),'review-lab-query');
      await click(p,'button-review-lab-help');await click(p,'button-review-lab-help-use');
      assert.match(p.url(),/\/lab/);
      assert.equal(await tag(p,'text-review-lab-interest').innerText(),'조사·자료 정리 지원');
      await click(p,'option-review-role-service');
      assert.equal(await tag(p,'text-review-lab-interest').innerText(),'IT 서비스기획');
      await click(p,'link-review-brand');
      await click(p,'link-review-report');
      await tag(p,'option-review-trait-sequential').check();
      await tag(p,'select-review-focus').selectOption('');
      await click(p,'link-review-home');
      assert.equal(await tag(p,'row-review-score-planning').locator('dd').innerText(),'0');
      assert.match(await tag(p,'text-review-profile-strengths').innerText(),/순차처리 · 한 단계씩 진행하기/);
      assert.match(await tag(p,'text-review-profile-growth-points').innerText(),/자료 없음/);
      await p.reload();
      assert.equal(await tag(p,'row-review-score-planning').locator('dd').innerText(),'0');
      if(width===360)await p.screenshot({path:`${out}/my-nuvia-zero-360.png`,fullPage:true});
      await click(p,'link-review-report');
      await tag(p,'option-review-trait-planning').check();
      await tag(p,'select-review-focus').selectOption('simultaneous');
      await click(p,'button-review-exit');
    });
    await run(width,'adult entry, two LAB functions, no history navigation',async()=>{
      assert.equal((await p.goto(`${base}?lang=ko`))?.status(),200);
      await click(p,'button-review-start');
      await click(p,'link-review-report');
      await alive(p,'select-review-focus');
      if(width===360){
        await p.goto(`${base}/planner?lang=ko`);
        await tag(p,'button-review-create-free').evaluate((b:HTMLButtonElement)=>{b.click();b.click();});
        await alive(p,'input-review-note-action');
        assert.match(await p.locator('main').innerText(),/직접 적는 일상 기록/);
        assert.doesNotMatch(await p.locator('main').innerText(),/\bfree\b/i);
        idFree=p.url().split('?')[0].split('/').at(-1)!;
        await tag(p,'input-review-note-action').fill(freeText);
        await click(p,'link-review-back-planner');
        assert.equal(await p.getByTestId(/^row-review-card-/).count(),1);
        await click(p,`link-review-card-${idFree}`);
        await eq(p,'input-review-note-action',freeText);
        await p.reload(); await eq(p,'input-review-note-action',freeText);
        await click(p,'button-review-save-note');
        await click(p,'link-review-back-planner');
        await click(p,'button-review-create-free');
        idFree2=p.url().split('?')[0].split('/').at(-1)!;
        assert.notEqual(idFree,idFree2);
        await tag(p,'input-review-note-action').fill('[직접 기록 2] 다른 메모는 선택하지 않았습니다.');
        await click(p,'button-review-save-note');
        await click(p,'link-review-back-planner');
        assert.equal(await p.getByTestId(/^row-review-card-/).count(),2);
        await tag(p,`checkbox-review-collection-${idFree}`).check();
        await tag(p,'checkbox-review-confirm-collection').check();
        await click(p,'button-review-use-collection');
        await click(p,'button-review-build-story');
        assert.match(await tag(p,'text-review-story-preview-3').innerText(),/\[직접 기록\]/);
        assert.equal(await section(p,1).inputValue(),'');
        await p.goto(`${base}/report?lang=ko`);
      }
      await tag(p,'select-review-focus').selectOption('');
      await click(p,'link-review-lab');await match(p);
      await alive(p,'notice-review-focus-required');
      assert.equal(await tag(p,'link-review-to-activity').count(),0);
      await click(p,'link-review-back-report');
      await tag(p,'select-review-focus').selectOption('simultaneous');
      await click(p,'link-review-lab');
      await p.getByRole('heading',{name:'기업·직무 키워드 분석과 결과지 강점 매칭'}).waitFor();
      await p.getByRole('heading',{name:'오늘의 생각 한 장 만들기'}).waitFor();
      await match(p);
      assert.equal(await p.locator('a[href*="/history"]').count(),0);
      await fit(p);
    });
    if(width===360)await run(width,'focus changes suggestion and help; job does not rewrite the simple prompt',async()=>{
      await getWorksheet(p);
      const capture=async()=>({scene:await p.getByRole('heading',{name:'1. 작은 상황 하나'}).locator('..').innerText(),
        action:await tag(p,'text-worksheet-support').locator('li').allTextContents(),
        question:await tag(p,'text-worksheet-question').innerText()});
      const x=await capture();
      await p.goto(`${base}/report?lang=ko`);
      await tag(p,'select-review-focus').selectOption('attention');
      await click(p,'link-review-lab');await match(p);await getWorksheet(p);
      const y=await capture();
      await p.goto(`${base}/lab?lang=ko`);
      await click(p,'option-review-need-clarity');await match(p);await getWorksheet(p);
      const z=await capture();
      assert.match(x.scene,/약속까지 20분/); assert.equal(x.question,'무엇을 먼저 확인하고 싶나요?');
      assert.match(y.scene,/필요한 준비물/);
      assert.equal(y.action.length,x.action.length+1,'focus adjusted amount of help');
      assert.deepEqual(y,z,'new job requirement does not rewrite simple scenario or question');
      await p.goto(`${base}/report?lang=ko`);await tag(p,'select-review-focus').selectOption('planning');
      await click(p,'link-review-lab');await match(p);await getWorksheet(p);
      const morning=await capture();
      assert.match(morning.scene,/3~5가지/);assert.match(morning.question,/순서나 시간/);
      await p.goto(`${base}/report?lang=ko`);await tag(p,'select-review-focus').selectOption('simultaneous');
      await click(p,'link-review-lab');await click(p,'option-review-need-compare');await match(p);
      await writeFile(`${out}/simple-examples.json`,JSON.stringify({x,y,z,morning},null,2));
    });
    await run(width,'worksheet drafts preserve original; two independent records and one plan',async()=>{
      await getWorksheet(p);
      await tag(p,'input-worksheet-before').fill(aText);
      await tag(p,'input-worksheet-reflection').fill(privateMark);
      await p.goBack();await alive(p,'button-review-open-worksheet');await click(p,'button-review-open-worksheet');
      await eq(p,'input-worksheet-reflection',privateMark);
      await click(p,'button-review-exit');
      await click(p,'button-review-start');await click(p,'link-review-report');await click(p,'link-review-lab');await match(p);await getWorksheet(p);
      await eq(p,'input-worksheet-before',aText);
      await p.reload();await fit(p);
      await p.screenshot({path:`${out}/worksheet-${width}.png`});
      idA=await record(p,aText);
      await p.goto(`${base}/lab?lang=ko`);await getWorksheet(p,true);
      await p.getByText('선택 이유를 더 적기 (선택)',{exact:true}).click();
      await tag(p,'input-worksheet-observation').fill('외출할 때 빠뜨리기 쉬운 물건이라 추가했습니다.');
      idB=await record(p,bText);assert.notEqual(idA,idB);
      const bagLabel=await p.locator('label[for="input-review-note-action"]').innerText();
      assert.match(bagLabel,/준비물과 다시 확인한 내용/);
      assert.doesNotMatch(bagLabel,/순서와 대략 걸린 시간/);
      await p.reload();await eq(p,'input-review-note-action',bText);
      await p.goto(`${base}/lab?lang=ko`);await getWorksheet(p);idPlan=await record(p);
      await p.goto(`${base}/planner?lang=ko`);await alive(p,'view-review-activity-collection');
      assert.equal(await p.getByTestId(/^row-review-collection-/).count(),width===360?5:3);
      assert(await tag(p,`checkbox-review-collection-${idPlan}`).isDisabled());
      assert.match(await tag(p,`row-review-collection-${idPlan}`).innerText(),/미실행/);
      assert.equal(await p.locator('a[href*="/history"]').count(),0);
    });
    await run(width,'multi-record copy, consent, expression stays out of the candidate, re-entry and restore',async()=>{
      for(const id of [idA,idB])await tag(p,`checkbox-review-collection-${id}`).check();
      if(width===360)await tag(p,`checkbox-review-collection-${idFree}`).check();
      assert(await tag(p,'button-review-use-collection').isDisabled());
      await tag(p,'checkbox-review-confirm-collection').check();
      await click(p,'button-review-use-collection');
      await alive(p,'input-section-1');
      assert.doesNotMatch(await p.locator('main').innerText(),/확인된 활동 하나|활동 하나 선택|이 화면은 자동으로 채우지|이 화면은 자동으로 채우거나/);
      assert.match(await p.locator('main').innerText(),/일상기록을 여러 개 골라/);
      await section(p,1).fill(own);
      await p.reload();await eq(p,'input-section-1',own);
      await click(p,'button-review-build-story');
      const candidate=await tag(p,'text-review-story-preview-3').innerText();
      assert(candidate.includes('[생각 노트 A]') && candidate.includes('[생각 노트 B]') && candidate.includes('실제 수행 아님'));
      if(width===360){assert(candidate.includes(freeText));assert(candidate.includes('내가 직접 적은 일상 기록'));assert(!candidate.includes('[직접 기록 2]'));}
      assert(!candidate.includes(privateMark));
      await eq(p,'input-section-1',own);
      await tag(p,'input-review-thought-expression').fill('짧고 담백하게');
      assert(await tag(p,'button-review-build-refined').isDisabled());
      assert.match(await p.locator('#review-expression-help').innerText(),/데모 후보에는 들어가지/);
      await tag(p,'input-review-thought-keyPoint').fill('나만의 핵심은 먼저 살펴보는 것입니다.');
      await click(p,'button-review-build-refined');
      await click(p,'button-review-exit');await click(p,'button-review-start');
      await p.goto(`${base}/storyboard?lang=ko`);
      await eq(p,'input-review-thought-keyPoint','나만의 핵심은 먼저 살펴보는 것입니다.');
      await eq(p,'input-review-thought-expression','짧고 담백하게');
      assert.match(await tag(p,'text-review-story-refined-1').innerText(),/나만의 핵심/);
      assert.doesNotMatch(await tag(p,'text-review-story-refined-1').innerText(),/짧고 담백하게/);
      await tag(p,'input-review-thought-feeling').fill('새로 쓴 생각');
      assert(await tag(p,'button-review-apply-refined').isDisabled());
      assert(await tag(p,'button-review-real-ai').isDisabled());
      await click(p,'button-review-apply-story');
      await click(p,'button-review-restore-writing');
      await eq(p,'input-section-1',own);
      await click(p,'button-review-build-refined');
      await click(p,'button-review-apply-refined');
      assert.match(await section(p,1).inputValue(),/나만의 핵심/);
      assert.doesNotMatch(await section(p,1).inputValue(),/짧고 담백하게/);
      await fit(p);await p.screenshot({path:`${out}/storyboard-${width}.png`});
      await click(p,'checkbox-fact');await click(p,'checkbox-use');await click(p,'button-confirm-storyboard');await alive(p,'status-confirmed');
    });
    await run(width,'approved TXT; on mobile all four real downloads and duplicate guard; source revision blocks export',async()=>{
      let completed=0;
      const countDownload=()=>{completed++;};
      p.on('download',countDownload);
      await file(p,'txt');
      const text=await readFile(`${out}/review-${width}.txt`,'utf8');
      for(const literal of ['[생각 노트 A]','[생각 노트 B]','나만의 핵심','실제 수행 아님'])assert(text.includes(literal),literal);
      assert(!text.includes(privateMark) && !text.includes(idA) && !text.includes('짧고 담백하게'));
      if(width===360) {
        const path='**/api/career/export';
        let calls=0;let release!:()=>void;
        const wait=new Promise<void>(resolve=>{release=resolve;});
        const hold=async(route:import('playwright').Route)=>{calls++; await wait;await route.continue();};
        await p.route(path,hold);
        await click(p,'option-format-docx');
        const downloading=p.waitForEvent('download',{timeout:20000});
        await tag(p,'button-download').evaluate((b:HTMLButtonElement)=>{b.click();b.click();});
        await alive(p,'status-review-export-busy');
        assert(await tag(p,'option-format-hwpx').isDisabled());
        release();
        await (await downloading).saveAs(`${out}/review-360.docx`);
        assert.equal(calls,1);
        await p.unroute(path,hold);
        const rate=(route:import('playwright').Route)=>route.fulfill({status:429});
        await p.route(path,rate);await click(p,'button-download');
        await alive(p,'status-review-export-feedback');
        assert.match(await tag(p,'status-review-export-feedback').innerText(),/요청이 너무 많습니다/);
        await p.unroute(path,rate);
        await file(p,'hwpx');await file(p,'pdf');
        for(const fmt of ['docx','hwpx']){
          const output=spawnSync('python',['-c',`import sys,zipfile,xml.etree.ElementTree as ET;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None; names=z.namelist(); part='word/document.xml' if sys.argv[1].endswith('.docx') else next(n for n in names if n.startswith('Contents/section') and n.endswith('.xml'));t='\\n'.join(ET.fromstring(z.read(part)).itertext()); assert '[생각 노트 A]' in t and '[생각 노트 B]' in t and '실제 수행 아님' in t and '제출에는 포함하지 않음' not in t;print('ZIP, XML, source literals and exclusion match')`,`${out}/review-360.${fmt}`],{encoding:'utf8'});
          assert.equal(output.status,0,output.stderr);
        }
        const pdf=spawnSync('pdfinfo',[`${out}/review-360.pdf`],{encoding:'utf8'});
        assert.equal(pdf.status,0);assert.match(pdf.stdout,/Pages:\s+1/);assert.match(pdf.stdout,/A4|595.*841/);
        const raster=spawnSync('pdftoppm',['-png','-singlefile','-r','96',`${out}/review-360.pdf`,`${out}/exported-pdf-page`]);
        assert.equal(raster.status,0);
      }
      assert.equal(completed,width===360?4:1);
      p.off('download',countDownload);
      await p.goto(`${base}/planner/card/${idB}?lang=ko`);
      await tag(p,'input-review-note-learning').fill('새 원본으로 수정했습니다.');
      await click(p,'button-review-save-note');
      await p.goto(`${base}/storyboard?lang=ko`);await alive(p,'notice-review-story-recheck');
      assert(await tag(p,'button-download').isDisabled());
      assert.match(await section(p,1).inputValue(),/나만의 핵심/);
      await p.getByTestId(/^row-version-/).first().waitFor();
      await p.getByTestId(/^button-restore-/).first().click();
      assert.match(await section(p,1).inputValue(),/나만의 핵심/);
      assert(await tag(p,'button-download').isDisabled());
    });
    if(width===360)await run(width,'V1 stays intact; re-matched candidates compare against current editor; undo restores last pre-apply text',async()=>{
      const fields=()=>Promise.all([1,2,3,4].map(i=>section(p,i).inputValue()));
      const compare=()=>Promise.all([1,2,3,4].map(i=>tag(p,`text-review-story-original-${i}`).textContent()));
      const V1=await fields();
      assert(V1.every(t=>t.trim()));
      const version=await p.getByTestId(/^row-version-/).first().getAttribute('data-testid');
      await p.goto(`${base}/report?lang=ko`);
      await tag(p,'select-review-focus').selectOption('');
      await p.goto(`${base}/storyboard?lang=ko`);
      assert(await tag(p,'button-review-apply-story').isDisabled());
      assert(await tag(p,'button-review-apply-refined').isDisabled());
      assert.deepEqual(await fields(),V1);
      await p.goto(`${base}/report?lang=ko`);
      await tag(p,'select-review-focus').selectOption('simultaneous');
      await p.goto(`${base}/lab?lang=ko`);
      await match(p);
      await p.goto(`${base}/planner?lang=ko`);
      for(const id of [idA,idB]){
        const box=tag(p,`checkbox-review-collection-${id}`);
        await box.setChecked(true);
      }
      await tag(p,'checkbox-review-confirm-collection').check();
      await click(p,'button-review-use-collection');
      assert.deepEqual(await fields(),V1);
      assert(await tag(p,'button-review-apply-story').isDisabled());
      await click(p,'button-review-build-story');
      await click(p,'button-review-build-refined');
      assert.deepEqual(await compare(),V1);
      await p.reload();
      assert.deepEqual(await compare(),V1);
      await p.screenshot({path:`${out}/reconfirmed-comparison-360.png`});
      await click(p,'button-review-apply-story');
      const justApplied=await fields();
      assert.notDeepEqual(justApplied,V1);
      assert.deepEqual(await compare(),justApplied);
      await section(p,2).fill('[직접 수정] 적용 직전에 한 문장을 다시 씁니다.');
      const lastPreApply=await fields();
      assert.deepEqual(await compare(),lastPreApply);
      await click(p,'button-review-apply-refined');
      assert.notDeepEqual(await fields(),lastPreApply);
      await p.reload();
      await click(p,'button-review-restore-writing');
      assert.deepEqual(await fields(),lastPreApply);
      assert.deepEqual(await compare(),lastPreApply);
      assert.equal(await p.getByTestId(/^row-version-/).count(),1);
      await tag(p,version!).getByTestId(/^button-restore-/).click();
      assert.deepEqual(await fields(),V1);
    });
    if(width===360)await run(width,'adult direct history redirect; child and teacher separate',async()=>{
      await p.goto(`${base}/history?lang=ko`);await alive(p,'view-review-planner-list');
      await p.goto(`${base}/history/${idA}?lang=ko`);await alive(p,'view-review-planner-card');
      await click(p,'button-review-exit');await click(p,'button-review-start-child');
      assert(await p.locator('a[href*="/history"]').count()>0);
      await p.goto(`${base}/teacher?lang=ko`);await p.getByRole('heading',{name:/교사/}).first().waitFor();
    });
  } catch {
    await p.screenshot({path:`${out}/failure-${width}.png`}).catch(()=>undefined);
  } finally {await ctx.close();}
}
for(const width of [360,768,1440]){
  const ctx=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
  const p=await ctx.newPage();
  p.on('pageerror',e=>errors.push(`guide ${width}: ${e.message}`));
  const phrase='[다음 활동 QA] 약속에 늦지 않도록 먼저 갈림길 위치를 확인하겠다고 적었어요.';
  try {
    await run(width,'guided primary path without menus; home resume; back edit; save and download',async()=>{
      assert.equal((await p.goto(`${base}?lang=ko`))?.status(),200);
      await p.getByRole('button',{name:'성인 데모로 시작'}).click();
      await alive(p,'view-review-home');
      await p.getByRole('link',{name:'다음 활동 · 결과지 보기'}).click();
      await p.getByRole('link',{name:'다음 활동 · LAB에서 강점 연결하기'}).click();
      if(width===768)await click(p,'option-review-role-research');
      assert(await tag(p,'button-review-confirm-link').isDisabled());
      await tag(p,'checkbox-review-link').check();
      await p.getByRole('button',{name:'강점 연결 확인'}).click();
      await p.getByRole('link',{name:'다음 활동 · 오늘의 생각 한 장 추천받기'}).click();
      await p.getByRole('button',{name:'추천 상황 보기'}).click();
      await tag(p,'option-review-activity-simple-route').click();
      await p.getByRole('button',{name:'다음 활동 · 이 상황으로 생각 쓰기'}).click();
      assert(await tag(p,'button-review-register-next').isDisabled());
      await tag(p,'input-worksheet-before').fill(phrase);
      await click(p,'link-review-pause-home');
      await p.reload();
      assert.match(await tag(p,'text-review-home-resume').innerText(),/활동지/);
      await p.getByRole('link',{name:'이어서 하기'}).click();
      await eq(p,'input-worksheet-before',phrase);
      await p.goBack();await p.getByRole('link',{name:'이어서 하기'}).click();
      await eq(p,'input-worksheet-before',phrase);
      await click(p,'link-review-back-activity');
      await p.getByRole('button',{name:'다음 활동 · 이 상황으로 생각 쓰기'}).click();
      await eq(p,'input-worksheet-before',phrase);
      if(width===360) {
        await p.evaluate(()=>{
          const set=Storage.prototype.setItem;
          Storage.prototype.setItem=function(key:string,val:string){
            if(key.includes('review:') && key.includes('planner'))throw new DOMException('Synthetic write failure','QuotaExceededError');
            return set.call(this,key,val);
          };
          (window as unknown as {qaRestoreStorage:()=>void}).qaRestoreStorage=()=>{Storage.prototype.setItem=set;};
        });
        await click(p,'button-review-register-next');
        await tag(p,'button-review-retry').waitFor();
        await eq(p,'input-worksheet-before',phrase);
        assert.match(p.url(),/\/worksheet/);
        await p.evaluate(()=>(window as unknown as {qaRestoreStorage:()=>void}).qaRestoreStorage());
        await click(p,'button-review-retry');
      }
      await alive(p,'text-review-planner-next');
      await p.getByRole('button',{name:'저장하고 플래너로 가기'}).click();
      await alive(p,'view-review-planner-card');
      const cardUrl=p.url().split('?')[0];
      assert.equal(await tag(p,'input-review-note-action').inputValue(),'');
      await p.getByRole('button',{name:'활동지의 내 생각 불러오기'}).click();
      await eq(p,'input-review-note-action',phrase);
      await click(p,'link-review-pause-home');
      await click(p,'button-review-exit');
      await p.getByRole('button',{name:'성인 데모로 시작'}).click();
      await p.getByRole('link',{name:'이어서 하기'}).click();
      assert.equal(p.url().split('?')[0],cardUrl);
      await eq(p,'input-review-note-action',phrase);
      await tag(p,'checkbox-review-use-record').check();
      const send=p.getByRole('button',{name:'기록 저장하고 나의 강점 스토리보드로'});
      if(width===360) {
        await p.evaluate(()=>{
          const set=Storage.prototype.setItem;
          Storage.prototype.setItem=function(key:string,val:string){
            if(key.includes('review:planner'))throw new DOMException('Synthetic write failure','QuotaExceededError');
            return set.call(this,key,val);
          };
          (window as unknown as {qaRestoreStorage:()=>void}).qaRestoreStorage=()=>{Storage.prototype.setItem=set;};
        });
        await send.click();
        assert.match(await tag(p,'status-review-record-link-failure').innerText(),/기록을 저장하지 못했어요/);
        await eq(p,'input-review-note-action',phrase);
        assert.equal(p.url().split('?')[0],cardUrl);
        await p.evaluate(()=>(window as unknown as {qaRestoreStorage:()=>void}).qaRestoreStorage());
      }
      await send.click();
      await alive(p,'status-review-story-sources-saved');
      const sourceId=cardUrl.split('/').at(-1)!;
      const cardSource=tag(p,`review-story-source-${sourceId}`);
      await cardSource.locator('summary').click();
      assert.match(await cardSource.innerText(),width===768
        ? /솔빛리서치.*조사·자료 정리 지원.*자료 출처 정리.*인지 강점·보완 프로필 예시 v2.*모의 자료 v1/
        : /모아서비스.*IT 서비스기획.*정보 비교와 판단.*인지 강점·보완 프로필 예시 v2.*모의 자료 v1/);
      await click(p,`link-review-story-source-${sourceId}`);
      await eq(p,'input-review-note-action',phrase);
      await alive(p,'status-review-record-linked');
      assert.equal(await tag(p,'checkbox-review-use-record').count(),0);
      await click(p,'link-review-open-linked-story');
      await p.reload();
      await alive(p,'status-review-story-sources-saved');
      await click(p,'button-review-build-story');
      assert.match(await tag(p,'text-review-story-preview-3').innerText(),/다음 활동 QA/);
      assert.equal(await section(p,3).inputValue(),'');
      await click(p,'button-review-apply-story');
      assert.match(await section(p,3).inputValue(),/실제 수행 아님/);
      await p.getByRole('button',{name:'다음 활동 · 내 글 최종 확인하기'}).click();
      assert.equal(await p.evaluate(()=>document.activeElement?.id),'review-story-final');
      assert(await tag(p,'button-download').isDisabled());
      await click(p,'checkbox-fact');await click(p,'checkbox-use');
      await p.getByRole('button',{name:'최종 저장하고 다운로드로'}).click();
      await alive(p,'status-confirmed');
      await file(p,'txt','-guided');
      const txt=await readFile(`${out}/review-${width}-guided.txt`,'utf8');
      assert(txt.includes(phrase));assert.match(txt,/실제 수행 아님/);
      await fit(p);
      if(width===360){
        const firstVersion=p.getByTestId(/^row-version-/);
        assert.equal(await firstVersion.count(),1);
        const storyV1=await section(p,3).inputValue();
        await p.goto(`${base}/planner?lang=ko`);
        await click(p,'button-review-create-free');
        await tag(p,'input-review-note-action').fill(freeText);
        await tag(p,'checkbox-review-use-record').check();
        await click(p,'button-review-use-record');
        await alive(p,'status-review-story-sources-saved');
        assert.equal(await p.getByTestId(/^review-story-source-/).count(),2);
        assert.equal(await firstVersion.count(),1);
        assert.equal(await section(p,3).inputValue(),storyV1);
      }
      if(width===360)await p.screenshot({path:`${out}/guided-download-360.png`});
    });
  } catch {
    await p.screenshot({path:`${out}/failure-guided-${width}.png`}).catch(()=>undefined);
  } finally {await ctx.close();}
}
await browser.close();
const commit=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim();
const dirty=spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout.trim();
await writeFile(`${out}/browser-results.json`, JSON.stringify({began,finished:new Date().toISOString(),url:`${base}?lang=ko`,commit,dirty,results,errors},null,2));
const fails=results.filter(r=>r.status==='FAIL').length;
console.log(JSON.stringify({pass:results.length-fails,fail:fails,errors}));
if(fails || errors.length) process.exitCode=1;
