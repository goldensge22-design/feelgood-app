import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { Archive, ExternalLink, FlaskConical, Info, Pencil, Plus, Route as RouteIcon, ShieldAlert, Trash2 } from 'lucide-react';
import { ProvenanceBadges } from '@/components/provenance/badges';
import { ExperienceDetail } from '@/components/provenance/experience-detail';
import { SyntheticPreviewPanel } from '@/components/provenance/synthetic-preview';
import type { CareerCriterion, CareerExperience, CareerState } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useI18n } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace';
import { STRENGTHS, activityVersion, safeUrl, uid, strengthTranslationKey } from '@/lib/career';
import { useToast } from '@/hooks/use-toast';
import { EmptyState, NextSteps, OriginalContent, PageHeader, StrengthChip, WorkspaceGate, useCriterionText } from '@/components/common';
import { cn } from '@/lib/utils';
import { invalidateJobConnectionReviews, metaOf, setExpMeta, setStarNotes, useSidecar, type ExperienceContext } from '@/lib/provenance';
import { storyValues, type StarStoryValues } from '@/lib/star-story';
import { StarStoryFields } from '@/components/provenance/star-story-fields';

const blank = (criterionIds: string[] = []): CareerExperience => ({
  id: uid('exp'), title: '', action: '', result: '', learning: '', strengths: [], criterionIds, confirmed: false, source: 'manual',
});

export function permissionOf(e: CareerExperience, s: CareerState): string | null {
  if (e.source === 'local_activity' && e.sourceId) {
    const a = s.activities.find((x) => x.id === e.sourceId);
    if (!a) return 'deleted';
    if (e.sourceVersion && activityVersion(a) !== e.sourceVersion) return 'changed';
  }
  if (e.permissionStatus && e.permissionStatus !== 'current') return e.permissionStatus;
  return null;
}

function StarSummary({ e, meta }: { e: CareerExperience; meta: ReturnType<typeof metaOf> }) {
  const { t } = useI18n();
  const story = storyValues(e, meta);
  if (!story.situation && !story.roleGoal) return null;
  return (
    <div className="mt-3 border-t pt-3" data-testid={`summary-star-${e.id}`}>
      <dl className="space-y-2 text-sm">
        {story.situation && <div><dt className="text-[11px] font-semibold text-muted-foreground">{t('star.field.situation')}</dt><dd><OriginalContent as="div" className="whitespace-pre-wrap">{story.situation}</OriginalContent></dd></div>}
        {story.roleGoal && <div><dt className="text-[11px] font-semibold text-muted-foreground">{t('star.field.roleGoal')}</dt><dd><OriginalContent as="div" className="whitespace-pre-wrap">{story.roleGoal}</OriginalContent></dd></div>}
      </dl>
      <p className="mt-2 text-[11px] text-muted-foreground">{t('star.deviceNote')}</p>
    </div>
  );
}

export function StrengthPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useI18n();
  const extra = value.filter((v) => !(STRENGTHS as readonly string[]).includes(v));
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t('exp.strengths')}>
      {[...STRENGTHS, ...extra].map((s) => {
        const on = value.includes(s);
        return (
          <button key={s} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== s) : [...value, s])}
            className={cn('min-h-10 rounded-full border px-3 text-xs font-medium transition-colors', on ? 'border-blue bg-blue text-white' : 'hover:bg-muted')} data-testid={`toggle-strength-${s}`}>
            {t(strengthTranslationKey(s)) === strengthTranslationKey(s) ? s : t(strengthTranslationKey(s))}
          </button>
        );
      })}
    </div>
  );
}

export function CriterionPicker({ criteria, value, onChange }: { criteria: CareerCriterion[]; value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useI18n();
  const ctext = useCriterionText();
  if (!criteria.length) return <p className="text-xs text-muted-foreground">{t('exp.noCriteria')} <Link href="/criteria" className="text-blue underline">{t('nav.criteria')}</Link></p>;
  return (
    <div className="space-y-1.5">
      {criteria.map((c) => (
        <label key={c.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/50">
          <Checkbox className="mt-0.5" checked={value.includes(c.id)} onCheckedChange={(v) => onChange(v ? [...value, c.id] : value.filter((x) => x !== c.id))} data-testid={`checkbox-criterion-${c.id}`} />
          <span className="text-sm">{ctext(c).title}</span>
        </label>
      ))}
    </div>
  );
}

function ExperienceDialog({ open, initial, initialStar, initialContext, criteria, onClose, onSave }: {
  open: boolean; initial: CareerExperience | null; initialStar: StarStoryValues; initialContext: ExperienceContext; criteria: CareerCriterion[]; onClose: () => void; onSave: (e: CareerExperience, star: StarStoryValues, context: ExperienceContext) => boolean;
}) {
  const { t } = useI18n();
  const [d, setD] = useState<CareerExperience>(initial ?? blank());
  const [star, setStar] = useState<StarStoryValues>(initialStar);
  const [context, setContext] = useState<ExperienceContext>(initialContext);
  const [saveError, setSaveError] = useState(false);
  useEffect(() => { if (initial) setD(initial); setContext(initialContext); }, [initial, initialContext]);
  const set = <K extends keyof CareerExperience>(k: K, v: CareerExperience[K]) => setD((p) => ({ ...p, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial && initial.title ? t('exp.edit') : t('exp.new')}</DialogTitle>
          <DialogDescription>{t('exp.formHelp')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div><Label htmlFor="exp-title">{t('exp.title')}</Label><Input id="exp-title" dir="auto" className="mt-1.5 min-h-11" maxLength={500} value={d.title} onChange={(e) => set('title', e.target.value)} placeholder={t('exp.titlePh')} data-testid="input-exp-title" /></div>
          {(['action', 'result', 'learning'] as const).map((k) => (
            <div key={k}><Label htmlFor={`exp-${k}`}>{t(`field.${k}`)}</Label>
              <p className="text-xs text-muted-foreground">{t(`field.${k}.help`)}</p>
              <Textarea id={`exp-${k}`} dir="auto" rows={3} className="mt-1.5" maxLength={20000} value={d[k]} onChange={(e) => set(k, e.target.value)} data-testid={`input-exp-${k}`} /></div>
          ))}
          <section className="space-y-3 rounded-xl border border-blue/20 bg-blue/5 p-4" data-testid="section-star-experience">
            <div>
              <h3 className="text-sm font-semibold">{t('star.archiveTitle')}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('star.archiveNote')}</p>
            </div>
            <StarStoryFields value={star} onChange={setStar} testPrefix="archive-star" includeCoreFields={false} />
            {saveError && <p role="alert" className="text-xs text-destructive">{t('star.archiveSaveError')}</p>}
          </section>
          <div className="space-y-2">
            <label htmlFor="exp-context" className="text-sm font-medium">{t('joblink.contextTitle')}</label>
            <p className="text-xs leading-relaxed text-muted-foreground">{t('joblink.contextNote')}</p>
            <select id="exp-context" value={context} onChange={(event) => setContext(event.target.value as ExperienceContext)}
              className="min-h-11 w-full rounded-lg border bg-card px-3 text-sm" data-testid="select-exp-context">
              {(['daily_activity', 'class_simulation', 'job_experience', 'unknown'] as const).map((value) => {
                const key = value === 'daily_activity' ? 'daily' : value === 'class_simulation' ? 'classSimulation' : value === 'job_experience' ? 'jobExperience' : 'unknown';
                return <option key={value} value={value}>{t(`joblink.context.${key}`)}</option>;
              })}
            </select>
          </div>
          <div><Label>{t('exp.strengths')}</Label><p className="mb-2 text-xs text-muted-foreground">{t('exp.strengthsHelp')}</p><StrengthPicker value={d.strengths} onChange={(v) => set('strengths', v)} /></div>
          <div><Label>{t('exp.criteria')}</Label><p className="mb-2 text-xs text-muted-foreground">{t('exp.criteriaHelp')}</p><CriterionPicker criteria={criteria} value={d.criterionIds} onChange={(v) => set('criterionIds', v)} /></div>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <Checkbox className="mt-0.5" checked={d.confirmed} onCheckedChange={(v) => set('confirmed', v === true)} data-testid="checkbox-exp-confirmed" />
            <span className="text-sm">{t('exp.confirm')}</span>
          </label>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-11" onClick={onClose}>{t('common.cancel')}</Button>
           <Button className="min-h-11" disabled={!d.title.trim()} onClick={() => { setSaveError(false); if (!onSave(d, star, context)) setSaveError(true); }} data-testid="button-save-exp">{t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ExperiencesPage() {
  const { t, locale } = useI18n();
  const { data: sidecar, patch } = useSidecar();
  const { update, setSelectedExpId, selectedExpId } = useWorkspace();
  const ctext = useCriterionText();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const filter = params.get('criterion');
  const [editing, setEditing] = useState<CareerExperience | null>(null);
  const [deleting, setDeleting] = useState<CareerExperience | null>(null);
  const { toast } = useToast();
  const openedFromQuery = useRef(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [synOpen, setSynOpen] = useState(() => params.get('synthetic') === '1');

  useEffect(() => {
    if (params.get('new') === '1' && !openedFromQuery.current) {
      openedFromQuery.current = true;
      setEditing(blank(filter ? [filter] : []));
    }
  }, [params, filter]);

  return (
    <div>
      <PageHeader eyebrow={t('exp.eyebrow')} title={t('nav.experiences')} description={t('exp.desc')}
        actions={<>
          <Button className="min-h-11" onClick={() => setEditing(blank(filter ? [filter] : []))} data-testid="button-new-exp"><Plus className="h-4 w-4" /> {t('exp.new')}</Button>
          <Link href="/activities" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border bg-card px-4 text-sm font-medium hover:bg-muted" data-testid="link-from-activity"><RouteIcon className="h-4 w-4" /> {t('exp.fromActivity')}</Link>
          <Button variant="outline" className="min-h-11 border-primary/50 text-primary" aria-expanded={synOpen} onClick={() => setSynOpen((v) => !v)} data-testid="button-open-synthetic-preview"><FlaskConical className="h-4 w-4" /> {t('pv.open')}</Button>
        </>} />
      <WorkspaceGate>
        {(state) => {
          const list = state.experiences.filter((e) => !filter || e.criterionIds.includes(filter));
          const fc = filter ? state.criteria.find((c) => c.id === filter) : null;
          const detail = detailId ? state.experiences.find((x) => x.id === detailId) : null;
          return (
            <>
              {synOpen && <SyntheticPreviewPanel state={state} onClose={() => setSynOpen(false)} />}
              {detail && <ExperienceDetail e={detail} onClose={() => setDetailId(null)} />}
              {filter && (
                <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{t('exp.filtered')}</span>
                  <span className="rounded-md bg-blue-soft px-2 py-0.5 font-medium text-blue">{fc ? ctext(fc).title : filter}</span>
                  <button className="min-h-10 text-blue underline-offset-2 hover:underline" onClick={() => setLocation('/experiences')}>{t('common.clearFilter')}</button>
                </div>
              )}
              {list.length === 0 ? (
                <EmptyState icon={Archive} title={t('exp.emptyTitle')} body={t('exp.emptyBody')}>
                  <Button className="min-h-11" onClick={() => setEditing(blank(filter ? [filter] : []))} data-testid="button-empty-new-exp"><Plus className="h-4 w-4" /> {t('exp.directRecord')}</Button>
                  <Link href={filter ? `/activities?criterion=${filter}&new=1` : '/activities'} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-4 text-sm font-medium hover:bg-muted"><RouteIcon className="h-4 w-4" /> {t('exp.startActivity')}</Link>
                </EmptyState>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {list.map((e) => {
                    const perm = permissionOf(e, state);
                    const expMeta = metaOf(sidecar, e.id);
                    const url = safeUrl(e.sourceUrl);
                    const usedIn = state.applications.filter((a) => a.experienceIds.includes(e.id)).length;
                    return (
                      <article key={e.id} className={cn('surface flex flex-col p-5 transition-shadow hover:shadow-md', selectedExpId === e.id && 'ring-2 ring-blue/40')} data-testid={`card-exp-${e.id}`}>
                        <div className="flex items-start justify-between gap-2">
                          <OriginalContent as="div" className="min-w-0 font-semibold leading-snug">{e.title}</OriginalContent>
                        </div>
                        <div className="mt-2"><ProvenanceBadges e={e} /></div>
                        {perm && (
                          <p className="mt-2 flex items-start gap-1.5 rounded-md bg-warn-soft px-2.5 py-2 text-xs text-warn" data-testid={`status-perm-${e.id}`}>
                            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t(`perm.${perm}`)}
                          </p>
                        )}
                        <dl className="mt-3 space-y-2 text-sm">
                          {(['action', 'result', 'learning'] as const).map((k) => e[k] && (
                             <div key={k}><dt className="text-[11px] font-semibold text-muted-foreground">{t(`field.${k}`)}</dt><dd><OriginalContent as="div" className="whitespace-pre-wrap leading-relaxed">{e[k]}</OriginalContent></dd></div>
                          ))}
                        </dl>
                        <StarSummary e={e} meta={expMeta} />
                        {e.strengths.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{e.strengths.map((s) => <StrengthChip key={s} value={s} />)}</div>}
                        {e.criterionIds.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">{e.criterionIds.map((id) => { const c = state.criteria.find((x) => x.id === id); return <span key={id} className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">{c ? ctext(c).title : id}</span>; })}</div>
                        )}
                        <div className="mt-auto flex flex-wrap items-center gap-1 pt-4">
                          <span className={cn('me-auto text-xs', e.confirmed ? 'text-ok' : 'text-warn')}>{e.confirmed ? t('exp.confirmed') : t('exp.unconfirmed')}</span>
                          {url && <a href={url} target="_blank" rel="noreferrer noopener" className="tap inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" aria-label={t('exp.openSource')}><ExternalLink className="h-4 w-4" /></a>}
                          <Button variant="ghost" size="icon" className="tap" aria-label={t('pv.details')} onClick={() => setDetailId(e.id)} data-testid={`button-detail-exp-${e.id}`}><Info className="h-4 w-4" /></Button>
                          <Button variant="ghost" className="tap" onClick={() => { setSelectedExpId(e.id); setLocation('/questions'); }} data-testid={`button-use-exp-${e.id}`}>{t('exp.useInQuestion')}</Button>
                          <Button variant="ghost" size="icon" className="tap" aria-label={t('common.edit')} onClick={() => setEditing(e)} data-testid={`button-edit-exp-${e.id}`}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="tap text-destructive" aria-label={t('common.delete')} onClick={() => setDeleting(e)} data-testid={`button-delete-exp-${e.id}`}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        {usedIn > 0 && <p className="mt-1 text-[11px] text-muted-foreground">{t('exp.usedIn', { n: usedIn })}</p>}
                      </article>
                    );
                  })}
                </div>
              )}
              <ExperienceDialog key={editing?.id ?? 'closed'} open={!!editing} initial={editing}
                initialStar={editing ? storyValues(editing, metaOf(sidecar, editing.id)) : { action: '', result: '', learning: '' }}
                initialContext={editing ? metaOf(sidecar, editing.id).experienceContext ?? 'unknown' : 'unknown'}
                criteria={state.criteria} onClose={() => setEditing(null)}
                onSave={(d, star, context) => {
                  const previous = storyValues(d, metaOf(sidecar, d.id));
                  const previousExperience = state.experiences.find((item) => item.id === d.id);
                  const starChanged = (['situation', 'roleGoal', 'selectionReason', 'resultEvidence'] as const)
                    .some((key) => (star[key] ?? '') !== (previous[key] ?? ''));
                  const previousContext = metaOf(sidecar, d.id).experienceContext ?? 'unknown';
                  const experienceChanged = !!previousExperience && (
                    previousExperience.title !== d.title || previousExperience.action !== d.action
                    || previousExperience.result !== d.result || previousExperience.learning !== d.learning
                  );
                  if ((starChanged || context !== previousContext || experienceChanged) && !patch((current) => {
                    let next = current;
                    if (starChanged) next = setStarNotes(next, d.id, star);
                    if (context !== previousContext) next = setExpMeta(next, d.id, { experienceContext: context, origin: metaOf(next, d.id).origin ?? d.source });
                    if (experienceChanged) next = invalidateJobConnectionReviews(next, { experienceId: d.id });
                    return next;
                  })) return false;
                  update((s) => {
                    const valid = new Set(s.criteria.map((c) => c.id));
                    const clean = { ...d, criterionIds: d.criterionIds.filter((x) => valid.has(x)) };
                    const exists = s.experiences.some((x) => x.id === d.id);
                    return { ...s, experiences: exists ? s.experiences.map((x) => (x.id === d.id ? clean : x)) : [...s.experiences, clean] };
                  });
                  setEditing(null);
                  toast({ title: t('common.saved') });
                  return true;
                }} />
              <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('exp.deleteTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('exp.deleteBody')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="min-h-11">{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction className="min-h-11 bg-destructive text-destructive-foreground" onClick={() => {
                      const id = deleting?.id;
                      if (!id) return;
                      update((s) => ({
                        ...s,
                        experiences: s.experiences.filter((x) => x.id !== id),
                        applications: s.applications.map((a) => ({ ...a, experienceIds: a.experienceIds.filter((x) => x !== id) })),
                      }));
                      if (selectedExpId === id) setSelectedExpId(null);
                      setDeleting(null);
                    }} data-testid="button-confirm-delete-exp">{t('common.delete')}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          );
        }}
      </WorkspaceGate>
      <NextSteps prev={{ href: '/criteria', label: t('nav.criteria') }} next={{ href: '/questions', label: t('nav.questions') }} />
    </div>
  );
}
