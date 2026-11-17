import { now, uid, type AppState } from '../store';
import { fictionalStudents } from '../cards';
import { T } from '@/i18n/tx';
import type { Course, CourseDraft, StudioActor, ReportSnapshot, CompanyModel } from './types';

export const copy = (s: AppState): AppState => structuredClone(s);
export const needed = (value: string, label: string) => { if (!value.trim()) throw new Error(`${label}: ${T('필수 정보를 입력하세요.')}`); };
export const finite = (n: number, min: number, max: number) => { if (!Number.isFinite(n) || n < min || n > max) throw new Error(T('숫자 범위를 확인하세요.')); };
export function requireCourse(s: AppState, id: string): Course {
  const c = s.studio.courses.find((x) => x.id === id);
  if (!c) throw new Error(T('수업을 먼저 선택하세요.'));
  const a = s.studio.actor;
  const allowed = a.role === 'teacher' ? a.id === c.ownerId : a.role === 'student' ? c.studentIds.includes(a.id) : c.counseling.counselors.some((x) => x.id === a.id);
  if (!allowed) throw new Error(T('담당 수업 또는 배정된 학생의 자료만 확인할 수 있습니다.'));
  return c;
}
export function requireTeacher(s: AppState, c: Course) {
  if (s.studio.actor.role !== 'teacher' || s.studio.actor.id !== c.ownerId) throw new Error(T('담당 교사만 수업을 변경할 수 있습니다.'));
}
export function requireStudent(s: AppState, courseId: string, studentId: string, onlySelf = false) {
  const c = requireCourse(s, courseId);
  if (!c.studentIds.includes(studentId)) throw new Error(T('이 수업에 배정되지 않은 학생입니다.'));
  const a = s.studio.actor;
  if (a.role === 'student' && a.id === studentId) return c;
  if (!onlySelf && a.role === 'teacher' && a.id === c.ownerId) return c;
  throw new Error(T('학생 본인의 선택과 사실 확인이 필요합니다.'));
}
export function visibleCourses(s: AppState) {
  return s.studio.courses.filter((c) => {
    try { requireCourse(s, c.id); return true; } catch { return false; }
  });
}
export function switchActor(s: AppState, actor: StudioActor) {
  const n = copy(s); n.studio.actor = actor;
  if (!visibleCourses(n).some((c) => c.id === n.studio.activeCourseId)) n.studio.activeCourseId = visibleCourses(n)[0]?.id ?? '';
  return n;
}
export function defaultCourse(stage: CourseDraft['stage']): CourseDraft {
  return { name: T('새 수업'), stage, period: 'day', preset: '180', testMinutes: 0, sessions: 1, sessionMinutes: 180,
    startDate: new Date().toISOString().slice(0, 10), startTime: '09:00', studentIds: [], mode: 'individual' };
}
export function createCourse(s: AppState, input: CourseDraft): AppState {
  if (s.studio.actor.role !== 'teacher') throw new Error(T('담당 교사만 수업을 만들 수 있습니다.'));
  needed(input.name, T('수업 이름')); finite(input.testMinutes, 0, 240);
  const n = copy(s), id = uid('course');
  const sessions = input.period === 'day' ? 1 : input.period === 'month' ? 4 : input.period === 'two-month' ? 8 : input.sessions;
  finite(sessions, 1, 52);
  const minutes = input.period === 'day' ? Number(input.preset.slice(0, 3)) : input.sessionMinutes;
  finite(minutes, 45, 600);
  const c: Course = { ...input, id, ownerId: s.studio.actor.id, createdAt: now(), updatedAt: now(), institution: '',
    studentIds: [...new Set(input.studentIds)], sessions, sessionMinutes: minutes,
    mode: input.period === 'day' ? 'individual' : input.mode,
    tools: ['종이', '펜'], taskFramework: T('고객 문제 해결'), readingCandidates: '', supportMaterials: '',
    autoApprove: true, maxMissionMinutes: input.preset === '180' ? 25 : 40,
    affiliations: {}, seats: {}, jobGroups: {}, jointGroups: {}, groupingConfirmed: false, sessionDates: [],
    counseling: { counselors: [], blocks: [], conversation: 8, handover: 2, absences: [], deadline: 0 },
  };
  for (const sid of c.studentIds) if (!s.students.some((x) => x.id === sid && x.stage === c.stage)) throw new Error(T('학생의 교육단계와 수업 배정을 확인하세요.'));
  const date = new Date(`${input.startDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error(T('시작 날짜를 확인하세요.'));
  c.sessionDates = Array.from({ length: sessions }, (_, i) => new Date(date.getTime() + i * 7 * 86400000).toISOString().slice(0, 10));
  n.studio.courses.unshift(c); n.studio.activeCourseId = id; n.stage = c.stage;
  const agenda = buildAgenda(c);
  const interview = agenda.filter((x) => x.id.includes('consult'));
  c.counseling.blocks = interview.map((x) => ({ start: x.start, end: x.end }));
  c.counseling.deadline = agenda.filter((x) => x.id.includes('revise') || x.id.includes('writing')).at(-1)?.end ?? minutes;
  return n;
}
export function updateCourse(s: AppState, id: string, patch: Partial<Course>): AppState {
  const c = requireCourse(s, id); requireTeacher(s, c);
  const n = copy(s), target = n.studio.courses.find((x) => x.id === id)!;
  const merged = { ...target, ...patch, id: target.id, ownerId: target.ownerId, createdAt: target.createdAt, updatedAt: now() };
  finite(merged.testMinutes, 0, 240); finite(merged.sessions, 1, 52); finite(merged.sessionMinutes, 45, 600);
  finite(merged.maxMissionMinutes, 1, 300);
  if (merged.period === 'day') merged.mode = 'individual';
  if (merged.studentIds.some((sid) => !s.students.some((x) => x.id === sid && x.stage === merged.stage))) throw new Error(T('학생의 교육단계를 확인하세요.'));
  for (const groups of [merged.affiliations, merged.seats, merged.jobGroups, merged.jointGroups]) {
    if (Object.keys(groups).some((sid) => !merged.studentIds.includes(sid))) throw new Error(T('편성에 대상이 아닌 학생이 포함되어 있습니다.'));
  }
  if (merged.period === 'day' && merged.groupingConfirmed && (Object.values(merged.jobGroups).some(Boolean) || Object.values(merged.jointGroups).some(Boolean))) throw new Error(T('하루 수업은 공동 프로젝트를 확정하지 않습니다. 좌석과 개인 미션은 유지됩니다.'));
  if (merged.counseling.conversation <= 0 || merged.counseling.handover < 0) throw new Error(T('면담 시간과 교대 시간을 확인하세요.'));
  for (const r of [...merged.counseling.blocks, ...merged.counseling.absences, ...merged.counseling.counselors.flatMap((x) => x.available)]) {
    if (!Number.isFinite(r.start) || !Number.isFinite(r.end) || r.end <= r.start) throw new Error(T('가능 시간의 시작과 끝을 확인하세요.'));
  }
  // Do not silently invalidate booked appointments when a teacher edits the timetable.
  const probe = { ...n, studio: { ...n.studio, courses: n.studio.courses.map((x) => x.id === id ? merged : x) } };
  const valid = rawSlots(probe, merged);
  for (const b of n.studio.bookings.filter((x) => x.courseId === id && x.status === 'booked')) {
    if (!valid.some((x) => x.counselorId === b.counselorId && x.start === b.start && x.end === b.end && x.available)) throw new Error(T('기존 면담 예약과 충돌합니다. 예약을 먼저 변경하거나 취소하세요.'));
  }
  n.studio.courses[n.studio.courses.findIndex((x) => x.id === id)] = merged;
  return n;
}
export function addDemoRoster(s: AppState, id: string, count: number) {
  const c = requireCourse(s, id); requireTeacher(s, c); finite(count, 1, 100);
  const n = copy(s);
  const students = fictionalStudents(Math.floor(count), c.stage).map((x, i) => ({ ...x, code: `${T('가상')}-${n.students.length + i + 1}`, cohort: c.name }));
  n.students.push(...students); n.studio.courses.find((x) => x.id === id)!.studentIds.push(...students.map((x) => x.id));
  return n;
}
export function saveReport(s: AppState, report: ReportSnapshot) {
  const c = visibleCourses(s).find((x) => x.studentIds.includes(report.studentId));
  if (!c) throw new Error(T('담당 수업 학생이 아닙니다.')); requireTeacher(s, c);
  if (report.scores) Object.values(report.scores).forEach((v) => finite(v, 0, 100));
  if (report.top5.length > 5) throw new Error(T('TOP5 원본 순서와 최대 다섯 항목을 확인하세요.'));
  if (report.confirmed) { needed(report.test, T('검사명')); needed(report.version, T('결과지 버전')); needed(report.scale, T('척도')); needed(report.date, T('시행일')); }
  const n = copy(s), at = now();
  const previous = n.studio.reports.find((x) => x.studentId === report.studentId);
  const history = n.studio.reportHistory ?? [];
  const revision = Math.max(previous?.revision ?? (previous ? 1 : 0), ...history.filter((x) => x.studentId === report.studentId).map((x) => x.revision ?? 1), 0) + 1;
  if (previous) history.push({ ...structuredClone(previous), snapshotId: previous.snapshotId ?? uid('report'),
    revision: previous.revision ?? 1, ...(!previous.savedAt ? { capturedAt: at } : {}) });
  // Legacy data has no invented save date or missing pre-existing versions.
  const value = { ...structuredClone(report), snapshotId: uid('report'), revision, savedAt: at, connected: false };
  delete value.capturedAt;
  n.studio.reportHistory = history;
  n.studio.reports = [...n.studio.reports.filter((x) => x.studentId !== report.studentId), value];
  return n;
}
export function visibleReports(s: AppState, id: string) {
  const c = requireCourse(s, id);
  if (s.studio.actor.role === 'counselor') return [];
  return s.studio.reports.filter((x) => c.studentIds.includes(x.studentId) && (s.studio.actor.role === 'teacher' || x.studentId === s.studio.actor.id));
}
export function saveCompany(s: AppState, model: CompanyModel) {
  const c = requireCourse(s, s.studio.activeCourseId); requireTeacher(s, c);
  needed(model.job, T('직무')); needed(model.source, T('자료 출처')); needed(model.checkedAt, T('확인일')); needed(model.version, T('버전'));
  if (model.sourceKind === 'official' && !model.officialEvidence.trim()) throw new Error(T('URL이나 교사 확인만으로 공식 자료로 분류할 수 없습니다. 공식 발행 근거를 기록하세요.'));
  if (model.sourceKind === 'approved-model' && (!model.educationAllowed || !model.approvalReceipt.trim())) throw new Error(T('교육 공유 승인 근거가 필요합니다. 화면상 확정은 서버 승인이 아닙니다.'));
  const n = copy(s), value = { ...model, id: model.id || uid('source'), changedAt: now() };
  n.studio.companies = [...n.studio.companies.filter((x) => x.id !== value.id), value]; return n;
}

import { buildAgenda } from './curriculum';
import { rawSlots } from './schedule';
