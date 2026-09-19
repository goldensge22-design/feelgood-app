import {ACTIONS,type ActionInput,type ActivityDefinition} from './types';
export class ContractError extends Error{constructor(readonly code:string){super(code);}}
export function need(ok:unknown,code:string):asserts ok{if(!ok)throw new ContractError(code);}
const unique=(a:unknown):a is string[]=>Array.isArray(a)&&a.every(x=>typeof x==='string'&&x.length>0)&&new Set(a).size===a.length;
export function validateAction(def:ActivityDefinition,value:unknown):ActionInput {
 need(value&&typeof value==='object','ACTION_INVALID');const v=value as ActionInput;
 need(ACTIONS.includes(v.actionKind)&&v.actionKind===def.actionKind,'ACTION_KIND_MISMATCH');
 const allowed=(id:unknown,role:string)=>typeof id==='string'&&def.materials.some(m=>m.id===id&&m.role===role);
 const one=(id:unknown,role:string)=>need(allowed(id,role),'UNKNOWN_'+role.toUpperCase());
 const list=(ids:unknown,role:string,min=1)=>{need(unique(ids)&&ids.length>=min,'INVALID_'+role.toUpperCase()+'_LIST');ids.forEach(id=>one(id,role));};
 const reason=(id:unknown)=>{if(def.reasonExpressionRuleId==='NUVIA_HISTORY_REASON_EXPRESSION_RULE_v1.1.2'){need(id===undefined||(typeof id==='string'&&id.startsWith('reason:')&&!def.materials.some(m=>m.id===id)),'REASON_RECORD_REQUIRED');}else one(id,'reason');};
 switch(v.actionKind){
 case 'mapRelation': list(v.nodeIds,'node',2);need(v.nodeIds.length===2,'RELATION_PAIR_REQUIRED');one(v.meaningKey,'meaning');need(v.relationId===def.id+'.relation','RELATION_ID_MISMATCH');break;
 case 'arrangeSequence':list(v.orderedStepIds,'step',2);need(v.orderedStepIds.length===def.materials.filter(m=>m.role==='step').length,'INCOMPLETE_SEQUENCE');need(Array.isArray(v.precedenceRefs)&&v.precedenceRefs.length===v.orderedStepIds.length-1&&v.precedenceRefs.every((p,i)=>Array.isArray(p)&&p.length===2&&p[0]===v.orderedStepIds[i]&&p[1]===v.orderedStepIds[i+1]),'INVALID_PRECEDENCE');need(['planned','observed','unknown'].includes(v.completionState),'COMPLETION_STATE_REQUIRED');if(v.interruptedStepId)one(v.interruptedStepId,'step');break;
 case 'classifyEvidence':list(v.evidenceItemIds,'evidence');need(v.evidenceItemIds.length===def.materials.filter(m=>m.role==='evidence').length,'INCOMPLETE_CLASSIFICATION');need(v.hiddenExplanationId===def.hiddenExplanationId,'HIDDEN_REFERENCE_MISMATCH');need(v.categoryByItem&&typeof v.categoryByItem==='object'&&Object.keys(v.categoryByItem).length===v.evidenceItemIds.length,'CATEGORY_REQUIRED');v.evidenceItemIds.forEach(id=>need(['confirmed','hidden','unknown'].includes(v.categoryByItem[id]),'CATEGORY_REQUIRED'));need(unique(v.uncertainItemIds)&&v.uncertainItemIds.length===v.evidenceItemIds.filter(id=>v.categoryByItem[id]==='unknown').length&&v.uncertainItemIds.every(id=>v.evidenceItemIds.includes(id)&&v.categoryByItem[id]==='unknown'),'UNCERTAINTY_MISMATCH');reason(v.reasonRef);break;
 case 'compareStructures':list(v.leftRelationIds,'left');list(v.rightRelationIds,'right');reason(v.differenceRef);break;
 case 'chooseGoalAndSteps':one(v.goalId,'goal');one(v.responseId,'response');one(v.constraintId,'constraint');reason(v.reasonRef);break;
 case 'prioritizeActions':one(v.goalId,'goal');list(v.orderedResponseIds,'response',2);need(v.orderedResponseIds.length===def.materials.filter(m=>m.role==='response').length,'INCOMPLETE_PRIORITIES');one(v.constraintId,'constraint');reason(v.reasonRef);break;
 case 'revisePlan':one(v.goalId,'goal');one(v.beforeResponseId,'response');one(v.afterResponseId,'response');need(v.decision===(v.beforeResponseId===v.afterResponseId?'keep':'change'),'DECISION_MISMATCH');reason(v.reasonRef);break;
 }
 // Return only the contract's public fields; raw traces or unsolicited scoring are not accepted.
 const fields:Record<string,string[]>={mapRelation:['nodeIds','relationId','meaningKey'],arrangeSequence:['orderedStepIds','precedenceRefs','interruptedStepId','completionState'],classifyEvidence:['evidenceItemIds','categoryByItem','hiddenExplanationId','uncertainItemIds','reasonRef'],compareStructures:['leftRelationIds','rightRelationIds','differenceRef'],chooseGoalAndSteps:['goalId','responseId','constraintId','reasonRef'],prioritizeActions:['goalId','orderedResponseIds','constraintId','reasonRef'],revisePlan:['goalId','beforeResponseId','afterResponseId','decision','reasonRef']};
 need(Object.keys(v).every(k=>k==='actionKind'||fields[v.actionKind].includes(k)),'UNEXPECTED_ACTION_FIELD');
 return structuredClone(v);
}
