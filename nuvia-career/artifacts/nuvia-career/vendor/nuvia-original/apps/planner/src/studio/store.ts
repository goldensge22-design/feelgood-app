import {useEffect,useState} from 'react';
import {student} from './domain';
import {createStudio as createState,updateStudio as update,freshStudio} from './studio-logic';
import {syncRoadmap} from './roadmap';
import {exportBackup,freezeTimers,importBackup,validate} from './persistence';
import {reportHTML,type ReportFields} from './report';
import type {PersonalState,Action} from './model';
import {setLocale,localeOf} from './i18n/runtime';
import {demoAudience,demoStorageKey,createDemo} from '../demo/session';
import {demoReportState,localizedDemoReportNotice} from './i18n/demo-copy';
import {noticeFromText,noticeText,SAVED_NOTICE_KEY,type Notice} from './notices';
// [NUVIA 연동] 셸이 연결한 결과지·서버 저장. 검토(review)·합성 데모 공간은 원본대로 이 브라우저에만 둔다
import {createStudioSync,studioScope,type StudioScope} from '../integration/studioServer';
import {inboxActions} from '../integration/labInbox';
import {publicLibrary} from '../library-public/policy';
import {publicActionAllowed,validatePublicState} from '../library-public/state';
export const KEY='nuvia:studio:v1';
function download(content:string,name:string,type:string){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
export const REVIEW_TAB_STUDIO_KEY='nuvia:review-demo:v1:original-studio:v1';
export type ReviewStudioPersistence={storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>;write:(key:string,value:string,action:string)=>void;};
function load(review:boolean,scope:StudioScope|null,storage:ReviewStudioPersistence['storage'],reviewTab:boolean,accountStage?:'adult'|'youth'){
 const key=accountStage?KEY+':account':reviewTab?REVIEW_TAB_STUDIO_KEY:demoAudience?demoStorageKey(demoAudience):KEY+(review?':review':':personal')+(scope?':'+scope.id:'');
 let id:string|null=null;
 try{
  id=storage.getItem(key+':id');
  const raw=storage.getItem(key);
  let n=raw?freezeTimers(validate(JSON.parse(raw),id??undefined)):!accountStage&&!reviewTab&&demoAudience?createDemo(demoAudience):createState();
  if(!raw){n.mode=review?'review':'personal';if(id)n.workspaceId=id;
   if(reviewTab){n=update(n,{type:'studio.setup',stage:'adult'},new Date().toISOString(),review);n.onboarding=true;}
  }
  if(n.mode!==(review?'review':'personal'))throw Error('검토와 개인 공간을 섞을 수 없습니다.');
  if(accountStage==='adult'&&!raw)n=update(n,{type:'studio.setup',stage:'adult'},new Date().toISOString(),false);
  if(!accountStage&&publicLibrary&&demoAudience)validatePublicState(n,demoAudience);
  let ready=update(n,{type:'studio.visit',sessionId:crypto.randomUUID()},new Date().toISOString(),review);
  if(scope)ready=connect(ready,scope,review);
  storage.setItem(key+':id',ready.workspaceId);storage.setItem(key,JSON.stringify(ready));return {state:ready,error:'',key};
 }catch{
  const n=createState();n.mode=review?'review':'personal';if(id)n.workspaceId=id;
  return {state:n,error:'기존 개인 자료가 손상되어 저장을 중단했습니다. 원문은 덮어쓰지 않았습니다. 같은 공간의 정상 백업을 복원하세요.',key};
 }
}
/** 셸이 연결한 결과를 검사 출발점으로 넣는다. 같은 결과면 그대로이고, 실행 중이면 기존 출발점을 유지한다 */
function connect(s:PersonalState,scope:StudioScope,review:boolean){
 if(!scope.envelope)return s; // 결과지 없는 학습자 범위 — 연결할 결과지 없음
 try{return update(s,{type:'assessment.connected',payload:scope.envelope},new Date().toISOString(),review);}catch{return s;}
}
export function usePersonal(reviewTab=false,reviewPersistence?:ReviewStudioPersistence,accountStage?:'adult'|'youth'){
 const review=!accountStage&&!reviewTab&&!demoAudience&&new URLSearchParams(location.search).get('review')==='1';
 const storage=accountStage||reviewTab?(reviewPersistence?.storage??sessionStorage):localStorage;
 const [scope]=useState(()=>accountStage||reviewTab||demoAudience||review?null:studioScope());
 const [initial]=useState(()=>load(review,scope,storage,reviewTab,accountStage));
 const [sync]=useState(()=>scope?.profile?createStudioSync(scope,initial.key):null),[state,setState]=useState(initial.state),[error,setError]=useState(initial.error),[notice,setNotice]=useState<Notice|null>(null);
 const setMessage=(text:string)=>setNotice(text?noticeFromText(text):null);
 const [holder]=useState(()=>({state:initial.state,blocked:!!initial.error}));
 setLocale(localeOf(state));
 function commit(n:PersonalState,action='studio.checkpoint'){const next=structuredClone(n);next.studio??=freshStudio();syncRoadmap(next);const clean=validate(next,holder.state.workspaceId);if(publicLibrary&&demoAudience)validatePublicState(clean,demoAudience);
  if((accountStage||reviewTab)&&reviewPersistence){try{reviewPersistence.write(initial.key,JSON.stringify(clean),action);}
    catch(error){holder.state=clean;setState(clean);throw error;}}
  else storage.setItem(initial.key,JSON.stringify(clean));
  holder.state=clean;setState(clean);sync?.save(clean);
 }
 function act(a:Action){try{if(holder.blocked)throw Error(error);if(publicLibrary&&!publicActionAllowed(a))return false;commit(update(holder.state,a,new Date().toISOString(),review),a.type);if(a.type!=='studio.note'&&!a.type.startsWith('summary.'))setNotice({key:SAVED_NOTICE_KEY});return true;}catch(e){if(!a.type.startsWith('summary.'))setMessage((e as Error).message);return false;}}
 useEffect(()=>{
  // [NUVIA 연동] 서버본이 있으면 그걸로 시작한다. 이 기기에 못 올린 변경이 있으면 이 기기 것을 올린다
  if(!sync||holder.blocked)return;
  let alive=true;
  sync.load().then(data=>{
   if(!alive)return;
   if(data==null){if(sync.isDirty())sync.save(holder.state);return;}
   try{
    const n=connect(freezeTimers(validate(data)),scope!,review);
    if(n.mode!=='personal')return;
    localStorage.setItem(initial.key,JSON.stringify(n));localStorage.setItem(initial.key+':id',n.workspaceId);holder.state=n;setState(n);
   }catch{/* 서버본을 못 읽으면 이 기기 자료를 그대로 쓴다 */}
  }).then(()=>pullInbox(()=>alive));
  const online=()=>{void sync.flush();};
  window.addEventListener('online',online);
  return()=>{alive=false;window.removeEventListener('online',online);};
 },[]);
 useEffect(()=>{
  const checkpoint=()=>{if(holder.blocked)return;try{
   if(!Object.values(holder.state.lab.students).some(p=>p.runs.some(r=>r.phase==='running')))return;
   const n={...holder.state,lastSeen:new Date().toISOString()};if(document.hidden)commit(freezeTimers(n,n.lastSeen));else if(student(n).runs.some(r=>r.phase==='running'))commit(n);
  }catch(e){setMessage((e as Error).message);}};
  const hidden=()=>{if(document.hidden)checkpoint();};
  const sync=(e:StorageEvent)=>{if(e.key!==initial.key||!e.newValue)return;try{const n=validate(JSON.parse(e.newValue),holder.state.workspaceId);holder.state=n;setState(n);}catch{setMessage('다른 탭 자료를 읽지 못했습니다. 현재 기록을 유지합니다.');}};
  const t=setInterval(checkpoint,5000);document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',checkpoint);window.addEventListener('storage',sync);
  return()=>{clearInterval(t);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',checkpoint);window.removeEventListener('storage',sync);};
 },[]);
 /** [NUVIA 연동 2026-11-10] LAB 탐색 방향 수신함 → LAB 일일 연습. 같은 요청은 다시 넣어도 그대로(대표 receive 멱등) */
 async function pullInbox(isAlive:()=>boolean){
  if(!scope?.profile||holder.blocked)return;
  const items=await inboxActions(holder.state,scope.id);
  if(!isAlive())return;
  let changed=false;
  for(const {at,action} of items){
   try{const n=update(holder.state,action,at,review);if(n!==holder.state){holder.state=n;changed=true;}}
   catch{/* 단계 불일치·세션 만료·순서 오류 등은 이 방향만 건너뛴다 */}
  }
  if(changed)commit(holder.state);
 }
 useEffect(()=>{
  if(!scope?.profile)return;
  let alive=true;
  const again=()=>{if(!document.hidden)void pullInbox(()=>alive);};
  document.addEventListener('visibilitychange',again);window.addEventListener('focus',again);
  return()=>{alive=false;document.removeEventListener('visibilitychange',again);window.removeEventListener('focus',again);};
 },[]);
 async function backup(scope:'personal'|'workspace'){
  try{if(holder.blocked)throw Error(error);
   if(scope==='workspace'&&!window.confirm('학생 A/B·교사 수업·공유 전체가 담기는 검토 관리 백업입니다. 실제 개인정보를 넣지 마세요. 계속할까요?'))return;
   download(await exportBackup(holder.state,scope),scope==='personal'?'NUVIA_studio_my_records.json':'NUVIA_studio_review_workspace.json','application/json');
   setMessage(scope==='personal'?'내 기록만 백업했습니다. 실행 중 타이머는 복원 시 안전하게 멈춰 재개를 묻습니다.':'전체 시연 공간을 백업했습니다. 평문 파일이므로 공개하지 마세요.');
  }catch(e){setMessage((e as Error).message);}
 }
 async function restore(file:File){try{
  if(file.size>15000000)throw Error('15MB 이하 파일만 선택하세요.');
  const raw=await file.text(),next=await importBackup(raw,holder.state),scope=JSON.parse(raw).scope;
  if(publicLibrary&&demoAudience){if(scope!=='personal')throw Error('검토와 개인 공간을 섞을 수 없습니다.');validatePublicState(next,demoAudience);}
  if(!window.confirm(scope==='personal'?'내 개인 기록을 백업 시점으로 교체합니다. 이후 수정은 사라질 수 있습니다. 다른 학생·교사 전체는 가져오지 않습니다. 현재 백업을 먼저 보관했나요?':'검토 공간 전체를 백업 시점으로 교체합니다. 이후 수정이 사라질 수 있습니다. 계속할까요?'))return;
  commit(next);holder.blocked=false;setError('');setMessage('검증 후 복원했습니다. 타이머는 멈춘 상태이며 본인이 시간 확인 후 재개하세요.');
 }catch(e){setMessage((e as Error).message);}}
 function report(month:string,fields:ReportFields,save=false){const raw=reportHTML(demoReportState(holder.state),month,fields),html=demoAudience?raw.replace(/<body([^>]*)>/i,`<body$1>${localizedDemoReportNotice()}`):raw;if(save)download(html,`NUVIA_monthly_${month}.html`,'text/html');return html;}
 function copyPrevious(){try{
  if(reviewTab)throw Error('검토본에는 실제 기록을 가져올 수 없습니다.');
  if(holder.blocked)throw Error(error);
  if(student(holder.state).cards.length||holder.state.entries.length)throw Error('빈 작업대 후보에만 복사할 수 있습니다. 현재 기록을 덮어쓰지 않았습니다.');
  const oldKey='nuvia:personal-monthly:v1'+(review?':review':':personal'),raw=localStorage.getItem(oldKey);
  if(!raw)throw Error('이 브라우저에 이전 개인 월간 기록이 없습니다. 이전 화면에서 기록을 확인해 주세요.');
  const old=validate(JSON.parse(raw));if(old.mode!==holder.state.mode)throw Error('개인/검토 공간이 다릅니다.');
  if(!window.confirm('이전 개인 월간 기록을 새 후보에 복사합니다. 이전 화면과 기록은 그대로 남습니다. 계속할까요?'))return;
  old.workspaceId=holder.state.workspaceId;old.lab.labId=holder.state.lab.labId;old.studio=freshStudio();old.studio.stageChosen=true;
  for(const c of student(old).cards)old.studio.placements[c.id]={place:c.status==='done'?'collection':'shelf',tone:'blue'};
  const active=student(old).runs.find(r=>r.phase!=='closed');if(active){old.studio.placements[active.cardId].place='desk';old.studio.deskId=active.cardId;}
  commit(freezeTimers(old));setMessage('이전 기록은 그대로 두고 새 후보에 복사했습니다. 실행 중이던 시간은 멈춰 확인합니다.');
 }catch(e){setMessage((e as Error).message);}}
 return {state,student:student(state),act,message:noticeText(notice,localeOf(state)),error,clearMessage:()=>setNotice(null),backup,restore,report,copyPrevious};
}
export type Personal=ReturnType<typeof usePersonal>;
