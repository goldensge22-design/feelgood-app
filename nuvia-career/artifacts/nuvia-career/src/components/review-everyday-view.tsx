import { useState } from 'react';
import { Link } from 'wouter';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, FileText, Info, Printer, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReviewLabSearch } from '@/components/review-lab-search';
import {
  linkReason,
  type ReviewTrait, type ReviewRole, type ReviewRoleId, type ReviewNeed,
  type EverydayDraft, type EverydayPlan, type WorksheetNotes,
} from '@/lib/review-everyday-model';

export interface ReviewEverydayViewProps {
  page: 'lab' | 'activity' | 'worksheet';
  trait: ReviewTrait;
  focus?: import('@/lib/review-everyday-model').ReviewPractice;
  role: ReviewRole;
  need: ReviewNeed;
  confirmed: boolean;
  draft: EverydayDraft | null;
  error: string | null;
  onRole: (id: ReviewRoleId) => void;
  onNeed: (id: string) => void;
  onConfirm: () => void;
  onGenerate: () => void;
  onChoose: (id: string) => void;
  onPlan: (patch: Partial<EverydayPlan>) => void;
  onWorksheet: (patch: Partial<WorksheetNotes>) => void;
  onWorksheetOpen: () => void;
  onRegister: (continueToPlanner?:boolean) => void;
  onRetry?: () => void;
}

const btnPrimary = 'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
const btnGhost = 'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border bg-card px-4 text-sm font-semibold text-foreground hover:border-blue/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const field = 'min-h-11 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const label = 'flex min-h-11 flex-col justify-center gap-1 text-sm font-semibold';

function Steps({ at }: { at: number }) {
  const steps = ['연결 확인', '오늘의 연습', '활동지'];
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs font-semibold" aria-label="진행 단계">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2" aria-current={i === at ? 'step' : undefined}>
          <span className={cn('grid h-6 w-6 place-items-center rounded-full font-mono text-[11px]', i < at ? 'bg-ok text-white' : i === at ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}>{i + 1}</span>
          <span className={i === at ? 'text-foreground' : 'text-muted-foreground'}>{s}</span>
          {i < steps.length - 1 && <span aria-hidden className="h-px w-5 bg-border" />}
        </li>
      ))}
    </ol>
  );
}

function Header({ eyebrow, title, lede, step }: { eyebrow: string; title: string; lede: string; step: number }) {
  return (
    <header className="relative overflow-hidden rounded-2xl bg-navy p-6 text-white md:p-8 print:hidden">
      <div aria-hidden className="pointer-events-none absolute -end-12 -top-12 h-44 w-44 rounded-full border-[26px] border-primary/30" />
      <div className="relative flex flex-wrap items-center gap-2">
        <p className="eyebrow text-amber-300">{eyebrow}</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200"><ShieldCheck className="h-3.5 w-3.5" aria-hidden />가상 예시 · 규칙 기반 · 실시간 AI 아님</span>
      </div>
      <h1 className="relative mt-3 font-display text-2xl font-bold leading-snug md:text-3xl">{title}</h1>
      <p className="relative mt-2 max-w-2xl text-sm text-white/75 md:text-base">{lede}</p>
      <div className="relative mt-5 rounded-xl bg-white/95 px-3 py-2 text-foreground"><Steps at={step} /></div>
    </header>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm" data-testid="status-review-everyday-error">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold text-destructive">{message}</p>
        <p className="mt-1 text-muted-foreground">이 탭의 데모 내용만 영향을 받습니다.</p>
        {onRetry && <button type="button" onClick={onRetry} className={cn(btnGhost, 'mt-3')} data-testid="button-review-retry"><RotateCcw className="h-4 w-4" aria-hidden />다시 시도</button>}
      </div>
    </div>
  );
}

function Guard({ title, body, href, cta, testId }: { title: string; body: string; href: string; cta: string; testId: string }) {
  return (
    <section className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-6" data-testid="status-review-guard">
      <p className="eyebrow">먼저 해 주세요</p>
      <h2 className="mt-1 font-display text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <Link href={href} className={cn(btnPrimary, 'mt-4')} data-testid={testId}><ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />{cta}</Link>
    </section>
  );
}

function Radio({ on }: { on: boolean }) {
  return <span aria-hidden className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', on ? 'border-blue bg-blue' : 'border-input')}>{on && <span className="h-2 w-2 rounded-full bg-white" />}</span>;
}

/* Arrow-key roving radiogroup helper */
function onRadioKeys<T>(e: React.KeyboardEvent, items: T[], idx: number, pick: (item: T) => void) {
  const k = e.key;
  let next = -1;
  if (k === 'ArrowDown' || k === 'ArrowRight') next = (idx + 1) % items.length;
  else if (k === 'ArrowUp' || k === 'ArrowLeft') next = (idx - 1 + items.length) % items.length;
  if (next < 0) return;
  e.preventDefault();
  pick(items[next]);
  const group = (e.currentTarget as HTMLElement).closest('[role="radiogroup"]');
  const btns = group?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
  btns?.[next]?.focus();
}

function LabPage(p: ReviewEverydayViewProps) {
  const { role, need, trait, confirmed,focus } = p;
  const [tick, setTick] = useState(confirmed);
  const checked = confirmed || tick;
  return (
    <div className="space-y-6">
      <Header eyebrow="LAB" title="직무와 내 강점을 잇는 두 가지 방법" lede="직무 자료와 결과지의 연결을 확인하고, 쉬운 생활 상황 하나로 내 생각을 써 보세요." step={0} />
      <p role="note" className="flex gap-2 rounded-xl border bg-blue-soft p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue" aria-hidden />점수나 추론으로 맞추지 않습니다. 연결 여부는 직접 판단하고 확인합니다.
      </p>

      <section className="surface p-5 md:p-6" aria-labelledby="ev-fn1">
        <p className="eyebrow">기능 1</p>
        <h2 id="ev-fn1" className="mt-1 font-display text-lg font-bold">기업·직무 키워드 분석과 결과지 강점 매칭</h2>
        <ReviewLabSearch role={role} onRole={p.onRole}>{roles => <>
        <h4 id="ev-roles" className="text-sm font-semibold text-muted-foreground">기업·직무 선택</h4>
        <div role="radiogroup" aria-labelledby="ev-roles" className="grid gap-3 md:grid-cols-2">
          {roles.map((r, i) => {
            const on = r.id === role.id;
            return (
              <button key={r.id} type="button" role="radio" aria-checked={on} tabIndex={on || (!roles.includes(role) && i === 0) ? 0 : -1}
                onClick={() => p.onRole(r.id)} onKeyDown={(e) => onRadioKeys(e, roles, i, (x) => p.onRole(x.id))}
                className={cn('flex min-h-11 items-start justify-between gap-3 rounded-2xl border-2 p-4 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', on ? 'border-blue bg-blue-soft' : 'border-border bg-card hover:border-blue/40')}
                data-testid={`option-review-role-${r.id}`}>
                <span className="min-w-0"><span className="block font-display font-bold">{r.company}</span><span className="block text-sm font-semibold text-blue">{r.job}</span></span>
                <Radio on={on} />
              </button>
            );
          })}
        </div>
        </>}</ReviewLabSearch>
        <h3 className="mt-5 font-display font-bold">내 직무군 역량 분석</h3>
        <p className="mt-1 text-sm text-muted-foreground">현재 선택: {role.job} · 관련 역량과 가상 결과지의 강점을 비교해요.</p>
        <h4 id="ev-needs" className="mt-3 text-sm font-semibold text-muted-foreground">기업·직무 필요역량 찾기</h4>
        <div role="radiogroup" aria-labelledby="ev-needs" className="mt-2 grid gap-2">
          {role.needs.map((n, i) => {
            const on = n.id === need.id;
            return (
              <button key={n.id} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
                onClick={() => p.onNeed(n.id)} onKeyDown={(e) => onRadioKeys(e, role.needs, i, (x) => p.onNeed(x.id))}
                className={cn('flex min-h-11 items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', on ? 'border-blue bg-blue-soft' : 'border-border bg-card hover:border-blue/40')}
                data-testid={`option-review-need-${n.id}`}>
                <span className="min-w-0"><span className="font-semibold">{n.title}</span> <span className="ms-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{n.keyword}</span></span>
                <Radio on={on} />
              </button>
            );
          })}
        </div>
        <figure className="mt-5 rounded-xl border-s-4 border-warn bg-warn-soft/60 p-4" data-testid="text-review-lab-source">
          <p className="text-xs font-semibold text-warn">가상 출처 · 실제 채용 공고 아님</p>
          <blockquote className="mt-2 text-sm leading-relaxed">“{need.quote}”</blockquote>
          <figcaption className="meta mt-2">{role.sourceTitle} · {role.sourceVersion}</figcaption>
        </figure>
        <p className="mt-3 text-sm"><span className="font-semibold">직무 역량:</span> {need.title} — <span className="text-muted-foreground">{need.reason}</span></p>
        <h3 className="mt-5 font-display font-bold">내 강점과의 연결 확인하기</h3>
        <div className="mt-3 rounded-xl bg-muted/60 p-4" data-testid="text-review-lab-trait">
          <p className="text-xs font-semibold text-muted-foreground">결과의 강점 (가상)</p>
          <p className="mt-1 font-display text-lg font-bold">{trait.title}</p>
          <p className="text-sm text-muted-foreground">{trait.summary}</p>
          <p className="mt-2 text-sm"><strong>보완 필요영역 (가상):</strong> {focus?.title ?? '자료 없음 · 연결 필요'}{focus && ` · ${focus.summary}`}</p>
          <p className="mt-3 text-sm"><span className="font-semibold">이어질 수 있는 이유:</span> {linkReason(need, trait)}</p>
        </div>
        <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-[hsl(var(--primary))]" checked={checked} disabled={confirmed}
            onChange={(e) => setTick(e.target.checked)} data-testid="checkbox-review-link" />
          출처와 강점을 읽었고, 이 연결이 나에게 맞는다고 직접 판단했어요.
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {confirmed ? (
            <>
              <p className="flex items-center gap-2 text-sm font-semibold text-ok" role="status"><CheckCircle2 className="h-4 w-4" aria-hidden />연결을 확인했어요</p>
            </>
          ) : (
            <button type="button" className={btnPrimary} disabled={!tick || !!p.error} onClick={p.onConfirm} data-testid="button-review-confirm-link"><CheckCircle2 className="h-4 w-4" aria-hidden />강점 연결 확인</button>
          )}
          <Link href="/report" className={btnGhost} data-testid="link-review-back-report">결과지로</Link>
        </div>
      </section>
      <section className="surface space-y-2 p-5 md:p-6" aria-labelledby="ev-fn2">
        <p className="eyebrow">기능 2</p>
        <h2 id="ev-fn2" className="font-display text-lg font-bold">오늘의 생각 한 장 만들기</h2>
        <p className="text-sm">일상 속 작은 상황을 읽고 내 선택과 이유를 적는 5~10분 생각 노트</p>
        {!focus ? <p role="note" className="text-sm text-muted-foreground" data-testid="notice-review-focus-required">결과지의 보완 필요영역 연결이 필요합니다. 임의 진단으로 상황을 만들지 않습니다.</p> :
          confirmed && !p.error ? <Link href="/activity" className={btnPrimary} data-testid="link-review-to-activity">다음 활동 · 오늘의 생각 한 장 추천받기<ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden /></Link>
          : <p className="text-sm text-muted-foreground">위에서 연결을 확인하면 시작할 수 있어요.</p>}
      </section>
    </div>
  );
}

function ActivityPage(p: ReviewEverydayViewProps) {
  const { draft, trait, need, role,focus } = p;
  if(!focus) return <Guard title="보완 필요영역 연결이 필요해요" body="결과지에 명시된 영역으로만 생각 상황을 만듭니다." href="/report" cta="결과지로 돌아가기" testId="link-review-guard-focus"/>;
  if (!p.confirmed) return <Guard title="연결 확인이 필요해요" body="LAB에서 요구 역량과 강점의 연결을 직접 확인한 뒤 연습 후보를 볼 수 있어요." href="/lab" cta="LAB으로 돌아가기" testId="link-review-guard-lab" />;
  const sel = draft?.selected ?? null;
  return (
    <div className="space-y-6">
      <Header eyebrow="5분 생각 노트" title="오늘의 생각 한 장" lede="익숙한 일상 하나를 골라 두세 줄만 적어 보세요. 원하면 10분으로 바꿀 수 있어요." step={1} />
      <p role="note" className="flex gap-2 rounded-xl border bg-blue-soft p-4 text-sm"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue" aria-hidden />후보는 미리 정한 규칙으로 만든 제안이며, 실시간 AI가 쓰지 않습니다. 고른 뒤 내 상황에 맞게 고쳐도 됩니다.</p>
      {!draft ? (
        <section className="surface flex flex-col items-start gap-3 p-6">
          <ClipboardList className="h-6 w-6 text-blue" aria-hidden />
          <p className="text-sm text-muted-foreground">아침에 한 일을 적거나, 작은 선택을 생각하거나, 준비물을 다시 볼 수 있어요. 정답이나 점수는 없어요.</p>
          <button type="button" className={btnPrimary} disabled={!!p.error} onClick={p.onGenerate} data-testid="button-review-generate-plans">추천 상황 보기</button>
        </section>
      ) : (
        <>
          <div role="radiogroup" aria-label="연습 후보" className="grid gap-3 md:grid-cols-2">
            {draft.options.map((o, i) => {
              const on = sel?.id === o.id;
              return (
                <button key={o.id} type="button" role="radio" aria-checked={on} tabIndex={on || (!sel && i === 0) ? 0 : -1}
                  onClick={() => p.onChoose(o.id)} onKeyDown={(e) => onRadioKeys(e, draft.options, i, (x) => p.onChoose(x.id))}
                  className={cn('flex min-h-11 flex-col gap-2 rounded-2xl border-2 p-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', on ? 'border-blue bg-blue-soft' : 'border-border bg-card hover:border-blue/40')}
                  data-testid={`option-review-activity-${o.id}`}>
                  <span className="flex w-full items-start justify-between gap-2"><span className="font-display font-bold">{o.goal}</span><Radio on={on} /></span>
                  <span className="inline-flex w-fit rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{i===0?'먼저 추천 · ':''}{o.minutes}분 · {o.entry==='daily_note'?'일상 적기':'작은 선택 생각하기'}</span>
                  <span className="text-sm"><span className="font-semibold">장면</span> · {o.scene}</span>
                </button>
              );
            })}
          </div>
          {!sel && <p className="text-sm text-muted-foreground">상황 하나를 선택하면 활동지에서 생각을 쓸 수 있어요.</p>}
          {sel && !draft.registeredId && (
            <section className="surface space-y-4 p-5 md:p-6" aria-labelledby="ev-edit">
              <h2 id="ev-edit" className="font-display text-lg font-bold">선택한 상황 · {sel.goal}</h2>
              <button type="button" className={btnPrimary} disabled={!sel.goal.trim() || !!p.error} onClick={p.onWorksheetOpen} data-testid="button-review-open-worksheet"><FileText className="h-4 w-4" aria-hidden />다음 활동 · 이 상황으로 생각 쓰기</button>
              <details className="space-y-3 rounded-xl border p-3">
              <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">도움과 설정 보기 (선택)</summary>
              <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
                <label className={label}>제목<input className={field} maxLength={500} value={sel.goal} onChange={(e) => p.onPlan({ goal: e.target.value })} data-testid="input-everyday-goal" /></label>
                <fieldset className="text-sm font-semibold"><legend>시간</legend>
                  <div className="mt-1 flex gap-2">
                    {([5, 10] as const).map((m) => (
                      <button key={m} type="button" aria-pressed={sel.minutes === m} onClick={() => p.onPlan({ minutes: m })}
                        className={cn(btnGhost, 'flex-1', sel.minutes === m && 'border-blue bg-blue-soft text-blue')} data-testid={`button-everyday-minutes-${m}`}>{m}분</button>
                    ))}
                  </div>
                </fieldset>
              </div>
              <label className={label}>장면<input className={field} maxLength={500} value={sel.scene} onChange={(e) => p.onPlan({ scene: e.target.value })} data-testid="input-everyday-scene" /></label>
              <label className={label}>준비물<input className={field} maxLength={500} value={sel.materials} onChange={(e) => p.onPlan({ materials: e.target.value })} data-testid="input-everyday-materials" /></label>
              <fieldset><legend className="text-sm font-semibold">도움말</legend>
                <ol className="mt-1 space-y-2">
                  {sel.steps.map((s, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted font-mono text-xs">{i + 1}</span>
                      <input aria-label={`${i + 1}단계`} className={field} maxLength={500} value={s}
                        onChange={(e) => p.onPlan({ steps: sel.steps.map((x, j) => (j === i ? e.target.value : x)) })} data-testid={`input-everyday-step-${i}`} />
                    </li>
                  ))}
                </ol>
              </fieldset>
              <dl className="grid gap-3 rounded-xl bg-muted/60 p-4 text-sm md:grid-cols-2">
                <div><dt className="font-semibold">먼저 추천한 근거</dt><dd className="mt-1 text-muted-foreground">가상 결과지의 {focus.title} 보완영역에 맞춰 시작 순서와 도움말을 골랐어요.</dd></div>
                <div><dt className="font-semibold">내 강점을 활용하는 도움 · {trait.title}</dt><dd className="mt-1 text-muted-foreground" data-testid="text-everyday-support-reason">{sel.supportReason}</dd></div>
              </dl>
              </details>
            </section>
          )}
          {draft.registeredId && <div className="flex flex-wrap gap-2"><Link className={btnGhost} href={`/planner/card/${draft.registeredId}`}>저장한 일상기록 열기</Link>
            <button type="button" className={btnPrimary} onClick={p.onGenerate} data-testid="button-review-generate-plans">한 장 더 만들기</button></div>}
        </>
      )}
    </div>
  );
}

function WorksheetPage(p: ReviewEverydayViewProps) {
  const { draft, trait, role, need,focus } = p;
  if (!p.confirmed) return <Guard title="연결 확인이 필요해요" body="LAB에서 연결을 먼저 확인해 주세요." href="/lab" cta="LAB으로 돌아가기" testId="link-review-guard-lab" />;
  if (!draft?.selected || draft.phase !== 'worksheet') return <Guard title="연습을 먼저 골라 주세요" body="오늘의 연습을 고르고 확인하면 활동지가 열립니다." href="/activity" cta="연습 고르러 가기" testId="link-review-guard-activity" />;
  const s = draft.selected;
  const w = draft.worksheet;
  const done = !!draft.registeredId;
  return (
    <div className="space-y-4">
      <div className="print:hidden"><Steps at={2} /></div>
      <article className="rule-grid rounded-2xl border-2 bg-card p-5 shadow-sm md:p-8" aria-labelledby="ws-title">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-dashed pb-4">
          <div>
            <p className="eyebrow">오늘의 생각 한 장 · 활동지</p>
            <h1 id="ws-title" className="mt-1 font-display text-2xl font-bold">{s.goal}</h1>
            <p className="meta mt-1">{s.entry==='daily_note'?'일상 적기':'작은 선택 생각하기'} · {s.minutes}분</p>
          </div>
          <button type="button" className={cn(btnGhost, 'print:hidden')} onClick={() => window.print()} data-testid="button-worksheet-print"><Printer className="h-4 w-4" aria-hidden />인쇄</button>
        </div>
        <section className="mt-5 rounded-xl bg-muted/50 p-4"><h2 className="text-sm font-bold">1. 작은 상황 하나</h2><p className="mt-1 text-base leading-relaxed">{s.scene}</p></section>
        <details className="mt-3 rounded-xl border bg-card px-3" data-testid="text-worksheet-support">
            <summary className="min-h-11 cursor-pointer content-center text-sm font-bold">짧은 도움 · {trait.title}</summary>
            <p className="mt-1 text-sm">{trait.support}</p>
            <p className="mt-1 text-sm">{trait.before} · {s.materials}</p>
          <ol className="mt-2 space-y-2">{s.steps.map((x, i) => <li key={i} className="flex gap-3 text-sm"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-xs text-primary">{i + 1}</span>{x}</li>)}</ol>
        </details>
        <section className="mt-6 space-y-4 border-t-2 border-dashed pt-5" aria-labelledby="ws-mine">
          <h2 id="ws-mine" className="font-display text-lg font-bold">2. 내 기록 두세 줄</h2>
          <p className="text-sm text-muted-foreground">{s.entry==='daily_note'?'짧게 써도 괜찮아요. 이 기록이 성과나 업무 경험을 증명하지는 않아요.':'정답은 없어요. 실제로 이동하거나 연락하거나 물건을 사지 않아도 됩니다.'}</p>
          <label className={label}>{s.id==='simple-morning'?'오늘 한 일 · 순서와 대략 걸린 시간':s.id==='simple-bag'?'필요한 준비물과 다시 본 내용':'내가 고른 선택과 이유'}<textarea rows={3} maxLength={3000} className={field} value={w.before} disabled={done} onChange={(e) => p.onWorksheet({ before: e.target.value })} data-testid="input-worksheet-before" /></label>
          <details><summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">선택 이유를 더 적기 (선택)</summary>
          <label className={label}>선택한 이유<textarea rows={2} maxLength={3000} className={field} value={w.observation} disabled={done} onChange={(e) => p.onWorksheet({ observation: e.target.value })} data-testid="input-worksheet-observation" /></label></details>
          <div className="rounded-xl bg-blue-soft p-3"><h3 className="font-bold text-blue">3. 다시 생각해 볼 질문 하나</h3><p className="mt-1 text-sm" data-testid="text-worksheet-question">{s.question ?? trait.before}</p></div>
          <label className={label}>달리 보게 된 점이나 다음에 바꿀 점 (선택)<textarea rows={2} maxLength={3000} className={field} value={w.reflection} disabled={done} onChange={(e) => p.onWorksheet({ reflection: e.target.value })} data-testid="input-worksheet-reflection" /></label>
          <details><summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">기록 날짜 바꾸기 (기본: 오늘)</summary>
          <label className={cn(label, 'max-w-xs')}>기록할 날짜<input type="date" required aria-required className={field} value={w.date} disabled={done} onChange={(e) => p.onWorksheet({ date: e.target.value })} data-testid="input-worksheet-date" /></label></details>
          <details className="rounded-xl border p-3"><summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">이 연습을 어디에 써볼 수 있나요?</summary>
            <p className="text-sm" data-testid="text-everyday-link-reason">{s.linkReason}</p>
            <p className="mt-1 text-xs text-muted-foreground">LAB: {role.job} · {need.title} / 가상 결과지: {focus?.title ?? '이전 기록'} 보완 · {trait.title} 도움</p>
          </details>
        </section>
      </article>
      <p className="text-sm font-semibold print:hidden" data-testid="text-review-planner-next">플래너로 가볼까요? 활동지와 선택한 카드를 저장한 뒤 이어가요.</p>
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        {done ? (
          <>
            <p role="status" className="flex items-center gap-2 text-sm font-semibold text-ok"><CheckCircle2 className="h-4 w-4" aria-hidden />플래너에 등록했어요. 다시 등록하지 않습니다.</p>
            <Link href={`/planner/card/${draft.registeredId}`} className={btnPrimary} data-testid="link-review-planner-card">플래너로 가기<ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden /></Link>
          </>
        ) : (
          <>
            <button type="button" className={btnPrimary} disabled={!w.date || !w.before.trim() || !!p.error} onClick={()=>p.onRegister(true)} data-testid="button-review-register-next">저장하고 플래너로 가기</button>
            <button type="button" className={btnGhost} disabled={!w.date || !!p.error} onClick={()=>p.onRegister()} data-testid="button-review-register">{w.before.trim()?'이 화면에 남아서 등록 결과 보기':'아직 쓰지 않고 계획만 등록'}</button>
            {!w.before.trim() && <p className="text-sm text-muted-foreground">생각을 한두 줄 쓰면 플래너에서 이어갈 수 있어요.</p>}
            {!w.date && <p className="text-sm text-muted-foreground">날짜를 정하면 등록할 수 있어요.</p>}
            <Link href="/activity" className={btnGhost} data-testid="link-review-back-activity">연습 다시 고르기</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function ReviewEverydayView(props: ReviewEverydayViewProps) {
  const body = props.page === 'lab' ? <LabPage {...props} /> : props.page === 'activity' ? <ActivityPage {...props} /> : <WorksheetPage {...props} />;
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4" lang="ko" data-testid={`view-review-everyday-${props.page}`}>
      {props.error && <ErrorBox message={props.error} onRetry={props.onRetry} />}
      {body}
    </div>
  );
}
