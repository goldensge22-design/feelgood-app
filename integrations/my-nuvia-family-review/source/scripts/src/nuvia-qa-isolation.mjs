import { chromium } from 'playwright-core';
import { createHash } from 'node:crypto';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fingerprint,qaDir } from './nuvia-qa-baseline.mjs';
const base=`https://${process.env.REPLIT_DEV_DOMAIN}`;
const browser=await chromium.launch({executablePath:'/repl/tools/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const baseline=await fingerprint(),results=[];
await mkdir(qaDir,{recursive:true});
const c=await browser.newContext({viewport:{width:360,height:800},ignoreHTTPSErrors:true}),p=await c.newPage();
async function login(account,space,lang='ko') {
 await p.goto(`${base}/review?space=${space}&lang=${lang}&returnTo=${encodeURIComponent('/?lang='+lang)}`);
 await p.getByTestId(`radio-account-${account}`).click();await p.getByTestId('checkbox-ack').check();await p.getByTestId('button-enter').click();
 await p.waitForURL(u=>u.pathname!=='/review');await p.locator('h1').waitFor();
}
async function get(path){const r=await p.request.get(base+'/api/nuvia'+path);assert.equal(r.status(),200);return r.json();}
const digest=d=>createHash('sha256').update(JSON.stringify(d)).digest('hex');
try{
 await login('parent','legacy');const legacyBefore=await get('/subjects/demo-child'),legacyHash=digest(legacyBefore);
 const space=`qa-isolation-${Date.now()}`;
 await login('child',space);
 let w=await get('/subjects/demo-child');
 const marker='Fictional isolated automation '+Date.now();
 const r=await p.request.post(base+'/api/nuvia/subjects/demo-child',{data:{type:'history',title:marker,action:marker,outcome:'tried',version:w.version,requestId:crypto.randomUUID(),space:'visitor',role:'teacher'}});
 assert.equal(r.status(),200);
 await login('child','visitor');
 const visitor=await get('/subjects/demo-child');
 assert.ok(!JSON.stringify(visitor).includes(marker));
 for(const path of ['/','/planner','/history','/story','/weekly']) {
   await p.goto(base+path+'?lang=ko&space=visitor');await p.locator('h1').waitFor();
   const text=await p.locator('main').innerText();
   assert.ok(!/fictional-browser-|가상 브라우저 검증|Nurinae bridge model|가상 공유 검증/.test(text));
   assert.equal(await p.locator('[data-testid^="radio-account-"],[data-testid="text-evidence"],[data-testid="input-review-space"]').count(),0);
   if(path==='/'||path==='/planner')await p.screenshot({path:`${qaDir}/visitor-ko-360-${path==='/'?'home':'planner'}.png`});
 }
 await login('parent','legacy');const legacyAfter=await get('/subjects/demo-child');assert.equal(digest(legacyAfter),legacyHash);
 results.push({name:'automation-visitor-legacy-server-isolation-no-deletion',status:'PASS',legacyHashUnchanged:true,legacyRecordCount:legacyBefore.records.length,visitorNotModified:true});
 for(const lang of ['ko','en','ar']) {
   await login('child','visitor',lang);await p.getByTestId('link-nav-planner').filter({visible:true}).click();
   await p.getByTestId('button-new-plan').click();await p.getByTestId('button-plan-example').click();
   const original=await p.getByTestId('input-plan-title').inputValue();
   assert.ok(lang==='ko'?/[가-힣]/.test(original):!/[가-힣]/.test(original));
   await p.getByTestId('button-plan-cancel').click();
 }
 results.push({name:'visitor-language-examples-no-test-fixtures',status:'PASS'});
}catch(e){results.push({name:'isolation',status:'FAIL',error:String(e.stack??e)});}
await writeFile(`${qaDir}/isolation.json`,JSON.stringify({at:new Date().toISOString(),baseline,endBaseline:await fingerprint(),results},null,2));
await browser.close();console.log(results);
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
