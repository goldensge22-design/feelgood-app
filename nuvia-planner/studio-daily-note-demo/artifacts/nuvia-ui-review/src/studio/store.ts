import {useEffect,useState} from 'react';
import {student} from './domain';
import {createStudio as createState,updateStudio as update,freshStudio} from './studio-logic';
import {syncRoadmap} from './roadmap';
import {exportBackup,freezeTimers,importBackup,validate} from './persistence';
import {reportHTML,type ReportFields} from './report';
import type {PersonalState,Action} from './model';
import {setLocale,localeOf} from './i18n/runtime';
import {demoAudience,demoStorageKey,createDemo} from '../demo/session';
import {demoReportNotice} from '../demo/DemoNotice';
import {azDemoReportNotice} from './i18n/AzDemoNotice';
import {noticeFromText,noticeText,SAVED_NOTICE_KEY,type Notice} from './notices';
export const KEY='nuvia:studio:v1';
function download(content:string,name:string,type:string){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function load(review:boolean){
 const key=demoAudience?demoStorageKey(demoAudience):KEY+(review?':review':':personal'),id=localStorage.getItem(key+':id');
 try{
  const raw=localStorage.getItem(key),n=raw?freezeTimers(validate(JSON.parse(raw),id??undefined)):demoAudience?createDemo(demoAudience):createState();
  if(!raw){n.mode=review?'review':'personal';if(id)n.workspaceId=id;}
  if(n.mode!==(review?'review':'personal'))throw Error('검토와 개인 공간을 섞을 수 없습니다.');
  const ready=update(n,{type:'studio.visit',sessionId:crypto.randomUUID()},new Date().toISOString(),review);
  localStorage.setItem(key+':id',ready.workspaceId);localStorage.setItem(key,JSON.stringify(ready));return {state:ready,error:'',key};
 }catch{
  const n=createState();n.mode=review?'review':'personal';if(id)n.workspaceId=id;
  return {state:n,error:'기존 개인 자료가 손상되어 저장을 중단했습니다. 원문은 덮어쓰지 않았습니다. 같은 공간의 정상 백업을 복원하세요.',key};
 }
}
export function usePersonal(){
 const review=!demoAudience&&new URLSearchParams(location.search).get('review')==='1';
 const [initial]=useState(()=>load(review)),[state,setState]=useState(initial.state),[error,setError]=useState(initial.error),[notice,setNotice]=useState<Notice|null>(null);
 const setMessage=(text:string)=>setNotice(text?noticeFromText(text):null);
 const [holder]=useState(()=>({state:initial.state,blocked:!!initial.error}));
 setLocale(localeOf(state));
 function commit(n:PersonalState){const next=structuredClone(n);next.studio??=freshStudio();syncRoadmap(next);const clean=validate(next,holder.state.workspaceId);localStorage.setItem(initial.key,JSON.stringify(clean));holder.state=clean;setState(clean);}
 function act(a:Action){try{if(holder.blocked)throw Error(error);commit(update(holder.state,a,new Date().toISOString(),review));if(a.type!=='studio.note')setNotice({key:SAVED_NOTICE_KEY});return true;}catch(e){setMessage((e as Error).message);return false;}}
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
  if(!window.confirm(scope==='personal'?'내 개인 기록을 백업 시점으로 교체합니다. 이후 수정은 사라질 수 있습니다. 다른 학생·교사 전체는 가져오지 않습니다. 현재 백업을 먼저 보관했나요?':'검토 공간 전체를 백업 시점으로 교체합니다. 이후 수정이 사라질 수 있습니다. 계속할까요?'))return;
  commit(next);holder.blocked=false;setError('');setMessage('검증 후 복원했습니다. 타이머는 멈춘 상태이며 본인이 시간 확인 후 재개하세요.');
 }catch(e){setMessage((e as Error).message);}}
 function report(month:string,fields:ReportFields,save=false){const raw=reportHTML(holder.state,month,fields),html=demoAudience?raw.replace(/<body([^>]*)>/i,`<body$1>${localeOf(holder.state)==='az'?azDemoReportNotice:demoReportNotice}`):raw;if(save)download(html,`NUVIA_monthly_${month}.html`,'text/html');return html;}
 function copyPrevious(){try{
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
