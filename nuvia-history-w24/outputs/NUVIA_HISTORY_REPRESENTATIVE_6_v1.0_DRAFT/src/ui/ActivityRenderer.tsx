import React,{useState,useEffect,type ReactNode} from 'react';
import type {ActionInput,ActivityDefinition,Material,SemanticScreen} from '../core/types';
import {validateAction} from '../core/contracts';
export interface ActivityLabels {next:string;back:string;save:string;unknown:string;reset:string;confirmed:string;hidden:string;uncertain:string;planned:string;observed:string;completionUnknown:string;reason:string;goal:string;response:string;constraint:string;before:string;after:string;meaning:string;left:string;right:string;sequence:string;interruption:string;none:string;}
// One renderer per shared action contract; missionId is never inspected here.
export function ActivityRenderer({definition:d,t,labels:l,pageSize=4,highlight=false,promptKey,subquestions,busy=false,onCommit,onDefer,onRetry,renderReason,draftKey}:{definition:ActivityDefinition;t:(k:string)=>string;labels:ActivityLabels;pageSize?:number;highlight?:boolean;promptKey?:string;subquestions?:Record<string,SemanticScreen>;busy?:boolean;onCommit:(a:ActionInput)=>void;onDefer:()=>void;onRetry:()=>void;draftKey?:string;renderReason?:(value:ActionInput,onBack:()=>void)=>ReactNode}){
 const [initial]=useState(()=>{try{return draftKey?JSON.parse(localStorage.getItem(draftKey)??'{}'):{};}catch{return {};}});
 const [step,setStep]=useState<number>(initial.step??0),[answers,setAnswers]=useState<Record<string,string[]>>(initial.answers??{}),[category,setCategory]=useState<Record<string,'confirmed'|'hidden'|'unknown'>>({}),[state,setState]=useState<'planned'|'observed'|'unknown'>(),[interruption,setInterruption]=useState<string>(''),[page,setPage]=useState(0);
 useEffect(()=>{if(draftKey)localStorage.setItem(draftKey,JSON.stringify({step,answers}));},[step,answers,draftKey]);
 const role=(r:Material['role'])=>d.materials.filter(m=>m.role===r);
 const stages:Record<ActivityDefinition['actionKind'],string[]>={mapRelation:['nodes','meaning'],arrangeSequence:['order','state','interruption'],classifyEvidence:role('evidence').map(m=>m.id).concat('reason'),compareStructures:['left','right','difference'],chooseGoalAndSteps:['goal','response','constraint','reason'],prioritizeActions:['goal','priorities','constraint','reason'],revisePlan:['goal','before','after','reason']};
 const parts=stages[d.actionKind],part=parts[step];
 const groups:Record<string,Material['role']>={nodes:'node',meaning:'meaning',order:'step',left:'left',right:'right',difference:'reason',goal:'goal',response:'response',constraint:'constraint',reason:'reason',priorities:'response',before:'response',after:'response'};
 const many=part==='nodes'||part==='order'||part==='priorities';
 const options=groups[part]?role(groups[part]):[];const chosen=answers[part]??[];
 const valid=part==='state'?!!state:part==='interruption'?!!interruption:part in category?true:options.length?chosen.length===(part==='nodes'?2:many?options.length:1):false;
 function choose(id:string){setAnswers(prev=>({...prev,[part]:many?(chosen.includes(id)?chosen.filter(x=>x!==id):part==='nodes'&&chosen.length===2?[chosen[1],id]:[...chosen,id]):[id]}));}
 function build():ActionInput{const a=(key:string)=>answers[key]?.[0]??'',arr=(key:string)=>answers[key]??[];switch(d.actionKind){
 case 'mapRelation':return {actionKind:d.actionKind,nodeIds:arr('nodes') as [string,string],relationId:d.id+'.relation',meaningKey:a('meaning')};
 case 'arrangeSequence':return {actionKind:d.actionKind,orderedStepIds:arr('order'),precedenceRefs:arr('order').slice(1).map((id,i)=>[arr('order')[i],id]),completionState:state!,...(interruption!=='none'?{interruptedStepId:interruption}:{})};
 case 'classifyEvidence':return {actionKind:d.actionKind,evidenceItemIds:role('evidence').map(x=>x.id),categoryByItem:category,hiddenExplanationId:d.hiddenExplanationId!,uncertainItemIds:Object.keys(category).filter(k=>category[k]==='unknown'),...(renderReason?{}:{reasonRef:a('reason')})};
 case 'compareStructures':return {actionKind:d.actionKind,leftRelationIds:arr('left'),rightRelationIds:arr('right'),differenceRef:a('difference')};
 case 'chooseGoalAndSteps':return {actionKind:d.actionKind,goalId:a('goal'),responseId:a('response'),constraintId:a('constraint'),...(renderReason?{}:{reasonRef:a('reason')})};
 case 'prioritizeActions':return {actionKind:d.actionKind,goalId:a('goal'),orderedResponseIds:arr('priorities'),constraintId:a('constraint'),...(renderReason?{}:{reasonRef:a('reason')})};
 case 'revisePlan':return {actionKind:d.actionKind,goalId:a('goal'),beforeResponseId:a('before'),afterResponseId:a('after'),decision:a('before')===a('after')?'keep':'change',...(renderReason?{}:{reasonRef:a('reason')})};
 }}
 const title=subquestions?.[part]?t(subquestions[part].promptKey):({nodes:l.meaning,order:l.sequence,priorities:l.sequence,difference:l.reason,state:l.planned,interruption:l.interruption} as Record<string,string>)[part]??(l as unknown as Record<string,string>)[part]??t(d.materials.find(m=>m.id===part)!.labelKey);
 if(part==='reason'&&renderReason)return <section className="activity-workbench">{renderReason(build(),()=>setStep(step-1))}</section>;
 return <section className={`activity-workbench ${highlight?'highlight':''}`} aria-label={t(promptKey??d.promptKey)} data-question-id={subquestions?.[part]?.semanticFields.questionId as string|undefined}>
 {!subquestions&&<p className="activity-instruction">{t(promptKey??d.promptKey)}</p>}<fieldset disabled={busy}><legend>{title}</legend>
 {options.slice(page*pageSize,(page+1)*pageSize).map(m=><button type="button" key={m.id} aria-pressed={chosen.includes(m.id)} data-material={m.id} onClick={()=>choose(m.id)}><span className={`material-symbol ${m.visual??'choice'}`} aria-hidden="true"/>{t(m.labelKey)}{many&&chosen.includes(m.id)?` · ${chosen.indexOf(m.id)+1}`:''}</button>)}
 {options.length>pageSize&&<nav><button type="button" disabled={page===0} onClick={()=>setPage(page-1)}>{l.back}</button><button type="button" disabled={(page+1)*pageSize>=options.length} onClick={()=>setPage(page+1)}>{l.next}</button></nav>}
 {part==='state'&&(['planned','observed','unknown'] as const).map(v=><button type="button" key={v} aria-pressed={state===v} onClick={()=>setState(v)}>{v==='planned'?l.planned:v==='observed'?l.observed:l.completionUnknown}</button>)}
 {part==='interruption'&&[{id:'none',label:l.none},...role('step').map(s=>({id:s.id,label:t(s.labelKey)}))].map(s=><button type="button" key={s.id} aria-pressed={interruption===s.id} onClick={()=>setInterruption(s.id)}>{s.label}</button>)}
 {d.actionKind==='classifyEvidence'&&part!=='reason'&&(['confirmed','hidden','unknown'] as const).map(v=><button type="button" key={v} aria-pressed={category[part]===v} onClick={()=>setCategory(p=>({...p,[part]:v}))}>{v==='unknown'?l.uncertain:l[v]}</button>)}
 </fieldset><nav><button type="button" disabled={busy||step===0} onClick={()=>{setStep(step-1);setPage(0);}}>{l.back}</button><button type="button" disabled={busy||!valid} onClick={()=>{if(step===parts.length-1)onCommit(validateAction(d,build()));else{setStep(step+1);setPage(0);}}}>{step===parts.length-1?l.save:l.next}</button><button type="button" disabled={busy} onClick={onDefer}>{l.unknown}</button><button type="button" onClick={()=>{setAnswers({});setCategory({});setState(undefined);setInterruption('');setStep(0);setPage(0);onRetry();}}>{l.reset}</button></nav>
 </section>;
}
