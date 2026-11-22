import type { CareerExperience } from '@workspace/api-client-react';
import { clientStorage } from './public-demo';
import type { LabConnection } from './review-lab-analysis';

export type StorySections = [string, string, string, string];
type EvidenceSource = {id:string;revision:number};
type StoryInterest = {company:string;job:string;source:string;synthetic:boolean;lab?:LabConnection};
export interface StoryVersion {
  id: string;
  at: string;
  experienceId: string;
  sections: StorySections;
  company: string;
  job: string;
  keyword: string;
  sourceRevision: string;
  evidenceKey?: string;
  evidenceSources?: EvidenceSource[];
  reviewInterest?: StoryInterest;
}
export interface StoryboardDraft {
  id: string;
  experienceId: string;
  company: string;
  job: string;
  keyword: string;
  sections: StorySections;
  sourceRevision: string;
  evidenceKey?: string;
  evidenceSources?: EvidenceSource[];
  reviewInterest?: StoryInterest;
  revision: number;
  confirmedRevision: number | null;
  applicationId?: string;
  versions: StoryVersion[];
}

const keyOf = (scope: string) => `nuvia:storyboard:v1:${scope}`;
/** Shared by the dashboard CTA and source picker; confirmation alone is not eligibility. */
export function storyboardBlockReason(
  experience: Pick<CareerExperience, 'confirmed' | 'permissionStatus'>,
  nature: unknown,
  status: string | null,
): 'sb.why.unconfirmed' | 'sb.why.nature' | 'sb.why.revoked' | null {
  if (['deleted', 'revoked', 'failed'].includes(status ?? '') ||
      ['revoked', 'deleted', 'unverified'].includes(experience.permissionStatus ?? '')) return 'sb.why.revoked';
  if (!experience.confirmed) return 'sb.why.unconfirmed';
  if (nature !== 'actual' && nature !== 'simulation') return 'sb.why.nature';
  return null;
}

export function emptyStoryboard(): StoryboardDraft {
  return {
    id: crypto.randomUUID(), experienceId: '', company: '', job: '', keyword: '',
    sections: ['', '', '', ''], sourceRevision: '', revision: 0,
    confirmedRevision: null, versions: [],
  };
}

/**
 * Exact local binding, not a claim of remote source verification. Deliberately
 * includes permissions/consent, not just text. Never send this string to AI,
 * URLs, downloads or company sharing.
 */
export function sourceRevision(exp: CareerExperience, meta: unknown): string {
  return JSON.stringify([
    exp.id, exp.title, exp.action, exp.result, exp.learning, exp.confirmed,
    exp.source, exp.sourceId, exp.sourceVersion, exp.permissionStatus,
    exp.strengths, exp.criterionIds, meta,
  ]);
}

function validDraft(x: unknown): x is StoryboardDraft {
  if (!x || typeof x !== 'object') return false;
  const d = x as StoryboardDraft;
  const validSources = (sources: EvidenceSource[] | undefined) => sources===undefined ||
    Array.isArray(sources) && sources.every(s=>!!s && typeof s.id==='string' && Number.isSafeInteger(s.revision) && s.revision>0);
  const validInterest=(v:StoryInterest|undefined)=>v===undefined || (!!v && typeof v.company==='string' && typeof v.job==='string' &&
    typeof v.source==='string' && typeof v.synthetic==='boolean' && (v.lab===undefined||
      (!!v.lab && ['id','version','retrievedAt','reportVersion','strength','confirmedAt','support','check','planner'].every(key=>typeof (v.lab as unknown as Record<string,unknown>)[key]==='string')&&
       ['gpt-web','curated'].includes(v.lab.mode)&&!!v.lab.representative&&typeof v.lab.representative.keyword==='string'&&typeof v.lab.representative.excerpt==='string')));
  return typeof d.id === 'string' && typeof d.experienceId === 'string' &&
    (d.evidenceKey === undefined || typeof d.evidenceKey === 'string') &&
    validSources(d.evidenceSources) &&
    validInterest(d.reviewInterest) &&
    ['company', 'job', 'keyword', 'sourceRevision'].every(k => typeof (d as unknown as Record<string, unknown>)[k] === 'string') &&
    Array.isArray(d.sections) && d.sections.length === 4 && d.sections.every(v => typeof v === 'string') &&
    Number.isSafeInteger(d.revision) && d.revision >= 0 &&
    (d.confirmedRevision === null || d.confirmedRevision === d.revision) &&
    Array.isArray(d.versions) && d.versions.every(v => typeof v.id === 'string' && typeof v.at === 'string' && typeof v.experienceId === 'string' &&
      (v.evidenceKey === undefined || typeof v.evidenceKey === 'string') &&
      validSources(v.evidenceSources) &&
      validInterest(v.reviewInterest) &&
      Array.isArray(v.sections) && v.sections.length === 4 && v.sections.every(s => typeof s === 'string') &&
      ['company', 'job', 'keyword', 'sourceRevision'].every(k => typeof (v as unknown as Record<string, unknown>)[k] === 'string'));
}

/** Missing storage is an empty draft; corrupt/inaccessible storage is NOT silently overwritten. */
export function loadStoryboard(scope: string): StoryboardDraft {
  return storedStoryboard(scope) ?? emptyStoryboard();
}

export function storedStoryboard(scope: string): StoryboardDraft | null {
  const target = clientStorage(keyOf(scope));
  const raw = target.storage.getItem(target.key);
  if (raw === null) return null;
  const parsed: unknown = JSON.parse(raw);
  if (!validDraft(parsed)) throw new Error('STORYBOARD_STORAGE_INVALID');
  return parsed;
}

/** Refuse an older/equal-but-divergent tab overwriting a newer saved draft. */
export function saveStoryboard(scope: string, draft: StoryboardDraft, expected?: StoryboardDraft | null): boolean {
  try {
    if (!scope || scope === 'pending' || !validDraft(draft)) return false;
    const target = clientStorage(keyOf(scope));
    const raw = target.storage.getItem(target.key);
    // Compare the exact last read/written snapshot, not just an incrementing
    // revision: a stale tab can otherwise increment past another tab's edits.
    if (expected !== undefined && (raw ? JSON.stringify(JSON.parse(raw)) : null) !== (expected ? JSON.stringify(expected) : null)) return false;
    if (raw) {
      const saved: unknown = JSON.parse(raw);
      if (!validDraft(saved)) return false;
      if (saved.id !== draft.id || saved.revision > draft.revision) return false;
      if (saved.revision === draft.revision && JSON.stringify(saved) !== JSON.stringify(draft)) return false;
    }
    target.storage.setItem(target.key, JSON.stringify(draft));
    return true;
  } catch { return false; }
}

/** Independent recovery copy. Never treated as a submitted/shared version. */
export function keepStoryboardRecovery(scope: string, draft: StoryboardDraft): boolean {
  try {
    const target = clientStorage(`${keyOf(scope)}:recovery:${draft.id}`);
    target.storage.setItem(target.key, JSON.stringify(draft));
    return true;
  } catch { return false; }
}

export function readStoryboardRecovery(scope: string, draftId: string): StoryboardDraft | null {
  try {
    const target = clientStorage(`${keyOf(scope)}:recovery:${draftId}`);
    const raw = target.storage.getItem(target.key);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return validDraft(parsed) ? parsed : null;
  } catch { return null; }
}

export function clearStoryboardRecovery(scope: string, draft: StoryboardDraft) {
  try {
    const target = clientStorage(`${keyOf(scope)}:recovery:${draft.id}`);
    // Never remove a different/newer copy saved by another tab.
    if (target.storage.getItem(target.key) === JSON.stringify(draft)) target.storage.removeItem(target.key);
  } catch { /* A failed cleanup must not invalidate the primary save. */ }
}

export function editStoryboard(draft: StoryboardDraft, patch: Partial<StoryboardDraft>): StoryboardDraft {
  return {
    ...draft, ...patch, id: draft.id, versions: draft.versions,
    sections: patch.sections ? [...patch.sections] : [...draft.sections],
    revision: draft.revision + 1, confirmedRevision: null,
  };
}

export function confirmStoryboard(draft: StoryboardDraft): StoryboardDraft {
  if (!draft.experienceId || !draft.sourceRevision) return draft;
  return snapshotStoryboard(draft);
}

/** Explicitly confirmed personal writing in the Korean review workspace only. */
export function isStandaloneReviewDraft(draft: StoryboardDraft): boolean {
  return !draft.experienceId && !draft.sourceRevision && !draft.evidenceKey && !draft.evidenceSources?.length;
}

export function confirmStandaloneReviewDraft(draft: StoryboardDraft): StoryboardDraft {
  return isStandaloneReviewDraft(draft) ? snapshotStoryboard(draft) : draft;
}

export function isStandaloneReviewConfirmed(draft: StoryboardDraft): boolean {
  return isStandaloneReviewDraft(draft) && draft.confirmedRevision === draft.revision &&
    draft.versions.length > 0 && draft.sections.some(s => s.trim());
}

function snapshotStoryboard(draft: StoryboardDraft): StoryboardDraft {
  if (draft.confirmedRevision === draft.revision || !draft.sections.some(s => s.trim())) return draft;
  const revision = draft.revision + 1;
  const v: StoryVersion = {
    id: crypto.randomUUID(), at: new Date().toISOString(), experienceId: draft.experienceId,
    sections: [...draft.sections], company: draft.company, job: draft.job,
    keyword: draft.keyword, sourceRevision: draft.sourceRevision,
    ...(draft.evidenceKey ? {evidenceKey: draft.evidenceKey} : {}),
    ...(draft.evidenceSources ? {evidenceSources:draft.evidenceSources.map(s=>({...s}))} : {}),
    ...(draft.reviewInterest ? {reviewInterest:{...draft.reviewInterest}} : {}),
  };
  return { ...draft, revision, confirmedRevision: revision, versions: [...draft.versions, v] };
}

/** Linking an editor is not a change to the student's confirmed words or facts. */
export function linkStoryboardApplication(draft: StoryboardDraft, applicationId: string): StoryboardDraft {
  if (draft.applicationId === applicationId) return draft;
  const revision = draft.revision + 1;
  return { ...draft, applicationId, revision, confirmedRevision: draft.confirmedRevision === draft.revision ? revision : null };
}

export function isStoryboardConfirmed(draft: StoryboardDraft, currentSourceRevision: string): boolean {
  return !!draft.experienceId && !!currentSourceRevision &&
    draft.sourceRevision === currentSourceRevision && draft.confirmedRevision === draft.revision;
}

/** Loading is not source deletion. Invalidate only after the owning workspace is available. */
export function shouldInvalidateStoryboardConfirmation(
  draft: StoryboardDraft | null,
  sourceReady: boolean,
  sourceExists: boolean,
  sourceBlocked: boolean,
  currentSourceRevision: string,
): boolean {
  return sourceReady && !!draft && draft.confirmedRevision !== null && !!draft.experienceId &&
    (!sourceExists || sourceBlocked || draft.sourceRevision !== currentSourceRevision);
}

/** Allowlist only student-approved output. No hidden context, tags, scores or notes. */
export function storyboardText(draft: StoryboardDraft, labels: readonly string[]): string {
  return [
    labels[0] ?? '', [draft.company, draft.job].filter(Boolean).join(' · '),
    ...draft.sections.map((s, i) => labels[i+1]?`${labels[i+1]}\n${s}`:s),
  ].filter(Boolean).join('\n\n');
}
