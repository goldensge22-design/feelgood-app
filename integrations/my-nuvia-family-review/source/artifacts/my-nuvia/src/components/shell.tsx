import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { BookOpenText, CalendarCheck2, CalendarDays, Globe, Landmark, PenLine, Sun, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LANGS, useI18n, type LangCode, type TKey } from '@/i18n';
import { pickSubject, useNav, useSession } from '@/lib/nuvia';

export function LangSelect() {
  const { lang, setLang, t, enRegion, setEnRegion } = useI18n();
  return (
    <div dir="ltr" className="flex max-w-full min-w-0 flex-row-reverse flex-wrap items-center gap-1.5">
      <label className="relative flex max-w-full min-w-0 items-center">
        <span className="sr-only">{t('lang.label')}</span>
        <Globe className="pointer-events-none absolute start-2.5 h-4 w-4 text-sky" aria-hidden />
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as LangCode)}
          className="tap max-w-full appearance-none rounded-xl border border-input bg-card ps-8 pe-3 text-sm font-medium text-navy"
          data-testid="select-language"
        >
          {LANGS.map((l) => (
            <option key={l.code} value={l.code} lang={l.code}>
              {l.native}
            </option>
          ))}
        </select>
      </label>
      {lang === 'en' && (
        <label className="flex items-center">
          <span className="sr-only">{t('lang.region')}</span>
          <select value={enRegion} onChange={(e) => setEnRegion(e.target.value as 'en-US' | 'en-GB')} className="tap rounded-xl border border-input bg-card px-2 text-sm text-navy" data-testid="select-en-region">
            <option value="en-US">US</option>
            <option value="en-GB">UK</option>
          </select>
        </label>
      )}
    </div>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <circle cx="16" cy="16" r="15" fill="hsl(var(--peach))" />
        <path d="M9 21c2-6 5-9 7-9s5 3 7 9" stroke="hsl(var(--primary))" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <circle cx="16" cy="10" r="2.6" fill="hsl(var(--plum))" />
      </svg>
      <span className="font-display text-lg font-bold tracking-tight text-navy">MY NUVIA</span>
    </span>
  );
}

const SUPPORT: { path: string; key: TKey; icon: typeof Sun }[] = [
  { path: '/', key: 'nav.today', icon: Sun },
  { path: '/weekly', key: 'nav.weekly', icon: CalendarDays },
];
const PROGRAMS: { path: string; key: TKey; icon: typeof Sun }[] = [
  { path: '/planner', key: 'nav.planner', icon: CalendarCheck2 },
  { path: '/history', key: 'nav.history', icon: Landmark },
  { path: '/story', key: 'nav.story', icon: PenLine },
];

function AccountChip() {
  const { t, fmtDate } = useI18n();
  const { data: s } = useSession();
  const { params, setParam } = useNav();
  if (!s?.authenticated) return null;
  const subj = pickSubject(s, params.get('child'));
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="hidden items-center gap-1.5 rounded-xl bg-sky-soft px-3 py-2 text-navy md:inline-flex" data-testid="text-account">
        <UserRound className="h-4 w-4 text-sky" aria-hidden />
        {s.account ? t(`acct.${s.account}` as TKey) : ''}
        {s.expiresAt && <span className="text-xs text-muted-foreground">· {t('acct.expires', { time: fmtDate(s.expiresAt, true) })}</span>}
      </span>
      {s.role === 'parent' && s.subjects.length > 1 && (
        <label>
          <span className="sr-only">{t('acct.subject')}</span>
          <select value={subj?.id ?? ''} onChange={(e) => setParam('child', e.target.value)} className="tap rounded-xl border border-input bg-card px-2 text-sm font-medium text-navy" data-testid="select-subject">
            {s.subjects.map((x) => (
              <option key={x.id} value={x.id}>
                {t(`age.${x.ageBand}` as TKey)}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

export function FamilyShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { href, loc } = useNav();
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const on = (e: FocusEvent) => setTyping(!!(e.target as HTMLElement)?.matches?.('input:not([type=checkbox]):not([type=radio]),textarea,select'));
    const off = () => setTyping(false);
    window.addEventListener('focusin', on);
    window.addEventListener('focusout', off);
    return () => {
      window.removeEventListener('focusin', on);
      window.removeEventListener('focusout', off);
    };
  }, []);
  const active = (p: string) => (p === '/' ? loc === '/' : loc.startsWith(p));
  const item = (n: (typeof SUPPORT)[number], mobile = false) => (
    <Link
      key={n.path}
      href={href(n.path)}
      aria-current={active(n.path) ? 'page' : undefined}
      data-testid={`link-nav-${n.path.slice(1) || 'today'}`}
      className={cn(
        'press tap flex items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors',
        mobile ? 'min-w-0 flex-1 flex-col justify-center gap-0.5 px-1 py-1.5 text-[11px]' : 'min-w-0',
        active(n.path) ? 'bg-navy text-background' : 'text-navy/75 hover:bg-muted hover:text-navy',
      )}
    >
      <n.icon className={mobile ? 'h-5 w-5' : 'h-4 w-4'} aria-hidden />
      <span className="max-w-full whitespace-normal break-words text-center">{t(n.key)}</span>
    </Link>
  );
  return (
    <div className="paper min-h-[100dvh]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3">
        {t('app.skip')}
      </a>
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur">
        <div dir="ltr" className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
          <Link href={href('/')} className="tap flex shrink-0 items-center" data-testid="link-home">
            <Logo />
          </Link>
          <nav aria-label={t('nav.main')} className="ms-4 hidden items-center gap-1 lg:flex">
            {item(SUPPORT[0])}
            <span className="mx-2 h-6 w-px bg-border" aria-hidden />
            <span className="sr-only">{t('nav.programs')}</span>
            {PROGRAMS.map((p) => item(p))}
            <span className="mx-2 h-6 w-px bg-border" aria-hidden />
            {item(SUPPORT[1])}
          </nav>
          <div className="ms-auto flex max-w-full min-w-0 flex-wrap items-center justify-end gap-2">
            <AccountChip />
            <LangSelect />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1360px] px-4 pb-32 pt-6 sm:px-6 sm:pt-10 lg:pb-16">
        {children}
      </main>
      <footer className="mx-auto max-w-[1360px] px-4 pb-28 text-sm text-muted-foreground sm:px-6 lg:pb-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-5">
          <span>{t('app.tag')}</span>
          <Link href={href('/review', { returnTo: loc })} className="tap inline-flex items-center gap-1.5 font-medium text-sky underline-offset-4 hover:underline" data-testid="link-review">
            <BookOpenText className="h-4 w-4" aria-hidden /> {t('nav.review')}
          </Link>
        </div>
      </footer>
      <nav
        aria-label={t('nav.main')}
        className={cn('pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-2 pt-1.5 backdrop-blur transition-transform duration-200 lg:hidden', typing && 'translate-y-full')}
      >
        <div className="mx-auto flex max-w-lg gap-1">{[SUPPORT[0], ...PROGRAMS, SUPPORT[1]].map((n) => item(n, true))}</div>
      </nav>
    </div>
  );
}
