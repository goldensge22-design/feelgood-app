import { T } from '@/i18n/tx';
import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Check, Pencil, Printer, ClipboardCopy, FileDown, RotateCcw, AlertTriangle, History } from 'lucide-react';
import { useApp, setState, uid, now, download, type Card, type CardFields } from '@/lib/store';
import { CARD_KINDS, localizeCard } from '@/lib/cards';
import { txLang } from '@/i18n/tx';
import { JobCardView } from '@/components/job-card';
import { PageHead, Panel, Pill, Btn, Field, inputCls } from '@/components/shell';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { studentPages } from '@/lib/print-pages';

type PrintItem = { card: Card; fields: CardFields; version: number; code: string };

export default function Cards() {
  const { students, cards, bundles } = useApp((s) => s);
  const withCards = students.filter((s) => cards.some((c) => c.studentId === s.id && !c.archived));
  const [sel, setSel] = useState<string | null>(withCards[0]?.id ?? null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<CardFields | null>(null);
  const [reason, setReason] = useState('');
  const [ack, setAck] = useState<Record<string, boolean>>({});
  const [layout, setLayout] = useState<'A4' | 'A5x2'>('A5x2');
  const [printing, setPrinting] = useState<{ items: PrintItem[]; layout: 'A4' | 'A5x2' } | null>(null);
  const [pick, setPick] = useState<string[]>([]);
  const { toast } = useToast();
  const student = students.find((s) => s.id === sel);
  const myCards = useMemo(() => cards.filter((c) => c.studentId === sel && !c.archived).sort((a, b) => CARD_KINDS.indexOf(a.kind) - CARD_KINDS.indexOf(b.kind)), [cards, sel]);
  const code = (id: string) => students.find((s) => s.id === id)?.code || '가상';

  const updateCard = (id: string, fn: (c: Card) => Card) => setState((s) => ({ ...s, cards: s.cards.map((c) => (c.id === id ? fn(c) : c)) }));
  const saveEdit = (c: Card) => {
    if (!draft) return;
    const v = c.versions.length + 1;
    updateCard(c.id, (x) => ({ ...x, fields: draft, status: 'draft', versions: [...x.versions, { version: v, at: now(), reason: reason || '교사 수정', fields: draft }] }));
    setEditing(null); setDraft(null); setReason(''); toast({ title: T("v{0} 저장 · 다시 확정이 필요합니다", v) });
  };
  const doPrint = (items: PrintItem[], lay: 'A4' | 'A5x2', record: boolean, label: string) => {
    if (!items.length) { toast({ title: T("확정된 카드가 없습니다"), description: T("미리보기에서 확정 후 인쇄할 수 있습니다."), variant: 'destructive' }); return; }
    if (record) {
      const b = { id: uid('bd'), at: now(), layout: lay, cardIds: items.map((i) => i.card.id), versions: Object.fromEntries(items.map((i) => [i.card.id, i.version])), label };
      setState((s) => ({ ...s, bundles: [b, ...s.bundles], cards: s.cards.map((c) => (b.versions[c.id] ? { ...c, printedVersions: Array.from(new Set([...c.printedVersions, b.versions[c.id]])) } : c)) }));
    }
    setPrinting({ items, layout: lay });
    setTimeout(() => window.print(), 300);
  };
  const confirmedItems = (studentIds: string[]): PrintItem[] =>
    students.filter((s) => studentIds.includes(s.id))
      .flatMap((s) => cards.filter((c) => c.studentId === s.id && !c.archived && c.status === 'confirmed').sort((a, b) => CARD_KINDS.indexOf(a.kind) - CARD_KINDS.indexOf(b.kind)).map((c) => ({ card: c, fields: c.fields, version: c.versions.length, code: s.code })));
  const loc = (f: CardFields, c: Card) => localizeCard(f, students.find((s) => s.id === c.studentId), txLang(), c.versions[0]?.fields);
  const plannerText = (c: Card) => { const f = loc(c.fields, c).fields; return [`[${T(f.kind)}] ${code(c.studentId)}`, `${T('오늘 목표')}: ${f.todayGoal}`, `${T('첫 행동')}: ${f.firstAction}`, `${T('단계')}: ${f.steps.join(' / ')}`, `${T('산출물')}: ${f.deliverable}`, `${T('완료 기준')}: ${f.criterion}`, `${T('다음 행동')}: ${T('(학생 작성)')}`].join('\n'); };

  if (printing) {
    return (
      <div>
        <div className="no-print mb-4 flex flex-wrap items-center gap-2"><Btn variant="outline" onClick={() => setPrinting(null)} data-testid="button-close-print">{T("미리보기 닫기")}</Btn><Btn variant="orange" onClick={() => window.print()} data-testid="button-print-again"><Printer className="h-4 w-4" />{T("다시 인쇄")}</Btn><span className="text-sm text-muted-foreground">{printing.items.length}{T("장 ·")}{' '}{printing.layout === 'A4' ? T("A4 1장당 1카드") : T("A4 1장당 A5 2카드")} {' '}{T("· 화면과 인쇄 내용 동일")}</span></div>
        <div className="space-y-6 print:space-y-0">
          {studentPages(printing.items.map((i) => ({ ...i, studentId: i.card.studentId })), printing.layout === 'A4' ? 1 : 2).map((page, pageIndex) => (
            <section key={pageIndex} className={cn('student-print-page', printing.layout === 'A4' ? 'a4-single' : 'a5-pair grid gap-4 md:grid-cols-2 print:block')}>
              {page.map((i) => <JobCardView key={i.card.id} f={loc(i.fields, i.card).fields} code={i.code} stage={students.find((s) => s.id === i.card.studentId)?.stage ?? 'university'} version={i.version} compact={printing.layout === 'A5x2'} />)}
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="no-print mb-3 rounded-lg border border-dashed p-3 text-sm" data-testid="notice-legacy-cards">{T("이전 방식(규칙 1.1)의 직무 카드입니다. 지우지 않고 보관하며, 새 개인 활동지에서 가져와 연결할 수 있습니다. 새 자료는 활동지와 플래너 카드를 따로 만듭니다.")}{' '}<Link href="/materials" className="font-semibold text-primary" data-testid="link-to-materials">{T("개인 활동지·플래너 카드로 이동")}</Link></div>
      <PageHead kicker="Legacy cards · kept for import & history" title={T("이전 직무 카드")}>
        <select className={inputCls + ' w-auto'} value={layout} onChange={(e) => setLayout(e.target.value as 'A4' | 'A5x2')} data-testid="select-layout"><option value="A5x2">{T("A4에 A5 2장")}</option><option value="A4">{T("A4 1장")}</option></select>
      </PageHead>
      {withCards.length === 0 ? (
        <Panel className="py-14 text-center"><p className="font-semibold">{T("아직 생성된 카드가 없습니다")}</p><p className="text-sm text-muted-foreground mt-1">{T("명단에서 학생의 카드 아이콘을 눌러 초안 4장을 만드세요.")}</p><Link href="/students" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" data-testid="link-students">{T("학생 명단")}</Link></Panel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
          <Panel className="no-print h-fit p-2 max-h-[70vh] overflow-y-auto">
            {withCards.map((s) => { const sc = cards.filter((c) => c.studentId === s.id && !c.archived); const done = sc.filter((c) => c.status === 'confirmed').length; return (
              <div key={s.id} className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5', sel === s.id && 'bg-secondary')}>
                <input type="checkbox" checked={pick.includes(s.id)} onChange={(e) => setPick((p) => (e.target.checked ? [...p, s.id] : p.filter((x) => x !== s.id)))} data-testid={`check-pick-${s.id}`} />
                <button className="flex-1 text-start text-sm" onClick={() => setSel(s.id)} data-testid={`button-select-${s.id}`}><span className="font-mono">{s.code || '-'}</span> <span className="text-xs text-muted-foreground">{s.job || T("직무 미선택")}</span></button>
                <span className={cn('font-mono text-xs', done === sc.length ? 'text-primary font-bold' : 'text-muted-foreground')}>{done}/{sc.length}</span>
              </div>); })}
            <div className="border-t mt-2 pt-2 space-y-1.5">
              <Btn className="w-full" variant="outline" onClick={() => setPick(withCards.map((s) => s.id))} data-testid="button-pick-all">{T("전체 선택")}</Btn>
              <Btn className="w-full" variant="orange" disabled={!pick.length} onClick={() => doPrint(confirmedItems(pick), layout, true, `선택 ${pick.length}명`)} data-testid="button-print-bundle"><Printer className="h-4 w-4" />{T("확정 카드 묶음 인쇄")}</Btn>
            </div>
          </Panel>
          <div className="space-y-4 min-w-0">
            {student && (
              <Panel className="no-print flex flex-wrap items-center gap-2 py-3">
                <div className="flex-1 min-w-[200px]"><div className="font-bold">{student.code} · {student.job || T("직무 미선택")}</div><div className="text-xs text-muted-foreground">{T("교사 수정 후 확정한 카드만 인쇄됩니다. 수정하면 새 버전이 생기고 다시 확정해야 합니다.")}</div></div>
                <Btn variant="orange" onClick={() => doPrint(confirmedItems([student.id]), layout, true, student.code)} data-testid="button-print-student"><Printer className="h-4 w-4" />{T("이 학생 인쇄")}</Btn>
                <Btn variant="outline" onClick={() => download(new Blob([myCards.map(plannerText).join('\n\n')], { type: 'text/plain' }), `${student.code}-planner.txt`)} data-testid="button-export-planner"><FileDown className="h-4 w-4" />{T("플래너용 텍스트")}</Btn>
              </Panel>
            )}
            {myCards.map((c) => {
              const needs = c.fields.source === 'needs-confirmation';
              return (
                <div key={c.id} className="grid gap-3 xl:grid-cols-[1fr_260px]">
                  {editing === c.id && draft ? (
                    <Panel className="space-y-2">
                      {(['todayGoal', 'job', 'scenario', 'reading', 'firstAction', 'method', 'help', 'role', 'time', 'deliverable', 'criterion', 'checkIn'] as const).map((k) => (
                        <Field key={k} label={{ todayGoal: T("오늘 목표"), job: T("직무"), scenario: T("교육용 장면"), reading: T("읽기 자료"), firstAction: T("첫 행동"), method: T("방법"), help: T("도움"), role: T("나의 역할"), time: T("시간"), deliverable: T("산출물"), criterion: T("완료 기준"), checkIn: T("중간 확인") }[k]}>
                          <textarea className={inputCls} rows={k === 'reading' ? 5 : 2} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} data-testid={`input-card-${k}`} />
                        </Field>
                      ))}
                      <Field label={T("단계(줄마다 하나)")}><textarea className={inputCls} rows={3} value={draft.steps.join('\n')} onChange={(e) => setDraft({ ...draft, steps: e.target.value.split('\n') })} data-testid="input-card-steps" /></Field>
                      <Field label={T("수정 이유(버전 기록)")}><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} data-testid="input-card-reason" /></Field>
                      <div className="flex gap-2"><Btn onClick={() => saveEdit(c)} data-testid="button-save-card">{T("새 버전 저장")}</Btn><Btn variant="ghost" onClick={() => setEditing(null)}>{T("취소")}</Btn></div>
                    </Panel>
                  ) : <JobCardView f={loc(c.fields, c).fields} code={code(c.studentId)} stage={student?.stage ?? 'university'} version={c.versions.length} />}
                  <Panel className="no-print h-fit space-y-2 text-sm">
                    <div className="flex items-center gap-2">{c.status === 'confirmed' ? <Pill>{T("확정 v")}{c.versions.length}</Pill> : <Pill tone="orange">{T("초안 v")}{c.versions.length}</Pill>}{c.printedVersions.length > 0 && <Pill tone="gray">{T("인쇄 v")}{c.printedVersions.join(',')}</Pill>}</div>
                    {(() => { const L = loc(c.fields, c); return (L.kept.length > 0 || L.outdated.length > 0 || L.missing.length > 0) && <div className="rounded-lg bg-accent p-2 text-xs" data-testid={`card-i18n-${c.id}`}>{L.kept.length > 0 && <div>{T('교사가 수정한 칸은 입력한 언어 그대로 표시합니다: {0}칸', L.kept.length)}</div>}{L.outdated.length > 0 && <div className="text-destructive">{T('학생·직무 정보가 생성 이후 바뀌어 저장된 내용으로 표시합니다(다시 생성 권장): {0}칸', L.outdated.length)}</div>}{L.missing.length > 0 && <div className="text-destructive">{T('번역이 없어 한국어 원문으로 표시되는 항목: {0}개', L.missing.length)}</div>}</div>; })()}
                    {needs && <div className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive flex gap-1.5"><AlertTriangle className="h-4 w-4 shrink-0" />{T("선택 직무에 등록된 과제가 없어 학교급 공통 활동지로 채웠습니다. 내용을 확인하세요.")}</div>}
                    {needs && c.status !== 'confirmed' && <label className="flex gap-2 text-xs"><input type="checkbox" checked={!!ack[c.id]} onChange={(e) => setAck({ ...ack, [c.id]: e.target.checked })} data-testid={`check-ack-${c.id}`} />{T("내용을 직접 확인했습니다")}</label>}
                    <div className="flex flex-wrap gap-1.5">
                      <Btn variant="outline" onClick={() => { setEditing(c.id); setDraft(structuredClone(c.fields)); }} data-testid={`button-edit-card-${c.id}`}><Pencil className="h-3.5 w-3.5" />{T("수정")}</Btn>
                      {c.status !== 'confirmed' ? <Btn disabled={needs && !ack[c.id]} onClick={() => updateCard(c.id, (x) => ({ ...x, status: 'confirmed' }))} data-testid={`button-confirm-${c.id}`}><Check className="h-3.5 w-3.5" />{T("확정")}</Btn>
                        : <Btn variant="ghost" onClick={() => updateCard(c.id, (x) => ({ ...x, status: 'draft' }))} data-testid={`button-unconfirm-${c.id}`}>{T("확정 해제")}</Btn>}
                      <Btn variant="ghost" onClick={() => { navigator.clipboard?.writeText(plannerText(c)); toast({ title: T("복사했습니다"), description: T("플래너에 직접 붙여 넣으세요. 자동 동기화되지 않습니다.") }); }} data-testid={`button-copy-${c.id}`}><ClipboardCopy className="h-3.5 w-3.5" />{T("복사")}</Btn>
                    </div>
                    <details><summary className="cursor-pointer text-xs font-semibold flex items-center gap-1"><History className="h-3.5 w-3.5" />{T("버전")}{' '}{c.versions.length}</summary><ul className="mt-1 space-y-1 text-xs">{c.versions.map((v) => <li key={v.version} className="flex items-center gap-1"><span className="font-mono">v{v.version}</span><span className="flex-1 text-muted-foreground">{['교사 수정', '최초 생성'].includes(v.reason) ? T(v.reason) : v.reason}</span><button className="text-primary" onClick={() => updateCard(c.id, (x) => ({ ...x, fields: v.fields, status: 'draft', versions: [...x.versions, { version: x.versions.length + 1, at: now(), reason: `v${v.version} 복원`, fields: v.fields }] }))} data-testid="button-restore">{T("복원")}</button></li>)}</ul></details>
                  </Panel>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <h2 className="mt-10 mb-3 text-xl font-bold">{T("인쇄 묶음 목록(매니페스트)")}</h2>
      {bundles.length === 0 ? <Panel className="text-sm text-muted-foreground">{T("아직 인쇄한 묶음이 없습니다.")}</Panel> : (
        <div className="space-y-2">
          {bundles.map((b) => (
            <Panel key={b.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <span className="font-mono text-xs">{new Date(b.at).toLocaleString()}</span><b>{b.label}</b><Pill tone="gray">{b.layout === 'A4' ? 'A4' : 'A5 x2'}</Pill>
              <span>{b.cardIds.length}{T("장 · A4")}{' '}{studentPages(b.cardIds.map((id) => ({ studentId: cards.find((c) => c.id === id)?.studentId ?? id })), b.layout === 'A4' ? 1 : 2).length}{T("매")}</span>
              <Btn variant="outline" className="ms-auto" onClick={() => doPrint(b.cardIds.map((id) => { const c = cards.find((x) => x.id === id); if (!c) return null; const v = c.versions.find((x) => x.version === b.versions[id]) ?? c.versions[c.versions.length - 1]; return { card: c, fields: v.fields, version: v.version, code: code(c.studentId) }; }).filter(Boolean) as PrintItem[], b.layout, false, b.label)} data-testid={`button-reprint-${b.id}`}><RotateCcw className="h-3.5 w-3.5" />{T("같은 버전 재인쇄")}</Btn>
              <Btn variant="ghost" onClick={() => download(new Blob([JSON.stringify({ ...b, items: b.cardIds.map((id, i) => ({ order: i + 1, card: id, student: code(cards.find((c) => c.id === id)?.studentId ?? ''), kind: cards.find((c) => c.id === id)?.kind, version: b.versions[id] })) }, null, 2)], { type: 'application/json' }), `manifest-${b.id}.json`)} data-testid={`button-manifest-${b.id}`}><FileDown className="h-3.5 w-3.5" />{T("매니페스트")}</Btn>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
