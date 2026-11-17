import { Save, Plus } from 'lucide-react';
import { T } from '@/i18n/tx';
import { interviewQuestions, saveMockInterview, addExperience } from '@/lib/studio';
import type { Writing, MockInterview } from '@/lib/studio/types';
import { Btn, Pill } from '@/components/shell';
import { StudioFrame, Section, Txt, Check, act, useDraft, useStudio, tryOr, Empty } from './common';
import { useStudentScope } from './live';
import { displayAppText } from '@/i18n/authored';
import { formatDateTime } from '@/i18n/format';

/** Only the app-owned instruction line (before the first newline) is localized; student content after it is shown as written. */
const qText = (q: string) => { const k = q.indexOf('\n'); return k < 0 ? displayAppText(q) : `${displayAppText(q.slice(0, k))}\n${q.slice(k + 1)}`; };
import { NextActionPanel } from './practice';

export default function Interview() {
  const { s, course, actor } = useStudio();
  const { sid, picker } = useStudentScope(course);
  const w = course ? s.studio.writings.find((x) => x.courseId === course.id && x.studentId === sid) : undefined;
  return (
    <StudioFrame kicker="STUDIO 1.5 · MOCK INTERVIEW" title={T('모의 면접 연습')} actions={actor.role !== 'student' ? picker : undefined}>
      <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">{T('연습용 질문입니다. 실제 채용 면접관·합격 판정·점수가 아닙니다. 경험 질문과 가정 질문을 구분합니다.')}</p>
      {actor.role === 'counselor' ? <Empty title={T('상담자 역할은 모의 면접 기록을 보지 않습니다')} /> : <>
        {!w ? <Empty title={T('글 V1이 있어야 질문을 만들 수 있습니다')} /> : <Body key={w.id} w={w} />}
        {course && sid && <NextActionPanel course={course} sid={sid} />}
      </>}
    </StudioFrame>
  );
}

function Body({ w }: { w: Writing }) {
  const { s } = useStudio();
  const qs = tryOr(() => interviewQuestions(s, w.id), []);
  const past = s.studio.interviews.filter((i) => i.writingId === w.id);
  return (
    <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
      <div className="space-y-4">{qs.length === 0 ? <Empty title={T('질문이 없습니다')} /> : qs.map((q, i) => <QCard key={i} w={w} q={q} i={i} />)}</div>
      <Section title={T('지난 연습')} right={<Pill tone="gray">{past.length}</Pill>}>
        {past.length === 0 ? <p className="text-sm text-muted-foreground">{T('저장된 연습이 없습니다.')}</p> : <ul className="space-y-2">{past.map((p) => <Past key={p.id} p={p} w={w} />)}</ul>}
      </Section>
    </div>
  );
}

function QCard({ w, q, i }: { w: Writing; q: { kind: 'experience' | 'hypothetical'; question: string }; i: number }) {
  const blank = { answer: '', followUp: '', feedback: '', reanswer: '', additionalFact: '', factConfirmed: false };
  const [d, setD, clear] = useDraft(`iv-${w.id}-${i}`, blank);
  const set = (p: Partial<typeof blank>) => setD({ ...d, ...p });
  return (
    <section className="rounded-xl border bg-card p-4" data-testid={`card-question-${i}`}>
      <div className="flex items-center gap-2"><Pill tone={q.kind === 'experience' ? 'blue' : 'orange'}>{q.kind === 'experience' ? T('경험 질문') : T('가정 질문')}</Pill><span className="font-mono text-xs text-muted-foreground">Q{i + 1}</span></div>
      <p className="mt-1.5 whitespace-pre-wrap font-semibold">{qText(q.question)}</p>
      <div className="mt-2 space-y-2">
        <Txt rows={3} label={T('답변')} value={d.answer} onChange={(v) => set({ answer: v })} testid={`input-answer-${i}`} />
        <div className="grid gap-2 sm:grid-cols-2"><Txt rows={2} label={T('꼬리 질문')} value={d.followUp} onChange={(v) => set({ followUp: v })} testid={`input-follow-${i}`} /><Txt rows={2} label={T('피드백 (점수 없음)')} value={d.feedback} onChange={(v) => set({ feedback: v })} testid={`input-feedback-${i}`} /></div>
        <Txt rows={3} label={T('다시 답하기')} value={d.reanswer} onChange={(v) => set({ reanswer: v })} testid={`input-reanswer-${i}`} />
        {q.kind === 'experience' && <><Txt label={T('답하며 떠오른 추가 사실')} value={d.additionalFact} onChange={(v) => set({ additionalFact: v })} testid={`input-extra-${i}`} /><Check label={T('학생이 사실임을 확인 (V3에 사용 가능)')} checked={d.factConfirmed} onChange={(v) => set({ factConfirmed: v })} testid={`check-extra-${i}`} /></>}
        <Btn onClick={() => { if (act((s) => saveMockInterview(s, { writingId: w.id, kind: q.kind, question: q.question, ...d }), '연습을 저장했습니다')) clear(); }} disabled={!d.answer.trim()} data-testid={`button-save-iv-${i}`}><Save className="h-4 w-4" />{T('연습 저장')}</Btn>
      </div>
    </section>
  );
}

function Past({ p, w }: { p: MockInterview; w: Writing }) {
  const { actor } = useStudio();
  return (
    <li className="rounded-lg border p-2.5 text-sm" data-testid={`row-iv-${p.id}`}>
      <div className="flex gap-2"><Pill tone={p.kind === 'experience' ? 'blue' : 'orange'}>{p.kind === 'experience' ? T('경험') : T('가정')}</Pill><span className="font-mono text-[11px] text-muted-foreground">{formatDateTime(p.at)}</span></div>
      <div className="mt-1 whitespace-pre-wrap font-semibold">{qText(p.question)}</div>
      <div className="text-muted-foreground line-clamp-2">{p.reanswer || p.answer}</div>
      {p.additionalFact && <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">{p.factConfirmed ? <Pill tone="blue">{T('확인된 추가 사실')}</Pill> : <Pill tone="gray">{T('미확인')}</Pill>}<span>{p.additionalFact}</span>
        {p.factConfirmed && actor.role === 'student' && <Btn variant="outline" className="py-0.5 text-xs" onClick={() => act((s) => addExperience(s, w.courseId, w.studentId, { action: p.additionalFact, result: '', learning: '', evidence: T('모의 면접 답변'), simulation: false, studentConfirmed: true }), '경험 사실로 추가했습니다')} data-testid={`button-extra-to-fact-${p.id}`}><Plus className="h-3 w-3" />{T('V3용 사실로 추가')}</Btn>}</div>}
    </li>
  );
}
