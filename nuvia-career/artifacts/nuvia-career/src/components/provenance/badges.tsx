import { FlaskConical, HardDrive, ShieldAlert } from 'lucide-react';
import type { CareerExperience } from '@workspace/api-client-react';
import { useI18n } from '@/lib/i18n';
import { appExpMeta, metaOf, sourceStatusOf, useSidecar, type ExpMeta, type Nature, type SourceStatus } from '@/lib/provenance';
import { cn } from '@/lib/utils';

const NATURE_STYLE: Record<Nature, string> = {
  actual: 'border-navy/30 bg-navy text-white',
  simulation: 'border-primary/40 bg-primary/10 text-primary',
  unconfirmed: 'border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground',
};

export function NatureBadge({ nature, testId }: { nature: Nature; testId?: string }) {
  const { t } = useI18n();
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', NATURE_STYLE[nature])} data-testid={testId}>{t(`pv.nt.${nature}`)}</span>;
}

export function MetaBadges({ e, m, status, compact }: { e: CareerExperience; m: ExpMeta; status: SourceStatus | null; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid={`badges-prov-${e.id}`}>
      <NatureBadge nature={m.nature} testId={`badge-nature-${e.id}`} />
      <span className="rounded-full border border-blue/30 bg-blue-soft px-2 py-0.5 text-[10px] font-medium text-blue" data-testid={`badge-cardtype-${e.id}`}>
        {m.cardType ? t(`pv.ct.${m.cardType}`) : t('pv.ct.unset')}
      </span>
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground" data-testid={`badge-source-${e.id}`}>{t(`expsrc.${e.source}`)}</span>
      {m.synthetic && (
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/50 px-2 py-0.5 text-[10px] font-semibold text-primary" data-testid={`badge-synthetic-${e.id}`}>
          <FlaskConical className="h-3 w-3" aria-hidden /> {t('pv.synthetic')}
        </span>
      )}
      {!compact && m !== undefined && (m.synthetic || m.cardType || m.nature !== 'unconfirmed') && (
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground" title={t('pv.localMeta')}>
          <HardDrive className="h-3 w-3" aria-hidden /><span className="sr-only">{t('pv.localMeta')}</span>
        </span>
      )}
      {status && (
        <span className="inline-flex items-center gap-1 rounded bg-warn-soft px-1.5 py-0.5 text-[10px] font-medium text-warn" data-testid={`badge-srcstatus-${e.id}`}>
          <ShieldAlert className="h-3 w-3" aria-hidden /> {t(`pv.sim.${status === 'source_changed' ? 'change' : status === 'deleted' ? 'delete' : status === 'failed' ? 'fail' : 'revoke'}`)}
        </span>
      )}
    </div>
  );
}

export function ProvenanceBadges({ e, compact, appId }: { e: CareerExperience; compact?: boolean; appId?: string }) {
  const { data } = useSidecar();
  const m = appId ? appExpMeta(data, appId, e.id) : metaOf(data, e.id);
  return <MetaBadges e={e} m={m} status={sourceStatusOf(data, m)} compact={compact} />;
}
