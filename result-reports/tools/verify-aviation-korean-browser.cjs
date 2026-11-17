const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
let chromium;
try { ({chromium}=require('playwright')); }
catch { ({chromium}=require('C:/Users/golde/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }

const report = path.resolve(__dirname, '..', 'dcas81', 'unpacked', 'APPLIED_FULL', 'DCAS_ADULT', 'adult.work.html');
const cases = [
  ['항공교통물류학과', 29],
  ['항공외국어학과', 20],
  ['공항행정학과', 29],
];

(async () => {
  const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({headless:true, ...(fs.existsSync(chrome)?{executablePath:chrome}:{})});
  try {
    for (const width of [360, 768, 1440]) {
      const page = await browser.newPage({viewport:{width,height:900}});
      const errors=[];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(pathToFileURL(report).href);
      await page.waitForFunction(() => !!window.DCasAdultEngine && !!window.DCasAviationCatalog && !!window.DCasAviationJobProfiles);
      await page.evaluate(() => window.FeelGoodReportI18n?.setLocale?.('ko'));
      await page.evaluate(() => showSection(5));
      for (const [major,count] of cases) {
        await page.locator('#majorSelect').selectOption(major);
        assert.equal(await page.locator('#majorSelect').inputValue(), major);
        assert.equal(await page.locator('#pf-jobcards [data-career-profile-id]').count(), count, `${width}px ${major}`);
        assert.equal(await page.locator('#fg-aviation-lecture-roles [data-lecture-role-id]').count(), 15);
        assert.equal(await page.locator('#fg-aviation-lecture-roles [data-lecture-competency-id]').count(), 9);
        assert.equal(await page.locator('#pf-jobcards .rank-medal').count(), 0, 'unranked exploration has no ranking');
        assert.match(await page.locator('#pf-jobs-h2').innerText(), /직무|진로|항공|공항/);
      }
      await page.evaluate(() => showSection(6));
      assert.ok(await page.locator('#fg-aviation-lecture-roles').isVisible(), `${width}px lecture list visible`);
      await page.evaluate(() => showSection(5));
      await page.locator('#majorSelect').selectOption('항공보안학과');
      await page.evaluate(() => showSection(6));
      assert.equal(await page.locator('#pf-jobcards .rank-medal').count(), 5, 'existing TOP5 remains');
      assert.equal(await page.locator('#fg-aviation-security-profiles [data-career-profile-id]').count(), 18);
      assert.equal(await page.locator('#fg-aviation-lecture-roles [data-lecture-role-id]').count(), 15);
      assert.equal(await page.locator('#fg-aviation-lecture-roles [data-lecture-competency-id]').count(), 9);
      assert.ok(await page.locator('#fg-lab-top5-bridge').isVisible(), `${width}px LAB handoff visible`);
      assert.equal(await page.locator('#fg-lab-top5-bridge button').count(), 0, 'no false automatic transfer without server adapter');
      assert.match(await page.locator('#fg-lab-top5-bridge [role=status]').innerText(), /전송되지 않았습니다/);
      if (width===768) {
        await page.evaluate(() => {
          window.FeelGoodLabBridge={saveTop5:async envelope=>{window.__sentLabTop5=envelope;return {ok:true};}};
          window.DCasAdultEngine.render();
          showSection(6);
        });
        await page.locator('#fg-lab-top5-bridge button').click();
        const sent=await page.evaluate(() => window.__sentLabTop5);
        assert.equal(sent.testName, 'D-CAS');
        assert.equal(sent.topJobs.length, 5);
        assert.equal(sent.sourceJobIds.length, 5);
        assert.ok(sent.topJobs.every(job => job.label && !('jobId' in job)), 'LAB IDs must be resolved by the authenticated server');
        assert.ok(!JSON.stringify(sent).includes('scores'), 'score data must not be sent by this bridge');
      }
      if (width===360) {
        await page.evaluate(() => showSection(5));
        await page.locator('#majorSelect').selectOption('항공교통물류학과');
        const supported=await page.evaluate(() => window.FeelGoodReportI18n.supportedLocales);
        assert.equal(supported.length, 15);
        for (const lang of supported.filter(lang => lang!=='ko')) {
          await page.evaluate(lang => window.FeelGoodReportI18n.setLocale(lang), lang);
          assert.equal(await page.locator('#majorSelect').inputValue(), '항공교통물류학과');
          assert.equal(await page.locator('#pf-jobcards [data-career-job-id]').count(), 5, `${lang} legacy translated examples`);
          assert.equal(await page.locator('#fg-aviation-lecture-roles').count(), 0, `${lang} Korean-only lecture content hidden`);
          assert.equal(await page.locator('#fg-aviation-security-profiles').count(), 0);
        }
        await page.evaluate(() => window.FeelGoodReportI18n.setLocale('ko'));
        assert.equal(await page.locator('#pf-jobcards [data-career-profile-id]').count(), 29);
        assert.equal(await page.locator('#fg-aviation-lecture-roles [data-lecture-role-id]').count(), 15);
      }
      assert.deepEqual(errors, [], `${width}px browser errors`);
      const metrics=await page.evaluate(() => ({scroll:document.documentElement.scrollWidth, client:document.documentElement.clientWidth}));
      assert.ok(metrics.scroll<=metrics.client+2, `${width}px horizontal overflow ${JSON.stringify(metrics)}`);
      if (width===1440) {
        const pdf=await page.pdf({printBackground:true});
        assert.equal(pdf.subarray(0,5).toString(), '%PDF-');
        assert.ok(pdf.length>10000, 'print output should contain report content');
      }
      console.log(`PASS ${width}px: three majors 29/20/29, security TOP5 + 18, lecture 15, no page errors or overflow`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => {console.error(e);process.exitCode=1;});
