/**
 * MOCK DATA
 * ✅ LOVABLE MAY EDIT (값만) — 구조는 domain/types.ts 계약을 따른다.
 */
import type {
  Discovery, LearnerContext, Mission, Strategy, WeeklyState, AgeBand, StrategyUseEvidence,
} from "../domain/types";
import type { Observation } from "../domain/metrics";
import type { ResetRecord } from "../domain/modules";

export const EPOCH_ID = "epoch_2026_03";
export const CONTENT_VERSION = "planner-1.5.0";
export const SCHEMA_VERSION = "1.5.0";

export function makeLearner(band: AgeBand = "B", overrides: Partial<LearnerContext> = {}): LearnerContext {
  return {
    learner_id: "lrn_demo_01",
    assessment_id: "kpass_2026_0312",
    assessment_profile_version: "kpass-v3",
    assessment_epoch_id: EPOCH_ID,
    epoch_started_at: "2026-03-12T00:00:00.000Z",
    age_ux_band: band,
    level: 3,
    complexity: "L3",
    scaffold_state: "S2_ASSISTED",
    scaffold_requested_by_student: false,
    visibility_scope: "student",
    support_domains: ["planning", "attention"],
    strength_domains: ["simultaneous"],
    content_version: CONTENT_VERSION,
    schema_version: SCHEMA_VERSION,
    ...overrides,
  };
}

/** 검사 미보유 사용자 — 강점 추정 금지 경로 (§19) */
export function makeLearnerWithoutAssessment(band: AgeBand = "C"): LearnerContext {
  return makeLearner(band, {
    learner_id: "lrn_no_assess",
    assessment_id: null,
    assessment_profile_version: null,
    support_domains: [],
    strength_domains: [],
    level: 1,
    complexity: "L1",
    scaffold_state: "S1_GUIDED",
  });
}

export function makeMission(o: Partial<Mission> = {}): Mission {
  return {
    mission_id: o.mission_id ?? `m_${Math.random().toString(36).slice(2, 8)}`,
    title: "수학 문제집 3단원",
    task_type: "수학",
    module: "TIME_SENSE",
    subtasks: [],
    predicted_minutes: 30,
    scheduled_start: null,
    focus_length: 25,
    order_index: 0,
    order_reason: null,
    actual_start: null,
    actual_minutes: null,
    duration_source: null,
    interruptions: 0,
    completed: false,
    ...o,
  };
}

export const MOCK_MISSIONS: Mission[] = [
  makeMission({ mission_id: "m1", title: "수학 문제집 3단원", task_type: "수학", predicted_minutes: 30, order_index: 0 }),
  makeMission({ mission_id: "m2", title: "영어 단어 40개", task_type: "영어", module: "FOCUS_MISSION", predicted_minutes: 20, focus_length: 15, order_index: 1 }),
  makeMission({ mission_id: "m3", title: "과학 수행평가 정리", task_type: "과학", module: "BREAK_IT", predicted_minutes: 45, subtasks: ["자료 찾기", "개요 쓰기", "본문 쓰기"], order_index: 2 }),
];

/** time_prediction_accuracy 5회 충족 세트 — Discovery GATE 2 통과용 */
export function makeObservations(epochId = EPOCH_ID): Observation[] {
  const base = new Date("2026-04-01T09:00:00.000Z").getTime();
  const mk = (metric: Observation["metric"], vals: number[]): Observation[] =>
    vals.map((v, i) => ({
      metric, value: v, occurred_at: new Date(base + i * 86_400_000).toISOString(),
      epoch_id: epochId, source_event_id: `evt_seed_${metric}_${i}`,
    }));
  return [
    ...mk("time_prediction_accuracy", [0.42, 0.38, 0.31, 0.29, 0.33]),
    ...mk("start_accuracy", [0.5, 0.62, 0.58, 0.71, 0.66]),
    ...mk("focus_stability", [0.6, 0.72, 0.68, 0.8, 0.76]),
    ...mk("recovery_skill", [1, 0, 1]),
    ...mk("planning_accuracy", [0.6, 0.5, 0.75, 0.6, 0.8]),
    ...mk("plan_order_consistency", [0.7, 0.8, 0.66, 0.9, 0.75]),
    ...mk("completion_reliability", [0.6, 0.6, 0.8, 0.6, 1]),
    // 4회만 — insufficient 경로 테스트용
    ...mk("metacognitive_accuracy", [0.7, 0.8, 0.75, 0.82]),
  ];
}

export const MOCK_RESETS: ResetRecord[] = [
  { reset_id: "rs1", created_at: "2026-04-03T12:00:00.000Z", reason: "plan_too_big", scope: "day", restarted_within_24h: true },
  { reset_id: "rs2", created_at: "2026-04-09T12:00:00.000Z", reason: "interrupted", scope: "mission", restarted_within_24h: false },
  { reset_id: "rs3", created_at: "2026-04-15T12:00:00.000Z", reason: "ran_out_of_time", scope: "day", restarted_within_24h: true },
];

export const MOCK_DISCOVERIES: Discovery[] = [
  {
    discovery_id: "dis_1", learner_id: "lrn_demo_01",
    discovery_type: "time_bias_by_task_type",
    statement_template_id: "T_TIME_BIAS_01", statement_params: { task_type: "수학" },
    evidence_window: { from: "2026-04-01", to: "2026-04-21" },
    evidence_count: 7,
    source_event_ids: ["evt_a", "evt_b", "evt_c", "evt_d", "evt_e", "evt_f", "evt_g"],
    assessment_epoch_id: EPOCH_ID, content_version: CONTENT_VERSION, schema_version: SCHEMA_VERSION,
    confidence_state: "observed", saved_by: "student", created_at: "2026-04-21T10:00:00.000Z",
  },
  {
    discovery_id: "dis_2", learner_id: "lrn_demo_01",
    discovery_type: "focus_length_fit",
    statement_template_id: "T_FOCUS_FIT_01", statement_params: { short: 15, long: 25 },
    evidence_window: { from: "2026-04-05", to: "2026-04-25" },
    evidence_count: 5,
    source_event_ids: ["evt_h", "evt_i", "evt_j", "evt_k", "evt_l"],
    assessment_epoch_id: EPOCH_ID, content_version: CONTENT_VERSION, schema_version: SCHEMA_VERSION,
    confidence_state: "weakening", saved_by: "student", created_at: "2026-04-25T10:00:00.000Z",
  },
];

export const MOCK_STRATEGIES: Strategy[] = [
  {
    strategy_id: "str_1", learner_id: "lrn_demo_01", strategy_type: "FIFTEEN_MIN_START",
    source_discovery_id: "dis_2", status: "fits_me", trial_count: 8, positive_outcomes: 6,
    recent_outcomes: [true, true, false], assessment_epoch_id: EPOCH_ID,
    content_version: CONTENT_VERSION, saved_at: "2026-04-10T10:00:00.000Z",
  },
  {
    strategy_id: "str_2", learner_id: "lrn_demo_01", strategy_type: "BREAK_INTO_3",
    source_discovery_id: "dis_1", status: "trying", trial_count: 3, positive_outcomes: 2,
    recent_outcomes: [true, false, true], assessment_epoch_id: EPOCH_ID,
    content_version: CONTENT_VERSION, saved_at: "2026-04-18T10:00:00.000Z",
  },
  {
    strategy_id: "str_3", learner_id: "lrn_demo_01", strategy_type: "FOCUS_25",
    source_discovery_id: null, status: "retest", trial_count: 6, positive_outcomes: 2,
    recent_outcomes: [false, false, true], assessment_epoch_id: EPOCH_ID,
    content_version: CONTENT_VERSION, saved_at: "2026-04-02T10:00:00.000Z",
  },
];

export const MOCK_WEEK: WeeklyState = {
  week_start: "2026-04-20",
  boss: {
    boss_id: "boss_START_2026-04-20", boss_type: "START", metric_key: "start_accuracy",
    baseline: 0.61, target: 0.71, selected_by: "student", week_start: "2026-04-20",
    assessment_epoch_id: EPOCH_ID, consecutive_miss_count: 0, target_relaxed: false,
  },
  observation_week: false,
  records: [
    { date: "2026-04-20", value: 0.6 },
    { date: "2026-04-21", value: 0.7 },
    { date: "2026-04-22", value: 0.65 },
  ],
};

export const MOCK_OBSERVATION_WEEK: WeeklyState = {
  week_start: "2026-04-27", boss: null, observation_week: true, records: [],
};


export const MOCK_STRATEGY_USES: StrategyUseEvidence[] = [
  { use_id: "use_1", strategy_id: "str_1", context_label: "수학 수행평가", context_kind: "same_type", self_initiated: false, occurred_at: "2026-04-20T10:00:00.000Z" },
  { use_id: "use_2", strategy_id: "str_1", context_label: "영어 발표 준비", context_kind: "different_type", self_initiated: true, occurred_at: "2026-04-23T10:00:00.000Z" },
];
