import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { CheckCircle2, Copy, Download, FileDown, FileText, TextSelect, TriangleAlert } from 'lucide-react';
import type { CareerApplication, CareerExportInput } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useI18n } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace';
import { EmptyState, NextSteps, PageHeader, WorkspaceGate } from '@/components/common';
import { AppTabs, useSelectedApp } from '@/pages/questions';
import { countChars } from '@/lib/career';
import type { CareerState } from '@workspace/api-client-react';
import { FactChecklist } from '@/components/provenance/fact-checklist';

type Format = 'txt' | 'docx' | 'hwpx';
type Result = { kind: 'ok' | 'fail'; format: string; message: string } | null;

function ExportPanel({ app, state }: { app: CareerApplication; state: CareerState }) {
  const { t } = useI18n();
  const [confirmed, setConfirmed] = useState(false);
  const [factsOk, setFactsOk] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);
  const payload = (format: Format): CareerExportInput => ({ company: app.company, job: app.job, question: app.question, text: app.text, format, confirmed: true });
  const over = app.limit > 0 && countChars(app.text, app.countSpaces) > app.limit;
  const [manual, setManual] = useState(false);
  const manualRef = useRef<HTMLTextAreaElement>(null);
  const manualText = [`${t('q.company')}: ${app.company}`, `${t('q.job')}: ${app.job}`, `${t('q.question')}:\n${app.question}`, `${t('ex.text')}:\n${app.text}`].join('\n\n');
  const ready = confirmed && factsOk && !!app.text.trim() && !over;
  useEffect(() => {
    setConfirmed(false);
    setResult(null);
    setManual(false);
  }, [app.id, app.company, app.job, app.question, app.text]);

  const download = async (format: Format) => {
    if (!ready) return;
    setBusy(format); setResult(null);
    try {
      const res = await fetch('/api/career/export', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload(format)) });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const base = [app.company, app.job].filter(Boolean).join('_').replace(/[\\/:*?"<>|]+/g, '') || 'nuvia';
      a.href = url; a.download = `${base}.${format}`; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setResult({ kind: 'ok', format, message: t('ex.ok', { f: format.toUpperCase() }) });
    } catch (e) {
      setResult({ kind: 'fail', format, message: t('ex.fail', { f: format.toUpperCase(), code: (e as Error).message }) });
    } finally { setBusy(null); }
  };

  const copy = async () => {
    if (!ready) return;
    try { await navigator.clipboard.writeText([app.company, app.job, app.question, app.text].join('\n\n')); setResult({ kind: 'ok', format: 'copy', message: t('ex.copied') }); }
    catch { setManual(true); setResult({ kind: 'fail', format: 'copy', message: t('ex.copyFail') }); }
  };

  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <section className="surface p-5 md:p-7" aria-label={t('ex.preview')}>
        <p className="eyebrow">{t('ex.preview')}</p>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="grid grid-cols-[6rem_1fr] gap-2"><dt className="text-muted-foreground">{t('q.company')}</dt><dd dir="auto" data-testid="preview-company">{app.company || '—'}</dd></div>
          <div className="grid grid-cols-[6rem_1fr] gap-2"><dt className="text-muted-foreground">{t('q.job')}</dt><dd dir="auto" data-testid="preview-job">{app.job || '—'}</dd></div>
          <div className="grid grid-cols-[6rem_1fr] gap-2"><dt className="text-muted-foreground">{t('q.question')}</dt><dd className="whitespace-pre-wrap" dir="auto" data-testid="preview-question">{app.question || '—'}</dd></div>
        </dl>
        <div className="mt-5 whitespace-pre-wrap border-t pt-5 text-[15px] leading-[1.9]" dir="auto" lang={app.writingLanguage || undefined} data-testid="preview-text">{app.text || <span className="text-muted-foreground">{t('ex.noText')}</span>}</div>
        <p className="mt-5 text-[11px] text-muted-foreground">{t('ex.onlyFour')}</p>
      </section>
      <section className="space-y-4">
        <label className="surface flex min-h-11 cursor-pointer items-start gap-3 border-primary/40 p-5">
          <Checkbox className="mt-0.5" checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} data-testid="checkbox-facts" />
          <span className="text-sm leading-relaxed"><strong className="block">{t('ex.factsTitle')}</strong>{t('ex.factsBody')}</span>
        </label>
        <FactChecklist state={state} app={app} onReady={setFactsOk} />
        <div className="surface space-y-2 p-5">
          {over && <p role="alert" className="text-sm text-destructive">{t('w.overLimit')}</p>}
          <Button variant="outline" className="min-h-12 w-full justify-start" disabled={!ready} onClick={copy} data-testid="button-copy"><Copy className="h-4 w-4" /> {t('ex.copy')}</Button>
          <Button className="min-h-12 w-full justify-start" disabled={!ready || !!busy} onClick={() => download('txt')} data-testid="button-export-txt"><FileDown className="h-4 w-4" /> {busy === 'txt' ? t('common.working') : t('ex.txt')}</Button>
          <Button className="min-h-12 w-full justify-start" disabled={!ready || !!busy} onClick={() => download('docx')} data-testid="button-export-docx"><Download className="h-4 w-4" /> {busy === 'docx' ? t('common.working') : t('ex.docx')}</Button>
          <div className="rounded-lg border border-dashed p-3">
            <Button className="min-h-12 w-full justify-start" disabled={!ready || !!busy} onClick={() => download('hwpx')} aria-describedby="hwpx-why" data-testid="button-export-hwpx"><FileText className="h-4 w-4" /> {busy === 'hwpx' ? t('common.working') : t('ex.hwpx')}</Button>
            <p id="hwpx-why" className="mt-2 text-xs leading-relaxed text-muted-foreground">{t('ex.hwpxWhy')}</p>
          </div>
          <Button variant="ghost" className="min-h-11 w-full justify-start" disabled={!ready} aria-expanded={manual} aria-controls="manual-copy" onClick={() => setManual((v) => !v)} data-testid="button-manual-copy"><TextSelect className="h-4 w-4" /> {t('ex.manualTitle')}</Button>
          {!confirmed && <p className="text-xs text-muted-foreground">{t('ex.needFacts')}</p>}
        </div>
        {result && (
          <div role="status" className={result.kind === 'ok' ? 'flex items-start gap-2 rounded-lg bg-ok-soft p-3 text-sm text-ok' : 'rounded-lg bg-destructive/10 p-3 text-sm text-destructive'} data-testid="status-export">
            {result.kind === 'ok' ? <><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {result.message}</> : (
              <div>
                <p className="flex items-start gap-2"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {result.message}</p>
                {result.format !== 'copy' && <Button size="sm" variant="outline" className="mt-2 min-h-10" onClick={() => download(result.format as Format)} data-testid="button-export-retry">{t('common.retry')}</Button>}
              </div>
            )}
          </div>
        )}
        {manual && ready && (
          <div id="manual-copy" className="surface p-4" data-testid="panel-manual-copy">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{t('ex.manualTitle')}</p>
              <Button size="sm" variant="outline" className="min-h-10" onClick={() => { manualRef.current?.focus(); manualRef.current?.select(); }} data-testid="button-manual-select">{t('ex.selectAll')}</Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t('ex.manualHelp')}</p>
            <textarea ref={manualRef} readOnly value={manualText} dir="auto" lang={app.writingLanguage || undefined} rows={10} aria-label={t('ex.manualTitle')} className="mt-3 w-full resize-y rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed" data-testid="textarea-manual-copy" />
          </div>
        )}
      </section>
    </div>
  );
}

export default function ExportPage() {
  const { t } = useI18n();
  const { state } = useWorkspace();
  const app = useSelectedApp(state);
  return (
    <div>
      <PageHeader eyebrow={t('ex.eyebrow')} title={t('nav.export')} description={t('ex.desc')} />
      <WorkspaceGate>
        {(s) => s.applications.length === 0 ? (
          <EmptyState icon={FileDown} title={t('w.emptyTitle')} body={t('w.emptyBody')}>
            <Link href="/questions" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">{t('q.new')}</Link>
          </EmptyState>
        ) : (
          <>
            <AppTabs state={s} />
            {app && <ExportPanel key={app.id} app={app} state={s} />}
          </>
        )}
      </WorkspaceGate>
      <NextSteps prev={{ href: '/versions', label: t('nav.versions') }} next={{ href: '/journey', label: t('nav.journey') }} />
    </div>
  );
}
