import type {
  CareerActivity,
  CareerApplication,
  CareerCriterion,
  CareerState,
} from '@workspace/api-client-react';
import { clientStorage } from '@/lib/public-demo';

export const KEYS = {
  mode: 'nuvia:mode',
  locale: 'nuvia:locale',
  guest: 'nuvia:guest:state',
  guestVersions: 'nuvia:guest:versions',
  demo: 'nuvia:example:state',
  demoVersions: 'nuvia:example:versions',
  recovery: (userId: string) => `nuvia:recovery:${userId}`,
  conflictBackup: (userId: string) => `nuvia:conflict-backup:${userId}`,
  selection: (context: string) => `nuvia:${context}:selected-app`,
  experienceSelection: (context: string) => `nuvia:${context}:selected-experience`,
};

export const STRENGTHS = [
  '계획',
  '주의',
  '동시',
  '순차',
  'analysis',
  'communication',
  'execution',
  'collaboration',
  'empathy',
  'persistence',
  'learning',
  'structure',
] as const;

export const emptyState = (): CareerState => ({
  selectedJob: '',
  report: null,
  criteria: [],
  experiences: [],
  activities: [],
  applications: [],
});

export function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function loadJSON<T>(key: string): T | null {
  try {
    const target = clientStorage(key);
    const raw = target.storage.getItem(target.key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveJSON(key: string, value: unknown) {
  try {
    const target = clientStorage(key);
    target.storage.setItem(target.key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string) {
  try {
    const target = clientStorage(key);
    target.storage.removeItem(target.key);
  } catch {
    /* ignore */
  }
}

export function isCareerState(x: unknown): x is CareerState {
  if (!x || typeof x !== 'object') return false;
  const s = x as Record<string, unknown>;
  return (
    Array.isArray(s.experiences) &&
    Array.isArray(s.activities) &&
    Array.isArray(s.applications) &&
    Array.isArray(s.criteria)
  );
}

export function countChars(text: string, countSpaces: boolean) {
  const s = countSpaces ? text : text.replace(/\s/g, '');
  return Array.from(s).length;
}

export function hashStr(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export const activityVersion = (a: CareerActivity) =>
  hashStr([a.action, a.result, a.learning].join('\u0001'));

export function strengthTranslationKey(value: string) {
  const processing: Record<string, string> = {
    계획: 'planning', 주의: 'attention', 동시: 'simultaneous', 순차: 'successive',
  };
  return processing[value] ? `area.${processing[value]}` : `strength.${value}`;
}

export function safeUrl(u?: string | null): string | null {
  if (!u) return null;
  try {
    const x = new URL(u);
    return x.protocol === 'https:' && !x.username && !x.password ? x.toString() : null;
  } catch {
    return null;
  }
}

export function newApplication(): CareerApplication {
  return {
    id: uid('app'),
    company: '',
    job: '',
    question: '',
    limit: 0,
    countSpaces: true,
    writingLanguage: 'ko',
    experienceIds: [],
    criterionIds: [],
    text: '',
  };
}

export function newActivity(criterionId = ''): CareerActivity {
  return {
    id: uid('act'),
    title: '',
    goal: '',
    steps: '',
    date: '',
    completion: '',
    evidence: '',
    strengths: [],
    criterionId,
    status: 'planned',
    action: '',
    changed: '',
    result: '',
    learning: '',
  };
}

export function unionCriteria(a: CareerCriterion[], b: CareerCriterion[]) {
  const map = new Map<string, CareerCriterion>();
  for (const c of a) map.set(c.id, c);
  for (const c of b) if (!map.has(c.id)) map.set(c.id, c);
  return Array.from(map.values());
}

/** Tolerant reader for the free-form report object. Preserves order. */
export interface ReportView {
  summary: string;
  axes: { key: string; label: string; strategy: string; description: string }[];
  title: string;
  major: string;
  isExample: boolean;
  jobs: { title: string; reason: string }[];
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');

export function readReport(report: unknown): ReportView | null {
  if (!report || typeof report !== 'object') return null;
  const r = report as Record<string, unknown>;
  const axesRaw = (r.axes ?? r.profile ?? r.areas) as unknown;
  const jobsRaw = (r.jobs ?? r.recommendations) as unknown;
  const axes = Array.isArray(axesRaw)
    ? axesRaw.map((a, i) => {
        const o = (a ?? {}) as Record<string, unknown>;
        return {
          key: str(o.key) || str(o.id) || String(i),
          label: str(o.label) || str(o.name) || str(o.title) || str(o.key),
          strategy: str(o.strategy),
          description: str(o.interpretation) || str(o.description) || str(o.summary) || str(o.text),
        };
      })
    : [];
  const jobs = Array.isArray(jobsRaw)
    ? jobsRaw.map((j) => {
        if (typeof j === 'string') return { title: j, reason: '' };
        const o = (j ?? {}) as Record<string, unknown>;
        return {
          title: str(o.title) || str(o.name) || str(o.job),
          reason: str(o.reason) || str(o.description) || str(o.why),
        };
      })
    : [];
  return { summary: str(r.interpretation) || str(r.summary), title: str(r.title), major: str(r.major), isExample: r.isExample === true, axes, jobs };
}

/** Merge local work into the server state as NEW copies. Never overwrites server items. */
export function mergeAsDraft(server: CareerState, local: CareerState) {
  const out: CareerState = JSON.parse(JSON.stringify(server));
  let added = 0;
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

  const activityMap = new Map<string, string>();
  const experienceMap = new Map<string, string>();
  for (const act of local.activities) {
    const s = out.activities.find((x) => x.id === act.id);
    if (s && same(s, act)) { activityMap.set(act.id, act.id); continue; }
    const id = s ? uid('act') : act.id;
    activityMap.set(act.id, id);
    out.activities.push({ ...act, id });
    added++;
  }
  for (const exp of local.experiences) {
    const s = out.experiences.find((x) => x.id === exp.id);
    const sourceId = exp.source === 'local_activity' && exp.sourceId
      ? activityMap.get(exp.sourceId) ?? exp.sourceId : exp.sourceId;
    if (s && same(s, exp) && sourceId === exp.sourceId) {
      experienceMap.set(exp.id, exp.id); continue;
    }
    // A recovered edited experience is a new manual confirmation candidate,
    // not a second automatic import of the same original activity.
    const copied = { ...exp, id: s ? uid('exp') : exp.id, sourceId };
    if (copied.source === 'local_activity' &&
      out.experiences.some((x) => x.source === 'local_activity' && x.sourceId === copied.sourceId)) {
      copied.source = 'manual';
      delete copied.sourceId;
      delete copied.sourceVersion;
    }
    experienceMap.set(exp.id, copied.id);
    out.experiences.push(copied);
    added++;
  }
  for (const app of local.applications) {
    const s = out.applications.find((x) => x.id === app.id);
    const experienceIds = app.experienceIds.map((id) => experienceMap.get(id) ?? id)
      .filter((id) => out.experiences.some((x) => x.id === id));
    if (s && same(s, app) && same(experienceIds, app.experienceIds)) continue;
    out.applications.push({ ...app, id: uid('app'), experienceIds });
    added++;
  }
  out.criteria = unionCriteria(out.criteria, local.criteria);
  if (!out.selectedJob && local.selectedJob) out.selectedJob = local.selectedJob;
  return { state: out, added };
}

export function formatDate(iso: string | undefined | null, locale: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  } catch {
    return d.toISOString();
  }
}
