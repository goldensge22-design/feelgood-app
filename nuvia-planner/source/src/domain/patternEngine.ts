/**
 * NUVIA PLANNER v1.5 — 6 SELF-MANAGEMENT PATTERN RESOLVER
 * LOGIC LAYER — presentation may read results but must not change scoring/routing rules.
 *
 * IMPORTANT:
 * - PLAN/START/FOCUS/TIME/RECOVER/CHECK are support-routing categories, not diagnoses.
 * - Official assessment output stays SSOT; this layer never recomputes raw K-PASS/D-CAS scores.
 * - Behavior metrics may refine ordering only after their existing minimum-observation gate is met.
 */
import type { LearnerContext, MetricKey, MetricResult, PatternProfile, SelfManagementPattern, ModuleId } from "./types";

export const PATTERN_ORDER: SelfManagementPattern[] = ["PLAN", "START", "FOCUS", "TIME", "RECOVER", "CHECK"];

export const PATTERN_LABELS: Record<SelfManagementPattern, string> = {
  PLAN: "계획 구조화",
  START: "시작",
  FOCUS: "집중 유지",
  TIME: "시간 감각",
  RECOVER: "다시 돌아오기",
  CHECK: "나를 점검하고 바꾸기",
};

export const PATTERN_QUESTIONS: Record<SelfManagementPattern, string> = {
  PLAN: "무엇부터 해야 할지 정리하는 게 어렵나요?",
  START: "해야 할 일은 아는데 시작이 늦어지나요?",
  FOCUS: "시작은 하지만 흐름이 자주 끊기나요?",
  TIME: "생각한 시간보다 늘 오래 걸리나요?",
  RECOVER: "한 번 틀어지면 다시 돌아오기 어렵나요?",
  CHECK: "같은 방식이 반복되는데 왜 그런지 잘 모르겠나요?",
};

export const PATTERN_MODULES: Record<SelfManagementPattern, ModuleId[]> = {
  PLAN: ["PRIORITY", "BREAK_IT", "PLAN_VS_REALITY"],
  START: ["START_NOW", "BREAK_IT"],
  FOCUS: ["FOCUS_MISSION"],
  TIME: ["TIME_SENSE", "PLAN_VS_REALITY"],
  RECOVER: ["RESET", "START_NOW"],
  CHECK: ["PLAN_VS_REALITY", "RESET", "TIME_SENSE"],
};

const METRIC_TO_PATTERN: Partial<Record<MetricKey, SelfManagementPattern>> = {
  planning_accuracy: "PLAN",
  plan_order_consistency: "PLAN",
  start_accuracy: "START",
  focus_stability: "FOCUS",
  time_prediction_accuracy: "TIME",
  recovery_skill: "RECOVER",
  metacognitive_accuracy: "CHECK",
};

/** Profile domain -> candidate patterns. This is routing metadata, not a clinical inference. */
const DOMAIN_PATTERN_CANDIDATES: Record<string, SelfManagementPattern[]> = {
  planning: ["PLAN", "START", "TIME", "RECOVER", "CHECK"],
  attention: ["FOCUS", "START", "RECOVER"],
  simultaneous: ["PLAN", "CHECK"],
  sequential: ["PLAN", "TIME"],
  sequential_processing: ["PLAN", "TIME"],
  __sequential_pending__: ["PLAN", "TIME"],
};

const STRENGTH_LEVER: Record<string, string> = {
  planning: "목표·조건을 먼저 정리한 뒤 실행하기",
  attention: "지금 필요한 정보와 행동을 좁혀 시작하기",
  simultaneous: "전체 그림·관계맵을 먼저 보고 계획하기",
  sequential: "단계를 순서대로 나눠 하나씩 실행하기",
  sequential_processing: "단계를 순서대로 나눠 하나씩 실행하기",
  __sequential_pending__: "단계를 순서대로 나눠 하나씩 실행하기",
};

export function resolvePatternProfile(ctx: LearnerContext, metrics: MetricResult[] = []): PatternProfile {
  const score = new Map<SelfManagementPattern, number>(PATTERN_ORDER.map((p) => [p, 0]));
  let profileSignal = false;
  let behaviorSignal = false;

  // Official support domains only seed candidate routing. No raw-score thresholding here.
  for (const d of ctx.support_domains) {
    const pats = DOMAIN_PATTERN_CANDIDATES[d] ?? [];
    if (pats.length) profileSignal = true;
    pats.forEach((p, idx) => score.set(p, (score.get(p) ?? 0) + (idx === 0 ? 2 : 1)));
  }

  // Existing approved behavior metrics refine the order only when sufficient.
  for (const m of metrics) {
    if (m.state !== "sufficient" || m.value == null) continue;
    const p = METRIC_TO_PATTERN[m.key];
    if (!p) continue;
    behaviorSignal = true;
    score.set(p, (score.get(p) ?? 0) + (1 - m.value) * 3);
  }

  const ordered = [...PATTERN_ORDER].sort((a, b) => {
    const d = (score.get(b) ?? 0) - (score.get(a) ?? 0);
    return Math.abs(d) > 1e-9 ? d : PATTERN_ORDER.indexOf(a) - PATTERN_ORDER.indexOf(b);
  });

  const allZero = ordered.every((p) => (score.get(p) ?? 0) === 0);
  const source: PatternProfile["source"] =
    profileSignal && behaviorSignal ? "profile_plus_behavior" :
    profileSignal ? "profile_only" :
    behaviorSignal ? "behavior_only" : "neutral";

  // Neutral: no official support domain and no sufficient behavior metric.
  // Do not fabricate a primary/secondary pattern — this is an Observation Start
  // state, not a resolved profile. (Guardrail: never default to a fixed pattern here.)
  if (allZero) {
    return {
      primary: null,
      secondary: null,
      ordered: [],
      source: "neutral",
      strength_levers: ctx.strength_domains.map((d) => STRENGTH_LEVER[d]).filter((x): x is string => !!x),
    };
  }

  return {
    primary: ordered[0],
    secondary: ordered[1] ?? null,
    ordered,
    source,
    strength_levers: ctx.strength_domains.map((d) => STRENGTH_LEVER[d]).filter((x): x is string => !!x),
  };
}

export function patternForModule(module: ModuleId): SelfManagementPattern {
  for (const p of PATTERN_ORDER) if (PATTERN_MODULES[p].includes(module)) return p;
  return "CHECK";
}
