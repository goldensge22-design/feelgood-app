import { useEffect, useState } from 'react';
import { Plus, Trash2, Users, Save } from 'lucide-react';
import { T } from '@/i18n/tx';
import { ExtraCourseWork } from './group-work';
import { STAGE_LABEL, type Stage } from '@/data/worksheets';
import { uid } from '@/lib/store';
import { defaultCourse, createCourse, updateCourse, addDemoRoster, courseStats, formatOffset } from '@/lib/studio';
import type { CourseDraft, Course, Counselor } from '@/lib/studio/types';
import { Btn, Pill, inputCls } from '@/components/shell';
import { cn } from '@/lib/utils';
import { StudioFrame, Section, Txt, Check, act, useDraft, useStudio, studentName, tryOr, Empty } from './common';

const DAY = [['180', '180분 하루'], ['240', '240분 하루'], ['300', '300분 하루'], ['300-counseling', '300분 + 상담']] as const;
const LONG = [['month', '1개월 · 90분 × 4회', 4], ['two-month', '2개월 · 90분 × 8회', 8], ['custom', '직접 설정', 0]] as const;

export default function Courses() {
  const { s, courses, course, actor } = useStudio();
  const [group, setGroup] = useDraft<'sec' | 'uni'>('course-group', s.stage === 'university' ? 'uni' : 'sec');
  const stageOf = (g: 'sec' | 'uni', cur: Stage): Stage => (g === 'uni' ? 'university' : cur === 'university' ? 'middle' : cur);
  const [draft, setDraft, clearDraft] = useDraft<CourseDraft>('course-new', () => tryOr(() => defaultCourse(stageOf(group, s.stage)), {} as CourseDraft));
  const set = <K extends keyof CourseDraft>(k: K, v: CourseDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const isDay = draft.period === 'day';
  const pickGroup = (g: 'sec' | 'uni') => { setGroup(g); set('stage', stageOf(g, draft.stage)); };
  const pickPeriod = (p: CourseDraft['period']) => setDraft((d) => ({
    ...d, period: p,
    ...(p === 'day' ? { mode: 'individual' as const, sessions: 1 } : p === 'month' ? { sessions: 4, sessionMinutes: 90 } : p === 'two-month' ? { sessions: 8, sessionMinutes: 90 } : {}),
  }));
  const create = () => {
    if (!draft.name?.trim()) { act(() => { throw new Error('과정 이름을 입력하세요.'); }); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.startDate ?? '') || Number.isNaN(Date.parse(draft.startDate)) || !/^\d{2}:\d{2}$/.test(draft.startTime ?? '')) { act(() => { throw new Error('시작일과 시작 시각을 올바르게 입력하세요.'); }); return; }
    const payload = isDay ? { ...draft, mode: 'individual' as const } : draft;
    if (act((st) => createCourse(st, payload), '과정을 만들었습니다')) clearDraft();
  };
  const shown = courses.filter((c) => (group === 'uni' ? c.stage === 'university' : c.stage !== 'university'));
  return (
    <StudioFrame kicker="STUDIO 1.5 · COURSE" title={T('과정 만들기와 운영 설정')}>
      <div role="tablist" className="inline-flex rounded-xl bg-sidebar p-1">
        {([['sec', '중·고등학교'], ['uni', '대학교']] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={group === k} data-testid={`tab-studio-${k}`} onClick={() => pickGroup(k)} className={cn('rounded-lg px-5 py-2 text-sm font-bold', group === k ? 'bg-[hsl(var(--sidebar-primary))] text-sidebar' : 'text-white/80')}>{T(l)}</button>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Section title={T('새 과정')} hint={T('입력 중인 내용은 새로고침과 언어 변경 후에도 유지됩니다.')}>
          {actor.role !== 'teacher' ? <p className="text-sm text-muted-foreground">{T('과정 생성은 교사 역할에서만 가능합니다.')}</p> : (
            <div className="space-y-4">
              <Txt label={T('과정 이름')} value={draft.name ?? ''} onChange={(v) => set('name', v)} testid="input-course-name" />
              {group === 'sec' && (
                <div className="flex gap-2">{(['middle', 'high'] as Stage[]).map((st) => <button key={st} type="button" aria-pressed={draft.stage === st} data-testid={`button-course-stage-${st}`} onClick={() => set('stage', st)} className={cn('rounded-full border px-3.5 py-1.5 text-sm font-semibold', draft.stage === st ? 'bg-primary text-primary-foreground border-primary' : 'bg-card')}>{T(STAGE_LABEL[st])}</button>)}</div>
              )}
              <div>
                <div className="mb-1.5 text-[13px] font-semibold text-muted-foreground">{T('하루 수업')}</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {DAY.map(([p, l]) => <button key={p} type="button" data-testid={`button-preset-${p}`} onClick={() => setDraft((d) => ({ ...d, period: 'day', preset: p, mode: 'individual', sessions: 1, sessionMinutes: Number(p.slice(0, 3)) }))} className={cn('rounded-lg border p-2.5 text-start text-sm transition', isDay && draft.preset === p ? 'border-primary bg-secondary ring-2 ring-primary/30' : 'bg-card hover:border-primary/40')}><b className="font-mono">{p.slice(0, 3)}</b><div className="text-xs text-muted-foreground">{T(l)}</div></button>)}
                </div>
                <div className="mb-1.5 mt-3 text-[13px] font-semibold text-muted-foreground">{T('장기 과정')}</div>
                <div className="grid grid-cols-3 gap-2">
                  {LONG.map(([p, l]) => <button key={p} type="button" data-testid={`button-period-${p}`} onClick={() => pickPeriod(p)} className={cn('rounded-lg border p-2.5 text-start text-sm', draft.period === p ? 'border-primary bg-secondary ring-2 ring-primary/30' : 'bg-card hover:border-primary/40')}>{T(l)}</button>)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Num label={T('검사 시간(분)')} v={draft.testMinutes} on={(n) => set('testMinutes', n)} id="test" />
                <Num label={T('회차')} v={draft.sessions} on={(n) => set('sessions', n)} id="sessions" disabled={draft.period !== 'custom'} />
                <Num label={T('회차당 분')} v={draft.sessionMinutes} on={(n) => set('sessionMinutes', n)} id="session-minutes" disabled={isDay || draft.period !== 'custom'} />
                <label className="text-sm"><span className="mb-1 block text-[13px] font-semibold text-muted-foreground">{T('시작일')}</span><input type="date" data-testid="input-start-date" value={draft.startDate ?? ''} onChange={(e) => set('startDate', e.target.value)} className={inputCls} /></label>
                <label className="text-sm"><span className="mb-1 block text-[13px] font-semibold text-muted-foreground">{T('시작 시각')}</span><input type="time" data-testid="input-start-time" value={draft.startTime ?? ''} onChange={(e) => set('startTime', e.target.value)} className={inputCls} /></label>
                <label className="text-sm"><span className="mb-1 block text-[13px] font-semibold text-muted-foreground">{T('수업 형태')}</span>
                  <select data-testid="select-mode" value={isDay ? 'individual' : draft.mode} disabled={isDay} onChange={(e) => set('mode', e.target.value as CourseDraft['mode'])} className={inputCls}>
                    <option value="individual">{T('개인 미션')}</option>{!isDay && <><option value="job-group">{T('직무별 모임(선택)')}</option><option value="joint">{T('공동 과제(교사 확정)')}</option><option value="mixed">{T('혼합')}</option></>}
                  </select></label>
              </div>
              {isDay && <p className="rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">{T('하루 수업은 항상 개인 미션입니다. 공동 편성은 장기 과정에서만 선택하고 교사가 확정합니다.')}</p>}
              <RosterPick ids={draft.studentIds ?? []} on={(ids) => set('studentIds', ids)} />
              <div className="flex gap-2"><Btn onClick={create} data-testid="button-create-course"><Plus className="h-4 w-4" />{T('과정 만들기')}</Btn><Btn variant="ghost" onClick={clearDraft} data-testid="button-reset-course-draft">{T('입력 초기화')}</Btn></div>
            </div>
          )}
        </Section>
        <Section title={T('과정 목록')} hint={T('교사 역할에게 보이는 과정만 표시합니다.')}>
          {shown.length === 0 ? <Empty title={T('이 학교급 과정이 없습니다')} /> : (
            <ul className="divide-y">
              {shown.map((c) => {
                const st = tryOr(() => courseStats(c), null);
                return (
                  <li key={c.id} className="py-2.5">
                    <button type="button" data-testid={`button-course-${c.id}`} onClick={() => act((x) => ({ ...x, studio: { ...x.studio, activeCourseId: c.id } }))} className={cn('w-full rounded-lg p-2 text-start transition hover:bg-muted', course?.id === c.id && 'bg-secondary')}>
                      <div className="flex flex-wrap items-center gap-2"><b>{c.name}</b><Pill tone="gray">{T(STAGE_LABEL[c.stage])}</Pill><Pill tone={c.period === 'day' ? 'orange' : 'blue'}>{c.period === 'day' ? T('하루') + ' ' + c.preset : T('장기') + ` ${c.sessions}×${c.sessionMinutes}`}</Pill></div>
                      <div className="mt-1 font-mono text-xs text-muted-foreground">{c.startDate} {c.startTime} · {T('학생 {0}명', c.studentIds.length)}{st && ` · ${T('총 {0}분', st.total)}`}</div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
      {course && actor.role === 'teacher' && <CourseSettings key={course.id} course={course} />}
      {course && <ExtraCourseWork key={`extra-${course.id}`} course={course}/>}
      {course && actor.role !== 'teacher' && <p className="text-sm text-muted-foreground">{T('과정 운영 설정은 교사 역할에서 편집합니다.')} {studentName(s, actor.id)}</p>}
    </StudioFrame>
  );
}

function Num({ label, v, on, id, disabled }: { label: string; v: number; on: (n: number) => void; id: string; disabled?: boolean }) {
  return <label className="text-sm"><span className="mb-1 block text-[13px] font-semibold text-muted-foreground">{label}</span><input type="number" min={0} data-testid={`input-${id}`} disabled={disabled} value={Number.isFinite(v) ? v : 0} onChange={(e) => on(Number(e.target.value))} className={cn(inputCls, 'font-mono disabled:opacity-60')} /></label>;
}

function RosterPick({ ids, on }: { ids: string[]; on: (ids: string[]) => void }) {
  const { students } = useStudio();
  if (!students.length) return <p className="text-xs text-muted-foreground">{T('가상 학생이 없습니다. 과정 생성 후 데모 명단을 추가할 수 있습니다.')}</p>;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[13px] font-semibold text-muted-foreground"><span>{T('학생 선택')} <span className="font-mono">{ids.length}/{students.length}</span></span><button type="button" className="text-primary" data-testid="button-select-all-students" onClick={() => on(ids.length === students.length ? [] : students.map((x) => x.id))}>{T('전체')}</button></div>
      <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">{students.map((x) => <button key={x.id} type="button" data-testid={`toggle-student-${x.id}`} onClick={() => on(ids.includes(x.id) ? ids.filter((i) => i !== x.id) : [...ids, x.id])} className={cn('rounded-md border px-2 py-1 font-mono text-xs', ids.includes(x.id) ? 'border-primary bg-primary text-primary-foreground' : 'bg-card')}>{x.displayName || x.code}</button>)}</div>
    </div>
  );
}

const lines = (a: string[]) => a.join('\n');
const split = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean);

function CourseSettings({ course }: { course: Course }) {
  const [d, setD] = useDraft(`course-edit-${course.id}`, () => ({
    tools: lines(course.tools), taskFramework: course.taskFramework, readingCandidates: course.readingCandidates, supportMaterials: course.supportMaterials,
    autoApprove: course.autoApprove, maxMissionMinutes: course.maxMissionMinutes, counseling: course.counseling, studentIds: course.studentIds, groupingConfirmed: course.groupingConfirmed,
    affiliations: course.affiliations, seats: course.seats, jobGroups: course.jobGroups, jointGroups: course.jointGroups,
  }));
  const [demoN, setDemoN] = useState(6);
  const set = (p: Partial<typeof d>) => setD((x) => ({ ...x, ...p }));
  const cs = d.counseling;
  const setC = (p: Partial<typeof cs>) => setD((x) => ({ ...x, counseling: { ...x.counseling, ...p } }));
  const setCo = (i: number, p: Partial<Counselor>) => setD((x) => ({ ...x, counseling: { ...x.counseling, counselors: x.counseling.counselors.map((c,j) => j === i ? { ...c,...p } : c) } }));
  const groups = { affiliations: d.affiliations ?? course.affiliations, seats: d.seats ?? course.seats, jobGroups: d.jobGroups ?? course.jobGroups, jointGroups: d.jointGroups ?? course.jointGroups };
  const scoped = (g: Record<string, string>) => Object.fromEntries(Object.entries(g).filter(([k, v]) => d.studentIds.includes(k) && v.trim()));
  // Keep the exact saved draft. clear() would reinitialize from the pre-save course
  // captured by this render, then persist that obsolete draft over the current form.
  const save = () => { act((s) => updateCourse(s, course.id, { ...d, tools: split(d.tools), affiliations: scoped(groups.affiliations), seats: scoped(groups.seats), jobGroups: scoped(groups.jobGroups), jointGroups: scoped(groups.jointGroups) }), '과정 설정을 저장했습니다'); };
  const setG = (k: keyof typeof groups, sid: string, v: string) => setD((x) => ({ ...x, [k]: { ...(x[k] ?? course[k]), [sid]: v }, ...(k === 'jobGroups' || k === 'jointGroups' ? { groupingConfirmed: false } : {}) }));
  useEffect(() => { set({ studentIds: course.studentIds }); }, [course.studentIds.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const counsel = course.preset === '300-counseling' || course.period !== 'day';
  return (
    <Section title={T('{0} · 운영 설정', course.name)} hint={T('준비물·도구·자료와 상담 설정. 저장 전까지 초안으로 유지됩니다.')} right={<Btn onClick={save} data-testid="button-save-course"><Save className="h-4 w-4" />{T('설정 저장')}</Btn>}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Txt rows={3} label={T('사용 도구 (한 줄에 하나)')} value={d.tools} onChange={(v) => set({ tools: v })} testid="input-tools" />
          <Txt rows={3} label={T('과제 틀 · 사전 조건')} value={d.taskFramework} onChange={(v) => set({ taskFramework: v })} testid="input-framework" />
          <Txt rows={2} label={T('읽기 자료 후보')} value={d.readingCandidates} onChange={(v) => set({ readingCandidates: v })} testid="input-reading" />
          <Txt rows={2} label={T('지원 자료')} value={d.supportMaterials} onChange={(v) => set({ supportMaterials: v })} testid="input-support" />
          <div className="flex flex-wrap items-center gap-4">
            <Check label={T('제한 안의 미션은 자동 확정')} checked={d.autoApprove} onChange={(v) => set({ autoApprove: v })} testid="check-auto-approve" />
            <label className="flex items-center gap-2 text-sm">{T('미션 최대 분')}<input type="number" data-testid="input-max-mission" value={d.maxMissionMinutes} onChange={(e) => set({ maxMissionMinutes: Number(e.target.value) })} className={cn(inputCls, 'w-20 font-mono')} /></label>
          </div>
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" />{T('명단')} <span className="font-mono text-xs">{course.studentIds.length}</span></div>
            <RosterPick ids={d.studentIds} on={(ids) => set({ studentIds: ids })} />
            <div className="mt-2 flex items-center gap-2"><input type="number" min={1} max={40} value={demoN} onChange={(e) => setDemoN(Number(e.target.value))} className={cn(inputCls, 'w-20 font-mono')} data-testid="input-demo-count" /><Btn variant="outline" onClick={() => act((s) => addDemoRoster(s, course.id, demoN), '가상 학생을 추가했습니다')} data-testid="button-demo-roster">{T('가상 명단 추가')}</Btn></div>
          </div>
        </div>
        <div className={cn('space-y-3', !counsel && 'opacity-60')}>
          <div className="text-sm font-bold">{T('상담 설정')} {!counsel && <Pill tone="gray">{T('이 프리셋은 상담 없음')}</Pill>}</div>
          <div className="grid grid-cols-3 gap-2">
            <Num label={T('대화(분)')} v={cs.conversation} on={(n) => setC({ conversation: n })} id="conversation" />
            <Num label={T('인계(분)')} v={cs.handover} on={(n) => setC({ handover: n })} id="handover" />
            <Num label={T('마감 오프셋(분)')} v={cs.deadline} on={(n) => setC({ deadline: n })} id="deadline" />
          </div>
          <RangeList label={T('상담 블록')} list={cs.blocks} on={(b) => setC({ blocks: b })} id="block" course={course} />
          <RangeList label={T('불가 시간')} list={cs.absences} on={(b) => setC({ absences: b })} id="absence" course={course} />
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[13px] font-semibold text-muted-foreground">{T('상담자')}<button type="button" className="text-primary" data-testid="button-add-counselor" onClick={() => setC({ counselors: [...cs.counselors, { id: uid('co'), name: T('상담자 {0}', cs.counselors.length + 1), lead: cs.counselors.length === 0, available: [] }] })}>+ {T('추가')}</button></div>
            {cs.counselors.map((c, i) => (
              <div key={c.id} className="rounded-lg border p-2.5 space-y-2">
                <div className="flex items-center gap-2"><input value={c.name} data-testid={`input-counselor-${i}`} onChange={(e) => setCo(i, { name: e.target.value })} className={inputCls} /><Check label={T('책임')} checked={c.lead} onChange={(v) => setCo(i, { lead: v })} testid={`check-lead-${i}`} /><button type="button" aria-label={T('삭제')} data-testid={`button-remove-counselor-${i}`} onClick={() => setC({ counselors: cs.counselors.filter((_, j) => j !== i) })} className="p-1 text-destructive"><Trash2 className="h-4 w-4" /></button></div>
                <RangeList label={T('가능 시간')} list={c.available} on={(a) => setCo(i, { available: a })} id={`avail-${i}`} course={course} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <GroupTable course={course} ids={d.studentIds} groups={groups} setG={setG} confirmed={d.groupingConfirmed} onConfirm={(v) => set({ groupingConfirmed: v })} />
    </Section>
  );
}

type G = { affiliations: Record<string, string>; seats: Record<string, string>; jobGroups: Record<string, string>; jointGroups: Record<string, string> };
function GroupTable({ course, ids, groups, setG, confirmed, onConfirm }: { course: Course; ids: string[]; groups: G; setG: (k: keyof G, sid: string, v: string) => void; confirmed: boolean; onConfirm: (v: boolean) => void }) {
  const { s } = useStudio();
  const day = course.period === 'day';
  const cols: [keyof G, string, boolean][] = [['affiliations', '소속', true], ['seats', '좌석', true], ['jobGroups', '직무 모임', !day], ['jointGroups', '공동 과제 조', !day]];
  if (!ids.length) return null;
  return (
    <div className="mt-5 border-t pt-4">
      <div className="mb-2 flex flex-wrap items-center gap-3"><b className="text-sm">{T('편성 (교사가 직접 입력 · 자동 배정 없음)')}</b>
        {day ? <Pill tone="gray">{T('하루 수업: 소속·좌석만, 미션은 개인')}</Pill> : <Check label={T('직무 모임·공동 조 편성을 교사가 확정')} checked={confirmed} onChange={onConfirm} testid="check-grouping-confirm" />}
      </div>
      <div className="max-h-72 overflow-auto"><table className="w-full text-sm"><thead><tr className="text-xs text-muted-foreground"><th className="py-1 text-start">{T('학생')}</th>{cols.map(([k, l]) => <th key={k} className="text-start">{T(l)}</th>)}</tr></thead>
        <tbody>{ids.map((id) => <tr key={id} className="border-t"><td className="py-1 pe-2 font-mono text-xs">{studentName(s, id)}</td>{cols.map(([k, , on]) => <td key={k} className="pe-1.5"><input disabled={!on} value={groups[k][id] ?? ''} onChange={(e) => setG(k, id, e.target.value)} data-testid={`input-${k}-${id}`} className={cn(inputCls, 'py-1 disabled:opacity-40')} /></td>)}</tr>)}</tbody></table></div>
    </div>
  );
}

function RangeList({ label, list, on, id, course }: { label: string; list: { start: number; end: number }[]; on: (l: { start: number; end: number }[]) => void; id: string; course: Course }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-muted-foreground">{label}<button type="button" className="text-primary" data-testid={`button-add-${id}`} onClick={() => on([...list, { start: list.at(-1)?.end ?? 0, end: (list.at(-1)?.end ?? 0) + 60 }])}>+ {T('구간')}</button></div>
      {list.length === 0 && <div className="text-xs text-muted-foreground">{T('없음')}</div>}
      {list.map((r, i) => (
        <div key={i} className="mb-1 flex items-center gap-1.5 text-xs">
          <input type="number" value={r.start} data-testid={`input-${id}-start-${i}`} onChange={(e) => on(list.map((x, j) => (j === i ? { ...x, start: Number(e.target.value) } : x)))} className={cn(inputCls, 'w-20 py-1 font-mono')} />
          <span>–</span>
          <input type="number" value={r.end} data-testid={`input-${id}-end-${i}`} onChange={(e) => on(list.map((x, j) => (j === i ? { ...x, end: Number(e.target.value) } : x)))} className={cn(inputCls, 'w-20 py-1 font-mono')} />
          <span className="font-mono text-muted-foreground">{tryOr(() => `${formatOffset(r.start, course)} – ${formatOffset(r.end, course)}`, '')}</span>
          <button type="button" className="ms-auto text-destructive" onClick={() => on(list.filter((_, j) => j !== i))} data-testid={`button-remove-${id}-${i}`}><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ))}
    </div>
  );
}
