/**
 * DAILY LOOP STATE MACHINE
 * LOGIC LAYER — LOVABLE MUST NOT EDIT
 *
 * CHOOSE → CHALLENGE → DISCOVER → UNLOCK → GROW → RETURN
 * §17: GAME OVER 종단 상태 없음. ABANDONED의 다음은 RESET_OFFERED.
 */
import type { DailyPhase } from "./types";

export type DailyAction =
  | "OPEN_APP"
  | "CHOOSE_CHALLENGE"
  | "COMMIT_PLAN"
  | "START_MISSION"
  | "INTERRUPT"
  | "RESUME"
  | "COMPLETE"
  | "ABANDON"
  | "OFFER_RESET"
  | "CREATE_RESET"
  | "REVISE_PLAN"
  | "SUBMIT_REFLECTION"
  | "SAVE_DISCOVERY"
  | "SKIP_DISCOVERY"
  | "ACCEPT_FADE"
  | "SKIP_FADE"
  | "PREVIEW_NEXT"
  | "END_DAY";

export const TRANSITIONS: Record<DailyPhase, Partial<Record<DailyAction, DailyPhase>>> = {
  IDLE:              { OPEN_APP: "CHECKED_IN" },
  CHECKED_IN:        { CHOOSE_CHALLENGE: "CHOSEN" },
  CHOSEN:            { COMMIT_PLAN: "PLANNED", CHOOSE_CHALLENGE: "CHOSEN" },
  PLANNED:           { START_MISSION: "IN_PROGRESS", ABANDON: "ABANDONED", REVISE_PLAN: "PLANNED" },
  IN_PROGRESS:       { INTERRUPT: "INTERRUPTED", COMPLETE: "NOTICED", ABANDON: "ABANDONED" },
  INTERRUPTED:       { RESUME: "IN_PROGRESS", ABANDON: "ABANDONED" },
  COMPLETED:         { SUBMIT_REFLECTION: "REFLECTED" },
  NOTICED:           { SUBMIT_REFLECTION: "REFLECTED" },
  REFLECTED:         { SAVE_DISCOVERY: "UNLOCKED", SKIP_DISCOVERY: "UNLOCKED" },
  UNLOCKED:          { ACCEPT_FADE: "GROWN", SKIP_FADE: "GROWN" },
  GROWN:             { PREVIEW_NEXT: "RETURN_PREVIEWED" },
  RETURN_PREVIEWED:  { END_DAY: "IDLE", START_MISSION: "IN_PROGRESS" },
  // 실패 종단 없음 — Reset으로 이어진다 (§17)
  ABANDONED:         { OFFER_RESET: "RESET_OFFERED", END_DAY: "IDLE" },
  RESET_OFFERED:     { CREATE_RESET: "RESET_CREATED", END_DAY: "IDLE" },
  RESET_CREATED:     { REVISE_PLAN: "PLANNED" },
};

export function canTransition(from: DailyPhase, a: DailyAction): boolean {
  return TRANSITIONS[from]?.[a] !== undefined;
}

export function transition(from: DailyPhase, a: DailyAction): DailyPhase {
  const to = TRANSITIONS[from]?.[a];
  if (!to) throw new Error(`Invalid transition: ${from} --${a}-->`);
  return to;
}

/** 어떤 상태에서도 도달 불가능한 '실패 종단'이 없음을 검증 */
export function hasTerminalFailureState(): boolean {
  return Object.entries(TRANSITIONS).some(
    ([phase, edges]) => Object.keys(edges).length === 0 && phase !== "IDLE"
  );
}

/** Instant Start 측정 (§35 Acceptance: 30초) */
export const INSTANT_START_BUDGET_MS = 30_000;

export function instantStartElapsedMs(openedAt: string, firstActionAt: string): number {
  return new Date(firstActionAt).getTime() - new Date(openedAt).getTime();
}

export function meetsInstantStart(openedAt: string, firstActionAt: string): boolean {
  return instantStartElapsedMs(openedAt, firstActionAt) <= INSTANT_START_BUDGET_MS;
}
