import type {CognitivePractice} from './CognitiveActivity';
import {validateTransfer,profileKey, type Assessment, type Band, type TrainingRecord} from './engine';
export type Mode='demo'|'production';
export interface Step {id:string;title:string;done:boolean;date:string;}
export interface Material {id:string;title:string;done:boolean;}
export interface PlannerTask {repeat?:'daily'|'weekdays'|'none';repeatOf?:string;transferUsed?:boolean;domain?:'학습'|'생활'|'업무';deadline?:string;practice?:CognitivePractice;id:string;title:string;subject:string;date:string;minutes:number;owner:string;dependsOn:string;waiting:boolean;steps:Step[];materials:Material[];status:'planned'|'active'|'paused'|'done';resumeNote:string;startedAt:string;completedAt:string;actualMinutes:number|null;help:'none'|'some';adjustment:string;}
export type FocusRoute='picture_routine'|'step_card'|'subject_scope'|'deadline_triage'|'handoff';
export type DeadlineDecision='continue'|'split'|'defer';
export type TimeAdjustment='reduce'|'split'|'same';
export type RescheduleChoice='today'|'tomorrow'|'week';
export interface PlannerTask {focusRoute?:FocusRoute;routeConfirmed?:boolean;learningScope?:string;remainingScope?:string;nextTenAction?:string;deadlineDecision?:DeadlineDecision;handoffState?:'now'|'waiting'|'check';timeAdjustment?:TimeAdjustment;planningReference?:TimeAdjustment;rescheduleChoice?:RescheduleChoice;rescheduledAt?:string;}
export interface Workspace {lastWeeklyReviewWeek?:string;elementaryLevel?:'lower'|'upper';demoExampleLoaded?:boolean;schemaVersion:'2.0';scope:string;tasks:PlannerTask[];records:TrainingRecord[];dailyCapacity:number;weeklyNote:string;}
export const uid=()=>globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function localDate(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function scopeFor(mode:Mode,a:Assessment,band:Band){return JSON.stringify([mode,profileKey(a),band,...(a.educationStage==='elementary_1_3'?['lower']:[])]);}
export function blankWorkspace(scope:string):Workspace{return {schemaVersion:'2.0',scope,tasks:[],records:[],dailyCapacity:120,weeklyNote:''};}
export function createTask(title:string,first:string):PlannerTask{return {id:uid(),title:title.trim(),subject:'',date:localDate(),minutes:20,owner:'나',dependsOn:'',waiting:false,steps:[{id:uid(),title:first.trim(),done:false,date:''}],materials:[],status:'planned',resumeNote:'',startedAt:'',completedAt:'',actualMinutes:null,help:'none',adjustment:''};}
export function dependencyBlocked(t:PlannerTask,tasks:PlannerTask[]){return !!t.dependsOn&&tasks.find(x=>x.id===t.dependsOn)?.status!=='done';}
export function canDependOn(tasks:PlannerTask[],taskId:string,dependencyId:string){
 let id=dependencyId;const visited=new Set<string>([taskId]);
 while(id){if(visited.has(id))return false;visited.add(id);const task=tasks.find(t=>t.id===id);if(!task)return false;id=task.dependsOn;}
 return true;
}
export function storageKey(scope:string){return 'nuvia-planner:2.0:'+scope;}
/** Uses the exact same JSON and validation route as a downloaded backup. */
export function verifyBackupRoundTrip(workspace:Workspace,scope:string){
 const restored=restoreWorkspaceJson(exportWorkspaceJson(workspace),scope);
 const stable=JSON.stringify(restored)===JSON.stringify(workspace);
 if(!stable)throw new Error('백업 왕복 뒤 자료가 달라졌어요.');
 return restored;
}
export function exportWorkspaceJson(workspace:Workspace,pretty=false){return JSON.stringify(workspace,null,pretty?2:undefined);}
export function restoreWorkspaceJson(json:string,scope:string):Workspace {
 let raw:unknown;
 try{raw=JSON.parse(json);}catch{throw new Error('백업 JSON이 손상되었거나 잘못된 형식이에요.');}
 return validateWorkspace(raw,scope);
}
const text=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max;
const date=(v:unknown)=>v===''||(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);
const number=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
export function validateWorkspace(raw:unknown,scope:string):Workspace {
 const w=raw as Workspace;
 if(!w||w.schemaVersion!=='2.0'||w.scope!==scope)throw new Error('현재 프로필·학년에서 만든 2.0 백업 파일을 선택해 주세요.');
 if(!Array.isArray(w.tasks)||w.tasks.length>500||!Array.isArray(w.records)||w.records.length>5000||!number(w.dailyCapacity,1,1440)||!text(w.weeklyNote,1000))throw new Error('저장 자료의 크기나 형식이 올바르지 않아요.');
 if(w.elementaryLevel!==undefined&&!['lower','upper'].includes(w.elementaryLevel))throw new Error('초등 단계 오류');
 if(w.demoExampleLoaded!==undefined&&typeof w.demoExampleLoaded!=='boolean')throw new Error('데모 예시 기록 상태 오류');
 if(w.lastWeeklyReviewWeek!==undefined&&!date(w.lastWeeklyReviewWeek))throw new Error('주간 리뷰 날짜 오류');
 const ids=new Set<string>();
 for(const t of w.tasks){
  if(!t||!text(t.id,160)||!t.id||ids.has(t.id)||!text(t.title,160)||!t.title.trim()||!text(t.subject,80)||!date(t.date)||!number(t.minutes,1,1440)||!text(t.owner,80)||!text(t.dependsOn,160)||typeof t.waiting!=='boolean'||!['planned','active','paused','done'].includes(t.status)||!text(t.resumeNote,500)||!text(t.startedAt,50)||!text(t.completedAt,50)||!(t.actualMinutes===null||number(t.actualMinutes,0,1440))||!['none','some'].includes(t.help)||!text(t.adjustment,500)||!Array.isArray(t.steps)||t.steps.length<1||t.steps.length>50||!Array.isArray(t.materials)||t.materials.length>100)throw new Error('할 일 자료의 형식이 올바르지 않아요.');
  if(t.repeat!==undefined&&!['daily','weekdays','none'].includes(t.repeat))throw new Error('반복 설정 오류');
  if(t.repeatOf!==undefined&&!text(t.repeatOf,160))throw new Error('반복 연결 오류');
  if(t.transferUsed!==undefined&&typeof t.transferUsed!=='boolean')throw new Error('전략 사용 기록 오류');
  if(t.domain!==undefined&&!['학습','생활','업무'].includes(t.domain))throw new Error('과제 영역 오류');
  if(t.deadline!==undefined&&!date(t.deadline))throw new Error('마감 날짜 오류');
  if(t.focusRoute!==undefined&&!['picture_routine','step_card','subject_scope','deadline_triage','handoff'].includes(t.focusRoute))throw new Error('연령별 실행 경로 오류');
  if(t.routeConfirmed!==undefined&&typeof t.routeConfirmed!=='boolean')throw new Error('연령별 확인 오류');
  if(t.learningScope!==undefined&&!text(t.learningScope,160))throw new Error('학습 범위 오류');
  if(t.remainingScope!==undefined&&!text(t.remainingScope,500))throw new Error('남은 범위 오류');
  if(t.nextTenAction!==undefined&&!text(t.nextTenAction,160))throw new Error('다음 행동 오류');
  if(t.deadlineDecision!==undefined&&!['continue','split','defer'].includes(t.deadlineDecision))throw new Error('마감 판단 오류');
  if(t.handoffState!==undefined&&!['now','waiting','check'].includes(t.handoffState))throw new Error('업무 상태 오류');
  if(t.timeAdjustment!==undefined&&!['reduce','split','same'].includes(t.timeAdjustment))throw new Error('시간 조정 선택 오류');
  if(t.planningReference!==undefined&&!['reduce','split','same'].includes(t.planningReference))throw new Error('다음 계획 참고 오류');
  if(t.rescheduleChoice!==undefined&&!['today','tomorrow','week'].includes(t.rescheduleChoice))throw new Error('재배치 선택 오류');
  if(t.rescheduledAt!==undefined&&(!text(t.rescheduledAt,50)||!Number.isFinite(Date.parse(t.rescheduledAt))))throw new Error('재배치 시각 오류');
  if(t.practice){const p=t.practice;if(!text(p.firstId,160)||!['','dependency','deadline','startable'].includes(p.reason)||!['','notifications','materials','park'].includes(p.focusAction)||!text(p.parked,500)||!number(p.returns,0,100000))throw new Error('인지 활동 기록이 올바르지 않아요.');}
  ids.add(t.id);const children=new Set<string>();
  for(const s of [...t.steps,...t.materials]){if(!s||!text(s.id,160)||!s.id||children.has(s.id)||!text(s.title,160)||!s.title.trim()||typeof s.done!=='boolean'||('date' in s&&!date(s.date)))throw new Error('단계·준비물 자료가 올바르지 않아요.');children.add(s.id);}
  if(t.steps.some(s=>!date(s.date)))throw new Error('단계 날짜가 올바르지 않아요.');
  if(t.status==='done'&&(!t.steps.every(s=>s.done)||!t.materials.every(s=>s.done)||t.actualMinutes===null))throw new Error('완료 확인 자료가 빠져 있어요.');
 }
 for(const t of w.tasks)if(!canDependOn(w.tasks,t.id,t.dependsOn))throw new Error('선행 작업이 없거나 서로를 기다리는 관계예요.');
 let parsed:any;try{parsed=JSON.parse(scope);}catch{throw new Error('프로필 정보 오류');}
 const recordIds=new Set<string>();
 for(const r of w.records){
  if(!r||!text(r.id,160)||!r.id||recordIds.has(r.id)||!text(r.createdAt,50)||!Number.isFinite(Date.parse(r.createdAt))||!['real_task','followup_task'].includes(r.kind)||r.source!=='self_report'||!r.context||r.context.mode!==parsed[0]||r.context.profileKey!==parsed[1]||r.context.band!==parsed[2]||r.context.rulesVersion!=='planner-2.0'||!r.measures||Object.values(r.measures).some(v=>!(typeof v==='boolean'||text(v,1000)||number(v,-100000,100000))))throw new Error('현재 프로필과 일치하지 않는 수행 기록이에요.');
  if(r.context.transfer){const tr=validateTransfer(r.context.transfer);if(tr.strategyId!==r.context.strategyId)throw new Error('전략 연결 오류');}
  if(r.kind==='followup_task'&&(!r.context.transfer||r.measures.taskContentStored!==false||!['학습','생활','업무'].includes(String(r.measures.taskDomain))||r.measures.taskDomain===r.measures.previousTaskDomain||!['yes','partial'].includes(String(r.measures.completed))||typeof r.measures.helpCount!=='number'||!Number.isInteger(r.measures.helpCount)||r.measures.helpCount<0||r.measures.helpCount>100))throw new Error('재적용 기록 형식 오류');
  recordIds.add(r.id);
 }
 for(const r of w.records.filter(x=>x.kind==='followup_task')){const previous=w.records.find(x=>x.id===r.measures.previousRecordId&&x.kind==='real_task'&&x.measures.strategyApplied===true);if(!previous||previous.context.transfer?.bridgeId!==r.context.transfer?.bridgeId||previous.context.strategyId!==r.context.strategyId||previous.measures.taskDomain!==r.measures.previousTaskDomain)throw new Error('이전 적용 기록 연결 오류');}
 return structuredClone(w);
}
export function weekDates(){const today=new Date();today.setHours(12,0,0,0);today.setDate(today.getDate()-((today.getDay()+6)%7));return Array.from({length:7},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()+i);return localDate(d);});}
