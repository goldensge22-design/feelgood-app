import {useEffect,useRef,useState} from 'react';
import type {Action,PersonalState} from '../studio/model';
import {localeOf} from '../studio/i18n/config';
import {labText,sampleText} from './i18n';
import {virtualYouthContract} from './adapter';
import {activeDirections,recommendationDirections,acceptedCount,dayKey} from './policy';
import {DAILY_LIMIT} from './model';
import {publicLibrary} from '../library-public/policy';
import {text as practiceText} from '../practice-recommendations/i18n';
import JobSnapshotReview from './JobSnapshotReview';
import YouthHandoffReview from './YouthHandoffReview';
import {formatLabConfirmation} from './date-time';
import {labResources} from './i18n';
import {labInboxLive,reserveAccept} from '../integration/labInbox';
/** [NUVIA 연동] 운영 연결 문구 — 한국어만 있고 다른 언어는 한국어로 보인다 */
const liveText=(loc:string,k:string)=>labResources[loc]?.[k]??labResources.ko?.[k]??k;
import './lab-daily.css';
type Act=(a:Action)=>boolean;
function Card({state,act,p,d}:{state:PersonalState;act:Act;p:import('./model').Proposal;d:string}){
 const loc=localeOf(state),x=(k:string,o={})=>labText(loc,k,o),sample=p.sourceLab!=='job'&&state.studio?.labDaily?.handoffs.find(h=>h.payload.handoffId===p.handoffId&&h.payload.version===p.handoffVersion)?.payload.productSample===true,interest=sampleText(loc,p.interest,sample),dname=sampleText(loc,p.directionName,sample),params={interest,direction:dname};
 // Drafts survive a reload (kept per proposal in this browser only; never sent anywhere; cleared on register/replace).
  const dk=`nuvia:labdaily:draft:${state.studentId}:${p.handoffId}:${p.id}`,saved=(()=>{try{const v=JSON.parse(localStorage.getItem(dk)||'null');return v&&typeof v.q==='string'&&typeof v.scope==='string'?v as {q:string;scope:string;min:number;suggested:boolean}:null;}catch{return null;}})();
  const [q,setQ]=useState(saved?.q??''),[scope,setScope]=useState(saved?.scope??''),[min,setMin]=useState(saved?.min??p.minutes),[open,setOpen]=useState(!!saved),[suggested,setSuggested]=useState(saved?.suggested??false);
  useEffect(()=>{try{if(q||scope||min!==p.minutes)localStorage.setItem(dk,JSON.stringify({q,scope,min,suggested}));else localStorage.removeItem(dk);}catch{/* storage unavailable: draft just is not kept */}},[q,scope,min,suggested,dk,p.minutes]);
 const req=useRef(crypto.randomUUID()),busy=useRef(false);
 const title=x(p.templateId+'.title');
 const fill=()=>{setQ(title+' · '+interest);setScope(x('scopeText',params));setSuggested(true);};
 const [limitMsg,setLimitMsg]=useState('');
 const accept=async()=>{
  if(busy.current)return;busy.current=true;setLimitMsg('');
  const source=suggested?(q===title+' · '+interest&&scope===x('scopeText',params)?'suggested':'edited'):'written';
  // [NUVIA 연동] 운영에서는 모든 LAB·기기를 합친 하루 3개를 서버가 먼저 확인한다
  if(labInboxLive()){
   const r=await reserveAccept(d,req.current);
   if(r!=='ok'){setLimitMsg(liveText(localeOf(state),r==='limit'?'liveLimitError':'liveServerError'));busy.current=false;return;}
  }
  const ok=act({type:'labdaily.accept',requestId:req.current,proposalId:p.id,question:q,scope,minutes:min,source});
  if(ok){try{localStorage.removeItem(dk);}catch{/* ignore */}}else busy.current=false;
 };
 const replace=()=>{try{localStorage.removeItem(dk);}catch{/* ignore */}return act({type:'labdaily.replace',requestId:crypto.randomUUID(),proposalId:p.id});};
 return <li className="ld-card" data-testid={`labdaily-card-${p.slot}`} data-status={p.status}>
  <h4>{title} <small>· {p.minutes}′</small></h4>
  <p>{x(p.templateId+'.action',params)}</p>
   <p className="ld-meta" dir="auto">{x('direction')}: {dname} · {x(p.sourceLab==='job'||(p.contextKind&&p.contextKind!=='interests')?'context':'interests')}: {interest}</p>
  {p.status==='accepted'?<p className="ld-ok">{x('accepted')}</p>:<>
   <div className="ld-row"><button type="button" onClick={replace} data-testid="labdaily-replace">{x('replace')}</button>
    <button type="button" onClick={()=>setOpen(o=>!o)} aria-expanded={open} data-testid="labdaily-open">{x('question')}</button></div>
   {open&&<div className="ld-form">
    <button type="button" onClick={fill} data-testid="labdaily-suggest">{x('useSuggested')}</button>
    <label>{x('question')}<input value={q} maxLength={200} dir="auto" onChange={e=>{setQ(e.target.value);setSuggested(false);}} data-testid="labdaily-question"/></label>
    <label>{x('scope')}<input value={scope} maxLength={300} dir="auto" onChange={e=>{setScope(e.target.value);}} data-testid="labdaily-scope"/></label>
    <label>5–10<input type="number" min={5} max={10} value={min} onChange={e=>setMin(Number(e.target.value))} data-testid="labdaily-minutes"/></label>
    <button type="button" onClick={()=>void accept()} data-testid="labdaily-accept">{x('register')}</button>{limitMsg&&<p role="alert" className="ld-note">{limitMsg}</p>}
   </div>}
  </>}
  <span hidden>{d}</span>
 </li>;
}
export default function LabDailyUI({state,act}:{state:PersonalState;act:Act}){
 if(publicLibrary||state.mode!=='review')return null;
 return <LabDailyBody state={state} act={act}/>;
}
function LabDailyBody({state,act}:{state:PersonalState;act:Act}){
 const loc=localeOf(state),x=(k:string,o={})=>labText(loc,k,o),ld=state.studio?.labDaily,hs=ld?.handoffs??[];
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const tick=()=>setNow(Date.now()),id=setInterval(tick,30000);window.addEventListener('focus',tick);return()=>{clearInterval(id);window.removeEventListener('focus',tick);};},[]);
 const day=ld?dayKey(new Date(now).toISOString(),ld.account.timeZone):'',rec=ld?.days[day],shown=(rec?.proposals??[]).filter(p=>p.status!=='replaced');
 // Today's first suggestion (and a refresh after a new handoff or withdrawal) appears without pressing a button. It is only a suggestion: no task is registered.
 const hasDir=!!ld&&recommendationDirections(ld).length>0,wd=ld?.withdrawals?.length??0;
 const jobs=ld?.jobSnapshots?.length??0;
 useEffect(()=>{if(hasDir)act({type:'labdaily.propose',requestId:`auto-propose-${day}-${hs.length}-${wd}-${jobs}`});},[hasDir,day,hs.length,wd,jobs]);// eslint-disable-line react-hooks/exhaustive-deps
 const last=hs.at(-1)?.payload,fmt=(s:string)=>formatLabConfirmation(s,loc,ld!.account.timeZone);
 const live=labInboxLive();
 const recv=(v:'youth'|'add'|'switch')=>act({type:'labdaily.receive',demo:true,requestId:crypto.randomUUID(),payload:virtualYouthContract(v==='switch'?'switch':'add',hs.length+1,new Date().toISOString(),v==='youth'?'a':v==='add'?'b':'c')});
 return <section className="ld" aria-label={x('title')} data-testid="labdaily">
  <h3>{x('title')}</h3><p>{x('intro')}</p>
  {!live&&<p className="ld-virtual" role="note" data-testid="labdaily-virtual">{x('virtual')}</p>}
  <p className="ld-note">{x('kindNote')}</p>
  {!live&&<YouthHandoffReview state={state} locale={loc} act={act}/>}
  {!live&&<JobSnapshotReview locale={loc}/>}
  {!last?(live?<p data-testid="labdaily-live-none">{liveText(loc,'liveNone')}</p>:<><p>{x('none')}</p><p className="ld-note">{x('notConnected')}</p>
   <div className="ld-row"><button type="button" onClick={()=>recv('youth')} data-testid="labdaily-receive-youth">{x('receiveYouth')}</button>
   </div><p className="ld-note" data-testid="labdaily-job-pending">{x('jobPending')}</p></>):
  <>
   <dl className="ld-info" data-testid="labdaily-info">
    <dt>LAB</dt><dd>{last.sourceLab==='job'?x('sourceJob'):x('sourceYouth')} · {x('confirmedAt')}: <bdi>{fmt(last.confirmedAt)}</bdi></dd>
    {activeDirections(ld!).map(d=>{const sample=hs.find(h=>h.payload.handoffId===d.handoffId&&h.payload.version===d.version)?.payload.productSample===true;return <div key={d.sourceLab+d.id} data-testid="labdaily-direction"><dt>{x('direction')}</dt><dd dir="auto">{sampleText(loc,d.name,sample)} · {d.sourceLab==='job'?x('sourceJob'):x('sourceYouth')}</dd>
     <dt>{x('strengths')}</dt><dd dir="auto">{d.strengths.map(v=>sampleText(loc,v,sample)).join(', ')}</dd>
     <dt>{x('interests')}</dt><dd dir="auto">{d.interests.map(v=>sampleText(loc,v,sample)).join(', ')}</dd>
     {d.support&&<><dt>{x('support')}</dt><dd>{practiceText(loc,'help'+d.support[0].toUpperCase()+d.support.slice(1))}</dd></>}</div>;})}
   </dl>
   <p className="ld-note">{x('supportNote')}</p>
   {!live&&<div className="ld-row"><button type="button" onClick={()=>recv('add')} data-testid="labdaily-receive-add">{x('dirAdd')}</button>
    <button type="button" onClick={()=>recv('switch')} data-testid="labdaily-receive-switch">{x('dirSwitch')}</button></div>}
   {!shown.length&&<button type="button" onClick={()=>act({type:'labdaily.propose',requestId:crypto.randomUUID()})} data-testid="labdaily-propose">{x('propose')}</button>}
   {shown.length>0&&<><p className="ld-count" data-testid="labdaily-count">{x('slots',{count:acceptedCount(ld!,day),limit:DAILY_LIMIT})}</p>
    <ul className="ld-list">{shown.map(p=><Card key={p.id} state={state} act={act} p={p} d={day}/>)}</ul>
    {rec!.extra<2&&<button type="button" onClick={()=>act({type:'labdaily.more',requestId:crypto.randomUUID()})} data-testid="labdaily-more">{x('more')}</button>}</>}
   <p className="ld-note">{live?liveText(loc,'liveLimitNote'):x('limitNote')}</p><p className="ld-note">{x('optionalNote')}</p>
  </>}
 </section>;
}
