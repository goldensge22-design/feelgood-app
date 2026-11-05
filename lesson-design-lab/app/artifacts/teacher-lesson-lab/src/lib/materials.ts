import { WORKSHEETS } from '@/data/worksheets';
import { locWorksheet } from '@/i18n/content';
import { tx } from '@/i18n/tx';
import { generateFields, findJobTask, CARD_KINDS } from './cards';
import { supportPlan } from './domain';
import { uid, now, type AppState, type Student } from './store';
import type {
  PersonalWorksheet, WorksheetFields, PlannerActivity, PlannerFields, PerformanceRecord, RegistrationReceipt,
} from './material-types';

const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const copy = <T,>(a: T): T => structuredClone(a);
export const emptyPerformance = (): PerformanceRecord => ({
  state: 'planned', actual: '', changedMethod: '', artifact: '', feedback: '', nextAction: '',
  confirmedBy: '', source: 'screen', paperConfirmed: false,
});
function studentById(state: AppState, id: string): Student {
  const s = state.students.find((s) => s.id === id);
  if (!s) throw new Error('학생 명단에서 선택한 학생을 확인할 수 없습니다.');
  return s;
}
export function worksheetFields(student: Student, family: number, lang: string): { fields: WorksheetFields; templateId: string; source: PersonalWorksheet['source'] } {
  const template = WORKSHEETS.find((w) => w.stage === student.stage && w.family === family);
  if (!template) throw new Error('학교급과 활동지 계열을 확인하세요.');
  const w = locWorksheet(lang, template).w;
  const job = findJobTask(student.stage, student.family, student.job);
  const tr = (s: string, ...args: unknown[]) => tx(lang, s, ...args);
  return {
    templateId: template.id, source: job ? 'job-task' : 'general-review',
    fields: {
      title: `${w.title}${student.job ? ` · ${student.job}` : ''}`,
      goal: [w.goal, job ? tr(job.goal) : tr('직무와 과제는 교사가 확인합니다.')].join('\n'),
      job: [student.family, student.job, student.task].filter(Boolean).join(' / '),
      readingTitle: job ? tr(job.readingTitle) : w.readingTitle,
      reading: job ? `${tr(job.scenario)}\n\n${tr(job.reading)}` : w.reading,
      questions: [
        tr('자료에서 확인한 사실과 아직 확인하지 못한 것은 무엇인가?'),
        tr('내가 선택한 관심 분야·직무와 연결되는 근거는 무엇인가?'),
        tr('이번에 직접 할 행동과 제출할 결과물은 무엇인가?'),
      ],
      actions: [...(job ? [tr(job.firstAction)] : []), ...w.actions, ...(student.task ? [tr('본인이 선택한 과제: {0}', student.task)] : [])],
      help: (student.supports.length ? student.supports : supportPlan(student.stage, student.report).supports).map((s) => tr(s)),
      deliverable: [w.deliverable, job ? tr(job.deliverable) : ''].filter(Boolean).join('\n'),
      criterion: [w.criterion, job ? tr(job.criterion) : ''].filter(Boolean).join('\n'),
      answer: '',
    },
  };
}
function ensureWorksheet(state: AppState, student: Student, family: number, lang: string): { state: AppState; worksheet: PersonalWorksheet } {
  const source = worksheetFields(student, family, lang);
  const context = { family: student.family, job: student.job, task: student.task };
  const old = state.personalWorksheets.find((w) => !w.archived && w.studentId === student.id && w.templateId === source.templateId && equal(w.context, context));
  if (old) {
    // Never erase teacher edits or student answers on regeneration. Only unchanged authored fields are refreshed.
    const baseline = old.generated ?? old.versions[0].fields;
    const fields = { ...old.fields };
    for (const key of Object.keys(fields) as (keyof WorksheetFields)[]) {
      if (equal(old.fields[key], baseline[key])) Object.assign(fields, { [key]: source.fields[key] });
    }
    if (equal(old.fields, fields)) return { state, worksheet: old };
    const worksheet: PersonalWorksheet = {
      ...old, fields, generated: copy(source.fields), source: source.source, lang, status: 'draft',
      versions: [...old.versions, { version: old.versions.at(-1)!.version + 1, at: now(), reason: '개인 지원·자료 갱신 · 직접 작성 내용 보존', fields: copy(fields) }],
    };
    return { state: { ...state, personalWorksheets: state.personalWorksheets.map((w) => w.id === old.id ? worksheet : w) }, worksheet };
  }
  const worksheet: PersonalWorksheet = {
    id: uid('worksheet'), studentId: student.id, templateId: source.templateId, stage: student.stage, lang,
    context, source: source.source, fields: source.fields, generated: copy(source.fields), status: 'draft',
    versions: [{ version: 1, at: now(), reason: '개인 활동지 최초 생성', fields: copy(source.fields) }],
  };
  return { state: { ...state, personalWorksheets: [...state.personalWorksheets, worksheet] }, worksheet };
}
export interface ConnectionChoice { activityId?: string; legacyCardId?: string; newTitle?: string; allowNew?: boolean; kind?: number; lang?: string }
export function connectWorksheet(state: AppState, worksheetId: string, choice: ConnectionChoice): AppState {
  const worksheet = state.personalWorksheets.find((w) => w.id === worksheetId);
  if (!worksheet) throw new Error('연결할 개인 활동지를 확인하세요.');
  const student = studentById(state, worksheet.studentId);
  let existing = choice.activityId ? state.plannerActivities.find((a) => a.id === choice.activityId) : undefined;
  const legacy = choice.legacyCardId ? state.cards.find((c) => c.id === choice.legacyCardId) : undefined;
  if (choice.activityId && !existing) throw new Error('연결할 기존 활동을 확인하세요.');
  if (choice.legacyCardId && !legacy) throw new Error('재사용할 기존 카드를 확인하세요.');
  if (legacy) existing = state.plannerActivities.find((a) => a.legacyCardId === legacy.id) ?? existing;
  if (existing) {
    if (existing.studentId !== student.id) throw new Error('다른 학생의 활동에는 연결할 수 없습니다.');
    if (existing.worksheetIds.includes(worksheetId)) return state;
    const worksheetIds = [...existing.worksheetIds, worksheetId];
    const updated: PlannerActivity = {
      ...existing, worksheetIds, archived: false, status: 'draft',
      versions: [...existing.versions, {
        version: existing.versions.at(-1)!.version + 1, at: now(), reason: '기존 활동에 개인 활동지 연결',
        fields: copy(existing.fields), record: copy(existing.record), worksheetIds: [...worksheetIds],
      }],
    };
    return { ...state, plannerActivities: state.plannerActivities.map((a) => a.id === updated.id ? updated : a) };
  }
  if (legacy && legacy.studentId !== student.id) throw new Error('다른 학생의 카드는 재사용할 수 없습니다.');
  if (!legacy && !choice.allowNew) throw new Error('기존 활동 재사용 또는 새 활동 만들기를 먼저 선택하세요.');
  const kind = choice.kind ?? (legacy ? CARD_KINDS.indexOf(legacy.kind) : null);
  const lang = choice.lang ?? worksheet.lang;
  const f = legacy?.fields ?? generateFields(student, kind !== null && kind >= 0 ? kind : 1, lang);
  const title = choice.newTitle?.trim() || `${legacy?.kind ?? CARD_KINDS[kind ?? 1]} · ${student.job || worksheet.fields.title}`;
  const duplicate = state.plannerActivities.find((a) => !a.archived && a.studentId === student.id && a.fields.title === title && a.worksheetIds.includes(worksheetId));
  if (duplicate) return state;
  const record = emptyPerformance();
  const fields: PlannerFields = {
    title, goal: f.todayGoal, reason: '', job: f.job, date: '', minutes: student.minutes,
    scope: f.deliverable, firstAction: f.firstAction, steps: [...f.steps], help: [f.method, f.help].filter(Boolean),
    criterion: f.sharedCriterion || f.criterion, nextAction: '',
  };
  const activity: PlannerActivity = {
    id: uid('activity'), studentId: student.id, worksheetIds: [worksheetId], kind: kind !== null && kind >= 0 ? kind : null,
    ...(legacy ? { legacyCardId: legacy.id } : {}), lang, fields, generated: copy(fields), userOwnedKeys:choice.newTitle?.trim()?['title']:[], record, registration: { state: 'disconnected', events: [] },
    status: 'draft', versions: [{ version: 1, at: now(), reason: legacy ? '기존 카드 재사용 · 원본 별도 보존' : '연결 실행 카드 최초 생성', fields: copy(fields), record: copy(record), worksheetIds: [worksheetId] }],
  };
  return { ...state, plannerActivities: [...state.plannerActivities, activity] };
}
/** Deliberately does not overwrite old job cards, experiences, or any other student's material. */
export function generateMaterials(state: AppState, studentIds: string[], templateFamily: number, kinds: number[], lang: string, reuseLegacy: boolean): AppState {
  if (!studentIds.length) throw new Error('생성할 학생을 먼저 선택하세요.');
  if (new Set(studentIds).size !== studentIds.length) throw new Error('선택 학생이 중복되었습니다.');
  if (kinds.some((k) => !Number.isInteger(k) || k < 0 || k >= CARD_KINDS.length) || new Set(kinds).size !== kinds.length) throw new Error('카드 종류 선택을 확인하세요.');
  let next = state;
  for (const id of studentIds) {
    const student = studentById(next, id);
    const result = ensureWorksheet(next, student, templateFamily, lang);
    next = result.state;
    for (const kind of kinds) {
      const current = next.plannerActivities.find((a) => !a.archived && a.studentId === id && a.kind === kind && a.worksheetIds.includes(result.worksheet.id));
      if (current) continue;
      const job = generateFields(student, kind, lang).job;
      const reusable = next.plannerActivities.find((a) => !a.archived && a.studentId === id && a.kind === kind && a.fields.job === job);
      if (reusable) {
        if (!reuseLegacy) throw new Error('이미 만든 활동이 있습니다. 재사용 여부를 먼저 확인하세요.');
        next = connectWorksheet(next, result.worksheet.id, { activityId: reusable.id });
        continue;
      }
      const legacy = next.cards.find((c) => !c.archived && c.studentId === id && c.kind === CARD_KINDS[kind] && c.fields.job === job);
      if (legacy && !reuseLegacy) throw new Error('이미 만든 카드가 있습니다. 재사용 여부를 먼저 확인하세요.');
      next = connectWorksheet(next, result.worksheet.id, { kind, lang, legacyCardId: legacy?.id, allowNew: !legacy });
    }
  }
  return next;
}
export function saveWorksheet(state: AppState, id: string, fields: WorksheetFields, reason: string, status: 'draft' | 'confirmed'): AppState {
  const old = state.personalWorksheets.find((w) => w.id === id);
  if (!old) throw new Error('수정할 활동지를 확인하세요.');
  if (!reason.trim()) throw new Error('변경·확정 이유를 기록하세요.');
  if (!fields.title.trim() || !fields.reading.trim() || !fields.criterion.trim() || !fields.actions.length) throw new Error('제목·자료·수행 과제·제출 기준을 확인하세요.');
  const updated: PersonalWorksheet = {
    ...old, fields: copy(fields), status,
    versions: [...old.versions, { version: old.versions.at(-1)!.version + 1, at: now(), reason, fields: copy(fields) }],
  };
  return { ...state, personalWorksheets: state.personalWorksheets.map((w) => w.id === id ? updated : w) };
}
export function validatePerformance(record: PerformanceRecord): void {
  if (record.state === 'performed' && (!record.actual.trim() || !record.confirmedBy)) throw new Error('실제 수행 내용과 학생 또는 교사의 확인이 있어야 수행 기록으로 남길 수 있습니다.');
  if (record.state === 'performed' && record.source === 'paper' && !record.paperConfirmed) throw new Error('종이에서 옮긴 기록은 내용을 확인한 뒤 수행 기록으로 저장하세요.');
}
export function savePlanner(state: AppState, id: string, fields: PlannerFields, record: PerformanceRecord, reason: string, status: 'draft' | 'confirmed'): AppState {
  const old = state.plannerActivities.find((a) => a.id === id);
  if (!old) throw new Error('수정할 활동을 확인하세요.');
  if (!reason.trim()) throw new Error('변경·확정 이유를 기록하세요.');
  if (!fields.title.trim() || !fields.goal.trim() || !fields.firstAction.trim() || !fields.criterion.trim() || !Number.isFinite(fields.minutes) || fields.minutes <= 0) throw new Error('활동 제목·목표·첫 행동·완료 기준·예상 시간을 확인하세요.');
  validatePerformance(record);
  const updated: PlannerActivity = {
    ...old, fields: copy(fields), record: copy(record), status,
    registration: old.registration.state === 'registered' ? { ...old.registration, state: 'prepared' } : old.registration,
    versions: [...old.versions, { version: old.versions.at(-1)!.version + 1, at: now(), reason, fields: copy(fields), record: copy(record), worksheetIds: [...old.worksheetIds] }],
  };
  return { ...state, plannerActivities: state.plannerActivities.map((a) => a.id === id ? updated : a) };
}
export function markRegistration(activity: PlannerActivity, action: 'prepared' | 'copied' | 'exported' | 'manual-confirmed'): PlannerActivity {
  return { ...activity, registration: { ...activity.registration, state: action, events: [...activity.registration.events, { at: now(), state: action }] } };
}
/** Future adapter boundary, not a user action. Only a permission-checked successful server receipt can register. */
export function acceptRemoteRegistration(activity: PlannerActivity, receipt: RegistrationReceipt, connected: boolean): PlannerActivity {
  if (!connected || !receipt.remoteId.trim() || !Number.isFinite(Date.parse(receipt.savedAt)) || receipt.permissionVerified !== true) throw new Error('권한과 실제 저장 성공을 확인하기 전에는 플래너 등록 완료로 표시할 수 없습니다.');
  return { ...activity, registration: { state: 'registered', receipt: copy(receipt), events: [...activity.registration.events, { at: now(), state: 'registered' }] } };
}
export function plannerText(activity: PlannerActivity, worksheets: PersonalWorksheet[], student: Student): string {
  const f = activity.fields; const r = activity.record;
  const tr = (s: string) => tx(activity.lang, s);
  const field = (label: string, value: string | number) => `${tr(label)}: ${value}`;
  return [
    `${student.code} · ${activity.id} · v${activity.versions.at(-1)?.version}`, f.title,
    field('목표', f.goal), field('선택 이유', f.reason), field('관심 분야·직무', f.job),
    field('관련 개인 활동지', activity.worksheetIds.map((id) => `${id} ${worksheets.find((w) => w.id === id)?.fields.title ?? ''}`).join('\n')),
    field('날짜', f.date), field('예상 시간', `${f.minutes} ${tr('분')}`), field('범위', f.scope),
    field('첫 행동', f.firstAction), field('순서', f.steps.join('\n')), field('도움', f.help.join('\n')), field('완료 기준', f.criterion),
    field('기록 상태', tr(r.state === 'performed' ? '확인된 실제 수행' : r.state === 'in-progress' ? '진행 중' : '계획')),
    field('실제 한 일', r.actual), field('변경한 방법', r.changedMethod), field('결과물', r.artifact),
    field('피드백', r.feedback), field('다음 행동', r.nextAction || f.nextAction),
  ].join('\n');
}
