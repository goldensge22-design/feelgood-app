// Behavioral checks of the rules amendment, separate from translation/physical-print review.
import { createServer } from 'vite';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const server = await createServer({
  root, configFile: false, logLevel: 'error', appType: 'custom',
  server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true },
  resolve: { alias: { '@': path.join(root, 'src') } },
});
let count = 0;
const check = (name, fn) => { fn(); count++; console.log(`PASS ${name}`); };
try {
  const { blankTeaching, hanseoExample, usesGroups, proposeGroups, validateGroups } = await server.ssrLoadModule('/src/lib/teaching.ts');
  const { fictionalStudents, demoAssign, makeCards, regenerateCards } = await server.ssrLoadModule('/src/lib/cards.ts');
  const { normalizeState } = await server.ssrLoadModule('/src/lib/store.ts');
  for (const stage of ['middle', 'university']) {
    check(`빈 일반 수업 설정 ${stage}`, () => {
      const c = blankTeaching(stage);
      assert.equal(c.target, stage); assert.equal(c.example, 'none');
      assert.equal(c.institution, ''); assert.equal(c.students, 0);
      assert.equal(c.minutes, 0); assert.equal(c.mode, 'individual');
      assert.deepEqual(c.kinds, []); assert.deepEqual(c.tracks, []);
      assert.deepEqual(c.sessions, []); assert.deepEqual(c.grouping.draft, []);
    });
  }
  const example = hanseoExample();
  check('일반 가상 명단은 대학·전공·직무를 임의 지정하지 않음', () => {
    assert.ok(fictionalStudents(3, 'university').every((s) => !s.major && !s.grade && !s.job));
  });
  const students = demoAssign(fictionalStudents(50, 'university', 'hanseo'), ['공항', '항공사', '보안·물류']);
  const cards = students.flatMap((s) => makeCards(s, example.kinds));
  check('한서대는 조 없는 개별 미션 사례', () => {
    assert.equal(example.mode, 'individual'); assert.equal(usesGroups(example.mode), false);
    assert.equal(example.grouping.draft.length, 0); assert.equal(example.grouping.confirmed.length, 0);
    assert.equal(cards.length, 200);
    assert.ok(new Set(students.map((s) => s.major)).size >= 4);
    assert.ok(new Set(cards.map((c) => c.fields.reading)).size >= 3);
    assert.ok(new Set(cards.map((c) => c.fields.sharedCriterion)).size >= 3);
    assert.ok(cards.every((c) => c.studentId && c.fields.deliverable && c.fields.firstAction));
  });
  check('예시 변경은 일반 설정과 새 예시를 변경하지 않음', () => {
    example.institution = '교사 편집 사례'; example.sessions[0].minutes = 35;
    example.kinds.pop(); example.grouping.draft.push({ id: 'temporary', name: '임시', studentIds: [] });
    const fresh = hanseoExample();
    assert.equal(fresh.institution, '한서대학교'); assert.equal(fresh.sessions[0].minutes, 50);
    assert.equal(fresh.kinds.length, 4); assert.equal(fresh.grouping.draft.length, 0);
    assert.equal(blankTeaching().institution, '');
  });
  check('개별·1:1 모드 자동 편성 거절', () => {
    for (const mode of ['individual', 'one-to-one']) {
      const result = proposeGroups(students, mode, 'interest-mission', 4);
      assert.deepEqual(result.groups, []); assert.ok(result.errors.length);
    }
  });
  for (const mode of ['group', 'mixed']) for (const goal of ['interest-mission', 'diverse-methods', 'similar-supports']) {
    check(`${mode} ${goal} 제안은 누락·중복 없이 고정 배치 유지`, () => {
      const fixed = { [students[0].id]: 'group-2' };
      const result = proposeGroups(students, mode, goal, 6, fixed);
      assert.deepEqual(result.errors, []);
      assert.equal(result.groups.flatMap((g) => g.studentIds).length, 50);
      assert.equal(new Set(result.groups.flatMap((g) => g.studentIds)).size, 50);
      assert.ok(result.groups.find((g) => g.id === 'group-2').studentIds.includes(students[0].id));
      assert.equal(validateGroups(students, result.groups, 6, fixed).length, 0);
    });
  }
  check('고정 배치 정원 충돌·중복·누락 감지', () => {
    const fixed = Object.fromEntries(students.slice(0, 5).map((s) => [s.id, 'fixed']));
    assert.ok(proposeGroups(students, 'group', 'interest-mission', 4, fixed).errors.length);
    assert.ok(validateGroups(students, [{ id: 'x', name: 'x', studentIds: [students[0].id, students[0].id] }], 4).length >= 2);
  });
  check('편성 제안과 모드 변경이 개인 카드·결과물을 변경하지 않음', () => {
    const snapshot = JSON.stringify({ students, cards });
    const c = hanseoExample();
    for (const mode of ['group', 'mixed', 'one-to-one', 'individual']) {
      c.mode = mode;
      proposeGroups(students, mode, 'diverse-methods', 4);
    }
    assert.equal(JSON.stringify({ students, cards }), snapshot);
  });
  check('같은 직무 핵심 기준 유지·개인 도움 독립', () => {
    const a = { ...students[0], supports: ['짧게 나눈 읽기 자료'], practiceGoals: ['핵심 표시'] };
    const b = { ...students[0], id: 'another-fictional-student', supports: ['관계 비교표'], practiceGoals: ['두 자료 비교'] };
    const ca = makeCards(a)[1].fields; const cb = makeCards(b)[1].fields;
    assert.equal(ca.sharedGoal, cb.sharedGoal); assert.equal(ca.sharedCriterion, cb.sharedCriterion);
    assert.notEqual(ca.help, cb.help);
  });
  check('기존 설정 이관 시 개인 원본·결과물 보존', () => {
    const oldCamp = { students: 50, cardsPer: 4, kinds: [0, 1, 2, 3], tracks: ['공항'] };
    const experiences = [{ id: 'experience-demo', studentId: students[0].id, period: 'weekly', text: '가상 수행 기록', confirmedByStudent: false, at: '2026-10-27' }];
    const n = normalizeState({ students, cards, experiences, stage: 'university', camp: oldCamp });
    assert.equal(n.students, students); assert.equal(n.cards, cards); assert.equal(n.experiences, experiences);
    assert.equal(n.legacyCamp, oldCamp); assert.equal(n.camp.example, 'none');
    assert.equal(n.camp.institution, ''); assert.equal(n.camp.mode, 'individual');
    assert.equal(regenerateCards(cards, students[0]).length, cards.length);
  });
  console.log(`Rules 1.1: ${count} behavioral checks passed. Physical print, translation semantics and external integration are not certified.`);
} finally { await server.close(); }
