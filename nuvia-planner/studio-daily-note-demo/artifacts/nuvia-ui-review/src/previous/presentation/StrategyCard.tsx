/** ✅ LOVABLE MAY EDIT — 시각만. 상태 판정은 로직 소유. */
import React from "react";
import { Badge, Button, Stack, Surface, Text } from "./primitives";
import type { StrategyCardVM } from "./viewModels";

export interface StrategyCardProps {
  vm: StrategyCardVM;
  onRetry?: (id: string) => void;
}

const TONE = { fits_me: "accent", trying: "neutral", retest: "warn" } as const;

export const StrategyCard: React.FC<StrategyCardProps> = ({ vm, onRetry }) => (
  <div className="nuvia-strategy-card"><Surface>
    <Stack gap={10}>
      <div className="nuvia-strategy-card-head">
        <div className="nuvia-strategy-mark">S</div>
        <div>
          <Text size="xs" muted>MY STRATEGY</Text>
          <Text bold>{vm.label}</Text>
        </div>
      </div>
      <Stack row gap={6} align="center" wrap>
        <Badge tone={TONE[vm.status]}>{vm.statusLabel}</Badge>
        <Text size="xs" muted>{vm.trialLabel}</Text>
      </Stack>
      {vm.status === "retest" && onRetry && (
        <Button testId={`retry-${vm.id}`} onClick={() => onRetry(vm.id)}>{vm.retryLabel ?? "오늘 다시 써보기"}</Button>
      )}
    </Stack>
  </Surface></div>
);
