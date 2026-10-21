import {AXES,DEMOS,resolveTraining,validateAssessment} from '../official/adaptive/engine';
import type {Axis,Card,Command,Evidence,LabState,Run,Student,Target} from './model';
export const STORAGE_KEY='nuvia:enhancement:synthetic:v1';
export const uid=()=>crypto.randomUUID();
export const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const text=(s:unknown,max=1000)=>typeof s==='string'&&s.length<=max;
const requireText=(s:unknown,label:string,max=1000)=>{if(!text(s,max)||!String(s).trim())throw Error(`${label}을 적어 주세요.`);return String(s).trim();};
const number=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
export const freshEvidence=(round:number):Evidence=>({round,planConfirmed:false,planChanged:false,actionSelected:false,linksConfirmed:false,stepsConfirmed:false,progressed:[],skipped:false});
export function planSnapshot(c:Card){const {history,evidence,...plan}=c;return JSON.stringify(plan);}
export function newCard(round=0,changes:Partial<Card>={}):Card{
 return {id:uid(),title:'발표 자료 준비하기',subject:'프로젝트',goal:'듣는 사람이 핵심을 이해할 발표',scope:'',firstAction:'',method:'',condition:'',alternative:'',reflection:'',minutes:25,date:today(),startTime:'16:00',deadline:'',middleDeadline:'',owner:'나',dependency:'',waiting:false,handoff:'',domain:'학습',status:'planned',steps:[],links:[],linkItems:{},relationship:'',evidence:freshEvidence(round),history:[],repeat:'none',...changes};
}
function synthetic(id:'student-a'|'student-b'):Student {
 const assessment=structuredClone(DEMOS[id==='student-a'?0:1]);
 assessment.subjectId=id;assessment.assessmentId=`synthetic-${id}`;assessment.educationStage='middle';
 return {id,name:id==='student-a'?'가상 학생 가':'가상 학생 나',stage:'middle',assessment,difficulty:'planning',round:0,creditedPractices:[],supportChoice:'official',reduceHelp:false,dailyCapacity:90,cards:[],runs:[],experiences:[],methods:[],goals:[],joined:[],campDays:{},comparison:'',comparisonNote:'',exploration:{first:'',second:'',common:'',different:'',question:'',action:''}};
}
export function createLab():LabState{
 const a=synthetic('student-a'),b=synthetic('student-b');
 b.assessment=null;b.difficulty='attention';
 a.cards=[newCard(0,{title:'자료 읽고 핵심 고르기',scope:'자료 한 쪽',minutes:10,status:'done'}),newCard(0,{startTime:'16:10'})];
 a.cards[0].history=[{at:new Date().toISOString(),reason:'합성 선반 예시 · 실제 수행 기록 아님',plan:planSnapshot(a.cards[0])}];
 return {schema:'nuvia-enhancement-1',owner:'synthetic-lab-only',labId:uid(),active:'student-a',language:'ko',students:{'student-a':a,'student-b':b},lessons:[],shared:[],requests:[]};
}
export function routeFor(s:Student):{target:Target;support:Axis|'universal'|'none';targets:Axis[];warning:string;creditAllowed:boolean}{
 let warning='',creditAllowed=true,target:Target='integrated',support:Axis|'universal'|'none'='universal',targets:Axis[]=[];
 if(s.assessment){
  try{
   const a=validateAssessment(s.assessment);
   if(s.officialType&&AXES.some(x=>s.officialType!.axes[x]!==a.axes[x].level))throw Error('공식 유형 식별정보와 네 영역이 맞지 않아요. 연결 기준을 확인하기 전 일반 도움만 제공합니다.');
   const lows=AXES.filter(x=>a.axes[x].level==='low');
   if(lows.length>1&&(!a.supportOrder||lows.some(x=>!a.supportOrder!.includes(x))))throw Error('복수 지원 대상의 공식 지원 순서가 없습니다. 임의 순환하지 않고 연결 기준 확인을 기다립니다.');
   const r=resolveTraining(a,s.round);
   target=r.route==='integrated'?'integrated':r.target;
   const highs=AXES.filter(x=>a.axes[x].level==='high'&&x!==target);
   support=(a.strengthOrder??highs).find(x=>highs.includes(x))??'universal';
   targets=lows.length?(a.supportOrder??lows).filter(x=>lows.includes(x)):[];
   if(highs.length>1&&(!a.strengthOrder||highs.some(x=>!a.strengthOrder!.includes(x))))warning='강점이 여러 개이고 공식 강점 순서가 없어 짧은 공통 안내를 제공합니다.';
   if(warning)support='universal';
  }catch(e){warning=(e as Error).message;creditAllowed=false;target='integrated';support='universal';}
 }else{target=s.difficulty;warning='검사 없는 일반 수업 시연 · 선택한 어려움은 공식 검사 결과가 아닙니다.';}
 if(s.supportChoice!=='official')support=s.supportChoice;
 return {target,support,targets,warning,creditAllowed};
}
export function elapsed(r:Run,now=Date.now()){
 return r.segments.reduce((sum,x)=>sum+Math.max(0,Date.parse(x.end)-Date.parse(x.start)),0)+(r.runningSince?Math.max(0,now-Date.parse(r.runningSince)):0);
}
export const remaining=(r:Run,now=Date.now())=>Math.max(0,Math.ceil((r.budgetMinutes*60000-elapsed(r,now))/1000));
export function capacity(s:Student,date=today()){
 const cards=s.cards.filter(c=>c.date===date),done=cards.filter(c=>c.status==='done').reduce((n,c)=>n+c.minutes,0),pending=cards.filter(c=>c.status!=='done').reduce((n,c)=>n+c.minutes,0);
 return {done,pending,free:Math.max(0,s.dailyCapacity-done-pending),total:done+pending,capacity:s.dailyCapacity,over:Math.max(0,done+pending-s.dailyCapacity)};
}
export function evidenceReady(c:Card,r:Run){
 const e=c.evidence;if(e.round!==r.round||e.skipped)return false;
 switch(r.target){
 case 'planning':return (e.planConfirmed||e.planChanged)&&!!c.scope.trim()&&!!c.firstAction.trim();
 case 'attention':return e.actionSelected&&!!c.firstAction.trim();
 case 'simultaneous':return e.linksConfirmed&&new Set(c.links).size>=2&&c.links.every(k=>!!c.linkItems[k]?.trim())&&!!c.relationship.trim();
 case 'successive':return e.stepsConfirmed&&c.steps.filter(x=>x.title.trim()).length>=2&&e.progressed.some(id=>c.steps.some(x=>x.id===id&&x.done));
 default:return e.planConfirmed||e.planChanged;
 }
}
const cardFields=new Set(['title','subject','goal','scope','firstAction','method','condition','alternative','reflection','minutes','date','startTime','deadline','middleDeadline','owner','dependency','waiting','handoff','domain','steps','links','linkItems','relationship']);
function resetEvidence(c:Card,s:Student){if(c.evidence.round!==s.round)c.evidence=freshEvidence(s.round);}
function archive(c:Card,at:string,reason:string){c.history.push({at,reason,plan:planSnapshot(c)});}
function reflow(s:Student,date:string,at:string){
 const cards=s.cards.filter(c=>c.date===date);if(!cards.length)return;
 let minute=Math.min(...cards.map(c=>Number(c.startTime.slice(0,2))*60+Number(c.startTime.slice(3))));
 for(const c of cards){if(minute>1439)throw Error('하루 안에 시작 시각을 배치할 수 없어요. 날짜나 분량을 먼저 조정해 주세요.');
  c.startTime=`${Math.floor(minute/60).toString().padStart(2,'0')}:${(minute%60).toString().padStart(2,'0')}`;minute+=c.minutes;
 }
}
function stop(r:Run,at:string){if(r.runningSince){r.segments.push({start:r.runningSince,end:at});r.runningSince='';}}
function activeStudent(state:LabState){if(state.active==='teacher')throw Error('개인 행동카드는 학생 시연에서 열어 주세요.');return state.students[state.active];}
function onlyTeacher(state:LabState){if(state.active!=='teacher')throw Error('교사 시연에서 사용할 수 있어요.');}
function getCard(s:Student,id:string){const c=s.cards.find(x=>x.id===id);if(!c)throw Error('내 행동카드를 찾지 못했어요.');return c;}
function getRun(s:Student,id:string){const r=s.runs.find(x=>x.id===id);if(!r)throw Error('내 실행 기록을 찾지 못했어요.');return r;}
function start(s:Student,c:Card,at:string,practiceId?:string,previous?:Run,budget?:number){
 const inProgress=s.runs.find(r=>r.phase!=='closed');
 if(inProgress){if(inProgress.cardId===c.id)return;throw Error('현재 실행을 마치거나 이어가 주세요. 한 번에 한 블록만 실행합니다.');}
 const route=routeFor(s);
 const r:Run={id:uid(),practiceId:practiceId??uid(),cardId:c.id,round:previous?.round??s.round,target:previous?.target??route.target,support:route.support,phase:'running',startedAt:at,runningSince:at,segments:[],budgetMinutes:budget??c.minutes,flag:previous?.flag??'',thoughts:'',returns:0,initialPlan:planSnapshot(c),reflection:'',nextMethod:'',feelingBefore:'',feelingAfter:'',helpRequested:false,supportHistory:[{at,support:route.support,reduced:s.reduceHelp}]};
 s.runs.push(r);
}
export function apply(state:LabState,cmd:Command,at=new Date().toISOString(),qa=false):LabState {
 const n=structuredClone(state);
 if(cmd.type==='role'){if(!['teacher','student-a','student-b'].includes(cmd.actor))throw Error('합성 시연 역할을 선택해 주세요.');n.active=cmd.actor;return n;}
 if(cmd.type==='language'){if(!['ko','en','km','ar'].includes(cmd.language))throw Error('지원 언어를 확인해 주세요.');n.language=cmd.language;return n;}
 if(cmd.type.startsWith('lesson.')&&['lesson.create','lesson.update','lesson.publish','lesson.end'].includes(cmd.type)){
  onlyTeacher(n);
  if(cmd.type==='lesson.create'){
   if(!['45','90','overnight'].includes(cmd.template))throw Error('수업 템플릿을 선택해 주세요.');
   const startDate=at.slice(0,10),endDate=cmd.template==='overnight'?new Date(Date.parse(startDate+'T12:00:00Z')+86400000).toISOString().slice(0,10):startDate;
   n.lessons.push({id:uid(),title:requireText(cmd.title,'수업 이름',160),code:uid().slice(0,6).toUpperCase(),template:cmd.template,minutes:cmd.minutes??(cmd.template==='45'?45:cmd.template==='90'?90:480),startDate,endDate,activities:cmd.activities?.trim()||(cmd.template==='overnight'?'첫날: 결과와 경험 비교 → 카드 → 짧은 실행 → 다음 위치 남기기\n둘째날: 복귀 → 수정 → 재실행 → 다음 주 행동 1~2개':'결과와 경험 비교 → 행동카드 하나 → 실행 한 번 → 돌아보기 → 일상 한 걸음'),published:false,ended:false,members:[],createdAt:at});return n;
  }
  const l=n.lessons.find(x=>x.id===cmd.lessonId);if(!l)throw Error('수업을 찾지 못했어요.');
  if(cmd.type==='lesson.update'){if(l.ended)throw Error('종료한 수업입니다.');for(const k of ['title','minutes','activities','startDate','endDate'] as const)if(cmd.changes?.[k]!==undefined)(l as any)[k]=cmd.changes[k];}
  if(cmd.type==='lesson.publish'){if(l.ended)throw Error('종료한 수업입니다.');l.published=true;}
  if(cmd.type==='lesson.end'){l.ended=true;n.shared=n.shared.filter(x=>x.classId!==l.id);n.requests=n.requests.filter(x=>x.classId!==l.id);}
  return n;
 }
 if(cmd.type==='feedback.save'){
  onlyTeacher(n);const share=n.shared.find(x=>x.id===cmd.shareId),lesson=n.lessons.find(x=>x.id===share?.classId);
  if(!share||!lesson||lesson.ended)throw Error('철회되었거나 종료된 공유입니다.');
  share.feedback.push({id:uid(),text:requireText(cmd.text,'피드백'),nextDate:cmd.nextDate??'',at});return n;
 }
 if(cmd.type==='help.answer'){
  onlyTeacher(n);const req=n.requests.find(x=>x.id===cmd.requestId);if(!req||!n.lessons.some(x=>x.id===req.classId&&!x.ended))throw Error('요청을 찾지 못했어요.');
  req.answer=requireText(cmd.answer,'답변');req.nextDate=cmd.nextDate??'';req.status='answered';return n;
 }
 const s=activeStudent(n);
 switch(cmd.type){
 case 'student.settings':
  for(const k of ['dailyCapacity','supportChoice','reduceHelp','difficulty'])if(cmd.changes?.[k]!==undefined)(s as any)[k]=cmd.changes[k];
  if('supportChoice' in (cmd.changes??{})||'reduceHelp' in (cmd.changes??{}))for(const r of s.runs.filter(x=>x.phase!=='closed')){r.support=routeFor(s).support;r.supportHistory.push({at,support:r.support,reduced:s.reduceHelp});}
  break;
 case 'student.general':
  if(s.runs.some(x=>x.phase!=='closed'))throw Error('현재 실행을 마친 뒤 일반 수업 시연으로 전환해 주세요.');
  s.assessment=null;s.officialType=undefined;s.round=0;s.creditedPractices=[];for(const c of s.cards)c.evidence=freshEvidence(0);break;
 case 'student.comparison':
  if(!['agree','different','unsure'].includes(cmd.value))throw Error('내 경험과 비교해 선택해 주세요.');
  s.comparison=cmd.value;s.comparisonNote=cmd.note??'';break;
 case 'student.exploration':s.exploration={...s.exploration,...cmd.changes};break;
 case 'card.create':{
  if(s.cards.length>=500)throw Error('카드를 먼저 정리해 주세요.');
  const c=newCard(s.round,{title:cmd.title?.trim()||'발표 자료 준비하기',subject:cmd.subject??'프로젝트',minutes:cmd.minutes??25,scope:cmd.scope??'',goal:cmd.goal??'듣는 사람이 핵심을 이해할 발표',date:cmd.date??today()});
  archive(c,at,'최초 계획');s.cards.push(c);break;
 }
 case 'card.update':{
  const c=getCard(s,cmd.cardId);resetEvidence(c,s);archive(c,at,'수정 전 계획');
  const changedPlan=Object.entries(cmd.changes??{}).some(([k,v])=>['scope','minutes'].includes(k)&&(c as any)[k]!==v);
  for(const [k,v] of Object.entries(cmd.changes??{})){if(!cardFields.has(k))throw Error('변경할 수 없는 카드 속성입니다.');(c as any)[k]=v;}
  if(changedPlan){c.evidence.planChanged=true;c.evidence.skipped=false;}
  if(Object.keys(cmd.changes??{}).some(k=>['scope','minutes','firstAction','goal'].includes(k)))c.evidence.planConfirmed=false;
  if('firstAction' in (cmd.changes??{}))c.evidence.actionSelected=false;
  if('steps' in (cmd.changes??{})){c.evidence.stepsConfirmed=false;c.evidence.progressed=[];}
  if('links' in (cmd.changes??{})||'linkItems' in (cmd.changes??{})||'relationship' in (cmd.changes??{}))c.evidence.linksConfirmed=false;
  archive(c,at,'수정 계획');break;
 }
 case 'card.move':{
  const i=s.cards.findIndex(c=>c.id===cmd.cardId);if(i<0)break;
  const day=s.cards.filter(c=>c.date===s.cards[i].date),di=day.findIndex(c=>c.id===cmd.cardId),other=day[di+cmd.direction];
  if(!other)break;const j=s.cards.findIndex(c=>c.id===other.id);
  [s.cards[i],s.cards[j]]=[s.cards[j],s.cards[i]];resetEvidence(s.cards[j],s);s.cards[j].evidence.planChanged=true;reflow(s,s.cards[j].date,at);archive(s.cards[j],at,'과제 순서 변경');break;
 }
 case 'card.repeat':{const c=getCard(s,cmd.cardId);if(!['none','daily','weekdays'].includes(cmd.repeat))throw Error('반복 간격 오류');c.repeat=cmd.repeat;break;}
 case 'card.plan':{const c=getCard(s,cmd.cardId);resetEvidence(c,s);if(!c.scope.trim()||!c.firstAction.trim())throw Error('오늘 분량과 첫 행동을 정해 주세요. 바로 시작은 언제든 가능합니다.');c.evidence.planConfirmed=true;c.evidence.skipped=false;archive(c,at,'학생이 계획 확정');break;}
 case 'card.action':{const c=getCard(s,cmd.cardId);resetEvidence(c,s);c.firstAction=requireText(cmd.action,'지금 할 행동',160);c.evidence.actionSelected=true;c.evidence.skipped=false;archive(c,at,'현재 행동 선택');break;}
 case 'card.links':{
  const c=getCard(s,cmd.cardId);resetEvidence(c,s);
  const allowed=['목표','마감','자료','준비물','결과물','관련 과제'];
  if(!Array.isArray(cmd.links)||new Set(cmd.links).size<2||cmd.links.some((x:string)=>!allowed.includes(x)))throw Error('서로 다른 실제 항목 두 개 이상을 선택해 주세요.');
  const items=cmd.items??c.linkItems;
  if(cmd.links.some((k:string)=>!text(items[k],500)||!items[k].trim()))throw Error('선택한 항목에 실제 목표·자료 등의 내용을 적어 주세요.');
  c.links=[...new Set(cmd.links)] as string[];c.linkItems=Object.fromEntries(c.links.map(k=>[k,items[k].trim()]));c.relationship=requireText(cmd.relationship,'두 항목의 관계',500);c.evidence.linksConfirmed=true;c.evidence.skipped=false;archive(c,at,'관계 직접 확인');break;
 }
 case 'card.steps':{
  const c=getCard(s,cmd.cardId);resetEvidence(c,s);
  if(!Array.isArray(cmd.steps)||cmd.steps.length<2||cmd.steps.some((x:any)=>!text(x.title,160)||!x.title.trim()))throw Error('실제 단계 두 개 이상을 적어 확정해 주세요.');
  c.steps=cmd.steps.map((x:any)=>({id:x.id||uid(),title:x.title.trim(),done:!!x.done}));c.evidence.stepsConfirmed=true;c.evidence.progressed=[];c.evidence.skipped=false;archive(c,at,'과제 내부 단계 확정');break;
 }
 case 'card.progress':{
  const c=getCard(s,cmd.cardId);resetEvidence(c,s);
  if(!c.evidence.stepsConfirmed)throw Error('단계 순서를 먼저 확정해 주세요.');
  const step=c.steps.find(x=>x.id===cmd.stepId);if(!step)throw Error('단계가 없습니다.');
  step.done=!step.done;c.evidence.progressed=step.done?[...new Set([...c.evidence.progressed,step.id])]:c.evidence.progressed.filter(x=>x!==step.id);break;
 }
 case 'card.skip':{const c=getCard(s,cmd.cardId);resetEvidence(c,s);c.evidence.skipped=true;break;}
 case 'run.start':{
  const c=getCard(s,cmd.cardId);if(c.status==='done')throw Error('완료한 카드는 새 행동카드로 만들어 다시 해보세요.');
  if(cmd.smallAction){resetEvidence(c,s);c.firstAction=requireText(cmd.smallAction,'내가 고른 첫 행동',160);if(routeFor(s).target==='attention')c.evidence.actionSelected=true;}
  start(s,c,at);const r=s.runs.at(-1)!;if(cmd.feelingBefore)r.feelingBefore=cmd.feelingBefore;break;
 }
 case 'run.pause':{const r=getRun(s,cmd.runId);if(r.phase!=='running')throw Error('실행 중에 멈출 수 있어요.');stop(r,at);r.phase='paused';break;}
 case 'run.flag':{const r=getRun(s,cmd.runId);r.flag=cmd.flag??'';break;}
 case 'run.thought':{const r=getRun(s,cmd.runId);r.thoughts=cmd.thought??'';break;}
 case 'run.resume':{
  const r=getRun(s,cmd.runId);if(!['paused','review'].includes(r.phase))throw Error('멈춘 실행을 선택해 주세요.');
  if(s.runs.some(x=>x.id!==r.id&&x.phase!=='closed'))throw Error('다른 실행을 먼저 마쳐 주세요.');
  if(r.phase==='paused')r.returns++;r.phase='running';r.runningSince=at;break;
 }
 case 'run.review':{
  const r=getRun(s,cmd.runId);if(!['running','paused'].includes(r.phase))throw Error('현재 실행을 선택해 주세요.');
  stop(r,at);r.phase='review';break;
 }
 case 'run.close':{
  const r=getRun(s,cmd.runId);if(r.phase==='closed')return state;
  if(r.phase!=='review')throw Error('실행 종료 후 기록에서 선택해 주세요.');
  if(!['yes','no'].includes(cmd.completion)||cmd.completion==='no'&&!['five','next','today'].includes(cmd.next))throw Error('과제 완료 여부와 다음 선택을 직접 골라 주세요.');
  const c=getCard(s,r.cardId),ready=evidenceReady(c,r);
  r.actualMinutes=cmd.actualMinutes??Math.round(elapsed(r)/600)/100;
  if(!number(r.actualMinutes,0,100000))throw Error('실제 시간을 확인해 주세요.');
  r.completion=cmd.completion;r.reflection=cmd.reflection??'';r.nextMethod=cmd.nextMethod??'';r.feelingAfter=cmd.feelingAfter??'';r.phase='closed';
  if(r.reflection)c.reflection=r.reflection;
  r.evidenceStatus=c.evidence.skipped?'skipped':ready&&routeFor(s).creditAllowed?'performed':'unobserved';
  if(r.target==='attention'&&cmd.optionalAttention)r.optionalAttention=cmd.optionalAttention;
  const safeRoute=routeFor(s);const blocked=!safeRoute.creditAllowed;
  if(ready&&!blocked&&!s.creditedPractices.includes(r.practiceId)&&r.round===s.round){s.creditedPractices.push(r.practiceId);s.round++;}
  const facts=['실행을 직접 마쳤어요',...(r.returns?['멈춘 뒤 다시 이어갔어요']:[]),...(c.history.filter(x=>x.reason==='수정 계획').length?['계획을 직접 고쳤어요']:[]),...(r.helpRequested?['도움을 요청했어요']:[])];
  for(const fact of facts)s.experiences.push({id:uid(),cardId:c.id,runId:r.id,fact,situation:'',role:'',action:'',result:'',selected:false,createdAt:at});
  if(cmd.completion==='yes'){
   c.status='done';
   if(c.repeat!=='none'){
    const date=new Date((c.date||today())+'T12:00:00');do{date.setDate(date.getDate()+1);}while(c.repeat==='weekdays'&&[0,6].includes(date.getDay()));
    const copy=newCard(s.round,{title:c.title,subject:c.subject,goal:c.goal,scope:c.scope,minutes:c.minutes,date:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,repeat:c.repeat,steps:c.steps.map(x=>({...x,id:uid(),done:false}))});
    archive(copy,at,'완료 후 반복 계획');s.cards.push(copy);
   }
  }else if(cmd.next==='five'){start(s,c,at,r.practiceId,r,5);}
  else if(cmd.next==='next'){
   const copy=newCard(s.round,{title:c.title,subject:c.subject,goal:c.goal,scope:c.scope,firstAction:r.flag||c.firstAction,minutes:c.minutes,date:c.date});archive(copy,at,'남은 일의 다음 블록');s.cards.push(copy);
  }
  break;
 }
 case 'method.save':{
  const r=getRun(s,cmd.runId);if(r.phase!=='closed')throw Error('실행을 마친 뒤 방법을 돌아봐 주세요.');
  if(!['yes','no','unsure'].includes(cmd.helpful))throw Error('주관적인 도움 여부를 선택해 주세요.');
  const m={id:uid(),name:requireText(cmd.name,'방법 이름',160),support:r.support,helpful:cmd.helpful,note:cmd.note??'',runId:r.id};
  const prev=s.methods.find(x=>x.runId===r.id);if(prev)Object.assign(prev,{...m,id:prev.id});else s.methods.push(m);break;
 }
 case 'method.choose':{
  const m=s.methods.find(x=>x.id===cmd.methodId);if(!m)throw Error('내 방법을 선택해 주세요.');const c=getCard(s,cmd.cardId);c.method=m.name;s.supportChoice=m.support==='universal'?'official':m.support;archive(c,at,'내 방법 선택');break;
 }
 case 'goal.save':{
  const g={id:cmd.id||uid(),far:requireText(cmd.far,'먼 목표',160),middle:requireText(cmd.middle,'중간 목표',160),weekly:requireText(cmd.weekly,'이번 주 행동',160),date:cmd.date||today(),status:cmd.status??'active' as const};
  const previous=s.goals.find(x=>x.id===g.id);if(previous)Object.assign(previous,g);else s.goals.push(g);break;
 }
 case 'goal.schedule':{
  const g=s.goals.find(x=>x.id===cmd.goalId);if(!g)throw Error('목표를 먼저 저장해 주세요.');if(g.cardId&&s.cards.some(x=>x.id===g.cardId))break;
  const c=newCard(s.round,{title:g.weekly,goal:g.middle,scope:g.weekly,date:g.date,minutes:20});archive(c,at,'학생이 선택한 이번 주 한 걸음');s.cards.push(c);g.cardId=c.id;break;
 }
 case 'experience.save':{
  const exp=s.experiences.find(x=>x.id===cmd.id);
  if(exp){for(const k of ['situation','role','action','result','selected'] as const)if(cmd[k]!==undefined)(exp as any)[k]=cmd[k];}
  else{
   const r=getRun(s,cmd.runId);if(r.phase!=='closed')throw Error('실제로 마친 실행에서 경험을 골라 주세요.');
   s.experiences.push({id:uid(),runId:r.id,cardId:r.cardId,fact:'내가 선택해 정리한 경험',situation:cmd.situation??'',role:cmd.role??'',action:cmd.action??'',result:cmd.result??'',selected:!!cmd.selected,createdAt:at});
  }break;
 }
 case 'lesson.join':{
  const l=n.lessons.find(x=>x.code===String(cmd.code).trim().toUpperCase()&&x.published&&!x.ended);if(!l)throw Error('참여 가능한 합성 수업 코드를 확인해 주세요.');
  if(!s.joined.includes(l.id))s.joined.push(l.id);if(!l.members.includes(s.id))l.members.push(s.id);break;
 }
 case 'lesson.leave':{
  s.joined=s.joined.filter(x=>x!==cmd.lessonId);const l=n.lessons.find(x=>x.id===cmd.lessonId);if(l)l.members=l.members.filter(x=>x!==s.id);
  n.shared=n.shared.filter(x=>!(x.classId===cmd.lessonId&&x.studentId===s.id));n.requests=n.requests.filter(x=>!(x.classId===cmd.lessonId&&x.studentId===s.id));break;
 }
 case 'lesson.card':{
  const l=n.lessons.find(x=>x.id===cmd.lessonId&&x.published&&!x.ended);if(!l||!s.joined.includes(l.id))throw Error('참여 중인 수업에서 열어 주세요.');
   if(s.cards.some(x=>x.sourceClassId===l.id))break;
   if(cmd.cardId){const c=getCard(s,cmd.cardId);if(c.sourceClassId||c.status==='done')throw Error('연결할 수 있는 내 예정 과제를 골라 주세요.');c.sourceClassId=l.id;archive(c,at,'기존 개인 과제에 수업 활동 연결');}
   else{const c=newCard(s.round,{sourceClassId:l.id});archive(c,at,'수업에서 개인 행동카드로 연결');s.cards.push(c);}break;
 }
 case 'lesson.day':{
  if(!s.joined.includes(cmd.lessonId)||!n.lessons.some(x=>x.id===cmd.lessonId&&!x.ended&&x.template==='overnight')||![1,2].includes(cmd.day))throw Error('참여 중인 1박2일 캠프를 선택해 주세요.');
  s.campDays[cmd.lessonId]=cmd.day;break;
 }
 case 'share.save':{
  const l=n.lessons.find(x=>x.id===cmd.lessonId&&!x.ended);if(!l||!s.joined.includes(l.id))throw Error('참여 중인 수업에서만 공유할 수 있어요.');
  const c=getCard(s,cmd.cardId),fields:Record<string,string>={};
  for(const k of ['goal','method','reflection'] as const)if(cmd.fields?.[k])fields[k]=c[k];
  if(cmd.fields?.experience){const e=s.experiences.find(x=>x.id===cmd.fields.experience&&x.cardId===c.id);if(!e)throw Error('내 경험을 선택해 주세요.');fields.experience=[e.situation,e.role,e.action,e.result].filter(Boolean).join(' · ');}
  if(!Object.keys(fields).length)throw Error('미리보기에서 공유할 항목을 하나 이상 골라 주세요.');
  const previous=n.shared.find(x=>x.studentId===s.id&&x.classId===l.id&&x.cardId===c.id);
  if(previous){previous.fields=fields;previous.at=at;}
  else n.shared.push({id:uid(),classId:l.id,studentId:s.id,cardId:c.id,title:c.title,fields,at,feedback:[]});break;
 }
 case 'share.withdraw':{n.shared=n.shared.filter(x=>!(x.id===cmd.shareId&&x.studentId===s.id));break;}
 case 'help.create':{
  if(!s.joined.includes(cmd.lessonId)||!n.lessons.some(x=>x.id===cmd.lessonId&&!x.ended))throw Error('참여 중인 수업을 선택해 주세요.');
  const c=getCard(s,cmd.cardId);
  n.requests.push({id:uid(),studentId:s.id,classId:cmd.lessonId,cardId:c.id,point:requireText(cmd.point,'막힌 지점',300),need:requireText(cmd.need,'필요한 도움',300),status:'open',answer:'',nextDate:''});
  const r=s.runs.find(x=>x.cardId===c.id&&x.phase!=='closed');if(r)r.helpRequested=true;break;
 }
 case 'qa.profile':{
  if(!qa)throw Error('명시적인 비교 모드에서만 프로필을 전환할 수 있어요.');
  if(s.runs.some(x=>x.phase!=='closed'))throw Error('현재 실행을 마친 후 비교해 주세요.');
  s.stage=cmd.stage??s.stage;s.round=0;s.creditedPractices=[];
  s.assessment=cmd.withoutAssessment?null:validateAssessment({...DEMOS[0],assessmentId:`synthetic-${s.id}`,subjectId:s.id,educationStage:s.stage,axes:Object.fromEntries(AXES.map(axis=>[axis,{level:cmd.axes?.[axis]??'mid',value:cmd.axes?.[axis]==='low'?42:cmd.axes?.[axis]==='high'?76:60,unit:'%'}])),supportOrder:cmd.supportOrder,strengthOrder:cmd.strengthOrder});
  s.officialType=cmd.officialType;
  for(const c of s.cards)c.evidence=freshEvidence(0);break;
 }
 default:throw Error('아직 연결되지 않은 조작입니다.');
 }
 return n;
}
