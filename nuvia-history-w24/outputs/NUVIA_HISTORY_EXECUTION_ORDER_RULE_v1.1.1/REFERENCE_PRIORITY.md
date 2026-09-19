# 실행 순서 기준본 참조 우선순위

## 우선순위

실행 순서 충돌에는 다음 순서로 적용한다.

1. [NUVIA_HISTORY_EXECUTION_ORDER_RULE_v1.1.1](./NUVIA_HISTORY_EXECUTION_ORDER_RULE_v1.1.1.md)
2. [NUVIA_HISTORY_MASTER_RULES_v1.1](../NUVIA_HISTORY_MASTER_RULES_v1.1/NUVIA_HISTORY_MASTER_RULES_v1.1.md)
3. [연간 통합 역사 설계 기준본](../NUVIA_HISTORY_ANNUAL_INTEGRATED_BASELINE_v1.0/01_ANNUAL_INTEGRATED_MASTER_DESIGN_v1.0.md)
4. [대표 6미션 의미 설계 기준본](../NUVIA_HISTORY_REPRESENTATIVE_6_SEMANTIC_BASELINE_v1.1/NUVIA_HISTORY_REPRESENTATIVE_6_SEMANTIC_BASELINE_v1.1.json)
5. 개별 미션 실행 콘텐츠

이 기준본의 우선권은 정규 단계의 순서, 결과 공개 게이트, 공개 전 예측·핵심 활동 잠금에만 적용한다. 개별 질문·응답·선택지·18개 의미 필드·이벤트 payload 의미는 대표 6미션 의미 설계 기준본을 따른다. 역사 조건·출처·PASS·인과 범위는 승인된 연간 및 구간별 역사 설계 기준본을 따른다.

현재 W24 엔진의 `prediction → alternate → activity`는 변경이 필요한 구현 현황이며 참조 우선순위를 뒤집는 근거가 아니다. 기존 버전의 기록은 당시 실행 순서로 판독하며 새 기준을 소급 적용하지 않는다.

후보 부록은 [원래 경로](../NUVIA_HISTORY_EXECUTION_ORDER_RULE_v1.1.1_CANDIDATE/NUVIA_HISTORY_EXECUTION_ORDER_RULE_v1.1.1_CANDIDATE.md)에 그대로 보존했다.
