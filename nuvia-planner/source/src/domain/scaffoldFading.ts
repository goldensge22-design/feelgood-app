/**
 * SCAFFOLD FADING STATE MACHINE
 * LOGIC LAYER — LOVABLE MUST NOT EDIT
 *
 * §14: 도움 감소 = 성장. 비율 숫자 미노출. 학생이 직접 요청 가능.
 *      재강화는 '능력 저하'가 아니라 상황 지원으로 표현.
 * §20: Fading ≠ Complexity. Level은 하향하지 않는다.
 */
import { SCAFFOLD_ORDER } from "./types";
import type { LearnerContext, Level, ModuleId, ScaffoldState } from "./types";

export type FadeReasonCode =
  | "fade_accepted_by_student"
  | "student_requested_more"
  | "recent_pattern_support"
  | "epoch_reset"
  | "complexity_linked";

/** C1 — Level 하한 기준선 */
export const LEVEL_FLOOR: Record<ScaffoldState, Level> = {
  S1_GUIDED: 1, S2_ASSISTED: 3, S3_LIGHT: 4, S4_SELF: 6,
};

/** C4 — 새 epoch 직후 안정 관찰 기간 (§20) */
export const EPOCH_STABILIZATION_DAYS = 7;

export interface FadeSignals {
  /** C2 — 최근 관찰 창에서 AI 선택지를 쓰지 않고 직접 결정한 횟수 */
  selfDecidedCount: number;
  /** C2 — 동일 창에서 AI 선택지를 사용한 횟수 */
  aiOptionUsedCount: number;
  /** C3 — 해당 모듈의 관찰수 */
  moduleObservationCount: number;
  /** RE-SUPPORT 트리거 */
  recentIncompleteCount: number;
  now: Date;
}

/**
 * CR-6: C2의 정량 임계는 제품 오너 승인 대기.
 * 임의 산식을 만들지 않기 위해 임계값을 외부 주입 가능한 상수로 격리한다.
 */
export const FADE_THRESHOLDS = {
  /** provisional — CR-6 확정 전 사용. 승인 시 이 값만 교체 */
  minSelfDecidedRatio: 0.6,
  minSelfDecidedCount: 5,
  minModuleObservations: 5,
  reSupportIncompleteCount: 4,
};

export interface FadeEvaluation {
  canPropose: boolean;
  failedConditions: ("C1" | "C2" | "C3" | "C4")[];
  nextState: ScaffoldState | null;
}

export function nextFadeState(s: ScaffoldState): ScaffoldState | null {
  const i = SCAFFOLD_ORDER.indexOf(s);
  return i < 0 || i >= SCAFFOLD_ORDER.length - 1 ? null : SCAFFOLD_ORDER[i + 1];
}

export function previousFadeState(s: ScaffoldState): ScaffoldState | null {
  const i = SCAFFOLD_ORDER.indexOf(s);
  return i <= 0 ? null : SCAFFOLD_ORDER[i - 1];
}

/** 4개 조건 전부 충족해야 '제안'할 수 있다. 자동 전이는 없다 (§14) */
export function evaluateFade(ctx: LearnerContext, sig: FadeSignals): FadeEvaluation {
  const target = nextFadeState(ctx.scaffold_state);
  const failed: FadeEvaluation["failedConditions"] = [];
  if (!target) return { canPropose: false, failedConditions: [], nextState: null };

  // C1 — Level 하한
  if (ctx.level < LEVEL_FLOOR[target]) failed.push("C1");

  // C2 — 도움사용 패턴
  const total = sig.selfDecidedCount + sig.aiOptionUsedCount;
  const ratio = total === 0 ? 0 : sig.selfDecidedCount / total;
  if (ratio < FADE_THRESHOLDS.minSelfDecidedRatio ||
      sig.selfDecidedCount < FADE_THRESHOLDS.minSelfDecidedCount) failed.push("C2");

  // C3 — 근거 있는 fading
  if (sig.moduleObservationCount < FADE_THRESHOLDS.minModuleObservations) failed.push("C3");

  // C4 — epoch 안정 관찰 7일
  const days = (sig.now.getTime() - new Date(ctx.epoch_started_at).getTime()) / 86_400_000;
  if (days < EPOCH_STABILIZATION_DAYS) failed.push("C4");

  return { canPropose: failed.length === 0, failedConditions: failed, nextState: target };
}

export interface FadeTransition {
  prior_support_level: ScaffoldState;
  new_support_level: ScaffoldState;
  reason_code: FadeReasonCode;
}

/** 학생이 수락해야만 전이된다 */
export function acceptFade(ctx: LearnerContext, accepted: boolean): FadeTransition | null {
  if (!accepted) return null;
  const target = nextFadeState(ctx.scaffold_state);
  if (!target) return null;
  return {
    prior_support_level: ctx.scaffold_state,
    new_support_level: target,
    reason_code: "fade_accepted_by_student",
  };
}

/** 하향(RE-SUPPORT). 낙인 문구를 만들지 않는다 (§14) */
export function reSupport(ctx: LearnerContext, reason: FadeReasonCode): FadeTransition | null {
  const target = previousFadeState(ctx.scaffold_state);
  if (!target) return null;
  return { prior_support_level: ctx.scaffold_state, new_support_level: target, reason_code: reason };
}

/** 학생 직접 요청은 즉시 반영된다 (§14) */
export function studentRequestsMoreHelp(ctx: LearnerContext): FadeTransition | null {
  return reSupport(ctx, "student_requested_more");
}

export function shouldReSupport(sig: FadeSignals): boolean {
  return sig.recentIncompleteCount >= FADE_THRESHOLDS.reSupportIncompleteCount;
}

// ── 모듈별 Scaffold 표현 스펙 (§8.6) ────────────────────────────────────
export type ScaffoldAffordance =
  | "recommended_value" | "reference_info" | "on_request" | "none"
  | "considerations_3" | "considerations_1" | "blank_board" | "blank_free"
  | "template" | "first_example" | "blank" | "student_judged"
  | "length_recommend" | "recent_only" | "manual" | "auto_offer"
  | "conditional_offer" | "student_invoked" | "value_suggest" | "range_only"
  | "direct_input" | "student_led";

export const MODULE_SCAFFOLD: Record<ModuleId, Record<ScaffoldState, ScaffoldAffordance>> = {
  TIME_SENSE:      { S1_GUIDED: "recommended_value", S2_ASSISTED: "reference_info",  S3_LIGHT: "on_request",       S4_SELF: "none" },
  PRIORITY:        { S1_GUIDED: "considerations_3",  S2_ASSISTED: "considerations_1", S3_LIGHT: "blank_board",     S4_SELF: "blank_free" },
  BREAK_IT:        { S1_GUIDED: "template",          S2_ASSISTED: "first_example",    S3_LIGHT: "blank",           S4_SELF: "student_judged" },
  FOCUS_MISSION:   { S1_GUIDED: "length_recommend",  S2_ASSISTED: "recent_only",      S3_LIGHT: "manual",          S4_SELF: "manual" },
  START_NOW:       { S1_GUIDED: "auto_offer",        S2_ASSISTED: "conditional_offer",S3_LIGHT: "student_invoked", S4_SELF: "none" },
  PLAN_VS_REALITY: { S1_GUIDED: "value_suggest",     S2_ASSISTED: "range_only",       S3_LIGHT: "direct_input",    S4_SELF: "none" },
  RESET:           { S1_GUIDED: "auto_offer",        S2_ASSISTED: "conditional_offer",S3_LIGHT: "student_invoked", S4_SELF: "student_led" },
};

/** 도움 비율 숫자 노출 금지 가드 (§14) */
export function assertNoSupportRatioExposure(rendered: string): void {
  if (/도움\s*\d+\s*%|지원\s*수준\s*\d|support[_ ]?level\s*[:=]\s*\d/.test(rendered)) {
    throw new Error("Support ratio must not be shown to the student (PLANNER §14).");
  }
}
