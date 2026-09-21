import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const base=process.env.REVIEW_URL||'http://127.0.0.1:5202';
const output='qa-reconsider';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.REVIEW_BROWSER?{executablePath:process.env.REVIEW_BROWSER}:{})});
const results=[];
const action=(p,a)=>p.locator(`[data-review-action="${a}"]`).click();
const pick=(p,a,v)=>p.locator(`[data-review-choice="${a}"][data-value="${v}"]`).click();
const legacyAction=(p,a)=>p.locator(`[data-action="${a}"]`).click();
async function state(p){return p.evaluate(()=>JSON.parse(localStorage.getItem(`nuviaHistory.planningReviewDemo.v1.${new URL(location.href).searchParams.get('age')}.planning`)));}
async function layout(p,label){const overflow=await p.evaluate(()=>({page:document.documentElement.scrollWidth>innerWidth+1,controls:[...document.querySelectorAll('button,textarea')].filter(x=>{const r=x.getBoundingClientRect();return r.width&& (r.left< -1||r.right>innerWidth+1)}).map(x=>x.textContent)}));assert.deepEqual(overflow,{page:false,controls:[]},label);}
async function start(p,age,method,goal){
 await p.goto(`${base}/?lang=ko&age=${age}&qa=1&mission=gutenberg&condition=w24-c2&pass=planning`);
 await legacyAction(p,'next');await legacyAction(p,'next');
 await pick(p,'prediction-direct','0');
 if(age==='high-school')await pick(p,'prediction-longTerm','1');
 await action(p,'prediction-lock');
 await pick(p,'goal',goal);
 if(age==='high-school'){await pick(p,'compare',method);await pick(p,'compare',method==='tell'?'time':'tell');}
 await pick(p,'method',method);await action(p,'start');await action(p,'outcome');
 if(age==='high-school'){
  assert.equal(await p.locator('[data-fact-mode="history"]').count(),1);
  assert.equal(await p.locator('[data-review-text="connectionText"]').count(),0);
  await action(p,'fact');
 }
}
try{
 for(const [name,viewport,age,revise] of [
  ['desktop-high',{width:1440,height:900},'high-school',true],
  ['mobile-high',{width:390,height:844},'high-school',false],
  ['landscape-high',{width:844,height:390},'high-school',false],
  ['tablet-middle',{width:1024,height:768},'middle-school',true],
  ['mobile-middle',{width:390,height:844},'middle-school',false]
 ]){
  const context=await browser.newContext({viewport});const p=await context.newPage();const errors=[],badAssets=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))badAssets.push(r.url());});
  await p.addInitScript(()=>{if(!localStorage.getItem('nuviaHistory.ageComparisonDemo.v1.high-school.planning'))localStorage.setItem('nuviaHistory.ageComparisonDemo.v1.high-school.planning','legacy-sentinel');});
  await start(p,age,'tell','hear');await layout(p,name);
  if(age==='high-school')await pick(p,'unknown','tell.language');
  await p.locator('[data-review-text="connectionText"]').fill('이 정보를 확인하면 설명할 사람을 구할지 결정할 수 있습니다.');
  if(age==='high-school'){
   assert.equal(await p.locator('[data-review-action="judge"]').isDisabled(),true);
   await p.locator('[data-review-text="limitText"]').fill('듣는 사람이 뜻을 이해하지 못하면 전달 목표를 이루기 어렵습니다.');
  }
  const before=await state(p);await p.reload();const restored=await state(p);assert.equal(restored.resultId,before.resultId);assert.deepEqual(restored.prediction,before.prediction);
  await p.screenshot({path:`${output}/${name}-inputs.png`,fullPage:true});
  await action(p,'judge');if(age==='high-school')await pick(p,'fit','undetermined');
  await action(p,'edit');assert.equal((await state(p)).planning.draft.goalFit,null);
  assert.match(await p.locator('[data-review-text="connectionText"]').inputValue(),/이 정보/);
  await action(p,'judge');if(age==='high-school')await pick(p,'fit','undetermined');
  if(revise){
   await action(p,'revise');assert.equal(await p.locator('[data-review-choice="method"][data-value="tell"]').count(),0);
   await pick(p,'method','time');await action(p,'outcome');if(age==='high-school')await action(p,'fact');
   assert.equal(await p.locator('[data-review-text="connectionText"]').inputValue(),'');
   await p.locator('.previous-draft summary').click();await action(p,'reuse');
   if(age==='high-school')await pick(p,'unknown','time.language');
   assert.equal(await p.locator('[data-review-action="judge"]').isDisabled(),true);
   await action(p,'confirmCarry');await action(p,'judge');if(age==='high-school')await pick(p,'fit','sufficient');
  }
  await layout(p,name+' decision');await p.screenshot({path:`${output}/${name}-decision.png`,fullPage:true});
  await action(p,'keep');await legacyAction(p,'back');await action(p,'back');
  assert.equal(await p.locator('[data-review-choice="prediction-direct"]').count(),0);assert.deepEqual((await state(p)).prediction,before.prediction);
  await action(p,'prediction-lock');await action(p,'keep');
  await p.locator('#story-text').fill('내 이야기: 아직 확인하지 못했지만 설명할 사람이 있다면 함께 읽어 보고 싶다.');await legacyAction(p,'save-story');
  await p.locator('#compare-text').fill(' 실제 책과 내 이야기의 차이를 남깁니다. ');await legacyAction(p,'save-compare');await legacyAction(p,'defer');await legacyAction(p,'open-book');
  for(let i=0;i<3;i++)await legacyAction(p,'book-next');
  await layout(p,name+' book');
  if(age==='high-school'){assert.equal(await p.locator('[data-author="system"]').count(),1);assert.match(await p.locator('.review-unknown').textContent(),/확인된 사실이 아닙니다/);}
  await p.screenshot({path:`${output}/${name}-book.png`,fullPage:true});
  for(let i=0;i<3;i++)await legacyAction(p,'book-next');
  assert.equal(await p.locator('.review-unknown').count(),0);
  assert.match(await p.locator('.page-body').textContent(),/내 이야기/);
  await legacyAction(p,'book-next');assert.match(await p.locator('.page-body').textContent(),/비교 기록이 없어요/);assert.doesNotMatch(await p.locator('.page-body').textContent(),/내 이야기: 아직/);
  const final=await state(p);assert.equal(final.comparisons.history.value,' 실제 책과 내 이야기의 차이를 남깁니다. ');assert.notEqual(final.comparisons.history.eventId,final.comparisons.prediction.eventId);
  assert.equal(await p.evaluate(()=>localStorage.getItem('nuviaHistory.ageComparisonDemo.v1.high-school.planning')),'legacy-sentinel');
  assert.deepEqual(errors,[]);assert.deepEqual(badAssets,[]);
  results.push({name,viewport,age,revisionCount:final.planning.revisions.length,activeMs:final.timing.activeMs,automatedRun:true,errors,badAssets,passed:true});await context.close();
 }
 const context=await browser.newContext();const p=await context.newPage();await start(p,'high-school','own','see');
 await p.locator('[data-review-text="unknownText"]').fill('요약을 읽을 사람이 이해하는 말은 무엇인가?');
 await p.locator('[data-review-text="connectionText"]').fill('전달할 언어를 정할 수 있다.');await p.locator('[data-review-text="limitText"]').fill('요약에 빠진 내용을 직접 확인하기 어렵다.');await action(p,'judge');await pick(p,'fit','undetermined');await action(p,'keep');
 await p.goto(`${base}/?lang=en&age=high-school&qa=1`);assert.equal(await p.locator('.play-area').count(),0);assert.equal(await p.locator('a[lang=ko]').count(),1);await context.close();
 const failContext=await browser.newContext();const failPage=await failContext.newPage();await failPage.goto(`${base}/?lang=ko&age=high-school&qa=1`);await legacyAction(failPage,'next');await legacyAction(failPage,'next');await pick(failPage,'prediction-direct','0');await pick(failPage,'prediction-longTerm','0');
 await failPage.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError')}});await action(failPage,'prediction-lock');assert.equal(await failPage.locator('[data-review-action="prediction-lock"]').count(),1);assert.equal(await failPage.locator('.storage-error').count(),1);await failContext.close();
 const review=await (await fetch(`${base}/reconsider-review.json`)).json();assert.equal(review.variants[1].gateChecks.reasonOnly,false);assert.equal(review.variants[1].gateChecks.allRequiredFields,true);assert.equal(review.variants[1].gateChecks.revisionWithoutChange,false);
 await writeFile(`${output}/results.json`,JSON.stringify({generatedAt:new Date().toISOString(),results,customUnknown:true,unsupportedLocaleBlocked:true,storageFailureBlocksReveal:true,studentTimingValidated:false},null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
