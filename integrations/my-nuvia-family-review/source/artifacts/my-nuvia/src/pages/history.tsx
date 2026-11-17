import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, CornerDownRight, Landmark, Plus, RotateCcw, Send, X } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n';
import { cn } from '@/lib/utils';
import { useLocalDraft, useNav } from '@/lib/nuvia';
import { Btn, Card, ErrorBanner, Field, PageHead, SavedFlash, TextArea } from '@/components/bits';
import { FamilyGate, SourceRecord, type FamilyCtx } from '@/components/family';

const RES = ['map', 'letters', 'ledger', 'weather', 'news'] as const;
type Res = (typeof RES)[number];
type Attempt = { order: Res[]; reason: string; result: string };
type HDraft = { order: Res[]; reason: string; difficulty: string; change: string; learned: string; attempts: Attempt[]; saveId: string; help?: string; savedRecordId?: string };
const H0 = (): HDraft => ({ order: [], reason: '', difficulty: '', change: '', learned: '', attempts: [], saveId: crypto.randomUUID() });

export default function HistoryPage() {
  return <FamilyGate>{(ctx) => <History ctx={ctx} />}</FamilyGate>;
}

function model(order: Res[], t: (k: TKey) => string) {
  if (!order.length) return '';
  const parts = [t(`mr.${order[0]}` as TKey)];
  if (!order.includes('letters')) parts.push(t('mr.missingVoices'));
  if (!order.includes('weather')) parts.push(t('mr.missingRisk'));
  if (order.includes('letters') && order.includes('weather')) parts.push(t('mr.balanced'));
  return parts.join(' ');
}

function History({ ctx }: { ctx: FamilyCtx }) {
  const { t } = useI18n();
  const { act, subject } = ctx;
  const { href, setLoc } = useNav();
  const [d, setD, clear] = useLocalDraft<HDraft>(`nuvia.draft.${ctx.scope}.history`, H0());
  // Model output is generated UI, not user input. Re-render from structured
  // choices in the selected language; never translate the user's reason.
  const shown = model(d.attempts.at(-1)?.order ?? [], t);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);

  const toggle = (r: Res) => setD({ ...d, order: d.order.includes(r) ? d.order.filter((x) => x !== r) : d.order.length < 3 ? [...d.order, r] : d.order });
  const move = (i: number, dir: -1 | 1) => {
    const o = [...d.order];
    const j = i + dir;
    if (j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]];
    setD({ ...d, order: o });
  };
  const runModel = () => {
    const result = model(d.order, t);
    setD({ ...d, attempts: [...d.attempts, { order: d.order, reason: d.reason, result }].slice(-5) });
  };
  const actionText = `${d.order.map((r) => t(`res.${r}` as TKey)).join(' → ')}${d.reason ? ` / ${d.reason}` : ''}`;
  const save = async () => {
    const r = await act.run(
      { type: 'history', title: t('hist.recordTitle'), outcome: 'tried', help: d.help ?? '', action: actionText, difficulty: d.difficulty, change: d.change, result: shown, learned: d.learned },
      { key: `history-${d.saveId}` },
    );
    if (r.ok) {
      setSaving(false);
      setFlash(true);
      setD({ ...d, saveId: crypto.randomUUID(), savedRecordId: r.data.records.at(-1)?.id });
      setTimeout(() => setFlash(false), 2000);
    }
  };
  const transfer = () => {
    sessionStorage.setItem(`nuvia.transfer.${ctx.scope}`, JSON.stringify({ title: t('hist.recordTitle'), steps: d.order.map((r) => t('hist.stepRead').replace('{r}', t(`res.${r}` as TKey))), example: d.reason, source: d.savedRecordId ? `history:${d.savedRecordId}` : 'history' }));
    setLoc(href('/planner'));
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHead eyebrow={t('nav.programs')} title={t('hist.title')} sub={t('hist.sub')} icon={<Landmark className="h-8 w-8 text-sky" aria-hidden />} />
      <SourceRecord ctx={ctx} kind="history" />
      <Card tone="sky" className="rise mb-6">
        <p className="font-display text-lg text-navy">{t('hist.scenario')}</p>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="font-display text-xl font-bold">{t('hist.pick')}</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            {RES.map((r) => {
              const on = d.order.includes(r);
              return (
                <button key={r} type="button" aria-pressed={on} onClick={() => toggle(r)} disabled={!on && d.order.length >= 3} className={cn('press tap flex items-center gap-2 rounded-xl border px-3 py-2.5 text-start text-sm font-medium disabled:opacity-40', on ? 'border-sky bg-sky-soft text-navy' : 'border-input bg-card text-navy')} data-testid={`button-resource-${r}`}>
                  {on ? <Check className="h-4 w-4 text-sky" aria-hidden /> : <Plus className="h-4 w-4 text-muted-foreground" aria-hidden />}
                  {t(`res.${r}` as TKey)}
                </button>
              );
            })}
          </div>
          {d.order.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-navy">{t('hist.order')}</h3>
              <ol className="space-y-1.5">
                {d.order.map((r, i) => (
                  <li key={r} className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/60 p-1.5 ps-3" data-testid={`row-order-${r}`}>
                    <span className="font-mono text-xs text-sky">{i + 1}</span>
                    <span className="min-w-0 flex-1 text-sm text-navy">{t(`res.${r}` as TKey)}</span>
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${t('c.up')}: ${t(`res.${r}` as TKey)}`} className="tap flex items-center justify-center rounded-lg hover:bg-card disabled:opacity-30">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === d.order.length - 1} aria-label={`${t('c.down')}: ${t(`res.${r}` as TKey)}`} className="tap flex items-center justify-center rounded-lg hover:bg-card disabled:opacity-30">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => toggle(r)} aria-label={`${t('c.remove')}: ${t(`res.${r}` as TKey)}`} className="tap flex items-center justify-center rounded-lg hover:bg-card">
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <Field id="h-reason" label={t('hist.reason')}>
            <TextArea id="h-reason" value={d.reason} onChange={(e) => setD({ ...d, reason: e.target.value })} data-testid="input-history-reason" />
          </Field>
          <Field id="h-help" label={t('reflect.help')}>
            <select id="h-help" value={d.help ?? ''} onChange={e => setD({ ...d, help: e.target.value })} className="tap w-full rounded-xl border border-input bg-card px-3 text-navy">
              <option value="">{t('c.optional')}</option>
              {(['alone', 'guide', 'together'] as const).map(h => <option key={h} value={h}>{t(`hlp.${h}`)}</option>)}
            </select>
          </Field>
          <Btn variant="sky" onClick={runModel} disabled={d.order.length === 0} data-testid="button-run-model">
            {shown ? <RotateCcw className="h-4 w-4" aria-hidden /> : <CornerDownRight className="h-4 w-4" aria-hidden />}
            {shown ? t('hist.revise') : t('hist.run')}
          </Btn>
        </Card>

        <div className="space-y-5">
          <Card tone="plum" aria-live="polite" data-testid="card-model-result">
            <h2 className="mb-2 font-display text-xl font-bold">{t('hist.result')}</h2>
            {shown ? <p className="rise leading-relaxed text-navy">{shown}</p> : <p className="text-sm text-muted-foreground">{t('hist.pick')}</p>}
          </Card>
          {d.attempts.length > 1 && (
            <Card>
              <h3 className="mb-2 text-sm font-semibold text-navy">{t('hist.prev')}</h3>
              <ul className="space-y-2 text-sm">
                {d.attempts.slice(0, -1).reverse().map((a, i) => (
                  <li key={i} className="rounded-lg bg-muted/60 p-2.5 text-muted-foreground">
                    <span className="font-medium text-navy">{a.order.map((r) => t(`res.${r}` as TKey)).join(' → ')}</span>
                    <br />
                    {model(a.order, t)}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {shown && (
            <Card className="space-y-3">
              {!saving ? (
                <div className="flex flex-wrap gap-2">
                  <Btn onClick={() => setSaving(true)} data-testid="button-history-open-save">
                    {t('hist.save')}
                  </Btn>
                  <Btn variant="quiet" onClick={transfer} data-testid="button-history-transfer">
                    <Send className="h-4 w-4 rtl:rotate-180" aria-hidden /> {t('hist.toPlanner')}
                  </Btn>
                  <SavedFlash show={flash} />
                </div>
              ) : (
                <div className="rise space-y-3" data-testid="form-history-save">
                  <p className="rounded-lg bg-muted p-2.5 text-sm text-navy">{actionText}</p>
                  {(['difficulty', 'change', 'learned'] as const).map((k) => (
                    <Field key={k} id={`h-${k}`} label={t(`f.${k}`)} hint={t('c.optional')}>
                      <TextArea id={`h-${k}`} rows={2} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} data-testid={`input-history-${k}`} />
                    </Field>
                  ))}
                  <ErrorBanner error={act.error} onRetry={save} />
                  <div className="flex flex-wrap gap-2">
                    <Btn onClick={save} busy={act.pending === `history-${d.saveId}`} data-testid="button-history-save">
                      <Check className="h-4 w-4" aria-hidden /> {t('c.confirmSave')}
                    </Btn>
                    <Btn variant="ghost" onClick={() => setSaving(false)}>
                      {t('c.cancel')}
                    </Btn>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{t('hist.transferNote')}</p>
              <button type="button" onClick={clear} className="tap text-xs text-muted-foreground underline" data-testid="button-history-reset">
                {t('draft.discard')}
              </button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
