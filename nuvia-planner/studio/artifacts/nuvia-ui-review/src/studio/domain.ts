import {apply as legacy,createLab,routeFor,freshEvidence,newCard,planSnapshot} from '../enhancement/domain';
import {AXIS_NAMES as targetNames,SUPPORT_NAMES as supportNames,STAGE_NAMES as stageNames} from '../enhancement/model';
import type {PersonalState,Action,Meta,Entry} from './model';
import {student,localDate,monthOf,nextMonth,stats,suggest,areas} from './monthly';
import {applyInsight,observeExecution,emptyInsights,exampleEnvelope,installAssessment,previousMonth,assessmentView} from './insights';
export {student,localDate,monthOf,nextMonth,stats,suggest,areas,routeFor,targetNames,supportNames,stageNames};
export type {Stats} from './monthly';
export const blankMeta=():Meta=>({kind:'숙제',examDate:'',weeklyScope:'',materials:'',nextPosition:'',output:'',difficulty:''});
export function createState(at=new Date().toISOString()):PersonalState{
 const lab=createLab();
 for(const p of Object.values(lab.students)){p.assessment=null;p.cards=[];p.runs=[];p.experiences=[];p.stage='middle';p.difficulty='planning';}
 return {schema:'nuvia-personal-monthly-1',mode:'personal',workspaceId:crypto.randomUUID(),studentId:'student-a',lab,meta:{},agreements:[],entries:[],drafts:[],onboarding:false,lastSeen:at,recovery:false,assessmentHistory:[]};
}
function dateValid(x:string){return /^\d{4}-\d{2}-\d{2}$/.test(x)&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;}
function countValid(n:number){return Number.isInteger(n)&&n>=0&&n<=10000;}
function proof(s:PersonalState,cid:string):string[]{
 const c=student(s).cards.find(c=>c.id===cid)!;
 return [c.evidence.planConfirmed?'본인이 계획을 확인':c.evidence.planChanged?'본인이 계획을 변경':'',c.evidence.actionSelected?`현재 행동 선택: ${c.firstAction}`:'',c.evidence.linksConfirmed?`실제 연결 ${c.links.length}개: ${c.relationship}`:'',c.evidence.stepsConfirmed?`확정 단계 ${c.steps.length}개 / 직접 진행 ${c.evidence.progressed.length}개`:''].filter(Boolean);
}
export function update(state:PersonalState,a:Action,at=new Date().toISOString(),review=false):PersonalState{
 const n=structuredClone(state),p=student(n);n.lastSeen=at;
 switch(a.type){
 case 'assessment.example':case 'assessment.input':case 'assessment.clear':case 'comparison.respond':case 'method.respond':
  applyInsight(n,a,at,review);break;
 case 'review.insights-example':
  if(!review||state.mode!=='review')throw Error('합성 비교 예시는 검토 관리에서만 가능합니다.');
  return comparisonExample(state,at);
 case 'onboarding':n.onboarding=a.done;break;
 case 'stage':
  if(!review)throw Error('연령 전환은 검토 모드에서만 가능합니다.');
  if(!['middle','high','adult'].includes(a.stage))throw Error('이번 신규 후보는 중학생·고등학생·대학/성인 범위입니다. 초등은 이전 경로를 보존합니다.');
  if(p.runs.some(r=>r.phase!=='closed'))throw Error('실행을 마친 뒤 비교하세요.');
  p.stage=a.stage;if(p.assessment)p.assessment.educationStage=a.stage;break;
 case 'create':{
  if(!a.title.trim())throw Error('오늘 할 일 한 줄을 적어 주세요.');
  if(a.title.trim().length>160)throw Error('제목은 160자 이내로 적어 주세요. 자세한 내용은 오늘 분량에 나눠 적을 수 있어요. 입력과 기존 기록은 유지했습니다.');
  n.lab=legacy(n.lab,{type:'card.create',title:a.title.trim(),subject:a.subject??'',minutes:a.minutes===null?0:a.minutes??15,date:a.date??localDate(new Date(at))},at,review);
  const c=student(n).cards.at(-1)!;c.goal=a.title.trim();c.scope='';c.firstAction='';c.method='';c.evidence=freshEvidence(p.round);
  if(c.history[0]?.reason==='최초 계획')c.history[0].plan=planSnapshot(c);
  c.scope=a.scope?.trim()??'';c.firstAction=a.firstAction?.trim()??'';
  if(a.activity)c.domain=a.activity==='기타'?'생활':a.activity;
  if(a.startTime)c.startTime=a.startTime;
  if(a.steps)c.steps=a.steps.map(title=>({id:crypto.randomUUID(),title:title.trim(),done:false})).filter(s=>s.title);
  c.evidence.planChanged=!!(a.timeChosen&&c.minutes>0||a.scopeChosen&&c.scope.trim());
  c.evidence.planConfirmed=!!(a.planReviewed&&(c.minutes>0||c.scope.trim()));
  if(c.history[0]?.reason==='최초 계획')c.history[0].plan=planSnapshot(c);
  n.meta[c.id]={...blankMeta(),kind:a.kind??(a.activity&&a.activity!=='학습'?a.activity:p.stage==='adult'?'과제':'숙제'),materials:a.materials??''};break;
 }
 case 'meta':
  if(!p.cards.some(c=>c.id===a.cardId))throw Error('내 과제를 찾지 못했습니다.');
  n.meta[a.cardId]={...blankMeta(),...n.meta[a.cardId],...a.changes};break;
 case 'legacy':{
  if(a.command.type==='role'&&!review)throw Error('역할은 검토 관리에서만 전환합니다.');
  if(a.command.type==='qa.profile')n.assessmentHistory.push({at,source:'명시적 합성 프로필 비교 · 실제 재검 아님',assessment:structuredClone(p.assessment)});
  n.lab=legacy(n.lab,a.command,at,review);const q=student(n);
  if(a.command.type==='qa.profile'){
   const i=n.insights??=emptyInsights();
   i.source=q.assessment?{id:crypto.randomUUID(),kind:q.assessment.scoreSystem?.label??'합성 프로필',date:'',mode:'example',assessment:structuredClone(q.assessment),at}:null;
   if(i.source)i.sources.push(structuredClone(i.source));
  }
  if(a.command.type==='run.start'){
   const run=q.runs.find(r=>r.cardId===a.command.cardId&&r.phase!=='closed');
   if(run&&!run.flag)run.flag=n.meta[run.cardId]?.nextPosition??'';
   const chosen=run?n.meta[run.cardId]?.helpPreference:undefined;
   if(run&&q.supportChoice==='official'&&chosen&&chosen!=='official'){
    run.support=chosen as typeof run.support;run.supportHistory[0].support=run.support;
   }
  }
  if(a.command.type==='run.flag'){
   const run=q.runs.find(r=>r.id===a.command.runId);
   if(run)n.meta[run.cardId]={...blankMeta(),...n.meta[run.cardId],nextPosition:run.flag};
  }
  if(a.command.type==='run.resume')n.recovery=false;
  if(a.command.type==='run.close'){
   for(const r of q.runs.filter(r=>r.phase==='closed'&&!p.runs.some(old=>old.id===r.id&&old.phase==='closed'))){
    if(typeof a.command.nextPosition==='string'){r.flag=a.command.nextPosition;n.meta[r.cardId]={...blankMeta(),...n.meta[r.cardId],nextPosition:r.flag};}
    const c=q.cards.find(c=>c.id===r.cardId)!,m=n.meta[c.id]??blankMeta();
    n.entries.push({id:crypto.randomUUID(),practiceId:r.practiceId,runId:r.id,axis:r.target,status:r.evidenceStatus!,localDate:localDate(new Date(at)),originalDate:localDate(new Date(at)),enteredAt:at,cardTitle:c.title,proof:proof(n,c.id),optionalAttention:r.optionalAttention??'unobserved',output:m.output,feeling:r.feelingAfter,difficulty:m.difficulty,assessment:structuredClone(assessmentView(n).assessment),corrections:[]});
   }
  }
  if(a.command.type==='goal.schedule')for(const c of q.cards.filter(c=>!p.cards.some(old=>old.id===c.id))){c.minutes=0;for(const h of c.history){try{const plan=JSON.parse(h.plan);plan.minutes=0;h.plan=JSON.stringify(plan);}catch{/* Preserve opaque legacy notes. */}}}
  observeExecution(state,n,a.command,at);break;
 }
 case 'agreement':{
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(a.month)||!countValid(a.count))throw Error('월과 0~10000회 목표를 확인해 주세요.');
  const previous=n.agreements.filter(g=>g.month===a.month&&g.axis===a.axis).at(-1);
  if(previous&&!a.reason.trim())throw Error('앞으로 남은 목표를 바꾸는 이유를 적어 주세요.');
  n.agreements.push({id:crypto.randomUUID(),month:a.month,axis:a.axis,count:a.count,at,after:previous?at:'',reason:a.reason.trim()||'학생이 최초 월간 목표를 확인함',...(previous?{previousId:previous.id}:{})});break;
 }
 case 'correct':{
  const e=n.entries.find(e=>e.id===a.entryId);
  if(!e||!dateValid(a.date)||!a.reason.trim())throw Error('기록 날짜와 정정 이유를 확인해 주세요.');
  e.corrections.push({at,from:e.localDate,to:a.date,reason:a.reason.trim()});e.localDate=a.date;
  const ctx=n.insights?.contexts[e.runId];if(ctx)ctx.month=monthOf(a.date);break;
 }
 case 'draft.make':{
  const existing=n.drafts.find(d=>d.fromMonth===a.month&&d.axis===a.axis&&d.status!=='deferred');
  if(!existing)n.drafts.push(suggest(n,a.month,a.axis,at));break;
 }
 case 'draft.edit':{
  const d=n.drafts.find(d=>d.id===a.id);if(!d||d.status!=='pending')throw Error('수락 전 초안만 수정할 수 있습니다.');
  if(a.changes.count!==undefined&&!countValid(a.changes.count))throw Error('목표 횟수를 확인해 주세요.');
  if(a.changes.date&&!dateValid(a.changes.date))throw Error('일정 날짜를 확인해 주세요.');
  if(a.changes.date&&!a.changes.date.startsWith(d.toMonth))throw Error('첫 일정은 다음 달 안에서 선택하세요.');
  Object.assign(d,a.changes);break;
 }
 case 'draft.defer':{const d=n.drafts.find(d=>d.id===a.id);if(d?.status==='pending')d.status='deferred';break;}
 case 'draft.accept':{
  const d=n.drafts.find(d=>d.id===a.id);if(!d)throw Error('초안이 없습니다.');if(d.status==='accepted')return state;if(d.status!=='pending')throw Error('보류 초안은 새로 검토하세요.');
  const goals=n.agreements.filter(g=>g.month===d.toMonth&&g.axis===d.axis),conflicts=p.cards.filter(c=>c.date===d.date&&c.status!=='done');
  if((conflicts.length||goals.length)&&!a.conflict)throw Error('기존 목표나 일정이 있습니다. 기존 유지/함께 추가/일정 없이 수락 중 선택하세요.');
  if(!goals.length)n.agreements.push({id:crypto.randomUUID(),month:d.toMonth,axis:d.axis,count:d.count,at,after:'',reason:'학생이 다음 달 초안을 수락함'});
  else d.reasons.push('기존 다음 달 목표는 덮어쓰지 않았습니다. 목표 변경은 별도 남은 계획 변경으로 확인하세요.');
  if(d.count>0&&a.conflict!=='none'&&a.conflict!=='keep'){
   const c=newCard(p.round,{title:`다음 한 걸음 · ${targetNames[d.axis]}`,goal:`직접 정할 ${targetNames[d.axis]}`,scope:d.chunk,method:d.method,firstAction:'',date:d.date,minutes:0});
   p.cards.push(c);n.meta[c.id]={...blankMeta(),originDraft:d.id,helpPreference:d.help};d.cardIds.push(c.id);
  }
  d.status='accepted';d.acceptedAt=at;break;
 }
 case 'split.accept':{
  const c=p.cards.find(c=>c.id===a.cardId);if(!c||!a.parts.length||!a.reason.trim())throw Error('나눌 범위와 제안 확인 이유를 적어 주세요.');
  const key=JSON.stringify(a.parts);if(n.meta[c.id]?.proposal===key)break;
  for(const part of a.parts){
   if(!dateValid(part.date)||!part.scope.trim()||!Number.isInteger(part.minutes)||part.minutes<1||part.minutes>1440)throw Error('나눈 날짜·분량·시간을 확인해 주세요.');
   const item=newCard(p.round,{title:c.title+' · 나눈 분량',subject:c.subject,scope:part.scope,goal:c.goal,date:part.date,minutes:part.minutes,deadline:c.deadline,middleDeadline:c.middleDeadline});
   p.cards.push(item);n.meta[item.id]={...blankMeta(),kind:n.meta[c.id]?.kind??'exam'};
  }
  n.meta[c.id]={...blankMeta(),...n.meta[c.id],proposal:key};c.history.push({at,reason:`나누기 제안 수락: ${a.reason}`,plan:JSON.stringify({parts:a.parts,originalPreserved:true})});break;
 }
 case 'review.fixture':{
  if(!review||n.mode!=='review')throw Error('합성 예시는 분리된 검토 모드에서만 불러옵니다.');
  n.insights=emptyInsights();
  if(a.scenario==='same-data'){n.lab=createLab();n.lab.labId=state.lab.labId;n.entries=[];n.agreements=[];n.drafts=[];n.meta={};break;}
  n.lab=legacy(n.lab,{type:'qa.profile',stage:p.stage,axes:{planning:'low',attention:'low',simultaneous:'high',successive:'mid'},supportOrder:['planning','attention'],strengthOrder:['simultaneous']},at,true);
  const month=monthOf(localDate(new Date(at))),base=new Date(at);base.setDate(1);
  n.agreements=[];n.entries=[];n.drafts=[];
  for(const axis of ['planning','attention'] as const){
   n.agreements.push({id:crypto.randomUUID(),month,axis,count:axis==='planning'?10:4,at,after:'',reason:'명시적 합성 검토 시나리오'});
   for(let i=0;i<(axis==='planning'?7:1);i++){const date=new Date(base);date.setDate(1+i*2);const day=localDate(date);
    n.entries.push({id:crypto.randomUUID(),practiceId:`fixture-${axis}-${i}`,runId:`fixture-${axis}-${i}`,axis,status:'performed',localDate:day,originalDate:day,enteredAt:at,cardTitle:'합성 검토 예시 · 실제 학생 기록 아님',proof:['명시적 검토 모드 합성 입력 · 실제 수행 아님'],optionalAttention:'unobserved',output:'합성 산출물 예시',feeling:'',difficulty:'',assessment:structuredClone(student(n).assessment),corrections:[]});
   }
  }break;
 }
 }
 return n;
}
function comparisonExample(state:PersonalState,at:string){
 let s=createState(at);s.mode='review';s.workspaceId=state.workspaceId;s.lab.labId=state.lab.labId;s.onboarding=true;
 const months=[previousMonth(previousMonth(monthOf(localDate(new Date(at))))),previousMonth(monthOf(localDate(new Date(at))))];
 installAssessment(s,{...exampleEnvelope(student(state).stage),testDate:months[0]+'-01'},'example',new Date(months[0]+'-01T09:00:00').toISOString());
 for(const [mi,month] of months.entries()){
  s=update(s,{type:'agreement',month,axis:'planning',count:10,reason:'명시적 합성 비교 · 실제 학생 기록 아님'},at,true);
  for(let i=0;i<10;i++){
   const date=`${month}-${String(i===9?20:i+1).padStart(2,'0')}`,start=new Date(date+'T10:00:00').toISOString();
   const cmd=(command:any,t=start)=>{s=update(s,{type:'legacy',command},t,true);};
   s=update(s,{type:'create',title:'합성 예시 · 수학 복습',subject:'수학',minutes:15,date},start,true);
   const c=student(s).cards.at(-1)!;
   cmd({type:'card.update',cardId:c.id,changes:{scope:'1단원 문제 3개',firstAction:'첫 문제 읽기'}});
   if(i<(mi===0?6:8))cmd({type:'card.plan',cardId:c.id});else cmd({type:'card.skip',cardId:c.id});
   cmd({type:'run.start',cardId:c.id});const run=student(s).runs.at(-1)!;
   if(i===0){
    cmd({type:'run.pause',runId:run.id},new Date(Date.parse(start)+5*60000).toISOString());
    cmd({type:'run.flag',runId:run.id,flag:'두 번째 문제로 돌아오기'},new Date(Date.parse(start)+6*60000).toISOString());
    cmd({type:'run.resume',runId:run.id},new Date(Date.parse(start)+7*60000).toISOString());
   }
   const end=new Date(Date.parse(start)+((mi===0?20:16)+(i===0?2:0))*60000).toISOString();
   cmd({type:'run.review',runId:run.id},end);cmd({type:'run.close',runId:run.id,completion:'no',next:'today'},end);
   if(i<3)s=update(s,{type:'method.respond',runId:run.id,support:run.support,answer:i<2?'yes':'neutral'},end,true);
  }
 }
 s.lastSeen=at;return s;
}
export function splitProposal(s:PersonalState,cardId:string){
 const p=student(s),c=p.cards.find(c=>c.id===cardId);if(!c)return [];
 const m=s.meta[cardId],end=m?.examDate||c.deadline||localDate(),start=localDate(),days=Math.max(1,Math.min(7,Math.ceil((Date.parse(end+'T12:00:00')-Date.parse(start+'T12:00:00'))/86400000)));
 return Array.from({length:days},(_,i)=>{const date=new Date(start+'T12:00:00');date.setDate(date.getDate()+i);const day=localDate(date),busy=p.cards.filter(t=>t.date===day&&t.status!=='done').reduce((n,t)=>n+t.minutes,0);
  return {date:day,scope:`${m?.weeklyScope||c.scope||'시험 범위'} 중 ${i+1}/${days} 부분 (직접 수정)`,minutes:Math.min(25,p.dailyCapacity-busy)};
 }).filter(p=>p.minutes>0);
}
