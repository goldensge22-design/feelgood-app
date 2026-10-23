/** Isolated local review contract. NOT the official D-CAS wire contract. */
import type {Locale} from '../studio/i18n/config';
export const DOMAIN_IDS=['planning','attention','simultaneous','successive'] as const;
export const FIELD_IDS=['context','difficulty','action','adjustment','result','learning'] as const;
export type Field=typeof FIELD_IDS[number];
export type Report={
 schema:'nuvia-career-review-report/v1';id:string;version:string;population:'adult';
 source:{name:string;issuedAt:string;uri:string};synthetic:boolean;
 pass:{id:typeof DOMAIN_IDS[number];score:number;unit:string;level:string;interpretation:string}[];
 occupations:{id:string;rank:number;label:string;source:string}[];
};
export type Ref={id:string;version:string};
export type Choice={kind:'recommended'|'custom';id:string;label:string};
export type Plan={title:string;method:string;criteria:string;evidence:string;choice:Choice;report:Ref|null};
export type Revision={version:number;at:string;plan:Plan};
export type Task={id:string;revisions:Revision[]};
export type Run={id:string;taskId:string;taskVersion:number;phase:'running'|'paused'|'ended';elapsedMs:number;lastAt:number|null;endedAt:string|null};
export type Experience={
 id:string;runId:string;fields:Record<Field,string>;selected:Field[];
 confirmedAt:string|null;ackTaskVersion:number|null;ackReport:Ref|null;
 version:number;history:{version:number;at:string;fields:Record<Field,string>;selected:Field[];ackTaskVersion:number;ackReport:Ref|null}[];
};
export type State={
 schema:'nuvia-career-review/v1';owner:string;locale:Locale;page:'result'|'plan'|'run'|'experience'|'export';
 reports:Report[];activeReport:Ref|null;tasks:Task[];runs:Run[];experiences:Experience[];
 draft:Plan;editingTaskId:string|null;selectedTaskId:string|null;selectedExperienceId:string|null;
};
export type ErrorCode='invalidReport'|'invalidBackup'|'wrongOwner'|'missing'|'required'|'activeRun'|'invalidAction'|'stale'|'storageError';
export class ReviewError extends Error{constructor(public code:ErrorCode){super(code);}}
function fail(code:ErrorCode):never{throw new ReviewError(code);}
const clone=<T,>(x:T):T=>JSON.parse(JSON.stringify(x));
const text=(x:unknown):x is string=>typeof x==='string'&&x.length<=10000;
const nonempty=(x:unknown):x is string=>text(x)&&x.trim().length>0;
export const sameRef=(a:Ref|null,b:Ref|null)=>JSON.stringify(a)===JSON.stringify(b);
export const reportRef=(r:Report):Ref=>({id:r.id,version:r.version});
export const currentPlan=(task:Task)=>task.revisions[task.revisions.length-1];
export const activeReport=(s:State)=>s.reports.find(r=>sameRef(reportRef(r),s.activeReport));
export const blankPlan=():Plan=>({title:'',method:'',criteria:'',evidence:'',choice:{kind:'custom',id:'',label:''},report:null});
export function fresh(owner:string,locale:Locale='ko'):State{
 return {schema:'nuvia-career-review/v1',owner,locale,page:'result',reports:[],activeReport:null,tasks:[],runs:[],experiences:[],draft:blankPlan(),editingTaskId:null,selectedTaskId:null,selectedExperienceId:null};
}
function safeParse(raw:string){
 if(raw.length>2000000)fail('invalidBackup');
 try{return JSON.parse(raw,(key,value)=>{if(['__proto__','constructor','prototype'].includes(key))fail('invalidBackup');return value;});}
 catch(e){if(e instanceof ReviewError)throw e;return fail('invalidBackup');}
}
export function validateReport(value:unknown):Report{
 const r=value as Report;
 if(!r||r.schema!=='nuvia-career-review-report/v1'||!nonempty(r.id)||!nonempty(r.version)||r.population!=='adult'||
 typeof r.synthetic!=='boolean'||!r.source||!nonempty(r.source.name)||!nonempty(r.source.issuedAt)||!text(r.source.uri)||
 !Array.isArray(r.pass)||r.pass.length!==4||!Array.isArray(r.occupations)||r.occupations.length!==5)fail('invalidReport');
 const domains=new Set<string>(),jobs=new Set<string>();
 for(const p of r.pass){
  if(!p||!DOMAIN_IDS.includes(p.id)||domains.has(p.id)||!Number.isFinite(p.score)||!nonempty(p.unit)||!nonempty(p.level)||!nonempty(p.interpretation))fail('invalidReport');
  domains.add(p.id); // No cuts, normalization, re-ranking or score conversion.
 }
 r.occupations.forEach((o,i)=>{
  if(!o||!nonempty(o.id)||jobs.has(o.id)||o.rank!==i+1||!nonempty(o.label)||!nonempty(o.source))fail('invalidReport');
  jobs.add(o.id);
 });
 // Source order and all original properties remain intact.
 return clone(r);
}
export function parseReport(raw:string):Report{
 try{return validateReport(safeParse(raw));}catch{return fail('invalidReport');}
}
export function installReport(s:State,input:Report):State{
 const r=validateReport(input),ref=reportRef(r);
 const previous=s.reports.find(x=>sameRef(reportRef(x),ref));
 if(previous&&JSON.stringify(previous)!==JSON.stringify(r))fail('invalidReport'); // Changed source must have a new version.
 return {...s,reports:previous?s.reports:[...s.reports,r],activeReport:ref,draft:{...s.draft,report:ref}};
}
export function choose(s:State,choice:Choice):State{
 const r=activeReport(s);
 if(choice.kind==='recommended'&&(!r||!r.occupations.some(o=>o.id===choice.id&&o.label===choice.label)))fail('invalidAction');
 return {...s,draft:{...s.draft,choice:clone(choice),report:s.activeReport}};
}
function validPlan(p:Plan,s:State){
 if(!p||![p.title,p.method,p.criteria,p.evidence].every(nonempty)||!p.choice||
 !['recommended','custom'].includes(p.choice.kind)||!text(p.choice.id)||!nonempty(p.choice.label))fail('required');
 if(p.report&&!s.reports.some(r=>sameRef(reportRef(r),p.report)))fail('invalidReport');
 if(p.choice.kind==='recommended'){
  const r=s.reports.find(r=>sameRef(reportRef(r),p.report));
  if(!r?.occupations.some(o=>o.id===p.choice.id&&o.label===p.choice.label))fail('invalidReport');
 }
}
export function savePlan(s:State,id:string,at:string):State{
 validPlan(s.draft,s);
 const task=s.editingTaskId?s.tasks.find(t=>t.id===s.editingTaskId):undefined;
 if(task&&s.runs.some(r=>r.taskId===task.id&&r.phase!=='ended'))fail('activeRun');
 if(task&&JSON.stringify(currentPlan(task).plan)===JSON.stringify(s.draft))return {...s,selectedTaskId:task.id,page:'run'};
 if(!task&&s.tasks.some(t=>t.id===id))return s; // Duplicate command token is idempotent.
 const revision:Revision={version:task?currentPlan(task).version+1:1,at,plan:clone(s.draft)};
 const next:Task=task?{...task,revisions:[...task.revisions,revision]}:{id,revisions:[revision]};
 return {...s,tasks:task?s.tasks.map(t=>t.id===task.id?next:t):[...s.tasks,next],selectedTaskId:next.id,editingTaskId:next.id,page:'run'};
}
export function editTask(s:State,id:string):State{
 const task=s.tasks.find(t=>t.id===id);if(!task)fail('missing');
 return {...s,draft:clone(currentPlan(task).plan),editingTaskId:id,selectedTaskId:id,page:'plan'};
}
export function start(s:State,taskId:string,id:string,now:number):State{
 if(s.runs.some(r=>r.id===id))return s;
 if(s.runs.some(r=>r.phase!=='ended'))fail('activeRun');
 const task=s.tasks.find(t=>t.id===taskId);if(!task)fail('missing');
 return {...s,runs:[...s.runs,{id,taskId,taskVersion:currentPlan(task).version,phase:'running',elapsedMs:0,lastAt:now,endedAt:null}],page:'run',selectedTaskId:taskId};
}
export function clock(s:State,id:string,action:'tick'|'pause'|'resume'|'end',now:number):State{
 const r=s.runs.find(r=>r.id===id);if(!r)fail('missing');
 if(r.phase==='ended')return s;
 if(action==='resume'&&r.phase!=='paused')return s;
 const elapsed=r.elapsedMs+(r.phase==='running'&&r.lastAt!==null?Math.max(0,now-r.lastAt):0);
 const next:Run={...r,elapsedMs:elapsed,phase:action==='end'?'ended':action==='pause'?'paused':action==='resume'?'running':r.phase,
 lastAt:action==='end'||action==='pause'?null:now,endedAt:action==='end'?new Date(now).toISOString():null};
 return {...s,runs:s.runs.map(x=>x.id===id?next:x)};
}
/** Recovery never counts an unobserved offline interval as execution. */
export function recover(s:State):State{
 return {...s,runs:s.runs.map(r=>r.phase==='running'?{...r,phase:'paused',lastAt:null}:r)};
}
export function openExperience(s:State,runId:string,id:string):State{
 const run=s.runs.find(r=>r.id===runId);if(!run||run.phase!=='ended')fail('invalidAction');
 const old=s.experiences.find(e=>e.runId===runId);
 if(old)return {...s,selectedExperienceId:old.id,page:'experience'};
 const e:Experience={id,runId,fields:{context:'',difficulty:'',action:'',adjustment:'',result:'',learning:''},selected:[],confirmedAt:null,ackTaskVersion:null,ackReport:null,version:1,history:[]};
 return {...s,experiences:[...s.experiences,e],selectedExperienceId:id,page:'experience'};
}
export function updateExperience(s:State,id:string,fields:Experience['fields'],selected:Field[]):State{
 if(!s.experiences.some(e=>e.id===id)||!FIELD_IDS.every(k=>text(fields[k]))||selected.some(k=>!FIELD_IDS.includes(k)))fail('invalidAction');
 return {...s,experiences:s.experiences.map(e=>e.id===id?JSON.stringify([e.fields,e.selected])===JSON.stringify([fields,selected])?e:{...e,fields:clone(fields),selected:[...new Set(selected)],confirmedAt:null,version:e.version+1}:e)};
}
export function confirmExperience(s:State,id:string,at:string):State{
 const e=s.experiences.find(e=>e.id===id);if(!e||!e.selected.length||e.selected.some(k=>!nonempty(e.fields[k])))fail('required');
 const run=s.runs.find(r=>r.id===e.runId);const task=s.tasks.find(t=>t.id===run?.taskId);
 if(!run||run.phase!=='ended'||!task)fail('missing');
 if(canExport(s,e))return s;
 const version=e.version+1,ackTaskVersion=currentPlan(task).version,ackReport=clone(s.activeReport);
 return {...s,experiences:s.experiences.map(x=>x.id===id?{...x,version,confirmedAt:at,ackTaskVersion,ackReport,
 history:[...x.history,{version,at,fields:clone(e.fields),selected:[...e.selected],ackTaskVersion,ackReport}]}:x)};
}
export function canExport(s:State,e:Experience):boolean{
 const run=s.runs.find(r=>r.id===e.runId),task=s.tasks.find(t=>t.id===run?.taskId);
 return !!(e.confirmedAt&&run?.phase==='ended'&&task&&run.taskVersion<=currentPlan(task).version&&
 e.ackTaskVersion===currentPlan(task).version&&sameRef(e.ackReport,s.activeReport)&&e.selected.length&&e.selected.every(k=>nonempty(e.fields[k])));
}
export function exportMaterial(s:State,id:string){
 const e=s.experiences.find(e=>e.id===id);if(!e||!canExport(s,e))fail('stale');
 const run=s.runs.find(r=>r.id===e.runId)!,task=s.tasks.find(t=>t.id===run.taskId)!;
 const revision=task.revisions.find(v=>v.version===run.taskVersion)!;
 const report=s.reports.find(r=>sameRef(reportRef(r),revision.plan.report));
 const occupation=report?.occupations.find(o=>o.id===revision.plan.choice.id);
 return {schema:'nuvia-local-experience-material/v1',delivery:'local-file-only',externalVerification:false,experienceVersion:e.version,
  confirmedAt:e.confirmedAt,source:{taskId:task.id,executedTaskVersion:run.taskVersion,acknowledgedTaskVersion:e.ackTaskVersion,
   runId:run.id,endedAt:run.endedAt,originalReport:revision.plan.report,reconfirmedReport:e.ackReport,
   originalReportProvenance:report?{...report.source,synthetic:report.synthetic}:null,
   occupation:revision.plan.choice,originalRecommendation:occupation?{id:occupation.id,rank:occupation.rank,source:occupation.source}:null},
  statements:e.selected.map(field=>({field,text:e.fields[field],basis:{experienceId:e.id,runId:run.id,taskVersion:run.taskVersion},verification:'user-confirmed-only'}))};
}
export function parseBackup(raw:string,owner:string):State{
 try{
  const s=safeParse(raw) as State;
  if(!s||s.schema!=='nuvia-career-review/v1'||!nonempty(s.owner))fail('invalidBackup');
  if(s.owner!==owner)fail('wrongOwner');
  if(!['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'].includes(s.locale)||
   !['result','plan','run','experience','export'].includes(s.page)||![s.reports,s.tasks,s.runs,s.experiences].every(Array.isArray))fail('invalidBackup');
  const reportKeys=new Set<string>(),taskIds=new Set<string>(),runIds=new Set<string>(),experienceIds=new Set<string>(),experienceRuns=new Set<string>();
  for(const report of s.reports){validateReport(report);const key=JSON.stringify(reportRef(report));if(reportKeys.has(key))fail('invalidBackup');reportKeys.add(key);}
  if(s.activeReport&&!s.reports.some(r=>sameRef(reportRef(r),s.activeReport)))fail('invalidBackup');
  for(const task of s.tasks){
   if(!nonempty(task.id)||taskIds.has(task.id)||!Array.isArray(task.revisions)||!task.revisions.length)fail('invalidBackup');taskIds.add(task.id);
   task.revisions.forEach((v,i)=>{if(v.version!==i+1||!nonempty(v.at))fail('invalidBackup');validPlan(v.plan,s);});
  }
  for(const run of s.runs){
   if(!nonempty(run.id)||runIds.has(run.id)||!s.tasks.some(t=>t.id===run.taskId&&t.revisions.some(v=>v.version===run.taskVersion))||
   !['running','paused','ended'].includes(run.phase)||!Number.isFinite(run.elapsedMs)||run.elapsedMs<0||
   (run.phase==='running'?!Number.isFinite(run.lastAt):run.lastAt!==null)||
   (run.phase==='ended'?!nonempty(run.endedAt):run.endedAt!==null))fail('invalidBackup');runIds.add(run.id);
  }
  if(s.runs.filter(r=>r.phase!=='ended').length>1)fail('invalidBackup');
  for(const e of s.experiences){
   if(!nonempty(e.id)||experienceIds.has(e.id)||experienceRuns.has(e.runId)||!s.runs.some(r=>r.id===e.runId&&r.phase==='ended')||
   !e.fields||!FIELD_IDS.every(k=>text(e.fields[k]))||Object.keys(e.fields).some(k=>!FIELD_IDS.includes(k as Field))||
   !Array.isArray(e.selected)||new Set(e.selected).size!==e.selected.length||e.selected.some(k=>!FIELD_IDS.includes(k))||
   (e.confirmedAt!==null&&!nonempty(e.confirmedAt))||(e.ackTaskVersion!==null&&!Number.isInteger(e.ackTaskVersion))||
   (e.ackReport!==null&&!s.reports.some(r=>sameRef(reportRef(r),e.ackReport))))fail('invalidBackup');
   const task=s.tasks.find(t=>t.id===s.runs.find(r=>r.id===e.runId)?.taskId)!;
   if(e.ackTaskVersion!==null&&!task.revisions.some(v=>v.version===e.ackTaskVersion))fail('invalidBackup');
   if(!Number.isInteger(e.version)||e.version<1||!Array.isArray(e.history))fail('invalidBackup');
   let lastVersion=0;
   for(const h of e.history){
    if(!Number.isInteger(h.version)||h.version<=lastVersion||h.version>e.version||!nonempty(h.at)||
     !h.fields||!FIELD_IDS.every(k=>text(h.fields[k]))||!Array.isArray(h.selected)||!h.selected.length||
     h.selected.some(k=>!FIELD_IDS.includes(k)||!nonempty(h.fields[k]))||
     !task.revisions.some(v=>v.version===h.ackTaskVersion)||
     (h.ackReport!==null&&!s.reports.some(r=>sameRef(reportRef(r),h.ackReport))))fail('invalidBackup');
    lastVersion=h.version;
   }
   if(e.confirmedAt!==null){
    const h=e.history[e.history.length-1];
    if(!h||h.version!==e.version||h.at!==e.confirmedAt||h.ackTaskVersion!==e.ackTaskVersion||
     !sameRef(h.ackReport,e.ackReport)||JSON.stringify(h.fields)!==JSON.stringify(e.fields)||
     JSON.stringify(h.selected)!==JSON.stringify(e.selected))fail('invalidBackup');
   }
   experienceIds.add(e.id);experienceRuns.add(e.runId);
  }
  if(!s.draft||![s.draft.title,s.draft.method,s.draft.criteria,s.draft.evidence].every(text)||
   !s.draft.choice||!['custom','recommended'].includes(s.draft.choice.kind)||!text(s.draft.choice.id)||!text(s.draft.choice.label)||
   (s.draft.report&&!s.reports.some(r=>sameRef(reportRef(r),s.draft.report)))||
   (s.selectedTaskId!==null&&!taskIds.has(s.selectedTaskId))||
   (s.editingTaskId!==null&&!taskIds.has(s.editingTaskId))||
   (s.selectedExperienceId!==null&&!experienceIds.has(s.selectedExperienceId)))fail('invalidBackup');
  return recover(clone(s));
 }catch(e){if(e instanceof ReviewError&&e.code==='wrongOwner')throw e;return fail('invalidBackup');}
}
export const STORAGE_KEY='nuvia:studio:career-review:v1';
export const OWNER_KEY='nuvia:studio:career-review:local-owner:v1';
