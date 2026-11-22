import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, type Page } from 'playwright';

const origin = process.env.NUVIA_TEST_ORIGIN ?? 'http://localhost';
const prefix = `${origin}/demo/review`;
const out = resolve(import.meta.dirname, '../../generated-artifacts', process.env.NUVIA_REVIEW_QA_DIR ?? 'nuvia-review-shortcuts-qa');
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
const results: { scenario: string; status: 'PASS' | 'FAIL'; detail?: string }[] = [];
const startedAt = new Date().toISOString();
const syntheticDraft = '[바로가기 검토] 오늘 아침에 한 일을 순서대로 적었어요.';
const home = `${prefix}/home?shortcut=home&lang=ko`;
const planner = `${prefix}/planner?shortcut=planner&lang=ko`;
await mkdir(out, { recursive: true });

const t = (p: Page, id: string) => p.getByTestId(id);
const show = async (p: Page, target: 'home' | 'planner') => {
  await t(p, `button-review-shortcut-${target}`).click();
  await t(p, 'panel-review-shortcut').waitFor();
};
const contains = async (p: Page, id: string, re: RegExp) => assert.match(await t(p, id).innerText(), re);
const fit = async (p: Page) => assert(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
async function check(scenario: string, fn: () => Promise<void>) {
  try { await fn(); results.push({ scenario, status: 'PASS' }); console.log('PASS', scenario); }
  catch (err) { results.push({ scenario, status: 'FAIL', detail: String(err) }); console.error('FAIL', scenario, err); }
}
async function simulatePrompt(p: Page, outcome: 'accepted' | 'dismissed' | 'failed') {
  return p.evaluate(outcome => {
    const e = new Event('beforeinstallprompt', { cancelable: true });
    const debug = document.documentElement;
    debug.dataset.testNativeRequests = '0';
    Object.assign(e, {
      prompt() {
        debug.dataset.testNativeRequests = String(Number(debug.dataset.testNativeRequests) + 1);
        if (outcome === 'failed') throw Error('mocked prompt failure');
        return Promise.resolve();
      },
      userChoice: Promise.resolve({ outcome }),
    });
    window.dispatchEvent(e);
    return e.defaultPrevented;
  }, outcome);
}
const nativeCalls = (p: Page) => p.locator('html').getAttribute('data-test-native-requests');

for (const width of [360, 768, 1440]) {
  await check(`${width}px: routine order/links, product order, two destinations, same-tab draft and new-tab isolation`, async () => {
    const ctx = await browser.newContext({ viewport: { width, height: 880 } });
    const p = await ctx.newPage();
    p.setDefaultTimeout(7000);
    try {
      assert.equal((await p.goto(`${prefix}?lang=ko`))?.status(), 200);
      await t(p, 'button-review-start').click();
      const flow = t(p, 'section-review-home-routine');
      assert.deepEqual(await flow.locator('ol a').allTextContents(),
        ['1결과지로 나를 이해해요','2플래너에서 매일 카드·일상 기록','3나의 강점 스토리로 정리']);
      const adjacent = await flow.evaluate(el => el.previousElementSibling?.querySelector('h1')?.textContent);
      assert.equal(adjacent, 'MY NUVIA');
      await contains(p, 'section-review-home-routine', /매일 5~10분.*다른 직무의 필요역량.*매일의 카드 만들기에는 필요하지 않아요.*후보를 검토.*본문이 바뀌지는 않아요/s);
      assert.deepEqual(await t(p, 'layout-review-home-services').locator('h3').allTextContents(),
        ['기업 LAB','NUVIA PLANNER','나의 강점 스토리보드']);
      for (const [id, route] of [['report','report'],['lab','lab'],['planner','planner'],['story','storyboard']]) {
        const link = t(p, `link-review-routine-${id}`);
        assert.equal(await link.getAttribute('href'), `/demo/review/${route}`);
        assert((await link.boundingBox())!.height >= 44);
        await link.click();
        await p.waitForURL(u => u.pathname.endsWith(`/demo/review/${route}`));
        await t(p, 'link-review-brand').click();
        await flow.waitFor();
      }
      await contains(p, 'text-review-shortcut-storage-home', /이 탭.*새 앱 창이나 다른 기기/);
      for (const target of ['home','planner'] as const) {
        assert((await t(p, `button-review-shortcut-${target}`).boundingBox())!.height >= 44);
        await show(p, target);
        assert.equal(await t(p, 'link-review-shortcut-target').getAttribute('href'), new URL(target === 'home' ? home : planner).pathname + `?shortcut=${target}&lang=ko`);
      }
      await fit(p);
      await p.screenshot({path:`${out}/routine-${width}.png`, fullPage:true});
      await t(p, 'link-review-shortcut-target').click();
      await t(p, 'view-review-planner-list').waitFor();
      assert.equal(p.url(), planner);
      assert.equal(await p.locator('link[rel=manifest]').getAttribute('href'), '/review-planner.webmanifest');
      assert((await t(p, 'button-review-shortcut-planner').boundingBox())!.height >= 44);
      await contains(p, 'text-review-shortcut-storage-planner', /이 탭.*새 앱 창이나 다른 기기/);
      const studio=p.frameLocator('[data-testid="frame-review-studio"]');
      await studio.getByTestId('note-toggle').click();
      await studio.getByTestId('note-input').fill(syntheticDraft);
      // Opening canonical home is a real browser navigation, not a soft route change.
      await t(p, 'link-review-brand').click();
      await show(p, 'home');
      await t(p, 'link-review-shortcut-target').click();
      await t(p, 'section-review-home').waitFor();
      assert.equal(p.url(), home);
      assert.equal(await p.locator('link[rel=manifest]').getAttribute('href'), '/review-home.webmanifest');
      await p.goto(planner);
      await studio.getByTestId('note-toggle').click();
      assert.equal(await studio.getByTestId('note-input').inputValue(), syntheticDraft);
      const isolated = await ctx.newPage();
      await isolated.goto(planner);
      await t(isolated, 'view-review-planner-list').waitFor();
      const separate=isolated.frameLocator('[data-testid="frame-review-studio"]');
      await separate.getByTestId('note-toggle').click();
      assert.equal(await separate.getByTestId('note-input').inputValue(), '');
      await isolated.close();
      await fit(p);
    } catch (err) { await p.screenshot({path:`${out}/failure-shortcut-${width}.png`}).catch(()=>{}); throw err; }
    finally { await ctx.close(); }
  });
}

await check('native events (simulated): target identity, click only, cancel, second prompt, installed and failure states', async () => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  try {
    await p.goto(home);
    await t(p, 'section-review-home').waitFor();
    assert(await simulatePrompt(p, 'dismissed'));
    assert.equal(await nativeCalls(p), '0');
    await show(p, 'planner'); // A home prompt must never install from the planner button.
    assert.equal(await nativeCalls(p), '0');
    await show(p, 'home');
    assert.equal(await nativeCalls(p), '1');
    await contains(p, 'status-review-shortcut', /취소했어요/);
    await show(p, 'home');
    assert.equal(await nativeCalls(p), '1'); // Browser only permits a single use of its event.
    assert(await simulatePrompt(p, 'accepted'));
    await show(p, 'home');
    await contains(p, 'status-review-shortcut', /아이콘을 확인/);
    assert.equal(await t(p, 'status-review-shortcut-installed').count(), 0);
    await p.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));
    await contains(p, 'status-review-shortcut-installed', /설치 완료를 알렸어요/);
    await show(p, 'planner');
    assert.equal(await t(p, 'status-review-shortcut-installed').count(), 0);
    await t(p, 'link-review-shortcut-target').click();
    await t(p, 'view-review-planner-list').waitFor();
    assert.equal(p.url(), planner);
    assert(await simulatePrompt(p, 'failed'));
    await show(p, 'planner');
    await contains(p, 'status-review-shortcut', /설치 요청을 열지 못했어요/);
    await p.screenshot({path:`${out}/mocked-prompt-fallback.png`,fullPage:true});
  } finally { await ctx.close(); }
});

const fallbackCases = [
  ['iPhone Safari', 'iPhone Version/18 Safari/605', /Safari에서 공유 → 홈 화면에 추가/, false],
  ['iPhone other browser', 'iPhone CriOS/131 Safari/604', /주소를 복사해 Safari/, false],
  ['Android without prompt', 'Android 15 Chrome/135', /브라우저 메뉴\(⋮\).*바로가기 만들기/, false],
  ['in-app browser', 'Android 15 KAKAOTALK', /Safari 또는 Chrome에 직접 붙여넣어/, true],
  ['desktop without prompt', 'X11 Chrome/135', /브라우저 메뉴.*북마크/, false],
] as const;
for (const [label, userAgent, guidance, external] of fallbackCases) {
  await check(`manual fallback: ${label}`, async () => {
    const ctx = await browser.newContext({ userAgent, viewport: { width: 360, height: 780 } });
    try {
      const p = await ctx.newPage();
      p.setDefaultTimeout(7000);
      await p.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:undefined}));
      await p.goto(planner);
      await t(p, 'view-review-planner-list').waitFor();
      await show(p, 'planner');
      await contains(p, 'text-review-shortcut-method', guidance);
      assert.equal(await t(p, 'status-review-shortcut-installed').count(), 0);
      if (external) {
        const link=t(p,'link-review-shortcut-target');
        assert.equal(await link.getAttribute('target'), '_blank');
        assert.match(await link.getAttribute('rel') ?? '', /noopener/);
        const [popup] = await Promise.all([p.waitForEvent('popup'), link.click()]);
        await t(popup, 'view-review-planner-list').waitFor();
        assert.equal(popup.url(), planner);
        await popup.close();
      }
      assert.equal(await p.evaluate(()=>typeof navigator.clipboard),'undefined');
      await t(p, 'button-review-shortcut-copy').click();
      const manual=t(p, 'input-review-shortcut-copy');
      assert.equal(await manual.inputValue().catch(async error=>{
        throw new Error(`${error}\n${await t(p,'panel-review-shortcut').innerText()}`);
      }), planner);
      await fit(p);
      if (external || label === 'iPhone Safari') await p.screenshot({ path: `${out}/guidance-${external?'in-app':'safari'}.png`, fullPage:true });
    } finally { await ctx.close(); }
  });
}

await check('standalone window (simulated): no assertion that the other shortcut is installed', async () => {
  const p = await browser.newPage();
  try {
    await p.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
    await p.goto(home);
    await t(p, 'section-review-home').waitFor();
    await show(p, 'home');
    await contains(p,'text-review-shortcut-method', /앱 창.*따로 설치돼 있는지는 확인할 수 없어요/);
    await show(p, 'planner');
    await contains(p,'text-review-shortcut-method', /앱 창.*따로 설치돼 있는지는 확인할 수 없어요/);
    assert.equal(await t(p, 'status-review-shortcut-installed').count(), 0);
    assert.equal(await t(p, 'link-review-shortcut-target').getAttribute('target'), '_blank');
  } finally { await p.close(); }
});
await check('browser reads two distinct valid launch manifests; mismatched launch does not start the demo', async () => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  try {
    const client = await ctx.newCDPSession(p);
    const ids = new Set<string>();
    for (const [url, selector] of [[home, 'section-review-home'], [planner, 'view-review-planner-list']]) {
      await p.goto(url);
      await t(p, selector).waitFor();
      const model = await client.send('Page.getAppManifest');
      assert.equal(model.errors.filter(error => error.critical).length, 0);
      assert(model.data);
      const manifest = JSON.parse(model.data) as {id:string;start_url:string;scope:string};
      ids.add(manifest.id);
      const start = new URL(manifest.start_url, model.url);
      assert.equal(start.href, url.replace('&lang=ko',''));
      for (const icon of (JSON.parse(model.data) as {icons:{src:string}[]}).icons) {
        const response = await ctx.request.get(new URL(icon.src, model.url).href);
        assert.equal(response.status(), 200);
        assert.match(response.headers()['content-type'], /image\/png/);
      }
      assert.equal(await p.evaluate(async()=>navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0),0);
      assert.equal(await p.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('nuvia:review-demo:'))),false);
    }
    assert.equal(ids.size,2);
    const fresh = await browser.newPage();
    try {
      await fresh.goto(home.replace('shortcut=home','shortcut=planner'));
      await t(fresh,'button-review-start').waitFor();
      assert.equal(await fresh.locator('link[rel=manifest]').count(),0);
    } finally {await fresh.close();}
  } finally {await ctx.close();}
});
await browser.close();
const git = (...args: string[]) => execFileSync('git',args,{encoding:'utf8'}).trim();
await writeFile(`${out}/shortcut-browser-results.json`,JSON.stringify({
  commit:git('rev-parse','HEAD'), dirty:git('status','--porcelain'), origin, startedAt, finishedAt:new Date().toISOString(),
  realDeviceInstallation:'NOT_RUN', nativePrompt:'MOCKED', results,
},null,2)+'\n');
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
