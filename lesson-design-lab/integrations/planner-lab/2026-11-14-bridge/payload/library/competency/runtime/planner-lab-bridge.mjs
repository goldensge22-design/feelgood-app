// SERVER ONLY. Uses the existing LAB HTTP contract, not an AI generator.
import {createHash, randomUUID} from 'node:crypto';
export const languages=['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'];
export class BridgeError extends Error {constructor(status,code){super(code);this.status=status;this.code=code;}}
export const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=(status,code)=>{throw new BridgeError(status,code);};
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const keys=(object,allowed)=>{if(!object||Array.isArray(object)||typeof object!=='object'||Object.keys(object).some(k=>!allowed.includes(k)))fail(400,'invalid_input');};
const text=(s,max=20000)=>typeof s==='string'&&s.length<=max;
const answerFields=['priority','decision','reason','uncertainty','beforeReply','tradeoff','changeDecision','actions','result','jobConnection','learning','feeling','memo'];
export function publicCard(row){
 const c=row.raw.content;
 // Allowlist: changeCondition, rubric, sourceScenario, evaluator metadata never leave the server here.
 return {id:row.id,version:row.version,language:row.language,jobId:row.jobId,profileId:row.raw.profileId,
  title:c.title,minutes:c.minutes,materials:c.materials.map(m=>({title:m.title,body:m.body})),alternatives:c.alternatives,steps:c.steps,
  artifact:c.artifact,safety:c.safety,sourceUses:Array.isArray(c.sourceUses)?c.sourceUses.map(s=>({evidenceId:s.evidenceId,quote:s.quote,application:s.application})):[],
  kind:row.raw.kind,educationalSimulation:true,selected:false,scheduled:false};
}
/** All dependencies run in the trusted central server. Browser identity/scope is never accepted.
 * loadContext returns OWNED original jobs with explicitly verified registered profile mappings.
 * labRequest must bind the same principal to LAB using the application's existing SSO credential.
 */
export function createPlannerLabBridge({store,loadContext,labRequest,assertCurrent,registeredProfileIds,clock=()=>Date.now()}){
 const profiles=new Set(registeredProfileIds);
 async function context(p){
  if(!p?.subject||!p.sessionId)fail(401,'login_required');
  const [owned,session]=await Promise.all([loadContext(p),labRequest(p,'GET','/api/lab/session')]);
  if(!session?.signedIn)fail(401,'lab_login_required');
  // LAB already defaults a genuinely new login to personal-workspace. A revoked
  // camp must NOT silently become personal: return access error, allow explicit switch in LAB.
  if(!session.hasAccess||!session.camp?.id)fail(403,'lab_scope_unavailable');
  const jobs=(owned?.jobs??[]).filter(j=>j.verifiedMapping===true&&profiles.has(j.profileId));
  const result={owner:p.subject,scopeId:session.camp.id,scopeRevision:session.camp.revision,
   jobs:jobs.map(j=>({id:j.id,label:j.label,rank:j.rank??null,source:j.source,profileId:j.profileId})),
   report:owned?.report??null,unmapped:(owned?.jobs??[]).length-jobs.length};
  return result;
 }
 async function current(p,c){
  await assertCurrent(p);
  const latest=await context(p);
  if(latest.owner!==c.owner||latest.scopeId!==c.scopeId||latest.scopeRevision!==c.scopeRevision)fail(409,'context_changed');
  return latest;
 }
 async function recommendations(p,input){
  keys(input,['requestId','jobId','language','mode','kind','difficulty','retryFailed']);
  if(!text(input.requestId,120)||input.requestId.length<8||!text(input.jobId,200)||!languages.includes(input.language)||!['daily','extra'].includes(input.mode))fail(400,'invalid_input');
  if(input.kind&&!['work','strategy','reflection'].includes(input.kind))fail(400,'invalid_kind');
  if(input.difficulty&&!['foundation','extended'].includes(input.difficulty))fail(400,'invalid_difficulty');
  if(input.retryFailed!==undefined&&typeof input.retryFailed!=='boolean')fail(400,'invalid_retry');
  const c=await context(p),job=c.jobs.find(j=>j.id===input.jobId);
  if(!job)fail(422,'job_mapping_required');
  const config={jobId:job.id,profileId:job.profileId,language:input.language,mode:input.mode,kind:input.kind??'work',difficulty:input.difficulty??'foundation'};
  const requestKey=hash([p.subject,c.scopeId,input.requestId]);
  await store.checkRequest(requestKey,hash(config));
  const headers={'x-lab-camp':c.scopeId}; // Resolved scope ID, NEVER a student-entered camp code.
  const response=await labRequest(p,'POST','/api/lab/daily',{
   requestId:input.requestId,profileIds:[job.profileId],language:input.language,mode:input.mode,
   count:input.mode==='daily'?3:1,...(input.mode==='extra'?{kind:config.kind,difficulty:config.difficulty}:{}),retryFailed:!!input.retryFailed,
  },headers);
  const latest=await current(p,c);
  if(!latest.jobs.some(j=>j.id===job.id&&j.profileId===job.profileId))fail(409,'job_mapping_changed');
  if(!Array.isArray(response?.cards))fail(502,'invalid_lab_response');
  const cards=[],unavailable=[];
  for(const raw of response.cards){
   if(raw.profileId!==job.profileId||raw.language!==input.language)fail(502,'lab_context_mismatch');
   if(raw.aiStatus!=='verified_ai'||!raw.content){unavailable.push({id:raw.id,status:raw.aiStatus??'unavailable'});continue;}
   const v=raw.content;
   if(!text(raw.id,200)||!raw.id||!text(v.title,500)||!Number.isInteger(v.minutes)||v.minutes<1||v.minutes>240||
    !Array.isArray(v.materials)||v.materials.length<2||!v.materials.every(m=>text(m.title,500)&&text(m.body))||
    !Array.isArray(v.alternatives)||v.alternatives.length<2||!v.alternatives.every(a=>text(a))||
    !Array.isArray(v.steps)||!v.steps.every(s=>text(s))||!text(v.artifact)||!text(v.safety)||!text(v.changeCondition))fail(502,'invalid_lab_card');
   const row={id:raw.id,version:hash([raw.inputHash??null,raw.libraryVersion??response.version??null,raw.language,raw.content]),
    owner:p.subject,scopeId:c.scopeId,jobId:job.id,job:structuredClone(job),language:input.language,raw:structuredClone(raw),day:response.day??day()};
   cards.push(row);
  }
  await store.saveCards(cards);
  return {status:cards.length?'ready':unavailable.length?'provider_unavailable':'empty',cards:cards.map(publicCard),unavailable,day:response.day??day(),scopeId:c.scopeId};
 }
 async function select(p,input){
  keys(input,['cardId','version','requestId','consent']);
  if(!text(input.cardId,200)||!input.cardId||!text(input.version,200)||!input.version)fail(400,'invalid_card_reference');
  if(input.consent!==true)fail(400,'consent_required');
  if(!text(input.requestId,120)||input.requestId.length<8)fail(400,'invalid_request');
  const c=await context(p),row=await store.card(p.subject,c.scopeId,input.cardId,input.version);
  if(!row)fail(404,'owned_card_not_found');
  const previous=await store.activityForCard(p.subject,c.scopeId,row.id,row.version);
  if(previous)return activityView(previous);
  // Preserve the LAB approval too. Its waiting_connection receipt alone is NOT registration.
  await labRequest(p,'POST',`/api/lab/daily/${encodeURIComponent(row.id)}/select`,{consent:true},{'x-lab-camp':c.scopeId});
  await current(p,c);
  const activity=await store.register({id:randomUUID(),owner:p.subject,scopeId:c.scopeId,card:row,
   sourceContract:'lab-daily-selection/1.0',state:'planned',revision:0,answers:{},startedAt:null,deadline:null,
   registeredAt:new Date(clock()).toISOString(),requestId:input.requestId,educationalSimulation:true});
  return activityView(activity);
 }
 function activityView(a){
  const reveal=!!a.startedAt&&clock()>=a.startedAt+a.card.raw.content.minutes*30000;
  return {id:a.id,card:publicCard(a.card),job:a.card.job,state:a.state,revision:a.revision,answers:a.answers,
   registeredAt:a.registeredAt,startedAt:a.startedAt,deadline:a.deadline,serverNow:clock(),
   change:reveal?{text:a.card.raw.content.changeCondition}:null,
   educationalSimulation:true,savedToServer:true,openPath:`/planner?labActivity=${encodeURIComponent(a.id)}`};
 }
 async function activity(p,id){const c=await context(p),a=await store.activity(p.subject,c.scopeId,id);if(!a)fail(404,'activity_not_found');return activityView(a);}
 async function list(p){const c=await context(p);return {activities:(await store.list(p.subject,c.scopeId)).map(activityView)};}
 async function save(p,id,input){
  keys(input,['revision','answers','start']);
  if(!Number.isInteger(input.revision)||input.revision<0)fail(400,'revision_required');
  keys(input.answers,answerFields);
  if(!Object.values(input.answers).every(a=>text(a)))fail(400,'invalid_answers');
  if(input.start!==undefined&&typeof input.start!=='boolean')fail(400,'invalid_start');
  const c=await context(p),a=await store.activity(p.subject,c.scopeId,id);if(!a)fail(404,'activity_not_found');
  if(a.revision!==input.revision)fail(409,'answer_revision_conflict');
  const now=clock();
  if(input.start&&a.startedAt===null){a.startedAt=now;a.deadline=now+a.card.raw.content.minutes*60000;a.state='in_progress';}
  if(input.answers.changeDecision&&(!a.startedAt||now<a.startedAt+a.card.raw.content.minutes*30000))fail(409,'change_not_released');
  a.answers=input.answers;a.revision++;a.savedAt=new Date(now).toISOString();
  await current(p,c);
  await store.update(a,input.revision);
  return activityView(a);
 }
 return {context,recommendations,select,activity,list,save};
}
