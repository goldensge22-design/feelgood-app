import {useState} from 'react';
import {inspectYouthHandoff} from './contract';
import {labText} from './i18n';
import type {Action,PersonalState} from '../studio/model';
/** JSON-only inspection: store valid raw sender data as pending, never trust it. */
export default function YouthHandoffReview({state,locale,act}:{state:PersonalState;locale:string;act:(a:Action)=>boolean}){
 const [raw,setRaw]=useState(''),[invalid,setInvalid]=useState(false);
 const x=(k:string)=>labText(locale,k),pending=state.studio?.labDaily?.pendingYouth??[];
 const check=()=>{try{const p=JSON.parse(raw),r=inspectYouthHandoff(p);if(r.status==='invalid'){setInvalid(true);return;}
  setInvalid(false);act({type:'labdaily.receive',requestId:r.handoff.requestId,payload:p});
 }catch{setInvalid(true);}};
 return <details className="ld-job-review" data-testid="labdaily-youth-review">
  <summary>{x('sourceYouth')} · JSON</summary><p role="note">{x('virtual')}</p>
  <label>JSON<textarea dir="auto" value={raw} onChange={e=>{setRaw(e.target.value);setInvalid(false);}} data-testid="labdaily-youth-input"/></label>
  <button type="button" onClick={check} data-testid="labdaily-youth-check">{x('jobReviewCheck')}</button>
  {invalid&&<p role="alert">{x('invalidHandoff')}</p>}
  {pending.length>0&&<div role="status" data-testid="labdaily-youth-pending" data-status="connection_pending">
   <p>{x('notConnected')}</p><pre dir="auto" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(pending.map(x=>x.handoff),null,2)}</pre>
  </div>}
 </details>;
}
