# STORYBOOK_PAGE_7_8_DISTINCTION_RULE 상세 검수 — v1.1 FINAL BASELINE

규범 원본: [마스터 15장](./NUVIA_HISTORY_MASTER_RULES_v1.1.md#15-storybook_page_7_8_distinction_rule--필수). 필수 허용/금지 출처·10개 P0 기준은 본문에 포함되어 있다.

| 대상 | 7쪽 | 8쪽 |
| --- | --- | --- |
| pageRole 유지 | historyComparison | predictionComparison |
| 설명 전용 별칭 (저장 금지) | history_vs_story | prediction_vs_actual |
| comparisonKind 기존 저장값 | history | prediction |
| 기존 책 role | historyComparison | predictionComparison |
| 허용 출처 | actualHistorySummary, storyText, storyDrawingRef, historyStoryComparisonText, historyStoryComparisonVoiceRef, historyStoryComparisonDrawingRef | initialPredictionText, initialPredictionDrawingRef, actualHistoryKeyPoint, predictionActualComparisonText, predictionActualComparisonVoiceRef, predictionActualComparisonDrawingRef |
| 구조 | 실제 역사 ↔ 나의 이야기 → 발견 | 처음 생각 → 실제 역사 → 발견 |
| 실제 역사 밀도 | 비교할 핵심 장면·요약 | 예측과 비교할 핵심 한 줄 |

**C-P0-01 해소:** 영구 저장값은 history/prediction이다. 설명 별칭은 저장하지 않으며 과거 기록 이관은 없다.

## 출력 출처 검수

- 각 사용자 글/그림/음성에 현재 resultId·missionId·conditionId·수행 당시 버전과 단계별 입력 출처가 있는지 확인한다.
- 책 7쪽은 story 입력과 history 비교 입력을 구분한다. 책 8쪽은 initialPrediction과 prediction 비교 입력을 구분한다. 둘 다 같은 원문 보존 원칙을 사용하지만 저장 칸이나 참조를 공유하지 않는다.
- 비교 그림 누락 시 이야기 그림 또는 예측 그림으로 채우지 않는다. 원래 이야기/예측을 자신의 문맥 안에서 보여 주는 것과 ‘발견한 그림’으로 대체하는 것을 구분해 검사한다.
- 말/글/그림 미입력 안내는 표시용 상태 문구다. 사용자 원문 필드에 안내 문장을 저장하지 않는다. missing·deferred 구분과 원문 무수정은 기존 공통 비교 부록을 따른다.
- 같은 실제 역사 원문 전체를 양쪽에 쓰지 않는다. 승인된 사실에 근거한 7쪽 요약/8쪽 핵심 한 줄은 콘텐츠 저작/검수 작업에서 준비하며 런타임 AI 요약을 사용하지 않는다.
- 단일 리포트도 두 영역의 입력 출처·원문·미디어를 분리하고 동일 resultId의 해당 책 페이지로 연결해야 한다.

## 아직 자동 판정하면 안 되는 경계

- C-P0-02 해소: 서로 다른 단계·eventId·comparisonKind·저장 레코드와 입력 출처가 확인되고 fallback 복사가 없으면 동일 문장도 정상이다. 자동 참조 재사용만 혼입으로 판정한다.
- C-P0-03 해소: 실제로 선택한 최초 예측 스냅샷은 8쪽에 허용한다. 새 비교 발견에 고정 카드를 사용하거나 계획 라벨을 자작 문장으로 만들지 않는다.
- 이야기/최초 예측의 음성과 evidenceText는 새 허용 목록에 직접 열거되지 않아 C-P1-01 검토 대상이다. 허용 목록을 몰래 확장하지 않았다. 로컬 음성을 자동 전사하지 않는다.

## 필수 검수 증거

같은 시드 자료에 서로 다른 7/8쪽 원문·그림·음성을 넣어 화면/책/PDF/리포트의 텍스트·미디어 소유권을 대조한다. 단계별 missing과 deferred도 각각 재현한다. 테스트용 자료와 실제 사용자 기록을 구분하고 기존 자료에 값을 소급 생성하지 않는다. W24 코드/화면/PDF 검수 결과는 ../NUVIA_HISTORY_MASTER_RULES_v1.1_R2_CANDIDATE/R2_IMPLEMENTATION_QA_REPORT.md에서 별도로 기록한다.


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
