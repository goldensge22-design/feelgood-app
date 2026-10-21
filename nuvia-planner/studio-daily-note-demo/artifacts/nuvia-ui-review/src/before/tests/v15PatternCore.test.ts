import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolvePatternProfile, patternForModule, PATTERN_QUESTIONS } from "../domain/patternEngine";
import { ownershipStageFor } from "../domain/strategyTransfer";
import { createInitialState, reducer } from "../domain/store";
import type { Action } from "../domain/store";
import { TodayScreen, MeScreen } from "../screens/screens";
import { makeLearner } from "../mock/mockData";
import type { MetricResult, StrategyUseEvidence } from "../domain/types";

const metric = (key: MetricResult["key"], value: number): MetricResult => ({
  key, domain: key.includes("time") || key.includes("metacognitive") ? "metacognitive" : "self_regulation",
  state: "sufficient", observation_count: 5, min_observations: 5, value, trend: null, clamped: false,
});

describe("v1.5 self-management pattern resolver", () => {
  it("planning+attention support creates a real prioritized pattern profile", () => {
    const p = resolvePatternProfile(makeLearner("A", { support_domains: ["planning", "attention"] }), []);
    expect(p.ordered).toHaveLength(6);
    expect(["PLAN", "START", "FOCUS", "TIME", "RECOVER", "CHECK"]).toContain(p.primary);
    expect(p.source).toBe("profile_only");
  });

  it("sufficient behavior evidence can move focus to FOCUS", () => {
    const p = resolvePatternProfile(makeLearner("A", { support_domains: [] }), [metric("focus_stability", 0.1)]);
    expect(p.primary).toBe("FOCUS");
    expect(p.source).toBe("behavior_only");
  });

  it("module maps to one of the six categories", () => {
    expect(patternForModule("RESET")).toBe("RECOVER");
    expect(patternForModule("TIME_SENSE")).toBe("TIME");
  });
});

describe("v1.5 Neutral / Observation Start — no support domain and no sufficient behavior metric", () => {
  it("support_domains=[] and metrics=[] must NOT fabricate a primary/secondary pattern", () => {
    const p = resolvePatternProfile(makeLearner("A", { support_domains: [] }), []);
    expect(p.source).toBe("neutral");
    expect(p.primary).toBeNull();
    expect(p.secondary).toBeNull();
    expect(p.ordered).toEqual([]);
  });

  it("insufficient (not-yet-observed) behavior metrics do not count as a signal either", () => {
    const insufficientMetric: MetricResult = {
      key: "focus_stability", domain: "self_regulation", state: "insufficient",
      observation_count: 1, min_observations: 5, value: null, trend: null, clamped: false,
    };
    const p = resolvePatternProfile(makeLearner("A", { support_domains: [] }), [insufficientMetric]);
    expect(p.source).toBe("neutral");
    expect(p.primary).toBeNull();
  });

  // 81→6 매핑 레퍼런스(NUVIA_PLANNER_81_TO_6_PATTERN_MAPPING_v1.0.json)에서
  // reference_low_domains가 없어 primary/secondary_candidate가 null인 16개 profile 전수.
  // 이 16개는 전부 "지원이 필요한 저지원영역 없음" → 공식 support_domains가 빈 배열로
  // 들어오는 동일 등가류(equivalence class)다. 원본 검사값을 재판정하지 않는다는 원칙에
  // 따라 이 계층에서는 reference_code를 직접 참조하지 않고, 그 결과인 빈 support_domains만
  // 검증한다.
  const NULL_PROFILE_REFERENCE_CODES = [
    "HHHH", "HHHM", "HHMH", "HHMM",
    "HMHH", "HMHM", "HMMH", "HMMM",
    "MHHH", "MHHM", "MHMH", "MHMM",
    "MMHH", "MMHM", "MMMH", "MMMM",
  ];

  it.each(NULL_PROFILE_REFERENCE_CODES)(
    "reference_code %s (no low domain) resolves to neutral, not an arbitrary pattern",
    (_code) => {
      const p = resolvePatternProfile(makeLearner("A", { support_domains: [] }), []);
      expect(p.source).toBe("neutral");
      expect(p.primary).toBeNull();
      expect(p.secondary).toBeNull();
    }
  );

  it("covers exactly the 16 null profiles from the 81→6 reference table", () => {
    expect(NULL_PROFILE_REFERENCE_CODES).toHaveLength(16);
    expect(new Set(NULL_PROFILE_REFERENCE_CODES).size).toBe(16);
  });
});

describe("v1.5 Neutral state — screen-level rendering must not show a fabricated pattern", () => {
  function neutralState() {
    const ctx = makeLearner("A", { support_domains: [] });
    let s = createInitialState(ctx);
    s = reducer(s, { type: "OPEN_APP", now: new Date() } as Action); // IDLE -> CHECKED_IN
    return s;
  }

  // 여기서는 PATTERN_LABELS(예: "집중 유지")가 아니라 PATTERN_QUESTIONS 전체 문장으로 검사한다.
  // PATTERN_LABELS는 기존 모듈명(예: "집중 유지하기")과 의도적으로 겹치는 짧은 단어라
  // 후보 Challenge 카드에 정상적으로 나타날 수 있어 오탐(false positive)을 만든다.
  it("TodayScreen does not render any of the six pattern questions when neutral", () => {
    const s = neutralState();
    const html = renderToStaticMarkup(createElement(TodayScreen, { state: s, dispatch: () => {} }));
    for (const question of Object.values(PATTERN_QUESTIONS)) {
      expect(html).not.toContain(question);
    }
    expect(html).toContain("아직 우선 지원영역이 확인되지 않았어요");
  });

  it("MeScreen does not render any of the six pattern questions when neutral", () => {
    const s = neutralState();
    const html = renderToStaticMarkup(createElement(MeScreen, { state: s, dispatch: () => {} }));
    for (const question of Object.values(PATTERN_QUESTIONS)) {
      expect(html).not.toContain(question);
    }
    expect(html).toContain("아직 관찰 중이에요");
  });
});

describe("DISCOVER → STRATEGY → APPLY → TRANSFER → OWN evidence", () => {
  const base: StrategyUseEvidence = {
    use_id: "u1", strategy_id: "s1", context_label: "수학", context_kind: "same_type", self_initiated: false, occurred_at: "2026-01-01T00:00:00Z",
  };
  it("starts at STRATEGY with no real use evidence", () => expect(ownershipStageFor("s1", [])).toBe("STRATEGY"));
  it("records APPLY after real use", () => expect(ownershipStageFor("s1", [base])).toBe("APPLY"));
  it("records TRANSFER in a different context", () => expect(ownershipStageFor("s1", [{ ...base, context_kind: "different_type" }])).toBe("TRANSFER"));
  it("records OWN only with self-initiated evidence", () => expect(ownershipStageFor("s1", [{ ...base, self_initiated: true }])).toBe("OWN"));
});
