import { useState } from 'react';
import { Save, CheckCircle2, Link2, Copy, FileDown, ClipboardCheck, Scissors } from 'lucide-react';
import { T } from '@/i18n/tx';
import { setState, getState, download, type Student, type Card } from '@/lib/store';
import type { PersonalWorksheet, PlannerActivity, WorksheetFields, PlannerFields, PerformanceRecord } from '@/lib/material-types';
import { saveWorksheet, savePlanner, connectWorksheet, plannerText, markRegistration } from '@/lib/materials';
import { CARD_KINDS } from '@/lib/cards';
import { Pill, Btn, Field, inputCls } from '@/components/shell';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/i18n/format';
import { MaterialLanguagePreview } from '@/components/material-language-preview';

const lines = (a: string[]) => a.join('\n');
const split = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function useApply() {
  const { toast } = useToast();
  return (fn: () => void, ok: string) => {
    try { fn(); toast({ title: ok }); return true; } catch (e) { toast({ title: T('처리하지 못했습니다'), description: T(errMsg(e)), variant: 'destructive' }); return false; }
  };
}

function Area({ label, value, onChange, rows = 3, testid }: { label: string; value: string; onChange: (v: string) => void; rows?: number; testid: string }) {
  return <Field label={label}><textarea rows={rows} className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid} /></Field>;
}

const REG_LABEL: Record<string, string> = { disconnected: '미연동', prepared: '등록용 텍스트 준비', copied: '복사함', exported: '파일로 내보냄', 'manual-confirmed': '교사 수동 입력 확인(외부 확인 아님)', registered: '외부 등록 기록' };
const REC_LABEL: Record<PerformanceRecord['state'], string> = { planned: '계획', 'in-progress': '진행 중', performed: '수행 완료' };
export const recLabel = (s: PerformanceRecord['state']) => T(REC_LABEL[s]);
export const regLabel = (s: string) => T(REG_LABEL[s] ?? s);

/* ---------------- Worksheet ---------------- */
export function WorksheetEditor({ ws, student, activities, legacy }: { ws: PersonalWorksheet; student: Student; activities: PlannerActivity[]; legacy: Card[] }) {
  const apply = useApply();
  const [f, setF] = useState<WorksheetFields>(() => structuredClone(ws.fields));
  const [reason, setReason] = useState('');
  const [ack, setAck] = useState(false);
  const [pick, setPick] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newKind, setNewKind] = useState(0);
  const up = (p: Partial<WorksheetFields>) => setF((x) => ({ ...x, ...p }));
  const tid = ws.id;
  const save = (status: 'draft' | 'confirmed') => {
    if (status === 'confirmed' && ws.source === 'general-review' && !ack) return;
    if (apply(() => setState((s) => saveWorksheet(s, ws.id, f, reason || (status === 'confirmed' ? T('교사 검토 후 확정') : ''), status)), status === 'confirmed' ? T('활동지를 확정했습니다') : T('활동지를 저장했습니다'))) setReason('');
  };
  const linked = activities.filter((a) => a.worksheetIds.includes(ws.id));
  const others = activities.filter((a) => !a.worksheetIds.includes(ws.id));
  const importable = legacy.filter((c) => !activities.some((a) => a.legacyCardId === c.id && a.worksheetIds.includes(ws.id)));
  const connect = () => {
    if (!pick) return;
    const [k, id] = pick.split(':');
    apply(() => setState((s) => connectWorksheet(s, ws.id, k === 'a' ? { activityId: id } : { legacyCardId: id, lang: ws.lang })), T('연결했습니다'));
    setPick('');
  };
  const split2 = () => {
    if (!newTitle.trim()) return;
    if (!confirm(T('이 활동지에서 새 플래너 활동 "{0}"을(를) 따로 만들까요? 같은 제목의 활동이 있으면 새로 만들지 않고 그 활동에 연결합니다.', newTitle.trim()))) return;
    apply(() => setState((s) => connectWorksheet(s, ws.id, { newTitle: newTitle.trim(), allowNew: true, kind: newKind, lang: ws.lang })), T('새 활동을 만들어 연결했습니다'));
    setNewTitle('');
  };
  return (
    <div className="space-y-3" data-testid={`editor-worksheet-${tid}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={ws.status === 'confirmed' ? 'blue' : 'orange'}>{ws.status === 'confirmed' ? T('확정') : T('초안')}</Pill>
        <span data-testid={`text-current-version-${ws.id}`}><Pill tone="gray">v{ws.versions.at(-1)?.version ?? 1}</Pill></span>
        <Pill tone="gray">{ws.templateId}</Pill>
        {ws.source === 'general-review' && <Pill tone="red">{T('직무 과제 없음 · 일반 검토 자료')}</Pill>}
        <span className="text-xs text-muted-foreground">{[ws.context.family, ws.context.job, ws.context.task].filter(Boolean).join(' / ') || T('개인 직무 미선택')}</span>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <Field label={T('제목')}><input className={inputCls} value={f.title} onChange={(e) => up({ title: e.target.value })} data-testid={`ws-title-${tid}`} /></Field>
        <Field label={T('관심 직무·과제')}><input className={inputCls} value={f.job} onChange={(e) => up({ job: e.target.value })} data-testid={`ws-job-${tid}`} /></Field>
      </div>
      <Area label={T('목표')} value={f.goal} onChange={(v) => up({ goal: v })} rows={2} testid={`ws-goal-${tid}`} />
      <Field label={T('읽기 자료 제목')}><input className={inputCls} value={f.readingTitle} onChange={(e) => up({ readingTitle: e.target.value })} data-testid={`ws-reading-title-${tid}`} /></Field>
      <Area label={T('읽기 자료 (전체 원문은 활동지에만 실립니다)')} value={f.reading} onChange={(v) => up({ reading: v })} rows={6} testid={`ws-reading-${tid}`} />
      <div className="grid gap-2 md:grid-cols-2">
        <Area label={T('질문 (한 줄에 하나)')} value={lines(f.questions)} onChange={(v) => up({ questions: split(v) })} rows={4} testid={`ws-questions-${tid}`} />
        <Area label={T('활동 (한 줄에 하나)')} value={lines(f.actions)} onChange={(v) => up({ actions: split(v) })} rows={4} testid={`ws-actions-${tid}`} />
        <Area label={T('도움 (한 줄에 하나)')} value={lines(f.help)} onChange={(v) => up({ help: split(v) })} rows={3} testid={`ws-help-${tid}`} />
        <Area label={T('학생 답 (학생이 쓴 글 · 자동 번역 안 함)')} value={f.answer} onChange={(v) => up({ answer: v })} rows={3} testid={`ws-answer-${tid}`} />
        <Area label={T('산출물')} value={f.deliverable} onChange={(v) => up({ deliverable: v })} rows={2} testid={`ws-deliverable-${tid}`} />
        <Area label={T('확인 기준')} value={f.criterion} onChange={(v) => up({ criterion: v })} rows={2} testid={`ws-criterion-${tid}`} />
      </div>
      <Field label={T('수정 사유 (저장할 때 필수)')}><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} data-testid={`ws-reason-${tid}`} /></Field>
      {ws.source === 'general-review' && <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} data-testid={`ws-ack-general-${tid}`} />{T('직무 과제 없이 만든 일반 검토 자료임을 확인했고, 이 학생에게 맞게 검토했습니다.')}</label>}
      <div className="flex flex-wrap gap-2">
        <Btn variant="outline" disabled={!reason.trim()} onClick={() => save('draft')} data-testid={`button-ws-save-${tid}`}><Save className="h-4 w-4" />{T('초안 저장')}</Btn>
        <Btn disabled={ws.source === 'general-review' && !ack} onClick={() => save('confirmed')} data-testid={`button-ws-confirm-${tid}`}><CheckCircle2 className="h-4 w-4" />{T('검토 후 확정')}</Btn>
      </div>

      <div className="rounded-lg border border-dashed p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-sm font-bold"><Link2 className="h-4 w-4" />{T('플래너 활동 연결')}</div>
        <p className="text-xs text-muted-foreground">{T('활동지와 카드는 같은 문서가 아닙니다. 한 활동지에 여러 활동을, 한 활동에 여러 활동지를 연결할 수 있습니다.')}</p>
        {linked.length ? <ul className="flex flex-wrap gap-1.5 text-xs">{linked.map((a) => <li key={a.id} className="rounded border px-2 py-0.5" data-testid={`ws-linked-${tid}-${a.id}`}>{a.fields.title} <span className="font-mono text-muted-foreground">{a.id}</span></li>)}</ul> : <p className="text-xs">{T('연결된 활동 없음')}</p>}
        <div className="flex flex-wrap gap-2">
          <select className={cn(inputCls, 'w-auto min-w-[220px]')} value={pick} onChange={(e) => setPick(e.target.value)} data-testid={`select-connect-${tid}`}>
            <option value="">{T('기존 활동 또는 이전 카드 선택')}</option>
            {others.length > 0 && <optgroup label={T('기존 플래너 활동')}>{others.map((a) => <option key={a.id} value={`a:${a.id}`}>{a.fields.title}</option>)}</optgroup>}
            {importable.length > 0 && <optgroup label={T('이전 직무 카드 가져오기 (원본 유지)')}>{importable.map((c) => <option key={c.id} value={`c:${c.id}`}>{T(c.kind)} · {c.fields.todayGoal.slice(0, 30)} · {c.id}</option>)}</optgroup>}
          </select>
          <Btn variant="outline" disabled={!pick} onClick={connect} data-testid={`button-connect-${tid}`}>{T('연결')}</Btn>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className={cn(inputCls, 'w-auto flex-1 min-w-[180px]')} placeholder={T('새로 나눌 구체 활동 제목')} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} data-testid={`input-split-title-${tid}`} />
          <select className={cn(inputCls, 'w-auto')} value={newKind} onChange={(e) => setNewKind(Number(e.target.value))} data-testid={`select-split-kind-${tid}`}>{CARD_KINDS.map((k, i) => <option key={k} value={i}>{T(k)}</option>)}</select>
          <Btn variant="ghost" disabled={!newTitle.trim()} onClick={split2} data-testid={`button-split-${tid}`}><Scissors className="h-4 w-4" />{T('새 활동으로 나누기')}</Btn>
        </div>
      </div>
      <MaterialLanguagePreview id={ws.id} kind="worksheet" docLang={ws.lang} />
      {ws.versions.length > 0 && <details className="text-xs"><summary className="cursor-pointer font-semibold">{T('버전 이력 {0}건', ws.versions.length)}</summary><ul className="mt-1 space-y-0.5">{ws.versions.map((v) => <li key={v.version}><span className="font-mono">v{v.version}</span> {formatDateTime(v.at)} · {v.reason}</li>)}</ul></details>}
      <span className="sr-only">{student.code}</span>
    </div>
  );
}

/* ---------------- Planner ---------------- */
export function PlannerEditor({ act, student, worksheets }: { act: PlannerActivity; student: Student; worksheets: PersonalWorksheet[] }) {
  const apply = useApply();
  const [f, setF] = useState<PlannerFields>(() => structuredClone(act.fields));
  const [r, setR] = useState<PerformanceRecord>(() => structuredClone(act.record));
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState(false);
  const [manualAck, setManualAck] = useState(false);
  const up = (p: Partial<PlannerFields>) => setF((x) => ({ ...x, ...p }));
  const ur = (p: Partial<PerformanceRecord>) => setR((x) => ({ ...x, ...p }));
  const tid = act.id;
  const performedProblems = r.state !== 'performed' ? [] : [
    !r.actual.trim() && T('실제로 한 일을 적어야 합니다.'),
    !r.confirmedBy && T('교사 또는 학생 확인이 필요합니다.'),
    r.source === 'paper' && !r.paperConfirmed && T('종이 기록을 옮겨 적었음을 확인해야 합니다.'),
  ].filter(Boolean) as string[];
  const save = (status: 'draft' | 'confirmed') => {
    if (performedProblems.length) return;
    if (apply(() => setState((s) => savePlanner(s, act.id, f, r, reason || (status === 'confirmed' ? T('교사 검토 후 확정') : ''), status)), status === 'confirmed' ? T('활동 카드를 확정했습니다') : T('활동 카드를 저장했습니다'))) setReason('');
  };
  const linkedWs = worksheets.filter((w) => act.worksheetIds.includes(w.id));
  const text = () => plannerText(act, getState().personalWorksheets, student);
  const mark = (a: 'prepared' | 'copied' | 'exported' | 'manual-confirmed') => setState((s) => ({ ...s, plannerActivities: s.plannerActivities.map((x) => (x.id === act.id ? markRegistration(x, a) : x)) }));
  const { toast } = useToast();
  const copy = async () => {
    try { await navigator.clipboard.writeText(text()); mark('copied'); toast({ title: T('클립보드에 복사했습니다') }); }
    catch { toast({ title: T('복사하지 못했습니다. 미리보기에서 직접 선택해 복사하세요.'), variant: 'destructive' }); }
  };
  const exp = (kind: 'txt' | 'json') => {
    const name = `planner-${student.code || student.id}-${act.id}.${kind}`;
    download(kind === 'txt' ? new Blob([text()], { type: 'text/plain;charset=utf-8' }) : new Blob([JSON.stringify({ activity: act, worksheets: linkedWs, studentCode: student.code, note: 'local export, not registered externally' }, null, 2)], { type: 'application/json' }), name);
    mark('exported');
  };
  return (
    <div className="space-y-3" data-testid={`editor-planner-${tid}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={act.status === 'confirmed' ? 'blue' : 'orange'}>{act.status === 'confirmed' ? T('확정') : T('초안')}</Pill>
        <span data-testid={`text-current-version-${act.id}`}><Pill tone="gray">v{act.versions.at(-1)?.version ?? 1}</Pill></span>
        {act.kind !== null && <Pill tone="gray">{T(CARD_KINDS[act.kind] ?? '')}</Pill>}
        {act.legacyCardId && <Pill tone="gray">{T('이전 카드에서 가져옴')} · {act.legacyCardId}</Pill>}
        <Pill tone={act.record.state === 'performed' ? 'blue' : act.record.state === 'in-progress' ? 'orange' : 'gray'}>{recLabel(act.record.state)}</Pill>
      </div>
      <div className="text-xs">{T('연결된 활동지')}: {linkedWs.length ? linkedWs.map((w) => <span key={w.id} className="me-2 rounded border px-1.5 font-mono">{w.fields.title || w.id}</span>) : T('없음')}</div>
      <div className="grid gap-2 md:grid-cols-2">
        <Field label={T('활동 제목')}><input className={inputCls} value={f.title} onChange={(e) => up({ title: e.target.value })} data-testid={`pl-title-${tid}`} /></Field>
        <Field label={T('관심 직무')}><input className={inputCls} value={f.job} onChange={(e) => up({ job: e.target.value })} data-testid={`pl-job-${tid}`} /></Field>
        <Area label={T('목표')} value={f.goal} onChange={(v) => up({ goal: v })} rows={2} testid={`pl-goal-${tid}`} />
        <Area label={T('이유')} value={f.reason} onChange={(v) => up({ reason: v })} rows={2} testid={`pl-reason-${tid}`} />
        <Field label={T('날짜')}><input type="date" className={inputCls} value={f.date} onChange={(e) => up({ date: e.target.value })} data-testid={`pl-date-${tid}`} /></Field>
        <Field label={T('시간(분)')}><input type="number" min={0} className={inputCls} value={f.minutes} onChange={(e) => up({ minutes: Math.max(0, Number(e.target.value) || 0) })} data-testid={`pl-minutes-${tid}`} /></Field>
        <Area label={T('범위')} value={f.scope} onChange={(v) => up({ scope: v })} rows={2} testid={`pl-scope-${tid}`} />
        <Area label={T('첫 행동')} value={f.firstAction} onChange={(v) => up({ firstAction: v })} rows={2} testid={`pl-first-${tid}`} />
        <Area label={T('단계 (한 줄에 하나)')} value={lines(f.steps)} onChange={(v) => up({ steps: split(v) })} rows={4} testid={`pl-steps-${tid}`} />
        <Area label={T('도움 (한 줄에 하나)')} value={lines(f.help)} onChange={(v) => up({ help: split(v) })} rows={4} testid={`pl-help-${tid}`} />
        <Area label={T('확인 기준')} value={f.criterion} onChange={(v) => up({ criterion: v })} rows={2} testid={`pl-criterion-${tid}`} />
        <Area label={T('다음 행동 (계획)')} value={f.nextAction} onChange={(v) => up({ nextAction: v })} rows={2} testid={`pl-next-${tid}`} />
      </div>

      <fieldset className="rounded-lg border p-3 space-y-2" data-testid={`record-${tid}`}>
        <legend className="px-1 text-sm font-bold">{T('실행 기록')}</legend>
        <div className="flex flex-wrap gap-1.5" role="radiogroup">
          {(['planned', 'in-progress', 'performed'] as const).map((st) => <button key={st} type="button" role="radio" aria-checked={r.state === st} onClick={() => ur({ state: st })} data-testid={`button-rec-${st}-${tid}`} className={cn('rounded-full border px-3 py-1 text-xs font-semibold', r.state === st ? 'bg-primary text-primary-foreground border-primary' : 'bg-card')}>{recLabel(st)}</button>)}
        </div>
        <p className="text-xs text-muted-foreground">{T('수행 완료는 실제 행동과 교사·학생 확인이 있어야 합니다. 경험 기록은 자동으로 만들지 않으며 기존 경험·글은 바꾸지 않습니다.')}</p>
        <div className="grid gap-2 md:grid-cols-2">
          <Area label={T('실제로 한 일')} value={r.actual} onChange={(v) => ur({ actual: v })} rows={2} testid={`rec-actual-${tid}`} />
          <Area label={T('바뀐 방법')} value={r.changedMethod} onChange={(v) => ur({ changedMethod: v })} rows={2} testid={`rec-changed-${tid}`} />
          <Area label={T('산출물')} value={r.artifact} onChange={(v) => ur({ artifact: v })} rows={2} testid={`rec-artifact-${tid}`} />
          <Area label={T('피드백')} value={r.feedback} onChange={(v) => ur({ feedback: v })} rows={2} testid={`rec-feedback-${tid}`} />
          <Area label={T('다음 행동 (실행 후)')} value={r.nextAction} onChange={(v) => ur({ nextAction: v })} rows={2} testid={`rec-next-${tid}`} />
          <div className="space-y-2">
            <Field label={T('확인한 사람')}><select className={inputCls} value={r.confirmedBy} onChange={(e) => ur({ confirmedBy: e.target.value as PerformanceRecord['confirmedBy'] })} data-testid={`rec-confirmed-by-${tid}`}><option value="">{T('아직 확인 안 함')}</option><option value="teacher">{T('교사')}</option><option value="student">{T('학생')}</option></select></Field>
            <Field label={T('기록 출처')}><select className={inputCls} value={r.source} onChange={(e) => ur({ source: e.target.value as PerformanceRecord['source'], paperConfirmed: false })} data-testid={`rec-source-${tid}`}><option value="screen">{T('화면 입력')}</option><option value="paper">{T('종이 기록 옮겨 적기')}</option></select></Field>
            {r.source === 'paper' && <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={r.paperConfirmed} onChange={(e) => ur({ paperConfirmed: e.target.checked })} data-testid={`rec-paper-${tid}`} />{T('학생의 종이 기록을 그대로 옮겨 적었음을 확인합니다.')}</label>}
          </div>
        </div>
        {performedProblems.length > 0 && <ul className="rounded bg-destructive/10 p-2 text-xs text-destructive" data-testid={`rec-problems-${tid}`}>{performedProblems.map((p) => <li key={p}>{p}</li>)}</ul>}
      </fieldset>

      <Field label={T('수정 사유 (저장할 때 필수)')}><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} data-testid={`pl-edit-reason-${tid}`} /></Field>
      <div className="flex flex-wrap gap-2">
        <Btn variant="outline" disabled={!reason.trim() || performedProblems.length > 0} onClick={() => save('draft')} data-testid={`button-pl-save-${tid}`}><Save className="h-4 w-4" />{T('초안 저장')}</Btn>
        <Btn disabled={performedProblems.length > 0} onClick={() => save('confirmed')} data-testid={`button-pl-confirm-${tid}`}><CheckCircle2 className="h-4 w-4" />{T('검토 후 확정')}</Btn>
      </div>

      <div className="rounded-lg border border-dashed p-3 space-y-2" data-testid={`registration-${tid}`}>
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold">{T('플래너 등록 준비')}<Pill tone="gray">{T('외부 플래너 미연동')}</Pill><Pill tone="orange">{regLabel(act.registration.state)}</Pill></div>
        <p className="text-xs text-muted-foreground">{T('등록 상태는 실행 상태와 다릅니다. 외부 등록은 연결되지 않았으며, 학생 계정 내려받기는 인증 연동이 필요해 아직 준비되지 않았습니다.')}</p>
        <div className="flex flex-wrap gap-2">
          <Btn variant="outline" onClick={() => { setPreview((p) => !p); if (!preview && act.registration.state === 'disconnected') mark('prepared'); }} data-testid={`button-reg-preview-${tid}`}>{T('등록용 텍스트 미리보기')}</Btn>
          <Btn variant="ghost" onClick={copy} data-testid={`button-reg-copy-${tid}`}><Copy className="h-4 w-4" />{T('복사')}</Btn>
          <Btn variant="ghost" onClick={() => exp('txt')} data-testid={`button-reg-txt-${tid}`}><FileDown className="h-4 w-4" />TXT</Btn>
          <Btn variant="ghost" onClick={() => exp('json')} data-testid={`button-reg-json-${tid}`}><FileDown className="h-4 w-4" />JSON</Btn>
        </div>
        {preview && <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs" data-testid={`reg-text-${tid}`}>{text()}</pre>}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={manualAck} onChange={(e) => setManualAck(e.target.checked)} data-testid={`check-reg-manual-${tid}`} />{T('제가 직접 플래너에 입력했습니다. 앱은 외부 등록을 확인하지 않았습니다.')}</label>
          <Btn variant="ghost" disabled={!manualAck} onClick={() => { mark('manual-confirmed'); setManualAck(false); }} data-testid={`button-reg-manual-${tid}`}><ClipboardCheck className="h-4 w-4" />{T('수동 입력 확인 표시')}</Btn>
        </div>
      </div>
      <MaterialLanguagePreview id={act.id} kind="card" docLang={act.lang} />
      {act.versions.length > 0 && <details className="text-xs"><summary className="cursor-pointer font-semibold">{T('버전 이력 {0}건', act.versions.length)}</summary><ul className="mt-1 space-y-0.5">{act.versions.map((v) => <li key={v.version}><span className="font-mono">v{v.version}</span> {formatDateTime(v.at)} · {v.reason} · {recLabel(v.record.state)}</li>)}</ul></details>}
    </div>
  );
}
