const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.W24_BASE_URL||'http://127.0.0.1:5192';
async function runs(page){return page.evaluate(()=>new Promise((resolve,reject)=>{const q=indexedDB.open('nuviaRepresentative6.v1',1);q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,read=db.transaction('runs').objectStore('runs').getAll();read.onsuccess=()=>{resolve(read.result);db.close();};read.onerror=()=>reject(read.error);};}));}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const query='?qa=1&age=preschool&mission=gutenberg&learner=restore-routing-check';
 await page.goto(base+'/'+query+'&new=1');await page.getByRole('button',{name:'시작',exact:true}).click();
 await page.locator('[data-stage="history"]').waitFor();
 const before=await runs(page);assert.equal(before.length,1);assert.equal(before[0].missionId,'gutenberg');assert.equal(before[0].profile.ageBand,'preschool');assert.equal(before[0].missionVersion,'5.3.0');
 await page.goto(base+'/'+query);await page.locator('[data-stage="history"]').waitFor();
 assert.equal((await runs(page))[0].resultId,before[0].resultId);
 await page.goto(base+'/'+query+'&new=1');await page.locator('[data-stage="intro"]').waitFor();
 assert.deepEqual(await runs(page),before);
 await page.getByRole('button',{name:'시작',exact:true}).click();await page.locator('[data-stage="history"]').waitFor();
 const after=await runs(page);assert.equal(after.length,2);assert.deepEqual(after.find(r=>r.resultId===before[0].resultId),before[0]);
 assert.equal(await page.locator('[data-qa-inspector]').count(),1);
 assert.equal(await page.locator('[data-preschool-play] [data-qa-inspector]').count(),0);
 await page.goto(base+'/'+query.replace('mission=gutenberg','mission=unknown')+'&new=1');
 await page.getByRole('heading',{name:'잠깐 쉬어요',exact:true}).waitFor();assert.deepEqual(await runs(page),after);
 assert.deepEqual(errors,[]);
 const result={status:'PASS',base,mission:'gutenberg',age:'preschool',missionVersion:'5.3.0',contentVersion:before[0].contentVersion,qaInspectorOutsidePlayer:true,resumeSameResult:true,newPreservesExistingResult:true,unsupportedMissionBlocked:true,consoleErrors:errors};
 fs.mkdirSync(path.join(__dirname,'four-paths'),{recursive:true});fs.writeFileSync(path.join(__dirname,'four-paths','entry-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
