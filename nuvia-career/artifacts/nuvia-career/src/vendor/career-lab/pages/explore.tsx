import { useState } from 'react';
import { ActivitySupport } from '@/vendor/career-lab/components/lab/activity-support';
import { Link, useLocation } from 'wouter';
import { Search } from 'lucide-react';
import { useLab } from '@/vendor/career-lab/lib/store';
import { FIELDS, majorById, tierLabel, type Tier } from '@/vendor/career-lab/lib/catalog';
import { fieldStatusLabel, today, type FieldStatus } from '@/vendor/career-lab/lib/types';
import { reasonsFor, strengthsOf } from '@/vendor/career-lab/lib/links';
import { PageHeader, Tag, TextIn } from '@/vendor/career-lab/components/lab/ui';
import { TryActions } from '@/vendor/career-lab/components/lab/try-actions';
import { AiPanel } from '@/vendor/career-lab/components/lab/ai-panel';
import { cn } from '@/vendor/career-lab/lib/utils';

export default function Explore() {
  const { state: s, update } = useLab();
  const [tier, setTier] = useState<Tier | 'all' | 'mine'>('all');
  const [open, setOpen] = useState<string>('');
  const [catQ, setCatQ] = useState('');
  const [, navigate] = useLocation();
  const goCatalogue = (e: React.FormEvent) => { e.preventDefault(); const v = catQ.trim(); navigate(`/majors${v ? `?catalogueQuery=${encodeURIComponent(v)}` : ''}#full-catalogue`); };
  const list = FIELDS.filter(f => tier === 'all' ? true : tier === 'mine' ? !!s.fields[f.id] : f.tier === tier);
  const mark = (id: string, st: FieldStatus) => update(d => { if (d.fields[id]?.status === st) delete d.fields[id]; else d.fields[id] = { status: st, note: d.fields[id]?.note ?? '', date: today() }; });
  return (
    <div>
      <PageHeader step="STEP 03" title="가능성 탐색" desc="적합도 점수는 없어요. 내 강점·관심사와 겹치는 단어가 있으면 연결 이유로 보여 줄 뿐, 결정은 내가 해요." />
      <section className="mb-6 rounded-2xl border-2 border-primary/40 bg-secondary/40 p-5" aria-labelledby="explore-full-catalogue-title" data-testid="section-explore-full-catalogue">
        <h2 id="explore-full-catalogue-title" className="font-display text-xl font-bold">전체 공개 대학·학과 목록에서 찾기</h2>
        <p className="mt-1 text-sm text-muted-foreground">아래 분야 카드는 LAB이 고른 일부 분야와 추천일 뿐, 모든 학과가 아니에요. 찾는 학과·대학이 따로 있다면 전체 공개 목록에서 검색해 보세요.</p>
        <form onSubmit={goCatalogue} className="mt-3 flex flex-wrap gap-2" role="search">
          <div className="relative min-w-0 flex-[1_1_14rem]"><Search className="absolute start-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden /><TextIn value={catQ} onChange={e => setCatQ(e.target.value)} placeholder="학과·대학 이름 (원어 포함)" aria-label="전체 공개 목록 검색어" className="min-h-11 ps-9" data-testid="input-explore-catalogue" /></div>
          <button type="submit" className="min-h-11 rounded-lg bg-foreground px-5 text-sm font-semibold text-background" data-testid="button-explore-catalogue">전체 목록에서 검색</button>
        </form>
      </section>
      <h2 className="font-display mb-1 text-lg font-bold">LAB이 고른 탐색 분야</h2>
      <ActivitySupport id="explore-support" value={s.explorationSupport} onChange={support=>update(d=>{d.explorationSupport=support;})} context={{interests:s.interests.map(x=>x.text),strengths:strengthsOf(s).map(x=>x.text)}} />
      <p className="mb-3 text-sm text-muted-foreground">강점·관심사와 연결해 보기 위한 일부 분야 모음이에요. 전체 학과 목록이 아니에요.</p>
      <div className="mb-6 flex flex-wrap gap-2" role="tablist">
        {([['all', '전체'], ['current', tierLabel.current], ['expand', tierLabel.expand], ['future', tierLabel.future], ['mine', '내가 표시한 분야']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tier === k} onClick={() => setTier(k)} className={cn('rounded-full px-4 py-1.5 text-sm transition', tier === k ? 'bg-foreground text-background' : 'border hover:bg-muted')} data-testid={`tab-tier-${k}`}>{l}</button>
        ))}
      </div>
      <div className="mb-8">
        <AiPanel task="explore" testId="explore" label="내 기록으로 탐색 아이디어 받기" desc="AI 의견은 참고용이며 자동으로 저장되지 않아요."
          getContext={() => ({ purpose: '강점·관심사를 바탕으로 현재 분야, 확장 분야, 미래 아이디어를 구분해 탐색 아이디어를 제안. 각 분야마다 누구의 문제를 다루는지와 연결 이유. 적합도 점수·확정 금지.', strengths: strengthsOf(s).map(x => x.text), interests: s.interests, statement: s.statement, marked: s.fields })} />
      </div>
      {list.length === 0 && <p className="text-muted-foreground">아직 표시한 분야가 없어요.</p>}
      <div className="grid gap-5 md:grid-cols-2">
        {list.map(f => {
          const reasons = reasonsFor(f, s); const st = s.fields[f.id]; const isOpen = open === f.id;
          return (
            <article key={f.id} className={cn('lift rounded-2xl border bg-card p-6', st?.status === 'not' && 'opacity-70')} data-testid={`card-field-${f.id}`}>
              <div className="flex flex-wrap items-center gap-2"><Tag tone="outline">{tierLabel[f.tier]}</Tag>{st && <Tag tone={st.status === 'interested' ? 'teal' : 'muted'}>{fieldStatusLabel[st.status]}</Tag>}</div>
              <h3 className="font-display mt-3 text-2xl font-bold">{f.name}</h3>
              <p className="mt-1 text-muted-foreground">{f.summary}</p>
              <div className="mt-4 rounded-lg bg-secondary/50 p-3 text-sm">
                <p className="font-semibold text-secondary-foreground">나와의 연결</p>
                {reasons.length ? <ul className="mt-1 space-y-0.5">{reasons.map((r, i) => <li key={i}>{r.src} “{r.label}” — ‘{r.kw}’와 이어져요</li>)}</ul> : <p className="mt-1 text-muted-foreground">입력한 강점·관심사와 겹치는 단어는 아직 없어요. 그래도 궁금하면 탐색해 보세요.</p>}
              </div>
              <button onClick={() => setOpen(isOpen ? '' : f.id)} className="mt-3 text-sm font-semibold text-primary" aria-expanded={isOpen}>{isOpen ? '접기' : '누구의 문제·배움·학과·직무 보기'}</button>
              {isOpen && (
                <div className="rise mt-3 space-y-3 text-sm">
                  <p><b>누구의 문제?</b> {f.whoseProblem}</p>
                  <p><b>무엇을 배우나</b> {f.learn}</p>
                  <div><b>이어진 학과</b> <span className="ml-1 inline-flex flex-wrap gap-1">{f.majors.map(m => <Link key={m} href={`/majors?m=${m}`} className="rounded-full bg-muted px-2 py-0.5 hover:bg-secondary">{majorById(m)?.name}</Link>)}</span></div>
                  <div className="space-y-2"><b>직무</b>{f.roles.map(r => (
                    <div key={r.id} className="rounded-lg border p-3"><p className="font-semibold">{r.name}</p><p className="text-muted-foreground">{r.desc}</p><p className="mt-1">해 볼 것: {r.tryIt}</p><div className="mt-2"><TryActions sourceType="role" sourceId={r.id} sourceLabel={`${r.name} (${f.name})`} suggestion={r.tryIt} /></div></div>
                  ))}</div>
                </div>
              )}
              <p className="mt-4 text-sm"><span className="font-semibold">작은 실험</span> {f.tryIt}</p>
              <div className="mt-3"><TryActions sourceType="field" sourceId={f.id} sourceLabel={f.name} suggestion={f.tryIt} /></div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                {(['interested', 'hold', 'not'] as FieldStatus[]).map(k => <button key={k} onClick={() => mark(f.id, k)} aria-pressed={st?.status === k} className={cn('rounded-full px-3 py-1 text-xs', st?.status === k ? 'bg-foreground text-background' : 'border hover:bg-muted')} data-testid={`button-mark-${k}-${f.id}`}>{fieldStatusLabel[k]}</button>)}
                {st && <TextIn value={st.note} onChange={e => update(d => { d.fields[f.id].note = e.target.value; })} placeholder="이유 메모" className="mt-1 py-1 text-sm" />}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
