import { useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpenText, CalendarRange, CheckCircle2, Eye, FlaskConical, History, Info, PauseCircle, PlayCircle, Plus, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  useReviewPlanner, retryReviewPlanner, emptyReviewPlan, emptyReviewNote, validReviewPlan,
  saveNewReviewDraft, addReviewCard, saveReviewPlanDraft, saveReviewNoteDraft, commitReviewPlan,
  commitReviewNote, setReviewStatus, addFreeReviewCard,
} from '@/lib/review-planner';
import type { ReviewPlan, ReviewNote, ReviewNewDraft, ReviewCard, ReviewCardStatus } from '@/lib/review-planner';
import { reviewOption } from '@/lib/review-demo-state';
import { dailyDate } from '@/lib/review-everyday-model';
import { EverydayRecordUse, EverydayRun } from '@/components/review-everyday-run';
import { ReviewActivityCollection } from '@/components/review-activity-collection';
import ReviewShortcutActions from '@/components/review-shortcut-actions';
import { ReviewDailyEntry } from '@/components/review-daily-cards';
import { cardActivity } from '@/lib/review-planner-model';
import { useI18n } from '@/lib/i18n';

export interface ReviewPlannerViewProps {
  page: 'list' | 'new' | 'card' | 'history';
  option?: string;
  id?: string;
  onUse: (id: string, revision: number) => boolean;
  isLinked?: (id:string, revision:number)=>boolean;
  hasStoryboard: boolean;
  adult?: boolean;
  onUseBundle?: (ids:string[])=>boolean;
}

const btnPrimary = 'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45';
const btnGhost = 'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border bg-card px-4 text-sm font-semibold text-foreground hover:border-blue/50 disabled:cursor-not-allowed disabled:opacity-45';
const fieldCls = 'mt-1.5 block w-full min-h-11 rounded-xl border border-input bg-card px-3 py-2.5 text-base leading-relaxed outline-none focus-visible:border-blue focus-visible:ring-2 focus-visible:ring-ring/30 md:text-sm';
const valCls = 'whitespace-pre-wrap break-words [overflow-wrap:anywhere]';

const PLAN_FIELDS: { key: keyof ReviewPlan; label: string; hint: string }[] = [
  { key: 'goal', label: '목표', hint: '이 연습으로 확인하고 싶은 것' },
  { key: 'scenario', label: '상황', hint: '어떤 장면에서 해 볼지' },
  { key: 'action', label: '계획한 행동', hint: '짧게 실제로 할 한 가지' },
  { key: 'criterion', label: '확인 기준', hint: '무엇을 보면 해냈다고 판단할지' },
  { key: 'when', label: '언제', hint: '날짜와 시간' },
];
const NOTE_FIELDS: { key: keyof ReviewNote; label: string; hint: string; required?: boolean }[] = [
  { key: 'action', label: '실제로 한 일', hint: '계획이 아니라 실제로 한 행동', required: true },
  { key: 'result', label: '결과', hint: '관찰한 그대로 (선택)' },
  { key: 'learning', label: '배운 점', hint: '내가 알게 된 것 (선택)' },
  { key: 'next', label: '다음에 해 볼 것', hint: '선택' },
];
const STATUS: Record<ReviewCardStatus, { label: string; cls: string }> = {
  planned: { label: '계획됨', cls: 'bg-muted text-muted-foreground' },
  active: { label: '진행 중', cls: 'bg-blue-soft text-blue' },
  paused: { label: '잠시 멈춤', cls: 'bg-warn-soft text-warn' },
  completed: { label: '완료', cls: 'bg-ok-soft text-ok' },
};
const ORDER: ReviewCardStatus[] = ['planned', 'active', 'completed'];

const t = (s: string) => s.trim().length > 0;
const samePlan = (a: ReviewPlan, b: ReviewPlan) => PLAN_FIELDS.every((f) => a[f.key] === b[f.key]);
const sameNote = (a: ReviewNote, b: ReviewNote) => NOTE_FIELDS.every((f) => a[f.key] === b[f.key]);
const optLabel = (o: string) => { const r = reviewOption(o); return r ? `${r.company} · ${r.job}` : o==='free'?'직접 일상 기록':o; };

function Badge({ status }: { status: ReviewCardStatus }) {
  const s = STATUS[status];
  return <span className={cn('inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold', s.cls)}>{s.label}</span>;
}

function Header({ eyebrow, title, lede }: { eyebrow: string; title: string; lede: string }) {
  return (
    <header className="relative overflow-hidden rounded-2xl bg-navy p-5 text-white md:p-8">
      <div aria-hidden className="pointer-events-none absolute -end-12 -top-12 h-40 w-40 rounded-full border-[24px] border-primary/30" />
      <div className="relative flex flex-wrap items-center gap-2">
        <p className="eyebrow text-amber-300">{eyebrow}</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200"><ShieldCheck className="h-3.5 w-3.5" aria-hidden />데모 시뮬레이션 · 이 탭에서만 유지</span>
      </div>
      <h1 className="relative mt-3 font-display text-2xl font-bold leading-snug md:text-3xl">{title}</h1>
      <p className="relative mt-2 max-w-2xl text-sm text-white/75 md:text-base">{lede}</p>
    </header>
  );
}

function Fail({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <p role="alert" className="flex gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive" data-testid="status-review-action-error"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{msg}</p>;
}

function StoreError({ error }: { error: 'read' | 'write' | null }) {
  const [failed, setFailed] = useState(false);
  if (!error) return null;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm" data-testid="status-review-planner-error">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="min-w-0">
        <p className="font-semibold text-destructive">{error === 'read' ? '플래너 기록을 불러오지 못했어요.' : '방금 내용을 저장하지 못했어요.'}</p>
        <p className="mt-1 text-muted-foreground">이 탭의 데모 기록만 영향을 받습니다. 입력한 내용은 화면에 남아 있어요.</p>
        {failed && <p className="mt-1 text-destructive">다시 시도했지만 아직 해결되지 않았어요.</p>}
        <button type="button" className={cn(btnGhost, 'mt-3')} onClick={() => setFailed(!retryReviewPlanner())} data-testid="button-review-planner-retry"><RotateCcw className="h-4 w-4" />다시 시도</button>
      </div>
    </div>
  );
}

function Field({ id, label, hint, value, onChange, type, required }: { id: string; label: string; hint: string; value: string; onChange: (v: string) => void; type?: 'datetime'; required?: boolean }) {
  return (
    <label className="block" htmlFor={id}>
      <span className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
        {label}{required && <span className="text-xs font-semibold text-primary">필수</span>}
        <span className="text-xs font-normal text-muted-foreground">{hint}</span>
      </span>
      {type === 'datetime'
        ? <input id={id} type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} className={fieldCls} data-testid={id} />
        : <textarea id={id} rows={2} maxLength={id.startsWith('input-review-plan-') ? 500 : 3000} value={value} onChange={(e) => onChange(e.target.value)} className={cn(fieldCls, 'resize-y')} dir="auto" data-testid={id} />}
    </label>
  );
}

function Rows({ rows, prefix }: { rows: [string, string][]; prefix: string }) {
  return (
    <dl className="grid gap-3">
      {rows.map(([k, v], i) => (
        <div key={k} className="min-w-0 border-s-2 border-primary/50 ps-3">
          <dt className="text-xs font-semibold text-muted-foreground">{k}</dt>
          <dd className={cn('mt-1 text-sm leading-relaxed', valCls, !t(v) && 'italic text-muted-foreground')} dir="auto" data-testid={`text-${prefix}-${i}`}>{t(v) ? v : '비어 있음'}</dd>
        </div>
      ))}
    </dl>
  );
}

const planRows = (p: ReviewPlan): [string, string][] => PLAN_FIELDS.map((f) => [f.label, p[f.key]]);
const noteRows = (n: ReviewNote): [string, string][] => NOTE_FIELDS.map((f) => [f.label, n[f.key]]);

function Progress({ status }: { status: ReviewCardStatus }) {
  const at = status === 'paused' ? 1 : ORDER.indexOf(status);
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs font-semibold" aria-label="진행 상태">
      {ORDER.map((s, i) => (
        <li key={s} className="flex items-center gap-2" aria-current={i === at ? 'step' : undefined}>
          <span className={cn('grid h-6 w-6 place-items-center rounded-full font-mono text-[11px]', i < at || status === 'completed' ? 'bg-ok text-white' : i === at ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}>{i + 1}</span>
          <span className={i === at ? 'text-foreground' : 'text-muted-foreground'}>{i === 1 && status === 'paused' ? '잠시 멈춤' : STATUS[s].label}</span>
          {i < ORDER.length - 1 && <span aria-hidden className="h-px w-4 bg-border" />}
        </li>
      ))}
    </ol>
  );
}

function CardRow({ card, href, testid, hasDraft }: { card: ReviewCard; href: string; testid: string; hasDraft?:boolean }) {
  const {t:translate}=useI18n();
  return (
    <li data-testid={`row-review-card-${card.id}`}>
      <Link href={href} className="group flex min-h-11 items-start gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-blue/60" data-testid={testid}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge status={card.status} />
            <span className="font-mono text-[11px] text-muted-foreground">r{card.revision}</span>
            {hasDraft ? <span className="text-[11px] font-semibold text-primary">이어서 쓸 내용 있음</span> : card.note ? <span className="text-[11px] font-semibold text-ok">기록 저장됨</span> : <span className="text-[11px] text-muted-foreground">기록 없음</span>}
          </div>
          <p className={cn('mt-2 font-display font-bold', valCls)} dir="auto">{card.plan.goal || '목표 없음'}</p>
          <p className={cn('mt-0.5 text-xs text-blue', valCls)} dir="auto">{card.kind==='free'?'직접 일상 기록':card.daily?translate(`daily.${card.daily.category}`):optLabel(card.option)}</p>
          {card.kind==='free' && card.note && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{card.note.action}</p>}
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 rtl:rotate-180" />
      </Link>
    </li>
  );
}

function ListPage({ cards, option, adult, hasDraft }: { cards: ReviewCard[]; option?: string; adult?:boolean;hasDraft:(id:string)=>boolean }) {
  const valid = !!option && !!reviewOption(option);
  const groups = adult ? [{label:'오늘의 활동', rows:cards.filter(c=>c.plan.when.slice(0,10)===dailyDate())},
    {label:'다른 날짜의 활동', rows:cards.filter(c=>c.plan.when.slice(0,10)!==dailyDate())}].filter(g=>g.rows.length)
    : [{label:'현재 계획',rows:cards}];
  return (
    <div className="space-y-5">
      <Header eyebrow="PLANNER" title={adult ? '플래너 일상기록' : '짧은 연습 계획'} lede={adult ? '오늘의 생각 한 장을 이어 쓰거나, 카드 없이 일상을 직접 기록해 보세요. 사용할 기록도 여기에서 고를 수 있어요.' : '한 번의 짧은 연습을 계획하고, 실제로 해 본 뒤 내가 본 것을 기록합니다.'} />
      <ReviewShortcutActions placement="planner" />
      {adult && <FreeRecordActions/>}
      {adult && <ReviewDailyEntry/>}
      {!adult&&<section className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">새 계획</p>
          <p className={cn('mt-1 text-sm', valCls)} dir="auto">{adult ? '추천에 사용할 직무와 결과지 해석은 LAB에서 확인할 수 있어요.' : valid ? `선택한 연결: ${optLabel(option!)}` : 'LAB에서 기업·직무를 먼저 골라 주세요.'}</p>
        </div>
        {!adult && valid
          ? <Link href={`/planner/new/${encodeURIComponent(option!)}`} className={btnPrimary} data-testid="link-review-new-card"><Plus className="h-4 w-4" />새 계획 만들기</Link>
          : <Link href="/lab" className={btnPrimary} data-testid="link-review-choose-role"><FlaskConical className="h-4 w-4" />LAB에서 고르기</Link>}
      </section>}
      {cards.length===0 && <div className="rounded-2xl border bg-card p-6 text-center"><CalendarRange className="mx-auto h-8 w-8 text-blue/60" /><p className="mt-2 text-sm text-muted-foreground">아직 등록한 활동이 없어요.</p></div>}
      {groups.map(g=><section key={g.label} aria-label={g.label}>
        <h2 className="font-display text-lg font-bold">{g.label} <span className="font-mono text-sm text-muted-foreground">{g.rows.length}</span></h2>
        <ul className="mt-3 space-y-2">{g.rows.map((c) => <CardRow key={c.id} card={c} href={`/planner/card/${c.id}`} testid={`link-review-card-${c.id}`} hasDraft={adult && hasDraft(c.id)} />)}</ul>
      </section>)}
      {!adult && <Link href="/history" className={btnGhost} data-testid="link-review-to-history"><History className="h-4 w-4" />히스토리 보기</Link>}
    </div>
  );
}

function NewPage({ option, draft, others }: { option: string; draft: ReviewNewDraft | undefined; others: ReviewCard[] }) {
  const [, navigate] = useLocation();
  const plan = draft?.plan ?? emptyReviewPlan();
  const [preview, setPreview] = useState<ReviewNewDraft | null>(null);
  const [checkedKey, setCheckedKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const busy = useRef(false);
  const opt = reviewOption(option);
  if (!opt) {
    return (
      <div className="space-y-5">
        <Header eyebrow="PLANNER · 새 계획" title="연결을 찾을 수 없어요" lede="LAB에서 기업·직무를 다시 골라 주세요." />
        <Link href="/lab" className={btnPrimary} data-testid="link-review-choose-role"><FlaskConical className="h-4 w-4" />LAB으로</Link>
      </div>
    );
  }
  const stale = !!preview && (preview.id !== draft?.id || !samePlan(preview.plan, plan));
  const pKey = preview ? `${preview.id}:${JSON.stringify(preview.plan)}` : null;
  const checked = !!pKey && checkedKey === pKey && !stale;
  const set = (k: keyof ReviewPlan, v: string) => { setMsg(null); if (!saveNewReviewDraft(option, { [k]: v })) setMsg('임시 저장에 실패했어요. 다시 시도해 주세요.'); };
  const doPreview = () => {
    if (!draft || !validReviewPlan(plan)) { setMsg('다섯 항목을 모두 채워 주세요.'); return; }
    setPreview({ id: draft.id, plan: { ...plan } }); setCheckedKey(null); setMsg(null);
  };
  const add = () => {
    if (!preview || !checked || busy.current) return;
    busy.current = true;
    const id = addReviewCard(option, preview);
    if (id) navigate(`/planner/card/${id}`);
    else { busy.current = false; setMsg('추가하지 못했어요. 이미 추가됐거나 내용이 바뀌었을 수 있어요.'); }
  };
  return (
    <div className="space-y-5">
      <Link href="/planner" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-blue" data-testid="link-review-back-planner"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />플래너</Link>
      <Header eyebrow="PLANNER · 새 계획" title="짧은 연습 하나 계획하기" lede={`${opt.company} · ${opt.job}`} />
      <section className="surface space-y-4 p-4 md:p-6" aria-labelledby="rp-step1">
        <h2 id="rp-step1" className="font-display text-lg font-bold"><span className="font-mono text-primary">1</span> 계획 쓰기</h2>
        <p className="text-xs text-muted-foreground">입력은 이 탭에 임시로 남아요. 다른 화면에 다녀와도 이어서 쓸 수 있어요.</p>
        {PLAN_FIELDS.map((f) => <Field key={f.key} id={`input-review-plan-${f.key}`} label={f.label} hint={f.hint} required value={plan[f.key]} onChange={(v) => set(f.key, v)} type={f.key === 'when' ? 'datetime' : undefined} />)}
        <button type="button" className={btnGhost} onClick={doPreview} disabled={!validReviewPlan(plan)} data-testid="button-review-plan-preview"><Eye className="h-4 w-4" />미리 보기</button>
      </section>
      {preview && (
        <section className="surface space-y-4 p-4 md:p-6" aria-labelledby="rp-step2">
          <h2 id="rp-step2" className="font-display text-lg font-bold"><span className="font-mono text-primary">2</span> 확인하고 추가</h2>
          {stale && <p role="status" className="flex gap-2 rounded-xl bg-warn-soft p-3 text-sm text-warn"><Info className="mt-0.5 h-4 w-4 shrink-0" />미리 본 뒤 내용이 바뀌었어요. 다시 미리 보기를 눌러 주세요.</p>}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="min-w-0 rounded-xl border-2 border-blue/40 bg-blue-soft/40 p-4"><p className="mb-2 text-xs font-semibold text-blue">새 계획 (미리 보기 시점)</p><Rows rows={planRows(preview.plan)} prefix="review-preview" /></div>
            <div className="min-w-0 rounded-xl border bg-card p-4">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">같은 연결의 기존 계획 {others.length}개</p>
              {others.length === 0 ? <p className="text-sm text-muted-foreground">기존 계획이 없어요.</p>
                : <ul className="space-y-2">{others.map((c) => <li key={c.id} className="flex items-start gap-2 text-sm"><Badge status={c.status} /><span className={cn('min-w-0', valCls)} dir="auto">{c.plan.goal}</span></li>)}</ul>}
            </div>
          </div>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 text-sm">
            <Checkbox key={pKey ?? ''} checked={checked} disabled={stale} onCheckedChange={(v) => setCheckedKey(v === true ? pKey : null)} className="mt-0.5" data-testid="checkbox-review-add" />
            <span>미리 본 내용 그대로 새 계획으로 추가합니다.</span>
          </label>
          <button type="button" className={btnPrimary} disabled={!checked} onClick={add} data-testid="button-review-add-card"><Plus className="h-4 w-4" />계획 추가</button>
        </section>
      )}
      <Fail msg={msg} />
    </div>
  );
}

function CardPage({ card, planEdit, noteEdit, adult, linked, onUse }: { card: ReviewCard; planEdit?: ReviewPlan; noteEdit?: ReviewNote; adult?:boolean; linked:boolean; onUse:ReviewPlannerViewProps['onUse'] }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const plan = planEdit ?? card.plan;
  const planDirty = !!planEdit && !samePlan(planEdit, card.plan);
  const savedNote = card.note;
  const note = noteEdit ?? savedNote ?? emptyReviewNote();
  const noteDirty = !!noteEdit && !sameNote(noteEdit, savedNote ?? emptyReviewNote());
  const origin=cardActivity(card);
  const thought=origin?.activity.kind==='thought';
  const canComplete = !!savedNote && t(savedNote.action) && (thought || t(savedNote.result) || t(savedNote.learning)) && !noteDirty;
  const noteFields = card.kind==='free' ? ([
    {key:'action',label:'오늘의 일상',hint:'기억하고 싶은 일이나 메모를 짧게 적으세요.',required:true},
    {key:'result',label:'확인하거나 선택한 이유',hint:'선택',required:false},
    {key:'learning',label:'달리 본 점',hint:'선택',required:false},
    {key:'next',label:'다음에 바꿔 볼 점',hint:'선택',required:false},
  ] as const) : thought ? ([
    {key:'action', label:origin?.activity.id==='simple-bag'?'준비물과 다시 확인한 내용':origin?.activity.id==='simple-morning'?'내가 적은 일상 · 순서와 대략 걸린 시간':origin?.activity.entry==='daily_note'?'내가 적은 일상':'내가 고른 선택과 내 생각', hint:'생각 노트에서 직접 적은 내용',required:true},
    {key:'result',label:'선택한 이유',hint:'왜 그 선택을 했나요?',required:false},
    {key:'learning',label:'달리 보게 된 점',hint:'질문 뒤 달라진 생각이 있나요?',required:false},
    {key:'next',label:'실제 생활 적용 (선택)',hint:'실제로 해 본 경우에만 작성하세요.',required:false},
  ] as const) : NOTE_FIELDS;
  const run = (ok: boolean, okMsg: string, fail: string) => { setMsg(ok ? null : fail); setSaved(ok ? okMsg : null); };
  return (
    <div className="space-y-5">
      <Link href="/planner" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-blue" data-testid="link-review-back-planner"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />플래너</Link>
      <Header eyebrow={`PLANNER · r${card.revision}`} title={card.kind==='free'?'직접 적는 일상 기록':adult ? '플래너 일상기록' : '계획과 실제 기록'} lede={card.kind==='free'?'별도 카드나 LAB 선택 없이, 짧은 기록부터 남겨요.':optLabel(card.option)} />
      {card.kind!=='free' && <section className="surface space-y-3 p-4 md:p-6" aria-labelledby="rp-status">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="rp-status" className="font-display text-lg font-bold">진행 상태</h2><Badge status={card.status} /></div>
        <Progress status={card.status} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="button" className={btnGhost} disabled={card.status === 'active'} onClick={() => run(setReviewStatus(card.id, 'active'), '진행 중으로 바꿨어요.', '상태를 바꾸지 못했어요.')} data-testid="button-review-status-active"><PlayCircle className="h-4 w-4" />시작/재개</button>
          <button type="button" className={btnGhost} disabled={card.status !== 'active'} onClick={() => run(setReviewStatus(card.id, 'paused'), '잠시 멈췄어요.', '상태를 바꾸지 못했어요.')} data-testid="button-review-status-paused"><PauseCircle className="h-4 w-4" />잠시 멈춤</button>
          <button type="button" className={btnPrimary} disabled={!canComplete || card.status === 'completed'} onClick={() => run(setReviewStatus(card.id, 'completed'), '완료로 표시했어요.', '완료로 바꾸지 못했어요.')} data-testid="button-review-status-completed"><CheckCircle2 className="h-4 w-4" />완료 표시</button>
        </div>
        {!canComplete && card.status !== 'completed' && <p className="text-xs text-muted-foreground" role="status">{thought?'내 생각을 기록으로 저장한 뒤에 완료를 표시할 수 있어요.':'완료는 실제로 한 일과 결과 또는 배운 점을 저장한 뒤에 할 수 있어요.'}</p>}
      </section>}
      {adult && origin && <EverydayRun card={card}/>}
      <div className={cn('grid gap-5',card.kind!=='free' && 'lg:grid-cols-2')}>
        {card.kind!=='free' && <details open={adult && origin ? undefined : true} className="surface min-w-0 space-y-4 p-4 md:p-6">
          <summary className="min-h-11 cursor-pointer content-center font-display text-lg font-bold">계획 수정 <span className="text-xs font-normal text-muted-foreground">하려고 한 것</span></summary>
          {PLAN_FIELDS.map((f) => <Field key={f.key} id={`input-review-plan-${f.key}`} label={f.label} hint={f.hint} required value={plan[f.key]} onChange={(v) => { if (!saveReviewPlanDraft(card.id, { [f.key]: v })) setMsg('임시 저장에 실패했어요.'); }} type={f.key === 'when' ? 'datetime' : undefined} />)}
          {planDirty && <p className="text-xs text-warn" role="status">저장하지 않은 변경이 있어요. 이 탭에 임시로 남아 있습니다.</p>}
          <button type="button" className={btnGhost} disabled={!planDirty || !validReviewPlan(plan)} onClick={() => run(commitReviewPlan(card.id), '계획을 저장했어요.', '계획을 저장하지 못했어요.')} data-testid="button-review-save-plan"><Save className="h-4 w-4" />계획 저장</button>
        </details>}
        <section className="surface min-w-0 space-y-4 border-primary/30 p-4 md:p-6" aria-labelledby="rp-note">
          <h2 id="rp-note" className="font-display text-lg font-bold">{card.kind==='free'?'내 일상 메모':thought?'오늘의 생각 한 장 기록':adult?'내가 한 일상 연습 기록':'실제 기록'} <span className="text-xs font-normal text-muted-foreground">내가 직접 적는 내용</span></h2>
          {thought && <p className="text-sm text-muted-foreground">{origin?.activity.entry==='daily_note'?'내가 적은 일상 기록입니다. 업무 경험이나 성과를 뜻하지 않아요.':'가정 상황에 대한 생각 연습입니다. 실제 행동이나 성과와는 다릅니다.'} 상황: {card.plan.scenario}</p>}
          {!savedNote && <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">아직 저장된 기록이 없어요. 데모는 기록을 대신 만들지 않습니다.</p>}
          {thought && !noteEdit && !savedNote && origin?.worksheet.before.trim() &&
            <button type="button" className={btnGhost} data-testid="button-review-bring-thought" onClick={()=>{ const w=origin.worksheet;
              if(!saveReviewNoteDraft(card.id,{action:w.before,result:w.observation,learning:w.reflection})) setMsg('임시 저장에 실패했어요.');
            }}>활동지의 내 생각 불러오기</button>}
          {noteFields.filter(f=>card.kind!=='free' || f.required).map((f) => <Field key={f.key} id={`input-review-note-${f.key}`} label={f.label} hint={f.hint} required={f.required} value={note[f.key]} onChange={(v) => { if (!saveReviewNoteDraft(card.id, { [f.key]: v })) setMsg('임시 저장에 실패했어요.'); }} />)}
          {card.kind==='free' && <details className="rounded-xl border p-3"><summary className="min-h-11 cursor-pointer content-center text-sm">조금 더 남기기 (선택)</summary>
            {noteFields.filter(f=>!f.required).map(f=><Field key={f.key} id={`input-review-note-${f.key}`} label={f.label} hint={f.hint} value={note[f.key]} onChange={v=>{
              if(!saveReviewNoteDraft(card.id,{[f.key]:v}))setMsg('임시 저장에 실패했어요.');
            }}/>)}
          </details>}
          {noteDirty && <p className="text-xs text-warn" role="status">저장하지 않은 기록이 있어요. 이 탭에 임시로 남아 있습니다.</p>}
          {adult && !t(note.action) && <p className="text-sm text-muted-foreground">{thought && origin?.worksheet.before.trim()?'활동지의 내 생각을 불러오거나 이곳에 직접 써 주세요.':'기록할 이야기를 한 줄 먼저 써 보세요.'}</p>}
          <button type="button" className={btnPrimary} disabled={!noteDirty || !t(note.action)} onClick={() => {
            const ok=commitReviewNote(card.id);
            run(ok,'기록을 저장했어요.','기록을 저장하지 못했어요.');
            if(ok && adult)requestAnimationFrame(()=>document.getElementById('review-use-record')?.focus());
          }} data-testid="button-review-save-note"><Save className="h-4 w-4" />{adult?'기록 저장하고 다음 활동 보기':'기록 저장'}</button>
        </section>
      </div>
      {saved && <p role="status" className="flex gap-2 rounded-xl bg-ok-soft p-3 text-sm text-ok" data-testid="status-review-saved"><CheckCircle2 className="h-4 w-4 shrink-0" />{saved}</p>}
      <Fail msg={msg} />
      {adult ? <EverydayRecordUse card={card} note={note} planDirty={planDirty} noteDirty={noteDirty} linked={linked} onUse={onUse} /> :
        <Link href={`/history/${card.id}`} className={btnGhost} data-testid="link-review-card-history"><History className="h-4 w-4" />히스토리에서 보기</Link>}
    </div>
  );
}

function HistoryList({ cards, hasStoryboard }: { cards: ReviewCard[]; hasStoryboard: boolean }) {
  return (
    <div className="space-y-5">
      <Header eyebrow="HISTORY" title="연습 히스토리" lede="이 탭에서 만든 모든 계획과 저장된 기록입니다. 계정 기록이 아닙니다." />
      {cards.length === 0
        ? <div className="rounded-2xl border bg-card p-6 text-center"><History className="mx-auto h-8 w-8 text-blue/60" /><p className="mt-2 text-sm text-muted-foreground">아직 기록이 없어요.</p><Link href="/planner" className={cn(btnPrimary, 'mt-4')} data-testid="link-review-history-planner">플래너로</Link></div>
        : <ul className="space-y-2">{cards.map((c) => <CardRow key={c.id} card={c} href={`/history/${c.id}`} testid={`link-review-history-${c.id}`} />)}</ul>}
      {hasStoryboard && <Link href="/storyboard#storyboard-versions" className={btnGhost} data-testid="link-review-versions"><BookOpenText className="h-4 w-4" />스토리보드 버전</Link>}
    </div>
  );
}

function HistoryDetail({ card, onUse, hasStoryboard, pending }: { card: ReviewCard; onUse: ReviewPlannerViewProps['onUse']; hasStoryboard: boolean; pending: boolean }) {
  const [checked, setChecked] = useState<string | null>(null);
  const [result, setResult] = useState<'ok' | 'fail' | null>(null);
  const key = `${card.id}+${card.revision}`;
  const on = checked === key && !pending;
  const approved = card.approvedRevision;
  const current = approved === card.revision;
  return (
    <div className="space-y-5">
      <Link href="/history" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-blue" data-testid="link-review-back-history"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />히스토리</Link>
      <Header eyebrow={`HISTORY · r${card.revision}`} title="기록 자세히 보기" lede={optLabel(card.option)} />
      <div className="flex flex-wrap items-center gap-2"><Badge status={card.status} /><span className="font-mono text-xs text-muted-foreground" data-testid="text-review-revision">출처 버전 r{card.revision}{approved !== undefined && ` · 확인한 버전 r${approved}`}</span></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border bg-card p-4 md:p-5"><h2 className="mb-3 font-display font-bold">계획</h2><Rows rows={planRows(card.plan)} prefix="review-history-plan" /></section>
        <section className="min-w-0 rounded-2xl border-2 border-primary/30 bg-card p-4 md:p-5"><h2 className="mb-3 font-display font-bold">실제 기록</h2>
          {card.note ? <Rows rows={noteRows(card.note)} prefix="review-history-note" /> : <p className="text-sm text-muted-foreground" data-testid="text-review-no-note">저장된 기록이 없어요. 플래너에서 직접 기록해야 스토리에 쓸 수 있어요.</p>}
        </section>
      </div>
      {approved !== undefined && !current && <p role="note" className="flex gap-2 rounded-xl bg-warn-soft p-3 text-sm text-warn"><Info className="mt-0.5 h-4 w-4 shrink-0" />예전에 r{approved}을 확인했지만 이후 내용이 바뀌었어요. 지금 버전 r{card.revision}을 다시 확인해야 사용할 수 있어요.</p>}
      {pending && <p role="note" className="rounded-xl bg-warn-soft p-3 text-sm text-warn" data-testid="status-review-pending-edits">플래너에 아직 반영하지 않은 수정이 있습니다. 플래너에서 저장한 뒤 여기서 확인해 주세요.</p>}
      {card.note && (
        <section className="surface space-y-3 p-4 md:p-6">
          <p className="flex gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue" />이 기록은 데모 시뮬레이션이며 이 탭에서만 유지됩니다.</p>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 text-sm">
            <Checkbox key={key} checked={on} disabled={pending} onCheckedChange={(v) => { setResult(null); setChecked(v === true ? key : null); }} className="mt-0.5" data-testid="checkbox-review-use-record" />
            <span>위에 저장된 기록 <strong className="font-mono">r{card.revision}</strong>을 내가 직접 쓴 그대로 확인했고, 스토리 근거로 사용합니다.</span>
          </label>
          <button type="button" className={btnPrimary} disabled={!on} onClick={() => setResult(onUse(card.id, card.revision) ? 'ok' : 'fail')} data-testid="button-review-use-record"><BookOpenText className="h-4 w-4" />이 기록 사용하기</button>
          {result === 'ok' && <p role="status" className="flex gap-2 rounded-xl bg-ok-soft p-3 text-sm text-ok" data-testid="status-review-use-ok"><CheckCircle2 className="h-4 w-4 shrink-0" />r{card.revision} 기록을 사용하도록 확인했어요.</p>}
          {result === 'fail' && <Fail msg="사용하도록 연결하지 못했어요. 다시 시도해 주세요." />}
        </section>
      )}
      <div className="flex flex-wrap gap-2">
        <Link href={`/planner/card/${card.id}`} className={btnGhost} data-testid="link-review-edit-card"><CalendarRange className="h-4 w-4" />플래너에서 수정</Link>
        {hasStoryboard && <Link href="/storyboard#storyboard-versions" className={btnGhost} data-testid="link-review-versions"><BookOpenText className="h-4 w-4" />스토리보드 버전</Link>}
      </div>
    </div>
  );
}

function Missing({ back }: { back: string }) {
  return (
    <div className="rounded-2xl border bg-card p-6 text-center">
      <p className="font-display font-bold">계획을 찾을 수 없어요</p>
      <p className="mt-1 text-sm text-muted-foreground">이 탭에서 만든 계획만 볼 수 있어요.</p>
      <Link href={back} className={cn(btnGhost, 'mt-4')} data-testid="link-review-missing-back">목록으로</Link>
    </div>
  );
}

function FreeRecordActions() {
  const [,navigate]=useLocation();
  const sent=useRef(false);
  const [failed,setFailed]=useState(false);
  return <div className="flex flex-wrap gap-2">
    <button type="button" className={btnPrimary} data-testid="button-review-create-free" onClick={()=>{
      if(sent.current)return;
      sent.current=true;
      const id=`review-card-${crypto.randomUUID()}`;
      if(addFreeReviewCard(id,dailyDate()))navigate(`/planner/card/${id}`);
      else{sent.current=false;setFailed(true);}
    }}><Plus className="h-4 w-4" />일상 직접 기록</button>
    <Link href="/activity" className={btnGhost} data-testid="link-review-plan-another">오늘의 생각 한 장 추천받기</Link>
    {failed && <p role="alert" className="text-sm text-destructive">저장하지 못했습니다. 같은 탭에서 다시 시도해 주세요.</p>}
  </div>;
}

export default function ReviewPlannerView({ page, option, id, onUse, hasStoryboard, adult, onUseBundle, isLinked }: ReviewPlannerViewProps) {
  const { book, error } = useReviewPlanner();
  const cards = Object.values(book.cards);
  const card = id ? book.cards[id] : undefined;
  let body;
  if (page === 'list') body = <ListPage cards={cards} option={option} adult={adult} hasDraft={id=>!!(book.planEdits[id] || book.noteEdits[id])} />;
  else if (page === 'new') body = <NewPage option={option ?? ''} draft={option ? book.drafts[option] : undefined} others={cards.filter((c) => c.option === option)} />;
  else if (page === 'card') body = card ? <CardPage key={card.id} card={card} planEdit={book.planEdits[card.id]} noteEdit={book.noteEdits[card.id]} onUse={onUse} adult={adult} linked={card.approvedRevision===card.revision && !!isLinked?.(card.id,card.revision)} /> : <Missing back="/planner" />;
  else if (id) body = card ? <HistoryDetail key={card.id} card={card} onUse={onUse} hasStoryboard={hasStoryboard} pending={!!(book.planEdits[card.id] || book.noteEdits[card.id])} /> : <Missing back="/history" />;
  else body = <HistoryList cards={cards} hasStoryboard={hasStoryboard} />;
  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-4" lang="ko" data-testid={`view-review-planner-${page}`}>
      <StoreError error={error} />
      {body}
      {page==='list' && adult && onUseBundle && <ReviewActivityCollection book={book} onUse={onUseBundle}/>}
    </div>
  );
}
