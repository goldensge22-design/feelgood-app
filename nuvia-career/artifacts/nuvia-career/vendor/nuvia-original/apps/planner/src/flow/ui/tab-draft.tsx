import {useEffect,useReducer,useRef,useState,type Dispatch,type SetStateAction} from 'react';
import {useFlowLocale} from './FlowLocale';
const SAVE_COPY={ko:{draft:'작성 중 내용은 이 브라우저 탭에 임시 보관됩니다. 최종 기록은 저장 버튼으로 서버에 저장해 주세요.',failed:'브라우저 임시 보관에 실패했습니다. 이동 전에 내용을 복사하고 저장 버튼으로 서버에 저장해 주세요.',postingAdded:'공고 원문을 내 자료에 추가했습니다. 상단 저장 상태에서 서버 저장 완료를 확인하세요.',viewPosting:'저장한 공고 원문 보기',postingOriginal:'내가 저장한 공고 원문',authUnavailable:'계정 연결이 지연되어 저장 공간을 열지 못했습니다. 작성 기록을 초기화하지 않았습니다.',retryAuth:'연결 다시 확인'},en:{draft:'Work in progress is temporarily kept in this browser tab. Use Save to store the final record on the server.',failed:'Temporary browser storage failed. Copy your text and save it before leaving.',postingAdded:'Posting added. Check the workspace status for confirmation that it was saved to the server.',viewPosting:'View saved posting',postingOriginal:'Saved posting text',authUnavailable:'The account connection is delayed. Your writing has not been reset.',retryAuth:'Check connection again'}};
// Korean source copy; English fallback. Other locales are not marked reviewed.
export const saveDraftText=(locale:string,key:keyof typeof SAVE_COPY.ko)=>(locale==='ko'?SAVE_COPY.ko:SAVE_COPY.en)[key];
const PREFIX='nuvia-tab-draft/v1:';
export function readDraft<T>(key:string|null,initial:()=>T):T{
 if(key)try{const raw=sessionStorage.getItem(PREFIX+key);if(raw&&raw.length<2_000_000){const d=JSON.parse(raw);if(d.key===key&&Date.now()-d.at<86_400_000&&Object.hasOwn(d,'value'))return d.value;}}catch{/* retain live editing even when browser storage is unavailable */}
 return initial();
}
export function writeDraft(key:string|null,value:unknown){
 if(!key)return false;
 try{sessionStorage.setItem(PREFIX+key,JSON.stringify({key,at:Date.now(),value}));return true;}
 catch{if(typeof window!=='undefined')window.dispatchEvent(new Event('nuvia-draft-storage-error'));return false;}
}
export function clearDraft(key:string|null){if(key)try{sessionStorage.removeItem(PREFIX+key);}catch{}}
/** Writes in the input handler, before navigation can unmount the component.
 * Keys must contain the authenticated owner/workspace; no anonymous shared key.
 * Browser drafts are never server-save receipts or consent to share. */
export function useTabDraft<T>(key:string|null,initial:T|(()=>T)):[T,Dispatch<SetStateAction<T>>]{
 const cell=useRef<{key:string|null;value:T}|null>(null),[,render]=useReducer(n=>n+1,0);
 if(!cell.current||cell.current.key!==key)cell.current={key,value:readDraft(key,()=>typeof initial==='function'?(initial as ()=>T)():initial)};
 const set:Dispatch<SetStateAction<T>>=next=>{if(cell.current?.key!==key)return;const value=typeof next==='function'?(next as (v:T)=>T)(cell.current.value):next;cell.current={key,value};writeDraft(key,value);render();};
 return [cell.current.value,set];
}
export function DraftNotice(){const {locale}=useFlowLocale();const [failed,setFailed]=useState(false);useEffect(()=>{const fail=()=>setFailed(true);window.addEventListener('nuvia-draft-storage-error',fail);return()=>window.removeEventListener('nuvia-draft-storage-error',fail);},[]);
 return <p role="status" data-testid="tab-draft-notice">{saveDraftText(locale,failed?'failed':'draft')}</p>;
}
