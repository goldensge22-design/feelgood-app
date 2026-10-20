/**
 * ADAPTIVE COMPLEXITY — v1.3 §12 (PATCH 4, CR-5 CLOSED)
 * LOGIC LAYER — LOVABLE MUST NOT EDIT
 *
 * Complexity(L1~L6)는 시스템이 자동 조정하는 과제 복잡도·AI 도움 수준이며
 * 학생에게 등급으로 노출하지 않는다(§12.3). Level(1~6)은 학생에게 보이는
 * 훈련 진행 단계다. 결합 규칙: Level n은 Complexity 상한을 L(n)으로
 * 정한다. Level은 하향하지 않고, Complexity는 하향할 수 있다(§12.3).
 *
 * §12.2의 "반복적 혼란"·"과도한 계획"은 원문에 조작적 정의(수치)가 없다.
 * 임의 수치를 만들지 않기 위해 이 두 신호는 호출부가 관찰해 boolean으로
 * 전달하는 입력으로 남긴다. "도움 요청 증가"는 원문이 방향만 요구하므로
 * (증가폭 수치 없음) 직전 대비 증가 여부만 계산한다 — 임의 수치 없음.
 */
import type { Complexity, Level } from "./types";

const ORDER: Complexity[] = ["L1", "L2", "L3", "L4", "L5", "L6"];

/** §12.1 단계 정의 — 학생에게 노출하지 않는 내부 설명 텍스트 */
export const COMPLEXITY_TIERS: Record<Complexity, { scope: string; aiHelp: string }> = {
  L1: { scope: "1~2개 과제, 하루 단위, 짧은 Focus", aiHelp: "높음" },
  L2: { scope: "3~4개 과제, 우선순위+시간예측", aiHelp: "중상" },
  L3: { scope: "하루 전체계획, 과제분해", aiHelp: "중간" },
  L4: { scope: "주간계획, 마감충돌, 재계획", aiHelp: "중하" },
  L5: { scope: "시험기간, 여러 과목·프로젝트 통합", aiHelp: "낮음" },
  L6: { scope: "학생 주도 계획·성찰, AI는 분석 중심", aiHelp: "최소" },
};

/** §12.3 결합 규칙: Level n → Complexity 상한 L(n) */
export function complexityCapForLevel(level: Level): Complexity {
  return `L${level}` as Complexity;
}

function idx(c: Complexity): number { return ORDER.indexOf(c); }

export function clampComplexityToLevelCap(complexity: Complexity, level: Level): Complexity {
  const cap = complexityCapForLevel(level);
  return idx(complexity) > idx(cap) ? cap : complexity;
}

// ── §12.2 승강 규칙 ──────────────────────────────────────────────────────
export const UPGRADE_MIN_USAGE_14D = 5;          // §12.2 "최근 14일 내 5회 이상 사용"
export const UPGRADE_MIN_COMPLETION_RATE = 0.70; // §12.2 "핵심 미션 완료율 70% 이상"
export const NEW_EPOCH_STABILIZATION_DAYS = 7;   // §12.2 "새 epoch 시작 직후 7일" = 유지

export interface ComplexitySignals {
  usageCount14d: number;
  coreMissionCompletionRate14d: number | null; // null = 데이터 부족
  aiUsageTrend: "decreasing" | "increasing" | "flat" | null;
  autonomousChoiceTrend: "increasing" | "flat" | "decreasing" | null;
  daysSinceEpochStart: number;
  /** "도움 요청 증가" — 직전 동일 길이 창 대비 최근 창의 scaffold_applied 수 */
  helpRequestCountRecent: number;
  helpRequestCountPrior: number;
  /** §12.2 원문에 수치 정의가 없는 정성적 신호 — 호출부 관찰 입력(임의 생성 금지) */
  repeatedConfusionObserved: boolean;
  excessivePlanningObserved: boolean;
  /** §12.2 "변동성 큼" — 원문에 수치 기준 없음. 호출부가 판단해 전달 */
  highVariability: boolean;
}

export type ComplexityDecision =
  | { action: "upgrade"; reason: "usage_and_completion_and_ai_trend" }
  | { action: "hold"; reason: "insufficient_data" | "high_variability" | "new_epoch_stabilization" | "no_trigger" }
  | { action: "downgrade"; reason: "help_request_increase" | "repeated_confusion" | "excessive_planning" };

export function evaluateComplexityTransition(sig: ComplexitySignals): ComplexityDecision {
  // §12.2 "새 epoch 시작 직후 7일"은 유지를 최우선한다 — 안정 관찰 기간
  if (sig.daysSinceEpochStart < NEW_EPOCH_STABILIZATION_DAYS) {
    return { action: "hold", reason: "new_epoch_stabilization" };
  }

  const helpRequestIncreased = sig.helpRequestCountRecent > sig.helpRequestCountPrior;
  if (sig.repeatedConfusionObserved) return { action: "downgrade", reason: "repeated_confusion" };
  if (sig.excessivePlanningObserved) return { action: "downgrade", reason: "excessive_planning" };
  if (helpRequestIncreased) return { action: "downgrade", reason: "help_request_increase" };

  if (sig.usageCount14d < UPGRADE_MIN_USAGE_14D || sig.coreMissionCompletionRate14d == null) {
    return { action: "hold", reason: "insufficient_data" };
  }
  if (sig.highVariability) return { action: "hold", reason: "high_variability" };

  const aiTrendOk = sig.aiUsageTrend === "decreasing" || sig.autonomousChoiceTrend === "increasing";
  if (sig.coreMissionCompletionRate14d >= UPGRADE_MIN_COMPLETION_RATE && aiTrendOk) {
    return { action: "upgrade", reason: "usage_and_completion_and_ai_trend" };
  }
  return { action: "hold", reason: "no_trigger" };
}

/**
 * Complexity 전이 적용 — Level의 상한(§12.3) 이하에서만 상향한다.
 * Level은 하향하지 않지만 Complexity는 하향할 수 있다.
 */
export function applyComplexityDecision(current: Complexity, level: Level, decision: ComplexityDecision): Complexity {
  const cap = complexityCapForLevel(level);
  if (decision.action === "hold") return current;
  if (decision.action === "downgrade") {
    const next = idx(current) - 1;
    return next < 0 ? current : ORDER[next];
  }
  // upgrade
  const next = Math.min(idx(cap), idx(current) + 1);
  return ORDER[next];
}

/**
 * §12.3 "Complexity는 학생에게 등급으로 노출하지 않는다" 가드.
 * 학생 화면 렌더 텍스트에 L1~L6 패턴이 있으면 예외를 던진다.
 */
export function assertComplexityNotExposedToStudent(renderedText: string): void {
  if (/\bL[1-6]\b/.test(renderedText)) {
    throw new Error("Complexity (L1~L6) must not be exposed to the student (PLANNER §12.3).");
  }
}
