import type {PersonalState} from '../studio/model';
import type {TaskInput} from '../studio/task-plan';
import {student} from '../studio/domain';
import {localeOf} from '../studio/i18n/config';
import {sampleText,labText} from './i18n';
import {freshLabDaily,PolicyError,receive,withdraw,propose,more,replace,accept,checkInvariants} from './policy';
import type {LabDailyAction} from './model';
import {HandoffError} from './adapter';
import {jobHandoffId} from './job-contract';
import {applyVerifiedJobSnapshotForReview} from './job-adapter';
export const fail=(s:PersonalState,code:string):never=>{throw Error(labText(localeOf(s),code));};
/** `create` makes the card through the ordinary task path. LAB daily never starts, completes or credits a card. */
export function applyLabDaily(state:PersonalState,a:LabDailyAction,at:string,create:(n:PersonalState,task:TaskInput)=>PersonalState):PersonalState{
 let n=structuredClone(state);n.studio??={placements:{},selectedId:'',deskId:'',archiveReminders:true,appearance:'ivory',lastNoticeSession:'',sources:{},experiences:[]};
 const d=n.studio.labDaily??=freshLabDaily();
 try{
  if(a.type==='labdaily.receive')receive(d,a,at,{stage:student(n).stage});
  else if(a.type==='labdaily.server-receive'){
   if(a.youth)receive(d,{type:'labdaily.receive',requestId:a.requestId,payload:a.payload},at,{stage:student(n).stage,verifiedYouth:a.youth});
   else if(a.job){const r=applyVerifiedJobSnapshotForReview(d,a.payload,a.job,at);n.studio.labDaily=r.state;}
  }
  else if(a.type==='labdaily.withdraw')withdraw(d,a,at);
  else if(a.type==='labdaily.propose')propose(d,a,at);
  else if(a.type==='labdaily.more')more(d,a,at);
  else if(a.type==='labdaily.replace')replace(d,a,at);
  else{
   const p=accept(d,a,at);
   if(!p)return JSON.stringify(n.studio.labDaily)===JSON.stringify(state.studio?.labDaily)?state:n;
   const locale=localeOf(n);
   const sample=p.sourceLab!=='job'&&d.handoffs.find(h=>h.payload.handoffId===p.handoffId&&h.payload.version===p.handoffVersion)?.payload.productSample===true;
   const action=labText(locale,`${p.templateId}.action`,{interest:sampleText(locale,p.interest,sample),direction:sampleText(locale,p.directionName,sample)});
   const task:TaskInput={title:a.question.trim(),scope:a.scope.trim(),firstAction:action,minutes:a.minutes,activity:'기타',activityExplicit:true,timeChosen:false,scopeChosen:false,planReviewed:false,requestId:a.requestId};
   const m=create(n,task);
   const id=m.studio!.creations![a.requestId];
   if(!id)throw new PolicyError('invalid');
   const dd=m.studio!.labDaily!,h=dd.handoffs.find(x=>x.payload.handoffId===p.handoffId&&x.payload.version===p.handoffVersion)?.payload;
   const job=p.sourceLab==='job'?dd.jobSnapshots?.find(r=>jobHandoffId(r.snapshot)===p.handoffId&&r.snapshot.directions.some(x=>x.directionId===p.directionId&&x.version===p.handoffVersion)):undefined;
   const sourceLab=job?'job':h?.sourceLab;
   if(!sourceLab)throw new PolicyError('invalid');
   const day=Object.keys(dd.days).find(k=>dd.days[k].proposals.some(x=>x.id===p.id))!;
   dd.days[day].proposals.find(x=>x.id===p.id)!.cardId=id;
   dd.cards[id]={proposalId:p.id,handoffId:p.handoffId,handoffVersion:p.handoffVersion,day,directionId:p.directionId,directionName:p.directionName,sourceLab,source:a.source,minutes:a.minutes};
   for(const [key,source] of Object.entries(m.studio!.sources??{}))if(source.cardId===id)delete m.studio!.sources[key];
   n=m;
  }
 }catch(e){
  if(e instanceof PolicyError)return fail(state,e.code);
  if(e instanceof HandoffError)return fail(state,'notConnected');
  throw e;
 }
 return n;
}
export function validateLabDaily(state:PersonalState){
 const d=state.studio?.labDaily;if(!d)return;
 try{checkInvariants(d,id=>student(state).cards.some(c=>c.id===id));}catch(e){if(e instanceof PolicyError)fail(state,e.code);throw e;}
}
