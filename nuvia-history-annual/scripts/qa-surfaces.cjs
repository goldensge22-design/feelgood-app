const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.HISTORY_QA_URL||'http://127.0.0.1:5194',out=path.join(__dirname,'../.runtime/surfaces');
fs.mkdirSync(out,{recursive:true});const rows=[];
async function check(page,label){
 await page.evaluate(async()=>{await Promise.all([document.fonts.load('16px Pretendard'),document.fonts.load('16px MaruBuri')]);await document.fonts.ready;});
 await page.waitForFunction(()=>[...document.images].every(x=>x.complete&&x.naturalWidth>0));
 const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,fonts:document.fonts.check('16px Pretendard')&&document.fonts.check('16px MaruBuri'),images:document.images.length}));
 assert.equal(layout.overflow,false,label);assert.equal(layout.fonts,true,label);
 await page.screenshot({path:path.join(out,label+'.png'),fullPage:true});rows.push({label,...layout});
}
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});const failures=[];
 try{
 for(const width of [390,768,1440]){
 const ctx=await browser.newContext({viewport:{width,height:width===390?844:width===768?1024:900}}),p=await ctx.newPage();
 p.on('pageerror',e=>failures.push(e.message));p.on('response',r=>{if(r.status()>=400)failures.push(r.status()+' '+r.url())});p.on('requestfailed',r=>{if(!r.failure()?.errorText.includes('ERR_ABORTED'))failures.push(r.url()+' '+r.failure()?.errorText)});
 await p.goto(base+'/?qa=1&age=preschool');await p.locator('[data-week="48"]').waitFor();await check(p,width+'-annual');
 assert.equal(await p.locator('[data-week]').count(),48);assert.equal(await p.locator('[data-start-mission]').count(),1);
 for(const week of [1,48]){await p.locator('[data-week="'+week+'"]').click();await p.locator('[data-selected-week="'+week+'"]').waitFor();assert.equal(await p.locator('[data-start-mission]').count(),0);assert.equal(await p.locator('.selected-mission img').count(),0);await check(p,width+'-W'+week+'-pending');}
 await p.locator('[data-week="24"]').click();await p.locator('[data-start-mission]').click();assert.equal(new URL(p.url()).pathname,'/w24.html');await p.getByRole('button',{name:'시작',exact:true}).waitFor();await check(p,width+'-preschool-intro');
 for(const [age,grade] of [['elementary-low',1],['elementary-low',2],['elementary-high',3],['middle-school',null],['high-school',null],['adult',null]]){
 const label=width+'-'+age+(grade?'-'+grade:'');
 await p.goto(base+'/w24.html?qa=1&mission=gutenberg&new=1&age='+age+(grade?'&grade='+grade:'')+'&learner='+label);
 await p.getByRole('button',{name:'역사 이야기 시작',exact:true}).click();
 await p.locator('[data-stage="history"]').waitFor();await check(p,label+'-history');
 for(let i=0;i<2;i++)await p.getByRole('button',{name:'역사를 살펴봤어요',exact:true}).click();
 await p.locator('[data-condition="gutenberg.c2"]').click();await p.locator('[data-stage="prediction"]').waitFor();await check(p,label+'-prediction');
 }
 await p.goto(base+'/?lang=en&qa=1');assert.equal(await p.locator('[data-student-play]').count(),0);assert.equal(await p.locator('.language-panel a').count(),1);
 await check(p,width+'-language-block');await ctx.close();
 }
 assert.deepEqual(failures,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',rows,networkOrConsoleFailures:failures},null,2));console.log(JSON.stringify({status:'PASS',screens:rows.length,networkOrConsoleFailures:failures}));
 }catch(e){fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'FAIL',rows,error:String(e),failures},null,2));throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
