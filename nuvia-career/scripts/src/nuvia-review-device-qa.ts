import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, extname, sep } from 'node:path';
import { chromium, type BrowserContext, type Page } from 'playwright';

const origin=process.env.NUVIA_TEST_ORIGIN;
const oldDist=process.env.NUVIA_REVIEW_LEGACY_DIST;
if(!origin||!oldDist)throw Error('Set NUVIA_TEST_ORIGIN and NUVIA_REVIEW_LEGACY_DIST.');
const base=`${origin}/demo/review`;
const dir=resolve(import.meta.dirname,'../../generated-artifacts',process.env.NUVIA_REVIEW_QA_DIR??'nuvia-review-export-mobile-qa');
await mkdir(dir,{recursive:true});
const userDir=await mkdtemp(resolve(tmpdir(),'nuvia-qa-profile-'));
const started=new Date().toISOString();
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const legacy='8984fa721719c77113715785f8c4c324939a0670';
const note='약속 장소까지 걸리는 시간을 지도에서 먼저 확인하겠습니다. 익숙한 길로 가되 도착 예상 시간을 비교하고 여유 시간을 남기겠습니다.';
const free='오늘 아침에는 물을 마시고 가방을 챙긴 뒤 10분 동안 산책했습니다.';
const results:{name:string;result:string;detail?:string}[]=[];
const badNetwork:string[]=[];
const sha=(x:string)=>createHash('sha256').update(x).digest('hex');
const mime:Record<string,string>={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const open=()=>chromium.launchPersistentContext(userDir,{executablePath:'/repl/tools/bin/chromium',args:['--no-sandbox'],acceptDownloads:true,viewport:{width:360,height:800}});
let ctx:BrowserContext=await open();
let p:Page=ctx.pages()[0]??await ctx.newPage();
const el=(id:string)=>p.getByTestId(id);
const st=(id:string)=>p.frameLocator('[data-testid="frame-review-studio"]').getByTestId(id);
const go=(path='')=>p.goto(`${base}${path}?lang=ko`);
async function step(name:string,run:()=>Promise<unknown>){
  try{await run();results.push({name,result:'PASS'});console.log('PASS',name);}
  catch(error){results.push({name,result:'FAIL',detail:String(error)});console.error('FAIL',name,String(error));throw error;}
}
const legacyRoute=`${origin}/**`;
const watch=(page:Page)=>page.on('request',request=>{
  const url=new URL(request.url());
  if(url.origin===origin&&url.pathname.startsWith('/api/')&&request.method()!=='GET')badNetwork.push(url.pathname);
});
let content='', cardTitle='', priorHash='';
let priorTab:Record<string,string>={};
try{
  await step('이전 커밋 빌드를 같은 탭에 열어 카드·멈춘 타이머·활동지·자유메모·V1 생성',async()=>{
    await ctx.route(legacyRoute,async route=>{
      const path=new URL(route.request().url()).pathname;
      if(path.startsWith('/api/')||route.request().method()!=='GET')return route.continue();
      const root=resolve(oldDist);
      const candidate=resolve(root,`.${path}`);
      if(!candidate.startsWith(root+sep)&&candidate!==root)return route.abort();
      const present=await stat(candidate).then(x=>x.isFile(),()=>false);
      const file=present?candidate:resolve(root,'index.html');
      return route.fulfill({path:file,contentType:mime[extname(file)]??'application/octet-stream'});
    });
    await go();await el('button-review-start').click();
    await el('link-review-routine-planner').click();
    await st('button-studio-daily-create').click();
    await st('button-studio-add-cognitive').click();
    const tag=st('section-shelf').locator('[data-testid^="button-select-"]').first();
    const id=(await tag.getAttribute('data-testid'))!.slice('button-select-'.length);
    await tag.click();await st(`button-place-${id}`).click();
    cardTitle=await st('text-desk-title').innerText();
    await st('start').click();await st('pause').click();
    await st('input-studio-worksheet').fill(note);await st('button-studio-worksheet-save').click();
    await st('note-toggle').click();await st('note-input').fill(free);
    await st('checkbox-studio-worksheet-use').check();await st('button-studio-worksheet-use').click();
    await el('status-review-story-sources-saved').waitFor();await el('button-review-build-story').click();await el('button-review-apply-story').click();
    content=await el('input-section-3').inputValue();
    assert(content.includes(note));
    await el('checkbox-fact').click();await el('checkbox-use').click();await el('button-confirm-storyboard').click();await el('status-confirmed').waitFor();
    assert.equal(await p.getByTestId(/^row-version-/).count(),1);
    const raw=await p.evaluate(()=>sessionStorage.getItem('nuvia:review-demo:v1:original-studio:v1'));
    assert(raw?.includes(free));
    priorHash=sha(raw!);
    priorTab=await p.evaluate(()=>Object.fromEntries(Object.entries(sessionStorage).filter(([key])=>key.startsWith('nuvia:review-demo:v1:'))));
    assert.equal(await p.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('nuvia:review-device:v2:'))),false);
  });
  await ctx.unroute(legacyRoute);
  watch(p);
  await step('같은 탭 업그레이드: 원본 저장소 손대지 않고 V1과 멈춘 타이머·활동지·자유메모 복원',async()=>{
    await p.reload();await el('input-section-3').waitFor();
    assert.equal(await el('input-section-3').inputValue(),content);
    assert.equal(await p.getByTestId(/^row-version-/).count(),1);
    assert.equal(sha((await p.evaluate(()=>sessionStorage.getItem('nuvia:review-demo:v1:original-studio:v1')))!),priorHash);
    await go('/planner');
    assert.equal(await st('text-desk-title').innerText(),cardTitle);
    await st('resume').waitFor();
    assert.equal(await st('input-studio-worksheet').inputValue(),note);
    await st('studio-review-report-linked').waitFor();
    assert.match(await st('studio-review-report-linked').innerText(),/실제 검사 아님/);
    await st('note-toggle').click();
    assert.equal(await st('note-input').inputValue(),free);
    await p.screenshot({path:`${dir}/migration-after.png`});
  });
  await step('검색/노출과 명시 선호를 구분하고 두 번 눌러도 한 건만 반영 · 선호 해제 이력',async()=>{
    await go('/lab');
    await el('input-company-lab-company').fill('가상 QA 회사');
    await el('input-company-lab-job').fill('교육 운영 지원');
    await el('button-company-lab-search').evaluate(n=>{
      (n as HTMLButtonElement).click();(n as HTMLButtonElement).click();
    });
    await el('link-company-lab-external').waitFor();
    await el('link-company-lab-external').evaluate(link=>{link.addEventListener('click',e=>e.preventDefault(),{once:true});(link as HTMLElement).click();});
    const interests=el('view-company-preferences');
    await interests.locator('summary').click();
    assert.match(await interests.locator('summary').innerText(),/· 0/);
    await el('button-company-prefer-company').evaluate(n=>{(n as HTMLButtonElement).click();(n as HTMLButtonElement).click();});
    await el('button-company-prefer-job').click();
    await el('button-company-preference-remove-company').click();
    const posting=el('card-partner-the-hyundai');await posting.locator('summary').click();
    await posting.getByRole('link').evaluate(link=>{link.addEventListener('click',e=>e.preventDefault(),{once:true});(link as HTMLElement).click();});
    await p.reload();
    assert.equal(await el('input-company-lab-job').inputValue(),'교육 운영 지원');
    await interests.locator('summary').click();
    assert.equal(await interests.locator('li').count(),1);
    assert.match(await interests.innerText(),/교육 운영 지원/);
  });
  await step('연구는 기본 미선택; 부여와 철회도 연구 요청 없음 · 원본 백업 저장',async()=>{
    await go('/home');
    const panel=el('review-device-controls');
    await panel.locator('summary').click();
    assert.equal(await el('checkbox-review-research').isChecked(),false);
    await el('checkbox-review-research').check();await el('checkbox-review-research').uncheck();
    const file=p.waitForEvent('download');
    await el('button-review-backup').click();
    await (await file).saveAs(`${dir}/synthetic-device-backup.json`);
    const backup=JSON.parse(await readFile(`${dir}/synthetic-device-backup.json`,'utf8')).data;
    for(const kind of ['legacy.migrated','research.granted','research.withdrawn','lab.search.submitted','lab.external.open-attempt','lab.preference.added','lab.preference.removed','lab.partner.detail-opened','lab.partner.open-attempt'])
      assert(backup.events.some((e:{activity:string})=>e.activity===kind),kind);
    assert(backup.events.every((e:{receivedAt:null})=>e.receivedAt===null));
    assert.equal(new Set(backup.events.map((e:{id:string})=>e.id)).size,backup.events.length);
    const trail=Object.entries(backup.values).filter(([k])=>k.startsWith('review:activity-event:')).map(([,v])=>JSON.parse(v as string));
    assert.equal(trail.filter(x=>x.type==='lab.search.submitted'&&x.detail.company==='가상 QA 회사').length,1);
    const searchAttempt=trail.find(x=>x.type==='lab.external.open-attempt'&&x.source==='public-web-job-search');
    assert.equal(searchAttempt?.detail.tabStatus,'link-requested');
    assert.equal(searchAttempt?.detail.filter,'official-careers-and-public-postings');
    assert(!Object.hasOwn(searchAttempt.detail,'resultIds'));
    assert(!trail.some(x=>x.type==='lab.results.shown'));
    const attempted=trail.find(x=>x.type==='lab.partner.open-attempt');
    assert(attempted?.detail.postingRef?.startsWith('https://www.jobkorea.co.kr/Recruit/GI_Read/'));
    assert(!attempted.detail.postingRef.includes('?'));
    assert.deepEqual(badNetwork,[]);
  });
  await step('Chromium 종료 후 새 세션: V1·원문·멈춘 타이머와 선호가 그대로 유지',async()=>{
    await ctx.close();ctx=await open();p=ctx.pages()[0]??await ctx.newPage();watch(p);
    await go('/storyboard');
    assert.equal(await el('input-section-3').inputValue(),content);
    assert.equal(await p.getByTestId(/^row-version-/).count(),1);
    await go('/planner');await st('resume').waitFor();
    assert.equal(await st('input-studio-worksheet').inputValue(),note);
    await go('/lab');assert.equal(await el('input-company-lab-job').inputValue(),'교육 운영 지원');
    await el('view-company-preferences').locator('summary').click();assert.equal(await el('view-company-preferences').locator('li').count(),1);
  });
  await step('새 프로필 격리 · 잘못된 백업 거절 · 새 프로필로 복원 시 기존 원문과 연구 기본값 유지',async()=>{
    await go('/home');
    await el('review-device-controls').locator('summary').click();await el('button-review-profile-new').click();
    await el('button-review-start').click();await go('/lab');assert.equal(await el('input-company-lab-job').inputValue(),'');
    await go('/home');await el('review-device-controls').locator('summary').click();
    await el('input-review-restore').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"schema":2}')});
    await p.getByText('지원하는 검토본 백업을 읽지 못했습니다. 현재 기록은 바뀌지 않았습니다.').waitFor();
    await el('input-review-restore').setInputFiles(`${dir}/synthetic-device-backup.json`);
    await p.waitForURL(/\/demo\/review\?lang=ko$/);await go('/storyboard');assert.equal(await el('input-section-3').inputValue(),content);
    await go('/home');await el('review-device-controls').locator('summary').click();assert.equal(await el('checkbox-review-research').isChecked(),false);
    assert.notEqual(await el('select-review-profile').inputValue(),'demo-default');
    await el('select-review-profile').selectOption('demo-default');
    await p.waitForURL(/\/demo\/review\?lang=ko$/);await go('/storyboard');assert.equal(await el('input-section-3').inputValue(),content);
    assert.deepEqual(badNetwork,[]);
  });
  await step('기기 저장과 내용이 다른 이전 탭은 별도 복구 프로필에서 열리고 기본 프로필은 그대로 유지',async()=>{
    const oldTab=await ctx.newPage();
    await oldTab.addInitScript(data=>{
      if(sessionStorage.getItem('nuvia-test-fixture-loaded'))return;
      for(const [key,value] of Object.entries(data))sessionStorage.setItem(key,value);
      sessionStorage.setItem('nuvia-test-fixture-loaded','1');
    },priorTab);
    await oldTab.goto(`${base}/home?lang=ko`);
    const panel=oldTab.getByTestId('review-device-controls');
    await panel.locator('summary').click();
    assert.notEqual(await oldTab.getByTestId('select-review-profile').inputValue(),'demo-default');
    await oldTab.goto(`${base}/storyboard?lang=ko`);
    assert.equal(await oldTab.getByTestId('input-section-3').inputValue(),content);
    await oldTab.close();
    await go('/lab');
    assert.equal(await el('input-company-lab-job').inputValue(),'교육 운영 지원');
  });
}catch{
  await p.screenshot({path:`${dir}/migration-failed.png`}).catch(()=>{});
  process.exitCode=1;
}finally{
  await ctx.close();
  await rm(userDir,{recursive:true,force:true});
  await writeFile(`${dir}/device-and-legacy-results.json`,JSON.stringify({head,legacy,origin,started,ended:new Date().toISOString(),results,networkWrites:badNetwork,legacyOriginalSha256:priorHash},null,2));
}
