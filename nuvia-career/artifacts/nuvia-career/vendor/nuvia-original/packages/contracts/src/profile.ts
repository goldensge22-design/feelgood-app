/**
 * 지원·강점 순서 결정과 workspace 범위 키.
 *
 * 출처: docs/NUVIA_PLANNER_RESULT_SERVER_INTEGRATION.md §5·§7,
 *       docs/NUVIA_PLANNER_FINAL_RULES_v3.1.md §4.2·§4.3
 *
 * 결과지가 보낸 공식 순서가 코드의 고정 영역 순서보다 항상 우선한다(§8-4).
 * 공식 순서가 없을 때만 안전한 fallback 을 쓰고, fallback 을 썼다는 사실을 호출자가 알 수 있게 한다.
 */

import {
  AXIS_IDS,
  type AssessmentPayload,
  type AxisId,
} from "./assessment.js";

/**
 * 순서의 출처.
 * - declared: 결과지가 보낸 공식 순서를 그대로 썼다.
 * - value_ascending / value_descending: 같은 단위의 표시값이 네 영역에 다 있어 값 순서로 정했다.
 * - stable_id: 단위가 섞였거나 값이 없어 안정 ID 순서로 안전하게 처리했다.
 */
export type OrderSource =
  | "declared"
  | "value_ascending"
  | "value_descending"
  | "stable_id";

export interface OrderResolution {
  order: AxisId[];
  source: OrderSource;
  /** 공식 순서가 없어 fallback 을 쓴 경우. 서버 보완 로그를 남긴다(규칙 §4.2). */
  needsServerFallbackLog: boolean;
}

/** 네 영역의 표시값이 모두 있고 단위가 하나로 같을 때만 값 비교가 가능하다. */
function comparableValues(
  assessment: AssessmentPayload,
): Record<AxisId, number> | null {
  const values = {} as Record<AxisId, number>;
  let unit: string | undefined;
  for (const axis of AXIS_IDS) {
    const score = assessment.axes[axis];
    if (score === undefined) return null;
    const value = (score as { value?: number }).value;
    const axisUnit = (score as { unit?: string }).unit;
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    if (typeof axisUnit !== "string") return null;
    if (unit === undefined) unit = axisUnit;
    else if (unit !== axisUnit) return null;
    values[axis] = value;
  }
  return values;
}

/** 값 순서로 정렬한다. 동점은 안정 ID 순서로 고정한다. */
function sortByValue(
  values: Record<AxisId, number>,
  direction: 1 | -1,
): AxisId[] {
  return [...AXIS_IDS].sort((a, b) => {
    const diff = (values[a] - values[b]) * direction;
    if (diff !== 0) return diff;
    return AXIS_IDS.indexOf(a) - AXIS_IDS.indexOf(b);
  });
}

function resolveOrder(
  declared: AxisId[] | undefined,
  assessment: AssessmentPayload,
  direction: 1 | -1,
): OrderResolution {
  if (declared && declared.length > 0) {
    // 공식 순서는 그대로 쓴다. 코드의 고정 순서로 다시 정렬하지 않는다.
    return { order: [...declared], source: "declared", needsServerFallbackLog: false };
  }
  const values = comparableValues(assessment);
  if (values) {
    return {
      order: sortByValue(values, direction),
      source: direction === 1 ? "value_ascending" : "value_descending",
      needsServerFallbackLog: true,
    };
  }
  return { order: [...AXIS_IDS], source: "stable_id", needsServerFallbackLog: true };
}

/**
 * 보완 목표 순서. supportOrder 가 있으면 그대로 쓰고,
 * 없으면 같은 단위 내 낮은 표시값 순서를 fallback 으로 쓴다(§8-5).
 */
export function resolveSupportOrderDetail(
  assessment: AssessmentPayload,
): OrderResolution {
  return resolveOrder(assessment.supportOrder, assessment, 1);
}

/** 보완 목표 순서만 필요할 때. 판단 근거가 필요하면 resolveSupportOrderDetail() 을 쓴다. */
export function resolveSupportOrder(assessment: AssessmentPayload): AxisId[] {
  return resolveSupportOrderDetail(assessment).order;
}

/**
 * 강점 활용 순서. strengthOrder 가 있으면 그대로 쓰고,
 * 없으면 같은 단위 내 높은 표시값 순서를 참고한다(규칙 §4.3).
 * 강점은 표시 순서만 바꾼다. 과제를 자동 결정하거나 완료하지 않는다.
 */
export function resolveStrengthOrderDetail(
  assessment: AssessmentPayload,
): OrderResolution {
  return resolveOrder(assessment.strengthOrder, assessment, -1);
}

export function resolveStrengthOrder(assessment: AssessmentPayload): AxisId[] {
  return resolveStrengthOrderDetail(assessment).order;
}

/**
 * 이번 회차의 보완 목표 하나. 복수 low 는 한 회차에 하나만 배정한다(§8-6).
 * 회차 순환은 수행·실행 종료 뒤에 호출자가 round 를 올려서 처리한다.
 * low 영역이 없으면 null 이고, 이때는 통합 기본 흐름을 쓴다(규칙 §4.2).
 */
export function supportTargetForRound(
  assessment: AssessmentPayload,
  round: number,
): AxisId | null {
  // 공식 순서가 앞선다(§8-4). 다만 supportOrder 는 우선순위 선언이지 네 영역의
  // 완전한 나열이 아니다 — 선언에 없는 low 를 여기서 버리면 §8-6 의 회차 순환에서
  // 그 영역이 영구히 탈락한다(하 영역 둘, 선언 하나면 매 회차 같은 영역만 나온다).
  // 그래서 선언된 low 를 앞에, 나머지 low 를 fallback 순서로 뒤에 이어 붙인다.
  const declaredOrder = resolveSupportOrder(assessment);
  const isLow = (axis: AxisId) => assessment.axes[axis]?.level === "low";
  const declaredLows = declaredOrder.filter(isLow);
  const seen = new Set(declaredLows);
  const restLows = resolveSupportOrder({ ...assessment, supportOrder: undefined })
    .filter((axis) => isLow(axis) && !seen.has(axis));
  const lows = [...declaredLows, ...restLows];
  if (lows.length === 0) return null;
  const index = ((Math.trunc(round) % lows.length) + lows.length) % lows.length;
  return lows[index];
}

/**
 * workspace 범위 키.
 * subjectId + assessmentId + profileVersion + interpretationVersion 조합이다(§5).
 *
 * 이 키가 바뀌면 이전 workspace 를 자동으로 합치지 않는다. 명시적 서버 마이그레이션과
 * 감사 로그를 쓴다(§7). 해석 버전이 없는 v1.0 은 null 자리로 구분한다 — 임의로 채우지 않는다.
 */
export function profileKey(assessment: AssessmentPayload): string {
  return JSON.stringify([
    assessment.subjectId,
    assessment.assessmentId,
    assessment.profileVersion,
    assessment.scoreSystem?.interpretationVersion ?? null,
  ]);
}

/** 두 payload 가 같은 workspace 범위인지. 다르면 저장공간을 분리한다(§8-8). */
export function isSameProfileScope(
  a: AssessmentPayload,
  b: AssessmentPayload,
): boolean {
  return profileKey(a) === profileKey(b);
}
