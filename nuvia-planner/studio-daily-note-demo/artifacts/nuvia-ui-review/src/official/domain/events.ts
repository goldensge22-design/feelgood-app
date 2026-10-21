/**
 * EVENT / DATA CONTRACT
 * LOGIC LAYER — LOVABLE MUST NOT EDIT
 *
 * CORE v1.3 §9 envelope 무변경.
 * PLANNER v1.4 §28: 기존 event_type 보존 + 4개만 추가.
 */
import type { VisibilityScope } from "./types";

export type EventType =
  // v1.3 기존 (전량 보존)
  | "daily_plan_committed"
  | "weekly_plan_committed"
  | "plan_revised"
  | "mission_created"
  | "mission_started"
  | "focus_started"
  | "focus_interrupted"
  | "focus_resumed"
  | "mission_completed"
  | "reflection_submitted"
  | "reset_created"
  | "reset_followup"
  | "weekly_boss_selected"
  | "ai_suggestion_shown"
  | "student_choice_made"
  | "scaffold_applied"
  // v1.4 추가 — 이 4개가 전부다 (§28 남발 금지)
  | "discovery_saved"
  | "strategy_saved"
  | "strategy_retried"
  | "scaffold_faded";

export const V13_EVENT_TYPES: EventType[] = [
  "daily_plan_committed", "weekly_plan_committed", "plan_revised", "mission_created",
  "mission_started", "focus_started", "focus_interrupted", "focus_resumed",
  "mission_completed", "reflection_submitted", "reset_created", "reset_followup",
  "weekly_boss_selected", "ai_suggestion_shown", "student_choice_made", "scaffold_applied",
];

export const V14_ADDED_EVENT_TYPES: EventType[] = [
  "discovery_saved", "strategy_saved", "strategy_retried", "scaffold_faded",
];

/** CORE §17 */
export type EventCategory =
  | "student_behavior"
  | "content_operation"
  | "data_quality"
  | "system_integrity";

/** CORE §9 공통 맥락 */
export interface EventContext {
  learner_id: string;
  assessment_id: string | null;
  assessment_profile_version: string | null;
  program_id: string;
  session_id: string;
  task_id: string | null;
  cognitive_domain: string | null;
  difficulty_level: string | null;
  /** v1.3 §12.3(M-6) — "두 값은 이벤트 봉투에 각각 complexity_level, level로 기록한다"의 level */
  level: number | null;
  content_version: string;
  schema_version: string;
}

/** CORE §9 envelope — 필드 추가/삭제 금지 */
export interface NuviaEvent {
  event_id: string;
  learner_id: string;
  program_id: string;
  session_id: string;
  event_type: EventType;
  event_category: EventCategory;
  occurred_at: string;
  occurred_at_local: string;
  timezone_offset: number;
  visibility_scope: VisibilityScope;
  payload: Record<string, unknown>;
  schema_version: string;
}

let seq = 0;
export function resetEventSeq() { seq = 0; }

export interface EmitOptions {
  ctx: EventContext;
  type: EventType;
  payload?: Record<string, unknown>;
  visibility?: VisibilityScope;
  category?: EventCategory;
  now?: Date;
  timezoneOffset?: number;
}

/**
 * 유일한 이벤트 생성 경로. 화면 코드가 직접 객체를 만들지 않는다.
 * 파생 점수(metric value 등)를 payload에 넣지 않는다 (§28).
 */
export function emitEvent(o: EmitOptions): NuviaEvent {
  const now = o.now ?? new Date();
  const tzo = o.timezoneOffset ?? 540; // KST 기본
  const local = new Date(now.getTime() + tzo * 60_000);
  seq += 1;
  return {
    event_id: `evt_${now.getTime()}_${seq}`,
    learner_id: o.ctx.learner_id,
    program_id: o.ctx.program_id,
    session_id: o.ctx.session_id,
    event_type: o.type,
    event_category: o.category ?? "student_behavior",
    occurred_at: now.toISOString(),
    occurred_at_local: local.toISOString().replace("Z", ""),
    timezone_offset: tzo,
    visibility_scope: o.visibility ?? "student",
    payload: { ...(o.payload ?? {}), _ctx: stripCtx(o.ctx) },
    schema_version: o.ctx.schema_version,
  };
}

function stripCtx(c: EventContext) {
  return {
    assessment_id: c.assessment_id,
    assessment_profile_version: c.assessment_profile_version,
    assessment_epoch_ref: c.assessment_id,
    task_id: c.task_id,
    cognitive_domain: c.cognitive_domain,
    /** v1.3 §12.3 — complexity_level, level을 이벤트 봉투에 기록 */
    complexity_level: c.difficulty_level,
    level: c.level,
    content_version: c.content_version,
  };
}

/** 파생 점수 금지 필드 가드 — 테스트와 런타임 개발모드에서 사용 */
const FORBIDDEN_PAYLOAD_KEYS = [
  "total_score", "unified_score", "growth_total", "autonomy_ratio_value",
  "task_breakdown_score", "iq", "self_direction_score",
];

export function assertPayloadClean(e: NuviaEvent): void {
  for (const k of Object.keys(e.payload)) {
    if (FORBIDDEN_PAYLOAD_KEYS.includes(k)) {
      throw new Error(`FORBIDDEN payload key "${k}" on ${e.event_type} (PLANNER §28/§34)`);
    }
  }
}

export class EventLog {
  private events: NuviaEvent[] = [];
  append(e: NuviaEvent) { assertPayloadClean(e); this.events.push(e); }
  all(): readonly NuviaEvent[] { return this.events; }
  byType(t: EventType) { return this.events.filter((e) => e.event_type === t); }
  count(t: EventType) { return this.byType(t).length; }
  ids(t: EventType) { return this.byType(t).map((e) => e.event_id); }
  clear() { this.events = []; }
}
