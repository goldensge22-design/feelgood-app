import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { ClipboardList, Info, PenLine, Plus, Trash2 } from 'lucide-react';
import type { CareerApplication, CareerState } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LOCALES, useI18n } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace';
import { newApplication } from '@/lib/career';
import { EmptyState, NextSteps, OriginalContent, PageHeader, WorkspaceGate, useCriterionText } from '@/components/common';
import { CriterionPicker } from '@/pages/experiences';
import { cn } from '@/lib/utils';
import { MatchPanel } from '@/components/provenance/match-panel';
import { ProvenanceBadges } from '@/components/provenance/badges';
import { appExpMeta, useSidecar } from '@/lib/provenance';

export function AppTabs({ state }: { state: CareerState }) {
  const { t } = useI18n();
  const { selectedAppId, setSelectedAppId } = useWorkspace();
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t('q.list')}>
      {state.applications.map((a, i) => (
        <button key={a.id} role="tab" aria-selected={selectedAppId === a.id} onClick={() => setSelectedAppId(a.id)}
          className={cn('min-h-11 shrink-0 rounded-lg border px-3 text-start text-sm', selectedAppId === a.id ? 'border-blue bg-blue-soft text-blue' : 'bg-card hover:bg-muted')} data-testid={`tab-app-${a.id}`}>
          <OriginalContent as="span" badge={false} className="block max-w-[18rem] whitespace-normal break-words font-semibold">{a.company || t('q.untitled', { n: i + 1 })}</OriginalContent>
          <OriginalContent as="span" badge={false} className="block max-w-[18rem] whitespace-normal break-words text-xs text-muted-foreground">{a.job || '—'}</OriginalContent>
        </button>
      ))}
    </div>
  );
}

export function useSelectedApp(state: CareerState | null) {
  const { selectedAppId, setSelectedAppId } = useWorkspace();
  const app = state?.applications.find((a) => a.id === selectedAppId) ?? null;
  useEffect(() => {
    if (state && !app && state.applications[0]) setSelectedAppId(state.applications[0].id);
  }, [state, app, setSelectedAppId]);
  return app;
}

function Editor({ state, app }: { state: CareerState; app: CareerApplication }) {
  const { t } = useI18n();
  const { data: provenance } = useSidecar();
  const { update, selectedExpId, setSelectedExpId, setSelectedAppId } = useWorkspace();
  const ctext = useCriterionText();
  const [, setLocation] = useLocation();
  const patch = (p: Partial<CareerApplication>) => update((s) => ({ ...s, applications: s.applications.map((a) => (a.id === app.id ? { ...a, ...p } : a)) }));

  const suggestions = state.experiences
    .filter((e) => provenance.apps[app.id]?.requirement !== 'actual' || appExpMeta(provenance, app.id, e.id).nature === 'actual')
    .map((e) => ({ e, overlap: e.criterionIds.filter((c) => app.criterionIds.includes(c)) }))
    .filter((x) => x.overlap.length > 0)
    .sort((a, b) => b.overlap.length - a.overlap.length);

  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
      <section className="surface space-y-4 p-5 md:p-6" aria-label={t('q.details')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="q-company">{t('q.company')}</Label><Input id="q-company" dir="auto" className="mt-1.5 min-h-11" maxLength={500} value={app.company} onChange={(e) => patch({ company: e.target.value })} data-testid="input-company" /></div>
          <div><Label htmlFor="q-job">{t('q.job')}</Label><Input id="q-job" dir="auto" className="mt-1.5 min-h-11" maxLength={500} value={app.job} onChange={(e) => patch({ job: e.target.value })} placeholder={state.selectedJob || undefined} data-testid="input-job" /></div>
        </div>
        <div>
          <Label htmlFor="q-question">{t('q.question')}</Label>
          <p className="text-xs text-muted-foreground">{t('q.questionHelp')}</p>
          <Textarea id="q-question" dir="auto" rows={4} className="mt-1.5" maxLength={20000} value={app.question} onChange={(e) => patch({ question: e.target.value })} data-testid="input-question" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><Label htmlFor="q-limit">{t('q.limit')}</Label><Input id="q-limit" type="number" min={0} max={100000} inputMode="numeric" className="mt-1.5 min-h-11" value={app.limit} onChange={(e) => patch({ limit: Math.max(0, Math.min(100000, Number(e.target.value) || 0)) })} data-testid="input-limit" />
            <p className="mt-1 text-[11px] text-muted-foreground">{t('q.limitHelp')}</p></div>
          <div><Label htmlFor="q-spaces">{t('q.countSpaces')}</Label>
            <div className="mt-1.5 flex min-h-11 items-center gap-2"><Switch id="q-spaces" checked={app.countSpaces} onCheckedChange={(v) => patch({ countSpaces: v })} data-testid="switch-count-spaces" /><span className="text-sm">{app.countSpaces ? t('q.withSpaces') : t('q.withoutSpaces')}</span></div></div>
          <div><Label>{t('q.writingLanguage')}</Label>
            <Select value={app.writingLanguage || 'ko'} onValueChange={(v) => patch({ writingLanguage: v })}>
              <SelectTrigger className="mt-1.5 min-h-11" data-testid="select-writing-language"><SelectValue /></SelectTrigger>
              <SelectContent>{LOCALES.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}{!LOCALES.some((l) => l.id === app.writingLanguage) && app.writingLanguage && <SelectItem value={app.writingLanguage}>{app.writingLanguage}</SelectItem>}</SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">{t('q.writingLanguageHelp')}</p></div>
        </div>
        <div><Label>{t('q.criteria')}</Label><p className="mb-2 text-xs text-muted-foreground">{t('q.criteriaHelp')}</p>
          <CriterionPicker criteria={state.criteria} value={app.criterionIds} onChange={(v) => patch({ criterionIds: v })} /></div>
      </section>

      <section className="space-y-4" aria-label={t('q.experiences')}>
        <div className="surface p-5">
          <h2 className="font-semibold">{t('q.suggestTitle')}</h2>
          <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t('q.suggestExplain')}</p>
          {suggestions.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{t('q.noSuggest')}</p> : (
            <ul className="mt-3 space-y-2">
              {suggestions.map(({ e, overlap }) => (
                <li key={e.id} className="rounded-lg border p-3 text-sm" data-testid={`suggestion-${e.id}`}>
                  <OriginalContent as="div" className="font-medium">{e.title}</OriginalContent>
                  <div className="mt-1"><ProvenanceBadges e={e} appId={app.id} compact /></div>
                  <p className="mt-1 text-xs text-muted-foreground">{t('q.sharedCriteria')}: {overlap.map((id) => { const c = state.criteria.find((x) => x.id === id); return c ? ctext(c).title : id; }).join(', ')}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="surface p-5">
          <h2 className="font-semibold">{t('q.selectExp')}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t('q.selectExpHelp')}</p>
          {state.experiences.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{t('q.noExp')}</p> : (
            <div className="mt-3 space-y-1.5">
              {state.experiences.map((e) => (
                <label key={e.id} className={cn('flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5', selectedExpId === e.id && 'border-blue/50 bg-blue-soft/50')}>
                  <Checkbox className="mt-0.5" checked={app.experienceIds.includes(e.id)} onCheckedChange={(v) => { patch({ experienceIds: v ? [...app.experienceIds, e.id] : app.experienceIds.filter((x) => x !== e.id) }); if (v) setSelectedExpId(e.id); }} data-testid={`checkbox-app-exp-${e.id}`} />
                  <span className="min-w-0"><OriginalContent as="span" className="text-sm">{e.title}</OriginalContent><span className="mt-1 block"><ProvenanceBadges e={e} appId={app.id} compact /></span></span>
                </label>
              ))}
            </div>
          )}
        </div>
        <MatchPanel state={state} app={app} />
        <Button className="min-h-12 w-full" onClick={() => { setSelectedAppId(app.id); setLocation('/write'); }} data-testid="button-go-write"><PenLine className="h-4 w-4" /> {t('q.goWrite')}</Button>
      </section>
    </div>
  );
}

export default function QuestionsPage() {
  const { t } = useI18n();
  const { update, setSelectedAppId, state } = useWorkspace();
  const app = useSelectedApp(state);
  const add = () => { if (!state) return; const a = newApplication(); if (state.selectedJob) a.job = state.selectedJob; update((s) => ({ ...s, applications: [...s.applications, a] })); setSelectedAppId(a.id); };
  return (
    <div>
      <PageHeader eyebrow={t('q.eyebrow')} title={t('nav.questions')} description={t('q.desc')}
        actions={<Button className="min-h-11" disabled={!state} onClick={add} data-testid="button-new-app"><Plus className="h-4 w-4" /> {t('q.new')}</Button>} />
      <WorkspaceGate>
        {(s) => s.applications.length === 0 ? (
          <EmptyState icon={ClipboardList} title={t('q.emptyTitle')} body={t('q.emptyBody')}>
            <Button className="min-h-11" onClick={add}><Plus className="h-4 w-4" /> {t('q.new')}</Button>
          </EmptyState>
        ) : (
          <>
            <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><AppTabs state={s} /></div>
              {app && <Button variant="ghost" size="icon" className="tap shrink-0 text-destructive" aria-label={t('q.delete')} onClick={() => {
                if (!window.confirm(t('q.deleteConfirm'))) return;
                update((st) => ({ ...st, applications: st.applications.filter((a) => a.id !== app.id) }));
                setSelectedAppId(null);
              }} data-testid="button-delete-app"><Trash2 className="h-4 w-4" /></Button>}
            </div>
            {app && <Editor state={s} app={app} />}
          </>
        )}
      </WorkspaceGate>
      <NextSteps prev={{ href: '/experiences', label: t('nav.experiences') }} next={{ href: '/write', label: t('nav.write') }} />
    </div>
  );
}
