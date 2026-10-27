import { useState } from 'react';
import { Link } from 'wouter';
import { ExternalLink, PenLine, Save, ShieldAlert } from 'lucide-react';
import { ContextCoach } from '@/components/provenance/context-coach';
import { ProvenanceBadges } from '@/components/provenance/badges';
import { snapshotVersion, useSidecar } from '@/lib/provenance';
import type { CareerApplication, CareerState } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LOCALES, useI18n } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace';
import { countChars, safeUrl } from '@/lib/career';
import { useToast } from '@/hooks/use-toast';
import { EmptyState, NextSteps, OriginalContent, PageHeader, SourceMeta, WorkspaceGate, useCriterionText } from '@/components/common';
import { SaveIndicator } from '@/components/shell';
import { AppTabs, useSelectedApp } from '@/pages/questions';
import { permissionOf } from '@/pages/experiences';
import { cn } from '@/lib/utils';

export function VersionDialog({ app, open, onClose }: { app: CareerApplication; open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { createVersion, mode, status, saveNow, state } = useWorkspace();
  const { patch } = useSidecar();
  const { toast } = useToast();
  const [label, setLabel] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const blocked = mode === 'account' && status !== 'saved';
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t('ver.create')}</DialogTitle><DialogDescription>{t('ver.createHelp')}</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="ver-label">{t('ver.label')}</Label><Input id="ver-label" dir="auto" className="mt-1.5 min-h-11" maxLength={500} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('ver.labelPh')} data-testid="input-version-label" /></div>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3"><Checkbox className="mt-0.5" checked={submitted} onCheckedChange={(v) => setSubmitted(v === true)} data-testid="checkbox-version-submitted" /><span className="text-sm">{t('ver.submittedCheck')}</span></label>
          {blocked && <p className="rounded-md bg-warn-soft px-3 py-2 text-xs text-warn">{t('ver.needSaved')} <button className="underline" onClick={saveNow}>{t('ver.saveNow')}</button></p>}
          {err && <p role="alert" className="text-xs text-destructive">{err}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-11" onClick={onClose}>{t('common.cancel')}</Button>
          <Button className="min-h-11" disabled={!label.trim() || busy || blocked} onClick={async () => {
            setBusy(true); setErr(null);
            try { const v = await createVersion(app.id, label.trim(), submitted); if (state) patch((s) => snapshotVersion(s, v.id, app, state)); /* failure toasts via sidecar */ toast({ title: t('ver.created') }); setLabel(''); setSubmitted(false); onClose(); }
            catch (e) { setErr((e as Error).message === 'UNSAVED' ? t('ver.needSaved') : t('ver.failed')); }
            finally { setBusy(false); }
          }} data-testid="button-confirm-version">{busy ? t('common.working') : err ? t('common.retry') : t('ver.create')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Workbench({ state, app }: { state: CareerState; app: CareerApplication }) {
  const { t } = useI18n();
  const { update } = useWorkspace();
  const ctext = useCriterionText();
  const [verOpen, setVerOpen] = useState(false);
  const count = countChars(app.text, app.countSpaces);
  const over = app.limit > 0 && count > app.limit;
  const exps = state.experiences.filter((e) => app.experienceIds.includes(e.id));
  const crits = state.criteria.filter((c) => app.criterionIds.includes(c.id));
  const writingLang = LOCALES.find((l) => l.id === app.writingLanguage);

  return (
    <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_340px]">
      <section className="min-w-0 space-y-4">
        <div className="surface p-5">
          <p className="eyebrow text-muted-foreground">{t('w.questionOriginal')}</p>
          {app.question ? <div data-testid="text-question"><OriginalContent as="p" className="mt-2 whitespace-pre-wrap font-medium leading-relaxed">{app.question}</OriginalContent></div>
            : <p className="mt-2 text-sm text-muted-foreground">{t('w.noQuestion')} <Link href="/questions" className="text-blue underline">{t('nav.questions')}</Link></p>}
          <OriginalContent as="p" className="meta mt-2">{app.company || '—'}{' · '}{app.job || '—'}</OriginalContent>
        </div>
        <div className="surface overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2.5">
            <span className="text-xs text-muted-foreground">{t('w.writingIn')}: {writingLang?.name ?? app.writingLanguage}</span>
            <SaveIndicator dark={false} />
          </div>
          <label htmlFor="editor" className="sr-only">{t('w.editor')}</label>
          <textarea id="editor" dir="auto" lang={app.writingLanguage || undefined}
            className="block min-h-[55dvh] w-full resize-y bg-card px-5 py-5 text-[16px] leading-[1.9] outline-none placeholder:text-muted-foreground/70 md:px-8"
            value={app.text} maxLength={100000} placeholder={t('w.placeholder')}
            onChange={(e) => { const v = e.target.value; update((s) => ({ ...s, applications: s.applications.map((a) => (a.id === app.id ? { ...a, text: v } : a)) })); }}
            data-testid="input-editor" />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
            <span className={cn('font-mono text-sm', over ? 'font-semibold text-destructive' : 'text-muted-foreground')} data-testid="text-char-count" aria-live="polite">
              {count.toLocaleString()}{app.limit > 0 ? ` / ${app.limit.toLocaleString()}` : ''} · {app.countSpaces ? t('q.withSpaces') : t('q.withoutSpaces')}
              {app.limit === 0 && ` · ${t('w.noLimit')}`}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" className="min-h-11" onClick={() => setVerOpen(true)} disabled={!app.text.trim()} data-testid="button-save-version"><Save className="h-4 w-4" /> {t('ver.create')}</Button>
              <Link href="/export" className="inline-flex min-h-11 items-center rounded-lg bg-navy px-4 text-sm font-medium text-white hover:bg-navy-soft" data-testid="link-go-export">{t('nav.export')}</Link>
            </div>
          </div>
          {over && <p role="alert" className="border-t bg-destructive/5 px-4 py-3 text-sm text-destructive">{t('w.overLimit')}</p>}
        </div>
      </section>

      <aside className="space-y-4">
        <ContextCoach key={`${app.id}|${exps.map((e) => e.id).join('|')}`} exps={exps} appId={app.id} />
        <div className="surface p-5">
          <p className="text-sm font-semibold">{t('w.criteriaSnapshot')}</p>
          {crits.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">{t('w.noCriteria')}</p> : crits.map((c) => (
            <div key={c.id} className="mt-3 border-t pt-3 first:border-0 first:pt-0"><p className="text-sm font-medium">{ctext(c).title}</p><div className="mt-1"><SourceMeta c={c} compact /></div></div>
          ))}
        </div>
        <div className="surface p-5">
          <p className="text-sm font-semibold">{t('w.selectedExp')}</p>
          {exps.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">{t('w.noExp')} <Link href="/questions" className="text-blue underline">{t('nav.questions')}</Link></p> : exps.map((e) => {
            const url = safeUrl(e.sourceUrl);
            const perm = permissionOf(e, state);
            return (
              <details key={e.id} className="group mt-3 border-t pt-3 first:border-0 first:pt-0" open={exps.length === 1}>
                <summary className="min-h-10 cursor-pointer list-none text-sm font-medium" dir="auto"><OriginalContent as="span">{e.title}</OriginalContent></summary>
                <div className="mt-1"><ProvenanceBadges e={e} compact appId={app.id} /></div>
                {perm && <p className="mt-1 flex gap-1 text-[11px] text-warn"><ShieldAlert className="h-3.5 w-3.5" /> {t(`perm.${perm}`)}</p>}
                {(['action', 'result', 'learning'] as const).map((k) => e[k] && (
                  <div key={k} className="mt-2"><p className="text-[11px] font-semibold text-muted-foreground">{t(`field.${k}`)}</p><OriginalContent as="p" className="whitespace-pre-wrap text-sm leading-relaxed">{e[k]}</OriginalContent></div>
                ))}
                {url && <a href={url} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex min-h-10 items-center gap-1 text-xs text-blue">{t('exp.openSource')} <ExternalLink className="h-3 w-3" /></a>}
                {e.source === 'local_activity' && e.sourceId && <Link href={`/activities#${encodeURIComponent(e.sourceId)}`} className="mt-2 inline-flex min-h-11 items-center gap-1 text-xs text-blue">{t('exp.openSource')}</Link>}
              </details>
            );
          })}
        </div>
      </aside>
      <VersionDialog app={app} open={verOpen} onClose={() => setVerOpen(false)} />
    </div>
  );
}

export default function WritePage() {
  const { t } = useI18n();
  const { state } = useWorkspace();
  const app = useSelectedApp(state);
  return (
    <div>
      <PageHeader eyebrow={t('w.eyebrow')} title={t('nav.write')} description={t('w.desc')} />
      <WorkspaceGate>
        {(s) => s.applications.length === 0 ? (
          <EmptyState icon={PenLine} title={t('w.emptyTitle')} body={t('w.emptyBody')}>
            <Link href="/questions" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">{t('q.new')}</Link>
          </EmptyState>
        ) : (
          <>
            <AppTabs state={s} />
            {app && <Workbench state={s} app={app} />}
          </>
        )}
      </WorkspaceGate>
      <NextSteps prev={{ href: '/questions', label: t('nav.questions') }} next={{ href: '/versions', label: t('nav.versions') }} />
    </div>
  );
}
