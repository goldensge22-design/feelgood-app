import {AGE_BANDS,type Profile,type ConditionDefinition,type AgeBand} from './types';
import {need} from './contracts';
export interface ProfileProvider {load():Promise<Profile|null>;}
// Assessment numeric scores never enter the activity record or report model.
export function resolveProfile(input:unknown):Profile {
 need(input&&typeof input==='object','PROFILE_REQUIRED');const p=input as Record<string,unknown>;
 need(typeof p.learnerId==='string'&&p.learnerId.length>0,'LEARNER_REQUIRED');need(AGE_BANDS.includes(p.ageBand as AgeBand),'AGE_RULE_REQUIRED');need([0,1,2,3].includes(p.attentionSupport as number),'SUPPORT_RULE_REQUIRED');need(['linked-result','explicit-test'].includes(p.source as string),'PROFILE_SOURCE_REQUIRED');
 if(p.schoolGrade!==undefined)need(Number.isInteger(p.schoolGrade)&&[1,2,3,4,5,6].includes(p.schoolGrade as number)&&(p.ageBand==='elementary-low'?(p.schoolGrade as number)<=2:p.ageBand==='elementary-high'&&(p.schoolGrade as number)>=3),'GRADE_RULE_REQUIRED');
 return {learnerId:p.learnerId,alias:typeof p.alias==='string'&&p.alias.trim()?p.alias:'어린이 탐험가',ageBand:p.ageBand as AgeBand,...(p.schoolGrade!==undefined?{schoolGrade:p.schoolGrade as Profile['schoolGrade']}:{}),attentionSupport:p.attentionSupport as 0|1|2|3,source:p.source as Profile['source']};
}
export function presentation(c:ConditionDefinition,p:Profile){
 const young=p.ageBand==='preschool',low=p.ageBand==='elementary-low',supported=p.attentionSupport>0;
 return {variant:c.ageVariants[p.ageBand],sceneCount:low?2:1,canvasOptional:!young&&!low,choicePageSize:young||p.attentionSupport>=2?2:4,chunked:young||p.attentionSupport>=3,highlight:supported,hideDecorations:p.attentionSupport>=3,sentenceBudget:young?1:low?2:3,readAloud:{status:'notProvided' as const},automaticSupport:p.attentionSupport===3?['keyElement','reducedChoices','shortSteps','visualGuide']:p.attentionSupport===2?['keyElement','reducedChoices']:p.attentionSupport===1?['keyElement']:[]};
}
