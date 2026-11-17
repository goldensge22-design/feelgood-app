import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, CalendarCheck2, DoorOpen, Landmark, PenLine, Play, Sparkles } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n';
import { FIRST_WEEK } from '@/i18n/first-week';
import { useNav, useSession } from '@/lib/nuvia';
import { Card } from '@/components/bits';
import { FamilyGate, PageSkel, WeeklyPanel, type FamilyCtx } from '@/components/family';
import { ReflectForm } from './planner';

function Hero() {
  const { t } = useI18n();
  return (
    <div className="rise relative overflow-hidden rounded-[28px] border border-card-border bg-card p-6 shadow-sm sm:p-10">
      <svg className="pointer-events-none absolute -end-10 -top-10 h-64 w-64 opacity-70" viewBox="0 0 200 200" aria-hidden>
        <circle cx="120" cy="80" r="70" fill="hsl(var(--peach))" />
        <circle cx="70" cy="130" r="44" fill="hsl(var(--sky-soft))" />
        <circle cx="150" cy="150" r="26" fill="hsl(var(--plum-soft))" />
      </svg>
      <p className="relative font-mono text-xs uppercase tracking-[0.16em] text-plum">{t('today.eyebrow')}</p>
      <h1 className="relative mt-3 max-w-xl font-display text-4xl font-bold leading-[1.15] sm:text-5xl">{t('today.title')}</h1>
      <p className="relative mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground">{t('today.sub')}</p>
    </div>
  );
}

function Programs() {
  const { t } = useI18n();
  const { href } = useNav();
  const items: [string, TKey, typeof Landmark, string][] = [
    ['/planner', 'nav.planner', CalendarCheck2, 'bg-peach text-primary'],
    ['/history', 'nav.history', Landmark, 'bg-sky-soft text-sky'],
    ['/story', 'nav.story', PenLine, 'bg-plum-soft text-plum'],
  ];
  return (
    <nav aria-label={t('nav.programs')} className="rise-3">
      <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">{t('nav.programs')}</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {items.map(([p, k, Icon, tone]) => (
          <li key={p}>
            <Link href={href(p)} className="lift press group flex min-h-[72px] items-center gap-3 rounded-2xl border border-card-border bg-card p-4 shadow-xs" data-testid={`card-program-${p.slice(1)}`}>
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="font-display text-lg font-bold text-navy">{t(k)}</span>
              <ArrowRight className="ms-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 rtl:rotate-180" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function TodayPage() {
  const sq = useSession();
  if (sq.isLoading) return <PageSkel />;
  if (!sq.data?.authenticated || sq.data.role === 'teacher') return <Intro />;
  return <FamilyGate>{(ctx) => <Home ctx={ctx} />}</FamilyGate>;
}

function FirstWeek({ ctx }: { ctx?: FamilyCtx }) {
  const { t, lang } = useI18n();
  const { href } = useNav();
  const labels = FIRST_WEEK[lang];
  const existing = ctx?.ws.plans.find(p => p.source === 'first-week' && ['ready', 'running', 'paused'].includes(p.status));
  return (
    <Card tone="peach" className="space-y-4" data-testid="card-first-week">
      <h2 className="font-display text-2xl font-bold">{labels.title}</h2>
      <p className="text-navy">{t('plan.placeholderTitle')}</p>
      <ol className="list-decimal space-y-1 ps-5 text-sm text-navy/80">
        {t('plan.placeholderSteps').split('\n').map(step => <li key={step}>{step}</li>)}
      </ol>
      <div className="flex flex-wrap gap-3">
        <Link href={href('/planner', existing ? { activity: existing.id } : { draft: 'first-week' })} className="press tap inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground" data-testid="link-first-plan">
          <CalendarCheck2 className="h-5 w-5 shrink-0" aria-hidden />{existing ? t('today.resume') : labels.start}
        </Link>
        <Link href={href('/history', { activity: 'family-model' })} className="press tap inline-flex items-center gap-2 rounded-xl bg-card px-4 py-3 font-semibold text-sky" data-testid="link-first-history">
          <Landmark className="h-5 w-5 shrink-0" aria-hidden />{labels.history}
        </Link>
      </div>
    </Card>
  );
}

function Intro() {
  const { t } = useI18n();
  const { href, full } = useNav();
  return (
    <div className="space-y-8">
      <Hero />
      <FirstWeek />
      <div>
        <Link href={href('/review', { returnTo: full })} className="press tap inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 font-semibold text-primary-foreground shadow-sm" data-testid="link-enter-review">
          <DoorOpen className="h-5 w-5" aria-hidden /> {t('today.enter')}
        </Link>
      </div>
      <Programs />
    </div>
  );
}

function Home({ ctx }: { ctx: FamilyCtx }) {
  const { t } = useI18n();
  const { href } = useNav();
  const { ws, subject } = ctx;
  const order = ['running', 'paused', 'ready', 'ended'];
  const priority = [...ws.plans].filter((p) => order.includes(p.status)).sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status))[0];
  const toReflect = ws.plans.find((p) => p.status === 'ended');
  const [reflecting, setReflecting] = useState(false);
  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-6">
        <Hero />
        <p className="font-mono text-xs text-muted-foreground" data-testid="text-today-summary">
          {t('today.hello', { name: t(`age.${subject.ageBand}` as TKey) })} · {t('today.plans', { n: ws.plans.length })} · {t('today.records', { n: ws.records.length })}
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          <Card tone="peach" className="rise-2" data-testid="card-priority">
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden /> {t('today.priority')}
            </h2>
            {priority ? (
              <>
                <p data-user-content translate="no" className="font-display text-2xl font-bold text-navy">{priority.title}</p>
                <p data-user-content translate="no" className="mt-1 text-sm text-navy/75">{priority.steps[priority.step] ?? ''}</p>
                <p className="mt-2 inline-block rounded-full bg-card px-3 py-1 text-xs font-semibold text-navy">{t(`status.${priority.status}` as TKey)}</p>
                <Link href={href('/planner', { activity: priority.id })} className="press tap mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground sm:w-auto sm:inline-flex" data-testid="link-resume">
                  <Play className="h-4 w-4" aria-hidden /> {priority.status === 'ready' ? t('today.open') : t('today.resume')}
                </Link>
              </>
            ) : (
              <>
                <p className="text-navy/80">{t('today.noPlan')}</p>
                <Link href={href('/planner')} className="press tap mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground" data-testid="link-make-plan">
                  {t('today.makePlan')}
                </Link>
              </>
            )}
          </Card>
          <Card className="rise-3" data-testid="card-reflect">
            <h2 className="mb-3 font-display text-xl font-bold">{t('today.reflectTitle')}</h2>
            {toReflect ? (
              reflecting ? (
                <ReflectForm ctx={ctx} plan={toReflect} onClose={() => setReflecting(false)} />
              ) : (
                <>
                  <p data-user-content translate="no" className="text-navy">{toReflect.title}</p>
                  <button type="button" onClick={() => setReflecting(true)} className="press tap mt-4 inline-flex items-center gap-2 rounded-xl border border-input px-4 font-semibold text-navy hover:bg-muted" data-testid="button-today-reflect">
                    {t('today.reflectCta')}
                  </button>
                </>
              )
            ) : (
              <p className="text-sm text-muted-foreground">{t('today.reflectEmpty')}</p>
            )}
          </Card>
        </div>
        <FirstWeek ctx={ctx} />
        <Programs />
      </div>
      <aside className="min-w-0">
        <WeeklyPanel ctx={ctx} compact />
      </aside>
    </div>
  );
}
