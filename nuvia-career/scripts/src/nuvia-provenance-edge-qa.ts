/// <reference lib="dom" />
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const origin=process.env.NUVIA_TEST_ORIGIN??'http://localhost:80';
const out=fileURLToPath(new URL('../../generated-artifacts/provenance-qa',import.meta.url));
await mkdir(out,{recursive:true});
const b=await chromium.launch({executablePath:'/repl/tools/bin/chromium',args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:360,height:800}});
const p=await c.newPage();
const results:any[]=[];
async function state(){return p.evaluate(()=>({state:JSON.parse(localStorage.getItem('nuvia:guest:state')||'{}'),meta:JSON.parse(localStorage.getItem('nuvia:provenance:v1:guest')||'{}')}));}
async function check(name:string,fn:()=>Promise<void>){try{await fn();results.push({name,status:'passed'});}catch(e){results.push({name,status:'failed',error:String(e)});await p.screenshot({path:`${out}/edge-${results.length}-failure.jpg`});}}
async function pick(key:string){await p.getByTestId(`button-pick-seed-${key}`).click();}
async function consent(){await p.getByTestId('checkbox-fact-consent').check();await p.getByTestId('checkbox-usage-consent').check();}
const daily='syn-daily-actual',sim='syn-scenario-sim';
try{
 await p.goto(`${origin}/experiences?space=guest&synthetic=1&lang=ko`);
 await p.getByTestId('checkbox-synthetic-ack').check();
 await check('selected fields only, consent reset, private fields excluded',async()=>{
   await pick(daily);await consent();
   await p.getByTestId('checkbox-include-selectionReason').uncheck();
   assert.equal(await p.getByTestId('checkbox-fact-consent').isChecked(),false);
   assert(await p.getByTestId('button-add-synthetic').isDisabled());
   await consent();await p.getByTestId('button-add-synthetic').click();
   await p.getByTestId('status-import-added').waitFor();
   const d=await state(),e=d.state.experiences[0],m=d.meta.exps[e.id];
   assert.equal(m.planner.selectionReason,undefined);assert(!m.plannerFields.includes('selectionReason'));
   assert.equal(e.source,'example');assert(!JSON.stringify(m.planner).includes('PRIVATE'));
 });
 await check('duplicate does not append',async()=>{
   await pick(daily);await consent();await p.getByTestId('button-add-synthetic').click();
   await p.getByTestId('status-import-duplicate').waitFor();assert.equal((await state()).state.experiences.length,1);
 });
 await check('failed import saves nothing and explicit retry recovers',async()=>{
   await p.getByTestId(`button-sim-fail-${sim}`).click();await pick(sim);await consent();
   await p.getByTestId('button-add-synthetic').click();await p.getByTestId('status-import-failed').waitFor();
   assert.equal((await state()).state.experiences.length,1);
   await p.getByTestId('button-retry-import').click();
   await consent();
   await p.getByTestId('button-add-synthetic').click();await p.getByTestId('status-import-added').waitFor();
 });
 await check('changed source preserves text; reconfirm keeps mine',async()=>{
   const d=await state(),e=d.state.experiences[0],before=e.action;
   await p.getByTestId(`button-sim-change-${daily}`).click();
   await p.getByTestId(`button-detail-exp-${e.id}`).click();
   await p.getByTestId(`status-source-${e.id}`).waitFor();
   assert.equal((await state()).state.experiences[0].action,before);
   await p.getByTestId('button-keep-mine').click();
   assert.equal((await state()).state.experiences[0].action,before);
   await p.keyboard.press('Escape');
 });
 await check('revoked/deleted sources retain existing text and block new imports',async()=>{
   await p.getByTestId(`button-sim-revoke-${sim}`).click();
   const d=await state(),e=d.state.experiences.find((x:any)=>d.meta.exps[x.id].syntheticKey===sim);
   await p.getByTestId(`button-detail-exp-${e.id}`).click();
   await p.getByTestId(`status-source-${e.id}`).waitFor();await p.keyboard.press('Escape');
   assert.equal((await state()).state.experiences.find((x:any)=>x.id===e.id).action,e.action);
   await p.getByTestId(`button-sim-change-${sim}`).click();
   await p.getByTestId(`button-sim-revoke-${sim}`).click();
   await pick(sim);await consent();assert(await p.getByTestId('button-add-synthetic').isDisabled());
   await p.getByTestId(`button-sim-delete-${sim}`).click();assert(await p.getByTestId('button-add-synthetic').isDisabled());
   await p.getByTestId('button-cancel-synthetic').click();
 });
 await check('missing evidence proposal requires confirmation; no invented return link',async()=>{
   await pick('syn-missing-data');await consent();await p.getByTestId('button-add-synthetic').click();
   await p.getByTestId('status-import-added').waitFor();
   const d=await state(),e=d.state.experiences.find((x:any)=>d.meta.exps[x.id].syntheticKey==='syn-missing-data');
   await p.getByTestId(`button-detail-exp-${e.id}`).click();
   await p.getByTestId(`text-missing-${e.id}`).waitFor();
   assert.equal(await p.getByTestId('link-planner-return').count(),0);
   await p.locator('[data-testid^="button-propose-"]').first().click();
   await p.getByTestId('panel-practice-proposal').waitFor();
   assert.equal((await state()).state.activities.length,0);
   await p.getByTestId('button-cancel-proposal').click();await p.keyboard.press('Escape');
 });
 await check('legacy manual experience stays unconfirmed; card type does not infer nature',async()=>{
   await p.getByTestId('button-close-synthetic').click();
   await p.getByTestId('button-new-exp').click();
   await p.getByTestId('input-exp-title').fill('이전 직접 기록 회귀');
   await p.getByTestId('input-exp-action').fill('기존 기록은 보존합니다.');
   await p.getByTestId('button-save-exp').click();await p.getByRole('dialog').waitFor({state:'hidden'});
   const d=await state(),e=d.state.experiences.find((x:any)=>x.source==='manual');
   await p.getByTestId(`button-detail-exp-${e.id}`).click();
   await p.getByTestId('text-legacy-note').waitFor();
   assert.equal(await p.getByTestId('radio-nature-unconfirmed').getAttribute('aria-checked'),'true');
   await p.getByTestId('radio-cardtype-job_scenario').click();
   assert.equal((await state()).meta.exps[e.id].nature,'unconfirmed');
   await p.keyboard.press('Escape');
 });
 await check('cancel and reentry preserve existing records',async()=>{
   const before=await state();
   await p.getByTestId('button-open-synthetic-preview').click();await pick(daily);
   await p.getByTestId('button-cancel-synthetic').click();await p.reload();
   await p.getByTestId('button-open-synthetic-preview').waitFor();
   assert.deepEqual((await state()).state,before.state);
 });
 await check('actual-results recommendations exclude simulated/unknown experiences even with shared criteria',async()=>{
   await p.goto(`${origin}/criteria?space=guest&lang=ko`);
   const accept=p.getByTestId('button-accept-common-observe');
   await accept.waitFor();await accept.click();
   await p.goto(`${origin}/experiences?space=guest&lang=ko`);
   await p.getByTestId('button-new-exp').waitFor();
   const d=await state();
   for(const e of d.state.experiences.filter((x:any)=>d.meta.exps[x.id]?.syntheticKey===daily||d.meta.exps[x.id]?.syntheticKey===sim)){
     await p.getByTestId(`button-edit-exp-${e.id}`).click();
     await p.getByTestId('checkbox-criterion-common-observe').check();
     await p.getByTestId('button-save-exp').click();await p.getByRole('dialog').waitFor({state:'hidden'});
   }
   await p.goto(`${origin}/questions?space=guest&lang=ko`);
   await p.getByTestId('button-new-app').click();
   await p.getByTestId('checkbox-criterion-common-observe').check();
   await p.getByTestId('radio-requirement-actual').click();
   const current=await state();
   const real=current.state.experiences.find((e:any)=>current.meta.exps[e.id]?.syntheticKey===daily);
   const simulation=current.state.experiences.find((e:any)=>current.meta.exps[e.id]?.syntheticKey===sim);
   assert.equal(await p.getByTestId(`suggestion-${real.id}`).count(),1);
   assert.equal(await p.getByTestId(`suggestion-${simulation.id}`).count(),0);
   await p.getByTestId('radio-requirement-preparation').click();
   assert.equal(await p.getByTestId(`suggestion-${simulation.id}`).count(),1);
 });
}finally{
 await writeFile(`${out}/edges.json`,JSON.stringify({checkedAt:new Date().toISOString(),scope:'device-only synthetic screen QA; not external or account QA',results},null,2));
 await b.close();
}
console.log(JSON.stringify(results,null,2));if(results.some(r=>r.status==='failed'))process.exitCode=1;
