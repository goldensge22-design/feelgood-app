import type { Stage } from '@/data/worksheets';

export type StudioRole = 'teacher' | 'student' | 'counselor';
export interface StudioActor { role: StudioRole; id: string }
export interface TimeRange { start: number; end: number }
export interface Counselor { id: string; name: string; lead: boolean; available: TimeRange[] }
export interface CounselingConfig {
  counselors: Counselor[]; blocks: TimeRange[]; conversation: number; handover: number;
  absences: TimeRange[]; deadline: number;
}
export interface CourseDraft {
  name: string; stage: Stage; period: 'day' | 'month' | 'two-month' | 'custom';
  preset: '180' | '240' | '300' | '300-counseling';
  testMinutes: number; sessions: number; sessionMinutes: number; startDate: string; startTime: string;
  studentIds: string[]; mode: 'individual' | 'job-group' | 'joint' | 'mixed';
}
export interface Course extends CourseDraft {
  id: string; ownerId: string; createdAt: string; updatedAt: string; institution: string;
  counseling: CounselingConfig; sessionDates: string[]; tools: string[];
  taskFramework: string; readingCandidates: string; supportMaterials: string;
  autoApprove: boolean; maxMissionMinutes: number;
  affiliations: Record<string, string>; seats: Record<string, string>; jobGroups: Record<string, string>; jointGroups: Record<string, string>;
  groupingConfirmed: boolean;
}
export interface AgendaRow {
  id: string; phase: string; minutes: number; start: number; end: number; session: number;
  program: string; screen: string; teacher: string; student: string; deliverable: string; completion: string; alternative: string;
}
export interface ReportSnapshot {
  snapshotId?: string; revision?: number; savedAt?: string; capturedAt?: string;
  studentId: string; kind: 'accuracy-percent' | 'demo-normalized';
  scores: { P: number; A: number; S: number; Q: number } | null;
  pattern: string; top5: { title: string; reason: string }[];
  test: string; date: string; scale: string; version: string; connected: boolean; confirmed: boolean;
}
export type SourceKind = 'official' | 'approved-model' | 'teacher-example' | 'student-research' | 'fictional';
export interface CompanyModel {
  id: string; company: string; job: string; duties: string; behaviors: string[];
  knowledge: string; skills: string; attitudes: string; verification: string;
  sourceKind: SourceKind; source: string; checkedAt: string; version: string;
  educationAllowed: boolean; officialEvidence: string; approvalReceipt: string;
  revoked: boolean; changedAt: string;
}
export interface ExplorationInput {
  job: string; companyId: string; question: string; duties: string; reason: string; outsideReason: string;
  source: string; behavior: string; remaining: number; tools: string[]; supports: string[];
}
export interface Exploration extends ExplorationInput { id: string; courseId: string; studentId: string; at: string; sourceVersion?: string; sourceUpdatedAt?: string; status: 'exploring' | 'candidates-ready' | 'selected' }
export interface Candidate {
  reportRank?: number;
  id: string; title: string; reason: string; reading: string; actions: string[]; minutes: number;
  deliverable: string; criterion: string; help: string[]; behavior: string; simulation: boolean;
}
export interface Mission {
  /** Frozen at selection; undefined = unrecorded historical basis, null = no report. */
  reportBasis?: ReportSnapshot | null;
  id: string; courseId: string; studentId: string; explorationId: string; candidate: Candidate;
  goal: string; firstAction: string; scopeConfirmed: boolean;
  selection: { job: string; companyId: string; reason: string; source: string; behavior: string };
  status: 'student-selected' | 'review-needed' | 'confirmed' | 'planner-registered' | 'in-progress' | 'partial' | 'performed' | 'experience-confirmed';
  reviewReasons: string[]; reviewNote: string; plannerId: string; worksheetId: string;
  registration: 'unregistered' | 'failed' | 'local'; remoteRegistered: false;
  helpRequest: string; record: { actual: string; result: string; reflection: string; evidence: string; changed: string };
  simulation: boolean; studentConfirmed: boolean; updatedAt: string;
  versions: { number: number; at: string; goal: string; firstAction: string; candidate: Candidate; record: Mission['record']; reason: string }[];
  parentId?: string;
}
export interface ConfirmedFact {
  id: string; courseId: string; studentId: string; missionId?: string;
  action: string; result: string; learning: string; evidence: string; simulation: boolean; studentConfirmed: boolean; at: string;
}
export interface WritingVersion {
  number: number; text: string; at: string; reviewed: boolean; factIds: string[]; confirmedFactIds: string[];
}
export interface ExtraFact { id: string; text: string; confirmed: boolean; rejected: boolean }
export interface Writing {
  id: string; courseId: string; studentId: string; question: string; job: string; limit: number;
  factIds: string[]; selectedFacts: { action: boolean; result: boolean; learning: boolean };
  requirements: string; versions: WritingVersion[]; draft: string;
  sharing: { v1: boolean; versions?: boolean; experiences: boolean; requirements: boolean; counselorIds: string[]; at: string };
  status: 'draft-saved' | 'scheduled' | 'consulted' | 'facts-confirmed' | 'revising' | 'student-final';
  questions: string[]; factCandidates: ExtraFact[]; expressionSuggestions: string;
  checklist: { response: boolean; ownAction: boolean; evidence: boolean; jobLink: boolean; facts: boolean; reviewed: boolean };
  createdAt: string; updatedAt: string;
  sourceStates: { id: string; version: string; changedAt: string }[];
}
export interface WritingInput {
  courseId: string; studentId: string; question: string; job: string; limit: number; factIds: string[];
  selectedFacts: Writing['selectedFacts']; requirements: string; text: string;
}
export interface Booking {
  id: string; courseId: string; writingId: string; studentId: string; counselorId: string;
  start: number; end: number; status: 'booked' | 'completed' | 'cancelled';
}
export interface MockInterview {
  id: string; writingId: string; kind: 'experience' | 'hypothetical'; question: string; answer: string;
  followUp: string; feedback: string; reanswer: string; additionalFact: string; factConfirmed: boolean; at: string;
}
export interface StudioState {
  version: '1.5'; actor: StudioActor; activeCourseId: string;
  courses: Course[]; reports: ReportSnapshot[]; reportHistory?: ReportSnapshot[]; companies: CompanyModel[]; explorations: Exploration[];
  missions: Mission[]; facts: ConfirmedFact[]; writings: Writing[]; bookings: Booking[]; interviews: MockInterview[];
  practices: { courseId: string; studentId: string; plannerId: string; goal: string; actual: string; reflection: string; done: boolean; at: string }[];
  followups: { courseId: string; studentId: string; text: string; at: string; versions?: { text: string; at: string }[] }[];
  groupWorks: { id:string; courseId:string; kind:'job-group'|'joint'; group:string; studentIds:string[]; task:string; artifact:string; versions:{number:number;task:string;artifact:string;studentIds:string[];at:string}[] }[];
}
export const blankStudio = (): StudioState => ({
  reportHistory: [],
  version: '1.5', actor: { role: 'teacher', id: 'teacher-demo' }, activeCourseId: '',
  courses: [], reports: [], companies: [], explorations: [], missions: [], facts: [], writings: [], bookings: [], interviews: [], practices: [], followups: [], groupWorks: [],
});
