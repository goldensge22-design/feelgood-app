import { REVIEW_PRACTICE_PROFILES, REVIEW_PROFILES, type ReviewTraitId, type EverydayPlan, type WorksheetNotes } from './review-everyday-model';
import type { HomeReportJob, HomeReportSummary } from './review-home-profile';

export type DailyKind = 'job' | 'cognitive';
export type DailyContext = { synthetic: boolean; job: HomeReportJob | null; trait?: ReviewTraitId; focus?: ReviewTraitId; assessedOn?: string | null;
  assessmentRef?:{ id:string; originalVersion:string; interpretationVersion:string; top5Version:string };
  recommendationVersion?:string; };
export type DailyAttachment = { category: DailyKind; context: DailyContext; activity: EverydayPlan; worksheet: WorksheetNotes };
export type DailyDraft = DailyAttachment & { id: string };
export type DailyTranslate = (key: string, vars?: Record<string, string | number>) => string;
export const DAILY_EVIDENCE = 'review:planner-records:v1';
export function dailyContext(report: HomeReportSummary | null, job: string, trait: ReviewTraitId | undefined, focus: ReviewTraitId | undefined, synthetic = false): DailyContext {
  // The supplied positions and interpretations are read independently. Scores are never inspected.
  return { synthetic: synthetic && !!report, job: report?.topJobs?.find(j=>j.id===job) ?? report?.topJobs?.[0] ?? null,
    trait: report?.strengths?.length ? trait : undefined, focus: report?.growthPoints?.length ? focus : undefined, assessedOn: report?.assessedOn,
    recommendationVersion:'easy-daily-v1',
    assessmentRef:synthetic&&report ? {id:`synthetic-review:${trait??'not-provided'}:${focus??'not-provided'}`,originalVersion:'example-2026-01-01-v1',
      interpretationVersion:'example-v1',top5Version:'example-top5-v1'}:undefined };
}
export const validDailyDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) &&
  new Date(date).toISOString().slice(0,10) === date;

const jobs: Record<string, number> = {service:1,education:2,operations:0,content:1,research:2};
const focusScenes: Record<ReviewTraitId, number> = {planning:0,attention:2,simultaneous:1,sequential:0};
export function createDailyDraft(id: string, date: string, category: DailyKind, context: DailyContext, variant: number, t: DailyTranslate): DailyDraft {
  const start = category==='job' ? jobs[context.job?.reviewRole ?? ''] ?? 0 : context.focus ? focusScenes[context.focus] : 2;
  const index = (start+variant)%3;
  const key = ['morning','route','bag'][index];
  const base = `daily.scene.${key}`;
  const focusName = context.focus ? t(`daily.trait.${context.focus}`) : '';
  return { id, category, context, worksheet: {before:'',observation:'',reflection:'',date},
    activity:{ id:`simple-${key}`,goal:t(`${base}.title`),scene:t(`${base}.text`),steps:[t('daily.read'),t(`${base}.write`),t(`${base}.question`)],
      question:t(`${base}.question`),minutes:5,materials:t('daily.materials'),kind:'thought',entry:key==='route'?'imagined':'daily_note',
      linkReason:category==='job' ? (context.job ? t('daily.jobReason',{job:context.job.title, example:t(`${base}.use`)}) : t('daily.jobMissing'))
        : context.focus ? t('daily.focusReason',{focus:focusName,example:t(`${base}.use`)}) : t('daily.focusMissing'),
      supportReason:context.trait ? t(`daily.help.${context.trait}`) : t('daily.help.general'),
    } };
}
export function isDailyAttachment(a: DailyAttachment) {
  return !!a && ['job','cognitive'].includes(a.category) && !!a.context && typeof a.context.synthetic==='boolean' &&
    (a.context.job===null || typeof a.context.job?.title==='string') &&
    (a.context.trait===undefined || REVIEW_PROFILES.some(p=>p.id===a.context.trait)) &&
    (a.context.focus===undefined || REVIEW_PRACTICE_PROFILES.some(p=>p.id===a.context.focus));
}
