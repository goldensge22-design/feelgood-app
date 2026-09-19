/**
 * 7개 TRAINING MODULE — v1.3 원형 보존 + §14 확정 산식 구현 (PATCH 1)
 * LOGIC LAYER — LOVABLE MUST NOT EDIT
 *
 * 각 모듈은 (1) 입력 검증 (2) 관찰 산출 (3) Gap 표현 규칙 을 소유한다.
 * 성공/실패 라벨을 만들지 않는다 (§9 PLAN vs REALITY, §17).
 *
 * 이 파일의 *Value() 함수들은 v1.3 PLANNER PRODUCT SPECIFICATION §14.1의
 * 산식을 문자 그대로 구현한 "인스턴스 값"(미션 1건 또는 Reset 1건당 값)이다.
 * 여러 인스턴스를 하나의 표시 지표로 묶는 방법(=산술평균, §14.1이 별도
 * 집계식을 명시하지 않아 관찰수 개념과 정합하는 최소 가정)은 metrics.ts가
 * 담당한다. 일(day) 단위 산식(Completion Reliability, Planning Accuracy,
 * Plan-Order Consistency, Metacognitive Accuracy)은 dailyMetricAggregation.ts로
 * 분리했다 — 이 넷은 "최소 관찰수"가 "일"(day) 단위이기 때문이다.
 */
import { FOCUS_LENGTHS } from "./types";
import type { FocusLength, Mission, ModuleId, OrderReason, MetricKey } from "./types";

export interface ModuleDefinition {
  id: ModuleId;
  /** 이 모듈이 기여하는 Growth 지표. null = Growth 아님 */
  metric: MetricKey | null;
  /** Growth가 아닌 관찰만 산출하는 모듈 표시 (§14.1) */
  observationOnly: boolean;
  copyKey: string;
}

export const MODULES: Record<ModuleId, ModuleDefinition> = {
  TIME_SENSE:      { id: "TIME_SENSE",      metric: "time_prediction_accuracy", observationOnly: false, copyKey: "module.time_sense" },
  PRIORITY:        { id: "PRIORITY",        metric: "plan_order_consistency",   observationOnly: false, copyKey: "module.priority" },
  BREAK_IT:        { id: "BREAK_IT",        metric: null,                       observationOnly: true,  copyKey: "module.break_it" },
  FOCUS_MISSION:   { id: "FOCUS_MISSION",   metric: "focus_stability",          observationOnly: false, copyKey: "module.focus_mission" },
  START_NOW:       { id: "START_NOW",       metric: "start_accuracy",           observationOnly: false, copyKey: "module.start_now" },
  PLAN_VS_REALITY: { id: "PLAN_VS_REALITY", metric: "planning_accuracy",        observationOnly: false, copyKey: "module.plan_vs_reality" },
  RESET:           { id: "RESET",           metric: "recovery_skill",           observationOnly: false, copyKey: "module.reset" },
};

/** §14.3 — 계산 후 0~1 클램프, 클램프 발생 여부를 함께 반환한다 */
export interface ClampedValue { value: number; clamped: boolean; }
function clamp01(v: number): ClampedValue {
  if (v < 0) return { value: 0, clamped: true };
  if (v > 1) return { value: 1, clamped: true };
  return { value: v, clamped: false };
}

/** §8.1 — duration_source가 없거나 "none"이면 결측 처리(산식에서 제외) */
function hasUsableDuration(m: Mission): boolean {
  return m.duration_source === "timer" || m.duration_source === "manual_recall";
}

// ── 1. TIME SENSE ───────────────────────────────────────────────────────
export interface TimeGap { predicted: number; actual: number; gapMinutes: number; direction: "longer" | "shorter" | "match"; }

export function timeSenseGap(m: Mission): TimeGap | null {
  if (m.predicted_minutes == null || m.actual_minutes == null) return null;
  const gap = m.actual_minutes - m.predicted_minutes;
  return {
    predicted: m.predicted_minutes,
    actual: m.actual_minutes,
    gapMinutes: gap,
    direction: Math.abs(gap) <= 2 ? "match" : gap > 0 ? "longer" : "shorter",
  };
}

/**
 * §14.1 Time Prediction Accuracy — 순수 산식(예상/실제 분, duration_source).
 * dailyMetricAggregation.ts가 이벤트 payload에서 재구성한 값에도 동일하게 쓴다.
 */
export function timeAccuracyFromValues(
  predictedMinutes: number | null, actualMinutes: number | null, durationSource: Mission["duration_source"]
): ClampedValue | null {
  if (predictedMinutes == null || actualMinutes == null) return null;
  if (durationSource !== "timer" && durationSource !== "manual_recall") return null;
  const denom = Math.max(actualMinutes, predictedMinutes, 5);
  const raw = 1 - Math.abs(actualMinutes - predictedMinutes) / denom;
  return clamp01(raw);
}

/**
 * §14.1 Time Prediction Accuracy (인스턴스, 분 단위):
 *   1 − │actual − predicted│ ÷ max(actual, predicted, 5분)
 * duration_source가 none/미기록이면 결측(null).
 */
export function timeSenseAccuracyValue(m: Mission): ClampedValue | null {
  return timeAccuracyFromValues(m.predicted_minutes, m.actual_minutes, m.duration_source);
}

// ── 2. PRIORITY ─────────────────────────────────────────────────────────
export const ORDER_REASONS: OrderReason[] = ["finish_fast", "hard_first", "deadline_close"];

/** AI가 순서를 미리 채우지 않는다 — 고려요소만 (§9) */
export const PRIORITY_CONSIDERATIONS = ["deadline_near", "takes_long", "focus_available"] as const;

/**
 * §14.1 Plan-Order Consistency (일 단위 인스턴스):
 *   (Spearman 순위상관 ρ + 1) ÷ 2
 * 확정 계획 과제 3개 이상인 날만 계산(게이트는 호출부 책임).
 * 미수행 과제는 순위 계산에서 제외한다 — planned와 actual의 교집합만 사용.
 * 교집합 원소가 2개 미만이면 상관계수를 정의할 수 없어 결측(null).
 */
export function spearmanPlanOrderConsistency(planned: string[], actual: string[]): ClampedValue | null {
  const actualSet = new Set(actual);
  const intersecting = planned.filter((id) => actualSet.has(id));
  const n = intersecting.length;
  if (n < 2) return null;

  // planned 내 순서로 0..n-1 랭크 부여
  const plannedRank = new Map<string, number>();
  intersecting.forEach((id, i) => plannedRank.set(id, i));

  // actual을 intersecting으로 제한한 뒤 그 안에서 다시 0..n-1 랭크 부여
  const actualRestricted = actual.filter((id) => plannedRank.has(id));
  const actualRank = new Map<string, number>();
  actualRestricted.forEach((id, i) => actualRank.set(id, i));

  let sumSqD = 0;
  for (const id of intersecting) {
    const d = plannedRank.get(id)! - actualRank.get(id)!;
    sumSqD += d * d;
  }
  const rho = 1 - (6 * sumSqD) / (n * (n * n - 1));
  return clamp01((rho + 1) / 2);
}

// ── 3. BREAK IT (Growth 점수 금지) ──────────────────────────────────────
export const BREAKDOWN_MIN = 2;
export const BREAKDOWN_MAX = 7;

export function validateBreakdown(subtasks: string[]): { ok: boolean; reason?: string } {
  const filled = subtasks.filter((s) => s.trim().length > 0);
  if (filled.length < BREAKDOWN_MIN) return { ok: false, reason: "too_few" };
  if (filled.length > BREAKDOWN_MAX) return { ok: false, reason: "too_many" };
  return { ok: true };
}

/**
 * §14.1 Task Breakdown Observation — Growth 점수로 산출하지 않는다.
 * step_count / sequence_follow_rate / completion_rate는 기존 데이터 모델에서
 * 산출한다. duration_coverage(예상시간 입력 단계 비율)는 단계별 예상시간을
 * 별도 입력받는 데이터 모델이 아직 없어(Mission.subtasks는 문자열 배열)
 * 이번 패치 범위에서 산출하지 않는다 — 값을 지어내지 않고 undefined로 둔다.
 */
export function taskBreakdownObservation(m: Mission) {
  return {
    mission_id: m.mission_id,
    step_count: m.subtasks.length,
    duration_coverage: undefined as number | undefined, // 데이터 모델 확장 필요(별도 범위)
    sequence_follow_rate: null as number | null,          // 단계별 실행 순서 로그 필요(별도 범위)
    completion_rate: m.completed ? 1 : 0,
    isGrowthMetric: false as const,
  };
}

// ── 4. FOCUS MISSION ────────────────────────────────────────────────────
export function isValidFocusLength(n: number): n is FocusLength {
  return (FOCUS_LENGTHS as readonly number[]).includes(n);
}

/**
 * §14.1 Focus Stability (인스턴스):
 *   min(실제 유지시간 ÷ 목표 집중시간, 1) × [1 ÷ (1 + 0.25 × interruption_count)]
 * 복귀 가산점 없음 — 복귀는 Recovery Skill에서 별도 평가.
 */
export function focusStabilityValue(m: Mission): ClampedValue | null {
  if (m.focus_length == null || m.actual_minutes == null) return null;
  if (!hasUsableDuration(m)) return null;
  const durationRatio = Math.min(m.actual_minutes / m.focus_length, 1);
  const raw = durationRatio * (1 / (1 + 0.25 * m.interruptions));
  return clamp01(raw);
}

// ── 5. START NOW ────────────────────────────────────────────────────────
export const FIVE_MINUTE_START = 5;

/** 지연(분). 음수(조기 착수)도 그대로 반환 — 오차 산식에서 별도 처리 */
export function startDelayMinutes(m: Mission): number | null {
  if (!m.scheduled_start || !m.actual_start) return null;
  return (new Date(m.actual_start).getTime() - new Date(m.scheduled_start).getTime()) / 60_000;
}

/**
 * §14.1 / M-2 Start Accuracy (인스턴스, 비대칭):
 *   1 − min( max(actual_start − planned_start, 0) ÷ 60분, 1 )
 * 조기 착수(delay<0)는 max(...,0)=0이 되어 오차로 처리하지 않는다.
 */
export function startAccuracyValue(m: Mission): ClampedValue | null {
  const d = startDelayMinutes(m);
  if (d == null) return null;
  const raw = 1 - Math.min(Math.max(d, 0) / 60, 1);
  return clamp01(raw);
}

// ── 6. PLAN vs REALITY (일 단위 지표는 dailyMetricAggregation.ts로 이동) ──
export interface PlanRealityGap { plannedCount: number; completedCount: number; gapCount: number; }

/** 성공/실패 대신 Gap. 달성률 %를 성취 점수로 강조하지 않는다 (§9) */
export function planRealityGap(missions: Mission[]): PlanRealityGap {
  const completed = missions.filter((m) => m.completed).length;
  return { plannedCount: missions.length, completedCount: completed, gapCount: missions.length - completed };
}

// ── 7. RESET ────────────────────────────────────────────────────────────
export type ResetReason = "ran_out_of_time" | "plan_too_big" | "interrupted" | "other";

export interface ResetRecord {
  reset_id: string;
  created_at: string;
  reason: ResetReason;
  scope: "day" | "mission";
  restarted_within_24h: boolean | null;
}

/**
 * §14.1 Recovery Skill (인스턴스, Reset 1건당 0 또는 1):
 *   Reset 후 24시간 내 재실행 여부.
 * 미해결(restarted_within_24h===null)인 Reset은 결측으로 제외한다.
 */
export function recoverySkillInstanceValue(r: ResetRecord): number | null {
  return r.restarted_within_24h === null ? null : (r.restarted_within_24h ? 1 : 0);
}

/** 전체 집계 편의 함수(§14.1 "Reset 후 24시간 내 재실행 수 ÷ Reset 대상 과제 수"와 수학적으로 동일 — 동일 가중치 인스턴스 평균) */
export function recoverySkillValue(resets: ResetRecord[]): number | null {
  const resolved = resets.map(recoverySkillInstanceValue).filter((v): v is number => v !== null);
  if (resolved.length === 0) return null;
  return resolved.reduce((a, b) => a + b, 0) / resolved.length;
}

/** GAME OVER 상태는 존재하지 않는다 (§17) */
export const TERMINAL_FAILURE_STATES: never[] = [];
