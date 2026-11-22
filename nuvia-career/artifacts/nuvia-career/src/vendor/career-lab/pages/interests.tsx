import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useLab } from '@/vendor/career-lab/lib/store';
import { ActivitySupport } from '@/vendor/career-lab/components/lab/activity-support';
import { uid } from '@/vendor/career-lab/lib/types';
import { ACTIVITY_QUESTIONS } from '@/vendor/career-lab/lib/catalog';
import { strengthsOf } from '@/vendor/career-lab/lib/links';
import { PageHeader, Panel, Empty, Tag, LField, TextIn, TextArea, NextLink } from '@/vendor/career-lab/components/lab/ui';
import { AiPanel } from '@/vendor/career-lab/components/lab/ai-panel';
import { Button } from '@/vendor/career-lab/components/ui/button';

const SUGGEST = ['환경', '디자인', '컴퓨터', '글쓰기', '사람 돕기', '운동', '음악', '동물', '역사', '수학', '여행', '영상'];

export default function Interests() {
  const { state: s, update } = useLab();
  const [text, setText] = useState(''); const [reason, setReason] = useState('');
  const strengths = strengthsOf(s);
  const add = (t = text) => { if (!t.trim() || s.interests.some(i => i.text === t.trim())) return; update(d => { d.interests.push({ id: uid(), text: t.trim(), reason: t === text ? reason : '' }); }); setText(''); setReason(''); };
  return (
    <div>
      <PageHeader step="STEP 02" title="관심사 결합" desc="따로 고르는 게 아니라, 확인한 강점 위에 관심사를 더해요. 둘이 만나는 곳에서 탐색이 시작돼요." />
      <ActivitySupport id="interest-support" value={s.explorationSupport} onChange={support=>update(d=>{d.explorationSupport=support;})} context={{interests:s.interests.map(x=>x.text)}} />
      <Panel tone="teal" title="확인한 나의 강점" className="mb-6" action={<NextLink href="/understand">수정</NextLink>}>
        {strengths.length ? <div className="flex flex-wrap gap-2">{strengths.map(x => <Tag key={x.id} tone="teal" className="bg-card">{x.text} · {x.kind === 'test' ? '검사' : '자기 진술'}</Tag>)}</div> : <p className="text-sm text-muted-foreground">아직 강점이 없어요. 관심사부터 적어도 괜찮아요.</p>}
      </Panel>
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-3" title="나의 관심사" hint="여러 개 적어도 좋아요. 관심이 생긴 계기를 함께 적으면 나중에 이야기가 풍부해져요.">
          <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto]">
            <TextIn value={text} onChange={e => setText(e.target.value)} placeholder="관심사" data-testid="input-interest" />
            <TextIn value={reason} onChange={e => setReason(e.target.value)} placeholder="관심 계기 (선택)" data-testid="input-interest-reason" />
            <Button onClick={() => add()} data-testid="button-add-interest"><Plus className="h-4 w-4" />추가</Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">{SUGGEST.filter(x => !s.interests.some(i => i.text === x)).map(x => <button key={x} onClick={() => add(x)} className="rounded-full border px-3 py-1 text-xs hover:border-primary hover:text-primary">+ {x}</button>)}</div>
          <ul className="mt-5 space-y-2">
            {s.interests.length === 0 && <Empty title="관심사가 아직 없어요" desc="위에서 고르거나 직접 적어 보세요." />}
            {s.interests.map((i, idx) => (
              <li key={i.id} className="grid gap-2 rounded-xl bg-accent/50 p-3 md:grid-cols-[10rem_1fr_auto] md:items-center">
                <TextArea rows={2} value={i.text} onChange={e => update(d => { d.interests[idx].text = e.target.value; })} className="font-semibold" data-testid={`input-interest-value-${i.id}`} />
                <TextArea rows={3} value={i.reason} placeholder="관심 계기" onChange={e => update(d => { d.interests[idx].reason = e.target.value; })} data-testid={`input-interest-reason-${i.id}`} />
                <button aria-label="삭제" onClick={() => update(d => { d.interests = d.interests.filter(x => x.id !== i.id); })} className="justify-self-end rounded p-2 hover:text-destructive" data-testid={`button-delete-interest-${i.id}`}><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="lg:col-span-2" title="생각을 돕는 질문" hint="검사가 아니에요. 떠오르는 대로 적고 건너뛰어도 돼요.">
          <div className="space-y-4">{ACTIVITY_QUESTIONS.map(q => <LField key={q.id} label={q.q}><TextArea rows={2} value={s.activityAnswers[q.id] ?? ''} onChange={e => update(d => { d.activityAnswers[q.id] = e.target.value; })} data-testid={`input-question-${q.id}`} /></LField>)}</div>
        </Panel>
      </div>
      <Panel className="mt-6" tone="coral" title="나의 탐색 문장" hint="강점과 관심사를 이어 한 문장으로. 언제든 고칠 수 있어요.">
        <TextArea rows={3} value={s.statement} onChange={e => update(d => { d.statement = e.target.value; })} placeholder="예: 관찰하는 힘을 살려, 더위로 힘든 사람들을 돕는 공간을 탐색하고 싶어요." className="bg-card text-lg" data-testid="input-statement" />
        <div className="mt-4">
          <AiPanel task="explore" testId="statement" label="탐색 문장 초안 받기" desc="내가 입력한 강점·관심사만 사용해요."
            getContext={() => ({ purpose: '학생의 강점과 관심사를 이어 탐색 문장 후보 2~3개를 학생 말투로 제안. 확정 표현 금지.', strengths: strengths.map(x => ({ text: x.text, source: x.kind, studentFeels: x.fit })), interests: s.interests, answers: s.activityAnswers })}
            applyLabel="문장 칸에 덧붙이기" onApply={x => update(d => { d.statement = d.statement ? `${d.statement}\n${x}` : x; })} />
        </div>
      </Panel>
      <div className="mt-8 text-right"><NextLink href="/explore">다음: 가능성 탐색 →</NextLink></div>
    </div>
  );
}
