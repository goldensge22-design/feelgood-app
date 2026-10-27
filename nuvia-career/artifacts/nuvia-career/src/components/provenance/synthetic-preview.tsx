import { useState } from 'react';
import { FlaskConical, Lock, TriangleAlert } from 'lucide-react';
import type { CareerState } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useI18n } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace';
import { useToast } from '@/hooks/use-toast';
import { OriginalContent } from '@/components/common';
import { NatureBadge } from '@/components/provenance/badges';
import { ReportOrderView } from '@/components/provenance/report-order-view';
import { addSyntheticExperience, ALL_INPUT_FIELDS, type InputField } from '@/components/provenance/synthetic-actions';
import { metaOf, useSidecar, type SourceStatus } from '@/lib/provenance';
import { SYNTHETIC_SEEDS, localizeSeed, seedInput, type SyntheticSeed } from '@/lib/synthetic-records';
import { adaptReportOrder, SYNTHETIC_REPORT_INPUT } from '@/lib/report-order';
import { cn } from '@/lib/utils';

const INPUT_FIELDS = [
  ['selectedAction', 'pv.f.practiceAction'],
  ['selectionReason', 'pv.f.selectionReason'],
  ['changed', 'pv.f.changed'],
  ['result', 'field.result'],
  ['learning', 'field.learning'],
] as const;

export function SyntheticPreviewPanel({ state, onClose }: { state: CareerState; onClose: () => void }) {
  const { t, locale } = useI18n();
  const { mode, update } = useWorkspace();
  const seeds = SYNTHETIC_SEEDS.map((s) => localizeSeed(s, locale));
  const { toast } = useToast();
  const { data, patch } = useSidecar();
  const [picked, setPicked] = useState<string | null>(null);
  const [fact, setFact] = useState(false);
  const [usage, setUsage] = useState(false);
  const [fields, setFields] = useState<InputField[]>(ALL_INPUT_FIELDS);
  const [notice, setNotice] = useState<{ kind: 'duplicate' | 'failed' | 'added'; key: string } | null>(null);
  const account = mode === 'account';
  const ack = data.synthetic.ack;
  const seed = seeds.find((s) => s.key === picked) ?? null;
  const srcOf = (s: SyntheticSeed) => data.synthetic.sources[s.key] ?? { revision: 1, status: 'current' as SourceStatus };
  const existing = (s: SyntheticSeed, rev: number) => state.experiences.some((e) => { const m = metaOf(data, e.id); return m.syntheticKey === s.key && m.sourceRevision === rev; });
  const setSrc = (key: string, p: { revision: number; status: SourceStatus }) => {
    setFact(false);
    setUsage(false);
    return patch((s) => ({ ...s, synthetic: { ...s.synthetic, sources: { ...s.synthetic.sources, [key]: p } } }));
  };

  const reset = () => { setPicked(null); setFact(false); setUsage(false); setFields(ALL_INPUT_FIELDS); };
  const add = () => {
    if (!seed || account) return;
    const src = srcOf(seed);
    if (src.status === 'deleted' || src.status === 'revoked') return;
    if (src.status === 'failed') { setNotice({ kind: 'failed', key: seed.key }); return; }
    if (existing(seed, src.revision)) { setNotice({ kind: 'duplicate', key: seed.key }); return; }
    if (!addSyntheticExperience(seed, src.revision, update, patch, fact && usage, fields)) { setNotice({ kind: 'failed', key: seed.key }); return; }
    setNotice({ kind: 'added', key: seed.key });
    toast({ title: t('pv.added') });
    reset();
  };

  return (
    <section className="surface relative mb-6 overflow-hidden border-primary/40 p-5 md:p-6" aria-labelledby="syn-title" data-testid="panel-synthetic-preview">
      <div className="pointer-events-none absolute inset-y-0 start-0 w-1.5 bg-[repeating-linear-gradient(135deg,hsl(var(--primary))_0_6px,transparent_6px_12px)]" aria-hidden />
      <div className="flex flex-wrap items-start justify-between gap-2 ps-2">
        <div>
          <p className="eyebrow flex items-center gap-1.5 text-primary"><FlaskConical className="h-3.5 w-3.5" /> {t('pv.synthetic')}</p>
          <h2 id="syn-title" className="mt-1 text-lg font-semibold">{t('pv.panelTitle')}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('pv.panelBody')}</p>
        </div>
        <Button variant="ghost" className="min-h-11" onClick={onClose} data-testid="button-close-synthetic">{t('pv.close')}</Button>
      </div>

      {account && (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-blue-soft p-3 text-sm text-blue" role="status" data-testid="status-account-pending">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" /> {t('pv.accountPending')}
        </p>
      )}
      {!account && (
        <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <Checkbox className="mt-0.5" checked={ack} onCheckedChange={(v) => patch((s) => ({ ...s, synthetic: { ...s.synthetic, ack: v === true } }))} data-testid="checkbox-synthetic-ack" />
          <span className="text-sm">{t('pv.ackLocal')}</span>
        </label>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div role="group" aria-label={t('pv.groupLabel')} className="space-y-2">
          {seeds.map((s) => {
            const src = srcOf(s);
            const added = existing(s, src.revision);
            return (
              <div key={s.key} className={cn('rounded-lg border p-3', picked === s.key && 'border-blue ring-2 ring-blue/30')} data-testid={`card-seed-${s.key}`}>
                <button type="button" className="w-full text-start" onClick={() => { setPicked(s.key); setFact(false); setUsage(false); setFields(ALL_INPUT_FIELDS); setNotice(null); }} aria-pressed={picked === s.key} data-testid={`button-pick-seed-${s.key}`}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <NatureBadge nature={s.nature} />
                    <span className="rounded-full border border-blue/30 bg-blue-soft px-2 py-0.5 text-[10px] font-medium text-blue">{t(`pv.ct.${s.cardType}`)}</span>
                    {added && <span className="text-[10px] font-semibold text-ok">{t('pv.alreadyIn')}</span>}
                  </div>
                  <p className="mt-1.5 text-sm font-medium" dir="auto" lang={s.locale}>{s.title}</p>
                  <p className="text-xs text-muted-foreground" dir="auto" lang={s.locale}>{s.selectedJob}</p>
                </button>
                {!account && (
                  <div className="mt-2 border-t pt-2">
                    <p className="text-[11px] font-semibold text-muted-foreground">{t('pv.simulate')} · <span data-testid={`status-seed-${s.key}`}>{t('pv.statusNow', { s: t(`pv.st.${src.status}`) })}</span></p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {([
                        ['change', () => setSrc(s.key, { revision: src.revision + 1, status: 'source_changed' })],
                        ['delete', () => setSrc(s.key, { ...src, status: 'deleted' })],
                        ['revoke', () => setSrc(s.key, { ...src, status: 'revoked' })],
                        ['fail', () => setSrc(s.key, { ...src, status: 'failed' })],
                        ['reset', () => setSrc(s.key, { ...src, status: 'current' })],
                      ] as const).map(([k, fn]) => (
                        <Button key={k} size="sm" variant="outline" className="min-h-9 px-2 text-[11px]" disabled={!ack} onClick={fn} data-testid={`button-sim-${k}-${s.key}`}>{t(`pv.sim.${k}`)}</Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          {notice && (
            <p role="status" className={cn('flex items-start gap-2 rounded-lg p-3 text-sm', notice.kind === 'added' ? 'bg-ok-soft text-ok' : notice.kind === 'failed' ? 'bg-destructive/10 text-destructive' : 'bg-warn-soft text-warn')} data-testid={`status-import-${notice.kind}`}>
              {notice.kind !== 'added' && <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
              {notice.kind === 'added' ? t('pv.added') : t(`pv.st.${notice.kind}`)}
              {notice.kind === 'failed' && <Button size="sm" variant="outline" className="ms-auto min-h-9 bg-card" onClick={() => { setSrc(notice.key, { ...(data.synthetic.sources[notice.key] ?? { revision: 1 }), status: 'current' }); setNotice(null); }} data-testid="button-retry-import">{t('common.retry')}</Button>}
            </p>
          )}
          {seed ? (
            <div className="rounded-lg border bg-card p-4" data-testid="panel-input-preview">
              <p className="text-sm font-semibold">{t('pv.inputPreview')}</p>
              {(srcOf(seed).status === 'deleted' || srcOf(seed).status === 'revoked') && (
                <p role="alert" className="mt-2 rounded-lg bg-warn-soft p-3 text-sm text-warn" data-testid="status-preview-unavailable">{t(`pv.st.${srcOf(seed).status}`)}</p>
              )}
              <dl className="mt-2 space-y-2">
                {INPUT_FIELDS.map(([f, k]) => {
                  const v = seedInput(seed, srcOf(seed).revision)[f];
                  return (
                    <div key={f} className={cn(!fields.includes(f) && 'opacity-50')}>
                      <dt><label className="flex min-h-10 cursor-pointer items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                        <Checkbox checked={fields.includes(f)} disabled={account} onCheckedChange={(on) => { setFields((p) => on ? [...p, f] : p.filter((x) => x !== f)); setFact(false); setUsage(false); }} aria-label={`${t('pv.includeField')}: ${t(k)}`} data-testid={`checkbox-include-${f}`} />
                        {t(k)}</label></dt>
                      <dd>{!fields.includes(f) ? <span className="text-xs text-muted-foreground" data-testid={`text-field-excluded-${f}`}>{t('pv.fieldExcluded')}</span> : v ? <p className="text-sm" dir="auto" lang={seed.locale} data-testid={`text-preview-${f}`}>{v}</p> : <span className="text-xs text-warn">—</span>}</dd></div>
                  );
                })}
              </dl>
              <p className="mt-3 rounded bg-muted px-2 py-1.5 text-xs text-muted-foreground" data-testid="text-excluded-private">{t('pv.excluded')}</p>
              <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-3"><Checkbox className="mt-0.5" checked={fact} onCheckedChange={(v) => setFact(v === true)} disabled={account} data-testid="checkbox-fact-consent" /><span className="text-sm">{t('pv.factConsent')}</span></label>
              <label className="flex min-h-11 cursor-pointer items-start gap-3"><Checkbox className="mt-0.5" checked={usage} onCheckedChange={(v) => setUsage(v === true)} disabled={account} data-testid="checkbox-usage-consent" /><span className="text-sm">{t('pv.usageConsent')}</span></label>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button className="min-h-11" disabled={account || !ack || !fact || !usage || srcOf(seed).status === 'deleted' || srcOf(seed).status === 'revoked'} onClick={add} data-testid="button-add-synthetic">{t('pv.add')}</Button>
                <Button variant="outline" className="min-h-11" onClick={() => { setFact(false); setUsage(false); }} data-testid="button-reconfirm-synthetic">{t('pv.reconfirm')}</Button>
                <Button variant="ghost" className="min-h-11" onClick={reset} data-testid="button-cancel-synthetic">{t('common.cancel')}</Button>
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t('pv.groupLabel')}</p>
          )}
          <ReportOrderView order={adaptReportOrder({ ...SYNTHETIC_REPORT_INPUT, jobs: seeds.slice(0, 2).map((s) => ({ title: s.selectedJob, reason: s.checkCriterion })) })} synthetic />
        </div>
      </div>
    </section>
  );
}
