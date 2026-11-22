import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { chooseReviewProfile, RESEARCH_CONSENT, restoreReviewBackup, retryReviewStorage, reviewBackup, reviewProfile, reviewProfiles, reviewStorage, reviewStorageFailures, reviewWrite } from '@/lib/review-device';

export function ReviewSaveWarning() {
  const {locale}=useI18n();
  const [count,setCount]=useState(reviewStorageFailures);
  useEffect(()=>{
    const update=()=>setCount(reviewStorageFailures());
    const warn=(event:BeforeUnloadEvent)=>{if(reviewStorageFailures()){event.preventDefault();event.returnValue='';}};
    window.addEventListener('nuvia-review-device',update);
    window.addEventListener('beforeunload',warn);
    return ()=>{window.removeEventListener('nuvia-review-device',update);window.removeEventListener('beforeunload',warn);};
  },[]);
  if(!count)return null;
  return <p role="alert" className="text-sm" data-testid="review-device-save-error">
    {locale==='ko'?'기기에 저장하지 못한 변경이 있어요. 화면을 닫지 말고 다시 시도해 주세요. 다른 탭에서 같은 기록을 수정했다면 어느 쪽도 덮어쓰지 않습니다.':'Some changes are not saved on this device. Keep this tab open and retry. Concurrent changes are not overwritten.'}
    {' '}<button type="button" className="min-h-11 underline" onClick={retryReviewStorage}>{locale==='ko'?'다시 시도':'Retry'}</button>
  </p>;
}

export function ReviewDataControls() {
  const {locale}=useI18n();
  const ko=locale==='ko';
  const [status,setStatus]=useState('');
  const active=reviewProfile();
  const [consent,setConsent]=useState(()=>{
    try { return JSON.parse(reviewStorage.getItem(RESEARCH_CONSENT)??'null')?.granted===true; } catch { return false; }
  });
  let profiles=[active];
  try { profiles=reviewProfiles(); } catch { /* show the existing selection only */ }
  function select(id:string){
    if(reviewStorageFailures()){setStatus(ko?'저장 오류를 먼저 해결해 주세요.':'Resolve the pending save first.');return;}
    try {
      chooseReviewProfile(id);
      const path=location.pathname.replace(/\/demo\/review(?:\/.*)?$/,'/demo/review');
      location.assign(`${path}?lang=${encodeURIComponent(locale)}`);
    }catch{setStatus(ko?'프로필을 바꾸지 못했습니다.':'Could not switch the sample profile.');}
  }
  return <details className="rounded-lg border bg-white p-3 text-sm" data-testid="review-device-controls">
    <summary className="min-h-11 cursor-pointer content-center font-semibold">{ko?'가상 프로필 · 이 기기 저장 및 백업':'Sample profile · device storage and backup'}</summary>
    <p className="mb-2">{ko?'같은 브라우저에서 다시 열어도 남습니다. 가상 체험 전용이며 이 기기를 공유하는 사람에게 숨겨지는 계정 저장이 아닙니다. 개인정보를 입력하지 마세요.':'Records stay in this browser after reopening. This is not private account storage on a shared device. Use fictional data only.'}</p>
    <div className="flex flex-wrap items-center gap-2">
      <label>{ko?'가상 프로필':'Sample profile'}{' '}<select className="min-h-11 rounded border px-2" value={active} onChange={e=>select(e.target.value)} data-testid="select-review-profile">
        {profiles.map((id,index)=><option key={id} value={id}>{id==='demo-default'?(ko?'기본 가상 프로필':'Default sample'):`${ko?'가상 프로필':'Sample profile'} ${index} · ${id.slice(0,6)}`}</option>)}
      </select></label>
      <button type="button" className="min-h-11 text-blue underline" onClick={()=>select(crypto.randomUUID())} data-testid="button-review-profile-new">{ko?'빈 가상 프로필 시작':'Start an empty sample profile'}</button>
      <button type="button" className="min-h-11 text-blue underline" data-testid="button-review-backup" onClick={()=>{
        try{
          const blob=new Blob([reviewBackup()],{type:'application/json'});
          const url=URL.createObjectURL(blob),link=document.createElement('a');
          link.href=url;link.download='nuvia-synthetic-review-backup.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
        }catch{setStatus(ko?'저장된 데이터를 읽지 못했습니다. 원본은 그대로입니다.':'Saved data could not be read. The original is unchanged.');}
      }}>{ko?'기기에 저장된 기록 백업':'Back up saved device records'}</button>
      <label>{ko?'새 가상 프로필로 백업 복원 (기존 기록 유지)':'Restore as a new sample profile (keeps existing records)'}
        <input type="file" accept="application/json,.json" className="block max-w-full py-2" data-testid="input-review-restore" onChange={async e=>{
          const target=e.currentTarget,file=target.files?.[0];target.value='';
          if(!file)return;
          if(reviewStorageFailures()){setStatus(ko?'저장 오류를 먼저 해결해 주세요.':'Resolve the pending save first.');return;}
          try { if(file.size>4_000_000)throw Error();select(restoreReviewBackup(await file.text())); }
          catch { setStatus(ko?'지원하는 검토본 백업을 읽지 못했습니다. 현재 기록은 바뀌지 않았습니다.':'Could not restore this review backup. Existing records are unchanged.'); }
        }}/></label>
    </div>
    <label className="mt-3 flex min-h-11 items-start gap-2 border-t pt-2">
      <input type="checkbox" checked={consent} className="mt-1" data-testid="checkbox-review-research" onChange={e=>{
        const granted=e.target.checked;
        try {
          reviewWrite(RESEARCH_CONSENT,JSON.stringify({purpose:'assessment-refinement-research',policyVersion:'review-research-v1',profile:active,granted,state:granted?'granted':'withdrawn',clientAt:new Date().toISOString(),receivedAt:null}),granted?'research.granted':'research.withdrawn');
          setConsent(granted);
        }catch{setStatus(ko?'연구 선택을 저장하지 못했습니다.':'The research preference was not saved.');}
      }}/>
      <span>{ko?'검사 정밀화 연구 목적 이용에 동의 (선택). 변경·철회할 수 있습니다. 이 체험은 선택하더라도 연구 데이터를 전송하지 않으며, 기기 저장과는 별개입니다.':'Optional research consent for assessment refinement. You may change or withdraw it. This review never sends research data; device storage is separate.'}</span>
    </label>
    {status&&<p role="status">{status}</p>}
  </details>;
}
