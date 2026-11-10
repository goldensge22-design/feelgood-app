import { useI18n } from '@/lib/i18n';
import { useSidecar } from '@/lib/provenance';
import { NatureBadge } from '@/components/provenance/badges';

/** Read-only view of the immutable snapshot taken when the version was created. */
export function VersionProvenance({ versionId }: { versionId: string }) {
  const { t } = useI18n();
  const { data } = useSidecar();
  const snap = data.versions[versionId];
  if (!snap) return <p className="meta mt-2" data-testid={`text-version-nosnap-${versionId}`}>{t('pv.verNoSnap')}</p>;
  return (
    <div className="mt-3 rounded-lg border border-dashed p-3" data-testid={`panel-version-prov-${versionId}`}>
      <p className="text-[11px] font-semibold text-muted-foreground">{t('pv.verSnap')}</p>
      <p className="mt-1 text-xs">{t('pv.req')}: {snap.requirement ? t(`pv.req.${snap.requirement}`) : t('pv.req.unset')}</p>
      <ul className="mt-1.5 space-y-1">
        {snap.exps.map((x) => (
          <li key={x.id} className="flex flex-wrap items-center gap-1.5 text-xs">
            <NatureBadge nature={x.meta.nature} />
            <span className="rounded border border-blue/30 px-1.5 text-[10px] text-blue">{x.meta.cardType ? t(`pv.ct.${x.meta.cardType}`) : t('pv.ct.unset')}</span>
            <span className="rounded-full border border-muted-foreground/20 bg-muted px-1.5 text-[10px] text-muted-foreground">
              {t(`joblink.context.${x.meta.experienceContext === 'daily_activity' ? 'daily' : x.meta.experienceContext === 'class_simulation' ? 'classSimulation' : x.meta.experienceContext === 'job_experience' ? 'jobExperience' : x.meta.experienceContext === 'synthetic_example' || x.meta.synthetic ? 'synthetic' : 'unknown'}`)}
            </span>
            <span className="rounded bg-muted px-1.5 text-[10px]">{t(`expsrc.${x.source}`)}</span>
            {x.meta.synthetic && <span className="text-[10px] font-semibold text-primary">{t('pv.synthetic')}</span>}
            <span dir="auto">{x.title}</span>
          </li>
        ))}
      </ul>
      {Object.keys(snap.jobLinks ?? {}).length > 0 && (
        <div className="mt-3 space-y-2 border-t pt-3">
          <p className="text-[11px] font-semibold text-muted-foreground">{t('joblink.title')}</p>
          {Object.entries(snap.jobLinks ?? {}).map(([experienceId, notes]) => (
            <details key={experienceId} className="rounded-md border bg-card p-2.5" data-testid={`version-joblink-${versionId}-${experienceId}`}>
              <summary className="min-h-10 cursor-pointer text-xs font-medium" dir="auto">
                {snap.exps.find((x) => x.id === experienceId)?.title ?? experienceId}
              </summary>
              <dl className="mt-2 space-y-2 text-xs">
                <div><dt className="font-semibold text-muted-foreground">{t('joblink.kindLabel')}</dt><dd>{t(`joblink.kind.${notes.sourceKind === 'official_material' ? 'official' : notes.sourceKind === 'educational_inference' ? 'inference' : notes.sourceKind === 'unverified' ? 'unknown' : notes.sourceKind === 'job_posting' ? 'posting' : 'company'}`)}</dd></div>
                {notes.sourceTitle && <div><dt className="font-semibold text-muted-foreground">{t('criteria.source')}</dt><dd dir="auto">{notes.sourceTitle}</dd></div>}
                {notes.sourceCompany && <div><dt className="font-semibold text-muted-foreground">{t('q.company')}</dt><dd dir="auto">{notes.sourceCompany}</dd></div>}
                {notes.sourceJob && <div><dt className="font-semibold text-muted-foreground">{t('q.job')}</dt><dd dir="auto">{notes.sourceJob}</dd></div>}
                {notes.sourceVersion && <div><dt className="font-semibold text-muted-foreground">{t('joblink.sourceVersion')}</dt><dd dir="auto">{notes.sourceVersion}</dd></div>}
                <div><dt className="font-semibold text-muted-foreground">{t('joblink.duty')}</dt><dd className="whitespace-pre-wrap" dir="auto">{notes.specificDuty}</dd></div>
                <div><dt className="font-semibold text-muted-foreground">{t('joblink.shared')}</dt><dd className="whitespace-pre-wrap" dir="auto">{notes.sharedAction}</dd></div>
                <div><dt className="font-semibold text-muted-foreground">{t('joblink.principle')}</dt><dd className="whitespace-pre-wrap" dir="auto">{notes.learnedPrinciple}</dd></div>
                <div><dt className="font-semibold text-muted-foreground">{t('joblink.future')}</dt><dd className="whitespace-pre-wrap" dir="auto">{notes.futureApplication}</dd></div>
                <p className="text-[10px] text-muted-foreground">{notes.reviewedAt ? t('joblink.reviewed') : t('joblink.needsReview')}</p>
              </dl>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
