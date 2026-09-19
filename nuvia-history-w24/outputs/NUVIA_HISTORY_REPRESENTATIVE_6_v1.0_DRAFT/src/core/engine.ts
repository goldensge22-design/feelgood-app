import {recorded,missing,STAGES,productionDependencies,type Run,type ContentBundle,type Profile,type Dependencies,type EventType,type ConditionDefinition,type Expression,type CanvasArtifact,type ArtifactLink} from './types';
import {isComparison,type ComparisonRecord,type ComparisonValue,type ReasonInput,type ReasonExpressionRecord} from './types';
import {need,validateAction} from './contracts';
import {resolveProfile,presentation} from './profile';
export const APP_VERSION='0.5.0';
export const orderedActivityFirst=(r:Run)=>r.contentSnapshot.executionOrderRuleId==='NUVIA_HISTORY_EXECUTION_ORDER_RULE_v1.1.1';
export const canonicalStage=(stage:Run['stage'])=>({history:'conditionUnderstanding',condition:'conditionUnderstanding',prediction:'prediction',activity:'coreActivity',alternate:'alternateResult',creation:'learnerStory',historyComparison:'historyComparison',predictionComparison:'predictionComparison',complete:'artifactLink'}[stage]);
export const freeReason=(r:Run)=>!!r.conditionId&&condition(r).activity.reasonExpressionRuleId==='NUVIA_HISTORY_REASON_EXPRESSION_RULE_v1.1.2';
const actionEvents=(r:Run)=>r.events.filter(e=>e.eventType==='cognitiveActionRecorded'||e.eventType==='activityDeferred'&&e.payload.scope!=='reason');
const activityCommitted=(r:Run)=>actionEvents(r).length>0;
export type Command=
 |{type:'historyViewed';conditionId:string}
 |{type:'continueHistory'}
 |{type:'selectCondition';conditionId:string}
 |{type:'prediction';expression:Expression}
 |{type:'reveal';possibility:'A'|'B'}
 |{type:'action';value:unknown;reason?:ReasonInput}
 |{type:'deferAction';reason:'unknown'|'skip'}
 |{type:'story';expression:Expression}
 |{type:'comparison';kind:'history'|'prediction';comparison:ComparisonRecord}
 |{type:'comparison';kind:'history'|'prediction';expression:Expression}
 |{type:'hint';hintType:'pictureExample'|'repeatGuide'|'reducedChoices'|'sequenceHelp'|'keyElement'|'canvasHelp'|'visualGuide';level:0|1|2|3}
 |{type:'canvas';canvas:CanvasArtifact;events:{type:'canvasObjectAdded'|'canvasObjectMoved'|'drawingAdded'|'sceneCompleted';payload:Record<string,unknown>}[]}
 |{type:'cover';cover:Run['cover']}
 |{type:'retryActivity'};
export function newRun(bundle:ContentBundle,missionId:string,input:Profile,deps:Dependencies=productionDependencies):Run {
 const mission=bundle.missions.find(m=>m.id===missionId);need(mission,'MISSION_NOT_FOUND');const profile=resolveProfile(input),at=deps.now();
 const run:Run={schemaVersion:1,revision:0,resultId:deps.id(),missionId,missionVersion:mission.missionVersion,contentVersion:mission.contentVersion,appVersion:APP_VERSION,profile,ageBandRuleId:`nuvia.age.${profile.ageBand}.v1`,createdAt:at,completedAt:null,stage:'history',conditionId:null,prediction:missing(),alternate:missing(),action:missing(),story:missing(),historyComparison:missing(),predictionComparison:missing(),canvas:missing(),cover:'antique',events:[],contentSnapshot:structuredClone(mission),localeSnapshot:missionStrings(bundle,missionId)};
 append(run,'missionStarted',{profileSource:profile.source},deps,at,0);return run;
}
function missionStrings(bundle:ContentBundle,id:string){const result:Record<string,string>={};for(const [k,v] of Object.entries(bundle.strings))if(k.startsWith(id+'.')||k.startsWith('missing.')||k.startsWith('thought.'))result[k]=v;return result;}
function append(r:Run,eventType:EventType,payload:Record<string,unknown>,deps:Dependencies,at=deps.now(),supportLevel=0){
 const canonical=canonicalStage(r.stage),sourceCondition=payload.viewedConditionId??payload.conditionId??r.conditionId;
 const question=r.contentSnapshot.conditions.find(c=>c.id===sourceCondition)?.semantic?.stages[r.profile.ageBand][canonical];
 r.events.push({eventId:deps.id(),resultId:r.resultId,missionId:r.missionId,conditionId:r.conditionId,missionVersion:r.missionVersion,contentVersion:r.contentVersion,ageBandRuleId:r.ageBandRuleId,ageBand:r.profile.ageBand,eventType,timestamp:at,payload:structuredClone({...payload,...(orderedActivityFirst(r)?{canonicalStage:canonical,...(question?{questionId:question.semanticFields.questionId}:{})}:{})}),supportLevel,appVersion:r.appVersion});
}
export function condition(r:Run):ConditionDefinition {const c=r.contentSnapshot.conditions.find(c=>c.id===r.conditionId);need(c,'CONDITION_REQUIRED');return c;}
export function artifactLink(r:Run):ArtifactLink {need(r.conditionId,'CONDITION_REQUIRED');return {resultId:r.resultId,missionId:r.missionId,conditionId:r.conditionId,missionVersion:r.missionVersion,contentVersion:r.contentVersion,learnerId:r.profile.learnerId};}
export function assertLink(r:Run,link:ArtifactLink){for(const [k,v] of Object.entries(artifactLink(r)))need(link[k as keyof ArtifactLink]===v,'RESULT_LINK_ERROR');}
export function validateExpression(e:Expression){
 need(e&&typeof e==='object','EXPRESSION_REQUIRED');need(['choice','text','audio','drawing','unknown','skip'].includes(e.method),'EXPRESSION_METHOD');need(typeof e.text==='string','EXPRESSION_TEXT');
 if(e.method==='unknown'||e.method==='skip'){need(e.text==='','EMPTY_DEFERRED_EXPRESSION');return;}
 if(e.method==='text')need(e.text.trim(),'EMPTY_EXPRESSION');
 if(e.method==='choice')need(e.choiceId&&e.text.trim(),'EMPTY_CHOICE');
 if(e.method==='audio')need(e.audioRef&&e.audioRef.startsWith('local-audio:'),'LOCAL_AUDIO_REQUIRED');
 if(e.method==='drawing')need(e.canvasRef,'CANVAS_REQUIRED');
}
export function validateReasonInput(raw:unknown){
 const input=raw as ReasonInput;
 need(input&&typeof input==='object','REASON_INPUT_REQUIRED');
 const fields:Record<string,string[]>={typed:['source','reasonText'],recorded:['source','voiceRef'],drawn:['source','drawingRef'],deferred:['source']};
 need(Object.hasOwn(fields,input.source)&&Object.keys(input).every(k=>fields[input.source].includes(k)),'REASON_INPUT_FIELDS');
 if(input.source==='typed')need(typeof input.reasonText==='string'&&input.reasonText.trim().length>0,'EMPTY_REASON');
 if(input.source==='recorded')need(typeof input.voiceRef==='string'&&input.voiceRef.startsWith('local-audio:'),'LOCAL_AUDIO_REQUIRED');
 if(input.source==='drawn')need(typeof input.drawingRef==='string'&&input.drawingRef.startsWith('drawing:'),'LOCAL_DRAWING_REQUIRED');
}
function assertReason(r:Run){
 const records=r.reasonExpressions??[],actions=actionEvents(r),events=r.events.filter(e=>e.eventType==='reasonExpressionRecorded'||e.eventType==='activityDeferred'&&e.payload.scope==='reason');
 if(r.action.status!=='recorded'){need(records.length===0&&events.length===0,'UNEXPECTED_REASON');return;}
 need(actions.length===1&&actions[0].eventType==='cognitiveActionRecorded'&&events.length===1,'REASON_EVENT_REQUIRED');
 for(const [k,v] of Object.entries(r.action.value))need(JSON.stringify(actions[0].payload[k])===JSON.stringify(v),'ACTION_EVENT_MISMATCH');
 const a=actions[0],e=events[0],qid=condition(r).semantic?.subquestions[r.profile.ageBand].reason?.semanticFields.questionId;
 need(e.payload.actionEventId===a.eventId&&e.payload.reasonQuestionId===qid&&r.events.indexOf(e)>r.events.indexOf(a),'REASON_PROVENANCE');
 const reveal=r.events.findIndex(x=>x.eventType==='alternateViewed');if(reveal>=0)need(r.events.indexOf(e)<reveal,'REASON_ORDER');
 if(e.eventType==='activityDeferred'){
  need(e.payload.source==='deferred'&&!('reasonRef' in r.action.value)&&records.length===0,'DEFERRED_REASON_EMPTY');
  need(Object.keys(e.payload).every(k=>['scope','actionEventId','reasonQuestionId','source','canonicalStage','questionId'].includes(k)),'DEFERRED_REASON_FIELDS');
  return;
 }
 need(records.length===1,'REASON_RECORD_REQUIRED');const v=records[0];
 need('reasonRef' in r.action.value&&r.action.value.reasonRef===v.reasonRef&&e.payload.reasonRef===v.reasonRef&&v.reasonRef.startsWith('reason:'),'REASON_REF_MISMATCH');
 for(const k of ['resultId','missionId','conditionId','missionVersion','contentVersion'] as const)need(v[k]===r[k],'REASON_LINK_ERROR');
 need(v.actionEventId===a.eventId&&v.reasonQuestionId===qid&&e.payload.source===v.source&&!Number.isNaN(Date.parse(v.createdAt)),'REASON_PROVENANCE');
 const {reasonRef,resultId,missionId,conditionId:cid,missionVersion,contentVersion,actionEventId,reasonQuestionId,createdAt,...input}=v;
 validateReasonInput(input);need(e.payload.hasText===(v.source==='typed')&&e.payload.voiceRef===v.voiceRef&&e.payload.drawingRef===v.drawingRef,'REASON_EVENT_MISMATCH');
 need(Object.keys(e.payload).every(k=>['reasonRef','actionEventId','reasonQuestionId','source','hasText','voiceRef','drawingRef','canonicalStage','questionId'].includes(k)),'REASON_EVENT_FIELDS');
 // A reason has its own input provenance. It cannot silently reuse prediction/story/comparison media.
 for(const f of [r.prediction.status==='recorded'?recorded(r.prediction.value.expression):missing<Expression>(),r.story,r.historyComparison,r.predictionComparison])if(f.status==='recorded'){
  const x=f.value,refs=isComparison(x)?[x.voiceRef,x.drawingRef]:['audioRef' in x?x.audioRef:undefined,'canvasRef' in x?x.canvasRef:undefined];
  need(!v.voiceRef||!refs.includes(v.voiceRef),'REASON_MEDIA_REUSED');need(!v.drawingRef||!refs.includes(v.drawingRef),'REASON_MEDIA_REUSED');
 }
}
const exprMeta=(e:Expression)=>({method:e.method,hasText:!!e.text,provided:e.method!=='unknown'&&e.method!=='skip'});
export function transition(previous:Run,command:Command,deps:Dependencies=productionDependencies):Run {
 assertRun(previous);need(previous.stage!=='complete','COMPLETED_RESULT_IMMUTABLE');const r=structuredClone(previous);r.revision++;
 const stage=(s:Run['stage'])=>need(r.stage===s,'INVALID_STAGE');
 switch(command.type){
 case 'historyViewed':stage('history');need(r.contentSnapshot.conditions.some(c=>c.id===command.conditionId),'CONDITION_NOT_FOUND');append(r,'historyViewed',{viewedConditionId:command.conditionId},deps);break;
 case 'continueHistory':stage('history');need(r.contentSnapshot.conditions.every(c=>r.events.some(e=>e.eventType==='historyViewed'&&e.payload.viewedConditionId===c.id)),'HISTORY_NOT_VIEWED');r.stage='condition';break;
 case 'selectCondition':need(r.stage==='condition'||r.stage==='prediction','INVALID_STAGE');need(r.prediction.status!=='recorded','PREDICTION_IMMUTABLE');need(r.contentSnapshot.conditions.some(c=>c.id===command.conditionId),'CONDITION_NOT_FOUND');append(r,r.conditionId?'choiceChanged':'conditionSelected',{kind:'condition',conditionId:command.conditionId,previousConditionId:r.conditionId},deps);r.conditionId=command.conditionId;r.events[r.events.length-1].conditionId=command.conditionId;r.stage='prediction';for(const support of presentation(condition(r),r.profile).automaticSupport)append(r,'supportApplied',{support,automatic:true},deps,undefined,r.profile.attentionSupport);break;
 case 'prediction':{stage('prediction');need(r.prediction.status!=='recorded','PREDICTION_IMMUTABLE');const c=condition(r),expression=command.expression;validateExpression(expression);if(c.semantic&&expression.method==='choice')need(c.semantic.predictionOptions.some(o=>o.id===expression.choiceId&&r.localeSnapshot[o.textKey]===expression.text),'PREDICTION_CHOICE_MISMATCH');const at=deps.now();r.prediction=recorded({expression:structuredClone(expression),recordedAt:at});append(r,'predictionRecorded',exprMeta(expression),deps,at);r.stage=orderedActivityFirst(r)?'activity':'alternate';break;}
 case 'reveal':stage('alternate');if(orderedActivityFirst(r))need(activityCommitted(r),'ACTIVITY_BEFORE_REVEAL');need(r.prediction.status==='recorded','PREDICTION_REQUIRED');need(['A','B'].includes(command.possibility),'POSSIBILITY_REQUIRED');r.alternate=recorded(command.possibility);append(r,'alternateViewed',{possibility:command.possibility,kind:'fiction',causalLevel:3},deps);r.stage=orderedActivityFirst(r)?'creation':'activity';break;
 case 'action':{stage('activity');need(!activityCommitted(r),'ACTION_IMMUTABLE');const c=condition(r);let input=command.value,reasonRecord:ReasonExpressionRecord|undefined;const qid=String(c.semantic?.subquestions[r.profile.ageBand].reason?.semanticFields.questionId??'');if(freeReason(r)){need(command.reason,'REASON_INPUT_REQUIRED');need(input&&typeof input==='object'&&!('reasonRef' in input),'REASON_REF_NOT_CLIENT_ASSIGNED');validateReasonInput(command.reason);if(command.reason.source!=='deferred'){const link=artifactLink(r);reasonRecord={reasonRef:'reason:'+deps.id(),resultId:link.resultId,missionId:link.missionId,conditionId:link.conditionId,missionVersion:link.missionVersion,contentVersion:link.contentVersion,actionEventId:'',reasonQuestionId:qid,...command.reason,createdAt:deps.now()};input={...input,reasonRef:reasonRecord.reasonRef};}}const value=validateAction(c.activity,input);r.action=recorded(value);append(r,'cognitiveActionRecorded',{...value,activityId:c.activity.id,materialSetId:c.activity.materialSetId,interactionContractId:c.activity.contractId,source:'learner',...(c.semantic?{inputQuestionIds:Object.values(c.semantic.subquestions[r.profile.ageBand]).map(q=>q.semanticFields.questionId)}:{})},deps);if(freeReason(r)){const actionEventId=r.events.at(-1)!.eventId;if(reasonRecord){reasonRecord.actionEventId=actionEventId;r.reasonExpressions=[reasonRecord];append(r,'reasonExpressionRecorded',{reasonRef:reasonRecord.reasonRef,actionEventId,reasonQuestionId:qid,source:reasonRecord.source,hasText:reasonRecord.source==='typed',...(reasonRecord.voiceRef?{voiceRef:reasonRecord.voiceRef}:{}),...(reasonRecord.drawingRef?{drawingRef:reasonRecord.drawingRef}:{})},deps);}else append(r,'activityDeferred',{scope:'reason',actionEventId,reasonQuestionId:qid,source:'deferred'},deps);}r.stage=orderedActivityFirst(r)?'alternate':'creation';break;}
 case 'deferAction':stage('activity');need(!activityCommitted(r),'ACTION_IMMUTABLE');need(['unknown','skip'].includes(command.reason),'INVALID_DEFER');r.action=missing('notProvided');append(r,'activityDeferred',{reason:command.reason,...(freeReason(r)?{scope:'activity'}:{})},deps);r.stage=orderedActivityFirst(r)?'alternate':'creation';break;
 case 'retryActivity':stage('activity');append(r,'activityRetried',{},deps);break;
 case 'canvas':{stage('creation');validateCanvas(r,command.canvas);r.canvas=recorded(structuredClone(command.canvas));for(const e of command.events){validateCanvasEvent(e,command.canvas);append(r,e.type,e.payload,deps);}break;}
 case 'story':stage('creation');validateExpression(command.expression);if(condition(r).learnerStoryOnly)need(command.expression.method!=='choice','STORY_REQUIRES_LEARNER_INPUT');if(command.expression.method==='drawing')need(command.expression.canvasRef?.startsWith('drawing:')||(r.canvas.status==='recorded'&&r.canvas.value.completed&&command.expression.canvasRef===r.canvas.value.id),'CANVAS_REQUIRED');r.story=recorded(structuredClone(command.expression));append(r,'storyRecorded',exprMeta(command.expression),deps);r.stage='historyComparison';break;
 case 'comparison':{stage(command.kind==='history'?'historyComparison':'predictionComparison');const value='comparison' in command?command.comparison:comparisonFromExpression(r,command.kind,command.expression);validateComparison(r,value,command.kind);assertIndependentComparisonMedia(r,value);if(command.kind==='prediction')need(r.prediction.status==='recorded','PREDICTION_REQUIRED');r[command.kind==='history'?'historyComparison':'predictionComparison']=recorded(structuredClone(value));append(r,'comparisonCompleted',{comparisonKind:command.kind,...(condition(r).learnerStoryOnly?{recordRef:r.resultId+'/'+(command.kind==='history'?'historyComparison':'predictionComparison'),inputStage:r.stage}:{}),expressionMode:value.expressionMode,provided:value.expressionMode!=='deferred',hasDiscovery:!!value.discoveryText,hasEvidence:!!value.evidenceText},deps);if(command.kind==='history')r.stage='predictionComparison';else{r.stage='complete';r.completedAt=deps.now();append(r,'missionCompleted',{},deps,r.completedAt);}break;}
 case 'hint':need(['pictureExample','repeatGuide','reducedChoices','sequenceHelp','keyElement','canvasHelp','visualGuide'].includes(command.hintType)&&[0,1,2,3].includes(command.level),'INVALID_HINT');append(r,'hintRequested',{hintType:command.hintType,requestedAtStage:r.stage,requestCount:r.events.filter(e=>e.eventType==='hintRequested').length+1,automatic:false},deps,undefined,command.level);break;
 case 'cover':need(['antique','linen','adventure'].includes(command.cover),'INVALID_COVER');r.cover=command.cover;break;
 }
 assertRun(r);return r;
}
function validateCanvasEvent(e:{type:string;payload:Record<string,unknown>},canvas:CanvasArtifact){
 const allowed:Record<string,string[]>={canvasObjectAdded:['sceneId','stickerId'],canvasObjectMoved:['sceneId','stickerId','x','y'],drawingAdded:['sceneId','lineCount','tool','width'],sceneCompleted:['sceneId','stickerCount','lineCount']};
 need(Object.hasOwn(allowed,e.type)&&Object.keys(e.payload).every(k=>allowed[e.type].includes(k)),'CANVAS_EVENT_FIELDS');need(canvas.scenes.some(s=>s.id===e.payload.sceneId),'SCENE_NOT_FOUND');
}
export function validateCanvas(r:Run,c:CanvasArtifact){assertLink(r,c);need(typeof c.id==='string'&&c.id.length>0&&Array.isArray(c.scenes)&&c.scenes.length>=1&&c.scenes.length<=3,'INVALID_CANVAS');const ids=new Set();for(const s of c.scenes){assertLink(r,s);need(!ids.has(s.id),'DUPLICATE_SCENE');ids.add(s.id);need(new Set(s.stickers.map(x=>x.id)).size===s.stickers.length,'DUPLICATE_STICKER');for(const v of s.stickers)need([v.x,v.y,v.scale].every(Number.isFinite)&&v.scale>0,'INVALID_PLACEMENT');need(s.preview===''||s.preview.startsWith('data:image/png;base64,'),'LOCAL_PREVIEW_REQUIRED');}}
export function assertRun(r:Run){
 need(r&&r.schemaVersion===1&&Number.isInteger(r.revision)&&r.revision>=0,'INVALID_RUN');need(STAGES.includes(r.stage),'INVALID_STAGE');resolveProfile(r.profile);
 need(r.contentSnapshot.id===r.missionId&&r.contentSnapshot.missionVersion===r.missionVersion&&r.contentSnapshot.contentVersion===r.contentVersion,'CONTENT_VERSION_MISMATCH');need(r.ageBandRuleId===`nuvia.age.${r.profile.ageBand}.v1`,'AGE_RULE_MISMATCH');need(!Number.isNaN(Date.parse(r.createdAt)),'INVALID_TIME');
 need(typeof r.resultId==='string'&&r.resultId.length>0,'RESULT_ID_REQUIRED');
 if(r.conditionId)condition(r);
 for(const field of [r.prediction,r.alternate,r.action,r.story,r.canvas,r.historyComparison,r.predictionComparison])need(field&&['recorded','notRecorded','notObserved','notCollected','notProvided'].includes(field.status),'INVALID_FIELD_STATUS');
 if(r.story.status==='recorded')validateExpression(r.story.value);
 for(const [kind,field] of [['history',r.historyComparison],['prediction',r.predictionComparison]] as const)if(field.status==='recorded'){if(isComparison(field.value))validateComparison(r,field.value,kind);else validateExpression(field.value);}
 if(r.prediction.status==='recorded')validateExpression(r.prediction.value.expression);
 const ids=new Set();for(const e of r.events){need(!ids.has(e.eventId),'DUPLICATE_EVENT');ids.add(e.eventId);need(e.resultId===r.resultId&&e.missionId===r.missionId&&e.missionVersion===r.missionVersion&&e.contentVersion===r.contentVersion&&e.ageBandRuleId===r.ageBandRuleId,'RESULT_LINK_ERROR');need(!e.conditionId||r.contentSnapshot.conditions.some(c=>c.id===e.conditionId),'EVENT_CONDITION_MISMATCH');}
 if(STAGES.indexOf(r.stage)>=3)need(r.prediction.status==='recorded','PREDICTION_REQUIRED');
 if((orderedActivityFirst(r)?STAGES.indexOf(r.stage)>=5:STAGES.indexOf(r.stage)>=4))need(r.alternate.status==='recorded'&&['A','B'].includes(r.alternate.value),'ALTERNATE_REQUIRED');
 if((orderedActivityFirst(r)?r.stage==='alternate'||STAGES.indexOf(r.stage)>=5:STAGES.indexOf(r.stage)>=5))need(r.action.status==='recorded'||r.action.status==='notProvided','ACTION_RECORD_REQUIRED');
 if(STAGES.indexOf(r.stage)>=6)need(r.story.status==='recorded','STORY_REQUIRED');
 if(STAGES.indexOf(r.stage)>=7)need(r.historyComparison.status==='recorded','HISTORY_COMPARISON_REQUIRED');
 const predictions=r.events.filter(e=>e.eventType==='predictionRecorded'),revealIndex=r.events.findIndex(e=>e.eventType==='alternateViewed');
 need(predictions.length<=1,'PREDICTION_IMMUTABLE');if(r.prediction.status==='recorded'){need(predictions.length===1&&predictions[0].timestamp===r.prediction.value.recordedAt,'PREDICTION_EVENT_MISMATCH');if(revealIndex>=0)need(r.events.findIndex(e=>e.eventType==='predictionRecorded')<revealIndex,'PREDICTION_ORDER');}
 if(orderedActivityFirst(r)){
  const conditionEvents=['predictionRecorded','cognitiveActionRecorded','activityDeferred','reasonExpressionRecorded','alternateViewed','storyRecorded','comparisonCompleted','canvasObjectAdded','canvasObjectMoved','drawingAdded','sceneCompleted'];
  for(const e of r.events.filter(e=>conditionEvents.includes(e.eventType)))need(e.conditionId===r.conditionId,'EVENT_CONDITION_MISMATCH');
  const actions=actionEvents(r);
  need(actions.length<=1,'ACTION_IMMUTABLE');
  if(r.stage==='alternate'||STAGES.indexOf(r.stage)>=5)need(actions.length===1,'ACTIVITY_BEFORE_REVEAL');
  if(actions.length){need(actions[0].conditionId===r.conditionId,'EVENT_CONDITION_MISMATCH');need(r.events.indexOf(actions[0])>r.events.findIndex(e=>e.eventType==='predictionRecorded'),'ACTIVITY_ORDER');need(actions[0].eventType==='activityDeferred'?r.action.status==='notProvided':r.action.status==='recorded','ACTION_EVENT_MISMATCH');}
  if(revealIndex>=0)need(actions.length===1&&r.events.indexOf(actions[0])<revealIndex,'ACTIVITY_BEFORE_REVEAL');
 }
 if(r.action.status==='recorded')validateAction(condition(r).activity,r.action.value);
 if(freeReason(r))assertReason(r);
 if(r.canvas.status==='recorded')validateCanvas(r,r.canvas.value);
 if(r.conditionId&&condition(r).learnerStoryOnly){
  for(const [kind,field] of [['history',r.historyComparison],['prediction',r.predictionComparison]] as const)if(field.status==='recorded'){
   need(isComparison(field.value),'COMPARISON_FIELDS');
   const events=r.events.filter(e=>e.eventType==='comparisonCompleted'&&e.payload.comparisonKind===kind);
   need(events.length===1&&events[0].conditionId===r.conditionId&&events[0].payload.recordRef===r.resultId+'/'+(kind==='history'?'historyComparison':'predictionComparison')&&events[0].payload.inputStage===(kind==='history'?'historyComparison':'predictionComparison'),'COMPARISON_PROVENANCE');
   const other=structuredClone(r);other[kind==='history'?'historyComparison':'predictionComparison']=missing();assertIndependentComparisonMedia(other,field.value);
  }
 }
 if(r.stage==='complete'){need(!!r.completedAt&&Date.parse(r.completedAt)>=Date.parse(r.createdAt),'INVALID_COMPLETION_TIME');need(r.historyComparison.status==='recorded'&&r.predictionComparison.status==='recorded','TWO_COMPARISONS_REQUIRED');need(r.events.filter(e=>e.eventType==='comparisonCompleted'&&e.payload.comparisonKind==='history').length===1&&r.events.filter(e=>e.eventType==='comparisonCompleted'&&e.payload.comparisonKind==='prediction').length===1,'COMPARISON_EVENT_MISMATCH');}
}
export function assertSuccessor(previous:Run,next:Run){
 assertRun(previous);assertRun(next);need(next.resultId===previous.resultId&&next.profile.learnerId===previous.profile.learnerId&&next.missionId===previous.missionId,'RESULT_LINK_ERROR');need(previous.stage!=='complete','COMPLETED_RESULT_IMMUTABLE');need(next.revision===previous.revision+1,'REVISION_CONFLICT');
 for(const key of ['contentSnapshot','localeSnapshot','profile','createdAt','missionVersion','contentVersion','ageBandRuleId'] as const)need(JSON.stringify(previous[key])===JSON.stringify(next[key]),'SNAPSHOT_IMMUTABLE');
 need(JSON.stringify(next.events.slice(0,previous.events.length))===JSON.stringify(previous.events),'EVENT_HISTORY_IMMUTABLE');
 if(orderedActivityFirst(previous)&&activityCommitted(previous))need(JSON.stringify(previous.action)===JSON.stringify(next.action),'ACTION_IMMUTABLE');
 if(previous.reasonExpressions)need(JSON.stringify(previous.reasonExpressions)===JSON.stringify(next.reasonExpressions),'REASON_IMMUTABLE');
 if(previous.prediction.status==='recorded')need(JSON.stringify(previous.prediction)===JSON.stringify(next.prediction),'PREDICTION_IMMUTABLE');
 for(const key of ['historyComparison','predictionComparison'] as const)if(previous[key].status==='recorded')need(JSON.stringify(previous[key])===JSON.stringify(next[key]),'COMPARISON_IMMUTABLE');
 if(STAGES.indexOf(previous.stage)>=6){need(JSON.stringify(previous.story)===JSON.stringify(next.story),'STORY_IMMUTABLE');need(JSON.stringify(previous.canvas)===JSON.stringify(next.canvas),'CANVAS_IMMUTABLE');}
}

export function comparisonFromExpression(r:Run,kind:ComparisonRecord['comparisonKind'],e:Expression):ComparisonRecord{
 validateExpression(e);need(e.method!=='choice','FIXED_COMPARISON_NOT_ALLOWED');
 const link=artifactLink(r);return {comparisonKind:kind,expressionMode:e.method==='text'?'writing':e.method==='audio'?'voice':e.method==='drawing'?'drawing':'deferred',discoveryText:e.text,evidenceText:'',...('audioRef' in e&&e.audioRef?{voiceRef:e.audioRef}:{}),...('canvasRef' in e&&e.canvasRef?{drawingRef:e.canvasRef}:{}),resultId:link.resultId,missionId:link.missionId,conditionId:link.conditionId,missionVersion:link.missionVersion,contentVersion:link.contentVersion};
}
export function validateComparison(r:Run,v:ComparisonRecord,kind:ComparisonRecord['comparisonKind']){
 const keys=['comparisonKind','expressionMode','discoveryText','evidenceText','voiceRef','drawingRef','resultId','missionId','conditionId','missionVersion','contentVersion'];
 need(v&&Object.keys(v).every(k=>keys.includes(k)),'COMPARISON_FIELDS');need(v.comparisonKind===kind,'COMPARISON_KIND');
 const link=artifactLink(r);for(const k of ['resultId','missionId','conditionId','missionVersion','contentVersion'] as const)need(v[k]===link[k],'RESULT_LINK_ERROR');
 need(typeof v.discoveryText==='string'&&typeof v.evidenceText==='string','COMPARISON_TEXT');
 need(['writing','voice','drawing','mixed','deferred'].includes(v.expressionMode),'COMPARISON_MODE');
 if(v.voiceRef!==undefined)need(typeof v.voiceRef==='string'&&v.voiceRef.startsWith('local-audio:'),'LOCAL_AUDIO_REQUIRED');
 if(v.drawingRef!==undefined)need(typeof v.drawingRef==='string'&&v.drawingRef.startsWith('drawing:'),'CANVAS_REQUIRED');
 const count=Number(!!(v.discoveryText.trim()||v.evidenceText.trim()))+Number(!!v.voiceRef)+Number(!!v.drawingRef);
 if(v.expressionMode==='deferred')need(v.discoveryText===''&&v.evidenceText===''&&!v.voiceRef&&!v.drawingRef,'EMPTY_DEFERRED_EXPRESSION');
 else{need(count>0,'EMPTY_EXPRESSION');need(!!v.discoveryText.trim()||!!v.voiceRef||!!v.drawingRef,'DISCOVERY_REQUIRED');need(v.expressionMode===(count>1?'mixed':v.voiceRef?'voice':v.drawingRef?'drawing':'writing'),'COMPARISON_MODE');}
}

// No content equality test: independently authored identical words are valid.
function assertIndependentComparisonMedia(r:Run,value:ComparisonRecord){
 const refs=new Set<string>();
 for(const field of [r.story,r.historyComparison,r.predictionComparison,r.prediction.status==='recorded'?recorded(r.prediction.value.expression):missing<ComparisonValue>()]){
  if(field.status!=='recorded')continue;const v=field.value;
  for(const ref of isComparison(v)?[v.voiceRef,v.drawingRef]:['audioRef' in v?v.audioRef:undefined,'canvasRef' in v?v.canvasRef:undefined])if(ref)refs.add(ref);
 }
 if(r.canvas.status==='recorded'){refs.add(r.canvas.value.id);for(const scene of r.canvas.value.scenes)if(scene.audioRef)refs.add(scene.audioRef);}
 need(!value.voiceRef||!refs.has(value.voiceRef),'COMPARISON_MEDIA_REUSED');need(!value.drawingRef||!refs.has(value.drawingRef),'COMPARISON_MEDIA_REUSED');
}
