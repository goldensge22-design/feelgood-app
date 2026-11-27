import { useState } from 'react';
import { Lock, Unlock, Plus, Trash2, Wand2, CheckCircle2, AlertTriangle, History } from 'lucide-react';
import { T } from '@/i18n/tx';
import type { Student } from '@/lib/store';
import { now } from '@/lib/store';
import { proposeGroups, validateGroups, usesGroups, type GroupingState, type GroupGoal, type TeachingGroup, type TeachingMode } from '@/lib/teaching';
import { Panel, Pill, Btn, Field, inputCls } from '@/components/shell';
import { cn } from '@/lib/utils';

const GOALS: { v: GroupGoal; label: string; hint: string }[] = [
  { v: 'interest-mission', label: '관심 미션이 비슷한 학생끼리', hint: '학생이 직접 고른 직무·과제를 기준으로 묶습니다.' },
  { v: 'diverse-methods', label: '서로 다른 방법을 섞어서', hint: '학생이 고른 지원·연습 방법이 겹치지 않게 나눕니다.' },
  { v: 'similar-supports', label: '비슷한 지원이 필요한 학생끼리', hint: '교사가 같은 지원을 한 번에 제공하기 쉽게 묶습니다.' },
];

const same = (a: TeachingGroup[], b: TeachingGroup[]) => JSON.stringify(a) === JSON.stringify(b);

/** Reusable grouping editor (group / mixed modes only). Proposal is never applied automatically:
 * teacher reviews the draft, fixes conflicts, then explicitly confirms. Private teacher record only. */
export function GroupEditor({ students, mode, value, onChange, scopeLabel }: {
  students: Student[]; mode: TeachingMode; value: GroupingState; onChange: (g: GroupingState) => void; scopeLabel?: string;
}) {
  const [proposalErrors, setProposalErrors] = useState<string[]>([]);
  if (!usesGroups(mode)) return null;
  const g = value;
  const set = (p: Partial<GroupingState>) => onChange({ ...g, ...p });
  const errors = g.draft.length ? validateGroups(students, g.draft, g.capacity, g.fixed) : [];
  const placed = new Map<string, string>();
  g.draft.forEach((x) => x.studentIds.forEach((id) => placed.set(id, x.id)));
  const counts = new Map<string, number>();
  g.draft.forEach((x) => x.studentIds.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1)));
  const missing = students.filter((s) => !placed.has(s.id));
  const dups = students.filter((s) => (counts.get(s.id) ?? 0) > 1);
  const unknown = g.draft.flatMap((x) => x.studentIds).filter((id) => !students.some((s) => s.id === id));
  const dirty = !same(g.draft, g.confirmed);

  const propose = () => {
    if (g.draft.length && !confirm(T('현재 편성 초안을 새 제안으로 바꿀까요? 확정된 편성과 고정 배치는 유지됩니다.'))) return;
    const r = proposeGroups(students, mode, g.goal, g.capacity, g.fixed, g.draft.length ? g.draft : g.confirmed);
    setProposalErrors(r.errors);
    if (r.groups.length) set({ draft: r.groups });
  };
  const move = (sid: string, to: string) => {
    const draft = g.draft.map((x) => ({ ...x, studentIds: x.studentIds.filter((id) => id !== sid) }));
    const target = draft.find((x) => x.id === to);
    if (target) target.studentIds = [...target.studentIds, sid];
    const fixed = { ...g.fixed };
    if (fixed[sid] && fixed[sid] !== to) delete fixed[sid];
    set({ draft, fixed });
  };
  const toggleLock = (sid: string) => {
    const fixed = { ...g.fixed };
    if (fixed[sid]) delete fixed[sid]; else if (placed.get(sid)) fixed[sid] = placed.get(sid)!;
    set({ fixed });
  };
  const addGroup = () => {
    let n = g.draft.length + 1; while (g.draft.some((x) => x.id === `group-${n}`)) n++;
    set({ draft: [...g.draft, { id: `group-${n}`, name: T('조 {0}', n), studentIds: [] }] });
  };
  const removeGroup = (id: string) => {
    const fixed = Object.fromEntries(Object.entries(g.fixed).filter(([, v]) => v !== id));
    set({ draft: g.draft.filter((x) => x.id !== id), fixed });
  };
  const confirmGroups = () => {
    if (errors.length || !g.draft.length) return;
    if (!confirm(T('검토한 편성을 확정할까요? 이전 확정본은 이력에 남습니다.'))) return;
    set({ confirmed: structuredClone(g.draft), history: [{ at: now(), reason: T('교사 확정'), groups: structuredClone(g.draft) }, ...g.history] });
  };
  const nameOf = (s: Student) => s.code || T('코드 없음');

  return (
    <Panel className="no-print space-y-3" >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-bold">{mode === 'mixed' ? T('조별 단계 편성 (혼합 수업)') : T('조 편성')}</h3>
        {scopeLabel && <Pill tone="gray">{scopeLabel}</Pill>}
        <Pill tone="orange">{T('교사 전용 · 임시 기록 · 인쇄 안 함')}</Pill>
        {g.confirmed.length > 0 && !dirty && <Pill>{T('확정됨')}</Pill>}
        {g.confirmed.length > 0 && dirty && <Pill tone="red">{T('확정본과 다른 초안')}</Pill>}
      </div>
      <p className="text-xs text-muted-foreground">
        {mode === 'mixed' ? T('조 편성은 조별 단계에만 적용됩니다. 학생마다 고른 개인 직무·미션은 그대로 유지됩니다.') : T('조 안에서도 학생마다 자기 개인 미션을 수행합니다.')}
        {' '}{T('유형·점수·전공으로 역할을 고정하지 않으며, 학생이 고른 지원·연습 방법만 사용합니다.')}
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
        <Field label={T('편성 기준')}>
          <select className={inputCls} value={g.goal} onChange={(e) => set({ goal: e.target.value as GroupGoal })} data-testid="select-group-goal">
            {GOALS.map((o) => <option key={o.v} value={o.v}>{T(o.label)}</option>)}
          </select>
        </Field>
        <Field label={T('조별 정원')}><input type="number" min={1} max={20} className={inputCls} value={g.capacity} onChange={(e) => set({ capacity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} data-testid="input-group-capacity" /></Field>
      </div>
      <p className="text-xs text-muted-foreground">{T(GOALS.find((o) => o.v === g.goal)!.hint)}</p>
      <div className="flex flex-wrap gap-2">
        <Btn variant="outline" disabled={!students.length} onClick={propose} data-testid="button-propose-groups"><Wand2 className="h-4 w-4" />{T('편성 제안 받기')}</Btn>
        <Btn variant="ghost" onClick={addGroup} data-testid="button-add-group"><Plus className="h-4 w-4" />{T('조 추가')}</Btn>
        <Btn disabled={!g.draft.length || errors.length > 0 || !dirty} onClick={confirmGroups} data-testid="button-confirm-groups"><CheckCircle2 className="h-4 w-4" />{T('검토 후 확정')}</Btn>
        {dirty && g.confirmed.length > 0 && <Btn variant="ghost" onClick={() => set({ draft: structuredClone(g.confirmed) })} data-testid="button-revert-groups">{T('확정본으로 되돌리기')}</Btn>}
      </div>
      {!students.length && <p className="text-sm text-muted-foreground">{T('대상 명단에 학생이 없습니다. 학생 명단에서 학교급·코호트를 맞춰 추가하세요.')}</p>}
      {proposalErrors.length > 0 && <ul className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{proposalErrors.map((e) => <li key={e}>{T(e)}</li>)}</ul>}
      {g.draft.length > 0 && (
        <div className={cn('rounded-lg p-2 text-xs', errors.length ? 'bg-destructive/10 text-destructive' : 'bg-secondary')} data-testid="group-validation">
          {errors.length ? <><div className="flex items-center gap-1 font-semibold"><AlertTriangle className="h-3.5 w-3.5" />{T('확정 전 해결할 문제')}</div><ul className="mt-1 list-disc ps-4">{errors.map((e) => <li key={e}>{T(e)}</li>)}</ul></>
            : T('모든 학생이 정확히 한 번 배치되었습니다. 검토 후 확정할 수 있습니다.')}
          {(missing.length > 0 || dups.length > 0 || unknown.length > 0) && <div className="mt-1">{T('미배치 {0}명 · 중복 {1}명 · 명단 외 {2}건', missing.length, dups.length, unknown.length)}</div>}
        </div>
      )}
      {g.draft.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {g.draft.map((grp) => (
            <div key={grp.id} className={cn('rounded-lg border p-2', grp.studentIds.length > g.capacity && 'border-destructive')}>
              <div className="flex items-center gap-2">
                <input className={cn(inputCls, 'py-1 font-semibold')} value={grp.name} onChange={(e) => set({ draft: g.draft.map((x) => (x.id === grp.id ? { ...x, name: e.target.value } : x)) })} aria-label={T('조 이름')} data-testid={`input-group-name-${grp.id}`} />
                <span className="font-mono text-xs whitespace-nowrap">{grp.studentIds.length}/{g.capacity}</span>
                <button type="button" disabled={grp.studentIds.length > 0} onClick={() => removeGroup(grp.id)} className="text-muted-foreground disabled:opacity-30" aria-label={T('빈 조 삭제')} data-testid={`button-remove-group-${grp.id}`}><Trash2 className="h-4 w-4" /></button>
              </div>
              <ul className="mt-1.5 space-y-1">
                {grp.studentIds.map((sid) => {
                  const s = students.find((x) => x.id === sid);
                  return (
                    <li key={sid} className="flex items-center gap-1.5 text-xs">
                      <button type="button" onClick={() => toggleLock(sid)} aria-pressed={!!g.fixed[sid]} aria-label={g.fixed[sid] ? T('고정 해제') : T('이 조에 고정')} data-testid={`button-lock-${sid}`} className={g.fixed[sid] ? 'text-[hsl(var(--sidebar-primary))]' : 'text-muted-foreground'}>{g.fixed[sid] ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}</button>
                      <span className="font-mono">{s ? nameOf(s) : T('명단 외')}</span>
                      <span className="flex-1 truncate text-muted-foreground">{s?.job ? [s.job, s.task].filter(Boolean).join(' / ') : T('개인 미션 미선택')}</span>
                      <select className="rounded border bg-background px-1 py-0.5" value={grp.id} onChange={(e) => move(sid, e.target.value)} aria-label={T('조 이동')} data-testid={`select-move-${sid}`}>
                        {g.draft.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                        <option value="">{T('미배치로')}</option>
                      </select>
                    </li>
                  );
                })}
                {!grp.studentIds.length && <li className="text-xs text-muted-foreground">{T('비어 있음')}</li>}
              </ul>
            </div>
          ))}
        </div>
      )}
      {g.draft.length > 0 && missing.length > 0 && (
        <div className="rounded-lg border border-dashed p-2">
          <div className="text-xs font-semibold">{T('미배치 학생')}</div>
          <ul className="mt-1 flex flex-wrap gap-1.5">{missing.map((s) => (
            <li key={s.id} className="flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs">
              <span className="font-mono">{nameOf(s)}</span>
              <select className="bg-transparent" value="" onChange={(e) => e.target.value && move(s.id, e.target.value)} aria-label={T('조에 배치')} data-testid={`select-place-${s.id}`}>
                <option value="">{T('배치')}</option>
                {g.draft.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </li>))}
          </ul>
        </div>
      )}
      {g.history.length > 0 && (
        <details className="text-xs"><summary className="flex cursor-pointer items-center gap-1 font-semibold"><History className="h-3.5 w-3.5" />{T('확정 이력 {0}건', g.history.length)}</summary>
          <ul className="mt-1 space-y-1">{g.history.map((h, i) => <li key={i} className="flex flex-wrap gap-2"><span className="font-mono">{new Date(h.at).toLocaleString()}</span><span>{h.reason}</span><span className="text-muted-foreground">{T('{0}개 조', h.groups.length)}</span><button type="button" className="text-primary" onClick={() => set({ draft: structuredClone(h.groups) })} data-testid="button-load-history">{T('초안으로 불러오기')}</button></li>)}</ul>
        </details>
      )}
    </Panel>
  );
}
