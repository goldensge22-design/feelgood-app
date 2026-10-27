import { ShieldAlert } from 'lucide-react';
import type { CareerExperience } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace';
import { useToast } from '@/hooks/use-toast';
import { OriginalContent } from '@/components/common';
import { MetaBadges } from '@/components/provenance/badges';
import { MissingEvidence } from '@/components/provenance/missing-evidence';
import { metaOf, setExpMeta, sourceStatusOf, useSidecar, type CardType, type ExpMeta, type Nature } from '@/lib/provenance';
import { findSeed, localizeSeed, seedInput } from '@/lib/synthetic-records';
import { addSyntheticExperience } from '@/components/provenance/synthetic-actions';
import { cn } from '@/lib/utils';

function Choice<T extends string>({ label, options, value, onChange, disabled, testId }: {
  label: string; options: { v: T; label: string }[]; value: T | undefined; onChange: (v: T) => void; disabled?: boolean; testId: string;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="text-xs font-semibold text-muted-foreground">{label}</legend>
      <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)}
            className={cn('min-h-11 rounded-lg border px-3 text-sm transition-colors disabled:opacity-60', value === o.v ? 'border-blue bg-blue text-white' : 'bg-card hover:bg-muted')}
            data-testid={`${testId}-${o.v}`}>{o.label}</button>
        ))}
      </div>
    </fieldset>
  );
}

function Field({ k, v }: { k: string; v?: string | string[] }) {
  const { t } = useI18n();
  if (!v || (Array.isArray(v) && !v.length)) return null;
  return (
    <div><dt className="text-[11px] font-semibold text-muted-foreground">{t(k)}</dt>
      <dd>{Array.isArray(v) ? <ol className="list-decimal ps-5 text-sm" dir="auto">{v.map((s, i) => <li key={i}>{s}</li>)}</ol> : <OriginalContent as="div" className="whitespace-pre-wrap text-sm leading-relaxed">{v}</OriginalContent>}</dd>
    </div>
  );
}

export function ExperienceDetail({ e, onClose }: { e: CareerExperience; onClose: () => void }) {
  const { t, locale } = useI18n();
  const { update } = useWorkspace();
  const { toast } = useToast();
  const { data, patch } = useSidecar();
  const m: ExpMeta = metaOf(data, e.id);
  const status = sourceStatusOf(data, m);
  const raw = findSeed(m.syntheticKey);
  // New-copy content follows the CURRENT UI language; the stored record keeps its original copy.
  const seed = raw ? localizeSeed(raw, locale) : undefined;
  const legacy = !data.exps[e.id];
  const set = (p: Partial<ExpMeta>) => patch((s) => setExpMeta(s, e.id, p));
  const src = m.syntheticKey ? data.synthetic.sources[m.syntheticKey] : undefined;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl" data-testid={`dialog-exp-detail-${e.id}`}>
        <DialogHeader>
          <DialogTitle><OriginalContent as="span">{e.title}</OriginalContent></DialogTitle>
          <DialogDescription>{t('pv.details')}</DialogDescription>
        </DialogHeader>
        <MetaBadges e={e} m={m} status={status} />
        {legacy && <p className="text-xs text-muted-foreground" data-testid="text-legacy-note">{t('pv.legacyNote')}</p>}

        {status && (
          <div className="rounded-lg border border-warn/40 bg-warn-soft p-3 text-sm text-warn" role="alert" data-testid={`status-source-${e.id}`}>
            <p className="flex items-start gap-1.5"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {t(`pv.st.${status}`)}</p>
            {status === 'source_changed' && seed && src && (
              <div className="mt-2 space-y-2 text-foreground">
                <p className="text-xs text-muted-foreground">{t('field.result')}</p>
                <OriginalContent as="p" className="rounded border bg-card p-2 text-sm">{seedInput(seed, src.revision).result}</OriginalContent>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="min-h-10 bg-card" onClick={() => { patch((s) => ({ ...setExpMeta(s, e.id, { sourceRevision: src.revision, reviewedAt: new Date().toISOString() }), synthetic: { ...s.synthetic, sources: { ...s.synthetic.sources, [seed.key]: { ...src, status: 'current' } } } })); }} data-testid="button-keep-mine">{t('pv.keepMine')}</Button>
                  <Button size="sm" className="min-h-10" onClick={() => {
                    if (addSyntheticExperience(seed, src.revision, update, patch, true, m.plannerFields)) toast({ title: t('pv.added') });
                  }} data-testid="button-add-copy">{t('pv.addCopy')}</Button>
                </div>
              </div>
            )}
            {(status === 'deleted' || status === 'revoked') && (
              <Button size="sm" variant="outline" className="mt-2 min-h-10 bg-card" onClick={() => update((s) => ({ ...s, applications: s.applications.map((a) => ({ ...a, experienceIds: a.experienceIds.filter((x) => x !== e.id) })) }))} data-testid="button-detach-apps">{t('pv.detachApps')}</Button>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Choice label={t('pv.nature')} testId="radio-nature" value={m.nature} disabled={m.synthetic}
            options={(['actual', 'simulation', 'unconfirmed'] as const).map((v) => ({ v, label: t(`pv.nt.${v}`) }))}
            onChange={(v) => set({ nature: v, origin: m.origin ?? e.source })} />
          <Choice label={t('pv.cardType')} testId="radio-cardtype" value={m.cardType} disabled={m.synthetic}
            options={(['daily_application', 'job_scenario'] as const).map((v) => ({ v, label: t(`pv.ct.${v}`) }))}
            onChange={(v) => set({ cardType: v, origin: m.origin ?? e.source })} />
        </div>
        <p className="text-[11px] text-muted-foreground">{t('pv.localMeta')}</p>

        <dl className="space-y-3 border-t pt-4">
          <Field k="pv.f.selectedJob" v={m.selectedJob} />
          <Field k="pv.f.practiceAction" v={m.practiceAction} />
          <Field k="pv.f.checkCriterion" v={m.checkCriterion} />
          <Field k="pv.f.strengthStrategy" v={m.strengthStrategy} />
          <Field k="pv.f.support" v={m.supportProvided} />
          <Field k="pv.f.steps" v={m.independentSteps} />
          <Field k="pv.f.evidence" v={m.observedEvidence} />
          {m.planner && <>
            <Field k="pv.f.selectionReason" v={m.planner.selectionReason} />
            <Field k="pv.f.changed" v={m.planner.changed} />
          </>}
        </dl>
        {m.synthetic && (
          <p className="text-xs text-muted-foreground" data-testid="text-consent-record">
            {t('pv.factConsent')} {m.factConsent ? t('pv.alreadyIn') : '—'} · {t('pv.usageConsent')} {m.usageConsent ? t('pv.alreadyIn') : '—'}
          </p>
        )}
        <MissingEvidence e={e} m={m} />
        <p className="text-[11px] text-muted-foreground">{t('pv.noAbilityClaim')}</p>
      </DialogContent>
    </Dialog>
  );
}
