/** ✅ LOVABLE MAY EDIT — 시각만. */
import React from "react";
import { Badge, Button, Stack, Surface, Text } from "./primitives";
import { color } from "../tokens/designTokens";
import type { MissionCardVM } from "./viewModels";

export interface MissionCardProps {
  vm: MissionCardVM;
  onStart?: (id: string) => void;
  onComplete?: (id: string) => void;
  startLabel?: string;
}

export const MissionCard: React.FC<MissionCardProps> = ({ vm, onStart, onComplete, startLabel }) => {
  const gapColor = vm.gap
    ? vm.gap.direction === "longer" ? color.gapLonger
      : vm.gap.direction === "shorter" ? color.gapShorter : color.gapMatch
    : color.textMuted;

  return (
    <Surface>
      <Stack gap={8}>
        <Stack row gap={6} align="center">
          <Badge>{vm.taskType}</Badge>
          {vm.subtaskCount > 0 && <Badge>{vm.subtaskCount}단계</Badge>}
          {vm.focusLength && <Badge>{vm.focusLength}분</Badge>}
        </Stack>
        <Text bold>{vm.title}</Text>
        <Text size="sm" muted>
          예상 {vm.predictedMinutes ?? "—"}분{vm.actualMinutes != null ? ` · 실제 ${vm.actualMinutes}분` : ""}
        </Text>
        {vm.gap && <Text size="sm"><span style={{ color: gapColor }}>{vm.gap.label}</span></Text>}
        <Stack row gap={8}>
          {!vm.completed && onStart && <Button variant="primary" testId={`start-${vm.id}`} onClick={() => onStart(vm.id)}>{startLabel ?? "시작"}</Button>}
          {!vm.completed && onComplete && <Button onClick={() => onComplete(vm.id)}>완료</Button>}
          {vm.completed && <Badge tone="accent">완료</Badge>}
        </Stack>
      </Stack>
    </Surface>
  );
};
