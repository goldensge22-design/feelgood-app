# QUESTION_CONTENT_ALIGNMENT_RULE 상세 검수 — v1.1 FINAL BASELINE

규범 원본: [마스터 14장](./NUVIA_HISTORY_MASTER_RULES_v1.1.md#14-question_content_alignment_rule--필수). 본 문서는 본문을 대체하지 않는다. 구현 코드나 96조건의 새 의미 데이터를 작성한 것이 아니다.

## 필수 의미 필드 18개

| 필드 | 작성·검수 의미 |
| --- | --- |
| questionId | 문장·활동을 묶는 고유 질문 ID. 화면마다 새 뜻을 만들지 않음. |
| missionId | 승인 미션 ID, 다른 미션 참조 금지. |
| conditionId | 해당 C1/C2 고정 ID, 다른 조건 fallback 금지. |
| questionPurpose | 계획·순차·관계·주의·예측·창작·역사 비교·예측 비교 목적. |
| mainSubjectId | 질문의 행위 주체. |
| mainObjectId | 행위의 핵심 대상. |
| resourceId | 실제 질문에 쓰는 자원. 미확인 자원을 발명하지 않음. |
| changedAttribute | 변경되는 한 가지 속성. |
| timePhase | beforeAction/duringAction/immediateResult/possibleFuture/comparison/reflection 중 하나. |
| cognitiveAction | 실제 요구하는 독립 인지 행동 한 가지. |
| expectedResponseType | 단계 배열·관계 연결·직접 말/글/그림 등 조작/표현 유형. |
| expectedAnswerMeaning | 시스템이 요구하는 응답의 대상·범위. 정답/AI 채점 모델 아님. |
| allowedAnswerIds | 시스템이 제공하는 승인 응답 ID. 자유 표현의 고정 답안을 만들지 않음. |
| forbiddenAnswerMeanings | 저작 중 금지하는 자원·시점·인과 이탈. 아이 화면에 금지 문장을 노출하지 않음. |
| sourceFactId | 승인된 실제 사실·출처 위치 연결. |
| changedConditionId | 질문이 판단할 실제 변경 가정 ID. |
| outputTarget | 활동 기록·사용자 창작·책7/책8·리포트의 해당 역할 참조. |
| ageBandRuleId | 내부 자동 연령 규칙 참조, 화면 미표시. |

## 검수 순서

1. 승인된 조건·사실·기제의 ID와 근거 위치를 읽고 의미 원본을 작성한다. 없다면 missing으로 검토 대기하며 AI/추측으로 채우지 않는다.
2. 질문과 각 시스템 답변·조작의 주체/대상/자원/속성/목표/시점/인지 행동/응답 형태를 나란히 대조한다.
3. 질문 뒤에 각 답변을 대입해 직접 답하는지 사람이 읽는다. 문법이 자연스러운 것만으로 통과시키지 않는다.
4. 각 문장의 조건·질문·독립 수행이 하나인지 확인한다. 마스터 14.7의 15개 긴 문장 기준을 모두 검사한다.
5. FACT/CHANGED_CONDITION/DIRECT_EFFECT/POSSIBLE_OUTCOME/UNKNOWN/USER_INPUT을 문장·자료별로 분리한다.
6. 결과에서 사용자 commit/활동/질문/변경 조건/실제 사실로 거슬러 올라간다. 시스템 문구를 USER_INPUT으로 승격하지 않는다.
7. 연령별로 어휘·정보량·힌트만 달라지고 불변 의미 9항목이 유지되는지 검사한다. 이 작업에서 576행을 바꾸지 않는다.
8. 실패 시 콘텐츠 제작을 차단하고 해당 질문/자료/근거 위치를 기록한다. 아동을 실패·부족으로 평가하지 않는다.

## 작성 예와 반례의 지위

마스터의 종이 예는 자원·생산 단계 정합성을 설명하는 저작 규칙이다. ‘남은 종이 확인/내용 선택/인쇄 순서’를 이번에 W24의 승인 조건이나 역사 사실로 추가한 것이 아니다. 이번 사용자 승인을 받아 W24-C1의 계획 활동 응답을 종이 확인·인쇄 내용·차례로 정합화했다. 역사적 조건·출처·인과 범위는 그대로이며 C-P0-04의 검수 근거는 R2 구현 보고서에 기록한다.

## schema 추가 논의가 필요한 경계

- 자원이 없는 질문에 resourceId를 어떻게 명시할지, 자유 비교의 allowedAnswerIds를 비강제 목록/비적용으로 어떻게 표현할지, 행동 목표를 기존 필드 조합으로 표현할지 별도 참조를 둘지는 C-P1-02 결정 대상이다. 임의 ID·빈 배열의 정답 의미·새 필드를 확정하지 않았다.
- 자유 입력은 expectedAnswerMeaning과 다르더라도 자동 거부·정답 평가하지 않는다. 이 규칙은 시스템이 작성한 질문/답변/자료와 출력의 provenance를 검사한다. 사용자의 인지 능력을 판정하지 않는다.
- 원본 ID/버전은 유지한다. 향후 스키마 확장은 신규 버전으로 설계하고 과거 기록을 소급 변환하지 않는다.


## R2 사용자 확정 계약 — 2026-09-19

영구 저장 enum은 `comparisonKind = history` 또는 `comparisonKind = prediction`만 허용한다.
`history`: 실제 역사와 사용자가 만든 나의 역사 비교.
`prediction`: 최초 예측과 실제 역사 비교.
`history_vs_story`, `prediction_vs_actual`은 설명용 별칭이며 저장 enum이 아니다. 기존 책 role ID도 보존한다. IndexedDB·이벤트·결과에 별칭·제3값·comparisonTag를 저장하지 않는다. 과거 기록을 소급 변환하지 않는다.

문자열이 같다는 이유만으로 중복 판정하지 않는다. 서로 다른 eventId/comparisonKind, 각 단계의 독립 입력 이벤트와 출처, 서로 다른 저장 레코드, fallback 복사 없음이 모두 확인되면 동일한 문장도 정상이다. 동일 레코드 참조, 그림·음성 자동 재사용, 타 단계 입력의 기본값 복사, 미입력 페이지 대체 표시, 활동 라벨의 사용자 입력 변환은 금지한다.

결과 공개 전의 선택·말·글·그림 최초 예측은 잠긴 스냅샷으로 보존한다. 8쪽에 실제 선택한 그림·문구·선택 당시 스냅샷을 표시할 수 있다. 선택하지 않은 라벨이나 계획 문구는 예측/창작으로 만들지 않는다. 8쪽의 새 비교 발견은 자유 표현만 사용하며 같았어요·달랐어요·새롭게 알았어요 고정 카드는 금지한다.

7쪽은 history와 해당 입력 eventId만, 8쪽은 prediction과 별도 eventId만 사용한다. 동일 resultId 안에서도 미션·조건·버전·입력 역할을 대조한다. 원문은 평가·분류·요약하지 않는다. 실제 말·글·그림과 계획 기록은 분리한다.

필수 R2 저장/매핑 원본: [COMPARISON_CONTRACT_v1.1.md](./COMPARISON_CONTRACT_v1.1.md).


최종 상태: 2026-09-19 사용자 화면 검토 통과 · 사용자 승인 완료 · v1.1 FINAL BASELINE. [기준본 선언](./00_BASELINE_DECLARATION.md)과 [OPEN 이슈](./OPEN_ISSUES_P1_P2.md)를 함께 읽는다.
