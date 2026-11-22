import {jobSnapshotSchema,jobRecordSchema,JOB_OWNER,type JobSnapshot,type JobRecord} from './job-contract';
import {stable} from './canonical';
import type {LabDaily} from './model';

export type JobInspection=
 |{status:'invalid';reason:'contract';paths:string[]}
 |{status:'connection_pending';reason:'trusted_server_context_required';snapshot:JobSnapshot};
/** Safe browser-facing receiving adapter. A granted JSON file is NOT current consent.
 * Validation succeeds locally, but NEVER authenticates or activates a direction. */
export function inspectJobSnapshot(raw:unknown):JobInspection{
 const parsed=jobSnapshotSchema.safeParse(raw);
 if(!parsed.success)return {status:'invalid',reason:'contract',paths:parsed.error.issues.map(i=>i.path.join('.'))};
 return {status:'connection_pending',reason:'trusted_server_context_required',snapshot:parsed.data};
}
/** PORT CONTRACT ONLY. No implementation of central SSO, ownership or consent exists here.
 * A production verifier must use central NUVIA session + server DB (not uploaded JSON),
 * bind the response to the exact snapshot and session generation, and recheck at commit.
 * Synthetic tests may supply this object ONLY to exercise the pure review projection. */
export interface JobServerContext{
 current:{subject:string;camp:string;sessionGeneration:string;scopeKey:string;sessionExpiresAt:string;stage:'middle'|'high'|'adult';timeZone:string};
 verified:{
  provider:'central-nuvia';ownerProgram:typeof JOB_OWNER;subject:string;camp:string;sessionGeneration:string;scopeKey:string;
  campOwned:boolean;consent:'granted'|'revoked';snapshotFingerprint:string;serverOrder:number;
  confirmedAt:string;checkedAt:string;
 };
}
export class JobReceiveError extends Error{
 constructor(public code:'pending'|'invalid'|'session'|'ownership'|'consent'|'order'|'conflict'|'context'){super(code);}
}
/** In-memory REVIEW projection, not an HTTP/auth endpoint. UI never passes server context.
 * All checks happen before cloning/appending; refusal preserves the original state.
 * createdVia is historical metadata, NOT add/switch commands.
 */
export function applyVerifiedJobSnapshotForReview(d:LabDaily,raw:unknown,context?:JobServerContext,at?:string):{state:LabDaily;status:'review_applied'|'review_duplicate'}{
 const inspected=inspectJobSnapshot(raw);
 if(inspected.status==='invalid')throw new JobReceiveError('invalid');
 if(!context||!at)throw new JobReceiveError('pending');
 const s=inspected.snapshot,{current:c,verified:v}=context,now=Date.parse(at);
 if(v.provider!=='central-nuvia'||!c.subject||!c.sessionGeneration||!c.scopeKey||v.scopeKey!==c.scopeKey||
    (d.jobReviewScope!==undefined&&d.jobReviewScope!==c.scopeKey)||((d.jobSnapshots?.length??0)>0&&!d.jobReviewScope)||
    v.subject!==c.subject||v.sessionGeneration!==c.sessionGeneration||
    !Number.isFinite(now)||Date.parse(c.sessionExpiresAt)<=now||!Number.isFinite(Date.parse(c.sessionExpiresAt)))throw new JobReceiveError('session');
 if(!c.camp||v.camp!==c.camp||!v.campOwned||v.ownerProgram!==JOB_OWNER)throw new JobReceiveError('ownership');
 if(v.consent!=='granted')throw new JobReceiveError('consent');
 // Fresh proof per transaction; no stale granted-file or cached verifier response reuse.
 if(v.checkedAt!==at||v.snapshotFingerprint!==stable(s)||!Number.isFinite(Date.parse(v.confirmedAt))||Date.parse(v.confirmedAt)>now)
  throw new JobReceiveError('context');
 if(c.timeZone!==d.account.timeZone)throw new JobReceiveError('context');
 const records=d.jobSnapshots??[],same=records.find(r=>r.snapshot.requestId===s.requestId),last=records.at(-1);
 if(same){
  if(stable(same.snapshot)!==stable(s)||same.serverOrder!==v.serverOrder)throw new JobReceiveError('conflict');
  // Do not roll the active snapshot back when retrying an older verified request.
  return {state:d,status:'review_duplicate'};
 }
 if(!Number.isSafeInteger(v.serverOrder)||v.serverOrder<1||(last&&v.serverOrder<=last.serverOrder))throw new JobReceiveError('order');
 const record:JobRecord=jobRecordSchema.parse({snapshot:s,serverOrder:v.serverOrder,confirmedAt:v.confirmedAt,receivedAt:at,stage:c.stage,timeZone:c.timeZone,reviewOnly:true});
 const n=structuredClone(d);n.jobReviewScope=c.scopeKey;(n.jobSnapshots??=[]).push(record);
 return {state:n,status:'review_applied'};
}
/** No real server exists in this patch. This port does not read or trust JSON auth flags. */
export const jobServerReceiver={receive:async(raw:unknown):Promise<JobInspection>=>inspectJobSnapshot(raw)};
