import { useI18n } from '@/lib/i18n';
import { OriginalContent } from '@/components/common';
import type { ReportOrder } from '@/lib/report-order';

/** Displays developer-supplied report order verbatim. Never recomputes or fills TOP5. */
export function ReportOrderView({ order, synthetic }: { order: ReportOrder | null; synthetic?: boolean }) {
  const { t } = useI18n();
  return (
    <section className="rounded-lg border p-4" aria-label={t('pv.reportTitle')} data-testid="panel-report-order">
      <p className="text-sm font-semibold">{t('pv.reportTitle')}</p>
      {synthetic && <p className="mt-1 text-[11px] font-medium text-primary">{t('pv.reportSynthetic')}</p>}
      {!order || (!order.jobs.length && order.choice === 'report') ? (
        <p className="mt-2 text-xs text-muted-foreground" data-testid="text-report-unavailable">{t('pv.reportUnavailable')}</p>
      ) : (
        <>
          <ol className="mt-2 space-y-1.5">
            {order.jobs.map((j) => (
              <li key={`${j.rank}-${j.title}`} className="flex gap-2 text-sm" data-testid={`row-report-job-${j.rank}`}>
                <span className="font-mono text-xs text-muted-foreground">{j.rank}</span>
                <span><OriginalContent as="span" badge={false} className="font-medium">{j.title}</OriginalContent>
                  {j.reason && <OriginalContent as="span" badge={false} className="block text-xs text-muted-foreground">{j.reason}</OriginalContent>}</span>
              </li>
            ))}
          </ol>
          {order.choice !== 'report' && (
            <p className="mt-2 text-xs" data-testid="text-report-choice">{t(`pv.report.${order.choice}`)}{order.directJob ? `: ${order.directJob}` : ''}</p>
          )}
        </>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">{t('pv.noAbilityClaim')}</p>
      <p className="mt-1 text-[11px] text-muted-foreground" data-testid="text-youth-handoff">{t('pv.youth')}</p>
    </section>
  );
}
