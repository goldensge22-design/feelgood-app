import { assert, context, enter, goto, workspace, snap, check, finish } from './nuvia-browser-utils.mjs';
const c = await context(768);
const p = await c.newPage();
async function seedWeekly() {
  const w=await workspace(p,'demo-child');
  const r=await p.request.post(new URL('/api/nuvia/subjects/demo-child',p.url()).href,{data:{type:'history',title:`Fictional keyboard/date fixture ${Date.now()}`,action:'Fictional keyboard/date fixture',outcome:'tried',version:w.version,requestId:crypto.randomUUID()}});
  assert.equal(r.status(),200);await p.reload();await p.getByTestId('card-weekly').waitFor();
}
await check('parent-unlinked-subject-browser-denial-and-reconnect', async () => {
  await enter(p, 'parent', '/planner?child=demo-unlinked&lang=en');
  await p.getByTestId('status-subject-forbidden').waitFor();
  await p.getByTestId('link-allowed-subject').click();
  await p.getByTestId('button-new-plan').waitFor();
  assert.equal(new URL(p.url()).searchParams.get('child'), 'demo-child');
});
await check('weekly-choice-keyboard-arrows-and-persist', async () => {
  await enter(p, 'parent', '/weekly?child=demo-child&lang=en');
  await seedWeekly();
  const maintain = p.getByTestId('radio-weekly-maintain');
  await maintain.focus();
  await p.keyboard.press('ArrowRight');
  assert.equal(await p.evaluate(() => document.activeElement?.getAttribute('data-testid')), 'radio-weekly-reduce');
  await p.waitForFunction(() => document.querySelector('[data-testid="radio-weekly-reduce"]')?.getAttribute('aria-checked') === 'true');
  await p.reload();
  await p.getByTestId('radio-weekly-reduce').waitFor();
  assert.equal((await workspace(p, 'demo-child')).weeklyChoice, 'reduce');
});
await check('core-controls-accessible-names-and-44px-targets', async () => {
  const names = [];
  const small = [];
  await enter(p, 'child', '/planner');
  for (const path of ['/planner', '/history', '/story', '/weekly']) {
    await goto(p, `${path}?lang=en`);
    const pageFailures = await p.locator('button,input,select,textarea,a').evaluateAll(els => {
      const missing = [], small = [];
      for (const e of els) {
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height || e.closest('[aria-hidden="true"]') || e.classList.contains('sr-only')) continue;
        const named = e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || (e.labels && [...e.labels].some(l => l.textContent.trim())) || e.textContent.trim();
        if (!named) missing.push(e.outerHTML.slice(0, 120));
        let target = e;
        if (e instanceof HTMLInputElement && ['checkbox','radio'].includes(e.type)) target = e.labels?.[0] ?? e;
        const hit = target.getBoundingClientRect();
        if (hit.height < 43 || hit.width < 43) small.push({ id: e.getAttribute('data-testid'), tag: e.tagName, w: hit.width, h: hit.height });
      }
      return { missing, small };
    });
    names.push(...pageFailures.missing.map(x => ({ path, element: x })));
    small.push(...pageFailures.small.map(x => ({ path, ...x })));
  }
  assert.deepEqual(names, []);
  assert.deepEqual(small, []);
});
await check('english-region-separate-from-language-unambiguous-dates', async () => {
  await goto(p, '/weekly?lang=en');
  await seedWeekly();
  await p.getByTestId('select-en-region').selectOption('en-GB');
  assert.equal(await p.getByTestId('select-language').inputValue(), 'en');
  await p.reload();
  await p.getByTestId('select-en-region').waitFor();
  assert.equal(await p.getByTestId('select-en-region').inputValue(), 'en-GB');
  const text = await p.getByTestId('card-weekly').innerText();
  assert.ok(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\b/.test(text), 'month should be written, not ambiguous numeric month/day');
  await snap(p, 'uk-weekly-768');
});
await finish('accessibility');
