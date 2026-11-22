import type { UniversityProgram } from './universities';

export type Grade = '' | 'middle' | 'high';
export type Fit = '' | 'similar' | 'partial' | 'unsure';
export type StrengthKind = 'test' | 'self';

export interface Strength { id: string; text: string; kind: StrengthKind; fit: Fit; note: string }
export interface TestResult {
  id: string; name: string; date: string; results: string; features: string;
  inputMethod: 'manual' | 'image' | 'pdf-manual'; strengths: Strength[]; updatedAt: string;
}
export interface Interest { id: string; text: string; reason: string }
export type FieldStatus = 'interested' | 'hold' | 'not';
export interface FieldMark { status: FieldStatus; note: string; date: string }

export interface UniLink {
  id: string; majorId: string; university: string; country: string; url: string;
  note: string; verified: boolean; verifiedDate: string;
  region?: string; countryCode?: string; programOriginal?: string; universityOriginal?: string;
  degreeLevel?: 'associate' | 'bachelor' | 'master' | 'doctorate' | 'other' | 'unknown';
  teachingLanguages?: string[]; sourceLanguage?: string; academicVersion?: string;
}

export interface Job { id: string; title: string; type: 'job' | 'role' | 'startup'; why: string }
export interface Design {
  majorCompetencies: string; connection: string; jobs: Job[];
  startup: { target: string; problem: string; idea: string; experiment: string };
  futurePath: string; toLearn: string; updatedAt: string;
}

export type ActStatus = 'planned' | 'doing' | 'done' | 'hold';
export type SourceType = 'field' | 'major' | 'program' | 'role' | 'self';
export interface Todo { id: string; text: string; done: boolean; productSource?:string }
export interface ProgramProvenance {
  programId: string; universityOriginal: string; programOriginal: string;
  sources: { url: string; academicVersion: string; checkedAt: string; language: string; status: string }[];
}
export interface Activity {
  titleSource?:string; artifactSource?:string;
  support?: SupportDraft;
  simulation?: import('./activity-assistance').SimulationTask;
  practiceLinks?: PracticeLink[];
  productProvided?: boolean;
  id: string; title: string; kind: string; date: string; durationMin: number; purpose: string;
  todos: Todo[]; artifact: string; sourceType: SourceType; sourceId: string; sourceLabel: string;
  status: ActStatus; createdAt: string; updatedAt: string;
  sourceSnapshot?: ProgramProvenance;
}
export interface Reflection {
  support?: SupportDraft;
  practiceCardKeys?: string[];
  storySelected?: boolean;
  practiceMode?: 'everyday' | 'simulation';
  executionId?: string;
  confirmation?: { status: 'pending' | 'confirmed'; fingerprint: string; at: string };
  reviewHistory?: { at: string; previousFingerprint: string }[];
  id: string; activityId: string; title: string; date: string; did: string; role: string; fun: string;
  hard: string; learned: string; question: string; next: string; links: string[]; photo: string;
  direction: '' | 'more' | 'same' | 'less' | 'changed'; createdAt: string; updatedAt: string;
}
export interface StoryParagraph {
  displayParts?: ProductMessage[];
  preserveOriginals?: string[];
  headingAuthored?: boolean;
  id: string; heading: string; text: string; evidence: string[];
  origin?: 'manual' | 'example-template' | 'server-ai-proposal';
}
export interface ProductMessage { source: string; values: (string | ProductMessage)[]; separator?: string }
export interface StoryVersion { id: string; createdAt: string; label: string; paragraphs: StoryParagraph[]; writingLanguage?: string }
export interface QuestionResponse { id:string; question:string; answer:string; productSource?:string; productValues?:string[] }
export interface SupportDraft { scope:string; scopeSource?:string; questions:QuestionResponse[] }
export interface Story { support?:SupportDraft; paragraphs: StoryParagraph[]; versions: StoryVersion[]; basedAt: string; writingLanguage?: string }

export interface LabState {
  explorationSupport?: SupportDraft;
  practiceCards?: Record<string, PracticeCard>;
  /** IDs and decisions only: never cache copied grades or deleted reflection text. */
  recommendationHistory?: Record<string, { origin: 'initial' | 'experience'; discoveredAt: string; decision: 'active' | 'hold' | 'hidden'; overrideDismissal?: boolean; reviewedDismissals?: string }>;
  /** Free-form edits are never translated, including edits to product examples. */
  authoredPaths?: string[];
  v: 1; grade: Grade; welcomed: boolean;
  mapViewedAt?: string;
  sourceUpdatedAt?: string;
  tests: TestResult[]; interests: Interest[]; activityAnswers: Record<string, string>; statement: string;
  fields: Record<string, FieldMark>; savedMajors: string[]; compare: string[]; tempMajor: string;
  tempHistory: { majorId: string; date: string }[]; uniLinks: UniLink[]; design: Design;
  savedPrograms?: string[]; comparePrograms?: string[]; tempProgram?: string;
  /** Only explicitly opened/saved public catalogue records, never the full dataset. */
  publicPrograms?: UniversityProgram[];
  activities: Activity[]; reflections: Reflection[]; story: Story;
}

export interface PracticeCard {
  simulation?: import('./activity-assistance').SimulationTask;
  id: string; version: string; text: string; sourceType: SourceType; sourceId: string; sourceLabel: string;
  sourceSnapshot?: ProgramProvenance;
}
export interface PracticeLink {
  support?: SupportDraft;
  simulation?: import('./activity-assistance').SimulationTask;
  cardKey: string; strengthIds: string[]; interestIds: string[]; majorId: string;
  method: 'original' | 'observe' | 'listen' | 'make' | 'read';
  scope: string; mode: 'everyday' | 'simulation'; linkedAt: string;
}

export const emptyState = (): LabState => ({
  v: 1, grade: '', welcomed: false, tests: [], interests: [], activityAnswers: {}, statement: '',
  fields: {}, savedMajors: [], compare: [], tempMajor: '', tempHistory: [], uniLinks: [],
  design: { majorCompetencies: '', connection: '', jobs: [], startup: { target: '', problem: '', idea: '', experiment: '' }, futurePath: '', toLearn: '', updatedAt: '' },
  activities: [], reflections: [], story: { paragraphs: [], versions: [], basedAt: '' },
});

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
export const now = () => new Date().toISOString();
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export const statusLabel: Record<ActStatus, string> = { planned: '예정', doing: '진행 중', done: '완료', hold: '보류' };
export const fitLabel: Record<Fit, string> = { '': '아직 판단 안 함', similar: '비슷해요', partial: '일부만 맞아요', unsure: '잘 모르겠어요' };
export const fieldStatusLabel: Record<FieldStatus, string> = { interested: '탐색 중', hold: '보류', not: '흥미 없음' };
export const gradeLabel: Record<Grade, string> = { '': '선택 안 함', middle: '중학생', high: '고등학생' };
