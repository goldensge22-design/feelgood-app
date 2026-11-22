/**
 * Assessment payload 타입.
 *
 * 출처: docs/NUVIA_PLANNER_RESULT_SERVER_INTEGRATION.md §2·§3·§7
 * 결과지 서비스가 검사별 공식 점수 해석을 소유한다. 프로그램(PLANNER·KIDS·HISTORY)은
 * 전달된 해석을 검증해서 표시·배정에만 쓴다. 프로그램이 원점수를 재계산하지 않고,
 * 공식 상·중·하를 임의로 판정하지 않는다.
 *
 * 이 파일은 브라우저와 Next.js 서버 양쪽에서 import 된다. Node 전용 API 를 쓰지 않는다.
 */

/** PASS 4영역. 이 4개 외의 축은 없다. */
export type AxisId = "planning" | "attention" | "simultaneous" | "successive";

/** 결과지가 계산한 공식 수준. 프로그램이 임의로 판정하지 않는다. */
export type AxisLevel = "high" | "mid" | "low";

/** 학습 단계 5종. 정식 모드에서 학생이 직접 고르지 않는다(규칙 §8). */
export type EducationStage =
  | "elementary_1_3"
  | "elementary_4_6"
  | "middle"
  | "high"
  | "adult";

/** 검사 2종. */
export type Instrument = "kpass" | "dcas";

/**
 * 점수 종류 3종.
 * 한 요청 안에서 서로 다른 척도를 섞지 않는다.
 * K-PASS = 표준점수 또는 백분위, D-CAS = 정답률(%).
 */
export type ScoreMetric = "standard_score" | "percentile" | "accuracy_rate";

/** 지원하는 payload schema 버전. */
export type AssessmentSchemaVersion = "1.0" | "1.1";

export interface ScoreSystem {
  instrument: Instrument;
  metric: ScoreMetric;
  /** 결과지 서비스의 검수된 표시 이름. 프로그램이 지어내지 않는다. */
  label: string;
  interpretationVersion: string;
}

/** v1.1 영역 점수. 표시값과 단위가 반드시 함께 온다. */
export interface AxisScore {
  level: AxisLevel;
  value: number;
  unit: string;
}

/** v1.0 영역 점수. 숫자와 단위가 없을 수 있다(§7). */
export interface AxisScoreV10 {
  level: AxisLevel;
  value?: number;
  unit?: string;
}

/**
 * Assessment v1.1 payload. 신규 결과지 연동은 이 버전을 쓴다.
 *
 * supportOrder·strengthOrder 는 선택이다. 결과지가 보내면 코드의 고정 영역 순서보다
 * 우선하고(§8-4), 없으면 같은 단위 내 낮은 값 순서를 fallback 으로 쓴다(§8-5).
 * 직접 읽지 말고 resolveSupportOrder()/resolveStrengthOrder() 를 거쳐라.
 */
export interface Assessment {
  schemaVersion: "1.1";
  assessmentId: string;
  subjectId: string;
  profileVersion: string;
  educationStage: EducationStage;
  scoreSystem: ScoreSystem;
  axes: Record<AxisId, AxisScore>;
  /** 지원 대상 영역 순서. 코드의 고정 순서보다 우선한다. */
  supportOrder?: AxisId[];
  /** 강점 영역 순서. 표시 순서만 바꾸고 과제를 자동 결정하지 않는다. */
  strengthOrder?: AxisId[];
}

/**
 * Assessment v1.0 payload. 하위 호환으로 읽기만 한다(§7).
 * 숫자와 점수 체계가 없을 수 있으며, 빠진 값은 결과지 adapter 가 채운다.
 * 프로그램이 여기서 값을 추정해 만들지 않는다.
 */
export interface AssessmentV10 {
  schemaVersion: "1.0";
  assessmentId: string;
  subjectId: string;
  profileVersion: string;
  educationStage: EducationStage;
  axes: Record<AxisId, AxisScoreV10>;
  scoreSystem?: ScoreSystem;
  supportOrder?: AxisId[];
  strengthOrder?: AxisId[];
}

/** 검증을 통과한 payload. 버전으로 좁혀서 쓴다. */
export type AssessmentPayload = Assessment | AssessmentV10;

/** v1.0 을 v1.1 로 올리려면 결과지 adapter 가 채워야 하는 자리. */
export type AdapterFillField =
  | "scoreSystem"
  | "axisValues"
  | "supportOrder"
  | "strengthOrder";

export interface AdapterFillRequirement {
  field: AdapterFillField;
  /** 화면에 그대로 띄우지 않는 개발자용 설명. 식별자를 담지 않는다. */
  reason: string;
}

export type ProgramId = "PLANNER" | "KIDS" | "HISTORY";

/** 이용권 상태와 성장 데이터 유무는 하나의 boolean 으로 합치지 않는다. */
export type ProgramStatus = "active" | "inactive" | "expired";

/** 안정 ID 순서. fallback 이 필요할 때의 마지막 기준이다. */
export const AXIS_IDS: readonly AxisId[] = [
  "planning",
  "attention",
  "simultaneous",
  "successive",
];

export const AXIS_LEVELS: readonly AxisLevel[] = ["high", "mid", "low"];

export const EDUCATION_STAGES: readonly EducationStage[] = [
  "elementary_1_3",
  "elementary_4_6",
  "middle",
  "high",
  "adult",
];

export const INSTRUMENTS: readonly Instrument[] = ["kpass", "dcas"];

export const SCORE_METRICS: readonly ScoreMetric[] = [
  "standard_score",
  "percentile",
  "accuracy_rate",
];

export const ASSESSMENT_SCHEMA_VERSIONS: readonly AssessmentSchemaVersion[] = [
  "1.0",
  "1.1",
];

/**
 * 검사별 허용 점수 종류(§3).
 * K-PASS 는 표준점수 또는 백분위 중 하나를 선언하고, D-CAS 는 정답률을 쓴다.
 * 정답률을 또래 백분위로 표시하지 않기 위한 경계다.
 */
export const METRICS_BY_INSTRUMENT: Readonly<
  Record<Instrument, readonly ScoreMetric[]>
> = {
  kpass: ["standard_score", "percentile"],
  dcas: ["accuracy_rate"],
};

export function isAxisId(value: unknown): value is AxisId {
  return typeof value === "string" && (AXIS_IDS as readonly string[]).includes(value);
}

export function isAxisLevel(value: unknown): value is AxisLevel {
  return typeof value === "string" && (AXIS_LEVELS as readonly string[]).includes(value);
}

export function isEducationStage(value: unknown): value is EducationStage {
  return (
    typeof value === "string" &&
    (EDUCATION_STAGES as readonly string[]).includes(value)
  );
}

export function isInstrument(value: unknown): value is Instrument {
  return typeof value === "string" && (INSTRUMENTS as readonly string[]).includes(value);
}

export function isScoreMetric(value: unknown): value is ScoreMetric {
  return typeof value === "string" && (SCORE_METRICS as readonly string[]).includes(value);
}

/** 검증을 통과한 payload 가 v1.1 인지 좁혀 준다. */
export function isAssessmentV11(payload: AssessmentPayload): payload is Assessment {
  return payload.schemaVersion === "1.1";
}
