import type {PersonalState} from './model';
import {student,localDate,monthOf} from './domain';
import {elapsed} from '../enhancement/domain';
import type {StudioAction,RoadSource,RoadExperience,SourceSnapshot,ExperienceField} from './studio-model';
import {experienceFields} from './studio-model';
import {contextOf} from '../planner-library/domain';
import {libText} from '../planner-library/i18n';
import {localeOf} from './i18n/config';
export const fieldNames:Record<ExperienceField,string>={situation:'목표·상황',difficulty:'어려움',action:'직접 한 행동',adjustment:'조정한 방법',result:'결과·근거',learning:'배운 점'};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function syncRoadmap(s:PersonalState,at=new Date().toISOString()){
 const d=s.studio;if(!d)return;const p=student(s),seen=new Set<string>();
 for(const c of p.cards){
  const changes=c.history.filter(h=>h.at&&Number.isFinite(Date.parse(h.at))).map(h=>({at:h.at,reason:h.reason}));
  const runs=p.runs.filter(r=>r.cardId===c.id),entry=(rid:string)=>s.entries.find(e=>e.runId===rid);
  const runMonth=(r:typeof runs[number])=>entry(r.id)?.localDate.slice(0,7)??monthOf(localDate(new Date(r.startedAt)));
  const months=new Set([...changes.map(h=>monthOf(localDate(new Date(h.at)))),...runs.map(runMonth)]);
  if(!months.size)months.add(monthOf(c.date||localDate(new Date(at))));
  for(const month of months){
   const id=`${month}:${c.id}`;seen.add(id);const m=s.meta[c.id];
   const snapshot:SourceSnapshot={...(contextOf(s,c.id)?{practiceContext:contextOf(s,c.id)}:{}),title:c.title,subject:c.subject,kind:m?.kind??'',goal:c.goal,scope:c.scope,firstAction:c.firstAction,minutes:c.minutes,date:c.date,startTime:d.placements[c.id]?.timeSet===false?'':c.startTime,output:m?.output??'',materials:m?.materials??'',
    changes:changes.filter(h=>monthOf(localDate(new Date(h.at)))===month),
    runs:runs.filter(r=>runMonth(r)===month).map(r=>({id:r.id,practiceId:r.practiceId,at:r.startedAt,closed:r.phase==='closed',completed:r.completion==='yes',returns:r.returns,reflection:r.reflection,actualMs:r.phase==='closed'?elapsed(r):0,nextPosition:r.flag}))};
   const old=d.sources[id];
   if(!old){
    const initial=structuredClone(snapshot);initial.changes=[];initial.runs=[];initial.output='';initial.materials='';let initialKnown=false;
    try{const first=c.history.find(h=>h.reason==='최초 계획');if(first){const raw=JSON.parse(first.plan);for(const k of ['title','subject','goal','scope','firstAction','date','startTime'] as const)if(typeof raw[k]==='string')initial[k]=raw[k];if(Number.isInteger(raw.minutes)&&raw.minutes>=0&&raw.minutes<=1440)initial.minutes=raw.minutes;initialKnown=true;}}catch{/* Missing old initial plan is not reconstructed. */}
    d.sources[id]={id,cardId:c.id,month,version:1,available:true,initialKnown,initial,snapshot,updatedAt:at};
   }
   else if(!old.available||!same(old.snapshot,snapshot)){old.version++;old.available=true;old.snapshot=snapshot;old.updatedAt=at;}
  }
 }
 for(const x of Object.values(d.sources))if(x.available&&!seen.has(x.id)){x.available=false;x.version++;x.updatedAt=at;}
}
export function roadSources(s:PersonalState,month?:string){return Object.values(s.studio?.sources??{}).filter(x=>!month||x.month===month).sort((a,b)=>b.month.localeCompare(a.month)||a.snapshot.title.localeCompare(b.snapshot.title));}
export function experienceState(s:PersonalState,e:RoadExperience){
 const src=s.studio?.sources[e.sourceId];
 if(!src?.available||!student(s).cards.some(c=>c.id===src.cardId))return 'missing';
 if(src.version!==e.sourceVersion)return 'changed';
 return e.confirmed?'ready':'unconfirmed';
}
export function sourceFacts(src:RoadSource){
 const x=src.snapshot,closed=x.runs.filter(r=>r.closed),returns=x.runs.reduce((n,r)=>n+r.returns,0);
 return [`${src.initialKnown?'최초 계획':'첫 수집 때 계획 (최초는 미확인)'}: ${src.initial.scope||'분량 미입력'} · ${src.initial.minutes>0?src.initial.minutes+'분':'예상 미정'}`,`현재 계획: ${x.scope||'분량 미입력'} · ${x.minutes>0?x.minutes+'분':'예상 미정'}`,...x.changes.map(h=>`${localDate(new Date(h.at))} · ${h.reason}`),`실행 시작 ${x.runs.length}회 / 종료 ${closed.length}회 / 본인 과제 완료 확인 ${closed.filter(r=>r.completed).length}회`,
  ...(returns?[`중단 뒤 재개 ${returns}회 (우열 점수 아님)`]:[]),...x.runs.filter(r=>r.reflection).map(r=>`선택적 본인 회고: ${r.reflection}`),...(x.output?[`본인이 연결한 결과물: ${x.output}`]:[])];
}
export function applyRoadmap(s:PersonalState,a:StudioAction,at:string){
 const d=s.studio!;syncRoadmap(s,at);
 const get=(id:string)=>{const e=d.experiences.find(e=>e.id===id);if(!e)throw Error('경험 카드를 찾을 수 없습니다.');return e;};
 switch(a.type){
  case 'roadmap.create':{
   const src=d.sources[a.sourceId];if(!src?.available)throw Error('원본 활동을 확인할 수 없습니다.');
   if(d.experiences.some(e=>e.sourceId===src.id))return;
   const x=src.snapshot,closed=x.runs.filter(r=>r.closed);
   d.experiences.push({id:crypto.randomUUID(),sourceId:src.id,sourceVersion:src.version,fields:{situation:x.goal||x.title,difficulty:'',action:closed.length?`실행을 ${closed.length}회 마친 기록이 있습니다.`:'',adjustment:x.changes.filter(h=>h.reason.includes('수정')).length?'계획을 수정한 기록이 있습니다.':'',result:x.output||'',learning:''},confirmed:false,selected:false,updatedAt:at});break;
  }
  case 'roadmap.edit':{
   const e=get(a.id);for(const k of experienceFields)if(a.fields[k]!==undefined){if(typeof a.fields[k]!=='string'||a.fields[k]!.length>20000)throw Error('경험 내용을 확인해 주세요.');e.fields[k]=a.fields[k]!;}
   e.confirmed=false;e.selected=false;e.updatedAt=at;for(const line of d.draft?.sentences??[])if(line.experienceId===e.id){line.confirmed=false;line.selected=false;}break;
  }
  case 'roadmap.refresh':{const e=get(a.id),src=d.sources[e.sourceId];if(!src?.available)throw Error('원본 연결이 없어 재확인할 수 없습니다.');e.sourceVersion=src.version;e.confirmed=false;e.selected=false;e.updatedAt=at;break;}
  case 'roadmap.confirm':{
   const e=get(a.id);if(['changed','missing'].includes(experienceState(s,e)))throw Error('원본을 다시 확인해 주세요.');
   if(!e.fields.action.trim())throw Error('직접 한 행동을 본인이 확인해 적어 주세요. 하지 않은 행동은 추가하지 않습니다.');
   e.confirmed=true;e.updatedAt=at;break;
  }
  case 'roadmap.select':{const e=get(a.id);if(a.selected&&experienceState(s,e)!=='ready')throw Error('원본과 내용을 확인한 경험만 초안에 고를 수 있습니다.');e.selected=a.selected;break;}
  case 'roadmap.draft':{
   const selected=d.experiences.filter(e=>e.selected);if(!selected.length)throw Error('확인한 경험을 먼저 선택하세요.');
   if(selected.some(e=>experienceState(s,e)!=='ready'))throw Error('선택 경험의 원본 변경·연결을 다시 확인하세요.');
   const key=JSON.stringify(selected.map(e=>[e.id,e.sourceVersion,e.fields]));if(d.draft?.key===key)return;
   d.draft={id:crypto.randomUUID(),key,createdAt:at,sentences:selected.flatMap(e=>experienceFields.filter(k=>e.fields[k].trim()).map(k=>({id:crypto.randomUUID(),text:e.fields[k],experienceId:e.id,sourceId:e.sourceId,sourceVersion:e.sourceVersion,field:k,confirmed:false,selected:false,edited:false})))};
   break;
  }
  case 'roadmap.sentence':{
   const line=d.draft?.sentences.find(x=>x.id===a.id);if(!line)throw Error('초안 문장을 찾을 수 없습니다.');
   if(a.text!==undefined){if(a.text.length>20000)throw Error('문장 길이를 줄여 주세요.');line.text=a.text;line.edited=true;line.confirmed=false;}
   if(a.confirmed){const e=get(line.experienceId);if(experienceState(s,e)!=='ready'||line.sourceVersion!==e.sourceVersion||!line.text.trim())throw Error('문장과 원본 경험을 다시 확인하세요.');}
   if(a.confirmed!==undefined)line.confirmed=a.confirmed;
   if(a.selected!==undefined)line.selected=a.selected;break;
  }
 }
}
const esc=(x:string)=>x.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function roadmapExport(s:PersonalState){
 const lines=s.studio?.draft?.sentences.filter(x=>x.selected)??[];
 if(!lines.length)throw Error('내보낼 문장을 직접 선택하세요.');
 for(const line of lines){const e=s.studio!.experiences.find(e=>e.id===line.experienceId);if(!line.confirmed||!e||!e.selected||experienceState(s,e)!=='ready'||line.sourceVersion!==e.sourceVersion)throw Error('선택 문장·경험의 확인 또는 원본 재확인이 필요합니다.');}
 const disclaimer='기록 정리형 초안 · 생성형 AI 서버 미연결. 앱 관찰과 본인 서술이며 외부 수행 검증·검사 정확성·인지 향상의 증거가 아닙니다.';
 const items=lines.map((line,i)=>{const src=s.studio!.sources[line.sourceId];return {text:(src.snapshot.practiceContext?libText(localeOf(s),src.snapshot.practiceContext==='simulation'?'simulation':'daily')+'\n':'')+line.text,citation:`[${i+1}] ${src.month} · ${src.snapshot.subject||'과목 없음'} · ${src.snapshot.title} · 활동기록 ${src.cardId} · ${fieldNames[line.field]} · 본인 확인 서술${line.edited?' (직접 수정)':''}`};});
 return {text:disclaimer+'\n\n'+items.map(x=>x.text+'\n근거: '+x.citation).join('\n\n'),
 html:`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>나의 로드맵 · 선택 초안</title><style>body{max-width:850px;margin:24px auto;padding:20px;font:17px/1.8 system-ui;color:#172c4c;overflow-wrap:anywhere}section{border-bottom:1px solid #ddd;padding:14px 0}</style><body><h1>나의 로드맵 · 선택한 경험</h1><p>${esc(disclaimer)}</p>${items.map(x=>`<section><p>${esc(x.text)}</p><small>근거: ${esc(x.citation)}</small></section>`).join('')}<p>자동 외부 전송 없음 · 공유 전 내용을 확인하세요.</p></body></html>`};
}
export function validateStudioLinks(s:PersonalState){
 const d=s.studio;if(!d)return;const p=student(s);
 const ids=new Set(p.cards.map(c=>c.id));
 if(d.deskId&&(!ids.has(d.deskId)||d.placements[d.deskId]?.place!=='desk'))throw Error('작업대 연결이 맞지 않습니다.');
 if(d.selectedId&&!ids.has(d.selectedId))throw Error('선택 카드 연결이 맞지 않습니다.');
 if(Object.entries(d.placements).some(([id,v])=>!ids.has(id)||v.place==='collection'&&p.cards.find(c=>c.id===id)?.status!=='done'))throw Error('공간의 카드 연결이 맞지 않습니다.');
 if(Object.values(d.placements).filter(v=>v.place==='desk').length>1)throw Error('작업대 카드가 중복입니다.');
 for(const [key,src] of Object.entries(d.sources)){
  if(src.available&&!ids.has(src.cardId))throw Error('로드맵 원본 연결이 없습니다.');if(key!==src.id||src.id!==`${src.month}:${src.cardId}`)throw Error('로드맵 월 연결이 다릅니다.');
  if(src.available)for(const row of src.snapshot.runs){const run=p.runs.find(r=>r.id===row.id);if(!run||run.cardId!==src.cardId||run.practiceId!==row.practiceId||row.closed!==(run.phase==='closed')||row.completed!==(run.completion==='yes'))throw Error('로드맵 실행 근거 연결이 맞지 않습니다.');}
 }
 if(new Set(d.experiences.map(e=>e.id)).size!==d.experiences.length||new Set(d.experiences.map(e=>e.sourceId)).size!==d.experiences.length)throw Error('로드맵 경험이 중복입니다.');
 for(const e of d.experiences)if(!d.sources[e.sourceId]||e.sourceVersion>d.sources[e.sourceId].version)throw Error('경험 근거 연결이 맞지 않습니다.');
 for(const x of d.draft?.sentences??[])if(!d.experiences.some(e=>e.id===x.experienceId&&e.sourceId===x.sourceId)||x.sourceVersion>d.sources[x.sourceId].version)throw Error('문장 근거 연결이 맞지 않습니다.');
}
