import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowRight, Compass, FlaskConical, Focus, ListOrdered, Network, PlugZap, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace';
import { readReport } from '@/lib/career';
import { ErrorBlock, LoadingBlock, NextSteps, OriginalContent, PageHeader, SourceMeta, useCriterionText } from '@/components/common';
import { cn } from '@/lib/utils';

const AREAS = [
  { key: 'planning', icon: Target },
  { key: 'attention', icon: Focus },
  { key: 'simultaneous', icon: Network },
  { key: 'successive', icon: ListOrdered },
];

export default function OverviewPage() {
  const { t } = useI18n();
  const { mode, setLocalMode, state, update, overview, overviewLoading, overviewError, retryOverview } = useWorkspace();
  const ctext = useCriterionText();
  const report = mode === 'demo' ? readReport(state?.report) : null;
  const dcas = overview?.integrations.find((i) => i.id === 'dcas');
  const criteria = (overview?.criteria ?? []).filter((c) => c.sourceType === 'common_example');

  return (
    <div>
      <PageHeader eyebrow={t('ov.eyebrow')} title={t('nav.overview')} description={t('ov.desc')} />

      {/* Report or honest empty profile */}
      <section className="surface overflow-hidden" aria-labelledby="profile-h">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-5 py-4 md:px-6">
          <div>
            <h2 id="profile-h" className="text-lg font-semibold">{report ? t('ov.reportTitle') : t('ov.emptyTitle')}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {report ? t('ov.reportExampleNote') : t('ov.emptyNote')}
            </p>
          </div>
          <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', report ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')} data-testid="status-dcas">
            D-CAS · {report ? t('ov.exampleOnly') : t(`integ.${dcas?.status ?? 'unconnected'}`)}
          </span>
        </div>

        {report && (report.title || report.summary) && (
          <div className="border-b px-5 py-4 md:px-6">
            {report.title && <OriginalContent as="p" className="font-semibold">{report.title}{report.major ? ` · ${report.major}` : ''}</OriginalContent>}
            {report.summary && <OriginalContent as="p" className="mt-1 text-sm leading-relaxed text-muted-foreground">{report.summary}</OriginalContent>}
          </div>
        )}

        <div className="grid gap-px bg-border sm:grid-cols-2">
          {AREAS.map((a, i) => {
            // Explicit alias used by the fictional fixture only. Real report
            // identifiers must be mapped from its supplied integration contract.
            const axis = report?.axes.find((x) => x.key === a.key || (a.key === 'successive' && x.key === 'sequential'));
            const Icon = a.icon;
            return (
              <motion.div key={a.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} className="bg-card p-5 md:p-6" data-testid={`card-area-${a.key}`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-soft text-blue"><Icon className="h-[18px] w-[18px]" /></span>
                  <div className="min-w-0">
                    <h3 className="font-semibold">{t(`area.${a.key}`)}</h3>
                    <p className="text-xs text-muted-foreground">{t('ov.strategy')}: {t(`area.${a.key}.strategy`)}</p>
                  </div>
                </div>
                {axis ? (
                  <div className="mt-4 space-y-2 text-sm leading-relaxed">
                    {axis.strategy && <OriginalContent as="p" className="font-medium text-foreground">{axis.strategy}</OriginalContent>}
                    {axis.description && <OriginalContent as="p" className="text-muted-foreground">{axis.description}</OriginalContent>}
                  </div>
                ) : (
                  <p className="mt-4 rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">{t('ov.areaEmpty')}</p>
                )}
              </motion.div>
            );
          })}
        </div>
        {!report && (
          <div className="flex flex-wrap gap-2 border-t px-5 py-4 md:px-6">
            <Link href="/connections" className="tap inline-flex items-center gap-2 rounded-lg border px-4 text-sm font-medium hover:bg-muted" data-testid="link-connect-dcas">
              <PlugZap className="h-4 w-4" /> {t('ov.connectDcas')}
            </Link>
            {mode !== 'account' && mode !== 'demo' && (
              <Button variant="ghost" className="tap" onClick={() => setLocalMode('demo')} data-testid="button-try-example">
                <FlaskConical className="h-4 w-4" /> {t('ov.tryExample')}
              </Button>
            )}
          </div>
        )}
      </section>

      {/* Job choice */}
      <section className="mt-8 grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <div className="surface min-w-0 p-5 md:p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Compass className="h-5 w-5 text-blue" /> {t('ov.jobTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('ov.jobDesc')}</p>
          {report && report.jobs.length > 0 && (
            <ol className="mt-4 space-y-2">
              {report.jobs.map((j, i) => (
                <li key={i} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <OriginalContent as="span" className="font-semibold">{j.title}</OriginalContent>
                    <Button size="sm" variant={state?.selectedJob === j.title ? 'default' : 'outline'} className="min-h-10" onClick={() => update((s) => ({ ...s, selectedJob: j.title }))} data-testid={`button-select-job-${i}`}>
                      {state?.selectedJob === j.title ? t('ov.jobSelected') : t('ov.jobSelect')}
                    </Button>
                  </div>
                  {j.reason && <OriginalContent as="p" className="mt-1 text-sm text-muted-foreground">{j.reason}</OriginalContent>}
                </li>
              ))}
              <li className="text-xs text-muted-foreground">{t('ov.notTop5')}</li>
            </ol>
          )}
          <label className="mt-4 block text-sm font-medium" htmlFor="selected-job">{t('ov.jobFree')}</label>
          {state ? (
            <Input id="selected-job" dir="auto" className="mt-1.5 min-h-11" value={state.selectedJob} maxLength={500} placeholder={t('ov.jobPlaceholder')} onChange={(e) => update((s) => ({ ...s, selectedJob: e.target.value }))} data-testid="input-selected-job" />
          ) : <div className="mt-1.5 h-11 animate-pulse rounded-md bg-muted" />}
        </div>
        <div className="surface flex min-w-0 flex-col justify-between !bg-navy p-5 text-white md:p-6">
          {mode === 'demo' ? (
            <>
              <div>
                <p className="eyebrow !text-amber-300">{t('mode.demo')}</p>
                <h2 className="mt-2 text-lg font-semibold">{t('ov.demoCardTitle')}</h2>
                <p className="mt-2 text-sm text-white/70">{t('ov.demoCardBody')}</p>
              </div>
              <Button variant="outline" className="tap mt-5 h-auto whitespace-normal break-words border-white/30 bg-transparent py-3 text-white hover:bg-white/10" onClick={() => setLocalMode('guest')} data-testid="button-leave-demo">{t('ov.leaveDemo')}</Button>
            </>
          ) : (
            <>
              <div>
                <p className="eyebrow !text-amber-300">{t(`mode.${mode}`)}</p>
                <h2 className="mt-2 text-lg font-semibold">{t('nav.experiences')}</h2>
                <p className="mt-2 text-sm text-white/70">{t('exp.desc')}</p>
              </div>
              <Link href="/experiences?new=1" className="tap mt-5 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground" data-testid="link-direct-record">
                {t('exp.new')}
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Criteria */}
      <section className="mt-10" aria-labelledby="crit-h">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="crit-h" className="text-lg font-semibold">{t('ov.criteriaTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('ov.criteriaDesc')}</p>
          </div>
          <Link href="/criteria" className="tap inline-flex items-center gap-1 text-sm font-medium text-blue" data-testid="link-all-criteria">{t('ov.allCriteria')} <ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>
        </div>
        {overviewError ? <ErrorBlock message={t('error.load')} onRetry={retryOverview} /> : overviewLoading ? <LoadingBlock rows={2} /> : (
          <div className="grid gap-3 md:grid-cols-2">
            {criteria.map((c) => {
              const tx = ctext(c);
              return (
                <article key={c.id} className="surface p-5" data-testid={`card-criterion-${c.id}`}>
                  <h3 className="font-semibold">{tx.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{tx.description}</p>
                  <div className="mt-3"><SourceMeta c={c} compact /></div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/criteria#${c.id}`} className="inline-flex min-h-10 items-center rounded-lg border px-3 text-xs font-semibold hover:bg-muted">{t('crit.reviewAccept')}</Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <NextSteps next={{ href: '/criteria', label: t('nav.criteria') }} />
    </div>
  );
}
