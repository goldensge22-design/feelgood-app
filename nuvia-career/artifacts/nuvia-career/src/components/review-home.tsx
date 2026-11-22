import { ArrowRight, BookOpenText, CalendarRange, FlaskConical, History } from 'lucide-react';
import { Link } from 'wouter';
import { presentHomeReport, reviewHomeFixture, type HomeReportSummary } from '@/lib/review-home-profile';
import type { ReviewRoleId, ReviewTraitId } from '@/lib/review-everyday-model';
import ReviewShortcutActions from '@/components/review-shortcut-actions';
import { useI18n } from '@/lib/i18n';
import { REVIEW_PRODUCT_LINKS, reviewProducts, usesActivityWorkspace, type ReviewAudience, type ReviewProduct } from '@/lib/review-audience';

export const reviewHomeAction = 'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg bg-blue px-4 py-2 text-center text-sm font-semibold leading-snug text-white hover:bg-blue/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue';
const panel = 'min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
const softBlue = 'inline-flex rounded-full bg-blue-soft px-3 py-1 text-xs font-semibold leading-snug text-blue';
const homeSteps = [
  { id: 'report', href: '/report', title: 'daily.home1', description: 'daily.home1Help' },
  { id: 'planner', href: '/planner', title: 'daily.home2', description: 'daily.home2Help' },
  { id: 'story', href: '/storyboard', title: 'daily.home3', description: 'daily.home3Help' },
] as const;

export function ReviewProfileSummary({ report, synthetic, adult, pickJobLabel, resumeTo, resumeLabel, onPickJob }: {
  report: HomeReportSummary | null;
  synthetic: boolean;
  adult: boolean;
  pickJobLabel?: string;
  resumeTo?: string | null;
  resumeLabel?: string;
  onPickJob?: (role: ReviewRoleId) => void;
}) {
  const profile = presentHomeReport(report);
  return (
    <section className={panel} aria-labelledby="review-profile-title" data-testid="card-review-home-profile">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-950" id="review-profile-title">인지 프로파일</h2>
        {synthetic && <strong className={softBlue} data-testid="badge-review-profile-synthetic">가상 예시 · 실제 검사 결과 아님</strong>}
      </div>
      <p className="mt-3 text-sm text-slate-600" data-testid="text-review-profile-date">
        {synthetic ? '예시 검사일' : '검사일'} · {profile.assessedOn ?? '자료 없음'}
      </p>
      <p className="mt-1 text-xs text-slate-600" data-testid="text-review-profile-scale">
        {profile.scale ? `척도 · ${profile.scale}` : synthetic ? '아래 수치는 데모용 값이며 검사 단위나 척도를 뜻하지 않습니다.' : '척도 · 자료 없음'}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-1.5" data-testid="list-review-profile-scores">
        {profile.areas.map(({ id, label, score, unit }) => (
          <div key={id} className="min-w-0 rounded-lg border border-blue/10 bg-blue-soft px-2.5 py-2" data-testid={`row-review-score-${id}`}>
            <dt className="break-words text-xs font-medium text-slate-600">{label}</dt>
            <dd className={`mt-1 break-words tabular-nums ${score === null ? 'text-xs text-slate-600' : 'text-lg font-bold text-blue'}`}>
              {score ?? '자료 없음'}
              {score !== null && unit && <span className="ms-1 text-xs font-normal text-slate-600">{unit}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <dl className="mt-3 space-y-2 text-sm">
        {[{ label: '강점', values: profile.strengths, id: 'strengths' },
          { label: '성장 포인트', values: profile.growthPoints, id: 'growth-points' }].map(({ label, values, id }) => (
          <div key={id} className="flex flex-wrap items-start gap-2" data-testid={`text-review-profile-${id}`}>
            <dt className="py-1 text-xs font-medium text-slate-700">{label}</dt>
            <dd className="flex min-w-0 flex-wrap gap-1">
              {values.length ? values.map((value, index) => <span key={index} className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold leading-snug ${id==='strengths'?'bg-orange-50 text-orange-800':'bg-slate-100 text-slate-700'}`}>{value}</span>)
                : <span className="py-1 text-xs text-slate-600">자료 없음</span>}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 border-t border-slate-200 pt-3" data-testid="list-review-profile-top-jobs">
        <h3 className="text-sm font-bold">결과지 TOP 5 직무</h3>
        {profile.topJobs.length ? <ol className="mt-2 list-decimal space-y-2 ps-5 text-sm">
          {profile.topJobs.map(job => <li key={job.id}>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold">{job.title}</span>
              {adult && job.reviewRole && onPickJob && <button type="button" onClick={() => onPickJob(job.reviewRole!)} data-testid={`button-review-top-job-${job.id}`}
                className="min-h-11 rounded text-xs font-semibold text-blue underline underline-offset-4">{pickJobLabel??'이 직무로 LAB 열기'}</button>}
            </div>
            <p className="text-xs text-slate-600">{job.reason || '추천 이유 자료 없음'} · {job.source || '출처 자료 없음'}</p>
          </li>)}
        </ol> : <p className="mt-2 text-xs text-slate-600">결과지 연결 필요 · 자료 없음.</p>}
      </div>
      {synthetic && <p className="mt-3 border-t border-slate-200 pt-2 text-xs text-slate-600" data-testid="text-review-actual-profile-status">
        내 실제 검사 수치·해석·TOP 5: 결과지 연결 필요 · 자료 없음
      </p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link href="/report" className={reviewHomeAction} data-testid="link-review-report">
          {adult && !resumeTo ? '다음 활동 · 결과지 보기' : '결과지 보기'}<ArrowRight aria-hidden className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </div>
      {adult && resumeTo && <p className="mt-1 break-words text-xs text-slate-600" data-testid="text-review-home-resume">마지막으로 본 곳 · {resumeLabel ?? '체험 단계'}</p>}
    </section>
  );
}

export default function ReviewHome({ audience, trait, focus, adultResume, adultResumeLabel, onPickJob }: {
  audience: ReviewAudience | null; trait: ReviewTraitId; focus?: ReviewTraitId; adultResume: string | null; adultResumeLabel?: string; onPickJob: (role: ReviewRoleId) => void;
}) {
  const {t}=useI18n();
  const activityWorkspace=usesActivityWorkspace(audience);
  const productCards={
    company:{id:'lab-home',icon:FlaskConical,body:'audience.companyBody'},
    career:{id:'lab-home',icon:FlaskConical,body:'audience.careerBody'},
    familyLab:{id:'lab-home',icon:FlaskConical,body:'audience.companyBody'},
    planner:{id:'planner',icon:CalendarRange,body:'daily.home2Help'},
    history:{id:'history',icon:History,body:'sb.goRecords'},
    storyboard:{id:'storyboard',icon:BookOpenText,body:'audience.storyBody'},
  } satisfies Record<ReviewProduct,{id:string;icon:typeof CalendarRange;body:string}>;
  return (
    <div className="space-y-4 text-slate-950" data-testid="section-review-home">
      <header>
        <h1 className="text-2xl font-bold md:text-3xl">MY NUVIA</h1>
      </header>
      <section className="rounded-xl border border-slate-200 bg-white p-3 sm:px-4" aria-labelledby="review-home-routine" lang="ko" data-testid="section-review-home-routine">
        <h2 id="review-home-routine" className="text-sm font-bold">NUVIA 이렇게 써요</h2>
        <ol className="mt-2 grid gap-2 sm:grid-cols-3">
          {homeSteps.map(({ id, href, title, description }, index) => (
            <li key={id} className={`min-w-0 rounded-lg border py-1 pe-2 ps-9 ${id==='planner'?'border-[#F4A418]/40 bg-[#fff8eb]':'border-blue/15 bg-[#f4f8ff]'}`}>
              <Link href={href} className="relative inline-flex min-h-11 items-center gap-1 rounded text-sm font-semibold text-blue underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-blue"
                data-testid={`link-review-routine-${id}`}>
                <span className={`absolute -start-7 inline-grid h-5 w-5 place-items-center rounded-full text-xs ${id==='planner'?'bg-[#ffe5a9] text-[#6f4200]':'bg-blue-soft'}`} aria-hidden>{index + 1}</span>
                {t(title)}<ArrowRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" aria-hidden />
              </Link>
              <p className="pb-2 text-xs leading-relaxed text-slate-600">{t(description)}</p>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-sm">{t('audience.labOptional')} <Link href="/lab" className="inline-flex min-h-11 items-center font-semibold text-blue underline" data-testid="link-review-routine-lab">{t(audience==='youth'?'audience.career':audience==='adult'?'audience.company':'audience.familyLab')}</Link></p>
        <p className="mt-3 border-t border-slate-200 pt-2 text-xs leading-relaxed text-slate-600">
          쓰고 싶은 기록을 골라 문장 후보를 검토한 뒤 적용해요. 기록을 저장하는 것만으로 작성한 본문이 바뀌지는 않아요.
        </p>
      </section>
      <ReviewShortcutActions placement="home" homeOnly={activityWorkspace} />
      <div className="grid gap-3 md:grid-cols-2" data-testid="layout-review-home-top">
        <ReviewProfileSummary report={reviewHomeFixture(trait, focus)} synthetic adult={activityWorkspace}
          pickJobLabel={t('audience.openService',{service:t(audience==='youth'?'audience.career':'audience.company')})}
          resumeTo={adultResume} resumeLabel={adultResumeLabel} onPickJob={onPickJob} />
        <section className={panel} aria-labelledby="review-growth-title" data-testid="card-review-home-growth">
          <h2 className="text-lg font-bold" id="review-growth-title">MY GROWTH</h2>
          <p className="mt-2 text-sm text-slate-600">아직 영역별 성장을 보여 드릴 자료가 부족해요.</p>
          <dl className="mt-4 divide-y divide-slate-200" data-testid="list-review-home-growth">
            {['TRAIN', 'THINK', 'MANAGE', 'METACOGNITION'].map((area) => (
              <div key={area} className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 py-3">
                <dt lang="en" className="break-words text-xs font-semibold">{area}</dt>
                <dd className="text-xs text-slate-600">자료 부족</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <section aria-labelledby="review-products">
        <h2 id="review-products" className="sr-only">{t('audience.services')}</h2>
        <div className={`grid gap-3 ${activityWorkspace?'md:grid-cols-2':'md:grid-cols-2 lg:grid-cols-4'}`} data-testid="layout-review-home-services">
          {reviewProducts(audience).map(product=>{
            const {id,icon:Icon,body}=productCards[product];
            const [href,key]=REVIEW_PRODUCT_LINKS[product];
            const title=t(key);
            return <article key={product} className={`${panel} flex flex-col`} data-testid={`card-review-home-${id}`} data-review-product={product}>
              <Icon className="h-6 w-6 text-blue" aria-hidden />
              <h3 className="mt-2 break-words font-bold">{title}</h3>
              <p className="mb-3 mt-1 flex-1 text-sm leading-relaxed text-slate-600">{t(body)}</p>
              <Link href={href} className={reviewHomeAction} data-testid={`link-review-${id}`}>
                {t('audience.openService',{service:title})}<ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
              </Link>
            </article>;
          })}
        </div>
      </section>
    </div>
  );
}
