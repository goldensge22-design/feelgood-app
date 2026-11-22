import assert from 'node:assert/strict';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chromium,type Page } from 'playwright';
const origin=process.env.NUVIA_TEST_ORIGIN ?? 'http://localhost';
const base=`${origin}/demo/review`;
const out=resolve(import.meta.dirname,'../../generated-artifacts',process.env.NUVIA_REVIEW_QA_DIR ?? 'nuvia-review-native-final-qa');
const mobileOnly=process.env.NUVIA_REVIEW_MOBILE_ONLY==='1';
const started=new Date().toISOString();
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/repl/tools/bin/chromium',args:['--no-sandbox']});
const checks:{width:number;name:string;result:string;detail?:string}[]=[];
const pageErrors:string[]=[];
const downloads:{width:number;format:string;bytes:number;sha256:string;eventMs:number}[]=[];
const exportChecks:{width:number;serverRequests:number}[]=[];
const el=(p:Page,id:string)=>p.getByTestId(id);
const click=(p:Page,id:string)=>el(p,id).click();
const fit=async(p:Page)=>assert(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),p.url());
const note='[검토 QA] 물병과 수첩을 떠올리고\n나가기 전에 날씨를 확인할지 생각했습니다.';
const extraNote='[검토 QA B] 짧은 메모를 다시 읽고 생각을 적었습니다.';
const freeNote='[검토 QA 자유] 책상에 읽을 책을 두었습니다.';
const stages=[
  '홈 로고·바로가기·LAB 없는 원본 플래너와 두 추천',
  '원본 시간 설정·작업대·타이머와 같은 날/다른 날짜 카드·활동지 복원',
  'LAB 미방문으로 기록 확인·후보 생성·재접속·최종 저장과 다운로드',
  '홈 이어서 하기 버튼만 제거·검색 입력·재시도·두 공개 자료 강점 연결과 복원',
  'LAB 협력 공고 8곳·원문 3개·마감 경계·다른 직무 탐색·수동 입력 제거',
  'LAB 편집과 기존 문장·기록이 독립·자유기록 연결·성인 히스토리 숨김',
];
await Promise.all((mobileOnly?[360]:[360,768,1440]).map(async width=>{
  const ctx=await browser.newContext({viewport:{width,height:width===360?800:900},acceptDownloads:true});
  const p=await ctx.newPage();
  const frame=p.frameLocator('[data-testid="frame-review-studio"]');
  const st=(id:string)=>frame.getByTestId(id);
  const sClick=(id:string)=>st(id).click();
  async function place(index:number){
    const tag=st('section-shelf').locator('[data-testid^="button-select-"]').nth(index);
    const id=(await tag.getAttribute('data-testid'))!.replace('button-select-','');
    await tag.click();await sClick(`button-place-${id}`);return id;
  }
  const paths:string[]=[];
  p.setDefaultTimeout(7000);
  p.setDefaultNavigationTimeout(25_000);
  p.on('framenavigated',f=>{if(f===p.mainFrame())paths.push(new URL(f.url()).pathname);});
  p.on('pageerror',err=>pageErrors.push(`${width} ${err.message}`));
  let date='', storyText='', completed=0;
  const run=async (fn:()=>Promise<void>)=>{
    const name=stages[completed++];
    try{await fn();checks.push({width,name,result:'PASS'});console.log('PASS',width,name);}
    catch(e){checks.push({width,name,result:'FAIL',detail:String(e)});console.error('FAIL',width,name,String(e));throw e;}
  };
  const shot=(name:string)=>p.screenshot({path:`${out}/${width}-${name}.png`,fullPage:false});
  async function exportFile(fmt:string){
    await click(p,`option-format-${fmt}`);
    let count=0;
    const countDownload=()=>{count++;};
    p.on('download',countDownload);
    try{
      await el(p,'button-download').scrollIntoViewIfNeeded();
      const startedAt=Date.now();
      const download=p.waitForEvent('download',{timeout:15000});
      await el(p,'button-download').evaluate((b:HTMLButtonElement)=>{b.click();b.click();});
      const file=await download;
      const eventMs=Date.now()-startedAt;
      assert(file.suggestedFilename().endsWith(`.${fmt}`));
      const filename=`${out}/story-${width}.${fmt}`;
      await file.saveAs(filename);
      assert.equal(await file.failure(),null);
      const bytes=await readFile(filename);
      if(fmt==='txt')assert(bytes.toString('utf8').includes(storyText));
      else execFileSync('python',['-c',`import sys, zipfile, subprocess, xml.etree.ElementTree as E, re
path,fmt,expected=sys.argv[1:]
if fmt=='pdf':
    info=subprocess.check_output(['pdfinfo',path],text=True)
    assert any(x.split()[-1]=='1' for x in info.splitlines() if x.startswith('Pages:'))
    subprocess.check_call(['pdftoppm','-png','-r','120','-f','1','-l','1',path,path[:-4]+'-rendered'])
    rows=subprocess.check_output(['pdfimages','-list',path],text=True).splitlines()
    assert any('image' in row for row in rows[2:])
    sys.exit(0)
else:
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None
        xml='word/document.xml' if fmt=='docx' else 'Contents/section0.xml'
        if fmt=='hwpx':
            assert z.read('mimetype')==b'application/hwp+zip'
            assert z.getinfo('mimetype').compress_type==zipfile.ZIP_STORED
            assert expected in z.read('Preview/PrvText.txt').decode()
        else:
            assert '[Content_Types].xml' in z.namelist()
        root=E.fromstring(z.read(xml))
        lines=[''.join(x.text or '' for x in p.iter() if x.tag.endswith('}t')) for p in root.iter() if p.tag.endswith('}p')]
        text='\\n'.join(lines)
assert expected in text,repr(text)[:750]
assert '[비공개 QA]' not in text`,filename,fmt,storyText]);
      assert.equal(count,1,'rapid clicks produced duplicate downloads');
      downloads.push({width,format:fmt,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),eventMs});
    } finally {p.off('download',countDownload);}
  }
  try{
    await run(async()=>{
      assert.equal((await p.goto(`${base}?lang=ko`))?.status(),200);
      const logo=el(p,'image-review-feelgood');
      await logo.evaluate((img:HTMLImageElement)=>img.decode());
      assert.deepEqual(await logo.evaluate((img:HTMLImageElement)=>[img.naturalWidth,img.naturalHeight]),[2415,398]);
      assert.equal(await el(p,'header-review').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(255, 255, 255)');
      await fit(p);await shot('login');
      await click(p,'button-review-start');
      await el(p,'card-review-home-profile').waitFor();
      assert.equal(await el(p,'list-review-profile-top-jobs').getByRole('listitem').count(),5);
      assert.deepEqual(await el(p,'layout-review-home-services').locator('article').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-testid'))),
        ['card-review-home-lab-home','card-review-home-planner','card-review-home-storyboard']);
      assert.equal(await p.getByRole('button',{name:'NUVIA 홈 화면에 추가',exact:true}).count(),1);
      await fit(p);await shot('home');
      await click(p,'link-review-routine-planner');
      assert.equal(await p.getByRole('button',{name:'플래너 홈 화면에 추가',exact:true}).count(),1);
      await frame.getByRole('heading',{name:'내 하루 작업대'}).waitFor({timeout:20000});
      await p.waitForFunction(()=>document.querySelector('[data-testid="frame-review-studio"]')?.getAttribute('data-ready')==='ready');
      await p.reload();
      await p.waitForFunction(()=>document.querySelector('[data-testid="frame-review-studio"]')?.getAttribute('data-ready')==='ready');
      await sClick('button-studio-daily-create');
      assert.equal(await st('suggestion-studio-job').count(),1);assert.equal(await st('suggestion-studio-cognitive').count(),1);
      await st('suggestion-studio-job').locator('summary').click();
      assert.match(await st('suggestion-studio-job').innerText(),/가상 결과지/);
      assert(!paths.some(x=>x.endsWith('/lab')));
      const button=st('button-studio-add-job');
      assert((await button.boundingBox())!.height>=44);
      assert(await frame.locator('html').evaluate(n=>n.scrollWidth<=n.clientWidth));
      assert.match(await p.locator('main').innerText(),/협력공고는 출처와 확인일이 있는 공개자료/);
      await fit(p);await shot('cards');
    });
    const checkSearch=async()=>{
      await p.goto(`${base}/home?lang=ko`);
      const profile=el(p,'card-review-home-profile');
      await profile.getByTestId('text-review-home-resume').waitFor();
      assert.equal(await profile.getByRole('link',{name:'이어서 하기',exact:true}).count(),0);
      assert.equal(await profile.getByTestId('link-review-home-resume').count(),0);
      await profile.getByTestId('link-review-report').click();
      await p.waitForURL(/\/report(?:\?|$)/);
      await p.goto(`${base}/lab?lang=ko`);
      const search=el(p,'button-company-lab-search'), company=el(p,'input-company-lab-company'), job=el(p,'input-company-lab-job');
      assert.equal((await search.innerText()).trim(),'검색');
      await p.getByText(/검색 결과는 새 탭에서 열립니다/).waitFor();
      const posted:unknown[]=[];
      const api='**/api/career/lab-search';
      await ctx.route(api,async route=>{
        posted.push(route.request().postDataJSON());
        await route.fulfill({status:posted.length===1?504:401,json:{error:posted.length===1?'LAB_SEARCH_TIMEOUT':'AUTH_REQUIRED'}});
      });
      await company.fill('');await job.fill('');await search.click();
      await el(p,'status-company-lab-input').getByText('회사명이나 직무명을 하나 이상 입력해 주세요.').waitFor();
      assert.equal(ctx.pages().length,1);
      assert.equal(await el(p,'link-company-lab-external').count(),0);
      assert.equal(posted.length,0);
      await company.fill('대한항공');await job.fill('지상직');
      await search.evaluate((b:HTMLButtonElement)=>{b.click();b.click();});
      await p.getByText(/공개자료 검색이 오래 걸려/).waitFor();
      assert.deepEqual(posted,[{company:'대한항공',job:'지상직'}]);
      await p.getByRole('button',{name:'입력 그대로 다시 검색'}).click();
      await el(p,'link-lab-auth').waitFor();
      assert.equal(posted.length,2);
      const confirmEvidence=async (cat:'values'|'duties')=>{
        await click(p,'button-lab-reviewed-source');
        await click(p,'button-lab-material');
        const group=el(p,`group-lab-${cat}`);
        await group.getByRole('link',{name:/원문 열기/}).first().waitFor();
        assert.match((await group.getByRole('link').first().getAttribute('href'))!,/^https:\/\//);
        await group.getByRole('button',{name:'이 근거를 강점과 비교'}).first().click();
        await el(p,'view-lab-strength').getByText(/가상 결과지 강점/).waitFor();
        assert(await el(p,'button-lab-link-story').isDisabled());
        await el(p,'checkbox-lab-connection').check();await click(p,'button-lab-link-story');
        await el(p,'status-lab-link').getByText(/스토리보드 작성 자료에 연결했어요/).waitFor();
      };
      await confirmEvidence('values');
      const resultGroups=el(p,'view-lab-keywords');
      assert.equal(await resultGroups.getByTestId('group-lab-values').getByRole('listitem').count(),6);
      assert.match(await resultGroups.getByTestId('group-lab-required').locator('summary').innerText(),/자료 없음/);
      await p.reload();
      await el(p,'status-lab-prior-connection').waitFor();
      assert(await el(p,'button-lab-link-story').isDisabled());
      assert.equal(await job.inputValue(),'지상직');
      await company.fill('프로에스콤');await job.fill('보안');
      await job.press('Enter');
      await el(p,'link-lab-auth').waitFor();
      assert.deepEqual(posted.at(-1),{company:'프로에스콤',job:'보안'});
      assert.match(decodeURIComponent((await el(p,'link-company-lab-external').getAttribute('href'))!).replace(/\+/g,' '),/프로에스콤 보안 채용 공식 채용공고/);
      await confirmEvidence('duties');
      assert.equal(await el(p,'list-lab-connections').locator('li').count(),2);
      await shot('lab-keyword-strength');
      await p.goto(`${base}/storyboard?lang=ko`);
      assert.equal(await el(p,'input-section-3').inputValue(),storyText);
      await el(p,'view-story-lab-connection').waitFor();
      await p.goto(`${base}/lab?lang=ko`);
      await job.fill('');
      await search.click();await el(p,'link-lab-auth').waitFor();
      assert.deepEqual(posted.at(-1),{company:'프로에스콤',job:''});
      await company.fill('');await job.fill('지상직');
      await search.click();await el(p,'link-lab-auth').waitFor();
      assert.deepEqual(posted.at(-1),{company:'',job:'지상직'});
      const externalPattern='https://www.google.com/search?**';
      await ctx.route(externalPattern,route=>route.fulfill({contentType:'text/plain',body:'QA captured navigation only'}));
      const [popup]=await Promise.all([p.waitForEvent('popup'),el(p,'link-company-lab-external').click()]);
      await popup.waitForURL(externalPattern);
      assert.equal(new URL(popup.url()).searchParams.get('q'),'지상직 채용 공식 채용공고');
      assert.equal(await popup.evaluate(()=>window.opener===null),true);
      await popup.close();await ctx.unroute(externalPattern);
      await shot('lab-search-fallback');
      await p.reload();
      assert.equal(await company.inputValue(),'');
      assert.equal(await job.inputValue(),'지상직');
      assert.equal(await p.getByTestId('card-company-fixture').count(),0);
      assert.equal(await p.getByText(/일치하는 가상 예시가 없어요/).count(),0);
      await el(p,'view-company-preferences').locator('summary').click();
      await click(p,'button-company-prefer-job');
      await el(p,'view-company-preferences').getByText('직무군 · 지상직').waitFor();
      await click(p,'button-company-preference-remove-job');
      assert.equal(await el(p,'view-company-preferences').locator('li').count(),0);
      await ctx.unroute(api);
      const liveFile=process.env.NUVIA_LAB_QA_REPLAY ?? resolve(out,'live-provider.json');
      const replay=JSON.parse(await readFile(liveFile,'utf8')).cases.find((c:{query:{company:string}})=>c.query.company==='네이버')?.result;
      assert(replay?.materials.length,'Naver replay must come from a recorded provider result');
      let submits=0,polls=0;
      await ctx.route(api,route=>{submits++;return route.fulfill({status:202,json:{id:'qa-naver',state:'pending'}});});
      const pollPattern='**/api/career/lab-search/qa-naver';
      await ctx.route(pollPattern,route=>{polls++;return route.fulfill({status:200,json:{id:'qa-naver',state:'completed',result:replay}});});
      await company.fill('네이버');await job.fill('서비스기획');
      await Promise.all([p.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/api/career/lab-search')&&r.status()===202),search.click()]);
      await p.waitForFunction(()=>Object.keys(localStorage).some(k=>localStorage.getItem(k)?.includes('qa-naver')));
      await el(p,'status-lab-searching').waitFor();
      await p.goto(`${base}/home?lang=ko`);await p.goto(`${base}/lab?lang=ko`);
      assert.equal(await company.inputValue(),'네이버');
      assert.equal(await job.inputValue(),'서비스기획');
      await p.getByText(/지난 검색어가 남아 있어요/).waitFor();await p.reload();
      await p.getByText(/지난 검색어가 남아 있어요/).waitFor();
      await p.getByRole('button',{name:'입력 그대로 다시 검색'}).click();
      await p.getByRole('heading',{name:'GPT 웹 검색 결과',exact:true}).waitFor();
      assert.equal(submits,1);assert.equal(polls,1);
      await click(p,'button-lab-material');
      const replayRows=replay.materials[0].evidence as {category:string;keyword:string;keywordOrigin:string;excerpt:string}[];
      assert(replayRows.length>0&&replayRows.every(row=>row.keyword.replace(/\s/g,'')!=='서비스기획'&&row.keywordOrigin));
      const first=replayRows[0]!;
      const excerptGroup=el(p,`group-lab-${first.category}`);
      if(!await excerptGroup.evaluate(node=>(node as HTMLDetailsElement).open))await excerptGroup.locator('summary').click();
      await excerptGroup.getByRole('link',{name:/원문 열기/}).first().waitFor();
      await excerptGroup.getByTestId('text-lab-keyword-origin').first().waitFor();
      assert.match(await el(p,'group-lab-required').locator('summary').innerText(),/공고 지원요건·경험/);
      assert(!replayRows.some(row=>row.category==='duties'&&row.excerpt.includes('끝까지 해 보신 분')));
      await shot('lab-naver-gpt-replay');
      await ctx.unroute(api);
      await ctx.unroute(pollPattern);
      await fit(p);
    };
    await run(async()=>{
      date=await st('input-studio-daily-date').inputValue();
      await sClick('button-studio-add-job');
      assert(await st('button-studio-add-job').isDisabled());
      const id=await place(0);
      await st(`edit-panel-${id}`).locator('summary').first().click();
      const settings=st(`edit-panel-${id}`).getByText('기본 정보 고치기',{exact:true});
      await settings.evaluate(n=>n.scrollIntoView({block:'center'}));
      await settings.click();
      await st('detail-minutes').fill('7');
      await st('detail-start-time').fill('09:30');
      await sClick('base-save');
      await sClick('start');await sClick('pause');
      assert.match(await st('timer').innerText(),/남은 시간/);
      await st('input-studio-worksheet').fill(note);
      if(width===360){
        const layout=await st('input-studio-worksheet').evaluate(n=>{
          const desk=document.querySelector('.st-desk')!;
          const card=document.querySelector('.st-curfile')!;
          const menu=document.querySelector('.st-bottom')!.getBoundingClientRect();
          const timer=document.querySelector('[data-testid="timer"]')!.getBoundingClientRect();
          return {frame:innerWidth,frameHeight:innerHeight,desk:Math.round(desk.getBoundingClientRect().width),file:Math.round(card.getBoundingClientRect().width),input:Math.round(n.getBoundingClientRect().width),columns:getComputedStyle(card).gridTemplateColumns,
            menuTop:menu.top,menuBottom:menu.bottom,timerWidth:Math.round(timer.width),textWrap:getComputedStyle(n).wordBreak};
        });
        const parent=await p.evaluate(()=>({width:innerWidth,height:innerHeight,scrollHeight:document.documentElement.scrollHeight}));
        await writeFile(`${out}/360-worksheet-layout.json`,JSON.stringify({layout,parent},null,2));
        assert(layout.frame>=344 && layout.desk>=315 && layout.input>=235,JSON.stringify(layout));
        assert.equal(layout.columns.trim().split(/\s+/).length,1);
        assert(layout.menuTop>0 && layout.menuBottom<=layout.frameHeight && layout.timerWidth>=200);
        assert.equal(layout.textWrap,'keep-all');
        assert.equal(parent.scrollHeight,parent.height);
        await st('input-studio-worksheet').evaluate(n=>window.scrollBy(0,n.getBoundingClientRect().top-55));
        const visible=await st('input-studio-worksheet').evaluate(n=>{
          const field=n.getBoundingClientRect();
          return {top:field.top,bottom:field.bottom,menuTop:document.querySelector('.st-bottom')!.getBoundingClientRect().top,innerScroll:scrollY};
        });
        assert(visible.top>=0 && visible.bottom<=visible.menuTop && visible.innerScroll>0,JSON.stringify(visible));
        await shot('worksheet');
        await st('timer').evaluate(n=>window.scrollBy(0,n.getBoundingClientRect().top-55));
        await shot('timer');
      }
      await p.goto(`${base}/home?lang=ko`);await p.goBack();
      assert.equal(await st('input-studio-worksheet').inputValue(),note);
      await p.reload();assert.equal(await st('input-studio-worksheet').inputValue(),note);
      const oldCount=await st('suggestion-studio-job').count();
      await sClick('button-studio-more-job');assert.equal(await st('suggestion-studio-job').count(),oldCount+1);
      await frame.getByText('추천 이유와 도움 보기',{exact:true}).first().click();
      await st('select-studio-report').selectOption('none');
      await st('input-studio-daily-date').fill('2026-12-01');
      await sClick('button-studio-daily-pair');
      await st('suggestion-studio-job').locator('summary').click();
      await st('suggestion-studio-cognitive').locator('summary').click();
      assert.match(await st('suggestion-studio-job').innerText(),/자료가 없어|자료 없음/);
      assert.match(await st('suggestion-studio-cognitive').innerText(),/자료가 없어|자료 없음/);
      await st('input-studio-daily-date').fill(date);
      assert.equal(await st('suggestion-studio-job').count(),oldCount+1);
      await sClick('resume');await sClick('review-run');
      await frame.getByRole('button',{name:'마쳤어요',exact:true}).click();
      await st('run-panel').getByRole('spinbutton').fill('1');
      await sClick('close-run');
      assert.match(await st('section-collection-compact').innerText(),/나가기 전에 챙길 것 적기/);
      await shot('original-studio');
      await st('section-collection-compact').getByTestId(`button-select-${id}`).click();
      assert.equal(await st('input-studio-worksheet').inputValue(),note);
      await sClick('button-studio-worksheet-save');
      await st('checkbox-studio-worksheet-use').check();
      await sClick('button-studio-worksheet-use');
      await el(p,'status-review-story-sources-saved').waitFor();
      await p.goto(`${base}/planner?lang=ko`);
      await st('button-studio-add-cognitive').first().click();
      await place(0);
      await st('input-studio-worksheet').fill(extraNote);await sClick('button-studio-worksheet-save');
      assert.equal(await st('input-studio-worksheet').inputValue(),extraNote);
    });
    await run(async()=>{
      if(width===360){
        await st('input-studio-worksheet').fill(extraNote+'\n[저장 오류 주입 QA]');
        await st('studio-root').evaluate(()=>{
          const save=Storage.prototype.setItem;
          Storage.prototype.setItem=function(key,val){
            if(key.startsWith('nuvia:review-device:v2:data:') && JSON.parse(val).events?.at(-1)?.key?.startsWith('review:studio-worksheet-saved'))
              throw new DOMException('Synthetic failure','QuotaExceededError');
            return save.call(this,key,val);
          };
          (window as unknown as {qaRestore:()=>void}).qaRestore=()=>{Storage.prototype.setItem=save;};
        });
        await sClick('button-studio-worksheet-save');
        await st('status-studio-worksheet-error').waitFor();
        assert.equal(await st('input-studio-worksheet').inputValue(),extraNote+'\n[저장 오류 주입 QA]');
        await st('studio-root').evaluate(()=>(window as unknown as {qaRestore:()=>void}).qaRestore());
        await st('input-studio-worksheet').fill(extraNote+'\n[저장 재시도 QA]');
      }
      await sClick('button-studio-worksheet-save');
      assert(await st('button-studio-worksheet-use').isDisabled());
      await st('checkbox-studio-worksheet-use').check();
      await sClick('button-studio-worksheet-use');
      await el(p,'status-review-story-sources-saved').waitFor();
      await click(p,'button-review-build-story');
      assert.equal(await el(p,'input-section-3').inputValue(),'');
      await click(p,'button-review-apply-story');
      storyText=await el(p,'input-section-3').inputValue();
      assert(storyText.includes(extraNote));
      assert(storyText.includes(note));
      await p.reload();assert.equal(await el(p,'input-section-3').inputValue(),storyText);
      await click(p,'checkbox-fact');await click(p,'checkbox-use');
      await p.getByRole('button',{name:'최종 저장하고 다운로드로'}).click();
      await el(p,'status-confirmed').waitFor();
      let exportApiCalls=0;
      await p.route('**/api/career/export',route=>{exportApiCalls++;return route.abort('failed');});
      for(const fmt of ['txt','docx','hwpx','pdf'])await exportFile(fmt);
      exportChecks.push({width,serverRequests:exportApiCalls});
      assert.equal(exportApiCalls,0,'the review submitted confirmed text to the document server');
      assert.equal(await el(p,'input-section-3').inputValue(),storyText);
      assert.equal(await p.getByTestId(/^row-version-/).count(),1);
      assert(!paths.some(x=>x.endsWith('/lab')));
      await fit(p);await shot('story');
    });
    await run(checkSearch);
    await run(async()=>{
      await p.clock.setFixedTime(new Date('2026-11-20T12:00:00+09:00'));
      await p.goto(`${base}/lab?lang=ko`);
      const posts=el(p,'view-partner-postings');
      await posts.waitFor();
      assert.match(await p.locator('main').innerText(),/공개자료 또는 확인 대기 목록/);
      assert.equal(await posts.getByTestId('text-partner-hiring-notice').locator('h2').innerText(),'필굿 협력기관 프로에스콤 인재채용 안내');
      assert.equal(await posts.getByTestId('text-partner-hiring-notice').locator('p').innerText(),'캠프에 참여하여 D-CAS 검사를 진행한 학생 중 기업 지원을 희망하는 학생은 개인톡으로 알려주세요. 결과지 연동과 함께 긍정적인 강점을 부각하여 기업 면접을 지원할 예정입니다.');
      assert.equal(await posts.getByText(/사용자가 지정한 관심 사업장입니다/).count(),0);
      assert.equal(await posts.getByRole('listitem').count(),8);
      const recruiters=await posts.getByTestId('text-partner-recruiter').allTextContents();
      assert.equal(recruiters.filter(x=>x.includes('프로에스콤')).length,7);
      assert.equal(recruiters.filter(x=>x.includes('바스')).length,1);
      assert.equal(await posts.getByText(/라디안큐바이오/).count(),0);
      assert.equal(await posts.getByText('공고상 모집기간 내',{exact:true}).count(),3);
      assert.equal(await posts.getByText('최신 공고 확인 필요',{exact:true}).count(),5);
      assert.equal(await posts.getByRole('link',{name:'공고 원문 열기'}).count(),3);
      assert.match((await el(p,'card-partner-coupang-icn').getByRole('link').getAttribute('href'))!,/50285569/);
      await el(p,'card-partner-the-hyundai').locator('summary').click();
      assert.match(await el(p,'card-partner-the-hyundai').innerText(),/경력·학력 무관[\s\S]*관련 업무 경험/);
      await p.clock.setFixedTime(new Date('2026-11-23T00:01:00+09:00'));await p.reload();
      assert.equal(await el(p,'card-partner-the-hyundai').getByText('마감',{exact:true}).count(),1);
      assert.equal(await el(p,'card-partner-ibk').getByText('공고상 모집기간 내',{exact:true}).count(),1);
      await fit(p);await shot('lab');
      await el(p,'card-partner-gimhae-airbusan').getByTestId('button-partner-explore').click();
      assert.equal(await el(p,'input-company-lab-company').inputValue(),'바스');
      assert.match(decodeURIComponent((await el(p,'link-company-lab-skills').getAttribute('href'))!),/바스.*김해공항 에어부산 지상직.*필요역량/);
      assert.equal(await p.getByTestId(/^input-company-source-/).count(),0);
      assert.equal(await p.getByTestId('button-company-source-review').count(),0);
    });
    await run(async()=>{
      await p.goto(`${base}/storyboard?lang=ko`);
      assert.equal(await el(p,'input-section-3').inputValue(),storyText);
      assert.equal(await p.getByTestId(/^row-version-/).count(),1);
      await el(p,'text-review-story-interest').waitFor();
      await p.goto(`${base}/planner?lang=ko`);
      assert.equal(await st('input-studio-daily-date').inputValue(),date);
      assert.equal(await st('suggestion-studio-job').count(),2);
      assert.equal(await st('input-studio-worksheet').inputValue(),width===360?extraNote+'\n[저장 재시도 QA]':extraNote);
      await sClick('note-toggle');
      await st('note-input').fill(`${freeNote}\n[비공개 QA] 이 문장은 옮기지 않습니다.`);
      await p.reload();
      await sClick('note-toggle');
      assert.match(await st('note-input').inputValue(),/이 문장은 옮기지 않습니다/);
      await st('view-studio-free-transfer').locator('summary').click();
      await st('input-studio-free-excerpt').fill(freeNote);
      await st('checkbox-studio-free-use').check();
      await sClick('button-studio-free-use');
      await el(p,'status-review-story-sources-saved').waitFor();
      assert.equal(await p.getByTestId(/^review-story-source-review-card-/).count(),3);
      assert(!(await p.locator('main').textContent())!.includes('[비공개 QA]'));
      assert.equal(await el(p,'input-section-3').inputValue(),storyText);
      assert.equal(await p.getByTestId(/^row-version-/).count(),1);
      await p.goto(`${base}/history?lang=ko`);
      await p.waitForURL(/\/planner(?:\?|$)/);
      assert.equal(await p.getByTestId('link-review-history').count(),0);
      await frame.getByRole('heading',{name:'내 하루 작업대'}).waitFor();
      await st('input-studio-worksheet').fill(`${extraNote} 수정`);
      await p.goto(`${base}/storyboard?lang=ko`);
      await p.getByText('원본이 바뀌었어요. 플래너에서 수정한 기록을 다시 확인해 주세요.',{exact:true}).waitFor();
      assert.equal(await el(p,'input-section-3').inputValue(),storyText);
    });
  }catch{
    await shot('failed').catch(()=>{});
    while(completed<stages.length)checks.push({width,name:stages[completed++],result:'BLOCKED'});
  }finally{await ctx.close();}
}));
// Exercise the failure UI without changing app storage or the network service.
const recovery=await browser.newPage({viewport:{width:360,height:850}});
const opened=new Date().toISOString();
await recovery.goto(`${base}?lang=ko`);
await recovery.getByTestId('button-review-start').click();
const failPlanner='**/src/review-studio-main.tsx*';
await recovery.route(failPlanner,r=>r.abort());
await recovery.getByTestId('link-review-routine-planner').click();
try {
  await recovery.getByTestId('status-review-studio-failed').waitFor({timeout:18000});
  await recovery.screenshot({path:`${out}/360-frame-error.png`});
  await recovery.unroute(failPlanner);
  await recovery.getByRole('button',{name:'작업대 다시 열기',exact:true}).click();
  await recovery.locator('[data-testid="frame-review-studio"][data-ready="ready"]').waitFor({timeout:20000});
  checks.push({width:360,name:'자산 요청 실패 시 안내와 같은 탭 재시도',result:'PASS',detail:opened});
}catch(error) {
  checks.push({width:360,name:'자산 요청 실패 시 안내와 같은 탭 재시도',result:'FAIL',detail:String(error)});
}finally{await recovery.close();}
await browser.close();
const ended=new Date().toISOString();
await writeFile(`${out}/results.json`,JSON.stringify({head,origin,started,ended,checks,pageErrors,downloads,exportChecks},null,2)+'\n');
if(pageErrors.length||checks.some(x=>x.result!=='PASS'))process.exitCode=1;
