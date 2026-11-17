import { assert, context, enter, goto, workspace, snap, check, finish, noOverflow, menu } from './nuvia-browser-utils.mjs';

const c = await context();
const p = await c.newPage();
const errors = [];
p.on('pageerror', e => errors.push(e.message));
const title = `가상 브라우저 검증 ${Date.now()}`;
let id;
await check('parent-first-week-confirm-save-duplicate', async () => {
  await enter(p, 'parent');
  await menu(p);
  await p.getByTestId('link-first-plan').click();
  if (!await p.getByTestId('form-plan').count()) {
    await p.getByTestId('button-new-plan').click();
  }
  await p.getByTestId('form-plan').waitFor();
  await p.getByTestId('input-plan-title').fill(title);
  await p.getByTestId('input-plan-steps').fill('가상 첫 단계\n가상 둘째 단계\n가상 셋째 단계');
  const before = await workspace(p, 'demo-child');
  assert.equal(before.plans.filter(x => x.title === title).length, 0);
  // Two DOM clicks in one event loop exercise the handler's synchronous lock.
  await p.getByTestId('button-plan-save').evaluate(e => { e.click(); e.click(); });
  await p.getByTestId('form-plan').waitFor({ state: 'detached' });
  const after = await workspace(p, 'demo-child');
  const plans = after.plans.filter(x => x.title === title);
  assert.equal(plans.length, 1);
  id = plans[0].id;
  assert.equal(plans[0].status, 'ready');
  return { id, source: plans[0].source, before: before.version, after: after.version };
});
await check('planner-start-pause-refresh-resume-end-reflect-weekly', async () => {
  assert.ok(id, 'requires created plan');
  const btn = s => p.getByTestId(`button-${s}-${id}`);
  await btn('start').click();
  await btn('next').click();
  await p.waitForTimeout(2200);
  await btn('pause').click();
  await btn('resume').waitFor();
  const paused = (await workspace(p, 'demo-child')).plans.find(x => x.id === id);
  assert.equal(paused.step, 1);
  await p.reload();
  await btn('resume').waitFor();
  const restored = (await workspace(p, 'demo-child')).plans.find(x => x.id === id);
  assert.equal(restored.step, paused.step);
  assert.equal(restored.elapsed, paused.elapsed);
  await btn('resume').click();
  await btn('end').click();
  await btn('reflect').waitFor();
  assert.equal((await workspace(p, 'demo-child')).plans.find(x => x.id === id).status, 'ended');
  await btn('reflect').click();
  await p.getByTestId('radio-outcome-finished').click();
  await p.getByTestId('radio-help-guide').click();
  await p.getByTestId('input-reflect-action').fill('가상 순서표에서 둘째 단계를 해봤습니다.');
  await p.getByTestId('button-reflect-save').click();
  await p.getByTestId(`form-reflect-${id}`).waitFor({ state: 'detached' });
  const ws = await workspace(p, 'demo-child');
  assert.equal(ws.plans.find(x => x.id === id).status, 'completed');
  assert.ok(ws.records.some(x => x.title === title));
  await goto(p, '/weekly?lang=en');
  assert.ok((await p.getByTestId('card-weekly').innerText()).includes(title));
  await snap(p, 'parent-weekly-360');
  return { step: restored.step, pausedElapsed: restored.elapsed, completionSeparate: true };
});
await check('parent-menu-responsive-360-768-1440', async () => {
  for (const width of [360, 768, 1440]) {
    await p.setViewportSize({ width, height: 900 });
    await goto(p, '/?lang=en');
    await menu(p);
    await noOverflow(p);
    await snap(p, `parent-home-${width}`);
  }
  assert.deepEqual(errors, []);
});
await finish('planner');
