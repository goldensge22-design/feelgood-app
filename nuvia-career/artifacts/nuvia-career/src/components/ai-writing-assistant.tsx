import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlertCircle, Check, ChevronDown, CircleHelp, GitCompareArrows, RotateCcw, Send, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

/*
Translation keys used by this component:
ai.title, ai.subtitle, ai.privacyTitle, ai.privacyManaged, ai.privacyExcluded,
ai.privacyNotShared, ai.privacyMayBeWrong, ai.application, ai.company, ai.job,
ai.question, ai.language, ai.currentBody, ai.strengths, ai.interpretation,
ai.recommendationBasis, ai.experiences, ai.selectAll, ai.provenance, ai.context,
ai.cardType, ai.source, ai.sourceVersion, ai.actual, ai.simulation, ai.unconfirmed,
ai.star.situation, ai.star.roleGoal, ai.star.selectionReason, ai.star.resultEvidence,
ai.field.action, ai.field.reason, ai.field.changes, ai.field.result, ai.field.learning,
ai.userAnswers, ai.sourceTitle, ai.answers, ai.voiceExamples, ai.voiceOriginal,
ai.voiceEdit, ai.reviewBeforeSend, ai.consent, ai.coach, ai.coachHelp,
ai.coachQuestion, ai.coachQuestionPlaceholder, ai.draft, ai.draftHelp, ai.voice,
ai.voiceHelp, ai.voiceScope, ai.sendCoach, ai.sendDraft, ai.sendVoice, ai.unavailable,
ai.loading, ai.cancelRequest, ai.cancelled, ai.timeout, ai.rateLimited, ai.failed,
ai.retry, ai.noResponse, ai.responseCoach, ai.candidatesTitle, ai.voiceCandidatesTitle,
ai.candidate, ai.selectCandidate, ai.compareCandidate, ai.selected, ai.compare,
ai.sourceTag, ai.aiInterpretation, ai.sourceFact, ai.evidenceGaps, ai.apply,
ai.replace, ai.append, ai.restorePrior, ai.styleRules, ai.styleRulesHelp,
ai.ruleLanguage, ai.rulePurpose, ai.ruleText, ai.ruleEnabled, ai.ruleConfirmed,
ai.saveRule, ai.confirmRule, ai.editRule, ai.resetRules, ai.noRules, ai.closeCompare,
 ai.selectedDataCount, ai.noSelectedData, ai.optional, ai.cancelledNotice,
 ai.answerInput, ai.saveAnswer, ai.voiceAdd, ai.voiceConfirm, ai.stale
*/

import { normalizeAiPurpose } from '@/lib/ai-response';

export type AIWritingAction = 'coach' | 'draft' | 'voice' | 'analyze';
export type AIWritingFailure = 'timeout' | 'rate_limited' | 'failed' | 'cancelled' | 'unconfigured' | 'stale' | 'provider_busy' | 'usage_limit' | 'local_limit' | 'uncertain' | 'input_limit' | 'queue_full' | 'coordination_wait' | 'coordination_unavailable' | 'result_expired' | 'pending_storage_failed';
export type AIWritingStatus = 'idle' | 'unavailable' | 'loading' | AIWritingFailure;
export type ApplyChoice = 'replace' | 'append';

export interface AIWritingApplication {
  company: string;
  job: string;
  question: string;
  writingLanguage: string;
  existingBody: string;
}

export interface AIWritingStrength {
  id: string;
  label: string;
  originalInterpretation?: string;
  recommendationBasis?: string;
}

export interface AIWritingExperience {
  id: string;
  title: string;
  provenance: 'actual' | 'simulation' | 'unconfirmed';
  context?: string;
  cardType?: string;
  source?: string;
  sourceVersion?: string;
  action?: string;
  result?: string;
  learning?: string;
  star?: {
    situation?: string;
    roleGoal?: string;
    selectionReason?: string;
    resultEvidence?: string;
  };
  planner?: {
    selectedAction?: string;
    reason?: string;
    changes?: string;
    result?: string;
    learning?: string;
    selectedJob?: string;
    practiceAction?: string;
    checkCriterion?: string;
    strengthStrategy?: string;
    supportProvided?: string;
    independentSteps?: string;
    observedEvidence?: string;
  };
  supportProvided?: string;
  userAnswers?: string[];
  sourceTitle?: string;
  sourceVersionTitle?: string;
  blockedReason?: string;
  jobConnection?: {
    sourceKind: 'official_material' | 'job_posting' | 'company_public' | 'educational_inference' | 'unverified';
    sourceTitle: string;
    sourceCompany: string;
    sourceJob: string;
    sourceVersion: string;
    sourceAsOf: string;
    specificDuty: string;
    sharedAction: string;
    learnedPrinciple: string;
    futureApplication: string;
    reviewed: boolean;
  };
}

export interface AIWritingVoiceExample {
  id: string;
  text: string;
  kind: 'user_original' | 'user_edit';
  language?: string;
  purpose?: string;
}

export interface AIWritingStyleRule {
  id: string;
  aspect?: string;
  example?: string;
  text: string;
  language: string;
  purpose: string;
  enabled: boolean;
  confirmed: boolean;
}

export interface AIWritingCandidate {
  id: string;
  text: string;
  sourceTag: string;
  evidenceGaps?: string[];
  interpretationNotes?: string[];
  sourceFacts?: string[];
  language?: string;
  purpose?: string;
  rationale?: string;
  strengthConnection?: string;
  caution?: string;
}

export interface AIWritingAnswer {
  id: string;
  question: string;
  answer: string;
  experienceIds: string[];
}

export interface AIWritingResponse {
  action: AIWritingAction;
  coachQuestion?: string;
  candidates?: AIWritingCandidate[];
  styleRules?: AIWritingStyleRule[];
  feedback?: Array<{ category: string; note: string; evidence: string }>;
  notice?: string;
}

export interface AIWritingPayload {
  action: AIWritingAction;
  factsConfirmed: boolean;
  application: Partial<AIWritingApplication>;
  strengths: Array<{
    id: string;
    label: string;
    originalInterpretation?: string;
    recommendationBasis?: string;
  }>;
  experiences: Array<{
    id: string;
    title?: string;
    provenance?: AIWritingExperience['provenance'];
    context?: string;
    cardType?: string;
    source?: string;
    sourceVersion?: string;
    action?: string;
    result?: string;
    learning?: string;
    star?: AIWritingExperience['star'];
    planner?: AIWritingExperience['planner'];
    supportProvided?: string;
    userAnswers?: string[];
    sourceTitle?: string;
    sourceVersionTitle?: string;
    jobConnection?: AIWritingExperience['jobConnection'] | null;
  }>;
  voiceExamples: AIWritingVoiceExample[];
  userAnswers: Array<{ question: string; answer: string }>;
  styleRules?: AIWritingStyleRule[];
  coachQuestion?: string;
}

export interface AIWritingAssistantProps {
  contextKey: string;
  history?: Array<{ id: string; createdAt: string; question: string; candidates: string[] }>;
  t: (key: string, vars?: Record<string, string | number>) => string;
  application: AIWritingApplication;
  strengths: AIWritingStrength[];
  experiences: AIWritingExperience[];
  voiceExamples?: AIWritingVoiceExample[];
  availability?: boolean;
  loading?: boolean;
  error?: AIWritingFailure | null;
  response?: AIWritingResponse | null;
  styleRules?: AIWritingStyleRule[];
  answers?: AIWritingAnswer[];
  onRequest: (action: AIWritingAction, payload: AIWritingPayload, signal: AbortSignal) => Promise<AIWritingResponse>;
  resumeKey?: string;
  onResume?: (signal: AbortSignal) => Promise<AIWritingResponse>;
  resumeExperienceIds?: string[];
  onCancelRequest?: () => void;
  onApply: (candidate: AIWritingCandidate, choice: ApplyChoice) => void;
  onRestorePriorBody: () => void;
  onSaveStyleRules: (rules: AIWritingStyleRule[]) => boolean;
  onConfirmStyleRule: (ruleId: string) => void;
  onClearStyleRules: () => void;
  onSaveAnswer: (answer: Omit<AIWritingAnswer, 'id'>) => boolean;
  onSaveVoiceExample: (example: Omit<AIWritingVoiceExample, 'id'>) => boolean;
}

type SelectionKey = string;

const APP_FIELDS = ['company', 'job', 'question', 'writingLanguage', 'existingBody'] as const;
const LANGUAGE_NAMES: Record<string, string> = {
  ko: '한국어', en: 'English', ja: '日本語', 'zh-CN': '简体中文', 'zh-TW': '繁體中文', mn: 'Монгол',
  th: 'ไทย', vi: 'Tiếng Việt', ar: 'العربية', ru: 'Русский', km: 'ខ្មែរ', es: 'Español',
  fr: 'Français', it: 'Italiano', az: 'Azərbaycan dili',
};
const EXPERIENCE_FIELDS = [
  'title', 'action', 'result', 'learning',
  'star.situation', 'star.roleGoal', 'star.selectionReason', 'star.resultEvidence',
  'planner.selectedAction', 'planner.reason', 'planner.changes', 'planner.result', 'planner.learning',
  'planner.supportProvided', 'planner.independentSteps', 'planner.observedEvidence',
  'userAnswers', 'sourceTitle',
] as const;
const FACT_FIELDS = [
  'action', 'result', 'learning', 'star.situation', 'star.roleGoal', 'star.selectionReason',
  'star.resultEvidence', 'planner.selectedAction', 'planner.reason', 'planner.changes',
  'planner.result', 'planner.learning', 'userAnswers',
] as const;

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function CheckboxRow({
  id, checked, onChange, label, testId, detail, disabled = false,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  testId: string;
  detail?: string;
  disabled?: boolean;
}) {
  return (
    <label htmlFor={id} aria-disabled={disabled} className={`flex min-h-11 items-start gap-2.5 rounded-md px-2 py-2 text-sm ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted/50'}`}>
      <Checkbox id={id} disabled={disabled} checked={checked} onCheckedChange={(value) => onChange(value === true)} className="mt-0.5" data-testid={testId} />
      <span className="min-w-0 flex-1 leading-snug">
        <span className="block">{label}</span>
        {detail && <span className="mt-0.5 block break-words text-xs text-muted-foreground" dir="auto">{detail}</span>}
      </span>
    </label>
  );
}

export function AIWritingAssistant({
  t, application, strengths, experiences, voiceExamples = [], availability = true, loading = false, contextKey, history = [],
  error = null, response, styleRules = [], answers = [], onRequest, onApply, onRestorePriorBody,
  onSaveStyleRules, onConfirmStyleRule, onClearStyleRules, onSaveAnswer, onSaveVoiceExample,
  resumeKey, onResume, resumeExperienceIds, onCancelRequest,
}: AIWritingAssistantProps) {
  const [selectedFields, setSelectedFields] = useState<Set<SelectionKey>>(() => new Set());
  const [action, setAction] = useState<AIWritingAction>('coach');
  const [coachQuestion, setCoachQuestion] = useState('');
  const [consent, setConsent] = useState(false);
  const [requestStatus, setRequestStatus] = useState<AIWritingStatus>('idle');
  const [result, setResult] = useState<AIWritingResponse | null>(response ?? null);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [applyChoice, setApplyChoice] = useState<ApplyChoice>('replace');
  const [ruleDrafts, setRuleDrafts] = useState<Record<string, string>>({});
  const [ruleLanguage, setRuleLanguage] = useState(application.writingLanguage);
  const [rulePurpose, setRulePurpose] = useState('essay');
  const [answerDraft, setAnswerDraft] = useState('');
  const [voiceSampleDraft, setVoiceSampleDraft] = useState('');
  const [voiceSampleConfirmed, setVoiceSampleConfirmed] = useState(false);
  const [factsReviewed, setFactsReviewed] = useState(false);
  const [responseExperienceIds, setResponseExperienceIds] = useState<string[]>([]);
  const controllerRef = useRef<AbortController | null>(null);
  const resumeRef = useRef(onResume);
  resumeRef.current = onResume;
  const timeoutRef = useRef<number | null>(null);
  const requestSelectionKey = useRef('');
  const sourceContextRef = useRef(contextKey);
  const currentSelectionKey = JSON.stringify({
    selected: [...selectedFields].sort(), coachQuestion, action, ruleLanguage, rulePurpose,
  });
  const previousSelectionKey = useRef(currentSelectionKey);
  const blockedIdsKey = experiences.filter((item) => item.blockedReason).map((item) => item.id).sort().join('|');
  useEffect(() => { setFactsReviewed(false); }, [currentSelectionKey, contextKey]);

  useEffect(() => {
    if (response) {
      setResult(response);
      setSelectedCandidate(null);
      setCompareIds([]);
    }
  }, [response]);

  useLayoutEffect(() => () => {
    controllerRef.current?.abort();
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);
  useEffect(() => {
    if (!resumeKey || !resumeRef.current || controllerRef.current) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setRequestStatus('loading'); setResult(null);
    void resumeRef.current(controller.signal).then(data => {
      if (!controller.signal.aborted) {
        setResult(data); setResponseExperienceIds(resumeExperienceIds ?? []); setRequestStatus('idle');
      }
    }).catch((e: { code?: string }) => {
      if (!controller.signal.aborted) setRequestStatus(e.code === 'STALE' ? 'stale' : e.code === 'CANCELLED'
        ? 'cancelled' : e.code === 'AI_UNCERTAIN' ? 'uncertain' : e.code === 'AI_USAGE_LIMIT'
          ? 'usage_limit' : e.code === 'AI_CLASS_LIMIT' || e.code === 'AI_LOCAL_LIMIT' ? 'local_limit'
            : e.code === 'AI_NOT_CONFIGURED' || e.code === 'AI_MODEL_CONFIG' ? 'unconfigured'
              : e.code === 'AI_PROVIDER_BUSY' ? 'provider_busy'
                : e.code === 'AI_RESULT_EXPIRED' ? 'result_expired' : 'failed');
    }).finally(() => { if (controllerRef.current === controller) controllerRef.current = null; });
    return () => { controller.abort(); if (controllerRef.current === controller) controllerRef.current = null; };
  }, [resumeKey]);

  useEffect(() => {
    if (previousSelectionKey.current === currentSelectionKey) return;
    previousSelectionKey.current = currentSelectionKey;
    setConsent(false);
    if (result || controllerRef.current) {
      controllerRef.current?.abort();
      setResult(null);
      setSelectedCandidate(null);
      setCompareIds([]);
      setRequestStatus('stale');
    }
  }, [currentSelectionKey]);

  useEffect(() => {
    const blockedIds = new Set(blockedIdsKey ? blockedIdsKey.split('|') : []);
    if (!blockedIds.size) return;
    setSelectedFields((current) => {
      const next = new Set([...current].filter((key) => ![...blockedIds].some((id) => key.startsWith(`experience:${id}:`))));
      return next.size === current.size ? current : next;
    });
  }, [blockedIdsKey]);

  useEffect(() => {
    if (sourceContextRef.current === contextKey) return;
    sourceContextRef.current = contextKey;
    const hadResultOrRequest = !!result || !!controllerRef.current;
    controllerRef.current?.abort();
    setResult(null);
    setConsent(false);
    setSelectedCandidate(null);
    setCompareIds([]);
    setRequestStatus(hadResultOrRequest ? 'stale' : 'idle');
  }, [contextKey]);

  const setChosen = (key: SelectionKey, checked: boolean) => {
    setSelectedFields((previous) => {
      const next = new Set(previous);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const selectedCount = selectedFields.size;
  const candidates = result?.action === 'draft' ? (result.candidates ?? []).slice(0, 3) : [];
  const voiceCandidates = result?.action === 'voice' ? result.styleRules ?? [] : [];
  const selectedFactCount = strengths.filter((strength) =>
    selectedFields.has(`strength:${strength.id}:interpretation`) || selectedFields.has(`strength:${strength.id}:basis`),
  ).length + experiences.filter((experience) => !experience.blockedReason &&
    FACT_FIELDS.some((path) => selectedFields.has(`experience:${experience.id}:${path}`) ||
      (path === 'userAnswers' && (experience.userAnswers ?? []).some((_, index) => selectedFields.has(`experience:${experience.id}:userAnswers:${index}`)))),
  ).length;
  const selectedVoiceCount = voiceExamples.filter((example) => selectedFields.has(`voice:${example.id}`)).length;
  const selectedAnswerCount = answers.filter((answer) => selectedFields.has(`answer:${answer.id}`)).length;
  const canRequest = availability && !loading && requestStatus !== 'loading' && consent &&
    (action !== 'draft' || factsReviewed) &&
    (action === 'voice' ? selectedVoiceCount > 0 : selectedFactCount + selectedAnswerCount > 0);
  const status = !availability ? 'unavailable' : loading ? 'loading' : error ?? requestStatus;

  const makePayload = (requestAction: AIWritingAction): AIWritingPayload => {
    const app: Partial<AIWritingApplication> = {};
    APP_FIELDS.forEach((field) => {
      if (selectedFields.has(`app:${field}`)) app[field] = application[field];
    });
    const selectedStrengths = strengths.flatMap((strength) => {
      const includeInterpretation = selectedFields.has(`strength:${strength.id}:interpretation`);
      const includeBasis = selectedFields.has(`strength:${strength.id}:basis`);
      return includeInterpretation || includeBasis ? [{
        id: strength.id,
        label: strength.label,
        ...(includeInterpretation ? { originalInterpretation: strength.originalInterpretation } : {}),
        ...(includeBasis ? { recommendationBasis: strength.recommendationBasis } : {}),
      }] : [];
    });
    const selectedExperiences: AIWritingPayload['experiences'] = experiences.flatMap((experience) => {
      if (experience.blockedReason) return [];
      const selected = (path: string) => selectedFields.has(`experience:${experience.id}:${path}`);
      const selectedAnswers = (experience.userAnswers ?? []).filter((_, index) => selected(`userAnswers:${index}`));
      const includeJobConnection = selected('jobConnection') && !!experience.jobConnection;
      const hasSelected = EXPERIENCE_FIELDS.some((path) => selected(path)) || selectedAnswers.length > 0 || includeJobConnection;
      if (!hasSelected) return [];
      // Provenance must accompany any selected fact; it is not proof of ability.
      const item: AIWritingPayload['experiences'][number] = {
        id: experience.id, provenance: experience.provenance, context: experience.context,
        cardType: experience.cardType, source: experience.source, sourceVersion: experience.sourceVersion,
      };
      if (includeJobConnection) item.jobConnection = experience.jobConnection;
      EXPERIENCE_FIELDS.forEach((path) => {
        if (!selected(path)) return;
        if (path.startsWith('star.')) {
          const key = path.slice(5) as keyof NonNullable<AIWritingExperience['star']>;
          item.star = { ...item.star, [key]: experience.star?.[key] };
        } else if (path.startsWith('planner.')) {
          const key = path.slice(8) as keyof NonNullable<AIWritingExperience['planner']>;
          item.planner = { ...item.planner, [key]: experience.planner?.[key] };
        } else if (path !== 'userAnswers') {
          const key = path as keyof AIWritingExperience;
          (item as Record<string, unknown>)[path] = experience[key];
        }
      });
      if (selected('userAnswers')) item.userAnswers = selectedAnswers;
      return [item];
    });
    const selectedVoice = requestAction === 'voice'
      ? voiceExamples.filter((example) => selectedFields.has(`voice:${example.id}`) && (example.kind === 'user_original' || example.kind === 'user_edit'))
      : [];
    const selectedAnswers = answers.filter((answer) => selectedFields.has(`answer:${answer.id}`))
      .map(({ question, answer }) => ({ question, answer }));
    return {
      action: requestAction,
      factsConfirmed: factsReviewed,
      application: requestAction === 'voice' ? { writingLanguage: ruleLanguage } : { ...app, writingLanguage: application.writingLanguage },
      strengths: requestAction === 'voice' ? [] : selectedStrengths,
      experiences: requestAction === 'voice' ? [] : selectedExperiences,
      voiceExamples: selectedVoice.map(({ id, text, kind, language }) => ({ id, text, kind, language, purpose: normalizeAiPurpose(rulePurpose) })),
      userAnswers: selectedAnswers,
      styleRules: styleRules.filter((rule) => rule.enabled && rule.confirmed &&
        rule.language === (requestAction === 'voice' ? ruleLanguage : application.writingLanguage) &&
        normalizeAiPurpose(rule.purpose) === (requestAction === 'voice' ? normalizeAiPurpose(rulePurpose) : 'essay')),
      ...(requestAction === 'coach' ? { coachQuestion: coachQuestion.trim() } : {}),
    };
  };

  const request = async (requestAction: AIWritingAction) => {
    const hasGrounding = requestAction === 'coach'
      ? selectedFactCount + selectedAnswerCount > 0
      : requestAction === 'draft' || requestAction === 'analyze'
        ? selectedFactCount + selectedAnswerCount > 0
        : selectedVoiceCount > 0;
    if (!availability || loading || !consent || !hasGrounding) return;
    if (requestAction === 'draft' && !factsReviewed) return;
    if (controllerRef.current) return;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    const controller = new AbortController();
    controllerRef.current = controller;
    requestSelectionKey.current = JSON.stringify({
      selected: [...selectedFields].sort(), coachQuestion, action: requestAction, ruleLanguage, rulePurpose,
    });
    setAction(requestAction);
    setConsent(false);
    setRequestStatus('loading');
    setResult(null);
    setSelectedCandidate(null);
    setCompareIds([]);
    // Accepted work is polled with short per-HTTP deadlines; ordinary queueing
    // has no client-side total deadline and must not become a timeout failure.
    try {
      const payload = makePayload(requestAction);
      const data = await onRequest(requestAction, payload, controller.signal);
      if (controller.signal.aborted) return;
      setResult(data);
      setResponseExperienceIds(payload.experiences.map((item) => item.id));
      setRequestStatus('idle');
    } catch (caught) {
      if (controller.signal.aborted) return;
      const failure = caught as { code?: string; status?: number; data?: { error?: string } };
      const code = failure?.code ?? failure?.data?.error;
      const httpStatus = failure?.status;
      setRequestStatus(code === 'AI_PENDING_SAVE_FAILED' ? 'pending_storage_failed' : code === 'AI_COORDINATION_WAIT' ? 'coordination_wait'
        : code === 'AI_COORDINATION_UNAVAILABLE' ? 'coordination_unavailable'
          : code === 'AI_RESULT_EXPIRED' ? 'result_expired'
            : code === 'AI_UNCERTAIN' || code === 'AI_TIMEOUT' || code === 'AI_UPSTREAM_FAILED' ? 'uncertain'
        : code === 'AI_USAGE_LIMIT' ? 'usage_limit'
          : code === 'AI_LOCAL_LIMIT' || code === 'AI_CLASS_LIMIT' ? 'local_limit'
            : code === 'AI_PROVIDER_BUSY' ? 'provider_busy'
              : code === 'AI_QUEUE_FULL' ? 'queue_full'
              : code === 'AI_INPUT_LIMIT' || code === 'REQUEST_TOO_LARGE' || httpStatus === 413 ? 'input_limit'
                : code === 'TIMEOUT' || httpStatus === 504 ? 'timeout'
        : code === 'CANCELLED' ? 'cancelled'
          : code === 'STALE' ? 'stale'
            : code === 'AI_NOT_CONFIGURED' || code === 'AI_MODEL_CONFIG' ? 'unconfigured'
              : code === 'RATE_LIMITED' || code === 'AI_RATE_LIMITED' || httpStatus === 429 ? 'rate_limited' : 'failed');
    } finally {
      if (controllerRef.current === controller) {
        requestSelectionKey.current = '';
        controllerRef.current = null;
      }
    }
  };

  const cancel = () => {
    if (!controllerRef.current) return;
    controllerRef.current.abort();
    onCancelRequest?.();
    controllerRef.current = null;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setRequestStatus('cancelled');
  };

  const updateRule = (rule: AIWritingStyleRule, patch: Partial<AIWritingStyleRule>) => {
    const changed = (patch.text !== undefined && patch.text !== rule.text) ||
      (patch.language !== undefined && patch.language !== rule.language) ||
      (patch.purpose !== undefined && patch.purpose !== rule.purpose);
    return onSaveStyleRules(styleRules.map((item) => item.id === rule.id ? { ...item, ...patch, ...(changed ? { confirmed: false } : {}) } : item));
  };

  const ruleCandidates = voiceCandidates;
  const retryable = ['failed', 'rate_limited', 'provider_busy', 'queue_full', 'coordination_wait', 'coordination_unavailable'].includes(status);
  const isFailure = retryable || ['usage_limit', 'uncertain', 'input_limit', 'local_limit', 'timeout'].includes(status);
  const statusKey: Record<AIWritingStatus, string> = {
    idle: 'ai.noResponse',
    unavailable: 'ai.unavailable',
    loading: 'ai.capacityWaiting',
    cancelled: 'ai.cancelled',
    timeout: 'ai.timeout',
    rate_limited: 'ai.rateLimited',
    failed: 'ai.failed',
    unconfigured: 'ai.connectionRequired',
    stale: 'ai.stale',
    provider_busy: 'ai.providerBusy',
    usage_limit: 'ai.usageLimit',
    local_limit: 'ai.localLimit',
    uncertain: 'ai.uncertain',
    input_limit: 'ai.inputLimit',
    queue_full: 'ai.queueFull',
    coordination_wait: 'ai.coordinationWait',
    coordination_unavailable: 'ai.coordinationUnavailable',
    result_expired: 'ai.resultExpired',
    pending_storage_failed: 'ai.pendingStorageFailed',
  };

  return (
    <aside className="surface min-w-0 overflow-hidden" aria-label={t('ai.title')} data-testid="panel-ai-writing-assistant">
      <header className="border-b bg-blue-soft/50 px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card text-blue shadow-sm"><Sparkles className="h-4 w-4" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">{t('ai.title')}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('ai.subtitle')}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground" data-testid="ai-capacity-privacy">{t('ai.cachePrivacy')}</p>
          </div>
        </div>
      </header>

      <div className="space-y-4 p-4">
        <details className="group rounded-lg border bg-muted/20" open>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-semibold">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-ok" />{t('ai.reviewBeforeSend')}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-2 px-3 pb-3 text-xs leading-relaxed text-muted-foreground">
            <p>{t('ai.privacyManaged')}</p>
            <p>{t('ai.privacyExcluded')}</p>
            <p>{t('ai.privacyNotShared')}</p>
            <p>{t('ai.privacyMayBeWrong')}</p>
          </div>
        </details>

        <section aria-labelledby="ai-data-heading">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 id="ai-data-heading" className="text-sm font-semibold">{t('ai.application')}</h3>
            <span className="meta" data-testid="text-ai-selected-count">{t('ai.selectedDataCount', { count: selectedCount })}</span>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">{selectedCount ? t('ai.optional') : t('ai.noSelectedData')}</p>
          <p className="mb-2 text-xs text-muted-foreground">{t('ai.provenanceNotice')}</p>
          <div className="max-h-56 space-y-0.5 overflow-y-auto rounded-lg border p-1">
            {APP_FIELDS.map((field) => {
              const value = application[field];
              if (!nonEmpty(value)) return null;
              const key = `app:${field}`;
              return <CheckboxRow key={key} id={`ai-${key}`} checked={selectedFields.has(key)} onChange={(checked) => setChosen(key, checked)} label={t(`ai.${field === 'existingBody' ? 'currentBody' : field}`)} detail={field === 'writingLanguage' ? LANGUAGE_NAMES[value] || value : value} testId={`checkbox-ai-${field}`} />;
            })}
            {strengths.map((strength) => (
              <div key={strength.id} className="border-t pt-1 first:border-0">
                <p className="px-2 pt-2 text-xs font-semibold" dir="auto">{strength.label}</p>
                {nonEmpty(strength.originalInterpretation) && (() => {
                  const key = `strength:${strength.id}:interpretation`;
                  return <CheckboxRow id={`ai-${key}`} checked={selectedFields.has(key)} onChange={(checked) => setChosen(key, checked)} label={t('ai.interpretation')} detail={strength.originalInterpretation} testId={`checkbox-ai-strength-interpretation-${strength.id}`} />;
                })()}
                {nonEmpty(strength.recommendationBasis) && (() => {
                  const key = `strength:${strength.id}:basis`;
                  return <CheckboxRow id={`ai-${key}`} checked={selectedFields.has(key)} onChange={(checked) => setChosen(key, checked)} label={t('ai.recommendationBasis')} detail={strength.recommendationBasis} testId={`checkbox-ai-strength-basis-${strength.id}`} />;
                })()}
              </div>
            ))}
            {experiences.map((experience) => (
              <div key={experience.id} className="border-t pt-1 first:border-0">
                <p className="px-2 pt-2 text-xs font-semibold" dir="auto">{experience.title}</p>
                <p className="px-2 pb-1 text-[11px] text-muted-foreground">
                  {experience.blockedReason ?? t(`ai.${experience.provenance}`)}
                </p>
                {(() => {
                  const provenanceDetail = [
                    t(`ai.${experience.provenance}`),
                    experience.context ? t(`ai.contextValue.${experience.context}`) : '',
                    experience.cardType ? t(`ai.cardValue.${experience.cardType}`) : '',
                    experience.source ? t(`ai.sourceValue.${experience.source}`) : '',
                    experience.sourceVersion || '',
                  ].filter(Boolean).join(' · ');
                  return <p className="px-2 py-2 text-xs" dir="auto">{t('ai.provenance')}: {provenanceDetail}</p>;
                })()}
                {EXPERIENCE_FIELDS.flatMap((path) => {
                  if (path === 'userAnswers') {
                    return (experience.userAnswers ?? []).map((answer, index) => {
                      const key = `experience:${experience.id}:userAnswers:${index}`;
                      return <CheckboxRow key={key} id={`ai-${key}`} disabled={!!experience.blockedReason} checked={selectedFields.has(key)} onChange={(checked) => setChosen(key, checked)} label={t('ai.answers')} detail={answer} testId={`checkbox-ai-answer-${experience.id}-${index}`} />;
                    });
                  }
                  const value = path.startsWith('star.')
                    ? experience.star?.[path.slice(5) as keyof NonNullable<AIWritingExperience['star']>]
                    : path.startsWith('planner.')
                      ? experience.planner?.[path.slice(8) as keyof NonNullable<AIWritingExperience['planner']>]
                      : experience[path as keyof AIWritingExperience];
                  if (!nonEmpty(value)) return [];
                  const key = `experience:${experience.id}:${path}`;
                  const plannerLabel: Record<string, string> = {
                    selectedAction: 'action',
                    reason: 'reason',
                    changes: 'changes',
                    result: 'result',
                    learning: 'learning',
                    supportProvided: 'supportProvided',
                    independentSteps: 'independentSteps',
                    observedEvidence: 'observedEvidence',
                  };
                  const labelKey = path.startsWith('star.')
                    ? `ai.${path}`
                    : path.startsWith('planner.')
                      ? `ai.field.${plannerLabel[path.slice(8)] ?? path.slice(8)}`
                      : path === 'title' ? 'ai.experienceTitle' : `ai.${path}`;
                  return [<CheckboxRow key={key} id={`ai-${key}`} disabled={!!experience.blockedReason} checked={selectedFields.has(key)} onChange={(checked) => setChosen(key, checked)} label={t(labelKey)} detail={value} testId={`checkbox-ai-experience-${experience.id}-${path.replace('.', '-')}`} />];
                })}
                {experience.jobConnection && (
                  <CheckboxRow
                    id={`ai-experience-${experience.id}-job-connection`}
                    disabled={!!experience.blockedReason}
                    checked={selectedFields.has(`experience:${experience.id}:jobConnection`)}
                    onChange={(checked) => setChosen(`experience:${experience.id}:jobConnection`, checked)}
                    label={t('ai.jobConnection')}
                    detail={`${experience.jobConnection.sourceTitle} · ${experience.jobConnection.sourceCompany} · ${experience.jobConnection.sourceJob} · ${experience.jobConnection.sourceVersion} · ${experience.jobConnection.sourceAsOf}\n${experience.jobConnection.specificDuty}\n${experience.jobConnection.sharedAction}\n${experience.jobConnection.learnedPrinciple}\n${experience.jobConnection.futureApplication}\n${t(experience.jobConnection.reviewed ? 'ai.sourceFact' : 'ai.unconfirmed')}`}
                    testId={`checkbox-ai-job-connection-${experience.id}`}
                  />
                )}
              </div>
            ))}
            {answers.map((answer) => (
              <CheckboxRow key={answer.id} id={`ai-answer-${answer.id}`}
                checked={selectedFields.has(`answer:${answer.id}`)}
                onChange={(checked) => setChosen(`answer:${answer.id}`, checked)}
                label={t('ai.answers')} detail={`${answer.question}\n${answer.answer}`}
                testId={`checkbox-ai-answer-${answer.id}`} />
            ))}
            {voiceExamples.map((example) => {
              if (!nonEmpty(example.text)) return null;
              const key = `voice:${example.id}`;
              return <CheckboxRow key={key} id={`ai-${key}`} checked={selectedFields.has(key)} onChange={(checked) => setChosen(key, checked)} label={t(example.kind === 'user_original' ? 'ai.voiceOriginal' : 'ai.voiceEdit')} detail={example.text} testId={`checkbox-ai-voice-example-${example.id}`} />;
            })}
          </div>
        </section>

        <section className="space-y-3 border-t pt-4">
          <div className="flex gap-2 rounded-lg bg-muted/40 p-3">
            <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-blue" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-muted-foreground">{t('ai.privacyExcluded')}</p>
          </div>
          {action === 'coach' && (
            <div className="space-y-1.5">
              <Label htmlFor="ai-coach-question" className="text-xs">{t('ai.coachQuestion')}</Label>
              <textarea id="ai-coach-question" dir="auto" value={coachQuestion} onChange={(event) => setCoachQuestion(event.target.value)} maxLength={2000} rows={3} placeholder={t('ai.coachQuestionPlaceholder')} className="min-h-[84px] w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-relaxed outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" data-testid="input-ai-coach-question" />
            </div>
          )}
          <div className="grid gap-2">
            <p className="text-xs font-semibold">{t(action === 'analyze' ? 'ai.analyzeHelp' : action === 'coach' ? 'ai.coachHelp' : action === 'draft' ? 'ai.draftHelp' : 'ai.voiceHelp')}</p>
            <div className="grid grid-cols-1 gap-2">
              <Button type="button" variant={action === 'coach' ? 'default' : 'outline'} className="min-h-11 justify-start gap-2 whitespace-normal text-start" onClick={() => setAction('coach')} data-testid="button-ai-mode-coach"><CircleHelp className="h-4 w-4 shrink-0" />{t('ai.coach')}</Button>
              <Button type="button" variant={action === 'draft' ? 'default' : 'outline'} className="min-h-11 justify-start gap-2 whitespace-normal text-start" onClick={() => setAction('draft')} data-testid="button-ai-mode-draft"><Send className="h-4 w-4 shrink-0" />{t('ai.draft')}</Button>
              <Button type="button" variant={action === 'analyze' ? 'default' : 'outline'} className="min-h-11 justify-start gap-2 whitespace-normal text-start" onClick={() => setAction('analyze')} data-testid="button-ai-mode-analyze"><CircleHelp className="h-4 w-4 shrink-0" />{t('ai.analyze')}</Button>
              <Button type="button" variant={action === 'voice' ? 'default' : 'outline'} className="min-h-11 justify-start gap-2 whitespace-normal text-start" onClick={() => setAction('voice')} data-testid="button-ai-mode-voice"><Sparkles className="h-4 w-4 shrink-0" />{t('ai.voice')}</Button>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{t(action === 'analyze' ? 'ai.analyzeHelp' : action === 'coach' ? 'ai.coachHelp' : action === 'draft' ? 'ai.draftHelp' : 'ai.voiceHelp')}</p>
          {action === 'draft' && <label className="flex min-h-11 cursor-pointer items-start gap-2 text-xs">
            <Checkbox className="mt-1" checked={factsReviewed} onCheckedChange={(value) => setFactsReviewed(value === true)} data-testid="checkbox-ai-facts-reviewed" />
            <span>{t('ai.factsReview')}</span>
          </label>}
          {action === 'voice' && <p className="rounded-md bg-blue-soft/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">{t('ai.voiceScope')}</p>}
          {action === 'voice' && (
            <div className="space-y-2 rounded-lg border p-3">
              <label htmlFor="ai-voice-sample" className="text-xs font-semibold">{t('ai.voiceAdd')}</label>
              <textarea id="ai-voice-sample" value={voiceSampleDraft}
                onChange={(event) => setVoiceSampleDraft(event.target.value)} maxLength={5000} rows={3} dir="auto"
                className="w-full rounded-md border bg-background p-2 text-sm" data-testid="input-ai-voice-sample" />
              <label className="flex min-h-11 cursor-pointer items-start gap-2 text-xs leading-relaxed">
                <Checkbox checked={voiceSampleConfirmed} onCheckedChange={(value) => setVoiceSampleConfirmed(value === true)}
                  data-testid="checkbox-ai-voice-sample-confirm" />
                <span>{t('ai.voiceConfirm')}</span>
              </label>
              <Button type="button" variant="outline" className="min-h-11 w-full"
                disabled={!voiceSampleConfirmed || !voiceSampleDraft.trim()}
                onClick={() => {
                  if (!onSaveVoiceExample({ text: voiceSampleDraft.trim(), kind: 'user_original', language: ruleLanguage, purpose: normalizeAiPurpose(rulePurpose) })) return;
                  setVoiceSampleDraft('');
                  setVoiceSampleConfirmed(false);
                }}
                data-testid="button-ai-save-voice-sample">{t('ai.voiceAdd')}</Button>
            </div>
          )}
          <label className="flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg border border-warn/40 bg-warn-soft/30 p-3 text-xs leading-relaxed">
            <Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} className="mt-0.5" data-testid="checkbox-ai-request-consent" />
            <span>{t('ai.consent')}</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="min-h-11 flex-1 gap-2" disabled={!canRequest} onClick={() => void request(action)} data-testid={`button-ai-send-${action}`}>
              <Send className="h-4 w-4" />{t(action === 'analyze' ? 'ai.analyze' : action === 'coach' ? 'ai.sendCoach' : action === 'draft' ? 'ai.sendDraft' : 'ai.sendVoice')}
            </Button>
            {(requestStatus === 'loading' || loading) && <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={cancel} data-testid="button-ai-cancel"><X className="h-4 w-4" />{t('ai.cancelRequest')}</Button>}
          </div>
        </section>

        {status !== 'idle' && (
          <div className={`flex gap-2 rounded-lg p-3 text-xs leading-relaxed ${isFailure ? 'bg-destructive/5 text-destructive' : 'bg-muted/50 text-muted-foreground'}`} role={isFailure ? 'alert' : 'status'} aria-live="polite" data-testid={`status-ai-${status}`}>
            {status === 'loading' ? <span className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-blue/30" aria-hidden="true" /> : <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />}
            <span>{t(statusKey[status])}</span>
            {retryable && <Button type="button" variant="ghost" className="ml-auto min-h-11 shrink-0" disabled={!canRequest} onClick={() => void request(action)} data-testid="button-ai-retry">{t('ai.retry')}</Button>}
          </div>
        )}

        {result?.coachQuestion && (
          <section className="rounded-lg border border-blue/25 bg-blue-soft/40 p-3" data-testid="result-ai-coach">
            <p className="text-xs font-semibold text-blue">{t('ai.responseCoach')}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed" dir="auto">{result.coachQuestion}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">{t('ai.aiInterpretation')}</p>
            <label htmlFor="ai-coach-answer" className="mt-3 block text-xs font-semibold">{t('ai.answerInput')}</label>
            <textarea id="ai-coach-answer" value={answerDraft} onChange={(event) => setAnswerDraft(event.target.value)}
              maxLength={3000} rows={3} dir="auto" className="mt-1.5 w-full rounded-md border bg-background p-2 text-sm"
              data-testid="input-ai-coach-answer" />
            <Button type="button" variant="outline" className="mt-2 min-h-11 w-full" disabled={!answerDraft.trim()}
              onClick={() => {
                if (!onSaveAnswer({ question: result.coachQuestion!, answer: answerDraft.trim(), experienceIds: responseExperienceIds })) return;
                setAnswerDraft('');
              }}
              data-testid="button-ai-save-answer">{t('ai.saveAnswer')}</Button>
          </section>
        )}
        {result?.notice && <p className="rounded-md bg-muted/50 p-3 text-xs leading-relaxed" data-testid="text-ai-notice">{result.notice}</p>}
        {(result?.feedback?.length ?? 0) > 0 && (
          <section className="space-y-2" data-testid="section-ai-feedback">
            <p className="text-[11px] text-muted-foreground">{t('ai.aiInterpretation')}</p>
            {result?.feedback?.map((item, index) => (
              <div key={`feedback-${index}`} className="rounded-md border p-3 text-xs leading-relaxed">
                <p className="font-semibold">{item.category}</p>
                <p className="mt-1">{item.note}</p>
                {item.evidence && <p className="mt-1 text-muted-foreground" dir="auto">{item.evidence}</p>}
              </div>
            ))}
          </section>
        )}

        {candidates.length > 0 && (
          <section className="space-y-2 border-t pt-4" aria-labelledby="ai-candidates-heading">
            <h3 id="ai-candidates-heading" className="text-sm font-semibold">{t('ai.candidatesTitle')}</h3>
            {candidates.map((candidate, index) => {
              const chosen = selectedCandidate === candidate.id;
              const compareChosen = compareIds.includes(candidate.id);
              return (
                <article key={candidate.id} className={`rounded-lg border p-3 ${chosen ? 'border-blue/50 bg-blue-soft/30' : 'bg-card'}`} data-testid={`result-ai-candidate-${candidate.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="meta">{t('ai.candidate', { count: index + 1 })}</span>
                    <span className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">{t(candidate.sourceTag)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed" dir="auto">{candidate.text}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant={chosen ? 'default' : 'outline'} className="min-h-11 gap-1.5" onClick={() => setSelectedCandidate(candidate.id)} data-testid={`button-ai-select-candidate-${candidate.id}`}>
                      {chosen && <Check className="h-4 w-4" />}{t(chosen ? 'ai.selected' : 'ai.selectCandidate')}
                    </Button>
                    <Button type="button" variant={compareChosen ? 'secondary' : 'outline'} className="min-h-11 gap-1.5" aria-pressed={compareChosen} onClick={() => setCompareIds((current) => compareChosen ? current.filter((id) => id !== candidate.id) : current.length < 2 ? [...current, candidate.id] : [current[1], candidate.id])} data-testid={`button-ai-compare-candidate-${candidate.id}`}>
                      <GitCompareArrows className="h-4 w-4" />{t('ai.compareCandidate')}
                    </Button>
                  </div>
                  {((candidate.interpretationNotes?.length ?? 0) > 0 || (candidate.sourceFacts?.length ?? 0) > 0 || (candidate.evidenceGaps?.length ?? 0) > 0 || candidate.rationale || candidate.strengthConnection || candidate.caution) && (
                    <div className="mt-3 space-y-2 border-t pt-2 text-xs">
                      {candidate.interpretationNotes?.map((note, i) => <p key={`interp-${i}`} className="text-warn" data-testid={`text-ai-interpretation-${candidate.id}-${i}`}>{t('ai.aiInterpretation')}: <span dir="auto">{note}</span></p>)}
                      {candidate.rationale && <p className="text-warn" data-testid={`text-ai-rationale-${candidate.id}`}>{t('ai.aiInterpretation')}: <span dir="auto">{candidate.rationale}</span></p>}
                      {candidate.strengthConnection && <p className="text-warn" data-testid={`text-ai-strength-connection-${candidate.id}`}>{t('ai.aiInterpretation')}: <span dir="auto">{candidate.strengthConnection}</span></p>}
                      {candidate.sourceFacts?.map((fact, i) => <p key={`fact-${i}`} className="text-warn" data-testid={`text-ai-source-fact-${candidate.id}-${i}`}>{t('ai.aiInterpretation')}: <span dir="auto">{fact}</span></p>)}
                      {candidate.evidenceGaps?.map((gap, i) => <p key={`gap-${i}`} className="text-muted-foreground" data-testid={`text-ai-evidence-gap-${candidate.id}-${i}`}>{t('ai.evidenceGaps')}: <span dir="auto">{gap}</span></p>)}
                      {candidate.caution && <p className="text-muted-foreground" data-testid={`text-ai-caution-${candidate.id}`}>{t('ai.evidenceGaps')}: <span dir="auto">{candidate.caution}</span></p>}
                    </div>
                  )}
                </article>
              );
            })}
            {compareIds.length > 0 && (
              <div className="rounded-lg border bg-muted/20 p-3" data-testid="panel-ai-compare">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">{t('ai.compare')}</p>
                  <Button type="button" variant="ghost" className="min-h-11" onClick={() => setCompareIds([])} data-testid="button-ai-close-compare">{t('ai.closeCompare')}</Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {compareIds.map((id) => {
                    const candidate = candidates.find((item) => item.id === id);
                    return candidate ? <p key={id} className="whitespace-pre-wrap rounded-md bg-card p-3 text-sm leading-relaxed" dir="auto">{candidate.text}</p> : null;
                  })}
                </div>
              </div>
            )}
            <fieldset className="space-y-2 rounded-lg border p-3">
              <legend className="px-1 text-xs font-semibold">{t('ai.apply')}</legend>
              {(['replace', 'append'] as const).map((choice) => (
                <label key={choice} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                  <input type="radio" name="ai-apply-choice" value={choice} checked={applyChoice === choice} onChange={() => setApplyChoice(choice)} data-testid={`radio-ai-apply-${choice}`} />
                  {t(`ai.${choice}`)}
                </label>
              ))}
              <Button type="button" className="min-h-11 w-full" disabled={!selectedCandidate} onClick={() => {
                const candidate = candidates.find((item) => item.id === selectedCandidate);
                if (candidate) onApply(candidate, applyChoice);
              }} data-testid="button-ai-apply-selected">{t('ai.apply')}</Button>
            </fieldset>
          </section>
        )}

        {ruleCandidates.length > 0 && (
          <section className="space-y-2 border-t pt-4" data-testid="section-ai-style-candidates">
            <h3 className="text-sm font-semibold">{t('ai.voiceCandidatesTitle')}</h3>
            {ruleCandidates.map((candidate) => (
              <article key={candidate.id} className="rounded-lg border p-3" data-testid={`result-ai-style-candidate-${candidate.id}`}>
                <p className="text-xs text-muted-foreground">{normalizeAiPurpose(candidate.purpose) === 'essay' ? t('ai.purposeEssay') : candidate.purpose}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm" dir="auto">{candidate.text}</p>
                {candidate.example && <blockquote className="mt-2 whitespace-pre-wrap border-s-2 ps-2 text-xs" dir="auto">{candidate.example}</blockquote>}
                <p className="mt-2 text-xs text-muted-foreground">{t('ai.aiInterpretation')}</p>
                <Button type="button" variant="outline" className="mt-2 min-h-11 w-full" onClick={() => {
                  const next = [...styleRules, {
                    id: `${candidate.id}-${Date.now()}`,
                    aspect: candidate.aspect,
                    example: candidate.example,
                    text: candidate.text,
                    language: candidate.language ?? application.writingLanguage,
                    purpose: normalizeAiPurpose(rulePurpose),
                    enabled: true,
                    confirmed: false,
                  }];
                  onSaveStyleRules(next);
                }} data-testid={`button-ai-save-style-candidate-${candidate.id}`}>{t('ai.saveRule')}</Button>
              </article>
            ))}
          </section>
        )}

        {styleRules.length > 0 && (
          <section className="space-y-3 border-t pt-4" data-testid="section-ai-style-rules">
            <div>
              <h3 className="text-sm font-semibold">{t('ai.styleRules')}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('ai.styleRulesHelp')}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-xs">
                <span>{t('ai.ruleLanguage')}</span>
                <select value={ruleLanguage} onChange={(event) => setRuleLanguage(event.target.value)} className="min-h-11 w-full min-w-0 rounded-md border bg-background px-2 text-sm" dir="auto" data-testid="input-ai-style-language">
                  {Object.entries(LANGUAGE_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs">
                <span>{t('ai.rulePurpose')}</span>
                <input value={rulePurpose === 'essay' ? t('ai.purposeEssay') : rulePurpose} onChange={(event) => setRulePurpose(event.target.value === t('ai.purposeEssay') ? 'essay' : event.target.value)} onBlur={() => setRulePurpose(normalizeAiPurpose(rulePurpose))} className="min-h-11 w-full rounded-md border bg-background px-2 text-sm" dir="auto" data-testid="input-ai-style-purpose" />
              </label>
            </div>
            {styleRules.map((rule) => (
              <div key={rule.id} className="rounded-lg border p-3" data-testid={`row-ai-style-rule-${rule.id}`}>
                <textarea aria-label={t('ai.editRule')} value={ruleDrafts[rule.id] ?? rule.text} onChange={(event) => setRuleDrafts((drafts) => ({ ...drafts, [rule.id]: event.target.value }))} rows={2} className="w-full resize-y rounded-md border bg-background p-2 text-sm leading-relaxed" dir="auto" data-testid={`input-ai-style-rule-${rule.id}`} />
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{LANGUAGE_NAMES[rule.language] || rule.language}</span><span>{normalizeAiPurpose(rule.purpose) === 'essay' ? t('ai.purposeEssay') : rule.purpose}</span>
                  {rule.confirmed && <span className="inline-flex items-center gap-1 text-ok"><Check className="h-3 w-3" />{t('ai.ruleConfirmed')}</span>}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs">
                    <Checkbox checked={rule.enabled} onCheckedChange={(value) => updateRule(rule, { enabled: value === true })} data-testid={`checkbox-ai-style-enabled-${rule.id}`} />{t('ai.ruleEnabled')}
                  </label>
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => {
                    if (!updateRule(rule, { text: ruleDrafts[rule.id] ?? rule.text, language: ruleLanguage, purpose: normalizeAiPurpose(rulePurpose) })) return;
                    setRuleDrafts((drafts) => { const next = { ...drafts }; delete next[rule.id]; return next; });
                  }} data-testid={`button-ai-save-style-rule-${rule.id}`}>{t('ai.saveRule')}</Button>
                  <Button type="button" variant="outline" className="min-h-11" disabled={(ruleDrafts[rule.id] ?? rule.text) !== rule.text} onClick={() => onConfirmStyleRule(rule.id)} data-testid={`button-ai-confirm-style-rule-${rule.id}`}>{t('ai.confirmRule')}</Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="ghost" className="min-h-11 w-full gap-2 text-destructive" onClick={onClearStyleRules} data-testid="button-ai-reset-style-rules"><RotateCcw className="h-4 w-4" />{t('ai.resetRules')}</Button>
          </section>
        )}

        <div className="grid gap-2 border-t pt-3">
          <p className="text-xs text-muted-foreground">{t('ai.localNotice')}</p>
          {history.length > 0 && <details className="rounded-lg border p-3">
            <summary className="min-h-11 cursor-pointer text-sm font-semibold">{t('ai.history')}</summary>
            {history.slice().reverse().map((entry) => <div key={entry.id} className="space-y-2 border-t py-3 text-xs">
              <time>{entry.createdAt}</time>
              {entry.question && <p dir="auto">{entry.question}</p>}
              {entry.candidates.map((text, index) => <p key={index} className="whitespace-pre-wrap" dir="auto">{text}</p>)}
            </div>)}
          </details>}
          {styleRules.length === 0 && <p className="text-xs text-muted-foreground">{t('ai.noRules')}</p>}
          <Button type="button" variant="outline" className="min-h-11 w-full gap-2" onClick={onRestorePriorBody} data-testid="button-ai-restore-prior-body"><RotateCcw className="h-4 w-4" />{t('ai.restorePrior')}</Button>
        </div>
      </div>
    </aside>
  );
}

export default AIWritingAssistant;
