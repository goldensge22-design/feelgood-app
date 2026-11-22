import type { CareerLabHandoff, CareerState } from '@workspace/api-client-react';
import { hashStr } from './career';

export type LabMaterial = Omit<CareerLabHandoff,'id'|'approvedAt'|'revokedAt'|'plannerCardId'>;
export const labMaterialKey=(m:LabMaterial)=>JSON.stringify([m.audience,m.sourceId,m.sourceVersion,m.title,m.keyword,m.excerpt,m.purpose,m.url??'',m.company??'',m.job??'']);
export function currentLabMaterial(state:CareerState,h:CareerLabHandoff){
  if(h.revokedAt)return false;
  if(h.audience!=='youth'||!h.sourceId.startsWith('activity:'))return true;
  try{
    const lab=JSON.parse(state.integrated?.youthLab??'null');
    const activity=lab?.activities?.find((item:{id:string})=>item.id===h.sourceId.slice(9));
    return !!activity?.updatedAt&&h.sourceVersion.endsWith(`/${activity.updatedAt}`);
  }catch{return false;}
}
export const latestLabMaterial=(state:CareerState,audience:LabMaterial['audience'])=>
  (state.integrated?.labHandoffs??[]).filter(h=>h.audience===audience&&currentLabMaterial(state,h)).at(-1);

export function confirmLabMaterial(s:CareerState,material:LabMaterial,at=new Date().toISOString()){
  const records=s.integrated?.labHandoffs??[];
  if(records.some(h=>!h.revokedAt&&labMaterialKey(h)===labMaterialKey(material)))return s;
  if(records.length>=100||!material.title.trim()||!material.excerpt.trim())return s;
  // The ordinal distinguishes explicit consent after revocation; retrying the same
  // pending consent keeps the previous request ID, including after navigation.
  const earlier=records.filter(h=>labMaterialKey(h)===labMaterialKey(material)).length;
  const id=`lab-${hashStr(labMaterialKey(material))}-${earlier}`;
  if(records.some(h=>h.id===id))return s; // Never overwrite even in a hash collision.
  return {...s,integrated:{...s.integrated,labHandoffs:[...records,{...material,id,approvedAt:at}]}};
}

export function revokeLabMaterial(s:CareerState,id:string,at=new Date().toISOString()){
  return {...s,integrated:{...s.integrated,labHandoffs:(s.integrated?.labHandoffs??[]).map(h=>h.id===id&&!h.revokedAt?{...h,revokedAt:at}:h)}};
}

export function attachPlannerReceipt(s:CareerState,raw:string){
  const planner=JSON.parse(raw);
  const creations=planner.studio?.creations;
  const handoffs=s.integrated?.labHandoffs?.map(h=>{
    const cardId=creations?.[h.id];
    return typeof cardId==='string'&&!h.plannerCardId?{...h,plannerCardId:cardId}:h;
  });
  return {...s,integrated:{...s.integrated,planner:raw,...(handoffs?{labHandoffs:handoffs}:{})}};
}
