import { Link } from 'wouter';
import { useI18n } from '@/lib/i18n';
import { AlertTriangle, ArrowRight, CheckCircle2, FlaskConical, Info, PlayCircle, RotateCcw, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REVIEW_PERSON, REVIEW_TRAITS, REVIEW_OPTIONS } from '@/lib/review-demo-fixture';
import { REVIEW_PROFILES, REVIEW_PRACTICE_PROFILES, type ReviewRoleId, type ReviewTraitId } from '@/lib/review-everyday-model';
import ReviewHome, { reviewHomeAction } from '@/components/review-home';
import type { ReviewAudience } from '@/lib/review-audience';

type Page = 'start' | 'home' | 'report' | 'lab' | 'teacher' | 'family';

export interface ReviewDemoViewProps {
  page: Page;
  started: boolean;
  onStart: (role:ReviewAudience,destination?:string) => void;
  audience: ReviewAudience | null;
  activityWorkspace: boolean;
  trait: ReviewTraitId;
  onTrait: (id:ReviewTraitId) => void;
  focus?:ReviewTraitId;
  onFocus:(id:ReviewTraitId | undefined)=>void;
  resumeTo: string | null;
  adultResume: string | null;
  adultResumeLabel?: string;
  onPickJob: (role: ReviewRoleId) => void;
  selection: string | null;
  onSelect: (id: string) => void;
  error: boolean;
}

const btnPrimary = 'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45';
const btnGhost = 'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border bg-card px-4 text-sm font-semibold text-foreground hover:border-blue/50';

function SyntheticBadge({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', onDark ? 'bg-white/10 text-amber-200' : 'bg-warn-soft text-warn')} data-testid="badge-review-synthetic">
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />가상 예시 · 이 기기에 저장
    </span>
  );
}

function Steps({ at }: { at: number }) {
  const steps = ['결과', 'LAB', '스토리보드'];
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

function Header({ eyebrow, title, lede, step }: { eyebrow: string; title: string; lede: string; step?: number }) {
  return (
    <header className="relative overflow-hidden rounded-2xl bg-navy p-6 text-white md:p-8">
      <div aria-hidden className="pointer-events-none absolute -end-12 -top-12 h-44 w-44 rounded-full border-[26px] border-primary/30" />
      <div className="relative flex flex-wrap items-center gap-2">
        <p className="eyebrow text-amber-300">{eyebrow}</p>
        <SyntheticBadge onDark />
      </div>
      <h1 className="relative mt-3 font-display text-2xl font-bold leading-snug md:text-3xl">{title}</h1>
      <p className="relative mt-2 max-w-2xl text-sm text-white/75 md:text-base">{lede}</p>
      {step !== undefined && <div className="relative mt-5 rounded-xl bg-white/95 px-3 py-2 text-foreground"><Steps at={step} /></div>}
    </header>
  );
}

function ErrorBox() {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm" data-testid="status-review-error">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div>
        <p className="font-semibold text-destructive">이 데모 화면을 불러오지 못했어요.</p>
        <p className="mt-1 text-muted-foreground">작성한 가상 기록은 이 브라우저에 남습니다. 다시 시작해도 기존 기록을 열 수 있어요.</p>
        <Link href="/" className={cn(btnGhost, 'mt-3')} data-testid="link-review-error-restart"><RotateCcw className="h-4 w-4" />처음으로</Link>
      </div>
    </div>
  );
}

function StartPage({ onStart, audience, started, resumeTo, adultResume, family = false }: Pick<ReviewDemoViewProps, 'onStart' | 'audience' | 'started' | 'resumeTo' | 'adultResume'> & {family?:boolean}) {
  const {t}=useI18n();
  return (
      <section className="surface mx-auto flex w-full max-w-lg flex-col p-5 md:p-8" aria-labelledby="review-login">
        <h1 id="review-login" className="text-xl font-bold text-slate-950">{family?t('audience.familyEntry'):'NUVIA 로그인 체험'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{family?t('audience.familyBody'):t('audience.pick')}</p>
        <p className="mt-3 border-s-2 border-blue/30 ps-3 text-sm leading-relaxed text-slate-700" data-testid="text-review-start-flow">
          {t('audience.startFlow')}
        </p>
        <div className="mt-5 rounded-xl border border-[#F4A418]/35 bg-[#fff8eb] p-4">
          <p className="text-xs font-semibold text-muted-foreground">체험 인물 (가상)</p>
          <p className="mt-1 font-display text-lg font-bold" data-testid="text-review-person">{REVIEW_PERSON.name}</p>
          <p className="text-sm text-muted-foreground">{REVIEW_PERSON.caption}</p>
        </div>
        <div className="flex flex-wrap gap-2 pt-5">
          {family ? <button type="button" className={reviewHomeAction} onClick={()=>onStart('family')} data-testid="button-review-start-child">{t('audience.familyStart')}</button> : <>
            <button type="button" className={reviewHomeAction} onClick={()=>onStart('adult')} data-testid="button-review-start"><PlayCircle className="h-4 w-4" aria-hidden/>{t('audience.adultStart')}</button>
            <button type="button" className={btnGhost} onClick={()=>onStart('youth')} data-testid="button-review-start-youth">{t('audience.youthStart')}</button>
            {audience&&audience!=='family'&&<button type="button" onClick={()=>onStart(audience,adultResume??resumeTo??'/home')} className={btnGhost} data-testid="link-review-resume">{t('audience.resume',{role:t(`audience.${audience}`)})}<ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden/></button>}
          </>}
        </div>
        <p className="mt-3 flex gap-2 text-sm text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0 text-blue" aria-hidden />아이디·비밀번호를 받지 않으며 실제 인증을 하지 않습니다.</p>
        {(family||!started)&&<Link href={family?'/':'/family'} className="mt-3 inline-flex min-h-11 self-start items-center text-sm font-semibold text-blue underline" data-testid="link-review-family-entry">{t(family?'audience.back':'audience.familyEntry')}</Link>}
        {!started&&<p className="mt-5 border-t pt-4 text-xs text-muted-foreground">
          교사용 안내는 <Link href="/teacher" className="inline-flex min-h-11 items-center font-semibold text-blue underline-offset-4 hover:underline" data-testid="link-review-teacher">교사 안내 보기</Link> 에서 읽을 수 있습니다. 교사 로그인이나 접근 권한이 아닙니다.
        </p>}
      </section>
  );
}

function ReportPage({ activityWorkspace, audience, trait, onTrait,focus,onFocus }: Pick<ReviewDemoViewProps,'activityWorkspace'|'audience'|'trait'|'onTrait'|'focus'|'onFocus'>) {
  const {t}=useI18n();
  return (
    <div className="space-y-6">
      <Header eyebrow="REPORT · 가상 결과" title="나를 이해하는 결과지" lede="실제 검사 결과가 아닌, 흐름을 보여주기 위한 가상 프로필입니다." step={activityWorkspace ? undefined : 0} />
      {activityWorkspace ? <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 font-display text-lg font-bold">활동에 사용할 가상 인지 지원 프로필</legend>
        <p className="text-sm text-muted-foreground sm:col-span-2">아래는 홈에서 확인한 가상 프로필의 해석 예시입니다. 점수나 기질을 추정하지 않으며, 선택한 프로필에 따라 다음 화면의 연습 방법이 달라집니다.</p>
        {REVIEW_PROFILES.map((p)=><label key={p.id} className={cn('flex min-h-11 cursor-pointer gap-3 rounded-2xl border bg-card p-4',p.id===trait && 'border-blue bg-blue-soft')}>
          <input type="radio" name="review-profile" value={p.id} checked={p.id===trait} onChange={()=>onTrait(p.id)} className="mt-1 h-5 w-5 shrink-0" data-testid={`option-review-trait-${p.id}`} />
          <span><strong className="block font-display text-base">{p.title}</strong><span className="mt-1 block text-sm">{p.summary}</span></span>
        </label>)}
      </fieldset> : <section className="grid gap-3 md:grid-cols-2" aria-label="가상 강점">
        {REVIEW_TRAITS.map((t, i) => (
          <article key={t.title} className="rounded-2xl border bg-card p-5" data-testid={`card-review-trait-${i}`}>
            <span className="font-mono text-xs text-primary">{String(i + 1).padStart(2, '0')}</span>
            <h2 className="mt-1 font-display text-lg font-bold">{t.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.description}</p>
          </article>
        ))}
      </section>}
      {activityWorkspace && <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-display font-bold">결과지의 보완 필요영역</h2>
        <p className="my-1 text-sm text-muted-foreground">강점과 별도로 명시된 가상 예시입니다. 선택한 강점으로 약점을 판정하지 않습니다.</p>
        <label className="block text-sm font-semibold">가상 보완영역 예시
          <select className="mt-1 block min-h-11 w-full rounded-lg border bg-card px-2 sm:max-w-sm" value={focus ?? ''} onChange={e=>onFocus((e.target.value || undefined) as ReviewTraitId|undefined)} data-testid="select-review-focus">
            <option value="">기록 없음 · 연결 필요</option>{REVIEW_PRACTICE_PROFILES.map(f=><option key={f.id} value={f.id}>{f.title} 보완</option>)}
          </select>
        </label>
        <p className="mt-2 text-sm" data-testid="text-review-focus-summary">{REVIEW_PRACTICE_PROFILES.find(f=>f.id===focus)?.summary ?? '보완영역 자료가 없어 일반 인지 연습을 제안합니다.'}</p>
      </section>}
      <div className="flex flex-wrap gap-2">
        {activityWorkspace && <Link href="/planner" className={btnPrimary} data-testid="link-report-daily">{t('audience.activity')}</Link>}
        <Link href="/lab" className={activityWorkspace?btnGhost:btnPrimary} data-testid="link-review-lab"><FlaskConical className="h-4 w-4" />{t(audience==='youth'?'audience.career':audience==='adult'?'audience.company':'audience.familyLab')}</Link>
        <Link href="/home" className={btnGhost} data-testid="link-review-home">홈으로</Link>
      </div>
    </div>
  );
}

function LabPage({ selection, onSelect }: Pick<ReviewDemoViewProps, 'selection' | 'onSelect'>) {
  const selected = REVIEW_OPTIONS.find((option) => option.id === selection);
  return (
    <div className="space-y-6">
      <Header eyebrow="LAB · 기업과 직무" title="어떤 기업·직무에 연결해 볼까요?" lede="기업·직무 하나를 고른 뒤, 플래너에서 직접 연습할 행동을 정해 보세요." step={1} />
      <p role="note" className="flex gap-2 rounded-xl border bg-blue-soft p-4 text-sm" data-testid="text-review-no-provider">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue" />아래 기업·직무는 미리 준비된 가상 예시입니다. 실제 기업 정보, 채용 공고, 외부 서비스나 AI에 조회하지 않습니다.
      </p>
      <section aria-labelledby="review-opts">
        <h2 id="review-opts" className="font-display text-lg font-bold">1. 기업·직무 선택</h2>
        <ul role="radiogroup" aria-labelledby="review-opts" className="mt-3 grid gap-3 md:grid-cols-2">
          {REVIEW_OPTIONS.map((o) => {
            const on = selection === o.id;
            return (
              <li key={o.id}>
                <button type="button" role="radio" aria-checked={on} onClick={() => onSelect(o.id)}
                  className={cn('flex min-h-11 w-full flex-col rounded-2xl border-2 p-4 text-start transition-colors', on ? 'border-blue bg-blue-soft' : 'border-border bg-card hover:border-blue/40')}
                  data-testid={`option-review-${o.id}`}>
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="font-display font-bold" dir="auto">{o.company}</span>
                    <span aria-hidden className={cn('grid h-5 w-5 place-items-center rounded-full border-2', on ? 'border-blue bg-blue' : 'border-input')}>{on && <span className="h-2 w-2 rounded-full bg-white" />}</span>
                  </span>
                  <span className="text-sm font-semibold text-blue" dir="auto">{o.job}</span>
                  <span className="mt-2 inline-flex w-fit rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{o.keyword}</span>
                  <span className="mt-2 text-sm text-muted-foreground" dir="auto">{o.reason}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <div className="flex flex-wrap items-center gap-3">
        {selected ? <Link href={`/planner/new/${selected.id}`} className={btnPrimary} data-testid="link-review-make-card">플래너 행동카드 만들기<ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link> :
          <p className="text-sm text-muted-foreground">기업·직무를 선택하면 행동카드를 만들 수 있어요.</p>}
      </div>
    </div>
  );
}

function TeacherPage() {
  return (
    <div className="space-y-6">
      <Header eyebrow="FOR TEACHERS · 안내" title="교사용 안내" lede="이 페이지는 읽기 전용 설명입니다. 교사 로그인이나 학생 정보 접근 기능이 아닙니다." />
      <section className="grid gap-3 md:grid-cols-2">
        {[
          ['수업에서 보여주기', '학생과 함께 가상 인물의 흐름을 따라가며 결과, LAB, 스토리보드의 연결을 설명할 수 있어요.'],
          ['학생 데이터 없음', '이 데모는 학생 계정이나 학급 정보를 읽지 않으며, 교사에게 어떤 기록도 전송하지 않습니다.'],
          ['직접 쓰는 문장', '스토리보드 문장은 학생이 직접 씁니다. 데모는 대신 써 주지 않습니다.'],
          ['언어', '새 데모 화면은 한국어 중심으로 작성되었습니다. 다른 언어 번역 완료를 뜻하지 않습니다.'],
        ].map(([h, b]) => (
          <article key={h} className="rounded-2xl border bg-card p-5"><h2 className="font-display font-bold">{h}</h2><p className="mt-1 text-sm text-muted-foreground">{b}</p></article>
        ))}
      </section>
      <Link href="/" className={btnGhost} data-testid="link-review-back-start">데모 시작 화면으로</Link>
    </div>
  );
}

export default function ReviewDemoView(props: ReviewDemoViewProps) {
  const { page, started, error } = props;
  let body;
  if (page === 'teacher') body = <TeacherPage />;
  else if (page === 'start' || page === 'family' || (!started && page !== 'home')) body = <StartPage {...props} family={page==='family'} />;
  else if (page === 'home') body = <ReviewHome {...props} />;
  else if (page === 'report') body = <ReportPage {...props} />;
  else body = <LabPage selection={props.selection} onSelect={props.onSelect} />;
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4" lang="ko" data-testid={`view-review-${page}`}>
      {error && <ErrorBox />}
      {page !== 'start' && page !== 'family' && page !== 'teacher' && !started && (
        <p role="note" className="flex items-center gap-2 rounded-xl bg-warn-soft p-3 text-sm text-warn"><CheckCircle2 className="h-4 w-4" />아직 데모를 시작하지 않았어요. 시작 화면에서 들어와 주세요.</p>
      )}
      {body}
    </div>
  );
}
