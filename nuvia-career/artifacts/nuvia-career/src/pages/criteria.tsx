import { Link } from 'wouter';
import { useState } from 'react';
import { Check, ListChecks, Plus, Route as RouteIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace';
import { unionCriteria, uid, safeUrl } from '@/lib/career';
import { useToast } from '@/hooks/use-toast';
import { EmptyState, ErrorBlock, LoadingBlock, NextSteps, PageHeader, SourceMeta, WorkspaceGate, useCriterionText } from '@/components/common';

export default function CriteriaPage() {
  const { t, locale } = useI18n();
  const { overview, overviewLoading, overviewError, retryOverview, update } = useWorkspace();
  const ctext = useCriterionText();
  const { toast } = useToast();
  const [postingOpen, setPostingOpen] = useState(false);
  const [posting, setPosting] = useState({ title: '', description: '', url: '', date: '' });

  return (
    <div>
      <PageHeader eyebrow={t('crit.eyebrow')} title={t('nav.criteria')} description={t('crit.desc')}
        actions={<Button className="min-h-11" onClick={() => setPostingOpen(true)} data-testid="button-paste-posting"><Plus className="h-4 w-4" />{t('posting.add')}</Button>} />
      <p className="mb-6 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">{t('crit.notNcs')}</p>
      {overviewError ? <ErrorBlock message={t('error.load')} onRetry={retryOverview} /> : overviewLoading ? <LoadingBlock /> : (
        <WorkspaceGate>
          {(state) => {
            const all = unionCriteria(state.criteria, overview?.criteria ?? []);
            if (!all.length) return <EmptyState icon={ListChecks} title={t('crit.emptyTitle')} body={t('crit.emptyBody')} />;
            return (
              <div className="space-y-3">
                {all.map((c) => {
                  const accepted = state.criteria.some((x) => x.id === c.id);
                  const usedBy = state.experiences.filter((e) => e.criterionIds.includes(c.id)).length + state.activities.filter((a) => a.criterionId === c.id).length + state.applications.filter((a) => a.criterionIds.includes(c.id)).length;
                  const tx = ctext(c);
                  return (
                    <article id={c.id} key={c.id} className="surface scroll-mt-24 p-5 md:p-6" data-testid={`card-criterion-${c.id}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 max-w-2xl">
                          <h2 className="text-base font-semibold">{tx.title}</h2>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{tx.description}</p>
                          {tx.translated && <p className="mt-1 text-[11px] text-muted-foreground">{t('crit.translatedRender')}</p>}
                          {c.sourceType === 'official_ncs' && locale !== 'ko' && <p className="mt-1 text-[11px] font-medium text-blue" data-testid={`text-ncs-original-${c.id}`}>{t('ncs.original')}</p>}
                        </div>
                        {accepted && <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2.5 py-1 text-xs font-semibold text-ok"><Check className="h-3.5 w-3.5" /> {t('crit.accepted')}</span>}
                      </div>
                      <div className="mt-3"><SourceMeta c={c} /></div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {!accepted ? (
                          <Button className="min-h-11" onClick={() => { update((s) => ({ ...s, criteria: [...s.criteria, c] })); toast({ title: t('crit.acceptedToast') }); }} data-testid={`button-accept-${c.id}`}>
                            <Check className="h-4 w-4" /> {t('crit.accept')}
                          </Button>
                        ) : (
                          <>
                            <Link href={`/experiences?criterion=${encodeURIComponent(c.id)}&new=1`} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-navy px-4 text-sm font-medium text-white hover:bg-navy-soft" data-testid={`link-connect-exp-${c.id}`}>
                              <Plus className="h-4 w-4" /> {t('crit.connectExp')}
                            </Link>
                            <Link href={`/activities?criterion=${encodeURIComponent(c.id)}&new=1`} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-4 text-sm font-medium hover:bg-muted" data-testid={`link-small-activity-${c.id}`}>
                              <RouteIcon className="h-4 w-4" /> {t('crit.smallActivity')}
                            </Link>
                            <Button variant="ghost" className="min-h-11 text-muted-foreground" disabled={usedBy > 0} title={usedBy > 0 ? t('crit.inUse') : undefined}
                              onClick={() => update((s) => ({ ...s, criteria: s.criteria.filter((x) => x.id !== c.id) }))} data-testid={`button-unaccept-${c.id}`}>
                              {t('crit.unaccept')}
                            </Button>
                          </>
                        )}
                      </div>
                      {!accepted && <p className="mt-2 text-xs text-muted-foreground">{t('crit.acceptFirst')}</p>}
                      {usedBy > 0 && <p className="mt-2 text-xs text-muted-foreground">{t('crit.usedBy', { n: usedBy })}</p>}
                    </article>
                  );
                })}
              </div>
            );
          }}
        </WorkspaceGate>
      )}
      <NextSteps prev={{ href: '/?view=summary', label: t('nav.overview') }} next={{ href: '/experiences', label: t('nav.experiences') }} />
      <Dialog open={postingOpen} onOpenChange={setPostingOpen}>
        <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{t('posting.add')}</DialogTitle><DialogDescription>{t('posting.help')}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label htmlFor="posting-title">{t('posting.title')}</Label><Input id="posting-title" className="mt-1 min-h-11" dir="auto" maxLength={500} value={posting.title} onChange={(e) => setPosting({ ...posting, title: e.target.value })} /></div>
            <div><Label htmlFor="posting-body">{t('posting.body')}</Label><Textarea id="posting-body" className="mt-1" dir="auto" rows={7} maxLength={20000} value={posting.description} onChange={(e) => setPosting({ ...posting, description: e.target.value })} /></div>
            <div><Label htmlFor="posting-url">{t('posting.url')}</Label><Input id="posting-url" className="mt-1 min-h-11" dir="ltr" type="url" value={posting.url} onChange={(e) => setPosting({ ...posting, url: e.target.value })} /></div>
            <div><Label htmlFor="posting-date">{t('posting.date')}</Label><Input id="posting-date" className="mt-1 min-h-11" type="date" value={posting.date} onChange={(e) => setPosting({ ...posting, date: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={() => setPostingOpen(false)}>{t('common.cancel')}</Button>
            <Button className="min-h-11" disabled={!posting.title.trim() || !posting.description.trim() || !posting.date || (!!posting.url && !safeUrl(posting.url))} onClick={() => {
              update((s) => ({ ...s, criteria: [...s.criteria, {
                id: uid('posting'), title: posting.title, description: posting.description,
                sourceType: 'job_posting', sourceLabel: t('source.job_posting'),
                ...(posting.url ? { sourceUrl: safeUrl(posting.url)! } : {}),
                asOf: posting.date, version: '1',
              }] }));
              setPostingOpen(false);
              setPosting({ title: '', description: '', url: '', date: '' });
            }} data-testid="button-save-posting">{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
