import {validateContent} from './content';
import {need} from './contracts';
import type {ContentBundle,Run,SemanticDefinition} from './types';
export interface RuntimeRelease {reasonExpressionRuleId?:string;executionOrderRuleId?:string;missionId:string;missionVersion:string;contentVersion:string;comparisonRuleId:string;conditionContracts?:Record<string,{learnerStoryOnly:boolean;historySummaryKey:string;historyKeyPointKey:string}>;}
// Only the runtime copy receives a new contract version. Frozen source JSON stays intact.
export function releaseContent(source:ContentBundle,release:RuntimeRelease,semantics?:Record<string,SemanticDefinition>,semanticStrings?:Record<string,string>):ContentBundle{
 const bundle=structuredClone(source),mission=bundle.missions.find(m=>m.id===release.missionId);
 need(mission,'MISSION_NOT_FOUND');mission.missionVersion=release.missionVersion;mission.contentVersion=release.contentVersion;
 if(release.executionOrderRuleId){mission.executionOrderRuleId=release.executionOrderRuleId;need(semantics&&semanticStrings,'SEMANTIC_CONTENT_REQUIRED');Object.assign(bundle.strings,semanticStrings);}
 for(const c of mission.conditions){if(semantics){need(semantics[c.id],'SEMANTIC_CONDITION_REQUIRED');c.semantic=structuredClone(semantics[c.id]);}c.missionVersion=release.missionVersion;c.contentVersion=release.contentVersion;const contract=release.conditionContracts?.[c.id];if(contract)Object.assign(c,contract);}
 if(release.reasonExpressionRuleId){need(semantics&&semanticStrings,"SEMANTIC_CONTENT_REQUIRED");for(const c of mission.conditions){c.activity.reasonExpressionRuleId=release.reasonExpressionRuleId;c.activity.materials=c.activity.materials.filter(m=>m.role!=='reason');for(const [age,qs] of Object.entries(c.semantic!.subquestions)){const q=qs.reason;if(!q)continue;const low=['preschool','elementary-low'].includes(age);bundle.strings[q.promptKey]=low?'왜 그렇게 골랐나요?':'그렇게 선택한 이유를 직접 남겨 보세요.';bundle.strings[q.instructionKey]=low?'내 생각을 말하거나, 그리거나, 짧게 써 보세요.':'선택할 때 생각한 조건이나 까닭을 적어 보세요.';q.semanticFields.expectedAnswerMeaning='사용자가 직접 남긴 이유 또는 명시적 이유 건너뛰기';q.semanticFields.expectedResponseType='freeExpression';q.semanticFields.allowedAnswerIds=[];}}}
 validateContent(bundle);return bundle;
}
export const matchesRelease=(run:Run,release:RuntimeRelease)=>run.missionId===release.missionId&&run.missionVersion===release.missionVersion&&run.contentVersion===release.contentVersion;
