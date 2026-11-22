/** Synthetic review data only. Not authentication and never a production storage adapter. */
import { REVIEW_AUDIENCE, reviewAudience, type ReviewAudience } from './review-audience';

export const REVIEW_LEGACY='nuvia:review-demo:v1:';
const ROOT='nuvia:review-device:v2:';
const VALID_ID=/^(demo-default|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
const SAFE_KEY=/^[a-zA-Z0-9:._-]{1,240}$/;
export const ORIGINAL_STUDIO='original-studio:v1';
export const RESEARCH_CONSENT='review:research-consent:v1';
export type ReviewEvent = {
  id:string; key:string; activity:string; clientAt:string; receivedAt:null;
  previous:number; revision:number; at:number; remove:number; insert:string; deleted:boolean;
};
export type ReviewDataset = { schema:2; profile:string; sourceProfile?:string; events:ReviewEvent[]; values:Record<string,string>; revisions:Record<string,number> };
let active:string|undefined;
const seen=new Map<string,number>();
const pending=new Map<string,{count:number;latest:string;reason:string;value:string|null;activity:string;eventId?:string}>();
const failing=new Set<string>();

function empty(profile:string):ReviewDataset {
  return {schema:2,profile,values:Object.create(null),revisions:Object.create(null),events:[]};
}
export function reviewProfile():string {
  if(active)return active;
  try {
    const pinned=sessionStorage.getItem(ROOT+'active');
    const latest=localStorage.getItem(ROOT+'recent');
    const hasUnmigratedLegacy=sessionStorage.getItem(ROOT+'migrated')!=='1' &&
      Object.keys(sessionStorage).some(k=>k.startsWith(REVIEW_LEGACY));
    active=hasUnmigratedLegacy?'demo-default':[pinned,latest].find((id):id is string=>!!id&&VALID_ID.test(id))??'demo-default';
    // Keep each open tab pinned, even if another tab selects a different profile.
    sessionStorage.setItem(ROOT+'active',active);
  } catch { active??='demo-default'; }
  return active;
}
const profileKey=(id:string)=>ROOT+'data:'+id;
function normalized(k:string) {
  const key=k.startsWith(REVIEW_LEGACY)?k.slice(REVIEW_LEGACY.length):k;
  if(!SAFE_KEY.test(key)||['__proto__','prototype','constructor'].includes(key))throw Error('Invalid review storage key');
  return key;
}
function read(profile:string):ReviewDataset {
  const raw=localStorage.getItem(profileKey(profile));
  if(raw===null)return empty(profile);
  const data=JSON.parse(raw);
  if(data.schema!==2||data.profile!==profile||!data.values||!data.revisions||!Array.isArray(data.events))throw Error('INVALID_REVIEW_DATA');
  return data;
}
function announce() { window.dispatchEvent(new Event('nuvia-review-device')); }
function append(d:ReviewDataset,key:string,next:string|null,activity:string,mark?:{id:string;at:string}) {
  const old=d.values[key]??'';
  if(next===(Object.hasOwn(d.values,key)?old:null))return;
  const text=next??'';
  let at=0,end=0;
  while(at<old.length&&at<text.length&&old[at]===text[at])at++;
  while(end<old.length-at&&end<text.length-at&&old[old.length-1-end]===text[text.length-1-end])end++;
  const previous=d.revisions[key]??0;
  d.events.push({id:mark?.id??crypto.randomUUID(),key,activity,clientAt:mark?.at??new Date().toISOString(),receivedAt:null,
    previous,revision:previous+1,at,remove:old.length-at-end,insert:text.slice(at,text.length-end),deleted:next===null});
  if(next===null) delete d.values[key]; else d.values[key]=next;
  d.revisions[key]=previous+1;
}
// Legacy data from this tab can only seed the default profile. Raw keys are retained.
function migrate(d:ReviewDataset):ReviewDataset {
  if(d.profile!=='demo-default' || sessionStorage.getItem(ROOT+'migrated')==='1')return d;
  const studioId=sessionStorage.getItem(REVIEW_LEGACY+ORIGINAL_STUDIO+':id');
  const legacyNav=studioId?`nuvia-studio-nav:${studioId}:personal`:null;
  const values=Object.keys(sessionStorage).filter(key=>key.startsWith(REVIEW_LEGACY)||key===legacyNav)
    .map(key=>[normalized(key),sessionStorage.getItem(key)] as const);
  if(!values.length)return d;
  // A second old tab can contain a divergent draft: do not overwrite the first or mix them.
  if(values.some(([key,value])=>Object.hasOwn(d.values,key)&&d.values[key]!==value)){
    const recovered=empty(crypto.randomUUID());
    for(const [key,value] of values)append(recovered,key,value,'legacy.recovered');
    localStorage.setItem(profileKey(recovered.profile),JSON.stringify(recovered));
    sessionStorage.setItem(ROOT+'active',recovered.profile);
    sessionStorage.setItem(ROOT+'migrated','1');
    localStorage.setItem(ROOT+'recent',recovered.profile);
    active=recovered.profile;
    return recovered;
  }else{
    for(const [key,value] of values)append(d,key,value,'legacy.migrated');
    localStorage.setItem(profileKey(d.profile),JSON.stringify(d));
    localStorage.setItem(ROOT+'recent',d.profile);
  }
  sessionStorage.setItem(ROOT+'migrated','1');
  return d;
}
function dataset() { return migrate(read(reviewProfile())); }
export function reviewWrite(k:string,value:string|null,activity='draft.changed',eventId?:string) {
  const key=normalized(k),q=pending.get(key);
  try {
    const d=dataset();
    if((Object.hasOwn(d.values,key)?d.values[key]:null)===value || eventId&&d.events.some(e=>e.id===eventId)){
      seen.set(key,d.revisions[key]??0);pending.delete(key);failing.delete(key);announce();return;
    }
    if(seen.has(key)&&seen.get(key)!==(d.revisions[key]??0))throw Error('REVIEW_CONFLICT');
    const at=new Date().toISOString();
    for(let i=0;i<(q?.count??0);i++){
      // Failure metadata has no copy of the unsaved draft text.
      append(d,'review:local-failures',JSON.stringify({key,reason:q?.reason,clientAt:q?.latest,attempt:i+1,prior:d.revisions['review:local-failures']??0}),'storage.failed');
    }
    append(d,key,value,q?`${activity}.retry`:activity,eventId?{id:eventId,at}:undefined);
    localStorage.setItem(profileKey(d.profile),JSON.stringify(d));
    seen.set(key,d.revisions[key]);pending.delete(key);failing.delete(key);announce();
  } catch(error) {
    failing.add(key);
    pending.set(key,{count:(q?.count??0)+1,latest:new Date().toISOString(),reason:error instanceof Error && error.message==='REVIEW_CONFLICT'?'conflict':'write',value,activity,eventId});
    announce();throw error;
  }
}
export const reviewStorage:Pick<Storage,'getItem'|'setItem'|'removeItem'>={
  getItem(k) {
    const key=normalized(k),d=dataset();
    if(!failing.has(key))seen.set(key,d.revisions[key]??0);
    return Object.hasOwn(d.values,key)?d.values[key]:null;
  },
  setItem(k,v){reviewWrite(k,v);},
  removeItem(k){reviewWrite(k,null,'local.removed');},
};
export const reviewStorageFailures=()=>pending.size;
export function retryReviewStorage() {
  for(const [key,entry] of [...pending]) {
    try { reviewWrite(key,entry.value,entry.activity,entry.eventId); } catch { /* keep the pending edit */ }
  }
  return pending.size===0;
}
export function reviewProfiles():string[]{
  return [...new Set(['demo-default',reviewProfile(),...Object.keys(localStorage).filter(k=>k.startsWith(ROOT+'data:')).map(k=>k.slice((ROOT+'data:').length)).filter(id=>VALID_ID.test(id))])];
}
export function chooseReviewProfile(id:string) {
  if(!VALID_ID.test(id))throw Error('INVALID_PROFILE');
  if(pending.size&&!retryReviewStorage())throw Error('REVIEW_CHANGES_UNSAVED');
  // Preserve legacy data before explicitly leaving the default profile.
  dataset();
  sessionStorage.setItem(ROOT+'active',id);
  localStorage.setItem(ROOT+'recent',id);
}

/** Switching to another audience switches profiles, never relabels or copies a known profile. */
export function switchReviewAudience(audience:ReviewAudience,startKey:string):void {
  if(pending.size&&!retryReviewStorage())throw Error('REVIEW_CHANGES_UNSAVED');
  const current=dataset();
  function audienceOf(d:ReviewDataset){
    try{return reviewAudience(JSON.parse(d.values[REVIEW_AUDIENCE]??'null'));}catch{return null;}
  }
  const candidates=reviewProfiles().filter(id=>id!==current.profile);
  const preferred=localStorage.getItem(ROOT+'audience-profile:'+audience);
  if(preferred&&candidates.includes(preferred)){
    candidates.splice(candidates.indexOf(preferred),1);
    candidates.unshift(preferred);
  }
  // An unclassified profile is used only after an explicit selection. Opening
  // another existing role does not consume a separately created empty profile.
  const hasOwnAudience=audienceOf(current);
  let target=current;
  if(hasOwnAudience!==audience){
    if(hasOwnAudience){
      target=candidates.map(id=>{try{return read(id);}catch{return null;}})
        .find((value):value is ReviewDataset=>!!value&&audienceOf(value)===audience)??empty(crypto.randomUUID());
    }
  }
  append(target,REVIEW_AUDIENCE,JSON.stringify(audience),'audience.selected');
  append(target,normalized(startKey),'true','review.started');
  localStorage.setItem(profileKey(target.profile),JSON.stringify(target));
  localStorage.setItem(ROOT+'audience-profile:'+audience,target.profile);
  chooseReviewProfile(target.profile);
}
export function reviewBackup():string {
  return JSON.stringify({kind:'nuvia-synthetic-review-backup',data:dataset()});
}
export function restoreReviewBackup(text:string):string {
  if(new TextEncoder().encode(text).length>4_000_000)throw Error('BACKUP_TOO_LARGE');
  const {kind,data}=JSON.parse(text);
  if(kind!=='nuvia-synthetic-review-backup'||data?.schema!==2||!VALID_ID.test(data.profile)||!Array.isArray(data.events))throw Error('INVALID_BACKUP');
  const clean=empty(crypto.randomUUID());clean.sourceProfile=data.profile;
  const ids=new Set<string>();
  for(const e of data.events as ReviewEvent[]){
    const key=normalized(e.key);
    const old=clean.values[key]??'';
    if(!e||key!==e.key||!VALID_ID.test(e.id)||ids.has(e.id)||typeof e.activity!=='string'||e.activity.length>120||
      typeof e.clientAt!=='string'||!Number.isFinite(Date.parse(e.clientAt))||e.receivedAt!==null||
      !Number.isInteger(e.at)||!Number.isInteger(e.remove)||e.at<0||e.remove<0||e.at+e.remove>old.length||
      typeof e.insert!=='string'||typeof e.deleted!=='boolean'||e.previous!==(clean.revisions[key]??0)||e.revision!==e.previous+1)throw Error('INVALID_BACKUP_EVENT');
    if(e.deleted)delete clean.values[key];else clean.values[key]=old.slice(0,e.at)+e.insert+old.slice(e.at+e.remove);
    ids.add(e.id);clean.revisions[key]=e.revision;
    clean.events.push({id:e.id,key,activity:e.activity,clientAt:e.clientAt,receivedAt:null,previous:e.previous,revision:e.revision,at:e.at,remove:e.remove,insert:e.insert,deleted:e.deleted});
  }
  if(JSON.stringify(clean.values)!==JSON.stringify(data.values)||JSON.stringify(clean.revisions)!==JSON.stringify(data.revisions))throw Error('BACKUP_MISMATCH');
  // Research consent never transfers to a different pseudonymous profile.
  append(clean,RESEARCH_CONSENT,null,'research.restored-without-consent');
  localStorage.setItem(profileKey(clean.profile),JSON.stringify(clean));
  return clean.profile;
}
