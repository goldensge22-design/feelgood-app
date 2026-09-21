import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,evidenceComplete} from '../src/contracts.mjs';
import {initializeReview,writePrediction,lockPrediction,changePlan,reviewComplete,inputsComplete,unknownRecord,addActiveTime,REVIEW_KEY} from '../src/reconsideration.mjs';
import {reconsiderCopy as c} from '../src/locales/ko-reconsider.mjs';
import {planBook} from '../src/reconsiderationView.mjs';
export function ready(age='high-school'){
 let r=initializeReview(createRun('planning',1,age));
 r=writePrediction(r,'direct',0);if(age==='high-school')r=writePrediction(r,'longTerm',1);
 r=lockPrediction(r,{direct:c.directOptions,longTerm:c.longOptions},2);
 for(const [a,v] of [['goal','hear'],...(age==='high-school'?[['compare','tell'],['compare','time']]:[]),['method','tell'],['selectionReason','fixture comparison'],['start'],['outcome'],...(age==='high-school'?[['fact']]:[])])r=changePlan(r,a,v);
 return r;
}
export function filled(r){
 if(r.ageBand==='high-school')r=changePlan(r,'unknownText','fixture unknown');
 r=changePlan(r,'connectionText','fixture connection');
 if(r.ageBand==='high-school')r=changePlan(r,'limitText','fixture limit');
 r=changePlan(r,'judge');
 if(r.ageBand==='high-school')r=changePlan(r,'fit','undetermined');
 return r;
}
test('review is isolated and initial prediction is immutable',()=>{
 let r=ready();const snapshot=structuredClone(r.prediction);
 assert.match(r.resultId,/^demo:planning-review-v1:/);assert.notEqual(REVIEW_KEY,'nuviaHistory.ageComparisonDemo.v1');
 r=writePrediction(r,'direct',2);assert.deepEqual(r.prediction,snapshot);
 r=lockPrediction(r,{direct:['changed'],longTerm:['changed']});assert.deepEqual(r.prediction,snapshot);
 r.step='prediction';r=lockPrediction(r,{});assert.equal(r.step,'path');assert.deepEqual(r.prediction,snapshot);
 assert.equal(r.prediction.longTerm.text,c.longOptions[1]);
});
test('every high-school input and explicit decision is necessary',()=>{
 const base=ready();assert.equal(inputsComplete(base),false);
 for(const missing of ['unknownText','connectionText','limitText']){
  let r=filled(base);r=changePlan(r,missing,' \n \u200b');r=changePlan(r,'judge');r=changePlan(r,'fit','sufficient');r=changePlan(r,'decision','keep');assert.equal(reviewComplete(r),false,missing);
 }
 let r=filled(base);assert.equal(reviewComplete(r),false);r=changePlan(r,'decision','keep');assert.equal(evidenceComplete(r),true);assert.equal(r.step,'story');
});
test('unknown selection or original text is accepted, not source confirmation',()=>{
 let r=ready();r=changePlan(r,'unknown','time.language');assert.equal(r.planning.draft.unknownInfoIds.length,0);
 r=changePlan(r,'unknown','tell.language');r=changePlan(r,'connectionText','reason');r=changePlan(r,'limitText','limit');assert.equal(inputsComplete(r),true);
 const u=unknownRecord(r);assert.equal(u.status,'unverified');assert.equal(u.systemSelection.authorType,'system');assert.equal(u.learnerText.authorType,'learner');
});
test('revise requires another method and a fresh review; old draft retained',()=>{
 let r=filled(ready());const old=structuredClone(r.planning.draft);r=changePlan(r,'decision','revise');
 assert.equal(reviewComplete(r),false);r=changePlan(r,'method','tell');assert.equal(r.planning.pendingRevision,true);
 r=changePlan(r,'method','time');assert.equal(r.planning.method,'time');assert.equal(r.planning.goal,'hear');assert.equal(r.planning.history[0].draft.connectionText,old.connectionText);
 assert.equal(r.planning.draft.connectionText,'');assert.equal(reviewComplete(r),false);
 r=changePlan(r,'outcome');r=changePlan(r,'fact');r=changePlan(r,'reuse');r=changePlan(r,'unknown','time.language');
 assert.equal(inputsComplete(r),false);r=changePlan(r,'confirmCarry');assert.equal(inputsComplete(r),true);
 r=changePlan(r,'judge');r=changePlan(r,'fit','sufficient');r=changePlan(r,'decision','keep');assert.equal(reviewComplete(r),true);
 assert.deepEqual(r.planning.revisions.map(x=>[x.from,x.to]),[['tell','time']]);
});
test('edits invalidate judgement and decision but not prediction or writing',()=>{
 let r=changePlan(filled(ready()),'decision','keep');const prediction=structuredClone(r.prediction);
 r=changePlan(r,'edit');assert.equal(reviewComplete(r),false);assert.equal(r.planning.draft.goalFit,null);assert.equal(r.planning.draft.connectionText,'fixture connection');
 r=changePlan(r,'unknownText','updated');assert.equal(r.planning.draft.decision,null);assert.deepEqual(r.prediction,prediction);
 r=changePlan(r,'goal','see');assert.equal(r.planning.goal,'hear');
});
test('middle school has lock and real revision without high-school fields',()=>{
 let r=filled(ready('middle-school'));assert.equal(r.planning.draft.factSeen,false);assert.equal(r.planning.draft.limitText,'');
 r=changePlan(r,'decision','revise');assert.equal(reviewComplete(r),false);r=changePlan(r,'method','own');r=changePlan(r,'outcome');r=changePlan(r,'connectionText','new reason');r=changePlan(r,'judge');r=changePlan(r,'decision','keep');assert.equal(reviewComplete(r),true);
});
test('revision may return to original on a later distinct transition',()=>{
 let r=filled(ready());r=changePlan(r,'decision','revise');r=changePlan(r,'method','time');r=changePlan(r,'outcome');r=changePlan(r,'fact');r=filled(r);r=changePlan(r,'decision','revise');r=changePlan(r,'method','tell');r=changePlan(r,'outcome');r=changePlan(r,'fact');r=changePlan(filled(r),'decision','keep');assert.equal(reviewComplete(r),true);assert.equal(r.planning.revisions.length,2);
});
test('book preserves authorship and safely escapes learner input',()=>{
 let r=filled(ready());r=changePlan(r,'unknown','tell.language');r=changePlan(r,'unknownText','<script>learner</script>');const html=planBook(r);
 assert.match(html,/data-author="system"/);assert.match(html,/data-author="learner"/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/시스템 정리/);
 assert.equal(r.story.text,'');assert.equal(r.comparisons.history.value,'');
});
test('elapsed time only accepts bounded active samples and stops after finish',()=>{
 let r=ready();r=addActiveTime(r,1500);assert.equal(r.timing.activeMs,1500);assert.equal(r.timing.byStep.path,1500);
 r=addActiveTime(r,3600000);assert.equal(r.timing.activeMs,1500);r.timing.finishedAt='done';r=addActiveTime(r,1000);assert.equal(r.timing.activeMs,1500);
});
test('reload serialization retains ID, snapshot, previous draft and independent comparisons',()=>{
 let r=changePlan(filled(ready()),'decision','revise');r=changePlan(r,'method','time');
 r.comparisons.history={status:'recorded',value:'one',eventId:'h',comparisonKind:'history'};r.comparisons.prediction={status:'recorded',value:'two',eventId:'p',comparisonKind:'prediction'};
 const restored=JSON.parse(JSON.stringify(r));assert.deepEqual(restored,r);assert.notEqual(restored.comparisons.history.eventId,restored.comparisons.prediction.eventId);assert.equal(reviewComplete(restored),false);
});
