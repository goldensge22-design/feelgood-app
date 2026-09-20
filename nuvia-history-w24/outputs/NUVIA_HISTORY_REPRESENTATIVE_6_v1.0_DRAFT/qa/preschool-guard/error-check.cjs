const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{const page=await browser.newPage(),base=process.env.W24_BASE_URL||'http://127.0.0.1:5192';
 await page.goto(base+'/?qa=1&age=preschool&grade=1&new=1');await page.getByRole('heading',{name:'잠깐 쉬어요',exact:true}).waitFor();assert.equal(await page.locator('[data-preschool-play]').getAttribute('data-policy'),'pass');assert.ok(!(await page.locator('main').innerText()).includes('GRADE_RULE_REQUIRED'));
 await page.evaluate(()=>sessionStorage.setItem('nuvia.linkedProfile.v1',JSON.stringify({ageBand:'preschool'})));await page.goto(base+'/');await page.getByRole('heading',{name:'잠깐 쉬어요',exact:true}).waitFor();assert.ok(!(await page.locator('main').innerText()).includes('LEARNER_REQUIRED'));
 await page.evaluate(()=>{const p=document.createElement('p');p.textContent='가'.repeat(81);document.querySelector('[data-preschool-play]').append(p);});await page.locator('.kid-policy-stop').waitFor();assert.equal(await page.locator('[data-preschool-play]').isVisible(),false);
 const result={qaBootError:'PASS',productionBootError:'PASS',textOverflowFailsClosed:'PASS'};fs.writeFileSync(path.join(__dirname,'error-results.json'),JSON.stringify(result,null,2));console.log(result);
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
