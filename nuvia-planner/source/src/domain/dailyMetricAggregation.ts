/**
 * 일(day) 단위 지표 재구성 — v1.3 §14.1
 * LOGIC LAYER — LOVABLE MUST NOT EDIT
 *
 * Completion Reliability / Planning Accuracy / Plan-Order Consistency /
 * Metacognitive Accuracy는 §14.1 표에서 최소 관찰수 단위가 "일"(day)이다.
 * 이 파일은 EventLog를 session_id(=하루) 기준으로 묶어 그 날의 인스턴스
 * 값을 재구성한다. 새 상태 저장소를 추가하지 않고 기존 이벤트만으로
 * 계산한다 — 이벤트 계약(§28)을 그대로 쓰기 위함이다.
 */
import type { NuviaEvent } from "./events";
import { timeAccuracyFromValues, spearmanPlanOrderConsistency } from "./modules";
import type { ClampedValue } from "./modules";
import type { Mission } from "./types";

export interface DayEvents {
  session_id: string;
  planCommitted?: NuviaEvent;   // daily_plan_committed
  completed: NuviaEvent[];      // mission_completed (occurred_at 오름차순)
  reflection?: NuviaEvent;      // reflection_submitted
  priorityChoiceMade: boolean;  // student_choice_made(choice_type: priority_order)
  breakItCreated: boolean;      // mission_created(subtask_count>=2)
}

export function groupEventsByDay(events: readonly NuviaEvent[]): Map<string, DayEvents> {
  const days = new Map<string, DayEvents>();
  const get = (sid: string): DayEvents => {
    let d = days.get(sid);
    if (!d) { d = { session_id: sid, completed: [], priorityChoiceMade: false, breakItCreated: false }; days.set(sid, d); }
    return d;
  };
  const sorted = [...events].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  for (const e of sorted) {
    const d = get(e.session_id);
    if (e.event_type === "daily_plan_committed") d.planCommitted = e;
    else if (e.event_type === "mission_completed") d.completed.push(e);
    else if (e.event_type === "reflection_submitted") d.reflection = e;
    else if (e.event_type === "student_choice_made" && (e.payload as any).choice_type === "priority_order") d.priorityChoiceMade = true;
    else if (e.event_type === "mission_created" && ((e.payload as any).subtask_count ?? 0) >= 2) d.breakItCreated = true;
  }
  return days;
}

function plannedOrder(d: DayEvents): string[] {
  return ((d.planCommitted?.payload as any)?.order as string[] | undefined) ?? [];
}

function actualCompletionOrder(d: DayEvents): string[] {
  return d.completed
    .map((e) => (e.payload as any)?._ctx?.task_id as string | null)
    .filter((id): id is string => !!id);
}

/** §14.1 Completion Reliability (일 단위): 완료한 확정계획 과제 수 ÷ 확정계획 과제 수 */
export function dayCompletionReliability(d: DayEvents): number | null {
  const planned = plannedOrder(d);
  if (planned.length === 0) return null;
  const plannedSet = new Set(planned);
  const completedIds = new Set(actualCompletionOrder(d).filter((id) => plannedSet.has(id)));
  return completedIds.size / planned.length;
}

interface DurationAlignmentResult { value: ClampedValue; weightImputed: boolean; }

/** §14.1 Duration Alignment 성분: Σ(w_i×A_i)/Σw_i, w_i=predicted_duration(분, 미입력 시 30분·weight_imputed=true) */
function dayDurationAlignment(d: DayEvents): DurationAlignmentResult | null {
  let sumW = 0, sumWA = 0, any = false, weightImputed = false;
  for (const e of d.completed) {
    const p = e.payload as any;
    const predicted: number | null = p.predicted_minutes ?? null;
    const actual: number | null = p.actual_minutes ?? null;
    const durationSource = p.duration_source ?? null;
    const A = timeAccuracyFromValues(predicted, actual, durationSource);
    if (A == null) continue;
    let w = predicted;
    if (w == null) { w = 30; weightImputed = true; }
    sumW += w; sumWA += w * A.value; any = true;
  }
  if (!any || sumW === 0) return null;
  const raw = sumWA / sumW;
  const value: ClampedValue = raw < 0 ? { value: 0, clamped: true } : raw > 1 ? { value: 1, clamped: true } : { value: raw, clamped: false };
  return { value, weightImputed };
}

export const PLAN_ORDER_MIN_PLANNED_TASKS = 3; // §14.1 보조정의 — 확정 계획 과제 3개 이상인 날만 계산

/** §14.1 Plan-Order Consistency (일 단위) — 확정 과제 3개 이상인 날만 계산 */
export function dayPlanOrderConsistency(d: DayEvents): ClampedValue | null {
  const planned = plannedOrder(d);
  if (planned.length < PLAN_ORDER_MIN_PLANNED_TASKS) return null;
  return spearmanPlanOrderConsistency(planned, actualCompletionOrder(d));
}

export interface DailyPlanningAccuracyResult {
  value: ClampedValue;
  componentMissing: boolean;   // Plan-Order Consistency 계산 불가 시 true
  weightImputed: boolean;
}

/** §14.1 Daily Planning Accuracy = 0.5×DurationAlignment + 0.5×Plan-Order Consistency (PO 결측 시 DA만 사용) */
export function dayPlanningAccuracy(d: DayEvents): DailyPlanningAccuracyResult | null {
  const da = dayDurationAlignment(d);
  if (da == null) return null;
  const po = dayPlanOrderConsistency(d);
  if (po == null) {
    return { value: da.value, componentMissing: true, weightImputed: da.weightImputed };
  }
  const raw = 0.5 * da.value.value + 0.5 * po.value;
  const clamped = da.value.clamped || po.clamped || raw < 0 || raw > 1;
  const value = raw < 0 ? 0 : raw > 1 ? 1 : raw;
  return { value: { value, clamped }, componentMissing: false, weightImputed: da.weightImputed };
}

/** §14.1 self_rating_norm = (r−1)÷4, r∈{1..5} */
export function selfRatingNorm(r: 1 | 2 | 3 | 4 | 5): number {
  return (r - 1) / 4;
}

/** §14.1 observed_norm = 0.5×완료여부(1/0) + 0.5×해당 세션 Time Prediction Accuracy. 같은 session_id에서 산출 */
export function dayObservedNorm(d: DayEvents): ClampedValue | null {
  const planned = plannedOrder(d);
  if (planned.length === 0) return null;
  const plannedSet = new Set(planned);
  const completedIds = new Set(actualCompletionOrder(d).filter((id) => plannedSet.has(id)));
  const fullyCompleted = completedIds.size === planned.length ? 1 : 0;

  const tpas: number[] = [];
  for (const e of d.completed) {
    const p = e.payload as any;
    const A = timeAccuracyFromValues(p.predicted_minutes ?? null, p.actual_minutes ?? null, p.duration_source ?? null);
    if (A != null) tpas.push(A.value);
  }
  if (tpas.length === 0) return null; // 결측 — 0으로 대체하지 않는다 (§14.3)
  const meanTPA = tpas.reduce((a, b) => a + b, 0) / tpas.length;
  const raw = 0.5 * fullyCompleted + 0.5 * meanTPA;
  return raw < 0 ? { value: 0, clamped: true } : raw > 1 ? { value: 1, clamped: true } : { value: raw, clamped: false };
}

/** §14.1 Metacognitive Accuracy (세션 단위): 1 − │self_rating_norm − observed_norm│ */
export function dayMetacognitiveAccuracy(d: DayEvents): ClampedValue | null {
  const r = (d.reflection?.payload as any)?.self_rating as (1 | 2 | 3 | 4 | 5 | undefined);
  if (r == null) return null;
  const observed = dayObservedNorm(d);
  if (observed == null) return null;
  const raw = 1 - Math.abs(selfRatingNorm(r) - observed.value);
  const clamped = observed.clamped || raw < 0 || raw > 1;
  const value = raw < 0 ? 0 : raw > 1 ? 1 : raw;
  return { value, clamped };
}

/** Level 3(Planner) 조건용 — 그 날 Priority 확정 또는 Break It 포함 계획 세션이었는가 */
export function isPlanningSessionDay(d: DayEvents): boolean {
  return !!d.planCommitted && (d.priorityChoiceMade || d.breakItCreated);
}

export type { Mission };
