/**
 * NUVIA 공용 계약.
 *
 * 출처: docs/NUVIA_PLANNER_RESULT_SERVER_INTEGRATION.md
 * 결과지 서비스가 검사별 공식 점수 해석을 소유하고, 프로그램(PLANNER·KIDS·HISTORY)은
 * 전달된 해석을 검증해서 쓰기만 한다. 프로그램이 원점수를 재계산하지 않는다.
 *
 * 이 패키지는 브라우저와 Next.js 서버 양쪽에서 import 된다. Node 전용 API 를 쓰지 않는다.
 *
 * - 타입:      assessment.ts
 * - 검증기:    validate.ts
 * - 순서·범위: profile.ts
 */

export {
  AXIS_IDS,
  AXIS_LEVELS,
  EDUCATION_STAGES,
  INSTRUMENTS,
  SCORE_METRICS,
  ASSESSMENT_SCHEMA_VERSIONS,
  METRICS_BY_INSTRUMENT,
  isAxisId,
  isAxisLevel,
  isEducationStage,
  isInstrument,
  isScoreMetric,
  isAssessmentV11,
} from "./assessment.js";

export type {
  AdapterFillField,
  AdapterFillRequirement,
  Assessment,
  AssessmentPayload,
  AssessmentSchemaVersion,
  AssessmentV10,
  AxisId,
  AxisLevel,
  AxisScore,
  AxisScoreV10,
  EducationStage,
  Instrument,
  ProgramId,
  ProgramStatus,
  ScoreMetric,
  ScoreSystem,
} from "./assessment.js";

export {
  validateAssessment,
  validateAssessmentPayload,
  isValidAssessment,
} from "./validate.js";

export type {
  AssessmentPayloadResult,
  ValidationError,
  ValidationErrorCode,
  ValidationResult,
} from "./validate.js";

export {
  profileKey,
  isSameProfileScope,
  resolveSupportOrder,
  resolveSupportOrderDetail,
  resolveStrengthOrder,
  resolveStrengthOrderDetail,
  supportTargetForRound,
} from "./profile.js";

export type { OrderResolution, OrderSource } from "./profile.js";
