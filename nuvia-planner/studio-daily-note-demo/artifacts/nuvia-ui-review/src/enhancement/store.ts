import {useEffect,useState} from 'react';
import {apply,createLab,STORAGE_KEY} from './domain';
import {exportLab,importLab,validateLab} from './persistence';
import type {Command,LabState} from './model';
const ID_KEY=STORAGE_KEY+':id';
const ROLE_KEY=STORAGE_KEY+':role';
function tabRole(state:LabState){const role=sessionStorage.getItem(ROLE_KEY);if(role==='teacher'||role==='student-a'||role==='student-b')state.active=role;return state;}
function load(){
 let expected:string|null=null;
 try{
  expected=localStorage.getItem(ID_KEY);
  const raw=localStorage.getItem(STORAGE_KEY);
  if(raw){const state=tabRole(validateLab(JSON.parse(raw),expected??undefined));if(!expected)localStorage.setItem(ID_KEY,state.labId);return {state,error:''};}
  const state=createLab();if(expected)state.labId=expected;localStorage.setItem(ID_KEY,state.labId);localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return {state,error:''};
 }catch{
  const state=createLab();if(expected)state.labId=expected;
  return {state,error:'기존 보강 자료를 읽을 수 없어 덮어쓰기를 멈췄습니다. 같은 공간의 정상 백업을 가져와 주세요. 기존 플래너 자료는 건드리지 않습니다.'};
 }
}
export function useLab(){
 const [initial]=useState(load),[state,setState]=useState<LabState>(initial.state),[loadError,setLoadError]=useState(initial.error),[message,setMessage]=useState('');
 // A ref-like synchronous holder is deliberate: rapid double clicks must not use a stale render.
 const [current]=useState(()=>({state:initial.state,blocked:!!initial.error}));
 useEffect(()=>{
  const onStorage=(e:StorageEvent)=>{if(e.key!==STORAGE_KEY||!e.newValue)return;try{
   const next=validateLab(JSON.parse(e.newValue),current.state.labId);next.active=current.state.active;
   current.state=next;setState(next);
  }catch{setMessage('다른 탭의 변경을 읽지 못했어요. 현재 자료는 유지합니다.');}};
  window.addEventListener('storage',onStorage);return()=>window.removeEventListener('storage',onStorage);
 },[current]);
 function commit(next:LabState){
  const clean=validateLab(next,current.state.labId);
  localStorage.setItem(STORAGE_KEY,JSON.stringify(clean));current.state=clean;setState(clean);
 }
 function act(cmd:Command){
  try{if(current.blocked)throw Error(loadError);const next=apply(current.state,cmd,new Date().toISOString(),new URLSearchParams(location.search).get('qa')==='1');commit(next);if(cmd.type==='role')sessionStorage.setItem(ROLE_KEY,next.active);setMessage('이 브라우저에 저장했어요. 서버·다른 기기에는 동기화하지 않습니다.');return true;}
  catch(e){setMessage((e as Error).message);return false;}
 }
 async function backup(){
  try{if(current.blocked)throw Error(loadError);const json=await exportLab(current.state);await importLab(json,current.state.labId);
   const url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='NUVIA_synthetic_enhancement_backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('새 카드·실행·수업·공유의 백업 왕복 검증을 통과했어요. 합성 자료만 포함합니다.');
  }catch(e){setMessage((e as Error).message);}
 }
 async function restore(file:File){
   try{if(file.size>15000000)throw Error('15MB 이하의 백업을 선택해 주세요.');const next=await importLab(await file.text(),current.state.labId);
    if(!window.confirm('검증한 이 백업 시점으로 현재 보강 검토본의 합성 자료를 바꿉니다. 이후 수정은 사라질 수 있으니 먼저 현재 백업을 보관해 주세요. 기존 플래너 자료는 변경하지 않습니다. 복원할까요?'))return;
    commit(next);current.blocked=false;setLoadError('');setMessage('같은 검토 공간의 백업을 복원했어요. 기존 플래너 자료는 변경하지 않았습니다.');}
  catch(e){setMessage((e as Error).message);}
 }
 return {state,student:state.active==='teacher'?undefined:state.students[state.active],act,message,clearMessage:()=>setMessage(''),backup,restore,loadError};
}
