/**
 * No model calls or user data. From repository root:
 * pnpm --filter @workspace/scripts exec tsx --tsconfig ../artifacts/nuvia-career/tsconfig.json src/nuvia-ai-contract-check.ts
 */
import assert from 'node:assert/strict';
import { normalizeAiPurpose, normalizeStoredAiRule, safeAiHistory, validateAiResponse } from '../../artifacts/nuvia-career/src/lib/ai-response.js';
import { buildAiInput, normalizeAiResponse, aiContextFingerprint } from '../../artifacts/nuvia-career/src/lib/ai-assist';
import { aiTranslator } from '../../artifacts/nuvia-career/src/lib/ai-assistant-messages';
import type { AIWritingPayload } from '../../artifacts/nuvia-career/src/components/ai-writing-assistant';

const payload: AIWritingPayload = {
  action: 'draft', factsConfirmed: true, application: { writingLanguage: 'ja', question: '合成の質問' },
  strengths: [], experiences: [{ id: 'never-send-this-id', provenance: 'simulation',
    context: 'class_simulation', source: 'example', sourceVersion: 'synthetic-v1',
    planner: { selectedAction: '선택 행동', reason: '선택 이유', changes: '수정', supportProvided: '제공 도움', independentSteps: '독립 행동', observedEvidence: '관찰 근거' } }],
  userAnswers: [{ question: '합성 질문', answer: '학생 답변' }], voiceExamples: [],
  styleRules: [
    { id: 'a', text: '확인 규칙', language: 'ja', purpose: 'essay', confirmed: true, enabled: true },
    { id: 'b', text: '미확인 규칙', language: 'ja', purpose: 'essay', confirmed: false, enabled: true },
    { id: 'c', text: '꺼진 규칙', language: 'ja', purpose: 'essay', confirmed: true, enabled: false },
  ],
};
const input = buildAiInput('draft', payload, 'ar', 'source-digest');
assert.equal(input.writingLanguage, 'ja'); // UI and writing language are distinct.
assert.equal(input.locale, 'ar');
assert.equal(input.experiences[0].nature, 'simulation');
assert.equal(input.experiences[0].context, 'class_simulation');
assert.equal(input.experiences[0].fields.action, '선택 행동');
assert.equal(input.experiences[0].fields.selectionReason, '선택 이유');
assert.equal(input.experiences[0].fields.supportProvided, '제공 도움');
assert.equal(input.experiences[0].fields.resultEvidence, '관찰 근거');
assert.equal(input.experiences[0].fields.result, '');
assert.equal(input.experiences[0].fields.roleGoal, '');
assert.equal(input.voiceRules.length, 1);
assert.doesNotMatch(JSON.stringify(input), /never-send-this-id|미확인 규칙|꺼진 규칙/);
assert.equal(input.application.body, '');
const voice = buildAiInput('voice', payload, 'ko', 'source');
assert.equal(voice.experiences.length, 0);
assert.equal(voice.strengths.length, 0);
assert.equal(voice.userAnswers.length, 0);
const normalized = normalizeAiResponse({
  task: 'voice', sourceFingerprint: 'source', coachQuestion: '', candidates: [], feedback: [], notice: '합성 검사',
  voiceRules: [{ aspect: '문장 길이', rule: '짧게 나누기', example: '본인 원문', confidence: 'tentative' }],
}, 'ja', 'interview');
assert.equal(normalized.styleRules?.[0].confirmed, false);
assert.equal(normalized.styleRules?.[0].enabled, false);
assert.equal(normalized.styleRules?.[0].language, 'ja');
assert.equal(normalized.styleRules?.[0].purpose, 'interview');
assert.equal(normalized.styleRules?.[0].example, '본인 원문');
const koGuidance = normalizeAiResponse({
  task:'draft',sourceFingerprint:'p2',coachQuestion:'',voiceRules:[],feedback:[],notice:'unconfirmed 기록',
  candidates:[{text:'내 원문 unconfirmed',rationale:'학생이 확인할 후보',sourceFacts:['원문 unconfirmed'],
    strengthConnection:'',caution:'경험은 unconfirmed 상태입니다.'}],
},'ko');
assert.equal(koGuidance.notice,'확인 전 기록');
assert.equal(koGuidance.candidates?.[0].caution,'경험은 확인 전 상태입니다.');
assert.equal(koGuidance.candidates?.[0].text,'내 원문 unconfirmed');
assert.deepEqual(koGuidance.candidates?.[0].sourceFacts,['원문 unconfirmed']);
assert.throws(() => validateAiResponse({ task:'draft',candidates:'not-an-array' }), /AI_INVALID_RESPONSE/);
const historyResponse = {task:'coach',sourceFingerprint:'history',coachQuestion:'본인의 행동은 무엇인가요?',
  candidates:[],feedback:[],notice:'',voiceRules:[]};
const historical = {id:'valid',task:'coach',sourceFingerprint:'history',createdAt:'synthetic',response:historyResponse};
const recovered = safeAiHistory({app:[historical,{...historical,id:'bad',response:{...historyResponse,candidates:'invalid'}}],broken:'invalid'});
assert.deepEqual(recovered.app.map(x=>x.id),['valid']);
assert.deepEqual(recovered.broken,[]);
assert.equal(normalizeAiPurpose(''),'essay');
assert.equal(normalizeAiPurpose('  '),'essay');
assert.equal(normalizeAiPurpose('면접'),'면접');
const oldBlankRule = {purpose:'',confirmed:true,enabled:true,text:'학생이 직접 쓴 규칙'};
assert.deepEqual(normalizeStoredAiRule(oldBlankRule),
  {purpose:'essay',confirmed:false,enabled:false,text:'학생이 직접 쓴 규칙'});
assert.equal(oldBlankRule.purpose,'');
const reviewedRule = {purpose:'면접',confirmed:true,enabled:true,text:'본인 원문 유지'};
assert.equal(normalizeStoredAiRule(reviewedRule),reviewedRule);
assert.equal(aiTranslator('ko', key => key === 'nav.write' ? '자소서 작성' : key)('ai.purposeEssay'),'자소서 작성');
assert.notEqual(aiContextFingerprint('context', payload, 'ko'), aiContextFingerprint('changed', payload, 'ko'));
const locales = ['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'];
const keys = ['title','consent','failed','stale','localNotice','history','analyze','analyzeHelp','recommendationBasis','voiceConfirm','saveAnswer','historySaveFailed',
  'writingLanguage','experienceTitle','action','result','learning','connectionRequired','factsReview'];
for (const locale of locales) {
  const translate = aiTranslator(locale, (key) => `existing-translation:${key}`);
  for (const key of keys) {
    const result = translate(`ai.${key}`);
    assert.ok(result.trim());
    assert.notEqual(result, `ai.${key}`, `${locale}:${key}`);
  }
}
console.log(JSON.stringify({ kind: 'adapter-and-localization-not-browser', status: 'pass', locales: locales.length, translationKeyChecks: locales.length * keys.length }));
