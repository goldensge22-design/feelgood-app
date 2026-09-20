import {createTask, dependencyBlocked, localDate, uid, type PlannerTask, type Workspace} from './workspace';
import type {Band} from './engine';

export interface TimeBlock {
 startTime:string;
 phase:'ready'|'running'|'paused'|'review'|'closed';
 segments:{start:string;end:string}[];
 runningSince:string;
 endedAt:string;
 completed:boolean|null;
 covered:string;
 nextStart:string;
 comparison:''|'longer'|'similar'|'shorter';
 prepared:boolean;
 chosenStepId:string;
 availableUntil:string;
 handoffNote:string;
 budgetMinutes:number;
 continuationOf?:string;
}
export const newTimeBlock=(startTime='19:00',minutes=25):TimeBlock=>({startTime,phase:'ready',segments:[],runningSince:'',endedAt:'',completed:null,covered:'',nextStart:'',comparison:'',prepared:false,chosenStepId:'',availableUntil:'',handoffNote:'',budgetMinutes:minutes});
/** Keep new blocks anchored while honoring the existing planner's add/delete/reorder operations. */
export function mergeLegacyWorkspace(current:Workspace,next:Workspace):Workspace{
 const queue=[...next.tasks];const tasks=current.tasks.flatMap(t=>t.timeBlock?[t]:(queue.length?[queue.shift()!]:[]));
 return {...next,tasks:[...tasks,...queue]};
}
export function elapsedMilliseconds(t:PlannerTask,now=Date.now()){
 const b=t.timeBlock;if(!b)return 0;
 return b.segments.reduce((n,s)=>n+Math.max(0,Date.parse(s.end)-Date.parse(s.start)),0)+(b.runningSince?Math.max(0,now-Date.parse(b.runningSince)):0);
}
export const actualBlockMinutes=(t:PlannerTask)=>Math.round(elapsedMilliseconds(t)/600)/100;
export const remainingSeconds=(t:PlannerTask,now=Date.now())=>Math.max(0,Math.ceil((t.timeBlock!.budgetMinutes*60000-elapsedMilliseconds(t,now))/1000));
export function stepForBlockStart(t:PlannerTask){
 const remaining=t.steps.filter(s=>!s.done);
 return remaining.find(s=>s.id===t.timeBlock?.chosenStepId)?.id||(remaining.length===1?remaining[0].id:'');
}
export function blockActivityReady(t:PlannerTask,band:Band,lower:boolean){
 const b=t.timeBlock;if(!b)return false;
 if(band==='A')return lower?b.prepared:!!stepForBlockStart(t);
 if(band==='B')return !!t.subject.trim()&&!!t.learningScope?.trim()&&(b.phase!=='paused'||(!!b.nextStart.trim()&&!!t.nextTenAction?.trim()));
 if(band==='C')return t.deadlineDecision==='continue'||(t.deadlineDecision==='split'&&t.steps.length>=2);
 return /^([01]\d|2[0-3]):[0-5]\d$/.test(b.availableUntil)&&b.availableUntil>b.startTime&&t.handoffState==='now';
}
export function extendFiveMinutes(t:PlannerTask,tasks:PlannerTask[],now=new Date().toISOString()){
 const closed=closeTimeBlock(t,false);
 return startTimeBlock({...closed,timeBlock:{...closed.timeBlock!,budgetMinutes:actualBlockMinutes(closed)+5}},tasks,now);
}
export function startTimeBlock(t:PlannerTask,tasks:PlannerTask[],now=new Date().toISOString()):PlannerTask{
 const b=t.timeBlock;
 if(!b||!['ready','paused','closed'].includes(b.phase)||t.status==='done')throw new Error('이 블록은 지금 시작할 수 없어요.');
 const other=tasks.find(x=>x.id!==t.id&&(x.status==='active'||x.timeBlock?.phase==='review'));
 if(other)throw new Error(`“${other.title}”을 먼저 중단하거나 종료 기록을 마쳐 주세요.`);
 if(t.waiting||t.handoffState==='waiting'||t.handoffState==='check'||dependencyBlocked(t,tasks))throw new Error('답변·확인 또는 선행 작업을 기다리는 블록이에요. 시작할 수 있는 상태로 바꿔 주세요.');
 return {...t,status:'active',startedAt:t.startedAt||now,timeBlock:{...b,phase:'running',runningSince:now,completed:null}};
}
export function stopTimeBlock(t:PlannerTask,phase:'paused'|'review',now=new Date().toISOString()):PlannerTask{
 const b=t.timeBlock;if(!b||!['running','paused'].includes(b.phase))throw new Error('시작한 블록을 먼저 선택해 주세요.');
 const segments=b.runningSince?[...b.segments,{start:b.runningSince,end:new Date(Math.max(Date.parse(now),Date.parse(b.runningSince))).toISOString()}]:b.segments;
 const next:PlannerTask={...t,status:'paused',timeBlock:{...b,segments,runningSince:'',phase,endedAt:phase==='review'?now:b.endedAt}};
 return phase==='review'?{...next,actualMinutes:actualBlockMinutes(next)}:next;
}
export function closeTimeBlock(t:PlannerTask,complete:boolean):PlannerTask{
 if(t.timeBlock?.phase!=='review')throw new Error('종료 후 기록에서 완료 여부를 골라 주세요.');
 return {...t,resumeNote:t.timeBlock.nextStart,status:'paused',timeBlock:{...t.timeBlock,phase:'closed',completed:complete},...(complete?{steps:t.steps.map(s=>({...s,done:true})),materials:t.materials.map(m=>({...m,done:true}))}:{})};
}
export function continueTimeBlock(t:PlannerTask,date=localDate()):PlannerTask{
 if(!t.timeBlock)throw new Error('시간 블록이 아니에요.');
 return {...createTask(t.title,t.timeBlock.nextStart||t.steps.find(s=>!s.done)?.title||t.title),subject:t.subject,domain:t.domain,date,minutes:t.minutes,repeat:t.repeat,deadline:t.deadline,learningScope:t.remainingScope||t.learningScope,planningReference:t.timeAdjustment,resumeNote:t.timeBlock.nextStart,
 materials:t.materials.map(m=>({...m,id:uid(),done:false})),timeBlock:{...newTimeBlock(t.timeBlock.startTime,t.minutes),nextStart:t.timeBlock.nextStart,continuationOf:t.id}};
}
const stamp=(s:unknown)=>typeof s==='string'&&s.length<=50&&Number.isFinite(Date.parse(s));
const clock=(s:unknown)=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
/** Used by both file restore and localStorage reload. Timer ticks are never persisted. */
export function validateTimeBlock(t:PlannerTask){
 const b=t.timeBlock;if(b===undefined)return;if(!b||typeof b!=='object')throw new Error('시간 블록 자료 형식 오류');
 const short=(s:unknown,n=500)=>typeof s==='string'&&s.length<=n;
 if(!clock(b.startTime)||!['ready','running','paused','review','closed'].includes(b.phase)||!Array.isArray(b.segments)||b.segments.length>5000||!(b.runningSince===''||stamp(b.runningSince))||!(b.endedAt===''||stamp(b.endedAt))||![true,false,null].includes(b.completed)||!short(b.covered)||!short(b.nextStart)||!['','longer','similar','shorter'].includes(b.comparison)||typeof b.prepared!=='boolean'||!short(b.chosenStepId,160)||!(b.availableUntil===''||clock(b.availableUntil))||!short(b.handoffNote)||!Number.isFinite(b.budgetMinutes)||b.budgetMinutes<1||b.budgetMinutes>100000||!(b.continuationOf===undefined||short(b.continuationOf,160)))throw new Error('시간 블록 자료 형식 오류');
 let end=0;
 for(const s of b.segments){if(!s||!stamp(s.start)||!stamp(s.end)||Date.parse(s.end)<Date.parse(s.start)||Date.parse(s.start)<end)throw new Error('시간 블록 시작·종료 연결 오류');end=Date.parse(s.end);}
 if((b.phase==='running')!==!!b.runningSince||(b.phase==='running')!==(t.status==='active')||(b.runningSince&&Date.parse(b.runningSince)<end)||(b.endedAt&&Date.parse(b.endedAt)<end&&b.phase!=='running'&&b.phase!=='paused')||(b.phase==='ready'&&(b.segments.length||t.startedAt))||(['review','closed'].includes(b.phase)&&(!b.endedAt||t.actualMinutes===null))||(t.status==='done'&&(b.phase!=='closed'||b.completed!==true))||(b.chosenStepId&&!t.steps.some(s=>s.id===b.chosenStepId)))throw new Error('시간 블록 상태·기록 연결 오류');
 if(b.phase==='review'||b.phase==='closed'){if(Math.abs((t.actualMinutes??0)-actualBlockMinutes(t))>0.011)throw new Error('시간 블록 실제 시간 연결 오류');}
}
export function validateTimeBlockWorkspace(w:Workspace){
 w.tasks.forEach(validateTimeBlock);
 if(w.tasks.some(t=>t.timeBlock)&&w.tasks.filter(t=>t.status==='active').length>1)throw new Error('여러 시간 블록을 동시에 실행할 수 없어요.');
 for(const t of w.tasks){const previous=t.timeBlock?.continuationOf;if(previous&&(!w.tasks.some(p=>p.id===previous&&p.timeBlock&&p.id!==t.id)))throw new Error('이전 시간 블록 연결 오류');}
}
