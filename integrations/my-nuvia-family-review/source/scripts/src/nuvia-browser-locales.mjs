import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { assert, context, enter, goto, snap, check, finish, noOverflow, menu } from './nuvia-browser-utils.mjs';
const langs = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'mn', 'th', 'vi', 'ar', 'ru', 'km', 'es', 'fr', 'it', 'az'];
const dictionaries = {};
for (const lang of langs) {
  const src = await readFile(`artifacts/my-nuvia/src/i18n/${lang}.ts`, 'utf8');
  const end = src.indexOf('\n}');
  dictionaries[lang] = vm.runInNewContext('(' + src.slice(src.indexOf('= {') + 2, end + 2) + ')');
}
for (const width of [360, 1440]) {
  for (const lang of langs) {
  // Release each language's DOM/font resources instead of accumulating 150
  // full reloads in one long-lived renderer.
  const c = await context(width);
  const p = await c.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => {
    window.__wrongLanguagePaint = [];
    new MutationObserver(() => {
      const h = document.querySelector('h1');
      const lang = new URLSearchParams(location.search).get('lang');
      if (h?.textContent && lang && document.documentElement.lang !== lang) window.__wrongLanguagePaint.push({ heading: h.textContent, lang: document.documentElement.lang });
    }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['lang'] });
  });
  await enter(p, 'adult', '/planner', 'en');
    await check(`locale-${lang}-${width}-home-planner-history-story-weekly`, async () => {
      const dict = dictionaries[lang];
      await goto(p, '/?lang=en');
      const select = p.getByTestId('select-language');
      assert.ok(await select.isVisible());
      await select.click({ trial: true });
      await select.selectOption(lang);
      await p.waitForTimeout(80);
      assert.equal(await select.inputValue(), lang);
      assert.equal(await p.locator('html').getAttribute('lang'), lang);
      assert.equal(await p.locator('html').getAttribute('dir'), lang === 'ar' ? 'rtl' : 'ltr');
      await noOverflow(p);
      await p.reload();
      await p.locator('h1').first().waitFor();
      assert.equal(await select.inputValue(), lang);
      await menu(p);
      const details = [];
      for (const [path, heading] of [['/planner', 'planner.title'], ['/history', 'hist.title'], ['/story', 'story.title'], ['/weekly', 'weekly.title']]) {
        await goto(p, `${path}?child=demo-adult&lang=${lang}&keep=fictional`);
        assert.equal(await p.getByTestId('select-language').inputValue(), lang);
        await p.getByTestId('select-language').click({ trial: true });
        assert.equal((await p.locator('h1').innerText()).trim(), dict[heading]);
        await noOverflow(p);
        const clipping = await p.locator('main h1, main h2, main h3, main button, nav a span').evaluateAll(els => els.filter(e => e.clientWidth && e.scrollWidth > e.clientWidth + 2 && ['hidden', 'clip'].includes(getComputedStyle(e).overflowX)).map(e => e.textContent));
        assert.deepEqual(clipping, []);
        if (path === '/planner') {
          if (!await p.getByTestId('form-plan').count()) await p.getByTestId('button-new-plan').click();
          await p.getByTestId('button-plan-example').click();
          assert.equal(await p.getByTestId('input-plan-title').inputValue(), dict['plan.placeholderTitle']);
          assert.equal(await p.getByTestId('input-plan-steps').inputValue(), dict['plan.placeholderSteps']);
          await p.getByTestId('input-plan-title').fill(`fictional preserved ${lang}`);
          await p.getByTestId('select-language').selectOption(lang === 'en' ? 'ar' : 'en');
          assert.equal(await p.getByTestId('input-plan-title').inputValue(), `fictional preserved ${lang}`);
          assert.equal(new URL(p.url()).searchParams.get('child'), 'demo-adult');
          assert.equal(new URL(p.url()).searchParams.get('keep'), 'fictional');
          assert.equal(new URL(p.url()).pathname, path);
          await p.getByTestId('select-language').selectOption(lang);
          await p.reload();
          await p.getByTestId('input-plan-title').waitFor();
          assert.equal(await p.getByTestId('input-plan-title').inputValue(), `fictional preserved ${lang}`);
          await p.getByTestId('button-plan-cancel').click();
        }
        if (path === '/history') {
          if (await p.getByTestId('button-history-reset').count()) await p.getByTestId('button-history-reset').click();
          assert.equal((await p.getByTestId('button-resource-map').innerText()).trim(), dict['res.map']);
          await p.getByTestId('button-resource-map').click();
          await p.getByTestId('button-run-model').click();
          assert.ok((await p.getByTestId('card-model-result').innerText()).includes(dict['mr.map']));
          const other = lang === 'en' ? 'ar' : 'en';
          await p.getByTestId('select-language').selectOption(other);
          assert.ok((await p.getByTestId('card-model-result').innerText()).includes(dictionaries[other]['mr.map']), 'generated model result must follow selected language');
          await p.getByTestId('select-language').selectOption(lang);
          await p.getByTestId('button-history-reset').click();
        }
        await p.reload();
        await p.locator('h1').first().waitFor();
        assert.equal(await p.getByTestId('select-language').inputValue(), lang);
        assert.deepEqual(await p.evaluate(() => window.__wrongLanguagePaint), []);
        details.push(path);
        if (['en', 'ar', 'km', 'th'].includes(lang)) await snap(p, `${lang}-${width}-${path.slice(1)}`);
      }
      assert.deepEqual(errors, []);
      return { routes: ['/', ...details], nativeReview: 'not performed' };
    });
  await c.close();
  }
}
await finish('locales');
