import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({headless:true,executablePath:process.env.REVIEW_BROWSER});
const base=process.env.WRITING_URL||'http://127.0.0.1:5203',out='qa-writing';await mkdir(out,{recursive:true});const results=[];
const act=(p,a)=>p.locator(`[data-action="${a}"]`).click();const ra=(p,a)=>p.locator(`[data-review-action="${a}"]`).click();const pick=(p,k,v)=>p.locator(`[data-review-choice="${k}"][data-value="${v}"]`).click();
const state=p=>p.evaluate(()=>JSON.parse(localStorage.getItem(`nuviaHistory.teenWritingDemo.v1.${new URL(location.href).searchParams.get('age')}.planning`)));
async function layout(p){assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(await p.evaluate(()=>[...document.querySelectorAll('textarea,button')].some(e=>{const r=e.getBoundingClientRect();return r.width&&(r.left< -1||r.right>innerWidth+1)})),false);}
async function inputPlan(p,high){if(high){await pick(p,'unknown','tell.language');await p.locator('[data-review-text="limitText"]').fill('読む人がいても意味を理解できるとは限らない <script>test</script>');}await p.locator('[data-review-text="connectionText"]').fill('  이 정보를 확인하면 설명할 사람을 정할 수 있습니다.\n');await ra(p,'judge');if(high)await pick(p,'fit','undetermined');}
try{
 for(const [name,width,height,age,revision,defer] of [['desktop-high',1440,900,'high-school',true,false],['mobile-high',390,844,'high-school',false,false],['landscape-high',844,390,'high-school',false,true],['tablet-middle',1024,768,'middle-school',false,false],['mobile-middle',390,844,'middle-school',true,true]]){
  const context=await browser.newContext({viewport:{width,height}});const p=await context.newPage(),errors=[],bad=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))bad.push(r.url());});
  await p.addInitScript(()=>{localStorage.setItem('nuviaHistory.planningReviewDemo.v1.high-school.planning','legacy-sentinel');});
  await p.goto(`${base}/writing.html?lang=ko&age=${age}&qa=1`);await act(p,'new');await act(p,'next');await act(p,'confirm-condition');const high=age==='high-school';
  const fields=high?['direct','longTerm','basis','unknown']:['direct','reason'];
  for(const f of fields){assert.equal(await p.locator('[data-action="prediction-next"]').isDisabled(),true);await p.locator(`[data-field="${f}"]`).fill(`  최초 예상 ${f}\n`);if(f==='direct'){await p.reload();assert.equal(await p.locator('[data-field="direct"]').inputValue(),'  최초 예상 direct\n');}await act(p,'prediction-next');}
  const snapshot=(await state(p)).prediction;
  await ra(p,'back');assert.equal(await p.locator('textarea').count(),0);await act(p,'prediction-lock');
  await pick(p,'goal','hear');if(high){await pick(p,'compare','tell');await pick(p,'compare','time');}await pick(p,'method','tell');await ra(p,'start');await ra(p,'outcome');if(high)await ra(p,'fact');
  assert.equal(await p.locator('[data-review-action="judge"]').isDisabled(),true);await inputPlan(p,high);
  if(revision){await ra(p,'revise');assert.equal(await p.locator('[data-review-choice="method"][data-value="tell"]').count(),0);await pick(p,'method','time');await ra(p,'outcome');if(high){await ra(p,'fact');await pick(p,'unknown','time.language');await p.locator('[data-review-text="limitText"]').fill('허락이 있어도 내용을 이해하기는 별개입니다.');}await p.locator('[data-review-text="connectionText"]').fill('시간과 설명할 사람을 확인합니다.');await ra(p,'judge');if(high)await pick(p,'fit','sufficient');}
  await ra(p,'keep');
  for(const f of high?['process','ending','fact','assumption','text']:['process','ending','text']){
   if(f==='text'){await act(p,'use-outline');assert.match(await p.locator('[data-field="text"]').inputValue(),/내가 쓴 process/);await p.locator('[data-field="text"]').fill('  내가 만든 이야기 <b>원문</b>\n책을 함께 살펴보았다.');await p.locator('.drawing-panel summary').click();const cv=p.locator('canvas');const b=await cv.boundingBox();await p.mouse.move(b.x+20,b.y+20);await p.mouse.down();await p.mouse.move(b.x+80,b.y+50);await p.mouse.up();await p.reload();assert.equal(await p.locator('[data-field="text"]').inputValue(),'  내가 만든 이야기 <b>원문</b>\n책을 함께 살펴보았다.');assert.ok((await state(p)).story.drawing);}
   else await p.locator(`[data-field="${f}"]`).fill(`내가 쓴 ${f}`);
   await layout(p);if(f==='process')await p.screenshot({path:`${out}/${name}-story.png`,fullPage:true});await act(p,'story-next');
  }
  for(const kind of ['history','prediction']){
   await layout(p);await p.locator('[data-field="difference"]').fill(`${kind} 차이 원문`);
   if(defer)await act(p,'comparison-later');else{await act(p,'comparison-next');await p.locator('[data-field="reason"]').fill(`${kind} 이유 원문`);await p.screenshot({path:`${out}/${name}-${kind}.png`,fullPage:true});await act(p,'comparison-next');}
  }
  const r=await state(p);assert.deepEqual(r.prediction,snapshot);assert.notEqual(r.comparisons.history.eventId,r.comparisons.prediction.eventId);assert.equal(r.story.resultId,r.resultId);
  for(let i=7;i>0;i--)await act(p,'page-prev');for(let i=0;i<8;i++){assert.equal(await p.locator('.scene-copy > .book-page').getAttribute('data-page-role'),['actual','condition','prediction','thinking','result','story','historyComparison','predictionComparison'][i]);await layout(p);if(i===6){assert.equal(await p.locator('.scene-copy .book-page b').count(),0);assert.match(await p.locator('.scene-copy .book-page').innerText(),/내가 만든 이야기/);if(defer)assert.match(await p.locator('.scene-copy .book-page').innerText(),/비교 기록이 아직 없어요/);}if(i<7)await act(p,'page-next');}
  await p.screenshot({path:`${out}/${name}-book.png`,fullPage:true});
  const before=r.resultId;await p.goto(`${base}/writing.html?lang=ko&age=${age}&new=1`);await act(p,'next');assert.notEqual((await state(p)).resultId,before);assert.ok(await p.evaluate(id=>localStorage.getItem(`nuviaHistory.teenWritingDemo.v1.record.${id}`),before));assert.equal(await p.evaluate(()=>localStorage.getItem('nuviaHistory.planningReviewDemo.v1.high-school.planning')),'legacy-sentinel');
  await p.goto(`${base}/writing.html?lang=en&age=${age}`);assert.equal(await p.locator('textarea').count(),0);assert.equal(await p.locator('a').innerText(),'한국어');
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);results.push({name,viewport:{width,height},age,revision,defer,status:'PASS',errors,bad});await context.close();
 }
 const context=await browser.newContext(),p=await context.newPage();await p.goto(`${base}/review.html`);assert.ok((await p.locator('body').innerText()).includes('직접'));for(const path of ['review.json','review.md','rules.md'])assert.equal((await p.request.get(`${base}/${path}`)).status(),200);await context.close();
 const denied=await browser.newContext(),q=await denied.newPage();await q.goto(`${base}/writing.html?lang=ko&age=middle-school`);await act(q,'new');await act(q,'next');await act(q,'confirm-condition');await q.locator('[data-field="direct"]').fill('before failure');await act(q,'prediction-next');await q.locator('[data-field="reason"]').fill('reason');await q.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError')};});await act(q,'prediction-next');assert.equal(await q.locator('[role=alert]').count(),1);assert.equal(await q.locator('[data-review-choice=goal]').count(),0);await denied.close();
 await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
