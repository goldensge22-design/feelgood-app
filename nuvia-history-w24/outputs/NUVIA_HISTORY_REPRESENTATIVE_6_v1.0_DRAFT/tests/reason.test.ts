import test from 'node:test';
import assert from 'node:assert/strict';
import {loadContent} from '../src/core/content';
import {releaseContent} from '../src/core/release';
import entry from '../src/content/app-entry.json';
import semantics from '../src/content/w24-semantic.json';
import strings from '../src/content/locales/w24-semantic.ko.json';
import {transition,assertRun,assertSuccessor,comparisonFromExpression} from '../src/core/engine';
import {bookModel,reportModel} from '../src/core/artifacts';
import {MemoryRepository} from '../src/core/storage';
import {AGE_BANDS,type ReasonInput} from '../src/core/types';
import {deterministic,profile,toPrediction,actionInput} from './helpers';
const bundle=releaseContent(await loadContent(),entry,semantics,strings);
function ready(ci=1,age:typeof AGE_BANDS[number]='preschool'){
 const deps=deterministic();let r=toPrediction(bundle,'gutenberg',`gutenberg.c${ci}`,{...profile,ageBand:age},deps);r=transition(r,{type:'prediction',expression:{method:'unknown',text:''}},deps);
 const {reasonRef,...value}=actionInput(r.contentSnapshot.conditions[ci-1].activity) as any;return {r,deps,value};
}
for(const ci of [1,2])for(const age of AGE_BANDS)for(const source of ['typed','recorded','drawn','deferred'] as const)test(`reason provenance / no story leak / locks C${ci}/${age}/${source}`,()=>{
 let {r,deps,value}=ready(ci,age);const reason:ReasonInput=source==='typed'?{source,reasonText:'  내 이유 원문\n그대로  '}:source==='recorded'?{source,voiceRef:'local-audio:record'}:source==='drawn'?{source,drawingRef:'drawing:record'}:{source};
 const before=JSON.stringify(r);const next=transition(r,{type:'action',value,reason},deps);assert.equal(JSON.stringify(r),before);r=next;
 assert.equal(r.action.status,'recorded');assert.equal(r.stage,'alternate');assert.equal(r.events.filter(e=>e.eventType==='cognitiveActionRecorded').length,1);
 if(source==='deferred'){assert.equal(r.reasonExpressions,undefined);assert.ok(!('reasonRef' in (r.action as any).value));assert.equal(r.events.at(-1)!.payload.scope,'reason');}
 else{const record=r.reasonExpressions![0],ev=r.events.at(-1)!;assert.ok(record.reasonRef.startsWith('reason:'));assert.equal(record.reasonRef,(r.action as any).value.reasonRef);assert.equal(ev.eventType,'reasonExpressionRecorded');assert.equal(ev.payload.reasonRef,record.reasonRef);assert.equal(record.actionEventId,r.events.find(e=>e.eventType==='cognitiveActionRecorded')!.eventId);assert.ok(!('reasonText' in ev.payload));}
 const locked=r;r=transition(r,{type:'reveal',possibility:'A'},deps);assertSuccessor(locked,r);assert.throws(()=>transition(r,{type:'action',value,reason},deps),/INVALID_STAGE/);
 r=transition(r,{type:'story',expression:{method:'skip',text:''}},deps);for(const kind of ['history','prediction'] as const)r=transition(r,{type:'comparison',kind,comparison:comparisonFromExpression(r,kind,{method:'skip',text:''})},deps);
 assertRun(r);const book=bookModel(r),report=reportModel(r);assert.equal(book.pages[5].text.status,'notProvided');assert.ok(!JSON.stringify(book).includes('내 이유 원문'));assert.equal(report.details.reasonStatus,source==='deferred'?'deferred':'recorded');assert.equal(report.details.observations.length,1);assert.equal(report.details.observations[0].description,undefined);
 if(source!=='deferred'){const broken=structuredClone(r);broken.reasonExpressions![0].resultId='foreign';assert.throws(()=>assertRun(broken));const changed=structuredClone(r);changed.reasonExpressions![0].reasonQuestionId='foreign';assert.throws(()=>assertRun(changed));}
});
test('reason requires actual input, rejects material IDs, unknown fields and forged events',()=>{
 const {r,deps,value}=ready();for(const reason of [undefined,{source:'typed',reasonText:'  \n '},{source:'recorded',voiceRef:'material'},{source:'drawn',drawingRef:''},{source:'deferred',reasonText:'generated'},{source:'mixed'}])assert.throws(()=>transition(r,{type:'action',value,reason:reason as any},deps));
 assert.throws(()=>transition(r,{type:'action',value:{...value,reasonRef:'gutenberg.c1.reason.1'},reason:{source:'deferred'}},deps),/REASON_REF_NOT_CLIENT_ASSIGNED/);
 const ok=transition(r,{type:'action',value,reason:{source:'typed',reasonText:'원문'}},deps);for(const mutate of [(x:any)=>x.reasonExpressions=[],(x:any)=>x.events.pop(),(x:any)=>x.events.at(-1).payload.actionEventId='foreign',(x:any)=>x.events.find((e:any)=>e.eventType==='cognitiveActionRecorded').payload.beforeResponseId='foreign',(x:any)=>x.events.at(-1).payload.reasonText='duplicate']){const b=structuredClone(ok);mutate(b);assert.throws(()=>assertRun(b));}
});
test('whole activity defer has no cognitive input and no reason reference',()=>{
 const {r,deps}=ready();const next=transition(r,{type:'deferAction',reason:'unknown'},deps);assert.equal(next.events.at(-1)!.payload.scope,'activity');assert.equal(next.action.status,'notProvided');assert.equal(next.reasonExpressions,undefined);assert.equal(next.events.filter(e=>e.eventType==='cognitiveActionRecorded').length,0);assert.equal(transition(next,{type:'reveal',possibility:'B'},deps).stage,'creation');
});
test('failed atomic save preserves old run and reveal gate; successful save stores both events',async()=>{
 const {r,deps,value}=ready();const repo=new MemoryRepository(),seed=structuredClone(r);seed.revision=0;await repo.create(seed);
 const next=transition(seed,{type:'action',value,reason:{source:'deferred'}},deps);await assert.rejects(repo.save(next,99),/REVISION_CONFLICT/);assert.deepEqual(await repo.load(seed.resultId,profile.learnerId),seed);await repo.save(next,0);const loaded=(await repo.load(seed.resultId,profile.learnerId))!;assert.equal(loaded.events.at(-1)!.payload.scope,'reason');await assert.rejects(repo.load(seed.resultId,'other'),/OWNER_MISMATCH/);
});
