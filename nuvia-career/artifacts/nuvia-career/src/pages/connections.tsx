import { Link } from 'wouter';
import { Building2, CalendarClock, ClipboardCheck, ExternalLink, PenLine, Route as RouteIcon } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace';
import { safeUrl } from '@/lib/career';
import { ErrorBlock, LoadingBlock, NextSteps, PageHeader } from '@/components/common';
import { cn } from '@/lib/utils';

const ICONS = { dcas: ClipboardCheck, planner: CalendarClock, company: Building2 } as const;

export default function ConnectionsPage() {
  const { t, locale } = useI18n();
  const { overview, overviewLoading, overviewError, retryOverview } = useWorkspace();
  return (
    <div>
      <PageHeader eyebrow={t('con.eyebrow')} title={t('nav.connections')} description={t('con.desc')} />
      {overviewError ? <ErrorBlock message={t('error.load')} onRetry={retryOverview} /> : overviewLoading ? <LoadingBlock /> : (
        <div className="space-y-4">
          {(overview?.integrations ?? []).map((i) => {
            const Icon = ICONS[i.id] ?? ClipboardCheck;
            const url = i.status === 'connected' ? null : safeUrl(i.returnUrl);
            return (
              <article key={i.id} className="surface p-5 md:p-6" data-testid={`card-integration-${i.id}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"><Icon className="h-5 w-5 text-navy" /></span>
                    <div><h2 className="font-semibold">{t(`integ.name.${i.id}`)}</h2><p className="text-sm text-muted-foreground">{t(`integ.desc.${i.id}`)}</p></div>
                  </div>
                  <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', i.status === 'connected' ? 'bg-ok-soft text-ok' : i.status === 'unconnected' ? 'bg-muted text-muted-foreground' : 'bg-warn-soft text-warn')} data-testid={`status-integration-${i.id}`}>
                    {t(`integ.${i.status}`)}
                  </span>
                </div>
                {i.requirements.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-muted-foreground">{t('con.requirements')}</p>
                    {locale !== 'ko' && <p className="mt-1 text-[11px] text-muted-foreground">{t('con.reqOriginal')}</p>}
                    <ul className="mt-2 list-disc space-y-1 ps-5 text-sm" lang="ko" dir="auto">{i.requirements.map((r, k) => <li key={k}>{r}</li>)}</ul>
                  </div>
                )}
                <div className="mt-4 rounded-lg border border-dashed p-3 text-sm">
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center gap-1.5 font-medium text-blue">{t('con.open')} <ExternalLink className="h-4 w-4" /></a>
                  ) : <p className="text-muted-foreground">{t('con.noRoute')}</p>}
                </div>
              </article>
            );
          })}
          <section className="surface bg-navy p-6 text-white">
            <h2 className="text-lg font-semibold">{t('con.directTitle')}</h2>
            <p className="mt-1 text-sm text-white/70">{t('con.directBody')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/experiences?new=1" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><PenLine className="h-4 w-4" /> {t('exp.directRecord')}</Link>
              <Link href="/activities?new=1" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-white/30 px-4 text-sm font-medium hover:bg-white/10"><RouteIcon className="h-4 w-4" /> {t('act.new')}</Link>
            </div>
          </section>
        </div>
      )}
      <NextSteps prev={{ href: '/?view=summary', label: t('nav.overview') }} next={{ href: '/criteria', label: t('nav.criteria') }} />
    </div>
  );
}
