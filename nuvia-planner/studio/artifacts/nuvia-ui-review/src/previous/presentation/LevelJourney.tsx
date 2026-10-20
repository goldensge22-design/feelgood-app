/** ✅ LOVABLE MAY EDIT — 시각만. 하향 표시나 등급 표현을 추가하지 말 것 (§13). */
import React from "react";
import { Text } from "./primitives";
import type { LevelJourneyVM } from "./viewModels";

export const LevelJourney: React.FC<{ vm: LevelJourneyVM; compact?: boolean }> = ({ vm, compact }) => (
  <div className={`nuvia-level-journey ${compact ? "is-compact" : ""}`}>
    <Text size="sm" muted>{vm.journeyLabel}</Text>
    <div className="nuvia-level-track">
      {vm.levels.map((l) => (
        <div key={l.level} className={`nuvia-level-step ${l.reached ? "is-reached" : ""} ${l.level === vm.currentLevel ? "is-current" : ""}`}>
          <span className="nuvia-level-node">{l.level}</span>
          <div>
            <Text size="sm" bold={l.level === vm.currentLevel}>{l.name}</Text>
            {!compact && <Text size="xs" muted>{l.meaning}</Text>}
          </div>
        </div>
      ))}
    </div>
  </div>
);
