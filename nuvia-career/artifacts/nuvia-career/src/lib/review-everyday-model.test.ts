import assert from 'node:assert/strict';
import test from 'node:test';
import { approveCardRevision, createFreeReviewCard, isReviewBook, newReviewBook, registerEverydayCard } from './review-planner-model';
import { buildGroundedSections, contextOf, generateEverydayPlans, initialChoice, matchOf } from './review-everyday-model';

const ctx=contextOf(initialChoice)!;
test('focus changes ranking and optional help without changing a situation by job',()=>{
  const simultaneous=generateEverydayPlans(ctx.need,ctx.trait,ctx.focus);
  const next=contextOf({...initialChoice,focus:'attention'})!;
  const attention=generateEverydayPlans(next.need,next.trait,next.focus);
  const other=contextOf({...initialChoice,focus:'attention',need:'clarity'})!;
  const newNeed=generateEverydayPlans(other.need,other.trait,other.focus);
  assert.match(simultaneous[0].scene,/20분/);
  assert.match(attention[0].scene,/준비물/);
  assert.equal(attention[0].steps.length,simultaneous[0].steps.length+1);
  assert.equal(attention[0].scene,newNeed[0].scene);
  assert.equal(attention[0].question,newNeed[0].question);
  assert.notEqual(attention[0].linkReason,newNeed[0].linkReason);
  assert(simultaneous.every(item=>item.minutes===5));
});
test('no independent report need, no suggested exercises; support switch never invents one',()=>{
  const missing=contextOf({...initialChoice,trait:'sequential',focus:undefined})!;
  assert.equal(missing.focus,undefined);
  assert.deepEqual(generateEverydayPlans(missing.need,missing.trait,missing.focus),[]);
  const next=contextOf({...initialChoice,trait:'sequential'})!;
  const compare=generateEverydayPlans(next.need,next.trait,next.focus)[0];
  const original=generateEverydayPlans(ctx.need,ctx.trait,ctx.focus)[0];
  assert.equal(compare.scene,original.scene);
  assert.notEqual(compare.supportReason,original.supportReason);
});
test('a registered plan is idempotent, not evidence even with worksheet text',()=>{
  const id='review-card-30db371a-08e9-43df-bb60-bc06630500a0';
  const item={match:matchOf(initialChoice)!,activity:generateEverydayPlans(ctx.need,ctx.trait,ctx.focus)[0],
    worksheet:{before:'아직 승인하지 않은 문장',observation:'',reflection:'',date:'2026-11-19'}};
  const book=registerEverydayCard(newReviewBook(),id,item)!;
  assert(book);
  assert.equal(registerEverydayCard(book,id,item),book);
  assert.equal(book.cards[id].note,null);
  assert.equal(approveCardRevision(book,id,1),null);
});
test('day note order/time and imagined choice are distinct, absent results stay absent',()=>{
  const actual='물 마시기(2분) → 세수(5분)';
  const [,,actions,learning]=buildGroundedSections(ctx.role,ctx.need,{action:actual,result:'',learning:'',next:'',dailyNote:true,thought:true},
    {action:'가정이라 익숙한 쪽을 골랐다.',result:'먼저 도착시간을 확인하고 싶었다.',learning:'',next:'',thought:true});
  assert.match(actions,/근무 경험 아님/);
  assert(actions.includes(actual));
  assert.match(actions,/실제 수행 아님/);
  assert.equal(learning,'');
});
test('free notes have no LAB dependency, and new same-day notes use independent ids',()=>{
  const first='review-card-00000000-0000-0000-0000-000000000001';
  const second='review-card-00000000-0000-0000-0000-000000000002';
  const date='2026-11-19';
  const book=createFreeReviewCard(newReviewBook(),first,date)!;
  assert.equal(createFreeReviewCard(book,first,date),book);
  const separate=createFreeReviewCard(book,second,date)!;
  assert(isReviewBook(separate));
  assert.equal(separate.cards[first], book.cards[first]);
  assert.equal(separate.cards[second].kind,'free');
  assert.equal(approveCardRevision(separate,second,1),null);
});
