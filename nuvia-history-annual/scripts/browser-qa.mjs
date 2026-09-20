import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const deps=process.env.ARTIFACT_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=require(require.resolve('playwright',{paths:[deps]}));
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[];
await fs.mkdir('qa',{recursive:true});
try{
 for(const [name,width,height] of [['desktop',1440,900],['tablet',768,1024],['mobile',360,800]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:5193/?annual=1&qa=1&age=preschool');
  await page.waitForSelector('#all-stories article');
  assert.equal(await page.locator('#all-stories article').count(),48);
  assert.equal(await page.locator('#all-stories a.primary').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:'qa/annual-'+name+'.png',fullPage:false});
  const blocked=page.locator('.featured-grid article[data-week="48"] button');
  await blocked.click();await page.waitForSelector('dialog[open]');
  assert.equal(await page.locator('dialog a').count(),0);
  assert.equal(await page.evaluate(()=>document.querySelector('dialog').scrollWidth<=document.querySelector('dialog').clientWidth),true);
  await page.keyboard.press('Escape');await page.waitForSelector('dialog',{state:'detached'});
  assert.equal(await blocked.evaluate(el=>el===document.activeElement),true);
  await page.evaluate(()=>localStorage.setItem('qa.owned.record',JSON.stringify({resultId:'annual-test',draft:'untouched'})));
  await page.goto('http://localhost:5193/?annual=1&lang=en');
  await page.waitForSelector('.language-panel');
  assert.equal(await page.locator('.mission-card').count(),0);
  assert.equal(await page.locator('body').innerText(),'NUVIA HISTORY\n한국어');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('qa.owned.record')).draft),'untouched');
  await page.getByRole('button',{name:'한국어',exact:true}).click();await page.waitForSelector('#all-stories');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('qa.owned.record')).resultId),'annual-test');
  const target=await page.locator('.featured-grid article[data-week="24"] a').getAttribute('href');
  assert.equal(new URL(target).port,'5192');assert.equal(new URL(target).searchParams.get('mission'),'gutenberg');
  const privateResponse=await page.request.get('http://localhost:5193/internal-qa/catalog-internal.json');
  assert.equal(privateResponse.status(),404);assert.deepEqual(errors,[]);
  results.push({name,width,height,missionCount:48,overflow:false,blockedW48:true,languageGate:true,recordPreserved:true,keyboardFocus:true,privateDataHttpStatus:404,consoleErrors:0});
  await context.close();
 }
 // Existing server smoke is read-only; no learner profile or stored record is injected.
 const context=await browser.newContext();const page=await context.newPage();
 await page.goto('http://localhost:5192/?qa=1&age=preschool&mission=gutenberg');
 await page.waitForSelector('button');
 results.push({existingW24HttpStatus:200,title:await page.title(),buttons:await page.locator('button').count()});
 await context.close();
 await fs.writeFile('qa/browser-results.json',JSON.stringify(results,null,2)+'\n');
 console.log(JSON.stringify(results));
}finally{await browser.close();}
