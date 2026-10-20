/**
 * MY NUVIA ADAPTER — summary contract
 * LOGIC LAYER — LOVABLE MUST NOT EDIT
 *
 * §29: PLANNER는 Self-Regulation / Metacognitive Growth만 제공.
 *      Cognitive/Learning Growth 생성 금지. 통합 Dashboard가 재계산하지 않도록
 *      raw score를 넘기지 않고 state/trend/observation_count만 전달한다.
 * CORE §10: Branch 간 Growth 합산·평균·직접 비교 금지.
 */
import type { Discovery, LearnerContext, MetricResult, Strategy } from "./types";
import { renderStatement } from "./discoveryEngine";

export interface PlannerGrowthSummary {
  learner_id: string;
  branch: "PLANNER";
  assessment_epoch_id: string;
  period: { from: string; to: string };
  growth_domains: {
    self_regulation: { metrics: SummaryMetric[] };
    metacognitive: { metrics: SummaryMetric[] };
  };
  self_direction_narrative: string[];
  discoveries_public: { discovery_id: string; statement: string; evidence_count: number }[];
  strategies_public: { strategy_type: string; status: string; trial_count: number }[];
  content_version: string;
  schema_version: string;
}

/** raw value를 포함하지 않는다 — 구조적으로 총점을 막는다 */
export interface SummaryMetric {
  key: string;
  state: "sufficient" | "insufficient";
  trend: "up" | "flat" | "down" | null;
  observation_count: number;
}

const EXCLUDED_KEYS = ["task_breakdown_observation", "autonomy_ratio"];

export interface AdapterInput {
  ctx: LearnerContext;
  period: { from: string; to: string };
  metrics: MetricResult[];
  discoveries: Discovery[];
  strategies: Strategy[];
  narrative: string[];
}

export function buildPlannerSummary(input: AdapterInput): PlannerGrowthSummary {
  const { ctx } = input;

  const toSummary = (m: MetricResult): SummaryMetric => ({
    key: m.key, state: m.state, trend: m.trend, observation_count: m.observation_count,
  });

  const scoped = input.metrics.filter((m) => !EXCLUDED_KEYS.includes(m.key));

  return {
    learner_id: ctx.learner_id,
    branch: "PLANNER",
    assessment_epoch_id: ctx.assessment_epoch_id,
    period: input.period,
    growth_domains: {
      self_regulation: { metrics: scoped.filter((m) => m.domain === "self_regulation").map(toSummary) },
      metacognitive: { metrics: scoped.filter((m) => m.domain === "metacognitive").map(toSummary) },
    },
    self_direction_narrative: input.narrative,
    discoveries_public: input.discoveries
      .filter((d) => d.assessment_epoch_id === ctx.assessment_epoch_id)
      .map((d) => ({
        discovery_id: d.discovery_id,
        statement: renderStatement(d.statement_template_id, d.statement_params),
        evidence_count: d.evidence_count,
      })),
    strategies_public: input.strategies.map((s) => ({
      strategy_type: s.strategy_type, status: s.status, trial_count: s.trial_count,
    })),
    content_version: ctx.content_version,
    schema_version: ctx.schema_version,
  };
}

/** Cognitive / Learning Growth 생성 금지 (§29) */
export function buildCognitiveGrowth(): never {
  throw new Error("PLANNER must not produce Cognitive Growth (PLANNER §29).");
}
export function buildLearningGrowth(): never {
  throw new Error("PLANNER must not produce Learning Growth (PLANNER §29).");
}

/** epoch 자동 합산 금지 (CORE §5) */
export function mergeSummariesAcrossEpochs(): never {
  throw new Error("Growth lines must not be merged across epochs (CORE §5).");
}
