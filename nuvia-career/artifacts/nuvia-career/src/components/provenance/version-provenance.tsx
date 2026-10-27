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
            <span className="rounded bg-muted px-1.5 text-[10px]">{t(`expsrc.${x.source}`)}</span>
            {x.meta.synthetic && <span className="text-[10px] font-semibold text-primary">{t('pv.synthetic')}</span>}
            <span dir="auto">{x.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
