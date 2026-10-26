import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const [mode, target, prefixOrReport, portArg, reportArg] = process.argv.slice(2);
const production = mode === 'production';
const prefix = production ? '/' : prefixOrReport;
const reportPath = production ? prefixOrReport : reportArg;
if (!reportPath || !['production', 'static'].includes(mode)) {
  throw Error('Usage: production URL REPORT | static BUILD_DIR /prefix/ PORT REPORT');
}
mkdirSync(path.dirname(reportPath), { recursive: true });
const result = {
  mode, started: new Date().toISOString(), browser: '',
  anonymousContext: true, credentialsUsed: false, states: [], errors: [],
  limitation: 'Smoke check of packaged builds/public access; original 15-locale full QA is separate.',
};
let server;
let base = target;
if (!production) {
  const root = path.resolve(target);
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
    '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };
  server = createServer((req, res) => {
    const url = new URL(req.url, 'http://test.invalid');
    if (!url.pathname.startsWith(prefix)) { res.writeHead(404).end(); return; }
    const relative = decodeURIComponent(url.pathname.slice(prefix.length));
    let filename = path.resolve(root, relative || 'index.html');
    if (!filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (!existsSync(filename) || !statSync(filename).isFile()) {
      if (path.extname(filename)) { res.writeHead(404).end(); return; }
      filename = path.join(root, 'index.html');
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream',
      'Cache-Control': 'no-store' });
    res.end(readFileSync(filename));
  });
  await new Promise(resolve => server.listen(Number(portArg), '127.0.0.1', resolve));
  base = `http://127.0.0.1:${portArg}${prefix}`;
}
let browser;
try {
  browser = await chromium.launch({
    executablePath: execFileSync('which', ['chromium'], { encoding: 'utf8' }).trim(),
    args: ['--no-sandbox'],
  });
  result.browser = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const failedAssets = [];
  page.on('response', response => {
    if (!production && response.url().startsWith(new URL(base).origin + '/') && response.status() >= 400) {
      failedAssets.push({ url: new URL(response.url()).pathname, status: response.status() });
    }
  });
  const response = await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
  result.httpStatus = response?.status();
  result.finalOriginAndPath = new URL(page.url()).origin + new URL(page.url()).pathname;
  result.pageTitle = await page.title();
  result.guideVisible = await page.getByTestId('select-language').count() > 0;
  await page.screenshot({ path: reportPath.replace(/\.json$/, '-cover.png'), fullPage: true });
  if (!result.guideVisible) {
    result.outcome = 'blocked';
    result.navigation = 'NOT_RUN: anonymous visitor did not reach ebook';
    const body = (await page.locator('body').innerText()).slice(0, 10000);
    result.reason = /cloudflare|you have been blocked/i.test(body)
      ? 'Cloudflare security-edge 403 observed before ebook; not evidence of an application crash. No bypass attempted.'
      : /login|sign.?in|authentication|private deployment/i.test(body)
        ? 'Authentication/access gate observed; no login attempted.'
        : 'Ebook did not render for anonymous visitor; inspect captured response.';
  } else {
    const codes = production ? ['ko'] : ['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'];
    for (const code of codes) {
      await page.getByTestId('select-language').selectOption(code);
      await page.waitForFunction(code => document.documentElement.lang === code, code);
      assert.equal(await page.locator('html').getAttribute('dir'), code === 'ar' ? 'rtl' : 'ltr');
      for (const id of ['cover','ch1','ch2','ch3','ch4','ch5','ch6','checklist']) {
        await page.getByTestId(`toc-${id}`).click();
        await page.waitForFunction(id => document.querySelector(`#${id}`)?.dataset.active === 'true', id);
        assert.equal(new URL(page.url()).hash, `#${id}`);
        if (!production) assert.equal(new URL(page.url()).pathname, prefix);
        const heading = await page.locator(`#${id} h2`).innerText();
        assert(heading.trim());
        result.states.push({ locale: code, chapter: id, status: 'pass', hash: `#${id}` });
      }
    }
    result.failedLocalAssets = failedAssets;
    assert.equal(failedAssets.length, 0);
    result.outcome = 'pass';
    await page.screenshot({ path: reportPath.replace(/\.json$/, '-final.png'), fullPage: true });
  }
  await context.close();
} catch (error) {
  result.outcome = 'fail';
  result.errors.push({ name: error.name, message: error.message });
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  result.finished = new Date().toISOString();
  writeFileSync(reportPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ mode, outcome: result.outcome, httpStatus: result.httpStatus,
    states: result.states.length, reason: result.reason, errors: result.errors.length }));
  if (result.outcome === 'fail') process.exitCode = 1;
}
