# R2 공통 엔진·책 매핑 필수 계약

| 페이지 | 기존 pageRole 유지 | 영구 comparisonKind | 입력 출처 |
|---|---|---|---|
| 7 | historyComparison | history | 자작 이야기/그림 + historyComparison 레코드 + 별도 comparisonCompleted eventId |
| 8 | predictionComparison | prediction | 결과 공개 전 prediction 스냅샷 + predictionComparison 레코드 + 별도 comparisonCompleted eventId |

설명 별칭은 저장하지 않는다. 선택형 예측 스냅샷 허용은 새 비교 고정카드 허용을 의미하지 않는다.
각 레코드의 음성/그림 참조는 그 단계의 실제 입력이며 다른 단계에서 fallback하지 않는다.
규칙 원본: [마스터 14·15장](NUVIA_HISTORY_MASTER_RULES_v1.1.md).

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
