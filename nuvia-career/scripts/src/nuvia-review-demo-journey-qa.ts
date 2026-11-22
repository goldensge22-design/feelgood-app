/// <reference lib="dom" />
/** Repeatable synthetic demo navigation, state and viewport assertions. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const root = process.env.NUVIA_TEST_ORIGIN ?? 'http://localhost:80';
const out = resolve(import.meta.dirname, '../../generated-artifacts/nuvia-review-demo-qa');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE ?? '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
const rows: { id: string; status: 'PASS' | 'FAIL'; detail?: string }[] = [];
const cases = async (id: string, fn: () => Promise<void>) => {
  try { await fn(); rows.push({ id, status: 'PASS' }); }
  catch (err) { rows.push({ id, status: 'FAIL', detail: String(err) }); throw err; }
};
const startTime = new Date().toISOString();
try {
  await mkdir(out, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const network: string[] = [];
  page.on('request', (r) => { if (new URL(r.url()).pathname.startsWith('/api/')) network.push(new URL(r.url()).pathname); });
  const by = (id: string) => page.getByTestId(id);
  const input = by('input-section-1');
  const find = async (text: string) => { await page.getByText(text, { exact: true }).first().waitFor(); };
  const original = '모의 실습 원문: 서로 다른 안내를 대조했습니다.\n확인 질문을 따로 적었습니다.';
  const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  const recheck = async () => {
    assert.equal(await input.inputValue(), original);
    assert.equal(await by('input-company').inputValue(), '새봄교육 (가상)');
    assert.equal(await by('input-job').inputValue(), '교육 운영 지원');
    assert.equal(await by('input-keyword').inputValue(), '확인사항 구분하기');
  };
  const confirm = async () => {
    await by('checkbox-fact').click(); await by('checkbox-use').click();
    await by('button-confirm-storyboard').click(); await by('status-confirmed').waitFor();
  };
  await cases('entry and separate teacher route', async () => {
    await page.goto(`${root}/demo/review?lang=ko`);
    await find('NUVIA 로그인 체험');
    assert.equal(await page.locator('input[type=password]').count(), 0);
    const start = await by('button-review-start').boundingBox();
    assert(start && start.height >= 44 && start.y + start.height < 800);
    await by('link-review-teacher').click();
    assert.match(page.url(), /\/teacher$/);
    await page.goBack();
    await by('button-review-start').click();
    await find('MY NUVIA');
  });
  await cases('home → report → LAB → confirmed synthetic source', async () => {
    for (const id of ['planner', 'history', 'storyboard']) await by(`link-review-${id}`).waitFor();
    await by('link-review-report').click(); await by('link-review-lab').click();
    assert(await by('button-review-continue').isDisabled());
    await by('option-review-education').click();
    assert(await by('button-review-continue').isDisabled());
    await by('checkbox-review-record').click();
    await by('button-review-continue').click();
    assert.equal(await by('text-source-title').innerText(), '교내 예약 안내 비교 (모의 연습)');
    assert.equal(await input.inputValue(), '');
    await input.fill(original); await recheck();
  });
  await cases('immediate page navigation, Back, reload and demo re-entry', async () => {
    await by('link-review-service-2').click(); await by('link-review-versions').waitFor();
    await page.goBack(); await recheck();
    await page.reload(); await recheck();
    await by('button-review-exit').click(); await find('NUVIA 로그인 체험');
    await page.reload(); await by('button-review-start').click();
    await by('link-review-storyboard').click(); await recheck();
  });
  await cases('confirmed draft, immutable V1, V2 and restored V1', async () => {
    for (let i = 2; i <= 4; i++) await by(`input-section-${i}`).fill(`모의 기록 ${i}번째 장면입니다.`);
    await confirm();
    await page.reload(); await by('status-confirmed').waitFor(); await recheck();
    const firstVersion = page.locator('[data-testid^="button-restore-"]').last();
    assert.equal(await firstVersion.count(), 1);
    await input.fill('검토 후 변경한 V2 원문입니다.');
    await confirm();
    assert.equal(await page.locator('[data-testid^="row-version-"]').count(), 2);
    assert.match(await firstVersion.getAttribute('aria-label') ?? '', /V1$/);
    assert.match(await page.locator('[data-testid^="button-restore-"]').first().getAttribute('aria-label') ?? '', /V2$/);
    await firstVersion.click();
    await recheck();
    assert.equal(await page.locator('[data-testid^="row-version-"]').count(), 2);
    assert(await by('button-download').isDisabled());
    await confirm();
  });
  await cases('mobile, tablet, and desktop widths retain saved values', async () => {
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await by('link-review-editor-report').click(); await by('link-review-lab').waitFor(); await noOverflow();
      await by('link-review-lab').click(); await by('option-review-education').waitFor(); await noOverflow();
      await by('button-review-continue').click(); await recheck(); await noOverflow();
      await page.screenshot({ path: `${out}/storyboard-${width}.png` });
    }
  });
  await cases('no account or other private API calls and fresh context has no draft', async () => {
    assert.deepEqual(network, []);
    const isolated = await browser.newContext();
    const second = await isolated.newPage();
    await second.goto(`${root}/demo/review/storyboard`);
    await second.getByTestId('button-review-start').waitFor();
    await second.getByTestId('button-review-start').click();
    await second.getByTestId('link-review-storyboard').click();
    assert(await second.getByTestId('button-review-continue').isDisabled());
    await isolated.close();
  });
} finally {
  const result = { startUtc: startTime, finishUtc: new Date().toISOString(), chromium: browser.version(), rows };
  await writeFile(`${out}/journey-results.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  await browser.close();
}
