import { reportBasisLabel } from '@/lib/studio/reports';
import { useState } from 'react';
import { Search, Check as CheckIcon, X, RefreshCw, Save, ClipboardCheck, Pencil } from 'lucide-react';
import { T } from '@/i18n/tx';
import { saveExploration, getCandidates, selectCandidate, reviewMission, reviseMission, registerMission, recordMission, confirmExperience, addExperience, displayCandidate } from '@/lib/studio';
import type { ExplorationInput, Candidate, Mission, Course } from '@/lib/studio/types';
import { getState } from '@/lib/store';
import { Btn, Pill, inputCls } from '@/components/shell';
import { cn } from '@/lib/utils';
import { StudioFrame, Section, Txt, Check, act, useDraft, useStudio, studentName, tryOr, Empty, Status, SimTag } from './common';
import { PracticePanel, NextActionPanel } from './practice';

const blankEx = (): ExplorationInput => ({ job: '', companyId: '', question: '', duties: '', reason: '', outsideReason: '', source: '', behavior: '', remaining: 30, tools: [], supports: [] });

export function useStudentScope(course?: Course) {
  const { s, actor } = useStudio();
  const roster = course ? s.students.filter((x) => course.studentIds.includes(x.id)) : [];
  const [pick, setPick] = useDraft('scope-student', roster[0]?.id ?? '');
  const sid = actor.role === 'student' ? actor.id : roster.some((x) => x.id === pick) ? pick : roster[0]?.id ?? '';
  const picker = actor.role === 'student' ? <Pill tone="orange">{T('학생 본인 화면')}: {studentName(s, sid)}</Pill> : (
    <select data-testid="select-scope-student" value={sid} onChange={(e) => setPick(e.target.value)} className={cn(inputCls, 'w-auto')}>
      {roster.map((x) => <option key={x.id} value={x.id}>{x.displayName || x.code}</option>)}
    </select>
  );
  return { sid, picker, roster };
}

export default function Live() {
  const { s, course, actor } = useStudio();
  const { sid, picker } = useStudentScope(course);
  if (!course) return <StudioFrame kicker="STUDIO 1.5 · LIVE" title={T('현장 탐색과 미션')}>{null}</StudioFrame>;
  const missions = s.studio.missions.filter((m) => m.courseId === course.id);
  const queue = missions.filter((m) => m.status === 'review-needed');
  const mine = missions.filter((m) => m.studentId === sid);
  return (
    <StudioFrame kicker="STUDIO 1.5 · LIVE" title={T('현장 탐색과 미션')} actions={picker}>
      {actor.role === 'counselor' ? <Empty title={T('상담자 역할은 미션 화면을 보지 않습니다')} body={T('학생이 공유한 글은 글쓰기·상담 화면에서 확인합니다.')} /> : (
        <>
          {actor.role === 'teacher' && (
            <Section title={T('교사 검토 대기')} hint={T('제한 시간·도구·지원을 넘는 미션은 검토 후 확정됩니다.')} right={<Pill tone={queue.length ? 'orange' : 'gray'}>{queue.length}</Pill>}>
              {queue.length === 0 ? <p className="text-sm text-muted-foreground">{T('검토할 미션이 없습니다.')}</p> : <div className="space-y-2">{queue.map((m) => <ReviewRow key={m.id} m={m} name={studentName(s, m.studentId)} />)}</div>}
            </Section>
          )}
          {sid ? (
            <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
              <div className="space-y-5"><PracticePanel course={course} sid={sid} /><Explore key={sid} course={course} sid={sid} /></div>
              <Section title={T('{0}의 미션', studentName(s, sid))} hint={T('TOP5를 자동으로 미션으로 등록하지 않습니다. 학생이 탐색 후 고른 미션만 표시합니다.')}>
                {mine.length === 0 ? <Empty title={T('아직 선택한 미션이 없습니다')} /> : <div className="space-y-3">{mine.map((m) => <MissionCard key={m.id} m={m} />)}</div>}
                <ManualFact course={course} sid={sid} />
              </Section>
            </div>
          ) : null}
          {sid ? (
            <NextActionPanel course={course} sid={sid} />
          ) : <Empty title={T('과정에 학생이 없습니다')} />}
        </>
      )}
    </StudioFrame>
  );
}

function Explore({ course, sid }: { course: Course; sid: string }) {
  const { s } = useStudio();
  const [d, setD, clear] = useDraft<ExplorationInput>(`explore-${course.id}-${sid}`, blankEx);
  const [cands, setCands] = useDraft<Candidate[]>(`cands-${course.id}-${sid}`, []);
  const [chosen, setChosen] = useDraft<{ id: string; goal: string; first: string; scope?: boolean }>(`chosen-${course.id}-${sid}`, { id: '', goal: '', first: '', scope: false });
  const set = (p: Partial<ExplorationInput>) => setD((x) => ({ ...x, ...p }));
  const companies = s.studio.companies.filter((c) => !c.revoked);
  const tog = (k: 'tools' | 'supports', v: string) => set({ [k]: d[k].includes(v) ? d[k].filter((x) => x !== v) : [...d[k], v] });
  const explore = () => {
    if (!act((st) => saveExploration(st, course.id, sid, d), '탐색을 저장했습니다')) return;
    const c = tryOr(() => getCandidates(getState(), course.id, sid), [] as Candidate[]);
    setCands(c); setChosen({ id: '', goal: '', first: '' });
  };
  const ex = [...s.studio.explorations].reverse().find((e) => e.courseId === course.id && e.studentId === sid);
  const choose = () => {
    const c = cands.find((x) => x.id === chosen.id);
    if (!c || !ex || !chosen.scope) return;
    if (act((st) => selectCandidate(st, ex.id, c, chosen.goal, chosen.first), '미션을 선택했습니다')) { setCands([]); clear(); setChosen({ id: '', goal: '', first: '' }); }
  };
  return (
    <Section title={T('1 · 직무 탐색')} hint={T('질문·업무·이유·출처를 직접 적은 뒤 후보 2~3개를 받습니다.')}>
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <Txt label={T('관심 직무')} value={d.job} onChange={(v) => set({ job: v })} testid="input-ex-job" />
          <label className="text-sm"><span className="mb-1 block text-[13px] font-semibold text-muted-foreground">{T('참고 모델')}</span><select data-testid="select-ex-company" value={d.companyId} onChange={(e) => set({ companyId: e.target.value })} className={inputCls}><option value="">{T('없음')}</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.company} · {c.job}</option>)}</select></label>
        </div>
        <Txt label={T('내가 궁금한 질문')} value={d.question} onChange={(v) => set({ question: v })} testid="input-ex-question" />
        <Txt rows={2} label={T('이 직무가 하는 일')} value={d.duties} onChange={(v) => set({ duties: v })} testid="input-ex-duties" />
        <div className="grid grid-cols-2 gap-2"><Txt rows={2} label={T('관심 이유')} value={d.reason} onChange={(v) => set({ reason: v })} testid="input-ex-reason" /><Txt rows={2} label={T('결과지 밖의 이유')} value={d.outsideReason} onChange={(v) => set({ outsideReason: v })} testid="input-ex-outside" /></div>
        <div className="grid grid-cols-2 gap-2"><Txt label={T('찾아본 출처')} value={d.source} onChange={(v) => set({ source: v })} testid="input-ex-source" /><Txt label={T('해보고 싶은 행동')} value={d.behavior} onChange={(v) => set({ behavior: v })} testid="input-ex-behavior" /></div>
        <label className="flex items-center gap-2 text-sm">{T('남은 시간(분)')}<input type="number" data-testid="input-ex-remaining" value={d.remaining} onChange={(e) => set({ remaining: Number(e.target.value) })} className={cn(inputCls, 'w-20 font-mono')} /><span className="text-xs text-muted-foreground">{T('최대 {0}분', course.maxMissionMinutes)}</span></label>
        {course.tools.length > 0 && <div className="flex flex-wrap gap-1.5"><span className="text-xs font-semibold text-muted-foreground">{T('도구')}</span>{course.tools.map((t) => <Chip key={t} on={d.tools.includes(t)} onClick={() => tog('tools', t)} label={t} />)}</div>}
        {course.supportMaterials && <div className="flex flex-wrap gap-1.5"><span className="text-xs font-semibold text-muted-foreground">{T('지원')}</span>{course.supportMaterials.split(/\n|,/).map((x) => x.trim()).filter(Boolean).map((t) => <Chip key={t} on={d.supports.includes(t)} onClick={() => tog('supports', t)} label={t} />)}</div>}
        <Btn onClick={explore} data-testid="button-get-candidates"><Search className="h-4 w-4" />{T('탐색 저장 후 후보 보기')}</Btn>
      </div>
      {cands.length > 0 && (
        <div className="mt-4 space-y-2 border-t pt-4 rise">
          <div className="text-sm font-bold">{T('2 · 후보 중 하나 선택')}</div>
          {cands.map((original) => { const c=displayCandidate(original,[course.readingCandidates]);return (
            <button key={c.id} type="button" data-testid={`button-candidate-${c.id}`} onClick={() => setChosen({ id: c.id, goal: c.title, first: c.actions[0] ?? '', scope: false })} className={cn('w-full rounded-lg border p-3 text-start transition', chosen.id === c.id ? 'border-primary bg-secondary ring-2 ring-primary/25' : 'hover:border-primary/40')}>
              <div className="flex flex-wrap items-center gap-2"><b>{c.title}</b><span className="font-mono text-xs">{c.minutes}{T('분')}</span><SimTag on={c.simulation} /></div>
              <p className="mt-0.5 text-xs text-muted-foreground">{c.reason}</p>
              {c.reportRank && <p className="text-xs">{T('TOP5 원본 순서')}: {c.reportRank}</p>}
              <div className="mt-1 text-xs">{T('산출물')}: {c.deliverable} · {T('기준')}: {c.criterion}</div>
            </button>
          )})}
          {chosen.id && (
            <div className="space-y-2 rounded-lg bg-muted/50 p-3">
              <Txt label={T('나의 목표 (수정 가능)')} value={chosen.goal} onChange={(v) => setChosen({ ...chosen, goal: v })} testid="input-goal" />
              <Txt label={T('첫 행동 (수정 가능)')} value={chosen.first} onChange={(v) => setChosen({ ...chosen, first: v })} testid="input-first-action" />
              <Check label={T('시간 {0}분·도구·지원 범위 안에서 내가 할 수 있는 미션임을 확인했습니다', cands.find((x) => x.id === chosen.id)?.minutes ?? '')} checked={!!chosen.scope} onChange={(v) => setChosen({ ...chosen, scope: v })} testid="check-scope-confirm" />
              <Btn variant="orange" onClick={choose} disabled={!ex || !chosen.scope} data-testid="button-select-candidate"><CheckIcon className="h-4 w-4" />{T('이 미션으로 선택')}</Btn>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

const Chip = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => <button type="button" onClick={onClick} data-testid={`chip-${label}`} className={cn('rounded-md border px-2 py-0.5 text-xs', on ? 'border-primary bg-primary text-primary-foreground' : 'bg-card')}>{label}</button>;

function ReviewRow({ m, name }: { m: Mission; name: string }) {
  const [note, setNote] = useDraft(`review-${m.id}`, '');
  return (
    <div className="rounded-lg border p-3" data-testid={`row-review-${m.id}`}>
      <div className="flex flex-wrap items-center gap-2"><b>{name}</b><span>{m.goal}</span><span className="font-mono text-xs">{m.candidate.minutes}{T('분')}</span></div>
      <div className="mt-1 flex flex-wrap gap-1">{m.reviewReasons.map((r) => <Pill key={r} tone="orange">{T(r)}</Pill>)}</div>
      <div className="mt-2 flex flex-wrap items-center gap-2"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder={T('검토 메모')} className={cn(inputCls, 'flex-1')} data-testid={`input-review-note-${m.id}`} />
        <Btn onClick={() => act((s) => reviewMission(s, m.id, true, note), '확정했습니다')} data-testid={`button-approve-${m.id}`}><CheckIcon className="h-4 w-4" />{T('확정')}</Btn>
        <Btn variant="danger" onClick={() => act((s) => reviewMission(s, m.id, false, note), '수정 요청했습니다')} data-testid={`button-reject-${m.id}`}><X className="h-4 w-4" />{T('수정 요청')}</Btn></div>
    </div>
  );
}

function MissionCard({ m: original }: { m: Mission }) {
  const { actor, course } = useStudio();
  const m={...original,candidate:displayCandidate(original.candidate,[course?.readingCandidates??''])};
  const [edit, setEdit] = useState(false);
  const [rev, setRev] = useDraft(`revise-${m.id}`, { goal: m.goal, first: m.firstAction, reason: '' });
  const [rec, setRec] = useDraft(`record-${m.id}`, { ...m.record, status: (['in-progress', 'partial', 'performed'].includes(m.status) ? m.status : 'in-progress') as 'in-progress' | 'partial' | 'performed', help: m.helpRequest });
  const [fail, setFail] = useState(false);
  const canRecord = ['planner-registered', 'in-progress', 'partial', 'performed'].includes(m.status);
  const fake = m.status === 'performed' && !m.record.actual.trim();
  return (
    <article className="rounded-xl border p-3.5" data-testid={`card-mission-${m.id}`}>
      <div className="flex flex-wrap items-center gap-2"><b className="text-[15px]">{m.goal}</b><Status v={m.status} /><Status v={m.registration} /><SimTag on={m.simulation} />{m.plannerId && <span className="font-mono text-[11px] text-muted-foreground">{m.plannerId}</span>}</div>
      <div className="mt-1 text-sm">{T('첫 행동')}: {m.firstAction}</div>
      <div className="text-xs text-muted-foreground">{m.candidate.title} · {m.candidate.minutes}{T('분')} · {T('산출물')}: {m.candidate.deliverable}</div>
      <p className="mt-1 text-xs text-muted-foreground">{reportBasisLabel(m)}</p>
      {m.reviewNote && <div className="mt-1 text-xs">{T('검토 메모')}: {m.reviewNote}</div>}
      {fake && <div className="mt-1 text-xs font-semibold text-destructive">{T('수행 기록 없이 수행으로 표시할 수 없습니다')}</div>}
      <div className="mt-2 flex flex-wrap gap-2">
        <Btn variant="ghost" className="py-1 text-xs" onClick={() => setEdit(!edit)} data-testid={`button-revise-${m.id}`}><Pencil className="h-3.5 w-3.5" />{T('목표 수정')}</Btn>
        {(m.status === 'confirmed' || m.registration === 'failed') && <>
          <Btn variant="outline" className="py-1 text-xs" onClick={() => act((s) => registerMission(s, m.id, fail), fail ? undefined : '이 브라우저 플래너에 등록했습니다')} data-testid={`button-register-${m.id}`}>{m.registration === 'failed' ? <RefreshCw className="h-3.5 w-3.5" /> : <ClipboardCheck className="h-3.5 w-3.5" />}{m.registration === 'failed' ? T('다시 시도') : T('로컬 플래너 등록')}</Btn>
          <Check label={T('실패 상황 시험')} checked={fail} onChange={setFail} testid={`check-force-fail-${m.id}`} />
        </>}
        {m.status === 'performed' && actor.role === 'student' && !m.studentConfirmed && <Btn variant="orange" className="py-1 text-xs" onClick={() => act((s) => confirmExperience(s, m.id, true), '내 경험으로 확인했습니다')} data-testid={`button-confirm-exp-${m.id}`}><CheckIcon className="h-3.5 w-3.5" />{T('내 경험이 맞습니다')}</Btn>}
        {m.status === 'performed' && actor.role !== 'student' && !m.studentConfirmed && <Pill tone="gray">{T('학생 본인 확인 대기')}</Pill>}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{T('등록은 이 브라우저 안의 로컬 플래너 기록이며 외부 플래너에 전송되지 않습니다.')}</p>
      {edit && (
        <div className="mt-2 space-y-2 rounded-lg bg-muted/50 p-3 rise">
          <Txt label={T('목표')} value={rev.goal} onChange={(v) => setRev({ ...rev, goal: v })} testid={`input-rev-goal-${m.id}`} />
          <Txt label={T('첫 행동')} value={rev.first} onChange={(v) => setRev({ ...rev, first: v })} testid={`input-rev-first-${m.id}`} />
          <Txt label={T('수정 이유')} value={rev.reason} onChange={(v) => setRev({ ...rev, reason: v })} testid={`input-rev-reason-${m.id}`} />
          <Btn onClick={() => { if (act((s) => reviseMission(s, m.id, rev.goal, rev.first, rev.reason), '새 버전으로 저장했습니다')) setEdit(false); }} data-testid={`button-save-revise-${m.id}`}><Save className="h-4 w-4" />{T('버전 저장')}</Btn>
        </div>
      )}
      {canRecord && (
        <details className="mt-2 rounded-lg border p-2.5" open={m.status !== 'performed'}>
          <summary className="cursor-pointer text-sm font-semibold">{T('실행 기록')}</summary>
          <div className="mt-2 space-y-2">
            <Txt rows={2} label={T('실제로 한 일')} value={rec.actual} onChange={(v) => setRec({ ...rec, actual: v })} testid={`input-actual-${m.id}`} />
            <div className="grid grid-cols-2 gap-2"><Txt rows={2} label={T('결과')} value={rec.result} onChange={(v) => setRec({ ...rec, result: v })} testid={`input-result-${m.id}`} /><Txt rows={2} label={T('돌아보기')} value={rec.reflection} onChange={(v) => setRec({ ...rec, reflection: v })} testid={`input-reflection-${m.id}`} /></div>
            <div className="grid grid-cols-2 gap-2"><Txt label={T('증거')} value={rec.evidence} onChange={(v) => setRec({ ...rec, evidence: v })} testid={`input-evidence-${m.id}`} /><Txt label={T('바뀐 점')} value={rec.changed} onChange={(v) => setRec({ ...rec, changed: v })} testid={`input-changed-${m.id}`} /></div>
            <Txt label={T('도움 요청')} value={rec.help} onChange={(v) => setRec({ ...rec, help: v })} testid={`input-help-${m.id}`} />
            <div className="flex flex-wrap items-center gap-2">
              <select value={rec.status} onChange={(e) => setRec({ ...rec, status: e.target.value as typeof rec.status })} className={cn(inputCls, 'w-auto')} data-testid={`select-record-status-${m.id}`}><option value="in-progress">{T('진행 중')}</option><option value="partial">{T('부분 수행')}</option><option value="performed">{T('수행 완료')}</option></select>
              <Btn onClick={() => { const { status, help, ...record } = rec; act((s) => recordMission(s, m.id, record, status, help), '기록했습니다'); }} disabled={rec.status === 'performed' && !rec.actual.trim()} data-testid={`button-record-${m.id}`}><Save className="h-4 w-4" />{T('기록 저장')}</Btn>
            </div>
          </div>
        </details>
      )}
      {m.versions.length > 1 && <div className="mt-2 text-[11px] text-muted-foreground">{T('버전')} {m.versions.map((v) => `v${v.number}`).join(' · ')}</div>}
    </article>
  );
}

function ManualFact({ course, sid }: { course: Course; sid: string }) {
  const { actor } = useStudio();
  const [f, setF, clear] = useDraft(`fact-${course.id}-${sid}`, { action: '', result: '', learning: '', evidence: '', simulation: false, studentConfirmed: false });
  return (
    <details className="mt-4 rounded-lg border p-3">
      <summary className="cursor-pointer text-sm font-semibold">{T('미션 밖 경험 사실 추가')}</summary>
      <div className="mt-2 space-y-2">
        <Txt label={T('한 일')} value={f.action} onChange={(v) => setF({ ...f, action: v })} testid="input-fact-action" />
        <div className="grid grid-cols-2 gap-2"><Txt label={T('결과')} value={f.result} onChange={(v) => setF({ ...f, result: v })} testid="input-fact-result" /><Txt label={T('배운 점')} value={f.learning} onChange={(v) => setF({ ...f, learning: v })} testid="input-fact-learning" /></div>
        <Txt label={T('증거')} value={f.evidence} onChange={(v) => setF({ ...f, evidence: v })} testid="input-fact-evidence" />
        <div className="flex flex-wrap gap-4"><Check label={T('모의·가상 경험')} checked={f.simulation} onChange={(v) => setF({ ...f, simulation: v })} testid="check-fact-sim" /><Check label={T('학생 본인이 사실임을 확인')} checked={f.studentConfirmed} disabled={actor.role !== 'student'} onChange={(v) => setF({ ...f, studentConfirmed: v })} testid="check-fact-confirmed" /></div>
        <Btn variant="outline" onClick={() => { if (act((s) => addExperience(s, course.id, sid, f), '경험을 추가했습니다')) clear(); }} data-testid="button-add-fact">{T('추가')}</Btn>
      </div>
    </details>
  );
}
