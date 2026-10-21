import {useEffect,useState} from 'react';
import {createState,update,student} from './domain';
import {exportBackup,freezeTimers,importBackup,validate} from './persistence';
import {reportHTML,type ReportFields} from './report';
import type {PersonalState,Action} from './model';
export const KEY='nuvia:personal-monthly:v1';
function download(content:string,name:string,type:string){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function load(review:boolean){
 const key=KEY+(review?':review':':personal'),id=localStorage.getItem(key+':id');
 try{
  const raw=localStorage.getItem(key),n=raw?freezeTimers(validate(JSON.parse(raw),id??undefined)):createState();
  if(!raw){n.mode=review?'review':'personal';if(id)n.workspaceId=id;}
  if(n.mode!==(review?'review':'personal'))throw Error('검토와 개인 공간을 섞을 수 없습니다.');
  localStorage.setItem(key+':id',n.workspaceId);localStorage.setItem(key,JSON.stringify(n));return {state:n,error:'',key};
 }catch{
  const n=createState();n.mode=review?'review':'personal';if(id)n.workspaceId=id;
  return {state:n,error:'기존 개인 자료가 손상되어 저장을 중단했습니다. 원문은 덮어쓰지 않았습니다. 같은 공간의 정상 백업을 복원하세요.',key};
 }
}
export function usePersonal(){
 const review=new URLSearchParams(location.search).get('review')==='1';
 const [initial]=useState(()=>load(review)),[state,setState]=useState(initial.state),[error,setError]=useState(initial.error),[message,setMessage]=useState('');
 const [holder]=useState(()=>({state:initial.state,blocked:!!initial.error}));
 function commit(n:PersonalState){const clean=validate(n,holder.state.workspaceId);localStorage.setItem(initial.key,JSON.stringify(clean));holder.state=clean;setState(clean);}
 function act(a:Action){try{if(holder.blocked)throw Error(error);commit(update(holder.state,a,new Date().toISOString(),review));setMessage('이 브라우저에 저장했습니다.');return true;}catch(e){setMessage((e as Error).message);return false;}}
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
   download(await exportBackup(holder.state,scope),scope==='personal'?'NUVIA_my_records.json':'NUVIA_review_workspace.json','application/json');
   setMessage(scope==='personal'?'내 기록만 백업했습니다. 실행 중 타이머는 복원 시 안전하게 멈춰 재개를 묻습니다.':'전체 시연 공간을 백업했습니다. 평문 파일이므로 공개하지 마세요.');
  }catch(e){setMessage((e as Error).message);}
 }
 async function restore(file:File){try{
  if(file.size>15000000)throw Error('15MB 이하 파일만 선택하세요.');
  const raw=await file.text(),next=await importBackup(raw,holder.state),scope=JSON.parse(raw).scope;
  if(!window.confirm(scope==='personal'?'내 개인 기록을 백업 시점으로 교체합니다. 이후 수정은 사라질 수 있습니다. 다른 학생·교사 전체는 가져오지 않습니다. 현재 백업을 먼저 보관했나요?':'검토 공간 전체를 백업 시점으로 교체합니다. 이후 수정이 사라질 수 있습니다. 계속할까요?'))return;
  commit(next);holder.blocked=false;setError('');setMessage('검증 후 복원했습니다. 타이머는 멈춘 상태이며 본인이 시간 확인 후 재개하세요.');
 }catch(e){setMessage((e as Error).message);}}
 function report(month:string,fields:ReportFields,save=false){const html=reportHTML(holder.state,month,fields);if(save)download(html,`NUVIA_monthly_${month}.html`,'text/html');return html;}
 return {state,student:student(state),act,message,error,clearMessage:()=>setMessage(''),backup,restore,report};
}
export type Personal=ReturnType<typeof usePersonal>;
