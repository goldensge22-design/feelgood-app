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

export interface PlannerInput {
  selectedAction: string;
  selectionReason: string;
  changed: string;
  result: string;
  learning: string;
}

export interface ExpMeta {
  localOnly: true;
  nature: Nature;
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
}

export interface VersionSnap {
  at: string;
  requirement?: Requirement;
  restoredFromVersion?: string;
  exps: { id: string; title: string; source: Origin; meta: ExpMeta }[];
}

export interface AppMeta { requirement?: Requirement; restoredFromVersion?: string; expSnapshot?: VersionSnap['exps'] }

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
  } } };
}

export function setExpMeta(sc: Sidecar, id: string, p: Partial<ExpMeta>): Sidecar {
  return { ...sc, exps: { ...sc.exps, [id]: { ...metaOf(sc, id), ...p, localOnly: true } } };
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
  return { ...sc, versions: { ...sc.versions, [versionId]: { at: new Date().toISOString(), requirement: am?.requirement, restoredFromVersion: am?.restoredFromVersion, exps: [...exps, ...kept] } } };
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
