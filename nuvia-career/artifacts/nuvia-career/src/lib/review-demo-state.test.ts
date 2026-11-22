import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ExpMeta } from './provenance';
import { reviewExperience } from './review-demo-fixture';
import { bindReviewStoryboard, reviewResumePath } from './review-demo-state';
import { confirmStoryboard, editStoryboard } from './storyboard';

const sample = reviewExperience();
const meta: ExpMeta = { localOnly: true, nature: 'simulation', origin: 'example', synthetic: true };
const service = { option: 'service', approved: true };

test('adult resume accepts actual writing steps and individual cards, not unrelated routes or URLs',()=>{
  assert.equal(reviewResumePath('/worksheet'),'/worksheet');
  assert.equal(reviewResumePath('/planner/card/review-card-00000000-0000-4000-8000-000000000001'),'/planner/card/review-card-00000000-0000-4000-8000-000000000001');
  for(const path of [null,42,'/home','/history','/teacher','/planner/card/unknown','//other.example','/planner?account=other']){
    assert.equal(reviewResumePath(path),null);
  }
});

test('explicit selection and approval bind only the simulation record', () => {
  assert.equal(bindReviewStoryboard(null, null, null, sample, meta), null);
  assert.equal(bindReviewStoryboard(null, { ...service, approved: false }, null, sample, meta), null);
  assert.equal(bindReviewStoryboard(null, { option: 'unknown', approved: true }, null, sample, meta), null);
  assert.equal(bindReviewStoryboard(null, service, null, { ...sample, source: 'manual' }, meta), null);
  assert.equal(bindReviewStoryboard(null, service, null, sample, { ...meta, nature: 'actual' }), null);
  const draft = bindReviewStoryboard(null, service, null, sample, meta)!;
  assert.equal(draft.experienceId, sample.id);
  assert.equal(draft.job, 'IT 서비스기획');
  assert.deepEqual(draft.sections, ['', '', '', '']);
});

test('returning with the same selection preserves edits; a different selection preserves body and prior versions', () => {
  const first = bindReviewStoryboard(null, service, null, sample, meta)!;
  const confirmed = confirmStoryboard(editStoryboard(first, { company: '사용자 회사 입력', sections: ['A', 'B', 'C', 'D'] }));
  assert.equal(bindReviewStoryboard(confirmed, service, 'service', sample, meta), confirmed);
  const second = bindReviewStoryboard(confirmed, { option: 'education', approved: true }, 'service', sample, meta)!;
  assert.deepEqual(second.versions, confirmed.versions);
  assert.deepEqual(second.sections, confirmed.sections);
  assert.equal(second.job, '교육 운영 지원');
  assert.equal(second.confirmedRevision, null);
});
