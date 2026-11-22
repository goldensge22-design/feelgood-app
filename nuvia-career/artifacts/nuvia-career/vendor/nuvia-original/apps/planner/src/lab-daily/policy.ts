import {externalSchema,sourceOf,buildAck,toInternal} from './contract';
import {TEMPLATES,DAILY_LIMIT,type Handoff,type LabDaily,type Proposal,type LabDailyAction} from './model';
import {jobHandoffId,isJobCandidate} from './job-contract';
import {inspectJobSnapshot} from './job-adapter';
import {stable} from './canonical';
import {youthContextValid,type YouthServerContext} from './youth-context';
export {stable} from './canonical';
/** Pure, storage-free policy. A server implementation must run the same decisions inside ONE atomic transaction keyed by the authenticated user. */
export class PolicyError extends Error{constructor(public code:string){super(code);}}
export const freshLabDaily=():LabDaily=>({account:{timeZone:'Asia/Seoul'},handoffs:[],days:{},requests:{},cards:{}});
/** Day is decided from the SERVER instant and the ACCOUNT time zone, never the browser locale or zone. */
export function dayKey(at:string,timeZone:string){
 const p=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(at));
 const g=(t:string)=>p.find(x=>x.type===t)!.value;return `${g('year')}-${g('month')}-${g('day')}`;
}
export const latest=(d:LabDaily)=>d.handoffs.at(-1)?.payload;
export type Dir={id:string;name:string;sourceLab:'youth-career'|'job';handoffId:string;version:number;interests:string[];strengths:string[];directions?:string[];stage:string;support?:string;isDefault?:boolean};
/** Replays handoffs and withdrawals in time order. Every direction keeps the context (interests, stage, support, source, handoff version) of the handoff that last confirmed IT. A switch replaces ONLY the directions of its own LAB source. */
export function activeDirections(d:LabDaily):Dir[]{
 // Verified server order (append order), NOT generatedAt or wall-clock order,
 // selects the one authoritative JOB snapshot. Older snapshots remain history only.
 const currentJob=d.jobSnapshots?.at(-1);
 const events=[...d.handoffs.filter(h=>!currentJob||h.payload.sourceLab!=='job').map((h,i)=>({at:h.receivedAt,o:i,h})),...(currentJob?[{at:currentJob.receivedAt,o:5e5,j:currentJob}]:[]),...(d.withdrawals??[]).map((w,i)=>({at:w.at,o:1e6+i,w}))].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||a.o-b.o);
 let dirs:Dir[]=[];
 for(const e of events){
  if('w' in e){dirs=dirs.filter(x=>!(x.sourceLab===e.w.sourceLab&&x.id===e.w.directionId));continue;}
  if('j' in e){
   // Whole JOB snapshot: status/default are current facts; createdVia is NOT replayed.
   const r=e.j,s=r.snapshot;
   dirs=dirs.filter(x=>x.sourceLab!=='job');
   dirs.push(...s.directions.filter(x=>x.status==='active').map(x=>({
    id:x.directionId,name:x.content.title,sourceLab:'job' as const,handoffId:jobHandoffId(s),version:x.version,
    interests:x.content.interests.map(i=>i.text),strengths:x.content.strengths.map(i=>i.text),
    directions:x.content.directions.map(i=>i.text),stage:r.stage,isDefault:s.defaultDirectionId===x.directionId
   })));
   continue;
  }
  const p=e.h.payload,x:Dir={...p.direction,sourceLab:p.sourceLab,handoffId:p.handoffId,version:p.version,interests:p.interests,strengths:p.strengths,directions:p.direction.name.trim()?[p.direction.name]:[],stage:p.stage,support:p.support};
  const same=dirs.findIndex(y=>y.id===x.id&&y.sourceLab===x.sourceLab);
  if(p.directionChange==='switch')dirs=[...dirs.filter(y=>y.sourceLab!==p.sourceLab),x];
  else if(same>=0)dirs[same]=x;
  else if(p.directionChange==='add'||!dirs.some(y=>y.sourceLab===x.sourceLab))dirs.push(x);
 }
 return dirs;
}
/** Withdrawn directions get no new suggestions and no AI transmission. Past cards keep their original handoff version. */
export const aiTransmissionAllowed=(d:LabDaily,sourceLab:string,directionId:string)=>activeDirections(d).some(x=>x.sourceLab===sourceLab&&x.id===directionId);
/** Deep, key-ordered serialisation. (A JSON.stringify key-array replacer would silently drop nested keys.) */
const fp=(a:LabDailyAction)=>{const {requestId:_r,...rest}=a as any;return stable(rest);};
const hash=(s:string)=>[...s].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
/** Returns true when the request id is a verified duplicate (no-op). */
function seen(d:LabDaily,a:LabDailyAction,day:string){
 const old=d.requests[a.requestId];
 if(old){if(old.fp!==fp(a)||old.kind!==a.type.slice(9))throw new PolicyError('requestConflict');return true;}
 d.requests[a.requestId]={day,kind:a.type.slice(9) as never,fp:fp(a)};return false;
}
export function receive(d:LabDaily,a:Extract<LabDailyAction,{type:'labdaily.receive'}>,at:string,ctx:{stage:string;verifiedYouth?:YouthServerContext}){
 const day=dayKey(at,d.account.timeZone);
 // JOB JSON can be inspected but never promoted by a browser action to trusted state.
 if(isJobCandidate(a.payload)){
  const r=inspectJobSnapshot(a.payload);
  throw new PolicyError(r.status==='invalid'?'invalidHandoff':'jobPending');
 }
 if(sourceOf(a.payload)!=='youth-career')throw new PolicyError(sourceOf(a.payload)==='job'?'jobPending':'invalidHandoff');
 const r=externalSchema.safeParse(a.payload);if(!r.success)throw new PolicyError('invalidHandoff');
 const e=r.data;let h:Handoff;
 // A valid file is kept losslessly, but no real activation/accepted receipt without
 // verified server-owned context. demo is an explicit review-only simulation.
 if(!a.demo&&!ctx.verifiedYouth){
  const same=d.pendingYouth?.find(x=>x.handoff.requestId===e.requestId);
  if(same&&stable(same.handoff)!==stable(e))throw new PolicyError('requestConflict');
  if(seen(d,{...a,payload:e},day))return;
  if(!same)(d.pendingYouth??=[]).push({handoff:e,receivedAt:at,status:'connection_pending'});
  return;
 }
 if(ctx.verifiedYouth&&!youthContextValid(d,e,ctx.verifiedYouth,at))throw new PolicyError('notConnected');
 const trustedStage=ctx.verifiedYouth?.current.stage??ctx.stage;
 // educationStage from the sender is cross-checked against the trusted account stage; 'unspecified' is never guessed, the account stage is used.
 const es=e.direction.educationStage;
 if(es&&es!=='unspecified'&&es!==trustedStage)throw new PolicyError('stageMismatch');
 try{h=toInternal(e,trustedStage);}catch{throw new PolicyError('invalidHandoff');}
 if(a.demo)h.productSample=true;
 // Pending inspection can later be verified under the same request/action id.
 // The persisted handoff below, not just a pending request fingerprint, proves
 // whether an accepted review projection already exists.
 seen(d,{...a,payload:e},day);
 const same=d.handoffs.filter(x=>x.payload.handoffId===h.handoffId);
 if(same.length){if(same.some(x=>x.contract&&stable(x.contract)===stable(e)&&(!ctx.verifiedYouth||x.serverOrder===ctx.verifiedYouth.verified.serverOrder)))return;throw new PolicyError('staleHandoff');}
 const mine=d.handoffs.filter(x=>x.payload.sourceLab===h.sourceLab);
 const last=mine.at(-1)?.payload;
 if(ctx.verifiedYouth){
  const order=mine.at(-1)?.serverOrder??0;
  if(ctx.verifiedYouth.verified.serverOrder<=order)throw new PolicyError('staleHandoff');
 }
 if(last&&Date.parse(h.confirmedAt)<=Date.parse(last.confirmedAt))throw new PolicyError('staleHandoff');
 if(mine.some(x=>x.payload.direction.id===h.direction.id&&x.payload.version>=h.version))throw new PolicyError('staleHandoff');
 const dirs=activeDirections(d);
 if(h.directionChange==='add'&&dirs.length>=5&&!dirs.some(x=>x.id===h.direction.id&&x.sourceLab===h.sourceLab))throw new PolicyError('directionConflict');
 d.handoffs.push({payload:h,receivedAt:at,virtual:true,contract:e,ack:buildAck(e,at),...(ctx.verifiedYouth?{serverOrder:ctx.verifiedYouth.verified.serverOrder}:{})});
 if(ctx.verifiedYouth)d.youthReviewScope=ctx.verifiedYouth.current.scopeKey;
 if(d.pendingYouth)d.pendingYouth=d.pendingYouth.filter(x=>x.handoff.requestId!==e.requestId);
}
export function withdraw(d:LabDaily,a:Extract<LabDailyAction,{type:'labdaily.withdraw'}>,at:string){
 const day=dayKey(at,d.account.timeZone);
 if(seen(d,a,day))return;
 if(!activeDirections(d).some(x=>x.sourceLab===a.sourceLab&&x.id===a.directionId))throw new PolicyError('directionConflict');
 (d.withdrawals??=[]).push({requestId:a.requestId,sourceLab:a.sourceLab,directionId:a.directionId,at});
}
const isStale=(d:LabDaily,p:Proposal)=>!activeDirections(d).some(x=>x.id===p.directionId&&x.handoffId===p.handoffId&&x.version===p.handoffVersion&&(!p.sourceLab||x.sourceLab===p.sourceLab));
export const activeProposals=(d:LabDaily,day:string)=>(d.days[day]?.proposals??[]).filter(p=>p.status!=='replaced');
export const recommendationDirections=(d:LabDaily)=>activeDirections(d).filter(x=>x.name.trim()&&[...x.interests,...(x.directions??[]),...x.strengths].some(t=>!!t.trim()));
/** Template choice never exhausts: only templates currently on screen (or accepted) are excluded; replaced ones may return, least-recently-offered first. */
function build(d:LabDaily,day:string,slot:number,keep?:{id:string;handoffId:string}):Proposal{
 const dirs=recommendationDirections(d);if(!dirs.length)throw new PolicyError('none');
 const dir=dirs.find(x=>x.id===keep?.id&&x.handoffId===keep?.handoffId)??(slot===0?dirs.find(x=>x.isDefault):undefined)??dirs[(slot+hash(day))%dirs.length];
 const all=d.days[day]?.proposals??[],live=new Set(all.filter(p=>p.status!=='replaced').map(p=>p.templateId));
 const start=hash(day+dir.handoffId),rot=(t:string)=>(TEMPLATES.indexOf(t as never)-start%TEMPLATES.length+TEMPLATES.length)%TEMPLATES.length;
 const last=(t:string)=>all.reduce((m,p,i)=>p.templateId===t?i:m,-1);
 const cands=TEMPLATES.filter(t=>!live.has(t)).sort((a,b)=>last(a)-last(b)||rot(a)-rot(b));
 if(!cands.length)throw new PolicyError('noMore');
 // An interest-only, strength-only or direction-only JOB is valid. Select a real
 // confirmed term for the exercise; NEVER create a missing strength or interest.
 const interests=dir.interests.filter(t=>!!t.trim()),directions=dir.directions?.filter(t=>!!t.trim())??[],strengths=dir.strengths.filter(t=>!!t.trim()),
 contextKind=interests.length?'interests':directions.length?'directions':'strengths',
 terms=contextKind==='interests'?interests:contextKind==='directions'?directions:strengths;
 if(!terms.length)throw new PolicyError('none');
 const templateId=cands[0],interest=terms[(slot+hash(day))%terms.length];
 return {id:`p-${day}-${slot}-${templateId}-${all.length}`,slot,templateId,interest,contextKind,sourceLab:dir.sourceLab,directionId:dir.id,directionName:dir.name,handoffId:dir.handoffId,handoffVersion:dir.version,minutes:templateId==='mixed'?10:templateId==='observe'||templateId==='compare'?5:7,status:'offered'};
}
export function propose(d:LabDaily,a:Extract<LabDailyAction,{type:'labdaily.propose'}>,at:string){
 const day=dayKey(at,d.account.timeZone);
 if(seen(d,a,day))return;
 if(!recommendationDirections(d).length)throw new PolicyError('none');
 const rec=d.days[day]??={extra:0,proposals:[]};
 // Unaccepted proposals made stale by a newer handoff are refreshed; accepted ones keep their original context.
 const stale=rec.proposals.filter(p=>p.status==='offered'&&isStale(d,p));
 for(const p of stale)p.status='replaced';
 const slots=Array.from({length:rec.extra+1},(_,i)=>i);
 for(const s of slots){
  if(rec.proposals.some(p=>p.slot===s&&p.status!=='replaced'))continue;
  rec.proposals.push(build(d,day,s));
 }
 // Re-running propose never creates a second first offer: delete the request key only via a new id.
}
export function more(d:LabDaily,a:Extract<LabDailyAction,{type:'labdaily.more'}>,at:string){
 const day=dayKey(at,d.account.timeZone);
 if(seen(d,a,day))return;
 const rec=d.days[day];
 if(!rec||!rec.proposals.some(p=>p.slot===0&&p.status!=='replaced'))throw new PolicyError('needFirst');
 // One more suggestion per request, at most two more per day; each request is user-initiated.
 if(rec.extra>=2)throw new PolicyError('noMore');
 const next=build(d,day,rec.extra+1);rec.extra+=1;rec.proposals.push(next);
}
export function replace(d:LabDaily,a:Extract<LabDailyAction,{type:'labdaily.replace'}>,at:string){
 const day=dayKey(at,d.account.timeZone);
 if(seen(d,a,day))return;
 const rec=d.days[day],p=rec?.proposals.find(x=>x.id===a.proposalId);
 if(!rec||!p||p.status!=='offered')throw new PolicyError('expired');
 if(isStale(d,p))throw new PolicyError('expired');
 const next=build(d,day,p.slot,{id:p.directionId,handoffId:p.handoffId}); // may throw noMore; nothing is mutated before this
 p.status='replaced';rec.proposals.push(next);
}
export const acceptedCount=(d:LabDaily,day:string)=>(d.days[day]?.proposals??[]).filter(p=>p.status==='accepted').length;
export const slotLimit=(d:LabDaily,day:string)=>1+(d.days[day]?.extra??0);
/** Validates an accept and marks the proposal. Returns the proposal to create a card for, or null for a verified duplicate. */
export function accept(d:LabDaily,a:Extract<LabDailyAction,{type:'labdaily.accept'}>,at:string):Proposal|null{
 const day=dayKey(at,d.account.timeZone);
 const dup=!!d.requests[a.requestId];
 if(dup){seen(d,a,day);return null;}
 const rec=d.days[day],p=rec?.proposals.find(x=>x.id===a.proposalId);
 if(!rec||!p)throw new PolicyError('expired');
 if(p.status==='accepted'){return null;} // resume of the same card: no second deduction, no second card
 if(p.status!=='offered'||isStale(d,p))throw new PolicyError('expired');
 if(!a.question.trim()||!a.scope.trim())throw new PolicyError('emptyField');
 if(!Number.isInteger(a.minutes)||a.minutes<5||a.minutes>10)throw new PolicyError('badMinutes');
 if(acceptedCount(d,day)>=slotLimit(d,day)||acceptedCount(d,day)>=DAILY_LIMIT)throw new PolicyError('limit');
 seen(d,a,day);p.status='accepted';return p;
}
/** Structural invariants shared by validation and tests. */
export function checkInvariants(d:LabDaily,cardExists:(id:string)=>boolean){
 let order=0;const requests=new Set<string>();
 for(const r of d.jobSnapshots??[]){
  if(!d.jobReviewScope||r.serverOrder<=order||requests.has(r.snapshot.requestId))throw new PolicyError('invalid');
  order=r.serverOrder;requests.add(r.snapshot.requestId);
 }
 for(const [day,rec] of Object.entries(d.days)){
  const ids=rec.proposals.map(p=>p.id);if(new Set(ids).size!==ids.length)throw new PolicyError('invalid');
  const acc=rec.proposals.filter(p=>p.status==='accepted');
  if(acc.length>DAILY_LIMIT||acc.length>1+rec.extra)throw new PolicyError('invalid');
  for(const s of [0,1,2])if(rec.proposals.filter(p=>p.slot===s&&p.status!=='replaced').length>1)throw new PolicyError('invalid');
  if(rec.proposals.some(p=>p.slot>rec.extra))throw new PolicyError('invalid');
  for(const p of acc){const c=p.cardId?d.cards[p.cardId]:undefined;if(!p.cardId||!c||c.proposalId!==p.id||c.day!==day||!cardExists(p.cardId))throw new PolicyError('invalid');}
  for(const p of rec.proposals)if(p.status!=='accepted'&&p.cardId)throw new PolicyError('invalid');
 }
 for(const [cid,c] of Object.entries(d.cards)){
  const p=d.days[c.day]?.proposals.find(x=>x.id===c.proposalId);
  if(!p||p.status!=='accepted'||p.cardId!==cid||!cardExists(cid))throw new PolicyError('invalid');
 }
}
