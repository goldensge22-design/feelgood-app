import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Wand2, Printer, Layers, CheckCheck, History, FileText, IdCard, AlertTriangle } from 'lucide-react';
import { T } from '@/i18n/tx';
import { createPortal } from 'react-dom';
import { useApp, setState, getState, now } from '@/lib/store';
import type { MaterialBundle, MaterialPrintMode, CardLayout } from '@/lib/material-types';
import { generateMaterials, saveWorksheet, savePlanner } from '@/lib/materials';
import { buildMaterialBundle } from '@/lib/material-print';
import { FAMILIES, STAGE_LABEL } from '@/data/worksheets';
import { CARD_KINDS } from '@/lib/cards';
import { PageHead, Panel, Pill, Btn, Field, inputCls } from '@/components/shell';
import { WorksheetEditor, PlannerEditor, recLabel, regLabel } from '@/components/material-editors';
import { MaterialPages } from '@/components/material-pages';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/i18n/format';

type Scope = 'one' | 'multiple' | 'cohort' | 'all';
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function Materials() {
  const { toast } = useToast();
  const students = useApp((s) => s.students);
  const worksheets = useApp((s) => s.personalWorksheets);
  const activities = useApp((s) => s.plannerActivities);
  const cards = useApp((s) => s.cards);
  const bundles = useApp((s) => s.materialBundles);
  const lang = useApp((s) => s.lang);
  const campKinds = useApp((s) => s.camp.kinds);

  const [scope, setScope] = useState<Scope>('multiple');
  const [cohort, setCohort] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [family, setFamily] = useState(9);
  const [withCards, setWithCards] = useState(true);
  const [kinds, setKinds] = useState<number[]>(() => (campKinds?.length ? [...campKinds] : [0]));
  const [open, setOpen] = useState<string>('');
  const [doc, setDoc] = useState<string>('');
  const [batchAck, setBatchAck] = useState(false);
  const [pMode, setPMode] = useState<MaterialPrintMode>('both');
  const [layout, setLayout] = useState<CardLayout>('A5x2');
  const [includeName, setIncludeName] = useState(false);
  const [pickDocs, setPickDocs] = useState(false);
  const [docIds, setDocIds] = useState<string[]>([]);
  const [shown, setShown] = useState<string>('');
  const [printing, setPrinting] = useState<string>('');
  const [blockErr, setBlockErr] = useState('');

  // URL scope: /materials?ids=a,b or ?cohort=X or ?all=1
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('ids')) { const ids = q.get('ids')!.split(',').filter(Boolean); setScope(ids.length === 1 ? 'one' : 'multiple'); setPicked(ids); }
    else if (q.get('cohort') !== null) { setScope('cohort'); setCohort(q.get('cohort') ?? ''); }
    else if (q.get('all')) setScope('all');
  }, []);

  useEffect(() => {
    const done = () => { document.body.classList.remove('mat-printing'); setPrinting(''); };
    window.addEventListener('afterprint', done);
    return () => { window.removeEventListener('afterprint', done); document.body.classList.remove('mat-printing'); };
  }, []);

  const cohorts = useMemo(() => [...new Set(students.map((s) => s.cohort ?? ''))], [students]);
  // roster order preserved: always filter the roster rather than mapping the picked list
  const target = useMemo(() => {
    if (scope === 'all') return students;
    if (scope === 'cohort') return cohort.trim() ? students.filter((s) => (s.cohort ?? '') === cohort) : [];
    if (scope === 'one') return students.filter((s) => s.id === picked[0]);
    return students.filter((s) => picked.includes(s.id));
  }, [scope, cohort, picked, students]);
  const ids = target.map((s) => s.id);
  const label = (sid: string) => { const s = students.find((x) => x.id === sid); return s ? s.code || T('코드 없음') : T('명단 외'); };

  const generate = () => {
    if (!ids.length) return;
    const k = withCards ? kinds : [];
    const legacy = cards.filter((c) => ids.includes(c.studentId) && !c.archived).length;
    const existingActs = activities.filter((a) => ids.includes(a.studentId) && !a.archived).length;
    let reuse = false;
    if (legacy || existingActs) {
      if (!confirm(T('대상 학생에게 이전 직무 카드 {0}장, 기존 플래너 활동 {1}개가 있습니다. 원본은 지우지 않고 필요한 것만 가져오거나 연결합니다. 계속할까요?', legacy, existingActs))) return;
      reuse = true;
    }
    const run = (r: boolean) => setState((s) => generateMaterials(s, ids, family, k, lang, r));
    try { run(reuse); toast({ title: T('{0}명의 개인 자료를 만들거나 갱신했습니다', ids.length), description: T('모두 초안입니다. 학생별로 검토하고 확정하세요.') }); }
    catch (e) {
      if (!reuse && confirm(T('이전 카드 확인이 필요합니다: {0}. 원본을 유지한 채 가져와 연결할까요?', T(errMsg(e))))) {
        try { run(true); toast({ title: T('{0}명의 개인 자료를 만들거나 갱신했습니다', ids.length) }); } catch (e2) { toast({ title: T('만들지 못했습니다'), description: T(errMsg(e2)), variant: 'destructive' }); }
      } else if (reuse) toast({ title: T('만들지 못했습니다'), description: T(errMsg(e)), variant: 'destructive' });
    }
  };

  const scopeWs = worksheets.filter((w) => ids.includes(w.studentId) && !w.archived);
  const scopeActs = activities.filter((a) => ids.includes(a.studentId) && !a.archived);
  const draftWs = scopeWs.filter((w) => w.status === 'draft');
  const draftActs = scopeActs.filter((a) => a.status === 'draft');
  const needsAck = draftWs.some((w) => w.source === 'general-review');

  const batchConfirm = () => {
    if (!draftWs.length && !draftActs.length) return;
    if (needsAck && !batchAck) return;
    if (!confirm(T('검토한 초안 활동지 {0}개와 활동 카드 {1}개를 확정할까요? 이전 버전은 이력에 남습니다.', draftWs.length, draftActs.length))) return;
    const fails: string[] = [];
    let next = getState();
    for (const w of draftWs) { try { next = saveWorksheet(next, w.id, w.fields, T('일괄 검토 후 확정'), 'confirmed'); } catch (e) { fails.push(`${label(w.studentId)} ${w.fields.title}: ${T(errMsg(e))}`); } }
    for (const a of draftActs) { try { next = savePlanner(next, a.id, a.fields, a.record, T('일괄 검토 후 확정'), 'confirmed'); } catch (e) { fails.push(`${label(a.studentId)} ${a.fields.title}: ${T(errMsg(e))}`); } }
    const final = next;
    setState(() => final);
    setBatchAck(false);
    toast({ title: fails.length ? T('일부는 확정하지 못했습니다 ({0}건)', fails.length) : T('확정했습니다'), description: fails.slice(0, 4).join(' / '), variant: fails.length ? 'destructive' : undefined });
  };

  const build = () => {
    setBlockErr('');
    try {
      const wsSel = pickDocs ? docIds.filter((d) => scopeWs.some((w) => w.id === d)) : undefined;
      const acSel = pickDocs ? docIds.filter((d) => scopeActs.some((a) => a.id === d)) : undefined;
      const b = buildMaterialBundle(getState(), { studentIds: ids, mode: pMode, layout, includeName, worksheetIds: wsSel, activityIds: acSel });
      setState((s) => ({ ...s, materialBundles: [b, ...s.materialBundles] }));
      setShown(b.id);
      toast({ title: T('인쇄 묶음을 준비했습니다'), description: T('이 묶음은 지금 내용으로 고정됩니다. 이후 수정은 새 묶음에서 반영됩니다.') });
    } catch (e) {
      const per = target.map((s) => {
        const w = scopeWs.filter((x) => x.studentId === s.id && (!pickDocs || docIds.includes(x.id)));
        const a = scopeActs.filter((x) => x.studentId === s.id && (!pickDocs || docIds.includes(x.id)));
        const p: string[] = [];
        if (pMode !== 'cards') { if (!w.length) p.push(T('활동지 없음')); else if (w.some((x) => x.status !== 'confirmed')) p.push(T('미확정 활동지 {0}', w.filter((x) => x.status !== 'confirmed').length)); }
        if (pMode !== 'worksheets') { if (!a.length) p.push(T('카드 없음')); else if (a.some((x) => x.status !== 'confirmed')) p.push(T('미확정 카드 {0}', a.filter((x) => x.status !== 'confirmed').length)); }
        return p.length ? `${s.code || s.id}: ${p.join(', ')}` : '';
      }).filter(Boolean);
      setBlockErr([T(errMsg(e)), ...per].join('\n'));
    }
  };

  const print = (b: MaterialBundle) => {
    if(b.language!==lang){toast({title:T('자료가 변경되었습니다. 미리보기를 다시 확인하세요.'),variant:'destructive'});setShown('');return;}
    const at = now();
    setState((s) => ({ ...s, materialBundles: s.materialBundles.map((x) => (x.id === b.id ? { ...x, state: 'print-requested', printRequests: [...x.printRequests, at] } : x)) }));
    setPrinting(b.id); setShown(b.id);
    document.body.classList.add('mat-printing');
    setTimeout(() => window.print(), 60);
  };

  const shownBundle = bundles.find((b) => b.id === shown);
  const printBundle = bundles.find((b) => b.id === printing);
  const openStudent = students.find((s) => s.id === open);

  return (
    <div>
      <div className="mat-screen">
        <PageHead kicker="Rules 1.2 · worksheets + planner cards" title={T('개인 활동지 · 플래너 카드')}>
          {printing && <Btn variant="outline" onClick={() => { document.body.classList.remove('mat-printing'); setPrinting(''); }} data-testid="button-exit-material-print">{T('미리보기 닫기')}</Btn>}
          <Link href="/cards" className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold" data-testid="link-legacy-cards">{T('이전 직무 카드 (보관·가져오기용)')}</Link>
        </PageHead>
        <p className="no-print mb-4 max-w-3xl text-sm text-muted-foreground">{T('학생마다 읽을 수 있는 개인 활동지와 실행할 플래너 카드를 따로 만듭니다. 둘은 연결되지만 같은 문서가 아닙니다. 카드는 활동지의 읽기 자료를 다시 싣지 않고 연결만 표시합니다.')}</p>

        <div className="no-print grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Panel className="space-y-3">
            <h2 className="font-bold">{T('1. 대상 학생')}</h2>
            <div className="flex flex-wrap gap-1.5">
              {(['one', 'multiple', 'cohort', 'all'] as Scope[]).map((s) => <button key={s} type="button" aria-pressed={scope === s} onClick={() => setScope(s)} data-testid={`button-scope-${s}`} className={cn('rounded-full border px-3 py-1 text-sm font-semibold', scope === s ? 'bg-sidebar text-white border-sidebar' : 'bg-card')}>{T({ one: '한 명', multiple: '여러 명', cohort: '코호트·반 전체', all: '명단 전체' }[s])}</button>)}
            </div>
            {scope === 'cohort' && <Field label={T('코호트·반')}><select className={inputCls} value={cohort} onChange={(e) => setCohort(e.target.value)} data-testid="select-material-cohort">{cohorts.map((c) => <option key={c} value={c}>{c || T('(코호트 없음)')}</option>)}</select></Field>}
            {(scope === 'one' || scope === 'multiple') && (
              <ul className="max-h-56 overflow-y-auto rounded-lg border divide-y text-sm">
                {students.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 px-2 py-1.5">
                    <input type={scope === 'one' ? 'radio' : 'checkbox'} name="mat-one" checked={picked.includes(s.id)} onChange={(e) => setPicked((p) => (scope === 'one' ? [s.id] : e.target.checked ? [...p, s.id] : p.filter((x) => x !== s.id)))} data-testid={`check-material-student-${s.id}`} />
                    <span className="font-mono">{s.code || T('코드 없음')}</span>
                    {s.displayName && <span className="text-xs">{s.displayName}</span>}
                    <span className="text-xs text-muted-foreground">{T(STAGE_LABEL[s.stage])} · {s.cohort || '—'} · {s.job || T('개인 직무 미선택')}</span>
                  </li>
                ))}
                {!students.length && <li className="p-3 text-muted-foreground">{T('명단이 비어 있습니다')} · <Link href="/students" className="text-primary">{T('학생 명단')}</Link></li>}
              </ul>
            )}
            <div className="text-sm" data-testid="text-material-scope">{T('대상 {0}명 (명단 순서)', ids.length)}</div>
            <p className="text-xs text-muted-foreground">{T('선택하지 않은 학생의 자료와 기록은 바뀌지 않습니다.')}</p>
          </Panel>

          <Panel className="space-y-3">
            <h2 className="font-bold">{T('2. 만들 자료')}</h2>
            <Field label={T('활동지 템플릿 (12종 · 학교급에 맞게 적용)')}>
              <select className={inputCls} value={family} onChange={(e) => setFamily(Number(e.target.value))} data-testid="select-template-family">{FAMILIES.map((f, i) => <option key={f} value={i + 1}>{String(i + 1).padStart(2, '0')} · {T(f)}</option>)}</select>
            </Field>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" aria-pressed={!withCards} onClick={() => setWithCards(false)} data-testid="button-output-worksheets" className={cn('rounded-full border px-3 py-1 text-sm font-semibold', !withCards ? 'bg-primary text-primary-foreground border-primary' : 'bg-card')}>{T('활동지만')}</button>
              <button type="button" aria-pressed={withCards} onClick={() => setWithCards(true)} data-testid="button-output-both" className={cn('rounded-full border px-3 py-1 text-sm font-semibold', withCards ? 'bg-primary text-primary-foreground border-primary' : 'bg-card')}>{T('활동지 + 별도 플래너 카드')}</button>
            </div>
            {withCards && <div className="flex flex-wrap gap-3 text-sm">{CARD_KINDS.map((k, i) => <label key={k} className="flex items-center gap-1.5"><input type="checkbox" checked={kinds.includes(i)} onChange={(e) => setKinds((p) => (e.target.checked ? [...p, i].sort() : p.filter((x) => x !== i)))} data-testid={`check-kind-${i}`} />{T(k)}</label>)}</div>}
            <Btn className="w-full" disabled={!ids.length || (withCards && !kinds.length)} onClick={generate} data-testid="button-generate-materials"><Wand2 className="h-4 w-4" />{T('대상 {0}명 자료 만들기·갱신', ids.length)}</Btn>
            <p className="text-xs text-muted-foreground">{T('같은 학생·템플릿·직무의 활동지는 새로 복제하지 않고 갱신합니다. 이전 직무 카드와 경험 기록은 고치지 않습니다.')}</p>
          </Panel>
        </div>

        <Panel className="no-print mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold">{T('3. 학생별 검토·수정·확정')}</h2>
            <Pill tone="orange">{T('초안 활동지 {0} · 초안 카드 {1}', draftWs.length, draftActs.length)}</Pill>
          </div>
          {!ids.length ? <p className="text-sm text-muted-foreground">{T('먼저 대상 학생을 고르세요.')}</p> : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs text-muted-foreground"><tr>{['코드', '활동지', '플래너 카드', '실행', '등록 준비', ''].map((h) => <th key={h} className="px-3 py-2 text-start">{T(h)}</th>)}</tr></thead>
                <tbody>{target.map((s) => {
                  const w = scopeWs.filter((x) => x.studentId === s.id); const a = scopeActs.filter((x) => x.studentId === s.id);
                  return (
                    <tr key={s.id} className={cn('border-t', open === s.id && 'bg-secondary')} data-testid={`row-material-${s.id}`}>
                      <td className="px-3 py-2 font-mono">{s.code || '-'}</td>
                      <td className="px-3 py-2 font-mono">{w.length ? `${w.filter((x) => x.status === 'confirmed').length}/${w.length}` : '-'}</td>
                      <td className="px-3 py-2 font-mono">{a.length ? `${a.filter((x) => x.status === 'confirmed').length}/${a.length}` : '-'}</td>
                      <td className="px-3 py-2 text-xs">{a.length ? (['planned', 'in-progress', 'performed'] as const).map((st) => `${recLabel(st)} ${a.filter((x) => x.record.state === st).length}`).join(' · ') : '-'}</td>
                      <td className="px-3 py-2 text-xs">{a.length ? [...new Set(a.map((x) => regLabel(x.registration.state)))].join(', ') : '-'}</td>
                      <td className="px-3 py-2 text-end"><Btn variant="ghost" onClick={() => { setOpen(open === s.id ? '' : s.id); setDoc(''); }} data-testid={`button-open-material-${s.id}`}>{open === s.id ? T('닫기') : T('열기')}</Btn></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          )}
          {openStudent && (() => {
            const w = scopeWs.filter((x) => x.studentId === openStudent.id); const a = scopeActs.filter((x) => x.studentId === openStudent.id);
            const legacy = cards.filter((c) => c.studentId === openStudent.id && !c.archived);
            const curW = w.find((x) => x.id === doc); const curA = a.find((x) => x.id === doc);
            return (
              <div className="grid gap-3 lg:grid-cols-[240px_1fr]" data-testid="material-student-detail">
                <div className="space-y-2 text-sm">
                  <div className="text-xs font-bold text-muted-foreground">{T('활동지')}</div>
                  {w.map((x) => <button key={x.id} type="button" onClick={() => setDoc(x.id)} data-testid={`button-doc-${x.id}`} className={cn('flex w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 text-start', doc === x.id && 'border-primary bg-card')}><FileText className="h-3.5 w-3.5 shrink-0" /><span className="flex-1 truncate">{x.fields.title}</span>{x.status === 'draft' && <Pill tone="orange">{T('초안')}</Pill>}</button>)}
                  {!w.length && <p className="text-xs text-muted-foreground">{T('아직 없음')}</p>}
                  <div className="pt-2 text-xs font-bold text-muted-foreground">{T('플래너 카드')}</div>
                  {a.map((x) => <button key={x.id} type="button" onClick={() => setDoc(x.id)} data-testid={`button-doc-${x.id}`} className={cn('flex w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 text-start', doc === x.id && 'border-primary bg-card')}><IdCard className="h-3.5 w-3.5 shrink-0" /><span className="flex-1 truncate">{x.fields.title}</span>{x.status === 'draft' && <Pill tone="orange">{T('초안')}</Pill>}</button>)}
                  {!a.length && <p className="text-xs text-muted-foreground">{T('아직 없음')}</p>}
                  {legacy.length > 0 && <p className="pt-2 text-xs text-muted-foreground">{T('이전 직무 카드 {0}장은 그대로 보관됩니다. 활동지에서 가져와 연결할 수 있습니다.', legacy.length)}</p>}
                </div>
                <div className="rounded-lg border bg-card p-3">
                  {curW ? <WorksheetEditor key={`${curW.id}-${curW.versions.length}-${curW.status}`} ws={curW} student={openStudent} activities={a} legacy={legacy} />
                    : curA ? <PlannerEditor key={`${curA.id}-${curA.versions.length}-${curA.status}-${curA.registration.state}`} act={curA} student={openStudent} worksheets={w} />
                    : <p className="py-10 text-center text-sm text-muted-foreground">{T('왼쪽에서 문서를 고르면 모든 항목을 수정할 수 있습니다.')}</p>}
                </div>
              </div>
            );
          })()}
          {(draftWs.length > 0 || draftActs.length > 0) && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-3">
              {needsAck && <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={batchAck} onChange={(e) => setBatchAck(e.target.checked)} data-testid="check-batch-general-ack" />{T('직무 과제 없이 만든 일반 검토 자료가 포함되어 있음을 확인했습니다.')}</label>}
              <Btn variant="orange" disabled={needsAck && !batchAck} onClick={batchConfirm} data-testid="button-batch-confirm"><CheckCheck className="h-4 w-4" />{T('대상 초안 일괄 확정')}</Btn>
              <span className="text-xs text-muted-foreground">{T('수행 완료 기록이 확인되지 않은 카드 등 조건이 맞지 않는 문서는 확정하지 않고 알려 줍니다.')}</span>
            </div>
          )}
        </Panel>

        <Panel className="no-print mt-4 space-y-3">
          <h2 className="font-bold">{T('4. 인쇄 묶음')}</h2>
          <div className="flex flex-wrap gap-1.5">
            {(['worksheets', 'cards', 'both'] as MaterialPrintMode[]).map((m) => <button key={m} type="button" aria-pressed={pMode === m} onClick={() => setPMode(m)} data-testid={`button-print-mode-${m}`} className={cn('rounded-full border px-3 py-1 text-sm font-semibold', pMode === m ? 'bg-sidebar text-white border-sidebar' : 'bg-card')}>{T({ worksheets: '활동지만', cards: '카드만', both: '활동지 + 카드' }[m])}</button>)}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {pMode !== 'worksheets' && <Field label={T('카드 배치 (활동지는 항상 A4)')}><select className={cn(inputCls, 'w-auto')} value={layout} onChange={(e) => setLayout(e.target.value as CardLayout)} data-testid="select-material-layout"><option value="A5x2">{T('A4에 A5 2장')}</option><option value="A4">{T('A4 1장')}</option></select></Field>}
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={includeName} onChange={(e) => setIncludeName(e.target.checked)} data-testid="check-include-name" />{T('이름 함께 인쇄 (교사 선택 · 코드는 항상 인쇄)')}</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={pickDocs} onChange={(e) => setPickDocs(e.target.checked)} data-testid="check-pick-docs" />{T('문서 직접 고르기')}</label>
          </div>
          {pickDocs && (
            <ul className="max-h-48 overflow-y-auto rounded-lg border p-2 text-xs space-y-1">
              {[...(pMode !== 'cards' ? scopeWs.map((w) => ({ id: w.id, sid: w.studentId, t: w.fields.title, k: T('활동지'), st: w.status })) : []), ...(pMode !== 'worksheets' ? scopeActs.map((a) => ({ id: a.id, sid: a.studentId, t: a.fields.title, k: T('카드'), st: a.status })) : [])].map((d) => (
                <li key={d.id}><label className="flex items-center gap-1.5"><input type="checkbox" checked={docIds.includes(d.id)} onChange={(e) => setDocIds((p) => (e.target.checked ? [...p, d.id] : p.filter((x) => x !== d.id)))} data-testid={`check-print-doc-${d.id}`} /><span className="font-mono">{label(d.sid)}</span>{d.k} · {d.t}{d.st === 'draft' && <Pill tone="orange">{T('초안')}</Pill>}</label></li>
              ))}
            </ul>
          )}
          <Btn disabled={!ids.length} onClick={build} data-testid="button-build-bundle"><Layers className="h-4 w-4" />{T('대상 {0}명 인쇄 묶음 준비', ids.length)}</Btn>
          {blockErr && <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-2 text-sm text-destructive" data-testid="text-bundle-blocked"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span className="whitespace-pre-wrap">{blockErr}</span></div>}
          <p className="text-xs text-muted-foreground">{T('확정되지 않았거나 빠진 문서가 있으면 학생별로 알려 주고 묶음을 만들지 않습니다. 인쇄 요청은 실제 인쇄 성공을 뜻하지 않습니다. 브라우저 인쇄 창에서 프린터 또는 "PDF로 저장"을 고르세요.')}</p>
          {bundles.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold"><History className="h-4 w-4" />{T('저장된 묶음 (재인쇄 시 같은 내용)')}</div>
              <ul className="mt-1 divide-y rounded-lg border text-xs">{bundles.map((b) => (
                <li key={b.id} className={cn('flex flex-wrap items-center gap-2 px-2 py-1.5', shown === b.id && 'bg-secondary')} data-testid={`row-bundle-${b.id}`}>
                  <span className="font-mono">{formatDateTime(b.at)}</span>
                  <Pill tone="gray">{T({ worksheets: '활동지만', cards: '카드만', both: '활동지 + 카드' }[b.mode])}{b.mode !== 'worksheets' ? ` · ${b.layout === 'A5x2' ? 'A5×2' : 'A4'}` : ''}</Pill>
                  <span>{T('학생 {0} · 활동지 {1} · 카드 {2} · 문서 {3} · 면 {4} · A4 {5}매', b.counts.students, b.counts.worksheets, b.counts.cards, b.counts.outputs, b.counts.panels, b.counts.sheets)}</span>
                  <Pill tone={b.state === 'print-requested' ? 'orange' : 'blue'}>{b.state === 'print-requested' ? T('인쇄 요청 {0}회 (성공 미확인)', b.printRequests.length) : T('준비됨')}</Pill>
                  <span className="ms-auto flex gap-1">
                    <Btn variant="ghost" onClick={() => setShown(shown === b.id ? '' : b.id)} data-testid={`button-show-bundle-${b.id}`}>{shown === b.id ? T('미리보기 닫기') : T('미리보기')}</Btn>
                    <Btn variant="outline" onClick={() => print(b)} data-testid={`button-print-bundle-${b.id}`}><Printer className="h-4 w-4" />{b.printRequests.length ? T('같은 내용 재인쇄') : T('인쇄 / PDF 저장')}</Btn>
                  </span>
                </li>))}
              </ul>
            </div>
          )}
        </Panel>

        {shownBundle && (
          <div className="mt-4" data-testid="bundle-preview">
            <div className="no-print mb-2 text-sm text-muted-foreground">{T('미리보기와 인쇄는 같은 페이지를 사용합니다. 한 장 = A4 한 면.')}</div>
            <MaterialPages pages={shownBundle.pages} />
          </div>
        )}
      </div>
      {printBundle && createPortal(<div className="mat-print-root"><MaterialPages pages={printBundle.pages} /></div>, document.body)}
    </div>
  );
}
