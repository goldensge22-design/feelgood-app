import assert from 'node:assert/strict';
import {AUDIENCES,AUDIENCE_KEYS} from '../../artifacts/nuvia-ui-review/src/demo/audiences';
import {createDemo} from '../../artifacts/nuvia-ui-review/src/demo/session';
import {createStudio,updateStudio} from '../../artifacts/nuvia-ui-review/src/studio/studio-logic';
import {demoCardText,demoCardLabels,isDemoSample,demoReportState,demoWarning,localizedDemoReportNotice} from '../../artifacts/nuvia-ui-review/src/studio/i18n/demo-copy';
import {demoKeys,demoResources,demoText} from '../../artifacts/nuvia-ui-review/src/studio/i18n/demo-resources';
import {assessmentLabel} from '../../artifacts/nuvia-ui-review/src/studio/i18n/assessment-labels';
import {locales,setLocale,t,label} from '../../artifacts/nuvia-ui-review/src/studio/i18n/runtime';
import {localeOf} from '../../artifacts/nuvia-ui-review/src/studio/i18n/config';
let checks=0;
function ok(value:unknown,message:string){assert(value,message);checks++;}
for(const locale of locales){
 setLocale(locale);
 ok(demoResources[locale].length===demoKeys.length,locale+' all new keys');
 for(const key of demoKeys){
  const text=demoText(key);
  ok(!!text.trim()&&!/[<>]|\\{\\w+\\}/.test(text),`${locale}/${key} plain complete copy`);
  if(locale!=='ko')ok(!/[가-힣]/.test(text),`${locale}/${key} no Korean fallback`);
 }
 ok(!/[가-힣]/.test(demoWarning())||locale==='ko',locale+' localized safety warning');
 ok(localizedDemoReportNotice().includes(`lang="${locale}"`),locale+' report notice language');
 ok(assessmentLabel('원본 결과지 이름','real-result-123')==='원본 결과지 이름',locale+' original result name intact');
 ok(assessmentLabel('사용자가 적은 검사 이름','external-dcas-synthetic-school')==='사용자가 적은 검사 이름',locale+' unknown name intact even with fixture ID');
 for(const audience of AUDIENCE_KEYS){
  let state=createDemo(audience,'2026-10-22T09:00:00.000Z');
  const card=state.lab.students['student-a'].cards[0],before=JSON.stringify(state);
  ok(isDemoSample(state,card,audience),locale+'/'+audience+' identifies fixture');
  ok(demoCardText(state,card,'title',audience)===demoText(`${audience}Title`),locale+'/'+audience+' title display');
  ok(demoCardText(state,card,'subject',audience)===demoText(`${audience}Subject`),locale+'/'+audience+' subject display');
  const names=demoCardLabels(state,card,audience);
  ok(names.edit===t('s.e76f0c55b8ac1289',{value1:demoText(`${audience}Title`)}),locale+'/'+audience+' edit accessible name uses display title');
  for(const text of [names.edit,names.colorGroup,names.moveUp,names.moveDown,...['파랑','보라','주황','하늘'].map(color=>{
   const value=names.color(color);
   ok(value===t('s.5de92a95a92be17e',{value1:demoText(`${audience}Title`),value2:label(color)}),locale+'/'+audience+' tone uses existing locale key');
   return value;
  })])ok(locale==='ko'||!/[가-힣]/.test(text),locale+'/'+audience+' synthetic accessible names have no Korean fallback');
  demoReportState(state,audience);
  ok(JSON.stringify(state)===before,locale+'/'+audience+' display leaves full original intact');
  const src=state.insights!.source!;
  ok(assessmentLabel(src.kind,src.assessment.assessmentId)===demoText(audience==='school'?'youth':'adult'),locale+'/'+audience+' assessment name');
  state=updateStudio(state,{type:'studio.locale',locale});
  ok(localeOf(state)===locale,locale+'/'+audience+' existing action reused');
  ok(JSON.stringify(state.lab.students)===JSON.stringify(JSON.parse(before).lab.students),locale+'/'+audience+' locale action preserves records');
  state=updateStudio(state,{type:'create',title:AUDIENCES[audience].taskTitle,subject:AUDIENCES[audience].subject},'2026-10-23T09:00:00.000Z');
  const authored=state.lab.students['student-a'].cards.at(-1)!;
  ok(!isDemoSample(state,authored,audience),locale+'/'+audience+' same-title authored card not translated');
  ok(demoCardText(state,authored,'title',audience)===authored.title,locale+'/'+audience+' user title unchanged');
  ok(demoCardLabels(state,authored,audience).edit.includes(authored.title),locale+'/'+audience+' aria preserves authored title');
  state=updateStudio(state,{type:'legacy',command:{type:'card.update',cardId:card.id,changes:{title:'직접 수정한 원문'}}},'2026-10-23T10:00:00.000Z');
  const edited=state.lab.students['student-a'].cards[0];
  ok(demoCardText(state,edited,'title',audience)==='직접 수정한 원문',locale+'/'+audience+' edited fixture not translated');
  ok(!isDemoSample(createStudio(),card,audience),locale+'/'+audience+' normal state has no sample provenance');
 }
}
console.log(`PASS demo locale display ${checks} checks: 15 locales × 3 audiences; provenance, unchanged records, copied/edited tasks, original assessment names, notices and reports.`);
