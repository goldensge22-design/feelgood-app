/** ✅ LOVABLE MAY EDIT — 시각만. 점수·등급을 그리지 말 것. */
import React from "react";
import { Stack, Text } from "./primitives";
import type { GrowthMapVM } from "./viewModels";

export const GrowthMap: React.FC<{ vm: GrowthMapVM }> = ({ vm }) => (
  <div className="nuvia-growth-map">
    <Text size="xs" muted>MY GROWTH MAP</Text>
    <Stack row wrap gap={8}>
      {vm.areas.map((a) => (
        <div key={a.key} className={`nuvia-growth-area ${a.lit ? "is-lit" : ""}`}>
          <span className="nuvia-growth-dot" aria-hidden="true" />
          <Text size="sm" bold={a.lit}>{a.label}</Text>
          {!a.lit && a.pendingLabel && <Text size="xs" muted>{a.pendingLabel}</Text>}
        </div>
      ))}
    </Stack>
  </div>
);
