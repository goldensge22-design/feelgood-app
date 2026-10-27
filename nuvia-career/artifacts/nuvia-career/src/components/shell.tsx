import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useClerk, useUser } from '@clerk/react';
import {
  Archive, Check, ClipboardList, Download, FileClock, FlaskConical, Globe, HardDrive, LayoutDashboard,
  ListChecks, LogIn, LogOut, Map, Menu, PenLine, PlugZap, Route as RouteIcon, Sparkles, TriangleAlert, User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LOCALES, useI18n } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace';
import { formatDate } from '@/lib/career';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PUBLIC_DEMO, clearPublicDemo } from '@/lib/public-demo';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

const PRIMARY = [
  { href: '/?view=summary', match: '/', key: 'nav.overview', icon: LayoutDashboard },
  { href: '/journey', match: '/journey', key: 'nav.journey', icon: Map },
];
const MAIN = [
  { href: '/experiences', key: 'nav.experiences', icon: Archive },
  { href: '/criteria', key: 'nav.criteria', icon: ListChecks },
  { href: '/questions', key: 'nav.questions', icon: ClipboardList },
  { href: '/write', key: 'nav.write', icon: PenLine },
  { href: '/versions', key: 'nav.versions', icon: FileClock },
  { href: '/export', key: 'nav.export', icon: Download },
];
const SECONDARY = [
  { href: '/activities', key: 'nav.activities', icon: RouteIcon },
  { href: '/connections', key: 'nav.connections', icon: PlugZap },
];

export function LanguageSwitcher({ onDark = true }: { onDark?: boolean }) {
  const { locale, localeName, setLocale, t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'tap inline-flex min-w-11 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium leading-normal',
            onDark ? 'border-white/20 text-white hover:bg-white/10' : 'border-border bg-card text-foreground hover:bg-muted',
          )}
          aria-label={`${t('lang.label')}: ${localeName}`}
          data-testid="button-language"
        >
          <Globe className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap" data-testid="text-current-language">{localeName}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[70dvh] w-64 overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{t('lang.label')}</DropdownMenuLabel>
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.id}
            onSelect={() => setLocale(l.id)}
            className="min-h-11 justify-between gap-2"
            lang={l.id}
            dir={l.id === 'ar' ? 'rtl' : 'ltr'}
            data-testid={`option-language-${l.id}`}
          >
            <span>{l.name}</span>
            <span className="flex items-center gap-1.5">
              {l.id === locale && <Check className="h-4 w-4 text-blue" />}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ModeBadge() {
  const { mode } = useWorkspace();
  const { t } = useI18n();
  const map = {
    demo: { icon: FlaskConical, cls: 'bg-primary text-primary-foreground', label: t('mode.demo') },
    guest: { icon: HardDrive, cls: 'bg-white/10 text-white border border-white/20', label: t('mode.guest') },
    account: { icon: User, cls: 'bg-blue/90 text-white', label: t('mode.account') },
  }[mode];
  const Icon = map.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', map.cls)} data-testid="status-mode">
      <Icon className="h-3.5 w-3.5" /> {map.label}
    </span>
  );
}

export function SaveIndicator({ dark = true }: { dark?: boolean }) {
  const { status, savedAt, saveNow, mode } = useWorkspace();
  const { t, locale } = useI18n();
  const label = t(`save.${status}`);
  const tone =
    status === 'error' || status === 'conflict' ? 'text-red-300' :
    status === 'saving' || status === 'dirty' ? 'text-amber-200' : 'text-emerald-200';
  return (
    <span className={cn('inline-flex items-center gap-2 text-xs', dark ? tone : 'text-muted-foreground')} role="status" aria-live="polite" data-testid="status-save">
      <span className={cn('h-2 w-2 rounded-full', status === 'saving' ? 'animate-pulse bg-amber-300' : status === 'error' || status === 'conflict' ? 'bg-red-400' : status === 'dirty' ? 'bg-amber-300' : 'bg-emerald-300')} />
      <span>{label}</span>
      {mode === 'account' && savedAt && status === 'saved' && <span className="hidden opacity-70 lg:inline">{formatDate(savedAt, locale)}</span>}
      {status === 'error' && (
        <button className="underline underline-offset-2" onClick={saveNow} data-testid="button-save-retry">{t('common.retry')}</button>
      )}
    </span>
  );
}

function AuthControl() {
  const { mode, hasUnsaved, authLoaded } = useWorkspace();
  const { t } = useI18n();
  const { signOut } = useClerk();
  const { user } = useUser();
  if (PUBLIC_DEMO) return null;
  if (!authLoaded) return null;
  if (mode !== 'account') {
    return (
      <Link href="/sign-in" className="tap hidden items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:inline-flex" data-testid="link-sign-in">
        <LogIn className="h-4 w-4" /> {t('auth.signIn')}
      </Link>
    );
  }
  const name = user?.firstName || user?.primaryEmailAddress?.emailAddress || '';
  const initials = (name || 'N').slice(0, 1).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="tap inline-flex items-center justify-center rounded-full" aria-label={t('auth.account')} data-testid="button-account">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue text-sm font-semibold text-white">{initials}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="truncate" dir="auto">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="min-h-11"
          onSelect={() => {
            if (hasUnsaved() && !window.confirm(t('auth.unsavedConfirm'))) return;
            void signOut({ redirectUrl: basePath || '/' });
          }}
          data-testid="button-sign-out"
        >
          <LogOut className="h-4 w-4" /> {t('auth.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const { t } = useI18n();
  const item = (n: { href: string; key: string; icon: typeof Archive; match?: string }) => {
    const target = n.match ?? n.href;
    const active = target === '/' ? location === '/' : location.startsWith(target);
    const Icon = n.icon;
    return (
      <Link
        key={n.href}
        href={n.href}
        onClick={onNavigate}
        className={cn(
          'group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-[14px] font-medium transition-colors',
          active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/80 hover:bg-muted hover:text-foreground',
        )}
        aria-current={active ? 'page' : undefined}
        data-testid={`link-nav-${n.key.split('.')[1]}`}
      >
        {active && <motion.span layoutId="nav-active" className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-blue" />}
        <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-blue' : 'text-muted-foreground group-hover:text-foreground')} />
        <span>{t(n.key)}</span>
      </Link>
    );
  };
  return (
    <nav aria-label={t('nav.label')} className="flex flex-col gap-0.5">
      {PRIMARY.map(item)}
      <p className="eyebrow mb-1 mt-5 px-3 text-muted-foreground">{t('nav.groupWork')}</p>
      {MAIN.map(item)}
      <p className="eyebrow mb-1 mt-5 px-3 text-muted-foreground">{t('nav.groupMore')}</p>
      {SECONDARY.map(item)}
    </nav>
  );
}

function ModeSwitch() {
  const { mode, setLocalMode, hasUnsaved } = useWorkspace();
  const { t } = useI18n();
  if (PUBLIC_DEMO) return null;
  if (mode === 'account') return null;
  return (
    <div className="mt-6 rounded-xl border bg-card p-3">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">{t('mode.switchTitle')}</p>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(['guest', 'demo'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { if (m !== mode && !hasUnsaved()) setLocalMode(m); }}
            className={cn('min-h-10 rounded-md text-xs font-semibold', mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}
            aria-pressed={mode === m}
            data-testid={`button-mode-${m}`}
          >
            {t(`mode.${m}Short`)}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{t(mode === 'demo' ? 'mode.demoHelp' : 'mode.guestHelp')}</p>
      <Link href="/sign-in" className="mt-3 flex min-h-10 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold hover:bg-muted" data-testid="link-sidebar-sign-in">
        <LogIn className="h-3.5 w-3.5" /> {t('auth.signInToSave')}
      </Link>
    </div>
  );
}

function Banners() {
  const { mode, status, reloadServer, recoverAsDraft, recovery, applyRecovery, discardRecovery, resetDemo } = useWorkspace();
  const { t } = useI18n();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      {PUBLIC_DEMO && (
        <div className="rounded-lg border border-blue/30 bg-blue-soft p-3 text-sm" data-testid="banner-public-demo">
          <p>{t('public.help')}</p>
          <button className="mt-2 min-h-11 font-semibold text-blue underline" onClick={clearPublicDemo} data-testid="button-clear-public-demo">{t('public.clear')}</button>
        </div>
      )}
      {mode === 'demo' && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground" data-testid="banner-demo">
          <FlaskConical className="h-3.5 w-3.5 text-primary" />
          <span className="flex-1">{t('demo.banner')}</span>
          {!PUBLIC_DEMO && <button className="min-h-9 font-semibold text-primary underline-offset-2 hover:underline" onClick={resetDemo} data-testid="button-reset-demo">{t('demo.reset')}</button>}
        </div>
      )}
      {mode === 'guest' && (
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground" data-testid="banner-guest">
          <HardDrive className="h-3.5 w-3.5" /> <span>{t('guest.banner')}</span>
        </div>
      )}
      {status === 'conflict' && (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm" data-testid="banner-conflict">
          <p className="flex items-center gap-2 font-semibold text-destructive"><TriangleAlert className="h-4 w-4" /> {t('conflict.title')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('conflict.body')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" className="min-h-10" disabled={busy} onClick={async () => {
              setBusy(true);
              try { const n = await recoverAsDraft(); toast({ title: t('conflict.recovered', { n }) }); }
              catch { toast({ title: t('error.load'), variant: 'destructive' }); }
              finally { setBusy(false); }
            }} data-testid="button-conflict-recover">{t('conflict.recover')}</Button>
            <Button size="sm" variant="outline" className="min-h-10" disabled={busy} onClick={async () => {
              setBusy(true);
              try { await reloadServer(); toast({ title: t('conflict.reloaded') }); }
              catch { toast({ title: t('error.load'), variant: 'destructive' }); }
              finally { setBusy(false); }
            }} data-testid="button-conflict-reload">{t('conflict.reload')}</Button>
          </div>
        </div>
      )}
      {recovery && (
        <div role="alert" className="rounded-lg border border-blue/30 bg-blue-soft p-3 text-sm" data-testid="banner-recovery">
          <p className="font-semibold text-blue">{t('recovery.title')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('recovery.body')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" className="min-h-10" onClick={applyRecovery} data-testid="button-recovery-apply">{t('recovery.apply')}</Button>
            <Button size="sm" variant="outline" className="min-h-10" onClick={discardRecovery} data-testid="button-recovery-discard">{t('recovery.discard')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { t, dir } = useI18n();
  return (
    <div className="min-h-[100dvh] bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-card focus:p-2">{t('common.skip')}</a>
      <header className="header-glow sticky top-0 z-40 text-white" dir="ltr">
        <div className="mx-auto flex min-h-16 max-w-[1440px] flex-wrap items-center gap-2 px-3 py-2 md:px-6">
          <button className="tap inline-flex items-center justify-center rounded-lg hover:bg-white/10 lg:hidden" onClick={() => setOpen(true)} aria-label={t('nav.open')} data-testid="button-menu">
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/?view=summary" className="flex min-h-11 items-center gap-2.5" data-testid="link-home">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white text-navy">
              <span className="font-display text-sm font-bold">N</span>
              <span className="absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-navy" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-[15px] font-bold tracking-[0.12em]">NUVIA</span>
              <span className="mt-1 hidden text-[10px] text-white/60 sm:block">FeelGood · {t('brand.tagline')}</span>
            </span>
          </Link>
          <div className="ms-2 hidden md:block"><ModeBadge /></div>
          <div className="ms-auto flex items-center gap-2 md:gap-3">
            <div className="hidden sm:block"><SaveIndicator /></div>
            <LanguageSwitcher />
            <AuthControl />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-16 hidden max-h-[calc(100dvh-4rem)] w-64 shrink-0 overflow-y-auto border-e bg-sidebar px-3 py-6 lg:block">
          <NavList />
          <ModeSwitch />
        </aside>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side={dir === 'rtl' ? 'right' : 'left'} className="w-[300px] overflow-y-auto bg-sidebar p-4">
            <SheetTitle className="mb-4 font-display text-base">NUVIA</SheetTitle>
            <div className="mb-4 flex flex-wrap items-center gap-2"><ModeBadgeLight /><SaveIndicator dark={false} /></div>
            <NavList onNavigate={() => setOpen(false)} />
            <ModeSwitch />
          </SheetContent>
        </Sheet>
        <main id="main" className="min-w-0 flex-1 px-4 pb-20 pt-5 md:px-8 lg:px-12">
          <div className="mx-auto max-w-5xl">
            <Banners />
            <motion.div key={location} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="pt-6">
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}

function ModeBadgeLight() {
  const { mode } = useWorkspace();
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3 py-1 text-xs font-semibold text-white">
      <Sparkles className="h-3 w-3" /> {t(`mode.${mode}`)}
    </span>
  );
}
