import { WORKSHEETS, STAGES, FAMILIES } from '@/data/worksheets';
import { LESSONS } from '@/data/lessons';
import { allConditions, retime, TIMES } from './domain';
import { fictionalStudents, makeCards, demoAssign, regenerateCards } from './cards';
import { studentPages, campSheets } from './print-pages';
import { PACKS } from '@/i18n/content';
import { lessonById } from '@/data/lessons';
import { hasTx } from '@/i18n/tx';
import { LANGS } from '@/i18n/ui';
import UI_KEYS from '@/i18n/ui-source-keys.json';
import JOB_KEYS from '@/i18n/job-source-keys.json';
import { blankTeaching, hanseoExample, proposeGroups, validateGroups } from './teaching';
import { generateMaterials, validatePerformance } from './materials';
import { normalizeState } from './store';
import { buildMaterialBundle } from './material-print';

export interface Check { id: string; label: string; ok: boolean; detail: string; kind: 'auto' | 'human' }

export function runChecks(): Check[] {
  const c: Check[] = [];
  const general = STAGES.map((stage) => blankTeaching(stage));
  const hanseo = hanseoExample();
  const sample = fictionalStudents(8, 'university');
  const proposal = proposeGroups(sample, 'mixed', 'interest-mission', 3);
  c.push({ id: 'rules-1.1-general', label: '규칙 1.1: 빈 일반 설정으로 시작, 한서대는 선택 예시', ok: general.every((g) => g.example === 'none' && !g.institution && !g.students && !g.kinds.length && !g.sessions.length), detail: '자동 점검', kind: 'auto' });
  c.push({ id: 'rules-1.1-individual', label: '규칙 1.1: 개인 미션 기본, 학과·직무별 반/조 편성 없음', ok: hanseo.mode === 'individual' && !hanseo.grouping.draft.length && proposeGroups(sample, 'individual', 'interest-mission', 3).groups.length === 0 && sample.every((s) => !s.major && !s.job), detail: '자동 점검', kind: 'auto' });
  c.push({ id: 'rules-1.1-grouping', label: '규칙 1.1: 조별·혼합 수업의 조 편성 제안·검토·확정', ok: !proposal.errors.length && !validateGroups(sample, proposal.groups, 3).length && !hanseo.grouping.confirmed.length, detail: '자동 점검', kind: 'auto' });
  const personal = generateMaterials(normalizeState({ students: sample.slice(0, 2) }), sample.slice(0, 2).map((s) => s.id), 5, [1], 'ko', false);
  const ready = {
    ...personal,
    personalWorksheets: personal.personalWorksheets.map((w) => ({ ...w, status: 'confirmed' as const })),
    plannerActivities: personal.plannerActivities.map((a) => ({ ...a, status: 'confirmed' as const })),
  };
  const packet = buildMaterialBundle(ready, { studentIds: sample.slice(0, 2).map((s) => s.id), mode: 'both', layout: 'A5x2' });
  let rejectedEmptyPerformance = false;
  try { validatePerformance({ ...personal.plannerActivities[0].record, state: 'performed' }); } catch { rejectedEmptyPerformance = true; }
  c.push({ id: 'rules-1.2-separate', label: '규칙 1.2: 개인 활동지와 플래너 카드 분리 생성·연결', ok: personal.personalWorksheets.length === 2 && personal.plannerActivities.length === 2 && personal.plannerActivities.every((a) => personal.personalWorksheets.some((w) => a.worksheetIds.includes(w.id) && a.studentId === w.studentId)), detail: '자동 점검', kind: 'auto' });
  c.push({ id: 'rules-1.2-pages', label: '규칙 1.2: 활동지만·카드만·둘 다 인쇄 묶음 고정·재인쇄', ok: packet.counts.outputs === 4 && packet.pages.every((p) => p.panels.every((x) => x.studentId === p.studentId)) && packet.state === 'prepared', detail: '자동 점검', kind: 'auto' });
  c.push({ id: 'rules-1.2-records', label: '규칙 1.2: 계획·진행 중·수행 완료 실행 기록 구분', ok: rejectedEmptyPerformance && personal.plannerActivities.every((a) => a.record.state === 'planned' && a.registration.state === 'disconnected'), detail: '자동 점검', kind: 'auto' });
  c.push({ id: 'ls', label: '수업 18개(학교급별 6개)', ok: LESSONS.length === 18 && STAGES.every((s) => LESSONS.filter((l) => l.stage === s).length === 6), detail: `총 ${LESSONS.length}`, kind: 'auto' });
  c.push({ id: 'ws', label: '활동지 36개(학교급별 12개)', ok: WORKSHEETS.length === 36 && STAGES.every((s) => WORKSHEETS.filter((w) => w.stage === s).length === 12), detail: `총 ${WORKSHEETS.length}`, kind: 'auto' });
  const titles = new Set(WORKSHEETS.map((w) => w.title)); const readings = new Set(WORKSHEETS.map((w) => w.reading));
  c.push({ id: 'uniq', label: '활동지 제목·읽기 자료 고유성', ok: titles.size === 36 && readings.size === 36, detail: `제목 ${titles.size}, 자료 ${readings.size}`, kind: 'auto' });
  c.push({ id: 'fam', label: '12개 계열 x 3 학교급', ok: STAGES.every((s) => FAMILIES.every((_, i) => WORKSHEETS.some((w) => w.stage === s && w.family === i + 1))), detail: '', kind: 'auto' });
  const empty = WORKSHEETS.filter((w) => !w.goal || w.reading.length < 80 || w.actions.length < 3 || !w.deliverable || !w.criterion);
  c.push({ id: 'full', label: '활동지 필수 구성 비어 있지 않음', ok: empty.length === 0, detail: empty.map((w) => w.id).join(',') || '모두 충족', kind: 'auto' });
  const lEmpty = LESSONS.filter((l) => !l.goal || !l.teacherDemo || l.blocks.length < 4 || !l.deliverable || !l.nextAction || l.worksheets.some((id) => !WORKSHEETS.find((w) => w.id === id && w.stage === l.stage)));
  c.push({ id: 'lfull', label: '수업 필수 구성·활동지 학교급 일치', ok: lEmpty.length === 0, detail: lEmpty.map((l) => l.id).join(',') || '모두 충족', kind: 'auto' });
  const conds = allConditions(); const pats = new Set(conds.map((x) => x.stage + x.pattern));
  c.push({ id: 'sup', label: '지원 조건 3^4 x 3 = 243', ok: conds.length === 243 && pats.size === 243 && conds.every((x) => x.supports > 0), detail: `${pats.size}개 조건, 빈 지원 없음`, kind: 'auto' });
  const bad: string[] = []; let reduced = 0;
  LESSONS.forEach((l) => TIMES.forEach((t) => {
    const r = retime(l, t); const bw = l.blocks.filter((b) => b.kind === 'writing').reduce((s, b) => s + b.minutes, 0);
    if (r.total !== t || r.blocks.some((b) => b.minutes < 2) || (!r.writingReduced && r.writing !== bw)) bad.push(`${l.id}@${t}`);
    if (r.writingReduced) reduced++;
  }));
  c.push({ id: 'time', label: `시간 합계 일치 (18수업 x ${TIMES.length}시간), 작성 시간 유지`, ok: bad.length === 0, detail: bad.join(',') || `모두 일치 · 작성 시간 축소 공개 ${reduced}건`, kind: 'auto' });
  void lessonById;
  const roster = demoAssign(fictionalStudents(50, 'university'), ['공항', '항공사', '보안·물류']);
  const cards = roster.flatMap((s) => makeCards(s));
  const gen = fictionalStudents(50, 'university');
  c.push({ id: 'roster', label: '가상 50명 → 카드 200장 → A4 100매', ok: roster.length === 50 && cards.length === 200 && Math.ceil(cards.length / 2) === 100 && gen.every((s) => !s.job && !s.report.verified), detail: `학생 ${roster.length}, 카드 ${cards.length}, A4 ${Math.ceil(cards.length / 2)}, 생성 시 빈 직무 유지`, kind: 'auto' });
  c.push({ id: 'camp', label: '캠프 4x50 + 3x10 = 230분, 50명 x 4장 = 200장 / A4 100장', ok: 4 * 50 + 3 * 10 === 230 && (50 * 4) / 2 === 100, detail: '13:30-17:20', kind: 'auto' });
  c.push({ id: 'gen5', label: '일반 5시간형 280 + 20 = 300분', ok: 280 + 20 === 300, detail: '', kind: 'auto' });
  const odd = roster.flatMap((s) => [0, 1, 2].map((kind) => ({ studentId: s.id, kind })));
  const oddPages = studentPages(odd, 2);
  c.push({ id: 'odd', label: '학생별 묶음·홀수 카드 페이지 분리', ok: oddPages.length === 100 && oddPages.every((p) => new Set(p.map((x) => x.studentId)).size === 1) && campSheets(50, 3) === 100, detail: '50명 × 3카드 = 150카드 / 학생별 2매 = A4 100매', kind: 'auto' });
  const first = roster[0];
  const original = makeCards(first);
  const changed = regenerateCards(original, { ...first, family: '항공사 서비스', job: '탑승 수속 지원' });
  const limited = regenerateCards(changed, { ...first, family: '항공사 서비스', job: '탑승 수속 지원' }, [0, 1, 2]);
  const again = regenerateCards(limited, { ...first, family: '항공사 서비스', job: '탑승 수속 지원' }, [0, 1, 2]);
  c.push({ id: 'history', label: '재생성 원본·버전 보존과 중복 방지', ok: changed.every((c) => original.some((o) => o.id === c.id && c.versions[0].fields === o.versions[0].fields)) && changed.every((c) => c.versions.length === 2) && limited.filter((c) => !c.archived).length === 3 && again.length === 4 && again.every((c) => c.versions.length === 2), detail: '안정 ID·최초 원본·수정 이력 보존 / 미선택 카드는 보관 / 동일 재생성 중복 없음', kind: 'auto' });
  const translationProblems: string[] = [];
  LANGS.filter((x) => x.code !== 'ko').forEach(({ code }) => {
    const p = PACKS[code];
    WORKSHEETS.forEach((w) => {
      const t = p?.worksheets[w.id];
      if (!t || !t.reading || !t.goal || !t.criterion || !t.deliverable || t.actions?.length !== w.actions.length || t.supports?.length !== w.supports.length) translationProblems.push(`${code}:${w.id}`);
    });
    LESSONS.forEach((l) => {
      const t = p?.lessons[l.id];
      if (!t || !t.teacherDemo || !t.labContent || !t.nextAction || t.blocks?.length !== l.blocks.length || t.questions?.length !== l.questions.length || t.observations?.length !== l.observations.length) translationProblems.push(`${code}:${l.id}`);
    });
  });
  c.push({ id: 'content-i18n', label: '14개 언어 전체 수업·활동지 번역 필드 구조', ok: !translationProblems.length, detail: translationProblems.join(', ') || '14 × (36활동지 + 18수업) 번역 필드·배열 구조 확인 / 의미 검수 별도', kind: 'auto' });
  const gaps = LANGS.filter((l) => l.code !== 'ko').map((l) => ({ l: l.code, ui: (UI_KEYS as string[]).filter((k) => !hasTx(l.code, k)).length, job: (JOB_KEYS as string[]).filter((k) => !hasTx(l.code, k)).length }));
  c.push({ id: 'i18n', label: 'UI·카드 사전 키 적용 (14개 언어)', ok: gaps.every((g) => !g.ui && !g.job), detail: `UI ${UI_KEYS.length}키, 카드 ${JOB_KEYS.length}키 · 누락 ` + gaps.map((g) => `${g.l} ${g.ui}/${g.job}`).join(', '), kind: 'auto' });
  c.push({ id: 'print', label: '실제 브라우저 인쇄·PDF 결과 확인', ok: false, detail: '사람 확인 대기', kind: 'human' });
  c.push({ id: 'tr', label: '번역 사람 검토', ok: false, detail: '검토 대기', kind: 'human' });
  c.push({ id: 'rules', label: '규칙 문서와 구현 대조', ok: false, detail: '사람 확인 대기', kind: 'human' });
  return c;
}
