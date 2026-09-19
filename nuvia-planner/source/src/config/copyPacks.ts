/**
 * COPY PACKS — Age Band별 문구 사전
 * ✅ LOVABLE MAY EDIT — 문구만. 키는 유지할 것.
 *
 * 로직은 copy_key만 다루고 문구를 알지 못한다.
 */
export type CopyKey = string;
export type CopyPackId = "ko-A" | "ko-B" | "ko-C" | "ko-D";

type Pack = Record<CopyKey, string>;

const BASE: Pack = {
  "nav.today": "오늘", "nav.week": "이번 주", "nav.growth": "성장", "nav.me": "나",

  "module.time_sense": "예상 시간 맞히기",
  "module.priority": "순서 정하기",
  "module.break_it": "과제 나누기",
  "module.focus_mission": "집중 유지하기",
  "module.start_now": "바로 시작하기",
  "module.plan_vs_reality": "계획과 실제 비교",
  "module.reset": "다시 짜기",

  "today.cta.start": "시작하기",
  "today.self_plan": "오늘은 내가 직접 정할게요",
  "today.choose_title": "오늘 할 도전을 골라보세요",
  "today.next_preview": "내일 열리는 도전",
  "today.neutral_focus": "아직 우선 지원영역이 확인되지 않았어요",
  "today.neutral_subtitle": "오늘은 직접 골라보세요",

  "plan.predict": "얼마나 걸릴까요?",
  "plan.order_reason": "왜 이 순서인가요?",
  "plan.commit": "계획 확정",

  "focus.choose_length": "집중 시간을 골라주세요",
  "focus.pause": "잠시 멈춤",
  "focus.resume": "다시 시작",
  "focus.back_ok": "다시 올 수 있어요",

  "gap.longer": "예상보다 {n}분 더 걸렸어요",
  "gap.shorter": "예상보다 {n}분 빨랐어요",
  "gap.match": "예상과 거의 같았어요",
  "planreality.gap": "계획 {planned}개 중 {done}개, 차이 {gap}개",

  "reflect.why": "왜 그랬을까요?",
  "reflect.reason.more_problems": "생각보다 문제가 많았다",
  "reflect.reason.distracted": "중간에 다른 걸 했다",
  "reflect.reason.late_start": "시작이 늦었다",

  "discovery.save": "이 패턴, 저장할까요?",
  "discovery.pending": "{n}번 더 관찰되면 발견으로 저장돼요",
  "discovery.make_strategy": "이걸로 전략 만들기",
  "discovery.weakening": "최근 근거가 약해졌어요",

  "strategy.status.fits_me": "내게 잘 맞았던 전략",
  "strategy.status.trying": "시험 중",
  "strategy.status.retest": "다시 시험해볼 전략",
  "strategy.use": "내 전략 쓰기",
  "strategy.retry": "오늘 다시 써보기",

  "boss.time": "예상 시간 오차 줄이기",
  "boss.start": "5분 안에 시작하기",
  "boss.focus": "선택한 집중 구간 유지",
  "boss.recovery": "Reset 후 다시 실행",
  "boss.overplanning": "계획량 현실화",
  "boss.observation_week": "이번 주는 관찰 주간이에요",
  "boss.unlock_hint": "{metric} 기록 {n}번 더",
  "boss.week_record": "이번 주 도전 기록",

  "reset.title": "계획이 달라졌네요. 새로운 데이터예요.",
  "reset.replan": "다시 짜기",
  "reset.stop_today": "오늘은 여기까지",
  "reset.rewarded": "다시 돌아온 것이 기록됐어요",

  "growth.self_direction": "내가 스스로 하게 된 것",
  "growth.recent_pattern": "최근 4주 행동 패턴",
  "growth.epoch_boundary": "여기서 검사가 새로 시작됐어요",
  "growth.insufficient": "{n}번 더 기록되면 볼 수 있어요",

  "scaffold.fade_offer": "다음부터는 직접 정해볼까요?",
  "scaffold.request_more": "도움을 조금 더 받을래요",
  "scaffold.re_support": "요즘 바쁜 것 같아요. 선택지를 다시 켤까요?",

  "level.journey": "성장 여정",

  "me.neutral_state": "아직 관찰 중이에요",
  "me.neutral_subtitle": "충분한 근거가 모이면 나에게 맞는 패턴을 보여드릴게요",
};

const OVERRIDES: Record<CopyPackId, Pack> = {
  "ko-A": {
    "today.choose_title": "오늘의 퀘스트가 열렸어요!",
    "today.cta.start": "바로 시작!",
    "plan.predict": "얼마나 걸릴 것 같아?",
    "gap.longer": "생각보다 {n}분 더 걸렸네!",
    "discovery.save": "새로운 발견을 얻었어요! 저장할까요?",
    "reset.title": "괜찮아요. 새로운 정보예요.",
    "reset.rewarded": "다시 돌아왔어요! 멋져요.",
    "scaffold.fade_offer": "이제 네가 직접 정해볼래?",
    "strategy.use": "내 스킬 카드 쓰기",
  },
  "ko-B": {
    "today.choose_title": "오늘의 챌린지 3개",
    "plan.predict": "예상 시간은?",
    "gap.longer": "예상보다 +{n}분",
    "discovery.save": "발견 1개 저장할까요?",
    "reset.title": "계획이 달라졌네요. 다시 짜볼까요?",
    "reset.rewarded": "복귀 기록이 저장됐어요.",
  },
  "ko-C": {
    "today.choose_title": "오늘 도전 항목",
    "plan.predict": "예상 소요시간",
    "gap.longer": "예측 오차 +{n}분",
    "discovery.save": "패턴 1건을 저장하시겠어요?",
    "reset.title": "계획과 실제가 달랐습니다. 재설계하시겠어요?",
    "reset.rewarded": "복귀가 기록되었습니다.",
    "scaffold.fade_offer": "순서 제안을 끌까요?",
    "level.journey": "단계",
  },
  "ko-D": {
    "today.choose_title": "오늘의 실험 항목",
    "plan.predict": "예상 소요시간 (분)",
    "gap.longer": "예측 오차 +{n}분",
    "discovery.save": "관찰 패턴 1건 저장",
    "reset.title": "계획 편차가 발생했습니다. 재설계로 진행합니다.",
    "reset.rewarded": "Recovery 기록 저장.",
    "scaffold.fade_offer": "순서 제안 비활성화",
    "boss.week_record": "이번 주 기록",
    "level.journey": "단계",
    "strategy.use": "Strategy Library에서 선택",
  },
};

export function t(pack: CopyPackId, key: CopyKey, params?: Record<string, string | number>): string {
  const raw = OVERRIDES[pack]?.[key] ?? BASE[key] ?? key;
  return params ? raw.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`)) : raw;
}

export function allKeys(): CopyKey[] { return Object.keys(BASE); }
