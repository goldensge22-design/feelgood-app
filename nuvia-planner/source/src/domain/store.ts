/**
 * APP STORE — reducer. 모든 상태 전이와 이벤트 발행의 단일 통로.
 * LOGIC LAYER — LOVABLE MUST NOT EDIT
 */
import { EventLog, emitEvent } from "./events";
import type { EventContext } from "./events";
import { transition } from "./dailyStateMachine";
import type { DailyAction } from "./dailyStateMachine";
import { buildChallengeCandidates } from "./personalization";
import { saveDiscovery, runDiscoveryGates } from "./discoveryEngine";
import type { DiscoveryCandidate } from "./discoveryEngine";
import { saveStrategy, recordTrial, applyStrategy } from "./strategyEngine";
import { evaluateFade, acceptFade, studentRequestsMoreHelp } from "./scaffoldFading";
import type { FadeSignals } from "./scaffoldFading";
import { evaluateLevelPromotion } from "./levelProgression";
import type { LevelEvaluation } from "./levelProgression";
import {
  timeSenseAccuracyValue, focusStabilityValue, startAccuracyValue,
} from "./modules";
import type { ResetRecord } from "./modules";
import { groupEventsByDay, dayCompletionReliability, dayPlanningAccuracy, dayPlanOrderConsistency, dayMetacognitiveAccuracy } from "./dailyMetricAggregation";
import { computeMetric } from "./metrics";
import type { Observation } from "./metrics";
import { buildNarrative, extractSignals } from "./selfDirectionNarrative";
import { resolvePatternProfile } from "./patternEngine";
import { ownershipStageFor } from "./strategyTransfer";
import type {
  Challenge, DailyState, Discovery, FocusLength, LearnerContext,
  Mission, MetricKey, MetricResult, OrderReason, Strategy, StrategyType, WeeklyState, StrategyUseEvidence,
} from "./types";

export interface AppState {
  ctx: LearnerContext;
  daily: DailyState;
  weekly: WeeklyState;
  candidates: Challenge[];
  missions: Mission[];
  activeMissionId: string | null;
  discoveries: Discovery[];
  strategies: Strategy[];
  strategyUses: StrategyUseEvidence[];
  observations: Observation[];
  resets: ResetRecord[];
  pendingDiscovery: DiscoveryCandidate | null;
  fadeOffer: { nextState: string } | null;
  log: EventLog;
  aiUtterancesThisSession: number;
}

export function eventContext(s: AppState, taskId: string | null = null): EventContext {
  return {
    learner_id: s.ctx.learner_id,
    assessment_id: s.ctx.assessment_id,
    assessment_profile_version: s.ctx.assessment_profile_version,
    program_id: "nuvia_planner",
    session_id: s.daily.date,
    task_id: taskId,
    cognitive_domain: null,
    difficulty_level: s.ctx.complexity,
    level: s.ctx.level, // v1.3 §12.3 — 이벤트 봉투에 level도 함께 기록
    content_version: s.ctx.content_version,
    schema_version: s.ctx.schema_version,
  };
}

export type Action =
  | { type: "OPEN_APP"; now?: Date }
  | { type: "CHOOSE_CHALLENGE"; challengeId: string; usedAiOption?: boolean; now?: Date }
  | { type: "SELF_PLAN"; now?: Date }
  | { type: "ADD_MISSION"; mission: Mission }
  | { type: "SET_PREDICTION"; missionId: string; minutes: number }
  | { type: "SET_BREAKDOWN"; missionId: string; subtasks: string[] }
  | { type: "SET_FOCUS_LENGTH"; missionId: string; length: FocusLength }
  | { type: "SET_ORDER"; order: string[]; reason: OrderReason }
  | { type: "COMMIT_PLAN"; now?: Date }
  | { type: "APPLY_STRATEGY"; strategyId: string }
  | { type: "START_MISSION"; missionId: string; now?: Date }
  | { type: "INTERRUPT"; now?: Date }
  | { type: "RESUME"; now?: Date }
  | { type: "COMPLETE_MISSION"; actualMinutes: number; now?: Date }
  | { type: "SUBMIT_REFLECTION"; reason: string; selfRating: 1 | 2 | 3 | 4 | 5; now?: Date }
  | { type: "SAVE_DISCOVERY"; now?: Date }
  | { type: "SKIP_DISCOVERY" }
  | { type: "SAVE_STRATEGY"; strategyType: StrategyType; sourceDiscoveryId: string | null; now?: Date }
  | { type: "RECORD_STRATEGY_USE"; strategyId: string; contextLabel: string; contextKind: "same_type" | "different_type"; selfInitiated: boolean; now?: Date }
  | { type: "ACCEPT_FADE"; now?: Date }
  | { type: "SKIP_FADE" }
  | { type: "REQUEST_MORE_HELP"; now?: Date }
  | { type: "ABANDON" }
  | { type: "CREATE_RESET"; reason: ResetRecord["reason"]; aiAssisted?: boolean; now?: Date }
  | { type: "REVISE_PLAN"; now?: Date }
  | { type: "PREVIEW_NEXT" }
  | { type: "END_DAY" };

function advance(s: AppState, a: DailyAction): DailyState {
  return { ...s.daily, phase: transition(s.daily.phase, a) };
}

function log(s: AppState, type: Parameters<typeof emitEvent>[0]["type"], payload: Record<string, unknown>, taskId: string | null = null, now?: Date) {
  s.log.append(emitEvent({ ctx: eventContext(s, taskId), type, payload, now }));
}

export function reducer(state: AppState, action: Action): AppState {
  const s: AppState = { ...state, missions: [...state.missions] };
  const now = (action as any).now as Date | undefined;

  switch (action.type) {
    case "OPEN_APP": {
      const t = (now ?? new Date()).toISOString();
      // 후보는 진입 이전에 준비되어야 30초를 지킬 수 있다
      s.candidates = buildChallengeCandidates(s.ctx, {
        recentModules: s.daily.recent_modules,
        bossModule: null,
        rand: () => 0.5,
      });
      s.daily = { ...advance(s, "OPEN_APP"), session_opened_at: t, first_action_at: null };
      return s;
    }

    case "CHOOSE_CHALLENGE": {
      const t = (now ?? new Date()).toISOString();
      const ch = s.candidates.find((c) => c.challenge_id === action.challengeId);
      s.daily = {
        ...advance(s, "CHOOSE_CHALLENGE"),
        chosen_challenge_id: action.challengeId,
        first_action_at: s.daily.first_action_at ?? t,
        recent_modules: ch ? [ch.module, ...s.daily.recent_modules].slice(0, 6) : s.daily.recent_modules,
      };
      log(s, "student_choice_made", {
        choice_type: "daily_challenge",
        chosen_id: action.challengeId,
        options_shown: s.candidates.map((c) => c.challenge_id),
        used_ai_option: action.usedAiOption ?? false,
      }, null, now);
      return s;
    }

    case "SELF_PLAN": {
      const t = (now ?? new Date()).toISOString();
      s.daily = {
        ...advance(s, "CHOOSE_CHALLENGE"),
        chosen_challenge_id: null,
        first_action_at: s.daily.first_action_at ?? t,
      };
      log(s, "student_choice_made", { choice_type: "self_plan", used_ai_option: false }, null, now);
      return s;
    }

    case "ADD_MISSION": {
      s.missions = [...s.missions, action.mission];
      log(s, "mission_created", {
        title: action.mission.title,
        task_type: action.mission.task_type,
        subtask_count: action.mission.subtasks.length,
      }, action.mission.mission_id);
      return s;
    }

    case "SET_PREDICTION":
      s.missions = s.missions.map((m) => m.mission_id === action.missionId ? { ...m, predicted_minutes: action.minutes } : m);
      return s;

    case "SET_BREAKDOWN":
      s.missions = s.missions.map((m) => m.mission_id === action.missionId ? { ...m, subtasks: action.subtasks } : m);
      return s;

    case "SET_FOCUS_LENGTH": {
      s.missions = s.missions.map((m) => m.mission_id === action.missionId ? { ...m, focus_length: action.length } : m);
      log(s, "student_choice_made", { choice_type: "focus_length", value: action.length, used_ai_option: false }, action.missionId);
      return s;
    }

    case "SET_ORDER": {
      s.missions = s.missions.map((m) => ({
        ...m, order_index: action.order.indexOf(m.mission_id), order_reason: action.reason,
      }));
      log(s, "student_choice_made", { choice_type: "priority_order", reason_code: action.reason, used_ai_option: false });
      return s;
    }

    case "COMMIT_PLAN": {
      const ordered = [...s.missions].sort((a, b) => a.order_index - b.order_index);
      s.daily = {
        ...advance(s, "COMMIT_PLAN"),
        missions: ordered,
        plan_snapshot: {
          committed_at: (now ?? new Date()).toISOString(),
          mission_ids: ordered.map((m) => m.mission_id),
          order: ordered.map((m) => m.mission_id),
          total_predicted_minutes: ordered.reduce((a, m) => a + (m.predicted_minutes ?? 0), 0),
        },
      };
      log(s, "daily_plan_committed", {
        mission_count: ordered.length,
        total_predicted_minutes: s.daily.plan_snapshot!.total_predicted_minutes,
        // v1.3 §14.1 Plan-Order Consistency / Completion Reliability 재구성에 필요
        order: ordered.map((m) => m.mission_id),
      }, null, now);
      return s;
    }

    case "APPLY_STRATEGY": {
      const st = s.strategies.find((x) => x.strategy_id === action.strategyId);
      if (!st) return s;
      applyStrategy(st, "student"); // system 호출은 예외
      s.daily = { ...s.daily, applied_strategy_id: st.strategy_id };
      return s;
    }

    case "START_MISSION": {
      const t = (now ?? new Date()).toISOString();
      s.activeMissionId = action.missionId;
      s.missions = s.missions.map((m) => m.mission_id === action.missionId ? { ...m, actual_start: t } : m);
      s.daily = { ...advance(s, "START_MISSION"), first_action_at: s.daily.first_action_at ?? t };
      log(s, "mission_started", { scheduled_start: s.missions.find((m) => m.mission_id === action.missionId)?.scheduled_start ?? null }, action.missionId, now);
      const fm = s.missions.find((m) => m.mission_id === action.missionId);
      if (fm?.focus_length) log(s, "focus_started", { focus_length: fm.focus_length }, action.missionId, now);
      return s;
    }

    case "INTERRUPT": {
      s.missions = s.missions.map((m) => m.mission_id === s.activeMissionId ? { ...m, interruptions: m.interruptions + 1 } : m);
      s.daily = advance(s, "INTERRUPT");
      log(s, "focus_interrupted", { reason_code: "unspecified" }, s.activeMissionId, now);
      return s;
    }

    case "RESUME": {
      s.daily = advance(s, "RESUME");
      log(s, "focus_resumed", {}, s.activeMissionId, now);
      return s;
    }

    case "COMPLETE_MISSION": {
      const id = s.activeMissionId;
      s.missions = s.missions.map((m) => m.mission_id === id
        ? { ...m, completed: true, actual_minutes: action.actualMinutes, duration_source: "timer" as const }
        : m);
      const m = s.missions.find((x) => x.mission_id === id)!;
      s.daily = { ...advance(s, "COMPLETE"), missions: s.missions };
      log(s, "mission_completed", {
        predicted_minutes: m.predicted_minutes, actual_minutes: m.actual_minutes,
        duration_source: m.duration_source, interruptions: m.interruptions,
      }, id, now);

      // 관찰 산출 — 파생 점수는 이벤트에 넣지 않고 observation으로만 축적 (v1.3 §14.1 인스턴스 산식)
      const evtId = s.log.ids("mission_completed").slice(-1)[0];
      const push = (metric: MetricKey, v: { value: number; clamped: boolean } | null) => {
        if (v == null) return;
        s.observations = [...s.observations, {
          metric, value: v.value, clamped: v.clamped, occurred_at: (now ?? new Date()).toISOString(),
          epoch_id: s.ctx.assessment_epoch_id, source_event_id: evtId,
        }];
      };
      push("time_prediction_accuracy", timeSenseAccuracyValue(m));
      push("focus_stability", focusStabilityValue(m));
      push("start_accuracy", startAccuracyValue(m));
      return s;
    }

    case "SUBMIT_REFLECTION": {
      s.daily = { ...advance(s, "SUBMIT_REFLECTION"), reflection_reason: action.reason, self_rating: action.selfRating };
      log(s, "reflection_submitted", {
        reason_code: action.reason,
        // v1.3 §14.1 self_rating_norm의 입력값 (1~5 척도, 0~1 슬라이더 아님)
        self_rating: action.selfRating,
      }, null, now);
      const evtId = s.log.ids("reflection_submitted").slice(-1)[0];
      const at = (now ?? new Date()).toISOString();

      // v1.3 §14.1 일(day) 단위 지표 — 오늘 세션(session_id=daily.date)의
      // 이벤트를 재구성해 Completion Reliability / Planning Accuracy /
      // Plan-Order Consistency / Metacognitive Accuracy를 산출한다.
      const days = groupEventsByDay(s.log.all());
      const today = days.get(s.daily.date);
      const add = (metric: MetricKey, v: { value: number; clamped: boolean } | null) => {
        if (v == null) return;
        s.observations = [...s.observations, {
          metric, value: v.value, clamped: v.clamped, occurred_at: at,
          epoch_id: s.ctx.assessment_epoch_id, source_event_id: evtId,
        }];
      };
      if (today) {
        const cr = dayCompletionReliability(today);
        if (cr != null) add("completion_reliability", { value: cr, clamped: false });
        const pa = dayPlanningAccuracy(today);
        if (pa != null) add("planning_accuracy", pa.value);
        const poc = dayPlanOrderConsistency(today);
        if (poc != null) add("plan_order_consistency", poc);
        const ma = dayMetacognitiveAccuracy(today);
        if (ma != null) add("metacognitive_accuracy", ma);
      }
      return s;
    }

    case "SAVE_DISCOVERY": {
      if (!s.pendingDiscovery) return { ...s, daily: advance(s, "SKIP_DISCOVERY") };
      const g = runDiscoveryGates(s.pendingDiscovery, s.ctx);
      if (!g.ok) return { ...s, pendingDiscovery: null, daily: advance(s, "SKIP_DISCOVERY") };
      const d = saveDiscovery(s.pendingDiscovery, s.ctx, now ?? new Date());
      s.discoveries = [d, ...s.discoveries];
      s.pendingDiscovery = null;
      s.daily = advance(s, "SAVE_DISCOVERY");
      log(s, "discovery_saved", {
        discovery_id: d.discovery_id, discovery_type: d.discovery_type,
        evidence_window: d.evidence_window, evidence_count: d.evidence_count,
      }, null, now);
      return s;
    }

    case "SKIP_DISCOVERY":
      return { ...s, pendingDiscovery: null, daily: advance(s, "SKIP_DISCOVERY") };

    case "SAVE_STRATEGY": {
      const st = saveStrategy(action.strategyType, s.ctx, action.sourceDiscoveryId, now ?? new Date());
      s.strategies = [st, ...s.strategies];
      log(s, "strategy_saved", {
        strategy_id: st.strategy_id, source_discovery_id: st.source_discovery_id, strategy_type: st.strategy_type,
      }, null, now);
      return s;
    }

    case "RECORD_STRATEGY_USE": {
      const use: StrategyUseEvidence = {
        use_id: `use_${action.strategyId}_${(now ?? new Date()).getTime()}`,
        strategy_id: action.strategyId,
        context_label: action.contextLabel,
        context_kind: action.contextKind,
        self_initiated: action.selfInitiated,
        occurred_at: (now ?? new Date()).toISOString(),
      };
      s.strategyUses = [use, ...s.strategyUses];
      // Reuse existing strategy_retried event type; v1.4 event dictionary remains unchanged.
      log(s, "strategy_retried", {
        strategy_id: action.strategyId,
        use_id: use.use_id,
        context_label: use.context_label,
        context_kind: use.context_kind,
        self_initiated: use.self_initiated,
      }, null, now);
      return s;
    }

    case "ACCEPT_FADE": {
      const tr = acceptFade(s.ctx, true);
      s.daily = advance(s, "ACCEPT_FADE");
      s.fadeOffer = null;
      if (tr) {
        s.ctx = { ...s.ctx, scaffold_state: tr.new_support_level };
        log(s, "scaffold_faded", tr as unknown as Record<string, unknown>, null, now);
      }
      return s;
    }

    case "SKIP_FADE":
      return { ...s, fadeOffer: null, daily: advance(s, "SKIP_FADE") };

    case "REQUEST_MORE_HELP": {
      const tr = studentRequestsMoreHelp(s.ctx);
      if (tr) {
        s.ctx = { ...s.ctx, scaffold_state: tr.new_support_level, scaffold_requested_by_student: true };
        log(s, "scaffold_faded", tr as unknown as Record<string, unknown>, null, now);
        log(s, "scaffold_applied", { support_level: tr.new_support_level, requested_by: "student" }, null, now);
      }
      return s;
    }

    case "ABANDON":
      return { ...s, daily: { ...advance(s, "ABANDON") } };

    case "CREATE_RESET": {
      const offered = { ...s, daily: { ...s.daily, phase: transition(s.daily.phase, "OFFER_RESET") } };
      const rec: ResetRecord = {
        reset_id: `rs_${Date.now()}`, created_at: (now ?? new Date()).toISOString(),
        reason: action.reason, scope: "day", restarted_within_24h: null,
      };
      offered.resets = [...s.resets, rec];
      offered.daily = { ...offered.daily, phase: transition(offered.daily.phase, "CREATE_RESET") };
      log(offered, "reset_created", {
        reset_id: rec.reset_id, reason_code: rec.reason, scope: rec.scope, initiated_by: "student",
        // v1.3 §14.2 Autonomy Ratio — "Reset 대응 선택"의 ai_assisted 판정
        ai_assisted: action.aiAssisted === true,
      }, null, now);
      return offered;
    }

    case "REVISE_PLAN": {
      s.daily = advance(s, "REVISE_PLAN");
      log(s, "plan_revised", { revised_mission_count: s.missions.filter((m) => !m.completed).length }, null, now);
      return s;
    }

    case "PREVIEW_NEXT":
      return { ...s, daily: advance(s, "PREVIEW_NEXT") };

    case "END_DAY":
      return { ...s, daily: { ...advance(s, "END_DAY"), chosen_challenge_id: null, applied_strategy_id: null } };

    default:
      return s;
  }
}

// ── 파생 셀렉터 (읽기 전용) ─────────────────────────────────────────────
const ALL_METRICS: MetricKey[] = [
  "time_prediction_accuracy", "start_accuracy", "planning_accuracy", "completion_reliability",
  "focus_stability", "recovery_skill", "plan_order_consistency", "metacognitive_accuracy",
];

export function selectMetrics(s: AppState): MetricResult[] {
  return ALL_METRICS.map((k) => computeMetric(k, s.observations, { epochId: s.ctx.assessment_epoch_id }));
}

export function selectNarrative(s: AppState): string[] {
  return buildNarrative(extractSignals(s.log.all()));
}

export function selectFadeOffer(s: AppState, now = new Date()) {
  const sig: FadeSignals = {
    selfDecidedCount: s.log.byType("student_choice_made").filter((e) => (e.payload as any).used_ai_option !== true).length,
    aiOptionUsedCount: s.log.byType("student_choice_made").filter((e) => (e.payload as any).used_ai_option === true).length,
    moduleObservationCount: s.observations.length,
    recentIncompleteCount: s.missions.filter((m) => !m.completed).length,
    now,
  };
  return evaluateFade(s.ctx, sig);
}

/** v1.3 §13 — 다음 Level 조건 평가(순수 셀렉터, 상태를 바꾸지 않는다) */
export function selectLevelEvaluation(
  s: AppState, now = new Date(), studentSelectedSelfManager = false
): LevelEvaluation {
  return evaluateLevelPromotion({ ctx: s.ctx, events: s.log.all(), observations: s.observations, now, studentSelectedSelfManager });
}

export function createInitialState(ctx: LearnerContext, seed: Partial<AppState> = {}): AppState {
  return {
    ctx,
    daily: {
      date: "2026-04-22", phase: "IDLE", chosen_challenge_id: null, applied_strategy_id: null,
      missions: [], plan_snapshot: null, self_rating: null, reflection_reason: null,
      recent_modules: [], session_opened_at: null, first_action_at: null,
    },
    weekly: { week_start: "2026-04-20", boss: null, observation_week: true, records: [] },
    candidates: [], missions: [], activeMissionId: null,
    discoveries: [], strategies: [], strategyUses: [], observations: [], resets: [],
    pendingDiscovery: null, fadeOffer: null,
    log: new EventLog(), aiUtterancesThisSession: 0,
    ...seed,
  };
}


/** v1.5 — 6개 자기관리 패턴. 기존 Metric을 재계산하지 않고 routing view만 만든다. */
export function selectPatternProfile(s: AppState) {
  return resolvePatternProfile(s.ctx, selectMetrics(s));
}

export function selectStrategyOwnershipStage(s: AppState, strategyId: string) {
  return ownershipStageFor(strategyId, s.strategyUses);
}
