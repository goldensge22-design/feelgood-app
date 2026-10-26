import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Globe, Printer, RotateCcw, ChevronDown } from 'lucide-react';
import { CHAPTER_HASHES, DEFAULT_LOCALE, LOCALES, demoUrl, findLocale, loadPack } from '@/i18n/registry';
import type { ChapterPack, Pack } from '@/i18n/types';
import { retryLabels } from '@/i18n/bootstrap';

const VIEW_IDS = ['cover', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'checklist'];
const LAST = VIEW_IDS.length - 1;
const LS_VIEW = 'dcas-guide:view';
// v2: six-task checklist. Old four-item data under the previous key is ignored.
const LS_CHECKS = 'dcas-guide:checks:v2';
const N_CHECKS = 6;
const LS_LANG = 'dcas-guide:lang';

function fmt(s: string, vars: Record<string, string | number>) {
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}
function safeGet(k: string) {
  try { return localStorage.getItem(k); } catch { return null; }
}
function safeSet(k: string, v: string) {
  try { localStorage.setItem(k, v); } catch { /* storage unavailable */ }
}
function initialLang(): string {
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  return findLocale(fromUrl)?.code ?? findLocale(safeGet(LS_LANG))?.code ?? DEFAULT_LOCALE;
}
function viewFromHash(): number {
  return VIEW_IDS.indexOf(window.location.hash.replace('#', ''));
}
function initialView(): number {
  const h = viewFromHash();
  if (h >= 0) return h;
  const s = Number(safeGet(LS_VIEW));
  return Number.isInteger(s) && s >= 0 && s <= LAST ? s : 0;
}
function initialChecks(): boolean[] {
  try {
    const v = JSON.parse(safeGet(LS_CHECKS) ?? '[]');
    return Array.from({ length: N_CHECKS }, (_, i) => Array.isArray(v) && v.length === N_CHECKS && v[i] === true);
  } catch {
    return Array(N_CHECKS).fill(false);
  }
}
function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export default function Guide() {
  const [pack, setPack] = useState<Pack | null>(null);
  const [lang, setLang] = useState<string>(initialLang);
  const [pending, setPending] = useState<string>(lang);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<number>(initialView);
  const [checks, setChecks] = useState<boolean[]>(initialChecks);
  const headings = useRef<(HTMLHeadingElement | null)[]>([]);
  const focusNext = useRef(false);
  const req = useRef(0);

  const switchLang = useCallback(async (code: string) => {
    const id = ++req.current;
    setPending(code);
    try {
      const p = await loadPack(code);
      if (id !== req.current) return;
      // Atomic swap: pack and language change together, only after full load.
      setPack(p);
      setLang(code);
      setFailed(false);
      safeSet(LS_LANG, code);
      const u = new URL(window.location.href);
      u.searchParams.set('lang', code); // other params and hash untouched
      window.history.replaceState(window.history.state, '', u.toString());
    } catch {
      if (id !== req.current) return;
      setPending((prev) => (prev === code ? lang : prev));
      setFailed(true);
    }
  }, [lang]);

  const switchRef = useRef(switchLang);
  switchRef.current = switchLang;
  useEffect(() => { void switchRef.current(initialLang()); }, []);

  useEffect(() => {
    if (!pack) return;
    const loc = findLocale(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = loc?.dir ?? 'ltr';
    document.title = pack.meta.title;
  }, [pack, lang]);

  useEffect(() => {
    safeSet(LS_VIEW, String(view));
    const u = new URL(window.location.href);
    const want = `#${VIEW_IDS[view]}`;
    if (u.hash !== want) {
      u.hash = want;
      window.history.replaceState(window.history.state, '', u.toString());
    }
    if (focusNext.current) {
      focusNext.current = false;
      window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
      headings.current[view]?.focus({ preventScroll: true });
    }
  }, [view]);

  useEffect(() => {
    // Expand optional examples for print, restore afterwards.
    let opened: HTMLDetailsElement[] = [];
    const before = () => {
      opened = Array.from(document.querySelectorAll('details')).filter((d) => !d.open);
      opened.forEach((d) => (d.open = true));
    };
    const after = () => { opened.forEach((d) => (d.open = false)); opened = []; };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => { window.removeEventListener('beforeprint', before); window.removeEventListener('afterprint', after); };
  }, []);

  useEffect(() => { safeSet(LS_CHECKS, JSON.stringify(checks)); }, [checks]);

  useEffect(() => {
    const onHash = () => {
      const h = viewFromHash();
      if (h >= 0) { focusNext.current = true; setView(h); }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = useCallback((n: number) => {
    focusNext.current = true;
    setView(Math.max(0, Math.min(LAST, n)));
  }, []);

  if (!pack) {
    return <LoadingShell failed={failed} locale={pending} onRetry={() => void switchLang(pending)} />;
  }

  const { ui } = pack;
  const viewLabel = (i: number) =>
    i === 0 ? ui.cover : i === LAST ? pack.checklist.title : `${fmt(ui.chapterLabel, { n: i })} · ${pack.chapters[i - 1].title}`;
  const doneCount = checks.filter(Boolean).length;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <a
        href="#main"
        className="no-print sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[70] focus:rounded-md focus:bg-navy focus:px-4 focus:py-3 focus:text-paper"
        data-testid="link-skip"
      >
        {ui.skip}
      </a>

      <header className="no-print sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div dir="ltr" className="mx-auto flex h-16 max-w-[1240px] items-center gap-2 px-3 sm:px-6">
          <button
            type="button"
            onClick={() => go(0)}
            className="flex min-h-11 min-w-0 shrink items-center gap-2 rounded-md px-1 text-start"
            aria-label={ui.backToCover}
            data-testid="button-brand"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] bg-navy font-mono text-[11px] font-medium tracking-tight text-paper">DC</span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-semibold tracking-[0.14em] text-navy">D-CAS</span>
              <span className="hidden truncate text-[10px] tracking-[0.22em] text-muted-foreground sm:block">ENTERPRISE LABS</span>
            </span>
          </button>
          <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
            <label dir={findLocale(lang)?.dir ?? 'ltr'} className="relative flex min-h-11 items-center">
              <span className="sr-only">{ui.language}</span>
              <Globe className="pointer-events-none absolute start-2.5 h-4 w-4 text-cobalt" aria-hidden="true" />
              <select
                value={pending}
                onChange={(e) => void switchLang(e.target.value)}
                aria-label={ui.languageAria}
                className="h-11 max-w-[11.5rem] appearance-none rounded-md border border-input bg-card ps-8 pe-8 text-sm font-medium text-navy transition-colors hover:border-cobalt/60"
                data-testid="select-language"
              >
                {LOCALES.map((l) => (
                  <option key={l.code} value={l.code} lang={l.code} disabled={l.status === 'incomplete'}>
                    {l.native}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </label>
            <button
              type="button"
              onClick={() => window.print()}
              aria-label={ui.printAria}
              title={ui.printAria}
              className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-3 text-sm font-medium text-navy transition-colors hover:border-ember/70 hover:text-ember"
              data-testid="button-print"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{ui.print}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="main-grid mx-auto grid max-w-[1240px] gap-10 px-4 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-16">
        <aside className="no-print hidden lg:block">
          <nav aria-label={ui.tocAria} className="sticky top-24 py-10">
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{ui.toc}</p>
            <ol className="space-y-0.5 border-s border-border">
              {VIEW_IDS.map((id, i) => {
                const active = i === view;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => go(i)}
                      aria-current={active ? 'step' : undefined}
                      className={`group relative -ms-px flex min-h-11 w-full items-start gap-3 border-s-2 py-2.5 ps-4 pe-2 text-start text-sm transition-colors ${
                        active ? 'border-ember text-navy' : 'border-transparent text-muted-foreground hover:border-cobalt/40 hover:text-navy'
                      }`}
                      data-testid={`toc-${id}`}
                    >
                      <span className={`mt-0.5 w-5 shrink-0 font-mono text-[11px] ${active ? 'text-ember' : ''}`}>
                        {i === 0 ? '00' : i === LAST ? (doneCount === N_CHECKS ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : '07') : `0${i}`}
                      </span>
                      <span className={`break-words-all ${active ? 'font-semibold' : ''}`}>
                        {i === 0 ? ui.cover : i === LAST ? pack.checklist.title : pack.chapters[i - 1].title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="mt-8 ps-4 text-xs leading-relaxed text-muted-foreground">{ui.readTime}</p>
          </nav>
        </aside>

        <main id="main" tabIndex={-1} className="min-w-0 pb-24 outline-none">
          <div className="no-print sticky top-16 z-30 -mx-4 border-b border-border/70 bg-background/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
            <label className="relative block">
              <span className="sr-only">{ui.chapterSelect}</span>
              <select
                value={view}
                onChange={(e) => go(Number(e.target.value))}
                aria-label={ui.chapterSelect}
                className="h-11 w-full appearance-none rounded-md border border-input bg-card ps-3 pe-9 text-sm font-medium text-navy"
                data-testid="select-chapter"
              >
                {VIEW_IDS.map((id, i) => (
                  <option key={id} value={i}>{viewLabel(i)}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            </label>
          </div>

          <CoverPage pack={pack} active={view === 0} onStart={go} onJump={go} headingRef={(el) => (headings.current[0] = el)} />

          {pack.chapters.map((ch, i) => (
            <ChapterPage
              key={i}
              index={i}
              ch={ch}
              pack={pack}
              lang={lang}
              active={view === i + 1}
              headingRef={(el) => (headings.current[i + 1] = el)}
            >
              <Pager ui={ui} view={i + 1} go={go} labelFor={viewLabel} />
            </ChapterPage>
          ))}

          <ChecklistPage
            pack={pack}
            active={view === LAST}
            checks={checks}
            setChecks={setChecks}
            headingRef={(el) => (headings.current[LAST] = el)}
          >
            <Pager ui={ui} view={LAST} go={go} labelFor={viewLabel} />
          </ChecklistPage>
        </main>
      </div>
    </div>
  );
}

function LoadingShell({ failed, locale, onRetry }: { failed: boolean; locale: string; onRetry: () => void }) {
  return (
    <div className="min-h-[100dvh] bg-background" aria-busy={!failed}>
      <div className="h-16 border-b border-border" />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="h-[420px] animate-pulse rounded-xl bg-navy/90" />
        <div className="mt-8 space-y-3">
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </div>
        {failed && (
          <button
            type="button"
            onClick={onRetry}
            aria-label={retryLabels[locale]}
            className="mt-8 inline-flex h-11 w-11 items-center justify-center rounded-md border border-input text-navy"
            data-testid="button-retry"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

type HeadingRef = (el: HTMLHeadingElement | null) => void;

function CoverPage({ pack, active, onStart, onJump, headingRef }: { pack: Pack; active: boolean; onStart: (n: number) => void; onJump: (n: number) => void; headingRef: HeadingRef }) {
  const { ui, cover } = pack;
  return (
    <section id="cover" className="book-page pt-6 lg:pt-10" data-active={active} aria-labelledby="h-cover" data-testid="page-cover">
      <div className={`cover-panel relative overflow-hidden rounded-[14px] bg-navy text-paper ${active ? 'page-in' : ''}`}>
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(hsl(var(--paper)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--paper)) 1px, transparent 1px)', backgroundSize: '48px 48px' }} aria-hidden="true" />
        <div className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full border border-paper/15" aria-hidden="true" />
        <div className="pointer-events-none absolute -end-10 -top-10 h-44 w-44 rounded-full border border-ember/50" aria-hidden="true" />
        <div className="relative flex min-h-[min(78dvh,680px)] flex-col px-6 py-8 sm:px-12 sm:py-12">
          <div className="flex items-center justify-between gap-4 font-mono text-[11px] tracking-[0.24em] text-paper/70">
            <span>D-CAS ENTERPRISE LABS</span>
            <span aria-hidden="true">— 01</span>
          </div>
          <div className="mt-auto pt-20">
            <p className="break-words-all text-sm text-paper/75 sm:text-base">{cover.brandLine}</p>
            <div className="rule-grow my-6 h-[2px] w-16 bg-ember" aria-hidden="true" />
            <h1 id="h-cover" ref={headingRef} tabIndex={-1} className="font-display break-words-all text-[2.4rem] font-semibold leading-[1.15] tracking-tight sm:text-6xl lg:text-7xl">
              {cover.title}
            </h1>
            <p className="break-words-all mt-6 max-w-xl font-display text-lg leading-relaxed text-paper/85 sm:text-xl">{cover.subtitle}</p>
            <p className="break-words-all mt-4 max-w-xl text-sm text-paper/70">{cover.caseLine}</p>
            <figure className="avoid-break mt-8">
              <figcaption className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-paper/60">{ui.workflowLabel}</figcaption>
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-2" data-testid="list-workflow">
                {cover.workflow.map((w, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="break-words-all rounded-md bg-paper/10 px-2.5 py-1.5 text-sm text-paper ring-1 ring-paper/20">
                      <span className="me-1.5 font-mono text-[11px] text-ember">{i + 1}</span>{w}
                    </span>
                    {i < cover.workflow.length - 1 && <ArrowRight className="flip-rtl h-3.5 w-3.5 shrink-0 text-ember" aria-hidden="true" />}
                  </li>
                ))}
              </ol>
            </figure>
            <div className="no-print mt-10 grid gap-3 sm:grid-cols-2">
              {[
                { lead: cover.newLead, label: ui.startNew, to: 1, id: 'new' },
                { lead: cover.existingLead, label: ui.startExisting, to: 3, id: 'existing' },
              ].map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onStart(b.to)}
                  className={`group flex min-h-14 items-center justify-between gap-3 rounded-md px-5 py-3 text-start transition-transform hover:-translate-y-0.5 ${i === 0 ? 'bg-paper text-navy' : 'bg-transparent text-paper ring-1 ring-paper/40'}`}
                  data-testid={`button-start-${b.id}`}
                >
                  <span className="min-w-0">
                    <span className={`break-words-all block text-xs ${i === 0 ? 'text-navy/70' : 'text-paper/70'}`}>{b.lead}</span>
                    <span className="break-words-all block text-sm font-semibold">{b.label}</span>
                  </span>
                  <ArrowRight className="flip-rtl h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
              ))}
            </div>
            <p className="mt-5 font-mono text-xs tracking-wider text-paper/65">{ui.readTime}</p>
          </div>
        </div>
      </div>

      <div className="no-print mt-14 grid gap-10 md:grid-cols-[180px_minmax(0,1fr)]">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{cover.contents}</h2>
        <ol className="divide-y divide-border border-y border-border">
          {pack.chapters.map((c, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onJump(i + 1)}
                className="no-print-interactive group flex min-h-14 w-full items-baseline gap-5 py-4 text-start"
                data-testid={`button-contents-${i + 1}`}
              >
                <span className="w-7 shrink-0 font-mono text-xs text-ember">0{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-display break-words-all block text-lg text-navy transition-colors group-hover:text-cobalt">{c.title}</span>
                  <span className="break-words-all block text-sm text-muted-foreground">{c.kicker}</span>
                </span>
                <ArrowRight className="no-print flip-rtl h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-10 text-xs text-muted-foreground">{pack.disclaimer}</p>
    </section>
  );
}

function SectionLabel({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'ember' | 'cobalt' }) {
  const color = tone === 'ember' ? 'text-ember' : tone === 'cobalt' ? 'text-cobalt' : 'text-muted-foreground';
  return <p className={`mb-3 font-mono text-[11px] uppercase tracking-[0.22em] ${color}`}>{children}</p>;
}

function ChapterPage({ index, ch, pack, lang, active, headingRef, children }: { index: number; ch: ChapterPack; pack: Pack; lang: string; active: boolean; headingRef: HeadingRef; children: ReactNode }) {
  const { ui } = pack;
  const n = index + 1;
  const hashes = CHAPTER_HASHES[index];
  return (
    <section id={`ch${n}`} className="book-page pt-10 lg:pt-16" data-active={active} aria-labelledby={`h-ch${n}`} data-testid={`page-ch${n}`}>
      <div className={active ? 'stagger' : ''}>
        <header className="max-w-2xl">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            <span className="text-ember">{fmt(ui.chapterLabel, { n })}</span>
            <span aria-hidden="true" className="h-px w-6 bg-border" />
            <span className="break-words-all normal-case tracking-[0.08em]">{ch.kicker}</span>
          </p>
          <h2 id={`h-ch${n}`} ref={headingRef} tabIndex={-1} className="font-display break-words-all mt-5 text-4xl font-semibold leading-tight tracking-tight text-navy sm:text-5xl">
            {ch.title}
          </h2>
          <p className="font-display break-words-all mt-5 text-lg leading-relaxed text-foreground/80 sm:text-xl">{ch.lead}</p>
        </header>

        <dl className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
          {[
            { k: ui.who, v: ch.who, tone: 'ember' as const },
            { k: ui.prepare, v: ch.prepare, tone: 'muted' as const },
            { k: ui.open, v: ch.open, tone: 'cobalt' as const },
          ].map((r, i) => (
            <div key={i} className={`avoid-break rounded-lg border-s-2 bg-card px-4 py-3 ring-1 ring-border ${i === 2 ? 'border-cobalt' : i === 0 ? 'border-ember' : 'border-navy/30'}`}>
              <dt><SectionLabel tone={r.tone}>{r.k}</SectionLabel></dt>
              <dd className="break-words-all -mt-1 text-[15px] text-navy" data-testid={i === 2 ? `text-open-ch${n}` : undefined}>{r.v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10">
          <SectionLabel>{ui.steps}</SectionLabel>
          <ol className="grid max-w-3xl gap-3">
            {ch.steps.map((s, i) => (
              <li key={i} className="lift avoid-break flex items-start gap-4 rounded-lg border border-card-border bg-card px-5 py-4">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-navy/20 font-mono text-xs text-navy">{i + 1}</span>
                <span className="break-words-all text-[15px] leading-relaxed">{s}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="avoid-break mt-6 flex max-w-3xl items-start gap-3 rounded-lg bg-accent/70 px-5 py-4">
          <Check className="mt-1 h-4 w-4 shrink-0 text-ember" aria-hidden="true" />
          <div className="min-w-0">
            <SectionLabel tone="ember">{ui.done}</SectionLabel>
            <p className="break-words-all -mt-1 font-medium text-navy">{ch.done}</p>
          </div>
        </div>

        {ch.actions.length > 0 && (
          <div className="avoid-break mt-8 max-w-3xl">
            <SectionLabel tone="cobalt">{ui.actionsLabel}</SectionLabel>
            <ul className="grid gap-2 sm:grid-cols-2">
              {ch.actions.map((a, i) => (
                <li key={i} className="rounded-md bg-card px-4 py-3 ring-1 ring-border" data-testid={`card-action-ch${n}-${i + 1}`}>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{ui.when}</span>
                  <span className="break-words-all block text-sm text-navy">{a.when}</span>
                  <span className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ember">
                    <ArrowRight className="flip-rtl h-3 w-3" aria-hidden="true" />{ui.nextAction}
                  </span>
                  <span className="break-words-all block text-sm font-semibold text-navy">{a.next}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <FlowFigure label={ui.flowExample} items={ch.flow} />
        {index === 1 && <CompareFigure c={pack.compare} />}

        <details className="avoid-break group mt-8 max-w-3xl rounded-lg bg-secondary px-5 py-4" data-testid={`details-example-ch${n}`}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-navy">
            <span className="min-w-0">
              <span className="block font-mono text-[11px] uppercase tracking-[0.22em] text-cobalt">{ui.example}</span>
              <span className="break-words-all block font-display text-base">{ch.example.title}</span>
            </span>
            <ChevronDown className="no-print h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <ul className="mt-3 space-y-2 border-t border-navy/10 pt-3">
            {ch.example.lines.map((t, i) => (
              <li key={i} className="break-words-all text-[15px] text-navy/90">{t}</li>
            ))}
          </ul>
        </details>

        <div className="mt-10 max-w-2xl">
          <SectionLabel>{ui.notes}</SectionLabel>
          <ul className="space-y-2.5">
            {ch.notes.map((t, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-foreground/85">
                <span className="mt-[0.7em] h-1 w-3 shrink-0 bg-ember/80" aria-hidden="true" />
                <span className="break-words-all">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="no-print mt-12 flex flex-wrap gap-3">
          {hashes.map((h, i) => (
            <a
              key={h}
              href={demoUrl(lang, h)}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex min-h-11 max-w-full items-center gap-3 rounded-md border border-navy/25 bg-card px-4 py-2 text-sm text-navy transition-colors hover:border-cobalt hover:text-cobalt"
              data-testid={`link-demo-${h}`}
            >
              <span className="break-words-all">
                <span className="font-semibold">{ui.demoLink}</span>
                <span className="text-muted-foreground"> · {ch.links[i]}</span>
                <span className="sr-only"> ({ui.newTab})</span>
              </span>
              <ArrowUpRight className="flip-rtl h-4 w-4 shrink-0 transition-transform group-hover:-translate-y-0.5" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
      {children}
    </section>
  );
}

function FlowFigure({ label, items }: { label: string; items: string[] }) {
  return (
    <figure className="avoid-break mt-12 max-w-3xl rounded-xl border border-dashed border-navy/25 p-5 sm:p-6">
      <figcaption className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-cobalt" aria-hidden="true" />
        {label}
      </figcaption>
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        {items.map((t, i) => (
          <li key={i} className="flex flex-1 items-center gap-2 sm:flex-row">
            <span className={`break-words-all flex min-h-12 flex-1 items-center rounded-md px-3 py-2 text-sm ${i === items.length - 1 ? 'bg-navy text-paper' : 'bg-card text-navy ring-1 ring-border'}`}>
              {t}
            </span>
            {i < items.length - 1 && <ArrowRight className="flip-rtl hidden h-4 w-4 shrink-0 text-ember sm:block" aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </figure>
  );
}

function CompareFigure({ c }: { c: Pack['compare'] }) {
  return (
    <figure className="avoid-break mt-6 max-w-3xl rounded-xl border border-dashed border-navy/25 p-5 sm:p-6">
      <figcaption className="font-display break-words-all mb-4 text-lg text-navy">{c.title}</figcaption>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="break-words-all rounded-md border-t-2 border-navy bg-card px-4 py-4 text-sm text-navy ring-1 ring-border">
          <p className="font-semibold">{c.left}</p>
          <p className="mt-1 text-foreground/75">{c.leftBody}</p>
        </div>
        <div className="break-words-all rounded-md border-t-2 border-cobalt bg-card px-4 py-4 text-sm text-navy ring-1 ring-border">
          <p className="font-semibold">{c.right}</p>
          <p className="mt-1 text-foreground/75">{c.rightBody}</p>
        </div>
      </div>
    </figure>
  );
}

function ChecklistPage({ pack, active, checks, setChecks, headingRef, children }: { pack: Pack; active: boolean; checks: boolean[]; setChecks: (fn: (p: boolean[]) => boolean[]) => void; headingRef: HeadingRef; children: ReactNode }) {
  const c = pack.checklist;
  const done = checks.filter(Boolean).length;
  return (
    <section id="checklist" className="book-page pt-10 lg:pt-16" data-active={active} aria-labelledby="h-checklist" data-testid="page-checklist">
      <div className={active ? 'stagger' : ''}>
        <h2 id="h-checklist" ref={headingRef} tabIndex={-1} className="font-display break-words-all text-4xl font-semibold leading-tight tracking-tight text-navy sm:text-5xl">
          {c.title}
        </h2>
        <p className="font-display break-words-all mt-5 max-w-2xl text-lg text-foreground/80">{c.intro}</p>

        <fieldset className="mt-10 max-w-2xl">
          <legend className="sr-only">{c.title}</legend>
          <ul className="divide-y divide-border border-y border-border">
            {c.items.map((item, i) => (
              <li key={i}>
                <label className="group flex min-h-16 cursor-pointer items-center gap-4 py-3" data-testid={`check-item-${i + 1}`}>
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={checks[i] === true}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setChecks((p) => p.map((x, j) => (j === i ? v : x)));
                    }}
                    data-testid={`checkbox-${i + 1}`}
                  />
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-cobalt peer-focus-visible:ring-offset-2 ${checks[i] ? 'border-navy bg-navy text-paper' : 'border-navy/30 bg-card group-hover:border-cobalt'}`} aria-hidden="true">
                    {checks[i] && <Check className="check-pop h-4 w-4" strokeWidth={3} />}
                  </span>
                  <span className="font-mono w-6 text-xs text-ember">0{i + 1}</span>
                  <span className={`break-words-all text-lg transition-colors ${checks[i] ? 'text-muted-foreground line-through decoration-ember/60' : 'text-navy'}`}>{item}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <div className="mt-6 flex max-w-2xl flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-navy" aria-live="polite" data-testid="text-checklist-progress">
            {done === N_CHECKS ? <span className="font-semibold text-ember">{c.allDone}</span> : fmt(c.done, { done, total: N_CHECKS })}
          </p>
          <button
            type="button"
            onClick={() => setChecks(() => Array(N_CHECKS).fill(false))}
            disabled={done === 0}
            className="no-print inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:text-navy disabled:opacity-40"
            data-testid="button-reset-checks"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {c.reset}
          </button>
        </div>
        <div className="mt-3 h-1 max-w-2xl overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="h-full origin-left bg-ember transition-transform duration-500 rtl:origin-right" style={{ transform: `scaleX(${done / N_CHECKS})` }} />
        </div>
        <p className="mt-8 max-w-2xl text-sm text-muted-foreground">{c.note}</p>
        <p className="mt-2 max-w-2xl text-xs text-muted-foreground">{pack.disclaimer}</p>
      </div>
      {children}
    </section>
  );
}

function Pager({ ui, view, go, labelFor }: { ui: Pack['ui']; view: number; go: (n: number) => void; labelFor: (i: number) => string }) {
  const prev = view - 1;
  const next = view + 1;
  return (
    <nav aria-label={ui.pagerAria} className="no-print mt-20 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => go(prev)}
        className="group flex min-h-16 items-center gap-3 rounded-lg px-3 py-3 text-start transition-colors hover:bg-secondary"
        data-testid="button-prev"
      >
        <ArrowLeft className="flip-rtl h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{prev === 0 ? ui.backToCover : ui.prev}</span>
          <span className="break-words-all block text-sm text-navy">{labelFor(prev)}</span>
        </span>
      </button>
      {next <= LAST ? (
        <button
          type="button"
          onClick={() => go(next)}
          className="group flex min-h-16 items-center justify-end gap-3 rounded-lg bg-navy px-4 py-3 text-end text-paper transition-transform hover:-translate-y-0.5"
          data-testid="button-next"
        >
          <span className="min-w-0">
            <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-paper/70">{ui.next}</span>
            <span className="break-words-all block text-sm">{labelFor(next)}</span>
          </span>
          <ArrowRight className="flip-rtl h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => go(0)}
          className="flex min-h-16 items-center justify-end gap-3 rounded-lg border border-border px-4 py-3 text-sm text-navy transition-colors hover:border-cobalt"
          data-testid="button-cover"
        >
          {ui.backToCover}
        </button>
      )}
    </nav>
  );
}
