import { useSyncExternalStore } from 'react';
import type { Stage } from '@/data/worksheets';
import type { ReportInfo } from './domain';
import { setTxLang } from '@/i18n/tx';
import { blankTeaching, type TeachingConfig, type TeachingMode, type GroupingState } from './teaching';
import type { PersonalWorksheet, PlannerActivity, MaterialBundle } from './material-types';
import { blankStudio, type StudioState } from './studio/types';

export interface Student {
  id: string; code: string; stage: Stage; grade: string; major: string;
  family: string; job: string; task: string; report: ReportInfo;
  supports: string[]; practiceGoals: string[]; prior: string; minutes: number; teacherNote: string;
  cohort?: string;
  displayName?: string;
}
export interface CardFields {
  todayGoal: string; job: string; scenario: string; reading: string; firstAction: string; steps: string[];
  method: string; help: string; role: string; time: string; deliverable: string; criterion: string; checkIn: string;
  sharedGoal: string; sharedCriterion: string; kind: string;
  /** 'job-task' = from job bank; 'needs-confirmation' = no matching job task, teacher must review before confirm */
  source: string;
}
export interface CardVersion { version: number; at: string; reason: string; fields: CardFields }
export interface Card { id: string; studentId: string; kind: string; status: 'draft' | 'confirmed'; fields: CardFields; versions: CardVersion[]; printedVersions: number[]; archived?: boolean }
export interface ActivityChange { at: string; blockIndex: number; from: string; to: string; reason: string }
export interface SavedLesson {
  id: string; baseId: string; name: string; goal: string; classSize: number; groupSize: number; minutes: number;
  worksheets: string[]; blockTexts: Record<number, string>; changes: ActivityChange[]; savedAt: string; notes: string;
  institution?: string; cohort?: string; major?: string; interest?: string; mode?: TeachingMode; grouping?: GroupingState;
}
export interface Bundle { id: string; at: string; layout: 'A4' | 'A5x2'; cardIds: string[]; versions: Record<string, number>; label: string }
export interface Experience { id: string; studentId: string; period: 'weekly' | 'monthly'; text: string; confirmedByStudent: boolean; at: string }

export interface AppState {
  lang: string; stage: Stage; students: Student[]; cards: Card[]; lessons: SavedLesson[]; bundles: Bundle[]; experiences: Experience[];
  camp: TeachingConfig;
  legacyCamp?: unknown;
  personalWorksheets: PersonalWorksheet[]; plannerActivities: PlannerActivity[]; materialBundles: MaterialBundle[];
  studio: StudioState;
}

const KEY = 'feelgood-lesson-lab-v1';
const initial: AppState = { lang: 'ko', stage: 'middle', students: [], cards: [], lessons: [], bundles: [], experiences: [], camp: blankTeaching(), personalWorksheets: [], plannerActivities: [], materialBundles: [], studio: blankStudio() };

export function normalizeState(j: Partial<AppState>): AppState {
  const isCurrent = j.camp?.rulesVersion === '1.1';
  return {
    ...initial, ...j,
    studio: { ...blankStudio(), ...j.studio },
    camp: isCurrent ? { ...blankTeaching(j.camp?.target), ...j.camp, grouping: { ...blankTeaching().grouping, ...j.camp?.grouping } } : blankTeaching(j.stage),
    ...(!isCurrent && j.camp ? { legacyCamp: j.camp } : {}),
  };
}

function load(): AppState {
  try { const r = localStorage.getItem(KEY); if (r) return normalizeState(JSON.parse(r)); } catch { /* original storage remains untouched */ }
  return initial;
}
let state: AppState = load();
setTxLang(state.lang);
const subs = new Set<() => void>();
export function setState(fn: (s: AppState) => AppState) {
  const next = fn(state);
  // Never report successful saving if storage is blocked or full.
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {
    throw new Error('브라우저에 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인하고 기존 기록을 내보내세요.');
  }
  state = next;
  setTxLang(next.lang);
  subs.forEach((f) => f());
}
export const getState = () => state;
export function useApp<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => sel(state));
}
export const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
export const now = () => new Date().toISOString();

export function exportJSON() {
  const blob = new Blob([JSON.stringify({ app: 'FeelGood 수업설계LAB', rules: '1.5', exportedAt: now(), data: state }, null, 2)], { type: 'application/json' });
  download(blob, `lesson-lab-backup-${new Date().toISOString().slice(0, 10)}.json`);
}
export function importJSON(text: string) {
  const j = JSON.parse(text);
  const d = j.data ?? j;
  if (!Array.isArray(d.students)) throw new Error('형식이 맞지 않는 백업 파일입니다.');
  setState(() => normalizeState(d));
}
export function download(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export function resetAll() { setState(() => ({ ...initial, camp: blankTeaching(), lang: state.lang })); }
