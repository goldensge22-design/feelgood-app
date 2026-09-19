/**
 * STRATEGY ENGINE
 * LOGIC LAYER — LOVABLE MUST NOT EDIT
 *
 * §12: 자동 강제 금지. 학생이 선택·저장·재시험한다.
 *      근거 약화 시 '확정된 전략'이 아니라 '다시 시험해볼 전략'.
 *      타 학생 비교·우열 표시 금지. 실패한 전략도 삭제하지 않는다.
 */
import type { Discovery, LearnerContext, Strategy, StrategyStatus, StrategyType } from "./types";
import { findTemplate } from "./discoveryEngine";

export const STRATEGY_LABELS: Record<StrategyType, string> = {
  FIVE_MIN_START: "5-Minute Start",
  FIFTEEN_MIN_START: "15-Minute Start",
  BREAK_INTO_3: "Break Into 3",
  HARD_FIRST: "Hard First",
  RESET_TOMORROW: "Reset Tomorrow",
  FOCUS_25: "25-Min Focus",
  BUFFER_TIME: "Buffer Time",
};

/** 상태 전이 임계 — 근거 없는 전이를 막는다 */
export const FITS_ME_MIN_TRIALS = 5;
export const FITS_ME_MIN_RATIO = 0.6;
export const RETEST_WINDOW = 3;      // 최근 N회
export const RETEST_MAX_POSITIVE = 1; // 최근 N회 중 성공 이하이면 retest

export function candidateStrategiesFor(d: Discovery): StrategyType[] {
  const t = findTemplate(d.statement_template_id);
  return t ? t.strategyCandidates : [];
}

/** 학생 선택으로만 호출된다 */
export function saveStrategy(
  type: StrategyType, ctx: LearnerContext, sourceDiscoveryId: string | null, now = new Date()
): Strategy {
  return {
    strategy_id: `str_${type}_${now.getTime()}`,
    learner_id: ctx.learner_id,
    strategy_type: type,
    source_discovery_id: sourceDiscoveryId,
    status: "trying",
    trial_count: 0,
    positive_outcomes: 0,
    recent_outcomes: [],
    assessment_epoch_id: ctx.assessment_epoch_id,
    content_version: ctx.content_version,
    saved_at: now.toISOString(),
  };
}

/** 재시험 결과 반영 → 상태 자동 재평가. 삭제 상태는 존재하지 않는다 */
export function recordTrial(s: Strategy, positive: boolean): Strategy {
  const recent = [...s.recent_outcomes, positive].slice(-RETEST_WINDOW);
  const next: Strategy = {
    ...s,
    trial_count: s.trial_count + 1,
    positive_outcomes: s.positive_outcomes + (positive ? 1 : 0),
    recent_outcomes: recent,
  };
  return { ...next, status: evaluateStatus(next) };
}

export function evaluateStatus(s: Strategy): StrategyStatus {
  if (s.recent_outcomes.length >= RETEST_WINDOW) {
    const pos = s.recent_outcomes.filter(Boolean).length;
    if (pos <= RETEST_MAX_POSITIVE) return "retest";
  }
  if (s.trial_count >= FITS_ME_MIN_TRIALS && s.positive_outcomes / s.trial_count >= FITS_ME_MIN_RATIO) {
    return "fits_me";
  }
  return s.status === "fits_me" ? "fits_me" : "trying";
}

/** 상태 → 학생 노출 라벨 키. 문구 자체는 copyPack이 소유 */
export const STATUS_COPY_KEY: Record<StrategyStatus, string> = {
  fits_me: "strategy.status.fits_me",
  trying: "strategy.status.trying",
  retest: "strategy.status.retest",
};

/**
 * §12 자동 강제 금지 가드.
 * 시스템이 전략을 자동 적용하려 하면 예외를 던진다.
 */
export function applyStrategy(
  s: Strategy, appliedBy: "student" | "system"
): { strategy_id: string; appliedBy: "student" } {
  if (appliedBy !== "student") {
    throw new Error("Strategy must be applied by the student, never automatically (PLANNER §12).");
  }
  return { strategy_id: s.strategy_id, appliedBy };
}

/** 타 학생 비교 금지 가드 */
export function compareAcrossLearners(): never {
  throw new Error("Cross-learner strategy comparison is forbidden (PLANNER §12).");
}
