import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, newApplication } from './career';
import {
  emptySidecar,
  canReviewJobConnection,
  isJobConnectionReviewed,
  jobConnectionOf,
  reviewJobConnection,
  setJobConnectionNotes,
  setExpMeta,
  setStarNotes,
  invalidateJobConnectionReviews,
  snapshotVersion,
  sourceScopeMatchesApplication,
  restoreFromSnapshot,
  type JobConnectionNotes,
} from './provenance';
import { jobConnectionPrompts } from './star-story';
import type { CareerExperience } from '@workspace/api-client-react';

const experience: CareerExperience = {
  id: 'exp-a',
  title: 'Synthetic example: checked two event notices',
  action: 'Compared version labels and intended audiences',
  result: 'The notices named different audiences',
  learning: '',
  strengths: [],
  criterionIds: [],
  confirmed: false,
  source: 'example',
};

const notes: JobConnectionNotes = {
  sourceKind: 'educational_inference',
  specificDuty: 'Compare approved materials before distribution',
  sharedAction: 'I compared version labels and intended audiences',
  learnedPrinciple: 'Current and applicable are different checks',
  futureApplication: 'In a future support task, check version and audience separately',
  sourceTitle: '',
  sourceCompany: '',
  sourceJob: '',
  sourceVersion: '',
};

function makeApp() {
  return {
    ...newApplication(),
    id: 'app-a',
    company: 'Example Org',
    job: 'Training support',
    question: 'Describe how you learned and will apply it',
    experienceIds: ['exp-a'],
  };
}

test('job source scope mismatches are explicit and never silently blended', () => {
  assert.equal(sourceScopeMatchesApplication({ ...notes, sourceCompany: 'Other Org' }, makeApp()), false);
  assert.equal(sourceScopeMatchesApplication({ ...notes, sourceJob: 'Other role' }, makeApp()), false);
  assert.equal(sourceScopeMatchesApplication({ ...notes, sourceCompany: 'Example Org', sourceJob: 'Training support' }, makeApp()), true);
  assert.equal(sourceScopeMatchesApplication(notes, makeApp()), true);
});

test('official and public source labels need a reference and matching company/job before student review', () => {
  const app = makeApp();
  assert.equal(canReviewJobConnection(notes, app), true);
  assert.equal(canReviewJobConnection({ ...notes, sourceKind: 'official_material', sourceTitle: '' }, app), false);
  assert.equal(canReviewJobConnection({ ...notes, sourceKind: 'official_material', sourceTitle: 'Role guide', sourceCompany: 'Other Org' }, app), false);
  assert.equal(canReviewJobConnection({ ...notes, sourceKind: 'educational_inference' }, app), true);
  assert.equal(canReviewJobConnection(notes, { ...app, company: '' }), false);
});

test('student review is bound to the company, role, question, selected experience and experience contents', () => {
  const app = makeApp();
  let sidecar = setJobConnectionNotes(emptySidecar(), app.id, experience.id, notes);
  sidecar = reviewJobConnection(sidecar, app, experience, 'actual', 'unknown', '2026-11-10T00:00:00Z');
  assert.equal(isJobConnectionReviewed(sidecar, app, experience, 'actual'), true);
  assert.equal(isJobConnectionReviewed(sidecar, { ...app, job: 'Different role' }, experience, 'actual'), false);
  assert.equal(isJobConnectionReviewed(sidecar, { ...app, question: 'Different question' }, experience, 'actual'), false);
  assert.equal(isJobConnectionReviewed(sidecar, { ...app, company: 'Different company' }, experience, 'actual'), false);
  assert.equal(isJobConnectionReviewed(sidecar, { ...app, experienceIds: [] }, experience, 'actual'), false);
  assert.equal(isJobConnectionReviewed(sidecar, app, { ...experience, action: 'Changed action' }, 'actual'), false);
  assert.equal(isJobConnectionReviewed(sidecar, app, experience, 'simulation'), false);
});

test('editing notes clears review, but untouched review stays available for its exact context', () => {
  const app = makeApp();
  let sidecar = setJobConnectionNotes(emptySidecar(), app.id, experience.id, notes);
  sidecar = reviewJobConnection(sidecar, app, experience, 'actual', 'unknown', '2026-11-10T00:00:00Z');
  assert.equal(jobConnectionOf(sidecar, app.id, experience.id)?.reviewedAt, '2026-11-10T00:00:00Z');
  sidecar = setJobConnectionNotes(sidecar, app.id, experience.id, { ...notes, learnedPrinciple: 'A revised principle' });
  assert.equal(jobConnectionOf(sidecar, app.id, experience.id)?.reviewedAt, undefined);
  assert.equal(isJobConnectionReviewed(sidecar, app, experience, 'actual'), false);
});

test('returning edited experience details to the old text does not revive an earlier review', () => {
  const app = makeApp();
  let sidecar = setJobConnectionNotes(emptySidecar(), app.id, experience.id, notes);
  sidecar = reviewJobConnection(sidecar, app, experience, 'unconfirmed', 'unknown', '2026-11-10T00:00:00Z');
  sidecar = setStarNotes(sidecar, experience.id, { situation: 'Original situation' });
  // Review after the evidence is explicitly present.
  sidecar = reviewJobConnection(sidecar, app, experience, 'unconfirmed', 'unknown', '2026-11-10T00:01:00Z');
  sidecar = setStarNotes(sidecar, experience.id, { situation: 'Edited situation' });
  sidecar = setStarNotes(sidecar, experience.id, { situation: 'Original situation' });
  assert.equal(isJobConnectionReviewed(sidecar, app, experience, 'unconfirmed'), false);

  sidecar = setExpMeta(sidecar, experience.id, { experienceContext: 'class_simulation' });
  assert.equal(isJobConnectionReviewed(sidecar, app, experience, 'unconfirmed', 'class_simulation'), false);
  sidecar = invalidateJobConnectionReviews(sidecar, { appId: app.id, experienceId: experience.id });
  assert.equal(jobConnectionOf(sidecar, app.id, experience.id)?.reviewedAt, undefined);
});

test('immutable version captures only selected experiences and restores notes into a new draft', () => {
  const app = makeApp();
  const state = { ...emptyState(), experiences: [experience], applications: [app] };
  let sidecar = setJobConnectionNotes(emptySidecar(), app.id, experience.id, notes);
  sidecar = reviewJobConnection(sidecar, app, experience, 'unconfirmed', 'unknown', '2026-11-10T00:00:00Z');
  sidecar = snapshotVersion(sidecar, 'version-a', app, state);
  assert.deepEqual(sidecar.versions['version-a'].jobLinks?.['exp-a'], jobConnectionOf(sidecar, app.id, experience.id));
  const restored = restoreFromSnapshot(sidecar, 'version-a', 'restored-draft');
  assert.deepEqual(restored.apps['restored-draft'].jobLinks?.['exp-a'], notesWithReview(sidecar, app.id));
  const edited = setJobConnectionNotes(restored, 'restored-draft', 'exp-a', { ...notes, futureApplication: 'New draft only' });
  assert.equal(edited.versions['version-a'].jobLinks?.['exp-a'].futureApplication, notes.futureApplication);
  assert.equal(edited.apps['restored-draft'].jobLinks?.['exp-a'].futureApplication, 'New draft only');
});

function notesWithReview(sidecar: ReturnType<typeof emptySidecar>, appId: string) {
  return jobConnectionOf(sidecar, appId, 'exp-a');
}

test('job coach asks about missing concrete duty, relationship, principle and future use without generating content', () => {
  const prompts = jobConnectionPrompts(
    [experience],
    () => ({ localOnly: true, nature: 'simulation' }),
    () => ({ ...notes, learnedPrinciple: '성실함' }),
    'Training support',
    'Example Org',
  );
  assert.deepEqual(prompts.map((item) => item.topic), ['jobPrincipleSpecific']);
  assert.equal(prompts[0].nature, 'simulation');
  assert.match(prompts[0].question, /성실함/);
  const empty = jobConnectionPrompts([experience], () => ({ localOnly: true, nature: 'unconfirmed' }), () => undefined, 'Training support', 'Example Org');
  assert.deepEqual(empty.map((item) => item.topic), ['jobDuty', 'jobSource', 'jobShared', 'jobPrinciple', 'jobFuture']);
  assert(!empty.some((item) => /성과|수치|근무 경험/.test(item.question)));
});

test('source kind stays a user-selected label and does not promote synthetic or unconfirmed experience', () => {
  const app = makeApp();
  const sidecar = setJobConnectionNotes(emptySidecar(), app.id, experience.id, { ...notes, sourceKind: 'official_material' });
  assert.equal(jobConnectionOf(sidecar, app.id, experience.id)?.sourceKind, 'official_material');
  assert.equal(experience.source, 'example');
  assert.equal(experience.confirmed, false);
  assert.equal(sidecar.exps[experience.id], undefined);
});

test('an older experience keeps context unknown unless a student explicitly chooses one', () => {
  const old = { localOnly: true as const, nature: 'actual' as const };
  assert.equal(old.nature, 'actual');
  assert.equal('experienceContext' in old, false);
});
