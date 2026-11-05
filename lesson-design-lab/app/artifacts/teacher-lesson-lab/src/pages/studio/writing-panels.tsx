import { formatDateTime } from '@/i18n/format';
import { useState } from 'react';
import type { AppState } from '@/lib/store';
import { CalendarPlus, X, Share2, Check as CheckIcon, Save, Flag } from 'lucide-react';
import { T } from '@/i18n/tx';
import { setSharing, counselingSlots, counselingCapacity, bookSlot, cancelBooking, saveConsultation, confirmFact, finalizeWriting, formatOffset, refreshWritingSources } from '@/lib/studio';
import type { Writing, Course } from '@/lib/studio/types';
import { Btn, Pill } from '@/components/shell';
import { cn } from '@/lib/utils';
import { Section, Txt, Check, act, useDraft, useStudio, tryOr, Status } from './common';

export function SharePanel({ course, w }: { course: Course; w: Writing }) {
  const [d, setD] = useDraft(`share-${w.id}`, { v1: w.sharing.v1, versions:!!w.sharing.versions, experiences: w.sharing.experiences, requirements: w.sharing.requirements, counselorIds: w.sharing.counselorIds });
  const cos = course.counseling.counselors.some((c)=>c.id===course.ownerId) ? course.counseling.counselors : [{id:course.ownerId,name:T('담당 교사'),lead:true,available:[]},...course.counseling.counselors];
  return (
    <Section title={T('상담 공유 선택')} hint={T('선택한 항목과 상담자에게만 보입니다. 기본은 비공개입니다.')} right={w.sharing.at ? <span className="font-mono text-[11px] text-muted-foreground">{formatDateTime(w.sharing.at)}</span> : <Pill tone="gray">{T('비공개')}</Pill>}>
      <div className="flex flex-wrap gap-4"><Check label="V1" checked={d.v1} onChange={(v) => setD({ ...d, v1: v })} testid="check-share-v1" /><Check label={T('경험 사실')} checked={d.experiences} onChange={(v) => setD({ ...d, experiences: v })} testid="check-share-exp" /><Check label={T('요구 조건')} checked={d.requirements} onChange={(v) => setD({ ...d, requirements: v })} testid="check-share-req" /></div>
      <Check label={T('저장한 V2 이후 수정본도 공유 · 작성 중 초안은 제외')} checked={!!d.versions} onChange={(v)=>setD({...d,versions:v})} testid="check-share-versions"/>
      <div className="mt-2 flex flex-wrap gap-1.5">{cos.length === 0 ? <span className="text-xs text-muted-foreground">{T('과정에 상담자가 없습니다.')}</span> : cos.map((c) => <button key={c.id} type="button" data-testid={`toggle-share-${c.id}`} onClick={() => setD({ ...d, counselorIds: d.counselorIds.includes(c.id) ? d.counselorIds.filter((x) => x !== c.id) : [...d.counselorIds, c.id] })} className={cn('rounded-md border px-2 py-1 text-xs', d.counselorIds.includes(c.id) ? 'border-primary bg-primary text-primary-foreground' : 'bg-card')}>{c.name}</button>)}</div>
      <Btn className="mt-3" onClick={() => act((s) => setSharing(s, w.id, d), '공유 설정을 저장했습니다')} data-testid="button-save-sharing"><Share2 className="h-4 w-4" />{T('공유 저장')}</Btn>
    </Section>
  );
}

export function CapacityPanel({ course }: { course: Course }) {
  const { s } = useStudio();
  const c = tryOr(() => counselingCapacity(s, course.id), null);
  if (!c) return null;
  return (
    <Section title={T('상담 수용량')} right={c.shortage > 0 ? <Pill tone="red">{T('부족 {0}명', c.shortage)}</Pill> : <Pill tone="blue">{T('충분')}</Pill>}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="stats-capacity">{([['수용 가능', c.capacity], ['대상 학생', c.students], ['부족', c.shortage], ['필요 상담자', c.requiredCounselors]] as const).map(([k, v]) => <div key={k} className="rounded-md bg-muted px-3 py-2"><div className="text-xs text-muted-foreground">{T(k)}</div><div className="font-mono text-lg font-semibold">{v}</div></div>)}</div>
      {c.suggestions.length > 0 && <ul className="mt-2 list-disc ps-5 text-sm">{c.suggestions.map((x) => <li key={x}>{T(x)}</li>)}</ul>}
    </Section>
  );
}

export function BookingPanel({ course, w }: { course: Course; w: Writing }) {
  const { s } = useStudio();
  const slots = tryOr(() => counselingSlots(s, course.id), []);
  const mine = s.studio.bookings.filter((b) => b.writingId === w.id && b.status !== 'cancelled');
  const name = (id: string) => course.counseling.counselors.find((c) => c.id === id)?.name ?? id;
  const f = (n: number) => tryOr(() => formatOffset(n, course), String(n));
  return (
    <Section title={T('상담 예약')} hint={T('공유한 상담자의 가능한 시간만 예약할 수 있습니다.')}>
      {mine.map((b) => <div key={b.id} className="mb-2 flex items-center gap-2 rounded-md border bg-secondary/50 px-2.5 py-1.5 text-sm" data-testid={`row-booking-${b.id}`}><Status v={b.status} /><span>{name(b.counselorId)}</span><span className="font-mono text-xs">{f(b.start)}–{f(b.end)}</span>{b.status === 'booked' && <button type="button" className="ms-auto text-destructive" onClick={() => act((st) => cancelBooking(st, b.id), '예약을 취소했습니다')} data-testid={`button-cancel-${b.id}`}><X className="h-4 w-4" /></button>}</div>)}
      {slots.length === 0 ? <p className="text-xs text-muted-foreground">{T('상담 시간이 설정되지 않았습니다.')}</p> : (
        <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">{slots.map((x) => {
          const ok = x.available && w.sharing.counselorIds.includes(x.counselorId);
          return <button key={`${x.counselorId}-${x.start}`} type="button" disabled={!ok || mine.some((b) => b.status === 'booked')} title={x.reason} onClick={() => act((st) => bookSlot(st, w.id, x.counselorId, x.start), '예약했습니다')} data-testid={`button-slot-${x.counselorId}-${x.start}`} className={cn('flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-start text-xs transition disabled:opacity-45', ok && 'hover:border-primary hover:bg-secondary')}><CalendarPlus className="h-3.5 w-3.5 shrink-0" /><span className="font-mono">{f(x.start)}</span><span className="truncate">{name(x.counselorId)}</span>{!x.available && <span className="ms-auto truncate text-muted-foreground">{T(x.reason)}</span>}</button>;
        })}</div>
      )}
    </Section>
  );
}

const ln = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean);

export function ConsultPanel({ w }: { course: Course; w: Writing }) {
  const [d, setD] = useDraft(`consult-${w.id}`, { q: w.questions.join('\n'), f: '', e: w.expressionSuggestions });
  return (
    <details className="mt-3 rounded-lg border p-3" open>
      <summary className="cursor-pointer text-sm font-semibold">{T('상담 기록 · 사실과 표현을 분리')}</summary>
      <div className="mt-2 grid gap-2 md:grid-cols-3">
        <Txt rows={4} label={T('상담 질문 (한 줄에 하나)')} value={d.q} onChange={(v) => setD({ ...d, q: v })} testid={`input-consult-q-${w.id}`} />
        <Txt rows={4} label={T('학생이 말한 새 사실 후보 — 학생 확인 필요')} value={d.f} onChange={(v) => setD({ ...d, f: v })} testid={`input-consult-f-${w.id}`} />
        <Txt rows={4} label={T('표현 제안 (사실 아님)')} value={d.e} onChange={(v) => setD({ ...d, e: v })} testid={`input-consult-e-${w.id}`} />
      </div>
      {w.factCandidates.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{w.factCandidates.map((f) => <Pill key={f.id} tone={f.confirmed ? 'blue' : f.rejected ? 'gray' : 'orange'}>{f.text} · {T(f.confirmed ? '학생 확인' : f.rejected ? '학생 거절' : '확인 대기')}</Pill>)}</div>}
      <Btn className="mt-2" onClick={() => { if (act((s) => saveConsultation(s, w.id, ln(d.q), ln(d.f), d.e), '상담 기록을 저장했습니다')) setD({ ...d, f: '' }); }} data-testid={`button-save-consult-${w.id}`}><Save className="h-4 w-4" />{T('상담 기록 저장')}</Btn>
    </details>
  );
}

export function FactConfirmPanel({ w }: { w: Writing }) {
  const pending = w.factCandidates.filter((f) => !f.confirmed && !f.rejected);
  if (!w.factCandidates.length && !w.expressionSuggestions && !w.questions.length) return null;
  return (
    <Section title={T('상담 결과 확인')} hint={T('상담자가 적은 사실 후보는 내가 맞다고 확인해야 다음 버전에 쓸 수 있습니다.')}>
      {w.questions.length > 0 && <ul className="mb-2 list-disc ps-5 text-sm">{w.questions.map((q) => <li key={q}>{q}</li>)}</ul>}
      {pending.map((f) => <div key={f.id} className="mb-1.5 flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm"><span className="flex-1">{f.text}</span><Btn className="py-1 text-xs" onClick={() => act((s) => confirmFact(s, w.id, f.id, true), '사실로 확인했습니다')} data-testid={`button-fact-yes-${f.id}`}><CheckIcon className="h-3.5 w-3.5" />{T('맞아요')}</Btn><Btn variant="danger" className="py-1 text-xs" onClick={() => act((s) => confirmFact(s, w.id, f.id, false))} data-testid={`button-fact-no-${f.id}`}>{T('아니에요')}</Btn></div>)}
      {w.factCandidates.filter((f) => f.confirmed || f.rejected).map((f) => <div key={f.id} className="text-xs text-muted-foreground">{f.confirmed ? T('확인') : T('거절')} · {f.text}</div>)}
      {w.expressionSuggestions && <div className="mt-2 rounded-md bg-accent/60 p-2 text-sm"><div className="text-[11px] font-bold text-accent-foreground">{T('표현 제안 · 사실 아님')}</div>{w.expressionSuggestions}</div>}
    </Section>
  );
}

const CHECK: [keyof Writing['checklist'], string][] = [['response', '문항에 답함'], ['ownAction', '내가 한 행동이 드러남'], ['evidence', '근거가 있음'], ['jobLink', '직무와 연결됨'], ['facts', '확인된 사실만 사용'], ['reviewed', '직접 다시 읽음']];
export function FinalizePanel({ w }: { w: Writing }) {
  const [c, setC] = useDraft(`final-${w.id}`, w.checklist);
  const all = CHECK.every(([k]) => c[k]);
  return (
    <Section title={T('학생 최종 점검')} hint={T('합격 여부나 점수를 매기지 않습니다.')} right={<Status v={w.status} />}>
      <div className="grid grid-cols-2 gap-1.5">{CHECK.map(([k, l]) => <Check key={k} label={T(l)} checked={c[k]} onChange={(v) => setC({ ...c, [k]: v })} testid={`check-final-${k}`} />)}</div>
      <Btn className="mt-3" variant="orange" disabled={!all} onClick={() => act((s) => finalizeWriting(s, w.id, c), '최종으로 표시했습니다')} data-testid="button-finalize"><Flag className="h-4 w-4" />{T('최종으로 표시')}</Btn>
    </Section>
  );
}

/** Compares the writing's source snapshot with current company models. Older versions are never touched. */
export function sourceChanges(s: AppState, w: Writing): string[] {
  const models = s.studio.companies.filter((m) => m.job === w.job);
  const snap = w.sourceStates ?? [];
  const out: string[] = [];
  for (const r of snap) {
    const m = s.studio.companies.find((x) => x.id === r.id);
    if (!m) out.push(T('{0}: 삭제됨', r.id));
    else if (m.revoked) out.push(T('{0}: 공유 철회됨', m.company));
    else if (!m.educationAllowed) out.push(T('{0}: 교육 사용 허락 해제', m.company));
    else if (m.version !== r.version || m.changedAt !== r.changedAt) out.push(T('{0}: v{1} → v{2} 변경', m.company, r.version, m.version));
  }
  models.filter((m) => !snap.some((r) => r.id === m.id)).forEach((m) => out.push(T('{0}: 새로 연결된 자료', m.company)));
  return out;
}

export function SourceCheck({ w, changes }: { w: Writing; changes: string[] }) {
  const [ok, setOk] = useState(false);
  if (!changes.length) return <p className="text-xs text-muted-foreground" data-testid="text-sources-ok">{T('연결된 자료 출처 {0}개 · 변경 없음', (w.sourceStates ?? []).length)}</p>;
  return (
    <div className="rounded-lg border border-[hsl(var(--sidebar-primary))]/50 bg-accent/50 p-3 text-sm rise" data-testid="panel-source-changed">
      <div className="font-bold text-accent-foreground">{T('연결된 자료가 바뀌었습니다 — 새 제안 전에 다시 확인하세요')}</div>
      <ul className="mt-1 list-disc ps-5">{changes.map((c) => <li key={c}>{c}</li>)}</ul>
      <p className="mt-1 text-xs text-muted-foreground">{T('이미 저장된 V1·V2 등 이전 버전은 바뀌지 않습니다.')}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Check label={T('출처·버전·교육 공유 상태를 직접 다시 확인했습니다')} checked={ok} onChange={setOk} testid="check-reconfirm-sources" />
        <Btn variant="orange" disabled={!ok} onClick={() => { if (act((s) => refreshWritingSources(s, w.id, ok), '자료 확인을 갱신했습니다')) setOk(false); }} data-testid="button-reconfirm-sources">{T('다시 확인 저장')}</Btn>
      </div>
    </div>
  );
}
