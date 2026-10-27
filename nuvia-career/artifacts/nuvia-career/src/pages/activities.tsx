import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearch } from 'wouter';
import { ArrowUpRight, CalendarClock, Download, Pencil, Plus, Route as RouteIcon, Trash2 } from 'lucide-react';
import type { CareerActivity, CareerActivityStatus, CareerCriterion } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useI18n } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace';
import { activityVersion, newActivity, uid, strengthTranslationKey } from '@/lib/career';
import { useToast } from '@/hooks/use-toast';
import { EmptyState, NextSteps, OriginalContent, PageHeader, StrengthChip, WorkspaceGate, useCriterionText } from '@/components/common';
import { StrengthPicker } from '@/pages/experiences';
import { cn } from '@/lib/utils';

const STATUSES: CareerActivityStatus[] = ['planned', 'active', 'paused', 'partial', 'completed'];
const STATUS_TONE: Record<CareerActivityStatus, string> = {
  planned: 'bg-muted text-muted-foreground', active: 'bg-blue-soft text-blue', paused: 'bg-warn-soft text-warn', partial: 'bg-warn-soft text-warn', completed: 'bg-ok-soft text-ok',
};

function ActivityDialog({ open, initial, isNew, criteria, onClose, onSave }: {
  open: boolean; initial: CareerActivity | null; isNew: boolean; criteria: CareerCriterion[]; onClose: () => void; onSave: (a: CareerActivity) => void;
}) {
  const { t } = useI18n();
  const ctext = useCriterionText();
  const [d, setD] = useState<CareerActivity>(initial ?? newActivity());
  const [accept, setAccept] = useState(!isNew);
  useEffect(() => { if (initial) { setD(initial); setAccept(!isNew); } }, [initial, isNew]);
  const set = <K extends keyof CareerActivity>(k: K, v: CareerActivity[K]) => setD((p) => ({ ...p, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? t('act.new') : t('act.edit')}</DialogTitle>
          <DialogDescription>{t('act.localOnly')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div><Label htmlFor="act-title">{t('act.title')}</Label><Input id="act-title" dir="auto" className="mt-1.5 min-h-11" maxLength={500} value={d.title} onChange={(e) => set('title', e.target.value)} placeholder={t('act.titlePh')} data-testid="input-act-title" /></div>
          <div>
            <Label>{t('act.criterion')}</Label>
            <Select value={d.criterionId || 'none'} onValueChange={(v) => set('criterionId', v === 'none' ? '' : v)}>
              <SelectTrigger className="mt-1.5 min-h-11" data-testid="select-act-criterion"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('act.noCriterion')}</SelectItem>
                {criteria.map((c) => <SelectItem key={c.id} value={c.id}>{ctext(c).title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="act-goal">{t('act.goal')}</Label><Textarea id="act-goal" dir="auto" rows={2} className="mt-1.5" value={d.goal} onChange={(e) => set('goal', e.target.value)} data-testid="input-act-goal" /></div>
            <div><Label htmlFor="act-completion">{t('act.completion')}</Label><Textarea id="act-completion" dir="auto" rows={2} className="mt-1.5" value={d.completion} onChange={(e) => set('completion', e.target.value)} data-testid="input-act-completion" /></div>
          </div>
          <div><Label htmlFor="act-steps">{t('act.steps')}</Label><Textarea id="act-steps" dir="auto" rows={3} className="mt-1.5" value={d.steps} onChange={(e) => set('steps', e.target.value)} placeholder={t('act.stepsPh')} data-testid="input-act-steps" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="act-date">{t('act.date')}</Label><Input id="act-date" type="date" className="mt-1.5 min-h-11" value={d.date} onChange={(e) => set('date', e.target.value)} data-testid="input-act-date" />
              <p className="mt-1 text-[11px] text-muted-foreground">{t('act.timeBlockNote')}</p></div>
            <div><Label>{t('act.status')}</Label>
              <Select value={d.status} onValueChange={(v) => set('status', v as CareerActivityStatus)}>
                <SelectTrigger className="mt-1.5 min-h-11" data-testid="select-act-status"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>)}</SelectContent>
              </Select></div>
          </div>
          <div><Label htmlFor="act-evidence">{t('act.evidence')}</Label><p className="text-xs text-muted-foreground">{t('act.evidenceHelp')}</p><Textarea id="act-evidence" dir="auto" rows={2} className="mt-1.5" value={d.evidence} onChange={(e) => set('evidence', e.target.value)} data-testid="input-act-evidence" /></div>
          <div><Label>{t('exp.strengths')}</Label><p className="mb-2 text-xs text-muted-foreground">{t('exp.strengthsHelp')}</p><StrengthPicker value={d.strengths} onChange={(v) => set('strengths', v)} />
            <ul className="mt-3 space-y-1 text-xs text-blue">
              {d.strengths.filter((s) => strengthTranslationKey(s).startsWith('area.')).map((s) =>
                <li key={s}>{t(strengthTranslationKey(s))}: {t(`${strengthTranslationKey(s)}.strategy`)}</li>)}
            </ul>
          </div>
          <fieldset className="rounded-xl border p-4">
            <legend className="px-1 text-sm font-semibold">{t('act.reflection')}</legend>
            <p className="mb-3 text-xs text-muted-foreground">{t('act.reflectionHelp')}</p>
            {(['action', 'changed', 'result', 'learning'] as const).map((k) => (
              <div key={k} className="mb-3"><Label htmlFor={`act-${k}`}>{t(`field.${k}`)}</Label><Textarea id={`act-${k}`} dir="auto" rows={2} className="mt-1" value={d[k]} onChange={(e) => set(k, e.target.value)} data-testid={`input-act-${k}`} /></div>
            ))}
          </fieldset>
          {isNew && (
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <Checkbox className="mt-0.5" checked={accept} onCheckedChange={(v) => setAccept(v === true)} data-testid="checkbox-act-accept" />
              <span className="text-sm">{t('act.acceptPlan')}</span>
            </label>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-11" onClick={onClose}>{t('common.cancel')}</Button>
          <Button className="min-h-11" disabled={!d.title.trim() || !accept} onClick={() => onSave(d)} data-testid="button-save-act">{t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({ activity, onClose }: { activity: CareerActivity | null; onClose: () => void }) {
  const { t } = useI18n();
  const { update, state } = useWorkspace();
  const { toast } = useToast();
  const [fields, setFields] = useState({ action: true, result: true, learning: true });
  useEffect(() => { if (activity) setFields({ action: !!activity.action, result: !!activity.result, learning: !!activity.learning }); }, [activity]);
  if (!activity) return null;
  const existing = state?.experiences.find((e) => e.source === 'local_activity' && e.sourceId === activity.id);
  const any = fields.action || fields.result || fields.learning;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('imp.title')}</DialogTitle>
          <DialogDescription>{t('imp.desc')}</DialogDescription>
        </DialogHeader>
        {existing && <p className="rounded-md bg-blue-soft px-3 py-2 text-xs text-blue">{t('imp.existing')}</p>}
        <div className="space-y-2">
          {(['action', 'result', 'learning'] as const).map((k) => (
            <label key={k} className={cn('block cursor-pointer rounded-lg border p-3', !activity[k] && 'opacity-50')}>
              <span className="flex min-h-8 items-center gap-3">
                <Checkbox disabled={!activity[k]} checked={fields[k]} onCheckedChange={(v) => setFields((f) => ({ ...f, [k]: v === true }))} data-testid={`checkbox-import-${k}`} />
                <span className="text-sm font-semibold">{t(`field.${k}`)}</span>
              </span>
              <OriginalContent as="p" className="mt-1 whitespace-pre-wrap ps-7 text-sm text-muted-foreground">{activity[k] || t('imp.emptyField')}</OriginalContent>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t('imp.excluded')}</p>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-11" onClick={onClose}>{t('common.cancel')}</Button>
          <Button className="min-h-11" disabled={!any} onClick={() => {
            const pick = { action: fields.action ? activity.action : '', result: fields.result ? activity.result : '', learning: fields.learning ? activity.learning : '' };
            update((s) => {
              const valid = s.criteria.some((c) => c.id === activity.criterionId);
              const prior = s.experiences.find((e) => e.source === 'local_activity' && e.sourceId === activity.id);
              if (prior) {
                return { ...s, experiences: s.experiences.map((e) => (e.id === prior.id ? { ...e, ...pick, sourceVersion: activityVersion(activity), permissionStatus: 'current' } : e)) };
              }
              return {
                ...s,
                experiences: [...s.experiences, {
                  id: uid('exp'), title: activity.title, ...pick, strengths: [], criterionIds: valid ? [activity.criterionId] : [],
                  confirmed: false, source: 'local_activity', sourceId: activity.id, sourceVersion: activityVersion(activity), permissionStatus: 'current',
                }],
              };
            });
            toast({ title: existing ? t('imp.updated') : t('imp.done') });
            onClose();
          }} data-testid="button-confirm-import">{existing ? t('imp.update') : t('imp.confirm')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ActivitiesPage() {
  const { t } = useI18n();
  const { update } = useWorkspace();
  const ctext = useCriterionText();
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const [editing, setEditing] = useState<{ a: CareerActivity; isNew: boolean } | null>(null);
  const [importing, setImporting] = useState<CareerActivity | null>(null);
  const [deleting, setDeleting] = useState<CareerActivity | null>(null);
  const opened = useRef(false);

  useEffect(() => {
    if (params.get('new') === '1' && !opened.current) {
      opened.current = true;
      setEditing({ a: newActivity(params.get('criterion') ?? ''), isNew: true });
    }
  }, [params]);

  return (
    <div>
      <PageHeader eyebrow={t('act.eyebrow')} title={t('nav.activities')} description={t('act.desc')}
        actions={<Button className="min-h-11" onClick={() => setEditing({ a: newActivity(), isNew: true })} data-testid="button-new-act"><Plus className="h-4 w-4" /> {t('act.new')}</Button>} />
      <div className="mb-6 flex items-start gap-3 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
        <span>{t('act.plannerNote')} <Link href="/connections" className="text-blue underline-offset-2 hover:underline">{t('nav.connections')}</Link></span>
      </div>
      <WorkspaceGate>
        {(state) => (
          <>
            {state.activities.length === 0 ? (
              <EmptyState icon={RouteIcon} title={t('act.emptyTitle')} body={t('act.emptyBody')}>
                <Button className="min-h-11" onClick={() => setEditing({ a: newActivity(), isNew: true })}><Plus className="h-4 w-4" /> {t('act.new')}</Button>
              </EmptyState>
            ) : (
              <div className="space-y-3">
                {state.activities.map((a) => {
                  const c = state.criteria.find((x) => x.id === a.criterionId);
                  const imported = state.experiences.find((e) => e.source === 'local_activity' && e.sourceId === a.id);
                  const hasReflection = !!(a.action || a.result || a.learning);
                  return (
                    <article id={a.id} key={a.id} className="surface scroll-mt-24 p-5" data-testid={`card-act-${a.id}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <OriginalContent as="div" className="font-semibold">{a.title}</OriginalContent>
                          <p className="mt-0.5 text-xs text-muted-foreground">{c ? ctext(c).title : t('act.noCriterion')}{a.date && ` · ${a.date}`}</p>
                        </div>
                        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', STATUS_TONE[a.status])} data-testid={`status-act-${a.id}`}>{t(`status.${a.status}`)}</span>
                      </div>
                      {a.goal && <OriginalContent as="p" className="mt-3 text-sm"><span className="font-medium text-muted-foreground">{t('act.goal')}: </span>{a.goal}</OriginalContent>}
                      {a.completion && <OriginalContent as="p" className="mt-1 text-sm"><span className="font-medium text-muted-foreground">{t('act.completion')}: </span>{a.completion}</OriginalContent>}
                      {a.strengths.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{a.strengths.map((s) => <StrengthChip key={s} value={s} />)}</div>}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button variant={hasReflection ? 'default' : 'outline'} className="min-h-11" disabled={!hasReflection} onClick={() => setImporting(a)} data-testid={`button-import-${a.id}`}>
                          <Download className="h-4 w-4" /> {imported ? t('imp.update') : t('act.import')}
                        </Button>
                        {!hasReflection && <span className="text-xs text-muted-foreground">{t('act.needReflection')}</span>}
                        {imported && <Link href="/experiences" className="inline-flex min-h-11 items-center gap-1 text-xs text-blue">{t('act.imported')} <ArrowUpRight className="h-3.5 w-3.5" /></Link>}
                        <span className="ms-auto flex">
                          <Button variant="ghost" size="icon" className="tap" aria-label={t('common.edit')} onClick={() => setEditing({ a, isNew: false })} data-testid={`button-edit-act-${a.id}`}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="tap text-destructive" aria-label={t('common.delete')} onClick={() => setDeleting(a)} data-testid={`button-delete-act-${a.id}`}><Trash2 className="h-4 w-4" /></Button>
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            <ActivityDialog open={!!editing} initial={editing?.a ?? null} isNew={editing?.isNew ?? true} criteria={state.criteria} onClose={() => setEditing(null)}
              onSave={(d) => {
                update((s) => {
                  const clean = { ...d, criterionId: s.criteria.some((c) => c.id === d.criterionId) ? d.criterionId : '' };
                  const exists = s.activities.some((x) => x.id === d.id);
                  return { ...s, activities: exists ? s.activities.map((x) => (x.id === d.id ? clean : x)) : [...s.activities, clean] };
                });
                setEditing(null);
              }} />
            <ImportDialog activity={importing} onClose={() => setImporting(null)} />
            <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>{t('act.deleteTitle')}</AlertDialogTitle><AlertDialogDescription>{t('act.deleteBody')}</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="min-h-11">{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction className="min-h-11 bg-destructive text-destructive-foreground" onClick={() => {
                    const id = deleting?.id; if (!id) return;
                    update((s) => ({
                      ...s,
                      activities: s.activities.filter((x) => x.id !== id),
                      experiences: s.experiences.map((e) => e.source === 'local_activity' && e.sourceId === id
                        ? { ...e, permissionStatus: 'deleted' as const } : e),
                    }));
                    setDeleting(null);
                  }} data-testid="button-confirm-delete-act">{t('common.delete')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </WorkspaceGate>
      <NextSteps prev={{ href: '/criteria', label: t('nav.criteria') }} next={{ href: '/experiences', label: t('nav.experiences') }} />
    </div>
  );
}
