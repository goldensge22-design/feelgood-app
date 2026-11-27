import { T } from '@/i18n/tx';
import { Link } from 'wouter';
import { ArrowRight, BookOpen, FileText, Users, IdCard, PlusCircle } from 'lucide-react';
import { useApp, setState } from '@/lib/store';
import { LESSONS, MODELS } from '@/data/lessons';
import { WORKSHEETS, STAGE_LABEL, type Stage } from '@/data/worksheets';
import { t } from '@/i18n/ui';
import { Panel, Pill } from '@/components/shell';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { lang, stage, students, cards, lessons } = useApp((s) => s);
  const group = stage === 'university' ? 'uni' : 'sec';
  const setStage = (s: Stage) => setState((st) => ({ ...st, stage: s }));
  const stageLessons = LESSONS.filter((l) => l.stage === stage);
  const steps = [
    { n: '01', title: '결과지와 경험 확인', body: '결과지가 있으면 검사명·버전·기준 확인. 없으면 자기 진술(임시).', href: '/students', icon: Users },
    { n: '02', title: '수업 고르고 시간 맞추기', body: '6개 모델 중 선택, 목표·인원·시간 조정.', href: '/lessons', icon: BookOpen },
    { n: '03', title: '활동지 선택', body: '{0} 활동지 12종 중 선택.', href: '/worksheets', icon: FileText },
    { n: '04', title: '직무 카드 확인 후 인쇄', body: '미리보기-수정-확정-인쇄, 묶음 목록 보관.', href: '/cards', icon: IdCard },
  ];
  return (
    <div className="space-y-6">
      <div className="rise overflow-hidden rounded-2xl bg-sidebar text-sidebar-foreground relative">
        <div className="absolute -end-16 -top-16 h-64 w-64 rounded-full border-[28px] border-[hsl(var(--sidebar-primary))]/25" aria-hidden />
        <div className="absolute end-24 bottom-[-40px] h-32 w-32 rounded-full bg-primary/40" aria-hidden />
        <div className="relative p-5 md:p-8">
          <div role="tablist" className="inline-flex rounded-xl bg-sidebar-accent p-1">
            {[['sec', t(lang, 'secondary')], ['uni', t(lang, 'college')]].map(([k, label]) => (
              <button type="button" key={k} role="tab" aria-selected={group === k} data-testid={`tab-${k}`} onClick={() => setStage(k === 'uni' ? 'university' : 'middle')} className={cn('rounded-lg px-5 py-2 text-sm font-bold transition', group === k ? 'bg-[hsl(var(--sidebar-primary))] text-sidebar' : 'text-sidebar-foreground/80 hover:text-white')}>{label}</button>
            ))}
          </div>
          {group === 'sec' && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-sidebar-foreground/70">{T("학교급을 먼저 고르세요")}</span>
              {(['middle', 'high'] as Stage[]).map((s) => (
                <button type="button" aria-pressed={stage === s} key={s} data-testid={`button-stage-${s}`} onClick={() => setStage(s)} className={cn('rounded-full border px-4 py-1.5 text-sm font-semibold transition', stage === s ? 'border-white bg-white text-sidebar' : 'border-sidebar-border text-white hover:border-white')}>{t(lang, s)}</button>
              ))}
            </div>
          )}
          <h1 className="mt-6 max-w-2xl text-2xl md:text-4xl font-bold leading-tight text-white">{T("결과지 한 장과 지난주의 한 장면으로,")}<br /><span className="text-[hsl(var(--sidebar-primary))]">{T(STAGE_LABEL[stage])}</span> {' '}{T("수업을 준비합니다.")}</h1>
          <p className="mt-3 max-w-xl text-sm text-sidebar-foreground/75">{T("평가 도구가 아닙니다. 학생의 실제 경험을 수업과 실천 가능한 직무 과제로 바꾸는 교사용 준비실입니다.")}</p>
        </div>
      </div>

      <Link href="/studio" data-testid="link-studio-entry" className="rise group flex flex-wrap items-center gap-4 rounded-xl border-2 border-[hsl(var(--sidebar-primary))]/50 bg-card p-4 transition hover:border-[hsl(var(--sidebar-primary))]">
        <span className="font-mono text-xs tracking-[0.18em] text-[hsl(var(--sidebar-primary))]">STUDIO 1.5</span>
        <span className="font-bold">{T(stage === 'university' ? '대학교 과정 만들기' : '중·고등학교 과정 만들기')}</span>
        <span className="flex-1 text-sm text-muted-foreground">{T('하루 180·240·300분 또는 장기 과정 → 학생이 고른 미션 → 확인된 사실로 글쓰기·상담·모의 면접')}</span>
        <span className="text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">{T('열기')} ›</span>
      </Link>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <Link key={s.n} href={s.href} data-testid={`link-step-${s.n}`} className="rise group rounded-xl border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between"><span className="font-mono text-2xl font-semibold text-[hsl(var(--sidebar-primary))]">{s.n}</span><s.icon className="h-5 w-5 text-primary" /></div>
            <div className="mt-3 font-bold">{T(s.title)}</div>
            <p className="mt-1 text-sm text-muted-foreground">{T(s.body, T(STAGE_LABEL[stage]))}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Panel>
          <div className="flex items-center justify-between"><h2 className="font-bold text-lg">{T(STAGE_LABEL[stage])} {' '}{T("수업 6개")}</h2><Link href="/lessons" className="text-sm font-semibold text-primary" data-testid="link-all-lessons">{T("전체 보기")}</Link></div>
          <ul className="mt-3 divide-y">
            {stageLessons.map((l) => (
              <li key={l.id}>
                <Link href={`/lessons/${l.id}`} data-testid={`link-lesson-${l.id}`} className="group flex items-center gap-3 py-3">
                  <span className="font-mono text-xs text-muted-foreground w-10">{l.id}</span>
                  <div className="min-w-0 flex-1"><div className="text-xs text-primary font-semibold">{MODELS[l.model]}</div><div className="font-medium truncate">{l.title}</div></div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-[hsl(var(--sidebar-primary))]" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="space-y-4">
          <Panel>
            <h2 className="font-bold">{T("준비 현황")}{' '}<Pill tone="orange">{t(lang, 'browserSaved')}</Pill></h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              {[['저장한 수업', lessons.length], ['가상 학생', students.length], ['카드', cards.length], ['확정 카드', cards.filter((c) => c.status === 'confirmed').length], ['활동지', WORKSHEETS.filter((w) => w.stage === stage).length], ['전체 수업', LESSONS.length]].map(([k, v]) => (
                <div key={k as string} className="rounded-lg bg-muted p-3"><dt className="text-muted-foreground text-xs">{T(k as string)}</dt><dd className="font-mono text-xl font-semibold" data-testid={`stat-${k}`}>{v}</dd></div>
              ))}
            </dl>
          </Panel>
          <Panel className="border-2 border-primary/40">
            <div className="flex items-center gap-2 font-bold"><PlusCircle className="h-4 w-4 text-primary" />{T("새 수업 만들기")}</div>
            <p className="mt-1 text-sm text-muted-foreground">{T("학교급과 수업 모델을 고르고 기관·대상·형태·시간을 직접 입력합니다. 예시를 불러오지 않습니다.")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/lessons#new" data-testid="link-new-lesson" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground">{T("수업 만들기")}<ArrowRight className="h-4 w-4" /></Link>
              <Link href="/materials" data-testid="link-dashboard-materials" className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold">{T("개인 활동지·플래너 카드")}</Link>
              <Link href="/camp" data-testid="link-setup" className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold">{T("수업 운영 설정")}</Link>
            </div>
            <Link href="/camp" data-testid="link-camp" className="mt-3 block text-xs text-muted-foreground underline underline-offset-2">{T("선택 예시 보기: 한서대 캠프 (설정 화면에서 직접 불러올 때만 적용)")}</Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}
