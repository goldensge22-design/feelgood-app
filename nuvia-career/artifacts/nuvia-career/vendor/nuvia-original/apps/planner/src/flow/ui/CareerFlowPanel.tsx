import {useTabDraft,DraftNotice} from "./tab-draft";
// 대표 v3 classroom-flow src/ui/CareerFlowPanel.tsx 그대로
import {useEffect,useRef,useState} from 'react';
import {FlowFrame,useFlowLocale} from './FlowLocale';
import {errorKey} from '../shared/i18n.mjs';
export type FlowExperience={id:string;title:string;action:string;result:string;learning:string;strengths:string[];criterionIds:string[];confirmed:boolean;source:'planner';sourceId:string;sourceVersion:string;permissionStatus:'current'|'changed'|'revoked'};
export type Plan={title:string;goal:string;steps:string;date:string;status:string;successCriteria:string;artifactPlan:string;targetCapability:string};
export type Activity={id:string;scope:string;revision:number;source:{kind:'job'|'major';explorationId:string;explorationRevision:number;label:string;question:string;hypothesis:string;reason:string};plan:Plan;reflection:Record<'action'|'result'|'learning'|'change'|'artifact',string>};
type Request=<T>(path:string,body?:unknown,method?:string)=>Promise<T>;
export function useFlowRequest(apiBase:string,headers:Record<string,string>={}):Request{
 const {locale}=useFlowLocale();const identity=useRef<string|null>(null),sessionRequest=useRef<Promise<any>|null>(null);const language=useRef(locale);language.current=locale;
 const session=()=>{
  if(!sessionRequest.current)sessionRequest.current=(async()=>{
   const r=await fetch(apiBase+'/session',{credentials:'same-origin',cache:'no-store',headers,signal:AbortSignal.timeout(15000)});
   const value=await r.json().catch(()=>({}));if(!r.ok)throw Error(value.error??'AUTH_REQUIRED');
   if(typeof value.identity!=='string')throw Error('AUTH_REQUIRED');
   if(identity.current&&identity.current!==value.identity)throw Error('IDENTITY_CHANGED');
   identity.current=value.identity;return value;
  })().finally(()=>{sessionRequest.current=null;});
  return sessionRequest.current;
 };
 return async<T,>(path:string,body?:unknown,method=body===undefined?'GET':'POST'):Promise<T>=>{
  if(path==='/session')return await session() as T;
  if(!identity.current)await session();
  const response=await fetch(apiBase+path,{method,credentials:'same-origin',cache:'no-store',headers:{...headers,'X-Flow-Locale':language.current,'X-Flow-Identity':identity.current!,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});
  const json=await response.json().catch(()=>({}));if(!response.ok)throw Error(json.error??'error');return json as T;
 };
}
const facts=['action','result','learning','change','artifact'] as const;
const planFields=[['title','activityTitle'],['goal','goal'],['steps','steps'],['targetCapability','capability'],['successCriteria','criteria'],['artifactPlan','artifactPlan'],['date','date']] as const;
export function PlanFields({value,onChange,disabled=false}:{value:Plan;onChange:(p:Plan)=>void;disabled?:boolean}){const {t}=useFlowLocale();return <>{planFields.map(([key,label])=><label key={key}>{t(label)}{key==='date'?<input type="date" disabled={disabled} value={value.date} onChange={e=>onChange({...value,date:e.target.value})}/>:<textarea aria-label={t(label)} dir="auto" disabled={disabled} maxLength={key==='title'?500:10000} value={value[key]} onChange={e=>onChange({...value,[key]:e.target.value})}/>}</label>)}</>;}
function ActivityEditor({activity,request,onSaved,draftScope}:{draftScope?:string;activity:Activity;request:Request;onSaved:(a:Activity)=>void}){
 const {t,locale}=useFlowLocale();const [draft,setDraft]=useTabDraft(draftScope?draftScope+':activity:'+activity.id:null,activity);const [dirty,setDirty]=useTabDraft(draftScope?draftScope+':activity-dirty:'+activity.id:null,false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 const [fact,setFact]=useState(false),[consent,setConsent]=useState(false),[includeContext,setIncludeContext]=useState(false);const [fields,setFields]=useState<string[]>(['action']);
 const [coaching,setCoaching]=useState<{notice:string;writingTip:string;questions:string[];followup:Plan}|null>(null);const [followup,setFollowup]=useState<Plan|null>(null);const [accepted,setAccepted]=useState(false);const followId=useRef('');const epoch=useRef(0);const language=useRef(locale);language.current=locale;
 useEffect(()=>{epoch.current++;return()=>{epoch.current++;};},[]);useEffect(()=>{setCoaching(null);},[locale]);
 useEffect(()=>{if(activity.revision>draft.revision){if(!dirty&&!busy){setDraft(activity);setFact(false);setConsent(false);}else setMessage('conflict');}},[activity.revision]);
 const edit=(value:Activity)=>{setDraft(value);setDirty(true);setFact(false);setConsent(false);setCoaching(null);setFollowup(null);setMessage('');};
 const run=async(fn:()=>Promise<void>)=>{const current=epoch.current;setBusy(true);setMessage('');try{await fn();}catch(e){if(current===epoch.current)setMessage(errorKey(e));}finally{if(current===epoch.current)setBusy(false);}};
 return <article><DraftNotice/><h3><bdi>{activity.source.label}</bdi> · {t(activity.source.kind==='job'?'jobExplore':'majorExplore')}</h3>
 <p>{t('reason')}: <bdi>{activity.source.reason}</bdi></p><p>{t('question')}: <bdi>{activity.source.question}</bdi></p><p>{t('hypothesis')}: <bdi>{activity.source.hypothesis}</bdi></p>
 <PlanFields value={draft.plan} disabled={busy} onChange={plan=>edit({...draft,plan})}/>
 <label>{t('status')}<select value={draft.plan.status} disabled={busy} onChange={e=>edit({...draft,plan:{...draft.plan,status:e.target.value}})}>{['planned','active','paused','partial','completed'].map(s=><option key={s} value={s}>{t(s)}</option>)}</select></label>
 {facts.map(key=><label key={key}>{t(key)}<textarea aria-label={t(key)} dir="auto" disabled={busy} maxLength={20000} value={draft.reflection[key]} onChange={e=>edit({...draft,reflection:{...draft.reflection,[key]:e.target.value}})}/></label>)}
 <button disabled={busy||!dirty} onClick={()=>void run(async()=>{const current=epoch.current;const saved=await request<Activity>('/activities/'+encodeURIComponent(activity.id),{revision:draft.revision,plan:draft.plan,reflection:draft.reflection},'PUT');if(current!==epoch.current)return;setDraft(saved);setDirty(false);setFact(false);setConsent(false);onSaved(saved);setMessage('saved');})}>{t('saveActivity')}</button>
 <fieldset disabled={busy||dirty}><legend>{t('shareFields')}</legend>
 {facts.map(key=><label key={key}><input type="checkbox" checked={fields.includes(key)} disabled={key==='action'} onChange={e=>{setFields(e.target.checked?[...fields,key]:fields.filter(f=>f!==key));setFact(false);setConsent(false);}}/>{t(key)}</label>)}
 <label><input type="checkbox" checked={fact} onChange={e=>setFact(e.target.checked)}/>{t('factConsent')}</label>
 <label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>{t('usageConsent')}</label>
 <label><input type="checkbox" checked={includeContext} onChange={e=>{setIncludeContext(e.target.checked);setConsent(false);}}/>{t('contextConsent')}</label>
 <button disabled={busy||dirty||!fact||!consent||!draft.reflection.action.trim()} onClick={()=>void run(async()=>{await request('/activities/'+encodeURIComponent(activity.id)+'/share',{revision:draft.revision,fields,factConfirmed:fact,usageConsent:consent,includeResearchContext:includeContext});setMessage('shared');})}>{t('share')}</button></fieldset>
 <button disabled={busy||dirty} onClick={()=>void run(async()=>{const requested=locale;const c=await request<NonNullable<typeof coaching>>('/activities/'+encodeURIComponent(activity.id)+'/coaching');if(requested===language.current)setCoaching(c);})}>{t('checkEvidence')}</button>
 {coaching&&<aside><p>{coaching.notice}</p><p>{coaching.writingTip}</p><ul>{coaching.questions.map((q,i)=><li key={i}>{q}</li>)}</ul><button disabled={busy||dirty} onClick={()=>{setFollowup(coaching.followup);setAccepted(false);followId.current=crypto.randomUUID();}}>{t('followup')}</button></aside>}
 {followup&&<fieldset disabled={busy||dirty}><legend>{t('followup')}</legend><PlanFields value={followup} onChange={p=>{setFollowup(p);setAccepted(false);followId.current=crypto.randomUUID();}}/><label><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>{t('accept')}</label><button disabled={!accepted} onClick={()=>void run(async()=>{const saved=await request<Activity>('/activities/'+encodeURIComponent(activity.id)+'/followup',{requestId:followId.current,plan:followup,accepted});onSaved(saved);setFollowup(null);setMessage('saved');})}>{t('saveFollowup')}</button></fieldset>}
 {dirty&&<p>{t('unsaved')}</p>}{message&&<p role="status">{t(message)}</p>}</article>;
}
export function CareerFlowPanel({apiBase,headers,mode,onImport,importBlocked=false,refreshToken=0,draftScope}:{draftScope?:string;apiBase:string;headers?:Record<string,string>;mode:'planner'|'career';onImport?:(e:FlowExperience[])=>void|Promise<void>;importBlocked?:boolean;refreshToken?:number}){
 const [confirmedScope,setConfirmedScope]=useState(draftScope??'');
 const {t}=useFlowLocale();const request=useFlowRequest(apiBase,headers);const [activities,setActivities]=useState<Activity[]>([]),[experiences,setExperiences]=useState<FlowExperience[]>([]),[selected,setSelected]=useState<string[]>([]);const [busy,setBusy]=useState(false),[message,setMessage]=useState('');const epoch=useRef(0);
 const load=async(quiet=false)=>{const current=epoch.current;if(!quiet){setBusy(true);setMessage('');}try{const session=await request<{identity:string;scope?:string}>('/session');if(current!==epoch.current)return;setConfirmedScope(JSON.stringify([apiBase,session.identity,session.scope,headers]));if(mode==='career'){const d=await request<{experiences:FlowExperience[]}>('/experiences');if(current===epoch.current)setExperiences(d.experiences);}else{const d=await request<{activities:Activity[]}>('/activities');if(current===epoch.current)setActivities(d.activities);}}catch(e){if(current===epoch.current){if(e instanceof Error&&['IDENTITY_CHANGED','AUTH_REQUIRED','FORBIDDEN'].includes(e.message)){setActivities([]);setExperiences([]);setSelected([]);}setMessage(errorKey(e));}}finally{if(!quiet&&current===epoch.current)setBusy(false);}};
 useEffect(()=>{epoch.current++;void load();let running=false;const refresh=async()=>{if(running)return;running=true;try{await load(true);}finally{running=false;}};const timer=mode==='planner'?window.setInterval(()=>{if(document.visibilityState!=='hidden')void refresh();},30000):null;window.addEventListener('focus',refresh);return()=>{epoch.current++;if(timer!==null)window.clearInterval(timer);window.removeEventListener('focus',refresh);};},[]);
 useEffect(()=>{if(refreshToken>0)void load();},[refreshToken]);
 return <FlowFrame label="flowTitle"><h2>{t('flowTitle')}</h2>{busy&&<p role="status">{t('busy')}</p>}{message&&<p role="status">{t(message)}</p>}
 {!busy&&!(mode==='career'?experiences:activities).length&&<p>{t('empty')}</p>}
 {activities.map(a=><ActivityEditor draftScope={confirmedScope} key={confirmedScope+":"+a.id} activity={a} request={request} onSaved={saved=>setActivities(old=>old.some(x=>x.id===saved.id)?old.map(x=>x.id===saved.id?saved:x):[saved,...old])}/>)}
 {mode==='career'&&<><button disabled={busy} onClick={()=>void load()}>{t('refresh')}</button>
 {experiences.map(e=><article key={e.id}><label><input type="checkbox" checked={selected.includes(e.id)} disabled={busy||e.permissionStatus!=='current'} onChange={v=>setSelected(v.target.checked?[...selected,e.id]:selected.filter(id=>id!==e.id))}/><bdi>{e.title}</bdi> · {t(e.permissionStatus)}</label>
 {(['action','result','learning'] as const).map(k=><p key={k}>{t(k)}: <bdi>{e[k]}</bdi></p>)}
 {e.permissionStatus!=='revoked'&&<button disabled={busy} onClick={async()=>{setBusy(true);try{await request('/experiences/'+encodeURIComponent(e.sourceId)+'/revoke',{});await load();}catch(err){setMessage(errorKey(err));}finally{setBusy(false);}}}>{t('revoke')}</button>}</article>)}
 <button disabled={busy||importBlocked||!onImport||!selected.some(id=>experiences.some(e=>e.id===id&&e.permissionStatus==='current'))} onClick={async()=>{setBusy(true);try{await onImport?.(experiences.filter(e=>selected.includes(e.id)&&e.permissionStatus==='current'));setMessage('imported');}catch(e){setMessage(errorKey(e));}finally{setBusy(false);}}}>{t('import')}</button>{importBlocked&&<p>{t('saveFirst')}</p>}</>}
 </FlowFrame>;
}
export function FlowDraftPanel({apiBase,experienceIds,question,targetJob='',targetCompany='',onApply}:{apiBase:string;experienceIds:string[];question:string;targetJob?:string;targetCompany?:string;onApply:(text:string)=>void}){
 const {t,locale}=useFlowLocale();const request=useFlowRequest(apiBase);const [draft,setDraft]=useState<{paragraphs:{text:string;evidenceIds:string[]}[];questions:string[]}|null>(null);const [tips,setTips]=useState<{tips:{message:string;evidenceIds:string[];contextIds:string[]}[];questions:string[]}|null>(null);const [busy,setBusy]=useState(false),[message,setMessage]=useState('');const epoch=useRef(0);const signature=JSON.stringify([experienceIds,question,targetJob,targetCompany,locale]);
 useEffect(()=>{epoch.current++;setDraft(null);setTips(null);setMessage('');return()=>{epoch.current++;};},[signature]);
 const body={experienceIds,question,targetJob,targetCompany,outputLocale:locale};
 const generate=async(kind:'tips'|'draft')=>{const current=epoch.current;setBusy(true);setMessage('');if(kind==='tips')setTips(null);else setDraft(null);try{const data=await request<any>('/ai-'+kind,body);if(current===epoch.current){if(kind==='tips')setTips(data);else setDraft(data);}}catch(e){if(current===epoch.current)setMessage(errorKey(e));}finally{setBusy(false);}};
 return <FlowFrame label="aiTitle"><h3>{t('aiTitle')}</h3><p>{t('aiNotice')}</p>
 <button disabled={busy||!question.trim()||!experienceIds.length} onClick={()=>void generate('tips')}>{t('getTips')}</button>
 {tips&&<aside>{tips.tips.map((tip,i)=><div key={i}><p dir="auto">{tip.message}</p><small>{t('evidence')}: <bdi>{tip.evidenceIds.join(', ')}</bdi>{tip.contextIds.length>0?' · '+t('researchContext'):''}</small></div>)}{tips.questions.map((q,i)=><p key={i}>{t('questions')}: <bdi>{q}</bdi></p>)}</aside>}
 <button disabled={busy||!question.trim()||!experienceIds.length} onClick={()=>void generate('draft')}>{t('getDraft')}</button>
 {message&&<p role="status">{t(message)}</p>}{draft&&<aside><p dir="auto">{draft.paragraphs.map(p=>p.text).join('\n\n')}</p>{draft.questions.map((q,i)=><p key={i}>{t('questions')}: <bdi>{q}</bdi></p>)}<p>{t('preview')}</p>
 <button disabled={busy||!draft.paragraphs.length} onClick={async()=>{const current=epoch.current;setBusy(true);try{await request('/ai-context',body);if(current===epoch.current){onApply(draft.paragraphs.map(p=>p.text).join('\n\n'));setDraft(null);}}catch(e){if(current===epoch.current)setMessage(errorKey(e));}finally{setBusy(false);}}}>{t('apply')}</button></aside>}</FlowFrame>;
}
