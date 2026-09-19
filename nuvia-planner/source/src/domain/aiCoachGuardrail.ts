/**
 * AI COACH GUARDRAIL — 6 GATE
 * LOGIC LAYER — LOVABLE MUST NOT EDIT
 *
 * CORE §8: Observe → Ask → Offer Options → 학생 결정 → Reflect → Fade.
 * PLANNER §18: 최종 확정 금지, 진단 금지, 관찰지표 목표화 금지, 인과 표현 금지.
 */
import { FORBIDDEN_PATTERNS } from "./discoveryEngine";
import type { AgeBand } from "./types";

export type CoachStep = "OBSERVE" | "ASK" | "OFFER" | "REFLECT" | "FADE";

export interface CoachOption {
  option_id: string;
  copy_key: string;
}

export interface CoachUtterance {
  step: CoachStep;
  copy_key: string;
  params?: Record<string, string | number>;
  options?: CoachOption[];
  /** 근거 이벤트. 없으면 GATE 1에서 폐기 */
  source_event_ids: string[];
  observation_count: number;
  min_observations: number;
  evidence_epoch_ids: string[];
  /** true면 학생 결정을 대신하려는 시도 → GATE 5에서 차단 */
  decidesForStudent: boolean;
  topic: string;
}

export interface CoachContext {
  epoch_id: string;
  age_band: AgeBand;
  /** 세션 내 이미 노출된 Coach 카드 수 */
  utterancesThisSession: number;
  /** DO 단계 진행 중 여부 — 중에는 0회 (§9.3) */
  inDoPhase: boolean;
  /** 동일 주제 연속 무응답 횟수 */
  unansweredByTopic: Record<string, number>;
}

/** 세션당 최대 개입 (§9.3) */
export const MAX_UTTERANCES_PER_SESSION = 2;
export const MAX_UNANSWERED_BEFORE_MUTE = 3;

/** Band별 선택지 수 (표현 설정, 로직 분기 아님) */
export const OPTIONS_BY_BAND: Record<AgeBand, number> = { A: 3, B: 3, C: 2, D: 2 };

export type CoachGateResult =
  | { pass: true; utterance: CoachUtterance }
  | { pass: false; gate: 1 | 2 | 3 | 4 | 5 | 6; reason: string };

const CAUSAL_PATTERNS: RegExp[] = [
  /검사\s*점수가?\s*(향상|상승|올라)/,
  /PLANNER\s*(때문에|덕분에).*(향상|좋아)/,
  /인지능력이\s*(향상|상승)/,
  /자율성을\s*(높|올려)/,      // 관찰지표 자체를 목표화 (§18)
  /자기주도성을\s*(높|올려)/,
];

export function checkCoachUtterance(u: CoachUtterance, ctx: CoachContext, renderedText: string): CoachGateResult {
  // G1 — 근거 event 존재
  if (u.source_event_ids.length === 0) return { pass: false, gate: 1, reason: "no_evidence" };

  // G2 — 최소관찰수
  if (u.step === "OBSERVE" && u.observation_count < u.min_observations) {
    return { pass: false, gate: 2, reason: "insufficient_observations" };
  }
  // G3 — 단일 epoch
  const distinct = new Set(u.evidence_epoch_ids);
  if (distinct.size !== 1 || !distinct.has(ctx.epoch_id)) {
    return { pass: false, gate: 3, reason: "epoch_boundary_crossed" };
  }
  // G4 — 금지어
  for (const p of [...FORBIDDEN_PATTERNS, ...CAUSAL_PATTERNS]) {
    if (p.test(renderedText)) return { pass: false, gate: 4, reason: `forbidden:${p.source}` };
  }
  // G5 — 최종결정 대행 금지 → 선택지 형태로 강제 변환
  if (u.decidesForStudent) {
    if (!u.options || u.options.length < 2) {
      return { pass: false, gate: 5, reason: "decides_for_student" };
    }
  }
  // G6 — 빈도
  if (ctx.inDoPhase) return { pass: false, gate: 6, reason: "do_phase_silence" };
  if (ctx.utterancesThisSession >= MAX_UTTERANCES_PER_SESSION) {
    return { pass: false, gate: 6, reason: "session_limit" };
  }
  if ((ctx.unansweredByTopic[u.topic] ?? 0) >= MAX_UNANSWERED_BEFORE_MUTE) {
    return { pass: false, gate: 6, reason: "topic_muted" };
  }
  return { pass: true, utterance: u };
}

/** AI가 최종 확정하려 할 때의 하드 가드 */
export function aiFinalizeDecision(): never {
  throw new Error("AI must not finalize goals, priorities, or Weekly Boss (CORE §8 / PLANNER §18).");
}

/** Autonomy Ratio는 관찰지표. 학생·부모 화면 노출 금지 (§21, §34) */
export function exposeAutonomyRatio(scope: "research" | "student" | "parent"): number | never {
  if (scope !== "research") {
    throw new Error("Autonomy Ratio must not be exposed to student or parent (PLANNER §34).");
  }
  return NaN;
}
