import { formatDateTime } from '@/i18n/format';
import { useState } from 'react';
import { Save, Eye, Plus, Download, Lock } from 'lucide-react';
import { T } from '@/i18n/tx';
import { download } from '@/lib/store';
import { saveWriting, addWritingVersion, writingQuestions, draftSuggestion, writingExport, getWritingView } from '@/lib/studio';
import type { Writing, WritingInput, Course } from '@/lib/studio/types';
import { Btn, Pill } from '@/components/shell';
import { cn } from '@/lib/utils';
import { StudioFrame, Section, Txt, Check, act, useDraft, useStudio, studentName, tryOr, Empty, Status, SimTag, errText } from './common';
import { useStudentScope } from './live';
import ExperienceCoach, { CaretArea } from './experience-coach';
import { coachText } from '@/i18n/experience-coach';
import { SourceCheck, sourceChanges, SharePanel, BookingPanel, CapacityPanel, ConsultPanel, FactConfirmPanel, FinalizePanel } from './writing-panels';

export default function WritingPage() {
  const { s, course, actor } = useStudio();
  const { sid, picker } = useStudentScope(course);
  if (!course) return <StudioFrame kicker="STUDIO 1.5 · WRITING" title={T('사실 기반 글쓰기와 상담')}>{null}</StudioFrame>;
  const writings = s.studio.writings.filter((w) => w.courseId === course.id);
  return (
    <StudioFrame kicker="STUDIO 1.5 · WRITING" title={T('사실 기반 글쓰기와 상담')} actions={actor.role === 'teacher' ? picker : undefined}>
      {actor.role === 'student' ? <StudentWriting key={`${course.id}-${sid}`} course={course} sid={sid} w={writings.find((w) => w.studentId === sid)} /> : (
        <>
          <CapacityPanel course={course} />
          <Section title={actor.role === 'counselor' ? T('나에게 공유된 글') : T('학생이 공유한 글')} hint={T('학생이 선택해 공유한 항목만 표시합니다. 공유하지 않은 본문은 화면에 전달되지 않습니다.')}>
            <SharedList course={course} writings={actor.role === 'teacher' ? writings.filter((w) => w.studentId === sid) : writings} />
          </Section>
        </>
      )}
    </StudioFrame>
  );
}

function SharedList({ course, writings }: { course: Course; writings: Writing[] }) {
  const { s } = useStudio();
  const views = writings.map((w) => ({ w, v: tryOr(() => getWritingView(s, w.id), null) })).filter((x) => x.v);
  if (!views.length) return <Empty title={T('볼 수 있는 공유 글이 없습니다')} body={T('학생이 공유를 선택하면 여기에 나타납니다.')} />;
  return (
    <div className="space-y-4">{views.map(({ w, v }) => (
      <article key={w.id} className="rounded-xl border p-4" data-testid={`card-shared-${w.id}`}>
        <div className="flex flex-wrap items-center gap-2"><b>{studentName(s, v!.writing.studentId)}</b><Status v={v!.writing.status} /><span className="text-sm text-muted-foreground">{v!.writing.question}</span></div>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <div><div className="text-xs font-semibold text-muted-foreground">V1</div>{v!.v1 ? <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-sm leading-6">{v!.v1}</p> : <p className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />{T('공유되지 않음')}</p>}</div>
          <div className="space-y-2">
            <div><div className="text-xs font-semibold text-muted-foreground">{T('확인된 경험 사실')}</div>{v!.facts.length ? <ul className="mt-1 space-y-1 text-sm">{v!.facts.map((f) => <li key={f.id} className="rounded-md border px-2 py-1">{f.action} → {f.result} <SimTag on={f.simulation} /></li>)}</ul> : <p className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />{T('공유되지 않음')}</p>}</div>
            <div><div className="text-xs font-semibold text-muted-foreground">{T('요구 조건')}</div>{v!.requirements ? <p className="text-sm">{v!.requirements}</p> : <p className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />{T('공유되지 않음')}</p>}</div>
          </div>
        </div>
        <ConsultPanel course={course} w={v!.writing} />
      </article>
    ))}</div>
  );
}

function StudentWriting({ course, sid, w }: { course: Course; sid: string; w?: Writing }) {
  const { s } = useStudio();
  const facts = s.studio.facts.filter((f) => f.courseId === course.id && f.studentId === sid && f.studentConfirmed);
  const init = (): WritingInput => ({ courseId: course.id, studentId: sid, question: w?.question ?? (course.stage==='middle'?T('오늘 활동에서 내가 직접 한 일과 배운 점을 소개하세요.'):course.stage==='high'?T('진로 탐구에서 교과와 연결한 행동과 성장 과정을 설명하세요.'):T('지원 직무의 요구 행동과 연결되는 본인의 실제 수행을 설명하세요.')), job: w?.job ?? '', limit: w?.limit ?? 500, factIds: w?.factIds ?? [], selectedFacts: w?.selectedFacts ?? { action: true, result: true, learning: true }, requirements: w?.requirements ?? '', text: w?.draft ?? '', freeDraft: true });
  const [d, setD] = useDraft<WritingInput>(`writing-${course.id}-${sid}`, init);
  const [preview, setPreview] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const set = (p: Partial<WritingInput>) => setD((x) => ({ ...x, ...p }));
  const len = Array.from(d.text).length;
  const changes = w ? sourceChanges(s, w) : [];
  const qs = w ? tryOr(() => writingQuestions(s, w.id), [] as string[]) : [];
  return (
    <div className="space-y-5">
    <ExperienceCoach course={course} sid={sid} />
    <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
      <Section title={w ? T('글 편집 · V1은 보존됩니다') : course.stage==='middle'?T('활동 소개 · V1 작성'):course.stage==='high'?T('진로·성장 이야기 · V1 작성'):T('직무 자소서 · V1 작성')} hint={T('입력 중인 글은 자동으로 초안 저장됩니다.')}>
        <div className="space-y-2.5">
          <Txt label={T('문항')} value={d.question} onChange={(v) => set({ question: v })} testid="input-w-question" />
          <div className="grid grid-cols-[1fr_120px] gap-2"><Txt label={T('지원 직무')} value={d.job} onChange={(v) => set({ job: v })} testid="input-w-job" /><label className="text-sm"><span className="mb-1 block text-[13px] font-semibold text-muted-foreground">{T('글자 수 제한')}</span><input type="number" data-testid="input-w-limit" value={d.limit} onChange={(e) => set({ limit: Number(e.target.value) })} className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm" /></label></div>
          <div>
            <div className="mb-1 text-[13px] font-semibold text-muted-foreground">{T('사용할 경험 (학생이 확인한 사실만)')}</div>
            {facts.length === 0 ? <p className="text-xs text-muted-foreground">{T('확인된 경험이 없습니다. 현장 화면에서 미션 수행 후 본인 확인을 먼저 하세요.')}</p> : (
              <div className="space-y-1">{facts.map((f) => <label key={f.id} className={cn('flex items-start gap-2 rounded-md border p-2 text-sm', d.factIds.includes(f.id) && 'border-primary bg-secondary')}><input type="checkbox" data-testid={`check-fact-${f.id}`} checked={d.factIds.includes(f.id)} onChange={() => set({ factIds: d.factIds.includes(f.id) ? d.factIds.filter((x) => x !== f.id) : [...d.factIds, f.id] })} className="mt-1" /><span>{f.action} → {f.result}<span className="text-muted-foreground"> · {f.learning}</span> <SimTag on={f.simulation} /></span></label>)}</div>
            )}
            <div className="mt-1.5 flex gap-4">{(['action', 'result', 'learning'] as const).map((k) => <Check key={k} label={T(k === 'action' ? '한 일' : k === 'result' ? '결과' : '배운 점')} checked={d.selectedFacts[k]} onChange={(v) => set({ selectedFacts: { ...d.selectedFacts, [k]: v } })} testid={`check-sel-${k}`} />)}</div>
          </div>
          <Txt rows={2} label={T('요구 조건')} value={d.requirements} onChange={(v) => set({ requirements: v })} testid="input-w-req" />
          <div>
            <CaretArea id={`writing-body-${course.id}-${sid}`} rows={9} label={T('본문')} value={d.text} onChange={(v) => set({ text: v })} testid="input-w-text" />
            <div className={cn('mt-1 text-end font-mono text-xs', len > d.limit ? 'text-destructive' : 'text-muted-foreground')} data-testid="text-length">{len} / {d.limit}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => act((st) => saveWriting(st, w?.id ?? null, {...d,freeDraft:true}), w ? '초안을 저장했습니다' : 'V1을 저장했습니다')} data-testid="button-save-writing"><Save className="h-4 w-4" />{w ? T('초안 저장') : T('V1 저장')}</Btn>
            {w && <Btn variant="outline" disabled={changes.length > 0} onClick={() => { try { setPreview(draftSuggestion(s, w.id)); } catch (e) { setPreview(null); act(() => { throw new Error(errText(e)); }); } }} data-testid="button-preview-suggestion"><Eye className="h-4 w-4" />{coachText('previewOnly')}</Btn>}
          </div>
          {w && <SourceCheck w={w} changes={changes} />}
          {preview !== null && (
            <div className="rounded-lg border-2 border-dashed border-primary/40 bg-secondary/40 p-3 rise" data-testid="panel-suggestion">
              <div className="text-xs font-bold text-primary">{T('미리보기 · 선택한 확인된 사실로만 구성 · 자동 덮어쓰지 않음 · 점수 없음')}</div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{preview || T('사용할 사실이 없어 미리보기를 만들 수 없습니다.')}</p>
              <div className="mt-2 flex gap-2"><Btn variant="orange" disabled={!preview} onClick={() => { set({ text: preview }); setPreview(null); }} data-testid="button-apply-suggestion">{T('본문에 적용')}</Btn><Btn variant="ghost" onClick={() => setPreview(null)} data-testid="button-dismiss-suggestion">{T('닫기')}</Btn></div>
            </div>
          )}
          {w && w.versions.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 border-t pt-3">
              <Check label={T('상담 내용을 반영해 직접 검토함')} checked={reviewed} onChange={setReviewed} testid="check-reviewed" />
              <Btn variant="outline" onClick={() => act((st) => addWritingVersion(st, w.id, d.text, reviewed), '새 버전을 추가했습니다')} data-testid="button-add-version"><Plus className="h-4 w-4" />{T('V{0}으로 추가', w.versions.length + 1)}</Btn>
            </div>
          )}
        </div>
      </Section>
      <div className="space-y-5">
        {qs.length > 0 && <Section title={T('빠진 사실 확인 질문')} hint={T('규칙 기반 점검이며 AI가 아닙니다.')}><ul className="list-disc space-y-1 ps-5 text-sm">{qs.map((q) => <li key={q}>{T(q)}</li>)}</ul></Section>}
        {w ? <>
          <SharePanel course={course} w={w} />
          <BookingPanel course={course} w={w} />
          <FactConfirmPanel w={w} />
          <Versions w={w} />
          <FinalizePanel w={w} />
          <Btn variant="outline" onClick={() => { try { download(new Blob([writingExport(s, w.id)], { type: 'text/plain;charset=utf-8' }), `writing-${w.id}.txt`); } catch (e) { act(() => { throw new Error(errText(e)); }); } }} data-testid="button-export-writing"><Download className="h-4 w-4" />{T('버전·사실 내려받기')}</Btn>
        </> : <Empty title={T('V1을 저장하면 공유·예약·상담이 열립니다')} />}
      </div>
    </div>
    </div>
  );
}

function Versions({ w }: { w: Writing }) {
  const [a, setA] = useState(1); const [b, setB] = useState(w.versions.length);
  const va = w.versions.find((v) => v.number === a); const vb = w.versions.find((v) => v.number === b);
  return (
    <Section title={T('버전 비교')} right={<span className="font-mono text-xs">{w.versions.map((v) => `V${v.number}`).join(' · ')}</span>}>
      <div className="mb-2 flex gap-2">{[[a, setA], [b, setB]].map(([v, sv], i) => <select key={i} value={v as number} onChange={(e) => (sv as (n: number) => void)(Number(e.target.value))} data-testid={`select-compare-${i}`} className="rounded-md border px-2 py-1 font-mono text-sm">{w.versions.map((x) => <option key={x.number} value={x.number}>V{x.number}</option>)}</select>)}</div>
      <div className="grid grid-cols-2 gap-2">{[va, vb].map((v, i) => <div key={i} className="rounded-md bg-muted/50 p-2 text-sm"><div className="mb-1 flex flex-wrap gap-1 text-[11px]">{v && <><span className="font-mono">{formatDateTime(v.at)}</span>{v.reviewed ? <Pill tone="blue">{T('검토함')}</Pill> : <Pill tone="gray">{T('미검토')}</Pill>}<Pill tone="gray">{T('사실 {0}', v.confirmedFactIds.length)}</Pill></>}</div><p className="whitespace-pre-wrap leading-6">{v?.text}</p></div>)}</div>
    </Section>
  );
}
