import type { Student, Card, CardFields } from './store';
import { uid, now } from './store';
import { supportPlan, JOB_FAMILIES } from './domain';
import { WORKSHEETS } from '@/data/worksheets';
import type { Stage } from '@/data/worksheets';
import { getJobTask, type JobTask } from '@/data/job-tasks';
import { tx, hasTx } from '@/i18n/tx';
import { locWorksheet } from '@/i18n/content';

export type { JobTask };
export const findJobTask = (stage: Stage, family: string, job: string): JobTask | undefined => getJobTask(stage, family, job);

export const CARD_KINDS = ['계획', '실행·점검', '경험·피드백', '전문가 질문·7일 실행'];
const KIND_FAMILY = [9, 5, 10, 12];

const KIND_FOCUS = [
  { label: '계획', today: '오늘 과제를 이해하고 순서·시간을 계획한다', check: '계획표에 순서·시간·확인 방법이 있다' },
  { label: '실행·점검', today: '첫 행동부터 실제로 수행하고 기준으로 점검한다', check: '산출물 초안과 점검 표시가 있다' },
  { label: '경험·피드백', today: '피드백을 받아 다시 시도하고 바뀐 점을 기록한다', check: '수정 전후 차이와 피드백이 적혀 있다' },
  { label: '전문가 질문·7일 실행', today: '경험을 이야기로 정리하고 현직자 질문과 7일 행동을 만든다', check: '질문 3개와 날짜가 있는 7일 행동이 있다' },
];

const SHARED: Record<string, { goal: string; criterion: string }> = {
  '계획': { goal: '선택한 직무의 오늘 과제를 이해하고 실행 계획을 세운다.', criterion: '계획에 순서·시간·확인 방법이 모두 있다.' },
  '실행·점검': { goal: '직무 자료를 읽고 첫 업무 과제를 실제로 수행한다.', criterion: '산출물 1개가 완성되고 점검 기준에 표시가 있다.' },
  '경험·피드백': { goal: '피드백을 받아 다시 시도하고 경험을 기록한다.', criterion: '수정 전후 차이와 받은 피드백이 기록되어 있다.' },
  '전문가 질문·7일 실행': { goal: '경험을 이야기로 정리하고 전문가 질문과 7일 계획을 만든다.', criterion: '질문 3개와 날짜가 있는 7일 행동이 있다.' },
};

const SCENARIO: Record<string, string> = {
  '공항': '[교육용 가상 장면] 가상 공항 안내 데스크. 두 종류의 공항 안내문을 비교하고 고칠 점을 보고서로 정리한다.',
  '항공사': '[교육용 가상 장면] 가상 항공편 지연 상황. 고객에게 전달할 안내문을 쓰고 직접 읽어 전달한다.',
  '물류': '[교육용 가상 장면] 가상 화물 기록 두 건. 절차 순서를 비교하고 누락 항목 보고서를 작성한다. 실제 보안 취약점은 다루지 않는다.',
};
function scenarioFor(s: Student, J: (src: string, ...a: unknown[]) => string = (x) => x) {
  const t = `${s.family} ${s.job}`;
  if (t.includes('물류') || t.includes('보안')) return J(SCENARIO['물류']);
  if (t.includes('항공사') || t.includes('탑승') || t.includes('고객서비스')) return J(SCENARIO['항공사']);
  if (t.includes('공항')) return J(SCENARIO['공항']);
  return J('[교육용 가상 장면] {0}의 하루 중 한 장면을 바탕으로 작은 산출물을 만든다.', s.job || J('선택한 직무'));
}

/** Generates card fields. lang !== 'ko': every AUTHORED piece is looked up by exact Korean source string
 * (job dictionary / worksheet packs); user values (family, job, task) are inserted verbatim.
 * miss collects authored sources with no translation so the UI can disclose them. */
export function generateFields(s: Student, kindIdx: number, lang = 'ko', miss?: Set<string>): CardFields {
  const J = (src: string, ...a: unknown[]) => { if (miss && !hasTx(lang, src)) miss.add(src); return tx(lang, src, ...a); };
  const kind = CARD_KINDS[kindIdx];
  const fam = KIND_FAMILY[kindIdx];
  const wsSrc = WORKSHEETS.find((w) => w.stage === s.stage && w.family === fam)!;
  const wl = locWorksheet(lang, wsSrc); if (miss && !wl.translated) miss.add(`worksheet:${wsSrc.id}`);
  const ws = wl.w;
  const plan = supportPlan(s.stage, s.report);
  const chosen = s.supports.length ? s.supports : plan.supports.slice(0, 2);
  const shared = { goal: J(SHARED[kind].goal), criterion: J(SHARED[kind].criterion) };
  const jt0 = s.job ? findJobTask(s.stage, s.family, s.job) : undefined;
  const jt = jt0 && { ...jt0, goal: J(jt0.goal), criterion: J(jt0.criterion), scenario: J(jt0.scenario), readingTitle: J(jt0.readingTitle), reading: J(jt0.reading), firstAction: J(jt0.firstAction), steps: jt0.steps.map((x) => J(x)), deliverable: J(jt0.deliverable), role: J(jt0.role) };
  if (jt) {
    const f0 = KIND_FOCUS[kindIdx]; const f = { label: J(f0.label), today: J(f0.today), check: J(f0.check) };
    const steps = kindIdx === 0 ? [J('과제를 단계로 나누고 단계마다 걸리는 시간을 적는다'), ...jt.steps.slice(0, 2)]
      : kindIdx === 1 ? jt.steps
      : kindIdx === 2 ? [J('짝 또는 교사에게 산출물 피드백 1개 받기'), J('피드백을 반영해 한 부분 다시 하기'), J('처음과 다시 한 것의 차이 쓰기')]
      : [J('오늘 한 일을 상황-행동-결과로 3문장 쓰기'), J('현직자·선배에게 물을 열린 질문 3개 쓰기'), J('다음 7일 안에 할 행동 1개와 날짜 쓰기')];
    return {
      kind, source: 'job-task',
      sharedGoal: jt.goal, sharedCriterion: jt.criterion,
      todayGoal: J('{0}. ({1})', f.today, s.job),
      job: [s.family, s.job, s.task].filter(Boolean).join(' / '), scenario: jt.scenario,
      reading: `${jt.readingTitle}\n${jt.reading}`,
      firstAction: kindIdx === 1 ? jt.firstAction : steps[0], steps: kindIdx === 1 ? jt.steps : steps.slice(1),
      method: s.practiceGoals.length ? J('연습 목표: {0}', s.practiceGoals.slice(0, 2).map((g) => J(g)).join(', ')) : J('나에게 맞는 방법을 골라 시작'),
      help: chosen.map((x) => J(x)).join(' / '), role: s.task ? J('{0} 담당', s.task) : jt.role, time: J('{0}분 (작성 시간 포함)', jt.minutes),
      deliverable: kindIdx === 1 ? jt.deliverable : J('{0} 기록 + (공동 산출물: {1})', f.label, jt.deliverable),
      criterion: f.check,
      checkIn: J('중간에 교사 또는 짝과 1회 확인: "지금 어디까지 했고, 다음은 무엇인가?"'),
    };
  }
  return {
    source: 'needs-confirmation',
    // No job task matched: do NOT invent a recommendation. Uses stage worksheet; teacher must review.
    kind, sharedGoal: shared.goal, sharedCriterion: shared.criterion,
    todayGoal: J('[직무 과제 미확인 - 교사 확인 필요] {0}', ws.goal),
    job: [s.family, s.job, s.task].filter(Boolean).join(' / ') || J('(학생이 직무를 아직 선택하지 않음)'),
    scenario: scenarioFor(s, J),
    reading: `${ws.readingTitle}\n${ws.reading}`,
    firstAction: ws.actions[0],
    steps: ws.actions.slice(1),
    method: s.practiceGoals.length ? J('연습 목표: {0}', s.practiceGoals.slice(0, 2).map((g) => J(g)).join(', ')) : J('나에게 맞는 방법을 골라 시작'),
    help: chosen.map((x) => J(x)).join(' / '),
    role: s.task ? J('{0} 담당', s.task) : J('모둠에서 맡을 역할을 직접 고르기'),
    time: J('{0}분 중 작성 시간 포함', s.minutes || 50),
    deliverable: ws.deliverable, criterion: ws.criterion,
    checkIn: J('중간에 교사 또는 짝과 1회 확인: "지금 어디까지 했고, 다음은 무엇인가?"'),
  };
}

export function makeCards(s: Student, kinds: number[] = [0, 1, 2, 3]): Card[] {
  return kinds.map((i) => {
    const k = CARD_KINDS[i];
    const fields = generateFields(s, i);
    return { id: uid('card'), studentId: s.id, kind: k, status: 'draft', fields, versions: [{ version: 1, at: now(), reason: '최초 생성', fields }], printedVersions: [] };
  });
}

/** Regeneration keeps stable card IDs, previous edits and print-version references. */
export function regenerateCards(existing: Card[], student: Student, kinds: number[] = [0, 1, 2, 3]): Card[] {
  const selected = new Set(kinds.map((i) => CARD_KINDS[i]));
  const next = existing.map((c) => c.studentId === student.id ? { ...c, archived: !selected.has(c.kind) } : c);
  for (const draft of makeCards(student, kinds)) {
    const index = next.findIndex((c) => c.studentId === student.id && c.kind === draft.kind);
    if (index < 0) { next.push(draft); continue; }
    const previous = next[index];
    if (JSON.stringify(previous.fields) === JSON.stringify(draft.fields)) {
      next[index] = { ...previous, archived: false };
    } else {
      next[index] = {
        ...previous, archived: false, status: 'draft', fields: draft.fields,
        versions: [...previous.versions, {
          version: Math.max(...previous.versions.map((v) => v.version), 0) + 1,
          at: now(), reason: '직무 정보 재생성', fields: draft.fields,
        }],
      };
    }
  }
  return next;
}

/* fictional roster generator — missing values NOT invented */
const MAJORS = ['항공보안', '교통물류', '공항행정', '항공외국어'];
export function fictionalStudents(n: number, stage: Student['stage'], example: 'general' | 'hanseo' = 'general'): Student[] {
  return Array.from({ length: n }, (_, i) => ({
    id: uid('st'), code: `가상-${String(i + 1).padStart(3, '0')}`, stage,
    grade: stage === 'university' && example === 'hanseo' ? `${2 + (i % 3)}학년` : '', major: stage === 'university' && example === 'hanseo' ? MAJORS[i % 4] : '',
    family: '', job: '', task: '',
    report: { verified: false, testName: '', version: '', criteria: '', levels: {}, top5: [] },
    supports: [], practiceGoals: [], prior: '', minutes: 50, teacherNote: '',
  }));
}

/* Camp tracks → explicit demo sample jobs (fictional, NOT a recommendation; teacher-triggered only) */
export const CAMP_TRACKS: Record<string, { family: string; jobs: string[] }> = {
  '공항': { family: '공항 운영', jobs: JOB_FAMILIES['공항 운영'] },
  '항공사': { family: '항공사 서비스', jobs: JOB_FAMILIES['항공사 서비스'] },
  '보안·물류': { family: '보안·물류', jobs: JOB_FAMILIES['보안·물류'] },
};
export function demoAssign(students: Student[], tracks: string[]): Student[] {
  const pool = tracks.flatMap((t) => (CAMP_TRACKS[t] ? CAMP_TRACKS[t].jobs.map((j) => ({ family: CAMP_TRACKS[t].family, job: j })) : []));
  if (!pool.length) return students;
  return students.map((s, i) => (s.job ? s : { ...s, family: pool[i % pool.length].family, job: pool[i % pool.length].job, teacherNote: (s.teacherNote ? s.teacherNote + ' / ' : '') + '[데모 배정 · 가상 · 추천 아님]' }));
}

const FIELD_KEYS = ['todayGoal', 'job', 'scenario', 'reading', 'firstAction', 'steps', 'method', 'help', 'role', 'time', 'deliverable', 'criterion', 'checkIn', 'sharedGoal', 'sharedCriterion'] as const;
/** Per-field localization for display/print. For each field:
 *  - equals current Korean generator output -> translated (authored, unedited)
 *  - equals the card's first generated version but not current output -> 'outdated' (student/job/source changed
 *    after generation); shown as stored, teacher should regenerate
 *  - otherwise -> 'edited' by teacher; shown verbatim, never translated */
export function localizeCard(fields: CardFields, s: Student | undefined, lang: string, origin?: CardFields): { fields: CardFields; kept: string[]; outdated: string[]; missing: string[] } {
  const idx = CARD_KINDS.indexOf(fields.kind);
  if (!s || idx < 0) return { fields, kept: [], outdated: lang === 'ko' ? [] : [...FIELD_KEYS], missing: [] };
  const ko = generateFields(s, idx, 'ko'); const miss = new Set<string>(); const loc = lang === 'ko' ? ko : generateFields(s, idx, lang, miss);
  const out: CardFields = { ...fields }; const kept: string[] = []; const outdated: string[] = [];
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  for (const k of FIELD_KEYS) {
    if (same(fields[k], ko[k])) (out as unknown as Record<string, unknown>)[k] = loc[k];
    else if (origin && same(fields[k], origin[k])) outdated.push(k);
    else kept.push(k);
  }
  return { fields: out, kept, outdated, missing: [...miss] };
}
