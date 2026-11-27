import { assert, context, enter, goto, workspace, snap, check, finish, noOverflow, menu } from './nuvia-browser-utils.mjs';
const c = await context();
const p = await c.newPage();
const marker = `fictional-browser-${Date.now()}`;
let record;
await check('self-history-model-revise-save-transfer-confirm', async () => {
  await enter(p, 'child', '/history');
  await menu(p);
  if (await p.getByTestId('button-history-reset').count()) await p.getByTestId('button-history-reset').click();
  await p.getByTestId('button-resource-map').click();
  await p.getByTestId('button-resource-letters').click();
  await p.getByTestId('input-history-reason').fill(marker);
  await p.locator('#h-help').selectOption('guide');
  await p.getByTestId('button-run-model').click();
  const original = await p.getByTestId('card-model-result').innerText();
  await p.getByTestId('button-resource-weather').click();
  await p.getByTestId('button-run-model').click();
  assert.notEqual(await p.getByTestId('card-model-result').innerText(), original);
  await p.getByTestId('button-history-open-save').click();
  await p.getByTestId('input-history-change').fill('Fictional revised resource sequence');
  await p.getByTestId('button-history-save').click();
  await p.getByTestId('form-history-save').waitFor({ state: 'detached' });
  let ws = await workspace(p, 'demo-child');
  record = ws.records.find(r => r.action.includes(marker));
  assert.ok(record);
  assert.equal(record.help, 'guide');
  await p.getByTestId('button-history-transfer').click();
  await p.getByTestId('form-plan').waitFor();
  assert.equal((await workspace(p, 'demo-child')).plans.some(x => x.source === `history:${record.id}`), false);
  await p.getByTestId('input-plan-title').fill(`가상 전이 ${marker}`);
  await p.getByTestId('button-plan-save').click();
  await p.getByTestId('form-plan').waitFor({ state: 'detached' });
  ws = await workspace(p, 'demo-child');
  assert.ok(ws.plans.some(x => x.source === `history:${record.id}`));
  return { record: record.id };
});
await check('self-explicit-record-only-story-template-save-source-link', async () => {
  assert.ok(record);
  await goto(p, '/story?lang=en');
  const before = await workspace(p, 'demo-child');
  assert.ok(!before.records.some(r => r.title.startsWith('가상 브라우저 검증')), 'parent authored records must not enter self records');
  for (const box of await p.locator('input[data-testid^="checkbox-record-"]').all()) await box.uncheck();
  await p.getByTestId(`checkbox-record-${record.id}`).check();
  await p.getByTestId('button-story-prefill').click();
  assert.ok((await p.getByTestId('input-story-action').inputValue()).includes(marker));
  await p.getByTestId('button-story-preview').click();
  assert.ok((await p.getByTestId('input-story-text').inputValue()).includes(marker));
  await p.getByTestId('button-story-save').click();
  await p.getByTestId('input-story-text').waitFor({ state: 'detached' });
  const ws = await workspace(p, 'demo-child');
  const draft = ws.drafts.find(d => d.text.includes(marker));
  assert.ok(draft);
  assert.deepEqual(draft.recordIds, [record.id]);
  await snap(p, 'self-story-360');
  await p.getByTestId(`link-source-${record.id}`).click();
  await p.getByTestId('source-record').waitFor();
  assert.ok((await p.getByTestId('source-record').innerText()).includes(marker));
  return { draft: draft.id, selected: draft.recordIds };
});
await check('self-responsive-menu-and-private-sharing', async () => {
  await goto(p, '/story?lang=en');
  const share = p.getByTestId(`toggle-share-${record.id}`);
  if (!await share.isChecked()) await share.click();
  await p.waitForFunction(id => document.querySelector(`[data-testid="toggle-share-${id}"]`)?.checked, record.id);
  for (const width of [360, 768, 1440]) {
    await p.setViewportSize({ width, height: 900 });
    await menu(p);
    await noOverflow(p);
  }
});
await check('family-direct-teacher-and-outside-subject-blocked', async () => {
  for (const [account, target] of [['parent', 'demo-adult'], ['child', 'demo-teen']]) {
    await enter(p, account, `/planner?child=${target}&lang=en`);
    await p.getByTestId('status-subject-forbidden').waitFor();
    assert.equal((await p.request.get(new URL(`/api/nuvia/subjects/${target}`, p.url()).href)).status(), 403);
    await goto(p, '/teacher?lang=en&role=teacher');
    await p.getByTestId('text-teacher-refuse').waitFor();
    assert.equal((await p.request.get(new URL('/api/nuvia/teacher/demo-child?role=teacher', p.url()).href)).status(), 403);
    await snap(p, `${account}-teacher-denied`);
  }
});
await check('teacher-separate-shell-only-shared-records-outside-blocked', async () => {
  await enter(p, 'teacher', '/teacher');
  assert.equal(await p.locator('[data-testid^="link-nav-"]').count(), 0);
  await p.getByTestId(`card-teacher-record-${record.id}`).waitFor();
  assert.equal(await p.getByTestId('input-private-note').count(), 0);
  await snap(p, 'teacher-1440');
  await goto(p, '/teacher?child=demo-teen&lang=en');
  // An out-of-scope teacher subject must explain denial, never silently render blank.
  assert.ok(await p.getByTestId('status-error').count() || await p.getByTestId('status-subject-forbidden').count(), 'teacher outside subject needs explicit denial UI');
  const r = await p.request.get(new URL('/api/nuvia/teacher/demo-teen', p.url()).href);
  assert.equal(r.status(), 403);
});
await finish('history-story-security');
