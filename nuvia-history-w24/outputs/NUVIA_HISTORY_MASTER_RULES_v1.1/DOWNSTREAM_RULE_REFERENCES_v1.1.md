# 하위 설계·구현 필수 참조 계약 — v1.1 FINAL BASELINE

모든 행은 [새 마스터 14·15장](./NUVIA_HISTORY_MASTER_RULES_v1.1.md)과 [정합성 상세](./QUESTION_CONTENT_ALIGNMENT_RULE_v1.1.md), [7·8쪽 상세](./STORYBOOK_PAGE_7_8_DISTINCTION_RULE_v1.1.md)를 **필수 참조**한다. 아래 원본은 역사/구조의 계승 자료이며 이 기준본과 충돌하는 사항은 적용하지 않고 충돌 목록에 남긴다.

| 하위 문서 영역 | 실제 계승 자료 | 이 기준본의 필수 적용 계약 |
| --- | --- | --- |
| 연간 통합 설계 | [01_ANNUAL_INTEGRATED_MASTER_DESIGN_v1.0.md](../NUVIA_HISTORY_ANNUAL_INTEGRATED_BASELINE_v1.0/01_ANNUAL_INTEGRATED_MASTER_DESIGN_v1.0.md) | 96조건 전체에 두 필수 규칙 적용. 승인된 역사·조건은 수정하지 않고 불일치를 질문/자료 ID로 보고. |
| 공통 콘텐츠 스키마 | [NUVIA_HISTORY_CONTENT_SCHEMA_v2.0_R2_DRAFT.md](../NUVIA_HISTORY_ANNUAL_v2.0_R2_DRAFT/NUVIA_HISTORY_CONTENT_SCHEMA_v2.0_R2_DRAFT.md) | 18필드 의미 원본·provenance·페이지 출처 분리 계약 검토. R2 문서는 구조 참조이고 오래된 사건/PASS 배정을 재채택하지 않음. |
| 연령별 표현 규칙 | [NUVIA_HISTORY_AGE_EXPRESSION_v1.0.xlsx](../NUVIA_HISTORY_ANNUAL_INTEGRATED_BASELINE_v1.0/NUVIA_HISTORY_AGE_EXPRESSION_v1.0.xlsx) | 576행은 읽기 전용. 단어/문장 길이와 지원량을 바꿔도 의미 9항목 불변. 96조건 일괄 수정 금지. |
| 공통 엔진 계약 | [NUVIA_HISTORY_COGNITIVE_EVENT_CONTRACT_v2.0_R2_DRAFT.md](../NUVIA_HISTORY_ANNUAL_v2.0_R2_DRAFT/NUVIA_HISTORY_COGNITIVE_EVENT_CONTRACT_v2.0_R2_DRAFT.md) | 최신 승인 행동 계약을 유지. 의미 단위 하나·출처 사슬·비교 분리. R2 과거 미승인 행동을 구현하지 않음. |
| 대표 미션 6개 구현 계약 | [03_GATE_2_CONTRACT_REVIEW.md](../NUVIA_HISTORY_REPRESENTATIVE_6_v1.0_DRAFT/docs/03_GATE_2_CONTRACT_REVIEW.md) | 두 규칙 미통과 콘텐츠 구현 금지. W24 지정 수정·검수 및 사용자 화면 승인 완료. 이번 승격 후 추가 구현 중단. |
| 이야기책 8쪽 매핑 | [NUVIA_HISTORY_BOOK_REPORT_LINKAGE_v1.0.xlsx](../NUVIA_HISTORY_ANNUAL_INTEGRATED_BASELINE_v1.0/NUVIA_HISTORY_BOOK_REPORT_LINKAGE_v1.0.xlsx) | 768행 원본은 보존. 기준본 적용 시 7/8쪽 역할·허용 출처·배치·누락 처리 검수. 영구 kind history/prediction 및 기존 책 role 유지; 설명 별칭 저장 금지. |
| 성장 리포트 연결 | [08_GATE_3_RESULT_ID_INTEGRITY.md](../NUVIA_HISTORY_REPRESENTATIVE_6_v1.0_DRAFT/docs/08_GATE_3_RESULT_ID_INTEGRITY.md) | 같은 결과의 이야기 비교/예측 비교 원문만 읽음. 시스템 라벨을 사용자 창작으로 표시하지 않음. |
| QA 체크리스트 | [QA_CHECKLIST_v1.1.md](QA_CHECKLIST_v1.1.md) | 정합성 13개·페이지 중복 10개 P0 및 충돌 결정 게이트. 기존 테스트 통과로 대체 금지. |

동결 XLSX/기준본과 과거 R2 문서는 수정하지 않았다. 본 파일은 이를 위한 기준본 적용 참조 계층이다. 대표 6개 계약 원본에는 이 기준본 참조를 실제로 추가했고 AGENTS 진입점에도 작업 전 규칙을 추가했다. Markdown 링크·필드 체크리스트를 저장한 것이며 실행 validator나 자동 96조건 전환을 구현한 것은 아니다.

전체 연간 조건 의미 전수 검수는 미수행이다. W24 및 규칙 충돌의 해소 근거와 잔여 상태는 별도로 관리한다. 기존 승인 기록을 취소·삭제하거나 역사 조건을 다른 문구로 바꾸지 않는다.


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
