import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Router } from 'wouter';
import { ReviewProfileSummary } from '@/components/review-home';
import { presentHomeReport, reviewHomeFixture, type HomeReportSummary } from './review-home-profile';

const renderProfile = (report: HomeReportSummary | null) => renderToStaticMarkup(createElement(Router, {
  ssrPath: '/home',
  children: createElement(ReviewProfileSummary, { report, synthetic: false, adult: true }),
}));

test('result summary preserves the supplied order, labels, precision, units, scale and assessment date', () => {
  // Synthetic input in the shape that a verified report may provide.
  const input: HomeReportSummary = {
    assessedOn: '2026.02.03 (원본 표기)',
    scale: '예시 척도 B',
    areas: [
      { id: 'attention', label: '주의력 (원본 이름)', score: '001.20', unit: '예시 단위' },
      { id: 'planning', label: '계획력', score: 0, unit: '예시 단위' },
      { id: 'sequential', label: '순차 처리', score: null },
    ],
    strengths: ['원본 강점 해석'],
    growthPoints: ['원본 성장 포인트'],
    topJobs: [
      { id: 'a', title: '직무 원문 A', reason: '첫 추천 이유', source: '원문 자료 v2' },
      { id: 'b', title: '직무 원문 B', reason: '둘째 추천 이유' },
    ],
  };
  const data = presentHomeReport(input);
  assert.deepEqual(data.areas.map(({ score }) => score), ['001.20', '0', null]);
  assert.deepEqual(data.areas.map(({ label }) => label), ['주의력 (원본 이름)', '계획력', '순차 처리']);
  assert.deepEqual(data.topJobs, input.topJobs);
  assert.equal(data.topJobs.length, 2);
  const markup = renderProfile(input);
  for (const expected of [input.assessedOn!, input.scale!, '주의력 (원본 이름)', '001.20', '예시 단위', '>0<', '자료 없음',
    '원본 강점 해석', '원본 성장 포인트', '첫 추천 이유', '원문 자료 v2']) assert.ok(markup.includes(expected), expected);
  assert.ok(markup.indexOf('직무 원문 A') < markup.indexOf('직무 원문 B'));
  assert.doesNotMatch(markup, /가상 예시|표준점수|IQ|백분위/);
});

test('a missing report shows four missing values and no evidence-derived interpretation', () => {
  const data = presentHomeReport(null);
  assert.deepEqual(data.areas.map(({ score }) => score), [null, null, null, null]);
  assert.deepEqual(data.strengths, []);
  assert.deepEqual(data.growthPoints, []);
  const markup = renderProfile(null);
  assert.equal((markup.match(/자료 없음/g) ?? []).length, 9);
  assert.doesNotMatch(markup, />0<|가상 예시/);
});

test('the synthetic zero is supplied data, not a reason to infer a growth area', () => {
  const profile = presentHomeReport(reviewHomeFixture('sequential'));
  assert.equal(profile.areas[0].score, '0');
  assert.deepEqual(profile.growthPoints, []);
  assert.match(profile.strengths[0], /순차처리/);
  assert.equal(profile.scale, null);
  assert.equal(profile.topJobs.length, 5);
  assert.equal(new Set(profile.topJobs.map(job => job.reviewRole)).size, 5);
});
