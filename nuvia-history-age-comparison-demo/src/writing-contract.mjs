import {createRun,event} from './contracts.mjs';
import {initializeReview,changePlan,reviewComplete,hasText} from './reconsideration.mjs';
export const WRITING_VERSION='nuvia.history.teen-writing.demo.v1';
export const WRITING_KEY='nuviaHistory.teenWritingDemo.v1';
export const AGES=['middle-school','high-school'];
export const STAGES=['actual','condition','prediction','path','story','historyComparison','predictionComparison','book'];
export const predictionFields=r=>r.ageBand==='high-school'?['direct','longTerm','basis','unknown']:['direct','reason'];
export const storyFields=r=>r.ageBand==='high-school'?['process','ending','fact','assumption','text']:['process','ending','text'];
export function newWriting(age,now=Date.now()){
 if(!AGES.includes(age))throw Error('INVALID_AGE');
 const r=initializeReview(createRun('planning',now,age));
 return {...r,writingVersion:WRITING_VERSION,resultId:r.resultId.replace('planning-review-v1:','teen-writing-v1:'),contentVersion:WRITING_VERSION,
 conditionConfirmed:false,predictionDraft:{direct:'',reason:'',longTerm:'',basis:'',unknown:''},predictionIndex:0,
 storyIndex:0,story:{text:'',process:'',ending:'',fact:'',assumption:'',drawing:null,saved:false},
 comparisonDrafts:{history:{difference:'',reason:''},prediction:{difference:'',reason:''}},comparisonIndex:0,bookPage:0};
}
export function predictionComplete(r){return r.conditionConfirmed&&predictionFields(r).every(k=>hasText(r.predictionDraft[k]));}
export function commitWrittenPrediction(r){
 if(r.prediction?.lockedAt)return {...r,step:'path'};
 if(!predictionComplete(r))throw Error('PREDICTION_REQUIRED');
 const d=structuredClone(r.predictionDraft);
 return event({...r,step:'path',prediction:{predictionId:`${r.attemptId}:prediction`,attemptId:r.attemptId,conditionId:r.conditionId,contentVersion:r.contentVersion,
 direct:{text:d.direct},longTerm:r.ageBand==='high-school'?{text:d.longTerm}:null,expression:d,authorType:'learner',lockedAt:new Date().toISOString()}},'prediction.committed');
}
export function actPlan(r,action,value){
 let n=changePlan(r,action,value);
 if(r.planning.completed&&!n.planning.completed&&r.story.saved){
  n={...n,previousStoryVersions:[...(r.previousStoryVersions||[]),{story:r.story,comparisons:r.comparisons,comparisonDrafts:r.comparisonDrafts}],
   story:{...r.story,saved:false},comparisons:{history:{status:'empty'},prediction:{status:'empty'}},comparisonDrafts:{history:{difference:'',reason:''},prediction:{difference:'',reason:''}}};
 }
 return event(n,'planning.action',{action,value});
}
export function storyComplete(r){return reviewComplete(r)&&storyFields(r).every(k=>hasText(r.story[k]));}
export function editStoryField(r,field,value){
 if(!['process','ending','fact','assumption','text','drawing'].includes(field))throw Error('INVALID_STORY_FIELD');
 if(r.story[field]===value)return r;
 const n=structuredClone(r);
 if(n.story.saved){
  n.previousStoryVersions=[...(n.previousStoryVersions||[]),{story:n.story,comparisons:n.comparisons,comparisonDrafts:n.comparisonDrafts}];
  n.story=structuredClone(n.story);
  n.comparisons={history:{status:'empty'},prediction:{status:'empty'}};
  n.comparisonDrafts={history:{difference:'',reason:''},prediction:{difference:'',reason:''}};
 }
 n.story[field]=value;n.story.saved=false;return n;
}
export function saveWrittenStory(r){
 if(!storyComplete(r))throw Error('STORY_OR_ACTION_REQUIRED');
 return event({...r,step:'historyComparison',comparisonIndex:0,story:{...r.story,saved:true,resultId:r.resultId,attemptId:r.attemptId,conditionId:r.conditionId,authorType:'learner',contentVersion:r.contentVersion}},'story.saved');
}
export function comparisonComplete(r,kind){const d=r.comparisonDrafts[kind];return hasText(d.difference)&&hasText(d.reason);}
export function saveWrittenComparison(r,kind,deferred=false){
 if(!['history','prediction'].includes(kind)||!r.story.saved||!reviewComplete(r))throw Error('INVALID_COMPARISON_CONTEXT');
 if(!deferred&&!comparisonComplete(r,kind))throw Error('COMPARISON_REQUIRED');
 const old=r.comparisons[kind];
 const record=deferred&&old.status==='recorded'?old:{status:deferred?'deferred':'recorded',comparisonKind:kind,resultId:r.resultId,attemptId:r.attemptId,conditionId:r.conditionId,contentVersion:r.contentVersion,
 eventId:`${r.resultId}:${kind}:${r.events.length}`,authorType:'learner',...structuredClone(r.comparisonDrafts[kind]),savedAt:new Date().toISOString()};
 return event({...r,comparisons:{...r.comparisons,[kind]:record},comparisonIndex:0,bookPage:kind==='history'?6:7,step:kind==='history'?'predictionComparison':'book'},deferred?'comparison.deferred':'comparison.recorded',{kind,eventId:record.eventId});
}
export function bookStatus(r){return ['history','prediction'].every(k=>r.comparisons[k].status==='recorded')?'assembled':'pendingComparison';}
export function validateWriting(r){
 if(r.writingVersion!==WRITING_VERSION||r.runMode!=='demo'||!r.resultId?.startsWith('demo:teen-writing-v1:')||!AGES.includes(r.ageBand)||r.locale!=='ko'||r.conditionId!=='gutenberg.c2'||r.missionId!=='gutenberg'||r.path!=='planning'||!STAGES.includes(r.step))throw Error('INVALID_WRITING_RECORD');
 if(STAGES.indexOf(r.step)>=3&&(!r.prediction?.lockedAt||r.prediction.conditionId!==r.conditionId||r.prediction.attemptId!==r.attemptId))throw Error('INVALID_PREDICTION_CONTEXT');
 if(STAGES.indexOf(r.step)>=4&&!reviewComplete(r))throw Error('REQUIRED_ACTION_MISSING');
 if(STAGES.indexOf(r.step)>=5&&!r.story.saved)throw Error('STORY_REQUIRED');
 if(!Number.isInteger(r.predictionIndex)||r.predictionIndex<0||r.predictionIndex>=predictionFields(r).length||!Number.isInteger(r.storyIndex)||r.storyIndex<0||r.storyIndex>=storyFields(r).length||![0,1].includes(r.comparisonIndex)||!Number.isInteger(r.bookPage)||r.bookPage<0||r.bookPage>7)throw Error('INVALID_PAGE_INDEX');
 return true;
}
