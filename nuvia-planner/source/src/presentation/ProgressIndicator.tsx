/** ✅ LOVABLE MAY EDIT — 시각만. ratio가 null이면 반드시 pendingLabel을 보여줄 것. */
import React from "react";
import { color, radius } from "../tokens/designTokens";
import { Text } from "./primitives";
import type { ProgressIndicatorVM } from "./viewModels";

export const ProgressIndicator: React.FC<{ vm: ProgressIndicatorVM }> = ({ vm }) => {
  if (vm.ratio == null) {
    return <Text size="xs" muted>{vm.pendingLabel ?? "아직 기록이 더 필요해요"}</Text>;
  }
  const pct = Math.max(0, Math.min(1, vm.ratio)) * 100;
  return (
    <div role="progressbar" aria-label={vm.ariaLabel} aria-valuenow={Math.round(pct)}
      style={{ background: color.surfaceMuted, borderRadius: radius.pill, height: 6, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color.accent }} />
    </div>
  );
};
