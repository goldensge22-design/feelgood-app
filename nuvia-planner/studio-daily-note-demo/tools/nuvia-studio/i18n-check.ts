import assert from 'node:assert/strict';
import {createStudio,updateStudio} from '../../artifacts/nuvia-ui-review/src/studio/studio-logic';
import {exportBackup,importBackup,validate} from '../../artifacts/nuvia-ui-review/src/studio/persistence';
import {locales,localeOf} from '../../artifacts/nuvia-ui-review/src/studio/i18n/config';
import {setLocale,t,label,resources,intlDate} from '../../artifacts/nuvia-ui-review/src/studio/i18n/runtime';
import {reportHTML} from '../../artifacts/nuvia-ui-review/src/studio/report';
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
 }
 assert.throws(()=>t('missing.key'));checks++;
 setLocale('ko');console.log('PASS i18n',checks,'checks; 15 locale actions/data/legacy values/backup/compiled report/Intl/placeholders');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
