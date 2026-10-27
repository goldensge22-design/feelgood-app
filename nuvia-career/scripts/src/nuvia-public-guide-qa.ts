import {chromium} from 'playwright';
import {mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
const out=`${root}generated-artifacts/public-guide-qa`;
await mkdir(out,{recursive:true});
const origin=process.env.NUVIA_TEST_ORIGIN || 'http://127.0.0.1:4319';
const locales=['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'];
const results:Record<string,unknown>[]=[];
const browser=await chromium.launch({executablePath:'/repl/tools/bin/chromium',args:['--no-sandbox']});
try {
 for(const locale of locales) {
  const response=await fetch(`${origin}/demo-info/${locale}.html`);
  assert.equal(response.status,200);
  const html=await response.text();
  assert(!/<script\b/i.test(html),'Guide must not need JS');
  assert(html.includes('content="index, follow"'));
  assert(html.includes(`<html lang="${locale}" dir="${locale==='ar'?'rtl':'ltr'}"`));
  assert(!/privateNote|syn-daily-actual|syn-scenario-sim|sourceId|ownerId|userId|pk_test_|pk_live_|sk_test_|sk_live_|-----BEGIN [A-Z ]*PRIVATE KEY|postgres(?:ql)?:\/\//.test(html));
  for(const width of [1440,768,360]) {
   const context=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:1000}});
   const page=await context.newPage();
   const requests:string[]=[];page.on('request',r=>requests.push(r.url()));
   const r=await page.goto(`${origin}/demo-info/${locale}.html`);
   assert.equal(r?.status(),200);
   assert.equal(await page.locator('article').count(),2);
   assert.equal(await page.locator('ol li').count(),6);
   assert((await page.locator('article').first().innerText()).length>80);
   assert.equal(await page.locator('a.cta').first().getAttribute('href'),`/demo?lang=${locale}`);
   const summary=await page.locator('summary').boundingBox();assert(summary&&summary.height>=44);
   // JS disabled: native details + language links must still work.
   await page.locator('summary').click();
   assert.equal(await page.locator('.languages a:visible').count(),15);
   const next=locale==='en'?'ko':'en';
   await page.locator(`.languages a[lang="${next}"]`).click();
   await page.waitForURL(`**/demo-info/${next}.html`);
   await page.goto(`${origin}/demo-info/${locale}.html`);
   // Measurement uses automation/CDP; the page itself has no JavaScript.
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert(requests.every(u=>!u.includes('/api/')),'Static guide must not query accounts or APIs');
   assert.equal(await context.cookies().then(c=>c.length),0);
   if(width===360&&['ko','ar','th','km'].includes(locale))
    await page.screenshot({path:`${out}/${locale}-360.jpg`,fullPage:true});
   results.push({locale,width,status:'passed',javaScript:false});
   await context.close();
  }
 }
 const robots=await fetch(`${origin}/robots.txt`).then(r=>r.text());
 assert(robots.includes('Allow: /demo-info/')&&robots.includes('Disallow: /'));
 const app=await readFile(`${root}artifacts/nuvia-career/dist/public/index.html`,'utf8');
 assert(app.includes('noindex, nofollow'),'Existing app indexing policy must stay private');
 const baseline=JSON.parse(await readFile(`${root}generated-artifacts/public-demo-qa/readiness.json`,'utf8'));
 const hashes:Record<string,string>={};
 for(const name of await readdir(`${root}artifacts/nuvia-career/dist/public/assets`)){
  if(!/\.(js|css)$/.test(name))continue;
  const file=`artifacts/nuvia-career/dist/public/assets/${name}`;
  hashes[file]=createHash('sha256').update(await readFile(`${root}${file}`)).digest('hex');
  assert.equal(hashes[file],baseline.hashes[file],'Interactive bundle must remain byte-identical to prior 45/45 QA');
 }
 for(const file of ['artifacts/nuvia-career/public-guide.ts','artifacts/nuvia-career/vite.config.ts','artifacts/nuvia-career/public/robots.txt',...locales.map(l=>`artifacts/nuvia-career/dist/public/demo-info/${l}.html`)])
  hashes[file]=createHash('sha256').update(await readFile(`${root}${file}`)).digest('hex');
 await writeFile(`${out}/guide.json`,JSON.stringify({checkedAt:new Date().toISOString(),origin,results,hashes,interactiveBundle:'byte-identical to prior 45/45 journey build',limitations:['Public deployment still requires user Publishing visibility change and republish','All-browser/GPT access not guaranteed','New guide translations are machine drafts, not native-reviewed'],publication:'Not executed; no deployment or visibility mutation tool available'},null,2));
 console.log('PASS 45/45 JS-disabled guide views; static body, native language navigation, 44px, RTL, overflow, no API/cookies, crawler scope. Interactive assets unchanged.');
}finally{await browser.close()}
