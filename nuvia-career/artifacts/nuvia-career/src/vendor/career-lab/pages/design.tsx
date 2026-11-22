import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useLab } from '@/vendor/career-lab/lib/store';
import { programById } from '@/vendor/career-lab/lib/universities';
import { FIELDS, majorById } from '@/vendor/career-lab/lib/catalog';
import { now, uid, type Design, type Job } from '@/vendor/career-lab/lib/types';
import { strengthsOf } from '@/vendor/career-lab/lib/links';
import { PageHeader, Panel, Empty, Tag, LField, TextIn, TextArea, Select, NextLink } from '@/vendor/career-lab/components/lab/ui';
import { ActivitySupport } from '@/vendor/career-lab/components/lab/activity-support';
import { AiPanel } from '@/vendor/career-lab/components/lab/ai-panel';
import { TryActions } from '@/vendor/career-lab/components/lab/try-actions';
import { Button } from '@/vendor/career-lab/components/ui/button';

const typeLabel: Record<Job['type'], string> = { job: '직업', role: '직무', startup: '제품·서비스·창업' };

export default function DesignPage() {
  const { state: s, update } = useLab();
  const chosenProgram = s.tempProgram ? programById(s, s.tempProgram) : undefined;
  const m = majorById(s.tempMajor);
  const d0 = s.design;
  const [job, setJob] = useState({ title: '', type: 'job' as Job['type'], why: '' });
  const setD = (fn: (d: Design) => void) => update(st => { fn(st.design); st.design.updatedAt = now(); });
  const relatedRoles = m ? FIELDS.filter(f => m.fields.includes(f.id)).flatMap(f => f.roles.map(r => ({ ...r, field: f.name }))) : [];
  const strengths = strengthsOf(s);
  return (
    <div>
      <PageHeader step="STEP 05" title="진로 설계" desc="한 학과가 한 직업으로 이어지지 않아요. 전공에서 기를 역량이 원래 나의 강점·관심과 어떻게 만나는지, 여러 갈래로 그려 봐요." />
      <ActivitySupport id="design-support" value={s.explorationSupport} onChange={support=>update(d=>{d.explorationSupport=support;})} context={{interests:s.interests.map(x=>x.text)}} />
      {chosenProgram && <Panel className="mb-6" title="함께 탐색하는 대학·전공" hint="특정 대학에 입학하거나 수강했다는 뜻이 아니에요. 아래 역량·진로는 일반 전공 안내예요.">
        <p data-testid="design-selected-program"><bdi>{chosenProgram.universityOriginal} · {chosenProgram.programOriginal || chosenProgram.programDisplay}</bdi></p>
        <NextLink href="/majors">공식 교육과정과 자료 버전 다시 확인하기 →</NextLink>
      </Panel>}
      {!m ? <Empty title="임시 선택한 학과가 없어요" desc="학과를 정하지 않아도 아래 내용을 쓸 수 있지만, 하나를 임시로 골라 두면 연결이 쉬워요." action={<NextLink href="/majors">학과 임시 선택하기 →</NextLink>} /> : (
        <Panel tone="teal" title={`${m.name} — 길러지는 역량`} hint="일반 안내 기준">
          <div className="grid gap-4 md:grid-cols-3">
            <div><p className="mb-1 text-xs font-semibold text-muted-foreground">전공 역량</p><div className="flex flex-wrap gap-1.5">{m.competencies.map(c => <Tag key={c} tone="navy">{c}</Tag>)}</div></div>
            <div><p className="mb-1 text-xs font-semibold text-muted-foreground">나의 강점</p><div className="flex flex-wrap gap-1.5">{strengths.length ? strengths.map(x => <Tag key={x.id} tone="teal" className="bg-card">{x.text}</Tag>) : <span className="text-sm text-muted-foreground">없음</span>}</div></div>
            <div><p className="mb-1 text-xs font-semibold text-muted-foreground">나의 관심사</p><div className="flex flex-wrap gap-1.5">{s.interests.length ? s.interests.map(i => <Tag key={i.id} tone="coral">{i.text}</Tag>) : <span className="text-sm text-muted-foreground">없음</span>}</div></div>
          </div>
        </Panel>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="역량과 나를 잇기">
          <div className="space-y-4">
            <LField label="이 전공에서 기르고 싶은 역량"><TextArea value={d0.majorCompetencies} onChange={e => setD(d => { d.majorCompetencies = e.target.value; })} placeholder={m?.competencies.join(', ')} data-testid="input-competencies" /></LField>
            <LField label="원래 나의 강점·관심과 어떻게 이어지나요?"><TextArea rows={4} value={d0.connection} onChange={e => setD(d => { d.connection = e.target.value; })} data-testid="input-connection" /></LField>
            <LField label="미래 경로 (여러 갈래 가능)"><TextArea value={d0.futurePath} onChange={e => setD(d => { d.futurePath = e.target.value; })} placeholder="예: 학과 → 대학원 또는 현장 → ..." data-testid="input-path" /></LField>
            <LField label="더 배우고 싶은 것"><TextArea rows={2} value={d0.toLearn} onChange={e => setD(d => { d.toLearn = e.target.value; })} data-testid="input-learn" /></LField>
          </div>
        </Panel>
        <Panel title="여러 직업·직무·창업" hint="하나로 고정하지 않아요. 여러 개 담아 두세요.">
          <div className="grid gap-2 md:grid-cols-[1fr_9rem]">
            <TextIn value={job.title} onChange={e => setJob({ ...job, title: e.target.value })} placeholder="직업·직무 이름" data-testid="input-job" />
            <Select value={job.type} onChange={e => setJob({ ...job, type: e.target.value as Job['type'] })} options={(Object.keys(typeLabel) as Job['type'][]).map(k => ({ value: k, label: typeLabel[k] }))} />
            <TextIn value={job.why} onChange={e => setJob({ ...job, why: e.target.value })} placeholder="왜 궁금한가요?" className="md:col-span-2" />
            <Button className="md:col-span-2" onClick={() => { if (!job.title.trim()) return; setD(d => { d.jobs.push({ id: uid(), ...job, title: job.title.trim() }); }); setJob({ title: '', type: 'job', why: '' }); }} data-testid="button-add-job"><Plus className="h-4 w-4" />추가</Button>
          </div>
          {relatedRoles.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5"><span className="text-xs text-muted-foreground">관련 직무:</span>{relatedRoles.filter(r => !d0.jobs.some(j => j.title === r.name)).map(r => <button key={r.id} onClick={() => setD(d => { d.jobs.push({ id: uid(), title: r.name, type: 'role', why: '' }); })} className="rounded-full border px-2.5 py-0.5 text-xs hover:border-primary">+ {r.name}</button>)}</div>}
          <ul className="mt-4 space-y-2">{d0.jobs.map((j, i) => (
            <li key={j.id} className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2"><Tag tone="outline">{typeLabel[j.type]}</Tag><span className="flex-1 font-semibold">{j.title}</span><button aria-label="삭제" onClick={() => setD(d => { d.jobs = d.jobs.filter(x => x.id !== j.id); })} className="p-1 hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>
              <TextIn value={j.why} onChange={e => setD(d => { d.jobs[i].why = e.target.value; })} placeholder="이유" className="mt-2 py-1 text-sm" />
              <div className="mt-2"><TryActions sourceType="role" sourceId={`job:${j.id}`} sourceLabel={j.title} suggestion={`${j.title} 일하는 사람 인터뷰 영상 보고 하루 일과 정리하기`} /></div>
            </li>
          ))}</ul>
        </Panel>
      </div>
      <Panel className="mt-6" tone="coral" title="제품·서비스·창업 아이디어" hint="멋진 사업 계획보다, 누구의 어떤 문제인지와 이번 주에 해 볼 작은 검증이 중요해요.">
        <div className="grid gap-4 md:grid-cols-2">
          <LField label="누구를 위해?"><TextIn value={d0.startup.target} onChange={e => setD(d => { d.startup.target = e.target.value; })} className="bg-card" data-testid="input-startup-target" /></LField>
          <LField label="그 사람의 어떤 문제?"><TextIn value={d0.startup.problem} onChange={e => setD(d => { d.startup.problem = e.target.value; })} className="bg-card" data-testid="input-startup-problem" /></LField>
          <LField label="해결 아이디어"><TextArea rows={2} value={d0.startup.idea} onChange={e => setD(d => { d.startup.idea = e.target.value; })} className="bg-card" /></LField>
          <LField label="작은 검증 실험" hint="예: 5명에게 질문하기, 종이 시제품 보여주기"><TextArea rows={2} value={d0.startup.experiment} onChange={e => setD(d => { d.startup.experiment = e.target.value; })} className="bg-card" data-testid="input-startup-experiment" /></LField>
        </div>
        {d0.startup.experiment && <div className="mt-4"><TryActions sourceType="role" sourceId="startup" sourceLabel={`창업 검증: ${d0.startup.problem || '아이디어'}`} suggestion={d0.startup.experiment} /></div>}
      </Panel>
      <div className="mt-6">
        <AiPanel task="explore" testId="design" label="설계 아이디어 받기" desc="전공 역량과 내 강점·관심을 잇는 여러 직업·창업 갈래를 제안받아요."
          getContext={() => ({ purpose: '임시 선택 학과의 역량과 학생의 강점·관심을 연결. 여러 직업·직무, 제품·서비스·창업(대상의 문제와 작은 검증 실험 포함), 미래 경로, 추가 배움 제안. 학과와 직업을 일대일로 고정하지 말 것.', major: m?.name ?? '미정', competencies: m?.competencies, strengths: strengths.map(x => x.text), interests: s.interests, design: d0 })}
          applyLabel="‘더 배우고 싶은 것’ 아래에 메모로 추가" applyDesc="AI 제안을 ‘더 배우고 싶은 것’ 칸 아래에 덧붙여요. 기존 내용은 지워지지 않아요." onApply={x => setD(d => { d.toLearn = d.toLearn ? `${d.toLearn}\n\n[AI 제안 메모]\n${x}` : `[AI 제안 메모]\n${x}`; })} />
      </div>
      <div className="mt-8 text-right"><NextLink href="/planner">다음: 플래너에서 실험하기 →</NextLink></div>
    </div>
  );
}
