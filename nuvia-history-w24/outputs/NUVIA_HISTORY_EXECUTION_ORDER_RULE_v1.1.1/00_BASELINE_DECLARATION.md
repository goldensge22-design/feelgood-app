# NUVIA HISTORY 실행 순서 기준본 선언

기준본명: `NUVIA_HISTORY_EXECUTION_ORDER_RULE_v1.1.1`  
승격일: 2026-09-19  
상태: 사용자 승인 완료 / FINAL BASELINE / 동결

## 확정 범위

NUVIA HISTORY 48미션·96조건·6연령 경로의 공통 실행 순서를 다음과 같이 확정한다.

1. `conditionUnderstanding` — 실제 역사와 변경 조건 이해
2. `prediction` — 결과 공개 전 최초 예측
3. `coreActivity` — PASS 핵심 인지 활동
4. `alternateResult` — 변경 결과 공개
5. `learnerStory` — 나만의 이야기와 그림
6. `historyComparison` — 실제 역사와 나의 역사 비교
7. `predictionComparison` — 최초 예측과 실제 역사 비교
8. `artifactLink` — 이야기책·통합 성장 리포트 연결

실행 단계 순서에 한해 이 기준본이 `NUVIA_HISTORY_MASTER_RULES_v1.1`의 기존 순서보다 우선한다. 개별 질문·응답·의미 필드는 대표 6미션 의미 설계 기준본을 따른다. 역사 조건·출처·인과 범위·PASS 배정·연령 표현·이야기책·리포트·비AI 원칙에는 기존 동결 기준본을 그대로 적용한다.

`conditionUnderstanding`의 실제 역사 확인과 조건 선택은 `historyViewed`와 `conditionSelected`라는 별도 하위 이벤트로 보존한다. 최초 예측과 핵심 활동의 실제 입력 또는 명시적 보류가 영속 저장되고 잠기기 전에는 변경 결과를 공개하지 않는다. 모든 단계와 결과물은 같은 resultId를 사용한다.

## 이슈 상태

- `P0-W24-PREFLIGHT-01`: 최종 부록 등록으로 해소 완료 / CLOSED.
- `EO-P1-01`: OPEN. 접근성상 수행 불가 사유의 공통 저장 계약 검토가 필요하다.
- 현행 계약이 확장되기 전에는 `activityDeferred`만 기록하고 세부 사유를 추정·생성하지 않는다.
- 마스터 기준본 P1 2건·P2 1건과 의미 기준본 P1 4건·P2 1건은 각 원본에서 OPEN 상태를 유지한다.

## 보존과 구현 상태

후보 부록, 동결 마스터·연간 설계·역사 설계·의미 기준본, 기존 코드·실행 콘텐츠·사용자 기록을 보존한다. 과거 기록의 실행 순서를 변환·삭제·재정렬하거나 없는 이벤트를 소급 생성하지 않는다.

이번 승격은 문서 기준본 확정이다. 코드 수정, UI 실행, 빌드, PDF 생성 및 W24 구현 재개는 포함하지 않는다. 생성형 AI API·실시간 TTS·자동 번역·외부 생성 서비스를 추가하지 않았다.

기준 규칙은 [최종 실행 순서 부록](./NUVIA_HISTORY_EXECUTION_ORDER_RULE_v1.1.1.md), 후속 구현 진입점은 [W24 필수 참조 목록](./W24_IMPLEMENTATION_REQUIRED_REFERENCES.md)이다.
