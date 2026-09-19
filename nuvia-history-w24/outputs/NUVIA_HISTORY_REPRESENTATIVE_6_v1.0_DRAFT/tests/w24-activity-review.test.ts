import test from 'node:test';
import assert from 'node:assert/strict';
import {loadContent} from '../src/core/content';
import {releaseContent} from '../src/core/release';
import {AGE_BANDS} from '../src/core/types';
import entry from '../src/content/app-entry.json';
import semantics from '../src/content/w24-semantic.json';
import semanticStrings from '../src/content/locales/w24-semantic.ko.json';
import {w24ActivityGuidance} from '../src/content/w24ActivityGuidance.ko';

const source=await loadContent(),bundle=releaseContent(source,entry,semantics,semanticStrings),mission=bundle.missions.find(m=>m.id==='gutenberg')!;

test('W24-C2 records one learner-chosen first step without a numbered answer order',()=>{
 const c=mission.conditions.find(c=>c.id==='gutenberg.c2')!;
 assert.equal(c.activity.actionKind,'chooseGoalAndSteps');
 assert.equal(c.activity.contractId,'action.chooseGoalAndSteps.r2');
 assert.equal(c.activity.materials.filter(m=>m.role==='response').length,3);
 for(const age of AGE_BANDS){
  const questions=c.semantic!.subquestions[age];
  assert.ok(questions.response);assert.equal(questions.priorities,undefined);
  assert.equal(questions.response.semanticFields.expectedResponseType,'responseId');
  assert.match(String(questions.response.semanticFields.allowedResponses),/모두 허용/);
 }
});

test('every W24 question states judgement, PASS behavior, alternatives, help and completion evidence',()=>{
 for(const c of mission.conditions)for(const age of AGE_BANDS)for(const screen of [...Object.values(c.semantic!.stages[age]),...Object.values(c.semantic!.subquestions[age])])for(const field of ['userJudgement','passBehavior','allowedResponses','helpWhenBlocked','completionEvidence'])assert.ok(String(screen.semanticFields[field]??'').trim(),`${c.id}/${age}/${screen.semanticFields.questionId}/${field}`);
});

test('activity alternatives are actions, not repeated condition answers or single-answer judgements',()=>{
 for(const c of mission.conditions){
  const condition=bundle.strings[c.conditionKey];const responses=c.activity.materials.filter(m=>m.role==='response').map(m=>bundle.strings[m.labelKey]);
  assert.equal(responses.length,3);assert.ok(responses.every(label=>label!==condition&&/요$/.test(label)));
  const guide=w24ActivityGuidance[c.id];assert.ok(guide.context.length>=2);assert.ok(Object.keys(guide.questions).length>=2);
 }
});

test('runtime exposes only Korean; unsupported language cannot leave stale translated questions',async()=>{
 await assert.rejects(loadContent('en'),/LANGUAGE_NOT_PROVIDED/);
 assert.equal(bundle.locale,'ko');
});
