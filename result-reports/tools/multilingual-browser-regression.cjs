const assert = require('assert');
const path = require('path');
const { chromium } = require('C:/Users/golde/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const standardLocales = ['ko','en','ja','zh','zh-TW','es','fr','ru','vi','th','ar','it','az','km','mn'];
const kpassLocales = standardLocales;
const root = path.resolve(__dirname, '..', '..');
const reports = [
  {
    id:'kpass-child',
    locales:kpassLocales,
    file:path.join(root, 'result-reports/kpass/candidate/report.kpass.final.html'),
    profile:{name:'Alex Kim',genderKey:'X',ageYears:10,ageMonths:4,testDate:{y:2026,m:9,d:21},fullScaleScore:112,scores:{P:120,A:108,S:96,Q:86}},
    identity:'Alex Kim'
  },
  {
    id:'dcas-teen',
    locales:standardLocales,
    file:path.join(root, 'result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_TEEN/teen.work.html'),
    profile:{fullName:'Alex Kim',givenName:'Alex',fullNameEn:'Alex Kim',genderKey:'X',ageYears:16,gradeLabel:'Grade 10',testDate:{y:2026,m:9,d:21},scores:{P:80,A:56,S:89,Q:78}},
    identity:'Alex Kim'
  },
  {
    id:'dcas-adult',
    locales:standardLocales,
    file:path.join(root, 'result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_ADULT/adult.work.html'),
    profile:{fullName:'Alex Kim',givenName:'Alex',fullNameEn:'Alex Kim',genderKey:'X',ageYears:23,gradeLabel:'University Year 4',majorName:'Cognitive Science',testDate:{y:2026,m:9,d:21},scores:{P:80,A:56,S:89,Q:78}},
    identity:'Alex Kim', major:'Cognitive Science'
  }
];

function fileUrl(file, locale) {
  return `file:///${file.replace(/\\/g, '/').replace(/ /g, '%20')}?lang=${locale}`;
}

(async () => {
  const browser = await chromium.launch({
    executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless:true,
    args:['--disable-gpu','--no-first-run','--no-default-browser-check','--allow-file-access-from-files']
  });
  try {
    for (const report of reports.filter((item) => !process.env.REPORT_FILTER || item.id === process.env.REPORT_FILTER)) {
      const locales = process.env.REPORT_LOCALE ? [process.env.REPORT_LOCALE].filter((locale) => report.locales.includes(locale)) : report.locales;
      if (!locales.length) continue;
      for (const locale of locales) {
        const page = await browser.newPage({ viewport:{width:390,height:844} });
        const failures = [];
        page.on('pageerror', (error) => failures.push(error.message));
        await page.addInitScript(({profile,locale}) => {
          window.__TEST_PROFILE__ = profile;
          window.__REPORT_LOCALE__ = locale;
          window.__DCAS_LANG__ = locale;
        }, {profile:report.profile,locale});
        await page.goto(fileUrl(report.file, locale), { waitUntil:'load', timeout:30000 });
        await page.waitForFunction(() => window.FeelGoodReportI18n && window.__REPORT_LOCALE_ACTIVE__, null, {timeout:10000});
        await page.waitForTimeout(250);
        const result = await page.evaluate(() => ({
          lang:document.documentElement.lang,
          dir:document.documentElement.dir,
          body:document.body.innerText,
          menu:[...document.querySelectorAll('.lang-item')].map((node) => node.dataset.code),
          select:[...document.querySelectorAll('#fg-report-language-select option')].map((node) => node.value),
          width:{scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth},
          overflow:[...document.querySelectorAll('body *')].map((node) => {const r=node.getBoundingClientRect();return {tag:node.tagName,id:node.id,cls:String(node.className||'').slice(0,80),text:String(node.innerText||node.textContent||'').trim().slice(0,120),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width)}}).filter((x) => x.right > innerWidth + 2 || x.left < -2).sort((a,b)=>b.width-a.width).slice(0,10),
          scrollers:[document.body,...document.querySelectorAll('body *')].map((node)=>{const s=getComputedStyle(node);return {tag:node.tagName,id:node.id,cls:String(node.className||'').slice(0,80),client:node.clientWidth,scroll:node.scrollWidth,overflowX:s.overflowX}}).filter((x)=>x.scroll>x.client+2&&!['auto','scroll'].includes(x.overflowX)).sort((a,b)=>(b.scroll-b.client)-(a.scroll-a.client)).slice(0,15),
          tokens:/__FG(?:PH|U)_/.test(document.body.innerText)
          ,residueNodes:(() => {const values=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode()))if(/[가-힣]/.test(node.nodeValue)&&!['SCRIPT','STYLE','NOSCRIPT'].includes(node.parentElement?.tagName))values.push({text:node.nodeValue.trim(),parent:node.parentElement?.outerHTML.slice(0,300)});return values.slice(0,30)})()
        }));
        assert.strictEqual(result.lang, locale, `${report.id}/${locale}: html lang`);
        assert.strictEqual(result.dir, locale === 'ar' ? 'rtl' : 'ltr', `${report.id}/${locale}: direction`);
        assert.deepStrictEqual(result.menu.length ? result.menu : result.select, report.locales, `${report.id}/${locale}: locale menu`);
        assert.ok(result.body.includes(report.identity), `${report.id}/${locale}: identity missing; errors=${failures.join(' | ')}; body=${result.body.slice(0,500)}`);
        if (report.major) assert.ok(result.body.includes(report.major), `${report.id}/${locale}: major missing`);
        assert.strictEqual(result.tokens, false, `${report.id}/${locale}: internal token visible`);
        if (locale !== 'ko') {
          const residueBody = result.body.replaceAll('한국어','');
          const residue = [...residueBody.matchAll(/.{0,45}[가-힣]+.{0,45}/g)].slice(0,8).map((match) => match[0]);
          assert.deepStrictEqual(residue, [], `${report.id}/${locale}: Korean residue visible; nodes=${JSON.stringify(result.residueNodes)}`);
        }
        assert.ok(result.width.scroll <= result.width.client + 2, `${report.id}/${locale}: horizontal overflow ${result.width.scroll}/${result.width.client}; overflow=${JSON.stringify(result.overflow)}; scrollers=${JSON.stringify(result.scrollers)}`);
        assert.deepStrictEqual(failures, [], `${report.id}/${locale}: page errors`);
        await page.close();
      }

      const page = await browser.newPage({ viewport:{width:1280,height:900} });
      await page.addInitScript(({profile}) => { window.__TEST_PROFILE__=profile;window.__REPORT_LOCALE__='km';window.__DCAS_LANG__='km'; }, {profile:report.profile});
      await page.goto(fileUrl(report.file, 'km'), {waitUntil:'load',timeout:30000});
      await page.waitForFunction(() => window.FeelGoodReportI18n);
      await page.evaluate(() => window.FeelGoodReportI18n.setLocale('ar'));
      await page.waitForTimeout(150);
      const switched = await page.evaluate(() => ({lang:document.documentElement.lang,dir:document.documentElement.dir,body:document.body.innerText,url:location.href}));
      assert.strictEqual(switched.lang, 'ar', `${report.id}: live switch locale`);
      assert.strictEqual(switched.dir, 'rtl', `${report.id}: live switch RTL`);
      assert.ok(switched.body.includes(report.identity), `${report.id}: identity lost during switch`);
      if (report.major) assert.ok(switched.body.includes(report.major), `${report.id}: major lost during switch`);
      assert.ok(switched.url.includes('lang=ar'), `${report.id}: URL locale not updated`);
      await page.close();
      console.log(`PASS: ${report.id} ${locales.length === report.locales.length ? report.locales.length + ' locales' : locales.join(',')}, mobile width, live switch`);
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
