import type {ActionInput,ActivityDefinition,Dependencies,Profile,Run,ContentBundle} from '../src/core/types';
import {newRun,transition} from '../src/core/engine';
export function deterministic():Dependencies{let n=0,t=0;return {id:()=>`test-id-${++n}`,now:()=>new Date(Date.UTC(2026,8,19)+t++*1000).toISOString()};}
export const profile:Profile={learnerId:'test-learner',alias:'탐험가',ageBand:'preschool',attentionSupport:0,source:'explicit-test'};
export function actionInput(d:ActivityDefinition):ActionInput {
 const ids=(role:string)=>d.materials.filter(m=>m.role===role).map(m=>m.id),one=(role:string)=>ids(role)[0];
 switch(d.actionKind){
 case 'mapRelation':return {actionKind:d.actionKind,nodeIds:ids('node').slice(0,2) as [string,string],relationId:d.id+'.relation',meaningKey:one('meaning')};
 case 'arrangeSequence':return {actionKind:d.actionKind,orderedStepIds:ids('step'),precedenceRefs:ids('step').slice(1).map((id,i)=>[ids('step')[i],id]),completionState:'planned'};
 case 'classifyEvidence':return {actionKind:d.actionKind,evidenceItemIds:ids('evidence'),categoryByItem:Object.fromEntries(ids('evidence').map(id=>[id,'unknown'])),hiddenExplanationId:d.hiddenExplanationId!,uncertainItemIds:ids('evidence'),reasonRef:one('reason')};
 case 'compareStructures':return {actionKind:d.actionKind,leftRelationIds:ids('left'),rightRelationIds:ids('right'),differenceRef:one('reason')};
 case 'chooseGoalAndSteps':return {actionKind:d.actionKind,goalId:one('goal'),responseId:one('response'),constraintId:one('constraint'),reasonRef:one('reason')};
 case 'prioritizeActions':return {actionKind:d.actionKind,goalId:one('goal'),orderedResponseIds:ids('response'),constraintId:one('constraint'),reasonRef:one('reason')};
 case 'revisePlan':return {actionKind:d.actionKind,goalId:one('goal'),beforeResponseId:one('response'),afterResponseId:ids('response')[1],decision:'change',reasonRef:one('reason')};
 }}
export function toPrediction(b:ContentBundle,missionId:string,cid:string,p=profile,d=deterministic()):Run {let r=newRun(b,missionId,p,d);for(const c of r.contentSnapshot.conditions)r=transition(r,{type:'historyViewed',conditionId:c.id},d);r=transition(r,{type:'continueHistory'},d);return transition(r,{type:'selectCondition',conditionId:cid},d);}
