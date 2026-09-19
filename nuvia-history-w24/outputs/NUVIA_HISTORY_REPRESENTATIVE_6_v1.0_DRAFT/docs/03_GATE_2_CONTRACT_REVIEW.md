# Gate 2 — 격리 초안과 승인 계약 대조

원본: `work/representative-six/unvalidated-engine` (읽기 전용 보존). 이 폴더는 실행 앱이 아니다. 아래 대조 후 새 DRAFT의 공통 모듈을 작성한다. 원본을 이동·삭제하거나 기존 게임 코드에 병합하지 않는다.

|초안|확인 사항|공통 구현에서의 처리|
|---|---|---|
|types.ts|7개 행동·6개 내부 연령과 책/결과 연결 방향은 일치|행동별 payload를 검증 가능한 계약으로 정의, 실행 ID와 원본 ID 표기 이력 분리|
|engine.ts|예측 잠금 함수는 있으나 전체 단계 및 입력 검사 불충분|명시적 상태 전환·불변 예측·다른 조건/사용자/resultId 거부|
|engine.ts|임의 payload를 cognitiveActionRecorded로 허용|7개 행동의 필드·실제 재료 ID·분류 값·미입력 여부 검사|
|engine.ts|이벤트 없음이 바로 0건이 되는 집계|수집 여부 및 missing 상태를 분리, 능력·성공·약점 추론 없음|
|engine.ts|bookModel/reportModel 호출 전 완전한 연결 검증이 없음|같은 결과·조건·버전 확인 후 읽기 전용 파생 모델 생성|
|storage.ts|신규 DB 분리는 적합하나 기존 resultId 덮어쓰기 방지 부족|새 네임스페이스·소유자 확인·revision 비교·완료본 불변·예측 변경 거부|
|StoryCanvas 사본|Gutenberg condition·소품에 결합|이후 Gate 3에서 설정/저장 어댑터로 이전; 현재 격리 원본 불변|
|SpeechRecognition 사본|실시간 음성 인식 경로 포함|런타임에 복사하지 않음. 기존 로컬 녹음 기능만 이후 검증하여 사용|

W01 표시 문구는 사용자 승인 12행 JSON을 최우선 override로 읽는다. 역사 조건·PASS·출처·실제 기제·A/B는 연간 기준본에서 그대로 읽으며, 금지 문구는 빌드 대상 밖 내부 감사 자료로만 보존한다. 새 콘텐츠 버전으로 과거 기록을 자동 변환하지 않는다.

한국어 단계만 구현한다. 번역 키와 언어별 로더 경계는 유지하고 새 언어를 자동 번역하지 않는다. 실제 프로필이 없는 경우 일반 사용자용 연령 선택이나 임의 진단을 만들지 않는다. 테스트는 명시적인 모의 프로필만 사용한다.

## 공통 비교 계약 추가 참조 — 2026-09-19

대표 6개 미션의 두 비교 계약은 [자유 표현 비교 v1.1 CANDIDATE](../../COMPARISON_FREE_EXPRESSION_RULE_v1.1_CANDIDATE/COMPARISON_FREE_EXPRESSION_RULE_v1.1_CANDIDATE.md)를 참조한다. Gate 2 과거 검수는 새 계약 검수로 소급하지 않는다. 현재 W24만 실제 UI 적용·검수하며 다른 5개 화면을 시작하지 않는다.

## 질문 정합성·책 7/8쪽 필수 참조 — v1.1 CANDIDATE

[새 마스터 14·15장](../../NUVIA_HISTORY_MASTER_RULES_v1.1/NUVIA_HISTORY_MASTER_RULES_v1.1.md)과 [하위 적용 계약](../../NUVIA_HISTORY_MASTER_RULES_v1.1/DOWNSTREAM_RULE_REFERENCES_v1.1.md)을 읽고 통과한 콘텐츠만 구현한다. 자유 표현 비교 부록은 계속 참조하되 comparisonKind/동일 원문/선택 예측의 OPEN 충돌을 임의로 통일하지 않는다. 기존 Gate 2/3 통과는 새 규칙 통과가 아니다. R2 사용자 승인 이후 W24 지정 수정·검수를 수행했다. 최신 결과는 ../../NUVIA_HISTORY_MASTER_RULES_v1.1_R2_CANDIDATE/R2_IMPLEMENTATION_QA_REPORT.md를 참조한다.

R2 확정: 비교 저장값 history/prediction 유지, 독립 입력의 동일 문장 허용, 최초 예측 선택 스냅샷 허용. [공통 계약](../../NUVIA_HISTORY_MASTER_RULES_v1.1/COMPARISON_CONTRACT_v1.1.md)을 준수한다.

## v1.1 최종 동결 — 2026-09-19

사용자 화면 검토 통과 및 최종 승격 승인 완료. P1 2건·P2 1건과 실제 기기·터치펜·Windows 인쇄 대화상자 미검수 상태를 유지한다. 코드 추가 구현 없이 중단하며 대표 6미션 12조건 의미 정합성 검수는 별도 명령을 기다린다.
