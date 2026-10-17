const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/golde/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json')));
const out=path.join(__dirname,'qa');fs.mkdirSync(out,{recursive:true});
const reports={
  'kpass-child':'kpass/candidate/report.kpass.final.html',
  'dcas-teen':'dcas81/unpacked/APPLIED_FULL/DCAS_TEEN/teen.work.html',
  'dcas-adult':'dcas81/unpacked/APPLIED_FULL/DCAS_ADULT/adult.work.html'
};
const cases={
  lowS:[30,35,50,25],lowQ:[30,35,25,50],lowTie:[40,40,40,40],
  midWide:[53,53,53,74],highWide:[75,75,75,100],highTie:[85,85,85,85],
  sq10:[60,60,70,60],sq11:[60,60,71,60],qs11:[60,60,60,71],tieTop:[20,20,50,50],mixed:[80,60,35,71]
};
function profile(kind,values) {
  return {name:'Alex Kim',fullName:'Alex Kim',givenName:'Alex',fullNameEn:'Alex Kim',genderKey:'X',
    ageYears:kind==='kpass-child'?10:kind==='dcas-teen'?16:30,ageMonths:0,gradeLabel:'Learner',majorName:'Cognitive Science',
    fullScaleScore:100,testDate:{y:2026,m:10,d:17},scores:Object.fromEntries(['P','A','S','Q'].map((a,i)=>[a,values[i]]))};
}
const results=[];
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
  try {
    for(const [kind,file] of Object.entries(reports)) {
      if(process.env.REPORT_FILTER&&process.env.REPORT_FILTER!==kind)continue;
      const ownCases={...cases};
      if(kind==='kpass-child')Object.assign(ownCases,{midWide:[86,90,110,119],highWide:[120,125,130,155],highTie:[130,130,130,130]});
      const variants=process.env.QUICK_QA?['ko']:manifest.locales;
      for(const locale of variants) {
        const toRun=locale==='ko'?Object.entries(ownCases):[['lowS',ownCases.lowS]];
        for(const [caseId,values] of toRun) {
          if(process.env.CASE_ID&&process.env.CASE_ID!==caseId)continue;
          const page=await browser.newPage({viewport:{width:390,height:844}});
          const errors=[];page.on('pageerror',error=>errors.push(error.message));
          page.on('console',msg=>{if(msg.text().includes('[guidance:i18n-missing]'))errors.push(msg.text());});
          await page.addInitScript(({p,locale})=>{window.__TEST_PROFILE__=p;window.__REPORT_LOCALE__=locale;window.__DCAS_LANG__=locale;},{p:profile(kind,values),locale});
          const url=pathToFileURL(path.join(root,file));url.search='?lang='+locale+'&keep=qa';url.hash='learning';
          await page.goto(url.href,{waitUntil:'load',timeout:45000});
          await page.waitForFunction(()=>window.FeelGoodReportI18n&&document.querySelector('#fg-pass-guidance'),null,{timeout:15000});
          if(kind!=='kpass-child') await page.evaluate(kind=>showSection(SECTION_IDS.indexOf(kind==='dcas-adult'?'efficiency':'learning')),kind);
          await page.waitForTimeout(200);
          if(caseId==='lowS'&&locale!=='ko') {
            const residues=await page.evaluate(({kind,locale})=>{
              const values=kind==='kpass-child'?[70,100,130]:[30,60,85],failures=[];
              for(const P of values)for(const A of values)for(const S of values)for(const Q of values){
                const text=JSON.stringify(FeelGoodPassGuidance.describe(kind,{scores:{P,A,S,Q},ageYears:16},locale));
                if(/[가-힣]|FGPH/.test(text))failures.push({P,A,S,Q});
              }
              return failures;
            },{kind,locale});
            assert.deepEqual(residues,[],kind+'/'+locale+': browser Intl/translation residue across 81 combinations');
          }
          if(kind==='dcas-adult'&&caseId==='lowS') {
            const preview=await page.locator('#pf-eff-preview').innerText();
            assert.ok(!/91%|84%|66%/.test(preview),'unregistered major must not retain sample scores');
            const expected=await page.evaluate(()=>FeelGoodPassGuidance.describe('dcas-adult',window.__TEST_PROFILE__,FeelGoodReportI18n.getLocale()).cards.find(c=>c.axis==='S').title);
            assert.ok(preview.includes(expected),'preview must use actual localized scores');
          }
          for(const width of [390,768,1440]) {
            await page.setViewportSize({width,height:900});
            const check=await page.evaluate(()=>{
              const box=document.querySelector('#fg-pass-guidance');
              const nodes=[box,...box.querySelectorAll('*'),...document.querySelectorAll('#efficiency .ds-compare,#efficiency .ds-compare *')];
              return {lang:box.lang,body:box.innerText,model:window.__PASS_GUIDANCE_MODEL__,
                pageWidth:[document.documentElement.scrollWidth,document.documentElement.clientWidth],
                overflow:nodes.filter(n=>n.clientWidth>0&&n.scrollWidth>n.clientWidth+2).map(n=>n.tagName+':'+n.scrollWidth+'/'+n.clientWidth),
                cards:[...box.querySelectorAll('article')].map(n=>n.dataset.axis),
                target:document.querySelector('#pf-oneliner,#pf-temperament')?.textContent};
            });
            assert.equal(check.lang,locale,kind+'/'+locale);
            assert.equal(check.cards.length,4);
            assert.deepEqual(check.overflow,[],`${kind}/${locale}/${caseId}/${width}: panel overflow`);
            assert.ok(check.pageWidth[0]<=check.pageWidth[1]+2,`${kind}/${locale}/${width}: page overflow ${check.pageWidth}`);
            assert.ok(!/sourceHash|ai-draft|needs-review|FGPH|\{\w+\}/.test(check.body));
            if(locale!=='ko')assert.ok(!/[가-힣]/.test(check.body),`${kind}/${locale}: untranslated advice`);
            if(caseId==='lowS')assert.equal(check.model.starters.join(),'S');
            if(caseId==='lowQ')assert.equal(check.model.starters.join(),'Q');
            if(caseId==='midWide'||caseId==='highWide')assert.equal(check.model.balanced,false);
            if(locale==='ko')assert.ok(!/평균 이상|함께 강해|흔들림 없이 높은 성과/.test(check.target));
            results.push({kind,locale,caseId,width,status:'pass'});
          }
          // A live locale switch must preserve profile, URL parameters, hash and exactly one advice panel.
          if(caseId==='lowS') {
            const before=await page.evaluate(()=>JSON.stringify(window.__TEST_PROFILE__));
            await page.evaluate(()=>{FeelGoodReportI18n.setLocale('km');FeelGoodReportI18n.setLocale('ar');FeelGoodReportI18n.setLocale('zh-TW');});
            await page.waitForTimeout(100);
            const after=await page.evaluate(()=>({p:JSON.stringify(window.__TEST_PROFILE__),lang:document.querySelector('#fg-pass-guidance').lang,
              count:document.querySelectorAll('#fg-pass-guidance').length,url:location.href,text:document.querySelector('#fg-pass-guidance').innerText}));
            assert.equal(before,after.p);assert.equal(after.lang,'zh-TW');assert.equal(after.count,1);
            assert.ok(after.url.includes('keep=qa')&&after.url.endsWith('#learning'));
            assert.ok(!/[가-힣]|FGPH/.test(after.text));
            await page.evaluate(locale=>FeelGoodReportI18n.setLocale(locale),locale);
            if(['ko','km','ar','zh','mn'].includes(locale)) {
              await page.setViewportSize({width:390,height:844});
              await page.evaluate(()=>{const n=document.querySelector('#fg-pass-guidance');window.scrollTo(0,n.getBoundingClientRect().top+scrollY-220);});
              await page.screenshot({path:path.join(out,kind+'-'+locale+'-mobile.png')});
              await page.setViewportSize({width:1440,height:1000});
              await page.evaluate(()=>{const n=document.querySelector('#fg-pass-guidance');window.scrollTo(0,n.getBoundingClientRect().top+scrollY-150);});
              await page.screenshot({path:path.join(out,kind+'-'+locale+'-desktop.png')});
            }
            await page.emulateMedia({media:'print'});
            const print=await page.evaluate(()=>{const n=document.querySelector('#fg-pass-guidance');return {visible:getComputedStyle(n).display!=='none',width:n.clientWidth,scroll:n.scrollWidth,text:n.innerText,hiddenSections:[...document.querySelectorAll('#pdfArea>section')].filter(s=>getComputedStyle(s).display==='none').length};});
            assert.ok(print.visible&&print.scroll<=print.width+2,`${kind}/${locale} print layout`);
            assert.equal(print.hiddenSections,0,kind+' print must include every report section');
            if(process.env.GUIDANCE_PDF==='1'&&['ko','km','ar'].includes(locale))await page.pdf({path:path.join(out,kind+'-'+locale+'.pdf'),format:'A4',printBackground:true});
          }
          // Inspect leftover interpretive text in the full report for review, not just the new panel.
          if(locale==='ko'&&['lowS','highWide','midWide'].includes(caseId)) {
            const body=await page.evaluate(()=>[...document.querySelectorAll('#pdfArea > section,.page')].map(n=>n.innerText).join('\n'));
            fs.writeFileSync(path.join(out,kind+'-'+caseId+'-body.txt'),body);
          }
          assert.deepEqual(errors,[],`${kind}/${locale}/${caseId}: browser errors`);
          await page.close();
        }
        console.log('PASS browser',kind,locale,toRun.length,'profiles / 3 viewports');
      }
    }
  } finally {await browser.close();fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2)+'\n');}
  console.log('PASS',results.length,'browser cases');
})().catch(error=>{console.error(error);process.exitCode=1;});
