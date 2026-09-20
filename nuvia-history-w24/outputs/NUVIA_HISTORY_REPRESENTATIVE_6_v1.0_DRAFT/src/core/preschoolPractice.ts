import type {ActionInput,MissionDefinition,PracticeDomain,PracticeStep,Profile,Run} from './types';
import {kidKo,type KidKey} from '../content/preschool.ko';
function check(ok:unknown,code:string):asserts ok{if(!ok)throw Error(code);}
export interface KidOption {id:string;key:KidKey;art:string;}
export const isPaper=(id:string)=>id.endsWith('.c1');
export function practiceMethods(cid:string):KidOption[]{return isPaper(cid)?[{id:'content',key:'content',art:'content'},{id:'paper',key:'paperCheck',art:'paper'},{id:'order',key:'order',art:'order'}]:[{id:'tell',key:'tell',art:'tell'},{id:'time',key:'time',art:'time'},{id:'ask',key:'ask',art:'ask'}];}
export function practiceGoals(cid:string):KidOption[]{return isPaper(cid)?[{id:'make',key:'goalMake',art:'press'},{id:'choose',key:'goalChoose',art:'paper'}]:[{id:'hear',key:'goalHear',art:'tell'},{id:'see',key:'goalSee',art:'share'}];}
export function sequenceCards(cid:string,method:string):KidOption[]{
 if(isPaper(cid))return [{id:'check',key:'checkPaper',art:'paper'},{id:'prepare',key:method==='order'?'setOrder':'chooseContent',art:method==='order'?'order':'content'},{id:'finish',key:'print',art:'press'}];
 return [{id:'prepare',key:method==='tell'?'read':method==='time'?'findTimeStep':'askFirst',art:method==='tell'?'book':method==='time'?'time':'ask'},{id:'meet',key:method==='tell'?'invite':'meet',art:'share'},{id:'finish',key:method==='tell'?'tellEnd':'seeEnd',art:method==='tell'?'tell':'share'}];
}
export const phases=(domain:PracticeDomain)=>domain==='planning'?['context','goal','method','observe','revise']:domain==='sequential'?['context','method','sequence','observe']:domain==='simultaneous'?['context','method','linkPerson','linkPlace','linkMethod','scene','observe']:['context','findPerson','findResource','method','apply','observe'];
export function practiceSteps(r:Run):PracticeStep[]{return r.events.filter(e=>e.eventType==='practiceInteraction'&&e.conditionId===r.conditionId).map(e=>({phase:String(e.payload.phase),ids:e.payload.ids as string[]}));}
export function validatePracticeSteps(domain:PracticeDomain,cid:string,steps:PracticeStep[],complete=false){
 const plan=phases(domain),methods=practiceMethods(cid).map(x=>x.id);
 check(steps.length<=plan.length&&(!complete||steps.length===plan.length),'PRACTICE_INCOMPLETE');
 let method='';
 for(const [i,s] of steps.entries()){
  check(s&&s.phase===plan[i]&&Array.isArray(s.ids)&&s.ids.every(x=>typeof x==='string')&&new Set(s.ids).size===s.ids.length&&Object.keys(s).every(k=>['phase','ids'].includes(k)),'PRACTICE_STEP_ORDER');
  const one=(allowed:string[])=>check(s.ids.length===1&&allowed.includes(s.ids[0]),'PRACTICE_CHOICE');
  switch(s.phase){
   case 'context':check(s.ids.length===0,'PRACTICE_CONTEXT');break;
   case 'goal':one(practiceGoals(cid).map(x=>x.id));break;
   case 'method':case 'revise':one(methods);method=s.ids[0];break;
   case 'sequence':{const expected=sequenceCards(cid,method).map(x=>x.id);check(s.ids.length===3&&s.ids.every(id=>expected.includes(id))&&s.ids[2]==='finish','PRACTICE_SEQUENCE');break;}
   case 'linkPerson':one([isPaper(cid)?'printer':'reader']);break;
   case 'linkPlace':one([isPaper(cid)?'press':'place']);break;
   case 'linkMethod':case 'scene':one([method]);break;
   case 'findPerson':one([isPaper(cid)?'printer':'reader']);break;
   case 'findResource':case 'apply':one([isPaper(cid)?'oneSheet':'day']);break;
   case 'observe':one([method]);break;
  }
 }
}
export function practiceValue(domain:PracticeDomain,cid:string,steps:PracticeStep[]):Extract<ActionInput,{actionKind:'preschoolActivity'}>{
 validatePracticeSteps(domain,cid,steps,true);
 return {actionKind:'preschoolActivity',domain,goalId:steps.find(x=>x.phase==='goal')?.ids[0]??'notAsked',methodId:(steps.find(x=>x.phase==='revise')??steps.find(x=>x.phase==='method'))!.ids[0],evidence:structuredClone(steps)};
}
export function configurePractice(mission:MissionDefinition,profile:Profile):MissionDefinition{
 if(profile.ageBand!=='preschool'||!profile.practiceDomain||mission.id!=='gutenberg'||mission.contentVersion!=='3.4.0')return mission;
 const result=structuredClone(mission);
 for(const c of result.conditions){
  c.activity={...c.activity,id:c.id+'.preschool.'+profile.practiceDomain,actionKind:'preschoolActivity',contractId:'nuvia.w24.preschool-practice.v1',practiceDomain:profile.practiceDomain};
  if(c.semantic){for(const [phase,q] of Object.entries(c.semantic.stages.preschool))q.semanticFields={...q.semanticFields,questionId:c.id+'.preschool.'+profile.practiceDomain+'.'+phase,cognitiveAction:'preschoolActivity.'+profile.practiceDomain};}
 }
 return result;
}
export const practiceEnabled=(r:Run)=>!!r.conditionId&&r.contentSnapshot.conditions.find(c=>c.id===r.conditionId)?.activity.actionKind==='preschoolActivity';
// Stable per-run shuffling, independent of the intended sequence.
export function shuffled<T>(items:T[],seed:string):T[]{let h=2166136261;for(const c of seed)h=Math.imul(h^c.charCodeAt(0),16777619);const a=[...items];for(let i=a.length-1;i>0;i--){h=(Math.imul(h,1664525)+1013904223)>>>0;const j=h%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function practiceOutcome(method:string):KidKey{return ({content:'resultContent',paper:'resultPaper',order:'resultOrder',tell:'resultTell',time:'resultTime',ask:'resultAsk'} as Record<string,KidKey>)[method];}
export function practiceDesign(cid:string,domain:PracticeDomain){return {questionId:cid+'.preschool.'+domain,changedConditionId:cid,scope:'CHANGED_CONDITION/POSSIBLE_OUTCOME',judgement:domain==='planning'?'목표·방법 선택과 결과 후 유지/수정':domain==='sequential'?'선택한 방법의 준비·중간·마무리 차례 구성':domain==='simultaneous'?'사람·책·장소·방법의 관계 연결 후 장면 선택':'그림에서 필요한 사람·시간/종이 단서 탐색 후 적용',allowed:practiceMethods(cid).map(x=>({id:x.id,text:kidKo[x.key],outcome:kidKo[practiceOutcome(x.id)]})),evidence:phases(domain),help:'질문 하나를 그림 도움으로 교체, 선택 대신 수행하지 않음',completion:'엔진이 단계별 조작 기록을 검증한 뒤에만 action을 저장. 자유 표현과 능력 평가 아님'};}
