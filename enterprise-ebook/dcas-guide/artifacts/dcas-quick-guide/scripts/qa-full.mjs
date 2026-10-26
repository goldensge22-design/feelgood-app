import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = fileURLToPath(new URL('../../../generated-artifacts/dcas-qa/', import.meta.url));
const record = fileURLToPath(new URL('../../../qa/dcas-guide/', import.meta.url));
const requested = process.env.GUIDE_TEST_LOCALES?.split(',');
const locales = JSON.parse(readFileSync(`${root}src/i18n/locales.json`)).filter(l => !requested || requested.includes(l.code));
const config = JSON.parse(readFileSync(`${root}src/i18n/guide-config.json`));
const ids = ['cover', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'checklist'];
const base = process.env.GUIDE_TEST_URL || 'http://localhost:80';
mkdirSync(output, { recursive: true });
mkdirSync(record, { recursive: true });
const browser = await chromium.launch({
  executablePath: execFileSync('which', ['chromium'], { encoding: 'utf8' }).trim(),
  args: ['--no-sandbox'],
});
const report = {
  started: new Date().toISOString(), browser: browser.version(), base,
  screens: [], operations: [], links: [], prints: [], errors: [], races: [],
  limitations: ['No native-speaker certification', 'No authenticated operational dashboard save or integration test',
    'Chromium only; no physical printer', 'Automated geometry checks plus visual contact-sheet inspection are recorded separately'],
};
function save() {
  writeFileSync(`${record}/${process.env.GUIDE_REPORT_NAME || 'execution.json'}`, JSON.stringify(report, null, 2));
}
async function active(page, id) {
  await page.waitForFunction(id => document.querySelector(`#${id}`)?.dataset.active === 'true', id);
}
async function navigate(page, id, width) {
  if (width >= 1024) await page.getByTestId(`toc-${id}`).click();
  else await page.getByTestId('select-chapter').selectOption(String(ids.indexOf(id)));
  await active(page, id);
  assert.equal(await page.evaluate(() => document.activeElement.id), `h-${id}`);
  if (width >= 1024) assert.equal(await page.getByTestId(`toc-${id}`).getAttribute('aria-current'), 'step');
}
async function layout(page) {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const bad = [];
    for (const e of document.querySelectorAll('.book-page[data-active="true"] *')) {
      const r = e.getBoundingClientRect(), s = getComputedStyle(e);
      if (!r.width || !r.height || e.closest('.sr-only') || s.position === 'absolute') continue;
      if (r.left < -2 || r.right > width + 2) bad.push({ type: 'outside', tag: e.tagName, text: e.textContent.slice(0, 60) });
      if (e.clientWidth && e.scrollWidth > e.clientWidth + 2 && ['hidden', 'clip'].includes(s.overflowX)) {
        // Decorative absolute artwork may exceed a clipping container on purpose.
        // Only flag actual text rectangles outside that container.
        const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
        let node, clipped = false;
        while ((node = walker.nextNode())) {
          if (!node.textContent.trim()) continue;
          const range = document.createRange(); range.selectNodeContents(node);
          if ([...range.getClientRects()].some(t => t.width && (t.left < r.left - 2 || t.right > r.right + 2))) clipped = true;
        }
        if (clipped) bad.push({ type: 'clipped', tag: e.tagName, text: e.textContent.slice(0, 60) });
      }
    }
    const select = document.querySelector('[data-testid="select-language"]');
    const r = select.getBoundingClientRect(), s = getComputedStyle(select);
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
    ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    const label = select.selectedOptions[0].text;
    const labelWidth = ctx.measureText(label).width;
    return { width, scroll: document.documentElement.scrollWidth, bad,
      language: { label, width: r.width, height: r.height, left: r.left, right: r.right,
        availableTextWidth: r.width - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight), labelWidth },
      headings: [...document.querySelectorAll('.book-page[data-active="true"] h2')].map(e => e.textContent),
      openExamples: [...document.querySelectorAll('.book-page[data-active="true"] details')].every(e => e.open),
       displayFont: getComputedStyle(document.querySelector('.book-page[data-active="true"] h2')).fontFamily,
    };
  });
}
try {
  for (const locale of locales) {
    const dir = `${output}/${locale.code}`;
    mkdirSync(dir, { recursive: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push({ locale: locale.code, type: 'pageerror', message: e.message }));
    try {
      const response = await page.goto(`${base}/?lang=${locale.code}&keep=preserved#cover`);
      assert.equal(response.status(), 200);
      await page.getByTestId('button-start-new').waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('html').getAttribute('lang'), locale.code);
      assert.equal(await page.locator('html').getAttribute('dir'), locale.dir);
      await page.getByTestId('button-start-new').click();
      await active(page, 'ch1');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'h-ch1');
      await page.getByTestId('button-brand').click();
      await page.getByTestId('button-start-existing').click();
      await active(page, 'ch3');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'h-ch3');
      report.operations.push({ locale: locale.code, test: 'two start routes and focus', status: 'pass' });
      const sizes = [1440, 1024, 768, 360];
      if (['ar', 'ru', 'fr', 'th', 'km'].includes(locale.code)) sizes.push(740);
      for (const width of sizes) {
        await page.setViewportSize({ width, height: width === 740 ? 360 : 1000 });
        for (const id of ids) {
          await navigate(page, id, width);
          const summary = page.locator(`#${id} details summary`);
          if (await summary.count()) {
            const details = page.locator(`#${id} details`);
            if (await details.getAttribute('open') !== null) await summary.click();
            assert.equal(await details.getAttribute('open'), null);
            await summary.click();
            assert.equal(await details.getAttribute('open'), '');
          }
          const metrics = await layout(page);
          const failures = [];
          if (metrics.scroll > metrics.width + 1) failures.push('horizontal overflow');
          if (metrics.bad.length) failures.push('offscreen/clipped content');
          if (metrics.language.height < 44 || metrics.language.width < 44) failures.push('language target below 44px');
          if (metrics.language.labelWidth > metrics.language.availableTextWidth + 1) failures.push('language name clipped');
          if (metrics.language.left + metrics.language.width / 2 < metrics.width / 2) failures.push('language selector not at top right');
          if (!metrics.openExamples) failures.push('example did not expand');
           const expectedDisplay = { th: 'Noto Sans Thai', km: 'Noto Sans Khmer' }[locale.code];
           if (expectedDisplay && !metrics.displayFont.startsWith(`"${expectedDisplay}"`)) failures.push('wrong script heading font');
          const image = `${locale.code}/${width}-${id}.png`;
          await page.screenshot({ path: `${output}/${image}`, fullPage: true });
          report.screens.push({ locale: locale.code, width, height: width === 740 ? 360 : 1000,
            chapter: id, examples: 'expanded', navigation: width >= 1024 ? 'toc click + active + focus' : 'chapter select + focus',
            metrics, image, status: failures.length ? 'fail' : 'pass', failures });
        }
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      // Actually operate every previous/next button in every locale.
      for (let i = 1; i < ids.length; i++) {
        await navigate(page, ids[i], 1440);
        const panel = page.getByTestId(`page-${ids[i]}`);
        if (i < ids.length - 1) {
          await panel.getByTestId('button-next').click();
          await active(page, ids[i + 1]);
          await page.getByTestId(`page-${ids[i + 1]}`).getByTestId('button-prev').click();
          await active(page, ids[i]);
        }
      }
      await navigate(page, 'ch1', 1440);
      await page.getByTestId('page-ch1').getByTestId('button-prev').click();
      await active(page, 'cover');
      await navigate(page, 'checklist', 1440);
      await page.getByTestId('page-checklist').getByTestId('button-cover').click();
      await active(page, 'cover');
      report.operations.push({ locale: locale.code, test: 'all previous/next transitions', status: 'pass' });
      // Click every external demo link and inspect the real popup destination.
      for (let i = 0; i < 6; i++) {
        await navigate(page, `ch${i + 1}`, 1440);
        const links = page.locator(`#ch${i + 1} a[target="_blank"]`);
        for (let j = 0; j < await links.count(); j++) {
          const expected = new URL(config.demoBase);
          expected.searchParams.set('lang', locale.code); expected.searchParams.set('v', config.demoVersion);
          expected.hash = config.chapterHashes[i][j];
          const href = await links.nth(j).getAttribute('href');
          assert.equal(href, expected.toString());
          const popupPromise = page.waitForEvent('popup');
          await links.nth(j).click();
          const popup = await popupPromise;
          try {
            await popup.waitForURL(url => url.toString().startsWith(config.demoBase), { waitUntil: 'commit', timeout: 3000 });
            report.links.push({ locale: locale.code, chapter: i + 1, href, actualUrl: popup.url(),
              click: 'pass', destinationCommitted: popup.url().startsWith(config.demoBase) });
          } catch (e) {
            report.links.push({ locale: locale.code, chapter: i + 1, href, click: 'pass',
              destinationCommitted: false, limitation: e.message.split('\n')[0] });
          }
          await popup.close();
        }
      }
      await navigate(page, 'checklist', 1440);
      for (let i = 1; i <= 6; i++) await page.getByTestId(`check-item-${i}`).check();
      await page.reload();
      await active(page, 'checklist');
      await page.getByTestId('check-item-1').waitFor();
      assert.equal(await page.locator('input[type="checkbox"]:checked').count(), 6);
      const other = locale.code === 'ko' ? 'en' : 'ko';
      await page.getByTestId('select-language').selectOption(other);
      await page.waitForFunction(code => document.documentElement.lang === code, other);
      assert.equal(new URL(page.url()).searchParams.get('keep'), 'preserved');
      assert.equal(new URL(page.url()).hash, '#checklist');
      assert.equal(await page.locator('input[type="checkbox"]:checked').count(), 6);
      await page.getByTestId('select-language').selectOption(locale.code);
      await page.waitForFunction(code => document.documentElement.lang === code, locale.code);
      await page.reload();
      await page.getByTestId('check-item-1').waitFor();
      assert.equal(await page.locator('html').getAttribute('lang'), locale.code);
      assert.equal(await page.locator('input[type="checkbox"]:checked').count(), 6);
      await page.getByTestId('button-reset-checks').click();
      assert.equal(await page.locator('input[type="checkbox"]:checked').count(), 0);
      report.operations.push({ locale: locale.code, test: 'all six checkboxes/reset, reload, language roundtrip, URL params/hash', status: 'pass' });
      // Real window.print call, not a stub. Headless Chromium emits the print lifecycle.
      await page.evaluate(() => {
        window.__printEvents = [];
        addEventListener('beforeprint', () => window.__printEvents.push('beforeprint'));
        addEventListener('afterprint', () => window.__printEvents.push('afterprint'));
      });
      await page.getByTestId('button-print').click();
      await page.waitForFunction(() => window.__printEvents.includes('beforeprint'));
      await page.pdf({ path: `${dir}/guide.pdf`, format: 'A4', printBackground: true, preferCSSPageSize: true });
      await page.emulateMedia({ media: 'print' });
      await page.evaluate(() => dispatchEvent(new Event('beforeprint')));
      const printDOM = await page.evaluate(() => ({
        visiblePages: [...document.querySelectorAll('.book-page')].filter(e => getComputedStyle(e).display !== 'none').length,
        visibleControls: [...document.querySelectorAll('.no-print')].filter(e => e.getClientRects().length && getComputedStyle(e).display !== 'none').length,
        openExamples: [...document.querySelectorAll('details')].every(e => e.open),
        events: window.__printEvents,
        headings: [...document.querySelectorAll('.book-page h2')].map(e => e.textContent),
      }));
      assert.equal(printDOM.visiblePages, 8); assert.equal(printDOM.visibleControls, 0);
      assert.ok(printDOM.openExamples);
      const text = execFileSync('pdftotext', ['-layout', `${dir}/guide.pdf`, '-'], { encoding: 'utf8' });
      assert.ok(text.replace(/\s/g, '').length > 1000);
      assert.ok(!/ai-draft|AI pair-by-pair|nativeReviewed/.test(text));
       if ({ ja: 'JP', 'zh-CN': 'SC', 'zh-TW': 'TC', th: 'Thai', km: 'Khmer' }[locale.code]) {
         const suffix = { ja: 'JP', 'zh-CN': 'SC', 'zh-TW': 'TC', th: 'Thai', km: 'Khmer' }[locale.code];
        const fonts = execFileSync('pdffonts', [`${dir}/guide.pdf`], { encoding: 'utf8' });
        assert.ok(fonts.includes(`NotoSans${suffix}`), `${locale.code}: CJK body font not embedded in PDF`);
      }
      writeFileSync(`${dir}/print.txt`, text);
      for (const file of readdirSync(dir).filter(f => /^print-page-\d+\.png$/.test(f))) unlinkSync(`${dir}/${file}`);
      execFileSync('pdftoppm', ['-scale-to', '1000', '-png', `${dir}/guide.pdf`, `${dir}/print-page`], { stdio: ['ignore', 'pipe', 'pipe'] });
      execFileSync('pdftotext', ['-bbox-layout', `${dir}/guide.pdf`, `${dir}/print-bbox.html`]);
      report.prints.push({ locale: locale.code, status: 'pass', ...printDOM,
        textLength: text.length, pdf: `${locale.code}/guide.pdf`, renderedAllPages: true });
      console.log(`PASS ${locale.code}: ${sizes.length * 8} expanded screens, navigation, links, state, real print + rendered PDF`);
    } catch (e) {
      report.errors.push({ locale: locale.code, type: 'assertion', message: e.stack });
      console.error(`FAIL ${locale.code}: ${e.message}`);
    } finally { await context.close(); save(); }
  }
  // A cold-cache race: force out-of-order language module responses.
  const context = await browser.newContext({ viewport: { width: 360, height: 900 } });
  await context.route(/\/packs\/(fr|ar|ru|az)\.json/, async route => {
    const code = route.request().url().match(/\/packs\/(\w+)\.json/)?.[1];
    await new Promise(r => setTimeout(r, { fr: 900, ar: 650, ru: 350, az: 30 }[code] || 0));
    await route.continue();
  });
  const page = await context.newPage();
  await page.goto(`${base}/?lang=en&keep=race#ch4`);
  await page.getByTestId('select-language').waitFor();
  await page.evaluate(() => {
    window.__observations = [];
    new MutationObserver(() => {
      window.__observations.push({ lang: document.documentElement.lang, title: document.querySelector('#h-ch4')?.textContent });
    }).observe(document.documentElement, { subtree: true, characterData: true, attributes: true, attributeFilter: ['lang'] });
  });
  for (const code of ['fr', 'ar', 'ru', 'az']) await page.getByTestId('select-language').selectOption(code);
  await page.waitForFunction(() => document.documentElement.lang === 'az');
  await page.waitForTimeout(1200);
  const observations = await page.evaluate(() => window.__observations);
  assert.equal(await page.locator('html').getAttribute('lang'), 'az');
  assert.ok(!observations.some(o => o.lang === 'ko'));
  const firstFinal = observations.findIndex(o => o.lang === 'az');
  assert.ok(observations.slice(firstFinal).every(o => o.lang === 'az'));
  assert.equal(new URL(page.url()).hash, '#ch4');
  assert.equal(new URL(page.url()).searchParams.get('keep'), 'race');
  report.races.push({ status: 'pass', delayedModules: ['fr', 'ar', 'ru', 'az'], observations });
  await context.close();
} catch (e) { report.errors.push({ type: 'global', message: e.stack }); }
finally {
  report.finished = new Date().toISOString();
  report.failedScreens = report.screens.filter(s => s.status === 'fail').length;
  save(); await browser.close();
  console.log(JSON.stringify({ screens: report.screens.length, failedScreens: report.failedScreens,
    prints: report.prints.length, links: report.links.length, errors: report.errors, races: report.races.length }, null, 2));
  if (report.errors.length || report.failedScreens) process.exitCode = 1;
}
