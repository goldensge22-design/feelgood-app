import originalCards from './catalog/cards.json';
import extraCards from './catalog/expansion/cards.json';
import originalKo from './catalog/locales/ko.json';
import extraKo from './catalog/expansion/locales/ko.json';
import bindings from './catalog/expansion/bindings.json';
import catalog from './catalog/expansion/catalog.json';
import type {PersonalState} from '../studio/model';
import type {Attachment,LibraryAction} from './model';
import {LIBRARY_COMMIT,attachmentSchema} from './model';
import {localeOf} from '../studio/i18n/config';
import {libText} from './i18n';
export const templates=[...originalCards,...extraCards];
export const sourceMessages:Record<string,string>={...originalKo,...extraKo};
export {bindings};
export const sourceVersion=catalog.sourceCommit;
export const sourceJobs=(adult:boolean)=>adult?catalog.adult.jobs:catalog.teen.jobs;
export const lookupBinding=(population:string,sourceId:string,version:string)=>version===sourceVersion?bindings.find(b=>b.population===population&&b.sourceRef.id===sourceId):undefined;
export const templateOf=(id:string)=>templates.find(c=>c.id===id);
export const attachmentOf=(s:PersonalState,id:string)=>s.studio?.libraryAttachments?.[id];
export const contextOf=(s:PersonalState,id:string)=>attachmentOf(s,id)?.kind==='job-simulation'?'simulation':attachmentOf(s,id)?'daily-practice':undefined;
// All catalog entries are draft. Never promote them because a client supplies an approval flag.
export function selectableTemplates(s:PersonalState,bindingId:string,review:boolean){
 if(!review||s.mode!=='review'||localeOf(s)!=='ko')return [];
 const b=bindings.find(b=>b.id===bindingId),adult=s.lab.students[s.studentId].stage==='adult';
 if(!b||b.population!==(adult?'adult':'teen'))return [];
 return [...b.templateIds,...b.dailyTemplateIds].map(templateOf).filter((c):c is NonNullable<typeof c>=>!!c);
}
const fail=(s:PersonalState):never=>{throw Error(libText(localeOf(s),'error'));};
export function applyLibrary(s:PersonalState,a:Exclude<LibraryAction,{type:'library.create'}>,at:string,review:boolean){
 const p=s.lab.students[s.studentId],task=p.cards.find(c=>c.id===a.cardId);
 if(!task||!s.studio||!review||s.mode!=='review')return fail(s);
 const entries=s.studio.libraryAttachments??={};
 if(a.type==='library.attach'){
  const t=selectableTemplates(s,a.bindingId,review).find(t=>t.id===a.templateId);if(!t)return fail(s);
  const old=entries[task.id];
  if(old?.bindingId===a.bindingId&&old.templateId===a.templateId)return;
  if(old||task.status==='done'||p.runs.some(r=>r.cardId===task.id))return fail(s);
  entries[task.id]={schema:'nuvia-library-attachment/v1',taskId:task.id,bindingId:a.bindingId,templateId:t.id,templateVersion:t.version,catalogCommit:LIBRARY_COMMIT,contentLocale:'ko',kind:t.kind as Attachment['kind'],reviewOnly:true,attachedAt:at,answers:['','',''],revision:1,updatedAt:at,confirmedRunId:'',confirmedAt:'',history:[]};
 }else{
  const v=entries[task.id];if(!v||localeOf(s)!=='ko')return fail(s);
  if(a.type==='library.answers'){
   if(a.answers.length!==3||a.answers.some(x=>typeof x!=='string'||x.length>3000))return fail(s);
   if(JSON.stringify(v.answers)===JSON.stringify(a.answers))return;
   v.history.push({at:v.updatedAt,answers:[...v.answers],revision:v.revision});
   v.answers=[...a.answers];v.revision++;v.updatedAt=at;v.confirmedRunId='';v.confirmedAt='';
  }else{
   const run=p.runs.filter(r=>r.cardId===task.id&&r.phase==='closed'&&Date.parse(r.startedAt)>=Date.parse(v.attachedAt)).at(-1);
   if(!run||v.answers.some(x=>!x.trim()))return fail(s);
   if(v.confirmedRunId===run.id)return;
   v.confirmedRunId=run.id;v.confirmedAt=at;
  }
 }
}
export function validateLibrary(s:PersonalState){
 const p=s.lab.students[s.studentId];
 for(const [id,raw]of Object.entries(s.studio?.libraryAttachments??{})){
  const a=attachmentSchema.parse(raw),t=templateOf(a.templateId),b=bindings.find(b=>b.id===a.bindingId);
  if(s.mode!=='review'||id!==a.taskId||!p.cards.some(c=>c.id===id)||!t||!b||t.version!==a.templateVersion||t.kind!==a.kind||![...b.templateIds,...b.dailyTemplateIds].includes(t.id))return fail(s);
  if(b.population!==(p.stage==='adult'?'adult':'teen'))return fail(s);
  if(Date.parse(a.updatedAt)<Date.parse(a.attachedAt)||a.history.length!==a.revision-1||a.history.some((h,i)=>h.revision!==i+1||Date.parse(h.at)>Date.parse(a.updatedAt)||Date.parse(h.at)<Date.parse(i?a.history[i-1].at:a.attachedAt)))return fail(s);
  if(a.confirmedRunId){const r=p.runs.find(r=>r.id===a.confirmedRunId);if(!r||r.cardId!==id||r.phase!=='closed'||Date.parse(r.startedAt)<Date.parse(a.attachedAt)||a.answers.some(x=>!x.trim())||!Number.isFinite(Date.parse(a.confirmedAt))||Date.parse(a.confirmedAt)<Math.max(Date.parse(a.updatedAt),Date.parse(r.startedAt),...r.segments.map(x=>Date.parse(x.end))))return fail(s);}
  else if(a.confirmedAt)return fail(s);
 }
 for(const src of Object.values(s.studio?.sources??{}))if(src.snapshot.practiceContext!==contextOf(s,src.cardId))return fail(s);
}
