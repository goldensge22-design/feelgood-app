import { assert, context, enter, goto, menu, noOverflow, snap, check, finish } from './nuvia-browser-utils.mjs';
const c = await context();
const p = await c.newPage();
for (const account of ['parent', 'child', 'teacher']) {
  await check(`final-${account}-360-768-1440-shell-selector-pointer`, async () => {
    await enter(p, account, account === 'teacher' ? '/teacher' : '/');
    for (const width of [360, 768, 1440]) {
      await p.setViewportSize({ width, height: 900 });
      await p.evaluate(() => window.scrollTo(0, 0));
      await noOverflow(p);
      await p.getByTestId('select-language').click({ trial: true });
      if (account === 'teacher') {
        assert.equal(await p.locator('[data-testid^="link-nav-"]').count(), 0);
      } else await menu(p);
      await snap(p, `final-${account}-${width}`);
    }
  });
}
await check('teacher-mobile-arabic-independent-shell-and-language', async () => {
  await p.setViewportSize({ width: 360, height: 900 });
  await p.getByTestId('select-language').selectOption('ar');
  await noOverflow(p);
  await p.getByTestId('select-language').click({ trial: true });
  await snap(p, 'final-teacher-ar-360');
  await p.reload();
  await p.locator('h1').waitFor();
  assert.equal(await p.locator('html').getAttribute('dir'), 'rtl');
  assert.equal(await p.getByTestId('select-language').inputValue(), 'ar');
});
await check('all-15-languages-reload-no-korean-ui-flash', async () => {
  await enter(p, 'adult', '/planner');
  await p.addInitScript(() => {
    window.__seenKoreanUI = [];
    new MutationObserver(() => {
      const lang = new URLSearchParams(location.search).get('lang');
      if (lang && lang !== 'ko') {
        for (const e of document.querySelectorAll('[data-testid="link-nav-planner"]')) {
          if (e.textContent.trim() === '플래너') window.__seenKoreanUI.push(lang);
        }
      }
    }).observe(document, { childList: true, subtree: true, characterData: true });
  });
  for (const lang of ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'mn', 'th', 'vi', 'ar', 'ru', 'km', 'es', 'fr', 'it', 'az']) {
    await goto(p, `/planner?lang=${lang}&child=demo-adult`);
    await p.locator('h1').waitFor();
    assert.deepEqual(await p.evaluate(() => window.__seenKoreanUI), []);
    assert.equal(await p.locator('html').getAttribute('lang'), lang);
  }
});
await finish('responsive');
