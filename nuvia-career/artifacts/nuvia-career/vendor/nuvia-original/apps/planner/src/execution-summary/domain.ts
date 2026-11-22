import type {PersonalState} from '../studio/model';
import {student,localDate,monthOf} from '../studio/domain';
import {localeOf} from '../studio/i18n/config';
import {fieldsSchema,blankSummary,validSummaryLink,type SummaryAction,type ExecutionSummary,type SummaryRef} from './model';
import {summaryText} from './i18n';
import {contextOf} from '../planner-library/domain';
export const sameSummary=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function runDate(s:PersonalState,id:string){const r=student(s).runs.find(r=>r.id===id);return s.entries.find(e=>e.runId===id)?.localDate??(r?localDate(new Date(r.startedAt)):'');}
export function summaryReady(x?:ExecutionSummary){return !!x?.saved&&validSummaryLink(x.saved.fields.link)&&x.saved.fields.selfConfirmed&&x.saved.fields.kind!=='unspecified'&&!!(x.saved.fields.action.trim()||x.saved.fields.result.trim())&&sameSummary(x.draft,x.saved.fields);}
export function summaryRefsReady(s:PersonalState,refs?:SummaryRef[]){return (refs??[]).every(ref=>{const x=s.studio?.summaries?.[ref.runId];return summaryReady(x)&&x!.saved!.version===ref.version;});}
export function applySummary(s:PersonalState,a:SummaryAction,at:string){
 const d=s.studio!,t=(k:string)=>summaryText(localeOf(s),k);
 if(a.type==='summary.cite'){
  const exp=d.experiences.find(e=>e.id===a.experienceId),src=exp&&d.sources[exp.sourceId];
  if(!exp||!src?.available||new Set(a.runIds).size!==a.runIds.length||a.runIds.length>100)throw Error(t('missing'));
  const refs=a.runIds.map(runId=>{
   const x=d.summaries?.[runId];
   if(!summaryReady(x)||x!.cardId!==src.cardId||monthOf(runDate(s,runId))!==src.month)throw Error(t('citeBlocked'));
   return {runId,version:x!.saved!.version};
  });
  if(sameSummary(exp.summaryRefs??[],refs))return;
  exp.summaryRefs=refs;exp.confirmed=false;exp.selected=false;exp.updatedAt=at;return;
 }
 const r=student(s).runs.find(r=>r.id===a.runId);
 if(!r||r.phase!=='closed'||!student(s).cards.some(c=>c.id===r.cardId))throw Error(t('missing'));
 d.summaries??={};
 let x=d.summaries[r.id];
 if(a.type==='summary.draft'){
  const fields=fieldsSchema.parse(a.fields);
  if(fields.kind==='actual'&&contextOf(s,r.cardId)==='simulation')throw Error(t('citeBlocked'));
  // Changed content never inherits an old fact confirmation.
  if(x&&fields.selfConfirmed&&sameSummary({...fields,selfConfirmed:false},{...x.draft,selfConfirmed:false})===false)fields.selfConfirmed=false;
  if(x){if(!sameSummary(x.draft,fields)){x.draft=fields;x.draftAt=at;}}
  else d.summaries[r.id]={runId:r.id,cardId:r.cardId,workspaceId:s.workspaceId,studentId:s.studentId,createdAt:at,draftAt:at,draft:fields,history:[]};
  return;
 }
 if(!x){x={runId:r.id,cardId:r.cardId,workspaceId:s.workspaceId,studentId:s.studentId,createdAt:at,draftAt:at,draft:blankSummary(r.flag),history:[]};}
 if(!x.draft.action.trim()&&!x.draft.result.trim())throw Error(t('required'));
 if(!validSummaryLink(x.draft.link))throw Error(t('invalidLink'));
 if(x.saved&&sameSummary(x.draft,x.saved.fields))return;
 if(x.history.length>=2000)throw Error(t('saveFailed'));
 x.saved={version:(x.saved?.version??0)+1,at,fields:structuredClone(x.draft)};x.history.push(structuredClone(x.saved));
 const latest=student(s).runs.filter(run=>run.cardId===r.cardId).at(-1);
 if(latest?.id===r.id&&s.meta[r.cardId])s.meta[r.cardId].nextPosition=x.draft.next;
}
// Reuse the existing translated backup error. noticeFromText stores its key,
// so a validation notice also follows later language changes.
export const SUMMARY_BACKUP_ERROR='JSON 백업이 손상되었습니다.';
export function validateSummaries(s:PersonalState){
 const d=s.studio;if(!d)return;
 for(const [key,x] of Object.entries(d.summaries??{})){
  const r=student(s).runs.find(r=>r.id===key);
  if(key!==x.runId||x.workspaceId!==s.workspaceId||x.studentId!==s.studentId||!r||r.phase!=='closed'||r.cardId!==x.cardId||!student(s).cards.some(c=>c.id===x.cardId))throw Error(SUMMARY_BACKUP_ERROR);
  if(x.history.some((v,i)=>v.version!==i+1||!validSummaryLink(v.fields.link)||!v.fields.action.trim()&&!v.fields.result.trim())||!!x.saved!==!!x.history.length||x.saved&&!sameSummary(x.saved,x.history.at(-1)))throw Error(SUMMARY_BACKUP_ERROR);
 }
 for(const e of d.experiences){
  if(new Set((e.summaryRefs??[]).map(ref=>ref.runId)).size!==(e.summaryRefs??[]).length)throw Error(SUMMARY_BACKUP_ERROR);
  for(const ref of e.summaryRefs??[]){
  const x=d.summaries?.[ref.runId],src=d.sources[e.sourceId];
  if(!x?.saved||!src||x.cardId!==src.cardId||ref.version>x.saved.version)throw Error(SUMMARY_BACKUP_ERROR);
  }
 }
 for(const line of d.draft?.sentences??[])if(line.summaryRef){
  const ref=line.summaryRef,x=d.summaries?.[ref.runId],src=d.sources[line.sourceId];
  if(!x?.saved||!src||x.cardId!==src.cardId||ref.version>x.saved.version||!['action','result'].includes(line.field))throw Error(SUMMARY_BACKUP_ERROR);
 }
 for(const src of Object.values(d.sources))for(const snapshot of [src.initial,src.snapshot])for(const ref of snapshot.summaryVersions??[]){
  const x=d.summaries?.[ref.runId];if(!x?.saved||x.cardId!==src.cardId||ref.version>x.saved.version)throw Error(SUMMARY_BACKUP_ERROR);
 }
}
