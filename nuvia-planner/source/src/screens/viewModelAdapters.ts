/**
 * VIEW MODEL ADAPTERS — Logic → Presentation 경계
 * ⛔ LOVABLE MUST NOT EDIT — 문구 선택과 상태 판정이 여기서 끝난다.
 * Presentation Component는 여기서 만든 VM만 받는다.
 */
import { t } from "../config/copyPacks";
import type { CopyPackId } from "../config/copyPacks";
import { getProfile } from "../config/ageUXProfiles";
import { MODULES, timeSenseGap } from "../domain/modules";
import { renderStatement } from "../domain/discoveryEngine";
import { STRATEGY_LABELS, STATUS_COPY_KEY } from "../domain/strategyEngine";
import { BOSS_COPY_KEY, unlockRequirements, evaluateBossWeek } from "../domain/weeklyBoss";
import { LEVEL_NAMES } from "../domain/types";
import { remainingObservations } from "../domain/metrics";
import type {
  Challenge, Discovery, LearnerContext, MetricResult, Mission, Strategy, WeeklyState, MetricKey,
} from "../domain/types";
import type {
  ChallengeCardVM, DiscoveryCardVM, GrowthMapVM, LevelJourneyVM,
  MissionCardVM, ProgressIndicatorVM, StrategyCardVM, WeeklyBossCardVM,
} from "../presentation/viewModels";

export function packFor(ctx: LearnerContext): CopyPackId {
  return getProfile(ctx.age_ux_band).copyPack as CopyPackId;
}

export function toChallengeVM(c: Challenge, pack: CopyPackId): ChallengeCardVM {
  return {
    id: c.challenge_id,
    title: t(pack, c.copy_key),
    moduleLabel: t(pack, MODULES[c.module].copyKey),
    bossLinked: c.boss_linked,
    // pool(60/40)은 절대 노출하지 않는다 (§19)
  };
}

export function toMissionVM(m: Mission, pack: CopyPackId): MissionCardVM {
  const g = timeSenseGap(m);
  return {
    id: m.mission_id,
    title: m.title,
    taskType: m.task_type,
    predictedMinutes: m.predicted_minutes,
    actualMinutes: m.actual_minutes,
    subtaskCount: m.subtasks.length,
    focusLength: m.focus_length,
    completed: m.completed,
    gap: g ? {
      minutes: Math.abs(g.gapMinutes),
      direction: g.direction,
      label: t(pack, `gap.${g.direction}`, { n: Math.abs(g.gapMinutes) }),
    } : undefined,
  };
}

export function toDiscoveryVM(d: Discovery, pack: CopyPackId): DiscoveryCardVM {
  return {
    id: d.discovery_id,
    statement: renderStatement(d.statement_template_id, d.statement_params),
    evidenceLabel: `근거 ${d.evidence_count}회 관찰`,
    weakening: d.confidence_state === "weakening",
    weakeningLabel: t(pack, "discovery.weakening"),
    canMakeStrategy: d.confidence_state === "observed",
  };
}

export function toStrategyVM(s: Strategy, pack: CopyPackId): StrategyCardVM {
  return {
    id: s.strategy_id,
    label: STRATEGY_LABELS[s.strategy_type],
    status: s.status,
    statusLabel: t(pack, STATUS_COPY_KEY[s.status]),
    trialLabel: `${s.trial_count}회 시험`,
    retryLabel: t(pack, "strategy.retry"),
  };
}

export function toWeeklyBossVM(
  w: WeeklyState, pack: CopyPackId, observationCounts: Partial<Record<MetricKey, number>>
): WeeklyBossCardVM {
  if (w.observation_week || !w.boss) {
    return {
      present: false, observationWeek: true,
      observationTitle: t(pack, "boss.observation_week"),
      unlockHints: unlockRequirements(observationCounts).map((r) =>
        t(pack, "boss.unlock_hint", { metric: r.metric, n: r.remaining })),
    };
  }
  const { achievedValue } = evaluateBossWeek(w);
  return {
    present: true, observationWeek: false,
    title: t(pack, BOSS_COPY_KEY[w.boss.boss_type]),
    progressRatio: achievedValue == null ? undefined : Math.min(1, achievedValue / w.boss.target),
    recordLabel: t(pack, "boss.week_record"),
  };
}

export function toLevelJourneyVM(ctx: LearnerContext, pack: CopyPackId): LevelJourneyVM {
  const meanings: Record<number, string> = {
    1: "나를 관찰한다", 2: "나를 예상한다", 3: "내가 계획한다",
    4: "내가 조절한다", 5: "틀어져도 다시 돌아온다", 6: "내가 나를 관리한다",
  };
  return {
    currentLevel: ctx.level,
    journeyLabel: t(pack, "level.journey"),
    levels: ([1, 2, 3, 4, 5, 6] as const).map((l) => ({
      level: l, name: LEVEL_NAMES[l], meaning: meanings[l], reached: l <= ctx.level,
    })),
  };
}

export function toGrowthMapVM(metrics: MetricResult[], pack: CopyPackId): GrowthMapVM {
  const labels: Partial<Record<MetricKey, string>> = {
    time_prediction_accuracy: "시간 예상",
    start_accuracy: "착수",
    focus_stability: "집중",
    recovery_skill: "복귀",
    planning_accuracy: "계획",
    plan_order_consistency: "순서",
    completion_reliability: "완료",
    metacognitive_accuracy: "자기평가",
  };
  return {
    areas: metrics.map((m) => ({
      key: m.key,
      label: labels[m.key] ?? m.key,
      lit: m.state === "sufficient",
      pendingLabel: m.state === "insufficient"
        ? t(pack, "growth.insufficient", { n: remainingObservations(m.key, m.observation_count) })
        : undefined,
    })),
  };
}

export function toProgressVM(m: MetricResult, pack: CopyPackId): ProgressIndicatorVM {
  return {
    ratio: m.state === "sufficient" ? m.value : null,
    pendingLabel: t(pack, "growth.insufficient", { n: remainingObservations(m.key, m.observation_count) }),
    ariaLabel: m.key,
  };
}
