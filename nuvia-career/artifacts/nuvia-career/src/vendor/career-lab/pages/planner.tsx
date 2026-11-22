import { PublicText } from '@/vendor/career-lab/components/lab/public-text';
import { activityTitle,productText } from '@/vendor/career-lab/lib/activity-assistance';
import { programById } from '@/vendor/career-lab/lib/universities';
import { PRACTICE_METHODS, confirmedPracticeStrengths } from '@/vendor/career-lab/lib/practice';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Plus, Trash2, Pencil, ChevronLeft, ChevronRight, NotebookPen } from 'lucide-react';
import { useLab } from '@/vendor/career-lab/lib/store';
import { useLocale } from '@/vendor/career-lab/lib/locale';
import { ACTIVITY_KINDS, FIELDS, MAJORS } from '@/vendor/career-lab/lib/catalog';
import { now, statusLabel, today, uid, type Activity, type ActStatus } from '@/vendor/career-lab/lib/types';
import { strengthsOf } from '@/vendor/career-lab/lib/links';
import { PageHeader, Empty, Tag, LField, TextIn, TextArea, Select, Confirm } from '@/vendor/career-lab/components/lab/ui';
import { AiPanel } from '@/vendor/career-lab/components/lab/ai-panel';
import { Button } from '@/vendor/career-lab/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/vendor/career-lab/components/ui/dialog';
import { DialogLanguageHeader as DialogHeader } from '@/vendor/career-lab/components/lab/language-controls';
import { cn } from '@/vendor/career-lab/lib/utils';
import { ActivitySupport } from '@/vendor/career-lab/components/lab/activity-support';
import { SimulationDetails } from '@/vendor/career-lab/components/lab/simulation-details';

const fmt = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const blank = (): Activity => ({ id: uid(), title: '', kind: '수업', date: today(), durationMin: 30, purpose: '', todos: [], artifact: '', sourceType: 'self', sourceId: '', sourceLabel: '직접 계획', status: 'planned', createdAt: '', updatedAt: '' });
const tone = (st: ActStatus) => st === 'done' ? 'teal' : st === 'doing' ? 'coral' : st === 'hold' ? 'outline' : 'muted';

function ActivityForm({ initial, onSave, onClose }: { initial: Activity; onSave: (a: Activity) => void; onClose: () => void }) {
  const {state:s}=useLab();
  const {t}=useLocale();
  const [a, setA] = useState(initial); const [todo, setTodo] = useState(''); const [err, setErr] = useState('');
  const set = (p: Partial<Activity>) => setA(x => ({ ...x, ...p }));
  const sources = [{ value: 'self|', label: '직접 계획 (연결 없음)' }, ...FIELDS.map(f => ({ value: `field|${f.id}`, label: `분야 · ${f.name}` })), ...MAJORS.map(m => ({ value: `major|${m.id}`, label: `학과 · ${m.name}` }))];
  const srcVal = `${a.sourceType}|${a.sourceId}`;
  return (
    <div className="space-y-4" data-testid="form-activity">
      {(a.practiceLinks||[]).map(link=>{
        const card=s.practiceCards?.[link.cardKey],method=PRACTICE_METHODS[link.method];
        return <div key={link.cardKey} className="rounded-xl border bg-secondary/40 p-4" data-testid="linked-practice-card">
          <b>연결된 활동카드</b>{link.simulation?<SimulationDetails task={link.simulation}/>:<p>{card?.sourceId==='startup'||card?.sourceId.startsWith('job:')?<bdi data-i18n-original>{card?.text}</bdi>:t(card?.text||link.cardKey)}</p>}
          <p>출처: {card?.sourceType==='program'&&card.sourceSnapshot?<><PublicText text={card.sourceSnapshot.universityOriginal}/> · <PublicText text={card.sourceSnapshot.programOriginal}/></>:t(card?.sourceLabel||'')} · 버전 <bdi>{card?.version}</bdi></p>
          <p>{link.mode==='simulation'?'가상 직무 상황 연습':'일상 탐색·연습'} · {method.name}</p>
          <p>활용할 강점: <bdi data-i18n-original>{confirmedPracticeStrengths(s).filter(x=>link.strengthIds.includes(x.id)).map(x=>x.text).join(', ')}</bdi></p>
          <p><bdi data-i18n-original>{link.scope}</bdi></p><ol className="list-inside list-decimal">{method.steps.map(x=><li key={x}>{x}</li>)}</ol>
          <p>남길 결과 (계획): {method.result}</p><p>실제로 한 일과 배움은 경험 기록에서 확인해요.</p>
        </div>;
      })}
      <LField label="활동 이름"><TextIn value={activityTitle(a)} onChange={e => set({ title: e.target.value,titleSource:undefined })} autoFocus data-testid="input-activity-title" /></LField>
      <ActivitySupport id="planner-support" value={a.support||a.practiceLinks?.[0]?.support} onChange={support=>set({support})} method={a.practiceLinks?.[0]?.method} context={{activity:a.title,interests:s.interests.map(x=>x.text),strengths:confirmedPracticeStrengths(s).filter(x=>!a.practiceLinks?.length||a.practiceLinks.some(l=>l.strengthIds.includes(x.id))).map(x=>x.text)}} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <LField label="종류"><Select value={a.kind} onChange={e => set({ kind: e.target.value })} options={ACTIVITY_KINDS.map(k => ({ value: k, label: k }))} /></LField>
        <LField label="날짜" hint="과거 활동도 기록 가능"><TextIn type="date" value={a.date} onChange={e => set({ date: e.target.value })} data-testid="input-activity-date" /></LField>
        <LField label="시간(분)"><TextIn type="number" min={0} value={a.durationMin} onChange={e => set({ durationMin: Number(e.target.value) || 0 })} /></LField>
        <LField label="상태"><Select value={a.status} onChange={e => set({ status: e.target.value as ActStatus })} options={(Object.keys(statusLabel) as ActStatus[]).map(k => ({ value: k, label: statusLabel[k] }))} data-testid="select-activity-status" /></LField>
      </div>
      <LField label="목적 — 무엇을 알아보고 싶나요?"><TextArea rows={2} value={a.purpose} onChange={e => set({ purpose: e.target.value })} /></LField>
      <div>
        <p className="mb-1.5 text-sm font-semibold">할 일</p>
        <div className="flex gap-2"><TextIn value={todo} onChange={e => setTodo(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && todo.trim()) { e.preventDefault(); set({ todos: [...a.todos, { id: uid(), text: todo.trim(), done: false }] }); setTodo(''); } }} placeholder="엔터로 추가" data-testid="input-todo" /><Button type="button" variant="outline" onClick={() => { if (todo.trim()) { set({ todos: [...a.todos, { id: uid(), text: todo.trim(), done: false }] }); setTodo(''); } }}>추가</Button></div>
        <ul className="mt-2 space-y-1">{a.todos.map(t => <li key={t.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={t.done} onChange={() => set({ todos: a.todos.map(x => x.id === t.id ? { ...x, done: !x.done } : x) })} className="accent-[hsl(var(--primary))]" /><span className={cn('flex-1', t.done && 'line-through text-muted-foreground')}>{productText(t.text,t.productSource)}</span><button onClick={() => set({ todos: a.todos.filter(x => x.id !== t.id) })} aria-label="할 일 삭제" className="p-1 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></li>)}</ul>
      </div>
      <LField label="결과물 (계획)"><TextIn value={productText(a.artifact,a.artifactSource)} onChange={e => set({ artifact: e.target.value,artifactSource:undefined })} placeholder="예: 측정 표, 1분 영상" /></LField>
      <LField label="연결 분야·학과" hint={a.sourceType === 'role' ? `현재 출처: ${a.sourceLabel} (유지됨)` : undefined}>
        <Select value={sources.some(x => x.value === srcVal) ? srcVal : 'keep'} onChange={e => { if (e.target.value === 'keep') return; const [t, id] = e.target.value.split('|'); const lbl = sources.find(x => x.value === e.target.value)!.label.replace(/^.+ · /, ''); set({ sourceType: t as Activity['sourceType'], sourceId: id, sourceLabel: t === 'self' ? '직접 계획' : lbl, sourceSnapshot: undefined }); }}
          options={sources.some(x => x.value === srcVal) ? sources : [{ value: 'keep', label: `${a.sourceLabel} (원래 출처)` }, ...sources]} />
      </LField>
      {a.sourceSnapshot && <div className="rounded-xl border p-3 text-xs" data-testid="activity-source-snapshot">
        <b>이 활동을 담을 때의 자료</b>
        <p><PublicText text={a.sourceSnapshot.universityOriginal} original /> · <PublicText text={a.sourceSnapshot.programOriginal} original /></p>
        {a.sourceSnapshot.sources.map((src, i) => <p key={i} className="mt-1 break-words">{src.academicVersion || '버전 미확인'} · 확인일 {src.checkedAt || '없음'} · 원문 <bdi>{src.language || '미확인'}</bdi> · <a href={src.url} target="_blank" rel="noreferrer" className="text-primary underline">당시 자료 링크</a></p>)}
        <p className="mt-1 text-muted-foreground">자료 탐색 계획이며 대학 재학·수강 경험이 아니에요.</p>
      </div>}
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>취소</Button><Button onClick={() => { if (!a.title.trim()) return setErr('활동 이름을 적어 주세요.'); onSave({ ...a, title: a.title.trim(), createdAt: a.createdAt || now(), updatedAt: now() }); }} data-testid="button-save-activity">저장</Button></div>
    </div>
  );
}

export default function Planner() {
  const { formatDate, formatNumber } = useLocale();
  const { state: s, update } = useLab();
  const [loc, nav] = useLocation();
  const [view, setView] = useState<'week' | 'list'>('week');
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<ActStatus | 'all'>('all');
  const [editing, setEditing] = useState<Activity | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('edit');
    if (id) { const a = s.activities.find(x => x.id === id); if (a) setEditing(a); nav('/planner', { replace: true }); }
  }, [loc]); // eslint-disable-line react-hooks/exhaustive-deps

  const week = useMemo(() => { const d = new Date(); const st = new Date(d); st.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7); return Array.from({ length: 7 }, (_, i) => { const x = new Date(st); x.setDate(st.getDate() + i); return fmt(x); }); }, [offset]);
  const save = (a: Activity) => { update(d => { const i = d.activities.findIndex(x => x.id === a.id); if (i >= 0) d.activities[i] = a; else d.activities.push(a); }); setEditing(null); };
  const setStatus = (id: string, st: ActStatus) => update(d => { const a = d.activities.find(x => x.id === id)!; a.status = st; a.updatedAt = now(); });
  const del = (id: string) => update(d => { d.activities = d.activities.filter(x => x.id !== id); });
  const list = [...s.activities].filter(a => filter === 'all' || a.status === filter).sort((a, b) => (b.date || '9').localeCompare(a.date || '9'));
  const undated = s.activities.filter(a => !a.date);

  const Card = ({ a, compact }: { a: Activity; compact?: boolean }) => {
    const hasRef = s.reflections.some(r => r.activityId === a.id);
    return (
      <div className={cn('group rounded-xl border bg-card p-3 text-sm transition hover:border-primary/40', a.status === 'done' && 'bg-secondary/40')} data-testid={`card-activity-${a.id}`}>
        <div className="flex items-start gap-2">
          <button className="flex-1 text-left font-semibold leading-snug" onClick={() => setEditing(a)}>{activityTitle(a)}</button>
          {!compact && <Confirm title="활동을 삭제할까요?" desc="연결된 회고는 남아 있어요." onConfirm={() => del(a.id)} trigger={o => <button onClick={o} aria-label="삭제" className="p-1 text-muted-foreground hover:text-destructive" data-testid={`button-delete-activity-${a.id}`}><Trash2 className="h-3.5 w-3.5" /></button>} />}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1"><Tag tone={tone(a.status)}>{statusLabel[a.status]}</Tag>{!compact && <><Tag tone="outline">{a.kind}</Tag><span className="text-xs text-muted-foreground">{formatDate(a.date)} · {formatNumber(a.durationMin)}분</span></>}</div>
        <p className="mt-1 break-words text-xs text-muted-foreground">출처: {a.sourceType==='program'&&a.sourceSnapshot&&programById(s,a.sourceId)?.recordKind==='official'?<><PublicText text={a.sourceSnapshot.universityOriginal}/> · <PublicText text={a.sourceSnapshot.programOriginal}/></>:<bdi>{a.sourceLabel}</bdi>}</p>
        {!compact && a.todos.length > 0 && <p className="mt-1 text-xs">할 일 {a.todos.filter(t => t.done).length}/{a.todos.length}</p>}
        {!compact && (
          <div className="mt-2 flex flex-wrap gap-1">
            <Select value={a.status} onChange={e => setStatus(a.id, e.target.value as ActStatus)} options={(Object.keys(statusLabel) as ActStatus[]).map(k => ({ value: k, label: statusLabel[k] }))} className="w-auto py-1 text-xs" aria-label="상태 변경" />
            <button onClick={() => setEditing(a)} className="inline-flex items-center gap-1 rounded px-2 text-xs hover:bg-muted"><Pencil className="h-3 w-3" />수정</button>
            {a.status === 'done' && (hasRef ? <Tag tone="teal">회고 있음</Tag> : <Link href={`/experiences?activity=${a.id}`} className="inline-flex items-center gap-1 rounded bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground" data-testid={`link-reflect-${a.id}`}><NotebookPen className="h-3 w-3" />회고 쓰기</Link>)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <PageHeader step="STEP 06" title="플래너" desc="수업·독서·취미·동아리·관찰·인터뷰처럼 일상에서 하는 작은 탐색. 완료와 회고는 따로예요 — 완료해도 성과가 자동으로 만들어지지 않아요.">
        <Button onClick={() => setEditing(blank())} data-testid="button-new-activity"><Plus className="h-4 w-4" />활동 추가</Button>
      </PageHeader>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border p-1">{(['week', 'list'] as const).map(v => <button key={v} onClick={() => setView(v)} className={cn('rounded-full px-4 py-1 text-sm', view === v && 'bg-foreground text-background')} data-testid={`tab-view-${v}`}>{v === 'week' ? '주간' : '목록'}</button>)}</div>
        {view === 'week' ? (
          <div className="flex items-center gap-2 text-sm"><button onClick={() => setOffset(o => o - 1)} aria-label="이전 주" className="rounded-full border p-1.5 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button><span className="font-mono">{week[0].slice(5)} – {week[6].slice(5)}</span><button onClick={() => setOffset(o => o + 1)} aria-label="다음 주" className="rounded-full border p-1.5 hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>{offset !== 0 && <button onClick={() => setOffset(0)} className="text-primary underline">이번 주</button>}</div>
        ) : (
          <Select value={filter} onChange={e => setFilter(e.target.value as ActStatus | 'all')} options={[{ value: 'all', label: '모든 상태' }, ...(Object.keys(statusLabel) as ActStatus[]).map(k => ({ value: k, label: statusLabel[k] }))]} className="w-40" />
        )}
      </div>

      {s.activities.length === 0 ? <Empty title="플래너가 비어 있어요" desc="분야·학과 카드에서 ‘내 플래너에 담기’를 누르거나, 이미 해 본 활동을 직접 적어도 좋아요." action={<Button onClick={() => setEditing(blank())}>첫 활동 추가</Button>} /> :
        view === 'week' ? (
          <>
            <div className="grid gap-3 md:grid-cols-7">{week.map((day, i) => {
              const items = s.activities.filter(a => a.date === day);
              return (
                <div key={day} className={cn('min-h-[9rem] rounded-xl border bg-muted/30 p-2', day === today() && 'border-primary bg-secondary/40')}>
                  <div className="mb-2 flex items-baseline justify-between px-1"><span className="text-xs font-semibold">{DAYS[i]}</span><span className="font-mono text-[11px] text-muted-foreground">{day.slice(8)}</span></div>
                  <div className="space-y-2">{items.map(a => <Card key={a.id} a={a} compact />)}</div>
                  <button onClick={() => setEditing({ ...blank(), date: day })} className="mt-2 w-full rounded-lg py-1 text-xs text-muted-foreground opacity-60 hover:bg-background hover:opacity-100" aria-label={`${day} 활동 추가`}>+ 추가</button>
                </div>
              );
            })}</div>
            {undated.length > 0 && <div className="mt-6"><p className="mb-2 text-sm font-semibold">날짜 미정 ({undated.length})</p><div className="grid gap-3 md:grid-cols-3">{undated.map(a => <Card key={a.id} a={a} />)}</div></div>}
          </>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{list.map(a => <Card key={a.id} a={a} />)}{list.length === 0 && <p className="text-muted-foreground">이 상태의 활동이 없어요.</p>}</div>
        )}

      <div className="mt-8">
        <AiPanel task="activity" testId="activity" label="이번 주 작은 활동 제안 받기" desc="제안을 보고 마음에 드는 것만 직접 플래너에 추가하세요."
          getContext={() => ({ purpose: '학생의 탐색 분야·학과·관심사로 일상에서 할 수 있는 30~60분짜리 작은 활동(수업, 독서, 취미, 동아리, 관찰, 인터뷰, 작은 프로젝트) 3~5개 제안. 목적과 결과물 포함.', strengths: strengthsOf(s).map(x => x.text), interests: s.interests.map(i => i.text), fields: Object.entries(s.fields).filter(([, v]) => v.status === 'interested').map(([k]) => FIELDS.find(f => f.id === k)?.name), tempMajor: MAJORS.find(m => m.id === s.tempMajor)?.name, existing: s.activities.map(a => a.title) })}
          applyLabel="새 활동으로 담기" applyDesc="이 제안 전체를 ‘예정’ 활동 하나로 플래너에 추가해요. 나중에 고칠 수 있어요."
          onApply={x => update(d => { const t = now(); d.activities.push({ ...blank(), title: x.split('\n')[0].replace(/^[-*\d.\s]+/, '') || 'AI 제안 활동', purpose: x, date: '', sourceLabel: 'AI 제안을 내가 선택', createdAt: t, updatedAt: t }); })} />
      </div>

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing && s.activities.some(x => x.id === editing.id) ? '활동 수정' : '새 활동'}</DialogTitle><DialogDescription>계획만 적어도 돼요. 실제로 한 일은 회고에서 따로 적어요.</DialogDescription></DialogHeader>
          {editing && <ActivityForm key={editing.id} initial={editing} onSave={save} onClose={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
