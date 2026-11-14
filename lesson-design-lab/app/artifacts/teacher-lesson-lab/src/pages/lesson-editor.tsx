import { T } from '@/i18n/tx';
import { useMemo, useState } from 'react';
import { Link, useParams, useLocation, useSearch } from 'wouter';
import { Printer, Save, Copy, Replace, ArrowLeft, Clock, Coffee } from 'lucide-react';
import { lessonById, LESSONS, MODELS } from '@/data/lessons';
import { WORKSHEETS, STAGE_LABEL, wsById } from '@/data/worksheets';
import { retime, TIMES } from '@/lib/domain';
import { useApp, setState, uid, now, type ActivityChange, type SavedLesson } from '@/lib/store';
import { locLesson, locWorksheet } from '@/i18n/content';
import { PageHead, Panel, Pill, Btn, Field, inputCls, PendingBadge } from '@/components/shell';
import { useToast } from '@/hooks/use-toast';
import NotFound from './not-found';
import { GroupEditor } from '@/components/group-editor';
import { blankGrouping, MODE_LABELS, usesGroups, type GroupingState, type TeachingMode } from '@/lib/teaching';

const MODES: TeachingMode[] = ['individual', 'one-to-one', 'group', 'mixed'];


export default function LessonEditor() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const savedId = new URLSearchParams(search).get('saved');
  const lesson = lessonById(id);
  const { lessons, lang, students } = useApp((s) => s);
  const saved = lessons.find((l) => l.id === savedId);
  const [, nav] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState<string | null>(saved && saved.name !== lesson?.title ? saved.name : null);
  const [goal, setGoal] = useState<string | null>(saved && saved.goal && saved.goal !== lesson?.goal ? saved.goal : null);
  const [classSize, setClassSize] = useState(saved?.classSize ?? 25);
  const [groupSize, setGroupSize] = useState(saved?.groupSize ?? 0);
  const [institution, setInstitution] = useState(saved?.institution ?? '');
  const [cohort, setCohort] = useState(saved?.cohort ?? '');
  const [major, setMajor] = useState(saved?.major ?? '');
  const [interest, setInterest] = useState(saved?.interest ?? '');
  const [mode, setMode] = useState<TeachingMode>(saved?.mode ?? 'individual');
  const [grouping, setGrouping] = useState<GroupingState>(saved?.grouping ?? blankGrouping());
  const [minutes, setMinutes] = useState(saved?.minutes ?? (lesson ? lesson.blocks.reduce((s, b) => s + b.minutes, 0) : 45));
  const [ws, setWs] = useState<string[]>(saved?.worksheets ?? lesson?.worksheets ?? []);
  const [blockTexts, setBlockTexts] = useState<Record<number, string>>(saved?.blockTexts ?? {});
  const [changes, setChanges] = useState<ActivityChange[]>(saved?.changes ?? []);
  const [notes, setNotes] = useState(saved?.notes ?? '');
  const [replacing, setReplacing] = useState<number | null>(null);
  const [newText, setNewText] = useState('');
  const [reason, setReason] = useState('');

  const loc = useMemo(() => (lesson ? locLesson(lang, lesson) : null), [lesson, lang]);
  const timed = useMemo(() => (loc ? retime(loc.l, minutes) : null), [loc, minutes]);
  const alternatives = useMemo(() => {
    if (!lesson || replacing === null) return [];
    const kind = lesson.blocks[replacing].kind;
    return LESSONS.filter((l) => l.stage === lesson.stage && l.id !== lesson.id).flatMap((l) => locLesson(lang, l).l.blocks.filter((b) => b.kind === kind).map((b) => `${b.text} (${l.id})`));
  }, [lesson, replacing, lang]);

  if (!lesson || !timed || !loc) return <NotFound />;
  const L = loc.l;
  const nameV = name ?? L.title; const goalV = goal ?? L.goal;
  const groups = groupSize > 0 ? Math.ceil(classSize / groupSize) : 0;
  const roster = students.filter((x) => x.stage === lesson.stage && (!cohort.trim() || (x.cohort ?? '').trim() === cohort.trim()));
  const oneToOneOver = mode === 'one-to-one' && classSize > 1;
  const scopeText = L.scopeByTime[timed.scope];
  const scopeLabel = { short: '축소 범위', base: '기본 범위', long: '확장 범위' }[timed.scope];

  const persist = (asNew: boolean) => {
    const rec: SavedLesson = { id: asNew || !saved ? uid('ls') : saved.id, baseId: lesson.id, name: asNew && saved ? nameV + ' (사본)' : nameV, goal: goal ?? '', classSize, groupSize, minutes, worksheets: ws, blockTexts, changes, savedAt: now(), notes, institution, cohort, major, interest, mode, grouping };
    setState((s) => ({ ...s, lessons: asNew || !saved ? [...s.lessons, rec] : s.lessons.map((l) => (l.id === rec.id ? rec : l)) }));
    toast({ title: asNew ? T("복제해 저장했습니다") : T("브라우저에 저장했습니다"), description: rec.name });
    nav(`/lessons/${lesson.id}?saved=${rec.id}`);
  };
  const applyReplace = () => {
    if (replacing === null || !newText.trim() || !reason.trim()) return;
    const original = lesson.blocks[replacing].text;
    const from = blockTexts[replacing] ?? L.blocks[replacing].text; void original;
    setChanges((c) => [...c, { at: now(), blockIndex: replacing, from, to: newText.trim(), reason: reason.trim() }]);
    setBlockTexts((b) => ({ ...b, [replacing]: newText.trim() }));
    setReplacing(null); setNewText(''); setReason('');
  };
  const repeatCount = (txt: string) => changes.filter((c) => c.to === txt).length;

  let blockIdx = -1;
  return (
    <div>
      <div className="no-print mb-2"><Link href="/lessons" className="inline-flex items-center gap-1 text-sm text-primary font-semibold" data-testid="link-back"><ArrowLeft className="h-4 w-4" />{T("수업 라이브러리")}</Link></div>
      <PageHead kicker={`${lesson.id} · ${T(STAGE_LABEL[lesson.stage])} · ${MODELS[lesson.model]}`} title={nameV}>
        <Btn data-testid="button-save" onClick={() => persist(false)}><Save className="h-4 w-4" />{saved ? T("저장") : T("내 수업으로 저장")}</Btn>
        <Btn variant="outline" data-testid="button-duplicate" onClick={() => persist(true)}><Copy className="h-4 w-4" />{T("복제")}</Btn>
        <Btn variant="orange" data-testid="button-print" onClick={() => window.print()}><Printer className="h-4 w-4" />{T("인쇄·PDF")}</Btn>
      </PageHead>
      {!loc.translated && <div className="no-print mb-3"><PendingBadge lang={lang} /></div>}

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Panel className="no-print h-fit lg:sticky lg:top-20 space-y-3">
          <Field label={T("수업 이름")}><input className={inputCls} value={nameV} onChange={(e) => setName(e.target.value)} data-testid="input-name" /></Field>
          <Field label={T("수업 목표 (수정 가능)")}><textarea className={inputCls} rows={3} value={goalV} onChange={(e) => setGoal(e.target.value)} data-testid="input-goal" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={T("기관 (선택)")}><input className={inputCls} value={institution} onChange={(e) => setInstitution(e.target.value)} data-testid="input-lesson-institution" /></Field>
            <Field label={T("코호트·반 (선택)")}><input className={inputCls} value={cohort} onChange={(e) => setCohort(e.target.value)} data-testid="input-lesson-cohort" /></Field>
            <Field label={T("전공·학과 (선택)")}><input className={inputCls} value={major} onChange={(e) => setMajor(e.target.value)} data-testid="input-lesson-major" /></Field>
            <Field label={T("관심 분야 (선택)")}><input className={inputCls} value={interest} onChange={(e) => setInterest(e.target.value)} data-testid="input-lesson-interest" /></Field>
          </div>
          <Field label={T("수업 형태")}><select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value as TeachingMode)} data-testid="select-lesson-mode">{MODES.map((m) => <option key={m} value={m}>{T(MODE_LABELS[m])}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={mode === 'one-to-one' ? T("학생 수 (1:1은 1명)") : T("학급 인원")}><input type="number" min={1} max={60} className={inputCls} value={classSize} onChange={(e) => setClassSize(Number(e.target.value) || 1)} data-testid="input-class-size" /></Field>
            {usesGroups(mode) && <Field label={T("모둠 인원")}><select className={inputCls} value={groupSize} onChange={(e) => setGroupSize(Number(e.target.value))} data-testid="select-group"><option value={0}>{T("선택")}</option>{[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{T("{0}인", n)}</option>)}</select></Field>}
          </div>
          {oneToOneOver && <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive" data-testid="warn-lesson-one-to-one">{T("1:1 지도는 교사 1명과 학생 1명입니다. 학생 수를 1명으로 맞추세요. 입력한 내용은 지우지 않습니다.")}</p>}
          {mode === 'individual' && <p className="text-xs text-muted-foreground">{T("개별 수행 수업: 학생마다 자기 개인 미션을 수행하며 조 편성은 없습니다.")}</p>}
          <Field label={T("수업 시간")}><select className={inputCls} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} data-testid="select-minutes">{TIMES.map((t) => <option key={t} value={t}>{t}{T("분")}</option>)}</select></Field>
          <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>{T("수업")}</span><b className="font-mono">{timed.instruction}{T("분")}</b></div>
            <div className="flex justify-between"><span>{T("휴식(공개)")}</span><b className="font-mono">{timed.breaks}{T("분")}</b></div>
            <div className="flex justify-between border-t pt-1"><span>{T("합계")}</span><b className="font-mono" data-testid="text-total">{timed.total}{T("분")}</b></div>
            <div className="flex justify-between text-muted-foreground"><span>{T("작성 시간(유지)")}</span><span className="font-mono">{timed.writing}{T("분")}</span></div>
            {usesGroups(mode) && groups > 0 && <div className="text-muted-foreground" data-testid="text-group-count">{T("모둠")}{' '}{groups}{T("개")}</div>}
          </div>
          <Field label={T("교사 메모")}><textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="input-notes" /></Field>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <div className="flex flex-wrap items-center gap-2"><Pill tone="orange">{T(scopeLabel)}</Pill><span className="text-sm">{scopeText}</span></div>
            <h3 className="mt-3 font-bold">{T("목표")}</h3><p className="text-sm mt-1">{goalV}</p>
            <h3 className="mt-3 font-bold">{T("산출물")}{' '}<span className="text-xs font-normal text-muted-foreground">{T("(시간에 따라 범위 조정)")}</span></h3><p className="text-sm mt-1">{L.deliverable} — {scopeText}</p>
          </Panel>
          <div className="grid gap-4 md:grid-cols-2">
            <Panel><h3 className="font-bold">{T("준비물")}</h3><ul className="mt-2 list-disc ps-5 text-sm space-y-1">{L.preparation.map((p) => <li key={p}>{p}</li>)}</ul></Panel>
            <Panel><h3 className="font-bold">{T("결과지 항목 제목")}</h3><ul className="mt-2 list-disc ps-5 text-sm space-y-1">{L.reportItems.map((p) => <li key={p}>{p}</li>)}</ul><p className="mt-2 text-xs text-muted-foreground">{T("결과지가 없으면 자기 진술로 임시 진행(검사 결과 아님).")}</p></Panel>
            <Panel><h3 className="font-bold">{T("LAB 내용")}</h3><p className="mt-2 text-sm">{L.labContent}</p></Panel>
            <Panel><h3 className="font-bold">{T("교사 시범")}</h3><p className="mt-2 text-sm">{L.teacherDemo}</p></Panel>
          </div>
          <Panel>
            <h3 className="font-bold flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />{T("시간표")}{' '}<span className="font-mono text-sm font-normal text-muted-foreground">{timed.instruction} + {timed.breaks} = {timed.total}{T("분")}</span></h3>
            <ol className="mt-3 space-y-2">
              {timed.blocks.map((b, i) => {
                if (b.isBreak) return <li key={i} className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground"><Coffee className="h-4 w-4" />{T("쉬는 시간")}{' '}{b.minutes}{T("분")}</li>;
                blockIdx++; const bi = blockIdx; const text = blockTexts[bi] ?? b.text;
                return (
                  <li key={i} className="flex flex-wrap items-start gap-3 rounded-lg border px-3 py-2.5">
                    <span className="font-mono text-sm w-12 shrink-0 text-[hsl(var(--sidebar-primary))] font-semibold">{b.minutes}{T("분")}</span>
                    <div className="min-w-0 flex-1"><div className="text-xs font-semibold text-primary">{b.phase}{b.kind === 'writing' && (timed.writingReduced ? T(" · 작성 시간 축소(짧은 수업)") : T(" · 작성 시간 유지"))}</div><div className="text-sm">{text}</div>{blockTexts[bi] && <div className="text-xs text-muted-foreground">{T("교체됨")}{repeatCount(text) > 1 ? T(" · {0}회 반복 사용", repeatCount(text)) : ''}</div>}</div>
                    <Btn variant="ghost" className="no-print" data-testid={`button-replace-${bi}`} onClick={() => { setReplacing(bi); setNewText(''); setReason(''); }}><Replace className="h-4 w-4" />{T("교체")}</Btn>
                  </li>
                );
              })}
            </ol>
          </Panel>
          {usesGroups(mode) && <div className="no-print"><GroupEditor students={roster} mode={mode} value={{ ...grouping, capacity: groupSize > 0 ? groupSize : grouping.capacity }} onChange={(g) => { setGrouping(g); if (groupSize > 0 && g.capacity !== groupSize) setGroupSize(g.capacity); }} scopeLabel={T("{0} 명단 {1}명", T(STAGE_LABEL[lesson.stage]), roster.length)} /><p className="mt-1 text-xs text-muted-foreground">{T("조 편성 초안·확정본은 이 저장 수업에만 기록됩니다. 저장 버튼을 눌러야 브라우저에 남습니다.")}</p></div>}
          {replacing !== null && (
            <Panel className="no-print border-primary rise">
              <h3 className="font-bold">{T("활동 교체 · 이유는 기록됩니다")}</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">{alternatives.slice(0, 8).map((a) => <button key={a} onClick={() => setNewText(a)} className="rounded-full border px-2.5 py-1 text-xs hover:border-primary" data-testid="button-alt">{a}</button>)}</div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <Field label={T("새 활동")}><input className={inputCls} value={newText} onChange={(e) => setNewText(e.target.value)} data-testid="input-new-activity" /></Field>
                <Field label={T("교체 이유(필수)")}><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} data-testid="input-reason" /></Field>
              </div>
              <div className="mt-3 flex gap-2"><Btn onClick={applyReplace} disabled={!newText.trim() || !reason.trim()} data-testid="button-apply-replace">{T("적용")}</Btn><Btn variant="ghost" onClick={() => setReplacing(null)}>{T("취소")}</Btn></div>
            </Panel>
          )}
          <Panel>
            <h3 className="font-bold">{T("활동지 선택")}</h3>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {WORKSHEETS.filter((w) => w.stage === lesson.stage).map((w) => (
                <label key={w.id} className="flex items-start gap-2 rounded-lg border px-2.5 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-secondary">
                  <input type="checkbox" className="mt-0.5 accent-[hsl(var(--primary))]" checked={ws.includes(w.id)} onChange={(e) => setWs((x) => (e.target.checked ? [...x, w.id] : x.filter((y) => y !== w.id)))} data-testid={`check-ws-${w.id}`} />
                  <span><span className="font-mono text-xs">{w.id}</span> {locWorksheet(lang, w).w.title}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground print:hidden">{T("선택:")}{' '}{ws.map((id) => wsById(id)?.id).join(', ') || T("없음")}</p>
          </Panel>
          <div className="grid gap-4 md:grid-cols-2">
            <Panel><h3 className="font-bold">{T("학생 행동")}</h3><ul className="mt-2 list-decimal ps-5 text-sm space-y-1">{L.studentActions.map((p) => <li key={p}>{p}</li>)}</ul></Panel>
            <Panel><h3 className="font-bold">{T("교사 질문")}</h3><ul className="mt-2 list-disc ps-5 text-sm space-y-1">{L.questions.map((p) => <li key={p}>{p}</li>)}</ul></Panel>
            <Panel><h3 className="font-bold">{T("관찰 포인트")}</h3><ul className="mt-2 list-disc ps-5 text-sm space-y-1">{L.observations.map((p) => <li key={p}>{p}</li>)}</ul><p className="mt-2 text-xs text-muted-foreground">{T("관찰은 약점 꼬리표가 아닌 다음 지원을 위한 기록입니다.")}</p></Panel>
            <Panel><h3 className="font-bold">{T("다음 행동")}</h3><p className="mt-2 text-sm">{L.nextAction}</p></Panel>
          </div>
          {changes.length > 0 && (
            <Panel><h3 className="font-bold">{T("교체 이력")}</h3><ul className="mt-2 space-y-1 text-sm">{changes.map((c, i) => <li key={i} className="border-s-2 border-[hsl(var(--sidebar-primary))] ps-2"><span className="font-mono text-xs text-muted-foreground">{new Date(c.at).toLocaleString()}</span><br />{c.from} → <b>{c.to}</b><br /><span className="text-muted-foreground">{T("이유:")}{' '}{c.reason}</span></li>)}</ul></Panel>
          )}
        </div>
      </div>
    </div>
  );
}
