/**
 * FUNCTIONAL SCREENS — Clean Functional UI
 * ⛔ Container 로직(dispatch, 조건 분기)은 LOVABLE 수정 금지.
 * ✅ Presentation Component 교체·스타일 변경은 자유.
 */
import React from "react";
import { ToolIcon, FocusBeacon, StartRehearsal } from "../presentation/MissionWorld";
import {
  Button, ChallengeCard, DiscoveryCard, GrowthMap, LevelJourney, MissionCard,
  ProgressIndicator, RewardAnimation, Stack, StrategyCard, Surface, Text, WeeklyBossCard,
} from "../presentation";
import { getProfile } from "../config/ageUXProfiles";
import { t } from "../config/copyPacks";
import { FOCUS_LENGTHS } from "../domain/types";
import type { FocusLength, MetricKey, OrderReason } from "../domain/types";
import { ORDER_REASONS, validateBreakdown } from "../domain/modules";
import { MODULE_SCAFFOLD } from "../domain/scaffoldFading";
import { candidateStrategiesFor } from "../domain/strategyEngine";
import { runDiscoveryGates } from "../domain/discoveryEngine";
import { STRATEGY_LABELS } from "../domain/strategyEngine";
import { selectMetrics, selectNarrative, selectFadeOffer, selectPatternProfile, selectStrategyOwnershipStage } from "../domain/store";
import { PATTERN_LABELS, PATTERN_QUESTIONS } from "../domain/patternEngine";
import { OWNERSHIP_STAGE_LABEL } from "../domain/strategyTransfer";
import type { Action, AppState } from "../domain/store";
import * as VM from "./viewModelAdapters";

export interface ScreenProps {
  state: AppState;
  dispatch: (a: Action) => void;
}

// ── 03 TODAY ────────────────────────────────────────────────────────────
export const TodayScreen: React.FC<ScreenProps> = ({ state, dispatch }) => {
  const pack = VM.packFor(state.ctx);
  const profile = getProfile(state.ctx.age_ux_band);
  const phase = state.daily.phase;

  if (phase === "IDLE") {
    return (
      <Surface>
        <Stack>
          <Text bold size="lg">작은 시작 하나를 직접 해볼까요?</Text><Text muted size="sm">목표 확인 → 전략 선택 → 실제 행동 → 돌아보기</Text>
          <Button variant="primary" testId="open-app" onClick={() => state.missions.some(m=>m.completed) ? window.location.reload() : dispatch({ type: "OPEN_APP" })}>{state.missions.some(m=>m.completed) ? "새 체험 시작 →" : "START 미션 입장 →"}</Button>
        </Stack>
      </Surface>
    );
  }

  if (phase === "CHECKED_IN") {
    const patterns = selectPatternProfile(state);
    return (
      <Stack>
        <div className="nuvia-page-heading">
          <Text size="xs" muted>MY DAY · SELF-MANAGEMENT</Text>
          <Text as="h2" size="xl" bold>{t(pack, "today.choose_title")}</Text>
          <Text size="sm" muted>오늘의 목표는 완벽한 계획이 아니라, 나에게 맞는 방법 하나를 직접 시험해보는 거예요.</Text>
        </div>
        <div className="start-target-card">
          <div className="start-target-icon"><ToolIcon kind="start" size={38}/></div>
          <div><span className="world-eyebrow">TODAY'S TARGET</span><h3>미뤄둔 과제, 첫 단계만 시작하기</h3><p>책을 펼치거나 자료를 여는 것부터. 지금 시작할 과제 하나를 떠올려요.</p></div>
        </div>
        <details className="support-details"><summary>나의 지원 포커스 보기</summary><p>{patterns.primary ? PATTERN_QUESTIONS[patterns.primary] : t(pack, "today.neutral_focus")}</p></details>
        <Button variant={patterns.source === "neutral" ? "primary" : "quiet"} testId="self-plan" onClick={() => dispatch({ type: "SELF_PLAN" })}>
          이 목표로 시작하기 →
        </Button>
      </Stack>
    );
  }

  if (phase === "CHOSEN") return <PlanScreen state={state} dispatch={dispatch} />;

  if (phase === "PLANNED" || phase === "IN_PROGRESS" || phase === "INTERRUPTED") {
    return <FocusScreen state={state} dispatch={dispatch} />;
  }

  if (phase === "NOTICED" || phase === "COMPLETED") return <ReflectScreen state={state} dispatch={dispatch} />;
  if (phase === "REFLECTED") return <DiscoverScreen state={state} dispatch={dispatch} />;
  if (phase === "UNLOCKED") return <GrowScreen state={state} dispatch={dispatch} />;
  if (phase === "GROWN" || phase === "RETURN_PREVIEWED") return <ReturnScreen state={state} dispatch={dispatch} />;
  if (phase === "ABANDONED" || phase === "RESET_OFFERED" || phase === "RESET_CREATED") {
    return <ResetScreen state={state} dispatch={dispatch} />;
  }
  return null;
};

// ── 04/05 PLAN (Add Mission + Priority) ─────────────────────────────────
export const PlanScreen: React.FC<ScreenProps> = ({ state, dispatch }) => {
  const pack = VM.packFor(state.ctx);
  const [reason, setReason] = React.useState<OrderReason>("hard_first");
  const scaffold = state.ctx.scaffold_state;

  const setPrediction = (id: string, v: number) => dispatch({ type: "SET_PREDICTION", missionId: id, minutes: v });
  const setFocus = (id: string, v: FocusLength) => dispatch({ type: "SET_FOCUS_LENGTH", missionId: id, length: v });

  return (
    <Stack>
      <div className="nuvia-page-heading"><Text size="xs" muted>STRATEGY POWER</Text><Text as="h2" size="xl" bold>어떤 방법으로 시작할까요?</Text><Text size="sm" muted>방법을 선택한 뒤, 아래에서 시간과 첫 단계를 직접 정해요.</Text></div>
      <StartRehearsal band={state.ctx.age_ux_band}/><div className="strategy-loadout">{state.strategies.map(st => <button key={st.strategy_id} className={`loadout-card ${state.daily.applied_strategy_id===st.strategy_id?'selected':''}`} aria-pressed={state.daily.applied_strategy_id===st.strategy_id} data-testid={`equip-${st.strategy_id}`} onClick={()=>dispatch({type:"APPLY_STRATEGY", strategyId:st.strategy_id})}><ToolIcon kind={st.strategy_type==='BREAK_INTO_3'?'plan':st.strategy_type==='FOCUS_25'?'focus':'start'} size={32}/><strong>{({FIFTEEN_MIN_START:'15분만 시작하기',BREAK_INTO_3:'세 단계로 나누기',FOCUS_25:'25분 집중하기'} as Record<string,string>)[st.strategy_type] || STRATEGY_LABELS[st.strategy_type]}</strong><span>{state.daily.applied_strategy_id===st.strategy_id?'선택했어요 ✓':'이 방법 선택'}</span></button>)}</div>

      {state.missions.map((m) => (
        <Surface key={m.mission_id}>
          <Stack gap={8}>
            <Text bold>{m.title}</Text>

            <Text size="sm" muted>{t(pack, "plan.predict")}</Text>
            <Stack row gap={6} wrap>
              {[15, 30, 45, 60].map((v) => (
                <Button key={v} testId={`predict-${m.mission_id}-${v}`}
                  variant={m.predicted_minutes === v ? "primary" : "secondary"}
                  onClick={() => setPrediction(m.mission_id, v)}>{v}분</Button>
              ))}
            </Stack>

            <Text size="sm" muted>{t(pack, "focus.choose_length")}</Text>
            <Stack row gap={6}>
              {FOCUS_LENGTHS.map((v) => (
                <Button key={v} testId={`focus-${m.mission_id}-${v}`}
                  variant={m.focus_length === v ? "primary" : "secondary"}
                  onClick={() => setFocus(m.mission_id, v)}>{v}분</Button>
              ))}
            </Stack>

            <BreakItEditor missionId={m.mission_id} subtasks={m.subtasks} scaffold={scaffold} dispatch={dispatch} />
          </Stack>
        </Surface>
      ))}

      {/* PRIORITY — AI는 고려요소만 제시, 자동 배치하지 않는다 */}
      <Surface muted>
        <Stack gap={8}>
          <Text size="sm" muted>{t(pack, "plan.order_reason")}</Text>
          {MODULE_SCAFFOLD.PRIORITY[scaffold] === "considerations_3" && (
            <Text size="xs" muted>고려해볼 것: 마감이 가까운 것 · 시간이 오래 걸리는 것 · 지금 집중이 잘 되는 것</Text>
          )}
          {MODULE_SCAFFOLD.PRIORITY[scaffold] === "considerations_1" && (
            <Text size="xs" muted>고려해볼 것: 마감이 가까운 것</Text>
          )}
          <Stack row gap={6} wrap>
            {ORDER_REASONS.map((r) => (
              <Button key={r} testId={`reason-${r}`} variant={reason === r ? "primary" : "secondary"}
                onClick={() => { setReason(r); dispatch({ type: "SET_ORDER", order: state.missions.map((m) => m.mission_id), reason: r }); }}>
                {({finish_fast:"짧은 일부터",hard_first:"어려운 일부터",deadline_close:"마감이 가까운 일부터"} as Record<string,string>)[r] ?? r}
              </Button>
            ))}
          </Stack>
        </Stack>
      </Surface>

      <Button variant="primary" testId="commit-plan" onClick={() => dispatch({ type: "COMMIT_PLAN" })}>
        {t(pack, "plan.commit")}
      </Button>
    </Stack>
  );
};

const BreakItEditor: React.FC<{
  missionId: string; subtasks: string[]; scaffold: string; dispatch: (a: Action) => void;
}> = ({ missionId, subtasks, scaffold, dispatch }) => {
  const affordance = MODULE_SCAFFOLD.BREAK_IT[scaffold as keyof typeof MODULE_SCAFFOLD.BREAK_IT];
  const [items, setItems] = React.useState<string[]>(
    subtasks.length ? subtasks : affordance === "template" ? ["자료 찾기", "정리하기"] : ["", ""]
  );
  const v = validateBreakdown(items);
  return (
    <Stack gap={6}>
      <Text size="sm" muted>과제 나누기 (2~7단계)</Text>
      {items.map((s, i) => (
        <input key={i} aria-label={`과제 ${i+1}단계`} value={s} data-testid={`subtask-${missionId}-${i}`}
          onChange={(e) => { const next = [...items]; next[i] = e.target.value; setItems(next); }}
          style={{ padding: 6, border: "1px solid #E3E5E1", borderRadius: 4, fontSize: 14 }} />
      ))}
      <Stack row gap={6}>
        <Button testId={`add-subtask-${missionId}`} disabled={items.length >= 7}
          onClick={() => setItems([...items, ""])}>단계 추가</Button>
        <Button testId={`save-subtask-${missionId}`} disabled={!v.ok}
          onClick={() => dispatch({ type: "SET_BREAKDOWN", missionId, subtasks: items.filter((x) => x.trim()) })}>
          저장
        </Button>
      </Stack>
    </Stack>
  );
};

// ── 06 FOCUS ────────────────────────────────────────────────────────────
export const FocusScreen: React.FC<ScreenProps> = ({ state, dispatch }) => {
  const pack = VM.packFor(state.ctx);
  const active = state.missions.find((m) => m.mission_id === state.activeMissionId);
  const [actual, setActual] = React.useState(30);

  return (
    <Stack>
      <div className="nuvia-page-heading">
        <Text size="xs" muted>DO</Text>
        <Text as="h2" size="xl" bold>지금 하나에 집중하기</Text>
        <Text size="sm" muted>계획을 지키는 것보다, 선택한 한 가지를 실제로 시작하고 다시 돌아오는 경험이 중요해요.</Text>
      </div>
      {(state.daily.phase === "IN_PROGRESS" || state.daily.phase === "INTERRUPTED") && <FocusBeacon paused={state.daily.phase === "INTERRUPTED"} title={active?.title ?? "선택한 과제"}/>}
      {state.daily.applied_strategy_id && <div className="equipped-note"><ToolIcon kind="gem" size={20}/>선택한 전략 · {STRATEGY_LABELS[state.strategies.find(x=>x.strategy_id===state.daily.applied_strategy_id)!.strategy_type]}</div>}
      {state.missions.map((m) => (
        <MissionCard key={m.mission_id} vm={VM.toMissionVM(m, pack)}
          onStart={state.daily.phase === "PLANNED" ? (id) => dispatch({ type: "START_MISSION", missionId: id }) : undefined} />
      ))}
      {state.daily.phase === "IN_PROGRESS" && (
        <Surface>
          <Stack gap={8}>
            <Text size="sm" muted>{active?.title} 진행 중 · {active?.focus_length}분</Text>
            <Stack row gap={8} wrap>
              <Button testId="interrupt" onClick={() => dispatch({ type: "INTERRUPT" })}>{t(pack, "focus.pause")}</Button>
              <label className="actual-label">실제 걸린 시간(분)<input type="number" min="1" max="1440" aria-label="실제 걸린 시간(분)" value={actual} data-testid="actual-minutes"
                onChange={(e) => setActual(Number(e.target.value))}
                style={{ width: 80, padding: 6, border: "1px solid #E3E5E1", borderRadius: 4 }} /></label>
              <Button variant="primary" testId="complete" disabled={!Number.isFinite(actual) || actual<=0 || actual>1440}
                onClick={() => dispatch({ type: "COMPLETE_MISSION", actualMinutes: actual })}>완료</Button>
            </Stack>
            <Button variant="quiet" testId="abandon" onClick={() => dispatch({ type: "ABANDON" })}>오늘은 어려워요</Button>
          </Stack>
        </Surface>
      )}
      {state.daily.phase === "INTERRUPTED" && (
        <Button variant="primary" testId="resume" onClick={() => dispatch({ type: "RESUME" })}>{t(pack, "focus.resume")}</Button>
      )}
    </Stack>
  );
};

// ── 07 CHECK & REFLECT ──────────────────────────────────────────────────
export const ReflectScreen: React.FC<ScreenProps> = ({ state, dispatch }) => {
  const pack = VM.packFor(state.ctx);
  const [rating, setRating] = React.useState<1 | 2 | 3 | 4 | 5>(3);
  const reasons = ["more_problems", "distracted", "late_start"] as const;
  const done = state.missions.filter((m) => m.completed).length;

  return (
    <Stack>
      <div className="nuvia-page-heading">
        <Text size="xs" muted>NOTICE</Text>
        <Text as="h2" size="xl" bold>계획과 실제를 비교해보기</Text>
        <Text size="sm" muted>잘했는지 못했는지보다, 예상과 실제가 어떻게 달랐는지를 확인해요.</Text>
      </div>
      {state.missions.map((m) => <MissionCard key={m.mission_id} vm={VM.toMissionVM(m, pack)} />)}
      {/* 성공/실패 라벨 없음 — Gap만 (§9) */}
      <Surface muted>
        <Text>{t(pack, "planreality.gap", { planned: state.missions.length, done, gap: state.missions.length - done })}</Text>
      </Surface>
      <Surface>
        <Stack gap={8}>
          {/* v1.3 §14.1 self_rating_norm 입력 — 5점 척도(1~5), 연속 슬라이더 아님 */}
          <Text size="sm" muted>오늘 얼마나 했다고 느끼나요?</Text>
          <Stack row gap={6}>
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <Button key={n} testId={`self-rating-${n}`} variant={rating === n ? "primary" : "secondary"}
                onClick={() => setRating(n)}>{n}</Button>
            ))}
          </Stack>
          <Text size="sm" muted>{t(pack, "reflect.why")}</Text>
          <Stack row gap={6} wrap>
            {reasons.map((r) => (
              <Button key={r} testId={`reflect-${r}`}
                onClick={() => dispatch({ type: "SUBMIT_REFLECTION", reason: r, selfRating: rating })}>
                {t(pack, `reflect.reason.${r}`)}
              </Button>
            ))}
          </Stack>
        </Stack>
      </Surface>
    </Stack>
  );
};

// ── DISCOVER / UNLOCK ───────────────────────────────────────────────────
export const DiscoverScreen: React.FC<ScreenProps> = ({ state, dispatch }) => {
  const pack = VM.packFor(state.ctx);
  const pending = state.pendingDiscovery;
  return (
    <Stack>
      <div className="nuvia-page-heading">
        <Text size="xs" muted>DISCOVER</Text>
        <Text as="h2" size="xl" bold>나에 대해 하나 더 알게 됐어요</Text>
        <Text size="sm" muted>충분한 기록이 모이면, 반복해서 나타나는 나의 패턴을 발견으로 저장할 수 있어요.</Text>
      </div>
      {pending ? (() => {
        const gate = runDiscoveryGates(pending, state.ctx);
        const statement = gate.ok ? gate.statement : t(pack, "discovery.save");
        return (
          <div className="nuvia-discovery-unlock">
            <Surface>
              <Stack gap={10}>
                <Stack row gap={8} align="center">
                  <span className="nuvia-unlock-icon" aria-hidden="true">✦</span>
                  <div>
                    <Text size="xs" muted>NEW DISCOVERY</Text>
                    <Text bold size="lg">나에 대한 새로운 발견이 열렸어요</Text>
                  </div>
                </Stack>
                <Text>{statement}</Text>
                <Text size="xs" muted>점수가 아니라, 실제 생활 기록에서 반복해서 보인 패턴이에요.</Text>
                <Stack row gap={8}>
                  <Button variant="primary" testId="save-discovery" onClick={() => dispatch({ type: "SAVE_DISCOVERY" })}>내 발견으로 저장</Button>
                  <Button variant="quiet" testId="skip-discovery" onClick={() => dispatch({ type: "SKIP_DISCOVERY" })}>다음에</Button>
                </Stack>
              </Stack>
            </Surface>
          </div>
        );
      })() : (
        <Surface muted>
          <Stack gap={8}>
            {/* 최소관찰수 미충족 → Anticipation 문구로 전환 (§1.4) */}
            <Text size="sm" muted>{t(pack, "discovery.pending", { n: 2 })}</Text>
            <Button testId="skip-discovery" onClick={() => dispatch({ type: "SKIP_DISCOVERY" })}>계속</Button>
          </Stack>
        </Surface>
      )}
    </Stack>
  );
};

export const GrowScreen: React.FC<ScreenProps> = ({ state, dispatch }) => {
  const pack = VM.packFor(state.ctx);
  const profile = getProfile(state.ctx.age_ux_band);
  const fade = selectFadeOffer(state);
  return (
    <Stack>
      <div className="nuvia-page-heading">
        <Text size="xs" muted>GROW</Text>
        <Text as="h2" size="xl" bold>도움을 조금 덜 받아도 될까?</Text>
        <Text size="sm" muted>성장은 더 높은 점수가 아니라, 내가 직접 선택하고 조절하는 부분이 늘어나는 과정이에요.</Text>
      </div>
      <RewardAnimation reward={{ kind: "record", message: "오늘 기록이 저장됐어요" }}
        motionLevel={profile.motionLevel} intensity={profile.gameIntensity} />
      <LevelJourney vm={VM.toLevelJourneyVM(state.ctx, pack)} compact />
      {fade.canPropose ? (
        <Surface>
          <Stack gap={8}>
            <Text>{t(pack, "scaffold.fade_offer")}</Text>
            <Stack row gap={8}>
              <Button variant="primary" testId="accept-fade" onClick={() => dispatch({ type: "ACCEPT_FADE" })}>좋아요</Button>
              <Button variant="quiet" testId="skip-fade" onClick={() => dispatch({ type: "SKIP_FADE" })}>아직은요</Button>
            </Stack>
          </Stack>
        </Surface>
      ) : (
        <Button testId="skip-fade" onClick={() => dispatch({ type: "SKIP_FADE" })}>계속</Button>
      )}
    </Stack>
  );
};

export const ReturnScreen: React.FC<ScreenProps> = ({ state, dispatch }) => {
  const pack = VM.packFor(state.ctx);
  if (state.daily.phase === "GROWN") {
    return <Button variant="primary" testId="preview-next" onClick={() => dispatch({ type: "PREVIEW_NEXT" })}>다음 보기</Button>;
  }
  const patterns = selectPatternProfile(state);
  const tomorrowTitle = patterns.primary ? PATTERN_QUESTIONS[patterns.primary] : "내일은 내가 직접 고른 방법 하나를 다시 시험해봐요.";
  const latestStrategy = state.strategies[0];
  return (
    <Stack>
      <div className="nuvia-tomorrow-preview">
        <Surface>
          <Stack gap={10}>
            <Stack row gap={8} align="center">
              <span className="nuvia-tomorrow-icon" aria-hidden="true">→</span>
              <div><Text size="xs" muted>TOMORROW PREVIEW</Text><Text bold size="lg">{t(pack, "today.next_preview")}</Text></div>
            </Stack>
            <Text>{tomorrowTitle}</Text>
            <div className="nuvia-preview-chips">
              <span>{t(pack, "boss.start")}</span>
              {latestStrategy && <span>{STRATEGY_LABELS[latestStrategy.strategy_type]} 다시 시험</span>}
              <span>오늘 기록은 그대로 이어져요</span>
            </div>
            <Text size="xs" muted>내일의 목표는 더 많이 하는 것이 아니라, 오늘 알게 된 방법을 한 번 더 내 힘으로 써보는 거예요.</Text>
          </Stack>
        </Surface>
      </div>
      <Button testId="end-day" onClick={() => dispatch({ type: "END_DAY" })}>내일 이어서 해볼게요</Button>
    </Stack>
  );
};

// ── 08 RESET ────────────────────────────────────────────────────────────
export const ResetScreen: React.FC<ScreenProps> = ({ state, dispatch }) => {
  const pack = VM.packFor(state.ctx);
  const created = state.daily.phase === "RESET_CREATED";
  return (
    <Stack>
      <Surface>
        <Stack gap={8}>
          <div className="rescue-heading"><ToolIcon kind="recover" size={36}/><div><Text size="xs" muted>RESCUE MISSION</Text><Text bold>{t(pack, "reset.title")}</Text></div></div>
          {!created ? (
            <Stack row gap={8}>
              <Button variant="primary" testId="create-reset"
                onClick={() => dispatch({ type: "CREATE_RESET", reason: "plan_too_big" })}>{t(pack, "reset.replan")}</Button>
              <Button variant="quiet" testId="end-day" onClick={() => dispatch({ type: "END_DAY" })}>{t(pack, "reset.stop_today")}</Button>
            </Stack>
          ) : (
            <Stack gap={8}>
              <Text size="sm" muted>{t(pack, "reset.rewarded")}</Text>
              <Button variant="primary" testId="revise-plan" onClick={() => dispatch({ type: "REVISE_PLAN" })}>다시 시작</Button>
            </Stack>
          )}
        </Stack>
      </Surface>
    </Stack>
  );
};

// ── 09/10 WEEK ──────────────────────────────────────────────────────────
export const WeekScreen: React.FC<ScreenProps> = ({ state }) => {
  const pack = VM.packFor(state.ctx);
  const profile = getProfile(state.ctx.age_ux_band);
  const counts: Partial<Record<MetricKey, number>> = {};
  for (const o of state.observations) counts[o.metric] = (counts[o.metric] ?? 0) + 1;
  return (
    <Stack>
      <div className="nuvia-page-heading">
        <Text size="xs" muted>THIS WEEK</Text>
        <Text as="h2" size="xl" bold>{t(pack, "nav.week")}</Text>
        <Text size="sm" muted>이번 주에는 한 가지 패턴만 골라 반복해서 시험해봐요. 목표를 못 채운 날도 기록은 다음 전략을 고르는 근거가 됩니다.</Text>
      </div>
      <WeeklyBossCard vm={VM.toWeeklyBossVM(state.weekly, pack, counts)} presentation={profile.bossPresentation} />
      <Surface>
        <Stack gap={10}>
          <Stack row gap={8} align="center">
            <Text size="xs" muted>WEEKLY CHALLENGE BOARD</Text>
            <span className="nuvia-board-count">기록 {Math.min(state.weekly.records.length, 5)}/5</span>
          </Stack>
          <div className="nuvia-week-board" aria-label="이번 주 도전 기록">
            {Array.from({ length: 5 }).map((_, i) => {
              const rec = state.weekly.records[i];
              return <div key={i} className={`nuvia-week-slot ${rec ? "is-recorded" : ""}`}>
                <span>{rec ? "✓" : i + 1}</span>
                <small>{rec ? rec.date.slice(5) : "다음"}</small>
              </div>;
            })}
          </div>
          <Text size="xs" muted>완벽한 성공판이 아니라, 이번 주에 실제로 시험해본 횟수를 모으는 도전판이에요.</Text>
        </Stack>
      </Surface>
      {state.weekly.records.length > 0 && (
        <Surface>
          <Stack gap={10}>
            <Text size="xs" muted>WEEKLY RECORD</Text>
            <div className="nuvia-week-bars">
              {state.weekly.records.map((r) => (
                <div className="nuvia-week-bar-wrap" key={r.date}>
                  <div className="nuvia-week-bar-track"><div className="nuvia-week-bar-fill" style={{ height: `${Math.max(12, Math.min(100, r.value * 100))}%` }} /></div>
                  <Text size="xs" muted>{r.date.slice(5)}</Text>
                </div>
              ))}
            </div>
          </Stack>
        </Surface>
      )}
      {state.strategies.length > 0 && (
        <Surface muted>
          <Stack gap={6}>
            <Text size="xs" muted>이번 주 전략 실험</Text>
            <Text bold>{STRATEGY_LABELS[state.strategies[0].strategy_type]}</Text>
            <Text size="sm" muted>이번 주 실제 과제에서 한 번만 의식적으로 사용해보고, 맞는지 확인해보세요.</Text>
          </Stack>
        </Surface>
      )}
    </Stack>
  );
};

// ── 11 GROWTH ───────────────────────────────────────────────────────────
export const GrowthScreen: React.FC<ScreenProps> = ({ state }) => {
  const pack = VM.packFor(state.ctx);
  const profile = getProfile(state.ctx.age_ux_band);
  const metrics = selectMetrics(state);
  const narrative = selectNarrative(state);
  return (
    <Stack>
      <div className="nuvia-page-heading">
        <Text size="xs" muted>MY GROWTH</Text>
        <Text as="h2" size="xl" bold>{t(pack, "nav.growth")}</Text>
        <Text size="sm" muted>‘도움을 받음’에서 ‘내가 먼저 사용함’까지, 자기주도성이 어떻게 바뀌는지 확인해요.</Text>
      </div>
      <Surface>
        <Stack gap={10}>
          <Text size="xs" muted>SELF-DIRECTION JOURNEY</Text>
          <div className="nuvia-ownership-journey">
            {(["DISCOVER", "STRATEGY", "APPLY", "TRANSFER", "OWN"] as const).map((x, i) => {
              const reached = x === "DISCOVER" ? state.discoveries.length > 0 : x === "STRATEGY" ? state.strategies.length > 0 : x === "APPLY" ? state.strategyUses.length > 0 : x === "TRANSFER" ? state.strategyUses.some((u) => u.context_kind === "different_type") : state.strategyUses.some((u) => u.self_initiated);
              return <div className={`nuvia-ownership-step ${reached ? "is-reached" : ""}`} key={x}><span>{i + 1}</span><strong>{x}</strong></div>;
            })}
          </div>
        </Stack>
      </Surface>

      {/* Self-Direction Narrative — 점수 없음 (§22) */}
      <Surface>
        <Stack gap={6}>
          <Text size="sm" muted>{t(pack, "growth.self_direction")}</Text>
          {narrative.length === 0
            ? <Text size="sm" muted>아직 기록이 쌓이는 중이에요.</Text>
            : narrative.map((n, i) => <Text key={i} size="sm">· {n}</Text>)}
        </Stack>
      </Surface>

      {profile.showGrowthMap && <GrowthMap vm={VM.toGrowthMapVM(metrics, pack)} />}

      <Stack gap={8}>
        {metrics.map((m) => (
          <Surface key={m.key} muted>
            <Stack gap={6}>
              <Text size="sm">{m.key}</Text>
              <ProgressIndicator vm={VM.toProgressVM(m, pack)} />
            </Stack>
          </Surface>
        ))}
      </Stack>

      <Surface muted><Text size="xs" muted>{t(pack, "growth.epoch_boundary")}</Text></Surface>
      <LevelJourney vm={VM.toLevelJourneyVM(state.ctx, pack)} />
    </Stack>
  );
};

// ── 13 MY DISCOVERIES ───────────────────────────────────────────────────
export const DiscoveriesScreen: React.FC<ScreenProps> = ({ state, dispatch }) => {
  const pack = VM.packFor(state.ctx);
  const [target, setTarget] = React.useState<string | null>(null);
  const d = state.discoveries.find((x) => x.discovery_id === target);
  return (
    <Stack>
      <div className="nuvia-page-heading">
        <Text size="xs" muted>NOTICE ME</Text>
        <Text as="h2" size="xl" bold>MY DISCOVERIES</Text>
        <Text size="sm" muted>검사 결과를 다시 판정하는 것이 아니라, 실제 생활에서 반복해서 나타난 나의 패턴을 기록해요.</Text>
      </div>
      {state.discoveries.length === 0 && <Text size="sm" muted>{t(pack, "discovery.pending", { n: 3 })}</Text>}
      {state.discoveries.map((x) => (
        <DiscoveryCard key={x.discovery_id} vm={VM.toDiscoveryVM(x, pack)}
          onMakeStrategy={(id) => setTarget(id)} makeStrategyLabel={t(pack, "discovery.make_strategy")} />
      ))}
      {d && (
        <Surface>
          <Stack gap={8}>
            <Text size="sm" muted>어떤 전략으로 만들까요?</Text>
            <Stack row gap={6} wrap>
              {candidateStrategiesFor(d).map((st) => (
                <Button key={st} testId={`save-strategy-${st}`}
                  onClick={() => { dispatch({ type: "SAVE_STRATEGY", strategyType: st, sourceDiscoveryId: d.discovery_id }); setTarget(null); }}>
                  {STRATEGY_LABELS[st]}
                </Button>
              ))}
            </Stack>
          </Stack>
        </Surface>
      )}
    </Stack>
  );
};

// ── 14 MY STRATEGIES ────────────────────────────────────────────────────
export const StrategiesScreen: React.FC<ScreenProps> = ({ state, dispatch }) => {
  const pack = VM.packFor(state.ctx);
  const groups = [
    { status: "fits_me" as const, label: t(pack, "strategy.status.fits_me") },
    { status: "trying" as const, label: t(pack, "strategy.status.trying") },
    { status: "retest" as const, label: t(pack, "strategy.status.retest") },
  ];
  return (
    <Stack>
      <div className="nuvia-page-heading">
        <Text size="xs" muted>DO IT MYSELF</Text>
        <Text as="h2" size="xl" bold>MY STRATEGIES</Text>
        <Text size="sm" muted>발견한 방법을 실제 과제에 적용하고, 다른 상황으로 옮기고, 결국 내가 먼저 꺼내 쓰는 단계까지 기록합니다.</Text>
      </div>
      <div className="nuvia-stage-legend">
        {(["STRATEGY", "APPLY", "TRANSFER", "OWN"] as const).map((x) => <span key={x}>{x}</span>)}
      </div>
      <Surface>
        <Stack gap={10}>
          <Stack row gap={8} align="center">
            <Text size="xs" muted>STRATEGY COLLECTION</Text>
            <span className="nuvia-collection-count">{state.strategies.length}개</span>
          </Stack>
          {state.strategies.length === 0 ? (
            <Text size="sm" muted>아직 모은 전략이 없어요. Discovery가 쌓이면 나에게 맞는 방법을 하나씩 저장할 수 있어요.</Text>
          ) : (
            <div className="nuvia-collection-grid">
              {state.strategies.map((s) => {
                const stage = selectStrategyOwnershipStage(state, s.strategy_id);
                return <div className={`nuvia-collection-item stage-${stage.toLowerCase()}`} key={s.strategy_id}>
                  <strong>{STRATEGY_LABELS[s.strategy_type]}</strong>
                  <span>{OWNERSHIP_STAGE_LABEL[stage]}</span>
                </div>;
              })}
            </div>
          )}
        </Stack>
      </Surface>
      {state.strategyUses.some((u) => u.self_initiated) && (
        <div className="nuvia-own-celebration">
          <RewardAnimation
            reward={{ kind: "strategy", message: "이제 이 전략을 NUVIA가 먼저 말하지 않아도 스스로 꺼내 쓰고 있어요. 내 전략이 되었어요!" }}
            motionLevel={getProfile(state.ctx.age_ux_band).motionLevel}
            intensity={getProfile(state.ctx.age_ux_band).gameIntensity}
          />
        </div>
      )}
      {groups.map((g) => {
        const items = state.strategies.filter((s) => s.status === g.status);
        if (items.length === 0) return null;
        return (
          <Stack key={g.status} gap={8}>
            <Text size="sm" muted>{g.label}</Text>
            {items.map((s) => {
              const stage = selectStrategyOwnershipStage(state, s.strategy_id);
              return (
                <Surface key={s.strategy_id}>
                  <Stack gap={8}>
                    <StrategyCard vm={VM.toStrategyVM(s, pack)}
                      onRetry={(id) => dispatch({ type: "APPLY_STRATEGY", strategyId: id })} />
                    <Text size="xs" muted>성장 단계 · {OWNERSHIP_STAGE_LABEL[stage]}</Text>
                    <Stack row gap={6} wrap>
                      <Button testId={`apply-${s.strategy_id}`} onClick={() => dispatch({ type: "RECORD_STRATEGY_USE", strategyId: s.strategy_id, contextLabel: "실제 과제", contextKind: "same_type", selfInitiated: false })}>실제 과제에 써봤어요</Button>
                      <Button testId={`transfer-${s.strategy_id}`} onClick={() => dispatch({ type: "RECORD_STRATEGY_USE", strategyId: s.strategy_id, contextLabel: "다른 상황", contextKind: "different_type", selfInitiated: false })}>다른 상황에도 써봤어요</Button>
                      <Button testId={`own-${s.strategy_id}`} variant="primary" onClick={() => dispatch({ type: "RECORD_STRATEGY_USE", strategyId: s.strategy_id, contextLabel: "스스로 선택한 상황", contextKind: "different_type", selfInitiated: true })}>내가 먼저 꺼내 썼어요</Button>
                    </Stack>
                  </Stack>
                </Surface>
              );
            })}
          </Stack>
        );
      })}
    </Stack>
  );
};

// ── 12 ME ───────────────────────────────────────────────────────────────
export const MeScreen: React.FC<ScreenProps> = ({ state, dispatch }) => {
  const pack = VM.packFor(state.ctx);
  const patterns = selectPatternProfile(state);
  return (
    <Stack>
      <div className="nuvia-page-heading">
        <Text size="xs" muted>ME</Text>
        <Text as="h2" size="xl" bold>{t(pack, "nav.me")}</Text>
        <Text size="sm" muted>나는 어떤 방식으로 계획하고 시작하고 집중하고 다시 돌아오는지, 내 자기관리 패턴을 한눈에 봅니다.</Text>
      </div>
      <Surface>
        <Stack gap={8}>
          <Text size="xs" muted>MY SELF-MANAGEMENT PATTERN</Text>
          {patterns.source === "neutral" ? (
            <>
              <Text bold>{t(pack, "me.neutral_state")}</Text>
              <Text size="sm" muted>{t(pack, "me.neutral_subtitle")}</Text>
            </>
          ) : (
            <>
              <Text bold>{PATTERN_LABELS[patterns.primary!]}</Text>
              <Text size="sm" muted>{PATTERN_QUESTIONS[patterns.primary!]}</Text>
              {patterns.secondary && <Text size="sm">다음으로 함께 볼 영역 · {PATTERN_LABELS[patterns.secondary]}</Text>}
              {patterns.strength_levers.slice(0, 2).map((x) => <Text key={x} size="xs" muted>강점 활용 · {x}</Text>)}
              <Text size="xs" muted>이 패턴은 진단명이 아니라 현재 전략을 고르는 지원 기준입니다.</Text>
            </>
          )}
        </Stack>
      </Surface>
      <Surface muted>
        <Stack gap={8}>
          <Text size="xs" muted>6 SELF-MANAGEMENT PATTERNS</Text>
          <div className="nuvia-pattern-grid">
            {(["PLAN", "START", "FOCUS", "TIME", "RECOVER", "CHECK"] as const).map((p) => {
              const active = patterns.primary === p;
              const secondary = patterns.secondary === p;
              return <div key={p} className={`nuvia-pattern-cell ${active ? "is-primary" : secondary ? "is-secondary" : ""}`}><strong>{PATTERN_LABELS[p]}</strong><span>{active ? "먼저 보기" : secondary ? "함께 보기" : "관찰"}</span></div>;
            })}
          </div>
        </Stack>
      </Surface>
      <Surface>
        <Stack gap={8}>
          {/* v1.3 §12.3 — Complexity(L1~L6)는 내부 시스템 값이며 학생에게
              등급으로 노출하지 않는다. Level만 표시한다. */}
          <Text size="sm">Level {state.ctx.level}</Text>
          {/* 도움 비율 숫자는 노출하지 않는다 (§14) — 상태명만 */}
          <Text size="sm" muted>도움 수준: {state.ctx.scaffold_state}</Text>
          <Button testId="request-help" onClick={() => dispatch({ type: "REQUEST_MORE_HELP" })}>
            {t(pack, "scaffold.request_more")}
          </Button>
        </Stack>
      </Surface>
      <Surface muted>
        <Stack gap={6}>
          <Text size="sm" bold>공개 범위</Text>
          <Text size="xs" muted>부모: 성장 추세와 지원 방법만. 중단시각·사적 메모·상세 실패로그는 비공개.</Text>
          <Text size="xs" muted>교사: 교육지원 요약과 집계. 5명 미만 구간은 표시하지 않음.</Text>
        </Stack>
      </Surface>
    </Stack>
  );
};
