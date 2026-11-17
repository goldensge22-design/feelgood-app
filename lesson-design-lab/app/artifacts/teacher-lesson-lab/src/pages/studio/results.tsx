import { useState } from 'react';
import { ChevronDown, Save } from 'lucide-react';
import { T } from '@/i18n/tx';
import { saveReport, visibleReports } from '@/lib/studio';
import type { ReportSnapshot } from '@/lib/studio/types';
import { Btn, Pill, inputCls } from '@/components/shell';
import { cn } from '@/lib/utils';
import { StudioFrame, Section, Txt, Check, act, useDraft, useStudio, studentName, tryOr, Empty } from './common';
import { rankedTop5, reportBasisLabel } from '@/lib/studio/reports';
import { reportLabel } from '@/lib/studio/report-labels';
import { formatDateTime } from '@/i18n/format';

const blank = (studentId: string): ReportSnapshot => ({ studentId, kind: 'accuracy-percent', scores: { P: 0, A: 0, S: 0, Q: 0 }, pattern: '', top5: Array.from({ length: 5 }, () => ({ title: '', reason: '' })), test: '', date: '', scale: '', version: '', connected: false, confirmed: false });

export default function Results() {
  const { s, course, actor } = useStudio();
  const reports = course ? tryOr(() => visibleReports(s, course.id), [] as ReportSnapshot[]) : [];
  const roster = course ? s.students.filter((x) => course.studentIds.includes(x.id)) : [];
  const [sel, setSel] = useDraft('results-student', roster[0]?.id ?? '');
  const kinds = new Set(reports.map((r) => r.kind));
  return (
    <StudioFrame kicker="STUDIO 1.5 · RESULTS" title={T('PASS 결과와 TOP5')}>
      {kinds.size > 1 && <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" data-testid="warning-mixed">{T('정확도(%) 결과와 데모 정규화 결과가 섞여 있습니다. 두 값은 서로 비교하거나 합산하지 마세요.')}</div>}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <Section title={T('학생별 결과')} hint={T('입력된 값만 표시합니다. 유형·패턴은 추정하지 않습니다.')}>
          {reports.length === 0 ? <Empty title={T('저장된 결과가 없습니다')} body={T('오른쪽에서 결과지 값을 그대로 옮겨 적으세요.')} /> : (
            <div className="space-y-3">{reports.map((r) => <div key={r.studentId}>
              <ReportCard r={r} name={studentName(s, r.studentId)} onEdit={actor.role === 'teacher' ? () => setSel(r.studentId) : undefined} />
              {actor.role === 'teacher' && <details className="mt-2 rounded-lg border p-3" data-testid={`report-history-${r.studentId}`}>
                <summary className="cursor-pointer text-sm font-semibold">{reportLabel('history')}</summary>
                <div className="mt-2 space-y-2">{[...(s.studio.reportHistory ?? [])].filter((x) => x.studentId === r.studentId).reverse().map((old, i) =>
                  <ReportCard key={old.snapshotId ?? i} r={old} name={studentName(s, r.studentId)} historical />)}</div>
                <div className="mt-2 space-y-1 text-xs" data-testid={`report-bases-${r.studentId}`}>
                  {[...s.personalWorksheets, ...s.plannerActivities].filter((d) => d.studentId === r.studentId).map((d) => {
                    const mission = s.studio.missions.find((m) => m.worksheetId === d.id || m.plannerId === d.id);
                    return <p key={d.id}>{d.id} · {mission ? reportBasisLabel(mission) : reportLabel('unknown')}</p>;
                  })}
                </div>
              </details>}
            </div>)}</div>
          )}
        </Section>
        {actor.role === 'teacher' ? (
          <Section title={T('결과지 입력')} hint={T('원본 결과지 순서 그대로 TOP5를 입력합니다.')}>
            <select data-testid="select-report-student" value={sel} onChange={(e) => setSel(e.target.value)} className={cn(inputCls, 'mb-3')}>
              <option value="">{T('학생 선택')}</option>
              {roster.map((x) => <option key={x.id} value={x.id}>{x.displayName || x.code}</option>)}
            </select>
            {sel && <ReportForm key={sel} studentId={sel} existing={reports.find((r) => r.studentId === sel)} />}
          </Section>
        ) : <Section title={T('결과지 입력')}><p className="text-sm text-muted-foreground">{T('결과 입력은 교사 역할에서만 가능합니다.')}</p></Section>}
      </div>
    </StudioFrame>
  );
}

function ReportCard({ r, name, onEdit, historical = false }: { r: ReportSnapshot; name: string; onEdit?: () => void; historical?: boolean }) {
  const [open, setOpen] = useState(false);
  const acc = r.kind === 'accuracy-percent';
  return (
    <article className="rounded-lg border p-3" data-testid={`${historical ? 'history' : 'card'}-report-${r.studentId}`} data-revision={r.revision ?? 1}>
      <div className="flex flex-wrap items-center gap-2">
        <b>{name}</b>
        <Pill tone={acc ? 'blue' : 'orange'}>{acc ? T('정확도(%)') : T('데모 정규화 · 비교 불가')}</Pill>
        {r.confirmed ? <Pill tone="blue">{T('교사 확인')}</Pill> : <Pill tone="gray">{T('미확인')}</Pill>}
        <Pill tone="gray">{r.connected ? T('연결 표시됨(수동)') : T('미연동')}</Pill>
        {onEdit && <button type="button" className="ms-auto text-xs font-semibold text-primary" onClick={onEdit} data-testid={`button-edit-report-${r.studentId}`}>{T('수정')}</button>}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{!historical && `${reportLabel('current')} · `}{reportLabel('revision')} v{r.revision ?? 1} · {r.savedAt ? formatDateTime(r.savedAt) : reportLabel('legacy')}</p>
      <div className="mt-2 grid grid-cols-4 gap-1.5" aria-label={T('4개 점수')}>
        {(['P', 'A', 'S', 'Q'] as const).map((k) => (
          <div key={k} className="rounded-md bg-muted px-2 py-1.5 text-center"><div className="font-mono text-[11px] text-muted-foreground">{k}</div><div className="font-mono text-lg font-semibold">{r.scores ? r.scores[k] : '—'}{r.scores && acc ? <span className="text-xs">%</span> : null}</div></div>
        ))}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{T('패턴')}: {r.pattern ? <span className="text-foreground">{r.pattern}</span> : T('미입력 — 추정하지 않음')}</div>
      <div className="mt-2">
        <div className="text-[11px] font-semibold text-muted-foreground">{T('TOP5 (원본 순서, 점수와 별개)')}</div>
        <ol className="mt-1 space-y-0.5 text-sm">{rankedTop5(r).map((t) => <li key={t.rank} value={t.rank} data-rank={t.rank} className="flex gap-2"><span className="font-mono text-xs text-[hsl(var(--sidebar-primary))]">{t.rank}</span><span><b>{t.title || T('미입력')}</b>{t.reason && <span className="text-muted-foreground"> · {t.reason}</span>}</span></li>)}</ol>
      </div>
      <button type="button" onClick={() => setOpen(!open)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary" data-testid={historical ? `history-source-${r.studentId}-${r.revision ?? 1}` : `button-source-${r.studentId}`} aria-expanded={open}><ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />{T('출처 상세')}</button>
      {open && <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-md bg-muted/60 p-2 text-xs rise"><dt>{T('검사')}</dt><dd>{r.test || '—'}</dd><dt>{T('검사일')}</dt><dd className="font-mono">{r.date || '—'}</dd><dt>{T('척도')}</dt><dd>{r.scale || '—'}</dd><dt>{T('버전')}</dt><dd className="font-mono">{r.version || '—'}</dd></dl>}
    </article>
  );
}

function ReportForm({ studentId, existing }: { studentId: string; existing?: ReportSnapshot }) {
  const [r, setR] = useDraft<ReportSnapshot>(`report-${studentId}`, () => existing ?? blank(studentId));
  const set = (p: Partial<ReportSnapshot>) => setR((x) => ({ ...x, ...p }));
  const sc = r.scores ?? { P: 0, A: 0, S: 0, Q: 0 };
  const top5 = rankedTop5(r).map(({ title, reason }) => ({ title, reason }));
  return (
    <div className="space-y-3">
      <div className="flex gap-2">{(['accuracy-percent', 'demo-normalized'] as const).map((k) => <button key={k} type="button" data-testid={`button-kind-${k}`} onClick={() => set({ kind: k })} className={cn('rounded-full border px-3 py-1 text-sm font-semibold', r.kind === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-card')}>{k === 'accuracy-percent' ? T('정확도(%)') : T('데모 정규화')}</button>)}</div>
      <div className="grid grid-cols-4 gap-2">{(['P', 'A', 'S', 'Q'] as const).map((k) => <label key={k} className="text-sm"><span className="font-mono text-xs">{k}</span><input type="number" data-testid={`input-score-${k}`} value={sc[k]} onChange={(e) => set({ scores: { ...sc, [k]: Number(e.target.value) } })} className={cn(inputCls, 'font-mono')} /></label>)}</div>
      <Check label={T('점수 없음(결과지에 점수 미표기)')} checked={r.scores === null} onChange={(v) => set({ scores: v ? null : { P: 0, A: 0, S: 0, Q: 0 } })} testid="check-no-scores" />
      <Txt label={T('패턴 (결과지에 적힌 그대로)')} value={r.pattern} onChange={(v) => set({ pattern: v })} testid="input-pattern" />
      <div className="space-y-1.5">
        <div className="text-[13px] font-semibold text-muted-foreground">TOP5</div>
        {top5.map((t, i) => <div key={i} className="grid grid-cols-[18px_1fr_1.4fr] items-center gap-1.5"><span className="font-mono text-xs">{i + 1}</span><input value={t.title} placeholder={T('직무')} data-testid={`input-top5-title-${i}`} onChange={(e) => set({ top5: top5.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} className={inputCls} /><input value={t.reason} placeholder={T('결과지 근거')} data-testid={`input-top5-reason-${i}`} onChange={(e) => set({ top5: top5.map((x, j) => (j === i ? { ...x, reason: e.target.value } : x)) })} className={inputCls} /></div>)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Txt label={T('검사명')} value={r.test} onChange={(v) => set({ test: v })} testid="input-test" />
        <Txt label={T('검사일')} value={r.date} onChange={(v) => set({ date: v })} testid="input-date" />
        <Txt label={T('척도')} value={r.scale} onChange={(v) => set({ scale: v })} testid="input-scale" />
        <Txt label={T('버전')} value={r.version} onChange={(v) => set({ version: v })} testid="input-version" />
      </div>
      <div className="flex flex-wrap gap-4"><Check label={T('교사가 원본과 대조 확인')} checked={r.confirmed} onChange={(v) => set({ confirmed: v })} testid="check-confirmed" /><Check label={T('외부 결과와 수동 연결 표시')} checked={r.connected} onChange={(v) => set({ connected: v })} testid="check-connected" /></div>
      <Btn onClick={() => {
        let saved: ReportSnapshot | undefined;
        if (act((s) => { const next = saveReport(s, r); saved = next.studio.reports.find((x) => x.studentId === studentId); return next; }, '결과를 저장했습니다') && saved) setR(saved);
      }} data-testid="button-save-report"><Save className="h-4 w-4" />{T('저장')}</Btn>
    </div>
  );
}
