import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Eye, X } from 'lucide-react';
import { T, txLang } from '@/i18n/tx';
import { LANGS } from '@/i18n/ui';
import { MaterialLanguagePreview } from '@/components/material-language-preview';
import { getState } from '@/lib/store';
import { coursePrint } from '@/lib/studio';
import { buildMaterialBundle } from '@/lib/material-print';
import type { MaterialBundle, MaterialPrintMode, CardLayout } from '@/lib/material-types';
import { MaterialPages } from '@/components/material-pages';
import { Btn, Pill } from '@/components/shell';
import { cn } from '@/lib/utils';
import { StudioFrame, Section, act, useDraft, useStudio, Empty, errText, studentName } from './common';

type Kind = 'guide' | 'blank' | 'example' | 'summary' | 'consultation' | 'feedback' | 'comparison' | 'interview';
const KINDS: [Kind, string, boolean][] = [['guide', '진행 안내', false], ['blank', '빈 활동지', false], ['example', '예시', false], ['summary', '개인 요약 (공유 범위만)', true], ['consultation', '상담 기록 (공유 범위만)', true], ['feedback', '피드백', false], ['comparison', '버전 비교 (공유 범위만)', true], ['interview', '모의 면접', false]];

export default function StudioPrint() {
  const { s, course, actor } = useStudio();
  const roster = course ? s.students.filter((x) => course.studentIds.includes(x.id)) : [];
  const [kind, setKind] = useDraft<Kind>('print-kind', 'guide');
  const [ids, setIds] = useDraft<string[]>(`print-ids-${course?.id ?? ''}`, []);
  const [mode, setMode] = useDraft<MaterialPrintMode>('print-mode', 'both');
  const [layout, setLayout] = useDraft<CardLayout>('print-layout', 'A4');
  const [ws, setWs] = useDraft<string[]>('print-ws', []);
  const [acts, setActs] = useDraft<string[]>('print-acts', []);
  const [bundle, setBundle] = useState<MaterialBundle | null>(null);
  const [printing, setPrinting] = useState(false);
  const [checked, setChecked] = useState(false);
  const [frozenLang, setFrozenLang] = useState('');
  const [langDoc, setLangDoc] = useState('');
  const reset = () => { setBundle(null); setChecked(false); setPrinting(false); document.body.classList.remove('mat-printing'); };
  /* content signature: any edit to the selected inputs or underlying documents invalidates the preview (selections are kept) */
  const sig = useMemo(() => JSON.stringify([kind, ids, mode, layout, ws, acts, course, s.studio.writings, s.studio.interviews, s.studio.reports, s.personalWorksheets, s.plannerActivities]), [kind, ids, mode, layout, ws, acts, course, s.studio.writings, s.studio.interviews, s.studio.reports, s.personalWorksheets, s.plannerActivities]);
  useEffect(reset, [course?.id, actor.id, s.lang, sig]);
  useEffect(() => { const done = () => { document.body.classList.remove('mat-printing'); setPrinting(false); }; window.addEventListener('afterprint', done); return () => { window.removeEventListener('afterprint', done); document.body.classList.remove('mat-printing'); }; }, []);
  const make = (fn: () => MaterialBundle, go: boolean) => {
    try { const b = fn(); setBundle(b); setFrozenLang(txLang()); setChecked(false); void go; /* always preview before a print request */ }
    catch (e) { act(() => { throw new Error(errText(e)); }); }
  };
  const studs = ids.length ? ids : roster.map((x) => x.id);
  const priv = KINDS.find((k) => k[0] === kind)![2];
  const privBlock = priv && ids.length !== 1;
  const pWs = s.personalWorksheets.filter((w) => !w.archived && studs.includes(w.studentId));
  const pActs = s.plannerActivities.filter((a) => !a.archived && studs.includes(a.studentId));
  const tog = (l: string[], set: (v: string[]) => void, id: string) => set(l.includes(id) ? l.filter((x) => x !== id) : [...l, id]);
  if (actor.role !== 'teacher') return <StudioFrame kicker="STUDIO 1.5 · PRINT" title={T('인쇄')}><Empty title={T('인쇄는 교사 역할에서만 가능합니다')} /></StudioFrame>;
  return (
    <StudioFrame kicker="STUDIO 1.5 · PRINT" title={T('과정 자료 인쇄')} actions={bundle ? <Btn variant="ghost" onClick={reset} data-testid="button-close-preview"><X className="h-4 w-4" />{T('미리보기 닫기')}</Btn> : undefined}>
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title={T('1 · 학생 선택')} right={<button type="button" className="text-sm font-semibold text-primary" onClick={() => setIds(ids.length === roster.length ? [] : roster.map((x) => x.id))} data-testid="button-print-all">{T('전체')}</button>}>
          <div className="flex flex-wrap gap-1.5">{roster.map((x) => <button key={x.id} type="button" onClick={() => tog(ids, setIds, x.id)} data-testid={`toggle-print-${x.id}`} className={cn('rounded-md border px-2 py-1 font-mono text-xs', ids.includes(x.id) ? 'border-primary bg-primary text-primary-foreground' : 'bg-card')}>{x.displayName || x.code}</button>)}</div>
          <p className="mt-2 text-xs text-muted-foreground">{ids.length ? T('{0}명 선택', ids.length) : T('선택이 없으면 과정 전체 학생')}</p>
        </Section>
        <Section title={T('2 · 과정 자료 종류')} hint={T('개인 글은 공통 자료에 포함되지 않습니다. 개인 자료는 학생이 공유한 범위만 인쇄됩니다.')}>
          <div className="grid grid-cols-2 gap-1.5">{KINDS.map(([k, l, priv]) => <button key={k} type="button" onClick={() => setKind(k)} data-testid={`button-print-kind-${k}`} className={cn('rounded-lg border px-2.5 py-2 text-start text-sm', kind === k ? 'border-primary bg-secondary ring-2 ring-primary/25' : 'bg-card')}>{T(l)} {priv && <Pill tone="orange">{T('개인')}</Pill>}</button>)}</div>
          {privBlock && <p className="mt-2 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive" data-testid="text-private-one">{T('개인 자료는 학생 한 명만 선택해야 인쇄할 수 있습니다. 공통 본문으로 묶지 않습니다.')}</p>}
          <div className="mt-3 flex gap-2"><Btn variant="outline" disabled={privBlock} onClick={() => make(() => coursePrint(getState(), course!.id, studs, kind), false)} data-testid="button-preview-course"><Eye className="h-4 w-4" />{T('미리보기')}</Btn><Btn disabled={privBlock} onClick={() => make(() => coursePrint(getState(), course!.id, studs, kind), true)} data-testid="button-print-course"><Printer className="h-4 w-4" />{T('인쇄 묶음 준비')}</Btn></div>
        </Section>
      </div>
      <Section title={T('3 · 기존 개인 활동지·플래너 카드 연결 인쇄')} hint={T('문서를 고르고 미리보기의 학생 범위와 공유를 확인한 뒤 인쇄합니다.')}>
        <div className="mb-3 flex flex-wrap gap-2">{(['worksheets', 'cards', 'both'] as MaterialPrintMode[]).map((m) => <button key={m} type="button" onClick={() => setMode(m)} data-testid={`button-mode-${m}`} className={cn('rounded-full border px-3 py-1 text-sm font-semibold', mode === m ? 'bg-sidebar text-white border-sidebar' : 'bg-card')}>{T(m === 'worksheets' ? '활동지만' : m === 'cards' ? '카드만' : '둘 다')}</button>)}{(['A4', 'A5x2'] as CardLayout[]).map((l) => <button key={l} type="button" onClick={() => setLayout(l)} data-testid={`button-layout-${l}`} className={cn('rounded-full border px-3 py-1 font-mono text-sm', layout === l ? 'bg-primary text-primary-foreground border-primary' : 'bg-card')}>{l}</button>)}</div>
        <div className="grid gap-3 md:grid-cols-2">
          <PickList title={T('활동지')} items={pWs.map((w) => [w.id, `${studentName(s, w.studentId)} · ${w.fields.title}`, w.status])} sel={ws} on={(id) => tog(ws, setWs, id)} disabled={mode === 'cards'} />
          <PickList title={T('플래너 카드')} items={pActs.map((a) => [a.id, `${studentName(s, a.studentId)} · ${a.fields.title}`, a.status])} sel={acts} on={(id) => tog(acts, setActs, id)} disabled={mode === 'worksheets'} />
        </div>
        {(ws.length > 0 || acts.length > 0) && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs"><span className="font-semibold text-muted-foreground">{T('문서별 언어 바꾸기 (새 버전 저장)')}</span>
              <select className="rounded-md border bg-card px-2 py-1 text-xs" value={langDoc} onChange={(e) => setLangDoc(e.target.value)} data-testid="select-print-lang-doc">
                <option value="">{T('문서 선택')}</option>
                {pWs.filter((w) => ws.includes(w.id)).map((w) => <option key={w.id} value={w.id}>{T('활동지')} · {studentName(s, w.studentId)} · {w.fields.title}</option>)}
                {pActs.filter((a) => acts.includes(a.id)).map((a) => <option key={a.id} value={a.id}>{T('플래너 카드')} · {studentName(s, a.studentId)} · {a.fields.title}</option>)}
              </select></div>
            {(() => { const w = pWs.find((x) => x.id === langDoc && ws.includes(x.id)); const a = pActs.find((x) => x.id === langDoc && acts.includes(x.id)); return w ? <MaterialLanguagePreview key={w.id} id={w.id} kind="worksheet" docLang={w.lang} /> : a ? <MaterialLanguagePreview key={a.id} id={a.id} kind="card" docLang={a.lang} /> : null; })()}
          </div>
        )}
        <Btn className="mt-3" disabled={!ws.length && !acts.length} onClick={() => make(() => buildMaterialBundle(getState(), { studentIds: studs, mode, layout, worksheetIds: ws, activityIds: acts }), true)} data-testid="button-print-personal"><Printer className="h-4 w-4" />{T('선택 자료 미리보기')}</Btn>
      </Section>
      {bundle && (
        <Section title={T('미리보기')} right={<span className="font-mono text-xs">{T('{0}장', bundle.pages.length)}</span>}>
          <p className="mb-2 rounded-md bg-secondary px-2.5 py-1.5 text-xs" data-testid="text-print-frozen-lang">{T('이 미리보기는 {0} 언어로 생성되었습니다. 앱 교육 문구는 선택 언어로 표시하고 직접 작성한 글과 인용은 원문으로 보존합니다. 언어·내용·선택을 바꾸면 미리보기와 인쇄 확인이 취소됩니다.', LANGS.find((l) => l.code === frozenLang)?.name ?? frozenLang)}</p>
          <p className="mb-3 text-sm" data-testid="stats-studio-print">{T('학생 {0}명 · 활동지 배부본 {1}개 · 활동카드 {2}개 · A4 용지 {3}장',bundle.counts.students,bundle.counts.worksheets,bundle.counts.cards,bundle.counts.sheets)}</p>
          {bundle.pages.length === 0 ? <Empty title={T('인쇄할 쪽이 없습니다')} body={T('공유 범위나 선택한 학생을 확인하세요.')} /> : <div className="max-h-[70vh] overflow-y-auto bg-muted/40 p-3"><MaterialPages pages={bundle.pages} /></div>}
          <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" data-testid="check-studio-print-confirm" checked={checked} onChange={(e)=>setChecked(e.target.checked)} />{T('미리보기의 학생 범위·공유·쪽 나눔을 확인했습니다.')}</label>
          <Btn className="mt-3" disabled={!checked||!bundle.pages.length} data-testid="button-studio-confirm-print" onClick={()=>{setPrinting(true);document.body.classList.add('mat-printing');setTimeout(()=>window.print(),60);}}><Printer className="h-4 w-4"/>{T('확인한 묶음 인쇄 / PDF 저장')}</Btn>
        </Section>
      )}
      {printing && bundle && createPortal(<div className="mat-print-root"><MaterialPages pages={bundle.pages} /></div>, document.body)}
    </StudioFrame>
  );
}

function PickList({ title, items, sel, on, disabled }: { title: string; items: string[][]; sel: string[]; on: (id: string) => void; disabled?: boolean }) {
  return (
    <div className={cn('rounded-lg border p-2.5', disabled && 'opacity-45 pointer-events-none')}>
      <div className="mb-1.5 text-xs font-semibold text-muted-foreground">{title} <span className="font-mono">{sel.filter((x) => items.some((i) => i[0] === x)).length}/{items.length}</span></div>
      {items.length === 0 ? <p className="text-xs text-muted-foreground">{T('선택한 학생의 문서가 없습니다.')}</p> : (
        <div className="max-h-48 space-y-0.5 overflow-y-auto">{items.map(([id, l, st]) => <label key={id} className="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted"><input type="checkbox" checked={sel.includes(id)} onChange={() => on(id)} data-testid={`check-doc-${id}`} /><span className="flex-1 truncate">{l}</span><Pill tone={st === 'confirmed' ? 'blue' : 'gray'}>{T(st === 'confirmed' ? '확정' : '초안')}</Pill></label>)}</div>
      )}
    </div>
  );
}
