import { useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, Brain, CalendarDays, Plus, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { loadJSON, saveJSON } from '@/lib/career';
import { dailyContext, validDailyDate, type DailyKind } from '@/lib/review-daily-model';
import { dailyDate, type EverydayState } from '@/lib/review-everyday-model';
import { reviewHomeFixture } from '@/lib/review-home-profile';
import { editDailyWorksheet, getEveryday, recommendDaily, retryEveryday, selectDailyDate, useEveryday } from '@/lib/review-everyday-store';
import { addDailyCard, getReviewPlannerSnapshot, retryReviewPlanner, useReviewPlanner } from '@/lib/review-planner';

export const reviewOrangeAction = 'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-[#dca026] bg-[#F4A418] px-4 py-2 text-center text-sm font-bold text-[#352200] hover:bg-[#ec9706] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#845000] disabled:opacity-50';
export const reviewBlueAction = 'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg bg-[#225ea8] px-4 py-2 text-center text-sm font-semibold text-white hover:bg-[#1a4d8d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:opacity-50';
const surface = 'min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-4';
const field = 'block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
const SETTINGS = 'review:daily-settings:v1';
type Settings = { mode:'report'|'none'|'noTop'|'noMind'; job:string };
const categories:DailyKind[]=['job','cognitive'];
const defaultSettings:Settings={mode:'report',job:''};
function dailyReport(value:EverydayState,settings:Settings) {
  const fixture=reviewHomeFixture(value.choice.trait,value.choice.focus);
  return settings.mode==='none'?null:{...fixture, topJobs:settings.mode==='noTop'?[]:fixture.topJobs,
    strengths:settings.mode==='noMind'?[]:fixture.strengths, growthPoints:settings.mode==='noMind'?[]:fixture.growthPoints};
}

export function ReviewDailyEntry() {
  const {t}=useI18n();
  const [,navigate]=useLocation();
  const [failed,setFailed]=useState(false);
  function begin() {
    const {value}=getEveryday(),settings=loadJSON<Settings>(SETTINGS) ?? defaultSettings;
    const source=dailyContext(dailyReport(value,settings),settings.job,value.choice.trait,value.choice.focus,true);
    if(!recommendDaily(dailyDate(),source,t)){setFailed(true);return;}
    navigate('/planner/daily');
  }
  return <section className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 sm:flex-row sm:items-center" data-testid="view-daily-entry">
    <div className="min-w-0 flex-1"><p className="eyebrow">{t('daily.home2')}</p><p className="mt-1 text-sm">{t('daily.startHelp')}</p>
      <p className="text-xs text-muted-foreground">{t('daily.homeLab')} <Link href="/lab" className="inline-flex min-h-11 items-center font-semibold text-blue underline">{t('daily.lab.button')}</Link></p>
    </div>
    <button type="button" onClick={begin} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground" data-testid="link-daily-start"><Sparkles className="h-4 w-4" aria-hidden />{t('daily.create')}</button>
    {failed&&<div role="alert" className="text-sm text-red-900">{t('daily.failed')} <button className="min-h-11 underline" onClick={()=>{if(retryEveryday())begin();}}>{t('sb.retry')}</button></div>}
  </section>;
}

export function ReviewDailyCards({ id }: { id?:string }) {
  const {t}=useI18n();
  const [,navigate]=useLocation();
  const {value,error}=useEveryday();
  const {book,error:plannerError}=useReviewPlanner();
  const [settings,setSettings]=useState<Settings>(()=>loadJSON<Settings>(SETTINGS) ?? defaultSettings);
  const [failed,setFailed]=useState(false);
  const lastExtra=useRef<{key:string;time:number} | null>(null);
  const date=value.dailySelectedDate ?? dailyDate();
  const report=dailyReport(value,settings);
  const source=dailyContext(report,settings.job,value.choice.trait,value.choice.focus,true);
  const draft=id?value.dailyDrafts?.[id]:undefined;
  const drafts=Object.values(value.dailyDrafts ?? {}).filter(d=>d.worksheet.date===date);
  const retry=()=>{const a=error?retryEveryday():true;const b=plannerError?retryReviewPlanner():true;setFailed(!a||!b);};
  const saveSettings=(next:Settings)=>{setSettings(next);setFailed(!saveJSON(SETTINGS,next));};
  // A fresh date or category is a different action, even on fast devices.
  function generate(kind?:DailyKind) {
    const key=`${date}:${kind}`,time=performance.now();
    if(kind && lastExtra.current?.key===key && time-lastExtra.current.time<320)return;
    const saved=recommendDaily(date,source,t,kind);
    if(saved && kind)lastExtra.current={key,time};
    setFailed(!saved);
  }
  function register(requireText:boolean) {
    if(!id || getEveryday().error || getReviewPlannerSnapshot().error || getReviewPlannerSnapshot().book.cards[id])return;
    const current=getEveryday().value.dailyDrafts?.[id];
    if(!current || requireText&&!current.worksheet.before.trim())return;
    const {id:cardId,...attachment}=current;
    if(addDailyCard(cardId,attachment))navigate(`/planner/card/${cardId}`);
    else setFailed(true);
  }
  const alert=(failed||error||plannerError) && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900" data-testid="status-daily-failed">
    {t('daily.failed')} <button type="button" className="min-h-11 underline" onClick={retry}>{t('sb.retry')}</button>
  </div>;
  if(id) {
    if(!draft)return <main className={surface}><p>{t('daily.notFound')}</p><Link className={reviewBlueAction} href="/planner/daily">{t('daily.back')}</Link></main>;
    const saved=book.cards[id];
    return <div className="mx-auto max-w-3xl space-y-4" data-testid="view-daily-worksheet">
      {alert}
      <article className={surface}>
        <p className="text-sm font-semibold text-blue">{t('daily.worksheet')} · {t(`daily.${draft.category}`)} · {draft.worksheet.date}</p>
        <h1 className="text-xl font-bold">{draft.activity.goal}</h1>
        <p className="rounded-xl bg-[#fff5df] p-4">{draft.activity.scene}</p>
        <p className="text-sm">{draft.activity.steps[1]}</p>
        <details><summary className="min-h-11 cursor-pointer content-center font-semibold text-blue">{t('daily.why')}</summary>
          <Origin draft={draft} />
        </details>
        <label className="block text-sm font-semibold">{t('daily.thought')}
          <textarea rows={4} maxLength={3000} dir="auto" readOnly={!!saved} value={draft.worksheet.before} className={`${field} mt-2`}
            data-testid="input-daily-thought" onChange={e=>editDailyWorksheet(id,e.target.value)} />
        </label>
        <p className="rounded-xl bg-[#eaf3ff] p-3 text-sm"><strong>{t('daily.question')}</strong><br />{draft.activity.question}</p>
        <div className="flex flex-wrap gap-2">
          {saved?<Link className={reviewBlueAction} href={`/planner/card/${id}`} data-testid="link-daily-saved">{t('daily.doneOpen')}</Link>:<>
            <button type="button" className={reviewBlueAction} onClick={()=>register(true)} disabled={!!error||!!plannerError||!draft.worksheet.before.trim()}
              data-testid="button-daily-save">{t('daily.save')}<ArrowRight className="h-4 w-4" aria-hidden /></button>
            <button type="button" className="min-h-11 rounded-lg border px-3 text-sm" onClick={()=>register(false)} disabled={!!error||!!plannerError}
              data-testid="button-daily-plan">{t('daily.planOnly')}</button>
          </>}
          <Link className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-blue underline" href="/planner/daily">{t('daily.back')}</Link>
        </div>
      </article>
    </div>;
  }
  return <div className="mx-auto max-w-5xl space-y-4" data-testid="view-daily-cards">
    <header className={`${surface} border-[#F4A418]/50 bg-[#fff8eb]`}>
      <h1 className="flex items-center gap-2 text-xl font-bold"><CalendarDays aria-hidden className="text-[#8a5400]" />{t('daily.title')}</h1>
      <p className="text-sm text-slate-700">{t('daily.intro')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">{t('daily.date')}<input className={field} type="date" value={date}
          onChange={e=>{if(validDailyDate(e.target.value))setFailed(!selectDailyDate(e.target.value));}} data-testid="input-daily-date"/></label>
        <label className="text-sm font-semibold">{t('daily.report')}
          <select className={field} value={settings.mode} onChange={e=>saveSettings({...settings,mode:e.target.value as Settings['mode']})} data-testid="select-daily-report">
            <option value="report">{t('daily.report')}</option><option value="none">{t('daily.noReport')}</option>
            <option value="noTop">{t('daily.noTop')}</option><option value="noMind">{t('daily.noFocus')}</option>
          </select>
        </label>
      </div>
      {report?.topJobs?.length ? <label className="block text-sm font-semibold">{t('daily.chooseJob')}
        <select className={field} value={source.job?.id ?? ''} onChange={e=>saveSettings({...settings,job:e.target.value})} data-testid="select-daily-job">
          {report.topJobs.map((j,i)=><option key={j.id} value={j.id}>{i+1}. {j.title}</option>)}
        </select>
      </label>:<p className="text-sm" data-testid="text-daily-no-top">{t('daily.noJob')}</p>}
      {!source.focus && <p className="text-sm" data-testid="text-daily-no-focus">{t('daily.noMind')}</p>}
      {!drafts.length && <button type="button" className={reviewOrangeAction} onClick={()=>generate()} disabled={!!error} data-testid="button-daily-suggest">
        <Sparkles className="h-4 w-4" aria-hidden />{t('daily.suggest')}</button>}
    </header>
    {alert}
    {drafts.length>0 && <div className="grid gap-3 md:grid-cols-2">
      {categories.map(kind=><section key={kind} className={surface} data-testid={`section-daily-${kind}`}>
        <h2 className="flex items-center gap-2 font-bold">{kind==='job'?<CalendarDays className="h-5 w-5 text-[#9a5e00]" aria-hidden />:<Brain className="h-5 w-5 text-blue" aria-hidden />}{t(`daily.${kind}`)}</h2>
        {drafts.filter(d=>d.category===kind).map(d=><article key={d.id} className={`space-y-2 rounded-xl border p-3 ${kind==='job'?'border-[#F4A418]/50 bg-[#fff9ef]':'border-blue/25 bg-[#f0f6ff]'}`} data-testid={`card-daily-${kind}`}>
          <h3 className="font-semibold">{d.activity.goal}</h3>
          <p className="text-xs text-slate-700">{t('daily.minutes',{n:d.activity.minutes})} · {t((kind==='job'?d.context.job:d.context.focus)?'daily.synthetic':'daily.general')}</p>
          <p className="text-sm">{d.activity.scene}</p>
          <details><summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-blue">{t('daily.why')}</summary><Origin draft={d}/></details>
          <Link href={book.cards[d.id]?`/planner/card/${d.id}`:`/planner/daily/${d.id}`} className={reviewOrangeAction}
            data-testid={`link-daily-open-${kind}`}>{t(book.cards[d.id]?'daily.doneOpen':'daily.open')}</Link>
        </article>)}
        <button type="button" className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-[#F4A418]/55 px-3 text-sm font-semibold text-[#754500]" disabled={!!error}
          onClick={()=>generate(kind)} data-testid={`button-daily-more-${kind}`}><Plus className="h-4 w-4" aria-hidden />{t('daily.more',{kind:t(`daily.${kind}`)})}</button>
      </section>)}
    </div>}
  </div>;
}

function Origin({draft}:{draft:import('@/lib/review-daily-model').DailyDraft}) {
  const {t}=useI18n();
  return <div className="space-y-1 pb-2 text-sm text-slate-700" data-testid="text-daily-reason">
    <p>{draft.activity.linkReason}</p>
    {draft.category==='job'&&draft.context.job && <p>{[draft.context.job.reason,draft.context.job.source,draft.context.assessedOn].filter(Boolean).join(' · ')}</p>}
    <p>{draft.activity.supportReason} · {draft.activity.materials}</p>
    {draft.context.synthetic && <p className="text-xs">{t('daily.synthetic')}</p>}
  </div>;
}
