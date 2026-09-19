/** ✅ LOVABLE MAY EDIT — 시각만. props/콜백 시그니처 유지. */
import React from "react";
import { Badge, Button, Stack, Surface, Text } from "./primitives";
import type { ChallengeCardVM } from "./viewModels";

export interface ChallengeCardProps {
  vm: ChallengeCardVM;
  selected?: boolean;
  onSelect: (id: string) => void;
  onUseStrategy?: (id: string) => void;
  useStrategyLabel?: string;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({ vm, selected, onSelect, onUseStrategy, useStrategyLabel }) => (
  <div className={`nuvia-card-accent nuvia-challenge-card ${selected ? "is-selected" : ""}`}>
    <Surface muted={selected}>
      <Stack gap={10}>
        <Stack row gap={6} align="center" wrap>
          <Badge>{vm.moduleLabel}</Badge>
          {vm.bossLinked && <Badge tone="accent">이번 주 도전과 연결</Badge>}
        </Stack>
        <div className="nuvia-card-title-row">
          <div className="nuvia-card-number">→</div>
          <div>
            <Text bold size="lg">{vm.title}</Text>
            {vm.aiNote && <Text size="sm" muted>{vm.aiNote}</Text>}
          </div>
        </div>
        <Stack row gap={8} wrap>
          <Button variant="primary" testId={`choose-${vm.id}`} onClick={() => onSelect(vm.id)}>이걸 해볼게요</Button>
          {onUseStrategy && (
            <Button variant="quiet" onClick={() => onUseStrategy(vm.id)}>{useStrategyLabel ?? "내 전략 쓰기"}</Button>
          )}
        </Stack>
      </Stack>
    </Surface>
  </div>
);
