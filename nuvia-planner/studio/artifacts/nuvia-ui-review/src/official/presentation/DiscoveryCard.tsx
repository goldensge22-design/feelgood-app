/** ✅ LOVABLE MAY EDIT — 시각만. 문장 텍스트를 생성하지 말 것(로직 소유). */
import React from "react";
import { Badge, Button, Stack, Surface, Text } from "./primitives";
import type { DiscoveryCardVM } from "./viewModels";

export interface DiscoveryCardProps {
  vm: DiscoveryCardVM;
  onMakeStrategy?: (id: string) => void;
  onViewEvidence?: (id: string) => void;
  makeStrategyLabel?: string;
}

export const DiscoveryCard: React.FC<DiscoveryCardProps> = ({ vm, onMakeStrategy, onViewEvidence, makeStrategyLabel }) => (
  <Surface>
    <Stack gap={8}>
      <Text>{vm.statement}</Text>
      <Stack row gap={6} align="center">
        <Text size="xs" muted>{vm.evidenceLabel}</Text>
        {vm.weakening && <Badge tone="warn">{vm.weakeningLabel ?? "다시 시험"}</Badge>}
      </Stack>
      <Stack row gap={8}>
        {onViewEvidence && <Button variant="quiet" onClick={() => onViewEvidence(vm.id)}>근거 보기</Button>}
        {vm.canMakeStrategy && onMakeStrategy && (
          <Button testId={`make-strategy-${vm.id}`} onClick={() => onMakeStrategy(vm.id)}>
            {makeStrategyLabel ?? "이걸로 전략 만들기"}
          </Button>
        )}
      </Stack>
    </Stack>
  </Surface>
);
