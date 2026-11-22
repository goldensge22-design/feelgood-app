/**
 * Assessment payload 런타임 검증기.
 *
 * 출처: docs/NUVIA_PLANNER_RESULT_SERVER_INTEGRATION.md §2·§3·§7·§8
 * 의존성 없는 순수 TS 다. 브라우저와 Next.js 서버 양쪽에서 같은 판정을 쓴다.
 *
 * 손상되거나 불완전한 payload 는 기존 정상 상태를 덮어쓰지 않는다(규칙 §9).
 * 그래서 예외를 던지지 않고 판정 결과를 값으로 돌려준다.
 *
 * 에러에는 식별자·해석 버전·토큰 같은 민감값을 절대 담지 않는다.
 * message 는 고정 문구, path 는 열거된 필드 이름만 쓴다.
 */

import {
  AXIS_IDS,
  ASSESSMENT_SCHEMA_VERSIONS,
  METRICS_BY_INSTRUMENT,
  isAxisId,
  isAxisLevel,
  isEducationStage,
  isInstrument,
  isScoreMetric,
  type AdapterFillRequirement,
  type Assessment,
  type AssessmentV10,
  type AxisId,
  type AxisLevel,
  type AxisScore,
  type AxisScoreV10,
  type ScoreMetric,
  type ScoreSystem,
} from "./assessment.js";

export type ValidationErrorCode =
  /** payload 자체가 객체가 아니다. */
  | "not_an_object"
  /** 1.0·1.1 이외의 schemaVersion. */
  | "unsupported_schema_version"
  /** 필수 필드가 없다. */
  | "missing_field"
  /** 필드 타입이 계약과 다르다. */
  | "invalid_type"
  /** 빈 문자열 또는 공백뿐인 식별자. */
  | "empty_string"
  /** 허용 길이를 넘었다. */
  | "too_long"
  /** 허용 ID 목록 밖의 값이다. */
  | "unknown_id"
  /** PASS 4영역 중 하나가 빠졌다(§8-3). */
  | "missing_axis"
  /** axes 에 PASS 4영역 밖의 키가 있다. */
  | "unknown_axis"
  /** 한 payload 안에서 서로 다른 단위가 섞였다(§2). */
  | "mixed_unit"
  /** 점수 종류와 단위가 맞지 않는다. 정답률과 백분위를 섞지 않기 위한 경계다(§3). */
  | "metric_unit_mismatch"
  /** 검사 종류가 허용하지 않는 점수 종류다(§3). */
  | "instrument_metric_mismatch"
  /** 점수 종류의 정상 범위를 벗어났다. */
  | "value_out_of_range"
  /** 지원·강점 순서에 같은 영역이 두 번 들어 있다. */
  | "duplicate_order_entry"
  /** v1.1 인데 점수 체계가 없다(§2). */
  | "v11_requires_score_system"
  /** v1.1 인데 네 영역 표시값이 다 있지 않다(§2). */
  | "v11_requires_axis_value";

export interface ValidationError {
  code: ValidationErrorCode;
  /** 문제가 난 자리. 열거된 필드 이름만 쓰고 값은 담지 않는다. */
  path: string;
  /** 개발자·통합 담당자용 한국어 설명. 학생 화면 문구가 아니다. */
  message: string;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ValidationError };

/** v1.0·v1.1 을 함께 받는 판정 결과. 버전과 adapter 보완 목록을 함께 돌려준다. */
export type AssessmentPayloadResult =
  | {
      ok: true;
      schemaVersion: "1.1";
      value: Assessment;
      /** v1.1 은 이미 완전하므로 항상 빈 배열이다. */
      adapterFill: readonly AdapterFillRequirement[];
    }
  | {
      ok: true;
      schemaVersion: "1.0";
      value: AssessmentV10;
      /** 결과지 adapter 가 채워야 하는 자리. 프로그램이 지어내지 않는다(§7). */
      adapterFill: readonly AdapterFillRequirement[];
    }
  | { ok: false; error: ValidationError };

const MAX_ID_LENGTH = 160;
const MAX_LABEL_LENGTH = 200;
const MAX_UNIT_LENGTH = 40;

/** 정답률은 반드시 이 단위로 온다(§3). */
const ACCURACY_UNIT = "%";

/** 점수 종류별 정상 범위. 결과지가 보낸 값의 명백한 손상만 걸러낸다. */
const VALUE_RANGE: Record<ScoreMetric, { min: number; max: number }> = {
  standard_score: { min: 0, max: 300 },
  percentile: { min: 0, max: 100 },
  accuracy_rate: { min: 0, max: 100 },
};

function fail(
  code: ValidationErrorCode,
  path: string,
  message: string,
): { ok: false; error: ValidationError } {
  return { ok: false, error: { code, path, message } };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 안정 ID 문자열 검사. 내용은 에러에 담지 않는다. */
function checkId(
  value: unknown,
  path: string,
  maxLength: number,
): ValidationError | null {
  if (value === undefined || value === null) {
    return { code: "missing_field", path, message: "필수 값이 없습니다." };
  }
  if (typeof value !== "string") {
    return { code: "invalid_type", path, message: "문자열이어야 합니다." };
  }
  if (value.trim().length === 0) {
    return { code: "empty_string", path, message: "빈 값은 쓸 수 없습니다." };
  }
  if (value.length > maxLength) {
    return { code: "too_long", path, message: "허용 길이를 넘었습니다." };
  }
  return null;
}

/** 지원·강점 순서 검증. 없으면 undefined 를 그대로 돌려준다. */
function checkAxisOrder(
  value: unknown,
  path: string,
): ValidationResult<AxisId[] | undefined> {
  if (value === undefined) return { ok: true, value: undefined };
  if (!Array.isArray(value)) {
    return fail("invalid_type", path, "영역 ID 배열이어야 합니다.");
  }
  if (value.length > AXIS_IDS.length) {
    return fail("too_long", path, "PASS 4영역보다 많은 항목이 있습니다.");
  }
  const order: AxisId[] = [];
  for (const entry of value) {
    if (!isAxisId(entry)) {
      return fail("unknown_id", path, "허용된 PASS 영역 ID 가 아닙니다.");
    }
    if (order.includes(entry)) {
      return fail("duplicate_order_entry", path, "같은 영역이 두 번 들어 있습니다.");
    }
    order.push(entry);
  }
  return { ok: true, value: order };
}

/** scoreSystem 검증. 검사 종류와 점수 종류의 짝까지 본다(§3). */
function checkScoreSystem(value: unknown): ValidationResult<ScoreSystem> {
  if (!isPlainObject(value)) {
    return fail("invalid_type", "scoreSystem", "점수 체계는 객체여야 합니다.");
  }
  if (!isInstrument(value.instrument)) {
    return fail(
      "unknown_id",
      "scoreSystem.instrument",
      "허용된 검사 종류가 아닙니다.",
    );
  }
  if (!isScoreMetric(value.metric)) {
    return fail(
      "unknown_id",
      "scoreSystem.metric",
      "허용된 점수 종류가 아닙니다.",
    );
  }
  if (!METRICS_BY_INSTRUMENT[value.instrument].includes(value.metric)) {
    return fail(
      "instrument_metric_mismatch",
      "scoreSystem.metric",
      "이 검사에서 쓰지 않는 점수 종류입니다.",
    );
  }
  const labelError = checkId(value.label, "scoreSystem.label", MAX_LABEL_LENGTH);
  if (labelError) return { ok: false, error: labelError };
  const versionError = checkId(
    value.interpretationVersion,
    "scoreSystem.interpretationVersion",
    MAX_ID_LENGTH,
  );
  if (versionError) return { ok: false, error: versionError };
  return {
    ok: true,
    value: {
      instrument: value.instrument,
      metric: value.metric,
      label: value.label as string,
      interpretationVersion: value.interpretationVersion as string,
    },
  };
}

/** 한 영역의 level·value·unit 검증. 표시값은 단위와 함께만 인정한다. */
function checkAxisScore(
  raw: unknown,
  axis: AxisId,
): ValidationResult<AxisScoreV10> {
  const path = `axes.${axis}`;
  if (!isPlainObject(raw)) {
    return fail("missing_axis", path, "이 영역의 결과가 없습니다.");
  }
  if (!isAxisLevel(raw.level)) {
    return fail(
      "unknown_id",
      `${path}.level`,
      "공식 상·중·하 분류가 필요합니다.",
    );
  }
  const level: AxisLevel = raw.level;
  const hasValue = raw.value !== undefined;
  const hasUnit = raw.unit !== undefined;
  if (!hasValue && !hasUnit) {
    return { ok: true, value: { level } };
  }
  if (!hasValue) {
    return fail(
      "missing_field",
      `${path}.value`,
      "단위만 있고 표시값이 없습니다.",
    );
  }
  if (typeof raw.value !== "number" || !Number.isFinite(raw.value)) {
    return fail(
      "invalid_type",
      `${path}.value`,
      "표시값은 유한한 숫자여야 합니다. 문자열을 넣지 않습니다.",
    );
  }
  const unitError = checkId(raw.unit, `${path}.unit`, MAX_UNIT_LENGTH);
  if (unitError) return { ok: false, error: unitError };
  return { ok: true, value: { level, value: raw.value, unit: raw.unit as string } };
}

/**
 * v1.0·v1.1 공용 검증.
 * v1.0 이면 결과지 adapter 가 채워야 할 자리를 함께 돌려준다. 여기서 값을 지어내지 않는다(§7).
 */
export function validateAssessmentPayload(input: unknown): AssessmentPayloadResult {
  if (!isPlainObject(input)) {
    return fail("not_an_object", "", "결과지 데이터가 객체가 아닙니다.");
  }
  const schemaVersion = input.schemaVersion;
  if (
    typeof schemaVersion !== "string" ||
    !(ASSESSMENT_SCHEMA_VERSIONS as readonly string[]).includes(schemaVersion)
  ) {
    return fail(
      "unsupported_schema_version",
      "schemaVersion",
      "지원하지 않는 결과지 형식입니다.",
    );
  }

  for (const field of ["assessmentId", "subjectId", "profileVersion"] as const) {
    const error = checkId(input[field], field, MAX_ID_LENGTH);
    if (error) return { ok: false, error };
  }

  if (!isEducationStage(input.educationStage)) {
    return fail(
      "unknown_id",
      "educationStage",
      "허용된 학습 단계가 아닙니다.",
    );
  }

  if (!isPlainObject(input.axes)) {
    return fail("missing_field", "axes", "PASS 4영역 결과가 필요합니다.");
  }
  const rawAxes = input.axes;
  for (const key of Object.keys(rawAxes)) {
    if (!isAxisId(key)) {
      // 키 자체를 에러에 담지 않는다. 자리만 알려준다.
      return fail("unknown_axis", "axes", "PASS 4영역 밖의 항목이 있습니다.");
    }
  }
  const axes = {} as Record<AxisId, AxisScoreV10>;
  for (const axis of AXIS_IDS) {
    // 네 영역 중 하나라도 빠지면 거부한다(§8-3).
    if (!(axis in rawAxes)) {
      return fail("missing_axis", `axes.${axis}`, "이 영역의 결과가 없습니다.");
    }
    const parsed = checkAxisScore(rawAxes[axis], axis);
    if (!parsed.ok) return parsed;
    axes[axis] = parsed.value;
  }

  // 한 payload 안에서 서로 다른 척도를 섞지 않는다(§2).
  const units = new Set<string>();
  for (const axis of AXIS_IDS) {
    const unit = axes[axis].unit;
    if (unit !== undefined) units.add(unit);
  }
  if (units.size > 1) {
    return fail("mixed_unit", "axes", "한 결과지 안에 서로 다른 단위가 섞였습니다.");
  }

  let scoreSystem: ScoreSystem | undefined;
  if (input.scoreSystem !== undefined) {
    const parsed = checkScoreSystem(input.scoreSystem);
    if (!parsed.ok) return parsed;
    scoreSystem = parsed.value;
  }

  if (scoreSystem) {
    const range = VALUE_RANGE[scoreSystem.metric];
    for (const axis of AXIS_IDS) {
      const score = axes[axis];
      if (score.value === undefined) continue;
      if (score.value < range.min || score.value > range.max) {
        return fail(
          "value_out_of_range",
          `axes.${axis}.value`,
          "이 점수 종류의 정상 범위를 벗어났습니다.",
        );
      }
      // 정답률은 %, 표준점수·백분위는 % 가 아니다. 정답률을 백분위로 읽히게 두지 않는다(§3).
      const isAccuracyUnit = score.unit === ACCURACY_UNIT;
      if (scoreSystem.metric === "accuracy_rate" ? !isAccuracyUnit : isAccuracyUnit) {
        return fail(
          "metric_unit_mismatch",
          `axes.${axis}.unit`,
          "점수 종류와 단위가 맞지 않습니다.",
        );
      }
    }
  }

  const supportOrder = checkAxisOrder(input.supportOrder, "supportOrder");
  if (!supportOrder.ok) return supportOrder;
  const strengthOrder = checkAxisOrder(input.strengthOrder, "strengthOrder");
  if (!strengthOrder.ok) return strengthOrder;

  const base = {
    assessmentId: input.assessmentId as string,
    subjectId: input.subjectId as string,
    profileVersion: input.profileVersion as string,
    educationStage: input.educationStage,
    ...(supportOrder.value ? { supportOrder: supportOrder.value } : {}),
    ...(strengthOrder.value ? { strengthOrder: strengthOrder.value } : {}),
  };

  if (schemaVersion === "1.1") {
    if (!scoreSystem) {
      return fail(
        "v11_requires_score_system",
        "scoreSystem",
        "1.1 결과지는 점수 체계가 필요합니다.",
      );
    }
    const filled = {} as Record<AxisId, AxisScore>;
    for (const axis of AXIS_IDS) {
      const score = axes[axis];
      if (score.value === undefined || score.unit === undefined) {
        return fail(
          "v11_requires_axis_value",
          `axes.${axis}.value`,
          "1.1 결과지는 네 영역 표시값과 단위가 모두 필요합니다.",
        );
      }
      filled[axis] = { level: score.level, value: score.value, unit: score.unit };
    }
    return {
      ok: true,
      schemaVersion: "1.1",
      value: { schemaVersion: "1.1", ...base, scoreSystem, axes: filled },
      adapterFill: [],
    };
  }

  return {
    ok: true,
    schemaVersion: "1.0",
    value: {
      schemaVersion: "1.0",
      ...base,
      ...(scoreSystem ? { scoreSystem } : {}),
      axes,
    },
    adapterFill: describeAdapterFill(axes, scoreSystem, supportOrder.value, strengthOrder.value),
  };
}

/**
 * v1.0 payload 에서 v1.1 로 올리려면 무엇이 비어 있는지만 알려준다.
 * 값을 추정해 채우지 않는다. 채우는 주체는 결과지 adapter 다(§7).
 */
function describeAdapterFill(
  axes: Record<AxisId, AxisScoreV10>,
  scoreSystem: ScoreSystem | undefined,
  supportOrder: AxisId[] | undefined,
  strengthOrder: AxisId[] | undefined,
): AdapterFillRequirement[] {
  const requirements: AdapterFillRequirement[] = [];
  if (!scoreSystem) {
    requirements.push({
      field: "scoreSystem",
      reason: "검사 종류·점수 종류·표시 이름·해석 버전이 없습니다.",
    });
  }
  if (AXIS_IDS.some((axis) => axes[axis].value === undefined)) {
    requirements.push({
      field: "axisValues",
      reason: "네 영역의 표시값과 단위가 다 있지 않습니다.",
    });
  }
  if (!supportOrder || supportOrder.length === 0) {
    requirements.push({
      field: "supportOrder",
      reason: "공식 보완 목표 순서가 없습니다. 플래너는 fallback 으로만 처리합니다.",
    });
  }
  if (!strengthOrder || strengthOrder.length === 0) {
    requirements.push({
      field: "strengthOrder",
      reason: "공식 강점 활용 순서가 없습니다. 플래너는 fallback 으로만 처리합니다.",
    });
  }
  return requirements;
}

/**
 * v1.1 전용 검증. 신규 결과지 연동은 이 경로를 쓴다.
 * v1.0 payload 는 여기서 거부하고, 하위 호환 읽기는 validateAssessmentPayload() 를 쓴다.
 */
export function validateAssessment(input: unknown): ValidationResult<Assessment> {
  const result = validateAssessmentPayload(input);
  if (!result.ok) return result;
  if (result.schemaVersion !== "1.1") {
    return fail(
      "unsupported_schema_version",
      "schemaVersion",
      "1.1 결과지가 필요합니다. 1.0 은 결과지 adapter 를 거쳐야 합니다.",
    );
  }
  return { ok: true, value: result.value };
}

/** 검증을 통과한 payload 인지 좁혀 쓰는 보조 함수. */
export function isValidAssessment(input: unknown): input is Assessment {
  return validateAssessment(input).ok;
}
