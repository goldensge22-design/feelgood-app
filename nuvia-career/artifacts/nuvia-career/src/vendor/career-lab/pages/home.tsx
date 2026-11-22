import { Link } from 'wouter';
import { ArrowRight, ScanSearch, Heart, FlaskConical, Lock, PlugZap, Check } from 'lucide-react';
import { useLab } from '@/vendor/career-lab/lib/store';
import { activityTitle } from '@/vendor/career-lab/lib/activity-assistance';
import { FIELDS, majorById, tierLabel } from '@/vendor/career-lab/lib/catalog';
import { strengthsOf, hasPersonalData } from '@/vendor/career-lab/lib/links';
import { statusLabel, today } from '@/vendor/career-lab/lib/types';
import { Panel, Empty, Tag, NextLink } from '@/vendor/career-lab/components/lab/ui';
import { Button } from '@/vendor/career-lab/components/ui/button';
import { TryActions } from '@/vendor/career-lab/components/lab/try-actions';

function weekRange() {
  const d = new Date(); const day = (d.getDay() + 6) % 7; const s = new Date(d); s.setDate(d.getDate() - day);
  const e = new Date(s); e.setDate(s.getDate() + 6);
  const f = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return [f(s), f(e)];
}

type S = ReturnType<typeof useLab>['state'];
function steps(s: S) {
  const doneNoRef = s.activities.find(a => a.status === 'done' && !s.reflections.some(r => r.activityId === a.id));
  const upcoming = s.activities.find(a => a.status !== 'done');
  return [
    { href: '/understand', name: '강점', done: s.tests.length > 0, label: '검사 결과지나 내가 아는 강점을 적어 보세요' },
    { href: '/interests', name: '관심사', done: s.interests.length > 0, label: '강점에 관심사를 더해 보세요' },
    { href: '/explore', name: '분야', done: Object.values(s.fields).some(f => f.status === 'interested'), label: '탐색할 분야를 하나 골라 보세요' },
    { href: '/majors', name: '학과', done: s.savedMajors.length > 0, label: '관심 분야와 이어진 학과를 저장해 보세요' },
    { href: '/majors', name: '임시 선택', done: !!s.tempMajor, label: '저장한 학과 중 하나를 임시로 골라 보세요' },
    { href: '/design', name: '진로 설계', done: s.design.jobs.length > 0 || !!s.design.connection, label: '임시 학과와 이어지는 직업·역량을 설계해 보세요' },
    { href: '/planner', name: '활동 계획', done: s.activities.length > 0, label: '이번 주에 해 볼 작은 활동을 담아 보세요' },
    { href: '/planner', name: '활동 실천', done: s.activities.some(a => a.status === 'done'), label: upcoming ? `“${upcoming.title}” 활동을 해 보고 완료로 바꿔 보세요` : '계획한 활동을 실천해 보세요' },
    { href: '/experiences', name: '회고', done: s.reflections.length > 0 && !doneNoRef, label: doneNoRef ? `“${doneNoRef.title}” 회고를 남겨 보세요` : '마친 활동의 회고를 남겨 보세요' },
    { href: '/map', name: '지도', done: !!s.mapViewedAt, label: '진로 지도에서 강점부터 회고까지 연결을 확인해 보세요' },
    { href: '/story', name: '이야기', done: s.story.paragraphs.length > 0, label: '기록을 근거로 나의 이야기를 직접 써 보세요' },
  ];
}
function nextAction(s: S) {
  const st = steps(s);
  const n = st.find(x => !x.done);
  return n ?? { href: '/story', label: '지금까지의 기록으로 나의 이야기를 다듬어 보세요' };
}

export default function Home() {
  const { state: s, update, setMode, mode } = useLab();
  const strengths = strengthsOf(s);
  const [ws, we] = weekRange();
  const week = s.activities.filter(a => a.date >= ws && a.date <= we).sort((a, b) => a.date.localeCompare(b.date));
  const interested = FIELDS.filter(f => s.fields[f.id]?.status === 'interested');
  const recent = [...s.reflections].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);
  const nxt = nextAction(s);
  const path = steps(s);
  const personal = hasPersonalData(s);
  const discovery = [FIELDS[2], FIELDS[3], FIELDS[10]];

  return (
    <div className="space-y-8">
      {!s.welcomed && mode === 'user' && (
        <section className="rise relative overflow-hidden rounded-3xl bg-foreground p-7 text-background md:p-12" data-testid="panel-welcome">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/40 blur-2xl" />
          <div className="absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-coral/40 blur-2xl" />
          <div className="relative max-w-2xl">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.2em] text-background/60"><PlugZap className="h-3.5 w-3.5" />기존 서버 연결 대기</p>
            <h1 className="font-display mt-3 text-3xl font-bold leading-snug md:text-[2.6rem]">결과지에 관심사를 더해<br />나만의 진로 지도를 그려요</h1>
            <p className="mt-4 text-background/75">결과 확인 → 관심사 → 분야·학과 → 진로 설계 → 작은 실천 → 회고 → 지도와 이야기. 점수나 순위는 매기지 않아요.</p>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-background/10 p-3 text-sm text-background/80"><Lock className="mt-0.5 h-4 w-4 shrink-0" />아직 기존 서버와 연결되지 않았어요. 결과를 입력하면 서버가 아닌 이 브라우저에 임시 초안으로만 저장돼요. 민감한 실제 정보는 넣지 마세요.</div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/understand" onClick={() => update(d => { d.welcomed = true; })} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:brightness-110" data-testid="button-start">임시 초안으로 결과 입력 <ArrowRight className="h-4 w-4" /></Link>
              <button onClick={() => setMode('demo')} className="rounded-full border border-background/30 px-5 py-2.5 font-semibold hover:bg-background/10" data-testid="button-demo">예시 체험 둘러보기</button>
              <button onClick={() => update(d => { d.welcomed = true; })} className="px-3 py-2.5 text-sm text-background/60 underline-offset-4 hover:underline" data-testid="button-dismiss-welcome">안내 닫기</button>
            </div>
          </div>
        </section>
      )}
      {mode === 'demo' && (
        <section className="rise rounded-2xl border border-[hsl(var(--coral)/0.4)] bg-accent p-5 text-accent-foreground" data-testid="panel-demo-welcome">
          <p className="font-display text-lg font-bold">가상 학생의 예시 LAB이에요</p>
          <p className="mt-1 text-sm">모든 기록은 지어낸 예시이고 자유롭게 고쳐 볼 수 있어요. 나의 이야기 문단은 기록을 바탕으로 미리 준비한 수동 작성 예시이며 AI 생성 결과가 아니에요. 이 브라우저에만 따로 저장돼요. <Link href="/settings" className="font-semibold underline" data-testid="link-demo-reset">저장·초기화 안내</Link></p>
        </section>
      )}

      <header className="rise flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-primary">나의 LAB · {today()}</p>
          <h1 className="font-display mt-2 text-3xl font-bold md:text-4xl">{s.statement ? '지금 나의 탐색' : '오늘의 탐색 책상'}</h1>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed" data-testid="text-statement">
            {s.statement ? <>“{s.statement}”</> : <span className="text-muted-foreground">아직 탐색 문장이 없어요. 강점과 관심사를 적으면 나만의 한 문장을 만들 수 있어요.</span>}
          </p>
        </div>
        <Link href={nxt.href} className="lift group flex max-w-sm items-center gap-3 rounded-2xl border border-[hsl(var(--coral)/0.4)] bg-accent px-5 py-4" data-testid="link-next-action">
          <div><p className="text-[11px] font-semibold tracking-wider text-accent-foreground/70">다음 행동</p><p className="font-semibold text-accent-foreground">{nxt.label}</p></div>
          <ArrowRight className="h-5 w-5 shrink-0 text-coral transition group-hover:translate-x-1" />
        </Link>
      </header>

      <nav className="rise -mt-2" aria-label="탐색 단계">
        <ol className="flex flex-wrap gap-1.5">
          {path.map((p, i) => (
            <li key={p.name}>
              <Link href={p.href} title={p.label} aria-current={p.label === nxt.label ? 'step' : undefined} data-testid={`link-step-${i}`}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${p.label === nxt.label ? 'border-coral bg-accent font-semibold text-accent-foreground' : p.done ? 'border-primary/30 bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                {p.done ? <Check className="h-3 w-3" /> : <span className="font-mono text-[10px]">{String(i + 1).padStart(2, '0')}</span>}{p.name}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid gap-5 lg:grid-cols-12">
        <Panel className="lg:col-span-7 rise-2" title="강점과 관심사" hint="확인한 검사 결과와 내가 적은 관심사" action={<NextLink href="/understand">수정</NextLink>}>
          {strengths.length + s.interests.length === 0 ? (
            <Empty title="아직 비어 있어요" desc="검사 결과지가 없어도 괜찮아요. 내가 아는 강점부터 적을 수 있어요." action={<><Link href="/understand"><Button size="sm"><ScanSearch className="h-4 w-4" />강점 입력</Button></Link><Link href="/interests"><Button size="sm" variant="outline"><Heart className="h-4 w-4" />관심사 입력</Button></Link></>} />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">{strengths.map(x => <Tag key={x.id} tone="teal">{x.text}<span className="opacity-60">· {x.kind === 'test' ? '검사' : '자기 진술'}</span></Tag>)}</div>
              <div className="flex flex-wrap gap-2">{s.interests.map(i => <Tag key={i.id} tone="coral">{i.text}</Tag>)}</div>
            </div>
          )}
        </Panel>

        <Panel className="lg:col-span-5 rise-2" title="이번 주 활동" hint={`${ws.slice(5)} ~ ${we.slice(5)}`} action={<NextLink href="/planner">플래너</NextLink>}>
          {week.length === 0 ? <Empty title="이번 주 계획이 없어요" desc="수업·독서·관찰처럼 30분짜리 작은 활동이면 충분해요." action={<Link href="/planner"><Button size="sm">활동 추가</Button></Link>} /> : (
            <ul className="divide-y">{week.map(a => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span><span className="mr-2 font-mono text-xs text-muted-foreground">{a.date.slice(5)}</span>{activityTitle(a)}</span><Tag tone={a.status === 'done' ? 'teal' : a.status === 'doing' ? 'coral' : 'muted'}>{statusLabel[a.status]}</Tag></li>
            ))}</ul>
          )}
        </Panel>

        <Panel className="lg:col-span-4 rise-3" title="탐색 중인 분야·학과" action={<NextLink href="/majors">학과</NextLink>}>
          {interested.length + s.savedMajors.length === 0 ? <Empty title="아직 고른 분야가 없어요" action={<Link href="/explore"><Button size="sm" variant="outline">분야 둘러보기</Button></Link>} /> : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">{interested.map(f => <Tag key={f.id} tone="outline">{f.name}</Tag>)}</div>
              <div className="flex flex-wrap gap-2">{s.savedMajors.map(m => <Tag key={m} tone={s.tempMajor === m ? 'navy' : 'muted'}>{majorById(m)?.name}{s.tempMajor === m && ' · 임시 선택'}</Tag>)}</div>
            </div>
          )}
        </Panel>

        <Panel className="lg:col-span-4 rise-3" title="최근 발견" action={<NextLink href="/experiences">기록</NextLink>}>
          {recent.length === 0 ? <Empty title="회고가 아직 없어요" desc="활동을 마친 뒤 느낀 점을 남기면 여기에 보여요." /> : (
            <ul className="space-y-3">{recent.map(r => <li key={r.id} className="rounded-lg bg-muted/60 p-3 text-sm"><p className="font-semibold">{r.learned || r.title}</p>{r.question && <p className="mt-1 text-muted-foreground">새 질문: {r.question}</p>}</li>)}</ul>
          )}
        </Panel>

        <div className="grid gap-5 lg:col-span-4 rise-3">
          <Link href="/map" className="lift rounded-2xl border bg-card p-5" data-testid="link-map-card">
            <p className="text-xs font-semibold text-primary">진로 지도</p>
            <div className="my-3 flex items-center gap-1.5">{['강점', '관심', '분야', '학과', '직업', '활동'].map((x, i) => <span key={x} className={`h-2 flex-1 rounded-full ${i < [strengths.length, s.interests.length, interested.length, s.savedMajors.length, s.design.jobs.length, s.activities.length].filter(Boolean).length ? 'bg-primary' : 'bg-muted'}`} />)}</div>
            <p className="text-sm text-muted-foreground">강점에서 활동까지 연결을 확인해요</p>
          </Link>
          <Link href="/story" className="lift rounded-2xl border bg-card p-5" data-testid="link-story-card">
            <p className="text-xs font-semibold text-coral">나의 이야기</p>
            <p className="mt-2 font-semibold">{s.story.paragraphs.length ? `${s.story.paragraphs.length}개 문단 · 버전 ${s.story.versions.length}개` : '아직 초안이 없어요'}</p>
            <p className="text-sm text-muted-foreground">기록이 쌓이면 지도가 자기소개서가 돼요</p>
          </Link>
        </div>
      </div>

      <section className="rise rise-4">
        <div className="mb-4 flex items-end justify-between">
          <div><h2 className="text-lg font-bold">둘러보기 좋은 분야</h2><p className="text-sm text-muted-foreground">{personal ? '모든 학생에게 보여주는 일반 탐색 카드예요. 나에게 맞춘 추천이 아니에요.' : '나에 대한 정보 없이 보여주는 일반 탐색 카드예요.'}</p></div>
          <NextLink href="/explore">전체 보기</NextLink>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {discovery.map((f, i) => (
            <article key={f.id} className={`lift flex flex-col rounded-2xl border bg-card p-5 ${i === 1 ? 'md:translate-y-4' : ''}`}>
              <Tag tone="outline" className="self-start">{tierLabel[f.tier]}</Tag>
              <h3 className="font-display mt-3 text-xl font-bold">{f.name}</h3>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{f.summary}</p>
              <p className="mt-3 text-sm"><FlaskConical className="mr-1 inline h-3.5 w-3.5 text-primary" />{f.tryIt}</p>
              <div className="mt-4"><TryActions sourceType="field" sourceId={f.id} sourceLabel={f.name} suggestion={f.tryIt} /></div>
            </article>
          ))}
        </div>
      </section>

      {mode === 'user' && (
        <aside className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-primary/30 p-5" data-testid="panel-demo-cta">
          <div><p className="font-semibold">흐름을 먼저 보고 싶나요?</p><p className="text-sm text-muted-foreground">가상 학생의 예시 기록으로 둘러봐요. 임시 초안과 섞이지 않아요.</p></div>
          <Button variant="outline" onClick={() => setMode('demo')} data-testid="button-demo-cta"><FlaskConical className="h-4 w-4" />예시 체험 시작</Button>
        </aside>
      )}
    </div>
  );
}
