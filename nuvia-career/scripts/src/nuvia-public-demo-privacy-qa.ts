/// <reference lib="dom" />
import {chromium} from 'playwright';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
const out=`${root}generated-artifacts/${process.env.NUVIA_PRIVACY_OUT || 'public-demo-qa'}`;await mkdir(out,{recursive:true});
const origin=process.env.NUVIA_TEST_ORIGIN??'http://127.0.0.1:4319';
const results:any[]=[];
const patterns:Record<string,RegExp>={
 privateKey:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
 secretApiKey:/\bsk_(?:live|test)_[A-Za-z0-9]{12,}/,
 githubToken:/\b(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{25,})/,
 credentialUrl:/(?:postgres(?:ql)?|mysql):\/\/[^:\s"'<>]+:[^@\s"'<>]+@/,
 awsSecret:/\bAKIA[A-Z0-9]{16}\b/,
 syntheticPrivateCanary:/PRIVATE_(?:ACCOUNT|NOTE|RESULT)_CANARY/,
};
function scan(text:string){return Object.entries(patterns).filter(([,p])=>p.test(text)).map(([name])=>name);}
async function step(name:string,fn:()=>Promise<void>){try{await fn();results.push({name,status:'passed'});}catch(e){results.push({name,status:'failed',error:String(e)});}}
const b=await chromium.launch({executablePath:'/repl/tools/bin/chromium',args:['--no-sandbox']});
try{
 const c=await b.newContext(),p=await c.newPage(),privateCalls:string[]=[];
 p.on('request',r=>{if(/\/api\/career\/(?:workspace|versions)/.test(r.url()))privateCalls.push(r.method()+new URL(r.url()).pathname);});
 await c.addInitScript(()=>{
  localStorage.setItem('nuvia:guest:state',JSON.stringify({marker:'PRIVATE_ACCOUNT_CANARY'}));
  localStorage.setItem('nuvia:example:state',JSON.stringify({marker:'PRIVATE_NOTE_CANARY'}));
  localStorage.setItem('nuvia:provenance:v1:account:qa',JSON.stringify({marker:'PRIVATE_RESULT_CANARY'}));
 });
 await step('public demo ignores existing local private/demo/guest records and has no account affordance',async()=>{
  await p.goto(`${origin}/demo?lang=ko`);
  await p.getByTestId('banner-public-demo').waitFor();
  await p.waitForFunction(()=>document.querySelector('[data-testid="status-dcas"]')?.textContent?.includes('예시 전용'));
  assert(!/PRIVATE_(ACCOUNT|NOTE|RESULT)_CANARY/.test(await p.locator('body').innerText()));
  assert.equal(await p.getByTestId('button-account').count(),0);assert.equal(await p.getByTestId('link-sign-in').count(),0);
  assert.equal(await p.getByTestId('link-sidebar-sign-in').count(),0);
 });
 await step('separate tab visitor records; reload restores only same-tab synthetic edits; clearing does not alter local records',async()=>{
  await p.getByTestId('input-selected-job').fill('SYNTHETIC_TAB_ONE');
  await p.waitForTimeout(900);await p.reload();
  assert.equal(await p.getByTestId('input-selected-job').inputValue(),'SYNTHETIC_TAB_ONE');
  const tab=await c.newPage();await tab.goto(`${origin}/demo?lang=ko`);
  await tab.getByTestId('input-selected-job').waitFor();
  assert.notEqual(await tab.getByTestId('input-selected-job').inputValue(),'SYNTHETIC_TAB_ONE');
  await tab.close();
  await p.getByTestId('button-clear-public-demo').click();await p.waitForTimeout(700);
  await p.getByTestId('input-selected-job').waitFor();
  assert.notEqual(await p.getByTestId('input-selected-job').inputValue(),'SYNTHETIC_TAB_ONE');
  const local=await p.evaluate(()=>Object.values(localStorage).join(' '));
  assert(local.includes('PRIVATE_ACCOUNT_CANARY')&&local.includes('PRIVATE_NOTE_CANARY')&&local.includes('PRIVATE_RESULT_CANARY'));
 });
 await step('a different browser context has its own synthetic state',async()=>{
  const other=await b.newContext(),page=await other.newPage();await page.goto(`${origin}/demo`);
  await page.getByTestId('banner-public-demo').waitFor();assert.equal(await page.evaluate(()=>localStorage.length),0);await other.close();
 });
 await step('anonymous private workspace and version requests remain denied',async()=>{
  for(const [method,path] of [['GET','workspace'],['PUT','workspace'],['GET','versions'],['POST','versions']]){
   const response=await c.request.fetch(`${origin}/api/career/${path}`,{method,data:method==='GET'?undefined:{}});
   assert.equal(response.status(),401);assert.deepEqual(scan(await response.text()),[]);
  }
 });
 await step('public example/overview responses are static synthetic/common data without secret signatures',async()=>{
  for(const path of ['overview','example']){
   const response=await c.request.get(`${origin}/api/career/${path}`);assert.equal(response.status(),200);
   const body=await response.text();assert.deepEqual(scan(body),[]);
   if(path==='example'){const d=JSON.parse(body);assert(d.report);assert(/가상|검증|예시/.test(JSON.stringify(d.report)));}
  }
 });
 await step('public UI never fetches or writes private workspace/version APIs',async()=>{assert.deepEqual(privateCalls,[]);});
 await step('criteria API failure shows retry and recovers without a fabricated success',async()=>{
  const isolated=await b.newContext(),page=await isolated.newPage();
  await page.route('**/api/career/overview',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"SYNTHETIC_QA_FAILURE"}'}));
  await page.goto(`${origin}/demo/criteria?lang=ko`);
  await page.getByTestId('state-error').waitFor({timeout:30000});
  assert.equal(await page.locator('[data-testid^="card-criterion-"]').count(),0);
  await page.unroute('**/api/career/overview');
  await page.getByTestId('button-retry').click();
  await page.locator('[data-testid^="card-criterion-"]').first().waitFor();
  assert.equal(await page.getByTestId('state-error').count(),0);
  await page.screenshot({path:`${out}/criteria-after-retry.jpg`});await isolated.close();
 });
 await step('public production files contain no detected secret signatures, env files, or source maps',async()=>{
  let files=0;async function walk(dir:string){
   for(const e of await readdir(dir,{withFileTypes:true})){
    const path=`${dir}/${e.name}`;if(e.isDirectory())await walk(path);
    else{assert(!/^\\.env|\\.map$/.test(e.name));if(/\.(html|js|css|json|svg|txt)$/.test(e.name)){assert.deepEqual(scan(await readFile(path,'utf8')),[],`Secret signature found; path only: ${path}`);files++;}}
   }
  }await walk(`${root}artifacts/nuvia-career/dist/public`);assert(files>0);
 });
 await c.close();
}finally{await b.close();}
await writeFile(`${out}/privacy.json`,JSON.stringify({checkedAt:new Date().toISOString(),scope:'Built frontend with unchanged existing API on localhost only; no publish, no real user data, no secret values read or printed',limitations:['Existing authenticated-account server isolation not revalidated with real identities; unchanged authentication still enforced','Secret scan is pattern/file based, not a value-by-value comparison with environment secrets','Browser tab duplication may copy sessionStorage initially; subsequent edits are independent'],results},null,2));
console.log(JSON.stringify(results,null,2));if(results.some(r=>r.status!=='passed'))process.exitCode=1;
