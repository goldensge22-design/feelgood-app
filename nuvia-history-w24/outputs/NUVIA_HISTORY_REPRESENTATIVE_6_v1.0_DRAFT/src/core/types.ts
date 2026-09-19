import {randomId} from './id';

export const AGE_BANDS = ['preschool','elementary-low','elementary-high','middle-school','high-school','adult'] as const;
export type AgeBand=typeof AGE_BANDS[number];
export type Domain='동시처리'|'순차처리'|'계획'|'주의';
export const ACTIONS=['mapRelation','arrangeSequence','classifyEvidence','compareStructures','chooseGoalAndSteps','prioritizeActions','revisePlan'] as const;
export type ActionKind=typeof ACTIONS[number];
export type Missing='notRecorded'|'notObserved'|'notCollected'|'notProvided';
export type Field<T>={status:'recorded';value:T}|{status:Missing};
export const recorded=<T>(value:T):Field<T>=>({status:'recorded',value});
export const missing=<T>(status:Missing='notRecorded'):Field<T>=>({status});
export interface Profile {learnerId:string;alias:string;ageBand:AgeBand;attentionSupport:0|1|2|3;source:'linked-result'|'explicit-test';}
export interface AgeVariant {ageBandRuleId:string;promptKey:string;instructionKey:string;expressionMode:string;visualSupportRule:string;readingDensityRule:string;supportRuleRef:string;}
export interface Material {id:string;labelKey:string;role:'node'|'step'|'evidence'|'left'|'right'|'goal'|'response'|'constraint'|'reason'|'meaning';visual?:string;}
export interface ActivityDefinition {id:string;actionKind:ActionKind;contractId:string;materialSetId:string;materials:Material[];promptKey:string;observationKey:string;hiddenExplanationId?:string;reasonExpressionRuleId?:string;}
export interface SemanticScreen {promptKey:string;instructionKey:string;semanticFields:Record<string,unknown>;}
export interface SemanticDefinition {stages:Record<AgeBand,Record<string,SemanticScreen>>;subquestions:Record<AgeBand,Record<string,SemanticScreen>>;predictionOptions:{id:string;textKey:string;visual:string}[];}
export interface ConditionDefinition {semantic?:SemanticDefinition;learnerStoryOnly?:boolean;historySummaryKey?:string;historyKeyPointKey?:string;id:string;shortId:string;missionId:string;missionVersion:string;contentVersion:string;conditionKey:string;actualHistoryKey:string;actualSceneKey:string;mechanismKey:string;mechanismLevel:1|2;causalMechanismId:string;sourceIds:string[];sourceLocatorKeys:string[];directKey:string;shortTermKey:string;longTermKey:string;additionalKey:string;alternateKeys:[string,string];ageVariants:Record<AgeBand,AgeVariant>;passDomain:Domain;activity:ActivityDefinition;forbiddenExpressionRefs:string[];bookTemplateId:string;resultIdPolicy:string;assetIds:string[];sourceProvenance:{rawActivityId:string;rawContractId:string;rawCausalId:string};}
export interface MissionDefinition {executionOrderRuleId?:string;id:string;week:number;titleKey:string;missionVersion:string;contentVersion:string;conditions:ConditionDefinition[];}
export interface ContentBundle {locale:'ko';missions:MissionDefinition[];strings:Record<string,string>;}
export type ActionInput=
 |{actionKind:'mapRelation';nodeIds:[string,string];relationId:string;meaningKey:string}
 |{actionKind:'arrangeSequence';orderedStepIds:string[];precedenceRefs:[string,string][];interruptedStepId?:string;completionState:'planned'|'observed'|'unknown'}
 |{actionKind:'classifyEvidence';evidenceItemIds:string[];categoryByItem:Record<string,'confirmed'|'hidden'|'unknown'>;hiddenExplanationId:string;uncertainItemIds:string[];reasonRef?:string}
 |{actionKind:'compareStructures';leftRelationIds:string[];rightRelationIds:string[];differenceRef:string}
 |{actionKind:'chooseGoalAndSteps';goalId:string;responseId:string;constraintId:string;reasonRef?:string}
 |{actionKind:'prioritizeActions';goalId:string;orderedResponseIds:string[];constraintId:string;reasonRef?:string}
 |{actionKind:'revisePlan';goalId:string;beforeResponseId:string;afterResponseId:string;decision:'keep'|'change';reasonRef?:string};
export type Expression={method:'choice'|'text'|'audio'|'drawing';text:string;choiceId?:string;audioRef?:string;canvasRef?:string}|{method:'unknown'|'skip';text:''};
export interface ComparisonRecord {
 comparisonKind:'history'|'prediction';expressionMode:'writing'|'voice'|'drawing'|'mixed'|'deferred';
 discoveryText:string;evidenceText:string;voiceRef?:string;drawingRef?:string;
 resultId:string;missionId:string;conditionId:string;missionVersion:string;contentVersion:string;
}
// Old expressions remain read-only; they are never converted or overwritten on load.
export type ComparisonValue=ComparisonRecord|Expression;
export const isComparison=(value:ComparisonValue):value is ComparisonRecord=>'comparisonKind' in value;
export type Stage='history'|'condition'|'prediction'|'alternate'|'activity'|'creation'|'historyComparison'|'predictionComparison'|'complete';
export const STAGES:Stage[]=['history','condition','prediction','alternate','activity','creation','historyComparison','predictionComparison','complete'];
export type EventType='missionStarted'|'historyViewed'|'conditionSelected'|'predictionRecorded'|'alternateViewed'|'cognitiveActionRecorded'|'hintRequested'|'supportApplied'|'choiceChanged'|'activityRetried'|'canvasObjectAdded'|'canvasObjectMoved'|'drawingAdded'|'sceneCompleted'|'storyRecorded'|'comparisonCompleted'|'missionCompleted'|'activityDeferred'|'reasonExpressionRecorded';
export interface PerformanceEvent {eventId:string;resultId:string;missionId:string;conditionId:string|null;missionVersion:string;contentVersion:string;ageBandRuleId:string;ageBand:AgeBand;eventType:EventType;timestamp:string;payload:Record<string,unknown>;supportLevel:number;appVersion:string;}
export interface ArtifactLink {resultId:string;missionId:string;conditionId:string;missionVersion:string;contentVersion:string;learnerId:string;}
export interface SceneData extends ArtifactLink {id:string;backgroundId:string;stickers:{id:string;x:number;y:number;scale:number;flip:boolean}[];strokes:{color:string;width:number;erase:boolean;points:[number,number][]}[];text:string;preview:string;audioRef?:string;}
export interface CanvasArtifact extends ArtifactLink {id:string;scenes:SceneData[];completed:boolean;}
export interface ReasonExpressionRecord {reasonRef:string;resultId:string;missionId:string;conditionId:string;missionVersion:string;contentVersion:string;actionEventId:string;reasonQuestionId:string;source:'typed'|'recorded'|'drawn';reasonText?:string;voiceRef?:string;drawingRef?:string;createdAt:string;}
export type ReasonInput={source:'typed';reasonText:string}|{source:'recorded';voiceRef:string}|{source:'drawn';drawingRef:string}|{source:'deferred'};
export interface Run {reasonExpressions?:ReasonExpressionRecord[];schemaVersion:1;revision:number;resultId:string;missionId:string;missionVersion:string;contentVersion:string;appVersion:string;profile:Profile;ageBandRuleId:string;createdAt:string;completedAt:string|null;stage:Stage;conditionId:string|null;prediction:Field<{expression:Expression;recordedAt:string}>;alternate:Field<'A'|'B'>;action:Field<ActionInput>;story:Field<Expression>;historyComparison:Field<ComparisonValue>;predictionComparison:Field<ComparisonValue>;canvas:Field<CanvasArtifact>;cover:'antique'|'linen'|'adventure';events:PerformanceEvent[];contentSnapshot:MissionDefinition;localeSnapshot:Record<string,string>;}
export interface Dependencies {id:()=>string;now:()=>string;}
export const productionDependencies:Dependencies={id:randomId,now:()=>new Date().toISOString()};
