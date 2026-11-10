import { useCallback, useSyncExternalStore } from 'react';
import type { CareerApplication, CareerExperience, CareerState } from '@workspace/api-client-react';
import { loadJSON, saveJSON } from '@/lib/career';
import { useWorkspace } from '@/lib/workspace';
import { toast } from '@/hooks/use-toast';
import { PROV_MESSAGES, PROV_PARTIAL } from '@/lib/provenance-messages';

/**
 * Frontend-only provenance sidecar (pending a developer API).
 * Stored in localStorage under `nuvia:provenance:v1:<ctx>` where ctx is
 * `demo`, `guest` or `account:<userId>`. It NEVER rewrites CareerState records;
 * it only annotates them by id. All of it is explicitly local-only metadata.
 */
export type CardType = 'daily_application' | 'job_scenario';
export type Nature = 'actual' | 'simulation' | 'unconfirmed';
export type Requirement = 'actual' | 'preparation' | 'either';
export type SourceStatus = 'current' | 'source_changed' | 'deleted' | 'revoked' | 'failed';
export type Origin = CareerExperience['source'];
export type JobSourceKind = 'official_material' | 'job_posting' | 'company_public' | 'educational_inference' | 'unverified';
export type ExperienceContext = 'daily_activity' | 'class_simulation' | 'job_experience' | 'synthetic_example' | 'unknown';

/** Student-authored, per-application connection notes; never part of essay/export payloads. */
export interface JobConnectionNotes {
  sourceKind: JobSourceKind;
  specificDuty: string;
  sharedAction: string;
  learnedPrinciple: string;
  futureApplication: string;
  sourceTitle?: string;
  sourceCompany?: string;
  sourceJob?: string;
  sourceVersion?: string;
  sourceAsOf?: string;
  reviewedFingerprint?: string;
  reviewedAt?: string;
}

export interface PlannerInput {
  selectedAction: string;
  selectionReason: string;
  changed: string;
  result: string;
  learning: string;
}

/** Optional, user-authored STAR detail kept in the device-only sidecar. */
export interface StarNotes {
  situation?: string;
  roleGoal?: string;
  selectionReason?: string;
  resultEvidence?: string;
}

export interface ExpMeta {
  localOnly: true;
  nature: Nature;
  /** Separate from actual/simulation nature; legacy entries remain unknown until the student chooses. */
  experienceContext?: ExperienceContext;
  cardType?: CardType;
  /** Origin as declared at creation; synthetic preview records always use 'example'. */
  origin?: Origin;
  synthetic?: boolean;
  syntheticKey?: string;
  /** Locale the synthetic content was copied in at import; never re-localized. */
  seedLocale?: string;
  sourceRevision?: number;
  /** Only fields the user kept selected in the preview; deselected fields are absent. */
  planner?: Partial<PlannerInput>;
  plannerFields?: (keyof PlannerInput)[];
  factConsent?: boolean;
  usageConsent?: boolean;
  consentAt?: string;
  reviewedAt?: string;
  selectedJob?: string;
  practiceAction?: string;
  checkCriterion?: string;
  strengthStrategy?: string;
  supportProvided?: string;
  independentSteps?: string[];
  observedEvidence?: string;
  star?: StarNotes;
}

export interface VersionSnap {
  at: string;
  requirement?: Requirement;
  restoredFromVersion?: string;
  exps: { id: string; title: string; source: Origin; meta: ExpMeta }[];
  jobLinks?: Record<string, JobConnectionNotes>;
}

export interface AppMeta {
  requirement?: Requirement;
  restoredFromVersion?: string;
  expSnapshot?: VersionSnap['exps'];
  jobLinks?: Record<string, JobConnectionNotes>;
}

export interface Sidecar {
  v: 1;
  exps: Record<string, ExpMeta>;
  /** Per-draft metadata. expSnapshot (if present) is the frozen source copied from a version on restore. */
  apps: Record<string, AppMeta>;
  versions: Record<string, VersionSnap>;
  synthetic: { ack: boolean; sources: Record<string, { revision: number; status: SourceStatus }> };
}

export const SIDECAR_PREFIX = 'nuvia:provenance:v1:';
export const sidecarKey = (ctx: string) => `${SIDECAR_PREFIX}${ctx}`;
export const emptySidecar = (): Sidecar => ({ v: 1, exps: {}, apps: {}, versions: {}, synthetic: { ack: false, sources: {} } });
const EMPTY = emptySidecar();
export const LEGACY_META: ExpMeta = { localOnly: true, nature: 'unconfirmed' };

const cache = new Map<string, Sidecar>();
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

function read(key: string): Sidecar {
  let s = cache.get(key);
  if (!s) {
    const raw = loadJSON<Partial<Sidecar>>(key);
    const base = emptySidecar();
    s = raw && raw.v === 1
      ? { ...base, ...raw, v: 1, exps: raw.exps ?? {}, apps: raw.apps ?? {}, versions: raw.versions ?? {}, synthetic: { ...base.synthetic, ...(raw.synthetic ?? {}) } }
      : base;
    cache.set(key, s);
  }
  return s;
}

function notifySaveFailed() {
  let loc = 'ko';
  try { loc = document.documentElement.lang || 'ko'; } catch { /* ignore */ }
  const e = PROV_MESSAGES['pv.saveFailed'];
  const msg = loc === 'ko' ? e[0] : loc === 'en' ? e[1] : PROV_PARTIAL[loc]?.['pv.saveFailed'] ?? e[1];
  toast({ title: msg, variant: 'destructive' });
}

/** Test helper. */
export function __resetSidecarCache() { cache.clear(); }

export function useSidecar() {
  const { mode, userId, authLoaded } = useWorkspace();
  const ctx = !authLoaded ? null : mode === 'account' ? (userId ? `account:${userId}` : null) : mode;
  const key = ctx ? sidecarKey(ctx) : null;
  const data = useSyncExternalStore(subscribe, () => (key ? read(key) : EMPTY));
  const patch = useCallback((fn: (s: Sidecar) => Sidecar) => {
    if (!key) return false;
    const next = fn(read(key));
    // Only reflect metadata in the UI once it is actually persisted; never show unsaved as saved.
    const ok = saveJSON(key, next);
    if (ok) { cache.set(key, next); listeners.forEach((l) => l()); }
    else notifySaveFailed();
    return ok;
  }, [key]);
  return { ctx, data, patch, ready: !!key };
}

export function metaOf(sc: Sidecar, id: string): ExpMeta {
  return sc.exps[id] ?? LEGACY_META;
}

/** Per-draft provenance: a restored draft uses its frozen snapshot, not the latest record metadata. */
export function appExpMeta(sc: Sidecar, appId: string, expId: string): ExpMeta {
  return sc.apps[appId]?.expSnapshot?.find((x) => x.id === expId)?.meta ?? metaOf(sc, expId);
}

/** Copy requirement + frozen source from an immutable version snapshot onto a NEW restored draft id. */
export function restoreFromSnapshot(sc: Sidecar, versionId: string, newAppId: string): Sidecar {
  const snap = sc.versions[versionId];
  if (!snap) return sc;
  return { ...sc, apps: { ...sc.apps, [newAppId]: {
    requirement: snap.requirement, restoredFromVersion: versionId,
    expSnapshot: JSON.parse(JSON.stringify(snap.exps)) as VersionSnap['exps'],
    jobLinks: JSON.parse(JSON.stringify(snap.jobLinks ?? {})) as Record<string, JobConnectionNotes>,
  } } };
}

export function jobConnectionOf(sc: Sidecar, appId: string, experienceId: string): JobConnectionNotes | undefined {
  return sc.apps[appId]?.jobLinks?.[experienceId];
}

export function jobConnectionFingerprint(
  app: Pick<CareerApplication, 'id' | 'company' | 'job' | 'question' | 'experienceIds'>,
  experience: CareerExperience,
  notes: JobConnectionNotes,
  nature: Nature,
  experienceContext: ExperienceContext = 'unknown',
  star: StarNotes = {},
): string {
  const { reviewedAt: _reviewedAt, reviewedFingerprint: _reviewedFingerprint, ...content } = notes;
  return JSON.stringify({
    app: [app.id, app.company, app.job, app.question, [...app.experienceIds].sort()],
    experience: [experience.id, experience.title, experience.source, experience.sourceId ?? '', experience.action, experience.result, experience.learning, nature, experienceContext, star],
    notes: content,
  });
}

export function isJobConnectionReviewed(
  sc: Sidecar,
  app: Pick<CareerApplication, 'id' | 'company' | 'job' | 'question' | 'experienceIds'>,
  experience: CareerExperience,
  nature: Nature,
  experienceContext: ExperienceContext = 'unknown',
): boolean {
  const notes = jobConnectionOf(sc, app.id, experience.id);
  const meta = appExpMeta(sc, app.id, experience.id);
  return !!notes?.reviewedFingerprint &&
    notes.reviewedFingerprint === jobConnectionFingerprint(app, experience, notes, nature, experienceContext, meta.star);
}

export function sourceScopeMatchesApplication(
  notes: JobConnectionNotes,
  app: Pick<CareerApplication, 'company' | 'job'>,
): boolean {
  const companyMatches = !notes.sourceCompany?.trim() ||
    notes.sourceCompany.trim().toLocaleLowerCase() === app.company.trim().toLocaleLowerCase();
  const jobMatches = !notes.sourceJob?.trim() ||
    notes.sourceJob.trim().toLocaleLowerCase() === app.job.trim().toLocaleLowerCase();
  return companyMatches && jobMatches;
}

export function canReviewJobConnection(
  notes: JobConnectionNotes | undefined,
  app: Pick<CareerApplication, 'company' | 'job'>,
): notes is JobConnectionNotes {
  if (!notes || !app.company.trim() || !app.job.trim()) return false;
  if (!notes.specificDuty.trim() || !notes.sharedAction.trim() || !notes.learnedPrinciple.trim() || !notes.futureApplication.trim()) return false;
  if (['official_material', 'job_posting', 'company_public'].includes(notes.sourceKind) && !notes.sourceTitle?.trim()) return false;
  return sourceScopeMatchesApplication(notes, app);
}

export function setJobConnectionNotes(sc: Sidecar, appId: string, experienceId: string, notes: JobConnectionNotes): Sidecar {
  const { reviewedAt: _reviewedAt, reviewedFingerprint: _reviewedFingerprint, ...content } = notes;
  const previous = jobConnectionOf(sc, appId, experienceId);
  const previousContent = previous
    ? Object.fromEntries(Object.entries(previous).filter(([key]) => key !== 'reviewedAt' && key !== 'reviewedFingerprint'))
    : undefined;
  const unchanged = !!previous && !!previousContent && JSON.stringify(content) === JSON.stringify(previousContent);
  // Always clear review on explicit edits; a later review is bound to the current draft context.
  const next: JobConnectionNotes = {
    ...content,
    ...(unchanged && previous ? { reviewedAt: previous.reviewedAt, reviewedFingerprint: previous.reviewedFingerprint } : {}),
  };
  const app = sc.apps[appId] ?? {};
  return { ...sc, apps: { ...sc.apps, [appId]: { ...app, jobLinks: { ...(app.jobLinks ?? {}), [experienceId]: next } } } };
}

export function reviewJobConnection(
  sc: Sidecar,
  app: Pick<CareerApplication, 'id' | 'company' | 'job' | 'question' | 'experienceIds'>,
  experience: CareerExperience,
  nature: Nature,
  experienceContext: ExperienceContext = 'unknown',
  at = new Date().toISOString(),
): Sidecar {
  const notes = jobConnectionOf(sc, app.id, experience.id);
  if (!canReviewJobConnection(notes, app)) return sc;
  const meta = appExpMeta(sc, app.id, experience.id);
  const appMeta = sc.apps[app.id] ?? {};
  return {
    ...sc,
    apps: {
      ...sc.apps,
      [app.id]: {
        ...appMeta,
        jobLinks: {
          ...(appMeta.jobLinks ?? {}),
          [experience.id]: {
            ...notes,
            reviewedAt: at,
            reviewedFingerprint: jobConnectionFingerprint(app, experience, notes, nature, experienceContext, meta.star),
          },
        },
      },
    },
  };
}

/** Clear review state after any user edit to the linked application or experience. */
export function invalidateJobConnectionReviews(
  sc: Sidecar,
  filter: { appId?: string; experienceId?: string },
): Sidecar {
  let changed = false;
  const apps = Object.fromEntries(Object.entries(sc.apps).map(([appId, appMeta]) => {
    if (filter.appId && filter.appId !== appId) return [appId, appMeta];
    const links = appMeta.jobLinks ?? {};
    const nextLinks = Object.fromEntries(Object.entries(links).map(([experienceId, notes]) => {
      if (filter.experienceId && filter.experienceId !== experienceId) return [experienceId, notes];
      if (!notes.reviewedAt && !notes.reviewedFingerprint) return [experienceId, notes];
      changed = true;
      const { reviewedAt: _reviewedAt, reviewedFingerprint: _reviewedFingerprint, ...unreviewed } = notes;
      return [experienceId, unreviewed];
    }));
    return [appId, changed ? { ...appMeta, jobLinks: nextLinks } : appMeta];
  }));
  return changed ? { ...sc, apps } : sc;
}

export function setExpMeta(sc: Sidecar, id: string, p: Partial<ExpMeta>): Sidecar {
  const previous = metaOf(sc, id);
  const next = { ...previous, ...p, localOnly: true as const };
  const relevant = ['nature', 'experienceContext', 'origin', 'synthetic', 'syntheticKey', 'cardType', 'selectedJob', 'practiceAction', 'checkCriterion', 'strengthStrategy', 'supportProvided', 'independentSteps', 'observedEvidence']
    .some((key) => JSON.stringify(previous[key as keyof ExpMeta]) !== JSON.stringify(next[key as keyof ExpMeta]));
  const updated = { ...sc, exps: { ...sc.exps, [id]: next } };
  return relevant ? invalidateJobConnectionReviews(updated, { experienceId: id }) : updated;
}

/**
 * Save optional STAR notes locally. For a draft restored from an immutable
 * version, update only that draft's frozen sidecar copy; never mutate a version.
 */
export function setStarNotes(sc: Sidecar, expId: string, star: StarNotes, appId?: string): Sidecar {
  const cleaned = Object.fromEntries(
    Object.entries(star).filter(([, value]) => typeof value === 'string' && value.trim()),
  ) as StarNotes;
  const snapshot = appId ? sc.apps[appId]?.expSnapshot : undefined;
  const previousStar = snapshot?.find((item) => item.id === expId)?.meta.star ?? metaOf(sc, expId).star ?? {};
  const sorted = (value: StarNotes) => JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));
  if (sorted(cleaned) === sorted(previousStar)) return sc;
  if (snapshot?.some((item) => item.id === expId)) {
    return invalidateJobConnectionReviews({
      ...sc,
      apps: {
        ...sc.apps,
        [appId!]: {
          ...sc.apps[appId!],
          expSnapshot: snapshot.map((item) =>
            item.id === expId
              ? { ...item, meta: { ...item.meta, star: Object.keys(cleaned).length ? cleaned : undefined } }
              : item,
          ),
        },
      },
    }, { appId, experienceId: expId });
  }
  return invalidateJobConnectionReviews(setExpMeta(sc, expId, { star: Object.keys(cleaned).length ? cleaned : undefined }), { experienceId: expId });
}

export function setRequirement(sc: Sidecar, appId: string, requirement: Requirement | undefined): Sidecar {
  return { ...sc, apps: { ...sc.apps, [appId]: { ...(sc.apps[appId] ?? {}), requirement } } };
}

/** Status for a synthetic record. Real records never get synthetic statuses. */
export function sourceStatusOf(sc: Sidecar, m: ExpMeta): SourceStatus | null {
  if (!m.synthetic || !m.syntheticKey) return null;
  const src = sc.synthetic.sources[m.syntheticKey];
  if (!src) return null;
  if (src.status === 'deleted' || src.status === 'revoked' || src.status === 'failed') return src.status;
  if (src.status === 'source_changed' || (m.sourceRevision != null && src.revision !== m.sourceRevision)) return 'source_changed';
  return null;
}

export type MissingKey = 'field.action' | 'field.result' | 'field.learning' | 'pv.f.support' | 'pv.f.steps' | 'pv.f.evidence';
export function missingFields(e: CareerExperience, m: ExpMeta): MissingKey[] {
  const out: MissingKey[] = [];
  if (!e.action.trim()) out.push('field.action');
  if (!e.result.trim()) out.push('field.result');
  if (!e.learning.trim()) out.push('field.learning');
  if (m.nature === 'simulation') {
    if (!m.supportProvided?.trim()) out.push('pv.f.support');
    if (!m.independentSteps?.length) out.push('pv.f.steps');
  }
  if (m.synthetic && !m.observedEvidence?.trim()) out.push('pv.f.evidence');
  return out;
}

export type MatchKey = 'pv.match.simOnActual' | 'pv.match.simPrep' | 'pv.match.unconfirmed' | 'pv.match.actualOk' | 'pv.match.needReq';
export function matchNote(req: Requirement | undefined, nature: Nature): MatchKey {
  if (nature === 'unconfirmed') return 'pv.match.unconfirmed';
  if (!req) return 'pv.match.needReq';
  if (nature === 'simulation') return req === 'actual' ? 'pv.match.simOnActual' : 'pv.match.simPrep';
  return 'pv.match.actualOk';
}

export function coachKeys(nature: Nature): string[] {
  if (nature === 'actual') return ['pv.coach.actual1', 'pv.coach.actual2', 'pv.coach.actual3'];
  if (nature === 'simulation') return ['pv.coach.sim1', 'pv.coach.sim2', 'pv.coach.sim3'];
  return ['pv.coach.unc'];
}

/** Immutable: an existing snapshot for a version id is never replaced. */
export function snapshotVersion(sc: Sidecar, versionId: string, app: CareerApplication, state: CareerState): Sidecar {
  if (sc.versions[versionId]) return sc;
  const exps = state.experiences.filter((e) => app.experienceIds.includes(e.id))
    .map((e) => ({ id: e.id, title: e.title, source: e.source, meta: JSON.parse(JSON.stringify(appExpMeta(sc, app.id, e.id))) as ExpMeta }));
  const am = sc.apps[app.id];
  // Keep frozen entries for records deleted since this draft was restored.
  const kept = (am?.expSnapshot ?? []).filter((x) => !exps.some((y) => y.id === x.id) && !state.experiences.some((y) => y.id === x.id));
  const selectedJobLinks = Object.fromEntries(
    Object.entries(am?.jobLinks ?? {})
      .filter(([id]) => app.experienceIds.includes(id))
      .map(([id, notes]) => {
        const experience = state.experiences.find((item) => item.id === id);
        const meta = experience ? appExpMeta(sc, app.id, id) : undefined;
        const reviewed = !!experience && !!meta &&
          isJobConnectionReviewed(sc, app, experience, meta.nature, meta.experienceContext ?? (meta.synthetic ? 'synthetic_example' : 'unknown'));
        if (reviewed) return [id, JSON.parse(JSON.stringify(notes)) as JobConnectionNotes];
        const { reviewedAt: _reviewedAt, reviewedFingerprint: _reviewedFingerprint, ...unreviewed } = notes;
        return [id, unreviewed as JobConnectionNotes];
      }),
  );
  return { ...sc, versions: { ...sc.versions, [versionId]: {
    at: new Date().toISOString(), requirement: am?.requirement, restoredFromVersion: am?.restoredFromVersion,
    exps: [...exps, ...kept], jobLinks: JSON.parse(JSON.stringify(selectedJobLinks)) as Record<string, JobConnectionNotes>,
  } } };
}

/** Planner return links are only allowed for verified, developer-supplied hosts. None are configured yet. */
export const ALLOWED_PLANNER_HOSTS: readonly string[] = [];
export function plannerReturnUrl(u?: string | null): string | null {
  if (!u) return null;
  try {
    const x = new URL(u);
    return x.protocol === 'https:' && ALLOWED_PLANNER_HOSTS.includes(x.host) ? x.toString() : null;
  } catch { return null; }
}
