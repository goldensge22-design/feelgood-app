import type { StrategyOwnershipStage, StrategyUseEvidence } from "./types";

export function ownershipStageFor(strategyId: string, uses: StrategyUseEvidence[]): StrategyOwnershipStage {
  const relevant = uses.filter((u) => u.strategy_id === strategyId);
  if (relevant.length === 0) return "STRATEGY";
  if (relevant.some((u) => u.self_initiated)) return "OWN";
  if (relevant.some((u) => u.context_kind === "different_type")) return "TRANSFER";
  return "APPLY";
}

export const OWNERSHIP_STAGE_LABEL: Record<StrategyOwnershipStage, string> = {
  STRATEGY: "내 전략으로 저장",
  APPLY: "실제 과제에 적용",
  TRANSFER: "다른 상황에도 사용",
  OWN: "이제 스스로 사용",
};
