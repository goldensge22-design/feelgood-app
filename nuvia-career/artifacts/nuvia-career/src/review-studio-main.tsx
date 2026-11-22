import { Component, useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import StudioApp from '../vendor/nuvia-original/apps/planner/src/studio/StudioApp';
import type { StudioReviewSlots } from '../vendor/nuvia-original/apps/planner/src/studio/StudioPage';
import { localeOf } from '../vendor/nuvia-original/apps/planner/src/studio/i18n/config';
import { localDate } from '../vendor/nuvia-original/apps/planner/src/studio/domain';
import { recommendDaily,selectDailyDate,editDailyWorksheet,retryEveryday,useEveryday } from './lib/review-everyday-store';
import { dailyContext,validDailyDate,type DailyDraft,type DailyKind,type DailyTranslate } from './lib/review-daily-model';
import { reviewHomeFixture } from './lib/review-home-profile';
import { DAILY_MESSAGES } from './lib/review-daily-messages';
import { attachStudioRecord,studioReviewStamp } from './lib/review-studio-bridge';
import { clientStorage,REVIEW_DEMO } from './lib/public-demo';
import { retryReviewStorage, reviewStorage, reviewStorageFailures, reviewWrite } from './lib/review-device';
import { recordSyntheticReport } from './lib/review-trail';
import './review-studio-integration.css';

const BASE=import.meta.env.BASE_URL.replace(/\/$/,'');
const STUDY=`${BASE}/demo/review`;
const reviewUrl=(page:string,locale:string)=>`${STUDY}/${page}?lang=${locale}`;
function format(locale:string):DailyTranslate {
  return (key,v={})=>(DAILY_MESSAGES[key]?.[locale==='ko'?0:1] ?? key).replace(/\{(\w+)\}/g,(_,id)=>String(v[id]??''));
}
function dataRead<T>(k:string):T|null {
  try{const {key,storage}=clientStorage(k);return JSON.parse(storage.getItem(key) ?? 'null');}catch{return null;}
}
function dataWrite(k:string,data:unknown) {
  try{const {key,storage}=clientStorage(k);storage.setItem(key,JSON.stringify(data));return true;}catch{return false;}
}
const CONFIG='review:studio-daily-options:v1';
type Options={date:string;job:string;mode:'report'|'none'|'noTop'|'noMind';show:boolean};
type ShelfArgs=Parameters<StudioReviewSlots['shelf']>;
function DailyShelf({state,act}:{state:ShelfArgs[0];act:ShelfArgs[1]}) {
  const {value,error}=useEveryday(),locale=localeOf(state),t=format(locale);
  const [opts,setOptions]=useState<Options>(()=>dataRead<Options>(CONFIG) ?? {date:localDate(),job:'',mode:'report',show:false});
  const [failed,setFailed]=useState(false);
  const [last,setLast]=useState({key:'',when:0});
  function update(p:Partial<Options>){const n={...opts,...p};setOptions(n);setFailed(!dataWrite(CONFIG,n));}
  const fixture=reviewHomeFixture(value.choice.trait,value.choice.focus);
  const report=opts.mode==='none'?null:{...fixture,topJobs:opts.mode==='noTop'?[]:fixture.topJobs,
    strengths:opts.mode==='noMind'?[]:fixture.strengths,growthPoints:opts.mode==='noMind'?[]:fixture.growthPoints};
  const context=dailyContext(report,opts.job,value.choice.trait,value.choice.focus,true);
  const drafts=Object.values(value.dailyDrafts ?? {}).filter(d=>d.worksheet.date===opts.date);
  function create(kind?:DailyKind) {
    const key=`${opts.date}:${kind}`;
    if(kind && last.key===key && performance.now()-last.when<300)return;
    if(report&&!recordSyntheticReport()){setFailed(true);return;}
    if(recommendDaily(opts.date,context,t,kind)){update({show:true});if(kind)setLast({key,when:performance.now()});}
    else setFailed(true);
  }
  function add(d:DailyDraft) {
    if(state.studio?.creations?.[`review-daily:${d.id}`])return;
    const a=d.activity;
    setFailed(!act({type:'create',requestId:`review-daily:${d.id}`,title:a.goal,subject:t(`daily.${d.category}`),
      activity:'생활',minutes:a.minutes,timeChosen:true,date:d.worksheet.date,scope:a.scene,firstAction:a.steps[1],
      materials:a.materials,steps:a.steps,scopeChosen:true,activityExplicit:true}));
  }
  return <section className="st-task-entry review-studio-extra" data-testid="view-studio-daily">
    <button type="button" className="pm-primary" data-testid="button-studio-daily-create" onClick={()=>create()}>{t('daily.create')}</button>
    <p className="st-note">{t('daily.startHelp')}</p>
    <p className="st-note">{t('daily.homeLab')} <a target="_top" href={reviewUrl('lab',locale)}>{t('daily.lab.button')}</a></p>
    {(failed||error)&&<p role="alert">{t('daily.failed')} <button type="button" onClick={()=>{setFailed(!retryEveryday());}}>{locale==='ko'?'다시 시도':'Retry'}</button></p>}
    {opts.show&&<div className="st-block">
      <p className="st-note">{t('daily.intro')}</p>
      <label>{t('daily.date')}<input type="date" data-testid="input-studio-daily-date" value={opts.date} onChange={e=>{
        if(validDailyDate(e.target.value)){update({date:e.target.value});selectDailyDate(e.target.value);}
      }}/></label>
      <details className="pm-fold"><summary>{t('daily.why')}</summary>
        <label>{t('daily.report')}<select data-testid="select-studio-report" value={opts.mode} onChange={e=>update({mode:e.target.value as Options['mode']})}>
          <option value="report">{t('daily.report')}</option><option value="none">{t('daily.noReport')}</option>
          <option value="noTop">{t('daily.noTop')}</option><option value="noMind">{t('daily.noFocus')}</option>
        </select></label>
        {!!report?.topJobs?.length && <label>{t('daily.chooseJob')}<select data-testid="select-studio-job" value={context.job?.id ?? ''} onChange={e=>update({job:e.target.value})}>
          {report.topJobs.map((j,i)=><option value={j.id} key={j.id}>{i+1}. {j.title}</option>)}
        </select></label>}
      </details>
      {!drafts.length&&<button type="button" onClick={()=>create()} data-testid="button-studio-daily-pair">{t('daily.suggest')}</button>}
      {(['job','cognitive'] as const).map(k=><div className="review-studio-suggestion" key={k}>
        <h3>{t(`daily.${k}`)}</h3>
        {drafts.filter(d=>d.category===k).map(d=>{
          const added=!!state.studio?.creations?.[`review-daily:${d.id}`];
          return <article id={`studio-${d.id}`} className="st-block" key={d.id} data-testid={`suggestion-studio-${k}`}>
            <b>{d.activity.goal} · {t('daily.minutes',{n:d.activity.minutes})}</b><p>{d.activity.scene}</p>
            <details className="pm-fold"><summary>{t('daily.why')}</summary>
              <p>{d.activity.linkReason}</p>
              {d.category==='job'&&d.context.job&&<p>{[d.context.job.reason,d.context.job.source,d.context.assessedOn].filter(Boolean).join(' · ')}</p>}
              <p>{d.activity.supportReason} · {d.activity.materials}</p>
            </details>
            <button type="button" disabled={added} onClick={()=>add(d)} data-testid={`button-studio-add-${k}`}>
              {t(added?'daily.studioAdded':'daily.studioShelf')}
            </button>
            {added&&<button type="button" onClick={()=>act({type:'studio.select',cardId:state.studio!.creations![`review-daily:${d.id}`]})}>{t('daily.studioSelect')}</button>}
          </article>;
        })}
        {drafts.length>0&&<button type="button" onClick={()=>create(k)} data-testid={`button-studio-more-${k}`}>{t('daily.more',{kind:t(`daily.${k}`)})}</button>}
      </div>)}
    </div>}
  </section>;
}

function Worksheet({state,card}:{state:Parameters<StudioReviewSlots['desk']>[0];card:Parameters<StudioReviewSlots['desk']>[1]}) {
  const {value,error}=useEveryday(),locale=localeOf(state),t=format(locale);
  const entry=Object.entries(state.studio?.creations ?? {}).find(([k,v])=>k.startsWith('review-daily:')&&v===card.id);
  const id=entry?.[0].slice('review-daily:'.length) ?? '';
  const draft=value.dailyDrafts?.[id];
  const key=`review:studio-worksheet-saved:${id}`;
  const [saved,setSaved]=useState(()=>dataRead<string>(key) ?? null);
  const [allowed,setAllowed]=useState(false);
  const [failed,setFailed]=useState(false);
  if(!draft)return null;
  const raw=draft.worksheet.before;
  const confirmed=saved===raw && !!raw.trim() && !error;
  return <details className="pm-fold review-studio-extra" data-testid="view-studio-worksheet" open>
    <summary>{t('daily.worksheet')}</summary>
    <p>{draft.activity.scene}</p><p>{draft.activity.steps[1]}</p>
    <p className="st-note">{draft.activity.supportReason}</p>
    <label>{t('daily.thought')}<textarea maxLength={3000} rows={3} value={raw} dir="auto" data-testid="input-studio-worksheet"
      onChange={e=>{setAllowed(false);setFailed(false);editDailyWorksheet(id,e.target.value);}}/></label>
    <p>{t('daily.question')} · {draft.activity.question}</p>
    <button type="button" className="pm-primary" data-testid="button-studio-worksheet-save" disabled={!raw.trim()} onClick={()=>{
      if((!error||retryEveryday())&&dataWrite(key,raw)){setSaved(raw);setFailed(false);}
      else setFailed(true);
    }}>{t('daily.studioSave')}</button>
    {confirmed&&<p role="status" data-testid="status-studio-worksheet-saved">{t('daily.studioRecorded')}</p>}
    {confirmed&&<label className="pm-check"><input type="checkbox" checked={allowed} onChange={e=>setAllowed(e.target.checked)} data-testid="checkbox-studio-worksheet-use"/>{t('daily.studioFact')}</label>}
    <button type="button" disabled={!confirmed||!allowed} data-testid="button-studio-worksheet-use" onClick={()=>{
      if(attachStudioRecord({id,date:draft.worksheet.date,ref:{type:'card',text:raw,stamp:studioReviewStamp(card)},draft})){
        window.parent.location.assign(reviewUrl('storyboard',locale));
      }else setFailed(true);
    }}>{t('daily.studioTransfer')}</button>
    {(failed||error)&&<p role="alert" data-testid="status-studio-worksheet-error">{t('daily.failed')}</p>}
  </details>;
}

function FreeExcerpt({state,history}:{state:Parameters<StudioReviewSlots['notes']>[0];history:boolean}) {
  const locale=localeOf(state),t=format(locale);
  const notes=state.studio?.dailyNotes ?? {},dates=Object.keys(notes).filter(d=>notes[d].text.trim()).sort().reverse();
  const [date,setDate]=useState(localDate),[excerpt,setExcerpt]=useState(''),[allowed,setAllowed]=useState(false),[failed,setFailed]=useState(false);
  const entry=notes[date],use=!!entry && !!excerpt.trim() && entry.text.includes(excerpt);
  if(!dates.length)return null;
  return <details id="studio-daily-note" className="st-block review-studio-extra" data-testid="view-studio-free-transfer" open={location.hash==='#studio-daily-note'?true:undefined}>
    <summary>{t('daily.studioFree')}</summary>
    <p>{t('daily.studioExcerpt')}</p>
    {history&&<label>{t('daily.date')}<select value={date} onChange={e=>{setDate(e.target.value);setAllowed(false);setExcerpt('');}}>
      {[...new Set([date,...dates])].map(d=><option key={d} value={d}>{d}</option>)}
    </select></label>}
    <label>{t('daily.studioExcerptLabel')}<textarea rows={2} maxLength={3000} dir="auto" data-testid="input-studio-free-excerpt" value={excerpt} onChange={e=>{setExcerpt(e.target.value);setAllowed(false);}}/></label>
    {!use&&<p className="st-note">{t('daily.studioNoExcerpt')}</p>}
    <label className="pm-check"><input type="checkbox" data-testid="checkbox-studio-free-use" checked={allowed} onChange={e=>setAllowed(e.target.checked)} disabled={!use}/>{t('daily.studioFact')}</label>
    <button type="button" disabled={!use||!allowed} data-testid="button-studio-free-use" onClick={()=>{
      if(!entry)return;
      const key=`review:studio-free-source:${date}`;
      const id=dataRead<string>(key) ?? `review-card-${crypto.randomUUID()}`;
      if(dataWrite(key,id)&&attachStudioRecord({id,date,ref:{type:'free',date,text:excerpt,stamp:entry.updatedAt}})){
        window.parent.location.assign(reviewUrl('storyboard',locale));
      } else setFailed(true);
    }}>{t('daily.studioTransfer')}</button>
    {failed&&<p role="alert">{t('daily.failed')}</p>}
  </details>;
}

const slots:StudioReviewSlots={
  logo:`${BASE}/feelgood-brand-original.png`,
  assessmentSummary:<ReviewReportSummary/>,
  shelf:(state,act)=><DailyShelf state={state} act={act}/>,
  desk:(state,card)=><Worksheet key={card.id} state={state} card={card}/>,
  notes:(state,history)=><FreeExcerpt state={state} history={history}/>,
};
function ReviewReportSummary(){
  const {value,error}=useEveryday();
  const ko=(new URLSearchParams(location.search).get('lang')??'ko')==='ko';
  if(error)return <p role="alert">{ko?'검토용 결과지를 불러오지 못했습니다. 실제 결과지 서버는 미연결입니다.':'Could not read the sample report. The report server is not connected.'}</p>;
  const sample=reviewHomeFixture(value.choice.trait,value.choice.focus);
  return <>
    <b data-testid="studio-review-report-linked">{ko?'MY NUVIA 가상 결과지 · 실제 검사 아님':'MY NUVIA sample report · not a real assessment'}</b>
    <div className="pm-chips">{sample.areas.map(area=><span key={area.id} className="pm-tag">{area.label} {area.score??'—'}</span>)}</div>
    <details className="st-source-details"><summary>{ko?'강점·보완영역과 출처':'Strengths, practice areas, and source'}</summary>
      <p className="pm-note">{[...sample.strengths??[],...sample.growthPoints??[]].join(' · ')}</p>
      <p className="pm-note">{ko?'홈과 같은 가상 자료입니다. 실제 서버 및 원본 검사는 연결하지 않습니다.':'Same sample as on Home; no production assessment is connected.'}</p>
    </details>
  </>;
}
function StudioReview() {
  const locale=new URLSearchParams(location.search).get('lang') ?? 'ko';
  const [unsaved,setUnsaved]=useState(reviewStorageFailures);
  useEffect(()=>{
    document.body.classList.add('review-original-studio');
    signal('ready');
    const update=()=>setUnsaved(reviewStorageFailures());
    const warn=(event:BeforeUnloadEvent)=>{if(reviewStorageFailures()){event.preventDefault();event.returnValue='';}};
    window.addEventListener('nuvia-review-device',update);
    window.addEventListener('beforeunload',warn);
    const id=location.hash.slice(1);
    if(id.startsWith('studio-'))requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({block:'nearest'}));
    return ()=>{window.removeEventListener('nuvia-review-device',update);window.removeEventListener('beforeunload',warn);};
  },[]);
  return <><p className="pm-banner review" data-testid="text-studio-tab-boundary">
    {format(locale)('daily.studioPrivate')} {window===window.parent&&<a href={reviewUrl('home',locale)}>MY NUVIA</a>}
  </p>{unsaved>0&&<p role="alert" className="pm-banner">{locale==='ko'?'기기에 저장되지 않은 변경이 있어요. 이 화면을 닫기 전에 다시 시도해 주세요.':'Some changes are unsaved. Retry before leaving.'}{' '}
    <button type="button" onClick={retryReviewStorage}>{locale==='ko'?'다시 시도':'Retry'}</button></p>}
  <StudioApp reviewSlots={slots} reviewPersistence={{storage:reviewStorage,write:reviewWrite}}/></>;
}
function signal(status:'ready'|'failed') {
  document.getElementById('root')!.dataset.reviewStudio=status;
  if(window.parent!==window)window.parent.postMessage({type:'nuvia-career-studio',status},location.origin);
}
class StudioFailure extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){signal('failed');}
  render(){
    return this.state.failed?<p role="alert">{format(new URLSearchParams(location.search).get('lang') ?? 'ko')('daily.studioFrameError')} <a href={location.href}>{format('ko')('daily.studioRetry')}</a></p>:this.props.children;
  }
}
const root=createRoot(document.getElementById('root')!);
if(REVIEW_DEMO)root.render(<StudioFailure><StudioReview/></StudioFailure>);
else root.render(<p><a href={`${STUDY}?lang=ko`}>NUVIA 검토 체험으로 돌아가기</a></p>);
