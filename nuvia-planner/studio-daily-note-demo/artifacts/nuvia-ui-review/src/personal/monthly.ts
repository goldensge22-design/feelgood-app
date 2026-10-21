import type {PersonalState,Target,Agreement,Entry,Draft} from './model';
import {routeFor} from '../enhancement/domain';
import {preferredHelp} from './insights';
export const localDate=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const monthOf=(date:string)=>date.slice(0,7);
export function nextMonth(month:string){const [y,m]=month.split('-').map(Number);return `${m===12?y+1:y}-${String(m===12?1:m+1).padStart(2,'0')}`;}
export const student=(s:PersonalState)=>s.lab.students['student-a'];
export function areas(s:PersonalState):Target[]{const r=routeFor(student(s));return [...new Set<Target>([...(r.targets.length?r.targets:[r.target]),...s.agreements.map(a=>a.axis),...s.entries.map(a=>a.axis)])];}
export interface Stats {axis:Target;month:string;agreement?:Agreement;initial?:Agreement;versions:Agreement[];performed:number;denominator:number;rawRate:number|null;displayRate:string;band:'100'|'70'|'50'|'0'|null;extra:number;skipped:number;unobserved:number;notApplicable:number;evidence:Entry[];observedDays:number;conservative:boolean;label:string;provisional:boolean}
export function stats(s:PersonalState,month:string,axis:Target,agreementId?:string):Stats{
 const versions=s.agreements.filter(a=>a.month===month&&a.axis===axis),initial=versions[0],agreement=versions.find(a=>a.id===agreementId)??initial;
 const evidence=s.entries.filter(e=>e.axis===axis&&monthOf(e.localDate)===month&&(!agreement?.after||e.enteredAt>agreement.after));
 const performedIds=new Set(evidence.filter(e=>e.status==='performed').map(e=>e.practiceId));
 const skippedIds=new Set(evidence.filter(e=>e.status==='skipped'&&!performedIds.has(e.practiceId)).map(e=>e.practiceId));
 const unknownIds=new Set(evidence.filter(e=>e.status==='unobserved'&&!performedIds.has(e.practiceId)&&!skippedIds.has(e.practiceId)).map(e=>e.practiceId));
 const performed=performedIds.size,denominator=agreement?.count??0,valid=performed+skippedIds.size>0;
 const rawRate=denominator>0&&valid?performed/denominator*100:null;
 const band=rawRate===null?null:rawRate>=100?'100':rawRate>=70?'70':rawRate>=50?'50':'0';
 const displayRate=rawRate===null?'—':rawRate>=100?'100%':`${Math.floor(performed*1000/denominator)/10}%`;
 const days=[...new Set(evidence.map(e=>e.localDate))].sort();
 const observedDays=days.length?Math.round((Date.parse(days.at(-1)!+'T12:00:00Z')-Date.parse(days[0]+'T12:00:00Z'))/86400000)+1:0;
 return {axis,month,agreement,initial,versions,performed,denominator,rawRate,displayRate,band,extra:Math.max(0,performed-denominator),skipped:skippedIds.size,unobserved:unknownIds.size,notApplicable:evidence.filter(e=>e.optionalAttention==='not_applicable').length,evidence,observedDays,conservative:performed<3||observedDays<7,label:denominator===0?'목표 미설정':!valid?'기록 부족':'확인된 수행에 근거한 참고값',provisional:month===monthOf(localDate())};
}
export function suggest(s:PersonalState,month:string,axis:Target,at=new Date().toISOString()):Draft{
 const p=student(s),r=routeFor(p),v=stats(s,month,axis),last=v.evidence.at(-1);
 const card=p.cards.find(c=>c.title===last?.cardTitle)??p.cards.find(c=>c.status!=='done');
 const meta=card?s.meta[card.id]:undefined;
 const method=[...p.methods].reverse().find(m=>m.helpful==='yes')?.name??card?.method??'지금 방법을 유지하고 직접 선택하기';
 const count=v.initial?.count??2,chunk=card?.scope||'본인이 고를 작은 분량',help=p.supportChoice==='official'?r.support:p.supportChoice;
 const draft:Draft={id:crypto.randomUUID(),fromMonth:month,toMonth:nextMonth(month),axis,count,chunk,method,help,date:nextMonth(month)+'-01',baseline:{count,chunk,method,help},status:'pending',createdAt:at,cardIds:[],reasons:[]};
 draft.reasons.push(`${v.performed}/${v.denominator}회 · ${v.label} · 관찰 ${v.observedDays}일 · 미확인 ${v.unobserved}회`);
 draft.reasons.push(p.assessment?'제공된 검사 분류·지원 순서를 보존합니다. 점수를 바꾸지 않습니다.':'검사 미연결: 자기선택 일반 활동이며 공식 보완 판정이 아닙니다.');
 if(v.rawRate===null||v.conservative){
  draft.reasons.push('근거가 적어 현재 방법을 유지하고 기록을 더 쌓는 보수적 초안입니다. 3회/7일은 이 데모의 보수적 안내 조건이지 검증된 최소 표본이 아닙니다.');
 }else if(v.band==='100')draft.reasons.push('합의한 연습을 채웠습니다. 분량·시간·난이도를 자동으로 올리지 않고 유지합니다. 다른 과제 적용/도움 줄이기는 본인이 선택하세요.');
 else if(v.band==='70'){draft.reasons.push('도움된 방법은 유지합니다. 막힌 단계나 한 번 분량 중 한 가지만 조정해 보세요.');draft.chunk=`${chunk} 중 먼저 할 부분을 직접 고르기`;}
 else if(v.band==='50'){draft.chunk=`${chunk} 중 첫 한 부분`;draft.reasons.push('한 번 분량만 줄이는 초안입니다. 목표의 핵심 행동은 본인이 하고 강점 안내를 첫 행동 결정에 활용합니다.');}
 else{
  const difficulty=meta?.difficulty||last?.difficulty||'';
  if(/시간|일정|많|목표량/.test(difficulty)){draft.count=Math.max(1,Math.ceil(count/2));draft.reasons.push('본인이 남긴 시간·일정 부담을 참고해 빈도만 줄이는 초안입니다. 개인 메모 원문을 공유하지 않고 강점만으로 원인을 단정하지 않습니다.');}
  else{draft.chunk='직접 고른 아주 작은 행동 하나';draft.reasons.push('시간 부족/과제 난도/도움 부적합/일정 변화/기록 누락은 선택적으로 확인하세요. 원인을 추정하지 않고 한 번 분량만 작게 제안합니다.');}
 }
 if(r.support==='simultaneous')draft.reasons.push('전체 지도에서 오늘 할 분량을 본인이 고릅니다.');
 if(r.support==='successive')draft.reasons.push('어디부터 → 어디까지 → 몇 분 순서로 본인이 결정합니다.');
 if(meta?.examDate||card?.deadline)draft.reasons.push(`실제 입력 일정: ${meta?.examDate||card?.deadline}. 기존 일정과 충돌하면 수락 단계에서 선택합니다.`);
 if(meta?.weeklyScope)draft.reasons.push(`본인 주간 범위: ${meta.weeklyScope}`);
 const preferred=preferredHelp(s);
 if(preferred){draft.help=preferred;draft.reasons.push('실제 과제에서 본인이 도움됐다고 응답한 도움을 다음 지원 후보로 참고했습니다. 자기보고 선호이며 검사 분류·목표·기존 일정은 바꾸지 않습니다. 수락 전 수정·보류할 수 있습니다.');}
 return draft;
}
