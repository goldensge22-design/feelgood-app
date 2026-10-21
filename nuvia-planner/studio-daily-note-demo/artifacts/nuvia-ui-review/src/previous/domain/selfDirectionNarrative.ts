/**
 * SELF-DIRECTION GROWTH NARRATIVE
 * LOGIC LAYER — LOVABLE MUST NOT EDIT
 *
 * §22: 새로운 점수를 만들지 않는다. 기존 행동 이벤트와 관찰지표를 바탕으로
 *      '스스로 하게 된 행동이 무엇인지'를 설명하는 Narrative Layer.
 */
import type { NuviaEvent } from "./events";
import { violatesGuardrail } from "./discoveryEngine";

export interface NarrativeTemplate {
  id: string;
  ko: string;
  /** 근거 조건 */
  requires: (s: NarrativeSignals) => boolean;
}

export interface NarrativeSignals {
  selfDecidedCount: number;
  aiOptionUsedCount: number;
  selfChosenFocusLength: number;
  studentInitiatedResets: number;
  scaffoldFadedAccepted: number;
  windowDays: number;
}

export const NARRATIVE_TEMPLATES: NarrativeTemplate[] = [
  {
    id: "N_AI_OPTION_DOWN",
    ko: "최근에는 계획을 확정할 때 AI 선택지를 덜 사용하고 직접 수정하는 경우가 늘었습니다.",
    requires: (s) => s.selfDecidedCount >= 5 && s.selfDecidedCount > s.aiOptionUsedCount,
  },
  {
    id: "N_FOCUS_SELF_CHOICE",
    ko: "최근에는 Focus 시간을 직접 선택하고 완료 후 스스로 다음 행동을 정하는 경우가 더 자주 나타났습니다.",
    requires: (s) => s.selfChosenFocusLength >= 3,
  },
  {
    id: "N_RESET_SELF_INITIATED",
    ko: "계획이 달라진 뒤 Reset을 직접 선택해 다시 시작한 기록이 있습니다.",
    requires: (s) => s.studentInitiatedResets >= 1,
  },
  {
    id: "N_SCAFFOLD_ACCEPTED",
    ko: "도움을 줄이는 선택을 직접 받아들인 기록이 있습니다.",
    requires: (s) => s.scaffoldFadedAccepted >= 1,
  },
];

/** §22 금지 표현 — 점수화·인과 표현 */
const FORBIDDEN_NARRATIVE = [
  /자기주도성이 \d+/, /자기주도학습 능력이 우수/, /PLANNER 때문에/,
  /능력이 향상되었습니다/,
];

export function buildNarrative(s: NarrativeSignals): string[] {
  const out: string[] = [];
  for (const t of NARRATIVE_TEMPLATES) {
    if (!t.requires(s)) continue;
    if (violatesGuardrail(t.ko)) continue;
    if (FORBIDDEN_NARRATIVE.some((p) => p.test(t.ko))) continue;
    out.push(t.ko);
  }
  return out;
}

/** 이벤트 로그에서 signals 추출. 새 점수를 만들지 않는다 */
export function extractSignals(events: readonly NuviaEvent[], windowDays = 28): NarrativeSignals {
  const choices = events.filter((e) => e.event_type === "student_choice_made");
  const aiShown = events.filter((e) => e.event_type === "ai_suggestion_shown");
  return {
    selfDecidedCount: choices.filter((e) => (e.payload as any).used_ai_option !== true).length,
    aiOptionUsedCount: choices.filter((e) => (e.payload as any).used_ai_option === true).length,
    selfChosenFocusLength: choices.filter((e) => (e.payload as any).choice_type === "focus_length").length,
    studentInitiatedResets: events.filter(
      (e) => e.event_type === "reset_created" && (e.payload as any).initiated_by === "student"
    ).length,
    scaffoldFadedAccepted: events.filter(
      (e) => e.event_type === "scaffold_faded" && (e.payload as any).reason_code === "fade_accepted_by_student"
    ).length,
    windowDays,
  };
}

/** 점수 생성 시도 차단 */
export function selfDirectionScore(): never {
  throw new Error("Self-Direction must remain a narrative layer, never a score (PLANNER §22).");
}
