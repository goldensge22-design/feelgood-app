import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const locales = JSON.parse(readFileSync(`${root}src/i18n/locales.json`, 'utf8'));
const config = JSON.parse(readFileSync(`${root}src/i18n/guide-config.json`, 'utf8'));
const executablePath = execFileSync('which', ['chromium'], { encoding: 'utf8' }).trim();
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const base = process.env.GUIDE_TEST_URL || 'http://localhost:80';
const output = '/tmp/dcas-guide-verification';
mkdirSync(output, { recursive: true });
const report = { locales: [], navigation: [], failures: [], consoleErrors: [] };
const ids = ['cover', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'checklist'];
async function active(page, id) {
  await page.waitForFunction((id) => document.querySelector(`#${id}`)?.getAttribute('data-active') === 'true', id);
}
async function go(page, id) {
  await page.evaluate((id) => { location.hash = id; }, id);
  await active(page, id);
}
try {
  for (const locale of locales) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', (error) => report.consoleErrors.push(`${locale.code}: ${error.message}`));
    const pack = JSON.parse(readFileSync(`${root}src/i18n/packs/${locale.code}.json`, 'utf8'));
    await page.goto(`${base}/?lang=${locale.code}&keep=preserved#cover`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction((code) => document.documentElement.lang === code && !!document.querySelector('#h-cover'), locale.code);
    assert.equal(await page.title(), pack.meta.title);
    assert.equal(await page.locator('html').getAttribute('dir'), locale.dir);
    const item = { code: locale.code, screens: 0, links: 0, print: false };
    for (const width of [1440, 768, 360]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const id of ids) {
        await go(page, id);
        const dimensions = await page.evaluate(() => ({
          width: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
          language: document.querySelector('[data-testid="select-language"]').getBoundingClientRect().toJSON(),
          outliers: [...document.querySelectorAll('.book-page[data-active="true"] *')].filter((e) => {
            const r = e.getBoundingClientRect();
            const s = getComputedStyle(e);
            return r.width > 0 && r.height > 0 && s.position !== 'absolute' && !e.closest('.sr-only') &&
              (r.left < -2 || r.right > document.documentElement.clientWidth + 2);
          }).slice(0, 3).map((e) => ({ tag: e.tagName, text: e.textContent.slice(0, 40) })),
        }));
        assert.ok(dimensions.scroll <= dimensions.width + 1, `${locale.code}/${width}/${id}: horizontal overflow ${JSON.stringify(dimensions)}`);
        assert.deepEqual(dimensions.outliers, [], `${locale.code}/${width}/${id}: content offscreen`);
        assert.ok(dimensions.language.height >= 44, 'language target below 44px');
        item.screens++;
      }
    }
    for (let i = 0; i < 6; i++) {
      const links = await page.locator(`#ch${i + 1} a[target="_blank"]`).evaluateAll((els) => els.map((e) => ({ href: e.href, rel: e.rel })));
      assert.equal(links.length, config.chapterHashes[i].length);
      links.forEach((link, j) => {
        const u = new URL(link.href);
        assert.equal(u.hash, `#${config.chapterHashes[i][j]}`);
        assert.equal(u.searchParams.get('lang'), locale.code);
        assert.equal(u.searchParams.get('v'), '14');
        assert.ok(link.rel.includes('noopener'));
        item.links++;
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => { window.__printCalls = 0; window.print = () => { window.__printCalls++; }; });
    await page.getByTestId('button-print').click();
    assert.equal(await page.evaluate(() => window.__printCalls), 1);
    await page.emulateMedia({ media: 'print' });
    await page.evaluate(() => dispatchEvent(new Event('beforeprint')));
    const printState = await page.evaluate(() => ({
      visiblePages: [...document.querySelectorAll('.book-page')].filter((e) => getComputedStyle(e).display !== 'none').length,
      visibleControls: [...document.querySelectorAll('.no-print')].filter((e) => e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none').length,
      openExamples: [...document.querySelectorAll('details')].every((e) => e.open),
    }));
    assert.equal(printState.visiblePages, 8);
    assert.equal(printState.visibleControls, 0);
    assert.equal(printState.openExamples, true);
    await page.evaluate(() => dispatchEvent(new Event('afterprint')));
    const pdfPath = `${output}/${locale.code}.pdf`;
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
    const text = execFileSync('pdftotext', ['-layout', pdfPath, '-'], { encoding: 'utf8' });
    assert.ok(text.replace(/\s/g, '').length > 1000, `${locale.code}: printed document text missing`);
    assert.ok(!text.includes('ai-draft'), 'print exposes review metadata');
    if (locale.code === 'ko') {
      const normalized = text.replace(/\s/g, '');
      for (const label of [pack.ui.who, pack.ui.prepare, pack.ui.done, pack.ui.workflowLabel]) {
        assert.ok(normalized.includes(label.replace(/\s/g, '')), `Korean PDF lost glyphs for label: ${label}`);
      }
    }
    item.print = true;
    item.pdfTextCharacters = text.length;
    report.locales.push(item);
    writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
    console.log(`PASS ${locale.code}: ${item.screens} layouts, ${item.links} links, full PDF`);
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => localStorage.setItem('dcas-guide:checks', '[true,true,true,true]'));
  const page = await context.newPage();
  await page.goto(`${base}/?lang=ko&keep=preserved#cover`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('button-start-new').waitFor();
  await page.getByTestId('button-start-new').click();
  await active(page, 'ch1');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'h-ch1');
  await page.getByTestId('button-brand').click();
  await page.getByTestId('button-start-existing').click();
  await active(page, 'ch3');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'h-ch3');
  for (const id of ids) {
    await page.getByTestId(`toc-${id}`).click();
    await active(page, id);
    assert.equal(await page.getByTestId(`toc-${id}`).getAttribute('aria-current'), 'step');
    assert.equal(await page.evaluate(() => document.activeElement.id), `h-${id}`);
  }
  assert.equal(await page.locator('input[type="checkbox"]:checked').count(), 0, 'old checks incorrectly inherited');
  await page.getByTestId('check-item-1').click();
  await page.getByTestId('check-item-6').click();
  await page.reload();
  await active(page, 'checklist');
  assert.equal(await page.locator('input[type="checkbox"]:checked').count(), 2);
  await page.getByTestId('select-language').selectOption('ar');
  await page.waitForFunction(() => document.documentElement.lang === 'ar');
  assert.equal(new URL(page.url()).searchParams.get('keep'), 'preserved');
  assert.equal(new URL(page.url()).hash, '#checklist');
  assert.equal(await page.locator('input[type="checkbox"]:checked').count(), 2);
  await page.reload();
  await page.waitForFunction(() => document.documentElement.lang === 'ar');
  await active(page, 'checklist');
  assert.equal(await page.locator('input[type="checkbox"]:checked').count(), 2);
  await page.setViewportSize({ width: 360, height: 900 });
  await page.getByTestId('select-chapter').selectOption('1');
  await active(page, 'ch1');
  await page.getByTestId('page-ch1').getByTestId('button-next').click();
  await active(page, 'ch2');
  await page.getByTestId('page-ch2').getByTestId('button-prev').click();
  await active(page, 'ch1');
  await page.getByTestId('details-example-ch1').locator('summary').click();
  assert.equal(await page.getByTestId('details-example-ch1').getAttribute('open'), '');
  report.navigation = ['two start routes + heading focus', 'all TOC routes + active state + focus', 'old checklist not inherited', 'six checks / reload / language switch state', 'URL params/hash retained', 'mobile chapter selector', 'previous/next', 'expandable example'];
  await context.close();
  assert.deepEqual(report.consoleErrors, []);
} catch (error) {
  report.failures.push(error.stack);
  process.exitCode = 1;
} finally {
  writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}
