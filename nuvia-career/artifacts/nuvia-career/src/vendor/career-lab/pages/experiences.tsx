import { confirmReflection, reflectionFingerprint, performedReflection, storyChoice, confirmedPracticeStrengths } from '@/vendor/career-lab/lib/practice';
import { ActivitySupport } from '@/vendor/career-lab/components/lab/activity-support';
import { activityTitle,reflectionTitle } from '@/vendor/career-lab/lib/activity-assistance';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Plus, Trash2, Pencil, ImagePlus, Link2, X } from 'lucide-react';
import { useLab } from '@/vendor/career-lab/lib/store';
import { now, today, uid, type Reflection } from '@/vendor/career-lab/lib/types';
import { PageHeader, Panel, Empty, Tag, LField, TextIn, TextArea, Select, Confirm } from '@/vendor/career-lab/components/lab/ui';
import { AiPanel } from '@/vendor/career-lab/components/lab/ai-panel';
import { Button } from '@/vendor/career-lab/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/vendor/career-lab/components/ui/dialog';
import { DialogLanguageHeader as DialogHeader } from '@/vendor/career-lab/components/lab/language-controls';
import { useToast } from '@/vendor/career-lab/hooks/use-toast';

const MAX_PHOTO = 1.5 * 1024 * 1024;
const dirLabel: Record<Reflection['direction'], string> = { '': '선택 안 함', more: '관심이 커졌어요', same: '비슷해요', less: '관심이 줄었어요', changed: '방향이 바뀌었어요' };
const blank = (activityId = '', title = ''): Reflection => ({ id: uid(), activityId, title, date: today(), did: '', role: '', fun: '', hard: '', learned: '', question: '', next: '', links: [], photo: '', direction: '', createdAt: '', updatedAt: '',storySelected:false,confirmation:{status:'pending',fingerprint:'',at:''} });

function RefForm({ initial, onSave, onClose }: { initial: Reflection; onSave: (r: Reflection) => void; onClose: () => void }) {
  const { state: s } = useLab();
  const [r, setR] = useState<Reflection>({...initial,storySelected:storyChoice(initial,s)}); const [link, setLink] = useState(''); const [msg, setMsg] = useState('');
  const [checked,setChecked]=useState(false);
  const set = (p: Partial<Reflection>) => {
    if(Object.keys(p).some(k=>!['storySelected','title'].includes(k)))setChecked(false);
    setR(x => ({ ...x, ...p }));
  };
  const onPhoto = (f?: File) => {
    setMsg(''); if (!f) return;
    if (!f.type.startsWith('image/')) return setMsg('이미지 파일만 올릴 수 있어요.');
    if (f.size > MAX_PHOTO) return setMsg('사진이 1.5MB보다 커요. 이 브라우저 저장 공간이 작아서, 크기를 줄인 사진이나 링크로 남겨 주세요.');
    const fr = new FileReader(); fr.onload = () => set({ photo: String(fr.result) }); fr.onerror = () => setMsg('사진을 읽지 못했어요.'); fr.readAsDataURL(f);
  };
  const act = s.activities.find(a => a.id === r.activityId);
  const Q = (k: keyof Reflection, label: string, hint?: string) => <LField label={label} hint={hint}><TextArea rows={2} value={r[k] as string} onChange={e => set({ [k]: e.target.value } as Partial<Reflection>)} data-testid={`input-ref-${k}`} /></LField>;
  return (
    <div className="space-y-4" data-testid="form-reflection">
      <ActivitySupport id="reflection-support" value={r.support} onChange={support=>set({support})} method={act?.practiceLinks?.[0]?.method} context={{activity:r.title,interests:s.interests.map(x=>x.text),strengths:confirmedPracticeStrengths(s).map(x=>x.text)}} />
      <div className="grid gap-3 md:grid-cols-[1fr_10rem]">
        <LField label="제목"><TextIn value={reflectionTitle(r,s.activities)} onChange={e => set({ title: e.target.value })} data-testid="input-ref-title" /></LField>
        <LField label="날짜"><TextIn type="date" value={r.date} onChange={e => set({ date: e.target.value })} /></LField>
      </div>
      <LField label="연결된 활동"><Select value={r.activityId} onChange={e => set({ activityId: e.target.value })} options={[{ value: '', label: '연결 없음 (직접 한 경험)' }, ...s.activities.map(a => ({ value: a.id, label: `${activityTitle(a)} (${a.date || '날짜 미정'})` }))]} /></LField>
      {act && <p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">계획했던 목적: {act.purpose || '없음'} · 출처: {act.sourceLabel}</p>}
      {Q('did', '실제로 한 일', '계획이 아니라 실제로 한 것만')}
      <LField label="경험의 상황"><Select value={r.practiceMode||'everyday'} onChange={e=>set({practiceMode:e.target.value as Reflection['practiceMode']})} options={[{value:'everyday',label:'일상 탐색·연습'},{value:'simulation',label:'가상 직무 상황 연습'}]} data-testid="reflection-practice-mode"/></LField>
      <p>가상 상황을 실제 기업 근무·직무 경험으로 쓰지 않아요.</p>
      <div className="grid gap-4 md:grid-cols-2">{Q('role', '나의 역할')}{Q('fun', '재미있었던 점')}{Q('hard', '어려웠던 점')}{Q('learned', '배운 것')}{Q('question', '새로 생긴 질문')}{Q('next', '다음 행동')}</div>
      <LField label="관심의 변화" hint="관심이 줄거나 방향이 바뀌는 것도 성장이에요."><Select value={r.direction} onChange={e => set({ direction: e.target.value as Reflection['direction'] })} options={(Object.keys(dirLabel) as Reflection['direction'][]).map(k => ({ value: k, label: dirLabel[k] }))} /></LField>
      <div>
        <p className="mb-1.5 text-sm font-semibold">결과물 링크</p>
        <div className="flex gap-2"><TextIn value={link} onChange={e => setLink(e.target.value)} placeholder="https://" data-testid="input-ref-link" /><Button type="button" variant="outline" onClick={() => { if (!/^https?:\/\//.test(link)) return setMsg('링크는 http(s):// 로 시작해야 해요.'); set({ links: [...r.links, link] }); setLink(''); setMsg(''); }}>추가</Button></div>
        <ul className="mt-2 space-y-1">{r.links.map((l, i) => <li key={i} className="flex items-center gap-2 text-sm"><Link2 className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 flex-1 break-all">{l}</span><button onClick={() => set({ links: r.links.filter((_, j) => j !== i) })} aria-label="링크 삭제"><X className="h-3.5 w-3.5" /></button></li>)}</ul>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-semibold">사진·결과물 이미지 (1.5MB 이하, 이 브라우저에만 저장)</p>
        {r.photo ? <div className="relative inline-block"><img src={r.photo} alt="회고 사진" className="max-h-40 rounded-lg border" /><button onClick={() => set({ photo: '' })} className="absolute right-1 top-1 rounded-full bg-foreground/70 p-1 text-background" aria-label="사진 제거"><X className="h-3.5 w-3.5" /></button></div>
          : <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-muted"><ImagePlus className="h-4 w-4" />사진 선택<input type="file" accept="image/*" className="sr-only" onChange={e => onPhoto(e.target.files?.[0])} data-testid="input-ref-photo" /></label>}
      </div>
      {msg && <p className="text-sm text-destructive" role="alert">{msg}</p>}
      <AiPanel task="reflect" testId="reflect" label="회고를 깊게 하는 질문 받기" desc="AI는 질문만 해요. 답은 내가 써요."
        getContext={() => ({ purpose: '학생이 쓴 회고를 읽고 더 깊이 생각할 짧은 질문 3~4개만 제안. 대신 답을 쓰거나 성과를 만들지 말 것.', activity: act ? { title: act.title, purpose: act.purpose } : null, reflection: { did: r.did, role: r.role, fun: r.fun, hard: r.hard, learned: r.learned, question: r.question } })}
        applyLabel="‘새로 생긴 질문’에 덧붙이기" onApply={x => set({ question: r.question ? `${r.question}\n${x}` : x })} />
      <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)} data-testid="reflection-performed-confirm"/>실제로 해 본 행동과 역할만 적었음을 확인해요.</label>
      <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={r.storySelected===true} onChange={e=>set({storySelected:e.target.checked})} data-testid="reflection-story-select"/>이 경험을 나의 이야기 근거로 선택해요.</label>
      <p>수행 응답을 고치면 이전 확인을 재검토해요. 새 회차에는 지난 수행 확인을 복사하지 않아요.</p>
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>취소</Button><Button onClick={() => {
        if (!r.did.trim()) return setMsg('실제로 한 일을 한 줄이라도 적어 주세요.');
        const existing=s.reflections.some(x=>x.id===r.id);
        const prepared={...r,practiceCardKeys:r.practiceCardKeys??(existing?[]:act?.practiceLinks?.map(x=>x.cardKey)||[])};
        const changed=reflectionFingerprint(prepared)!==reflectionFingerprint(initial);
        if((changed||!r.confirmation||!performedReflection(r))&&!checked)return setMsg('수정한 수행 내용을 다시 확인해 주세요.');
        onSave({...confirmReflection(prepared,initial),title:r.title.trim()||act?.title||'경험 기록',createdAt:r.createdAt||now(),updatedAt:now()});
      }} data-testid="button-save-reflection">저장</Button></div>
    </div>
  );
}

export default function Experiences() {
  const { state: s, update } = useLab();
  const [loc, nav] = useLocation();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Reflection | null>(null);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('activity');
    if (id) { const a = s.activities.find(x => x.id === id); setEditing({...blank(id, a ? `${a.title} 회고` : ''),practiceMode:a?.practiceLinks?.some(x=>x.mode==='simulation')?'simulation':'everyday'}); nav('/experiences', { replace: true }); }
  }, [loc]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = (r: Reflection) => {
    const existed = s.reflections.some(x => x.id === r.id);
    update(d => { const i = d.reflections.findIndex(x => x.id === r.id); if (i >= 0) d.reflections[i] = r; else d.reflections.push(r); });
    setEditing(null);
    toast({ title: existed ? '회고를 고쳤어요' : '회고를 저장했어요', description: s.story.paragraphs.length ? '나의 이야기에 반영할 후보로 표시돼요. 자동으로 바뀌지는 않아요.' : '진로 지도에 이어졌어요.' });
  };
  const doneNoRef = s.activities.filter(a => a.status === 'done' && !s.reflections.some(r => r.activityId === a.id));
  const sorted = [...s.reflections].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div>
      <PageHeader step="STEP 07" title="경험 기록" desc="계획이 아니라 실제로 한 일을 적어요. 재미없었다는 발견도, 방향이 바뀐 것도 소중한 기록이에요.">
        <Button onClick={() => setEditing(blank())} data-testid="button-new-reflection"><Plus className="h-4 w-4" />회고 쓰기</Button>
      </PageHeader>
      <Link href="/majors" className="mb-5 block rounded-xl border border-primary/30 bg-secondary/40 p-4 text-primary underline" data-testid="reflection-recommendations">회고와 연결되는 추가 학과 살펴보기</Link>
      <p className="mb-5 text-sm text-muted-foreground">계획만으로 경험을 만들지 않아요. 실제로 해 본 행동을 확인하고 배움·흥미·질문을 적으면 연결을 살펴봐요. 과제 완료와 수행 확인은 별개이며 기록이 적거나 어려워도 가능성을 줄이지 않아요.</p>
      {doneNoRef.length > 0 && (
        <Panel tone="coral" className="mb-6" title="회고를 기다리는 완료 활동">
          <div className="flex flex-wrap gap-2">{doneNoRef.map(a => <button key={a.id} onClick={() => setEditing(blank(a.id, `${a.title} 회고`))} className="rounded-full bg-card px-3 py-1.5 text-sm hover:ring-2 hover:ring-primary/30">{a.title} →</button>)}</div>
        </Panel>
      )}
      {sorted.length === 0 ? <Empty title="아직 회고가 없어요" desc="플래너에서 활동을 완료하거나, 이미 해 본 경험(수업·독서·동아리 등)을 바로 적어도 좋아요." action={<><Button onClick={() => setEditing(blank())}>회고 쓰기</Button><Link href="/planner"><Button variant="outline">플래너로</Button></Link></>} /> : (
        <div className="relative space-y-5 border-l-2 border-primary/20 pl-6">
          {sorted.map(r => {
            const act = s.activities.find(a => a.id === r.activityId);
            return (
              <article key={r.id} className="rise relative rounded-2xl border bg-card p-5" data-testid={`card-reflection-${r.id}`}>
                <span className="absolute -left-[33px] top-6 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary" />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><p className="font-mono text-xs text-muted-foreground">{r.date}</p><h3 className="text-lg font-bold">{reflectionTitle(r,s.activities)}</h3>{act && <p className="text-xs text-muted-foreground">활동: {activityTitle(act)} · 출처 {act.sourceLabel}</p>}</div>
                  <div className="flex items-center gap-1">{r.direction && <Tag tone={r.direction === 'more' ? 'teal' : 'coral'}>{dirLabel[r.direction]}</Tag>}
                    <button onClick={() => setEditing(r)} aria-label="수정" className="rounded p-2 hover:bg-muted" data-testid={`button-edit-reflection-${r.id}`}><Pencil className="h-4 w-4" /></button>
                    <Confirm title="회고를 삭제할까요?" desc="이 기록을 근거로 쓴 이야기 문단이 있다면 근거 표시가 사라져요." onConfirm={() => update(d => { d.reflections = d.reflections.filter(x => x.id !== r.id); })} trigger={o => <button onClick={o} aria-label="삭제" className="rounded p-2 hover:bg-muted hover:text-destructive" data-testid={`button-delete-reflection-${r.id}`}><Trash2 className="h-4 w-4" /></button>} />
                  </div>
                </div>
                <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
                  <div><dt>수행 확인·이야기 선택</dt><dd>{!r.confirmation?'이전 직접 기록 · 확인 가능':performedReflection(r)?'수행 내용 확인됨':'수행 내용 재확인 필요'} · {storyChoice(r,s)?'이야기 근거로 선택':'이야기에 사용 안 함'} · {r.practiceMode==='simulation'?'가상 직무 상황 연습':'일상 탐색·연습'}</dd>
                    {!!r.reviewHistory?.length&&<p>이전 확인 재검토 이력: {r.reviewHistory.length}</p>}
                  </div>
                  {([['한 일', r.did], ['역할', r.role], ['재미', r.fun], ['어려움', r.hard], ['배움', r.learned], ['새 질문', r.question], ['다음 행동', r.next]] as const).filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="text-xs font-semibold text-muted-foreground">{k}</dt><dd className="whitespace-pre-wrap">{v}</dd></div>)}
                </dl>
                {(r.photo || r.links.length > 0) && <div className="mt-3 flex flex-wrap items-center gap-3">{r.photo && <img src={r.photo} alt="" className="h-20 rounded-lg border" />}{r.links.map((l, i) => <a key={i} href={l} target="_blank" rel="noreferrer" className="text-sm text-primary underline">결과물 링크 {i + 1}</a>)}</div>}
              </article>
            );
          })}
        </div>
      )}
      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing && s.reflections.some(x => x.id === editing.id) ? '회고 수정' : '새 회고'}</DialogTitle><DialogDescription>짧아도 괜찮아요. 솔직한 기록이 가장 좋은 재료예요.</DialogDescription></DialogHeader>
          {editing && <RefForm key={editing.id} initial={editing} onSave={save} onClose={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
