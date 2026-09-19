/**
 * GROWTH METRIC 연결 계층 — v1.3 §14 확정 (PATCH 1, CR-2 CLOSED)
 * LOGIC LAYER — LOVABLE MUST NOT EDIT
 *
 * 인스턴스 산식 본체는 modules.ts(미션/Reset 단위)와
 * dailyMetricAggregation.ts(일 단위)가 §14.1 원문 그대로 구현한다.
 * 이 파일은 §14.1이 명시하지 않은 "여러 인스턴스를 하나의 표시값으로
 * 묶는 방법"만 담당하며, 관찰수와 정합하는 최소 가정인 산술평균을 쓴다
 * (각 인스턴스가 §14.1의 "최소 관찰수" 단위 1개에 대응하도록 이미
 * modules.ts/dailyMetricAggregation.ts에서 만들었으므로, 동일 가중치
 * 평균이 "완료 수÷전체 수" 같은 풀링비율과 수학적으로 동치가 된다).
 * 그 외 (a) 최소관찰수 게이트 (b) epoch 경계 (c) 결측 처리 (d) 클램프
 * 재확인을 구현한다.
 */
import type { MetricKey, MetricResult, GrowthDomain, ObservationKey } from "./types";
import type { NuviaEvent } from "./events";

/** §14.1 표 — 최소 관찰수. 변경 금지 */
export const MIN_OBSERVATIONS: Record<MetricKey, number> = {
  time_prediction_accuracy: 5,
  start_accuracy: 5,
  planning_accuracy: 5,       // 단위: 일
  completion_reliability: 5,  // 단위: 일
  focus_stability: 5,
  recovery_skill: 3,          // 단위: Reset
  plan_order_consistency: 5,  // 단위: 일
  metacognitive_accuracy: 5,
};

/** §14.1 표 — Growth 아님. 학생 점수화·노출 금지 */
export const OBSERVATION_ONLY: Record<ObservationKey, number> = {
  task_breakdown_observation: 3, // 큰 과제 단위
  autonomy_ratio: 0,             // §14.2 — 자체 게이트 없음, 관찰·연구용
};

export const METRIC_DOMAIN: Record<MetricKey, GrowthDomain> = {
  time_prediction_accuracy: "metacognitive",
  metacognitive_accuracy: "metacognitive",
  start_accuracy: "self_regulation",
  planning_accuracy: "self_regulation",
  completion_reliability: "self_regulation",
  focus_stability: "self_regulation",
  recovery_skill: "self_regulation",
  plan_order_consistency: "self_regulation",
};

export interface Observation {
  metric: MetricKey;
  /** §14.1 인스턴스 값(이미 0~1로 클램프됨) */
  value: number;
  occurred_at: string;
  epoch_id: string;
  source_event_id: string;
  missing?: boolean;   // 결측 표기 — v1.3 §14.3 결측처리 규칙 적용 대상
  clamped?: boolean;   // §14.3 — 이 인스턴스 계산에서 클램프가 발생했는가
}

export interface ComputeOptions {
  epochId: string;               // 단일 epoch만. 경계 합산 금지 (CORE §5)
  window?: { from: string; to: string };
  previousValue?: number | null; // trend 판정용 (동일 epoch 내부에서만)
}

export function computeMetric(
  key: MetricKey,
  observations: Observation[],
  opts: ComputeOptions
): MetricResult {
  const min = MIN_OBSERVATIONS[key];

  // (b) epoch 경계 — 다른 epoch 관찰은 아예 제외한다 (CORE §5)
  let scoped = observations.filter((o) => o.metric === key && o.epoch_id === opts.epochId);

  if (opts.window) {
    scoped = scoped.filter(
      (o) => o.occurred_at >= opts.window!.from && o.occurred_at <= opts.window!.to
    );
  }

  // (c) 결측 처리 — 결측 관찰은 관찰수에 산입하지 않는다 (§14.3)
  const valid = scoped.filter((o) => !o.missing);
  const count = valid.length;

  // (a) 최소관찰수 게이트 — 미충족 시 "관찰 중", 값 미생성 (§14.3)
  if (count < min) {
    return {
      key, domain: METRIC_DOMAIN[key], state: "insufficient",
      observation_count: count, min_observations: min, value: null, trend: null, clamped: false,
    };
  }

  const rawMean = valid.reduce((a, o) => a + o.value, 0) / count;
  // (d) 최종 집계값도 방어적으로 재클램프 — 인스턴스가 이미 0~1이므로
  // 평균도 이론상 0~1이지만 §14.3 "모든 지표는 계산 후 0~1로 클램프"를
  // 집계 단계에서도 명시적으로 지킨다.
  const clampedNow = rawMean < 0 || rawMean > 1;
  const value = rawMean < 0 ? 0 : rawMean > 1 ? 1 : rawMean;
  const anyInstanceClamped = valid.some((o) => o.clamped);

  let trend: MetricResult["trend"] = null;
  if (opts.previousValue != null) {
    const d = value - opts.previousValue;
    trend = Math.abs(d) < 0.02 ? "flat" : d > 0 ? "up" : "down";
  }

  return {
    key, domain: METRIC_DOMAIN[key], state: "sufficient",
    observation_count: count, min_observations: min, value, trend,
    clamped: clampedNow || anyInstanceClamped,
  };
}

/** 남은 관찰 횟수 — Anticipation UX의 유일한 근거 (§1.4) */
export function remainingObservations(key: MetricKey, count: number): number {
  return Math.max(0, MIN_OBSERVATIONS[key] - count);
}

/**
 * 총점 생성 금지 (§34). 이 함수는 호출되면 예외를 던진다.
 * 존재 이유: 누군가 총점을 만들려 할 때 컴파일/런타임에서 막기 위함.
 */
export function computeUnifiedTotalScore(): never {
  throw new Error("Unified Total Score is forbidden (PLANNER v1.4 §34).");
}

/** 이벤트 → 관찰 변환 (모듈별 규칙은 modules.ts/dailyMetricAggregation.ts가 제공) */
export function observationFromEvent(
  e: NuviaEvent, metric: MetricKey, value: number, epochId: string, missing = false, clamped = false
): Observation {
  return {
    metric, value, occurred_at: e.occurred_at, epoch_id: epochId,
    source_event_id: e.event_id, missing, clamped,
  };
}
