import { createServer } from 'vite';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const server = await createServer({
  root, configFile: false, logLevel: 'error', appType: 'custom',
  server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true },
  resolve: { alias: { '@': path.join(root, 'src') } },
});
let passed = 0;
const check = (label, f) => { f(); console.log(`PASS ${label}`); passed++; };
try {
  const store = await server.ssrLoadModule('/src/lib/store.ts');
  const cards = await server.ssrLoadModule('/src/lib/cards.ts');
  const m = await server.ssrLoadModule('/src/lib/materials.ts');
  const { buildMaterialBundle } = await server.ssrLoadModule('/src/lib/material-print.ts');
  const people = cards.demoAssign(cards.fictionalStudents(3, 'university'), ['공항', '항공사']);
  people[1].family = cards.CAMP_TRACKS['항공사'].family;
  people[1].job = cards.CAMP_TRACKS['항공사'].jobs[0];
  people.forEach((s, i) => { s.code = `가상-개별-${i + 1}`; s.cohort = i < 2 ? '가상 혼합전공반' : '다른 가상반'; s.displayName = `가상 예시 이름 ${i + 1}`; s.supports = i === 0 ? ['순서 카드'] : ['핵심 표시']; });
  const ids = people.slice(0, 2).map((s) => s.id);
  const initial = store.normalizeState({ students: people });
  let state = m.generateMaterials(initial, ids, 5, [1], 'ko', false);
  check('서로 다른 두 직무의 별도 활동지와 실행 카드 연결', () => {
    assert.equal(state.personalWorksheets.length, 2); assert.equal(state.plannerActivities.length, 2);
    assert.notEqual(state.personalWorksheets[0].fields.reading, state.personalWorksheets[1].fields.reading);
    assert.notEqual(state.personalWorksheets[0].fields.criterion, state.personalWorksheets[1].fields.criterion);
    for (const a of state.plannerActivities) {
      const w = state.personalWorksheets.find((w) => w.id === a.worksheetIds[0]);
      assert.equal(a.studentId, w.studentId); assert.notEqual(a.id, w.id);
      assert.equal(a.record.state, 'planned'); assert.equal(a.registration.state, 'disconnected');
      assert.ok(w.fields.questions.length && w.fields.actions.length && w.fields.help.length);
    }
    assert.equal(state.students[2], initial.students[2]); assert.equal(state.experiences.length, 0);
  });
  check('동일 생성 반복 시 자료·카드 중복 없음', () => {
    const again = m.generateMaterials(state, ids, 5, [1], 'ko', false);
    assert.deepEqual(again, state);
  });
  check('교사 수정과 답안 및 원본 버전 보존', () => {
    const w = state.personalWorksheets[0];
    state = m.saveWorksheet(state, w.id, { ...w.fields, answer: '가상 학생이 직접 쓴 원문' }, '교사 확인 입력', 'draft');
    const again = m.generateMaterials(state, ids, 5, [1], 'ko', false);
    assert.equal(again.personalWorksheets[0].fields.answer, '가상 학생이 직접 쓴 원문');
    assert.equal(again.personalWorksheets[0].versions[0].fields.answer, '');
    assert.equal(again.personalWorksheets[0].id, w.id);
    state = again;
  });
  check('다른 활동지의 기존 계획 활동 재사용 확인', () => {
    assert.throws(() => m.generateMaterials(state, [ids[0]], 6, [1], 'ko', false));
    const reused = m.generateMaterials(state, [ids[0]], 6, [1], 'ko', true);
    assert.equal(reused.plannerActivities.length, 2);
    assert.equal(reused.plannerActivities[0].worksheetIds.length, 2);
    assert.equal(reused.plannerActivities[0].id, state.plannerActivities[0].id);
  });
  check('한 활동지에서 여러 실행 카드로 분할 및 반복 중복 방지', () => {
    const w = state.personalWorksheets[0];
    const split = m.connectWorksheet(state, w.id, { allowNew: true, newTitle: '자료 한 항목부터 비교하는 가상 활동' });
    assert.equal(split.plannerActivities.length, 3);
    assert.equal(m.connectWorksheet(split, w.id, { allowNew: true, newTitle: '자료 한 항목부터 비교하는 가상 활동' }).plannerActivities.length, 3);
    assert.throws(() => m.connectWorksheet(state, w.id, { activityId: state.plannerActivities[1].id }));
  });
  check('기존 직무 카드 가져오기 전 재사용 확인·원본 유지', () => {
    const legacy = { ...initial, cards: cards.makeCards(people[0], [1]) };
    assert.throws(() => m.generateMaterials(legacy, [ids[0]], 5, [1], 'ko', false));
    const reused = m.generateMaterials(legacy, [ids[0]], 5, [1], 'ko', true);
    assert.equal(reused.plannerActivities[0].legacyCardId, legacy.cards[0].id);
    assert.equal(reused.cards, legacy.cards);
  });
  check('미확정 자료·없는 자료를 조용히 누락하지 않음', () => {
    assert.throws(() => buildMaterialBundle(state, { studentIds: ids, mode: 'both', layout: 'A4' }));
    assert.throws(() => buildMaterialBundle(state, { studentIds: [people[2].id], mode: 'both', layout: 'A4' }));
  });
  for (const w of state.personalWorksheets) state = m.saveWorksheet(state, w.id, w.fields, '가상 자료 교사 검수', 'confirmed');
  for (const a of state.plannerActivities) state = m.savePlanner(state, a.id, a.fields, a.record, '가상 계획 교사 검수', 'confirmed');
  for (const mode of ['worksheets', 'cards', 'both']) for (const layout of ['A4', 'A5x2']) {
    check(`${mode}/${layout} 학생별 순서·버전·페이지·자료 수`, () => {
      const b = buildMaterialBundle(state, { studentIds: [...ids].reverse(), mode, layout });
      assert.deepEqual(b.studentIds, ids); assert.equal(b.counts.students, 2); assert.equal(b.counts.sheets, b.pages.length);
      assert.equal(b.counts.worksheets, mode === 'cards' ? 0 : 2); assert.equal(b.counts.cards, mode === 'worksheets' ? 0 : 2);
      assert.equal(b.counts.outputs, b.counts.worksheets + b.counts.cards);
      for (const id of ids) {
        const own = b.pages.filter((p) => p.studentId === id);
        assert.deepEqual(own.map((p) => p.studentPage), own.map((_, i) => i + 1));
        assert.ok(own.every((p) => p.studentPages === own.length && p.panels.every((x) => x.studentId === id && x.version >= 2 && !x.name)));
      }
      assert.ok(b.pages.every((p, i) => p.globalPage === i + 1));
      assert.equal(b.state, 'prepared'); assert.deepEqual(b.printRequests, []);
    });
  }
  check('학생 한 명만 출력 및 이름 기본 제외·교사 선택 포함', () => {
    const b = buildMaterialBundle(state, { studentIds: [ids[1]], mode: 'both', layout: 'A5x2' });
    assert.ok(b.pages.every((p) => p.studentId === ids[1]));
    assert.ok(b.pages.every((p) => p.panels.every((x) => !x.name)));
    const withName = buildMaterialBundle(state, { studentIds: [ids[0]], mode: 'worksheets', layout: 'A4', includeName: true });
    assert.ok(withName.pages.every((p) => p.panels.every((x) => x.name === people[0].displayName)));
  });
  check('소속반 전체 선택은 다른 반 제외·문서 선택 혼입 방지', () => {
    const cohortIds = state.students.filter((s) => s.cohort === '가상 혼합전공반').map((s) => s.id);
    assert.deepEqual(buildMaterialBundle(state, { studentIds: cohortIds, mode: 'both', layout: 'A4' }).studentIds, ids);
    assert.throws(() => buildMaterialBundle(state, { studentIds: [ids[0]], mode: 'worksheets', layout: 'A4', worksheetIds: [state.personalWorksheets[1].id] }));
  });
  check('같은 버전 재출력 스냅샷은 이후 편집에 영향 없음', () => {
    const b = buildMaterialBundle(state, { studentIds: ids, mode: 'both', layout: 'A4' });
    const original = JSON.stringify(b);
    const w = state.personalWorksheets[0];
    const edited = m.saveWorksheet(state, w.id, { ...w.fields, answer: '이후에 바꾼 다른 답안' }, '추가 답안 입력', 'confirmed');
    assert.equal(JSON.stringify(b), original);
    assert.notEqual(edited.personalWorksheets[0].fields.answer, w.fields.answer);
    assert.deepEqual(JSON.parse(JSON.stringify(b)).pages, b.pages);
  });
  check('긴 원문·많은 줄·작성 공간은 삭제 없이 이어지는 면으로 분리', () => {
    const w = state.personalWorksheets[0]; const text = '가상 교육용 긴 자료의 내용과 근거를 보존한다.\n'.repeat(150);
    const long = m.saveWorksheet(state, w.id, { ...w.fields, reading: text }, '긴 자료 인쇄 확인', 'confirmed');
    const b = buildMaterialBundle(long, { studentIds: [ids[0]], mode: 'worksheets', layout: 'A4' });
    const reading = b.pages.flatMap((p) => p.panels).flatMap((p) => p.blocks).filter((x) => x.label.startsWith(w.fields.readingTitle)).map((x) => x.text).join('\n');
    assert.equal(reading.replace(/\s/g, ''), text.replace(/\s/g, ''));
    assert.ok(b.pages.length > 2); assert.ok(b.pages.some((p) => p.panels.some((x) => x.blocks.some((b) => b.writingLines))));
  });
  check('계획을 완료 경험으로 바꾸지 않으며 종이 기록 확인 필요', () => {
    const a = state.plannerActivities[0];
    assert.throws(() => m.savePlanner(state, a.id, a.fields, { ...a.record, state: 'performed' }, '확인 시도', 'confirmed'));
    assert.throws(() => m.savePlanner(state, a.id, a.fields, { ...a.record, state: 'performed', actual: '가상으로 두 문서를 비교함', confirmedBy: 'teacher', source: 'paper', paperConfirmed: false }, '종이 전사', 'confirmed'));
    const performed = m.savePlanner(state, a.id, a.fields, { ...a.record, state: 'performed', actual: '가상으로 두 문서를 비교함', confirmedBy: 'teacher', source: 'paper', paperConfirmed: true }, '종이 내용 확인', 'confirmed');
    assert.equal(performed.plannerActivities[0].record.state, 'performed'); assert.equal(performed.experiences.length, state.experiences.length);
  });
  check('복사·내보내기·수동 확인은 외부 등록 성공 아님', () => {
    const a = state.plannerActivities[0];
    for (const action of ['prepared', 'copied', 'exported', 'manual-confirmed']) {
      const marked = m.markRegistration(a, action);
      assert.equal(marked.registration.state, action); assert.notEqual(marked.registration.state, 'registered');
    }
    assert.throws(() => m.acceptRemoteRegistration(a, { remoteId: 'unit-test-receipt', savedAt: '2026-10-27T00:00:00Z', permissionVerified: true }, false));
    assert.throws(() => m.acceptRemoteRegistration(a, { remoteId: 'unit-test-receipt', savedAt: '2026-10-27T00:00:00Z', permissionVerified: false }, true));
    // Adapter contract only. This is NOT an actual external registration.
    assert.equal(m.acceptRemoteRegistration(a, { remoteId: 'unit-test-receipt', savedAt: '2026-10-27T00:00:00Z', permissionVerified: true }, true).registration.state, 'registered');
    assert.ok(m.plannerText(a, state.personalWorksheets, people[0]).includes(a.worksheetIds[0]));
  });
  check('저장·백업 복원에서 새 문서와 기존 기록 보존', () => {
    const restored = store.normalizeState(JSON.parse(JSON.stringify(state)));
    assert.deepEqual(restored.personalWorksheets, state.personalWorksheets);
    assert.deepEqual(restored.plannerActivities, state.plannerActivities);
    assert.deepEqual(restored.experiences, state.experiences);
  });
  check('가상 50명 전체 반: 활동지 50부·실행 카드 200개와 학생별 용지 분리', () => {
    const fifty = cards.demoAssign(cards.fictionalStudents(50, 'university'), ['공항', '항공사', '보안·물류']);
    let group = m.generateMaterials(store.normalizeState({ students: fifty }), fifty.map((s) => s.id), 5, [0, 1, 2, 3], 'ko', false);
    for (const w of group.personalWorksheets) group = m.saveWorksheet(group, w.id, w.fields, '가상 학급 자료 검수', 'confirmed');
    for (const a of group.plannerActivities) group = m.savePlanner(group, a.id, a.fields, a.record, '가상 학급 계획 검수', 'confirmed');
    const b = buildMaterialBundle(group, { studentIds: fifty.map((s) => s.id), mode: 'both', layout: 'A5x2' });
    assert.equal(b.counts.students, 50); assert.equal(b.counts.worksheets, 50); assert.equal(b.counts.cards, 200);
    assert.equal(b.counts.outputs, 250); assert.equal(new Set(group.plannerActivities.map((a) => a.id)).size, 200);
    assert.ok(b.pages.every((p) => p.panels.every((panel) => panel.studentId === p.studentId)));
    const mib = JSON.stringify({ ...group, materialBundles: [b] }).length * 2 / (1024 * 1024);
    assert.ok(mib < 5, `Single full-class bundle should fit normal localStorage budget, got ${mib.toFixed(2)} MiB`);
    console.log(`  Full-class snapshot: ${b.counts.sheets} A4 sheets including continuations, ${mib.toFixed(2)} MiB estimated UTF-16 storage`);
  });
  // Browser verification uses its own isolated fictional-data storage, never the user's browser.
  await fs.writeFile('/tmp/lesson-lab-1.2-fixture.json', JSON.stringify(state));
  console.log(`Rules 1.2: ${passed} checks passed. External adapter success above is a unit fixture, not an integration.`);
} finally { await server.close(); }
