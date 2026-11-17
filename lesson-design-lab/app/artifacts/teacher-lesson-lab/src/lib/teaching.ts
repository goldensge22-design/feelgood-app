import type { Stage } from '@/data/worksheets';
import type { Student } from './store';

export type TeachingMode = 'one-to-one' | 'individual' | 'group' | 'mixed';
export const MODE_LABELS: Record<TeachingMode, string> = {
  'one-to-one': '1:1 지도', individual: '개별 수행 수업', group: '조별 수업', mixed: '혼합 수업',
};
export type GroupGoal = 'interest-mission' | 'diverse-methods' | 'similar-supports';
export interface TeachingGroup { id: string; name: string; studentIds: string[] }
export interface GroupingState {
  goal: GroupGoal; capacity: number; fixed: Record<string, string>;
  draft: TeachingGroup[]; confirmed: TeachingGroup[];
  history: { at: string; reason: string; groups: TeachingGroup[] }[];
}
export interface SessionBlock { id: string; title: string; minutes: number; isBreak: boolean }
export interface TeachingConfig {
  rulesVersion: '1.1'; example: 'none' | 'hanseo'; institution: string; cohort: string;
  target: Stage; major: string; interest: string; goal: string; mode: TeachingMode;
  students: number; minutes: number; cardsPer: number; kinds: number[]; tracks: string[];
  sessions: SessionBlock[]; grouping: GroupingState;
}
export function blankGrouping(): GroupingState {
  return { goal: 'interest-mission', capacity: 4, fixed: {}, draft: [], confirmed: [], history: [] };
}
export function blankTeaching(target: Stage = 'middle'): TeachingConfig {
  return {
    rulesVersion: '1.1', example: 'none', institution: '', cohort: '', target,
    major: '', interest: '', goal: '', mode: 'individual', students: 0,
    minutes: 0, cardsPer: 0, kinds: [], tracks: [], sessions: [], grouping: blankGrouping(),
  };
}
/** Creates a new value each time. Loading an example must never mutate shared content. */
export function hanseoExample(): TeachingConfig {
  return {
    ...blankTeaching('university'), example: 'hanseo', institution: '한서대학교',
    goal: '각자 선택한 직무의 개인 미션 수행과 경험 기록',
    students: 50, minutes: 230, cardsPer: 4, kinds: [0, 1, 2, 3],
    tracks: ['공항', '항공사', '보안·물류'],
    sessions: [
      { id: 'h1', title: '공통 안내 · 결과지·관심 직무 확인과 개인 계획', minutes: 50, isBreak: false },
      { id: 'b1', title: '휴식', minutes: 10, isBreak: true },
      { id: 'h2', title: '각자 선택한 직무 자료 탐색과 개인 미션 첫 실행', minutes: 50, isBreak: false },
      { id: 'b2', title: '휴식', minutes: 10, isBreak: true },
      { id: 'h3', title: '개인 산출물 피드백·재실행과 경험 기록', minutes: 50, isBreak: false },
      { id: 'b3', title: '휴식', minutes: 10, isBreak: true },
      { id: 'h4', title: '개인 경험 설명·전문가 질문과 다음 실행', minutes: 50, isBreak: false },
    ],
  };
}
export const usesGroups = (mode: TeachingMode) => mode === 'group' || mode === 'mixed';
export function validateGroups(students: Student[], groups: TeachingGroup[], capacity: number, fixed: Record<string, string> = {}): string[] {
  const errors: string[] = [];
  const known = new Set(students.map((s) => s.id));
  const seen = new Set<string>();
  if (!Number.isInteger(capacity) || capacity < 1) errors.push('조별 인원은 1 이상의 정수여야 합니다.');
  if (new Set(groups.map((g) => g.id)).size !== groups.length) errors.push('조 식별자가 중복되었습니다.');
  groups.forEach((g) => {
    if (g.studentIds.length > capacity) errors.push('조별 인원이 정원을 초과했습니다.');
    g.studentIds.forEach((id) => {
      if (!known.has(id)) errors.push('명단에 없는 학생이 배치되었습니다.');
      if (seen.has(id)) errors.push('같은 학생이 중복 배치되었습니다.');
      seen.add(id);
      if (fixed[id] && fixed[id] !== g.id) errors.push('고정 배치 조건과 충돌합니다.');
    });
  });
  if (students.some((s) => !seen.has(s.id))) errors.push('아직 배치되지 않은 학생이 있습니다.');
  if (Object.keys(fixed).some((id) => !known.has(id))) errors.push('고정 배치에 명단에 없는 학생이 있습니다.');
  return [...new Set(errors)];
}

/** Proposal only: never modifies students, cards, experiences, or confirmed assignments. */
export function proposeGroups(
  students: Student[], mode: TeachingMode, goal: GroupGoal, capacity: number,
  fixed: Record<string, string> = {}, existing: TeachingGroup[] = [],
): { groups: TeachingGroup[]; errors: string[] } {
  if (!usesGroups(mode)) return { groups: [], errors: ['조별·혼합 수업의 조별 단계에서만 편성할 수 있습니다.'] };
  if (!Number.isInteger(capacity) || capacity < 1 || !students.length) return { groups: [], errors: ['학생 명단과 조별 인원을 확인하세요.'] };
  if (new Set(students.map((s) => s.id)).size !== students.length) return { groups: [], errors: ['학생 명단의 식별자가 중복되었습니다.'] };
  if (Object.keys(fixed).some((id) => !students.some((s) => s.id === id))) return { groups: [], errors: ['고정 배치에 명단에 없는 학생이 있습니다.'] };
  const ids = [...new Set([...Object.values(fixed), ...existing.map((g) => g.id)])];
  const count = Math.max(Math.ceil(students.length / capacity), ids.length);
  const used = new Set(ids);
  let sequence = 1;
  const groups: TeachingGroup[] = Array.from({ length: count }, (_, i) => {
    let id = ids[i];
    if (!id) {
      while (used.has(`group-${sequence}`)) sequence++;
      id = `group-${sequence++}`; used.add(id);
    }
    return { id, name: existing.find((g) => g.id === id)?.name ?? `조 ${i + 1}`, studentIds: [] };
  });
  for (const s of students) if (fixed[s.id]) groups.find((g) => g.id === fixed[s.id])!.studentIds.push(s.id);
  if (groups.some((g) => g.studentIds.length > capacity)) return { groups, errors: ['고정 배치 인원이 조별 정원을 초과합니다.'] };
  const method = (s: Student) => [...s.supports, ...s.practiceGoals].sort().join('|');
  const key = (s: Student) => goal === 'interest-mission' ? `${s.family}|${s.job}|${s.task}` : method(s);
  const remaining = students.filter((s) => !fixed[s.id]).sort((a, b) => key(a).localeCompare(key(b)) || a.code.localeCompare(b.code));
  for (const s of remaining) {
    const score = (g: TeachingGroup) => {
      const matches = g.studentIds.filter((id) => key(students.find((x) => x.id === id)!) === key(s)).length;
      return (goal === 'diverse-methods' ? -matches : matches) * 100 - g.studentIds.length;
    };
    const available = groups.filter((g) => g.studentIds.length < capacity).sort((a, b) => score(b) - score(a));
    available[0].studentIds.push(s.id);
  }
  return { groups, errors: validateGroups(students, groups, capacity, fixed) };
}
