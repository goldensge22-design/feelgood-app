import {useState,useEffect} from 'react';
import type {Action,PersonalState} from '../studio/model';
import {student} from '../studio/domain';
import {localeOf} from '../studio/i18n/config';
import {intlDate,rawText} from '../studio/i18n/runtime';
import {demoCardText} from '../studio/i18n/demo-copy';
import {monthOf} from '../studio/monthly';
import {summaryText} from './i18n';
import {runDate,summaryReady,sameSummary} from './domain';
import {blankSummary,validSummaryLink,type SummaryFields} from './model';
import {contextOf} from '../planner-library/domain';
import './summary.css';

type Props={state:PersonalState;act:(a:Action)=>boolean};
type Act=(a:unknown)=>boolean;
const closedRuns=(s:PersonalState)=>student(s).runs.filter(r=>r.phase==='closed'&&student(s).cards.some(c=>c.id===r.cardId));
const cardTitle=(s:PersonalState,cardId:string)=>{const c=student(s).cards.find(c=>c.id===cardId);return c?demoCardText(s,c,'title'):'';};
// Memory-only recovery when browser storage fails; never crosses workspace/run.
const recovery=new Map<string,SummaryFields>();

export function SummaryEditor({state,act,runId,onClose}:Props&{runId:string;onClose?:()=>void}){
 const L=localeOf(state),T=(k:string)=>summaryText(L,k),a=act as unknown as Act;
 const run=student(state).runs.find(r=>r.id===runId);
 const stored=state.studio?.summaries?.[runId];
 const recoveryKey=`${state.workspaceId}:${state.studentId}:${runId}`;
 const [local,setLocal]=useState<SummaryFields|null>(()=>recovery.get(recoveryKey)??null);
 const [failed,setFailed]=useState<''|'draft'|'save'|'copy'|'link'>(()=>recovery.has(recoveryKey)?'draft':'');
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(recovery.has(recoveryKey)){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[recoveryKey]);
 if(!run||run.phase!=='closed')return <p role="alert" className="es-alert">{T('missing')}</p>;
 const f:SummaryFields=local??stored?.draft??blankSummary(run.flag??'');
 const dirty=!!stored?.saved&&!sameSummary(stored.draft,stored.saved.fields);
 const edit=(patch:Partial<SummaryFields>)=>{
  const contentChange=!('selfConfirmed' in patch);
  const next={...f,...patch,...(contentChange?{selfConfirmed:false}:{})};
  setLocal(next);
  const ok=a({type:'summary.draft',runId,fields:next});
  setFailed(ok?'':'draft');if(ok){setLocal(null);recovery.delete(recoveryKey);}else recovery.set(recoveryKey,next);
 };
 const save=()=>{
  if(!validSummaryLink(f.link)){setFailed('link');return;}
  if(local&&!a({type:'summary.draft',runId,fields:local})){setFailed('save');return;}
  if(local){setLocal(null);recovery.delete(recoveryKey);}
  const ok=a({type:'summary.save',runId});setFailed(ok?'':'save');
 };
 const raw=JSON.stringify({runId,fields:f},null,1);
 const copy=async()=>{try{await navigator.clipboard.writeText(raw);}catch{setFailed('copy');}};
 const download=()=>{const u=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const l=document.createElement('a');l.href=u;l.download=`summary-draft-${runId}.json`;l.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
 const status=failed==='draft'||failed==='save'?T('saveFailed'):failed==='copy'?T('failureCopy'):failed==='link'?T('invalidLink'):stored?.saved&&!dirty&&!local?T('saved'):dirty||local?T('editing'):stored?T('draft'):T('empty');
 const txt=(k:'action'|'result'|'next'|'evidence'|'help'|'role',rows=2)=><label className="es-field">{T(k)}<textarea dir="auto" rows={rows} maxLength={3000} data-testid={`summary-${k}`} value={f[k]} onChange={e=>edit({[k]:e.target.value})}/></label>;
 return <div className="es-editor" data-testid={`summary-editor-${runId}`}>
  <p className="es-meta">{rawText(cardTitle(state,run.cardId))} · {intlDate(runDate(state,runId))}</p>
  <p className="es-note">{T('intro')}</p>
  <p className="es-note">{T(student(state).stage==='adult'?'adult':'young')}</p>
  {txt('action')}{txt('result')}{txt('next',1)}
  <details className="es-fold"><summary>{T('extra')}</summary>
   <label className="es-field">{T('link')}<input dir="ltr" type="url" inputMode="url" maxLength={2000} data-testid="summary-link" value={f.link} onChange={e=>edit({link:e.target.value})}/></label>
   <p className="es-note">{T('linkNotice')}</p>
   {txt('evidence')}{txt('help')}{txt('role')}
  <fieldset className="es-kind"><legend>{T('kind')}</legend>
   {(['unspecified','actual','simulation'] as const).map(k=><label key={k} className="es-radio"><input type="radio" name={`kind-${runId}`} data-testid={`summary-kind-${k}`} disabled={k==='actual'&&contextOf(state,run.cardId)==='simulation'} checked={f.kind===k} onChange={()=>edit({kind:k})}/>{T(k)}</label>)}
  </fieldset>
  <label className="es-radio"><input type="checkbox" data-testid="summary-confirm" checked={f.selfConfirmed} onChange={e=>edit({selfConfirmed:e.target.checked})}/>{T('confirm')}</label>
  </details>
  <p className="es-badge" data-testid="summary-external">{T('selfReport')} · {T('external')}</p>
  <p role={failed?'alert':'status'} className={failed?'es-alert':'es-status'} data-testid="summary-status">{status}</p>
  {failed&&<div className="es-row"><button data-testid="summary-copy" onClick={copy}>{T('copy')}</button><button data-testid="summary-download" onClick={download}>{T('download')}</button></div>}
  <div className="es-row">
   <button className="es-primary" data-testid="summary-save" disabled={!f.action.trim()&&!f.result.trim()} onClick={save}>{T('save')}</button>
   {onClose&&<button data-testid="summary-later" onClick={onClose}>{T('later')}</button>}
  </div>
  {!f.action.trim()&&!f.result.trim()&&<p className="es-note">{T('required')}</p>}
  <p className="es-note">{T('noAuto')} {T('noAi')}</p>
  <p className="es-note">{T('privacy')}</p>
  {!!stored?.history.length&&<details className="es-fold" data-testid="summary-history"><summary>{T('history')} ({stored.history.length})</summary>
   <ol className="es-history">{[...stored.history].reverse().map((v,i,arr)=>{const prev=arr[i+1]?.fields;const keys=(Object.keys(v.fields) as (keyof SummaryFields)[]).filter(k=>!prev||prev[k]!==v.fields[k]);
    return <li key={v.version} data-testid={`summary-version-${v.version}`}><strong>{T('version')} {v.version}</strong> · {intlDate(v.at,{dateStyle:'medium',timeStyle:'short'})}
     <dl>{keys.map(k=><div key={k}><dt>{T(k==='selfConfirmed'?'confirm':k)}</dt><dd>{typeof v.fields[k]==='boolean'?(v.fields[k]?T('confirm'):'—'):k==='kind'?T(String(v.fields[k])):rawText(String(v.fields[k])||'—')}</dd></div>)}</dl></li>;})}</ol>
  </details>}
 </div>;
}

export function SummaryAfter({state,act}:Props){
 const T=(k:string)=>summaryText(localeOf(state),k);
 const [open,setOpen]=useState(''),[hidden,setHidden]=useState('');
 const run=closedRuns(state).at(-1);
 if(!run||hidden===run.id||student(state).runs.some(r=>r.phase!=='closed'))return null;
 return <section className="es-card" data-testid="summary-after" aria-label={T('title')}>
  {open!==run.id?<div className="es-row"><button className="es-primary" data-testid="summary-open" onClick={()=>setOpen(run.id)}>{T('title')}</button><button data-testid="summary-skip" onClick={()=>setHidden(run.id)}>{T('later')}</button></div>
  :<SummaryEditor key={run.id} state={state} act={act} runId={run.id} onClose={()=>setOpen('')}/>}
 </section>;
}

export function SummaryList({state,act,month}:Props&{month?:string}){
 const T=(k:string)=>summaryText(localeOf(state),k);
 const [q,setQ]=useState(''),[date,setDate]=useState(''),[openId,setOpenId]=useState<string|null>(null);
 const runs=closedRuns(state).filter(r=>!month||monthOf(runDate(state,r.id))===month);
 const dates=[...new Set(runs.map(r=>runDate(state,r.id)))].sort().reverse();
 const shown=runs.filter(r=>(!date||runDate(state,r.id)===date)&&(!q.trim()||cardTitle(state,r.cardId).toLowerCase().includes(q.trim().toLowerCase()))).reverse();
 return <section className="es-card" data-testid="summary-list" aria-label={T('list')}>
  <details className="es-fold"><summary>{T('list')} ({runs.length})</summary>
   <div className="es-filters">
    <label className="es-field">{T('filter')}<input dir="auto" type="search" data-testid="summary-filter" value={q} onChange={e=>setQ(e.target.value)}/></label>
    <label className="es-field">{T('date')}<select data-testid="summary-date" value={date} onChange={e=>setDate(e.target.value)}><option value="">{T('all')}</option>{dates.map(d=><option key={d} value={d}>{intlDate(d)}</option>)}</select></label>
   </div>
   {!shown.length?<p className="es-note" data-testid="summary-empty">{T('empty')}</p>:<ul className="es-list">{shown.map(r=>{const x=state.studio?.summaries?.[r.id];const st=!x?'':summaryReady(x)||(x.saved&&sameSummary(x.draft,x.saved.fields))?T('saved'):x.saved?T('editing'):T('draft');
    return <li key={r.id} data-testid={`summary-row-${r.id}`}>
     <div className="es-row es-between"><span><strong>{rawText(cardTitle(state,r.cardId))}</strong> · {intlDate(runDate(state,r.id))} · {T('closed')}{st&&<> · <span className="es-chip">{st}</span></>}</span>
      <button aria-expanded={openId===r.id} data-testid={`summary-open-${r.id}`} onClick={()=>setOpenId(openId===r.id?null:r.id)}>{T('open')}</button></div>
     {openId===r.id&&<SummaryEditor state={state} act={act} runId={r.id} onClose={()=>setOpenId(null)}/>}
    </li>;})}</ul>}
  </details>
 </section>;
}

export function SummaryCitationPicker({state,act,experienceId}:Props&{experienceId:string}){
 const T=(k:string)=>summaryText(localeOf(state),k),a=act as unknown as Act;
 const d=state.studio,exp=d?.experiences.find(e=>e.id===experienceId),src=exp&&d?.sources[exp.sourceId];
 const current=((exp as {summaryRefs?:{runId:string}[]}|undefined)?.summaryRefs??[]).map(r=>r.runId);
 const [sel,setSel]=useState<string[]|null>(null),[failed,setFailed]=useState(false);
 if(!exp||!src?.available)return <p role="alert" className="es-alert">{T('missing')}</p>;
 const runs=closedRuns(state).filter(r=>r.cardId===src.cardId&&(monthOf(runDate(state,r.id))===src.month||current.includes(r.id)));
 const ready=runs.filter(r=>summaryReady(d?.summaries?.[r.id])&&monthOf(runDate(state,r.id))===src.month);
 const chosen=sel??current;
 const stale=current.some(id=>!ready.some(r=>r.id===id));
 return <fieldset className="es-card es-kind" data-testid={`summary-cite-${experienceId}`}><legend>{T('selected')}</legend>
  <p className="es-note">{T('citeHint')}</p>
  {stale&&<p role="alert" className="es-alert">{T('changed')}</p>}
  {!runs.length?<p className="es-note">{T('empty')}</p>:runs.map(r=>{const ok=ready.some(x=>x.id===r.id);return <label key={r.id} className="es-radio"><input type="checkbox" data-testid={`summary-cite-run-${r.id}`} disabled={!ok&&!chosen.includes(r.id)} checked={chosen.includes(r.id)} onChange={e=>{setFailed(false);setSel(e.target.checked?[...chosen,r.id]:chosen.filter(x=>x!==r.id));}}/><span>{rawText(cardTitle(state,r.cardId))} · {intlDate(runDate(state,r.id))}{!ok&&<> · {T('citeBlocked')}</>}</span></label>;})}
  <p className="es-badge">{T('citation')} · {T('external')}</p>
  {failed&&<p role="alert" className="es-alert">{T('citeBlocked')}</p>}
  <button className="es-primary" data-testid="summary-cite-apply" disabled={sel===null} onClick={()=>{const ok=a({type:'summary.cite',experienceId,runIds:chosen});setFailed(!ok);if(ok)setSel(null);}}>{T('cite')}</button>
 </fieldset>;
}
