import type {PersonalState} from '../studio/model';
import {routeFor,student} from '../studio/domain';
import {localeOf,isLocale} from '../studio/i18n/config';
import type {PracticeAction,PracticeAttachment,Recommendation} from './model';
import {VERSION} from './model';
import {templates,ageDesign} from './catalog';
import {text} from './i18n';
import {validateAssessment} from '../official/adaptive/engine';
export function recommendations(s:PersonalState):Recommendation[]{
 const p=student(s),r=routeFor(p);
 if(!ageDesign[p.stage]||p.stage.startsWith('elementary')&&s.mode!=='review')return [];
 const basis=p.assessment&&r.creditAllowed&&p.assessment.educationStage===p.stage?'result':'general';
 const target=basis==='result'?r.target:'integrated';
 // No new cut points, sort orders or score interpretation. Existing core owns rotation.
 const officialHelp=basis==='result'?routeFor({...p,supportChoice:'official'}).support:'universal';
 const help=p.supportChoice==='official'?officialHelp:p.supportChoice;
 return templates.filter(t=>t.target===target).map(t=>({id:t.id,stage:p.stage,target,help,officialHelp,basis,minutes:ageDesign[p.stage].minutes,version:VERSION}));
}
export const practiceAttachment=(s:PersonalState,id:string):PracticeAttachment|undefined=>s.studio?.practice?.attachments[id];
export function practiceStats(s:PersonalState,id:string,month?:string){
 const a=practiceAttachment(s,id),runs=student(s).runs.filter(r=>r.cardId===id&&r.phase==='closed'&&(!month||(s.entries.find(e=>e.runId===r.id)?.localDate??r.startedAt.slice(0,10)).startsWith(month)));
 const last=new Map(a?.reports.map(r=>[r.runId,r])??[]);
 const reports=runs.map(r=>last.get(r.id)).filter(Boolean);
 return {uses:runs.length,responses:reports.length,yes:reports.filter(r=>r!.value==='yes').length,neutral:reports.filter(r=>r!.value==='neutral').length,no:reports.filter(r=>r!.value==='no').length,unanswered:runs.length-reports.length};
}
export function requireRecommendation(s:PersonalState,id:string,stage:string){
 const found=recommendations(s).find(r=>r.id===id&&r.stage===stage);
 if(!found)throw Error(text(localeOf(s),'unavailable'));
 return found;
}
export function applyPractice(s:PersonalState,a:Exclude<PracticeAction,{type:'practice.add'}>,at:string){
 const d=s.studio!;
 d.practice??={views:[],attachments:{}};
 if(a.type==='practice.view'){
  const r=requireRecommendation(s,a.templateId,a.stage);
  d.practice.views.push({templateId:r.id,stage:r.stage,at});
  d.practice.views=d.practice.views.slice(-2000);
 }else{
  const record=d.practice.attachments[a.cardId],run=student(s).runs.filter(r=>r.cardId===a.cardId&&r.phase==='closed').at(-1);
  if(!record||!run||!['yes','neutral','no'].includes(a.value))throw Error(text(localeOf(s),'responseAfterRun'));
  const old=record.reports.at(-1);
  if(old?.runId===run.id&&old.value===a.value)return;
  record.reports.push({at,runId:run.id,value:a.value});
 }
}
export function validatePractice(s:PersonalState){
 for(const [id,a] of Object.entries(s.studio?.practice?.attachments??{})){
  const p=student(s);
  if(id!==a.taskId||!p.cards.some(c=>c.id===id)||!isLocale(a.creationLocale)||!templates.some(t=>t.id===a.templateId&&t.target===a.target))throw Error(text(localeOf(s),'invalidBackup'));
  if(a.basis==='result'){
   const source=validateAssessment(a.source);
   if(source.educationStage!==a.stage||routeFor({...p,assessment:source,officialType:undefined,round:a.roundAtSelection,supportChoice:'official'}).target!==a.target)throw Error(text(localeOf(s),'invalidBackup'));
  }else if(a.source!==null)throw Error(text(localeOf(s),'invalidBackup'));
  for(const response of a.reports)if(!p.runs.some(r=>r.id===response.runId&&r.cardId===id&&r.phase==='closed'))throw Error(text(localeOf(s),'invalidBackup'));
 }
}
