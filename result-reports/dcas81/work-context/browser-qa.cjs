const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/golde/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=__dirname,out=path.join(root,'qa');fs.mkdirSync(out,{recursive:true});
const locales=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'))).locales;
const report=path.resolve(root,'../unpacked/APPLIED_FULL/DCAS_ADULT/adult.work.html');
const results=[];
const p={fullName:'Alex Kim',givenName:'Alex',genderKey:'X',ageYears:23,gradeLabel:'Worker',majorName:'항공보안학과',testDate:{y:2026,m:10,d:21},scores:{P:75,A:53,S:64,Q:75}};
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
  try{
    for(const locale of (process.env.QUICK_QA?['ko']:locales)){
      const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/work-context:i18n-missing/.test(m.text()))errors.push(m.text());});
      await page.addInitScript(({p,locale})=>{window.__TEST_PROFILE__=p;window.__REPORT_LOCALE__=locale;window.__DCAS_LANG__=locale;},{p,locale});
      const url=pathToFileURL(report);url.search='?lang='+locale+'&keep=context';url.hash='major';
      await page.goto(url.href,{waitUntil:'load'});
      await page.waitForFunction(()=>window.FeelGoodReportI18n&&window.DCasWorkContext&&document.querySelector('#dcas-work-modes'));
      await page.evaluate(()=>showSection(5));
      assert.equal(await page.locator('#majorSelect').count(),1);
      const before=await page.evaluate(()=>({scores:JSON.stringify(DCasAdultEngine.PROFILE.scores),code:__DCAS_PROFILE81__.code,major:document.getElementById('majorSelect').value}));
      await page.locator('#dcas-work-modes [data-v="employed"]').click();
      assert.equal(await page.locator('#majorSelect').count(),0,'no academic selector in employed DOM');
      assert.equal(await page.locator('#pf-major-gaugedesc').count(),0,'no stale academic fit');
      await page.locator('#dcas-work-search').fill('5412');
      assert.equal(await page.locator('#dcas-work-occupation option').count(),3);
      await page.locator('#dcas-work-occupation').selectOption('5412');
      await page.locator('#dcas-work-title').fill('Airport security officer');
      await page.locator('#dcas-work-tasks').fill('Check cargo and record exceptions');
      await page.locator('#dcas-work-form button[type=submit]').click();
      assert.ok((await page.locator('#jobs').textContent()).includes('Airport security officer'));
      const state=await page.evaluate(()=>({context:DCasWorkContext.get(),scores:JSON.stringify(DCasAdultEngine.PROFILE.scores),code:__DCAS_PROFILE81__.code}));
      assert.equal(state.scores,before.scores);assert.equal(state.code,before.code);assert.equal(state.context.occupationCode,'5412');
      // Typed but not yet applied fields, filter, selected section and URL survive a language switch.
      await page.locator('#dcas-work-tasks').fill('Unapplied draft');
      await page.evaluate(()=>{FeelGoodReportI18n.setLocale('ar');FeelGoodReportI18n.setLocale('km');FeelGoodReportI18n.setLocale('zh-TW');});
      assert.equal(await page.locator('#dcas-work-tasks').inputValue(),'Unapplied draft');
      assert.equal(await page.locator('#dcas-work-search').inputValue(),'5412');
      assert.ok(page.url().includes('keep=context')&&page.url().endsWith('#major'));
      await page.evaluate(locale=>FeelGoodReportI18n.setLocale(locale),locale);
      // Late engine re-render cannot reintroduce an academic result.
      await page.evaluate(()=>DCasAdultEngine.render());
      assert.equal(await page.locator('#majorSelect').count(),0);assert.equal(await page.locator('#pf-major-gaugedesc').count(),0);
      for(const width of [390,768,1440]){
        await page.setViewportSize({width,height:1000});
        for(const index of [5,6,7,9,10]){
          await page.evaluate(i=>showSection(i),index);
          const check=await page.evaluate(()=>{
            const host=document.querySelector('#pdfArea > section.active');
            const nodes=[host,...host.querySelectorAll('*')].filter(n=>n.tagName!=='OPTION'&&n.tagName!=='OPTGROUP');
            return {lang:host.lang,text:host.innerText,overflow:nodes.filter(n=>n.clientWidth>0&&n.scrollWidth>n.clientWidth+3).map(n=>n.tagName+':'+n.id),pageOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+3};
          });
          assert.equal(check.lang,locale);assert.deepEqual(check.overflow,[],locale+'/'+width+'/'+index);assert.equal(check.pageOverflow,false);
          assert.ok(!/FGPH|sourceHash|needs-review|\{\w+\}/.test(check.text));
          if(locale!=='ko')assert.ok(!/[가-힣]/.test(check.text),locale+'/'+index+' untranslated');
          results.push({locale,width,section:index,status:'pass'});
        }
      }
      await page.evaluate(()=>showSection(5));
      await page.locator('#dcas-work-occupation').selectOption('other');
      await page.locator('#dcas-work-title').fill(' ');
      await page.locator('#dcas-work-form button[type=submit]').click();
      assert.ok((await page.locator('#dcas-work-error').textContent()).length>0);
      await page.locator('#dcas-work-title').fill('<img src=x onerror=alert(1)>');
      await page.locator('#dcas-work-form button[type=submit]').click();
      assert.equal(await page.locator('.dcas-work-content img').count(),0);
      assert.ok((await page.locator('#major').textContent()).includes('<img src=x onerror=alert(1)>'));
      // Restore real test values; snapshots and print contain the applied job, not controls.
      await page.locator('#dcas-work-title').fill('Airport security officer');
      await page.locator('#dcas-work-tasks').fill('Check cargo and record exceptions');
      await page.locator('#dcas-work-form button[type=submit]').click();
      if(['ko','km','ar','zh-TW'].includes(locale)){
        await page.setViewportSize({width:390,height:1000});
        await page.locator('#dcas-work-modes').scrollIntoViewIfNeeded();
        await page.screenshot({path:path.join(out,locale+'-mobile.png'),fullPage:true});
      }
      await page.emulateMedia({media:'print'});
      const print=await page.evaluate(()=>({controls:getComputedStyle(document.getElementById('dcas-work-form')).display,text:document.body.innerText,major:!!document.getElementById('majorSelect')}));
      assert.equal(print.controls,'none');assert.equal(print.major,false);assert.ok(print.text.includes('Airport security officer'));
      if(locale==='ko')await page.pdf({path:path.join(out,'employed-ko.pdf'),format:'A4',printBackground:true});
      await page.emulateMedia({media:'screen'});
      await page.locator('#dcas-work-modes [data-v="student"]').click();
      assert.equal(await page.locator('#majorSelect').inputValue(),before.major,'academic choice restored');
      assert.equal(await page.locator('#pf-major-gaugedesc').count(),1);
      assert.equal((await page.evaluate(()=>DCasWorkContext.get())).occupationCode,'other','job choice retained');
      await page.locator('#majorSelect').selectOption('심리학과');
      assert.equal(await page.locator('#majorSelect').inputValue(),'심리학과','restored academic form remains editable');
      assert.equal(await page.evaluate(()=>DCasAdultEngine.PROFILE.majorName),'심리학과');
      await page.locator('#dcas-work-modes [data-v="employed"]').click();
      assert.equal(await page.locator('#dcas-work-title').inputValue(),'Airport security officer');
      for(const mode of ['jobseeker','undecided']){await page.evaluate(m=>DCasWorkContext.setMode(m),mode);assert.equal(await page.locator('#majorSelect').count(),1);}
      assert.deepEqual(errors,[],locale+' browser errors');
      await page.close();console.log('PASS browser',locale);
    }
    // All 81 input combinations keep the existing classifier; employed UI does not mutate scores.
    const page=await browser.newPage();await page.addInitScript(p=>{window.__TEST_PROFILE__={...p,workContext:{status:'employed',occupationCode:'5412',jobTitle:'Airport security officer',tasks:''}};},p);
    await page.goto(pathToFileURL(report).href);
    const checks=await page.evaluate(()=>{
      const codes=new Set(),failures=[];
      for(const P of [30,60,85])for(const A of [30,60,85])for(const S of [30,60,85])for(const Q of [30,60,85]){
        const scores={P,A,S,Q};DCasAdultEngine.render({scores});const before=JSON.stringify(scores);codes.add(__DCAS_PROFILE81__.code);
        if(before!==JSON.stringify(DCasAdultEngine.PROFILE.scores)||document.getElementById('majorSelect')||!document.getElementById('dcas-work-form'))failures.push(scores);
      }
      return {codes:codes.size,failures};
    });assert.equal(checks.codes,81);assert.deepEqual(checks.failures,[]);
    await page.evaluate(()=>{DCasWorkContext.setMode('student');showSection(5);});
    await page.locator('#majorSelect').selectOption('심리학과');
    assert.equal(await page.evaluate(()=>DCasAdultEngine.PROFILE.majorName),'심리학과','initially employed payload restores bound academic form');
    await page.close();
    fs.writeFileSync(path.join(out,process.env.QUICK_QA?'browser-quick.json':'browser.json'),JSON.stringify({status:'pass',checks,viewChecks:results.length,results},null,2)+'\n');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
