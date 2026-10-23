import type {Action,PersonalState} from './model';
import type {StudioData,Placement} from './studio-model';
import {createState,update as baseUpdate,student,localDate} from './domain';
import {planSnapshot,freshEvidence} from '../enhancement/domain';
import {ACTIVITIES,checkMinutes} from './task-plan';
import {syncRoadmap,applyRoadmap} from './roadmap';
import {isLocale,localeOf} from './i18n/config';
import {t} from './i18n/runtime';
import {applyLibrary} from '../planner-library/domain';
import {libText} from '../planner-library/i18n';
export const freshStudio=():StudioData=>({placements:{},selectedId:'',deskId:'',archiveReminders:true,appearance:'ivory',lastNoticeSession:'',sources:{},experiences:[]});
export const studioOf=(s:PersonalState):StudioData=>s.studio??freshStudio();
export const placement=(s:PersonalState,id:string):Placement=>studioOf(s).placements[id]??{place:student(s).cards.find(c=>c.id===id)?.status==='done'?'collection':'shelf',tone:'blue'};
export const createStudio=(at?:string)=>{const s=createState(at);s.studio=freshStudio();return s;};
function validDate(x:string){return /^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;}
const validTime=(x:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(x);
export function studioCapacity(s:PersonalState,day=localDate()){
 const cards=student(s).cards.filter(c=>(c.date===day||!c.date&&day===localDate())&&(placement(s,c.id).place!=='excluded'||c.status==='done'));
 const done=cards.filter(c=>c.status==='done').reduce((n,c)=>n+c.minutes,0),pending=cards.filter(c=>c.status!=='done').reduce((n,c)=>n+c.minutes,0),available=student(s).dailyCapacity;
 return {done,pending,unknown:cards.filter(c=>c.minutes===0).length,free:Math.max(0,available-done-pending),over:Math.max(0,done+pending-available),total:done+pending,available};
}
export function noticeCards(s:PersonalState){
 const d=studioOf(s);return d.archiveReminders?student(s).cards.filter(c=>{const p=placement(s,c.id);return p.place==='archive'&&c.status!=='done'&&!p.kept&&p.noticeSession===d.lastNoticeSession&&!!p.noticeAt;}):[];
}
export function scheduleProposal(s:PersonalState,day:string,start:string){
 if(!validDate(day)||!validTime(start))throw Error('날짜와 시작 시각을 확인해 주세요.');
 if(student(s).cards.some(c=>(c.date===day||!c.date&&day===localDate())&&c.status!=='done'&&placement(s,c.id).place!=='excluded'&&c.minutes===0))return [];
 let cursor=Number(start.slice(0,2))*60+Number(start.slice(3));
 return student(s).cards.filter(c=>(c.date===day||!c.date&&day===localDate())&&c.status!=='done'&&placement(s,c.id).place!=='excluded').map(c=>{
  const fixed=!!c.startTime&&placement(s,c.id).timeSet!==false;
  if(fixed){if(!validTime(c.startTime))throw Error('기존 시작 시각을 확인해 주세요.');cursor=Number(c.startTime.slice(0,2))*60+Number(c.startTime.slice(3));}
  if(cursor+c.minutes>1440)throw Error('하루를 넘는 제안입니다. 분량이나 시작 시각을 줄여 주세요.');
  const startTime=String(Math.floor(cursor/60)).padStart(2,'0')+':'+String(cursor%60).padStart(2,'0');cursor+=c.minutes;
  return {cardId:c.id,title:c.title,startTime,minutes:c.minutes,fixed};
 });
}
export function updateStudio(state:PersonalState,a:Action,at=new Date().toISOString(),review=false):PersonalState{
 if(a.type==='library.create'){
  const n=updateStudio(state,{...a.task,type:'create'},at,review);
  const id=a.task.requestId?n.studio?.creations?.[a.task.requestId]:student(n).cards.at(-1)?.id;
  if(!id)throw Error(libText(localeOf(state),'error'));
  return updateStudio(n,{type:'library.attach',cardId:id,bindingId:a.bindingId,templateId:a.templateId},at,review);
 }
 if(a.type==='review.fixture'&&(a.scenario==='board'||a.scenario==='empty')){
  if(!review||state.mode!=='review')throw Error('합성 예시는 분리된 검토 공간에서만 불러올 수 있습니다.');
  return boardFixture(state,at,a.scenario==='empty');
 }
 if(a.type==='create'&&a.requestId&&state.studio?.creations?.[a.requestId])return state;
 let n=structuredClone(state);n.studio??=freshStudio();const d=n.studio,p=student(n),now=Date.parse(at);n.lastSeen=at;
 const card=(id:string)=>{const c=p.cards.find(c=>c.id===id);if(!c)throw Error('과제를 찾을 수 없습니다.');return c;};
 const rec=(id:string)=>(d.placements[id]??={...placement(n,id)});
 const open=()=>p.runs.find(r=>r.phase!=='closed');
 const movable=(id:string)=>{card(id);const r=open();if(r&&r.cardId!==id)throw Error('현재 실행을 중단·종료한 뒤 다른 과제로 바꿔 주세요.');};
 if(a.type==='legacy'&&a.command.type==='language'&&isLocale(a.command.language))d.locale=a.command.language;
 if(a.type.startsWith('library.'))applyLibrary(n,a as Parameters<typeof applyLibrary>[1],at,review);
 else if(a.type.startsWith('roadmap.'))applyRoadmap(n,a as never,at);
 else switch(a.type){
  case 'studio.note':
   if(!validDate(a.date)||typeof a.text!=='string'||a.text.length>20000)throw Error(t('note.failed'));
   d.dailyNotes??={};
   d.dailyNotes[a.date]={text:a.text,updatedAt:at};
   break;
  case 'studio.setup':
   if(!['middle','high','adult'].includes(a.stage))throw Error('중학생·고등학생·대학/성인 중 선택하세요.');
   if(p.assessment&&p.assessment.educationStage!==a.stage||p.cards.length>0&&p.stage!==a.stage&&!review)throw Error('기존 과제와 검사 문맥을 바꾸지 않았습니다. 연령 비교는 검토 모드에서 하세요.');
   p.stage=a.stage;d.stageChosen=true;
   if(a.task)n=updateStudio(n,{type:'create',...a.task},at,review);
   else if(a.title?.trim())n=updateStudio(n,{type:'create',title:a.title},at,review);break;
  case 'studio.estimate':{
   checkMinutes(a.minutes);const c=card(a.cardId),v=rec(c.id),minutes=a.minutes??0;
   if(minutes!==c.minutes){if(c.evidence.round!==p.round)c.evidence=freshEvidence(p.round);
    c.evidence.planConfirmed=false;
    if(minutes>0){c.evidence.planChanged=true;v.timeEvidence=true;}
    else if(v.timeEvidence){c.evidence.planChanged=false;v.timeEvidence=false;}
    c.minutes=minutes;c.history.push({at,reason:minutes?'예상 시간 직접 변경':'예상 시간 미정으로 변경',plan:planSnapshot(c)});
   }
   v.estimateKnown=minutes>0;break;
  }
  case 'studio.editPlan':{
   checkMinutes(a.minutes);
   if(a.activity&&!ACTIVITIES.includes(a.activity))throw Error('활동 영역을 확인해 주세요.');
   n=updateStudio(n,{type:'studio.estimate',cardId:a.cardId,minutes:a.minutes},at,review);
   const {minutes:unused,...changes}=a.changes;
   n=updateStudio(n,{type:'legacy',command:{type:'card.update',cardId:a.cardId,changes}},at,review);
   if(a.activity){const id=a.cardId,v=n.studio!.placements[id],c=student(n).cards.find(c=>c.id===id)!;if(a.activity!==(v.activity??c.domain))n.studio!.lastActivity=a.activity;v.activity=a.activity;c.domain=a.activity==='기타'?'생활':a.activity;}break;
  }
  case 'studio.select':card(a.cardId);d.selectedId=a.cardId;break;
  case 'studio.place':case 'studio.take':{
   movable(a.cardId);const c=card(a.cardId),v=rec(c.id);
   if(c.status==='done'||v.place==='excluded')throw Error('완료·제외한 과제는 되돌리기 또는 최근 과제 다시 쓰기를 사용하세요.');
   if(d.deskId&&d.deskId!==c.id&&placement(n,d.deskId).place==='desk')rec(d.deskId).place='shelf';
   v.place='desk';delete v.archivedAt;delete v.noticeAt;delete v.noticeSession;delete v.kept;d.deskId=c.id;d.selectedId=c.id;break;
  }
  case 'studio.archive':{
   movable(a.cardId);const c=card(a.cardId),r=open(),v=rec(c.id);
   if(c.status==='done'||v.place==='excluded')throw Error('완료·제외한 과제는 보관하지 않습니다.');
   if(a.nextDate&&!validDate(a.nextDate))throw Error('다음 실행 날짜를 확인해 주세요.');
   if(r?.phase==='review')throw Error('돌아보기를 먼저 마쳐 주세요.');
   if(r?.phase==='running')n=baseUpdate(n,{type:'legacy',command:{type:'run.pause',runId:r.id}},at,review);
   if(r&&a.flag!==undefined)n=baseUpdate(n,{type:'legacy',command:{type:'run.flag',runId:r.id,flag:a.flag}},at,review);
   const nd=n.studio!;const previous=nd.placements[c.id]??v;
   if(previous.place!=='archive')nd.placements[c.id]={...previous,place:'archive',archivedAt:at,nextDate:a.nextDate??'',kept:false};
   else if(a.nextDate!==undefined)previous.nextDate=a.nextDate;
   if(nd.deskId===c.id)nd.deskId='';nd.selectedId=c.id;break;
  }
  case 'studio.exclude':{
   const c=card(a.cardId);if(p.runs.some(r=>r.cardId===c.id&&r.phase!=='closed'))throw Error('현재 실행의 종료·돌아보기를 마친 뒤 계획에서 빼 주세요.');
   const v=rec(c.id);if(v.place!=='excluded'){v.previous=v.place;v.place='excluded';}
   if(d.deskId===c.id)d.deskId='';break;
  }
  case 'studio.restore':{
   const c=card(a.cardId),v=rec(c.id);if(v.place!=='excluded')throw Error('제외한 과제를 선택해 주세요.');
   v.place=c.status==='done'?'collection':v.previous==='archive'?'archive':'shelf';delete v.previous;break;
  }
  case 'studio.keep':if(rec(a.cardId).place!=='archive')throw Error('보관 중인 과제를 선택하세요.');card(a.cardId);rec(a.cardId).kept=true;break;
  case 'studio.color':card(a.cardId);if(!['blue','purple','orange','sky'].includes(a.tone))throw Error('네임택 색을 확인해 주세요.');rec(a.cardId).tone=a.tone;break;
  case 'studio.locale':
   if(!isLocale(a.locale))throw Error('Unsupported Studio locale');
   d.locale=a.locale;
   if(['ko','en','km','ar'].includes(a.locale))n.lab.language=a.locale as typeof n.lab.language;
   break;
  case 'studio.settings':
   if(a.archiveReminders!==undefined)d.archiveReminders=a.archiveReminders;
   if(a.appearance!==undefined)d.appearance=a.appearance;break;
  case 'studio.visit':
   d.lastNoticeSession=a.sessionId;
   if(d.archiveReminders)for(const c of p.cards){const v=rec(c.id);
    const next=v.nextDate||c.date;
    if(v.place==='archive'&&c.status!=='done'&&!v.kept&&!v.noticeAt&&v.archivedAt&&now-Date.parse(v.archivedAt)>=7*86400000&&(!next||next<=localDate(new Date(at)))){v.noticeAt=at;v.noticeSession=a.sessionId;}
   }break;
  case 'studio.sync':break;
  case 'studio.schedule':{
   if(open())throw Error('실행을 마친 뒤 시간 제안을 적용하세요.');
   for(const t of scheduleProposal(n,a.day,a.start).filter(t=>!t.fixed)){n=baseUpdate(n,{type:'legacy',command:{type:'card.update',cardId:t.cardId,changes:{startTime:t.startTime}}},at,review);n.studio!.placements[t.cardId].timeSet=true;}break;
  }
  default:{
   if(a.type==='create'){
    if(a.minutes!==undefined)checkMinutes(a.minutes);
    if(a.activity&&!ACTIVITIES.includes(a.activity))throw Error('활동 영역을 골라 주세요.');
    if(a.startTime&&!validTime(a.startTime))throw Error('시작 시각을 확인해 주세요.');
    if(a.date&&!validDate(a.date))throw Error('날짜를 확인해 주세요.');
   }
   if(a.type==='legacy'){
    const cmd=a.command;
    if(cmd.type==='card.update'&&cmd.changes?.minutes!==undefined)checkMinutes(cmd.changes.minutes);
    if(cmd.type==='run.start'){
     const c=card(cmd.cardId);if(c.status==='done'||placement(n,c.id).place!=='desk'||d.deskId!==c.id)throw Error('먼저 이 과제를 작업대에 올려 주세요. 꺼내기만으로는 시작되지 않습니다.');
    }
    if(cmd.type==='run.resume'){const r=p.runs.find(r=>r.id===cmd.runId);if(!r||placement(n,r.cardId).place!=='desk')throw Error('보관함에서 작업대로 꺼낸 뒤 이어가세요.');}
    if(cmd.type==='card.update'&&cmd.changes?.startTime!==undefined&&cmd.changes.startTime!==''&&!validTime(cmd.changes.startTime))throw Error('시작 시각을 확인해 주세요.');
    if(cmd.type==='card.update'&&cmd.changes?.title!==undefined&&cmd.changes.title.trim().length>160)throw Error('제목은 160자 이내로 적어 주세요. 기존 기록은 바꾸지 않았습니다.');
    if(cmd.type==='card.update'&&cmd.changes?.startTime!==undefined){
     rec(cmd.cardId).timeSet=!!cmd.changes.startTime;
     if(cmd.changes.startTime==='')a={...a,command:{...cmd,changes:{...cmd.changes,startTime:card(cmd.cardId).startTime}}};
    }
   }
   n=baseUpdate(n,a,at,review);n.studio??=freshStudio();
   if(a.type==='review.fixture'||a.type==='review.insights-example')n.studio=freshStudio();
   if(a.type==='legacy'&&a.command.type==='card.update'){
    const cardId=a.command.cardId,old=student(state).cards.find(c=>c.id===cardId),changed=student(n).cards.find(c=>c.id===cardId);
    if(old&&changed&&!(['scope','minutes','startTime'] as const).some(k=>old[k]!==changed[k]))changed.evidence.planChanged=old.evidence.planChanged;
   }
   const nd=n.studio;
   if(a.type==='create'){
    const c=student(n).cards.at(-1)!;
    nd.placements[c.id]={place:'shelf',tone:'blue',timeSet:!!a.startTime,estimateKnown:c.minutes>0,timeEvidence:!!a.timeChosen&&!a.scopeChosen,...(a.activity?{activity:a.activity}:{})};
    if(a.activity&&a.activityExplicit)nd.lastActivity=a.activity;
    if(a.requestId)(nd.creations??={})[a.requestId]=c.id;
   }
   if(a.type==='legacy'&&a.command.type==='card.update'){
    const id=a.command.cardId,c=student(n).cards.find(c=>c.id===id)!,v=nd.placements[c.id]??={...placement(n,c.id)};
    if(a.command.changes.minutes!==undefined){v.estimateKnown=true;v.timeEvidence=true;}
    if(a.command.changes.scope!==undefined&&a.command.changes.scope!==student(state).cards.find(old=>old.id===c.id)?.scope)v.timeEvidence=false;
   }
   if(a.type==='legacy'&&a.command.type==='card.move'&&student(state).cards.some(c=>c.minutes===0)){
    for(const c of student(n).cards){const old=student(state).cards.find(old=>old.id===c.id);if(old)c.startTime=old.startTime;}
   }
   for(const c of student(n).cards){
    if(!nd.placements[c.id])nd.placements[c.id]={place:c.status==='done'?'collection':'shelf',tone:'blue',timeSet:student(state).cards.some(old=>old.id===c.id)};
    if(c.status==='done'&&nd.placements[c.id].place!=='excluded'){nd.placements[c.id].place='collection';if(nd.deskId===c.id)nd.deskId='';}
   }
   if(a.type==='legacy'&&a.command.type==='run.close'){
    const active=student(n).runs.find(r=>r.phase!=='closed');
    if(active){nd.placements[active.cardId].place='desk';nd.deskId=active.cardId;}
   }
  }
 }
 for(const c of student(n).cards){
  if(!student(state).cards.some(old=>old.id===c.id)&&a.type==='legacy'&&a.command.type==='run.close'){
   const r=student(state).runs.find(r=>r.id===a.command.runId),parent=student(state).cards.find(old=>old.id===r?.cardId);
   if(parent){const v=n.studio!.placements[c.id]??={place:'shelf',tone:'blue'};v.activity=placement(state,parent.id).activity??parent.domain;v.estimateKnown=c.minutes>0;c.domain=parent.domain;}
  }
  if(!n.studio!.placements[c.id]){
   const oldRun=a.type==='legacy'&&a.command.type==='run.close'?student(state).runs.find(r=>r.id===a.command.runId):undefined;
   const parent=oldRun?student(state).cards.find(old=>old.id===oldRun.cardId):undefined;
   n.studio!.placements[c.id]={place:c.status==='done'?'collection':'shelf',tone:'blue',timeSet:false,estimateKnown:c.minutes>0,...(parent?{activity:placement(state,parent.id).activity??parent.domain}:{})};
  }
  if(!student(state).cards.some(old=>old.id===c.id)&&!c.history.length)c.history.push({at,reason:'최초 계획',plan:planSnapshot(c)});
 }
 for(const c of student(n).cards)if(c.minutes===0)n.studio!.placements[c.id].estimateKnown=false;
 for(const r of student(n).runs)if(r.budgetMinutes===0&&!(n.studio!.unknownRuns??=[]).includes(r.id))n.studio!.unknownRuns.push(r.id);
 syncRoadmap(n,at);return n;
}
/** Synthetic review-only scenario. Never loads or transforms personal storage. */
function boardFixture(previous:PersonalState,at:string,empty:boolean):PersonalState{
 let s=createStudio(at);s.mode='review';s.workspaceId=previous.workspaceId;s.lab.labId=previous.lab.labId;
 s.onboarding=true;s.studio!.stageChosen=true;s.lab.students['student-a'].dailyCapacity=90;
 if(empty)return s;
 let clock=Date.parse(at)-16*60000;
 const act=(a:Action)=>{s=updateStudio(s,a,new Date(clock+=1000).toISOString(),true);};
 const day=localDate(new Date(at)),tomorrow=localDate(new Date(Date.parse(at)+86400000));
 const make=(title:string,subject:string,minutes:number,date=day,scope='')=>{
  act({type:'create',title,subject,minutes,date,scope,firstAction:scope?'1번부터 풀기':'자료 한 가지 확인하기',activity:'학습',activityExplicit:true,timeChosen:true,scopeChosen:!!scope});
  return student(s).cards.at(-1)!.id;
 };
 const done=make('단어 복습','영어',15,day,'단어 1~10');
 act({type:'studio.place',cardId:done});
 act({type:'legacy',command:{type:'run.start',cardId:done}});
 clock+=15*60000;
 const run=student(s).runs.at(-1)!;
 act({type:'legacy',command:{type:'run.review',runId:run.id}});
 act({type:'legacy',command:{type:'run.close',runId:run.id,completion:'yes',next:'today'}});
 const social=make('자료 읽기','사회',10);act({type:'studio.color',cardId:social,tone:'orange'});
 make('읽을 자료 고르기','국어',20,tomorrow);
 const science=make('개념 정리','과학',25,tomorrow);
 act({type:'studio.color',cardId:science,tone:'orange'});
 act({type:'studio.archive',cardId:science,flag:'3쪽부터'});
 const history=make('발표 준비','역사',20,tomorrow);
 act({type:'studio.color',cardId:history,tone:'sky'});
 act({type:'studio.archive',cardId:history,flag:'자료 확인부터'});
 const excluded=make('추가 문제 검토','수학',10);
 act({type:'studio.exclude',cardId:excluded});
 const desk=make('수학 문제집','수학',25,day,'문제 1~10');
 act({type:'studio.color',cardId:desk,tone:'purple'});
 act({type:'legacy',command:{type:'card.update',cardId:desk,changes:{startTime:'19:00'}}});
 act({type:'studio.place',cardId:desk});
 return s;
}
