import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../dist/public');
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE??'C:/Users/golde/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sample=JSON.parse(await readFile(path.resolve(here,'../src/demo/sample-content.json'),'utf8')).content;
const demoSource=ts.createSourceFile('demo-resources.ts',await readFile(path.resolve(here,'../src/studio/i18n/demo-resources.ts'),'utf8'),ts.ScriptTarget.Latest,true);
function arrayDeclaration(name){
 for(const statement of demoSource.statements){
  if(!ts.isVariableStatement(statement))continue;
  const declaration=statement.declarationList.declarations.find(item=>item.name.getText(demoSource)===name);
  if(!declaration?.initializer)continue;
  const value=ts.isAsExpression(declaration.initializer)?declaration.initializer.expression:declaration.initializer;
  if(value&&(ts.isArrayLiteralExpression(value)||ts.isObjectLiteralExpression(value)))return value;
 }
 throw Error(`Missing demo resource declaration: ${name}`);
}
const keys=arrayDeclaration('demoKeys').elements.map(item=>item.text);
const resources=Object.fromEntries(arrayDeclaration('demoResources').properties.map(property=>[
 property.name.text,Object.fromEntries(property.initializer.elements.map((value,index)=>[keys[index],value.text]))
]));
const locales=Object.keys(resources);
for(const locale of locales)for(const audience of ['school','university','enterprise']){
 sample[locale][audience].title=resources[locale][`${audience}Title`];
 sample[locale][audience].subject=resources[locale][`${audience}Subject`];
}
const errors=[];
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 for(const width of [1440,360])for(const audience of ['school','university','enterprise']){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.route('**/*',async route=>{
   try{
    const pathname=new URL(route.request().url()).pathname;
    const file=path.resolve(root,'.'+pathname);
    const body=await readFile(file);
    await route.fulfill({status:200,body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'application/octet-stream'});
   }catch{await route.fulfill({status:404,body:'not found'});}
  });
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(`${width}: console ${error.message}`));
  await page.goto(`https://planner.test/studio.html?demo=${audience}`,{waitUntil:'load'});
  if(await page.locator('[data-testid="select-language"]').count()===0)throw Error(JSON.stringify({title:await page.title(),body:(await page.locator('body').innerText()).slice(0,500),errors}));
  const select=page.locator('[data-testid="select-language"]');
  if(await select.count()!==1||!await select.isVisible())errors.push(`${width}: selector not visible`);
  if(await select.locator('option').count()!==locales.length)errors.push(`${width}: locale count mismatch`);
  // Exercise the card detail, including its accessible editing controls.
  await page.locator('[data-testid^="button-select-"]').first().click();
  await page.locator('[data-testid^="button-place-"]').first().click();
  for(const locale of locales){
   await select.selectOption(locale);
   await page.waitForTimeout(40);
   const state=await page.evaluate(()=>({
    lang:document.documentElement.lang,
    dir:document.documentElement.dir,
    text:document.body.innerText,
    selector:document.querySelector('[data-testid="select-language"]')?.getBoundingClientRect().toJSON(),
    brand:document.querySelector('.st-brand')?.getBoundingClientRect().toJSON(),
    overflow:document.documentElement.scrollWidth-window.innerWidth,
    accessibility:[...document.querySelectorAll('[aria-label],[title],[placeholder]')].flatMap(el=>['aria-label','title','placeholder'].map(name=>el.getAttribute(name)||'')).join(' | '),
    raw:localStorage.getItem(`nuvia:studio:external-demo:dcas:v1:${new URLSearchParams(location.search).get('demo')}`),
   }));
   const tag=`${width}/${audience}/${locale}`;
   if(state.lang!==locale)errors.push(`${tag}: html lang ${state.lang}`);
   if(state.dir!==(locale==='ar'?'rtl':'ltr'))errors.push(`${tag}: html dir ${state.dir}`);
   if(!state.text.includes(sample[locale][audience].title))errors.push(`${tag}: sample task missing`);
   if(!state.text.includes(sample[locale][audience].subject))errors.push(`${tag}: sample subject missing`);
   const withoutLocaleOption=state.text.replace('한국어','');
   if(locale!=='ko'&&/[가-힣]/.test(withoutLocaleOption))errors.push(`${tag}: Korean text leaked ${withoutLocaleOption.match(/.{0,20}[가-힣].{0,25}/g)?.slice(0,3).join(' | ')}`);
   if(locale!=='ko'&&/[가-힣]/.test(state.accessibility))errors.push(`${tag}: Korean accessibility text leaked ${state.accessibility.match(/.{0,20}[가-힣].{0,25}/g)?.slice(0,3).join(' | ')}`);
   if(state.overflow>1)errors.push(`${tag}: horizontal overflow ${state.overflow}px`);
   if(state.selector?.right>width+1)errors.push(`${tag}: selector outside viewport`);
   if(state.selector&&state.brand&&state.selector.top<state.brand.bottom&&state.selector.bottom>state.brand.top&&state.selector.left<state.brand.right&&state.selector.right>state.brand.left)errors.push(`${tag}: selector overlaps brand`);
   if(!state.raw||!state.raw.includes(sample.ko[audience].title))errors.push(`${tag}: canonical demo record changed`);
   if(audience==='school')for(const tab of ['plan','reflect','report']){
    await page.locator(`[data-testid="tab-${tab}"]`).evaluate(button=>button.click());
    const tabText=(await page.locator('body').innerText()).replace('한국어','');
    if(locale!=='ko'&&/[가-힣]/.test(tabText))errors.push(`${tag}/${tab}: Korean text leaked ${tabText.match(/.{0,20}[가-힣].{0,25}/g)?.slice(0,3).join(' | ')}`);
    if(tab==='report'){
     const reportText=await page.frameLocator('[data-testid="report-preview"]').locator('body').innerText();
     if(locale!=='ko'&&/[가-힣]/.test(reportText))errors.push(`${tag}/report-preview: Korean text leaked ${reportText.match(/.{0,20}[가-힣].{0,25}/g)?.slice(0,3).join(' | ')}`);
    }
   }
   if(audience==='school')await page.locator('[data-testid="tab-now"]').evaluate(button=>button.click());
  }
  await page.reload({waitUntil:'networkidle'});
  if(await select.inputValue()!=='az')errors.push(`${width}/${audience}: selected language lost after reload`);
  if(audience==='school'&&width===360)await page.screenshot({path:path.resolve(here,'../qa-studio-mobile.png'),fullPage:true});
  if(audience==='school'&&width===1440)await page.screenshot({path:path.resolve(here,'../qa-studio-desktop.png'),fullPage:true});
  await context.close();
 }
 for(const width of [1440,360]){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.route('**/*',async route=>{
   try{const file=path.resolve(root,'.'+new URL(route.request().url()).pathname);await route.fulfill({status:200,body:await readFile(file),contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream'});}
   catch{await route.fulfill({status:404,body:'not found'});}
  });
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(`${width}/regular: console ${error.message}`));
  await page.goto('https://planner.test/studio.html',{waitUntil:'load'});
  const select=page.locator('[data-testid="select-language"]');
  if(!await select.isVisible())errors.push(`${width}/regular: selector hidden`);
  for(const locale of locales){
   await select.selectOption(locale);
   const visible=(await page.locator('body').innerText()).replace('한국어','');
   if(locale!=='ko'&&/[가-힣]/.test(visible))errors.push(`${width}/regular/${locale}: Korean text leaked`);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   if(overflow>1)errors.push(`${width}/regular/${locale}: horizontal overflow ${overflow}px`);
  }
  await context.close();
 }
 console.log(JSON.stringify({locales:locales.length,audiences:3,widths:[1440,360],checks:locales.length*8,errors},null,2));
 if(errors.length)process.exitCode=1;
}finally{await browser.close();}
