import {validateContent} from './content';
import {need} from './contracts';
import type {ContentBundle,Run,SemanticDefinition} from './types';
import {w24ActivityGuidance} from '../content/w24ActivityGuidance.ko';
export interface RuntimeRelease {reasonExpressionRuleId?:string;executionOrderRuleId?:string;missionId:string;missionVersion:string;contentVersion:string;comparisonRuleId:string;conditionContracts?:Record<string,{learnerStoryOnly:boolean;historySummaryKey:string;historyKeyPointKey:string}>;}
// Only the runtime copy receives a new contract version. Frozen source JSON stays intact.
export function releaseContent(source:ContentBundle,release:RuntimeRelease,semantics?:Record<string,SemanticDefinition>,semanticStrings?:Record<string,string>):ContentBundle{
 const bundle=structuredClone(source),mission=bundle.missions.find(m=>m.id===release.missionId);
 need(mission,'MISSION_NOT_FOUND');mission.missionVersion=release.missionVersion;mission.contentVersion=release.contentVersion;
 if(release.executionOrderRuleId){mission.executionOrderRuleId=release.executionOrderRuleId;need(semantics&&semanticStrings,'SEMANTIC_CONTENT_REQUIRED');Object.assign(bundle.strings,semanticStrings);}
 for(const c of mission.conditions){if(semantics){need(semantics[c.id],'SEMANTIC_CONDITION_REQUIRED');c.semantic=structuredClone(semantics[c.id]);}c.missionVersion=release.missionVersion;c.contentVersion=release.contentVersion;const contract=release.conditionContracts?.[c.id];if(contract)Object.assign(c,contract);}
 // W24-C2 asks for one defensible first step. It no longer forces a complete
 // sequence whose numbers and placement can be mistaken for a revealed answer.
 const c2=mission.conditions.find(c=>c.id==='gutenberg.c2');
 if(c2?.semantic&&c2.activity.actionKind==='chooseGoalAndSteps')for(const [age,questions] of Object.entries(c2.semantic.subquestions)){
  const priority=questions.priorities;need(priority,'W24_C2_RESPONSE_QUESTION_REQUIRED');
  questions.response={...priority,semanticFields:{...priority.semanticFields,questionId:String(priority.semanticFields.questionId).replace('.priority','.response'),cognitiveAction:'chooseGoalAndSteps',expectedResponseType:'responseId',expectedAnswerMeaning:'함께 보기 위해 먼저 확인할 행동 한 가지; 세 대안 모두 허용',outputTarget:'cognitiveActionRecorded.payload.responseId'}};delete questions.priorities;
  bundle.strings[questions.goal.promptKey]='활동 목표';bundle.strings[questions.goal.instructionKey]='더 많은 사람이 책을 함께 볼 방법을 정해요.';
  bundle.strings[questions.response.promptKey]='책을 함께 보기 위해 가장 먼저 무엇을 확인해 볼까요?';bundle.strings[questions.response.instructionKey]=age==='preschool'?'정답은 하나가 아니에요. 먼저 해볼 일을 하나 골라요.':'상황에 따라 달라질 수 있어요. 먼저 확인할 행동 하나를 골라요.';
  bundle.strings[questions.constraint.promptKey]='바뀐 조건';bundle.strings[questions.constraint.instructionKey]='일부 사람은 책을 직접 보기 어려워요.';
  for(const q of Object.values(questions))q.semanticFields.cognitiveAction='chooseGoalAndSteps';
  const core=c2.semantic.stages[age as keyof typeof c2.semantic.stages].coreActivity;core.semanticFields.cognitiveAction='chooseGoalAndSteps';core.semanticFields.expectedResponseType='action.chooseGoalAndSteps.r2 payload 또는 activityDeferred';core.semanticFields.expectedAnswerMeaning='목표와 접근 제약을 확인하고 먼저 실행할 행동 한 가지 선택';
 }
 const c1=mission.conditions.find(c=>c.id==='gutenberg.c1');
 if(c1?.semantic)for(const [age,questions] of Object.entries(c1.semantic.subquestions)){
  bundle.strings[questions.goal.promptKey]='활동 목표';bundle.strings[questions.goal.instructionKey]='남은 종이 안에서 인쇄 계획을 세워요.';
  bundle.strings[questions.before.promptKey]='종이가 부족하다는 것을 알기 전에 먼저 무엇을 하려고 했나요?';bundle.strings[questions.before.instructionKey]='처음 하려던 행동 하나를 골라요. 정답은 하나가 아니에요.';
  bundle.strings[questions.after.promptKey]='남은 종이가 적다면 지금은 무엇을 먼저 할까요?';bundle.strings[questions.after.instructionKey]=age==='preschool'?'처음 생각과 같아도, 달라도 괜찮아요.':'처음 계획을 유지하거나 조건에 맞게 바꿔요.';
 }
 if(release.reasonExpressionRuleId){need(semantics&&semanticStrings,"SEMANTIC_CONTENT_REQUIRED");for(const c of mission.conditions){c.activity.reasonExpressionRuleId=release.reasonExpressionRuleId;c.activity.materials=c.activity.materials.filter(m=>m.role!=='reason');for(const [age,qs] of Object.entries(c.semantic!.subquestions)){const q=qs.reason;if(!q)continue;const preschool=age==='preschool',low=age==='elementary-low';bundle.strings[q.promptKey]=preschool?'왜 그렇게 골랐나요?':low?'왜 그렇게 골랐나요?':'그렇게 선택한 이유를 직접 남겨 보세요.';bundle.strings[q.instructionKey]=preschool?'말하거나 그림으로 남겨요. 글은 다른 방법에서 고를 수 있어요.':low?'말하거나, 그리거나, 짧게 써 보세요.':'선택할 때 생각한 조건이나 까닭을 직접 남겨 보세요.';q.semanticFields.expectedAnswerMeaning='사용자가 직접 남긴 이유 또는 명시적 이유 건너뛰기';q.semanticFields.expectedResponseType='freeExpression';q.semanticFields.allowedAnswerIds=[];}}}
 // Every W24 question carries the same five review fields. These fields state
 // what is judged and recorded; they never claim to understand free expression.
 for(const c of mission.conditions)if(c.semantic)for(const [age,stages] of Object.entries(c.semantic.stages)){
  const questions=c.semantic.subquestions[age as keyof typeof c.semantic.subquestions];
  for(const [part,screen] of [...Object.entries(stages),...Object.entries(questions)]){
   const guide=w24ActivityGuidance[c.id]?.questions[part];const f=screen.semanticFields;
   f.userJudgement=guide?.judgement??f.questionPurpose;
   f.passBehavior=guide?.passBehavior??(f.cognitiveAction==='notApplicable'?f.questionPurpose:f.expectedAnswerMeaning);
   f.allowedResponses=guide?.allowedResponses??f.expectedAnswerMeaning;
   f.helpWhenBlocked=guide?.helpWhenBlocked??bundle.strings[screen.instructionKey];
   f.completionEvidence=guide?.completionEvidence??f.outputTarget;
  }
 }
 validateContent(bundle);return bundle;
}
export const matchesRelease=(run:Run,release:RuntimeRelease)=>run.missionId===release.missionId&&run.missionVersion===release.missionVersion&&run.contentVersion===release.contentVersion;
