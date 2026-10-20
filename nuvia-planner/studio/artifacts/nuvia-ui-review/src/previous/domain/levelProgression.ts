/**
 * LEVEL 승급 규칙 — v1.3 §13 (PATCH 3, CR-3 CLOSED)
 * LOGIC LAYER — LOVABLE MUST NOT EDIT
 *
 * Level은 인지능력 등급이 아니라 PLANNER 내 자기관리 훈련 진행단계다.
 * Level은 하향하지 않는다(§13, §12.3).
 *
 * 조건 텍스트는 원문을 그대로 썼다. 이벤트/관찰 데이터로의 매핑 중
 * Level 1의 "관찰 데이터"만 원문에 별도 조작적 정의가 없어(다른 Level의
 * 조건은 모듈명이 명시돼 모호함이 없다) mission_completed 이벤트 수로
 * 매핑했다 — 이 한 곳만 매핑 해석이며 임의 수치가 아니다(문서 원문의
 * "4회 이상"을 그대로 쓴다).
 */
import type { Level, LearnerContext } from "./types";
import type { NuviaEvent } from "./events";
import type { Observation } from "./metrics";
import { MIN_OBSERVATIONS, METRIC_DOMAIN } from "./metrics";
import type { MetricKey } from "./types";
import { groupEventsByDay, isPlanningSessionDay } from "./dailyMetricAggregation";
import { computeAutonomyRatio } from "./autonomyRatio";

const DAY_MS = 86_400_000;

// ── §13.1 원문 조건 텍스트 (표시/감사용) ────────────────────────────────
export const LEVEL_CONDITION_TEXT: Record<Level, string> = {
  1: "Week 1 관찰 데이터 4회 이상",
  2: "Time/Start 예측 로그 5회 이상",
  3: "Priority 또는 Break It 포함 계획 세션 5회 이상",
  4: "Focus/중단복귀 데이터 5회 이상",
  5: "Reset 수행 3회 이상 + 재실행 2회 이상",
  6: "핵심 지표 3개 이상이 최근 4주간 안정 구간 + (①Autonomy Ratio≥0.70 또는 ②학생이 Self-Manager 모드 직접 선택)",
};

export interface LevelConditionResult {
  met: boolean;
  detail: Record<string, number | boolean | null>;
}

/** Level 2 (§13.1): Time/Start 예측 로그 5회 이상 */
function evalLevel2(observations: Observation[], epochId: string): LevelConditionResult {
  const count = observations.filter(
    (o) => !o.missing && o.epoch_id === epochId &&
      (o.metric === "time_prediction_accuracy" || o.metric === "start_accuracy")
  ).length;
  return { met: count >= 5, detail: { count } };
}

/** Level 3 (§13.1): Priority 또는 Break It 포함 계획 세션 5회 이상 */
function evalLevel3(events: readonly NuviaEvent[]): LevelConditionResult {
  const days = groupEventsByDay(events);
  let count = 0;
  for (const d of days.values()) if (isPlanningSessionDay(d)) count += 1;
  return { met: count >= 5, detail: { count } };
}

/** Level 4 (§13.1): Focus/중단복귀 데이터 5회 이상 */
function evalLevel4(observations: Observation[], epochId: string): LevelConditionResult {
  const count = observations.filter((o) => !o.missing && o.epoch_id === epochId && o.metric === "focus_stability").length;
  return { met: count >= 5, detail: { count } };
}

/** Level 5 (§13.1): Reset 수행 3회 이상 + 재실행 2회 이상 */
function evalLevel5(events: readonly NuviaEvent[]): LevelConditionResult {
  const resetCount = events.filter((e) => e.event_type === "reset_created").length;
  const restartCount = events.filter(
    (e) => e.event_type === "reset_followup" && (e.payload as any).restarted_within_24h === true
  ).length;
  return { met: resetCount >= 3 && restartCount >= 2, detail: { resetCount, restartCount } };
}

/** Level 1 (§13.1): Week 1 관찰 데이터 4회 이상. epoch 시작 후 첫 7일. */
function evalLevel1(events: readonly NuviaEvent[], epochStartedAt: string, now: Date): LevelConditionResult {
  const weekEnd = new Date(new Date(epochStartedAt).getTime() + 7 * DAY_MS);
  const count = events.filter(
    (e) => e.event_type === "mission_completed" &&
      e.occurred_at >= epochStartedAt && e.occurred_at < weekEnd.toISOString() && e.occurred_at <= now.toISOString()
  ).length;
  return { met: count >= 4, detail: { count } };
}

const GROWTH_METRIC_KEYS: MetricKey[] = Object.keys(METRIC_DOMAIN) as MetricKey[];
const STABLE_WINDOW_WEEKS = 4;
const STABLE_MAX_SPREAD = 0.10; // §13.1 "최대-최소 차이가 0.10 이하"
const STABLE_MIN_METRIC_COUNT = 3; // §13.1 "핵심 지표 3개 이상"

interface WeekBucket { from: string; to: string; }

function weekBuckets(now: Date): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  for (let i = STABLE_WINDOW_WEEKS; i >= 1; i--) {
    const to = new Date(now.getTime() - (i - 1) * 7 * DAY_MS);
    const from = new Date(now.getTime() - i * 7 * DAY_MS);
    buckets.push({ from: from.toISOString(), to: to.toISOString() });
  }
  return buckets;
}

/** §13.1 "안정 구간" — 최근 4주 주간평균 최대-최소 ≤0.10, 각 주가 해당 지표 최소관찰수 충족 */
export function isMetricStable(metric: MetricKey, observations: Observation[], epochId: string, now: Date): boolean {
  const min = MIN_OBSERVATIONS[metric];
  const weeklyAverages: number[] = [];
  for (const w of weekBuckets(now)) {
    const inWeek = observations.filter(
      (o) => !o.missing && o.metric === metric && o.epoch_id === epochId &&
        o.occurred_at >= w.from && o.occurred_at < w.to
    );
    if (inWeek.length < min) return false; // 한 주라도 최소관찰수 미충족이면 불안정
    weeklyAverages.push(inWeek.reduce((a, o) => a + o.value, 0) / inWeek.length);
  }
  const spread = Math.max(...weeklyAverages) - Math.min(...weeklyAverages);
  return spread <= STABLE_MAX_SPREAD;
}

export interface Level6Detail {
  stableMetricCount: number;
  stableMetrics: MetricKey[];
  autonomyRatio: number | null;
  autonomyPathMet: boolean;       // ① Autonomy Ratio ≥0.70 (최근 4주)
  studentSelectedPathMet: boolean; // ② 학생이 직접 Self-Manager 모드 선택
}

/**
 * Level 6 (§13.1 + §13.2/M-7): 핵심 지표 3개 이상 안정 + (①또는②).
 * Autonomy Ratio는 §13.2에 따라 "단독" 조건이 아니라 ①·② 중 하나로만
 * 쓰인다 — ②(studentSelectedSelfManager)는 UI에 아직 전용 진입점이
 * 없어 호출부가 명시적으로 전달하는 입력으로 받는다(임의 자동판정 금지).
 */
export function evalLevel6(
  observations: Observation[], events: readonly NuviaEvent[], epochId: string, now: Date,
  studentSelectedSelfManager: boolean
): LevelConditionResult & { detail6: Level6Detail } {
  const stableMetrics = GROWTH_METRIC_KEYS.filter((k) => isMetricStable(k, observations, epochId, now));
  const stableMetricCount = stableMetrics.length;

  const window = { from: new Date(now.getTime() - STABLE_WINDOW_WEEKS * 7 * DAY_MS).toISOString(), to: now.toISOString() };
  const ar = computeAutonomyRatio(events, window);
  const autonomyPathMet = ar.ratio != null && ar.ratio >= 0.70;

  const met = stableMetricCount >= STABLE_MIN_METRIC_COUNT && (autonomyPathMet || studentSelectedSelfManager);
  const detail6: Level6Detail = {
    stableMetricCount, stableMetrics, autonomyRatio: ar.ratio,
    autonomyPathMet, studentSelectedPathMet: studentSelectedSelfManager,
  };
  return { met, detail: { stableMetricCount, autonomyRatio: ar.ratio, autonomyPathMet, studentSelectedPathMet: studentSelectedSelfManager }, detail6 };
}

export interface LevelEvaluationInput {
  ctx: LearnerContext;
  events: readonly NuviaEvent[];
  observations: Observation[];
  now: Date;
  studentSelectedSelfManager?: boolean;
}

export interface LevelEvaluation {
  currentLevel: Level;
  /** 다음 Level 조건이 충족되면 currentLevel+1, 아니면 currentLevel (하향 없음, §13) */
  nextLevel: Level;
  conditionChecked: Level | null;
  result: LevelConditionResult | null;
}

/**
 * 현재 Level의 "다음 단계" 조건만 평가한다(§13은 순차 승급 표이며 단계를
 * 건너뛰는 조건을 정의하지 않는다). Level은 절대 하향 반환하지 않는다.
 */
export function evaluateLevelPromotion(input: LevelEvaluationInput): LevelEvaluation {
  const { ctx, events, observations, now } = input;
  const current = ctx.level;
  if (current >= 6) return { currentLevel: current, nextLevel: current, conditionChecked: null, result: null };

  const target = (current + 1) as Level;
  let result: LevelConditionResult;
  switch (target) {
    case 1: result = evalLevel1(events, ctx.epoch_started_at, now); break;
    case 2: result = evalLevel2(observations, ctx.assessment_epoch_id); break;
    case 3: result = evalLevel3(events); break;
    case 4: result = evalLevel4(observations, ctx.assessment_epoch_id); break;
    case 5: result = evalLevel5(events); break;
    case 6: result = evalLevel6(observations, events, ctx.assessment_epoch_id, now, input.studentSelectedSelfManager ?? false); break;
    default: result = { met: false, detail: {} };
  }

  return {
    currentLevel: current,
    nextLevel: result.met ? target : current, // 하향 없음 — 미충족 시 현재 유지
    conditionChecked: target,
    result,
  };
}
