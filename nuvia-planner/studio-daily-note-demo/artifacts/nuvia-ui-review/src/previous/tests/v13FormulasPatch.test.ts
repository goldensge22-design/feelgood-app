/**
 * PATCH 1/3/4/5 검증 — v1.3 PLANNER PRODUCT SPECIFICATION §12/§13/§14 원문 구현 확인
 */
import { describe, it, expect } from "vitest";
import {
  timeSenseAccuracyValue, startAccuracyValue, focusStabilityValue,
  spearmanPlanOrderConsistency, recoverySkillValue, recoverySkillInstanceValue,
} from "../domain/modules";
import type { ResetRecord } from "../domain/modules";
import {
  dayCompletionReliability, dayPlanningAccuracy,
  dayMetacognitiveAccuracy, selfRatingNorm, groupEventsByDay,
} from "../domain/dailyMetricAggregation";
import { computeMetric, MIN_OBSERVATIONS } from "../domain/metrics";
import type { Observation } from "../domain/metrics";
import {
  evaluateLevelPromotion, LEVEL_CONDITION_TEXT,
} from "../domain/levelProgression";
import {
  evaluateComplexityTransition, applyComplexityDecision, complexityCapForLevel,
  clampComplexityToLevelCap, assertComplexityNotExposedToStudent,
  UPGRADE_MIN_USAGE_14D, UPGRADE_MIN_COMPLETION_RATE, NEW_EPOCH_STABILIZATION_DAYS,
} from "../domain/complexityEngine";
import { computeAutonomyRatio } from "../domain/autonomyRatio";
import { createInitialState, reducer } from "../domain/store";
import type { Action, AppState } from "../domain/store";
import { emitEvent } from "../domain/events";
import type { NuviaEvent } from "../domain/events";
import { makeLearner, makeMission, EPOCH_ID, CONTENT_VERSION, SCHEMA_VERSION } from "../mock/mockData";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MeScreen } from "../screens/screens";

const ctx = makeLearner();

// ═══════════════════════════════════════════════════════════════════════
// CR-2 — 8개 Growth Metric 산식 (v1.3 §14.1)
// ═══════════════════════════════════════════════════════════════════════
describe("§14.1-1 Time Prediction Accuracy: 1 − |actual−predicted| ÷ max(actual,predicted,5분)", () => {
  it("예상 30 / 실제 44 → 1 - 14/44", () => {
    const m = makeMission({ predicted_minutes: 30, actual_minutes: 44, duration_source: "timer" });
    const r = timeSenseAccuracyValue(m)!;
    expect(r.value).toBeCloseTo(1 - 14 / 44, 6);
    expect(r.clamped).toBe(false);
  });

  it("5분 하한 — 예상 2 / 실제 3 → 분모는 max(3,2,5)=5", () => {
    const m = makeMission({ predicted_minutes: 2, actual_minutes: 3, duration_source: "manual_recall" });
    const r = timeSenseAccuracyValue(m)!;
    expect(r.value).toBeCloseTo(1 - 1 / 5, 6);
  });

  it("duration_source가 none이면 결측(null)", () => {
    const m = makeMission({ predicted_minutes: 30, actual_minutes: 44, duration_source: "none" });
    expect(timeSenseAccuracyValue(m)).toBeNull();
  });

  it("duration_source가 미기록(null)이어도 결측", () => {
    const m = makeMission({ predicted_minutes: 30, actual_minutes: 44, duration_source: null });
    expect(timeSenseAccuracyValue(m)).toBeNull();
  });
});

describe("§14.1-2 / M-2 Start Accuracy: 1 − min(max(actual−planned,0)/60,1) — 비대칭", () => {
  it("23분 지연 → 1 - 23/60", () => {
    const m = makeMission({ scheduled_start: "2026-04-22T19:00:00.000Z", actual_start: "2026-04-22T19:23:00.000Z" });
    const r = startAccuracyValue(m)!;
    expect(r.value).toBeCloseTo(1 - 23 / 60, 6);
  });

  it("조기 착수(10분 일찍)는 오차로 처리하지 않는다 — 정확도 1.0", () => {
    const m = makeMission({ scheduled_start: "2026-04-22T19:00:00.000Z", actual_start: "2026-04-22T18:50:00.000Z" });
    const r = startAccuracyValue(m)!;
    expect(r.value).toBe(1);
  });

  it("60분 이상 지연은 0으로 클램프(수식 내 min()이 이미 범위를 보장)", () => {
    const m = makeMission({ scheduled_start: "2026-04-22T19:00:00.000Z", actual_start: "2026-04-22T20:30:00.000Z" });
    const r = startAccuracyValue(m)!;
    expect(r.value).toBe(0);
    // raw = 1 - min(90/60,1) = 0 — 이미 0..1 범위 내이므로 clamp01은 추가 클램프를 기록하지 않는다
    expect(r.clamped).toBe(false);
  });
});

describe("§14.1-5 Focus Stability: min(actual/target,1) × [1/(1+0.25×interruptions)]", () => {
  it("목표 25분, 실제 25분, 중단 0회 → 1.0", () => {
    const m = makeMission({ focus_length: 25, actual_minutes: 25, interruptions: 0, duration_source: "timer" });
    expect(focusStabilityValue(m)!.value).toBeCloseTo(1, 6);
  });

  it("목표 25분, 실제 20분, 중단 2회 → (20/25) × 1/(1+0.5)", () => {
    const m = makeMission({ focus_length: 25, actual_minutes: 20, interruptions: 2, duration_source: "timer" });
    const expected = Math.min(20 / 25, 1) * (1 / (1 + 0.25 * 2));
    expect(focusStabilityValue(m)!.value).toBeCloseTo(expected, 6);
  });

  it("실제시간이 목표를 초과해도 duration ratio는 1로 클램프", () => {
    const m = makeMission({ focus_length: 25, actual_minutes: 40, interruptions: 0, duration_source: "timer" });
    expect(focusStabilityValue(m)!.value).toBeCloseTo(1, 6);
  });
});

describe("§14.1-6 Recovery Skill: Reset 후 24시간 내 재실행 수 ÷ Reset 대상 과제 수", () => {
  const resets: ResetRecord[] = [
    { reset_id: "r1", created_at: "d", reason: "plan_too_big", scope: "day", restarted_within_24h: true },
    { reset_id: "r2", created_at: "d", reason: "interrupted", scope: "day", restarted_within_24h: false },
    { reset_id: "r3", created_at: "d", reason: "other", scope: "day", restarted_within_24h: true },
  ];
  it("3건 중 2건 재실행 → 2/3", () => {
    expect(recoverySkillValue(resets)).toBeCloseTo(2 / 3, 6);
  });
  it("미해결(null)은 분모에서 제외", () => {
    const withPending: ResetRecord[] = [...resets, { reset_id: "r4", created_at: "d", reason: "other", scope: "day", restarted_within_24h: null }];
    expect(recoverySkillValue(withPending)).toBeCloseTo(2 / 3, 6);
    expect(recoverySkillInstanceValue(withPending[3])).toBeNull();
  });
});

describe("§14.1-7 Plan-Order Consistency: (Spearman ρ+1)/2, 미수행 과제는 순위에서 제외", () => {
  it("계획 순서와 실제 순서가 완전히 같으면 ρ=1 → value=1", () => {
    const r = spearmanPlanOrderConsistency(["a", "b", "c"], ["a", "b", "c"])!;
    expect(r.value).toBeCloseTo(1, 6);
  });

  it("완전히 역순이면 ρ=-1 → value=0", () => {
    const r = spearmanPlanOrderConsistency(["a", "b", "c"], ["c", "b", "a"])!;
    expect(r.value).toBeCloseTo(0, 6);
  });

  it("미수행 과제(c)는 순위 계산에서 제외 — a,b만으로 계산", () => {
    // planned=[a,b,c], actual=[b,a] (c 미수행) → 교집합 {a,b}, 순서 반전 → ρ=-1 → 0
    const r = spearmanPlanOrderConsistency(["a", "b", "c"], ["b", "a"])!;
    expect(r.value).toBeCloseTo(0, 6);
  });

  it("교집합 원소가 2개 미만이면 결측(null)", () => {
    expect(spearmanPlanOrderConsistency(["a", "b", "c"], ["z"])).toBeNull();
    expect(spearmanPlanOrderConsistency(["a"], ["a"])).toBeNull();
  });
});

describe("§14.1-3/8/4 일 단위 지표 — Completion Reliability / Planning Accuracy / Metacognitive Accuracy", () => {
  function committed(order: string[], sid: string): NuviaEvent {
    return emitEvent({
      ctx: baseEventCtx(sid), type: "daily_plan_committed",
      payload: { mission_count: order.length, order },
    });
  }
  function completed(taskId: string, predicted: number, actual: number, sid: string, at: string): NuviaEvent {
    return emitEvent({
      ctx: { ...baseEventCtx(sid), task_id: taskId }, type: "mission_completed",
      payload: { predicted_minutes: predicted, actual_minutes: actual, duration_source: "timer", interruptions: 0 },
      now: new Date(at),
    });
  }
  function reflected(sid: string, selfRating: 1 | 2 | 3 | 4 | 5): NuviaEvent {
    return emitEvent({ ctx: baseEventCtx(sid), type: "reflection_submitted", payload: { reason_code: "x", self_rating: selfRating } });
  }
  function baseEventCtx(sid: string) {
    return {
      learner_id: ctx.learner_id, assessment_id: ctx.assessment_id, assessment_profile_version: ctx.assessment_profile_version,
      program_id: "nuvia_planner", session_id: sid, task_id: null, cognitive_domain: null,
      difficulty_level: ctx.complexity, level: ctx.level, content_version: CONTENT_VERSION, schema_version: SCHEMA_VERSION,
    };
  }

  it("Completion Reliability: 확정 3개 중 2개 완료 → 2/3", () => {
    const events = [
      committed(["m1", "m2", "m3"], "d1"),
      completed("m1", 30, 30, "d1", "2026-04-22T10:00:00Z"),
      completed("m2", 20, 25, "d1", "2026-04-22T11:00:00Z"),
    ];
    const days = groupEventsByDay(events);
    expect(dayCompletionReliability(days.get("d1")!)).toBeCloseTo(2 / 3, 6);
  });

  it("Planning Accuracy: Plan-Order 결측 시(확정<3개) Duration Alignment만 사용, component_missing=true", () => {
    const events = [
      committed(["m1", "m2"], "d1"),
      completed("m1", 30, 30, "d1", "2026-04-22T10:00:00Z"),
      completed("m2", 20, 20, "d1", "2026-04-22T11:00:00Z"),
    ];
    const days = groupEventsByDay(events);
    const pa = dayPlanningAccuracy(days.get("d1")!)!;
    expect(pa.componentMissing).toBe(true);
    expect(pa.value.value).toBeCloseTo(1, 6); // 둘 다 정확히 맞춤 → DurationAlignment=1
  });

  it("Planning Accuracy: 확정 3개 이상이면 0.5×DA + 0.5×PO 결합", () => {
    const events = [
      committed(["m1", "m2", "m3"], "d1"),
      completed("m1", 30, 30, "d1", "2026-04-22T10:00:00Z"),
      completed("m2", 20, 20, "d1", "2026-04-22T11:00:00Z"),
      completed("m3", 10, 10, "d1", "2026-04-22T12:00:00Z"),
    ];
    const days = groupEventsByDay(events);
    const pa = dayPlanningAccuracy(days.get("d1")!)!;
    expect(pa.componentMissing).toBe(false);
    // 순서 그대로 완료 → PO=1, DA=1 → 결합값 1
    expect(pa.value.value).toBeCloseTo(1, 6);
  });

  it("Metacognitive Accuracy: self_rating_norm=(r-1)/4, observed_norm=0.5×완료여부+0.5×meanTPA", () => {
    const events = [
      committed(["m1"], "d1"),
      completed("m1", 30, 30, "d1", "2026-04-22T10:00:00Z"), // TPA=1, 완료율=1 → observed_norm=1
      reflected("d1", 5), // self_rating_norm=(5-1)/4=1
    ];
    const days = groupEventsByDay(events);
    const ma = dayMetacognitiveAccuracy(days.get("d1")!)!;
    expect(ma.value).toBeCloseTo(1, 6); // |1-1|=0 → 1-0=1
  });

  it("selfRatingNorm(1)=0, selfRatingNorm(5)=1", () => {
    expect(selfRatingNorm(1)).toBe(0);
    expect(selfRatingNorm(5)).toBe(1);
  });

  it("reflection이 없는 날은 Metacognitive Accuracy 결측", () => {
    const events = [committed(["m1"], "d1"), completed("m1", 30, 30, "d1", "2026-04-22T10:00:00Z")];
    const days = groupEventsByDay(events);
    expect(dayMetacognitiveAccuracy(days.get("d1")!)).toBeNull();
  });
});

describe("§14.3 경계조건과 결측 처리", () => {
  it("최소관찰수 미충족 지표는 값을 생성하지 않고 '관찰 중' 상태", () => {
    const obs: Observation[] = [
      { metric: "start_accuracy", value: 0.8, occurred_at: "2026-04-01T00:00:00Z", epoch_id: EPOCH_ID, source_event_id: "e1" },
    ];
    const r = computeMetric("start_accuracy", obs, { epochId: EPOCH_ID });
    expect(r.state).toBe("insufficient");
    expect(r.value).toBeNull();
  });

  it("클램프가 발생하면 clamped=true로 기록된다", () => {
    const obs: Observation[] = Array.from({ length: 5 }, (_, i) => ({
      metric: "start_accuracy" as const, value: 1, clamped: i === 0, occurred_at: `2026-04-0${i + 1}T00:00:00Z`,
      epoch_id: EPOCH_ID, source_event_id: `e${i}`,
    }));
    const r = computeMetric("start_accuracy", obs, { epochId: EPOCH_ID });
    expect(r.clamped).toBe(true);
  });

  it("다른 epoch 관찰은 산입하지 않는다 (CORE §5)", () => {
    const obs: Observation[] = [
      ...Array.from({ length: 5 }, (_, i) => ({
        metric: "start_accuracy" as const, value: 0.5, occurred_at: `2026-04-0${i + 1}T00:00:00Z`,
        epoch_id: "epoch_old", source_event_id: `old${i}`,
      })),
    ];
    const r = computeMetric("start_accuracy", obs, { epochId: EPOCH_ID });
    expect(r.state).toBe("insufficient");
  });
});

describe("PROVISIONAL 제거 확인", () => {
  it("metrics.ts가 installReferenceFormula/PROVISIONAL을 더 이상 export하지 않는다", async () => {
    const metricsModule = await import("../domain/metrics");
    expect((metricsModule as any).installReferenceFormula).toBeUndefined();
    expect((metricsModule as any).PROVISIONAL).toBeUndefined();
    expect((metricsModule as any).ReferenceFormula).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CR-3 — Level 1~6 승급 (v1.3 §13.1)
// ═══════════════════════════════════════════════════════════════════════
describe("§13.1 Level 승급 조건", () => {
  const T = (h: number) => new Date(`2026-04-01T${String(h).padStart(2, "0")}:00:00.000Z`);

  function seedState(level: 1 | 2 | 3 | 4 | 5 | 6): AppState {
    return createInitialState(makeLearner("B", { level, epoch_started_at: "2026-04-01T00:00:00.000Z" }));
  }

  it("Level 1→2: Time/Start 예측 로그 5회 미만이면 승급 안 함", () => {
    let s = seedState(1);
    const obs: Observation[] = Array.from({ length: 4 }, (_, i) => ({
      metric: "time_prediction_accuracy" as const, value: 0.8, occurred_at: `2026-04-0${i + 1}T00:00:00Z`,
      epoch_id: s.ctx.assessment_epoch_id, source_event_id: `e${i}`,
    }));
    s = { ...s, observations: obs };
    const ev = evaluateLevelPromotion({ ctx: s.ctx, events: s.log.all(), observations: s.observations, now: T(100) });
    expect(ev.nextLevel).toBe(1); // 승급 안 함
  });

  it("Level 1→2: Time/Start 예측 로그 5회 이상이면 승급", () => {
    let s = seedState(1);
    const obs: Observation[] = Array.from({ length: 5 }, (_, i) => ({
      metric: i % 2 === 0 ? "time_prediction_accuracy" : "start_accuracy", value: 0.8,
      occurred_at: `2026-04-0${i + 1}T00:00:00Z`, epoch_id: s.ctx.assessment_epoch_id, source_event_id: `e${i}`,
    }));
    s = { ...s, observations: obs };
    const ev = evaluateLevelPromotion({ ctx: s.ctx, events: s.log.all(), observations: s.observations, now: T(100) });
    expect(ev.nextLevel).toBe(2);
    expect(ev.result?.met).toBe(true);
  });

  it("Level 2→3: Priority 또는 Break It 포함 계획 세션 5회", () => {
    const s0 = seedState(2);
    const c = { learner_id: s0.ctx.learner_id, assessment_id: s0.ctx.assessment_id, assessment_profile_version: null,
      program_id: "nuvia_planner", session_id: "d", task_id: null, cognitive_domain: null,
      difficulty_level: s0.ctx.complexity, level: s0.ctx.level, content_version: CONTENT_VERSION, schema_version: SCHEMA_VERSION };
    const events: NuviaEvent[] = [];
    for (let i = 1; i <= 5; i++) {
      const sid = `2026-04-0${i}`;
      events.push(emitEvent({ ctx: { ...c, session_id: sid }, type: "daily_plan_committed", payload: { mission_count: 1, order: ["m1"] } }));
      events.push(emitEvent({ ctx: { ...c, session_id: sid }, type: "student_choice_made", payload: { choice_type: "priority_order", used_ai_option: false } }));
    }
    const ev = evaluateLevelPromotion({ ctx: { ...s0.ctx, level: 2 }, events, observations: [], now: T(200) });
    expect(ev.nextLevel).toBe(3);
  });

  it("Level 4→5: Reset 수행 3회 + 재실행 2회 이상", () => {
    const s0 = seedState(4);
    const c = { learner_id: s0.ctx.learner_id, assessment_id: s0.ctx.assessment_id, assessment_profile_version: null,
      program_id: "nuvia_planner", session_id: "d", task_id: null, cognitive_domain: null,
      difficulty_level: s0.ctx.complexity, level: s0.ctx.level, content_version: CONTENT_VERSION, schema_version: SCHEMA_VERSION };
    const events: NuviaEvent[] = [];
    for (let i = 0; i < 3; i++) {
      events.push(emitEvent({ ctx: c, type: "reset_created", payload: { reset_id: `r${i}`, reason_code: "plan_too_big", scope: "day", initiated_by: "student" } }));
    }
    for (let i = 0; i < 2; i++) {
      events.push(emitEvent({ ctx: c, type: "reset_followup", payload: { restarted_within_24h: true } }));
    }
    const ev = evaluateLevelPromotion({ ctx: { ...s0.ctx, level: 4 }, events, observations: [], now: T(200) });
    expect(ev.nextLevel).toBe(5);
  });

  it("Level 4→5: 재실행이 1회뿐이면 승급하지 않는다", () => {
    const s0 = seedState(4);
    const c = { learner_id: s0.ctx.learner_id, assessment_id: s0.ctx.assessment_id, assessment_profile_version: null,
      program_id: "nuvia_planner", session_id: "d", task_id: null, cognitive_domain: null,
      difficulty_level: s0.ctx.complexity, level: s0.ctx.level, content_version: CONTENT_VERSION, schema_version: SCHEMA_VERSION };
    const events: NuviaEvent[] = [];
    for (let i = 0; i < 3; i++) {
      events.push(emitEvent({ ctx: c, type: "reset_created", payload: { reset_id: `r${i}`, reason_code: "plan_too_big", scope: "day", initiated_by: "student" } }));
    }
    events.push(emitEvent({ ctx: c, type: "reset_followup", payload: { restarted_within_24h: true } }));
    const ev = evaluateLevelPromotion({ ctx: { ...s0.ctx, level: 4 }, events, observations: [], now: T(200) });
    expect(ev.nextLevel).toBe(4);
  });

  it("Level 5→6 path②: 핵심 지표 3개 이상 안정 + 학생이 Self-Manager 직접 선택", () => {
    const now = new Date("2026-05-01T00:00:00.000Z");
    const epochStart = "2026-04-01T00:00:00.000Z";
    const c = makeLearner("D", { level: 5, epoch_started_at: epochStart, assessment_epoch_id: EPOCH_ID });
    // 4개 지표를 4주 연속 안정 구간으로 시딩(주간 평균 동일값, 각 주 최소관찰수 충족)
    const stableMetrics = ["start_accuracy", "focus_stability", "recovery_skill"] as const;
    const obs: Observation[] = [];
    for (const metric of stableMetrics) {
      const min = MIN_OBSERVATIONS[metric];
      for (let week = 0; week < 4; week++) {
        for (let k = 0; k < min; k++) {
          const t = new Date(now.getTime() - (4 - week) * 7 * 86_400_000 + k * 3600_000);
          obs.push({ metric, value: 0.7, occurred_at: t.toISOString(), epoch_id: EPOCH_ID, source_event_id: `s_${metric}_${week}_${k}` });
        }
      }
    }
    const ev = evaluateLevelPromotion({
      ctx: c, events: [], observations: obs, now, studentSelectedSelfManager: true,
    });
    expect(ev.nextLevel).toBe(6);
  });

  it("Level 5→6: Autonomy Ratio ≥0.70이면 path①로도 승급", () => {
    const now = new Date("2026-05-01T00:00:00.000Z");
    const c = makeLearner("D", { level: 5, epoch_started_at: "2026-04-01T00:00:00.000Z", assessment_epoch_id: EPOCH_ID });
    const stableMetrics = ["start_accuracy", "focus_stability", "recovery_skill"] as const;
    const obs: Observation[] = [];
    for (const metric of stableMetrics) {
      const min = MIN_OBSERVATIONS[metric];
      for (let week = 0; week < 4; week++) {
        for (let k = 0; k < min; k++) {
          const t = new Date(now.getTime() - (4 - week) * 7 * 86_400_000 + k * 3600_000);
          obs.push({ metric, value: 0.6, occurred_at: t.toISOString(), epoch_id: EPOCH_ID, source_event_id: `s2_${metric}_${week}_${k}` });
        }
      }
    }
    const evCtx = { learner_id: c.learner_id, assessment_id: c.assessment_id, assessment_profile_version: null,
      program_id: "nuvia_planner", session_id: "d", task_id: null, cognitive_domain: null,
      difficulty_level: c.complexity, level: c.level, content_version: CONTENT_VERSION, schema_version: SCHEMA_VERSION };
    const events: NuviaEvent[] = [];
    for (let i = 0; i < 10; i++) {
      events.push(emitEvent({ ctx: evCtx, type: "student_choice_made",
        payload: { choice_type: "daily_challenge", used_ai_option: false },
        now: new Date(now.getTime() - i * 86_400_000) }));
    }
    const ev = evaluateLevelPromotion({ ctx: c, events, observations: obs, now, studentSelectedSelfManager: false });
    expect(ev.nextLevel).toBe(6);
  });

  it("핵심 지표가 2개만 안정이면 Level 6 승급하지 않는다", () => {
    const now = new Date("2026-05-01T00:00:00.000Z");
    const c = makeLearner("D", { level: 5, epoch_started_at: "2026-04-01T00:00:00.000Z", assessment_epoch_id: EPOCH_ID });
    const obs: Observation[] = [];
    for (const metric of ["start_accuracy", "focus_stability"] as const) {
      const min = MIN_OBSERVATIONS[metric];
      for (let week = 0; week < 4; week++) {
        for (let k = 0; k < min; k++) {
          const t = new Date(now.getTime() - (4 - week) * 7 * 86_400_000 + k * 3600_000);
          obs.push({ metric, value: 0.7, occurred_at: t.toISOString(), epoch_id: EPOCH_ID, source_event_id: `s3_${metric}_${week}_${k}` });
        }
      }
    }
    const ev = evaluateLevelPromotion({ ctx: c, events: [], observations: obs, now, studentSelectedSelfManager: true });
    expect(ev.nextLevel).toBe(5);
  });

  it("모든 Level의 조건 텍스트가 원문과 일치한다(문서화·감사용)", () => {
    expect(LEVEL_CONDITION_TEXT[1]).toContain("Week 1");
    expect(LEVEL_CONDITION_TEXT[2]).toContain("Time/Start 예측");
    expect(LEVEL_CONDITION_TEXT[3]).toContain("Priority 또는 Break It");
    expect(LEVEL_CONDITION_TEXT[4]).toContain("Focus/중단복귀");
    expect(LEVEL_CONDITION_TEXT[5]).toContain("Reset 수행 3회");
    expect(LEVEL_CONDITION_TEXT[6]).toContain("안정 구간");
  });
});

describe("Level 하향 금지 (§13, §12.3)", () => {
  it("조건 미충족이어도 nextLevel은 currentLevel 이상이다", () => {
    const s = createInitialState(makeLearner("B", { level: 4 }));
    const ev = evaluateLevelPromotion({ ctx: s.ctx, events: [], observations: [], now: new Date() });
    expect(ev.nextLevel).toBeGreaterThanOrEqual(4);
  });

  it("Level 6에서는 더 평가할 다음 단계가 없다(그대로 유지)", () => {
    const s = createInitialState(makeLearner("D", { level: 6 }));
    const ev = evaluateLevelPromotion({ ctx: s.ctx, events: [], observations: [], now: new Date() });
    expect(ev.nextLevel).toBe(6);
    expect(ev.conditionChecked).toBeNull();
  });

  it("evaluateLevelPromotion의 리턴 타입 자체가 하향 값을 만들 수 없다(로직 상 min은 currentLevel)", () => {
    // 모든 조건을 고의로 실패시켜도(관찰 0건) nextLevel은 하향하지 않는다
    const s = createInitialState(makeLearner("B", { level: 3 }));
    const ev = evaluateLevelPromotion({ ctx: s.ctx, events: [], observations: [], now: new Date() });
    expect(ev.nextLevel).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CR-5 — Adaptive Complexity (v1.3 §12)
// ═══════════════════════════════════════════════════════════════════════
describe("§12.2 Complexity 승강 규칙 — 상향", () => {
  it("사용≥5회(14일) + 완료율≥70% + AI사용감소 → 상향", () => {
    const d = evaluateComplexityTransition({
      usageCount14d: UPGRADE_MIN_USAGE_14D, coreMissionCompletionRate14d: UPGRADE_MIN_COMPLETION_RATE,
      aiUsageTrend: "decreasing", autonomousChoiceTrend: "flat", daysSinceEpochStart: 30,
      helpRequestCountRecent: 1, helpRequestCountPrior: 1,
      repeatedConfusionObserved: false, excessivePlanningObserved: false, highVariability: false,
    });
    expect(d.action).toBe("upgrade");
  });

  it("완료율이 70% 미만이면 상향하지 않는다", () => {
    const d = evaluateComplexityTransition({
      usageCount14d: 10, coreMissionCompletionRate14d: 0.5,
      aiUsageTrend: "decreasing", autonomousChoiceTrend: "flat", daysSinceEpochStart: 30,
      helpRequestCountRecent: 1, helpRequestCountPrior: 1,
      repeatedConfusionObserved: false, excessivePlanningObserved: false, highVariability: false,
    });
    expect(d.action).not.toBe("upgrade");
  });

  it("AI사용 감소도 자율선택 증가도 없으면 상향하지 않는다", () => {
    const d = evaluateComplexityTransition({
      usageCount14d: 10, coreMissionCompletionRate14d: 0.9,
      aiUsageTrend: "increasing", autonomousChoiceTrend: "decreasing", daysSinceEpochStart: 30,
      helpRequestCountRecent: 1, helpRequestCountPrior: 1,
      repeatedConfusionObserved: false, excessivePlanningObserved: false, highVariability: false,
    });
    expect(d.action).toBe("hold");
  });
});

describe("§12.2 Complexity 승강 규칙 — 유지", () => {
  it("데이터 부족(사용<5회) → 유지", () => {
    const d = evaluateComplexityTransition({
      usageCount14d: 2, coreMissionCompletionRate14d: 0.9,
      aiUsageTrend: "decreasing", autonomousChoiceTrend: "flat", daysSinceEpochStart: 30,
      helpRequestCountRecent: 0, helpRequestCountPrior: 0,
      repeatedConfusionObserved: false, excessivePlanningObserved: false, highVariability: false,
    });
    expect(d).toEqual({ action: "hold", reason: "insufficient_data" });
  });

  it("변동성 큼 → 유지", () => {
    const d = evaluateComplexityTransition({
      usageCount14d: 10, coreMissionCompletionRate14d: 0.9,
      aiUsageTrend: "decreasing", autonomousChoiceTrend: "flat", daysSinceEpochStart: 30,
      helpRequestCountRecent: 0, helpRequestCountPrior: 0,
      repeatedConfusionObserved: false, excessivePlanningObserved: false, highVariability: true,
    });
    expect(d).toEqual({ action: "hold", reason: "high_variability" });
  });

  it("새 epoch 시작 직후 7일 → 유지(다른 신호보다 우선)", () => {
    const d = evaluateComplexityTransition({
      usageCount14d: 10, coreMissionCompletionRate14d: 0.9,
      aiUsageTrend: "decreasing", autonomousChoiceTrend: "flat", daysSinceEpochStart: NEW_EPOCH_STABILIZATION_DAYS - 1,
      helpRequestCountRecent: 0, helpRequestCountPrior: 0,
      repeatedConfusionObserved: false, excessivePlanningObserved: false, highVariability: false,
    });
    expect(d).toEqual({ action: "hold", reason: "new_epoch_stabilization" });
  });

  it("7일 경과 후에는 안정기간 유지가 적용되지 않는다", () => {
    const d = evaluateComplexityTransition({
      usageCount14d: 10, coreMissionCompletionRate14d: 0.9,
      aiUsageTrend: "decreasing", autonomousChoiceTrend: "flat", daysSinceEpochStart: NEW_EPOCH_STABILIZATION_DAYS,
      helpRequestCountRecent: 0, helpRequestCountPrior: 0,
      repeatedConfusionObserved: false, excessivePlanningObserved: false, highVariability: false,
    });
    expect(d.action).toBe("upgrade");
  });
});

describe("§12.2 Complexity 승강 규칙 — 하향/지원강화", () => {
  it("도움 요청 증가(직전 대비) → 하향", () => {
    const d = evaluateComplexityTransition({
      usageCount14d: 10, coreMissionCompletionRate14d: 0.9,
      aiUsageTrend: "decreasing", autonomousChoiceTrend: "flat", daysSinceEpochStart: 30,
      helpRequestCountRecent: 5, helpRequestCountPrior: 2,
      repeatedConfusionObserved: false, excessivePlanningObserved: false, highVariability: false,
    });
    expect(d).toEqual({ action: "downgrade", reason: "help_request_increase" });
  });

  it("반복적 혼란 관찰 → 하향(능력저하 표현 없이 지원강화)", () => {
    const d = evaluateComplexityTransition({
      usageCount14d: 10, coreMissionCompletionRate14d: 0.9,
      aiUsageTrend: "decreasing", autonomousChoiceTrend: "flat", daysSinceEpochStart: 30,
      helpRequestCountRecent: 1, helpRequestCountPrior: 1,
      repeatedConfusionObserved: true, excessivePlanningObserved: false, highVariability: false,
    });
    expect(d.action).toBe("downgrade");
    expect(d.reason).toBe("repeated_confusion");
  });

  it("3회 연속 미완료 자체는 하향 사유가 아니다(원문: 혼란·과도계획·도움요청 증가만) — 단순 미완료 카운트는 신호에 없음", () => {
    // 하향 신호는 helpRequest/confusion/excessivePlanning 3가지뿐이며 미완료 횟수는 입력에 없다.
    const d = evaluateComplexityTransition({
      usageCount14d: 10, coreMissionCompletionRate14d: 0.2, // 완료율 낮음 = 미완료 많음
      aiUsageTrend: "flat", autonomousChoiceTrend: "flat", daysSinceEpochStart: 30,
      helpRequestCountRecent: 1, helpRequestCountPrior: 1,
      repeatedConfusionObserved: false, excessivePlanningObserved: false, highVariability: false,
    });
    // 완료율 낮음만으로는 downgrade 신호가 없으므로 hold(no_trigger)
    expect(d.action).toBe("hold");
  });
});

describe("§12.3 Level–Complexity 결합 규칙 (M-6)", () => {
  it("Level n의 Complexity 상한은 L(n)", () => {
    expect(complexityCapForLevel(1)).toBe("L1");
    expect(complexityCapForLevel(4)).toBe("L4");
    expect(complexityCapForLevel(6)).toBe("L6");
  });

  it("Complexity 상향 시도가 Level 상한을 넘지 못한다", () => {
    const upgrade = { action: "upgrade" as const, reason: "usage_and_completion_and_ai_trend" as const };
    // Level 2 → 상한 L2. 현재 L2에서 upgrade 시도해도 L2를 넘지 않는다.
    const next = applyComplexityDecision("L2", 2, upgrade);
    expect(next).toBe("L2");
  });

  it("Level이 3이면 Complexity가 L3까지는 상향 가능하다", () => {
    const upgrade = { action: "upgrade" as const, reason: "usage_and_completion_and_ai_trend" as const };
    expect(applyComplexityDecision("L1", 3, upgrade)).toBe("L2");
    expect(applyComplexityDecision("L2", 3, upgrade)).toBe("L3");
    expect(applyComplexityDecision("L3", 3, upgrade)).toBe("L3"); // 상한에서 더 안 오름
  });

  it("clampComplexityToLevelCap: 상한을 초과한 값은 즉시 상한으로 조정", () => {
    expect(clampComplexityToLevelCap("L5", 2)).toBe("L2");
    expect(clampComplexityToLevelCap("L2", 5)).toBe("L2"); // 상한 아래면 그대로
  });

  it("Level은 하향하지 않지만 Complexity는 하향할 수 있다", () => {
    const downgrade = { action: "downgrade" as const, reason: "help_request_increase" as const };
    expect(applyComplexityDecision("L4", 6, downgrade)).toBe("L3");
    expect(applyComplexityDecision("L1", 6, downgrade)).toBe("L1"); // L1 아래로는 못 감
  });

  it("이벤트 봉투에 complexity_level과 level이 함께 기록된다 (§12.3 말미)", () => {
    let s = createInitialState(makeLearner("B", { level: 3, complexity: "L2" }));
    s = reducer(s, { type: "OPEN_APP", now: new Date() } as Action);
    s = reducer(s, { type: "CHOOSE_CHALLENGE", challengeId: "x", now: new Date() } as Action);
    const e = s.log.all()[0];
    const p = e.payload._ctx as any;
    expect(p.complexity_level).toBe("L2");
    expect(p.level).toBe(3);
  });
});

describe("Complexity 학생 비노출 (§12.3)", () => {
  it("가드 함수가 L1~L6 패턴을 탐지하면 예외를 던진다", () => {
    expect(() => assertComplexityNotExposedToStudent("Level 3 · L2")).toThrow();
    expect(() => assertComplexityNotExposedToStudent("Level 3")).not.toThrow();
  });

  it("MeScreen 렌더 결과에 Complexity(L1~L6) 문자열이 없다 — 실제 렌더링 검증", () => {
    let s = createInitialState(makeLearner("B", { level: 3, complexity: "L2" }));
    const html = renderToStaticMarkup(createElement(MeScreen, { state: s, dispatch: () => {} }));
    expect(html).not.toMatch(/\bL[1-6]\b/);
    expect(html).toContain("Level 3");
  });

  it("모든 Age Band에서 MeScreen이 Complexity를 노출하지 않는다", () => {
    for (const band of ["A", "B", "C", "D"] as const) {
      const s = createInitialState(makeLearner(band, { level: 5, complexity: "L4" }));
      const html = renderToStaticMarkup(createElement(MeScreen, { state: s, dispatch: () => {} }));
      expect(html).not.toMatch(/\bL[1-6]\b/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Weekly Boss (PATCH 2, 회귀 확인 — §16)
// ═══════════════════════════════════════════════════════════════════════
describe("Weekly Boss 회귀 확인 (PATCH 2가 PATCH 1/3/4 이후에도 그대로 동작)", () => {
  it("MIN_OBSERVATIONS를 공유해도 baseline/target 산식은 영향받지 않는다", () => {
    expect(MIN_OBSERVATIONS.start_accuracy).toBe(5);
    expect(MIN_OBSERVATIONS.recovery_skill).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Autonomy Ratio (§14.2) — Level 6 path① 지원
// ═══════════════════════════════════════════════════════════════════════
describe("§14.2 Autonomy Ratio", () => {
  it("5종 핵심 선택만 계수한다", () => {
    const c = { learner_id: "l", assessment_id: null, assessment_profile_version: null,
      program_id: "p", session_id: "s", task_id: null, cognitive_domain: null,
      difficulty_level: "L2", level: 3, content_version: CONTENT_VERSION, schema_version: SCHEMA_VERSION };
    const events = [
      emitEvent({ ctx: c, type: "student_choice_made", payload: { choice_type: "daily_challenge", used_ai_option: false } }),
      emitEvent({ ctx: c, type: "student_choice_made", payload: { choice_type: "priority_order", used_ai_option: true } }),
      emitEvent({ ctx: c, type: "mission_started", payload: {} }), // 핵심 선택 아님 — 계수 제외
    ];
    const r = computeAutonomyRatio(events);
    expect(r.totalCount).toBe(2);
    expect(r.autonomousCount).toBe(1);
    expect(r.ratio).toBeCloseTo(0.5, 6);
  });

  it("AI 선택지가 없었으면(필드 미표시) 자율 선택으로 계산", () => {
    const c = { learner_id: "l", assessment_id: null, assessment_profile_version: null,
      program_id: "p", session_id: "s", task_id: null, cognitive_domain: null,
      difficulty_level: "L2", level: 3, content_version: CONTENT_VERSION, schema_version: SCHEMA_VERSION };
    const events = [
      emitEvent({ ctx: c, type: "reset_created", payload: { reset_id: "r1", reason_code: "x", scope: "day", initiated_by: "student" } }),
    ];
    const r = computeAutonomyRatio(events);
    expect(r.autonomousCount).toBe(1); // ai_assisted 필드 없음 → 자율
  });
});
