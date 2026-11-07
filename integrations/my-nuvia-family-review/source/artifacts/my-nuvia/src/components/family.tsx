import { Fragment, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { CalendarDays, DoorOpen, KeyRound } from 'lucide-react';
import type { ReviewSession, ReviewWorkspace, Subject } from '@workspace/api-client-react';
import { useI18n, type TKey } from '@/i18n';
import { resolveSubject, toApiErr, useAct, useNav, useSession, useWorkspace } from '@/lib/nuvia';
import { Btn, Card, Chip, ErrorBanner, Skel } from './bits';

export type FamilyCtx = {
  session: ReviewSession;
  subject: Subject;
  ws: ReviewWorkspace;
  act: ReturnType<typeof useAct>;
  /** local-draft scope: account + subject, never shared across accounts */
  scope: string;
};

export function GateCard() {
  const { t } = useI18n();
  const { href, full } = useNav();
  return (
    <Card tone="peach" className="rise mx-auto max-w-xl text-center">
      <KeyRound className="mx-auto mb-3 h-8 w-8 text-primary" aria-hidden />
      <h2 className="font-display text-2xl font-bold">{t('gate.title')}</h2>
      <p className="mt-2 text-muted-foreground">{t('gate.body')}</p>
      <p className="mt-2 text-sm text-muted-foreground">{t('err.session_required')}</p>
      <Link href={href('/review', { returnTo: full })} className="press tap mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground" data-testid="link-gate-review">
        <DoorOpen className="h-4 w-4" aria-hidden /> {t('gate.cta')}
      </Link>
    </Card>
  );
}

export function FamilyGate({ children }: { children: (c: FamilyCtx) => ReactNode }) {
  const { t } = useI18n();
  const { params, href, loc } = useNav();
  const sq = useSession();
  const s = sq.data;
  const isFamily = !!s?.authenticated && s.role !== 'teacher';
  const resolved = isFamily ? resolveSubject(s, params.get('child')) : { subject: null, invalid: false };
  const subject = resolved.subject;
  const wq = useWorkspace(subject?.id, isFamily);
  const act = useAct(subject?.id);

  if (sq.isLoading) return <PageSkel />;
  if (sq.isError) return <ErrorBanner error={toApiErr(sq.error)} onRetry={() => sq.refetch()} />;
  if (!s?.authenticated) return <GateCard />;
  if (s.role === 'teacher')
    return (
      <Card className="mx-auto max-w-xl text-center">
        <p className="text-navy">{t('gate.teacher')}</p>
        <Link href={href('/teacher')} className="tap mt-4 inline-flex items-center rounded-xl bg-navy px-5 font-semibold text-background" data-testid="link-teacher">
          {t('gate.teacherCta')}
        </Link>
      </Card>
    );
  if (resolved.invalid)
    return (
      <Card className="mx-auto max-w-xl text-center" role="alert" data-testid="status-subject-forbidden">
        <p className="text-navy">{t('err.subject')}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href={href(loc, { child: s.subjects[0]?.id ?? '' })} className="tap inline-flex items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground" data-testid="link-allowed-subject">
            {t('err.subjectCta')}
          </Link>
          <Link href={href('/review', { returnTo: loc })} className="tap inline-flex items-center rounded-xl border border-input px-5 font-semibold text-navy" data-testid="link-subject-reenter">
            {t('err.reconnect')}
          </Link>
        </div>
      </Card>
    );
  if (!subject) return <GateCard />;
  if (wq.isLoading) return <PageSkel />;
  if (wq.isError || !wq.data) return <ErrorBanner error={toApiErr(wq.error)} onRetry={() => wq.refetch()} />;
  const scope = `${s.space ?? 'legacy'}.${s.account ?? s.role}.${subject.id}`;
  return <Fragment key={scope}>{children({ session: s, subject, ws: wq.data, act, scope })}</Fragment>;
}

export function PageSkel() {
  return (
    <div className="space-y-4" aria-busy>
      <Skel className="h-10 w-2/3 max-w-md" />
      <Skel className="h-5 w-1/2 max-w-sm" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skel className="h-48" />
        <Skel className="h-48" />
      </div>
    </div>
  );
}

const CHOICES = ['maintain', 'reduce', 'change'] as const;

export function SourceRecord({ ctx, kind }: { ctx: FamilyCtx; kind: 'planner' | 'history' }) {
  const { params } = useNav();
  const { t, fmtDate } = useI18n();
  const r = ctx.ws.records.find(item => item.id === params.get('record') && item.kind === kind);
  if (!r) return null;
  return (
    <Card tone="sky" className="mb-5 space-y-3" data-testid="source-record">
      <h2 className="font-display text-xl font-bold">{t('story.source')} · <span data-user-content translate="no">{r.title}</span></h2>
      <p className="text-sm text-muted-foreground">{fmtDate(r.date)}</p>
      <dl className="space-y-2 text-sm">
        {(['action', 'difficulty', 'change', 'result', 'learned'] as const).map(field => r[field] ? (
          <div key={field}><dt className="font-semibold">{t(`f.${field}`)}</dt><dd data-user-content translate="no" className="whitespace-pre-wrap">{r[field]}</dd></div>
        ) : null)}
      </dl>
      {r.help && <p className="text-sm">{t('reflect.help')} · {t(`hlp.${r.help}` as TKey)}</p>}
    </Card>
  );
}

export function WeeklyPanel({ ctx, compact }: { ctx: FamilyCtx; compact?: boolean }) {
  const { t, fmtDate } = useI18n();
  const { ws, act } = ctx;
  const [choice, setChoice] = useState<string>(ws.weeklyChoice);
  const weekRecords = ws.records.filter(r => Date.parse(r.date) >= Date.now() - 7 * 86400000);
  const days = Array.from(new Set(weekRecords.map((r) => r.date.slice(0, 10)))).sort().reverse();
  const save = (c: string) => {
    setChoice(c);
    void act.run({ type: 'weekly', text: c });
  };
  const helpCounts = (['alone', 'guide', 'together'] as const).map((h) => [h, weekRecords.filter((r) => r.help === h).length] as const).filter(([, n]) => n > 0);
  return (
    <Card tone="sky" className="space-y-4" data-testid="card-weekly">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-sky" aria-hidden />
        <h2 className="font-display text-xl font-bold">{t('weekly.title')}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{t('weekly.sub')}</p>
      {days.length === 0 ? (
        <p className="rounded-xl border border-dashed border-sky/40 bg-card/60 p-4 text-sm text-navy/80" data-testid="text-weekly-empty">
          {t('weekly.empty')}
        </p>
      ) : (
        <>
          <p className="font-mono text-xs text-sky">{t('weekly.days', { n: days.length })}</p>
          <ul className="space-y-2">
            {days.slice(0, compact ? 4 : 30).map((d) => {
              const recs = weekRecords.filter((r) => r.date.slice(0, 10) === d);
              return (
                <li key={d} className="rounded-xl bg-card p-3 shadow-xs" data-testid={`row-weekly-${d}`}>
                  <p className="text-sm font-semibold text-navy">{fmtDate(d)}</p>
                  <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                    {recs.map((r) => (
                      <li key={r.id}>
                        {t(`kind.${r.kind}` as TKey)} · <span data-user-content translate="no">{r.title}</span>
                        {['tried', 'finished', 'continue', 'skipped'].includes(r.outcome) ? ` · ${t(`out.${r.outcome}` as TKey)}` : ''}
                        {['alone', 'guide', 'together'].includes(r.help) ? ` · ${t(`hlp.${r.help}` as TKey)}` : ''}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
          {helpCounts.length > 0 && (
            <div data-testid="text-weekly-help">
              <p className="text-sm font-semibold text-navy">{t('reflect.help')}</p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {helpCounts.map(([h, n]) => (
                  <li key={h} className="rounded-full bg-card px-3 py-1 text-xs text-navy">
                    {t(`hlp.${h}`)} · {n}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      <fieldset disabled={days.length === 0} className="space-y-2 disabled:opacity-50">
        <legend className="mb-2 text-sm font-semibold text-navy">{t('weekly.choice')}</legend>
        <div role="radiogroup" aria-label={t('weekly.choice')} className="flex flex-wrap gap-2">
          {CHOICES.map((c) => (
            <Chip key={c} active={choice === c} onClick={() => save(c)} testId={`radio-weekly-${c}`}>
              {t(`wk.${c}`)}
            </Chip>
          ))}
        </div>
      </fieldset>
      {ws.weeklyChoice && CHOICES.includes(ws.weeklyChoice as (typeof CHOICES)[number]) && (
        <p className="text-sm text-navy" data-testid="text-weekly-current">
          {t('weekly.current', { c: t(`wk.${ws.weeklyChoice}` as TKey) })}
        </p>
      )}
      <ErrorBanner error={act.error} onRetry={() => choice && save(choice)} />
      {act.pending === 'weekly' && <Btn variant="ghost" busy disabled aria-label={t('c.save')} className="w-full" />}
    </Card>
  );
}
