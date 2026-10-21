/**
 * WEEKLY BOSS
 * LOGIC LAYER — LOVABLE MUST NOT EDIT
 *
 * §16 FROZEN 규칙 (PATCH 2, 사용자 확인 완료):
 *   baseline = 직전 2주 해당 지표 평균
 *   target   = baseline + 0.05, 상한 0.90
 *   횟수형   = baseline 빈도 + 1회
 *   최소관찰수 부족 = 관찰 주간
 *   2주 연속 미달   = baseline + 0.02
 */
import type { BossType, LearnerContext, MetricKey, ModuleId, WeeklyBoss, WeeklyState } from "./types";
import { MIN_OBSERVATIONS } from "./metrics";
import type { Observation } from "./metrics";

export const BOSS_METRIC: Record<BossType, MetricKey> = {
  TIME: "time_prediction_accuracy",
  START: "start_accuracy",
  FOCUS: "focus_stability",
  RECOVERY: "recovery_skill",
  OVERPLANNING: "planning_accuracy",
};

export const BOSS_MODULE: Record<BossType, ModuleId> = {
  TIME: "TIME_SENSE",
  START: "START_NOW",
  FOCUS: "FOCUS_MISSION",
  RECOVERY: "RESET",
  OVERPLANNING: "PLAN_VS_REALITY",
};

export const BOSS_COPY_KEY: Record<BossType, string> = {
  TIME: "boss.time", START: "boss.start", FOCUS: "boss.focus",
  RECOVERY: "boss.recovery", OVERPLANNING: "boss.overplanning",
};

// ── PATCH 2 확정 상수 (§16) ─────────────────────────────────────────────
export type BossMetricValueType = "ratio" | "count";

/**
 * 현재 5개 Boss 지표는 modules.ts에서 전부 0..1 ratio로 산출된다.
 * "횟수형"(count) 분류가 실제로 어느 Boss에 해당하는지는 원문에 지목되어
 * 있지 않으므로 임의로 하나를 count로 지정하지 않는다. 향후 원시 횟수
 * 기반 Boss가 추가되면 이 표에서 "count"로 등록하면 된다(로직은 이미 지원).
 */
export const BOSS_METRIC_VALUE_TYPE: Record<BossType, BossMetricValueType> = {
  TIME: "ratio", START: "ratio", FOCUS: "ratio", RECOVERY: "ratio", OVERPLANNING: "ratio",
};

const BASELINE_WINDOW_DAYS = 14;      // 직전 2주
const RATIO_TARGET_DELTA = 0.05;      // target = baseline + 0.05
const RATIO_TARGET_CAP = 0.90;        // 상한
const RATIO_MISS_STREAK_DELTA = 0.02; // 2주 연속 미달 = baseline + 0.02
const COUNT_TARGET_DELTA = 1;         // 횟수형 = baseline 빈도 + 1회

function windowBounds(weekStart: string): { from: string; to: string } {
  const end = new Date(weekStart);
  const start = new Date(end.getTime() - BASELINE_WINDOW_DAYS * 86_400_000);
  return { from: start.toISOString(), to: end.toISOString() };
}

export interface BaselineResult { baseline: number; windowCount: number; }

/** baseline = 직전 2주 해당 지표 평균 (ratio) / 2주간 발생 횟수의 주당 평균 빈도 (count) */
export function computeBossBaseline(
  observations: Observation[], metric: MetricKey, weekStart: string, valueType: BossMetricValueType
): BaselineResult {
  const w = windowBounds(weekStart);
  const scoped = observations.filter(
    (o) => o.metric === metric && !o.missing && o.occurred_at >= w.from && o.occurred_at < w.to
  );
  if (valueType === "ratio") {
    const baseline = scoped.length === 0 ? 0 : scoped.reduce((a, o) => a + o.value, 0) / scoped.length;
    return { baseline, windowCount: scoped.length };
  }
  // count — 2주간 관찰된 발생 횟수를 주당 평균 빈도로 환산
  return { baseline: scoped.length / 2, windowCount: scoped.length };
}

export interface TargetResult { target: number; relaxed: boolean; }

/** target = baseline + 0.05 (상한 0.90) / 횟수형 baseline + 1회 / 2주 연속 미달 시 +0.02 */
export function computeBossTarget(
  baseline: number, valueType: BossMetricValueType, previousMissStreak: number
): TargetResult {
  const relaxed = previousMissStreak >= 2;
  if (valueType === "ratio") {
    const delta = relaxed ? RATIO_MISS_STREAK_DELTA : RATIO_TARGET_DELTA;
    return { target: Math.min(RATIO_TARGET_CAP, baseline + delta), relaxed };
  }
  // count형의 2주 연속 미달 완화율은 원문에 별도 수치가 없어 baseline+1을 유지한다.
  return { target: baseline + COUNT_TARGET_DELTA, relaxed };
}

export interface BossCandidate {
  boss_type: BossType;
  metric_key: MetricKey;
  observation_count: number;
  sufficient: boolean;
  copy_key: string;
}

/** AI는 후보만 만든다. 최대 2개 추천 (§16) */
export function buildBossCandidates(
  observationCounts: Partial<Record<MetricKey, number>>,
  max = 2
): BossCandidate[] {
  const all = (Object.keys(BOSS_METRIC) as BossType[]).map((t) => {
    const mk = BOSS_METRIC[t];
    const count = observationCounts[mk] ?? 0;
    return {
      boss_type: t, metric_key: mk, observation_count: count,
      sufficient: count >= MIN_OBSERVATIONS[mk], copy_key: BOSS_COPY_KEY[t],
    };
  });
  return all.filter((c) => c.sufficient).slice(0, max);
}

/** 후보가 하나도 없으면 관찰 주간 (§16) */
export function isObservationWeek(candidates: BossCandidate[]): boolean {
  return candidates.length === 0;
}

/** 관찰 주간 화면의 해금 조건 — 결핍이 아니라 행동 가능한 조건으로 표현 */
export function unlockRequirements(
  observationCounts: Partial<Record<MetricKey, number>>
): { metric: MetricKey; remaining: number }[] {
  return (Object.values(BOSS_METRIC) as MetricKey[])
    .map((mk) => ({ metric: mk, remaining: Math.max(0, MIN_OBSERVATIONS[mk] - (observationCounts[mk] ?? 0)) }))
    .filter((r) => r.remaining > 0)
    .sort((a, b) => a.remaining - b.remaining)
    .slice(0, 3);
}

/**
 * 학생 선택으로만 생성된다 (§16). AI 확정 경로 없음.
 * baseline/target은 직전 2주 관찰창 기준으로 계산한다 — 전체 기간 평균이 아니다.
 */
export function selectBoss(
  type: BossType, observations: Observation[], ctx: LearnerContext,
  weekStart: string, previousMissStreak = 0
): WeeklyBoss {
  const mk = BOSS_METRIC[type];
  const valueType = BOSS_METRIC_VALUE_TYPE[type];
  const { baseline, windowCount } = computeBossBaseline(observations, mk, weekStart, valueType);

  if (windowCount < MIN_OBSERVATIONS[mk]) {
    throw new Error(`Boss requires min observations for ${mk} within the 2-week window (PLANNER §16).`);
  }

  const { target, relaxed } = computeBossTarget(baseline, valueType, previousMissStreak);

  return {
    boss_id: `boss_${type}_${weekStart}`,
    boss_type: type, metric_key: mk, baseline, target,
    selected_by: "student", week_start: weekStart,
    assessment_epoch_id: ctx.assessment_epoch_id,
    consecutive_miss_count: previousMissStreak,
    target_relaxed: relaxed,
  };
}

export type BossOutcome = "record_kept" | "target_reached";

/** 목표 미달을 실패로 표현하지 않는다 (§16) */
export function evaluateBossWeek(w: WeeklyState): { outcome: BossOutcome; achievedValue: number | null } {
  if (!w.boss || w.records.length === 0) return { outcome: "record_kept", achievedValue: null };
  const avg = w.records.reduce((a, r) => a + r.value, 0) / w.records.length;
  return { outcome: avg >= w.boss.target ? "target_reached" : "record_kept", achievedValue: avg };
}

/** '실패' 라벨을 만들지 못하도록 하는 가드 */
export function bossFailureLabel(): never {
  throw new Error("Weekly Boss has no failure label — use '이번 주 도전 기록' (PLANNER §16).");
}
