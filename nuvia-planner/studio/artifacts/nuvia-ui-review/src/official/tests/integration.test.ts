/** INTEGRATION — Daily Loop 전체 경로와 계약 검증 */
import { describe, it, expect } from "vitest";
import { createInitialState, reducer, selectMetrics, selectNarrative } from "../domain/store";
import type { Action, AppState } from "../domain/store";
import { makeLearner, makeMission, MOCK_MISSIONS } from "../mock/mockData";
import { V13_EVENT_TYPES, V14_ADDED_EVENT_TYPES } from "../domain/events";
import { meetsInstantStart } from "../domain/dailyStateMachine";
import { AGE_UX_PROFILES } from "../config/ageUXProfiles";
import { t, allKeys } from "../config/copyPacks";
import { SCENARIOS, AUTOMATED_SCENARIOS } from "../mock/scenarios";

function run(actions: Action[], seed: Partial<AppState> = {}): AppState {
  let s = createInitialState(makeLearner("B"), { missions: [...MOCK_MISSIONS], ...seed });
  for (const a of actions) s = reducer(s, a);
  return s;
}

const T = (sec: number) => new Date(`2026-04-22T09:00:${String(sec).padStart(2, "0")}.000Z`);

describe("Daily Loop — CHOOSE → CHALLENGE → DISCOVER → UNLOCK → GROW → RETURN", () => {
  it("전체 경로가 예외 없이 완주된다", () => {
    const s = run([
      { type: "OPEN_APP", now: T(0) },
      { type: "CHOOSE_CHALLENGE", challengeId: "", now: T(15) },
      { type: "COMMIT_PLAN", now: T(25) },
      { type: "START_MISSION", missionId: "m1", now: T(28) },
      { type: "COMPLETE_MISSION", actualMinutes: 44, now: T(30) },
      { type: "SUBMIT_REFLECTION", reason: "more_problems", selfRating: 3, now: T(40) },
      { type: "SKIP_DISCOVERY" },
      { type: "SKIP_FADE" },
      { type: "PREVIEW_NEXT" },
      { type: "END_DAY" },
    ]);
    expect(s.daily.phase).toBe("IDLE");
  });

  it("A-01 · 첫 행동까지 30초 이내", () => {
    const s = run([
      { type: "OPEN_APP", now: T(0) },
      { type: "CHOOSE_CHALLENGE", challengeId: "", now: T(15) },
    ]);
    expect(meetsInstantStart(s.daily.session_opened_at!, s.daily.first_action_at!)).toBe(true);
  });

  it("A-02 · OPEN_APP 시점에 후보가 이미 준비된다", () => {
    const s = run([{ type: "OPEN_APP", now: T(0) }]);
    expect(s.candidates.length).toBeGreaterThan(0);
  });

  it("A-03 · student_choice_made에 options_shown이 기록된다", () => {
    const s = run([
      { type: "OPEN_APP", now: T(0) },
      { type: "CHOOSE_CHALLENGE", challengeId: "x", now: T(10) },
    ]);
    const e = s.log.byType("student_choice_made")[0];
    expect(Array.isArray((e.payload as any).options_shown)).toBe(true);
    expect((e.payload as any).used_ai_option).toBe(false);
  });

  it("A-04 · 직접 계획 경로도 CHOSEN으로 진입한다", () => {
    const s = run([{ type: "OPEN_APP", now: T(0) }, { type: "SELF_PLAN", now: T(8) }]);
    expect(s.daily.phase).toBe("CHOSEN");
    expect(s.daily.chosen_challenge_id).toBeNull();
  });
});

describe("이벤트 계약 (§28)", () => {
  it("v1.3 이벤트 16개 + v1.4 추가 4개, 총 20개", () => {
    expect(V13_EVENT_TYPES).toHaveLength(16);
    expect(V14_ADDED_EVENT_TYPES).toHaveLength(4);
    expect(new Set([...V13_EVENT_TYPES, ...V14_ADDED_EVENT_TYPES]).size).toBe(20);
  });

  it("envelope 필수 필드가 모두 존재한다 (CORE §9)", () => {
    const s = run([{ type: "OPEN_APP", now: T(0) }, { type: "CHOOSE_CHALLENGE", challengeId: "x", now: T(5) }]);
    const e = s.log.all()[0];
    for (const k of ["event_id","learner_id","program_id","session_id","event_type","occurred_at",
      "occurred_at_local","timezone_offset","visibility_scope","payload","schema_version"]) {
      expect(e).toHaveProperty(k);
    }
  });

  it("파생 점수를 payload에 넣으면 EventLog가 거부한다", () => {
    const s = run([{ type: "OPEN_APP", now: T(0) }]);
    expect(() => s.log.append({ ...s.log.all()[0] ?? ({} as any),
      event_type: "mission_completed", payload: { total_score: 92 } } as any)).toThrow(/FORBIDDEN/);
  });

  it("mission_completed에 duration_source가 기록된다", () => {
    const s = run([
      { type: "OPEN_APP", now: T(0) }, { type: "CHOOSE_CHALLENGE", challengeId: "x", now: T(5) },
      { type: "COMMIT_PLAN", now: T(10) }, { type: "START_MISSION", missionId: "m1", now: T(12) },
      { type: "COMPLETE_MISSION", actualMinutes: 44, now: T(20) },
    ]);
    expect((s.log.byType("mission_completed")[0].payload as any).duration_source).toBe("timer");
  });
});

describe("B-08 · 실패 경로가 Reset으로 이어진다 (§17)", () => {
  it("ABANDON → CREATE_RESET → REVISE_PLAN", () => {
    const s = run([
      { type: "OPEN_APP", now: T(0) }, { type: "CHOOSE_CHALLENGE", challengeId: "x", now: T(5) },
      { type: "COMMIT_PLAN", now: T(10) }, { type: "START_MISSION", missionId: "m1", now: T(12) },
      { type: "ABANDON" },
      { type: "CREATE_RESET", reason: "plan_too_big", now: T(30) },
      { type: "REVISE_PLAN", now: T(35) },
    ]);
    expect(s.daily.phase).toBe("PLANNED");
    expect(s.log.count("reset_created")).toBe(1);
    expect((s.log.byType("reset_created")[0].payload as any).initiated_by).toBe("student");
  });
});

describe("E-04 · 학생 도움 요청 (§14)", () => {
  it("scaffold가 즉시 하향되고 이벤트가 남는다", () => {
    const s = run([{ type: "REQUEST_MORE_HELP", now: T(0) }]);
    expect(s.ctx.scaffold_state).toBe("S1_GUIDED");
    expect(s.ctx.scaffold_requested_by_student).toBe(true);
    expect(s.log.count("scaffold_faded")).toBe(1);
  });
});

describe("H-05/H-06 · Age UX는 표현만 바꾼다 (§5 §34)", () => {
  it("4개 Band 모두 동일한 이벤트 payload를 만든다", () => {
    const payloads = (["A","B","C","D"] as const).map((band) => {
      let s = createInitialState(makeLearner(band), { missions: [...MOCK_MISSIONS] });
      s = reducer(s, { type: "OPEN_APP", now: T(0) });
      s = reducer(s, { type: "CHOOSE_CHALLENGE", challengeId: "x", now: T(5) });
      const p = { ...(s.log.byType("student_choice_made")[0].payload as any) };
      delete p._ctx;
      return JSON.stringify(p);
    });
    expect(new Set(payloads).size).toBe(1);
  });

  it("Band 변경이 Level/Complexity/관찰을 바꾸지 않는다", () => {
    const a = makeLearner("A"), d = makeLearner("D");
    expect(a.level).toBe(d.level);
    expect(a.complexity).toBe(d.complexity);
    expect(a.support_domains).toEqual(d.support_domains);
  });

  it("Band별 문구는 달라진다", () => {
    const titles = (["ko-A","ko-B","ko-C","ko-D"] as const).map((p) => t(p, "today.choose_title"));
    expect(new Set(titles).size).toBe(4);
  });

  it("모든 copy key가 4개 팩에서 해석된다 (미해석 키 없음)", () => {
    for (const k of allKeys()) {
      for (const p of ["ko-A","ko-B","ko-C","ko-D"] as const) {
        expect(t(p, k)).not.toBe(k);
      }
    }
  });

  it("Age Profile은 표현 필드만 갖는다", () => {
    const allowed = new Set(["band","copyPack","gameIntensity","bossPresentation","characterMode",
      "motionLevel","layoutVariant","showLevelSymbol","showGrowthMap","coachOptionCount",
      "parentVisibilityPreset","iconSet"]);
    for (const p of Object.values(AGE_UX_PROFILES)) {
      for (const k of Object.keys(p)) expect(allowed.has(k)).toBe(true);
    }
  });
});

describe("Growth 화면 계약 (§21 §22 §34)", () => {
  it("최소관찰수 미충족 지표는 value가 null이다", () => {
    const s = run([{ type: "OPEN_APP", now: T(0) }]);
    const ms = selectMetrics(s);
    expect(ms.every((m) => m.state === "insufficient" ? m.value === null : true)).toBe(true);
  });

  it("Metric 결과에 총점 필드가 없다", () => {
    const ms = selectMetrics(run([{ type: "OPEN_APP", now: T(0) }]));
    for (const m of ms) {
      expect(m).not.toHaveProperty("total");
      expect(m).not.toHaveProperty("grade");
    }
  });

  it("Narrative는 문자열 배열이며 점수를 포함하지 않는다", () => {
    const s = run([
      { type: "OPEN_APP", now: T(0) },
      { type: "CHOOSE_CHALLENGE", challengeId: "x", now: T(5) },
      { type: "COMMIT_PLAN", now: T(8) },
    ]);
    for (const n of selectNarrative(s)) expect(n).not.toMatch(/\d+점/);
  });
});

describe("I-06 · 금지 기능이 코드에 존재하지 않는다 (§30 §34)", () => {
  it("leaderboard / streak / coin 개념이 도메인 타입에 없다", async () => {
    const types = await import("../domain/types");
    const keys = Object.keys(types).join(" ").toLowerCase();
    for (const banned of ["leaderboard", "streak", "coin", "rank"]) {
      expect(keys).not.toContain(banned);
    }
  });
});

describe("Scenario 카탈로그", () => {
  it("자동화 시나리오 id가 중복되지 않는다", () => {
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
  });
  it("자동화 대상이 다수를 차지한다", () => {
    expect(AUTOMATED_SCENARIOS.length).toBeGreaterThan(SCENARIOS.length * 0.8);
  });
});
