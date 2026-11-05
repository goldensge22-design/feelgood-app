import type { Stage } from '@/data/worksheets';

export interface WorksheetFields {
  title: string; goal: string; job: string; readingTitle: string; reading: string;
  questions: string[]; actions: string[]; help: string[]; deliverable: string; criterion: string; answer: string;
}
export interface WorksheetVersion { version: number; at: string; reason: string; fields: WorksheetFields }
export interface PersonalWorksheet {
  id: string; studentId: string; templateId: string; stage: Stage; lang: string;
  context: { family: string; job: string; task: string }; source: 'job-task' | 'general-review';
  status: 'draft' | 'confirmed'; fields: WorksheetFields; versions: WorksheetVersion[]; archived?: boolean;
  generated?: WorksheetFields;
  /** Frozen app baseline, never a translation of user edits or quoted source material. */
  protectedText?: string[];
  userOwnedKeys?: string[];
}
export interface PlannerFields {
  title: string; goal: string; reason: string; job: string; date: string; minutes: number; scope: string;
  firstAction: string; steps: string[]; help: string[]; criterion: string; nextAction: string;
}
export interface PerformanceRecord {
  state: 'planned' | 'in-progress' | 'performed'; actual: string; changedMethod: string;
  artifact: string; feedback: string; nextAction: string;
  confirmedBy: '' | 'teacher' | 'student'; source: 'screen' | 'paper'; paperConfirmed: boolean;
}
export interface RegistrationReceipt { remoteId: string; savedAt: string; permissionVerified: boolean }
export interface PlannerRegistration {
  state: 'disconnected' | 'prepared' | 'copied' | 'exported' | 'manual-confirmed' | 'registered';
  events: { at: string; state: string }[]; receipt?: RegistrationReceipt;
}
export interface PlannerVersion {
  version: number; at: string; reason: string; fields: PlannerFields; record: PerformanceRecord; worksheetIds: string[];
}
export interface PlannerActivity {
  id: string; studentId: string; worksheetIds: string[]; kind: number | null; legacyCardId?: string; lang: string;
  fields: PlannerFields; record: PerformanceRecord; registration: PlannerRegistration;
  status: 'draft' | 'confirmed'; versions: PlannerVersion[]; archived?: boolean;
  generated?: PlannerFields;
  protectedText?: string[];
  userOwnedKeys?: string[];
}
export type MaterialPrintMode = 'worksheets' | 'cards' | 'both';
export type CardLayout = 'A4' | 'A5x2';
export interface MaterialBlock {
  label: string; text: string; /** Blank writing space; persisted answers are separate from this space. */ writingLines?: number;
}
export interface MaterialPanel {
  type: 'worksheet' | 'card'; documentId: string; studentId: string; code: string; name?: string;
  title: string; kindLabel?: string; links: string[]; version: number; segment: number; segments: number; blocks: MaterialBlock[];
}
export interface MaterialPage {
  studentId: string; code: string; studentPage: number; studentPages: number; globalPage: number;
  layout: 'worksheet' | CardLayout; panels: MaterialPanel[];
  language?: string;
}
export interface MaterialCounts { students: number; worksheets: number; cards: number; outputs: number; sheets: number; panels: number }
export interface MaterialBundle {
  id: string; at: string; mode: MaterialPrintMode; layout: CardLayout; studentIds: string[];
  pages: MaterialPage[]; counts: MaterialCounts;
  state: 'prepared' | 'print-requested'; printRequests: string[];
  language?: string;
}
