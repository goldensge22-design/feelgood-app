import { useEffect, useMemo, useState } from 'react';
import type { CareerApplication, CareerExperience } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import {
  canReviewJobConnection,
  jobConnectionFingerprint,
  jobConnectionOf,
  appExpMeta,
  isJobConnectionReviewed,
  reviewJobConnection,
  setJobConnectionNotes,
  sourceScopeMatchesApplication,
  useSidecar,
  type JobConnectionNotes,
} from '@/lib/provenance';

const emptyNotes = (): JobConnectionNotes => ({
  sourceKind: 'unverified',
  specificDuty: '',
  sharedAction: '',
  learnedPrinciple: '',
  futureApplication: '',
  sourceTitle: '',
  sourceCompany: '',
  sourceJob: '',
  sourceVersion: '',
});

const SOURCE_TYPES = ['official_material', 'job_posting', 'company_public', 'educational_inference', 'unverified'] as const;
const sourceKey = (kind: JobConnectionNotes['sourceKind']) => ({
  official_material: 'official',
  job_posting: 'posting',
  company_public: 'company',
  educational_inference: 'inference',
  unverified: 'unknown',
}[kind]);

function Field({ id, label, hint, value, onChange, rows = 2 }: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      <Textarea id={id} dir="auto" rows={rows} maxLength={10000} className="mt-1.5"
        value={value} onChange={(event) => onChange(event.target.value)} data-testid={id} />
    </div>
  );
}

export function JobConnectionNotesPanel({ app, experience }: {
  app: CareerApplication;
  experience: CareerExperience;
}) {
  const { t } = useI18n();
  const { ctx, data, patch } = useSidecar();
  const persisted = jobConnectionOf(data, app.id, experience.id);
  const [draft, setDraft] = useState<JobConnectionNotes>(() => ({ ...emptyNotes(), ...(persisted ?? {}) }));
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    setDraft({ ...emptyNotes(), ...(jobConnectionOf(data, app.id, experience.id) ?? {}) });
    setSaved(false);
    setSaveError(false);
  // Sidecar changes from save/review are reconciled below; keep in-progress input
  // stable across locale changes and unrelated sidecar updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, app.id, experience.id]);

  const experienceMeta = appExpMeta(data, app.id, experience.id);
  const nature = experienceMeta.nature;
  const experienceContext = experienceMeta.experienceContext ?? (experienceMeta.synthetic ? 'synthetic_example' : 'unknown');
  const mismatch = useMemo(() => !sourceScopeMatchesApplication(draft, app), [
    draft.sourceCompany, draft.sourceJob, app.company, app.job,
  ]);
  const reviewReady = canReviewJobConnection(draft, app);
  const persistedReviewed = isJobConnectionReviewed(data, app, experience, nature, experienceContext);
  const persistedFingerprint = persisted
    ? jobConnectionFingerprint(app, experience, persisted, nature, experienceContext, experienceMeta.star)
    : '';
  const stale = !!persisted?.reviewedFingerprint && persisted.reviewedFingerprint !== persistedFingerprint;
  const edited = JSON.stringify({ ...draft, reviewedAt: undefined, reviewedFingerprint: undefined })
    !== JSON.stringify({ ...(persisted ?? emptyNotes()), reviewedAt: undefined, reviewedFingerprint: undefined });

  const edit = (key: keyof JobConnectionNotes, value: string) => {
    setDraft((current) => ({ ...current, [key]: value, reviewedAt: undefined, reviewedFingerprint: undefined }));
    setSaved(false);
    setSaveError(false);
  };

  const save = () => {
    if (!ctx || !patch((current) => setJobConnectionNotes(current, app.id, experience.id, draft))) {
      setSaveError(true);
      setSaved(false);
      return;
    }
    setSaveError(false);
    setSaved(true);
  };

  const markReviewed = () => {
    if (!reviewReady || edited || !persisted) return;
    if (!patch((current) => reviewJobConnection(current, app, experience, nature, experienceContext))) {
      setSaveError(true);
      setSaved(false);
      return;
    }
    setSaveError(false);
    setSaved(true);
  };

  return (
    <details className="surface p-4" data-testid={`details-job-connection-${app.id}-${experience.id}`}>
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">
        {t('joblink.title')}
      </summary>
      <div className="mt-3 space-y-4">
        <p className="rounded-md bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">{t('joblink.intro')}</p>
        <div className="rounded-lg border bg-card p-3 text-sm">
          <span className="text-xs font-semibold text-muted-foreground">{t('q.company')} · {t('q.job')}</span>
          <p className="mt-1 break-words" dir="auto">{app.company || '—'} · {app.job || '—'}</p>
          {!app.job.trim() && <p className="mt-2 text-xs text-warn">{t('joblink.needsReview')}</p>}
        </div>

        <div>
          <label htmlFor={`joblink-kind-${app.id}-${experience.id}`} className="text-sm font-medium">{t('joblink.kindLabel')}</label>
          <Select value={draft.sourceKind} onValueChange={(value) => edit('sourceKind', value as JobConnectionNotes['sourceKind'])}>
            <SelectTrigger id={`joblink-kind-${app.id}-${experience.id}`} className="mt-1.5 min-h-11" data-testid={`joblink-kind-${app.id}-${experience.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_TYPES.map((kind) => <SelectItem key={kind} value={kind}>{t(`joblink.kind.${sourceKey(kind)}`)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Field id={`joblink-duty-${app.id}-${experience.id}`} label={t('joblink.duty')} hint={t('joblink.dutyHint')}
          value={draft.specificDuty} onChange={(v) => edit('specificDuty', v)} />
        <Field id={`joblink-shared-${app.id}-${experience.id}`} label={t('joblink.shared')} hint={t('joblink.sharedHint')}
          value={draft.sharedAction} onChange={(v) => edit('sharedAction', v)} />
        <Field id={`joblink-principle-${app.id}-${experience.id}`} label={t('joblink.principle')} hint={t('joblink.principleHint')}
          value={draft.learnedPrinciple} onChange={(v) => edit('learnedPrinciple', v)} />
        <Field id={`joblink-future-${app.id}-${experience.id}`} label={t('joblink.future')} hint={t('joblink.futureHint')}
          value={draft.futureApplication} onChange={(v) => edit('futureApplication', v)} />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field id={`joblink-source-title-${app.id}-${experience.id}`} label={t('criteria.source')} hint={t('joblink.sourceHint')}
            value={draft.sourceTitle ?? ''} onChange={(v) => edit('sourceTitle', v)} />
          <Field id={`joblink-source-company-${app.id}-${experience.id}`} label={t('q.company')}
            value={draft.sourceCompany ?? ''} onChange={(v) => edit('sourceCompany', v)} />
          <Field id={`joblink-source-job-${app.id}-${experience.id}`} label={t('q.job')}
            value={draft.sourceJob ?? ''} onChange={(v) => edit('sourceJob', v)} />
          <Field id={`joblink-source-version-${app.id}-${experience.id}`} label={t('joblink.sourceVersion')}
            value={draft.sourceVersion ?? ''} onChange={(v) => edit('sourceVersion', v)} />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t('joblink.disclaimer')}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{t('joblink.storageNote')}</p>
        {mismatch && <p className="rounded-md bg-warn-soft p-3 text-xs text-warn" role="alert" data-testid={`joblink-mismatch-${experience.id}`}>{t('joblink.mismatch')}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" className="min-h-11" onClick={save} data-testid={`button-save-joblink-${experience.id}`}>{t('joblink.save')}</Button>
          <Button type="button" variant="outline" className="min-h-11" onClick={markReviewed}
            disabled={!persisted || edited || !reviewReady || persistedReviewed}
            data-testid={`button-review-joblink-${experience.id}`}>{t('joblink.reviewAction')}</Button>
        </div>
        {saveError && <p role="alert" className="text-xs text-destructive" data-testid={`joblink-save-error-${experience.id}`}>{t('star.saveError')}</p>}
        {stale
          ? <p role="status" className="rounded-md bg-warn-soft p-3 text-xs text-warn" data-testid={`joblink-stale-${experience.id}`}>{t('joblink.stale')}</p>
          : persistedReviewed
            ? <p role="status" className="rounded-md bg-ok-soft p-3 text-xs text-ok" data-testid={`joblink-reviewed-${experience.id}`}>{t('joblink.reviewed')}</p>
            : <p role="status" className="text-xs text-muted-foreground" data-testid={`joblink-needs-review-${experience.id}`}>{t('joblink.needsReview')}</p>}
        {saved && <p role="status" className="text-xs text-ok" data-testid={`joblink-saved-${experience.id}`}>{t('common.saved')}</p>}
      </div>
    </details>
  );
}
