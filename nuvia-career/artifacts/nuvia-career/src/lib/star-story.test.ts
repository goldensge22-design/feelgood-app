import test from 'node:test';
import assert from 'node:assert/strict';
import type { CareerExperience } from '@workspace/api-client-react';
import { emptySidecar, setStarNotes, type ExpMeta } from '@/lib/provenance';
import { prefersExistingQuestionCoach, starCoachPrompts, storyValues } from '@/lib/star-story';
import { LOCALES } from '@/lib/i18n';

const experience = (override: Partial<CareerExperience> = {}) => ({
  id: 'exp-1', title: '합성 확인용 경험', action: '', result: '', learning: '',
  strengths: [], criterionIds: [], confirmed: false, source: 'manual' as const, ...override,
});
const meta = (override: Partial<ExpMeta> = ({ localOnly: true, nature: 'unconfirmed' })) =>
  ({ localOnly: true, nature: 'unconfirmed' as const, ...override });

test('legacy experiences remain unclassified and missing STAR details are never invented', () => {
  const e = experience();
  const m = meta();
  const values = storyValues(e, m);
  assert.deepEqual(values, { situation: '', roleGoal: '', selectionReason: '', resultEvidence: '', action: '', result: '', learning: '' });
  assert.equal(m.nature, 'unconfirmed');
  assert.match(starCoachPrompts([e], () => m)[0].question, /어떤 상황/);
});

test('planner-selected fields are reused instead of asked again', () => {
  const e = experience({ action: '요청 내역을 분류했다', result: '문의가 줄었다' });
  const m = meta({ planner: { selectedAction: '요청 내역을 분류했다', selectionReason: '반복되는 문제부터 보려고 했다', result: '문의가 줄었다' } });
  const topics = starCoachPrompts([e], () => m).map((p) => p.topic);
  assert(!topics.includes('action'));
  assert(!topics.includes('selectionReason'));
  assert(!topics.includes('result'));
  assert(topics.includes('situation'));
});

test('simulation keeps its context and asks separately about received support and independent choices', () => {
  const e = experience({ action: '영향 범위를 확인했다' });
  const m = meta({ nature: 'simulation', supportProvided: '', independentSteps: [] });
  const prompts = starCoachPrompts([e], () => m);
  assert(prompts[0].question.startsWith('모의 상황'));
  assert(prompts.some((p) => p.topic === 'supportProvided'));
  assert(prompts.some((p) => p.topic === 'independentSteps'));
  assert(!prompts.some((p) => /실제 근무|성과를 달성/.test(p.question)));
});

test('a fully described story gets one reflection question, not a score or verified badge', () => {
  const e = experience({ action: '교내 안내를 살펴봤다', result: '안내가 달랐다', learning: '근거를 비교해야 한다' });
  const m = meta({ nature: 'actual', star: { situation: '예약 화면에서 혼란스러웠다', roleGoal: '학생 대표로 문제를 정리했다', selectionReason: '확인 가능한 사례를 모으려고', resultEvidence: '두 안내 화면을 대조했다' } });
  const prompts = starCoachPrompts([e], () => m);
  assert.equal(prompts.length, 1);
  assert.equal(prompts[0].topic, 'reflection');
  assert(!/점수|검증 완료|사실 확인/.test(prompts[0].question));
});

test('motivation, values and plans retain the existing question flow unless the student opts into STAR', () => {
  assert.equal(prefersExistingQuestionCoach('지원 동기를 말씀해 주세요.'), true);
  assert.equal(prefersExistingQuestionCoach('중요하게 생각하는 가치관을 설명해 주세요.'), true);
  assert.equal(prefersExistingQuestionCoach('입사 후 계획과 5년 후 목표를 적어 주세요.'), true);
  assert.equal(prefersExistingQuestionCoach('모의 상황에서 무엇을 먼저 확인했나요?'), false);
});

test('motivation, values and future-plan prompts are recognized in all supported UI languages', () => {
  const samples: Record<string, string> = {
    ko: '지원 동기를 설명해 주세요.',
    en: 'Why do you want to join this company?',
    ja: '志望動機を教えてください。',
    'zh-CN': '请说明你的求职动机。',
    'zh-TW': '請說明你的求職動機。',
    mn: 'Ажилд орох шалтгаанаа тайлбарлана уу.',
    th: 'โปรดอธิบายแรงจูงใจในการสมัคร',
    vi: 'Hãy nêu động lực ứng tuyển của bạn.',
    ar: 'يرجى توضيح الدافع للتقديم.',
    ru: 'Расскажите о мотивации.',
    km: 'សូមពន្យល់ពីមូលហេតុដាក់ពាក្យ។',
    es: 'Explica tu motivación para postularte.',
    fr: 'Expliquez votre motivation.',
    it: 'Spiega la tua motivazione.',
    az: 'Müraciət motivasiyanızı izah edin.',
  };
  for (const locale of LOCALES) assert.equal(prefersExistingQuestionCoach(samples[locale.id], locale.id), true, locale.id);
});

test('restoring a historical draft edits only its sidecar snapshot; the saved version stays unchanged', () => {
  const initial = emptySidecar();
  const withDraft = {
    ...initial,
    versions: { old: { at: '2026-01-01', exps: [{ id: 'exp-1', title: 'old title', source: 'manual' as const, meta: meta() }] } },
    apps: { draft: { restoredFromVersion: 'old', expSnapshot: [{ id: 'exp-1', title: 'old title', source: 'manual' as const, meta: meta() }] } },
  };
  const next = setStarNotes(withDraft, 'exp-1', { situation: '새 메모' }, 'draft');
  assert.equal(next.versions.old.exps[0].meta.star, undefined);
  assert.equal(next.apps.draft.expSnapshot?.[0].meta.star?.situation, '새 메모');
});
