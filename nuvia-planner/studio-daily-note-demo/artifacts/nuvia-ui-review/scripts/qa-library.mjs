import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const here=path.dirname(fileURLToPath(import.meta.url)),app=path.resolve(here,'..'),out=path.resolve(app,'../../generated-artifacts/library-qa');
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'C:/Users/golde/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const resources=JSON.parse(await readFile(path.join(app,'src/planner-library/resources.json'),'utf8'));
const locales=Object.keys(resources).filter(k=>k!=='keys');
const fixture=JSON.parse(await readFile(path.join(out,'fixture.json'),'utf8'));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const errors=[],results=[];await mkdir(out,{recursive:true});
async function setup(width,seed){
 const context=await browser.newContext({viewport:{width,height:1000}});
 await context.route('**/*',async route=>{try{const url=new URL(route.request().url());const file=path.resolve(app,'dist/public','.'+url.pathname);if(!file.startsWith(path.join(app,'dist/public')))throw Error('path');const body=await readFile(file);await route.fulfill({status:200,body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream'});}catch{await route.fulfill({status:404,body:'not found'});}});
 if(seed)await context.addInitScript(s=>{if(window.top!==window)return;if(!localStorage.getItem('nuvia:studio:v1:review'))localStorage.setItem('nuvia:studio:v1:review',JSON.stringify(s));},seed);
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});return{context,page};
}
async function nav(page,id,width){const mode=width===360?'bottom':'top';await page.getByTestId(`button-more-${mode}`).click();await page.getByTestId(`menu-${id}-${mode}`).click();}
async function bounds(page,tag){const x=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,bad:[...document.querySelectorAll('.library button,.library select,.library textarea')].filter(e=>e.getClientRects().length&&((e.getBoundingClientRect().right>innerWidth+1)||(e.getBoundingClientRect().left< -1))).map(e=>e.tagName)}));assert(x.overflow<=1,`${tag} overflow ${x.overflow}`);assert.equal(x.bad.length,0,`${tag} clipped control`);}
try{
 for(const width of [1440,360]){
  const {context,page}=await setup(width,fixture);await page.goto('https://planner.test/studio.html?review=1');await nav(page,'library',width);
  assert.equal(await page.getByTestId('library-job').locator('option').count(),311);
  await page.getByTestId('library-kind').selectOption('job-simulation');await page.getByTestId('library-new').click();
  await page.getByTestId('task-title').fill('Browser practice');
  await page.getByTestId('task-time-25').click();
  await page.getByTestId('task-save').click();
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('nuvia:studio:v1:review')));
  let s=await state();assert.equal(Object.keys(s.studio.libraryAttachments).length,2);const id=s.lab.students['student-a'].cards.at(-1).id;
  await bounds(page,`library/${width}`);await page.screenshot({path:path.join(out,`library-${width}.png`),fullPage:true});
  await page.getByTestId('tab-now').evaluate(e=>e.click());await page.getByTestId(`button-select-${id}`).click();await page.getByTestId(`button-place-${id}`).click();
  await page.getByTestId('library-attached').locator('summary').click();
  for(let i=0;i<3;i++)await page.getByTestId(`library-answer-${i}`).fill(`My action ${i+1}`);
  await page.getByTestId('library-save').click();assert(await page.getByTestId('library-confirm').isDisabled());
  await page.getByTestId('start').click();try{await page.getByTestId('pause').click();}catch(e){await page.screenshot({path:path.join(out,`failure-${width}.png`),fullPage:true});throw e;}
  await page.getByTestId('run-panel').locator('summary').click();await page.getByRole('textbox',{name:'멈춘 자리',exact:true}).fill('Next item');await page.getByTestId('flag-save').click();await page.getByTestId('resume').click();
  await page.getByTestId('review-run').click();await page.getByRole('button',{name:'아직 남았어요',exact:true}).click();await page.getByRole('button',{name:'오늘은 여기까지',exact:true}).click();await page.getByTestId('close-run').click();
  await page.getByTestId('library-attached').evaluate(e=>e.open=true);await page.getByTestId('library-confirm').click();s=await state();assert(s.studio.libraryAttachments[id].confirmedRunId);assert.equal(s.lab.students['student-a'].cards.find(c=>c.id===id).status,'planned');
  await page.reload();assert.equal((await state()).studio.libraryAttachments[id].answers[0],'My action 1');
  await page.getByTestId('library-attached').evaluate(e=>e.open=true);await bounds(page,`attached/${width}`);
  if(width===360){const ratio=await page.getByTestId('library-attached').evaluate(e=>e.getBoundingClientRect().width/e.closest('.st-curfile').getBoundingClientRect().width);assert(ratio>0.8,'attachment squeezed by implicit grid columns');}
  await page.screenshot({path:path.join(out,`attached-${width}.png`),fullPage:true});
  await page.getByTestId('tab-report').evaluate(e=>e.click());assert(await page.getByTestId('library-report').isVisible());
  await nav(page,'settings',width);
  // Fake HTTPS test origin can cancel Chromium downloads. Capture the exact export Blob,
  // then upload it through the unchanged production file-input/import path.
  await page.evaluate(()=>{const create=URL.createObjectURL.bind(URL),click=HTMLAnchorElement.prototype.click;URL.createObjectURL=b=>{window.__qaBackup=b;return create(b);};HTMLAnchorElement.prototype.click=function(){if(!this.download)click.call(this);};});
  await page.getByTestId('button-backup').click();await page.waitForFunction(()=>window.__qaBackup instanceof Blob);const raw=await page.evaluate(()=>window.__qaBackup.text());
  const backup=path.join(out,`backup-${width}.json`);await writeFile(backup,raw);page.on('dialog',d=>d.accept());await page.getByTestId('input-restore').setInputFiles(backup);await page.waitForTimeout(200);assert.equal((await state()).studio.libraryAttachments[id].answers[0],'My action 1');
  await nav(page,'library',width);
  for(const locale of locales){await page.getByTestId('select-language').selectOption(locale);await bounds(page,`${width}/${locale}`);assert.equal(await page.locator('html').getAttribute('lang'),locale);if(locale!=='ko'){assert.equal(await page.getByTestId('library-job').count(),0);assert(await page.getByTestId('library-language').isVisible());const text=await page.getByTestId('library-language').innerText();assert(!/[가-힣]/.test(text));}assert.equal((await state()).studio.libraryAttachments[id].answers[0],'My action 1');results.push(`${width}/${locale} review gate/state/layout`);}
  await page.reload();assert.equal(await page.getByTestId('select-language').inputValue(),'az');await page.screenshot({path:path.join(out,`library-az-${width}.png`),fullPage:true});
  await context.close();
  for(const stage of ['middle','high']){const seed=JSON.parse(await readFile(path.join(out,`fixture-${stage}.json`),'utf8'));const age=await setup(width,seed);await age.page.goto('https://planner.test/studio.html?review=1');await nav(age.page,'library',width);assert.equal(await age.page.getByTestId('library-job').locator('option').count(),26);assert.equal(await age.page.locator('.library-options button').count(),3);await age.page.getByTestId('library-kind').selectOption('job-simulation');assert.equal(await age.page.locator('.library-options button').count(),3);await bounds(age.page,`${stage}/${width}`);await age.page.screenshot({path:path.join(out,`${stage}-${width}.png`),fullPage:true});results.push(`${width}/${stage} teen mapping/layout`);await age.context.close();}
  const normal=await setup(width);await normal.page.goto('https://planner.test/studio.html?demo=school');await nav(normal.page,'library',width);for(const locale of locales){await normal.page.getByTestId('select-language').selectOption(locale);assert(await normal.page.getByTestId('library-unavailable').isVisible());assert.equal(await normal.page.getByTestId('library-job').count(),0);await bounds(normal.page,`normal/${width}/${locale}`);results.push(`${width}/${locale} normal gate`);}await normal.context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(path.join(out,'browser-result.json'),JSON.stringify({passed:results.length,errors,results},null,2));console.log(`PASS library browser ${results.length} locale/viewport checks + 2 end-to-end task/run/backup flows`);
}finally{await browser.close();}
