import test from 'node:test';
import assert from 'node:assert/strict';
import {loadContent} from '../src/core/content';
import {transition,artifactLink,assertRun,assertSuccessor} from '../src/core/engine';
import {isComparison,AGE_BANDS,type ComparisonRecord,type Run} from '../src/core/types';
import {bookModel,reportModel} from '../src/core/artifacts';
import {deterministic,profile,toPrediction} from './helpers';
import {releaseContent,matchesRelease} from '../src/core/release';
import entry from '../src/content/app-entry.json';
import semantics from '../src/content/w24-semantic.json';
import strings from '../src/content/locales/w24-semantic.ko.json';
const bundle=await loadContent(),mission=bundle.missions.find(m=>m.week===24)!;
test('new comparison release versions only runtime W24 copy; original and other five missions stay intact',()=>{
 const before=JSON.stringify(bundle),b=releaseContent(bundle,entry,semantics,strings),m=b.missions.find(m=>m.week===24)!;
 assert.equal(JSON.stringify(bundle),before);assert.equal(m.missionVersion,'5.0.0');assert.equal(m.contentVersion,'3.1.0');
 assert.deepEqual(b.missions.filter(m=>m.week!==24),bundle.missions.filter(m=>m.week!==24));
 const strip=(x:unknown)=>JSON.parse(JSON.stringify(x),(k,v)=>['missionVersion','contentVersion','learnerStoryOnly','historySummaryKey','historyKeyPointKey','semantic','executionOrderRuleId','reasonExpressionRuleId'].includes(k)?undefined:v);
 const original=structuredClone(mission);for(const c of original.conditions)c.activity.materials=c.activity.materials.filter(x=>x.role!=='reason');assert.deepEqual(strip(m),strip(original));const {r}=ready();assert.equal(matchesRelease(r,entry),false);
});
function ready(ci=0,age:typeof AGE_BANDS[number]='preschool'){
 const deps=deterministic();let r=toPrediction(bundle,mission.id,mission.conditions[ci].id,{...profile,ageBand:age},deps);
 for(const c of [{type:'prediction',expression:{method:'unknown',text:''}},{type:'reveal',possibility:'A'},{type:'deferAction',reason:'unknown'},{type:'story',expression:{method:'text',text:'내 이야기'}}] as const)r=transition(r,c,deps);
 return {r,deps};
}
function value(r:Run,kind:'history'|'prediction',extra:Partial<ComparisonRecord>={}):ComparisonRecord{
 const {learnerId,...link}=artifactLink(r);return {...link,comparisonKind:kind,expressionMode:'writing',discoveryText:'  내가 발견한 원문\n그대로!  ',evidenceText:'내가 쓴 근거  \n둘째 줄',...extra};
}
for(const ci of [0,1])for(const age of AGE_BANDS)test(`W24-C${ci+1}/${age}: free comparison roundtrip preserves both originals and links`,()=>{
 let {r,deps}=ready(ci,age);const h=value(r,'history'),p=value(r,'prediction',{discoveryText:'예측에서 발견한 원문'});const before=JSON.stringify(r.prediction);
 r=transition(r,{type:'comparison',kind:'history',comparison:h},deps);r=transition(r,{type:'comparison',kind:'prediction',comparison:p},deps);
 assertRun(r);assert.equal(JSON.stringify(r.prediction),before);const book=bookModel(r),report=reportModel(r);
 assert.deepEqual(book.pages[6].expression,{status:'recorded',value:h});assert.deepEqual(book.pages[7].expression,{status:'recorded',value:p});
 assert.deepEqual(report.together.historyComparison,{status:'recorded',value:h});assert.deepEqual(report.together.predictionComparison,{status:'recorded',value:p});
 assert.equal(book.pages.length,8);assert.ok(!JSON.stringify([h,p,r.events]).includes('comparisonTag'));
 assert.deepEqual(r.events.filter(e=>e.eventType==='comparisonCompleted').map(e=>e.payload.comparisonKind),['history','prediction']);
});
for(const mode of ['voice','drawing','mixed','deferred'] as const)test(`comparison supports ${mode} without writing or inferred judgement`,()=>{
 const {r,deps}=ready();const v=value(r,'history',{expressionMode:mode,discoveryText:'',evidenceText:'',...(mode==='voice'||mode==='mixed'?{voiceRef:'local-audio:test'}:{}),...(mode==='drawing'||mode==='mixed'?{drawingRef:'drawing:test'}:{})});
 const next=transition(r,{type:'comparison',kind:'history',comparison:v},deps);assert.deepEqual(next.historyComparison,{status:'recorded',value:v});
 const payload=next.events.at(-1)!.payload;assert.equal(payload.expressionMode,mode);assert.equal('score' in payload,false);assert.equal('success' in payload,false);assert.equal('weakness' in payload,false);
 if(mode==='deferred'){assert.equal(payload.provided,false);assert.equal(bookModel(next).pages[6].text.status,'notProvided');}
});
test('comparison rejects category choices, extraneous classifier fields, empty entries and evidence-only entries',()=>{
 const {r,deps}=ready();assert.throws(()=>transition(r,{type:'comparison',kind:'history',expression:{method:'choice',choiceId:'different',text:'달랐어요'}},deps),/FIXED_COMPARISON_NOT_ALLOWED/);
 for(const extra of [{comparisonTag:'same'},{expressionMode:'writing',discoveryText:'',evidenceText:''},{expressionMode:'writing',discoveryText:'',evidenceText:'근거만'},{expressionMode:'deferred',discoveryText:'남긴 글'}])assert.throws(()=>transition(r,{type:'comparison',kind:'history',comparison:{...value(r,'history'),...extra} as ComparisonRecord},deps));
});
test('comparison rejects result, condition, version and kind mixing',()=>{
 const {r,deps}=ready();for(const key of ['resultId','missionId','conditionId','missionVersion','contentVersion','comparisonKind'])assert.throws(()=>transition(r,{type:'comparison',kind:'history',comparison:{...value(r,'history'),[key]:'foreign'}},deps));
});
test('completed comparison cannot be rewritten when next comparison is saved',()=>{
 const {r,deps}=ready(),h=transition(r,{type:'comparison',kind:'history',comparison:value(r,'history')},deps),p=transition(h,{type:'comparison',kind:'prediction',comparison:value(h,'prediction')},deps);
 if(p.historyComparison.status==='recorded'&&isComparison(p.historyComparison.value))p.historyComparison.value.discoveryText='다른 말';assert.throws(()=>assertSuccessor(h,p),/COMPARISON_IMMUTABLE/);
});
test('legacy records remain readable without generating or migrating new comparison data',()=>{
 const {r,deps}=ready();const h=transition(r,{type:'comparison',kind:'history',comparison:value(r,'history')},deps);h.historyComparison={status:'recorded',value:{method:'choice',choiceId:'same',text:'과거 실제 선택'}};
 const before=JSON.stringify(h);assertRun(h);bookModel(h);reportModel(h);assert.equal(JSON.stringify(h),before);assert.equal('expressionMode' in h.historyComparison.value,false);
});
