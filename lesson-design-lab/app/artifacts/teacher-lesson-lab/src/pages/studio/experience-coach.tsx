import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Save, ShieldCheck, X, MessageCircleQuestion } from 'lucide-react';
import { formatDateTime } from '@/i18n/format';
import { coachText, stageCoach } from '@/i18n/experience-coach';
import { getExperienceNote, saveExperienceNote, confirmExperienceSource, experienceSourceState, coachQuestions, emptyExperienceNote } from '@/lib/studio';
import type { Course, ExperienceNoteData } from '@/lib/studio/types';
import { toast } from '@/hooks/use-toast';
import { Btn, Pill, inputCls } from '@/components/shell';
import { cn } from '@/lib/utils';
import { Check, act, useDraft, useStudio, tryOr } from './common';

const FIELDS = ['situation', 'roleGoal', 'action', 'result', 'learning', 'evidence'] as const;
type Field = (typeof FIELDS)[number];
const PURPOSES = ['experience', 'motivation', 'values', 'plan', 'custom'] as const;
const MODES = ['auto', 'star', 'purpose', 'none'] as const;
const SOURCES = ['actual', 'simulation', 'unverified'] as const;
const OPTIONAL: Field[] = ['situation', 'roleGoal'];

/* Caret memory: the app remounts the tree on language switch. The last focused textarea and its
   selection are kept in localStorage and restored on remount only if it was focused moments before. */
const CK = 'lesson-lab-studio-draft:draft-coach-position';
type Caret = { id: string; start: number; end: number; focused: boolean; at: number };
const readCaret = (): Caret | null => { try { const r = localStorage.getItem(CK); return r ? (JSON.parse(r) as Caret) : null; } catch { return null; } };
const writeCaret = (c: Caret) => { try { localStorage.setItem(CK, JSON.stringify(c)); } catch { /* ignore */ } };

export function CaretArea({ id, value, onChange, rows, label, hint, testid, placeholder }: { id: string; value: string; onChange: (v: string) => void; rows: number; label: string; hint?: string; testid: string; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const c = readCaret(); const el = ref.current;
    if (!el || !c || c.id !== id) return;
    if (c.focused || Date.now() - c.at < 4000) {
      el.focus({ preventScroll: true });
      const len = el.value.length; el.setSelectionRange(Math.min(c.start, len), Math.min(c.end, len));
    }
  }, [id]);
  const mark = (focused: boolean) => { const el = ref.current; if (el) writeCaret({ id, start: el.selectionStart, end: el.selectionEnd, focused, at: Date.now() }); };
  return (
    <label className="block text-sm">
      <span className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">{label}{hint && <span className="text-[11px] font-normal">· {hint}</span>}</span>
      <textarea ref={ref} data-testid={testid} rows={rows} value={value} placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); mark(true); }} onSelect={() => mark(true)} onFocus={() => mark(true)} onBlur={() => mark(false)}
        className={cn(inputCls, 'resize-y leading-6')} />
    </label>
  );
}

export default function ExperienceCoach({ course, sid }: { course: Course; sid: string }) {
  const { s } = useStudio();
  const note = tryOr(() => getExperienceNote(s, course.id, sid), null);
  const init = (): ExperienceNoteData => {
    const base = emptyExperienceNote();
    if (!note) return base;
    const { purpose, customPurpose, mode, expanded, questionIndex, fields, sourceKind, factId, includePrint, shareNotes } = note;
    return { purpose, customPurpose, mode, expanded, questionIndex, fields: { ...base.fields, ...fields }, sourceKind, factId, includePrint, shareNotes };
  };
  const [d, setD] = useDraft<ExperienceNoteData>(`coaching-${course.id}-${sid}`, init);
  const [savedSig, setSavedSig] = useState(() => (note ? JSON.stringify(init()) : ''));
  const set = (p: Partial<ExperienceNoteData>) => setD((x) => ({ ...x, ...p }));
  const setField = (k: Field, v: string) => setD((x) => ({ ...x, fields: { ...x.fields, [k]: v } }));
  const facts = s.studio.facts.filter((f) => f.courseId === course.id && f.studentId === sid && f.studentConfirmed && !f.withdrawn);
  const sc = stageCoach(course.stage);
  const effective = d.mode === 'auto' ? (d.purpose === 'experience' ? 'star' : 'purpose') : d.mode;
  const qi = Math.max(0, Math.min(5, d.questionIndex));
  const purposeQ = effective === 'purpose' ? tryOr(() => coachQuestions(d, course.stage), [] as string[]) : [];
  const srcState = note?.factId===d.factId ? tryOr(() => experienceSourceState(s, note), 'none' as const) : d.factId?'unconfirmed':'none';
  const dirty = JSON.stringify(d) !== savedSig;
  const linked = facts.find((f) => f.id === d.factId);

  const save = () => {
    if (act((st) => saveExperienceNote(st, course.id, sid, d))) { setSavedSig(JSON.stringify(d)); toast({ title: coachText('saved') }); }
  };
  const confirm = () => { if (act((st) => confirmExperienceSource(st, course.id, sid))) toast({ title: coachText('sourceCurrent') }); };

  const srcLabel = { none: '', unconfirmed: 'sourceUnconfirmed', changed: 'sourceChanged', withdrawn: 'sourceWithdrawn', current: 'sourceCurrent' }[srcState];
  const fieldArea = (k: Field, rows = 2) => (
    <CaretArea key={k} id={`coach-${course.id}-${sid}-${k}`} rows={rows} label={coachText(k)} hint={OPTIONAL.includes(k) ? coachText('optional') : undefined} value={d.fields[k]} onChange={(v) => setField(k, v)} testid={`coach-field-${k}`} />
  );

  return (
    <section className="rounded-xl border bg-card p-4 md:p-5" data-testid="panel-experience-coach" aria-labelledby="coach-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="coach-title" className="flex items-center gap-2 font-bold"><MessageCircleQuestion className="h-4 w-4 text-[hsl(var(--sidebar-primary))]" />{coachText('title')} <Pill tone="gray">{coachText('optional')}</Pill></h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{coachText('writeFreely')} · {coachText('notesPrivate')} · {coachText('local')}</p>
        </div>
        <div className="flex gap-2">
          {d.expanded
            ? <><Btn variant="ghost" onClick={() => set({ expanded: false })} data-testid="coach-skip">{coachText('skip')}</Btn><Btn variant="outline" onClick={() => set({ expanded: false })} data-testid="coach-expanded" aria-expanded="true"><X className="h-4 w-4" />{coachText('close')}</Btn></>
            : <Btn variant="outline" onClick={() => set({ expanded: true })} data-testid="coach-expanded" aria-expanded="false">{coachText('open')}</Btn>}
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <label className="text-sm"><span className="mb-1 block text-[13px] font-semibold text-muted-foreground">{coachText('purpose')}</span>
          <select data-testid="coach-purpose" value={d.purpose} onChange={(e) => set({ purpose: e.target.value as ExperienceNoteData['purpose'] })} className={inputCls}>{PURPOSES.map((p) => <option key={p} value={p}>{coachText(p)}</option>)}</select></label>
        <label className="text-sm"><span className="mb-1 block text-[13px] font-semibold text-muted-foreground">{coachText('mode')}</span>
          <select data-testid="coach-mode" value={d.mode} onChange={(e) => set({ mode: e.target.value as ExperienceNoteData['mode'] })} className={inputCls}>{MODES.map((m) => <option key={m} value={m}>{coachText(m === 'purpose' ? 'purposeHelp' : m)}</option>)}</select></label>
        <label className="text-sm"><span className="mb-1 block text-[13px] font-semibold text-muted-foreground">{coachText('sourceKind')}</span>
          <select data-testid="coach-source-kind" value={linked?.simulation?'simulation':d.sourceKind} onChange={(e) => set({ sourceKind: linked?.simulation?'simulation':e.target.value as ExperienceNoteData['sourceKind'] })} className={inputCls}>{SOURCES.map((k) => <option key={k} value={k}>{coachText(k === 'actual' ? 'sourceActual' : k === 'simulation' ? 'sourceSimulation' : 'sourceUnverified')}</option>)}</select></label>
      </div>
      {d.mode === 'auto' && <p className="mt-1 text-[11px] text-muted-foreground">{coachText('autoStarNote')}</p>}
      {d.purpose === 'custom' && <div className="mt-2"><CaretArea id={`coach-${course.id}-${sid}-purpose`} rows={1} label={coachText('customPurpose')} value={d.customPurpose} onChange={(v) => set({ customPurpose: v })} testid="coach-custom-purpose" /></div>}

      {d.expanded && (
        <div className="mt-4 rounded-lg border-s-4 border-[hsl(var(--sidebar-primary))] bg-secondary/40 p-3 rise" data-testid="coach-guide">
          <dl className="grid gap-2 text-xs md:grid-cols-3">
            {(['reading', 'help', 'deliverable'] as const).map((k) => <div key={k}><dt className="font-mono text-[10px] uppercase tracking-widest text-primary">{coachText(k)}</dt><dd className="mt-0.5 leading-5" data-testid={`coach-stage-${k}`}>{sc[k]}</dd></div>)}
          </dl>
          <div className="mt-3 border-t pt-3">
            {effective === 'none' && <p className="text-sm text-muted-foreground">{coachText('noQuestions')}</p>}
            {effective === 'star' && (
              <div aria-live="polite">
                <div className="flex items-center justify-between gap-2"><span className="font-mono text-[11px] text-muted-foreground" data-testid="coach-question-index">{coachText('questionOf', undefined, qi + 1, 6)}</span><Pill tone="gray">{coachText('star')}</Pill></div>
                <p className="mt-1 font-semibold" data-testid="coach-question">{sc.questions[qi]}</p>
                <div className="mt-2">{fieldArea(FIELDS[qi], 3)}</div>
                <div className="mt-2 flex gap-2">
                  <Btn variant="ghost" disabled={qi === 0} onClick={() => set({ questionIndex: qi - 1 })} data-testid="coach-prev"><ChevronLeft className="h-4 w-4 rtl:rotate-180" />{coachText('prev')}</Btn>
                  <Btn variant="outline" disabled={qi === 5} onClick={() => set({ questionIndex: qi + 1 })} data-testid="coach-next">{coachText('next')}<ChevronRight className="h-4 w-4 rtl:rotate-180" /></Btn>
                </div>
              </div>
            )}
            {effective === 'purpose' && purposeQ.map((q) => <p key={q} className="font-semibold" data-testid="coach-question">{q}</p>)}
          </div>
        </div>
      )}

      {!(d.expanded && effective === 'star') && <div className="mt-4 grid gap-2 md:grid-cols-2">{FIELDS.map((k) => fieldArea(k))}</div>}

      <div className="mt-4 grid gap-3 border-t pt-3 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <label className="block text-sm"><span className="mb-1 block text-[13px] font-semibold text-muted-foreground">{coachText('linkFact')}</span>
            <select data-testid="coach-fact" value={d.factId} onChange={(e) => set({ factId: e.target.value,sourceKind:facts.find(f=>f.id===e.target.value)?.simulation?'simulation':'unverified' })} className={inputCls}>
              <option value="">{coachText('noFact')}</option>
              {facts.map((f) => <option key={f.id} value={f.id}>{f.action} → {f.result}{f.simulation ? ` · ${coachText('sourceSimulation')}` : ''}</option>)}
            </select></label>
          {d.factId && (
            <div className="flex flex-wrap items-center gap-2 text-xs" data-testid="coach-source-state">
              <Pill tone={srcState === 'current' ? 'blue' : srcState === 'withdrawn' ? 'red' : 'orange'}>{srcLabel ? coachText(srcLabel) : coachText('sourceUnconfirmed')}</Pill>
              {linked && note?.factId === d.factId && srcState !== 'current' && <Btn variant="outline" onClick={confirm} data-testid="coach-source-confirm"><ShieldCheck className="h-4 w-4" />{coachText('reconfirm')}</Btn>}
              <span className="text-muted-foreground">{coachText('checkFacts')}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-4">
            <Check label={coachText('printNotes')} checked={d.includePrint} onChange={(v) => set({ includePrint: v })} testid="coach-print" />
            <Check label={coachText('sharedNotes')} checked={d.shareNotes} onChange={(v) => set({ shareNotes: v })} testid="coach-share" />
          </div>
          <p className="text-[11px] text-muted-foreground">{coachText('noAuto')}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Btn onClick={save} data-testid="coach-save"><Save className="h-4 w-4" />{coachText('save')}</Btn>
          <span className="font-mono text-[11px] text-muted-foreground" data-testid="coach-save-state">{dirty ? coachText('unsaved') : note ? coachText('lastSaved', undefined, formatDateTime(note.updatedAt)) : ''}</span>
        </div>
      </div>
    </section>
  );
}
