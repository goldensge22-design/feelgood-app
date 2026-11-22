import { useMemo } from 'react';
import { Link } from 'wouter';
import { ArrowRight, FlaskConical, PlugZap, Target } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace';
import { readReport, strengthTranslationKey } from '@/lib/career';
import { metaOf, sourceStatusOf, useSidecar } from '@/lib/provenance';
import { storyboardBlockReason } from '@/lib/storyboard';

/** The report contract has no supported numeric, temperament or reason-weight fields; always listed as unavailable. */
const MISSING = ['db.fScores', 'db.fTemperament', 'db.fWeights'];

/** Read-only top of /storyboard. Shows only what the report actually contains; never draws or invents scores. */
export function StrengthDashboard() {
  const { t } = useI18n();
  const { state, mode, setSelectedExpId } = useWorkspace();
  const { data: sidecar } = useSidecar();

  const report = useMemo(() => readReport(state?.report), [state?.report]);

  if (!state) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-label={t('db.loading')} data-testid="status-dashboard-loading" />;
  }

  const label = (k: string) => { const key = strengthTranslationKey(k); const v = t(key); return v === key ? k : v; };
  const confirmed = state.experiences.filter((e) => e.confirmed);
  const eligible = confirmed.filter((e) => {
    const meta = metaOf(sidecar, e.id);
    return !storyboardBlockReason(e, meta.nature, sourceStatusOf(sidecar, meta));
  });
  const keywords = Array.from(new Set(eligible.flatMap((e) => e.strengths ?? [])));
  const nextHref = eligible.length === 0
    ? '/experiences'
    : '#storyboard-write';
  const nextLabel = t(eligible.length === 0 ? 'db.nextConfirm' : 'db.nextWrite');
  const jobsWithReason = report?.jobs.filter((j) => j.title) ?? [];

  return (
    <section className="surface overflow-hidden" aria-labelledby="dashboard-title" data-testid="section-strength-dashboard">
      <div className="header-glow px-5 py-6 text-white md:px-8">
        <p className="eyebrow text-amber-300">{t('db.eyebrow')}</p>
        <h1 id="dashboard-title" className="mt-2 text-2xl font-bold leading-snug md:text-3xl">{t('db.title')}</h1>
        <p className="mt-2 text-sm text-white/70" data-testid="text-dashboard-counts">{t('db.records', { n: confirmed.length, m: state.activities.length })}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {nextHref.startsWith('#') ? (
            <a href={nextHref} className="tap inline-flex items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90" data-testid="link-dashboard-next">
              {nextLabel} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </a>
          ) : (
            <Link href={nextHref} className="tap inline-flex items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90" data-testid="link-dashboard-next">
              {nextLabel} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:p-8">
        <div className="min-w-0 space-y-4">
          {(mode === 'demo' || report?.isExample) && report && (
            <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs" data-testid="text-dashboard-demo">
              <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {t('db.demo')}
            </p>
          )}
          {!report ? (
            <div className="rounded-xl border border-dashed p-5" data-testid="status-report-missing">
              <p className="flex items-center gap-2 font-semibold"><PlugZap className="h-4 w-4 text-blue" /> {t('db.noReport')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('db.noReportBody')}</p>
            </div>
          ) : (
            <>
              {report.summary && (
                <details className="rounded-xl border p-4" open data-testid="details-report-summary">
                  <summary className="min-h-11 cursor-pointer content-center font-semibold">{t('db.summary')}</summary>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed" dir="auto">{report.summary}</p>
                </details>
              )}
              {report.axes.length > 0 && (
                <details className="rounded-xl border p-4" data-testid="details-report-axes">
                  <summary className="min-h-11 cursor-pointer content-center font-semibold">{t('db.axes')}</summary>
                  <ul className="mt-2 space-y-3">
                    {report.axes.map((a, i) => (
                      <li key={`${a.key}-${i}`} className="text-sm" dir="auto">
                        <p className="font-semibold">{a.label}</p>
                        {a.strategy && <p className="text-muted-foreground">{a.strategy}</p>}
                        {a.description && <p className="mt-1 leading-relaxed">{a.description}</p>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {jobsWithReason.length > 0 && (
                <details className="rounded-xl border p-4" data-testid="details-report-jobs">
                  <summary className="min-h-11 cursor-pointer content-center font-semibold">{t('db.jobs')}</summary>
                  <ol className="mt-2 space-y-2">
                    {jobsWithReason.map((j, i) => (
                      <li key={`${j.title}-${i}`} className="flex gap-3 text-sm" dir="auto">
                        <span className="meta shrink-0 pt-0.5">{j.rank ?? i + 1}</span>
                        <span><span className="font-semibold">{j.title}</span>{j.reason && <span className="block text-muted-foreground">{j.reason}</span>}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </>
          )}
              {(
                <div className="rounded-xl bg-muted/60 p-4 text-xs" data-testid="text-report-missing-fields">
                  <p className="font-semibold">{t('db.missing')}</p>
                  <ul className="mt-1 flex flex-wrap gap-2">
                    {MISSING.map((m) => <li key={m} className="rounded-full border bg-card px-2.5 py-1">{t(m)}</li>)}
                  </ul>
                  <p className="mt-2 text-muted-foreground">{t('db.missingNote')}</p>
                </div>
              )}
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-xl border p-4" data-testid="card-selected-context">
            <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Target className="h-3.5 w-3.5 text-primary" /> {t('db.context')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('db.selectedJob')}</p>
            <p className="font-semibold" dir="auto" data-testid="text-selected-job">{state.selectedJob.trim() || t('db.none')}</p>
          </div>
          <div className="rounded-xl border p-4" data-testid="card-keyword-compare">
            <p className="font-semibold">{t('db.compare')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('db.compareNote')}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
              <div>
                <p className="eyebrow">{t('db.reportSide')}</p>
                {jobsWithReason.some((j) => j.reason) ? (
                  <ul className="mt-1 space-y-1 text-xs" dir="auto">
                    {jobsWithReason.filter((j) => j.reason).map((j, i) => <li key={i}>{j.title}: {j.reason}</li>)}
                  </ul>
                ) : <p className="mt-1 text-xs text-muted-foreground">{t('db.missing')}</p>}
              </div>
              <div>
                <p className="eyebrow">{t('db.mySide')}</p>
                {keywords.length ? (
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {keywords.map((k) => (
                      <li key={k} className="w-full min-w-0 rounded-lg bg-blue-soft px-2.5 py-1 text-xs text-blue">
                        <details>
                          <summary className="min-h-11 cursor-pointer content-center break-words">{label(k)}</summary>
                          <ul className="space-y-1 pb-2">
                            {eligible.filter(e => e.strengths.includes(k)).map(e => (
                              <li key={e.id}><Link href="/experiences" onClick={() => setSelectedExpId(e.id)} className="inline-flex min-h-11 items-center break-words underline" dir="auto">{e.title}</Link></li>
                            ))}
                          </ul>
                        </details>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-1 text-xs text-muted-foreground">{t('db.noKeywords')}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default StrengthDashboard;
