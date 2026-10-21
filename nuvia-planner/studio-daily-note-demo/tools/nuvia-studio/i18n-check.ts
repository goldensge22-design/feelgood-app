import assert from 'node:assert/strict';
import {createStudio,updateStudio} from '../../artifacts/nuvia-ui-review/src/studio/studio-logic';
import {exportBackup,importBackup,validate} from '../../artifacts/nuvia-ui-review/src/studio/persistence';
import {locales,localeOf} from '../../artifacts/nuvia-ui-review/src/studio/i18n/config';
import {setLocale,t,label,resources,intlDate} from '../../artifacts/nuvia-ui-review/src/studio/i18n/runtime';
import {reportHTML} from '../../artifacts/nuvia-ui-review/src/studio/report';
import {assessmentLabel,levelLabel,metricLabel,responseLabel,draftStatusLabel} from '../../artifacts/nuvia-ui-review/src/studio/i18n/assessment-labels';
import {installAssessment} from '../../artifacts/nuvia-ui-review/src/studio/insights';
import {demoAssessmentEnvelope} from '../../artifacts/nuvia-ui-review/src/demo/assessment';
let checks=0;
function ok(v:unknown,message:string){assert(v,message);checks++;}
async function main(){
 for(const locale of locales){
  let state=createStudio();state=updateStudio(state,{type:'create',title:'나의 수학 계획',scope:'학생이 쓴 원문',minutes:null,activity:'학습'});
  const data=JSON.stringify(state.lab.students);
  state=validate(updateStudio(state,{type:'studio.locale',locale}));
  ok(localeOf(state)===locale,locale+' additive locale');
  ok(JSON.stringify(state.lab.students)===data,locale+' user data and scores unchanged');
  ok(['ko','en','km','ar'].includes(locale)?state.lab.language===locale:state.lab.language==='ko',locale+' legacy four-value compatibility');
  const restored=await importBackup(await exportBackup(state,'personal'),state);
  ok(localeOf(restored)===locale,locale+' backup roundtrip locale');
  ok(JSON.stringify(restored.lab.students)===data,locale+' backup roundtrip data');
  setLocale(locale);
  const html=reportHTML(state,'2026-10',{summary:true,evidence:true,methods:true,outputs:true,assessment:true});
  ok(html.includes(`lang="${locale}" dir="${locale==='ar'?'rtl':'ltr'}"`),locale+' generated report metadata');
  ok(!Number.isNaN(Date.parse('2026-10-20'))&&intlDate('2026-10-20').length>0,locale+' Intl local date');
  const dynamic=Object.keys(resources.ko).find(k=>resources.ko[k].includes('{value1}')&&!resources.ko[k].includes('{value2}')&&!resources.ko[k].includes('<'))!;
  ok(t(dynamic,{value1:'학생 원문'}).includes('학생 원문'),locale+' named placeholder preserves student text');
  ok(String(label(1000)).trim()===new Intl.NumberFormat(locale).format(1000),locale+' Intl number display');
  // Exercise populated report branches, not just the old empty-state smoke test.
  let rich=createStudio('2026-10-21T12:00:00.000Z');rich.mode='review';
  rich=updateStudio(rich,{type:'review.insights-example'},'2026-10-21T12:00:00.000Z',true);
  const beforeRecords=JSON.stringify(rich.lab.students);
  for(const month of ['2026-08','2026-09','2026-10']){
   for(const fields of [
    {summary:true,evidence:true,methods:true,outputs:true,assessment:true},
    {summary:false,evidence:false,methods:false,outputs:false,assessment:false}
   ]){
    const populated=reportHTML(rich,month,fields);
    ok(populated.includes(`lang="${locale}"`),locale+' populated report '+month);
    ok(!populated.includes('undefined'),locale+' populated report has no undefined '+month);
    if(locale==='ko'||locale==='mn')ok(populated.includes('overflow-wrap:break-word'),locale+' print word wrapping');
   }
  }
  rich=updateStudio(rich,{type:'draft.make',month:'2026-09',axis:'planning'},'2026-10-21T12:00:00.000Z',true);
  ok(reportHTML(rich,'2026-09',{summary:true,evidence:true,methods:true,outputs:true,assessment:true}).includes('</html>'),locale+' next-month draft report');
  ok(JSON.stringify(rich.lab.students)===beforeRecords,locale+' report rendering never rewrites source records');
  ok(assessmentLabel('Original result name · 원본','actual-result-id')==='Original result name · 원본',locale+' preserves assessment proper names');
  ok(levelLabel('low')===label('하'),locale+' level enum display');
  ok(metricLabel('accuracy_rate')===label('정답률'),locale+' metric enum display');
  ok(responseLabel('neutral')===label('중립'),locale+' response enum display');
  ok(draftStatusLabel('pending')===label('검토 중'),locale+' draft enum display');
  if(locale==='az'||locale==='mn'){
   const demo=createStudio();installAssessment(demo,demoAssessmentEnvelope('school'),'example','2026-10-01T09:00:00Z');
   const savedAssessment=JSON.stringify(demo.lab.students);
   const demoHtml=reportHTML(demo,'2026-10',{summary:true,evidence:true,methods:true,outputs:true,assessment:true});
   ok(demoHtml.includes(locale==='az'?'Yeniyetmələr üçün süni nümunə':'Өсвөр насныханд зориулсан зохиомол жишээ'),locale+' synthetic descriptor localized');
   ok(!/>low</.test(demoHtml)&&!demoHtml.includes('accuracy_rate'),locale+' report internal codes localized');
   ok(JSON.stringify(demo.lab.students)===savedAssessment,locale+' synthetic display does not rewrite results');
  }
 }
 assert.throws(()=>t('missing.key'));checks++;
 setLocale('ko');console.log('PASS i18n',checks,'checks; 15 locale actions/data/legacy values/backup/compiled report/Intl/placeholders');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
