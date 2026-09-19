/**
 * AGE UX PROFILE — 표현 설정 전용
 * ✅ LOVABLE MAY EDIT (값만) — ⛔ 로직 분기 추가 금지
 *
 * §5, §34: 동일 엔진·동일 Metric·동일 Event·동일 데이터 모델.
 * 이 파일은 copy / icon / motion / intensity / layout variant 만 담는다.
 * band를 참조하는 if문을 domain/ 아래에 두면 안 된다.
 */
import type { AgeBand } from "../domain/types";
import type { MotionLevel } from "../tokens/designTokens";

export type BossPresentation = "full" | "collapsed" | "personal_challenge";
export type CharacterMode = "companion" | "symbol" | "none";
export type LayoutVariant = "cards_large" | "cards_compact" | "list" | "table";

export interface AgeUXProfile {
  band: AgeBand;
  copyPack: string;
  /** 1(절제) ~ 5(강함). RewardAnimation / ProgressIndicator 강도 */
  gameIntensity: 1 | 2 | 3 | 4 | 5;
  bossPresentation: BossPresentation;
  characterMode: CharacterMode;
  motionLevel: MotionLevel;
  layoutVariant: LayoutVariant;
  showLevelSymbol: boolean;
  showGrowthMap: boolean;
  /** Coach 선택지 개수 */
  coachOptionCount: 2 | 3;
  /** 부모 공개 프리셋 키 (§24) */
  parentVisibilityPreset: "broad" | "reduced" | "minimal" | "none";
  iconSet: "quest" | "mission" | "challenge" | "abstract";
}

export const AGE_UX_PROFILES: Record<AgeBand, AgeUXProfile> = {
  A: {
    band: "A", copyPack: "ko-A", gameIntensity: 5,
    bossPresentation: "full", characterMode: "companion", motionLevel: "rich",
    layoutVariant: "cards_large", showLevelSymbol: true, showGrowthMap: true,
    coachOptionCount: 3, parentVisibilityPreset: "broad", iconSet: "quest",
  },
  B: {
    band: "B", copyPack: "ko-B", gameIntensity: 4,
    bossPresentation: "full", characterMode: "symbol", motionLevel: "subtle",
    layoutVariant: "cards_compact", showLevelSymbol: true, showGrowthMap: true,
    coachOptionCount: 3, parentVisibilityPreset: "reduced", iconSet: "mission",
  },
  C: {
    band: "C", copyPack: "ko-C", gameIntensity: 3,
    bossPresentation: "collapsed", characterMode: "none", motionLevel: "subtle",
    layoutVariant: "list", showLevelSymbol: false, showGrowthMap: true,
    coachOptionCount: 2, parentVisibilityPreset: "minimal", iconSet: "challenge",
  },
  D: {
    band: "D", copyPack: "ko-D", gameIntensity: 2,
    bossPresentation: "personal_challenge", characterMode: "none", motionLevel: "none",
    layoutVariant: "table", showLevelSymbol: false, showGrowthMap: false,
    coachOptionCount: 2, parentVisibilityPreset: "none", iconSet: "abstract",
  },
};

export function getProfile(band: AgeBand): AgeUXProfile {
  return AGE_UX_PROFILES[band];
}

/**
 * 로직 분기 금지 가드.
 * domain/ 파일에서 band를 조건으로 쓰면 이 함수로 잡는다 (테스트에서 사용).
 */
export const LOGIC_LAYER_MUST_NOT_BRANCH_ON_BAND = true;
