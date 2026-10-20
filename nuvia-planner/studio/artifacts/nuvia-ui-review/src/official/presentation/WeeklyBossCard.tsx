/** ✅ LOVABLE MAY EDIT — 시각만. '실패' 라벨을 추가하지 말 것 (§16). */
import React from "react";
import { Badge, Stack, Surface, Text } from "./primitives";
import { ProgressIndicator } from "./ProgressIndicator";
import type { WeeklyBossCardVM } from "./viewModels";

export interface WeeklyBossCardProps {
  vm: WeeklyBossCardVM;
  presentation?: "full" | "collapsed" | "personal_challenge";
}

export const WeeklyBossCard: React.FC<WeeklyBossCardProps> = ({ vm, presentation = "full" }) => {
  if (vm.observationWeek) {
    return (
      <div className="nuvia-boss-card nuvia-boss-card--observation"><Surface muted>
        <Stack gap={10}>
          <Badge>관찰 주간</Badge>
          <Text bold size="lg">{vm.observationTitle ?? "이번 주는 나를 알아가는 주간이에요"}</Text>
          <Text size="sm" muted>아직 목표를 억지로 만들지 않고, 실제 생활 기록을 모아 다음 도전을 준비합니다.</Text>
          {vm.unlockHints?.map((h, i) => <Text key={i} size="sm" muted>· {h}</Text>)}
        </Stack>
      </Surface></div>
    );
  }
  if (!vm.present) return null;
  return (
    <div className="nuvia-boss-card"><Surface>
      <Stack gap={10}>
        <Stack row gap={6} align="center" wrap>
          <Badge tone="accent">{presentation === "personal_challenge" ? "PERSONAL CHALLENGE" : "WEEKLY BOSS"}</Badge>
          <Text size="xs" muted>이번 주 하나만 반복해서 시험해보기</Text>
        </Stack>
        <Text bold size="lg">{vm.title}</Text>
        {presentation !== "collapsed" && (
          <ProgressIndicator vm={{ ratio: vm.progressRatio ?? null, ariaLabel: vm.title ?? "" }} />
        )}
        <Text size="xs" muted>{vm.recordLabel ?? "이번 주 도전 기록"}</Text>
      </Stack>
    </Surface></div>
  );
};
