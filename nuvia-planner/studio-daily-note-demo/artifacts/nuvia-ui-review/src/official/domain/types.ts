/**
 * NUVIA PLANNER v1.4 — CORE DOMAIN TYPES
 * LOGIC LAYER — LOVABLE MUST NOT EDIT
 *
 * 상위 계약: CORE FRAMEWORK v1.3 §9 (Common Data Contract), §5 (Epoch)
 *           PLANNER v1.4 §20 (Level/Complexity), §21 (Metrics)
 */

// Age UX (표현 전용. 로직 분기 금지 - PLANNER §5, §34)
export type AgeBand = "A" | "B" | "C" | "D";

// Level / Complexity (분리 유지 - §20)
export type Level = 1 | 2 | 3 | 4 | 5 | 6;
export type Complexity = "L1" | "L2" | "L3" | "L4" | "L5" | "L6";

export const LEVEL_NAMES: Record<Level, string> = {
  1: "Observer",
  2: "Predictor",
  3: "Planner",
  4: "Controller",
  5: "Adapter",
  6: "Self-Manager",
};

// Scaffold Fading (§14)
export type ScaffoldState = "S1_GUIDED" | "S2_ASSISTED" | "S3_LIGHT" | "S4_SELF";
export const SCAFFOLD_ORDER: ScaffoldState[] = ["S1_GUIDED", "S2_ASSISTED", "S3_LIGHT", "S4_SELF"];

// 7 Training Modules (§9 - 원형 보존)
export type ModuleId =
  | "TIME_SENSE"
  | "PRIORITY"
  | "BREAK_IT"
  | "FOCUS_MISSION"
  | "START_NOW"
  | "PLAN_VS_REALITY"
  | "RESET";

// Growth Metrics (§21 - 산식 변경 금지)
export type MetricKey =
  | "time_prediction_accuracy"
  | "start_accuracy"
  | "planning_accuracy"
  | "completion_reliability"
  | "focus_stability"
  | "recovery_skill"
  | "plan_order_consistency"
  | "metacognitive_accuracy";

/** Growth가 아닌 관찰지표. 학생 점수화·노출 금지 (§21, §34) */
export type ObservationKey = "task_breakdown_observation" | "autonomy_ratio";

export type GrowthDomain = "self_regulation" | "metacognitive";

// v1.5 — PLANNER 상위 자기관리 패턴. 검사점수/진단명이 아니라 라우팅용 지원 카테고리다.
export type SelfManagementPattern = "PLAN" | "START" | "FOCUS" | "TIME" | "RECOVER" | "CHECK";

export interface PatternProfile {
  /** source가 "neutral"이면 지원 근거가 전혀 없다는 뜻이며 null이다. 임의 fallback 금지. */
  primary: SelfManagementPattern | null;
  secondary: SelfManagementPattern | null;
  ordered: SelfManagementPattern[];
  source: "profile_only" | "profile_plus_behavior" | "behavior_only" | "neutral";
  strength_levers: string[];
}


// Visibility (CORE §12)
export type VisibilityScope = "student" | "parent" | "teacher" | "org";

export interface LearnerContext {
  learner_id: string;
  assessment_id: string | null;              // null = 검사 미보유 경로 (CORE §5)
  assessment_profile_version: string | null;
  assessment_epoch_id: string;
  epoch_started_at: string;                  // epoch+7일 안정 관찰 판정 (§20)
  age_ux_band: AgeBand;                      // 표현 전용
  level: Level;                              // 하향 없음 (§13)
  complexity: Complexity;                    // 상하향 가능 (§20)
  scaffold_state: ScaffoldState;
  scaffold_requested_by_student: boolean;
  visibility_scope: VisibilityScope;
  /** 검사 SSOT 결과. PLANNER는 재판정하지 않는다 (§1) */
  support_domains: string[];                 // 지원영역 (60% 가중치 풀)
  strength_domains: string[];                // 강점 (40% 진입 Scaffold 풀)
  content_version: string;
  schema_version: string;
}

// Daily State Machine (§12)
export type DailyPhase =
  | "IDLE"
  | "CHECKED_IN"
  | "CHOSEN"
  | "PLANNED"
  | "IN_PROGRESS"
  | "INTERRUPTED"
  | "COMPLETED"
  | "NOTICED"
  | "REFLECTED"
  | "UNLOCKED"
  | "GROWN"
  | "RETURN_PREVIEWED"
  | "ABANDONED"
  | "RESET_OFFERED"
  | "RESET_CREATED";

/** 15/25/40 고정 - v1.3. 임의 확장 금지 (§9) */
export const FOCUS_LENGTHS = [15, 25, 40] as const;
export type FocusLength = (typeof FOCUS_LENGTHS)[number];

export type OrderReason = "finish_fast" | "hard_first" | "deadline_close";

export interface Mission {
  mission_id: string;
  title: string;
  task_type: string;
  module: ModuleId;
  subtasks: string[];                // BREAK IT 결과 (2~7). 점수화 금지
  predicted_minutes: number | null;  // TIME SENSE
  scheduled_start: string | null;    // START NOW
  focus_length: FocusLength | null;  // FOCUS MISSION
  order_index: number;               // PRIORITY
  order_reason: OrderReason | null;
  actual_start: string | null;
  actual_minutes: number | null;
  /** v1.3 §8.1 — 타이머/자기입력/미기록. "manual"이 아니라 "manual_recall" (원문 용어) */
  duration_source: "timer" | "manual_recall" | "none" | null;
  interruptions: number;
  completed: boolean;
}

export interface Challenge {
  challenge_id: string;
  module: ModuleId;
  pattern?: SelfManagementPattern;
  /** copyPack 조회 키. 문구 자체를 담지 않는다 (Age UX 분리) */
  copy_key: string;
  pool: "support" | "strength" | "variation"; // 60/40 + Variation. 학생 미노출
  boss_linked: boolean;
}

export interface PlanSnapshot {
  committed_at: string;
  mission_ids: string[];
  order: string[];
  total_predicted_minutes: number;
}

export interface DailyState {
  date: string;
  phase: DailyPhase;
  chosen_challenge_id: string | null;
  applied_strategy_id: string | null;
  missions: Mission[];
  plan_snapshot: PlanSnapshot | null;
  /** v1.3 §14.1 self_rating_norm의 입력값 — REFLECT 5점 척도 r (1~5). 0..1 슬라이더 아님 */
  self_rating: 1 | 2 | 3 | 4 | 5 | null;
  reflection_reason: string | null;
  recent_modules: ModuleId[];
  session_opened_at: string | null;
  first_action_at: string | null;    // Instant Start 30초 측정
}

// Discovery (§11)
export type DiscoveryType =
  | "time_bias_by_task_type"
  | "focus_length_fit"
  | "breakdown_start_link"
  | "reset_restart_link"
  | "start_delay_context"
  | "plan_volume_bias"
  | "order_principle_fit";

export type ConfidenceState = "observed" | "weakening";

export interface Discovery {
  discovery_id: string;
  learner_id: string;
  discovery_type: DiscoveryType;
  statement_template_id: string;
  statement_params: Record<string, string | number>;
  evidence_window: { from: string; to: string };
  evidence_count: number;
  source_event_ids: string[];         // 재현성 (§28)
  assessment_epoch_id: string;
  content_version: string;
  schema_version: string;
  confidence_state: ConfidenceState;
  saved_by: "student";                // AI 자동저장 금지
  created_at: string;
}

// Strategy (§12)
export type StrategyType =
  | "FIVE_MIN_START"
  | "FIFTEEN_MIN_START"
  | "BREAK_INTO_3"
  | "HARD_FIRST"
  | "RESET_TOMORROW"
  | "FOCUS_25"
  | "BUFFER_TIME";

export type StrategyStatus = "trying" | "fits_me" | "retest";

export interface StrategyUseEvidence {
  use_id: string;
  strategy_id: string;
  context_label: string;
  context_kind: "same_type" | "different_type";
  self_initiated: boolean;
  occurred_at: string;
}

export type StrategyOwnershipStage = "STRATEGY" | "APPLY" | "TRANSFER" | "OWN";

export interface Strategy {
  strategy_id: string;
  learner_id: string;
  strategy_type: StrategyType;
  source_discovery_id: string | null;
  status: StrategyStatus;
  trial_count: number;
  positive_outcomes: number;
  recent_outcomes: boolean[];
  assessment_epoch_id: string;
  content_version: string;
  saved_at: string;
}

// Weekly Boss (§16)
export type BossType = "TIME" | "START" | "FOCUS" | "RECOVERY" | "OVERPLANNING";

export interface WeeklyBoss {
  boss_id: string;
  boss_type: BossType;
  metric_key: MetricKey;
  baseline: number;
  target: number;
  selected_by: "student";             // AI 확정 금지 (§16)
  week_start: string;
  assessment_epoch_id: string;
  consecutive_miss_count: number;
  target_relaxed: boolean;
}

export interface WeeklyState {
  week_start: string;
  boss: WeeklyBoss | null;
  observation_week: boolean;
  records: { date: string; value: number }[];
}

export interface MetricResult {
  key: MetricKey;
  domain: GrowthDomain;
  state: "sufficient" | "insufficient";
  observation_count: number;
  min_observations: number;
  /** insufficient일 때 null. 총점 합산 금지 (§34) */
  value: number | null;
  trend: "up" | "flat" | "down" | null;
  /** v1.3 §14.3 — 0~1 클램프가 실제로 발생했는지 (산식 오류 탐지용) */
  clamped: boolean;
}
