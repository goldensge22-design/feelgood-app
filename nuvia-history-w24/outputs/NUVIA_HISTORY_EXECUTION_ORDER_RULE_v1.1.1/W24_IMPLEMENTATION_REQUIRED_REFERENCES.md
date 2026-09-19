# W24 구현 재개 시 필수 참조 문서

W24 C1·C2 × 6연령의 구현을 재개하기 전에 아래 문서를 순서대로 읽고 계약을 함께 적용한다.

1. [최종 실행 순서 기준본](./NUVIA_HISTORY_EXECUTION_ORDER_RULE_v1.1.1.md) — 정규 단계 순서, 결과 공개 게이트, 공개 전 잠금의 최상위 참조
2. [최종 마스터 규칙](../NUVIA_HISTORY_MASTER_RULES_v1.1/NUVIA_HISTORY_MASTER_RULES_v1.1.md) — 실행 순서 외 공통 규칙
3. [연간 통합 역사 설계 기준본](../NUVIA_HISTORY_ANNUAL_INTEGRATED_BASELINE_v1.0/01_ANNUAL_INTEGRATED_MASTER_DESIGN_v1.0.md) — 승인된 역사·조건·PASS·버전 계약
4. [대표 6미션 의미 기준본 JSON](../NUVIA_HISTORY_REPRESENTATIVE_6_SEMANTIC_BASELINE_v1.1/NUVIA_HISTORY_REPRESENTATIVE_6_SEMANTIC_BASELINE_v1.1.json) — W24 질문·응답·활동·이벤트·리포트 의미 원본
5. [576단계·18필드 매트릭스](../NUVIA_HISTORY_REPRESENTATIVE_6_SEMANTIC_BASELINE_v1.1/NUVIA_HISTORY_REPRESENTATIVE_6_576_STAGE_18_FIELD_BASELINE_v1.1.csv) — W24 12경로·96단계 필드 대조
6. [대표 의미 기준본 OPEN 이슈](../NUVIA_HISTORY_REPRESENTATIVE_6_SEMANTIC_BASELINE_v1.1/OPEN_ISSUES_P1_P2.md) — P1 4건·P2 1건
7. [실행 순서 OPEN 목록](./OPEN_ISSUES_P0_P1_P2.md) — EO-P1-01 및 종결 P0의 적용 경계
8. [기존 사전 검수 보고서](../NUVIA_HISTORY_W24_SEMANTIC_APPLICATION_PREFLIGHT_DRAFT/00_W24_BLOCKING_CONTRACT_CONFLICT_REPORT.md) — 충돌 발견 근거와 당시 코드 위치

후속 구현은 W24만 대상으로 한다. 현재 엔진의 구 순서를 새 순서로 바꾸되 과거 결과를 변환하지 않고, 기존 버전 복구와 새 버전 결과를 분리해야 한다. 결과 공개 전에 최초 예측과 핵심 활동 입력/보류의 영속 저장을 확인한다. W01 및 다른 대표 미션은 W24 실제 검수 통과 전 구현하지 않는다.

본 목록은 구현 시작 명령이 아니다. 이번 승격에서 코드·UI·빌드·PDF를 수정하거나 실행하지 않았다.
