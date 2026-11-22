import { PracticeLinkDialog } from './practice-link-dialog';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Home, ScanSearch, Heart, Compass, GraduationCap, Route as RouteIcon, CalendarDays, NotebookPen, Map, FileText, Settings, AlertTriangle, Menu, FlaskConical, PlugZap } from 'lucide-react';
import { cn } from '@/vendor/career-lab/lib/utils';
import { useLab } from '@/vendor/career-lab/lib/store';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/vendor/career-lab/components/ui/sheet';
import { LanguageStatus } from '@/vendor/career-lab/components/lab/language-controls';
import { useLocale } from '@/vendor/career-lab/lib/locale';

export const NAV = [
  { href: '/', label: '나의 LAB', icon: Home },
  { href: '/understand', label: '나 이해하기', icon: ScanSearch, n: '01' },
  { href: '/interests', label: '관심사 결합', icon: Heart, n: '02' },
  { href: '/explore', label: '가능성 탐색', icon: Compass, n: '03' },
  { href: '/majors', label: '대학·학과', icon: GraduationCap, n: '04' },
  { href: '/design', label: '진로 설계', icon: RouteIcon, n: '05' },
  { href: '/planner', label: '플래너', icon: CalendarDays, n: '06' },
  { href: '/experiences', label: '경험 기록', icon: NotebookPen, n: '07' },
  { href: '/map', label: '진로 지도', icon: Map, n: '08' },
  { href: '/story', label: '나의 이야기', icon: FileText, n: '09' },
  { href: '/settings', label: '설정·데이터', icon: Settings },
];
const MOBILE = ['/', '/explore', '/planner', '/experiences', '/story'];

export function Shell({ children }: { children: ReactNode }) {
  const { t, effectiveLocale, formatDateTime } = useLocale();
  const menuTrigger = useRef<HTMLButtonElement | null>(null);
  const [loc] = useLocation();
  const { mode, setMode, saveError, retrySave, lastSaved } = useLab();
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const isActive = (h: string) => (h === '/' ? loc === '/' : loc.startsWith(h));
  const demo = mode === 'demo';

  useEffect(() => {
    const cur = NAV.find(n => (n.href === '/' ? loc === '/' : loc.startsWith(n.href)));
    const page = cur ? (cur.href === '/' ? '나의 LAB 홈' : cur.label) : '페이지를 찾을 수 없음';
    document.title = `${t(page)} · ${t(demo ? '예시 체험' : '임시 작성')} · ${t('진로 탐색 LAB')}`;
  }, [loc, demo, effectiveLocale, t]);

  const navLinks = (onPick?: () => void) => NAV.map(n => (
    <Link key={n.href} href={n.href} onClick={onPick} data-testid={`link-nav-${n.href.slice(1) || 'home'}${onPick ? '-mobile' : ''}`} aria-current={isActive(n.href) ? 'page' : undefined}
      className={cn('group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', isActive(n.href) ? 'bg-foreground text-background' : 'text-foreground/75 hover:bg-sidebar-accent hover:text-foreground')}>
      <n.icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">{t(n.label)}</span>
      {n.n && <span className={cn('font-mono text-[10px]', isActive(n.href) ? 'text-background/60' : 'text-muted-foreground/60')}>{n.n}</span>}
    </Link>
  ));

  const saveBox = (
    <div className={cn('rounded-lg border p-3 text-[11px] leading-relaxed', demo ? 'border-[hsl(var(--coral)/0.35)] bg-accent/60 text-accent-foreground' : 'border-dashed border-primary/30 bg-background/60 text-muted-foreground')} data-testid="status-save-location">
      <p className="font-semibold text-foreground">{demo ? '예시 브라우저 저장' : '임시 작성 브라우저 저장'}</p>
      <p className="mt-0.5">{demo ? '가상 예시 공간 · 이 브라우저에만' : '서버 저장 아님 · 이 브라우저에만'}{lastSaved && <> · {formatDateTime(lastSaved)}</>}</p>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-sidebar px-4 py-6 lg:flex">
        <Link href="/" className="mb-8 block px-2" data-testid="link-logo">
          <span className="text-[11px] font-semibold tracking-[0.2em] text-primary">CAREER LAB</span>
          <span className="font-display block text-xl font-bold leading-tight">진로 탐색 LAB</span>
        </Link>
        <nav className="flex-1 space-y-0.5 overflow-y-auto" aria-label="주 메뉴">{navLinks()}</nav>
        <div className="mt-4">{saveBox}</div>
      </aside>

      <header dir="ltr" className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" dir="auto" className="font-display min-w-0 flex-1 text-sm font-bold leading-tight sm:text-lg">진로 탐색 LAB</Link>
        <div className="flex shrink-0 items-center gap-1">
        {!wide && <LanguageStatus />}
        <button onClick={e => { menuTrigger.current = e.currentTarget; setOpen(true); }} aria-label="전체 메뉴 열기" aria-expanded={open} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg hover:bg-muted" data-testid="button-menu"><Menu className="h-5 w-5" /></button>
        </div>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="z-[60] w-72 overflow-y-auto bg-sidebar p-5" onCloseAutoFocus={e => { e.preventDefault(); menuTrigger.current?.focus(); }}>
          <SheetTitle className="font-display text-lg">전체 메뉴</SheetTitle>
          <SheetDescription className="sr-only">진로 탐색 LAB의 모든 단계로 이동해요. Esc로 닫을 수 있어요.</SheetDescription>
          <nav className="mt-4 space-y-0.5" aria-label="전체 메뉴">{navLinks(() => setOpen(false))}</nav>
          <div className="mt-5">{saveBox}</div>
        </SheetContent>
      </Sheet>

      <main className="pb-28 lg:pb-12 lg:pl-60">
        <div dir="ltr" className="no-print hidden justify-end border-b bg-card/70 px-5 py-2 lg:flex">{wide && <LanguageStatus />}</div>
        {demo ? (
          <div className="no-print flex flex-wrap items-center justify-between gap-2 bg-coral px-5 py-2.5 text-sm font-medium text-white" role="status" data-testid="banner-demo">
            <span className="flex items-start gap-2"><FlaskConical className="mt-0.5 h-4 w-4 shrink-0" /><span><b>예시 체험 중</b> · 가상 학생의 예시 기록이며 실제 AI 결과가 아니에요. 이 브라우저에만 따로 저장되고, 설정에서 처음 상태로 되돌릴 수 있어요.</span></span>
            <span className="flex gap-2">
              <Link href="/settings" className="rounded-full bg-white/15 px-3 py-1 hover:bg-white/25" data-testid="link-demo-settings">초기화·저장 안내</Link>
              <button onClick={() => setMode('user')} className="rounded-full bg-white/25 px-3 py-1 font-semibold hover:bg-white/35" data-testid="button-leave-demo">예시 나가기 · 연결 대기 공간으로</button>
            </span>
          </div>
        ) : (
          <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-primary/25 bg-secondary px-5 py-2.5 text-sm text-secondary-foreground" role="status" data-testid="banner-pending">
            <span className="flex items-start gap-2"><PlugZap className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><b>기존 서버 연결 대기 · 임시 작성 공간</b> · 로그인된 사용자가 없고, 서버 저장과 AI는 아직 쓸 수 없어요. 입력한 내용은 이 브라우저의 임시 초안으로만 남아요.</span></span>
            <span className="flex gap-2">
              <Link href="/settings" className="rounded-full border border-primary/30 px-3 py-1 hover:bg-background/60" data-testid="link-pending-settings">자세히</Link>
              <button onClick={() => setMode('demo')} className="rounded-full bg-primary px-3 py-1 font-semibold text-primary-foreground hover:brightness-110" data-testid="button-banner-demo">예시 체험 시작</button>
            </span>
          </div>
        )}
        {saveError && (
          <div className="flex flex-wrap items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-5 py-2.5 text-sm text-destructive" role="alert" data-testid="error-save">
            <AlertTriangle className="h-4 w-4" /><span className="flex-1">{saveError}</span>
            <button onClick={retrySave} className="font-semibold underline" data-testid="button-retry-save">브라우저에 다시 저장</button>
          </div>
        )}
        <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-12">{children}</div>
        <PracticeLinkDialog />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t bg-background/95 backdrop-blur lg:hidden" aria-label="핵심 메뉴">
        {MOBILE.map(h => { const n = NAV.find(x => x.href === h)!; return (
          <Link key={h} href={h} aria-current={isActive(h) ? 'page' : undefined} className={cn('flex flex-col items-center gap-0.5 py-2.5 text-[11px]', isActive(h) ? 'text-primary font-semibold' : 'text-muted-foreground')}><n.icon className="h-5 w-5" />{n.label.replace('나의 ', '')}</Link>
        ); })}
        <button onClick={e => { menuTrigger.current = e.currentTarget; setOpen(true); }} className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] text-muted-foreground" data-testid="button-menu-bottom"><Menu className="h-5 w-5" />전체</button>
      </nav>
    </div>
  );
}
