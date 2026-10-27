import { useEffect, useRef, useState } from 'react';
import type { CareerApplication, CareerState } from '@workspace/api-client-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useI18n } from '@/lib/i18n';
import { NatureBadge } from '@/components/provenance/badges';
import { appExpMeta, useSidecar } from '@/lib/provenance';

/** User-checked fact list. No automatic sentence edits, no fact verification claim. Does not alter export payload. */
export function FactChecklist({ state, app, onReady }: { state: CareerState; app: CareerApplication; onReady: (ok: boolean) => void }) {
  const { t } = useI18n();
  const { data } = useSidecar();
  const exps = state.experiences.filter((e) => app.experienceIds.includes(e.id));
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const checkScope = JSON.stringify([app.id, app.question, app.text, app.experienceIds, exps.map((e) => appExpMeta(data, app.id, e.id).nature)]);
  useEffect(() => { setChecked({}); }, [checkScope]);
  const ok = exps.every((e) => checked[e.id]);
  const cb = useRef(onReady);
  cb.current = onReady;
  useEffect(() => { cb.current(ok); }, [ok]);
  return (
    <div className="surface p-5" data-testid="panel-fact-checklist">
      <p className="text-sm font-semibold">{t('pv.checkTitle')}</p>
      {exps.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">{t('pv.checkNone')}</p> : (
        <div className="mt-2 space-y-1.5">
          {exps.map((e) => {
            const n = appExpMeta(data, app.id, e.id).nature;
            const key = n === 'simulation' ? 'pv.checkSim' : n === 'actual' ? 'pv.checkActual' : 'pv.checkUnc';
            return (
              <label key={e.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3">
                <Checkbox className="mt-0.5" checked={!!checked[e.id]} onCheckedChange={(v) => setChecked((c) => ({ ...c, [e.id]: v === true }))} data-testid={`checkbox-fact-${e.id}`} />
                <span className="text-sm"><NatureBadge nature={n} /> <span dir="auto">{t(key, { title: e.title })}</span></span>
              </label>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">{t('pv.checkNote')}</p>
    </div>
  );
}
