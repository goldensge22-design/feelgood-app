import test from 'node:test';
import assert from 'node:assert/strict';
import {loadContent} from '../src/core/content';
import {releaseContent} from '../src/core/release';
import entry from '../src/content/app-entry.json';
import semantics from '../src/content/w24-semantic.json';
import strings from '../src/content/locales/w24-semantic.ko.json';
import {transition,assertRun,assertSuccessor,comparisonFromExpression,canonicalStage} from '../src/core/engine';
import {bookModel,reportModel} from '../src/core/artifacts';
import {AGE_BANDS,type Run} from '../src/core/types';
import {deterministic,profile,toPrediction,actionInput} from './helpers';
function withoutReason(v:any){const {reasonRef,...rest}=v;return rest;}
const bundle=releaseContent(await loadContent(),entry,semantics,strings);
for(const ci of [1,2])for(const age of AGE_BANDS)for(const support of [0,1,2,3] as const)test(`execution order, source lock and deterministic output: C${ci}/${age}/support${support}`,()=>{
 const deps=deterministic();let r=toPrediction(bundle,'gutenberg',`gutenberg.c${ci}`,{...profile,ageBand:age,attentionSupport:support},deps);
 const c=r.contentSnapshot.conditions[ci-1],opt=c.semantic!.predictionOptions[0],other=r.contentSnapshot.conditions[2-ci].semantic!.predictionOptions[0];
 assert.throws(()=>transition(r,{type:'prediction',expression:{method:'choice',choiceId:other.id,text:r.localeSnapshot[other.textKey]}},deps),/PREDICTION_CHOICE_MISMATCH/);
 r=transition(r,{type:'prediction',expression:{method:'choice',choiceId:opt.id,text:r.localeSnapshot[opt.textKey]}},deps);assert.equal(r.stage,'activity');
 const initial=JSON.stringify(r.prediction);assert.throws(()=>transition(r,{type:'reveal',possibility:'A'},deps),/INVALID_STAGE/);
 assert.throws(()=>bookModel(r),/ARTIFACTS_REQUIRE_COMPLETION/);
 const forged=structuredClone(r);forged.stage='alternate';assert.throws(()=>assertRun(forged));
 if(support===1)r=transition(r,{type:'deferAction',reason:'unknown'},deps);else r=transition(r,{type:'action',value:withoutReason(actionInput(c.activity)),reason:{source:'deferred'}},deps);
 assert.equal(r.stage,'alternate');assert.throws(()=>transition(r,{type:'action',value:actionInput(c.activity)},deps),/INVALID_STAGE/);
 const locked=r,action=JSON.stringify(r.action);r=transition(r,{type:'reveal',possibility:'B'},deps);assert.equal(r.stage,'creation');assertSuccessor(locked,r);
 const tampered=structuredClone(r);tampered.action=support===1?{status:'recorded',value:actionInput(c.activity)}:{status:'notProvided'};assert.throws(()=>assertSuccessor(locked,tampered),/ACTION_/);
 r=transition(r,{type:'story',expression:{method:'text',text:'  내 이야기\n직접 남김  '}},deps);
 for(const kind of ['history','prediction'] as const)r=transition(r,{type:'comparison',kind,comparison:comparisonFromExpression(r,kind,{method:'text',text:'  각각 남긴 같은 원문  '})},deps);
 assertRun(r);assert.equal(r.stage,'complete');assert.equal(JSON.stringify(r.prediction),initial);assert.equal(JSON.stringify(r.action),action);
 const actions=r.events.filter(e=>e.eventType==='cognitiveActionRecorded'||e.eventType==='activityDeferred'&&e.payload.scope!=='reason'),reveals=r.events.filter(e=>e.eventType==='alternateViewed');
 assert.equal(actions.length,1);assert.equal(reveals.length,1);assert.ok(r.events.indexOf(actions[0])<r.events.indexOf(reveals[0]));
 assert.deepEqual([...new Set(r.events.map(e=>e.payload.canonicalStage))],['conditionUnderstanding','prediction','coreActivity','alternateResult','learnerStory','historyComparison','predictionComparison','artifactLink']);
 const b=bookModel(r),report=reportModel(r);assert.equal(b.pages.length,8);assert.notEqual(b.pages[6].comparisonEventId,b.pages[7].comparisonEventId);assert.notEqual(b.pages[6].comparisonRecordRef,b.pages[7].comparisonRecordRef);assert.equal(b.resultId,report.resultId);assert.deepEqual(bookModel(r),b);assert.deepEqual(reportModel(r),report);
 if(support===1){assert.equal(r.action.status,'notProvided');assert.equal(report.details.observations.length,0);assert.equal(actions[0].payload.reason,'unknown');assert.equal('accessibilityReason' in actions[0].payload,false);}
 assert.equal(canonicalStage(r.stage),'artifactLink');
});
