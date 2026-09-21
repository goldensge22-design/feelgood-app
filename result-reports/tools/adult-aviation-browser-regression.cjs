const assert = require('assert');
const path = require('path');
const { chromium } = require('C:/Users/golde/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root = path.resolve(__dirname, '..', '..');
const file = path.join(root, 'result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_ADULT/adult.work.html');
const locales = ['ko', 'zh', 'km'];
const profile = {
  fullName:'Alex Kim', givenName:'Alex', fullNameEn:'Alex Kim', genderKey:'X', ageYears:23,
  gradeLabel:'University Year 4', majorName:'항공보안학과', testDate:{y:2026,m:9,d:22},
  scores:{P:80,A:85,S:78,Q:82}
};
const expectedJobs = [
  '공항보안 사무직', '항공사보안 사무직', '항공보안검색요원', '항공경비요원', '대테러보안요원',
  '항공사보안요원', '항공화물보안요원', '산업보안 사무직', '산업보안 경비요원', '산업보안검색요원'
];
const fileUrl = (locale) => `file:///${file.replace(/\\/g, '/').replace(/ /g, '%20')}?lang=${locale}`;

(async () => {
  const browser = await chromium.launch({
    executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true,
    args:['--disable-gpu','--no-first-run','--no-default-browser-check','--allow-file-access-from-files']
  });
  try {
    for (const locale of locales) {
      const page = await browser.newPage({viewport:{width:390,height:844}});
      const failures = [];
      page.on('pageerror', (error) => failures.push(error.message));
      await page.addInitScript(({profile, locale}) => {
        window.__TEST_PROFILE__ = profile;
        window.__REPORT_LOCALE__ = locale;
        window.__DCAS_LANG__ = locale;
      }, {profile, locale});
      await page.goto(fileUrl(locale), {waitUntil:'load',timeout:30000});
      await page.waitForFunction(() => window.FeelGoodReportI18n && window.__REPORT_LOCALE_ACTIVE__);
      await page.waitForTimeout(300);
      const result = await page.evaluate(({scores}) => {
        const ranked = window.DCasJobEngine.rankJobsForMajor(scores, '항공보안학과', window.JOB_POOL);
        return {
          lang:document.documentElement.lang,
          body:document.body.innerText,
          ranked:ranked.map((item) => item.job.label_ko),
          width:[document.documentElement.scrollWidth, document.documentElement.clientWidth]
        };
      }, {scores:profile.scores});
      assert.strictEqual(result.lang, locale);
      assert.deepStrictEqual(new Set(result.ranked), new Set(expectedJobs));
      assert.strictEqual(result.ranked.length, 10);
      assert.ok(result.body.includes('Alex Kim'), `${locale}: identity missing`);
      assert.ok(result.width[0] <= result.width[1] + 2, `${locale}: horizontal overflow ${result.width}`);
      assert.deepStrictEqual(failures, [], `${locale}: page errors`);
      assert.ok(!/\uFFFD|Ã[\u0080-\u00BF]|â(?:€|€™|€œ)|(?:æœ|å­|ä¸|é—)/.test(result.body), `${locale}: encoding corruption marker`);
      if (locale === 'ko') {
        assert.ok(result.body.includes('항공보안학과'));
        assert.ok(expectedJobs.some((job) => result.body.includes(job)), 'Korean job recommendation missing');
      } else {
        const residue = result.body.replaceAll('한국어', '').match(/[가-힣]+/g) || [];
        assert.deepStrictEqual(residue, [], `${locale}: Korean residue ${residue.slice(0,10)}`);
      }
      await page.close();
    }
    console.log('PASS: adult aviation-security 10-job DOM in ko/zh/km, mobile width, no encoding residue');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
