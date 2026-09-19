/**
 * PRESENTATION VIEW MODELS
 * ⛔ 이 파일의 필드 이름은 Logic ↔ Presentation 계약이다. 변경 시 로직이 깨진다.
 * Lovable은 이 타입을 소비만 하고 수정하지 않는다.
 */
export type GapDirection = "longer" | "shorter" | "match";
export type StrategyStatusVM = "fits_me" | "trying" | "retest";
export type MotionLevelVM = "none" | "subtle" | "rich";

export interface ChallengeCardVM {
  id: string;
  title: string;           // copyPack에서 이미 해석된 문구
  moduleLabel: string;
  bossLinked: boolean;
  /** AI 추천 배지 여부. "추천" 대신 관찰 문장을 쓴다 */
  aiNote?: string;
}

export interface MissionCardVM {
  id: string;
  title: string;
  taskType: string;
  predictedMinutes: number | null;
  actualMinutes: number | null;
  subtaskCount: number;
  focusLength: number | null;
  completed: boolean;
  gap?: { minutes: number; direction: GapDirection; label: string };
}

export interface DiscoveryCardVM {
  id: string;
  statement: string;
  evidenceLabel: string;      // "최근 3주 · 7회 관찰"
  weakening: boolean;
  weakeningLabel?: string;
  canMakeStrategy: boolean;
}

export interface StrategyCardVM {
  id: string;
  label: string;              // "15-Minute Start"
  status: StrategyStatusVM;
  statusLabel: string;
  trialLabel: string;         // "8회 시험"
  retryLabel?: string;
}

export interface WeeklyBossCardVM {
  present: boolean;
  title?: string;
  progressRatio?: number;     // 0..1
  recordLabel?: string;       // "이번 주 도전 기록" — 실패 라벨 없음
  observationWeek: boolean;
  observationTitle?: string;
  unlockHints?: string[];     // "Focus 기록 2번 더"
}

export interface LevelJourneyVM {
  currentLevel: number;       // 1..6
  levels: { level: number; name: string; meaning: string; reached: boolean }[];
  journeyLabel: string;
}

export interface GrowthMapVM {
  areas: { key: string; label: string; lit: boolean; pendingLabel?: string }[];
}

export interface ProgressIndicatorVM {
  ratio: number | null;       // null = 최소관찰수 미충족
  pendingLabel?: string;      // "3번 더 기록되면 볼 수 있어요"
  ariaLabel: string;
}

export interface RewardKindVM {
  kind: "discovery" | "strategy" | "level" | "record" | "boss";
  message: string;
}
