import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addCardFromPreview, applyCardNote, applyCardPlan, applyCardStatus, approveCardRevision,
  emptyReviewNote, emptyReviewPlan, isReviewBook, newReviewBook, reviewCardExperience,
} from './review-planner-model';

const id = 'review-card-01234567-0123-0123-0123-0123456789ab';
const other = 'review-card-11234567-0123-0123-0123-0123456789ab';
const sample = { id, plan: { goal: '비교', scenario: '두 가지 안내', action: '대조하기', criterion: '차이 한 건 기록', when: '2026-11-19T14:30' } };
const note = { ...emptyReviewNote(), action: '두 줄을\n대조했다.' };
function seeded() {
  return addCardFromPreview({ ...newReviewBook(), drafts: { service: sample } }, 'service', sample)!;
}

test('creation needs exact latest complete preview and is idempotent', () => {
  const book = { ...newReviewBook(), drafts: { service: sample } };
  assert.equal(addCardFromPreview(book, 'education', sample), null);
  assert.equal(addCardFromPreview(book, 'service', { ...sample, plan: emptyReviewPlan() }), null);
  assert.equal(addCardFromPreview(book, 'service', { ...sample, plan: { ...sample.plan, goal: '이전 미리보기' } }), null);
  const next = addCardFromPreview(book, 'service', sample)!;
  assert.equal(Object.keys(next.cards).length, 1);
  assert.equal(addCardFromPreview(next, 'service', sample), next);
  assert.equal(next.cards[id].status, 'planned');
  assert.equal(next.cards[id].note, null);
  assert(isReviewBook(JSON.parse(JSON.stringify(next))));
});

test('plan does not create learning, results or completion; recording requires actual action', () => {
  const book = seeded();
  assert.equal(applyCardStatus(book, id, 'completed'), null);
  assert.equal(applyCardNote({ ...book, noteEdits: { [id]: { ...emptyReviewNote(), result: '관찰만' } } }, id), null);
  const performed = applyCardNote({ ...book, noteEdits: { [id]: note } }, id)!;
  assert.equal(performed.cards[id].note?.result, '');
  assert.equal(performed.cards[id].note?.learning, '');
  assert.equal(performed.cards[id].status, 'planned');
  assert.equal(applyCardStatus(performed, id, 'completed'), null);
  const observed = applyCardNote({ ...performed, noteEdits: { [id]: { ...note, result: '다른 표현 하나 발견' } } }, id)!;
  assert.equal(observed.cards[id].status, 'planned');
  assert.equal(applyCardStatus(observed, id, 'completed')!.cards[id].status, 'completed');
});

test('only explicit committed and approved revision projects, original change requires new approval', () => {
  const book = seeded();
  assert.equal(approveCardRevision(book, id, 1), null);
  const performed = applyCardNote({ ...book, noteEdits: { [id]: { ...note, next: '향후 계획으로만 남긴다.' } } }, id)!;
  assert.equal(reviewCardExperience(performed.cards[id]), null);
  assert.equal(approveCardRevision(performed, id, 1), null);
  assert.equal(approveCardRevision({ ...performed, noteEdits: { [id]: note } }, id, 2), null);
  const approved = approveCardRevision(performed, id, 2)!;
  assert.equal(reviewCardExperience(approved.cards[id])?.action, note.action);
  assert.equal(reviewCardExperience(approved.cards[id])?.result, '');
  assert.equal(reviewCardExperience(approved.cards[id])?.confirmed, true);
  const edit = applyCardPlan({ ...approved, planEdits: { [id]: { ...sample.plan, scenario: '새 상황' } } }, id)!;
  assert.equal(reviewCardExperience(edit.cards[id])?.confirmed, false);
  assert.equal(approveCardRevision(edit, id, 2), null);
  const revert = applyCardPlan({ ...edit, planEdits: { [id]: sample.plan } }, id)!;
  assert.equal(revert.cards[id].revision, 4);
  assert.equal(reviewCardExperience(revert.cards[id])?.confirmed, false);
  assert.equal(reviewCardExperience(approveCardRevision(revert, id, 4)!.cards[id])?.confirmed, true);
});

test('multiple cards isolate edits, save/approval, source values and plan context', () => {
  const book = seeded();
  const secondary = { ...sample, id: other, plan: { ...sample.plan, goal: '서로 다른 목표' } };
  const two = addCardFromPreview({ ...book, drafts: { education: secondary } }, 'education', secondary)!;
  const b = applyCardNote({ ...two, noteEdits: { [other]: note } }, other)!;
  assert.equal(b.cards[id], book.cards[id]);
  assert.equal(b.cards[other].option, 'education');
  assert.equal(reviewCardExperience(approveCardRevision(b, other, 2)!.cards[other])?.title, '서로 다른 목표');
  assert.equal(reviewCardExperience(b.cards[id]), null);
});
