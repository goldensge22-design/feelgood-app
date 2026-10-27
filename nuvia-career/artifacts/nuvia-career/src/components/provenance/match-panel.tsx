import { Scale } from 'lucide-react';
import type { CareerApplication, CareerState } from '@workspace/api-client-react';
import { useI18n } from '@/lib/i18n';
import { OriginalContent } from '@/components/common';
import { NatureBadge } from '@/components/provenance/badges';
import { appExpMeta, matchNote, setRequirement, useSidecar, type Requirement } from '@/lib/provenance';
import { cn } from '@/lib/utils';

const REQS: Requirement[] = ['actual', 'preparation', 'either'];

/** User explicitly sets what the question asks for; notes explain how each selected experience may be used. Never generates text. */
export function MatchPanel({ state, app }: { state: CareerState; app: CareerApplication }) {
  const { t } = useI18n();
  const { data, patch } = useSidecar();
  const req = data.apps[app.id]?.requirement;
  const exps = state.experiences.filter((e) => app.experienceIds.includes(e.id));
  const am = data.apps[app.id];
  const gone = (am?.expSnapshot ?? []).filter((x) => !state.experiences.some((e) => e.id === x.id));
  return (
    <div className="surface p-5" data-testid="panel-match">
      <h2 className="flex items-center gap-2 font-semibold"><Scale className="h-4 w-4 text-blue" /> {t('pv.req')}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{t('pv.reqHelp')}</p>
      <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('pv.req')}>
        {REQS.map((r) => (
          <button key={r} type="button" role="radio" aria-checked={req === r}
            onClick={() => patch((s) => setRequirement(s, app.id, req === r ? undefined : r))}
            className={cn('min-h-11 rounded-lg border px-3 text-sm', req === r ? 'border-navy bg-navy text-white' : 'bg-card hover:bg-muted')}
            data-testid={`radio-requirement-${r}`}>{t(`pv.req.${r}`)}</button>
        ))}
      </div>
      {am?.restoredFromVersion && (
        <div className="mt-3 rounded-lg border border-dashed p-3 text-xs" data-testid="panel-restored-snapshot">
          <p className="text-muted-foreground">{t('pv.restoredSnap')}</p>
          {gone.map((x) => (
            <p key={x.id} className="mt-1 flex flex-wrap items-center gap-1.5" data-testid={`row-snapshot-deleted-${x.id}`}>
              <NatureBadge nature={x.meta.nature} /><span dir="auto">{x.title}</span><span className="text-warn">{t('perm.deleted')}</span>
            </p>
          ))}
        </div>
      )}
      {!req && <p className="mt-2 text-xs text-muted-foreground" data-testid="text-requirement-unset">{t('pv.req.unset')}</p>}
      {exps.length > 0 && (
        <ul className="mt-4 space-y-2">
          {exps.map((e) => {
            const m = appExpMeta(data, app.id, e.id);
            const note = matchNote(req, m.nature);
            const warn = note === 'pv.match.simOnActual' || note === 'pv.match.unconfirmed';
            return (
              <li key={e.id} className={cn('rounded-lg border p-3', warn && 'border-warn/50 bg-warn-soft/60')} data-testid={`row-match-${e.id}`}>
                <div className="flex flex-wrap items-center gap-2"><NatureBadge nature={m.nature} /><OriginalContent as="span" badge={false} className="text-sm font-medium">{e.title}</OriginalContent></div>
                <p className={cn('mt-1 text-xs', warn ? 'text-warn' : 'text-muted-foreground')} data-testid={`text-match-${e.id}`}>{t(note)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
