import type { CareerAiAssistInput, CareerAiAssistResponse } from '@workspace/api-client-react';
import type { AIWritingAction, AIWritingPayload, AIWritingResponse } from '@/components/ai-writing-assistant';
import { hashStr } from '@/lib/career';
import { validateAiResponse } from './ai-response';

const contexts = new Set(['daily_activity', 'class_simulation', 'job_experience', 'synthetic_example', 'unknown']);

export function aiContextFingerprint(localContext: unknown, payload: AIWritingPayload, locale: string): string {
  // Only the digest is sent. The payload itself is separately minimized by
  // buildAiInput; raw app/experience identifiers never leave the browser.
  return hashStr(JSON.stringify({ localContext, payload, locale }));
}

export function buildAiInput(
  action: AIWritingAction,
  payload: AIWritingPayload,
  locale: string,
  fingerprint: string,
): CareerAiAssistInput {
  const app = payload.application;
  return {
    task: action,
    locale,
    writingLanguage: app?.writingLanguage || 'ko',
    sourceFingerprint: fingerprint,
    confirmed: true,
    factsConfirmed: payload.factsConfirmed,
    coachPrompt: payload.coachQuestion ?? '',
    application: {
      company: app?.company ?? '',
      job: app?.job ?? '',
      question: app?.question ?? '',
      body: app?.existingBody ?? '',
    },
    strengths: action === 'voice' ? [] : payload.strengths.map((item) => ({
      name: item.label,
      interpretation: item.originalInterpretation ?? '',
      recommendationReason: item.recommendationBasis ?? '',
    })),
    experiences: action === 'voice' ? [] : payload.experiences.map((item) => ({
      title: item.title ?? '',
      nature: item.provenance ?? 'unconfirmed',
      context: contexts.has(item.context ?? '') ? item.context as CareerAiAssistInput['experiences'][number]['context'] : 'unknown',
      cardType: item.cardType === 'daily_application' || item.cardType === 'job_scenario' ? item.cardType : null,
      source: item.source ?? '',
      sourceVersion: item.sourceVersion ?? '',
      sourceTitle: item.sourceTitle ?? item.sourceVersionTitle ?? '',
      jobConnection: item.jobConnection ?? null,
      fields: {
        situation: item.star?.situation ?? '',
        roleGoal: item.star?.roleGoal ?? '',
        action: item.action ?? item.planner?.selectedAction ?? '',
        selectionReason: item.star?.selectionReason ?? item.planner?.reason ?? '',
        changed: item.planner?.changes ?? '',
        result: item.planner?.result ?? item.result ?? '',
        learning: item.planner?.learning ?? item.learning ?? '',
        resultEvidence: item.star?.resultEvidence ?? item.planner?.observedEvidence ?? '',
        supportProvided: item.supportProvided ?? item.planner?.supportProvided ?? '',
        independentSteps: item.planner?.independentSteps ? item.planner.independentSteps.split('\n').filter(Boolean) : [],
      },
    })),
    userAnswers: action === 'voice' ? [] : payload.userAnswers,
    voiceSources: action === 'voice' ? payload.voiceExamples.map((item) => ({
      text: item.text,
      kind: item.kind === 'user_edit' ? 'user_edited' : 'user_original',
    })) : [],
    voiceRules: (payload.styleRules ?? []).filter((item) => item.confirmed && item.enabled).map((item) => ({
      aspect: item.aspect || 'style',
      rule: item.text,
      enabled: true,
    })),
  };
}

export function normalizeAiResponse(response: CareerAiAssistResponse, writingLanguage: string, purpose = 'essay'): AIWritingResponse {
  response = validateAiResponse(response);
  // Localize a model's internal state label only in generated guidance.
  // Never rewrite candidate prose, selected quotations, or student originals.
  const guidance = (value: string) => writingLanguage === 'ko' ? value.replace(/\bunconfirmed\b/gi, '확인 전') : value;
  return {
    action: response.task,
    coachQuestion: response.coachQuestion,
    candidates: response.candidates.map((item, index) => ({
      id: `candidate-${index + 1}`,
      text: item.text,
      sourceTag: 'ai.sourceTag',
      rationale: item.rationale,
      sourceFacts: item.sourceFacts,
      strengthConnection: item.strengthConnection,
      caution: guidance(item.caution),
      evidenceGaps: item.caution ? [guidance(item.caution)] : [],
    })),
    feedback: response.feedback,
    notice: guidance(response.notice),
    styleRules: response.voiceRules.map((rule, index) => ({
      id: `voice-rule-${index + 1}`,
      text: rule.rule,
      aspect: rule.aspect,
      example: rule.example,
      language: writingLanguage,
      purpose,
      enabled: false,
      confirmed: false,
    })),
  };
}
