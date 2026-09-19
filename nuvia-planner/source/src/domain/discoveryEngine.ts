/**
 * DISCOVERY ENGINE — 4중 GATE
 * LOGIC LAYER — LOVABLE MUST NOT EDIT
 *
 * §11: 실제 로그 존재 / 최소관찰수 충족 / epoch 경계 / 관찰형 문장.
 * §34: 근거 없는 AI 성격 해석 금지 → 문장은 템플릿 enum으로만 생성한다.
 */
import type { Discovery, DiscoveryType, LearnerContext, MetricKey, StrategyType } from "./types";
import { MIN_OBSERVATIONS } from "./metrics";

// ── 문장 템플릿 사전 (AI 자유생성 금지) ─────────────────────────────────
export interface DiscoveryTemplate {
  template_id: string;
  type: DiscoveryType;
  metric: MetricKey | null;
  minObservations: number;
  /** 관찰형 문장. {param} 치환만 허용 */
  ko: string;
  params: string[];
  /** 이 발견에서 만들 수 있는 전략 후보 (사전 매핑만 허용) */
  strategyCandidates: StrategyType[];
}

export const DISCOVERY_TEMPLATES: DiscoveryTemplate[] = [
  {
    template_id: "T_TIME_BIAS_01", type: "time_bias_by_task_type",
    metric: "time_prediction_accuracy", minObservations: MIN_OBSERVATIONS.time_prediction_accuracy,
    ko: "{task_type} 과제는 예상보다 평균적으로 더 오래 걸리는 경우가 많았습니다.",
    params: ["task_type"], strategyCandidates: ["BUFFER_TIME", "BREAK_INTO_3"],
  },
  {
    template_id: "T_FOCUS_FIT_01", type: "focus_length_fit",
    metric: "focus_stability", minObservations: MIN_OBSERVATIONS.focus_stability,
    ko: "{short}분 Focus로 시작한 날은 {long}분으로 시작한 날보다 착수가 빨랐습니다.",
    params: ["short", "long"], strategyCandidates: ["FIFTEEN_MIN_START", "FOCUS_25"],
  },
  {
    template_id: "T_BREAKDOWN_01", type: "breakdown_start_link",
    metric: null, minObservations: 3,
    ko: "큰 과제를 {n}개 이상으로 나눈 날에 실제 시작이 더 빨랐던 패턴이 관찰됐습니다.",
    params: ["n"], strategyCandidates: ["BREAK_INTO_3"],
  },
  {
    template_id: "T_RESET_01", type: "reset_restart_link",
    metric: "recovery_skill", minObservations: MIN_OBSERVATIONS.recovery_skill,
    ko: "계획이 틀어진 뒤 Reset을 한 날에는 24시간 내 재시작이 더 자주 나타났습니다.",
    params: [], strategyCandidates: ["RESET_TOMORROW"],
  },
  {
    template_id: "T_START_DELAY_01", type: "start_delay_context",
    metric: "start_accuracy", minObservations: MIN_OBSERVATIONS.start_accuracy,
    ko: "{time_band} 시간대에 착수가 예정보다 늦어진 경우가 더 많았습니다.",
    params: ["time_band"], strategyCandidates: ["FIVE_MIN_START", "FIFTEEN_MIN_START"],
  },
  {
    template_id: "T_PLAN_VOLUME_01", type: "plan_volume_bias",
    metric: "planning_accuracy", minObservations: MIN_OBSERVATIONS.planning_accuracy,
    ko: "계획한 항목 수가 실제 수행보다 많았던 날이 최근 더 자주 나타났습니다.",
    params: [], strategyCandidates: ["BREAK_INTO_3", "HARD_FIRST"],
  },
  {
    template_id: "T_ORDER_FIT_01", type: "order_principle_fit",
    metric: "plan_order_consistency", minObservations: MIN_OBSERVATIONS.plan_order_consistency,
    ko: "'{principle}'로 정한 날에 계획 순서가 더 잘 유지되었습니다.",
    params: ["principle"], strategyCandidates: ["HARD_FIRST"],
  },
];

export function findTemplate(id: string) {
  return DISCOVERY_TEMPLATES.find((t) => t.template_id === id) ?? null;
}

export function renderStatement(templateId: string, params: Record<string, string | number>): string {
  const t = findTemplate(templateId);
  if (!t) throw new Error(`Unknown discovery template: ${templateId} (§11)`);
  return t.ko.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}

// ── 금지어 사전 (§11, §22, §34) ─────────────────────────────────────────
export const FORBIDDEN_PATTERNS: RegExp[] = [
  /성격|성향|기질/, /완벽주의|게으르|의지가 부족|나태/,
  /능력이 (부족|우수|뛰어)/, /집중력이 (부족|낮|떨어)/,
  /진단|장애|ADHD|경향이 있는 학습장애/,
  /자기주도성이 \d+점|점으로 향상|자기주도학습 능력이 우수/,
  /IQ|지능이 (향상|높|낮)/, /때문에 .*능력이 향상/,
  /상위 \d+%|반에서 \d+등|랭킹|순위/,
];

export function violatesGuardrail(statement: string): string | null {
  for (const p of FORBIDDEN_PATTERNS) if (p.test(statement)) return p.source;
  return null;
}

// ── 4중 GATE ────────────────────────────────────────────────────────────
export interface DiscoveryCandidate {
  template_id: string;
  params: Record<string, string | number>;
  evidence_count: number;
  source_event_ids: string[];
  evidence_window: { from: string; to: string };
  evidence_epoch_ids: string[];   // 근거가 걸친 epoch 목록
}

export type GateResult =
  | { ok: true; statement: string; template: DiscoveryTemplate }
  | { ok: false; gate: 1 | 2 | 3 | 4; reason: string; remaining?: number };

export function runDiscoveryGates(c: DiscoveryCandidate, ctx: LearnerContext): GateResult {
  // GATE 1 — 실제 로그 존재
  if (c.source_event_ids.length === 0) {
    return { ok: false, gate: 1, reason: "no_source_events" };
  }
  const t = findTemplate(c.template_id);
  // GATE 4(선행 검사) — 템플릿 enum 매칭
  if (!t) return { ok: false, gate: 4, reason: "unknown_template" };

  // GATE 2 — 최소관찰수
  if (c.evidence_count < t.minObservations) {
    return {
      ok: false, gate: 2, reason: "insufficient_observations",
      remaining: t.minObservations - c.evidence_count,
    };
  }
  // GATE 3 — 단일 epoch 근거 (CORE §5)
  const distinct = new Set(c.evidence_epoch_ids);
  if (distinct.size !== 1 || !distinct.has(ctx.assessment_epoch_id)) {
    return { ok: false, gate: 3, reason: "epoch_boundary_crossed" };
  }
  // GATE 4 — 템플릿 렌더 + 금지어
  const statement = renderStatement(c.template_id, c.params);
  const v = violatesGuardrail(statement);
  if (v) return { ok: false, gate: 4, reason: `forbidden_pattern:${v}` };

  return { ok: true, statement, template: t };
}

/**
 * 학생이 [저장]을 눌렀을 때만 호출된다. AI가 직접 호출해서는 안 된다 (§11).
 */
export function saveDiscovery(
  c: DiscoveryCandidate, ctx: LearnerContext, now = new Date()
): Discovery {
  const g = runDiscoveryGates(c, ctx);
  if (!g.ok) throw new Error(`Discovery blocked at GATE ${g.gate}: ${g.reason}`);
  return {
    discovery_id: `dis_${now.getTime()}`,
    learner_id: ctx.learner_id,
    discovery_type: g.template.type,
    statement_template_id: c.template_id,
    statement_params: c.params,
    evidence_window: c.evidence_window,
    evidence_count: c.evidence_count,
    source_event_ids: c.source_event_ids,
    assessment_epoch_id: ctx.assessment_epoch_id,
    content_version: ctx.content_version,
    schema_version: ctx.schema_version,
    confidence_state: "observed",
    saved_by: "student",
    created_at: now.toISOString(),
  };
}

/** 근거 약화 시 삭제하지 않고 상태만 전환 (§12 규칙을 Discovery에도 적용) */
export function weakenDiscovery(d: Discovery): Discovery {
  return { ...d, confidence_state: "weakening" };
}

/** Anticipation 문구의 유일한 근거. 점수가 아니다 (§1.4) */
export function remainingForDiscovery(templateId: string, count: number): number {
  const t = findTemplate(templateId);
  return t ? Math.max(0, t.minObservations - count) : 0;
}
