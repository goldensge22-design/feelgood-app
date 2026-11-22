import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confirmStoryboard, editStoryboard, emptyStoryboard, isStoryboardConfirmed, linkStoryboardApplication, loadStoryboard, saveStoryboard, sourceRevision, storyboardText, storedStoryboard, keepStoryboardRecovery, readStoryboardRecovery, clearStoryboardRecovery, storyboardBlockReason, shouldInvalidateStoryboardConfirmation } from './storyboard';
import { SB_RAW } from './storyboard-messages';
import { receivedExperienceMeta } from './received-provenance';
import { readReport } from './career';
import { DB_MESSAGES, DB_PARTIAL } from './dashboard-messages';
import { confirmStandaloneReviewDraft, isStandaloneReviewConfirmed } from './storyboard';

const memory = new Map<string, string>();
const storage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => { memory.set(k, v); },
  removeItem: (k: string) => { memory.delete(k); },
};
Object.assign(globalThis, { window: { localStorage: storage, sessionStorage: storage } });
const exp = {
  id: 'synthetic-exp', title: '합성 모의 활동', action: '모의 안내에서 적용 대상을 확인했다.',
  result: '다른 대상임을 관찰했다.', learning: '확인한 사실과 질문을 나눴다.',
  strengths: ['확인'], criterionIds: [], confirmed: true, source: 'manual' as const,
};
const meta = { nature: 'simulation', usageConsent: true, factConsent: true, observedEvidence: '합성 확인표' };
const bound = () => editStoryboard(emptyStoryboard(), {
  experienceId: exp.id, sourceRevision: sourceRevision(exp, meta), company: '합성기업', job: '교육운영',
  sections: ['소개', '관심 이유', '모의 활동에서 대조했다.\n공란은 질문으로 남겼다.', '배움과 다음 적용'],
});

test('dashboard translations cover all new keys in 15 locales and report rank/reasons are never recomputed', () => {
  const keys = Object.keys(DB_MESSAGES);
  for (const [locale, messages] of Object.entries(DB_PARTIAL)) {
    for (const key of keys) assert.ok(messages[key]?.trim(), `${locale}:${key}`);
  }
  assert.equal(Object.keys(DB_PARTIAL).length, 13);
  const report = readReport({ summary: '원문', axes: [{ key: 'sequential', label: '원래 영역명', interpretation: '원래 설명' }], jobs: [{ title: '직무Z', rank: '공동1', reason: '공식 이유 Z' }, { title: '직무A', rank: 4, reason: '공식 이유 A' }] });
  assert.deepEqual(report?.jobs.map(j => [j.title, j.rank, j.reason]), [['직무Z', '공동1', '공식 이유 Z'], ['직무A', 4, '공식 이유 A']]);
  assert.equal(report?.axes[0].label, '원래 영역명');
  assert.equal(report?.axes[0].description, '원래 설명');
  assert.equal(report?.jobs.length, 2);
});

test('dashboard and picker share eligibility: legacy/missing nature and withdrawn sources cannot invite writing', () => {
  const confirmed = { confirmed: true, permissionStatus: 'current' as const };
  assert.equal(storyboardBlockReason(confirmed, 'actual', 'current'), null);
  assert.equal(storyboardBlockReason(confirmed, 'actual', null), null);
  assert.equal(storyboardBlockReason(confirmed, 'simulation', 'current'), null);
  for (const nature of ['unconfirmed', undefined, '', 'invented']) {
    assert.equal(storyboardBlockReason(confirmed, nature, 'current'), 'sb.why.nature');
  }
  for (const status of ['deleted', 'revoked', 'failed']) {
    assert.equal(storyboardBlockReason(confirmed, 'simulation', status), 'sb.why.revoked');
  }
  assert.equal(storyboardBlockReason({ confirmed: false }, 'actual', 'current'), 'sb.why.unconfirmed');
  assert.equal(storyboardBlockReason({ ...confirmed, permissionStatus: 'revoked' }, 'actual', 'current'), 'sb.why.revoked');
});

test('account workspace hydration cannot revoke confirmation, but a real loaded source change still does', () => {
  const original = confirmStoryboard(bound());
  const snapshot = JSON.stringify(original.versions);
  assert.equal(shouldInvalidateStoryboardConfirmation(original, false, false, false, ''), false);
  assert.equal(shouldInvalidateStoryboardConfirmation(original, false, true, true, 'pending'), false);
  assert.equal(shouldInvalidateStoryboardConfirmation(original, true, true, false, original.sourceRevision), false);
  assert.equal(shouldInvalidateStoryboardConfirmation(original, true, false, false, ''), true);
  assert.equal(shouldInvalidateStoryboardConfirmation(original, true, true, true, original.sourceRevision), true);
  assert.equal(shouldInvalidateStoryboardConfirmation(original, true, true, false, 'changed source'), true);
  const invalidated = editStoryboard(original, {});
  assert.equal(isStoryboardConfirmed(invalidated, original.sourceRevision), false);
  assert.equal(JSON.stringify(invalidated.versions), snapshot);
});

test('synchronous checkpoint survives immediate navigation; exact base rejects a stale tab even with higher revision', () => {
  memory.clear();
  const draft = bound();
  assert.equal(storedStoryboard('guest'), null);
  assert.ok(saveStoryboard('guest', draft, null));
  assert.deepEqual(loadStoryboard('guest'), draft);
  const tabA = editStoryboard(draft, { sections: ['한글 조합 직후 글', '', '', ''] });
  assert.ok(saveStoryboard('guest', tabA, draft));
  const tabB = editStoryboard(editStoryboard(draft, { job: '늦은 탭' }), { company: '오래된 탭 추가 입력' });
  assert.ok(tabB.revision > tabA.revision);
  assert.equal(saveStoryboard('guest', tabB, draft), false);
  assert.deepEqual(loadStoryboard('guest'), tabA);
  assert.ok(keepStoryboardRecovery('guest', tabB));
  assert.deepEqual(readStoryboardRecovery('guest', tabB.id), tabB);
  assert.equal(readStoryboardRecovery('account:other', tabB.id), null);
  clearStoryboardRecovery('guest', tabA);
  assert.deepEqual(readStoryboardRecovery('guest', tabB.id), tabB);
  clearStoryboardRecovery('guest', tabB);
  assert.equal(readStoryboardRecovery('guest', tabB.id), null);
});

test('received simulation stays simulation only with explicit matching provenance; card type never proves actual work', () => {
  const record = { ...exp, source: 'planner' as const, sourceVersion: 'v7' };
  const received = { ...record, provenance: { nature: 'simulation', sourceVersion: 'v7', cardType: 'daily_application', experienceContext: 'class_simulation' } };
  assert.equal(receivedExperienceMeta(received)?.nature, 'simulation');
  assert.equal(receivedExperienceMeta(received)?.experienceContext, 'class_simulation');
  assert.equal(receivedExperienceMeta({ ...record, provenance: { sourceVersion: 'v7', cardType: 'job_scenario' } } as typeof received), null);
  assert.equal(receivedExperienceMeta({ ...received, provenance: { ...received.provenance, sourceVersion: 'v6' } }), null);
  assert.equal(receivedExperienceMeta(record), null);
  assert.equal(receivedExperienceMeta({ ...received, provenance: { ...received.provenance, nature: 'actual' } })?.experienceContext, 'class_simulation');
  assert.equal(receivedExperienceMeta(received)?.origin, 'planner');
});

test('all storyboard keys have all 15 non-empty translations; old dictionaries are untouched', () => {
  for (const [key, values] of Object.entries(SB_RAW)) {
    assert.equal(values.length, 15, key);
    assert.ok(values.every(s => typeof s === 'string' && !!s.trim()), key);
  }
});
test('confirmation binds record version and is not reusable after edits or reverting text', () => {
  const d = confirmStoryboard(bound());
  assert.ok(isStoryboardConfirmed(d, sourceRevision(exp, meta)));
  assert.equal(confirmStoryboard(d), d);
  assert.equal(d.versions.length, 1);
  assert.equal(d.versions[0].experienceId, exp.id);
  const changed = editStoryboard(d, { job: '다른 직무' });
  const reverted = editStoryboard(changed, { job: d.job });
  assert.equal(isStoryboardConfirmed(reverted, d.sourceRevision), false);
  assert.equal(isStoryboardConfirmed(d, sourceRevision({ ...exp, action: '수정' }, meta)), false);
  assert.equal(isStoryboardConfirmed(d, sourceRevision(exp, { ...meta, usageConsent: false })), false);
});
test('a source-free review draft can be confirmed explicitly without affecting legacy or stale evidence', () => {
  const blank = emptyStoryboard();
  assert.equal(confirmStandaloneReviewDraft(blank),blank);
  const manual = editStoryboard(blank,{sections:['내가 직접 쓴 문장','','','']});
  assert.equal(confirmStoryboard(manual),manual);
  const snapshot=confirmStandaloneReviewDraft(manual);
  assert.ok(isStandaloneReviewConfirmed(snapshot));
  assert.equal(isStoryboardConfirmed(snapshot,''),false);
  assert.equal(snapshot.versions.length,1);
  assert.equal(confirmStandaloneReviewDraft(snapshot),snapshot);
  assert.equal(isStandaloneReviewConfirmed(editStoryboard(snapshot,{sections:['다시 수정함','','','']})),false);
  for(const attached of [bound(),editStoryboard(manual,{evidenceSources:[{id:'revoked',revision:1}]}),
    editStoryboard(manual,{experienceId:'missing-record'}),editStoryboard(manual,{sourceRevision:'old-record'})]){
    assert.equal(confirmStandaloneReviewDraft(attached),attached);
    assert.equal(isStandaloneReviewConfirmed(attached),false);
  }
});
test('versions retain original words, source binding, company and activity on later edits', () => {
  const d = confirmStoryboard(bound());
  const snapshot = JSON.stringify(d.versions);
  const next = editStoryboard(d, { experienceId: 'different', sections: ['새 글', '', '', ''] });
  assert.equal(JSON.stringify(next.versions), snapshot);
  assert.equal(d.sections[0], '소개');
  assert.notEqual(next.sections, d.sections);
});
test('opening a linked writer preserves factual confirmation, not a text edit or new duplicate version', () => {
  const d = confirmStoryboard(bound());
  const next = linkStoryboardApplication(d, 'synthetic-application');
  assert.ok(isStoryboardConfirmed(next, d.sourceRevision));
  assert.deepEqual(next.sections, d.sections);
  assert.deepEqual(next.versions, d.versions);
  assert.equal(linkStoryboardApplication(next, 'synthetic-application'), next);
  assert.equal(editStoryboard(next, { sections: ['changed', '', '', ''] }).confirmedRevision, null);
});
test('account and mode scopes isolate content, restore after reload, and refuse stale tab overwrite', () => {
  memory.clear();
  const d = bound();
  assert.ok(saveStoryboard('account:synthetic-A', d));
  assert.deepEqual(loadStoryboard('account:synthetic-A'), d);
  assert.equal(loadStoryboard('account:synthetic-B').sections[0], '');
  assert.equal(loadStoryboard('demo').sections[0], '');
  const next = editStoryboard(d, { company: '새 회사' });
  assert.ok(saveStoryboard('account:synthetic-A', next));
  assert.equal(saveStoryboard('account:synthetic-A', d), false);
  assert.equal(saveStoryboard('account:synthetic-A', { ...next, company: '다른 탭' }), false);
  assert.equal(loadStoryboard('account:synthetic-A').company, '새 회사');
});
test('storage errors and corrupt saved records do not report success or get silently overwritten', () => {
  memory.clear();
  memory.set('nuvia:storyboard:v1:guest', '{bad');
  assert.throws(() => loadStoryboard('guest'));
  assert.equal(saveStoryboard('guest', bound()), false);
  assert.equal(memory.get('nuvia:storyboard:v1:guest'), '{bad');
  const original = storage.setItem;
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(saveStoryboard('account:quota', bound()), false);
  storage.setItem = original;
});
test('export allowlist preserves original simulation text/newlines but excludes all hidden metadata', () => {
  const d = bound();
  const output = storyboardText(d, ['강점 스토리보드', '소개', '관심', '경험', '배움']);
  assert.ok(output.includes('모의 활동에서 대조했다.\n공란은 질문으로 남겼다.'));
  for (const forbidden of ['synthetic-exp', 'usageConsent', 'observedEvidence', 'sourceRevision', 'confirmedRevision']) assert.ok(!output.includes(forbidden));
  assert.ok(!output.includes('합성 확인표'));
});
