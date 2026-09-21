# W24-C2 계획 재검토 — 격리 데모 후보

상태: **DRAFT CANDIDATE / 사용자 화면·문항 검토 대기**. 정식 W24 계약, 동결 Excel, CORE를 승격·수정하지 않는다.

## 참조 및 보호

- 루트 `AGENTS.md`, `docs/i18n/README.md`, `i18n/programs.json`, `scripts/check-i18n.mjs`, `docs/DEVELOPMENT_BASELINE.md`를 직접 참조한다. 공통 규칙을 복제하지 않는다.
- HISTORY 마스터와 QUESTION_CONTENT_ALIGNMENT_RULE / STORYBOOK_PAGE_7_8_DISTINCTION_RULE / COMPARISON_CONTRACT v1.1은 `../../nuvia-history-w24/outputs/NUVIA_HISTORY_MASTER_RULES_v1.1/`을 참조한다.
- 수정 전 소스 HEAD: `e1231bfed4c47b2265cef4fda5e515478ad744c1`, 작업 트리 clean.
- 기존 데모는 `index.html`, 새 실험은 `reconsider.html`로 opt-in한다. 별도 출력 `dist-reconsider/`와 5202 포트. 정식 W24·5192·5199와 기존 공개 루트는 변경하지 않는다.
- `nuviaHistory.planningReviewDemo.v1.{ageBand}.planning`과 결과별 보존 키를 사용한다. 기존 ageComparisonDemo.v1, 운영 기록을 읽어 변환하거나 삭제하지 않는다. 새 실행은 새 demo resultId이고 과거 결과별 원본은 남는다.

## 이번 실험에서 확정한 구현 범위

| 항목 | 중학생 | 고등학생 |
|---|---|---|
| 최초 예측 | 직접 효과 1개, 결과 공개 전 잠금 | 직접 효과·장기 가능성 각각 선택 후 잠금 |
| 방법 선택 | 목표·방법 선택 | 목표 선택, 비교할 두 방법과 각 방법의 하는 일을 나란히 확인 후 선택 |
| 결과 | 선택한 방법에 연결된 가능한 결과 | 동일. 목표에 따라 세계의 결과를 바꾸지 않음 |
| 추가 자료 | 없음 | 라틴어 인쇄본 사실과 출처, 출처 범위 안내 |
| 필수 글 | 유지/수정 이유 | 정보–결정 연결 + 방법의 한계. 두 칸 유지; 비교 단계에 제3의 필수 글을 추가하지 않음 |
| 추가 행동 | 없음 | 방법별 미확인 정보 선택 또는 직접 작성, 충분/부족/판단 어려움 선택 |
| 수정 | 다른 방법 실제 선택 후 새 결과·이유 확인 | 다른 방법 실제 선택 후 새 결과·자료·미확인 정보·글·판단 확인 |

전체 8단계와 기존 8쪽은 유지한다. 재검토는 계획 단계 안의 순차 화면이다. 책 4쪽에 계획의 글·미확인 사항을 담고, 7쪽 history와 8쪽 prediction 원문은 서로 대체하지 않는다.

## 자료와 문항 승인 경계

- 사실: `S1324-21`, Harry Ransom Center, The Gutenberg Bible. 라틴어 인쇄본이 확인된다는 사실만 재사용한다.
- URL: https://www.hrc.utexas.edu/gutenberg-bible/
- 책 접근 제한은 W24-C2 창작 가정이다. 당시 실제 공방 출입 규정으로 제시하지 않는다.
- 낭독, 공동 열람, 요약은 계획 후보이며 실행되었다고 선언하지 않는다. 결과도 조건부 가능성으로 표시한다.
- 미확인 정보는 UNKNOWN인 활동 설계 후보다. 요약 검증 항목까지 사료에서 승인됐다고 주장하지 않는다. 문항·연령 적합성은 사용자 검토 후 판단한다.
- 계획의 목표는 최초 방법 확정 뒤 고정한다. 최초 예측은 단일 원본이며 선택 당시 문구·조건·attemptId·contentVersion·lockedAt를 보존한다.

## 질문 의미 대조 — 후보, 정식 계약 ID가 아님

공통 맥락: missionId=gutenberg, conditionId/changedConditionId=gutenberg.c2, mainSubjectId=learner-planner, mainObjectId=restricted-book-access, resourceId=printed-book, changedAttribute=direct-access, sourceFactId=gutenberg.c2.latin-print(S1324-21), ageBandRuleId=high-school.demo.

| questionId | questionPurpose / timePhase | cognitiveAction / expectedResponseType | expectedAnswerMeaning / allowedAnswerIds | outputTarget |
|---|---|---|---|---|
| review.unknown.demo | planning / beforeAction | identify-needed-information / multi-select-or-text | 現 방법 실행에 확인할 정보; `UNKNOWN_IDS[method]` 또는 자유 원문 | planning.draft.unknownInfoIds/unknownText |
| review.connection.demo | planning / beforeAction | connect-information-to-decision / text | 그 정보로 결정할 계획 사항; 고정 답안 비적용 | planning.draft.connectionText |
| review.limit.demo | planning / possibleFuture | describe-insufficiency / text | 방법으로 목표를 이루기 어려울 가능성; 고정 답안 비적용 | planning.draft.limitText |
| review.fit.demo | planning / reflection | judge-goal-fit / single-choice | 현재 자료 범위에서 목표 충분성; sufficient/insufficient/undetermined | planning.draft.goalFit |
| review.decision.demo | planning / reflection | retain-or-revise-plan / action | 유지 또는 실제 다른 방법 선택; keep/revise | planning.draft.decision, revisions |

내부 저작 제외 의미(forbiddenAnswerMeanings): 미확인 정보를 실제 역사로 단정, 낭독이 이해를 보장한다고 단정, 읽기 능력·집단 수를 임의로 채움, 활동 라벨을 학생 이야기로 변환. 이 절은 내부 QA 자료이며 공개 JSON·UI·TTS·책에 배포하지 않는다.

## 완료 게이트 및 초안

고등: 미확인 정보 1개 이상 또는 공백 아닌 직접 작성 + 연결 글 + 한계 글 + 충분성 판단 + 최종 결정. 이전 방법의 필수 행동은 새 방법을 대신하지 않는다.

- revise 선택 직후는 유효한 미완성 상태다. 현재 방법과 다른 방법 선택 전에는 완료 불가.
- 수정 이력은 from/to로 보존한다. 실제 변경 여부는 두 값을 비교하며 학생 입력 플래그로 받지 않는다. 여러 수정 뒤 원래 방법으로 돌아오는 것도 각 전이가 다르면 허용한다.
- 이전 방법의 글·선택·판단은 history에 남는다. 새 방법의 입력은 별도다. 명시적 '초안으로 가져오기'로 두 글을 가져올 수 있지만, 새 방법에 맞는지 확인하고 새 방법의 미확인 정보는 다시 선택해야 한다.
- 정보·글을 편집하면 판단과 최종 결정을 무효화하고 다시 요구한다. 원문과 최초 예측을 삭제하지 않는다.
- 문자열 검사는 공백 여부만 본다. 글의 타당성, 자료 이해, 인지능력 점수는 자동 판정하지 않는다. 체크·클릭 기록도 이해의 증명으로 간주하지 않는다.

## 책의 출처

- 확인된 역사: sourceFactId와 자료 출처.
- 창작: 기존 condition/story 역할.
- 미확인 목록: 시스템 문항을 학생이 선택했다는 provenance와 '시스템 정리' 표시.
- 직접 쓴 미확인 정보·연결·한계: 학생 원문 표시, 공백·줄바꿈 보존.
- UNKNOWN은 데모 내에서 FACT로 승격하지 않는다. 비교를 미룬 경우 기존 실제 역사와 기록 없음 표시를 유지한다.

## 시간 측정 및 검토

로컬 브라우저에서 visible + focus인 구간을 단계별로 합산한다. 숨김·창 이탈·종료 공백은 제외한다. 30초 이상 heartbeat 공백은 합산하지 않는다. 최초 책 도달 시 측정을 마친다. 시간은 학습 능력·훈련 효과가 아니라 사용성 참고치이며 장치 환경 차이가 있다.

자동화 시간은 학생 소요 시간으로 사용하지 않는다. 실제 학생 대상으로 ①두 글의 차이 이해 ②이전 글 재사용 과정 ③미확인/사실 구분 ④실제 소요 시간을 별도 검토한다.

## 실행과 추출

앱 폴더에서 `node scripts/build-reconsider.mjs`, `PORT=5202 node scripts/serve.mjs dist-reconsider`.

- 정적 검토 자료: `dist-reconsider/reconsider-review.html`, `.json`, `.md`. JavaScript 실행 없이 문항을 읽을 수 있다.
- 자동 계약 테스트: `node scripts/test.mjs`.
- 브라우저 테스트: `tests/browser-reconsider.mjs` (PLAYWRIGHT_MODULE, REVIEW_BROWSER, REVIEW_URL 환경 설정 지원).
- 기존 공통 i18n FAIL 3건(ko pack/필수 키·RTL·폰트 증거)을 이번 데모가 해소한 것으로 표시하지 않는다.

기존 OPEN C-P1-01(음성 비교), C-P1-02(공통 의미 스키마), C-P2-01(전체·실기기 검수)은 유지한다. 이 데모의 로컬 필드를 정식 W24/CORE 계약으로 승격하지 않는다.
