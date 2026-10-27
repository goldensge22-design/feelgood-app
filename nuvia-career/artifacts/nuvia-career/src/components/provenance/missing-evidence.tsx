import { useState } from 'react';
import { useLocation } from 'wouter';
import { Link2Off, Sprout } from 'lucide-react';
import type { CareerExperience } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { missingFields, plannerReturnUrl, type ExpMeta } from '@/lib/provenance';

/** Lists missing evidence fields, offers a small-practice PROPOSAL (no plan is created), and planner-return availability. */
export function MissingEvidence({ e, m, plannerUrl }: { e: CareerExperience; m: ExpMeta; plannerUrl?: string | null }) {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const [proposing, setProposing] = useState<string | null>(null);
  const missing = missingFields(e, m);
  const ret = plannerReturnUrl(plannerUrl);
  return (
    <div className="space-y-3" data-testid={`panel-missing-${e.id}`}>
      {missing.length > 0 && (
        <div className="rounded-lg border border-warn/40 bg-warn-soft p-3">
          <p className="text-sm font-medium text-warn" role="status" data-testid={`text-missing-${e.id}`}>{t('pv.st.missing', { fields: missing.map((k) => t(k)).join(', ') })}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {missing.map((k) => (
              <Button key={k} size="sm" variant="outline" className="min-h-10 bg-card" onClick={() => setProposing(k)} data-testid={`button-propose-${k.replace(/\./g, '-')}`}>
                <Sprout className="h-3.5 w-3.5" /> {t(k)}
              </Button>
            ))}
          </div>
        </div>
      )}
      {proposing && (
        <div className="rounded-lg border border-dashed border-blue/50 bg-blue-soft/40 p-3" data-testid="panel-practice-proposal">
          <p className="text-sm font-semibold text-blue">{t('pv.proposeTitle')}</p>
          <p className="mt-1 text-sm">{t('pv.proposeBody', { field: t(proposing) })}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" className="min-h-10" onClick={() => setLocation('/activities?new=1')} data-testid="button-confirm-proposal">{t('pv.proposeConfirm')}</Button>
            <Button size="sm" variant="ghost" className="min-h-10" onClick={() => setProposing(null)} data-testid="button-cancel-proposal">{t('common.cancel')}</Button>
          </div>
        </div>
      )}
      {(m.synthetic || e.source === 'planner') && (
        ret ? (
          <a href={ret} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-10 items-center text-sm text-blue underline" data-testid="link-planner-return">{t('pv.plannerReturn')}</a>
        ) : (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground" data-testid="text-planner-unavailable"><Link2Off className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t('pv.plannerUnavailable')}</p>
        )
      )}
    </div>
  );
}
