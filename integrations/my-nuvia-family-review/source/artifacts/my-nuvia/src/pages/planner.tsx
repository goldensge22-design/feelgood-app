import { useEffect, useRef, useState } from 'react';
import { Archive, ArrowRight, CalendarCheck2, Check, Clock, Flag, Lightbulb, MessageCircle, Pause, Pencil, Play, Plus, RotateCcw, Sparkles, X } from 'lucide-react';
import type { Plan } from '@workspace/api-client-react';
import { useI18n, type TKey } from '@/i18n';
import { cn } from '@/lib/utils';
import { fmtClock, useLocalDraft, useNav, useNow } from '@/lib/nuvia';
import { Btn, Card, Chip, ErrorBanner, Field, PageHead, SavedFlash, TextArea, TextInput } from '@/components/bits';
import { FamilyGate, WeeklyPanel, SourceRecord, type FamilyCtx } from '@/components/family';

type PlanDraft = { draftId: string; editId: string | null; title: string; steps: string; example: string; duration: string; source: string };
const emptyDraft = (): PlanDraft => ({ draftId: crypto.randomUUID(), editId: null, title: '', steps: '', example: '', duration: '', source: 'planner' });

export default function PlannerPage() {
  return <FamilyGate>{(ctx) => <Planner ctx={ctx} />}</FamilyGate>;
}

function Planner({ ctx }: { ctx: FamilyCtx }) {
  const { t } = useI18n();
  const { ws, subject } = ctx;
  const { params, setParam } = useNav();
  const [draft, setDraft, clearDraft, hadDraft] = useLocalDraft<PlanDraft | null>(`nuvia.draft.${ctx.scope}.plan`, null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (params.get('draft') !== 'first-week' || draft) return;
    setDraft({
      ...emptyDraft(), draftId: `first-week-${subject.id}-${ws.version}`, title: t('plan.placeholderTitle'),
      steps: t('plan.placeholderSteps'), example: '', source: 'first-week',
    });
    // Consume the entry intent, not the draft: refresh/language changes keep the
    // stored draft, and confirming it must not immediately reopen a new form.
    setParam('draft', null);
  }, [params.get('draft'), subject.id, draft, ws.plans, setDraft, t]);

  useEffect(() => {
    const raw = sessionStorage.getItem(`nuvia.transfer.${ctx.scope}`);
    if (raw) {
      sessionStorage.removeItem(`nuvia.transfer.${ctx.scope}`);
      try {
        const tr = JSON.parse(raw) as { title: string; steps: string[]; example: string; source?: string };
        setDraft({ ...emptyDraft(), title: tr.title, steps: tr.steps.join('\n'), example: tr.example, source: tr.source ?? 'history' });
        setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      } catch {
        /* ignore malformed */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = ws.plans.filter((p) => p.status !== 'archived');
  const archived = ws.plans.filter((p) => p.status === 'archived');
  const runningId = ws.plans.find((p) => p.status === 'running')?.id ?? null;
  const focusId = params.get('activity');

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <PageHead eyebrow={t('nav.programs')} title={t('planner.title')} sub={t('planner.sub')} icon={<CalendarCheck2 className="h-8 w-8 text-primary" aria-hidden />} />
        <SourceRecord ctx={ctx} kind="planner" />
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] xl:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)]">
          <div className="min-w-0 space-y-5">
            <div ref={formRef}>
              {draft ? (
                <PlanForm ctx={ctx} draft={draft} setDraft={setDraft} clear={clearDraft} restored={hadDraft} />
              ) : (
                <Btn onClick={() => setDraft(emptyDraft())} className="w-full sm:w-auto" data-testid="button-new-plan">
                  <Plus className="h-4 w-4" aria-hidden /> {t('planner.new')}
                </Btn>
              )}
            </div>
            {visible.length === 0 && !draft && (
              <Card className="text-center text-muted-foreground" data-testid="text-plans-empty">
                <Sparkles className="mx-auto mb-2 h-6 w-6 text-plum" aria-hidden />
                {t('planner.empty')}
              </Card>
            )}
            {visible.map((p) => (
              <PlanCard
                key={p.id}
                ctx={ctx}
                plan={p}
                otherRunning={!!runningId && runningId !== p.id}
                focused={focusId === p.id}
                onFocus={() => setParam('activity', p.id)}
                onEdit={() => setDraft({ ...emptyDraft(), editId: p.id, title: p.title, steps: p.steps.join('\n'), example: p.example, duration: p.duration ? String(Math.round(p.duration / 60)) : '', source: p.source })}
              />
            ))}
            {archived.length > 0 && (
              <details className="rounded-2xl border border-border bg-card/60 p-4">
                <summary className="tap flex cursor-pointer items-center gap-2 font-semibold text-navy">
                  <Archive className="h-4 w-4" aria-hidden /> {t('status.archived')} ({archived.length})
                </summary>
                <div className="mt-3 space-y-3">
                  {archived.map((p) => (
                    <PlanCard key={p.id} ctx={ctx} plan={p} otherRunning={!!runningId} focused={false} onFocus={() => setParam('activity', p.id)} onEdit={() => undefined} />
                  ))}
                </div>
              </details>
            )}
          </div>
          <aside className="min-w-0 space-y-5">
            <Card tone="plum" className="rise-2">
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
                <Lightbulb className="h-5 w-5 text-plum" aria-hidden /> {t('planner.how')}
              </h2>
              <ol className="space-y-2.5 text-sm text-navy/85">
                {(['planner.how1', 'planner.how2', 'planner.how3', 'planner.how4'] as TKey[]).map((k, i) => (
                  <li key={k} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card font-mono text-xs text-plum">{i + 1}</span>
                    <span>{t(k)}</span>
                  </li>
                ))}
              </ol>
            </Card>
            <NotesCard ctx={ctx} />
          </aside>
        </div>
      </div>
      <aside className="min-w-0 xl:pt-24">
        <div className="xl:sticky xl:top-24">
          <WeeklyPanel ctx={ctx} compact />
        </div>
      </aside>
    </div>
  );
}

type Suggest = { kind: 'easier' | 'speak' | 'missed'; text: string };

function PlanForm({ ctx, draft, setDraft, clear, restored }: { ctx: FamilyCtx; draft: PlanDraft; setDraft: (d: PlanDraft) => void; clear: () => void; restored: boolean }) {
  const { t } = useI18n();
  const { act } = ctx;
  const [sug, setSug] = useState<Suggest | null>(null);
  const [deferred, setDeferred] = useState<Suggest[]>([]);
  const exampleRef = useRef<HTMLTextAreaElement>(null);
  const stepsRef = useRef<HTMLTextAreaElement>(null);
  const set = (k: keyof PlanDraft, v: string) => setDraft({ ...draft, [k]: v });
  const steps = draft.steps.split('\n').map((s) => s.trim()).filter(Boolean);
  const first = steps[0] || t('plan.placeholderSteps').split('\n')[0];

  const makeSug = (kind: Suggest['kind']): Suggest => ({
    kind,
    text: kind === 'easier' ? t('help.easierText', { step: first }) : kind === 'speak' ? t('help.speakText') : t('help.missedText'),
  });
  const apply = (s: Suggest, edit: boolean) => {
    if (s.kind === 'easier') setDraft({ ...draft, steps: [s.text, ...steps.slice(1)].join('\n') });
    else if (s.kind === 'speak') setDraft({ ...draft, example: draft.example ? `${draft.example}\n${s.text}` : s.text });
    else setDraft({ ...draft, steps: [...steps, s.text].join('\n') });
    setSug(null);
    setDeferred((d) => d.filter((x) => x.kind !== s.kind));
    if (edit) setTimeout(() => (s.kind === 'speak' ? exampleRef : stepsRef).current?.focus(), 30);
  };

  const submit = async () => {
    const mins = draft.duration.trim() === '' ? null : Math.max(1, Math.round(Number(draft.duration)));
    const body = { title: draft.title.trim(), steps, example: draft.example.trim(), duration: mins === null || Number.isNaN(mins) ? null : mins * 60 };
    const r = draft.editId
      ? await act.run({ type: 'updatePlan', planId: draft.editId, ...body }, { key: `update-${draft.draftId}` })
      : await act.run({ type: 'createPlan', ...body, source: draft.source }, { key: `create-${draft.draftId}` });
    if (r.ok) clear();
  };
  const busy = act.pending === `create-${draft.draftId}` || act.pending === `update-${draft.draftId}`;

  return (
    <Card className="rise space-y-4 border-primary/30" data-testid="form-plan">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-xl font-bold">{draft.editId ? t('c.edit') : t('planner.new')}</h2>
        {draft.source.startsWith('history') && <span className="rounded-full bg-plum-soft px-3 py-1 text-xs font-medium text-plum">{t('plan.fromHistory')}</span>}
      </div>
      {restored && <p className="rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">{t('draft.local')}</p>}
      <Btn variant="quiet" type="button" onClick={() => setDraft({ ...draft, title: t('plan.placeholderTitle'), steps: t('plan.placeholderSteps') })} data-testid="button-plan-example">
        <Sparkles className="h-4 w-4" aria-hidden />{t('plan.exampleF')}
      </Btn>
      <Field id="plan-title" label={t('plan.titleF')}>
        <TextInput id="plan-title" value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder={t('plan.placeholderTitle')} data-testid="input-plan-title" />
      </Field>
      <Field id="plan-steps" label={t('plan.stepsF')}>
        <TextArea id="plan-steps" ref={stepsRef} value={draft.steps} onChange={(e) => set('steps', e.target.value)} placeholder={t('plan.placeholderSteps')} rows={4} data-testid="input-plan-steps" />
      </Field>
      <Field id="plan-example" label={t('plan.exampleF')} hint={t('c.optional')}>
        <TextArea id="plan-example" ref={exampleRef} value={draft.example} onChange={(e) => set('example', e.target.value)} rows={2} data-testid="input-plan-example" />
      </Field>
      <Field id="plan-duration" label={t('plan.durationF')}>
        <TextInput id="plan-duration" type="number" inputMode="numeric" min={1} max={240} value={draft.duration} onChange={(e) => set('duration', e.target.value)} className="max-w-[10rem]" data-testid="input-plan-duration" />
      </Field>

      <div className="rounded-xl bg-sky-soft p-3.5">
        <p className="mb-2 text-xs font-semibold text-sky">{t('help.title')}</p>
        <div className="flex flex-wrap gap-2">
          {([
            ['easier', Lightbulb, 'help.easier'],
            ['speak', MessageCircle, 'help.speak'],
            ['missed', RotateCcw, 'help.missed'],
          ] as const).map(([k, Icon, label]) => (
            <Btn key={k} variant="quiet" type="button" onClick={() => setSug(makeSug(k))} aria-expanded={sug?.kind === k} data-testid={`button-help-${k}`}>
              <Icon className="h-4 w-4 text-sky" aria-hidden /> {t(label)}
            </Btn>
          ))}
        </div>
        {sug && (
          <div className="rise mt-3 rounded-xl border border-sky/30 bg-card p-3" aria-live="polite" data-testid="panel-suggestion">
            <p className="text-sm text-navy">{sug.text}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Btn variant="sky" type="button" onClick={() => apply(sug, false)} data-testid="button-suggest-accept">
                <Check className="h-4 w-4" aria-hidden /> {t('help.accept')}
              </Btn>
              <Btn variant="quiet" type="button" onClick={() => apply(sug, true)} data-testid="button-suggest-edit">
                <Pencil className="h-4 w-4" aria-hidden /> {t('help.editIt')}
              </Btn>
              <Btn
                variant="ghost"
                type="button"
                onClick={() => {
                  setDeferred((d) => [...d.filter((x) => x.kind !== sug.kind), sug]);
                  setSug(null);
                }}
                data-testid="button-suggest-defer"
              >
                {t('help.defer')}
              </Btn>
            </div>
          </div>
        )}
        {deferred.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground">{t('help.deferred')}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {deferred.map((d) => (
                <button key={d.kind} type="button" onClick={() => setSug(d)} className="tap rounded-lg border border-dashed border-sky/40 px-3 text-xs text-sky" data-testid={`button-deferred-${d.kind}`}>
                  {t(`help.${d.kind}` as TKey)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <ErrorBanner error={act.error} onRetry={submit} />
      <div className="flex flex-wrap gap-2">
        <Btn onClick={submit} busy={busy} disabled={!draft.title.trim() || steps.length === 0} data-testid="button-plan-save">
          <Check className="h-4 w-4" aria-hidden /> {t('c.confirmSave')}
        </Btn>
        <Btn variant="ghost" onClick={clear} data-testid="button-plan-cancel">
          {t('draft.discard')}
        </Btn>
      </div>
    </Card>
  );
}

function PlanCard({ ctx, plan, otherRunning, focused, onFocus, onEdit }: { ctx: FamilyCtx; plan: Plan; otherRunning: boolean; focused: boolean; onFocus: () => void; onEdit: () => void }) {
  const { t } = useI18n();
  const { act } = ctx;
  const running = plan.status === 'running';
  const now = useNow(running);
  const live = plan.elapsed + (running && plan.startedAt ? Math.max(0, (now - Date.parse(plan.startedAt)) / 1000) : 0);
  const over = plan.duration !== null && live >= plan.duration;
  const [reflecting, setReflecting] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focused]);

  const go = (type: 'start' | 'pause' | 'archive' | 'resume' | 'nextStep' | 'end') => {
    onFocus();
    void act.run({ type, planId: plan.id });
  };
  const busy = act.pending === `${'start'}${plan.id}` || (act.pending?.endsWith(plan.id) ?? false);
  const tone = { ready: 'bg-muted text-navy', running: 'bg-primary text-primary-foreground', paused: 'bg-sky-soft text-sky', archived: 'bg-muted text-muted-foreground', ended: 'bg-plum-soft text-plum', completed: 'bg-sky-soft text-navy' }[plan.status];
  const pct = plan.duration ? Math.min(100, (live / plan.duration) * 100) : 0;

  return (
    <Card className={cn('lift rise', focused && 'ring-2 ring-primary/40', running && 'border-primary/40')} data-testid={`card-plan-${plan.id}`}>
      <span ref={ref as never} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-xl font-bold" data-user-content translate="no" data-testid={`text-plan-title-${plan.id}`}>
            {plan.title}
          </h3>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {t('plan.step', { a: Math.min(plan.step + 1, plan.steps.length), b: plan.steps.length })} · {plan.duration ? t('plan.minutes', { n: Math.round(plan.duration / 60) }) : t('plan.noDuration')}
          </p>
        </div>
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', tone)} data-testid={`status-plan-${plan.id}`}>
          {running && <span className="breathe h-2 w-2 rounded-full bg-current" aria-hidden />}
          {t(`status.${plan.status}` as TKey)}
        </span>
      </div>

      <ol className="mt-4 space-y-1.5">
        {plan.steps.map((s, i) => (
          <li key={i} className={cn('flex gap-3 rounded-lg px-2 py-1.5 text-[15px]', i === plan.step ? 'bg-peach font-semibold text-navy' : i < plan.step ? 'text-muted-foreground line-through decoration-1' : 'text-navy/80')} aria-current={i === plan.step ? 'step' : undefined}>
            <span className="font-mono text-xs leading-6 text-muted-foreground">{i + 1}</span>
            <span className="min-w-0" data-user-content translate="no">{s}</span>
          </li>
        ))}
      </ol>
      {plan.example && <p data-user-content translate="no" className="mt-3 rounded-lg border-s-4 border-plum/50 bg-plum-soft/60 p-3 text-sm italic text-navy/85">{plan.example}</p>}

      {(plan.status !== 'ready' || plan.elapsed > 0) && (
        <div className="mt-4">
          <div className="flex items-center gap-2 font-mono text-2xl text-navy" role="timer" aria-live="off" data-testid={`text-timer-${plan.id}`}>
            <Clock className="h-5 w-5 text-sky" aria-hidden /> {fmtClock(live)}
            {plan.duration && <span className="text-sm text-muted-foreground">/ {fmtClock(plan.duration)}</span>}
          </div>
          {plan.duration && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full origin-left rounded-full bg-sky transition-transform duration-1000" style={{ transform: `scaleX(${pct / 100})` }} />
            </div>
          )}
          {over && running && <p className="mt-2 text-sm text-plum" role="status">{t('plan.timeUp')}</p>}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {plan.status === 'ready' && (
          <>
            <Btn onClick={() => go('start')} disabled={otherRunning} busy={busy} data-testid={`button-start-${plan.id}`}>
              <Play className="h-4 w-4" aria-hidden /> {t('act.start')}
            </Btn>
            <Btn variant="quiet" onClick={onEdit} data-testid={`button-edit-${plan.id}`}>
              <Pencil className="h-4 w-4" aria-hidden /> {t('c.edit')}
            </Btn>
          </>
        )}
        {running && (
          <>
            <Btn variant="sky" onClick={() => go('pause')} busy={busy} data-testid={`button-pause-${plan.id}`}>
              <Pause className="h-4 w-4" aria-hidden /> {t('act.pause')}
            </Btn>
            {plan.step < plan.steps.length - 1 && (
              <Btn variant="quiet" onClick={() => go('nextStep')} data-testid={`button-next-${plan.id}`}>
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden /> {t('act.next')}
              </Btn>
            )}
          </>
        )}
        {(plan.status === 'paused' || plan.status === 'archived') && (
          <Btn onClick={() => go('resume')} disabled={otherRunning} busy={busy} data-testid={`button-resume-${plan.id}`}>
            <Play className="h-4 w-4" aria-hidden /> {t('act.resume')}
          </Btn>
        )}
        {(running || plan.status === 'paused') && (
          <Btn variant="quiet" onClick={() => go('end')} data-testid={`button-end-${plan.id}`}>
            <Flag className="h-4 w-4" aria-hidden /> {t('act.end')}
          </Btn>
        )}
        {['ready', 'running', 'paused'].includes(plan.status) && (
          <Btn variant="ghost" onClick={() => go('archive')} data-testid={`button-archive-${plan.id}`}>
            <Archive className="h-4 w-4" aria-hidden /> {t('act.archive')}
          </Btn>
        )}
        {plan.status === 'ended' && !reflecting && (
          <Btn onClick={() => setReflecting(true)} data-testid={`button-reflect-${plan.id}`}>
            <Sparkles className="h-4 w-4" aria-hidden /> {t('act.reflect')}
          </Btn>
        )}
      </div>
      {otherRunning && plan.status === 'ready' && <p className="mt-2 text-xs text-muted-foreground">{t('plan.oneRunning')}</p>}
      {focused && <div className="mt-3"><ErrorBanner error={act.error} /></div>}
      {reflecting && <ReflectForm ctx={ctx} plan={plan} onClose={() => setReflecting(false)} />}
    </Card>
  );
}

type RDraft = { outcome: string; help: string; feeling: string; action: string; difficulty: string; change: string; result: string; learned: string };
const R0: RDraft = { outcome: 'tried', help: '', feeling: '', action: '', difficulty: '', change: '', result: '', learned: '' };

export function ReflectForm({ ctx, plan, onClose }: { ctx: FamilyCtx; plan: Plan; onClose: () => void }) {
  const { t } = useI18n();
  const { act, session, subject } = ctx;
  const [d, setD, clear] = useLocalDraft<RDraft>(`nuvia.draft.${ctx.scope}.reflect.${plan.id}`, R0);
  const key = `reflect-${plan.id}`;
  const submit = async () => {
    const r = await act.run({ type: 'reflect', planId: plan.id, ...d }, { key });
    if (r.ok) {
      clear();
      onClose();
    }
  };
  return (
    <div className="rise mt-5 space-y-4 rounded-2xl border border-plum/25 bg-plum-soft/50 p-4" data-testid={`form-reflect-${plan.id}`}>
      <div className="flex items-center justify-between">
        <h4 className="font-display text-lg font-bold text-navy">{t('reflect.title')}</h4>
        <button type="button" onClick={onClose} className="tap flex items-center justify-center rounded-lg text-muted-foreground hover:bg-card" aria-label={t('c.close')} data-testid="button-reflect-close">
          <X className="h-5 w-5" />
        </button>
      </div>
      {session.role === 'parent' && <p className="text-xs text-plum">{t('reflect.parentNote')}</p>}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-navy">{t('reflect.outcome')}</legend>
        <div role="radiogroup" aria-label={t('reflect.outcome')} className="flex flex-wrap gap-2">
          {(['tried', 'finished', 'continue', 'skipped'] as const).map((o) => (
            <Chip key={o} active={d.outcome === o} onClick={() => setD({ ...d, outcome: o })} testId={`radio-outcome-${o}`}>
              {t(`out.${o}`)}
            </Chip>
          ))}
        </div>
        {d.outcome === 'skipped' && <p className="mt-2 text-sm text-sky">{t('reflect.skipNote')}</p>}
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-navy">{t('reflect.help')}</legend>
        <div role="radiogroup" aria-label={t('reflect.help')} className="flex flex-wrap gap-2">
          {(['alone', 'guide', 'together', ''] as const).map((h) => (
            <Chip key={h || 'none'} active={d.help === h} onClick={() => setD({ ...d, help: h })} testId={`radio-help-${h || 'none'}`}>
              {t(h ? (`hlp.${h}` as TKey) : 'hlp.none')}
            </Chip>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        {(['feeling', 'action', 'difficulty', 'change', 'result', 'learned'] as const).map((k) => (
          <Field key={k} id={`r-${plan.id}-${k}`} label={t(`f.${k}`)}>
            <TextArea id={`r-${plan.id}-${k}`} rows={2} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} data-testid={`input-reflect-${k}`} />
          </Field>
        ))}
      </div>
      <ErrorBanner error={act.error} onRetry={submit} />
      <div className="flex flex-wrap gap-2">
        <Btn onClick={submit} busy={act.pending === key} data-testid="button-reflect-save">
          <Check className="h-4 w-4" aria-hidden /> {t('c.confirmSave')}
        </Btn>
        <Btn variant="ghost" onClick={onClose} data-testid="button-reflect-later">
          {t('c.later')}
        </Btn>
      </div>
    </div>
  );
}

function NotesCard({ ctx }: { ctx: FamilyCtx }) {
  const { t } = useI18n();
  const { ws, act, session, subject } = ctx;
  const [note, setNote, clearNote] = useLocalDraft<string | null>(`nuvia.draft.${ctx.scope}.note`, null);
  const [obs, setObs, clearObs] = useLocalDraft<string | null>(`nuvia.draft.${ctx.scope}.obs`, null);
  const [flash, setFlash] = useState('');
  const save = async (type: 'saveNote' | 'saveObservation', text: string) => {
    const r = await act.run({ type, text });
    if (r.ok) {
      (type === 'saveNote' ? clearNote : clearObs)();
      setFlash(type);
      setTimeout(() => setFlash(''), 1800);
    }
  };
  const noteVal = note ?? ws.privateNote;
  const obsVal = obs ?? ws.observation;
  return (
    <Card className="no-print space-y-5">
      <div className="space-y-2">
        <h2 className="font-display text-lg font-bold">{t('note.title')}</h2>
        <p className="text-xs text-muted-foreground">{t('note.body')}</p>
        <TextArea aria-label={t('note.title')} value={noteVal} onChange={(e) => setNote(e.target.value)} rows={3} data-testid="input-private-note" />
        <div className="flex items-center gap-3">
          <Btn variant="quiet" onClick={() => save('saveNote', noteVal)} busy={act.pending === 'saveNote'} disabled={note === null} data-testid="button-save-note">
            {t('c.save')}
          </Btn>
          <SavedFlash show={flash === 'saveNote'} />
        </div>
      </div>
      {session.role === 'parent' && (
        <div className="space-y-2 border-t border-border pt-4">
          <h2 className="font-display text-lg font-bold">{t('obs.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('obs.body')}</p>
          <TextArea aria-label={t('obs.title')} value={obsVal} onChange={(e) => setObs(e.target.value)} rows={3} data-testid="input-observation" />
          <div className="flex items-center gap-3">
            <Btn variant="quiet" onClick={() => save('saveObservation', obsVal)} busy={act.pending === 'saveObservation'} disabled={obs === null} data-testid="button-save-observation">
              {t('c.save')}
            </Btn>
            <SavedFlash show={flash === 'saveObservation'} />
          </div>
        </div>
      )}
      <ErrorBanner error={act.pending ? null : act.error} />
    </Card>
  );
}
