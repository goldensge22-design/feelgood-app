import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

export { assert };
export const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
export const output = 'generated-artifacts/nuvia-browser';
export const results = [];
export const reviewSpace = process.env.QA_SPACE ?? `qa-regression-${Date.now()}`;
export const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
await mkdir(output, { recursive: true });
export async function context(width = 360) {
  const c = await browser.newContext({ viewport: { width, height: 900 }, ignoreHTTPSErrors: true });
  return c;
}
export async function goto(p, path) {
  await p.goto(base + path);
  await p.locator('main').first().waitFor();
  await p.waitForTimeout(350);
}
export async function enter(p, account, dest = '/', lang = 'en') {
  const target=new URL(dest,'http://x');target.searchParams.set('space',reviewSpace);
  await goto(p, `/review?space=${reviewSpace}&lang=${lang}&returnTo=${encodeURIComponent(target.pathname+target.search)}`);
  await p.getByTestId(`radio-account-${account}`).click();
  await p.getByTestId('checkbox-ack').check();
  await p.getByTestId('button-enter').click();
  await p.waitForURL(u => u.pathname !== '/review');
  await p.waitForTimeout(500);
}
export async function workspace(p, subject) {
  const r = await p.request.get(`${base}/api/nuvia/subjects/${subject}`);
  assert.equal(r.status(), 200);
  return r.json();
}
export async function snap(p, name) {
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(650);
  await p.screenshot({ path: `${output}/${name}.png`, fullPage: false });
}
export async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, status: 'PASS', detail });
    console.log('PASS', name, detail ?? '');
  } catch (e) {
    results.push({ name, status: 'FAIL', detail: String(e.stack ?? e) });
    console.log('FAIL', name, String(e.stack ?? e));
  }
}
export async function finish(name) {
  await writeFile(`${output}/${name}.json`, JSON.stringify({ executedAt: new Date().toISOString(), environment: 'development; fictional shared accounts only', browser: await browser.version(), results }, null, 2));
  await browser.close();
  if (results.some(r => r.status === 'FAIL')) process.exitCode = 1;
}
export async function noOverflow(p) {
  const size = await p.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  assert.ok(size.scroll <= size.client + 1, JSON.stringify(size));
}
export async function menu(p) {
  for (const id of ['planner', 'history', 'story']) {
    assert.ok(await p.getByTestId(`link-nav-${id}`).count());
    assert.ok(await p.getByTestId(`link-nav-${id}`).evaluateAll(els => els.some(e => e.getBoundingClientRect().width > 0)));
  }
  assert.equal(await p.locator('a[href*="/teacher"]').count(), 0);
  assert.equal(await p.locator('a[href*="/kids"]').count(), 0);
}
