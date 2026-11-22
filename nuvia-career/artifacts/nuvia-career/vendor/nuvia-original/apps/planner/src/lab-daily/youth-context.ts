import type {ExternalDirection} from './contract';
import type {LabDaily} from './model';
import type {JobServerContext} from './job-adapter';
import {stable} from './canonical';
/** Separate server-owned port, never read from a sender file or browser action. */
export type YouthServerContext=Omit<JobServerContext,'verified'>&{verified:Omit<JobServerContext['verified'],'ownerProgram'>&{sourceLab:'youth-career'}};
export function youthContextValid(d:LabDaily,e:ExternalDirection,c:YouthServerContext,at:string){
 const {current:a,verified:v}=c,now=Date.parse(at);
 return v.provider==='central-nuvia'&&v.sourceLab==='youth-career'&&!!a.subject&&!!a.camp&&!!a.scopeKey&&
  v.subject===a.subject&&v.camp===a.camp&&v.sessionGeneration===a.sessionGeneration&&!!a.sessionGeneration&&
  v.scopeKey===a.scopeKey&&(!d.youthReviewScope||d.youthReviewScope===a.scopeKey)&&
  Number.isFinite(now)&&Date.parse(a.sessionExpiresAt)>now&&v.campOwned&&v.consent==='granted'&&
  v.checkedAt===at&&v.snapshotFingerprint===stable(e)&&v.confirmedAt===e.direction.confirmedAt&&Date.parse(v.confirmedAt)<=now&&
  a.timeZone===d.account.timeZone&&Number.isSafeInteger(v.serverOrder)&&v.serverOrder>0;
}
