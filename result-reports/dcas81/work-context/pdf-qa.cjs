const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/golde/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
    await page.addInitScript(()=>{window.__TEST_PROFILE__={fullName:'QA Worker',givenName:'QA',genderKey:'X',ageYears:23,testDate:{y:2026,m:10,d:21},scores:{P:75,A:53,S:64,Q:75},workContext:{status:'employed',occupationCode:'5413',jobTitle:'Airport security officer',tasks:'Check cargo and record exceptions'}};});
    await page.goto(pathToFileURL(path.resolve(__dirname,'../unpacked/APPLIED_FULL/DCAS_ADULT/adult.work.html')).href,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>typeof html2pdf==='function');
    await page.evaluate(()=>document.getElementById('reportRoot').classList.add('pdf-mode'));
    const check=await page.evaluate(()=>({form:getComputedStyle(document.getElementById('dcas-work-form')).display,modes:getComputedStyle(document.getElementById('dcas-work-modes')).display,sections:[...document.querySelectorAll('#pdfArea>section')].map(n=>getComputedStyle(n).display)}));
    assert.equal(check.form,'none');assert.equal(check.modes,'none');assert.ok(check.sections.every(s=>s!=='none'));
    await page.evaluate(()=>document.getElementById('reportRoot').classList.remove('pdf-mode'));
    const pending=page.waitForEvent('download',{timeout:60000});await page.evaluate(()=>downloadPdf());
    const download=await pending;await download.saveAs(path.join(__dirname,'qa/employed-download.pdf'));
    assert.equal(await download.failure(),null);assert.ok(fs.statSync(path.join(__dirname,'qa/employed-download.pdf')).size>10000);
    fs.writeFileSync(path.join(__dirname,'qa/pdf-export.json'),JSON.stringify({status:'pass',engine:'existing html2pdf download button',check,bytes:fs.statSync(path.join(__dirname,'qa/employed-download.pdf')).size},null,2)+'\n');
    console.log('PASS actual PDF download',fs.statSync(path.join(__dirname,'qa/employed-download.pdf')).size);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
