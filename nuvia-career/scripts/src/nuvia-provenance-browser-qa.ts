/// <reference lib="dom" />
/** Disposable device-only synthetic contexts. Not account or external integration QA. */
import { chromium, type Page } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const origin = process.env.NUVIA_TEST_ORIGIN ?? 'http://localhost:80';
const publicRun = process.argv.includes('--public');
const out = fileURLToPath(new URL(publicRun ? '../../generated-artifacts/public-demo-qa' : '../../generated-artifacts/provenance-qa', import.meta.url));
const locales = ['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'];
const sizes = [{width:1440,height:1000},{width:768,height:1024},{width:360,height:800}];
const smoke = process.argv.includes('--smoke');
const impact = process.argv.includes('--impact');
const retryFailed = process.argv.includes('--retry-failed');
const browser = await chromium.launch({executablePath:'/repl/tools/bin/chromium',args:['--no-sandbox']});
await mkdir(out,{recursive:true});
const results: any[] = [];
let retryIds: Set<string> | null = null;
if(retryFailed) {
  const prior=JSON.parse(await readFile(`${out}/matrix.json`,'utf8'));
  await writeFile(`${out}/matrix-before-retry.json`,JSON.stringify(prior,null,2));
  retryIds=new Set(prior.results.filter((r:any)=>r.status!=='passed').map((r:any)=>r.id));
  results.push(...prior.results.filter((r:any)=>r.status==='passed'));
}
const writing = '모의 활동에서 예약 장애 상황의 안내를 비교하고 먼저 확인할 정보를 정했습니다.\n실제 근무나 개선 성과가 아니라 판단 과정을 연습한 합성 검사 글입니다.\nLine break · العربية ไทย ខ្មែរ';
const actualWriting = '합성 검증 기록입니다. 교내 예약 안내 두 곳을 직접 비교하고 다른 준비 서류를 표로 기록했습니다.\n관찰한 차이만 기록했으며 개선 성과는 확인하지 않았습니다.';
async function data(p:Page) {
  return p.evaluate((pub) => {
    const storage=pub?sessionStorage:localStorage;
    const prefix=pub?'nuvia:public-demo:v1:':'';
    return {
      state:JSON.parse(storage.getItem(prefix+(pub?'nuvia:example:state':'nuvia:guest:state')) || '{}'),
      meta:JSON.parse(storage.getItem(prefix+`nuvia:provenance:v1:${pub?'demo':'guest'}`) || '{}'),
      versions:JSON.parse(storage.getItem(prefix+(pub?'nuvia:example:versions':'nuvia:guest:versions')) || '[]'),
    };
  },publicRun);
}
async function go(p:Page,path:string,lang:string) {
  await p.goto(`${origin}${publicRun?'/demo':''}${path}${path.includes('?')?'&':'?'}space=${publicRun?'example':'guest'}&lang=${lang}`);
  await p.getByTestId('button-language').waitFor();
  await p.locator('h1').first().waitFor();
  await p.waitForTimeout(220);
}
async function scan(p:Page,id:string,label:string,shots=false) {
  const g = await p.evaluate(() => {
    const b = document.querySelector('[data-testid="button-language"]')!.getBoundingClientRect();
    return {width:innerWidth,scroll:document.documentElement.scrollWidth,button:{x:b.x,y:b.y,w:b.width,h:b.height},
      lang:document.documentElement.lang,dir:document.documentElement.dir,
      text:document.body.innerText};
  });
  assert(g.scroll <= g.width+2,`${label} overflow ${g.scroll}/${g.width}`);
  assert(g.button.w>=44 && g.button.h>=44 && g.button.x>=0 && g.button.x+g.button.w<=g.width+1,`${label} selector bounds`);
  assert(!/\bpv\.(?:nt|ct|match|coach|f|st|req)\./.test(g.text),`${label} untranslated key`);
  if (g.lang==='ar') assert.equal(g.dir,'rtl');
  if(shots) await p.screenshot({path:`${out}/${id}-${label}.jpg`,fullPage:false});
  return {width:g.width,scroll:g.scroll,selector:g.button,lang:g.lang,dir:g.dir};
}
async function consentAdd(p:Page,key:string) {
  await p.getByTestId(`button-pick-seed-${key}`).click();
  await p.getByTestId('checkbox-fact-consent').check();
  await p.getByTestId('checkbox-usage-consent').check();
  await p.getByTestId('button-add-synthetic').click();
  await p.getByTestId('status-import-added').waitFor();
}
async function version(p:Page,label:string) {
  await p.getByTestId('button-save-version').click();
  await p.getByTestId('input-version-label').fill(label);
  await p.getByTestId('button-confirm-version').click();
  await p.getByRole('dialog').waitFor({state:'hidden'});
}
async function newQuestion(p:Page,lang:string,expId:string,company:string,requirement:string) {
  await go(p,'/questions',lang);
  await p.getByTestId('button-new-app').click();
  await p.getByTestId('input-company').fill(company);
  await p.getByTestId('input-job').fill('IT service planning · synthetic');
  await p.getByTestId('input-question').fill(requirement==='actual'?'직접 한 행동과 관찰한 결과를 설명하세요.':'모의 상황에서 무엇을 확인하고 왜 판단했는지 설명하세요.');
  await p.getByTestId('input-limit').fill('0');
  await p.getByTestId(`checkbox-app-exp-${expId}`).check();
  await p.getByTestId(`radio-requirement-${requirement}`).click();
}
async function exportUi(p:Page,lang:string,expId:string,text:string,id:string,download:boolean) {
  await go(p,'/export',lang);
  assert.equal(await p.getByTestId('preview-text').innerText(),text);
  assert(await p.getByTestId('button-export-docx').isDisabled());
  await p.getByTestId(`checkbox-fact-${expId}`).check();
  await p.getByTestId('checkbox-facts').check();
  assert(await p.getByTestId('button-export-docx').isEnabled());
  if(download) {
    for(const format of ['docx','hwpx']) {
      const request = p.waitForRequest(r=>r.url().includes('/api/career/export') && r.method()==='POST');
      const dl = p.waitForEvent('download');
      await p.getByTestId(`button-export-${format}`).click();
      const payload = (await request).postDataJSON();
      assert.deepEqual(Object.keys(payload).sort(),['company','confirmed','format','job','question','text']);
      assert.equal(payload.text,text);
      const file = `${out}/${id}.${format}`;
      await (await dl).saveAs(file);
      await writeFile(`${out}/${id}-input.json`,JSON.stringify(payload,null,2));
    }
  }
}
async function run(lang:string,size:typeof sizes[number]) {
  const id = `${lang}-${size.width}`;
  const ctx = await browser.newContext({viewport:size,acceptDownloads:true});
  const p=await ctx.newPage();
  const errors:string[]=[];
  p.on('pageerror',e=>errors.push(e.message));
  await ctx.exposeBinding('__qaError',(_,s)=>errors.push(String(s)));
  await ctx.addInitScript(`window.addEventListener('error',e=>window.__qaError(e.message));window.addEventListener('unhandledrejection',e=>window.__qaError(String(e.reason)));`);
  p.setDefaultTimeout(30000);
  const row:any={id,lang,size,scope:'synthetic device-only; no authenticated account or real connector',screens:{},checks:[]};
  try {
    let seedCounts={experiences:0,applications:0};
    if(publicRun){
      const seed=await (await ctx.request.get(`${origin}/api/career/example`)).json();
      seedCounts={experiences:seed.experiences.length,applications:seed.applications.length};
      await go(p,'/?view=summary',lang);
      await p.getByTestId('banner-public-demo').waitFor();
      await p.getByTestId('card-area-planning').waitFor();
      assert.equal(await p.getByTestId('link-sign-in').count(),0);
      row.screens.summary=await scan(p,id,'summary',true);
      await go(p,'/criteria',lang);
      await p.locator('[data-testid^="card-criterion-"]').first().waitFor();
      row.screens.criteria=await scan(p,id,'criteria',true);
    }
    await go(p,'/experiences?synthetic=1',lang);
    const initial=(await data(p)).state.experiences?.length ?? 0;
    await p.getByTestId('checkbox-synthetic-ack').check();
    await p.getByTestId('button-pick-seed-syn-daily-actual').click();
    await p.getByTestId('button-cancel-synthetic').click();
    assert.equal((await data(p)).state.experiences?.length ?? 0,initial);
    await consentAdd(p,'syn-daily-actual');
    await consentAdd(p,'syn-scenario-sim');
    let d=await data(p);
    const daily=d.state.experiences.find((e:any)=>d.meta.exps[e.id]?.nature==='actual');
    const sim=d.state.experiences.find((e:any)=>d.meta.exps[e.id]?.nature==='simulation');
    assert(daily&&sim);
    assert.equal(daily.source,'example'); assert.equal(sim.source,'example');
    assert.equal(d.meta.exps[daily.id].cardType,'daily_application');
    assert.equal(d.meta.exps[sim.id].cardType,'job_scenario');
    assert.equal(d.meta.exps[sim.id].seedLocale,lang);
    row.checks.push('cancel creates nothing; two explicit consented synthetic sources; type and nature independent');
    await p.getByTestId('button-close-synthetic').click();
    row.screens.library=await scan(p,id,'library',true);
    await p.getByTestId(`button-detail-exp-${sim.id}`).click();
    await p.getByTestId('text-planner-unavailable').waitFor();
    row.screens.detail=await scan(p,id,'detail',true);
    await p.keyboard.press('Escape');
    await newQuestion(p,lang,sim.id,'SYNTHETIC preparation','actual');
    await p.getByTestId(`text-match-${sim.id}`).waitFor();
    assert((await p.getByTestId(`row-match-${sim.id}`).getAttribute('class'))?.includes('warn'));
    await p.getByTestId('radio-requirement-preparation').click();
    row.screens.match=await scan(p,id,'match',true);
    await p.getByTestId('button-go-write').click();
    await p.getByTestId('input-editor').fill(writing);
    const coach=await p.getByTestId('text-coach-question').innerText();
    await p.getByTestId('button-next-coach').click();
    assert.notEqual(await p.getByTestId('text-coach-question').innerText(),coach);
    assert.equal(await p.getByTestId('input-editor').inputValue(),writing);
    await version(p,`${id}-simulation-1`);
    const before=await data(p);
    await p.getByTestId('button-language').click();
    const other=lang==='en'?'ko':'en';
    await p.getByTestId(`option-language-${other}`).click();
    await p.getByRole('menu').waitFor({state:'hidden'});
    assert.equal(new URL(p.url()).pathname,publicRun?'/demo/write':'/write');
    assert.equal(await p.getByTestId('input-editor').inputValue(),writing);
    const after=await data(p);
    assert.deepEqual(after.state,before.state); assert.deepEqual(after.meta,before.meta);
    await p.getByTestId('button-language').click();
    await p.getByTestId(`option-language-${lang}`).click();
    await p.getByRole('menu').waitFor({state:'hidden'});
    await p.reload();
    assert.equal(await p.getByTestId('input-editor').inputValue(),writing);
    row.screens.write=await scan(p,id,'write',true);
    await p.getByTestId('input-editor').fill(`${writing}\nsecond independent revision`);
    await version(p,`${id}-simulation-2`);
    await go(p,'/versions',lang);
    const picks=p.locator('[data-testid^="checkbox-version-"]');
    await picks.first().waitFor();
    assert.equal(await picks.count(),2);
    await picks.nth(0).check(); await picks.nth(1).check();
    assert.equal(await p.locator('[data-testid^="compare-col-"]').count(),2);
    assert.equal(await p.locator('[data-testid^="panel-version-prov-"]').count(),2);
    row.screens.versions=await scan(p,id,'versions',true);
    const old=p.locator('[data-testid^="button-restore-"]').last();
    await old.click();
    assert.equal(await p.getByTestId('input-editor').inputValue(),writing);
    const restored=await data(p);
    const restoredApp=restored.state.applications.at(-1);
    assert.equal(restored.meta.apps[restoredApp.id].requirement,'preparation');
    assert.equal(restored.meta.apps[restoredApp.id].expSnapshot[0].meta.nature,'simulation');
    await exportUi(p,lang,sim.id,writing,`${id}-simulation`,lang==='ko'&&size.width===1440);
    await p.locator('[data-testid^="tab-app-"]').first().click();
    assert.equal(await p.getByTestId('checkbox-facts').isChecked(),false);
    assert(await p.getByTestId('button-export-docx').isDisabled());
    row.screens.export=await scan(p,id,'export',true);
    await newQuestion(p,lang,daily.id,'SYNTHETIC actual','actual');
    await p.getByTestId('button-go-write').click();
    await p.getByTestId('input-editor').fill(actualWriting);
    await p.getByTestId('text-coach-question').waitFor();
    await version(p,`${id}-actual`);
    await exportUi(p,lang,daily.id,actualWriting,`${id}-actual`,lang==='ko'&&size.width===1440);
    const end=await data(p);
    assert.equal(end.state.experiences.length,seedCounts.experiences+2);
    assert.equal(end.state.applications.length,seedCounts.applications+3);
    row.checks.push('simulation barred as actual suggestion; contextual coach never edits; language/path/input/metadata preserved; reload restored; independent company drafts; 2-version compare; old-version new draft; final checklist and four-field export');
    assert.deepEqual(errors,[],'uncaught browser events');
    row.status='passed';
  } catch(e) {
    row.status='failed'; row.error=String(e); row.url=new URL(p.url()).pathname; row.browserErrors=errors;
    await p.screenshot({path:`${out}/${id}-failure.jpg`}).catch(()=>{});
  } finally { await ctx.close(); }
  results.push(row);
  await writeFile(`${out}/${smoke?'smoke':impact?'final-impact':'matrix'}.json`,JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));
  console.log(`${row.status.toUpperCase()} ${id}${row.error?`: ${row.error}`:''}`);
}
try {
  const combos=(smoke?['ko']:impact?['ko','ar','th','km','az']:locales).flatMap(l=>(smoke?[sizes[0]]:sizes).map(s=>({l,s}))).filter(({l,s})=>!retryIds||retryIds.has(`${l}-${s.width}`));
  for(let i=0;i<combos.length;i+=3) await Promise.all(combos.slice(i,i+3).map(({l,s})=>run(l,s)));
} finally {await browser.close();}
if(results.some(r=>r.status!=='passed')) process.exitCode=1;
