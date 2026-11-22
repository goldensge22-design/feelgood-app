import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import type { CareerExperience } from '@workspace/api-client-react';
import { AlertTriangle, BookOpenText, CheckCircle2, Copy, Download, FileText, HardDrive, Import, Lock, PenLine, RefreshCw, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace';
import { formatDate, newApplication } from '@/lib/career';
import { isJobConnectionReviewed, jobConnectionOf, metaOf, sourceScopeMatchesApplication, sourceStatusOf, useSidecar, type ExpMeta, type Sidecar } from '@/lib/provenance';
import {
  confirmStandaloneReviewDraft, confirmStoryboard, editStoryboard, isStandaloneReviewConfirmed, isStandaloneReviewDraft,
  isStoryboardConfirmed, linkStoryboardApplication, loadStoryboard, saveStoryboard,
  sourceRevision, storyboardText, type StoryboardDraft,
} from '@/lib/storyboard';
import { downloadStoryboard, estimateStoryboardPages } from '@/lib/storyboard-export';
import { recordReviewAction } from '@/lib/review-trail';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { StrengthDashboard } from '@/components/strength-dashboard';
import { REVIEW_RECORD_ID } from '@/lib/review-demo-fixture';
import type { ReviewPlannerBook } from '@/lib/review-planner-model';
import { ReviewStoryAssist } from '@/components/review-story-assist';
import { DAILY_EVIDENCE } from '@/lib/review-daily-model';
import { reviewStudioSourceCurrent } from '@/lib/review-studio-bridge';
import { ReviewActivityCollection } from '@/components/review-activity-collection';
import { StoryboardAccountAi } from '@/components/storyboard-account-ai';
import { ReviewSimpleStory, singleStorySections, singleStoryText } from '@/components/review-simple-story';
import { PUBLIC_DEMO } from '@/lib/public-demo';
import { clearStoryboardRecovery, keepStoryboardRecovery, readStoryboardRecovery, storedStoryboard, storyboardBlockReason, shouldInvalidateStoryboardConfirmation } from '@/lib/storyboard';

type Sections = [string, string, string, string];
type SaveState = 'saved' | 'dirty' | 'failed';
type Format = 'pdf' | 'txt' | 'docx' | 'hwpx';

function blockReason(e: CareerExperience, m: ExpMeta, sc: Sidecar): 'sb.why.unconfirmed' | 'sb.why.nature' | 'sb.why.revoked' | null {
  return storyboardBlockReason(e, m.nature, sourceStatusOf(sc, m));
}

/** Single binding for source content + metadata + synthetic source status. Never shown in UI/export/AI. */
function revisionOf(e: CareerExperience, sc: Sidecar): string {
  const m = metaOf(sc, e.id);
  return sourceRevision(e, { meta: m, syntheticStatus: sourceStatusOf(sc, m) });
}

function notifyStoryboardSaved() {
  window.dispatchEvent(new Event('nuvia:storyboard-saved'));
}

export default function StoryboardPage({ review = false, adultReview = false, youthReview = false, adultEvidence = '', reviewBook, reviewSelection, onUseReviewBundle }: {
  review?: boolean; adultReview?:boolean;youthReview?:boolean;adultEvidence?:string;reviewBook?:ReviewPlannerBook;
  reviewSelection?:string[];onUseReviewBundle?:(ids:string[])=>boolean;
} = {}) {
  const { t, locale } = useI18n();
  const { state, update, mode,userId, selectedAppId, setSelectedAppId, setSelectedExpId, loadError: wsError, retryLoad } = useWorkspace();
  const { ctx, data: sc } = useSidecar();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [draft, setDraft] = useState<StoryboardDraft | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [save, setSave] = useState<SaveState>('saved');
  const draftRef = useRef<StoryboardDraft | null>(null);
  // The scope that owns draftRef; saves never go to any other scope.
  const ownerScope = useRef<string | null>(null);
  const savedSnapshot = useRef<StoryboardDraft | null>(null);
  const [recoverable, setRecoverable] = useState<StoryboardDraft | null>(null);
  const confirming = useRef(false);
  const creating = useRef(false);
  const timer = useRef<number | null>(null);
  const [factOk, setFactOk] = useState(false);
  const [useOk, setUseOk] = useState(false);
  const [picking, setPicking] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const labels = useMemo(() => [adultReview?t('audience.story'):t('sb.title'), t('sb.s1'), t('sb.s2'), t('sb.s3'), t('sb.s4')] as const, [t,adultReview]);
  const adultCopy=adultReview && locale==='ko';
  const sourceHeading=adultCopy?'사용할 일상기록 선택':t('sb.pick');

  const load = useCallback(() => {
    // Flush any pending edit to its OWN scope before switching, then drop it.
    if (timer.current) {
      window.clearTimeout(timer.current); timer.current = null;
      if (ownerScope.current && draftRef.current && ownerScope.current !== ctx) {
        try { saveStoryboard(ownerScope.current, draftRef.current); } catch { /* old scope; ignore */ }
      }
    }
    ownerScope.current = null; draftRef.current = null; setDraft(null);
    setRecoverable(null); savedSnapshot.current = null;
    setFactOk(false); setUseOk(false);
    if (!ctx) return;
    try {
      const d = loadStoryboard(ctx);
      savedSnapshot.current = storedStoryboard(ctx);
      setRecoverable(readStoryboardRecovery(ctx, d.id));
      ownerScope.current = ctx; draftRef.current = d; setDraft(d); setLoadFailed(false); setSave('saved');
    } catch {
      setLoadFailed(true);
    }
  }, [ctx]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (draft && window.location.hash === '#storyboard-versions') {
      document.getElementById('storyboard-versions')?.scrollIntoView();
    }
  }, [draft?.id]);

  const persist = useCallback(() => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    const d = draftRef.current;
    const scope = ownerScope.current;
    if (!scope || !d) return false;
    let ok = false;
    try { ok = saveStoryboard(scope, d, savedSnapshot.current); } catch { ok = false; }
    if (ok) {
      savedSnapshot.current = d;
      clearStoryboardRecovery(scope, d);
    } else {
      keepStoryboardRecovery(scope, d);
    }
    if (draftRef.current === d) setSave(ok ? 'saved' : 'failed');
    if (ok) notifyStoryboardSaved();
    return ok;
  }, []);
  const persistRef = useRef(persist);
  persistRef.current = persist;
  useEffect(() => () => { if (timer.current) { window.clearTimeout(timer.current); persistRef.current(); } }, []);
  useEffect(() => {
    const flush = () => { persistRef.current(); };
    const hide = () => { if (document.visibilityState === 'hidden') flush(); };
    const warn = (event: BeforeUnloadEvent) => {
      if (draftRef.current && JSON.stringify(draftRef.current) !== JSON.stringify(savedSnapshot.current) && !persistRef.current()) {
        event.preventDefault(); event.returnValue = '';
      }
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', warn);
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);

  const commit = useCallback((next: StoryboardDraft, immediate = false) => {
    draftRef.current = next; setDraft(next); setSave('dirty');
    if (timer.current) window.clearTimeout(timer.current);
    // Every input (including IME) is saved locally before navigation can occur.
    // This is NOT an acknowledgement of account/server storage.
    void immediate;
    return persistRef.current();
  }, []);
  const edit = (patch: Partial<StoryboardDraft>, immediate = false) => {
    if (!draftRef.current || !ownerScope.current) return;
    setFactOk(false); setUseOk(false);
    commit(editStoryboard(draftRef.current, patch), immediate);
  };

  const exps = state?.experiences ?? [];
  const exp = draft ? exps.find((e) => e.id === draft.experienceId) : undefined;
  const meta = exp ? metaOf(sc, exp.id) : undefined;
  const currentRev = exp ? revisionOf(exp, sc) : '';
  const blocked = exp && meta ? blockReason(exp, meta, sc) : null;
  const sourceCards = (draft?.evidenceSources ?? []).map(source=>reviewBook?.cards[source.id]);
  const independent = draft?.evidenceKey === DAILY_EVIDENCE;
  const evidenceChanged = adultReview && (!draft?.evidenceSources?.length ||
    (!independent && (!adultEvidence || draft.evidenceKey !== adultEvidence ||
    JSON.stringify(draft.evidenceSources.map(s=>s.id))!==JSON.stringify(reviewSelection))) ||
    draft.evidenceSources.some((source,i)=>sourceCards[i]?.revision!==source.revision || sourceCards[i]?.approvedRevision!==source.revision ||
      !!reviewBook?.noteEdits[source.id] || !!reviewBook?.planEdits[source.id] || !reviewStudioSourceCurrent(source.id)));
  const sourceChanged = !!draft && !!exp && (draft.sourceRevision !== currentRev || evidenceChanged);
  const reviewRecordPath = adultReview ? '/planner' : '/history';
  const confirmed = !!draft && !!exp && !blocked && !sourceChanged && isStoryboardConfirmed(draft, currentRev);

  // A prior confirmation that no longer holds is invalidated permanently, even if the source later reverts.
  const staleConfirm = shouldInvalidateStoryboardConfirmation(
    draft, !!state && ownerScope.current === ctx, !!exp, !!blocked || evidenceChanged, currentRev,
  );
  useEffect(() => {
    if (!staleConfirm || !draftRef.current || !ownerScope.current) return;
    setFactOk(false); setUseOk(false);
    commit(editStoryboard(draftRef.current, {}), true);
  }, [staleConfirm, commit]);
  const filled = !!draft && (adultReview ? draft.sections.some((s)=>s.trim()) : draft.sections.every((s) => s.trim()));
  const canConfirm = !!draft && !!exp && !blocked && !sourceChanged && filled && factOk && useOk && save !== 'failed';
  const linkedApp = draft?.applicationId ? state?.applications.find((a) => a.id === draft.applicationId) : undefined;

  const choose = (e: CareerExperience) => {
    if (draft?.confirmedRevision != null && draft.experienceId !== e.id && !window.confirm(t('sb.changeConfirm'))) return;
    setSelectedExpId(e.id);
    const cur = draftRef.current;
    const app = state?.applications.find((a) => a.id === selectedAppId);
    const patch: Partial<StoryboardDraft> = {
      experienceId: e.id,
      // A source marked 'changed' must be explicitly rechecked before it binds.
      sourceRevision: e.permissionStatus === 'changed' ? '' : revisionOf(e, sc),
    };
    // Only seed blank fields from the student's own saved records; never override input.
    if (cur && !cur.company.trim() && app?.company.trim()) patch.company = app.company;
    if (cur && !cur.job.trim()) { const j = app?.job.trim() || state?.selectedJob.trim(); if (j) patch.job = j; }
    if (cur && !cur.keyword.trim() && e.strengths[0]) patch.keyword = e.strengths[0];
    edit(patch, true);
    setPicking(false);
  };

  const doConfirm = () => {
    const d = draftRef.current;
    if (!d || !canConfirm || confirming.current || isStoryboardConfirmed(d, currentRev)) return;
    confirming.current = true;
    const saved=commit(confirmStoryboard(d), true);
    if(saved && adultReview)requestAnimationFrame(()=>document.getElementById('sb-download')?.focus());
    setFactOk(false); setUseOk(false);
    window.setTimeout(() => { confirming.current = false; }, 0);
  };

  const createApp = () => {
    const d = draftRef.current;
    if (!d || !exp || creating.current) return;
    const existing = d.applicationId ? state?.applications.find((a) => a.id === d.applicationId) : undefined;
    if (existing) { setSelectedAppId(existing.id); setSelectedExpId(exp.id); setLocation('/write'); return; }
    creating.current = true;
    const app = { ...newApplication(), company: d.company, job: d.job, question: t('sb.title'), writingLanguage: locale, experienceIds: [exp.id], text: d.sections.map((s) => s.trim()).filter(Boolean).join('\n\n') };
    update((s) => ({ ...s, applications: [...s.applications, app] }));
    commit(linkStoryboardApplication(d, app.id), true);
    setSelectedAppId(app.id); setSelectedExpId(exp.id);
    toast({ title: t('sb.created') });
    setLocation('/write');
  };
  const openApp = () => {
    if (!linkedApp) return;
    setSelectedAppId(linkedApp.id); if (exp) setSelectedExpId(exp.id);
    setLocation('/write');
  };

  if (loadFailed) {
    return (
      <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6" data-testid="status-storyboard-load-error">
        <p className="flex items-center gap-2 font-semibold text-destructive"><AlertTriangle className="h-4 w-4" />{t('sb.loadFailed')}</p>
        <Button className="mt-4 min-h-11" variant="outline" onClick={load} data-testid="button-storyboard-reload"><RefreshCw className="h-4 w-4" />{t('sb.retry')}</Button>
      </div>
    );
  }
  if (wsError) {
    return <div role="alert" className="rounded-2xl border p-6"><Button onClick={retryLoad} className="min-h-11">{t('sb.retry')}</Button></div>;
  }
  if (!state || !draft || ownerScope.current !== ctx) {
    return <div className="space-y-4" role="status" data-testid="status-storyboard-loading">
      <p className="text-sm text-muted-foreground">{t('simpleStory.loading')}</p><Skeleton className="h-28 rounded-2xl" /><div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div></div>;
  }

  if(adultReview&&(locale==='ko'||youthReview)&&reviewBook&&onUseReviewBundle){
    const modify=(patch:Partial<StoryboardDraft>)=>{
      const d=draftRef.current;
      return !!d&&commit(editStoryboard(d,patch),true);
    };
    const ready=!!exp&&!blocked&&!sourceChanged;
    const standalone=isStandaloneReviewDraft(draft);
    const readyDownload=(confirmed||isStandaloneReviewConfirmed(draft))&&save==='saved';
    return <div className="space-y-3">
      <header className="mx-auto w-full max-w-2xl space-y-1 px-3 sm:px-4">
        <h1 className="text-2xl font-bold sm:text-3xl">{labels[0]}</h1>
        <p className="text-xs leading-relaxed text-muted-foreground" data-testid="review-scope">{t(youthReview?'audience.youthLocal':'simpleStory.aiBoundary')}</p>
      </header>
      {recoverable&&<section role="alert" className="surface space-y-3 p-4">
        <p>{t('db.recovery')}</p><Button variant="outline" onClick={()=>{
          if(modify({sections:recoverable.sections,company:recoverable.company,job:recoverable.job,keyword:recoverable.keyword,
            experienceId:recoverable.experienceId,sourceRevision:recoverable.sourceRevision,evidenceKey:recoverable.evidenceKey,
            evidenceSources:recoverable.evidenceSources,reviewInterest:recoverable.reviewInterest}))setRecoverable(null);
        }}>{t('sb.restore')}</Button>
      </section>}
      <ReviewSimpleStory key={draft.id} draft={draft} book={reviewBook} cards={sourceCards} ready={ready} youth={youthReview}
        confirmed={readyDownload} saveState={save} modify={modify} onUse={onUseReviewBundle}
        saveDraft={persist} canConfirm={ready||standalone}
        saveVersion={()=>{
          const d=draftRef.current;
          if(!d||save==='failed'||(!ready&&!standalone))return;
          const next=standalone?confirmStandaloneReviewDraft(d):confirmStoryboard(d);
          if(next!==d&&commit(next,true))recordReviewAction('storyboard.version.confirmed','explicit-confirmation',{revision:next.revision});
        }}
        restoreVersion={v=>{if(modify({sections:[...v.sections],company:v.company,job:v.job,keyword:v.keyword,experienceId:v.experienceId,
          sourceRevision:v.sourceRevision,evidenceKey:v.evidenceKey,evidenceSources:v.evidenceSources,reviewInterest:v.reviewInterest}))
          recordReviewAction('storyboard.version.restored','explicit-restore',{version:v.id});}}
        downloads={<ExportPanel draft={{...draft,company:'',job:'',sections:singleStorySections(singleStoryText(draft))}}
          labels={[labels[0],'','','','']} confirmed={readyDownload} adultReview compact/>}/>
    </div>;
  }

  const ctxItems = [
    { k: 'sb.company', v: draft.company },
    { k: 'sb.job', v: draft.job },
    { k: 'sb.keyword', v: draft.keyword },
    { k: 'sb.activity', v: exp?.title ?? '' },
  ];

  return (
    <div className="space-y-6">
      {!review && <StrengthDashboard />}
      {recoverable && (
        <section role="alert" className="surface space-y-3 p-4">
          <p>{t('db.recovery')}</p>
          <Button variant="outline" className="min-h-11" onClick={() => {
            edit({
              sections: [...recoverable.sections], company: recoverable.company, job: recoverable.job, keyword: recoverable.keyword,
              experienceId: recoverable.experienceId, sourceRevision: recoverable.sourceRevision, evidenceKey: recoverable.evidenceKey,evidenceSources:recoverable.evidenceSources,reviewInterest:recoverable.reviewInterest,
              applicationId: recoverable.applicationId,
            }, true);
            if (ctx && savedSnapshot.current === draftRef.current) {
              clearStoryboardRecovery(ctx, recoverable);
              setRecoverable(null);
            }
          }}>{t('sb.restore')}</Button>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-sm" dir="auto">{recoverable.sections.join('\n\n')}</pre>
        </section>
      )}
      {/* Masthead */}
      <header className="relative overflow-hidden rounded-2xl bg-navy p-6 text-white md:p-8">
        <div aria-hidden className="pointer-events-none absolute -end-10 -top-10 h-48 w-48 rounded-full border-[28px] border-primary/30" />
        <p className="eyebrow text-amber-300">{t('sb.current')} · {adultReview ? '6 / 6' : '3 / 3'}</p>
        <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-bold md:text-4xl" data-testid="text-storyboard-title"><BookOpenText className="h-8 w-8 shrink-0 text-primary" />{adultReview && locale==='ko'?'나의 강점 스토리보드':t('sb.title')}</h1>
        <p className="mt-3 max-w-2xl text-white/75">{adultCopy?'확인한 일상기록을 여러 개 골라 네 장면에 담아 보세요. 후보를 미리 보고 원하는 경우에만 본문에 적용할 수 있어요.':t('sb.lede')}</p>
        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 md:grid-cols-4">
          {ctxItems.map((c) => (
            <div key={c.k} className="bg-navy/60 p-3">
              <dt className="text-[11px] uppercase tracking-wider text-white/55">{t(c.k)}</dt>
              <dd className={cn('mt-1 break-words text-sm font-semibold', !c.v && 'text-white/40')} dir="auto" data-testid={`text-context-${c.k.split('.')[1]}`}>{c.v || t('sb.notSet')}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* Save status */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
        <HardDrive className="h-4 w-4 shrink-0 text-blue" />
        <p className="min-w-0 basis-full text-xs text-muted-foreground sm:basis-auto sm:flex-1" data-testid="text-storage-note">{t('sb.storageNote')}</p>
        <span role="status" aria-live="polite" className={cn('inline-flex items-center gap-2 text-xs font-semibold', save === 'failed' ? 'text-destructive' : save === 'dirty' ? 'text-primary' : 'text-emerald-700')} data-testid="status-storyboard-save">
          <span className={cn('h-2 w-2 rounded-full', save === 'failed' ? 'bg-destructive' : save === 'dirty' ? 'animate-pulse bg-primary' : 'bg-emerald-500')} />{t(`sb.st.${save}`)}
        </span>
        {save === 'failed' && <Button size="sm" variant="outline" className="min-h-11 min-w-11" onClick={persist} data-testid="button-storyboard-retry">{t('sb.retry')}</Button>}
        <Button size="sm" className="min-h-11 min-w-11" onClick={persist} data-testid="button-storyboard-save">{t('sb.save')}</Button>
      </div>

      {/* Activity source */}
      <section className="rounded-2xl border bg-card p-5" aria-labelledby="sb-src">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="sb-src" className="font-display text-lg font-bold">{exp && !picking ? (adultCopy?'선택한 일상기록':t('sb.activity')) : sourceHeading}</h2>
          {exp && !picking && !review && <Button size="sm" variant="outline" className="min-h-11" onClick={() => setPicking(true)} data-testid="button-change-activity">{t('sb.change')}</Button>}
          {review ? <Link href={reviewRecordPath} className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold text-blue" data-testid="link-storyboard-source">{locale === 'ko' ? (adultReview?'플래너 일상기록에서 선택':'히스토리에서 기록 선택') : (adultReview?'Choose a record in Planner':'Choose a record in History')}</Link> :
            exp && <Link href="/experiences" onClick={() => setSelectedExpId(exp.id)} className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold text-blue" data-testid="link-storyboard-source">{t('sb.goRecords')}</Link>}
        </div>
        {draft.experienceId && !exp && <p role="alert" className="mt-2 text-sm text-destructive">{t('sb.missingSource')}</p>}
        {(!exp || picking) ? (
          review ? <p className="mt-2 text-sm text-muted-foreground">{locale === 'ko' ? (adultReview?'플래너에서 직접 쓴 일상기록이나 생각 연습을 저장하고, 사용할 기록을 하나 이상 선택하세요.':'플래너에서 작성한 기록을 히스토리에서 확인한 뒤 가져오세요.') : (adultReview?'Review and select your saved record in Planner.':'Review your planner record in History before using it here.')}</p> :
            <ExperiencePicker exps={exps} sc={sc} selected={draft.experienceId} onPick={choose} />
        ) : meta && (
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="font-semibold" dir="auto" data-testid="text-source-title">{review && blocked
                ? (locale === 'ko' ? '변경된 활동 · 다시 확인 필요' : 'Changed activity · review required')
                : exp.title}</p>
              {review && exp.id === REVIEW_RECORD_ID && <p className="mt-1 text-xs text-muted-foreground">{locale === 'ko' ? (adultReview?'이전 체험의 예시입니다. 새 활동은 플래너 일상기록에서 선택하세요.':'이전 체험에서 사용한 예시입니다. 새 활동은 히스토리에서 선택하세요.') : (adultReview?'Choose a new record in Planner.':'This is a previous demo example. Choose a new record in History.')}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                <span className="rounded-full bg-blue-soft px-2 py-0.5 text-blue">{t(`sb.nature.${meta.nature}`)}</span>
                <span className="rounded-full bg-card px-2 py-0.5 text-muted-foreground">{t('sb.origin', { o: meta.origin ?? exp.source })}</span>
                {blocked && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">{t(blocked)}</span>}
              </div>
              {(!review || !blocked) && <details className="mt-3 text-sm">
                <summary className="min-h-11 cursor-pointer content-center text-xs font-semibold text-muted-foreground">{t('sb.sourceFacts')}</summary>
                <dl className="mt-2 space-y-2 text-xs" dir="auto">
                  {[['field.action', exp.action], ['field.result', exp.result], ['field.learning', exp.learning]].map(([k, v]) => (
                    <div key={k}><dt className="font-semibold">{t(k)}</dt><dd className="whitespace-pre-wrap text-muted-foreground">{v || '—'}</dd></div>
                  ))}
                </dl>
              </details>}
            </div>
          </div>
        )}
        {exp && blocked && <p role="alert" className="mt-3 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />{t('sb.blocked')}</p>}
        {exp && !blocked && sourceChanged && (
          <div role="alert" className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
            <p className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t('sb.sourceChanged')}</p>
            {review ? <Link href={reviewRecordPath} className="inline-flex min-h-11 items-center font-semibold text-blue underline">{t('sb.recheck')}</Link> :
              <Button size="sm" className="mt-2 min-h-11" onClick={() => { setFactOk(false); setUseOk(false); edit({ sourceRevision: currentRev }, true); }} data-testid="button-recheck-source">{t('sb.recheck')}</Button>}
          </div>
        )}
      </section>

      {adultReview && reviewBook && onUseReviewBundle && <ReviewActivityCollection book={reviewBook} onUse={(ids)=>save==='saved' && onUseReviewBundle(ids)}/>}
      {adultReview && <ReviewStoryAssist draft={draft} cards={sourceCards} ready={!!exp && !blocked && !sourceChanged && save==='saved'}
        apply={(sections)=>edit({sections},true)}/>}
      {!review && !PUBLIC_DEMO && locale==='ko' && mode==='account' && userId && <StoryboardAccountAi key={`${userId}:${draft.id}`} owner={userId}
        draft={draft} state={state} ready={!blocked && !sourceChanged && save==='saved'} apply={sections=>edit({sections},true)}
        experiences={state.experiences.flatMap(item=>{
          const m=metaOf(sc,item.id);
          if (item.source==='example' || !item.action.trim() || blockReason(item,m,sc)) return [];
          const context=m.experienceContext ?? 'unknown';
          const link=linkedApp && jobConnectionOf(sc,linkedApp.id,item.id);
          const connection=link && linkedApp && linkedApp.job===draft.job && linkedApp.company===draft.company &&
            sourceScopeMatchesApplication(link,linkedApp) && isJobConnectionReviewed(sc,linkedApp,item,m.nature,context)
            ? {sourceKind:link.sourceKind,sourceTitle:(link.sourceTitle ?? '').slice(0,500),sourceCompany:(link.sourceCompany ?? '').slice(0,500),sourceJob:(link.sourceJob ?? '').slice(0,500),
               sourceVersion:(link.sourceVersion ?? '').slice(0,200),sourceAsOf:(link.sourceAsOf ?? '').slice(0,100),
               specificDuty:link.specificDuty.slice(0,2000),sharedAction:link.sharedAction.slice(0,2000),learnedPrinciple:link.learnedPrinciple.slice(0,2000),
               futureApplication:link.futureApplication.slice(0,2000),reviewed:true} : null;
          return [{item,simulated:m.nature==='simulation',context,revision:revisionOf(item,sc),connection}];
        })}/>}

      {/* Context fields */}
      <section className="grid gap-3 md:grid-cols-3">
        {(['company', 'job', 'keyword'] as const).map((f) => (
          <label key={f} className="block text-sm font-semibold">
            {t(`sb.${f}`)}
            <Input className="mt-1.5 min-h-11" readOnly={adultReview} value={draft[f]} onChange={(e) => edit({ [f]: e.target.value })} dir="auto" data-testid={`input-${f}`} />
          </label>
        ))}
      </section>

      {(!exp || !!blocked) && (
        <aside id="storyboard-source-guidance" role="note" className="rounded-xl border border-primary/30 bg-primary/5 p-4" data-testid="notice-storyboard-source">
          <p className="font-semibold">{sourceHeading}</p>
          <p className="mt-1 text-sm">{adultCopy?'기록을 확인하고 가져오면 후보를 만들 수 있어요. 선택하거나 다시 확인해도 기존 본문은 바뀌지 않습니다.':t('sb.pickHelp')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('sb.storageNote')} {t('sb.exportNeedConfirm')}</p>
          <Link href={review ? reviewRecordPath : '/experiences'} onClick={() => { if (exp) setSelectedExpId(exp.id); }}
            className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
            data-testid="link-storyboard-confirm-record">{review ? (locale === 'ko' ? (adultReview?'플래너 일상기록 확인':'히스토리에서 기록 확인') : (adultReview?'Review record in Planner':'Review record in History')) : t('sb.goRecords')}</Link>
        </aside>
      )}

      {/* Four scenes remain editable before confirmation: never discard a student's free draft. */}
      <section id="storyboard-write" tabIndex={adultReview ? -1 : undefined} className="grid scroll-mt-6 gap-4 md:grid-cols-2" aria-label={t('sb.title')}>
        {draft.sections.map((text, i) => (
          <div key={i} className="group relative flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition-shadow focus-within:border-blue focus-within:shadow-md">
            <span aria-hidden className="absolute -top-3 start-5 rounded-md bg-primary px-2 py-0.5 font-display text-xs font-bold text-white">{String(i + 1).padStart(2, '0')}</span>
            <label htmlFor={`sb-sec-${i}`} className="mt-1 font-display text-base font-bold">{labels[i + 1]}</label>
            <p className="mt-1 text-xs text-muted-foreground">{adultCopy && i===0?'선택한 기록에서 나를 소개할 단서를 찾아보세요.':t(`sb.h${i + 1}`)}</p>
            <Textarea
              id={`sb-sec-${i}`}
              aria-describedby={!exp || !!blocked ? 'storyboard-source-guidance' : undefined}
              value={text}
              onChange={(e) => { const next = [...(draftRef.current?.sections ?? draft.sections)] as Sections; next[i] = e.target.value; edit({ sections: next }); }}
              onCompositionEnd={() => persistRef.current()}
              className="mt-3 min-h-40 flex-1 resize-y leading-relaxed"
              dir="auto"
              data-testid={`input-section-${i + 1}`}
            />
            <p className="mt-1.5 text-end text-[11px] text-muted-foreground">{t('sb.chars', { n: text.length })}</p>
          </div>
        ))}
      </section>

      {/* Confirmation */}
      {adultCopy && <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" className="min-h-11" disabled={!filled || !exp || !!blocked || sourceChanged || save!=='saved'} data-testid="button-review-next-confirm"
          onClick={()=>document.getElementById(confirmed?'sb-download':'review-story-final')?.focus()}>{confirmed?'다음 활동 · 다운로드 형식 고르기':'다음 활동 · 내 글 최종 확인하기'}</Button>
        {!filled && <p className="text-sm text-muted-foreground">후보를 적용하거나 내 말로 한 줄 이상 써 주세요.</p>}
        {filled && (sourceChanged || !exp || !!blocked) && <p className="text-sm text-muted-foreground">먼저 활동 기록을 확인해 주세요. 쓴 글은 그대로 남아요.</p>}
      </div>}
      <section id="review-story-final" tabIndex={adultReview ? -1 : undefined} className={cn('scroll-mt-4 rounded-2xl border-2 p-5', confirmed ? 'border-emerald-500/50 bg-emerald-50/50' : 'border-dashed')} aria-labelledby="sb-confirm">
        <h2 id="sb-confirm" className="font-display text-lg font-bold">{t('sb.confirmTitle')}</h2>
        {confirmed ? (
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-emerald-700" data-testid="status-confirmed"><CheckCircle2 className="h-4 w-4" />{t('sb.confirmed')}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {!filled && <p className="text-xs text-muted-foreground">{adultReview && locale==='ko'?'내보낼 본문을 한 항목 이상 작성해 주세요. 모르는 내용은 비워 두어도 됩니다.':t('sb.needAll')}</p>}
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm"><Checkbox checked={factOk} onCheckedChange={(v) => setFactOk(v === true)} disabled={!exp || !!blocked || (adultReview && sourceChanged)} className="mt-0.5" data-testid="checkbox-fact" />{t('sb.factCheck')}</label>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm"><Checkbox checked={useOk} onCheckedChange={(v) => setUseOk(v === true)} disabled={!exp || !!blocked || (adultReview && sourceChanged)} className="mt-0.5" data-testid="checkbox-use" />{t('sb.useCheck')}</label>
            <Button className="min-h-11" disabled={!canConfirm} onClick={doConfirm} data-testid="button-confirm-storyboard"><CheckCircle2 className="h-4 w-4" />{adultCopy?'최종 저장하고 다운로드로':t('sb.confirmBtn')}</Button>
          </div>
        )}
      </section>

      {/* AI handoff */}
      <section className="rounded-2xl border bg-blue-soft p-5" aria-labelledby="sb-ai">
        <h2 id="sb-ai" className="flex items-center gap-2 font-display text-lg font-bold text-blue"><Sparkles className="h-5 w-5" />{t('sb.aiTitle')}</h2>
        <p className="mt-2 text-sm text-foreground/80">{adultCopy?'여기에서는 기록으로 만든 후보를 미리 보고, 원하는 후보만 본문에 적용할 수 있어요. 확인한 네 장면으로 새 자소서 초안을 따로 만들 수도 있어요. 기존 초안과 확정본은 덮어쓰지 않습니다.':t('sb.aiBody')}</p>
        {draft.applicationId && !linkedApp && <p className="mt-2 text-xs text-destructive">{t('sb.appMissing')}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button className="min-h-11" disabled={!exp || !!blocked || !filled || !!linkedApp} onClick={createApp} data-testid="button-create-application"><PenLine className="h-4 w-4" />{t('sb.createApp')}</Button>
          {linkedApp && <Button variant="outline" className="min-h-11" onClick={openApp} data-testid="button-open-application">{t('sb.openApp')}</Button>}
          {linkedApp && <Button variant="outline" className="min-h-11" onClick={() => setImportOpen(true)} data-testid="button-import-application"><Import className="h-4 w-4" />{t('sb.import')}</Button>}
        </div>
      </section>

      <ExportPanel draft={draft} labels={labels} confirmed={confirmed && save === 'saved'} adultReview={adultReview} />

      <Preview draft={draft} labels={labels} />

      <section id="storyboard-versions" className="scroll-mt-4 rounded-2xl border bg-card p-5" aria-labelledby="sb-ver">
        <h2 id="sb-ver" className="font-display text-lg font-bold">{t('sb.versions')}</h2>
        {draft.versions.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{t('sb.noVersions')}</p> : (
          <ul className="mt-3 divide-y">
            {[...draft.versions].reverse().map((v, index) => (
              <li key={v.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm" data-testid={`row-version-${v.id}`}>
                <span className="rounded bg-blue-soft px-2 py-1 font-mono text-xs font-semibold text-blue" dir="ltr">V{draft.versions.length - index}</span>
                <span className="font-mono text-xs text-muted-foreground">{formatDate(v.at, locale)}</span>
                <span className="min-w-0 flex-1 truncate" dir="auto">{[v.company, v.job, v.keyword].filter(Boolean).join(' · ') || '—'}</span>
                <Button size="sm" variant="ghost" className="min-h-11" aria-label={`${t('sb.restore')} · V${draft.versions.length - index}`} onClick={() => edit({ sections: [...v.sections] as Sections, company: v.company, job: v.job, keyword: v.keyword, experienceId: v.experienceId, sourceRevision: v.sourceRevision, evidenceKey:v.evidenceKey,evidenceSources:v.evidenceSources,reviewInterest:v.reviewInterest, applicationId: linkedApp && linkedApp.company === v.company && linkedApp.job === v.job && linkedApp.experienceIds.includes(v.experienceId) ? linkedApp.id : undefined }, true)} data-testid={`button-restore-${v.id}`}><RotateCcw className="h-4 w-4" />{t('sb.restore')}</Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {linkedApp && (
        <ImportDialog open={importOpen} onOpenChange={setImportOpen} text={linkedApp.text} labels={labels}
          onApply={(idx, text) => { const next = [...draft.sections] as Sections; next[idx] = text; edit({ sections: next }, true); setImportOpen(false); }} />
      )}
    </div>
  );
}

function ExperiencePicker({ exps, sc, selected, onPick }: { exps: CareerExperience[]; sc: Sidecar; selected: string; onPick: (e: CareerExperience) => void }) {
  const { t } = useI18n();
  const usable = exps.filter((e) => !blockReason(e, metaOf(sc, e.id), sc));
  return (
    <div className="mt-3">
      <p className="text-xs text-muted-foreground">{t('sb.pickHelp')}</p>
      {usable.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed p-6 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-semibold">{t('sb.noUsable')}</p>
          <Link href="/experiences" className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white" data-testid="link-go-records">{t('sb.goRecords')}</Link>
        </div>
      )}
      <ul role="radiogroup" aria-label={t('sb.pick')} className="mt-3 grid gap-2 md:grid-cols-2">
        {exps.map((e) => {
          const m = metaOf(sc, e.id);
          const why = blockReason(e, m, sc);
          const on = e.id === selected;
          return (
            <li key={e.id}>
              <button type="button" role="radio" aria-checked={on} disabled={!!why} onClick={() => onPick(e)}
                className={cn('w-full rounded-xl border p-3 text-start transition-colors', on ? 'border-blue bg-blue-soft' : 'hover:border-blue/50', why && 'cursor-not-allowed opacity-55')}
                data-testid={`button-pick-${e.id}`}>
                <span className="block truncate text-sm font-semibold" dir="auto">{e.title}</span>
                <span className="mt-1 flex flex-wrap gap-1 text-[11px]">
                  <span className="rounded bg-muted px-1.5">{t(`sb.nature.${m.nature}`)}</span>
                  <span className="rounded bg-muted px-1.5">{t('sb.origin', { o: m.origin ?? e.source })}</span>
                  {why && <span className="rounded bg-destructive/10 px-1.5 text-destructive">{t(why)}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ExportPanel({ draft, labels, confirmed, adultReview,compact=false }: { draft: StoryboardDraft; labels: readonly string[]; confirmed: boolean;adultReview:boolean;compact?:boolean }) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [format, setFormat] = useState<Format>('pdf');
  const [busy, setBusy] = useState(false);
  const [feedback,setFeedback]=useState<{kind:'success'|'error';text:string}|null>(null);
  const exporting=useRef(false);
  const approved=useRef<{id:string;revision:number}|null>(null);
  approved.current=confirmed ? {id:draft.id,revision:draft.revision} : null;
  useEffect(()=>()=>{approved.current=null;},[]);
  const pages = estimateStoryboardPages(draft);
  const opts: { id: Format | 'hwp' | 'doc'; on: boolean }[] = [
    { id: 'pdf', on: true }, { id: 'docx', on: true }, { id: 'hwpx', on: true }, { id: 'txt', on: true }, { id: 'hwp', on: false }, { id: 'doc', on: false },
  ];
  const run = async () => {
    if (!confirmed || exporting.current) return;
    exporting.current=true;
    setBusy(true);
    setFeedback(null);
    try {
      await downloadStoryboard(draft, labels, format, locale,()=>approved.current?.id===draft.id && approved.current.revision===draft.revision);
      if (adultReview) recordReviewAction('storyboard.download.handed-to-browser','confirmed-storyboard',{
        format,draftId:draft.id,revision:draft.revision,sourceIds:(draft.evidenceSources??[]).map(source=>`${source.id}@${source.revision}`),
      });
      if (adultReview && locale==='ko') setFeedback({kind:'success',text:`.${format} 파일을 브라우저에 전달했습니다. 다운로드 목록에서 확인해 주세요.`});
    } catch (error) {
      const code=error instanceof Error ? error.message : '';
      if (adultReview) recordReviewAction('storyboard.download.failed','confirmed-storyboard',{format,draftId:draft.id,revision:draft.revision,
        error:/^EXPORT_[A-Z0-9_]{1,40}$/.test(code)?code:'EXPORT_UNKNOWN'});
      const messages:Record<string,string>={
        EXPORT_429:'문서 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
        EXPORT_400:'문서 입력을 서버가 읽지 못했습니다. 확인한 본문을 살펴본 뒤 다시 시도해 주세요.',
        EXPORT_422:'서버가 본문 또는 문서 문자를 처리할 수 없습니다. 입력을 확인해 주세요.',
        EXPORT_CONNECTION:'문서 서버에 연결하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.',
        EXPORT_TIMEOUT:'문서 서버 응답이 늦습니다. 본문은 유지됩니다. 잠시 후 다시 시도해 주세요.',
        EXPORT_INVALID_DOCUMENT:'서버 응답이 요청한 문서 형식이 아닙니다. 다시 시도해 주세요.',
        EXPORT_LOCAL_INPUT:'문서로 옮길 수 없는 글자 또는 입력이 있습니다. 확인한 본문을 살펴봐 주세요.',
        EXPORT_LOCAL_RENDER:'이 브라우저에서 문서를 만들지 못했습니다. 본문은 그대로입니다. 다시 시도하거나 TXT로 내려받아 주세요.',
        EXPORT_PDF_RENDER:'브라우저가 PDF를 만들지 못했습니다. 다시 시도하거나 다른 형식을 선택해 주세요.',
        EXPORT_DOWNLOAD:'브라우저에 파일을 전달하지 못했습니다. 다운로드 설정을 확인해 주세요.',
        EXPORT_STALE:'문서를 준비하는 중 본문 또는 확인 상태가 바뀌어 다운로드를 중단했습니다.',
      };
      const text=messages[code] ?? (/^EXPORT_5\d\d$/.test(code) ? '문서 서버에서 파일을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.' : t('sb.downloadFailed'));
      if (adultReview && locale==='ko') setFeedback({kind:'error',text:`.${format} · ${text}`});
      else toast({ title: t('sb.downloadFailed'), variant: 'destructive' });
    } finally { exporting.current=false;setBusy(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(storyboardText(draft, labels)); toast({ title: t('sb.copied') }); }
    catch { toast({ title: t('sb.downloadFailed'), variant: 'destructive' }); }
  };
  return (
    <section id="sb-download" tabIndex={adultReview ? -1 : undefined} className="scroll-mt-4 rounded-2xl border bg-card p-5" aria-labelledby="sb-exp" aria-busy={busy}>
      <h2 id="sb-exp" className="flex items-center gap-2 font-display text-lg font-bold"><Download className="h-5 w-5 text-primary" />{t('sb.export')}</h2>
      {compact ? <p className="mt-1 text-xs text-muted-foreground">{t('simpleStory.downloadBoundary')}</p> :
        !confirmed && <p className="mt-1 text-xs text-muted-foreground">{t('sb.exportNeedConfirm')}</p>}
      <div role="radiogroup" aria-label={t('sb.export')} className="mt-3 flex flex-wrap gap-2">
        {opts.filter(o=>!compact||o.on).map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={format === o.id} disabled={!o.on || busy}
            title={o.on ? undefined : t('sb.unavailable')} aria-describedby={o.on ? undefined : 'sb-unavail'}
            onClick={() => { if (o.on && !exporting.current) {setFormat(o.id as Format);setFeedback(null);} }}
            className={cn('min-h-11 rounded-lg border px-4 font-mono text-sm font-semibold uppercase', format === o.id ? 'border-navy bg-navy text-white' : 'bg-card', !o.on && 'cursor-not-allowed line-through opacity-50')}
            data-testid={`option-format-${o.id}`}>.{o.id}</button>
        ))}
      </div>
      {!compact&&<p id="sb-unavail" className="mt-2 text-[11px] text-muted-foreground">.hwp / .doc — {t('sb.unavailable')}</p>}
      {pages > 1 && <p role="note" className="mt-3 flex gap-2 rounded-lg bg-primary/5 p-3 text-xs"><AlertTriangle className="h-4 w-4 shrink-0 text-primary" />{t('sb.long', { n: pages })}</p>}
      {busy && adultReview && locale==='ko' && <p role="status" className="mt-3 text-sm" data-testid="status-review-export-busy">.{format} 파일을 준비하는 중입니다. 잠시만 기다려 주세요.</p>}
      {feedback && <p role={feedback.kind==='error'?'alert':'status'} data-testid="status-review-export-feedback" className={cn('mt-3 text-sm',feedback.kind==='error'?'text-destructive':'text-muted-foreground')}>{feedback.text}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button className="min-h-11" disabled={!confirmed || busy} onClick={run} data-testid="button-download">{t('sb.download')}</Button>
        <Button variant="outline" className="min-h-11" disabled={!confirmed || busy} onClick={copy} data-testid="button-copy"><Copy className="h-4 w-4" />{t('sb.copy')}</Button>
      </div>
    </section>
  );
}

function Preview({ draft, labels }: { draft: StoryboardDraft; labels: readonly string[] }) {
  const { t } = useI18n();
  return (
    <section className="rounded-2xl border bg-[hsl(40_40%_98%)] p-6 md:p-10" aria-labelledby="sb-prev">
      <p className="eyebrow text-muted-foreground">{t('sb.previewTitle')}</p>
      <h2 id="sb-prev" className="mt-2 font-display text-2xl font-bold text-navy">{labels[0]}</h2>
      <p className="mt-1 text-sm text-muted-foreground" dir="auto">{[draft.company, draft.job, draft.keyword].filter(Boolean).join(' · ')}</p>
      <ol className="mt-6 space-y-6">
        {draft.sections.map((s, i) => (
          <li key={i} className="border-s-2 border-primary ps-4">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">{t('sb.scene', { n: i + 1 })} · {labels[i + 1]}</p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed" dir="auto">{s || '—'}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ImportDialog({ open, onOpenChange, text, labels, onApply }: { open: boolean; onOpenChange: (v: boolean) => void; text: string; labels: readonly string[]; onApply: (idx: number, text: string) => void }) {
  const { t } = useI18n();
  const [idx, setIdx] = useState(2);
  const [ok, setOk] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  useEffect(() => { if (open) { setOk(false); setSelectedText(text); } }, [open, text]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('sb.import')}</DialogTitle>
          <DialogDescription>{t('sb.importHelp')}</DialogDescription>
        </DialogHeader>
        {text.trim() ? (
          <>
            <Textarea value={selectedText} onChange={e => { setSelectedText(e.target.value); setOk(false); }} rows={7} className="max-h-60 overflow-y-auto whitespace-pre-wrap bg-muted" dir="auto" aria-label={t('sb.importHelp')} data-testid="text-import-preview" />
            <fieldset>
              <legend className="text-sm font-semibold">{t('sb.importTarget')}</legend>
              <div className="mt-2 grid gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <label key={i} className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="radio" name="sb-import" checked={idx === i} onChange={() => setIdx(i)} data-testid={`radio-import-${i + 1}`} />{labels[i + 1]}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm"><Checkbox checked={ok} onCheckedChange={(v) => setOk(v === true)} className="mt-0.5" data-testid="checkbox-import-review" />{t('sb.importReview')}</label>
          </>
        ) : <p className="text-sm text-muted-foreground">{t('sb.importEmpty')}</p>}
        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>{t('sb.cancel')}</Button>
          <Button className="min-h-11" disabled={!ok || !selectedText.trim()} onClick={() => onApply(idx, selectedText)} data-testid="button-import-apply">{t('sb.importApply')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
