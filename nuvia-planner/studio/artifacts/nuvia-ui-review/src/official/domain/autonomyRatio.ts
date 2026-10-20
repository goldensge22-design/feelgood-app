/**
 * AUTONOMY RATIO — v1.3 §14.2 (관찰지표, Growth 범주 아님)
 * LOGIC LAYER — LOVABLE MUST NOT EDIT
 *
 * 자율 결정된 핵심 선택 수 ÷ 전체 핵심 선택 수.
 * 핵심 선택(정확히 5종만 계수): ① 오늘 미션 선정 ② 우선순위 확정
 * ③ Focus 프리셋 선택 ④ Reset 대응 선택 ⑤ Weekly Boss 선택.
 *
 * ai_assisted=true는 AI 선택지가 표시되었고 학생의 최종 선택이 그
 * 선택지와 동일하며 수정이 없었던 경우에만 부여한다. 선택지가
 * 표시되지 않았거나 학생이 다른 선택/수정을 한 경우는 자율 선택.
 *
 * §13.2(M-7): 학생 화면에 점수·등급·순위로 노출 금지. Level 6 승급의
 * 단독 조건으로 사용 금지(§13.1 ②로 대체 가능). aiCoachGuardrail.ts의
 * exposeAutonomyRatio()가 이 값의 노출 경로를 차단한다.
 */
import type { NuviaEvent } from "./events";

export type CoreChoiceCategory =
  | "daily_mission_selection"  // ①
  | "priority_order"           // ②
  | "focus_preset"             // ③
  | "reset_response"           // ④
  | "weekly_boss_selection";   // ⑤

export interface CoreChoiceInstance {
  category: CoreChoiceCategory;
  aiAssisted: boolean;
  occurred_at: string;
}

/**
 * 이벤트 로그에서 5종 핵심 선택만 추출한다.
 * student_choice_made의 payload.used_ai_option과 reset_created /
 * weekly_boss_selected의 payload.ai_assisted를 동일한 §14.2 규칙으로
 * 읽는다 — "선택지가 표시되지 않았으면(필드 부재/false) 자율 선택".
 */
export function extractCoreChoices(events: readonly NuviaEvent[]): CoreChoiceInstance[] {
  const out: CoreChoiceInstance[] = [];
  for (const e of events) {
    if (e.event_type === "student_choice_made") {
      const p = e.payload as any;
      if (p.choice_type === "daily_challenge" || p.choice_type === "self_plan") {
        out.push({ category: "daily_mission_selection", aiAssisted: p.used_ai_option === true, occurred_at: e.occurred_at });
      } else if (p.choice_type === "priority_order") {
        out.push({ category: "priority_order", aiAssisted: p.used_ai_option === true, occurred_at: e.occurred_at });
      } else if (p.choice_type === "focus_length") {
        out.push({ category: "focus_preset", aiAssisted: p.used_ai_option === true, occurred_at: e.occurred_at });
      }
    } else if (e.event_type === "reset_created") {
      const p = e.payload as any;
      out.push({ category: "reset_response", aiAssisted: p.ai_assisted === true, occurred_at: e.occurred_at });
    } else if (e.event_type === "weekly_boss_selected") {
      const p = e.payload as any;
      out.push({ category: "weekly_boss_selection", aiAssisted: p.ai_assisted === true, occurred_at: e.occurred_at });
    }
  }
  return out;
}

export interface AutonomyRatioResult {
  ratio: number | null; // 핵심 선택이 하나도 없으면 null(0으로 대체하지 않음)
  autonomousCount: number;
  totalCount: number;
}

export function computeAutonomyRatio(
  events: readonly NuviaEvent[], window?: { from: string; to: string }
): AutonomyRatioResult {
  let choices = extractCoreChoices(events);
  if (window) choices = choices.filter((c) => c.occurred_at >= window.from && c.occurred_at <= window.to);
  const total = choices.length;
  if (total === 0) return { ratio: null, autonomousCount: 0, totalCount: 0 };
  const autonomous = choices.filter((c) => !c.aiAssisted).length;
  return { ratio: autonomous / total, autonomousCount: autonomous, totalCount: total };
}
