/**
 * PERSONALIZATION ENGINE
 * LOGIC LAYER — LOVABLE MUST NOT EDIT
 *
 * §19: 지원영역 60 / 강점활용 40. 학생에게 비율 미노출.
 *      검사 미보유자는 프로파일 비의존 경로, 강점 추정 금지.
 *      동일 모듈 연속 3회 후 다른 유형 최소 1회 (Variation).
 */
import type { Challenge, LearnerContext, ModuleId } from "./types";
import { MODULES } from "./modules";
import { patternForModule } from "./patternEngine";

export const SUPPORT_WEIGHT = 0.6;   // §19 — 변경 금지
export const STRENGTH_WEIGHT = 0.4;  // §19 — 변경 금지
export const MAX_SAME_MODULE_STREAK = 3; // §19

/** 인지영역 → 모듈 매핑. 순차처리 canonical key는 CR-1로 미확정 상태 */
const DOMAIN_MODULE_MAP: Record<string, ModuleId[]> = {
  planning: ["PRIORITY", "BREAK_IT", "PLAN_VS_REALITY"],
  attention: ["FOCUS_MISSION", "START_NOW"],
  simultaneous: ["PRIORITY", "PLAN_VS_REALITY"],
  // CR-1: 순차처리 canonical key 미확정 — 하드코딩 금지 (CORE §14)
  __sequential_pending__: ["TIME_SENSE", "BREAK_IT"],
};

const PROFILE_FREE_POOL: ModuleId[] = [
  "START_NOW", "TIME_SENSE", "FOCUS_MISSION", "PLAN_VS_REALITY", "BREAK_IT", "PRIORITY", "RESET",
];

export interface CandidateOptions {
  recentModules: ModuleId[];   // 최신순
  bossModule?: ModuleId | null;
  count?: number;              // 기본 3
  rand?: () => number;
}

/**
 * Challenge 후보 생성. 진입 이전에 미리 호출되어야 30초 규칙을 지킬 수 있다.
 * pool 값은 내부 표기이며 학생 화면에 노출하지 않는다.
 */
export function buildChallengeCandidates(
  ctx: LearnerContext,
  o: CandidateOptions
): Challenge[] {
  const count = o.count ?? 3;
  const rand = o.rand ?? Math.random;

  const hasAssessment = ctx.assessment_id !== null;

  const supportPool = hasAssessment ? modulesFor(ctx.support_domains) : PROFILE_FREE_POOL;
  // 검사 미보유자: 강점을 추정하지 않는다 (§19, CORE §5)
  const strengthPool = hasAssessment ? modulesFor(ctx.strength_domains) : [];

  const picked: Challenge[] = [];
  const used = new Set<ModuleId>();

  const take = (pool: ModuleId[], tag: Challenge["pool"]) => {
    const avail = pool.filter((m) => !used.has(m));
    if (avail.length === 0) return;
    const m = avail[Math.floor(rand() * avail.length) % avail.length];
    used.add(m);
    picked.push(makeChallenge(m, tag, o.bossModule === m));
  };

  take(supportPool, "support");
  if (strengthPool.length > 0) take(strengthPool, "strength");

  // Variation 보장: 최근 3회와 다른 모듈 최소 1개 (§19)
  const blocked = streakedModule(o.recentModules);
  const variationPool = PROFILE_FREE_POOL.filter((m) => m !== blocked && !used.has(m));
  while (picked.length < count && variationPool.length > 0) {
    const m = variationPool.splice(Math.floor(rand() * variationPool.length), 1)[0];
    used.add(m);
    picked.push(makeChallenge(m, "variation", o.bossModule === m));
  }

  return picked.slice(0, count);
}

function makeChallenge(m: ModuleId, pool: Challenge["pool"], bossLinked: boolean): Challenge {
  return {
    challenge_id: `ch_${m}_${pool}`,
    module: m,
    pattern: patternForModule(m),
    copy_key: MODULES[m].copyKey,
    pool,
    boss_linked: bossLinked,
  };
}

function modulesFor(domains: string[]): ModuleId[] {
  const out = new Set<ModuleId>();
  for (const d of domains) (DOMAIN_MODULE_MAP[d] ?? []).forEach((m) => out.add(m));
  return out.size > 0 ? [...out] : PROFILE_FREE_POOL;
}

/** 최근 N회 연속 동일 모듈이면 그 모듈을 반환 (차단 대상) */
export function streakedModule(recent: ModuleId[]): ModuleId | null {
  if (recent.length < MAX_SAME_MODULE_STREAK) return null;
  const head = recent.slice(0, MAX_SAME_MODULE_STREAK);
  return head.every((m) => m === head[0]) ? head[0] : null;
}

/** 학생 화면에 비율을 노출하지 않기 위한 명시적 가드 (§19) */
export function assertNoRatioExposure(rendered: string): void {
  if (/60\s*%|40\s*%|지원영역\s*6|강점\s*4/.test(rendered)) {
    throw new Error("60/40 weighting must not be exposed to the student (PLANNER §19).");
  }
}
