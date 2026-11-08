import {useEffect,useRef,useState} from 'react';
import type {Action,PersonalState,Stage} from '../studio/model';
import {recommendations,practiceAttachment,practiceStats} from './domain';
import {text,content,ageContent} from './i18n';
import {localeOf} from '../studio/i18n/config';
import './practice.css';
import {ageDesign,previewSteps,stepOffset} from './catalog';
import {label as existingLabel} from '../studio/i18n/runtime';
import {initialText} from './display';

type Act=(a:Action)=>boolean;
type Help='planning'|'attention'|'simultaneous'|'successive'|'universal'|'none';
const HELPS:Help[]=['planning','attention','simultaneous','successive','universal','none'];
const HELP_KEY:Record<Help,string>={planning:'helpPlanning',attention:'helpAttention',simultaneous:'helpSimultaneous',successive:'helpSuccessive',universal:'helpUniversal',none:'helpNone'};
const CONTEXTS:[string,string][]=[['생활','life'],['학습','study'],['업무','work']];
type Rec=ReturnType<typeof recommendations>[number];
const asList=(v:unknown):string[]=>Array.isArray(v)?v.map(String):typeof v==='string'&&v?[v]:[];

function focusTaskCreator(from:HTMLElement|null){
 const root=from?.closest('section')??document;
 const el=root.querySelector<HTMLElement>('[data-testid="task-title"]')??root.querySelector<HTMLElement>('[data-testid="button-open-task"]');
 el?.focus();
 if(el?.getAttribute('data-testid')==='button-open-task'){
  el.click();requestAnimationFrame(()=>root.querySelector<HTMLElement>('[data-testid="task-title"]')?.focus());
 }
}

export function HelpPreview({locale,stage,help,title,action,scope,context}:{locale:string;stage:Stage;help:Help;title:string;action:string;scope:string;context:string}){
 const t=(k:string)=>text(locale,k);
 const items=asList(ageContent(locale,stage,'items'));
 const ctx=asList(ageContent(locale,stage,'context'));
 return <div className="pr-help" data-help={help} data-testid={`practice-help-${help}`}>
  <p className="st-eye">{t(HELP_KEY[help])}</p>
  {help==='simultaneous'&&<div className="pr-rel"><div className="pr-node pr-goal"><small>{t('title')}</small><b>{title}</b></div>
   {items.length>0&&<div className="pr-node"><small>{t('materials')}</small><ul>{items.map(x=><li key={x}>{x}</li>)}</ul></div>}
   <div className="pr-node"><small>{t('context')}</small><b>{context}</b>{ctx.length>0&&<p className="st-note">{ctx.join(' · ')}</p>}</div></div>}
  {help==='successive'&&<ol className="pr-seq"><li><small>1</small><span>{action}</span></li><li><small>2</small><span>{scope||t('optional')}</span></li></ol>}
  {help==='planning'&&<dl className="pr-plan"><div><dt>{t('title')}</dt><dd>{title}</dd></div><div><dt>{t('scope')}</dt><dd>{scope||t('optional')}</dd></div><div><dt>{t('confirm')}</dt><dd>{action}</dd></div></dl>}
  {help==='attention'&&<p className="pr-first"><small>{t('action')}</small><mark>{action}</mark></p>}
  {help==='universal'&&<p className="pr-simple">{action}</p>}
  {help==='none'&&<p className="st-note">{t('helpNone')}</p>}
 </div>;
}

function Preview({state,rec,act,onClose}:{state:PersonalState;rec:Rec;act:Act;onClose:()=>void}){
 const locale=localeOf(state),t=(k:string)=>text(locale,k);
 const [v,setV]=useState(()=>({title:String(content(locale,rec.id,'title')),action:String(content(locale,rec.id,'action')),scope:ageContent(locale,rec.stage,'scope'),
  minutes:rec.minutes?String(rec.minutes):'',unknown:!rec.minutes,context:rec.stage==='adult'?'생활':'학습',help:(rec.help as Help)||'none',helpChosen:false,timeChosen:false,scopeChosen:false,titleEdited:false,actionEdited:false,waiting:false,details:Array.from({length:ageDesign[rec.stage].steps},()=>'' )}));
 useEffect(()=>setV(previous=>({...previous,
  ...(!previous.titleEdited?{title:content(locale,rec.id,'title')}:{}),
  ...(!previous.actionEdited?{action:content(locale,rec.id,'action')}:{}),
  ...(!previous.scopeChosen?{scope:ageContent(locale,rec.stage,'scope')}:{}),
  ...(!previous.helpChosen?{help:rec.help as Help}:{}),
 })),[locale,rec.id,rec.stage,rec.help]);
 const reqId=useRef(crypto.randomUUID()),busy=useRef(false);
 const [done,setDone]=useState(false),[err,setErr]=useState('');
 const set=(p:Partial<typeof v>)=>setV(o=>({...o,...p}));
 const add=()=>{
  if(busy.current||done)return;setErr('');
  let minutes:number|null=null;
  if(!v.unknown){const n=Number(v.minutes);if(!Number.isInteger(n)||n<1||n>1440){setErr('invalidTime');return;}minutes=n;}
  if(!v.title.trim()||!v.action.trim()){setErr('coreRequired');return;}
  busy.current=true;
  const ok=act({type:'practice.add',templateId:rec.id,stage:rec.stage,help:v.help,requestId:reqId.current,
   provided:{title:!v.titleEdited,firstAction:!v.actionEdited,scope:!v.scopeChosen},
   ...(rec.stage==='high'?{details:{deadline:v.details[1]}}:rec.stage==='adult'?{details:{owner:v.details[0],dependency:v.details[1],handoff:v.details[2],waiting:v.waiting}}:{}),
   task:{title:v.title.trim(),firstAction:v.action.trim(),scope:v.scope.trim(),date:rec.stage==='high'&&v.details[0]?v.details[0]:undefined,minutes,activity:v.context,activityExplicit:true,timeChosen:v.timeChosen,scopeChosen:v.scopeChosen,planReviewed:false,materials:v.details.filter(x=>x.trim()).join(' · '),steps:previewSteps(rec.stage,rec.target,v.details),requestId:reqId.current}} as unknown as Action);
  if(ok)setDone(true);else busy.current=false;
 };
 return <div className="pr-preview" data-testid="practice-preview">
  <p className="st-eye">{t('preview')} · {t(rec.basis==='result'?'resultReason':'generalReason')}</p>
  <div className="pm-grid2">
   <label>{t('title')}<input data-testid="practice-title" value={v.title} onChange={e=>set({title:e.target.value,titleEdited:true})}/></label>
   <label>{t('action')}<input data-testid="practice-action" value={v.action} onChange={e=>set({action:e.target.value,actionEdited:true})}/></label>
   <label>{t('scope')}<input data-testid="practice-scope" value={v.scope} onChange={e=>set({scope:e.target.value,scopeChosen:true})}/></label>
   <label>{t('time')}<input data-testid="practice-minutes" type="number" min={1} max={1440} step={1} disabled={v.unknown} value={v.minutes} onChange={e=>set({minutes:e.target.value,timeChosen:true})}/></label>
  </div>
  <label className="pm-check"><input type="checkbox" data-testid="practice-unknown" checked={v.unknown} onChange={e=>set({unknown:e.target.checked,timeChosen:true})}/>{t('unknown')}</label>
  <fieldset><legend>{t('context')}</legend><div className="pm-chips">{CONTEXTS.map(([c,k])=><button type="button" key={c} data-testid={`practice-context-${k}`} aria-pressed={v.context===c} onClick={()=>set({context:c})}>{t(k)}</button>)}</div></fieldset>
  <fieldset><legend>{t('help')}</legend><div className="pm-chips">{HELPS.map(h=><button type="button" key={h} data-testid={`practice-help-choice-${h}`} aria-pressed={v.help===h} onClick={()=>set({help:h,helpChosen:true})}>{t(HELP_KEY[h])}</button>)}</div>
   <p className="st-note">{t(HELP_KEY[v.help])}</p></fieldset>
  <HelpPreview locale={locale} stage={rec.stage} help={v.help} title={v.title} action={v.action} scope={v.scope} context={t(CONTEXTS.find(c=>c[0]===v.context)![1])}/>
  <details className="pm-fold" data-testid="practice-reason"><summary>{t('reason')}</summary>
   <h4>{t('practiceReason')} · {t(rec.target)}</h4><p>{t(rec.basis==='result'?'resultReason':'generalReason')}</p>
   <h4>{t('strengthReason')}</h4><p>{t(HELP_KEY[rec.officialHelp])} → {t(HELP_KEY[v.help])}</p><p>{t('coreRequired')}</p>
  </details>
  <p className="pr-confirm"><small>{t('confirm')}</small>{String(content(locale,rec.id,'confirm'))}</p>
  <p className="st-note pr-safety" data-testid="practice-safety">{t('safety')}</p>
  <details className="pm-fold" data-testid="practice-age-details"><summary>{t('materials')} · {t('optional')}</summary>
   <p>{ageContent(locale,rec.stage,'context')}</p>
   <div className="pm-grid2" data-age={rec.stage}>{v.details.map((value,i)=><label key={i}>{rec.stage==='high'&&i<2?existingLabel(i===0?'날짜':'최종 마감',locale):rec.stage==='adult'&&i<3?existingLabel(['책임자','먼저 끝나야 하는 일','넘겨줄 곳'][i],locale):t(rec.target==='successive'?'action':'materials')+' '+(i-stepOffset(rec.stage)+1)}
    {rec.stage==='elementary_1_3'&&<svg viewBox="0 0 32 24" width="44" height="32" aria-hidden="true"><path d={i===0?'M4 4h10v16H4zM18 4h10v16H18z':'M5 8h22v13H5zM10 8V3h12v5'} fill="none" stroke="currentColor" strokeWidth="2"/></svg>}
    <input type={rec.stage==='high'&&i<2?'date':'text'} data-testid={`practice-detail-${i}`} maxLength={rec.stage==='elementary_1_3'?40:rec.stage==='elementary_4_6'?80:rec.stage==='middle'?160:300} value={value} onChange={e=>set({details:v.details.map((x,j)=>j===i?e.target.value:x)})}/>
   </label>)}</div>
   {rec.stage==='adult'&&<label className="pm-check"><input type="checkbox" checked={v.waiting} onChange={e=>set({waiting:e.target.checked})}/>{existingLabel('다른 사람을 기다리는 중',locale)}</label>}
  </details>
  {rec.stage.startsWith('elementary')&&<p className="st-note">{t('reviewOnly')}</p>}
  {err&&<p role="alert" data-testid="practice-error">{t(err)}</p>}
  {done&&<p role="status" data-testid="practice-added">{t('added')}</p>}
  <div className="st-row"><button className="pm-primary" data-testid="practice-add" disabled={done} onClick={add}>{done?t('added'):t('add')}</button><button data-testid="practice-preview-close" onClick={onClose}>{t('close')}</button></div>
 </div>;
}

export default function PracticeRecommendations({state,act}:{state:PersonalState;act:Act}){
 const locale=localeOf(state),t=(k:string)=>text(locale,k);
 const recs=recommendations(state);
 const [order,setOrder]=useState(0),[pick,setPick]=useState<string|null>(null);
 const here=useRef<HTMLDetailsElement>(null);
 const two=recs.length?[recs[order%recs.length]]:[];
 const chosen=recs.find(r=>r.id===pick);
 const choose=(r:Rec)=>{act({type:'practice.view',templateId:r.id,stage:r.stage} as unknown as Action);setPick(r.id);};
 return <details ref={here} className="pm-fold pr-entry" data-testid="practice-open"><summary>{t('open')}</summary>
  <h3>{t('heading')}</h3>
   {chosen?<Preview key={chosen.id+':'+chosen.stage} state={state} rec={chosen} act={act} onClose={()=>setPick(null)}/>:<>
   {two.length?<ul className="pr-choices">{two.map(r=><li key={r.id}><button data-testid={`practice-choice-${r.id}`} onClick={()=>choose(r)}>
    <b>{String(content(locale,r.id,'title'))}</b><span>{String(content(locale,r.id,'action'))}</span>
     <small>{t('time')}: {new Intl.NumberFormat(locale).format(r.minutes)} · {t(HELP_KEY[r.help])}</small>
     <small>{t('confirm')}: {content(locale,r.id,'confirm')}</small>
     <small>{t(r.basis==='result'?'resultReason':'generalReason')}</small></button></li>)}</ul>:<p className="pm-empty">{t('none')}</p>}
   <div className="st-row">
     {recs.length>1&&<button data-testid="practice-other" onClick={()=>setOrder(o=>o+1)}>{t('other')}</button>}
    <button data-testid="practice-write" onClick={()=>focusTaskCreator(here.current)}>{t('write')}</button>
    <button data-testid="practice-without" onClick={()=>{if(here.current)here.current.open=false;focusTaskCreator(here.current);}}>{t('without')}</button>
   </div></>}
 </details>;
}

export function PracticeAttachment({state,cardId,act}:{state:PersonalState;cardId:string;act:Act}){
 const locale=localeOf(state),t=(k:string)=>text(locale,k);
 const a=practiceAttachment(state,cardId);
 if(!a)return null;
 const s=practiceStats(state,cardId);
 const last=a.reports[a.reports.length-1];
 const respond=(value:'yes'|'neutral'|'no')=>act({type:'practice.respond',cardId,value} as unknown as Action);
 return <section className="pr-attach" data-testid={`practice-attachment-${cardId}`}>
   <p className="st-eye">{t('source')} · {content(locale,a.templateId,'title')} · {a.addedAt.slice(0,10)}</p>
   <dl className="pr-plan"><div><dt>{t('initial')}</dt><dd>{initialText(a,locale,'title')}</dd></div><div><dt>{t('action')}</dt><dd>{initialText(a,locale,'firstAction')}</dd></div>
    <div><dt>{t('scope')}</dt><dd>{initialText(a,locale,'scope')||t('optional')}</dd></div><div><dt>{t('time')}</dt><dd>{a.initial.minutes>0?a.initial.minutes:t('unknown')}</dd></div></dl>
   <HelpPreview locale={locale} stage={a.stage} help={a.help as Help} title={initialText(a,locale,'title')} action={initialText(a,locale,'firstAction')} scope={initialText(a,locale,'scope')} context=""/>
  <dl className="pr-stats" data-testid="practice-stats">{(['uses','responses','yes','neutral','no','unanswered'] as const).map(k=><div key={k}><dt>{t(k==='uses'?'useCount':k==='responses'?'responseCount':k)}</dt><dd data-testid={`practice-stat-${k}`}>{s[k]}</dd></div>)}</dl>
  {s.uses>0&&<fieldset className="pr-respond"><legend>{t('response')} ({t('optional')})</legend>
   <div className="pm-chips">{(['yes','neutral','no'] as const).map(x=><button key={x} data-testid={`practice-respond-${x}`} aria-pressed={last?.value===x} onClick={()=>respond(x)}>{t(x)}</button>)}</div>
   <p className="st-note">{t('noEffect')}</p></fieldset>}
 </section>;
}
