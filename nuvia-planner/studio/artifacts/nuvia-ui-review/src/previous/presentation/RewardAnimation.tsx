/**
 * ✅ LOVABLE MAY EDIT — 여기가 게임 연출의 주 작업 지점.
 * 제약: motionLevel="none"이면 애니메이션 없이 정적 렌더할 것.
 *       reduced-motion을 존중할 것. 손실·실패 연출을 만들지 말 것 (§17, §30).
 */
import React from "react";
import { color, motion, radius, space } from "../tokens/designTokens";
import type { MotionLevelVM, RewardKindVM } from "./viewModels";
import { Text } from "./primitives";

export interface RewardAnimationProps {
  reward: RewardKindVM | null;
  motionLevel: MotionLevelVM;
  intensity: 1 | 2 | 3 | 4 | 5;
}

export const RewardAnimation: React.FC<RewardAnimationProps> = ({ reward, motionLevel, intensity }) => {
  if (!reward) return null;
  const m = motion[motionLevel];
  const prefersReduced = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const dur = prefersReduced ? 0 : m.durationMs;

  return (
    <div
      data-testid="reward"
      style={{
        border: `1px solid ${color.accent}`, background: color.accentSoft,
        borderRadius: radius.md, padding: space.md,
        transition: `opacity ${dur}ms ${m.easing}, transform ${dur}ms ${m.easing}`,
        transform: dur > 0 && intensity >= 4 ? "translateY(0)" : "none",
      }}
    >
      <Text size="sm" bold>{reward.message}</Text>
    </div>
  );
};
