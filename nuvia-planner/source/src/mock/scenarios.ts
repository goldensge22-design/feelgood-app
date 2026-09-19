/**
 * TEST SCENARIO 카탈로그 — PHASE 1 §17의 A~L 그룹을 코드로 옮긴 것.
 * 각 항목은 tests/ 의 실제 테스트와 id로 대응한다.
 */
export interface ScenarioSpec {
  id: string;
  group: string;
  title: string;
  expect: string;
  /** 위반 시 어떤 FROZEN 조항을 어기는가 */
  guards: string;
  automated: boolean;
}

export const SCENARIOS: ScenarioSpec[] = [
  { id: "A-01", group: "Instant Start", title: "신규 진입 30초 내 첫 Challenge", expect: "mission_started까지 30초 이내", guards: "§35", automated: true },
  { id: "A-03", group: "Instant Start", title: "Challenge 3개 중 1개 선택", expect: "student_choice_made에 options_shown 기록", guards: "§8", automated: true },
  { id: "A-04", group: "Instant Start", title: "직접 계획 경로", expect: "AI 후보 없이 진입 가능", guards: "§7", automated: true },
  { id: "A-05", group: "Variation", title: "동일 모듈 3회 후 4회차", expect: "다른 유형 최소 1개 포함", guards: "§19", automated: true },
  { id: "A-06", group: "Personalization", title: "검사 미보유 사용자", expect: "강점 추정 없음, 프로파일 비의존 후보", guards: "§19 / CORE §5", automated: true },

  { id: "B-01", group: "Module", title: "TIME SENSE Gap", expect: "Gap +14 표시, 등급 없음", guards: "§9", automated: true },
  { id: "B-03", group: "Module", title: "BREAK IT 분해", expect: "Growth 지표로 승격되지 않음", guards: "§21 §34", automated: true },
  { id: "B-05", group: "Module", title: "Focus 길이 임의 값", expect: "15/25/40 외 거부", guards: "§9", automated: true },
  { id: "B-07", group: "Module", title: "PLAN vs REALITY", expect: "Gap 표현, 성공/실패 라벨 없음", guards: "§9", automated: true },
  { id: "B-08", group: "Module", title: "RESET 후 재시작", expect: "ABANDONED 다음이 RESET_OFFERED", guards: "§17", automated: true },

  { id: "C-01", group: "Discovery", title: "관찰 4회에서 생성 시도", expect: "GATE 2 차단, remaining=1", guards: "§11", automated: true },
  { id: "C-02", group: "Discovery", title: "관찰 5회 충족", expect: "학생 저장 시에만 discovery_saved", guards: "§11", automated: true },
  { id: "C-03", group: "Discovery", title: "epoch 경계 근거", expect: "GATE 3 차단", guards: "CORE §5", automated: true },
  { id: "C-05", group: "Discovery", title: "성격 해석 문장", expect: "GATE 4 차단", guards: "§34", automated: true },
  { id: "C-06", group: "Discovery", title: "근거 약화", expect: "삭제 아닌 weakening 전환", guards: "§12", automated: true },

  { id: "D-01", group: "Strategy", title: "Discovery → 전략", expect: "source_discovery_id 기록", guards: "§12", automated: true },
  { id: "D-02", group: "Strategy", title: "시스템 자동 적용", expect: "예외 발생", guards: "§12", automated: true },
  { id: "D-03", group: "Strategy", title: "근거 축적 전이", expect: "trying → fits_me", guards: "§12", automated: true },
  { id: "D-04", group: "Strategy", title: "근거 약화", expect: "retest, '다시 시험해볼 전략'", guards: "§12", automated: true },
  { id: "D-06", group: "Strategy", title: "효과 없던 전략", expect: "라이브러리 잔존", guards: "§17", automated: true },

  { id: "E-01", group: "Scaffold", title: "C1~C4 충족", expect: "제안만, 자동 전이 없음", guards: "§14", automated: true },
  { id: "E-02", group: "Scaffold", title: "epoch 3일차", expect: "C4 미충족으로 제안 없음", guards: "§20", automated: true },
  { id: "E-04", group: "Scaffold", title: "학생 도움 요청", expect: "즉시 RE-SUPPORT", guards: "§14", automated: true },
  { id: "E-06", group: "Scaffold", title: "도움 비율 노출", expect: "숫자 미노출 가드 발동", guards: "§14", automated: true },
  { id: "E-07", group: "Level", title: "Level 하향 시도", expect: "불가", guards: "§13", automated: true },

  { id: "F-01", group: "AI Coach", title: "AI 최종 확정", expect: "예외 발생", guards: "CORE §8 §18", automated: true },
  { id: "F-04", group: "AI Coach", title: "자기주도성 점수 문장", expect: "GATE 4 차단", guards: "§22", automated: true },
  { id: "F-05", group: "AI Coach", title: "검사점수 인과 표현", expect: "GATE 4 차단", guards: "CORE §11", automated: true },
  { id: "F-06", group: "AI Coach", title: "DO 단계 중 발화", expect: "GATE 6 차단", guards: "§18", automated: true },
  { id: "F-08", group: "AI Coach", title: "Autonomy Ratio 노출", expect: "예외 발생", guards: "§34", automated: true },

  { id: "G-01", group: "Weekly Boss", title: "관찰수 미달", expect: "Boss 미생성, 관찰 주간", guards: "§16", automated: true },
  { id: "G-02", group: "Weekly Boss", title: "목표 미달", expect: "record_kept, 실패 라벨 없음", guards: "§16", automated: true },
  { id: "G-03", group: "Weekly Boss", title: "2주 연속 미달", expect: "target 완화 적용", guards: "§16", automated: true },

  { id: "H-05", group: "Age UX", title: "Band 변경", expect: "데이터·Level 불변, 문구만 변경", guards: "§5 §34", automated: true },
  { id: "H-06", group: "Age UX", title: "4 Band 동일 이벤트", expect: "payload 동일", guards: "§34", automated: true },

  { id: "I-02", group: "Retention", title: "미사용 후 복귀", expect: "streak/손실 표현 없음", guards: "§17 §30", automated: true },
  { id: "I-06", group: "Retention", title: "리더보드", expect: "코드에 존재하지 않음", guards: "§30", automated: true },

  { id: "J-06", group: "Privacy", title: "MY NUVIA Adapter", expect: "raw value 미전달", guards: "§29", automated: true },
  { id: "J-08", group: "Privacy", title: "Unified Total Score", expect: "호출 시 예외", guards: "§34", automated: true },

  { id: "L-01", group: "Acceptance", title: "30초 내 첫 Challenge", expect: "A-01 통과", guards: "§35", automated: true },
  { id: "L-02", group: "Acceptance", title: "A 재미 / B 유치하지 않음", expect: "사용자 테스트 필요", guards: "§33 §35", automated: false },
  { id: "L-03", group: "Acceptance", title: "C/D가 Todo앱이 아님", expect: "사용자 테스트 필요", guards: "§35", automated: false },
];

export const AUTOMATED_SCENARIOS = SCENARIOS.filter((s) => s.automated);
export const MANUAL_SCENARIOS = SCENARIOS.filter((s) => !s.automated);
