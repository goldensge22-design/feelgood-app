import {assertRun,condition,orderedActivityFirst} from './engine';
import {isComparison,type ComparisonValue} from './types';
import {need} from './contracts';
import {missing,recorded,type Field,type Run,type Expression,type ActionInput} from './types';
export const BOOK_ROLES=['cover','actualHistory','changedCondition','initialPrediction','alternateHistory','learnerStory','historyComparison','predictionComparison'] as const;
export interface BookPage {comparisonKind?:'history'|'prediction';comparisonEventId?:string;comparisonRecordRef?:string;number:number;role:typeof BOOK_ROLES[number];kind:'cover'|'fact'|'assumption'|'prediction'|'fiction'|'creation'|'comparison';text:Field<string>;expression?:Field<ComparisonValue>;previews:string[];}
function expressionText(field:Field<ComparisonValue>):Field<string>{
 if(field.status!=='recorded')return missing(field.status);
 const v=field.value;if(isComparison(v))return v.expressionMode==='deferred'?missing('notProvided'):recorded(v.discoveryText);
 return v.method==='skip'||v.method==='unknown'?missing('notProvided'):recorded(v.text);
}
export function authoredStory(r:Run):Field<Expression>{return r.story.status==='recorded'&&['choice','unknown','skip'].includes(r.story.value.method)?missing('notProvided'):structuredClone(r.story);}
export function bookModel(r:Run){
 if(orderedActivityFirst(r))need(r.stage==='complete','ARTIFACTS_REQUIRE_COMPLETION');
 assertRun(r);const c=condition(r);const t=(key:string)=>{need(Object.hasOwn(r.localeSnapshot,key),'SNAPSHOT_TRANSLATION_MISSING');return r.localeSnapshot[key];};
 const prediction:Field<Expression>=r.prediction.status==='recorded'?recorded(r.prediction.value.expression):missing(r.prediction.status);
 const previews=r.canvas.status==='recorded'?r.canvas.value.scenes.map(s=>s.preview).filter(Boolean):[];
 const pages:BookPage[]=[
  {number:1,role:'cover',kind:'cover',text:recorded(t(r.contentSnapshot.titleKey)),previews:[]},
  {number:2,role:'actualHistory',kind:'fact',text:recorded(t(c.actualHistoryKey)),previews:[]},
  {number:3,role:'changedCondition',kind:'assumption',text:recorded(t(c.conditionKey)),previews:[]},
  {number:4,role:'initialPrediction',kind:'prediction',text:expressionText(prediction),expression:prediction,previews:[]},
  {number:5,role:'alternateHistory',kind:'fiction',text:r.alternate.status==='recorded'?recorded(t(c.alternateKeys[r.alternate.value==='A'?0:1])):missing(r.alternate.status),previews:[]},
  {number:6,role:'learnerStory',kind:'creation',text:expressionText(authoredStory(r)),expression:authoredStory(r),previews},
  {number:7,role:'historyComparison',kind:'comparison',text:expressionText(r.historyComparison),expression:structuredClone(r.historyComparison),previews:[]},
  {number:8,role:'predictionComparison',kind:'comparison',text:expressionText(r.predictionComparison),expression:structuredClone(r.predictionComparison),previews:[]},
 ];
 for(const [index,kind,field] of [[6,'history','historyComparison'],[7,'prediction','predictionComparison']] as const){const e=r.events.find(e=>e.eventType==='comparisonCompleted'&&e.payload.comparisonKind===kind);pages[index].comparisonKind=kind;pages[index].comparisonEventId=e?.eventId;pages[index].comparisonRecordRef=r.resultId+'/'+field;}
 return {resultId:r.resultId,missionId:r.missionId,conditionId:r.conditionId,missionVersion:r.missionVersion,contentVersion:r.contentVersion,kind:'missionBook' as const,templateId:'nuvia.book.mission-8page.v1',cover:r.cover,pages,sourceIds:[...c.sourceIds],monthlyCompilation:false};
}
function reportAction(action:ActionInput){switch(action.actionKind){case 'mapRelation':return {actionKind:action.actionKind,nodeIds:action.nodeIds,relationId:action.relationId,meaningKey:action.meaningKey};case 'classifyEvidence':return {actionKind:action.actionKind,evidenceItemIds:action.evidenceItemIds,categoryByItem:action.categoryByItem,uncertainItemIds:action.uncertainItemIds,reasonRef:action.reasonRef};default:return structuredClone(action);}}
function predictionField(r:Run):Field<Expression>{return r.prediction.status==='recorded'?recorded(r.prediction.value.expression):missing(r.prediction.status);}
export function reportModel(r:Run){
 assertRun(r);const c=condition(r),book=bookModel(r);
 const actionEvents=r.events.filter(e=>e.eventType==='cognitiveActionRecorded'&&e.conditionId===c.id&&e.payload.source==='learner');
 const observed=r.action.status==='recorded'&&actionEvents.length>0;
 const requested=r.events.filter(e=>e.eventType==='hintRequested');
 const hintCounts=new Map<string,number>();for(const e of requested){const type=String(e.payload.hintType);hintCounts.set(type,(hintCounts.get(type)??0)+1);}
 const common={resultId:r.resultId,missionId:r.missionId,conditionId:c.id,missionVersion:r.missionVersion,contentVersion:r.contentVersion};
 return {...common,titleKey:'report.singleMission',alias:r.profile.alias,createdAt:r.createdAt,completedAt:r.completedAt,completed:r.stage==='complete',durationMs:r.completedAt?recorded(Date.parse(r.completedAt)-Date.parse(r.createdAt)):missing<number>('notRecorded'),
  together:{actualHistory:r.localeSnapshot[c.actualHistoryKey],changedCondition:r.localeSnapshot[c.conditionKey],initialPrediction:structuredClone(r.prediction),story:authoredStory(r),historyComparison:structuredClone(r.historyComparison),predictionComparison:structuredClone(r.predictionComparison),thoughts:observed?[r.localeSnapshot['thought.'+c.passDomain]]:[],preview:book.pages[5].previews.slice(0,1)},
  details:{...(c.activity.reasonExpressionRuleId?{reason:r.reasonExpressions?.[0]??null,reasonStatus:r.reasonExpressions?.length?'recorded':r.events.some(e=>e.eventType==='activityDeferred'&&e.payload.scope==='reason')?'deferred':r.action.status==='notProvided'?'activityDeferred':'notRecorded'}:{}),observations:observed&&r.action.status==='recorded'?[{eventId:actionEvents[actionEvents.length-1].eventId,description:c.activity.reasonExpressionRuleId?undefined:r.localeSnapshot[c.activity.observationKey],input:reportAction(r.action.value)}]:[],observationStatus:observed?'recorded':r.action.status==='notProvided'?'notProvided':'notObserved',hintCount:requested.length,hints:requested.map(e=>({type:e.payload.hintType,level:e.supportLevel,count:e.payload.requestCount,stage:e.payload.requestedAtStage,eventId:e.eventId})),automaticSupports:r.events.filter(e=>e.eventType==='supportApplied').map(e=>({type:e.payload.support,level:e.supportLevel})),choiceChanges:r.events.filter(e=>e.eventType==='choiceChanged'&&e.payload.kind==='condition').length,retries:r.events.filter(e=>e.eventType==='activityRetried').length,stickerUse:r.events.filter(e=>e.eventType==='canvasObjectAdded').length,drawingUse:r.events.filter(e=>e.eventType==='drawingAdded').length,expressionModes:[...new Set([predictionField(r),r.story,r.historyComparison,r.predictionComparison,...(r.canvas.status==='recorded'&&r.canvas.value.scenes.some(s=>s.audioRef)?[recorded<Expression>({method:'audio',text:'',audioRef:r.canvas.value.scenes.find(s=>s.audioRef)!.audioRef})]:[])].filter((f):f is {status:'recorded';value:ComparisonValue}=>f.status==='recorded').map(f=>isComparison(f.value)?f.value.expressionMode:f.value.method))],assessmentScores:missing('notCollected')},
  nextSupport: [...hintCounts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,2).map(([type,count])=>({type,count})),
  bookLink:{...common,artifact:'missionBook' as const},cumulativeReportEligible:false,
 };
}
// Explicit read-only legacy boundary: no invented resultId, prediction, age or completed status.
export function unavailableLegacyReport(existingId?:string){return {resultId:existingId??null,initialPrediction:missing(),action:missing('notCollected'),story:missing(),historyComparison:missing(),predictionComparison:missing(),completed:missing(),canCreateBook:false};}
