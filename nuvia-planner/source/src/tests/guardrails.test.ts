/** GUARDRAIL 유닛 테스트 — FROZEN 조항이 코드로 강제되는지 검증 */
import { describe, it, expect } from "vitest";
import { computeUnifiedTotalScore, computeMetric, MIN_OBSERVATIONS } from "../domain/metrics";
import { runDiscoveryGates, saveDiscovery, weakenDiscovery, violatesGuardrail, DISCOVERY_TEMPLATES } from "../domain/discoveryEngine";
import type { DiscoveryCandidate } from "../domain/discoveryEngine";
import { applyStrategy, recordTrial, saveStrategy, compareAcrossLearners } from "../domain/strategyEngine";
import { evaluateFade, studentRequestsMoreHelp, assertNoSupportRatioExposure } from "../domain/scaffoldFading";
import { checkCoachUtterance, aiFinalizeDecision, exposeAutonomyRatio } from "../domain/aiCoachGuardrail";
import type { CoachContext, CoachUtterance } from "../domain/aiCoachGuardrail";
import { buildBossCandidates, isObservationWeek, selectBoss, evaluateBossWeek, bossFailureLabel } from "../domain/weeklyBoss";
import { buildPlannerSummary, buildCognitiveGrowth, mergeSummariesAcrossEpochs } from "../domain/myNuviaAdapter";
import { buildChallengeCandidates, assertNoRatioExposure, streakedModule } from "../domain/personalization";
import { isValidFocusLength, validateBreakdown, taskBreakdownObservation, timeSenseGap, planRealityGap } from "../domain/modules";
import { transition, canTransition, hasTerminalFailureState, meetsInstantStart } from "../domain/dailyStateMachine";
import { selfDirectionScore } from "../domain/selfDirectionNarrative";
import { makeLearner, makeLearnerWithoutAssessment, makeObservations, makeMission, EPOCH_ID } from "../mock/mockData";

const ctx = makeLearner();

describe("J-08 · Unified Total Score 금지 (§34)", () => {
  it("총점 계산 호출은 예외", () => {
    expect(() => computeUnifiedTotalScore()).toThrow(/Unified Total Score/);
  });
  it("Self-Direction 점수화 시도는 예외 (§22)", () => {
    expect(() => selfDirectionScore()).toThrow(/narrative/);
  });
});

describe("C-01/C-02 · Discovery 최소관찰수 GATE (§11)", () => {
  const base = (n: number, epochs: string[]): DiscoveryCandidate => ({
    template_id: "T_TIME_BIAS_01",
    params: { task_type: "수학" },
    evidence_count: n,
    source_event_ids: Array.from({ length: n }, (_, i) => `e${i}`),
    evidence_window: { from: "2026-04-01", to: "2026-04-20" },
    evidence_epoch_ids: epochs,
  });

  it("4회면 GATE 2에서 차단되고 remaining=1", () => {
    const r = runDiscoveryGates(base(4, [EPOCH_ID]), ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.gate).toBe(2); expect(r.remaining).toBe(1); }
  });

  it("5회면 통과한다", () => {
    const r = runDiscoveryGates(base(5, [EPOCH_ID]), ctx);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.statement).toContain("수학");
  });

  it("모든 템플릿 문장이 관찰형 어미로 끝난다 (§11)", () => {
    const OBSERVATIONAL = /(관찰됩니다|관찰됐습니다|많았습니다|나타났습니다|빨랐습니다|있습니다|유지되었습니다)\.$/;
    for (const tpl of DISCOVERY_TEMPLATES) {
      expect(tpl.ko).toMatch(OBSERVATIONAL);
      expect(violatesGuardrail(tpl.ko)).toBeNull();
    }
  });

  it("근거 event가 없으면 GATE 1 차단", () => {
    const c = { ...base(5, [EPOCH_ID]), source_event_ids: [] };
    const r = runDiscoveryGates(c, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.gate).toBe(1);
  });
});

describe("C-03 · epoch 경계 (CORE §5)", () => {
  it("두 epoch에 걸친 근거는 GATE 3 차단", () => {
    const c: DiscoveryCandidate = {
      template_id: "T_TIME_BIAS_01", params: { task_type: "수학" }, evidence_count: 6,
      source_event_ids: ["a", "b", "c", "d", "e", "f"],
      evidence_window: { from: "2026-03-01", to: "2026-04-20" },
      evidence_epoch_ids: [EPOCH_ID, "epoch_2025_11"],
    };
    const r = runDiscoveryGates(c, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.gate).toBe(3);
  });

  it("metric 계산도 다른 epoch 관찰을 산입하지 않는다", () => {
    const obs = [...makeObservations(EPOCH_ID), ...makeObservations("epoch_old")];
    const r = computeMetric("time_prediction_accuracy", obs, { epochId: EPOCH_ID });
    expect(r.observation_count).toBe(5);
  });
});

describe("C-05 · 금지어 사전 (§11 §22 §34)", () => {
  const banned = [
    "당신은 완벽주의 성향입니다.",
    "집중력이 부족합니다.",
    "ADHD 진단이 의심됩니다.",
    "자기주도성이 82점으로 향상되었습니다.",
    "반에서 3등입니다.",
  ];
  it.each(banned)("차단: %s", (s) => { expect(violatesGuardrail(s)).not.toBeNull(); });
  it("관찰형 문장은 통과", () => {
    expect(violatesGuardrail("수학 과제는 예상보다 오래 걸리는 경우가 많았습니다.")).toBeNull();
  });
});

describe("C-06 · 근거 약화는 삭제가 아니라 상태 전환 (§12)", () => {
  it("weakening으로 전환된다", () => {
    const d = saveDiscovery({
      template_id: "T_RESET_01", params: {}, evidence_count: 3,
      source_event_ids: ["a", "b", "c"],
      evidence_window: { from: "2026-04-01", to: "2026-04-20" },
      evidence_epoch_ids: [EPOCH_ID],
    }, ctx);
    expect(weakenDiscovery(d).confidence_state).toBe("weakening");
  });
});

describe("D-02/D-03/D-04/D-06 · Strategy Engine (§12)", () => {
  it("시스템 자동 적용은 예외", () => {
    const s = saveStrategy("HARD_FIRST", ctx, null);
    expect(() => applyStrategy(s, "system" as any)).toThrow(/student/);
    expect(applyStrategy(s, "student").appliedBy).toBe("student");
  });

  it("근거 축적 시 trying → fits_me", () => {
    let s = saveStrategy("BREAK_INTO_3", ctx, "dis_1");
    for (let i = 0; i < 5; i++) s = recordTrial(s, true);
    expect(s.status).toBe("fits_me");
    expect(s.source_discovery_id).toBe("dis_1");
  });

  it("최근 근거가 약해지면 retest", () => {
    let s = saveStrategy("FOCUS_25", ctx, null);
    for (let i = 0; i < 5; i++) s = recordTrial(s, true);
    s = recordTrial(s, false); s = recordTrial(s, false); s = recordTrial(s, false);
    expect(s.status).toBe("retest");
  });

  it("실패한 전략도 남는다 (삭제 상태 없음)", () => {
    let s = saveStrategy("HARD_FIRST", ctx, null);
    for (let i = 0; i < 4; i++) s = recordTrial(s, false);
    expect(["trying", "retest"]).toContain(s.status);
  });

  it("타 학생 비교는 예외", () => {
    expect(() => compareAcrossLearners()).toThrow(/forbidden/);
  });
});

describe("E-01/E-02/E-04/E-06 · Scaffold Fading (§14 §20)", () => {
  const sig = {
    selfDecidedCount: 8, aiOptionUsedCount: 2, moduleObservationCount: 8,
    recentIncompleteCount: 0, now: new Date("2026-04-22T00:00:00Z"),
  };

  it("Level 미달이면 제안 불가 (C1)", () => {
    const c = makeLearner("B", { level: 1, scaffold_state: "S1_GUIDED" });
    // S2_ASSISTED는 Level 3 필요
    expect(evaluateFade(c, sig).failedConditions).toContain("C1");
  });

  it("epoch 3일차면 C4 미충족", () => {
    const c = makeLearner("B", { epoch_started_at: "2026-04-20T00:00:00Z", level: 3 });
    expect(evaluateFade(c, sig).failedConditions).toContain("C4");
  });

  it("4조건 충족 시 제안 가능하지만 상태는 자동 변경되지 않는다", () => {
    const c = makeLearner("B", { level: 3, scaffold_state: "S1_GUIDED", epoch_started_at: "2026-03-01T00:00:00Z" });
    const e = evaluateFade(c, sig);
    expect(e.canPropose).toBe(true);
    expect(c.scaffold_state).toBe("S1_GUIDED"); // 자동 전이 없음
  });

  it("학생 요청은 즉시 하향 반영", () => {
    const c = makeLearner("B", { scaffold_state: "S3_LIGHT" });
    const tr = studentRequestsMoreHelp(c);
    expect(tr?.new_support_level).toBe("S2_ASSISTED");
    expect(tr?.reason_code).toBe("student_requested_more");
  });

  it("도움 비율 숫자 노출은 가드에 걸린다", () => {
    expect(() => assertNoSupportRatioExposure("도움 60%")).toThrow();
    expect(() => assertNoSupportRatioExposure("도움을 조금 더 받을래요")).not.toThrow();
  });
});

describe("F · AI Coach Guardrail (CORE §8 / §18 §22 §34)", () => {
  const base: CoachUtterance = {
    step: "OBSERVE", copy_key: "x", source_event_ids: ["e1", "e2", "e3", "e4", "e5"],
    observation_count: 5, min_observations: 5, evidence_epoch_ids: [EPOCH_ID],
    decidesForStudent: false, topic: "time",
  };
  const cctx: CoachContext = {
    epoch_id: EPOCH_ID, age_band: "B", utterancesThisSession: 0, inDoPhase: false, unansweredByTopic: {},
  };

  it("AI 최종 확정은 예외", () => { expect(() => aiFinalizeDecision()).toThrow(/finalize/); });

  it("Autonomy Ratio는 학생·부모에게 노출 불가", () => {
    expect(() => exposeAutonomyRatio("student")).toThrow();
    expect(() => exposeAutonomyRatio("parent")).toThrow();
  });

  it("자기주도성 점수 문장은 GATE 4 차단", () => {
    const r = checkCoachUtterance(base, cctx, "자기주도성이 82점으로 향상되었습니다.");
    expect(r.pass).toBe(false);
    if (!r.pass) expect(r.gate).toBe(4);
  });

  it("검사점수 인과 표현은 GATE 4 차단", () => {
    const r = checkCoachUtterance(base, cctx, "PLANNER 덕분에 검사 점수가 향상되었습니다.");
    expect(r.pass).toBe(false);
  });

  it("관찰지표 목표화 표현 차단", () => {
    const r = checkCoachUtterance(base, cctx, "자율성을 높여보세요.");
    expect(r.pass).toBe(false);
  });

  it("DO 단계 중에는 발화하지 않는다", () => {
    const r = checkCoachUtterance(base, { ...cctx, inDoPhase: true }, "최근 5번 중 4번은 예상보다 길었어요.");
    expect(r.pass).toBe(false);
    if (!r.pass) expect(r.gate).toBe(6);
  });

  it("동일 주제 3회 무응답이면 침묵", () => {
    const r = checkCoachUtterance(base, { ...cctx, unansweredByTopic: { time: 3 } }, "최근 기록이 이렇습니다.");
    expect(r.pass).toBe(false);
  });

  it("선택지 없이 학생 결정을 대신하면 GATE 5 차단", () => {
    const r = checkCoachUtterance({ ...base, decidesForStudent: true }, cctx, "오늘 목표는 이걸로 정했습니다.");
    expect(r.pass).toBe(false);
    if (!r.pass) expect(r.gate).toBe(5);
  });

  it("근거 있는 관찰 문장은 통과", () => {
    const r = checkCoachUtterance(base, cctx, "최근 5번 중 4번은 예상보다 길었어요.");
    expect(r.pass).toBe(true);
  });
});

describe("G · Weekly Boss (§16 PATCH 2 확정 산식)", () => {
  const mk = (metric: any, vals: number[], daysBeforeStart: number[], weekStart: string) =>
    vals.map((v, i) => ({
      metric, value: v,
      occurred_at: new Date(new Date(weekStart).getTime() - daysBeforeStart[i] * 86_400_000).toISOString(),
      epoch_id: EPOCH_ID, source_event_id: `evt_boss_${i}`,
    }));

  it("관찰수 미달이면 후보가 없고 관찰 주간", () => {
    const cands = buildBossCandidates({ start_accuracy: 2 });
    expect(cands).toHaveLength(0);
    expect(isObservationWeek(cands)).toBe(true);
  });

  it("baseline = 직전 2주 평균, target = baseline + 0.05 (상한 0.90)", () => {
    const weekStart = "2026-04-20";
    // 직전 2주(=14일) 이내 5개 관찰: 평균 0.6
    const obs = mk("start_accuracy", [0.5, 0.6, 0.6, 0.6, 0.7], [1, 3, 5, 7, 9], weekStart);
    const boss = selectBoss("START", obs, ctx, weekStart);
    expect(boss.baseline).toBeCloseTo(0.6, 5);
    expect(boss.target).toBeCloseTo(0.65, 5);
  });

  it("target이 상한 0.90을 넘지 않는다", () => {
    const weekStart = "2026-04-20";
    const obs = mk("start_accuracy", [0.89, 0.9, 0.88, 0.9, 0.87], [1, 3, 5, 7, 9], weekStart);
    const boss = selectBoss("START", obs, ctx, weekStart);
    expect(boss.target).toBeLessThanOrEqual(0.90);
  });

  it("2주 연속 미달 시 target = baseline + 0.02", () => {
    const weekStart = "2026-04-27";
    const obs = mk("start_accuracy", [0.5, 0.6, 0.6, 0.6, 0.7], [1, 3, 5, 7, 9], weekStart);
    const boss = selectBoss("START", obs, ctx, weekStart, 2);
    expect(boss.target_relaxed).toBe(true);
    expect(boss.target).toBeCloseTo(boss.baseline + 0.02, 5);
  });

  it("14일보다 오래된 관찰은 baseline 계산에서 제외된다", () => {
    const weekStart = "2026-04-20";
    const inWindow = mk("start_accuracy", [0.4, 0.4, 0.4, 0.4, 0.4], [1, 3, 5, 7, 9], weekStart);
    const outOfWindow = mk("start_accuracy", [0.99, 0.99], [20, 25], weekStart);
    const boss = selectBoss("START", [...inWindow, ...outOfWindow], ctx, weekStart);
    expect(boss.baseline).toBeCloseTo(0.4, 5); // outOfWindow(0.99)가 섞이지 않음
  });

  it("2주 관찰창 내 관찰수가 최소치 미만이면 Boss 생성은 예외", () => {
    const weekStart = "2026-04-20";
    const obs = mk("start_accuracy", [0.5, 0.6], [1, 3], weekStart); // 5회 미만
    expect(() => selectBoss("START", obs, ctx, weekStart)).toThrow(/min observations/);
  });

  it("목표 미달은 record_kept이며 실패 라벨이 없다", () => {
    const weekStart = "2026-04-20";
    const obs = mk("start_accuracy", [0.5, 0.6, 0.6, 0.6, 0.7], [1, 3, 5, 7, 9], weekStart);
    const boss = selectBoss("START", obs, ctx, weekStart);
    const r = evaluateBossWeek({ week_start: weekStart, boss, observation_week: false, records: [{ date: "d", value: 0.3 }] });
    expect(r.outcome).toBe("record_kept");
    expect(() => bossFailureLabel()).toThrow();
  });
});

describe("J-06 · MY NUVIA Adapter (§29 / CORE §5 §10)", () => {
  const metrics = computeMetric("start_accuracy", makeObservations(), { epochId: EPOCH_ID });

  it("raw value를 전달하지 않는다", () => {
    const sum = buildPlannerSummary({
      ctx, period: { from: "2026-04-01", to: "2026-04-30" },
      metrics: [metrics], discoveries: [], strategies: [], narrative: [],
    });
    const m = sum.growth_domains.self_regulation.metrics[0];
    expect(m).not.toHaveProperty("value");
    expect(m.state).toBe("sufficient");
    expect(JSON.stringify(sum)).not.toContain('"total');
  });

  it("Cognitive/Learning Growth 생성은 예외", () => {
    expect(() => buildCognitiveGrowth()).toThrow(/Cognitive Growth/);
    expect(() => mergeSummariesAcrossEpochs()).toThrow(/epochs/);
  });

  it("Growth 아닌 관찰지표는 제외된다", () => {
    const sum = buildPlannerSummary({
      ctx, period: { from: "a", to: "b" },
      metrics: [{ ...metrics, key: "autonomy_ratio" as any }],
      discoveries: [], strategies: [], narrative: [],
    });
    expect(sum.growth_domains.self_regulation.metrics).toHaveLength(0);
  });
});

describe("A-05/A-06 · Personalization (§19)", () => {
  it("동일 모듈 3연속이면 차단 대상으로 판정", () => {
    expect(streakedModule(["TIME_SENSE", "TIME_SENSE", "TIME_SENSE"])).toBe("TIME_SENSE");
    expect(streakedModule(["TIME_SENSE", "RESET", "TIME_SENSE"])).toBeNull();
  });

  it("3연속 이후 후보에 다른 모듈이 포함된다", () => {
    const cands = buildChallengeCandidates(ctx, {
      recentModules: ["TIME_SENSE", "TIME_SENSE", "TIME_SENSE"], rand: () => 0.1,
    });
    expect(cands.some((c) => c.module !== "TIME_SENSE")).toBe(true);
  });

  it("검사 미보유자는 강점 풀을 만들지 않는다", () => {
    const c = makeLearnerWithoutAssessment();
    const cands = buildChallengeCandidates(c, { recentModules: [], rand: () => 0.3 });
    expect(cands.every((x) => x.pool !== "strength")).toBe(true);
    expect(cands.length).toBeGreaterThan(0);
  });

  it("60/40 비율 노출은 가드에 걸린다", () => {
    expect(() => assertNoRatioExposure("지원영역 60% 강점 40%")).toThrow();
  });
});

describe("B · 7 Modules (§9 §21)", () => {
  it("B-05 Focus 길이는 15/25/40만", () => {
    expect(isValidFocusLength(25)).toBe(true);
    expect(isValidFocusLength(30)).toBe(false);
  });

  it("B-03 Task Breakdown은 Growth 지표가 아니다", () => {
    const m = makeMission({ subtasks: ["a", "b", "c"] });
    expect(taskBreakdownObservation(m).isGrowthMetric).toBe(false);
    expect(MIN_OBSERVATIONS).not.toHaveProperty("task_breakdown_observation");
  });

  it("분해는 2~7단계", () => {
    expect(validateBreakdown(["a"]).ok).toBe(false);
    expect(validateBreakdown(["a", "b"]).ok).toBe(true);
    expect(validateBreakdown(["a","b","c","d","e","f","g","h"]).ok).toBe(false);
  });

  it("B-01 Gap은 방향과 분 단위만 반환한다", () => {
    const g = timeSenseGap(makeMission({ predicted_minutes: 30, actual_minutes: 44 }));
    expect(g).toEqual({ predicted: 30, actual: 44, gapMinutes: 14, direction: "longer" });
  });

  it("B-07 PLAN vs REALITY는 Gap 개수를 반환한다 (성공/실패 없음)", () => {
    const ms = [makeMission({ completed: true }), makeMission({ completed: false }), makeMission({ completed: false })];
    expect(planRealityGap(ms)).toEqual({ plannedCount: 3, completedCount: 1, gapCount: 2 });
  });
});

describe("B-08 · Daily State Machine에 실패 종단이 없다 (§17)", () => {
  it("ABANDONED의 다음은 RESET_OFFERED", () => {
    expect(transition("ABANDONED", "OFFER_RESET")).toBe("RESET_OFFERED");
    expect(transition("RESET_OFFERED", "CREATE_RESET")).toBe("RESET_CREATED");
    expect(transition("RESET_CREATED", "REVISE_PLAN")).toBe("PLANNED");
  });
  it("막다른 실패 상태가 존재하지 않는다", () => {
    expect(hasTerminalFailureState()).toBe(false);
  });
  it("허용되지 않은 전이는 예외", () => {
    expect(canTransition("IDLE", "COMPLETE")).toBe(false);
    expect(() => transition("IDLE", "COMPLETE")).toThrow();
  });
});

describe("A-01 · Instant Start 30초 (§35)", () => {
  it("29초는 통과, 31초는 실패", () => {
    const t0 = "2026-04-22T09:00:00.000Z";
    expect(meetsInstantStart(t0, "2026-04-22T09:00:29.000Z")).toBe(true);
    expect(meetsInstantStart(t0, "2026-04-22T09:00:31.000Z")).toBe(false);
  });
});
