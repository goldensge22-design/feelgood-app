import {AUDIENCES,audienceFrom,type Audience} from '../../demo/audiences';
import type {PersonalState} from '../model';
import type {Card} from '../../enhancement/model';
import {demoText} from './demo-resources';
import {currentLocale,label,t} from './runtime';

export const currentAudience=()=>audienceFrom(typeof location==='undefined'?'':location.search);
// Identify the original fixture by its source, initial-plan timestamp and exact values.
// A same-title student task, a copied task, or an edited fixture is not a translation target.
export function isDemoSample(state:PersonalState,card:Card,audience:Audience|null=currentAudience()){
 if(!audience||card.history.length!==1)return false;
 const source=state.insights?.sources.find(s=>s.mode==='example'&&
  (s.assessment as {assessmentId?:string})?.assessmentId===`external-dcas-synthetic-${audience}`);
 const config=AUDIENCES[audience];
 return !!source&&card.history[0]?.at===source.at&&card.title===config.taskTitle&&card.subject===config.subject;
}
export function demoCardText(state:PersonalState,card:Card,field:'title'|'subject',audience:Audience|null=currentAudience()){
 return audience&&isDemoSample(state,card,audience)
  ?demoText(`${audience}${field==='title'?'Title':'Subject'}`):card[field];
}
// Attribute strings need explicit localization of nested label values too.
// Never interpolate the raw fixture title or a canonical Korean tone into an aria name.
export function demoCardLabels(state:PersonalState,card:Card,audience:Audience|null=currentAudience()){
 const title=demoCardText(state,card,'title',audience);
 return {
  edit:t('s.e76f0c55b8ac1289',{value1:title}),
  colorGroup:t('s.2a96139579671e91',{value1:title}),
  color:(toneLabel:string)=>t('s.5de92a95a92be17e',{value1:title,value2:label(toneLabel)}),
  moveUp:t('s.2cfb9fa48aefc52e',{value1:title}),
  moveDown:t('s.770a475e502a58b2',{value1:title}),
 };
}
// Only used for report generation, never passed to commit(), forms, backups or actions.
export function demoReportState(state:PersonalState,audience:Audience|null=currentAudience()){
 if(!audience)return state;
 const view=structuredClone(state);
 for(const card of state.lab.students[state.studentId].cards){
  if(!isDemoSample(state,card,audience))continue;
  const title=demoCardText(state,card,'title',audience),subject=demoCardText(state,card,'subject',audience);
  const c=view.lab.students[state.studentId].cards.find(c=>c.id===card.id)!;
  c.title=title;c.subject=subject;
  const runIds=new Set(state.lab.students[state.studentId].runs.filter(r=>r.cardId===card.id).map(r=>r.id));
  for(const entry of view.entries)if(runIds.has(entry.runId)&&entry.cardTitle===card.title)entry.cardTitle=title;
  for(const context of Object.values(view.insights?.contexts??{}))if(context.cardId===card.id){
   if(context.cardTitle===card.title)context.cardTitle=title;
   if(context.subject===card.subject)context.subject=subject;
  }
 }
 return view;
}
export function demoWarning(){
 return [demoText('demo'),String(label('이 브라우저에만 저장돼요. 로그인·서버·기기 간 동기화는 없습니다. 백업 파일은 평문이므로 직접 보관하세요.')),
  String(label('실제 결과지 서버는 미연결입니다. 일반 연습이며 공식 보완 판정이 아닙니다.')),demoText('prohibition'),demoText('limits')].join(' · ');
}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function localizedDemoReportNotice(){
 return `<aside lang="${currentLocale()}" dir="${currentLocale()==='ar'?'rtl':'ltr'}" style="border:2px solid #9b4b13;padding:12px;margin:12px 0;color:#182742;background:#fff5e7"><strong>${escape(demoWarning())}</strong></aside>`;
}
