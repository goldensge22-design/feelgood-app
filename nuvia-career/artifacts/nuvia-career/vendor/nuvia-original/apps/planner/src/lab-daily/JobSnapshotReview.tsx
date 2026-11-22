import {useState} from 'react';
import {inspectJobSnapshot,type JobInspection} from './job-adapter';
import {labText} from './i18n';

/** Local inspection only. No server proof input, no applying snapshots, no auth or storage. */
export default function JobSnapshotReview({locale}:{locale:string}){
 const [raw,setRaw]=useState(''),[result,setResult]=useState<JobInspection|null>(null);
 const x=(k:string)=>labText(locale,k);
 const check=()=>{try{setResult(inspectJobSnapshot(JSON.parse(raw)));}catch{setResult({status:'invalid',reason:'contract',paths:[]});}};
 return <details data-testid="labdaily-job-review">
  <summary>{x('jobReviewTitle')}</summary>
  <p role="note">{x('jobReviewWarning')}</p>
  <label>{x('jobReviewInput')}<textarea value={raw} onChange={e=>{setRaw(e.target.value);setResult(null);}}
   dir="auto" data-testid="labdaily-job-input"/></label>
  <button type="button" onClick={check} data-testid="labdaily-job-check">{x('jobReviewCheck')}</button>
  {result&&<div role="status" data-testid="labdaily-job-result" data-status={result.status}>
   <p>{x(result.status==='invalid'?'jobReviewInvalid':'jobPending')}</p>
   {result.status==='connection_pending'&&<pre dir="auto" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(result.snapshot,null,2)}</pre>}
  </div>}
 </details>;
}
