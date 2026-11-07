import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { fingerprint, qaDir } from './nuvia-qa-baseline.mjs';
import { audit, keyboardOrder } from './nuvia-qa-audit.mjs';
const langs = ['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'];
const sizes = [{width:360,height:800},{width:768,height:1024},{width:1440,height:900}];
const selected = process.env.QA_LANGS?.split(',') ?? langs;
const widths = process.env.QA_WIDTHS?.split(',').map(Number) ?? sizes.map(s=>s.width);
const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const run = process.env.QA_RUN ?? new Date().toISOString().replace(/[:.]/g,'-');
const out = `${qaDir}/${run}`;
await mkdir(out,{recursive:true});
const startedAt = new Date().toISOString(), baseline = await fingerprint();
const browser = await chromium.launch({executablePath:'/repl/tools/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const results = [], dictionaries = {};
for (const lang of langs) {
  const src = await readFile(`artifacts/my-nuvia/src/i18n/${lang}.ts`,'utf8');
  dictionaries[lang] = vm.runInNewContext('('+src.slice(src.indexOf('= {')+2,src.indexOf('\n}')+2)+')');
}
async function flush() {
  await writeFile(`${out}/results.json`,JSON.stringify({startedAt,updatedAt:new Date().toISOString(),baseline,browser:await browser.version(),fictionalOnly:true,results},null,2));
}
async function step(result,name,fn) {
  const time = new Date().toISOString();
  try { const detail = await fn(); result.steps.push({name,status:'PASS',at:time,detail}); console.log('PASS',result.key,name); }
  catch(e) { result.steps.push({name,status:'FAIL',at:time,error:String(e.stack??e)}); console.log('FAIL',result.key,name,String(e).slice(0,400)); throw e; }
}
for (const lang of selected) for (const size of sizes.filter(s=>widths.includes(s.width))) {
  const key = `${lang}-${size.width}`;
  const space = `qa-${run.replace(/[^a-zA-Z0-9-]/g,'').slice(0,40)}-${key}`;
  for (const account of ['parent','child','teacher']) {
    const result = {key:`${key}-${account}`,lang,viewport:size,role:account,steps:[],audits:[],status:'RUNNING'};
    results.push(result);
    const c = await browser.newContext({viewport:size,ignoreHTTPSErrors:true,reducedMotion:'reduce'});
    const p = await c.newPage(); p.setDefaultTimeout(18000);
    const errors = []; p.on('pageerror',e=>errors.push(e.message));
    let createdPlanId;
    const marker = `Fictional ${key} ${account} ${Date.now()}`;
    const subject = 'demo-child';
    const api = `/api/nuvia/subjects/${subject}`;
    const ws = async () => {const r=await p.request.get(base+api);assert.equal(r.status(),200);return r.json();};
    const click = async id => {
      const l=p.getByTestId(id); const visible=l.filter({visible:true}).first();
      await visible.click();
    };
    const nav = async name => {await p.locator('input:focus,textarea:focus,select:focus').evaluateAll(es=>es.forEach(e=>e.blur()));await click(`link-nav-${name}`);await p.waitForTimeout(120);};
    const shot = async name => {
      await p.screenshot({path:`${out}/${key}-${account}-${name}.png`});
    };
    const screen = async (label,axe=false) => {
      const a=await audit(p,lang,label,axe);result.audits.push(a);
      await shot(label);
      assert.deepEqual(a.issues,[],`layout ${label}: ${JSON.stringify(a.issues).slice(0,600)}`);
      assert.deepEqual(a.residual,[],`non-user Korean ${label}: ${JSON.stringify(a.residual).slice(0,400)}`);
      assert.equal(a.selector.current,lang);assert.ok(a.selector.visible&&a.selector.height>=44&&a.selector.nearTop&&a.selector.physicalRight,JSON.stringify(a.selector));
      assert.equal(a.lang,lang);assert.equal(a.dir,lang==='ar'?'rtl':'ltr');
      if(a.axe)assert.deepEqual(a.axe.violations,[],`axe ${label}: ${JSON.stringify(a.axe.violations).slice(0,900)}`);
      if(axe) {
        const k=await keyboardOrder(p);a.keyboard=k;assert.equal(k.pass,true,`Tab order ${label}: ${JSON.stringify(k)}`);
      }
      await p.evaluate(()=>document.documentElement.style.fontSize='200%');
      const zoom=await audit(p,lang,`${label}-text-200-percent`);result.audits.push(zoom);
      assert.deepEqual(zoom.issues,[],`200% layout ${label}: ${JSON.stringify(zoom.issues)}`);
      await p.evaluate(()=>document.documentElement.style.fontSize='');
      if(['activity','history-result'].includes(label)) {
        await p.emulateMedia({media:'print'});
        await p.pdf({path:`${out}/${key}-${account}-${label}.pdf`,format:'A4',printBackground:true});
        await p.emulateMedia({media:'screen'});
      }
    };
    try {
      await step(result,'fictional-login',async()=>{
        await p.goto(`${base}/review?space=${space}&lang=${lang}&returnTo=${encodeURIComponent(account==='teacher'?`/teacher?lang=${lang}&space=${space}`:`/?lang=${lang}&child=${subject}&space=${space}&qa=preserve`)}`);
        await click(`radio-account-${account}`); await p.getByTestId('checkbox-ack').check();await click('button-enter');
        await p.waitForURL(u=>u.pathname!=='/review');await p.locator('h1').waitFor();
          if(account!=='teacher') {
            // Only settle this suite's abandoned fictional fixtures after a failed pilot.
            for(const plan of (await ws()).plans.filter(x=>x.status==='running'&&/^Fictional (ko|en|ja|zh-CN|zh-TW|mn|th|vi|ar|ru|km|es|fr|it|az)-\d+ (parent|child) \d+/.test(x.title))) {
              const current=await ws();
              await p.request.post(base+api,{data:{type:'end',planId:plan.id,version:current.version,requestId:crypto.randomUUID()}});
              await p.reload();await p.locator('h1').waitFor();
            }
          }
      });
      if(account==='teacher') {
        await step(result,'separate-shell-shared-only-and-denials',async()=>{
          assert.equal(await p.locator('[data-testid^=link-nav-]').count(),0);
          assert.equal(await p.getByTestId('input-private-note').count(),0);
          const r=await p.request.get(base+'/api/nuvia/teacher/demo-child');assert.equal(r.status(),200);
          const data=await r.json();assert.ok(!('privateNote' in data));assert.ok(!('drafts' in data));
          await screen('teacher',true);
          await p.goto(`${base}/teacher?child=demo-teen&lang=${lang}&role=teacher`);
          await p.getByTestId('status-subject-forbidden').waitFor();
          assert.equal((await p.request.get(base+'/api/nuvia/teacher/demo-teen')).status(),403);
          await p.getByTestId('link-allowed-subject').click();
          await p.locator('h1').waitFor();
        });
      } else {
        let id,historyRecord,draftId;
        await step(result,'family-exact-three-programs-home-first-week-draft',async()=>{
          for(const n of ['planner','history','story'])assert.ok(await p.getByTestId(`card-program-${n}`).isVisible());
          assert.equal(await p.locator('a[href*="/teacher"],a[href*="/kids"],[data-testid^="radio-account-"]').count(),0);
          await screen('home',true);
          await click('link-first-plan');
          await p.getByTestId('form-plan').waitFor();
          result.recommendationBranch='first-week editable draft';
          await p.getByTestId('button-plan-example').click();
          assert.equal(await p.getByTestId('input-plan-title').inputValue(),dictionaries[lang]['plan.placeholderTitle']);
          await p.getByTestId('input-plan-title').fill(marker+' '+ 'LongFictionalTitle'.repeat(8));
          await p.getByTestId('input-plan-steps').fill('Fictional step one\nFictional step two\nFictional step three');
          await p.getByTestId('input-plan-duration').fill('');
          await p.getByTestId('button-help-easier').click();
          await p.getByTestId('panel-suggestion').waitFor();
          await screen('help-easier',false);
          await p.getByTestId('button-suggest-defer').click();
          await p.getByTestId('button-help-speak').click();await screen('help-speak',false);
          await p.getByTestId('button-suggest-edit').click();
          await p.getByTestId('button-help-missed').click();await screen('help-missed',false);
          await p.getByTestId('button-suggest-accept').click();
          await p.getByTestId('input-plan-steps').fill('Fictional step one\nFictional step two\nFictional step three');
          await screen('draft',true);
          assert.equal((await ws()).plans.some(x=>x.title.startsWith(marker)),false);
          let injected=false;
          const failure=async route=>{
            if(route.request().method()==='POST'&&!injected){injected=true;await route.fulfill({status:503,contentType:'application/json',body:'{"error":"simulated_failure"}'});}
            else await route.continue();
          };
          await p.route('**'+api,failure);
          const oldVersion=(await ws()).version;
          await click('button-plan-save');await p.getByTestId('form-plan').getByTestId('status-error').waitFor();
          assert.equal((await ws()).version,oldVersion);
          await screen('save-failure',false);
          await p.reload();await p.getByTestId('input-plan-title').waitFor();
          assert.ok((await p.getByTestId('input-plan-title').inputValue()).startsWith(marker));
          await p.unroute('**'+api,failure);
          await p.getByTestId('button-plan-save').evaluate(e=>{e.click();e.click();});
          await p.getByTestId('form-plan').waitFor({state:'detached'});
          const plans=(await ws()).plans.filter(x=>x.title.startsWith(marker));assert.equal(plans.length,1);id=plans[0].id;createdPlanId=id;assert.equal(plans[0].duration,null);
        });
        await step(result,'start-step-one-run-language-draft-pause-reload-resume',async()=>{
          await click(`button-start-${id}`);await p.getByTestId(`button-pause-${id}`).waitFor();
          const starts=await p.locator('[data-testid^="button-start-"]').all();for(const b of starts)assert.equal(await b.isEnabled(),false);
          await click(`button-next-${id}`);await p.waitForTimeout(1000);
          const before=(await ws()).plans.find(x=>x.id===id);assert.equal(before.step,1);
          await click('button-new-plan');await p.getByTestId('input-plan-title').fill(marker+' unsaved');
          await p.evaluate(dict=>{
            window.__qaFlash=[];window.__qaObserve=true;
            const frame=()=>{
              if(!window.__qaObserve)return;
              const lang=new URLSearchParams(location.search).get('lang');
              const el=[...document.querySelectorAll('[data-testid="link-nav-planner"]')].find(e=>e.getBoundingClientRect().width);
              if(el&&dict[lang]&&el.textContent.trim()!==dict[lang])window.__qaFlash.push({lang,text:el.textContent.trim()});
              requestAnimationFrame(frame);
            };requestAnimationFrame(frame);
          },Object.fromEntries(Object.entries(dictionaries).map(([l,d])=>[l,d['nav.planner']])));
          await p.evaluate(()=>{const u=new URL(location.href);u.searchParams.set('qa','preserve');history.replaceState(null,'',u.pathname+u.search);});
          const other=lang==='en'?'ar':'en';
          await p.getByTestId('select-language').selectOption(other);
          await p.getByTestId('select-language').selectOption(lang);
          assert.equal(await p.locator('[data-testid="link-nav-planner"]:visible').innerText(),dictionaries[lang]['nav.planner']);
          await p.getByTestId('select-language').selectOption(other);
          await p.getByTestId('select-language').selectOption(lang);
          assert.equal(await p.getByTestId('input-plan-title').inputValue(),marker+' unsaved');
          assert.equal(new URL(p.url()).searchParams.get('qa'),'preserve');
          assert.equal(new URL(p.url()).searchParams.get('activity'),id);
          assert.equal(new URL(p.url()).searchParams.get('child'),subject);
          assert.equal((await ws()).plans.find(x=>x.id===id).startedAt,before.startedAt);
          await p.waitForTimeout(150);
          assert.deepEqual(await p.evaluate(()=>{window.__qaObserve=false;return window.__qaFlash;}),[]);
          await p.reload();await p.getByTestId('input-plan-title').waitFor();
          assert.equal(await p.getByTestId('input-plan-title').inputValue(),marker+' unsaved');
          const destination=new URL(p.url()).pathname+new URL(p.url()).search;
          await p.getByTestId('input-plan-steps').fill('Fictional retained steps');
          await p.request.delete(base+'/api/nuvia/session');
          await click('button-plan-save');await p.getByTestId('link-gate-review').waitFor();
          await screen('session-expired',false);
          assert.equal(new URL(await p.getByTestId('link-gate-review').getAttribute('href'),base).searchParams.get('returnTo'),destination);
          await click('link-gate-review');await click(`radio-account-${account}`);
          await p.getByTestId('checkbox-ack').check();await click('button-enter');
          await p.getByTestId('input-plan-title').waitFor();
          assert.equal(await p.getByTestId('input-plan-title').inputValue(),marker+' unsaved');
          assert.equal(await p.getByTestId('input-plan-steps').inputValue(),'Fictional retained steps');
          assert.equal(new URL(p.url()).searchParams.get('lang'),lang);
          assert.equal(new URL(p.url()).searchParams.get('activity'),id);
          await click('button-plan-cancel');
          await click(`button-pause-${id}`);await p.getByTestId(`button-resume-${id}`).waitFor();
          const paused=(await ws()).plans.find(x=>x.id===id);
          await p.reload();await p.getByTestId(`button-resume-${id}`).waitFor();
          const restored=(await ws()).plans.find(x=>x.id===id);assert.equal(restored.step,paused.step);assert.equal(restored.elapsed,paused.elapsed);
          await click(`button-resume-${id}`);await p.getByTestId(`button-pause-${id}`).waitFor();
          await screen('activity',false);
          await click(`button-end-${id}`);await p.getByTestId(`button-reflect-${id}`).waitFor();
          assert.equal((await ws()).plans.find(x=>x.id===id).status,'ended');
        });
        await step(result,'explicit-incomplete-complete-reflection-weekly-menu',async()=>{
          await click(`button-reflect-${id}`);
          await click('radio-outcome-tried');await click('radio-help-guide');
          await p.getByTestId('input-reflect-action').fill(marker);
          await screen('reflection',true);
          await click('button-reflect-save');await p.getByTestId(`form-reflect-${id}`).waitFor({state:'detached'});
          assert.equal((await ws()).plans.find(x=>x.id===id).status,'ended');
          await click(`button-reflect-${id}`);await click('radio-outcome-finished');
          await p.getByTestId('input-reflect-action').fill(marker+' finished');
          await click('button-reflect-save');await p.getByTestId(`form-reflect-${id}`).waitFor({state:'detached'});
          assert.equal((await ws()).plans.find(x=>x.id===id).status,'completed');
          await nav('weekly');assert.ok((await p.getByTestId('card-weekly').innerText()).includes(marker));
          await click('radio-weekly-maintain');await p.waitForTimeout(250);
          await screen('weekly',true);
        });
        await step(result,'optional-timer-expiry-not-completion-client-clock',async()=>{
          await nav('planner');await click('button-new-plan');
          await p.getByTestId('input-plan-title').fill(marker+' timer');
          await p.getByTestId('input-plan-steps').fill('Fictional timer step');
          await p.getByTestId('input-plan-duration').fill('1');
          await click('button-plan-save');await p.getByTestId('form-plan').waitFor({state:'detached'});
          const timer=(await ws()).plans.find(x=>x.title===marker+' timer');assert.ok(timer);
          await click(`button-start-${timer.id}`);await p.getByTestId(`button-pause-${timer.id}`).waitFor();
          await p.clock.install();await p.clock.fastForward(65000);await p.clock.runFor(1100);
          assert.equal((await ws()).plans.find(x=>x.id===timer.id).status,'running');
          await p.getByTestId(`card-plan-${timer.id}`).getByText(dictionaries[lang]['plan.timeUp'],{exact:true}).waitFor();
          await click(`button-end-${timer.id}`);await p.getByTestId(`button-reflect-${timer.id}`).waitFor();
          assert.equal((await ws()).plans.find(x=>x.id===timer.id).status,'ended');
          await p.clock.setSystemTime(new Date());
        });
        await step(result,'history-order-run-revise-save-transfer-confirm-menu',async()=>{
          await nav('history');
          if(await p.getByTestId('button-history-reset').count())await click('button-history-reset');
          await click('button-resource-map');await click('button-resource-letters');
          await p.getByTestId('row-order-letters').locator('button').first().click();
          await p.getByTestId('input-history-reason').fill(marker);
          await p.locator('#h-help').selectOption('guide');
          await click('button-run-model');const original=await p.getByTestId('card-model-result').innerText();
          await click('button-resource-weather');await click('button-run-model');
          assert.notEqual(await p.getByTestId('card-model-result').innerText(),original);
          await screen('history-result',true);
          await click('button-history-open-save');await p.getByTestId('input-history-change').fill(marker+' changed');
          await click('button-history-save');await p.getByTestId('form-history-save').waitFor({state:'detached'});
          historyRecord=(await ws()).records.find(x=>x.kind==='history'&&x.action.includes(marker));assert.ok(historyRecord);
          await click('button-history-transfer');await p.getByTestId('form-plan').waitFor();
          assert.equal((await ws()).plans.some(x=>x.source===`history:${historyRecord.id}`),false);
          await p.getByTestId('input-plan-title').fill(marker+' transfer');
          await click('button-plan-save');await p.getByTestId('form-plan').waitFor({state:'detached'});
          assert.equal((await ws()).plans.filter(x=>x.source===`history:${historyRecord.id}`).length,1);
        });
        await step(result,'story-role-privacy-select-edit-save-reopen-menu',async()=>{
          await nav('story');
          if(account==='parent') {
            await p.getByTestId('text-story-parent').waitFor();assert.equal(await p.getByTestId('form-story').count(),0);
          } else {
            for(const box of await p.locator('[data-testid^="checkbox-record-"]:checked').all())await box.uncheck();
            await p.getByTestId(`checkbox-record-${historyRecord.id}`).check();
            const before=await ws();assert.ok(!before.records.some(r=>r.action.includes(`${key} parent`)),'parent observations/activity must not enter self selection');
            await click('button-story-prefill');assert.ok((await p.getByTestId('input-story-action').inputValue()).includes(marker));
            assert.ok(!(await p.getByTestId('input-story-action').inputValue()).includes(before.privateNote||'__never__'));
            await click('button-story-preview');
            await p.getByTestId('input-story-text').fill((await p.getByTestId('input-story-text').inputValue())+'\n'+marker+' edited');
            await screen('story-preview',true);
            await click('button-story-save');await p.getByTestId('input-story-text').waitFor({state:'detached'});
            const saved=(await ws()).drafts.find(d=>d.text.includes(marker));assert.ok(saved);assert.deepEqual(saved.recordIds,[historyRecord.id]);draftId=saved.id;
            await nav('planner');await nav('story');
            await click(`button-draft-edit-${draftId}`);assert.ok((await p.getByTestId('input-story-text').inputValue()).includes(marker+' edited'));
            await p.getByTestId(`toggle-share-${historyRecord.id}`).click();
            await p.waitForFunction(id=>document.querySelector(`[data-testid="toggle-share-${id}"]`)?.checked,historyRecord.id);
            await click('button-story-save');await p.getByTestId('form-story').getByTestId('status-error').waitFor();
            await screen('source-changed',false);
            assert.ok((await p.getByTestId('input-story-text').inputValue()).includes(marker));
            await click('button-story-prefill');await click('button-story-preview');await click('button-story-save');
            await p.getByTestId('input-story-text').waitFor({state:'detached'});
          }
          await screen('story',true);
        });
        await step(result,'keyboard-zoom-reduced-height-and-browser-print',async()=>{
          await nav('planner');await click('button-new-plan');
          await p.getByTestId('input-plan-title').focus();await p.keyboard.press('Tab');
          assert.equal(await p.evaluate(()=>document.activeElement?.getAttribute('data-testid')),'input-plan-steps');
          await p.keyboard.press('Escape');
          await p.evaluate(()=>document.documentElement.style.fontSize='200%');
          const zoom=await audit(p,lang,'text-200-percent');result.audits.push(zoom);assert.deepEqual(zoom.issues,[]);
          await p.evaluate(()=>document.documentElement.style.fontSize='');
          if(size.width===360) {
            await p.setViewportSize({width:360,height:480});
            await p.getByTestId('input-plan-steps').focus();await p.getByTestId('button-plan-save').scrollIntoViewIfNeeded();
            const button=await p.getByTestId('button-plan-save').boundingBox();assert.ok(button.y>=0&&button.y+button.height<=480);
            await p.setViewportSize(size);
          }
          await click('button-plan-cancel');await nav('weekly');
          await p.emulateMedia({media:'print'});
          assert.equal(await p.getByTestId('text-evidence').count(),0);
          assert.equal(await p.getByTestId('input-private-note').isVisible().catch(()=>false),false);
          await p.pdf({path:`${out}/${key}-${account}-weekly.pdf`,format:'A4',printBackground:true});
          await p.emulateMedia({media:'screen'});
          if(account==='child') {
            await nav('story');
            await p.emulateMedia({media:'print'});
            await p.pdf({path:`${out}/${key}-${account}-story.pdf`,format:'A4',printBackground:true});
            await p.emulateMedia({media:'screen'});
          }
        });
        await step(result,'role-denied-screen-and-api',async()=>{
          await p.goto(`${base}/planner?space=${space}&child=${account==='parent'?'demo-unlinked':'demo-adult'}&lang=${lang}`);
          await p.getByTestId('status-subject-forbidden').waitFor();
          assert.equal((await p.request.get(base+`/api/nuvia/subjects/${account==='parent'?'demo-unlinked':'demo-adult'}`)).status(),403);
          await p.goto(`${base}/teacher?lang=${lang}&role=teacher`);
          await p.getByTestId('text-teacher-refuse').waitFor();
          assert.equal((await p.request.get(base+'/api/nuvia/teacher/demo-child?role=teacher')).status(),403);
        });
      }
      assert.deepEqual(errors,[]);result.status='PASS';
    } catch(e) { result.status='FAIL';await shot('failure').catch(()=>{}); }
    finally {await c.close();await flush();}
  }
}
const end=await fingerprint();await writeFile(`${out}/finish.json`,JSON.stringify({finishedAt:new Date().toISOString(),baseline:end,unchanged:baseline.sha256===end.sha256},null,2));
await browser.close();
console.log('RESULT',out,results.filter(r=>r.status==='PASS').length,'PASS',results.filter(r=>r.status==='FAIL').length,'FAIL');
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
