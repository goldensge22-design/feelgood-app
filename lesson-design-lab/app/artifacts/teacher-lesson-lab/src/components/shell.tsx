import { T } from '@/i18n/tx';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { LayoutGrid, BookOpen, FileText, Users, IdCard, SlidersHorizontal, LifeBuoy, ScrollText, Layers, Menu, X, Languages, HardDrive, Workflow } from 'lucide-react';
import { useApp, setState } from '@/lib/store';
import { LANGS, t, isRTL, type UIKey } from '@/i18n/ui';
import { cn } from '@/lib/utils';

const NAV: { href: string; key: UIKey | 'materials' | 'studio'; icon: typeof LayoutGrid }[] = [
  { href: '/', key: 'dashboard', icon: LayoutGrid },
  { href: '/studio', key: 'studio', icon: Workflow },
  { href: '/lessons', key: 'lessons', icon: BookOpen },
  { href: '/worksheets', key: 'worksheets', icon: FileText },
  { href: '/students', key: 'students', icon: Users },
  { href: '/materials', key: 'materials', icon: Layers },
  { href: '/cards', key: 'cards', icon: IdCard },
  { href: '/camp', key: 'camp', icon: SlidersHorizontal },
  { href: '/supports', key: 'supports', icon: LifeBuoy },
  { href: '/rules', key: 'rules', icon: ScrollText },
];

export const TEACHER_ONLY = ['/lessons', '/students', '/materials', '/cards'];

export function LangSelect() {
  const lang = useApp((s) => s.lang);
  return (
    <label className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-sm shadow-sm">
      <Languages className="h-4 w-4 text-primary" aria-hidden />
      <span className="sr-only">{t(lang, 'language')}</span>
      <select data-testid="select-language" value={lang} onChange={(e) => setState((s) => ({ ...s, lang: e.target.value }))} className="bg-transparent outline-none font-medium">
        {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
      </select>
    </label>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const lang = useApp((s) => s.lang);
  const [loc] = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => { document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr'; document.documentElement.lang = lang; }, [lang]);
  useEffect(() => setOpen(false), [loc]);
  const role = useApp((s) => s.studio.actor.role);
  const active = (h: string) => (h === '/' ? loc === '/' : loc.startsWith(h));
  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.filter((n) => role === 'teacher' || !TEACHER_ONLY.includes(n.href)).map(({ href, key, icon: I }) => (
        <Link key={href} href={href} data-testid={`link-nav-${key}`} className={cn('group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors', active(href) ? 'bg-sidebar-accent text-white tab-notch' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white')}>
          <I className={cn('h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5', active(href) && 'text-sidebar-primary')} />
          {key === 'studio' ? T('과정 운영 1.5') : key === 'camp' ? T('수업 운영 설정') : key === 'materials' ? T('개인 활동지·플래너 카드') : key === 'cards' ? T('이전 직무 카드') : t(lang, key)}
        </Link>
      ))}
    </nav>
  );
  const brand = (
    <Link href="/" className="block" data-testid="link-brand">
      <div className="text-[11px] font-mono tracking-[0.2em] text-sidebar-primary">FEELGOOD</div>
      <div className="text-xl font-bold text-white">{T("수업설계")}<span className="text-sidebar-primary">LAB</span></div>
      <div className="mt-1 text-[11px] text-sidebar-foreground/60">{T("교사용 · 학생 LAB과 별도")}</div>
    </Link>
  );
  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="no-print hidden lg:flex flex-col gap-8 bg-sidebar p-5 sticky top-0 h-[100dvh]">
        {brand}{nav}
        <div className="mt-auto rounded-lg border border-sidebar-border p-3 text-xs text-sidebar-foreground/70">
          <div className="flex items-center gap-1.5 font-semibold text-sidebar-foreground"><HardDrive className="h-3.5 w-3.5" />{t(lang, 'browserSaved')}</div>
          <p className="mt-1">{T("서버·계정·외부 AI")}{' '}{t(lang, 'notConnected')}{T(". 규칙 1.5 (1.2·1.1·1.0 승계)")}</p>
        </div>
      </aside>
      {open && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-sidebar/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-72 bg-sidebar p-5 flex flex-col gap-6 rise">
            <div className="flex justify-between items-start">{brand}<button data-testid="button-close-menu" onClick={() => setOpen(false)} className="text-white p-1"><X /></button></div>
            {nav}
          </div>
        </div>
      )}
      <div className="min-w-0">
        <header className="no-print sticky top-0 z-40 flex items-center gap-3 border-b bg-background/90 backdrop-blur px-4 py-2.5 lg:px-8">
          <button data-testid="button-open-menu" className="lg:hidden rounded-md p-1.5 hover:bg-muted" onClick={() => setOpen(true)} aria-label="menu"><Menu /></button>
          <div className="lg:hidden font-bold">{T("수업설계")}<span className="text-[hsl(var(--sidebar-primary))]">LAB</span></div>
          <div className="hidden md:block text-sm text-muted-foreground truncate">{t(lang, 'tagline')}</div>
          <div className="ms-auto flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">{t(lang, 'browserSaved')} · {t(lang, 'notConnected')}</span>
            <LangSelect />
          </div>
        </header>
        <main className="print-root mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHead({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-4 rise">
      <div>
        <div className="font-mono text-xs tracking-[0.18em] text-[hsl(var(--sidebar-primary))] uppercase">{kicker}</div>
        <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Btn({ children, variant = 'primary', className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'orange' | 'ghost' | 'outline' | 'danger' }) {
  const v = { primary: 'bg-primary text-primary-foreground hover:brightness-110', orange: 'bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar))] hover:brightness-105', ghost: 'hover:bg-muted', outline: 'border bg-card hover:bg-muted', danger: 'border border-destructive/40 text-destructive hover:bg-destructive/10' }[variant];
  return <button {...p} className={cn('inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition active:scale-[.97] disabled:opacity-40 disabled:pointer-events-none', v, className)}>{children}</button>;
}

export function Pill({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'orange' | 'gray' | 'red' }) {
  const c = { blue: 'bg-secondary text-secondary-foreground', orange: 'bg-accent text-accent-foreground', gray: 'bg-muted text-muted-foreground', red: 'bg-destructive/10 text-destructive' }[tone];
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap', c)}>{children}</span>;
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-xl border bg-card p-4 md:p-5 shadow-[0_1px_0_hsl(var(--border)),0_8px_24px_-16px_hsl(var(--primary)/0.25)]', className)}>{children}</section>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block font-semibold text-muted-foreground">{label}</span>{children}</label>;
}
export const inputCls = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40';

export function PendingBadge({ lang }: { lang: string }) {
  if (lang === 'ko') return null;
  return <Pill tone="orange">{t(lang, 'pending')}</Pill>;
}
