import test from 'node:test';
import assert from 'node:assert/strict';
import {loadContent} from '../src/core/content';
import {releaseContent} from '../src/core/release';
import entry from '../src/content/app-entry.json';
import {transition,artifactLink,assertRun,assertSuccessor} from '../src/core/engine';
import {bookModel,reportModel,authoredStory} from '../src/core/artifacts';
import {AGE_BANDS,type Run,type ComparisonRecord} from '../src/core/types';
import {deterministic,profile,toPrediction,actionInput} from './helpers';
// Preserve regression coverage for the previously stored release and its original order.
const {executionOrderRuleId,reasonExpressionRuleId,...legacyEntry}=entry;
const bundle=releaseContent(await loadContent(),{...legacyEntry,missionVersion:'3.0.0',contentVersion:'2.0.0'});
function creation(ci:number,age:typeof AGE_BANDS[number]){
 const deps=deterministic();let r=toPrediction(bundle,'gutenberg',`gutenberg.c${ci}`,{...profile,ageBand:age},deps);
 r=transition(r,{type:'prediction',expression:{method:'choice',choiceId:'fewerBooks',text:'처음 고른 문구 그대로'}},deps);
 r=transition(r,{type:'reveal',possibility:'B'},deps);r=transition(r,{type:'action',value:actionInput(r.contentSnapshot.conditions[ci-1].activity)},deps);return {r,deps};
}
function comparison(r:Run,kind:'history'|'prediction',extra:Partial<ComparisonRecord>={}):ComparisonRecord{const {learnerId,...link}=artifactLink(r);return {...link,comparisonKind:kind,expressionMode:'writing',discoveryText:'  같은 발견\n내 원문  ',evidenceText:'',...extra};}
for(const ci of [1,2])for(const age of AGE_BANDS)test(`R2 provenance / immutable prediction / independent equal writing ${ci} ${age}`,()=>{
 let {r,deps}=creation(ci,age);const pred=JSON.stringify(r.prediction);
 assert.throws(()=>transition(r,{type:'story',expression:{method:'choice',choiceId:'plan',text:'계획 라벨'}},deps),/STORY_REQUIRES_LEARNER_INPUT/);
 r=transition(r,{type:'story',expression:{method:'text',text:'  내 이야기\n직접 썼어요  '}},deps);
 r=transition(r,{type:'comparison',kind:'history',comparison:comparison(r,'history')},deps);
 r=transition(r,{type:'comparison',kind:'prediction',comparison:comparison(r,'prediction')},deps);assertRun(r);
 const b=bookModel(r),report=reportModel(r);assert.equal(JSON.stringify(r.prediction),pred);
 assert.notEqual(b.pages[6].comparisonEventId,b.pages[7].comparisonEventId);assert.notEqual(b.pages[6].comparisonRecordRef,b.pages[7].comparisonRecordRef);
 assert.deepEqual(b.pages.slice(6).map(p=>p.comparisonKind),['history','prediction']);assert.deepEqual(b.pages[5].expression,report.together.story);
 assert.equal(r.historyComparison.status,'recorded');assert.equal(r.predictionComparison.status,'recorded');
 const corrupt=structuredClone(r);corrupt.events.find(e=>e.eventType==='comparisonCompleted')!.payload.recordRef='foreign';assert.throws(()=>assertRun(corrupt),/COMPARISON_PROVENANCE/);
});
test('R2 prevents sharing media refs, does not invent story or compare fields',()=>{
 let {r,deps}=creation(1,'preschool');r=transition(r,{type:'story',expression:{method:'unknown',text:''}},deps);
 assert.equal(authoredStory(r).status,'notProvided');
 r=transition(r,{type:'comparison',kind:'history',comparison:comparison(r,'history',{expressionMode:'drawing',discoveryText:'',drawingRef:'drawing:h'})},deps);
 assert.throws(()=>transition(r,{type:'comparison',kind:'prediction',comparison:comparison(r,'prediction',{expressionMode:'drawing',discoveryText:'',drawingRef:'drawing:h'})},deps),/COMPARISON_MEDIA_REUSED/);
 r=transition(r,{type:'comparison',kind:'prediction',comparison:comparison(r,'prediction',{expressionMode:'deferred',discoveryText:''})},deps);
 assert.equal(bookModel(r).pages[7].text.status,'notProvided');assert.equal(bookModel(r).pages[5].text.status,'notProvided');
});
test('story and canvas cannot mutate after creation; old chosen labels remain stored but not authored',()=>{
 let {r,deps}=creation(2,'adult');r=transition(r,{type:'story',expression:{method:'text',text:'원문'}},deps);const next=transition(r,{type:'comparison',kind:'history',comparison:comparison(r,'history')},deps);next.story={status:'recorded',value:{method:'text',text:'바꾼 글'}};assert.throws(()=>assertSuccessor(r,next),/STORY_IMMUTABLE/);
 const legacy=structuredClone(r);legacy.story={status:'recorded',value:{method:'choice',choiceId:'plan',text:'계획 라벨'}};const before=JSON.stringify(legacy);assert.equal(authoredStory(legacy).status,'notProvided');assert.equal(JSON.stringify(legacy),before);
});
