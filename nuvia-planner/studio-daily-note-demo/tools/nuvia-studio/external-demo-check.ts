import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AUDIENCES,AUDIENCE_KEYS,audienceFrom} from '../../artifacts/nuvia-ui-review/src/demo/audiences';
import {createDemo,demoStorageKey,previousDemoStorageKey} from '../../artifacts/nuvia-ui-review/src/demo/session';
import {demoAssessmentEnvelope} from '../../artifacts/nuvia-ui-review/src/demo/assessment';
import {DEMOS,validateAssessment} from '../../artifacts/nuvia-ui-review/src/official/adaptive/engine';
import {reportHTML} from '../../artifacts/nuvia-ui-review/src/studio/report';
import {createStudio,updateStudio} from '../../artifacts/nuvia-ui-review/src/studio/studio-logic';
import {validate,exportBackup,importBackup} from '../../artifacts/nuvia-ui-review/src/studio/persistence';
import {assessmentView,installAssessment,exampleEnvelope} from '../../artifacts/nuvia-ui-review/src/studio/insights';
let checks=0;
function ok(condition:unknown,reason:string){assert(condition,reason);checks++;}
async function main(){
 const original=createStudio(),saved=JSON.stringify(original);
 const keys=new Set<string>(),tasks=new Set<string>(),legacyFixtures:Record<string,unknown>={};
 for(const audience of AUDIENCE_KEYS){
  const state=validate(createDemo(audience)),p=state.lab.students['student-a'];
  keys.add(demoStorageKey(audience));tasks.add(p.cards[0].title);
  ok(audienceFrom(`?demo=${audience}&review=1`)===audience,'whitelisted audience');
  ok(state.mode==='personal'&&state.studio?.stageChosen,'normal core flow, no QA mode');
  ok(p.stage===AUDIENCES[audience].stage,'appropriate stage');
  ok(p.cards.length===1&&p.cards[0].title===AUDIENCES[audience].taskTitle,'audience example task');
  ok(p.runs.length===0&&state.entries.length===0&&state.agreements.length===0,'no fake performance');
  const e=p.cards[0].evidence;
  ok(!e.planConfirmed&&!e.planChanged&&!e.actionSelected&&!e.linksConfirmed&&!e.stepsConfirmed,'prefill not practice evidence');
  ok(assessmentView(state).mode==='example','explicit synthetic assessment source');
  const envelope=demoAssessmentEnvelope(audience),v=assessmentView(state);
  ok(envelope.testKind===(audience==='school'?'D-CAS 청소년용 합성 예시':'D-CAS 성인용 합성 예시'),'population-specific source');
  ok(v.kind===envelope.testKind&&v.assessment?.educationStage===AUDIENCES[audience].stage,'source and stage align');
  ok(v.assessment?.scoreSystem?.instrument==='dcas'&&v.assessment.scoreSystem.metric==='accuracy_rate','D-CAS accuracy contract');
  ok(Object.values(v.assessment!.axes).every(x=>x.unit==='%'&&x.value!>=0&&x.value!<=100),'four percentage values');
  assert.deepEqual(v.assessment!.axes,DEMOS[0].axes);checks++;
  assert.deepEqual(v.assessment!.supportOrder,DEMOS[0].supportOrder);checks++;
  assert.deepEqual(v.assessment!.strengthOrder,DEMOS[0].strengthOrder);checks++;
  ok(JSON.stringify(validateAssessment(envelope.assessment))===JSON.stringify(envelope.assessment),'unchanged official validator accepts');
  ok(demoStorageKey(audience)!==previousDemoStorageKey(audience),'old namespace untouched, no reinterpretation');
  const html=reportHTML(state,'2026-10',{summary:true,evidence:true,methods:true,outputs:true,assessment:true});
  ok(html.includes(envelope.testKind)&&!html.includes('K-PASS'),'report source correct without old label');
  ok(html.includes('42')&&html.includes('%')&&!html.includes('표준점수'),'report percentage not old standard scores');
  const moved=updateStudio(state,{type:'studio.place',cardId:p.cards[0].id});
  ok(moved.lab.students['student-a'].runs.length===0,'placement does not start');
  const restored=await importBackup(await exportBackup(state,'personal'),state);
  ok(restored.lab.students['student-a'].cards[0].title===p.cards[0].title,'demo backup roundtrip');
  ok(assessmentView(restored).assessment?.scoreSystem?.instrument==='dcas','D-CAS backup preserved');
  ok(JSON.stringify(original)===saved,'original state unchanged');
  const legacy=structuredClone(state);
  installAssessment(legacy,exampleEnvelope(AUDIENCES[audience].stage),'example','2026-10-01T12:00:00Z');
  legacy.lab.students['student-a'].cards[0].title=`이전 체험 기록 보존 ${audience}`;
  legacyFixtures[previousDemoStorageKey(audience)]=validate(legacy);
  legacyFixtures[previousDemoStorageKey(audience)+':id']=legacy.workspaceId;
 }
 ok(keys.size===3&&tasks.size===3,'distinct spaces and tasks');
 ok(audienceFrom('?demo=invalid')===null&&audienceFrom('?audience=enterprise')===null,'strict whitelist');
 fs.writeFileSync('generated-artifacts/studio-external-demo/legacy-browser-fixtures.json',JSON.stringify(legacyFixtures));
 console.log(`PASS external demo ${checks} checks: audiences, isolated namespaces, synthetic provenance, no auto execution/credit, backup roundtrip, original unchanged`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
