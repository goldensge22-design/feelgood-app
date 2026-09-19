# W24 자유 표현 비교 구현·공통 규칙 검수

2026-09-19 · 사용자 검토 대기 · 공통 부록은 CANDIDATE. 나머지 5개 대표 미션 실제 화면과 48개 전체 구현은 시작하지 않았다.

## 공통 규칙 저장

[COMPARISON_FREE_EXPRESSION_RULE_v1.1_CANDIDATE](../../COMPARISON_FREE_EXPRESSION_RULE_v1.1_CANDIDATE/COMPARISON_FREE_EXPRESSION_RULE_v1.1_CANDIDATE.md)가 48미션·96조건의 두 비교에 공통 적용된다. 본문은 한 곳에만 저장했다. 활성 프로젝트 마스터에는 참조 문단을 추가했고, 동결 연간 설계에는 직접 쓰지 않고 별도 ANNUAL_INTEGRATION_REFERENCE 부속 문서로 연결했다. 대표 미션 6개의 03_GATE_2_CONTRACT_REVIEW에도 같은 부록 참조를 추가했다. app-entry.json에는 comparisonRuleId를 기록했다. Markdown의 런타임 자동 해석 기능을 구현했다는 뜻은 아니다.

원본 활성 마스터와 대표 계약은 수정 전 work/representative-six/comparison/rule-backup에 보존했다. 동결 기준본·승인 역사 문구·PASS·다른 5개 콘텐츠는 수정하지 않았다.

## 구현

- 비교 전용 ComparisonEditor와 ComparisonView. 고정 카드/그림 선택 모드 없음. 최초 예측의 승인된 그림 선택은 그대로 유지.
- 유아: 말·그림·deferred, 글쓰기 도구 없음. 초등 저학년: 말·그림·선택적 짧은 글, 자동 채우기 없는 문장 시작 도움.
- 초등 고학년부터 직접 입력창 기본 표시. 중학생부터 발견/이유·근거 두 입력란. 음성 대안과 그림 보충, 발견 하나로 완료하며 근거는 강제하지 않음.
- comparisonKind와 사용자의 discoveryText/evidenceText 원문·voiceRef/drawingRef·결과/미션/조건/버전만 저장. 그림·음성은 기존 로컬 저장 경로를 사용하며 의미 분류·전사·AI 평가 없음.
- deferred는 빈 원문/참조 없음 및 provided=false. '이번 활동에서는 남기지 않음'은 상태 표시 문구이며 사용자 원문을 시스템 문장으로 채우지 않음.
- 책 7/8쪽 및 통합 리포트는 같은 원문과 미디어 참조를 읽고 줄바꿈·공백을 보존한다. 기록 유무와 능력·약점을 혼동하지 않음.
- 새 W24 런타임 사본: missionVersion 2.0.0 / contentVersion 1.1.0 / appVersion 0.3.1. 비교·저장 계약 변경을 이전 버전과 구분. 동결 소스 JSON 1.0.0 불변. 구버전 완료본은 읽기 전용, 미완료본은 보존하고 새 resultId로 시작한다. 자동 마이그레이션 없음.

## 실제 검수

프로덕션 앱에서 W24 C1/C2 × 6연령 총 12경로를 시작부터 완료했다. 변경 전후 비교 화면에 실제 글·그림·모의 마이크 음성을 입력했다. 이후 인쇄 그림 크기와 음성 참조 경계 보완 후 유아 C2, 초등 저학년 C1, 초등 고학년 C1, 성인 C1 네 영향 경로를 다시 완주했다. 하네스 통과를 실제 앱 완주로 대체하지 않았다. 모든 데이터는 검수자 입력이며 실제 아동 수행 데이터가 아니다.

|항목|결과|
|---|---|
|새 비교 고정 카드 / comparisonTag|0개 / 0건|
|두 비교 혼합 / 원문 불일치|0건 / 0건|
|다른 미션·조건·resultId·버전 미디어/기록 혼입|거부 검수 통과, 원본 불변|
|유아 글쓰기 / 고학년 기본 입력창|유아 글쓰기 도구 없음 / 기본 표시|
|deferred 실패·약점·성공 점수화|없음|
|TypeScript / 자동 테스트 / 프로덕션 빌드|통과 / 151·151 / 통과|
|실제 브라우저 완주|12·12 + 영향 경로 4·4|
|PC / 모바일|1440×900 / 390×844, 넘침·깨진 이미지·44px 미만 조작영역 없음|
|콘솔 오류·경고 / 생성형 AI·외부 API 요청|0건 / 0건|
|이전 완료 기록|실제 브라우저 로드 후 내용 완전 동일|
|보호 파일 SHA-256|378개 변경 0·누락 0|

원래 인쇄 검수에서 초등 저학년 C1의 책 8쪽과 리포트 2쪽이 9px/13px 넘쳤다. 사용자 원문은 보존하고 비교 그림 인쇄 높이만 줄여 영향 경로에서 넘침 0건을 확인했다. 초기 raw 검수 로그는 삭제하지 않고 recheck 로그와 구분한다. 최신 영향 경로 결과로 대체해 대조한 책/리포트 영역 144개는 넘침이 없다. 이는 짧은 검수 원문 기준이며 임의로 긴 글/모든 프린터를 보장하지 않는다.

최종 recheck PDF는 C1 초등 저학년의 그림 예측+그림 비교와 C2 유아의 음성+deferred를 담는다. 책 8쪽·리포트 4쪽, 한글 추출과 이미지 시각 검수를 수행했다. 실제 휴대전화·터치펜·마이크·Windows 인쇄 대화상자는 이번 검수에 포함하지 않는다. 기존 OPEN 항목을 종결하지 않는다.

## 실제 UI 결과 ID

| 조건 | 내부 경로 | resultId | history / prediction 표현 |
| --- | --- | --- | --- |
| W24-C1 | preschool | 43bd99bf-64e1-4171-9761-0d3eb7b0b097 | drawing / drawing |
| W24-C2 | preschool | 7a8e1a8f-9578-491f-86e3-df7c7c78677b | voice / deferred |
| W24-C1 | elementary-low | 97ab2e05-16c7-44bf-a6ba-d207fa5182a9 | writing / drawing |
| W24-C2 | elementary-low | c6ba9bb8-f663-4050-a5de-db42c7d4274b | writing / deferred |
| W24-C1 | elementary-high | a08e4738-de5a-4429-9298-dd49cfe3c19f | mixed / writing |
| W24-C2 | elementary-high | 986069cb-1eb0-4ae5-a26b-fff34e54d217 | writing / deferred |
| W24-C1 | middle-school | e0939a36-9e5d-4400-8eb9-411d45b87c97 | writing / writing |
| W24-C2 | middle-school | 1a239629-de0a-44fa-a7c6-024581930fd4 | writing / deferred |
| W24-C1 | high-school | a4b61b9b-2fd7-40df-8faf-c282ea114f66 | writing / writing |
| W24-C2 | high-school | fbbb6101-5b89-4081-a290-06b83115e252 | writing / deferred |
| W24-C1 | adult | f1f024e3-5cb4-42e1-abfe-092681247b8b | writing / writing |
| W24-C2 | adult | d82c55de-be50-4da6-aa2a-482df82f958a | writing / deferred |

## 네트워크·저장

12경로 및 재검수 요청은 127.0.0.1 로컬 HTML/JS/이미지/폰트뿐이다. 외부 도메인 차단 상태에서 완주했고 시도된 외부 요청도 0건이다. 소유권/구버전 검수는 같은 기기의 5187 개발 모듈과 5188 실행 앱을 사용했다. 생성형 AI SDK·키·실시간 TTS·SpeechRecognition 탐지 없음. 구문 검사만으로 네트워크 검수를 대체하지 않았다.

로컬 IndexedDB nuviaRepresentative6.v1(수행·녹음), nuviaRepresentative6.artifacts.v1(그림/초안)을 사용한다. 사용자/결과 소유권과 미션·조건·버전 참조를 확인한다. 기존 사용자 저장 자료를 삭제·변환·외부 전송하지 않았다. 과거 범주 선택 기록은 과거 표현 그대로 읽을 뿐 새 분류 카드나 새 comparisonTag를 생성하지 않는다.

## 변경 파일

| 파일 | 구분 | SHA-256 |
| --- | --- | --- |
| src/app/app.css | 수정 | ea8eca869e226ca8f654eece49518ace4a94a8fd9c6cae8e7bdd7a8f392590d0 |
| src/app/App.tsx | 수정 | bee5be287c5c43bb9acf3e4e54612ec69fb83384b66ce6002e8d10e250e8dcad |
| src/app/ComparisonEditor.tsx | 신규 | ad18f443e7f8c4412b54f80b60417b6084405df699480f8860e2da6edebfca07 |
| src/app/ExpressionEditor.tsx | 수정 | 6ccb278c12ce09fac964f30dc079bd09eb00b19281385585501331f7002866d0 |
| src/app/ResultViews.tsx | 수정 | 3f8100c37376eae7c5a1e041aa50c1c2379b7627a8ffadaeee80bd51a635fcdb |
| src/content/app-entry.json | 수정 | 921437571e1a8618efc3c4a6dd15d8b34b32371bd3bee5b4ee4bf06c0168f22e |
| src/core/artifacts.ts | 수정 | 479ae6cd859bb16627cb70747f10fc101231f2d3ff8bd18a3357a1b93db00775 |
| src/core/engine.ts | 수정 | 39ce54c980718abe1a340e264a4aa5be7abd177c19679b654654c9af8d74781e |
| src/core/release.ts | 신규 | eafa6f2485401c406176b857bb9bb2fb6033eb75f48ef61e2e895ff4bb05febe |
| src/core/storage.ts | 수정 | 90d45a6abdbf965bcaaabde3c2e6a61f514c94bcb64b26b1d0a9a1f9877cff89 |
| src/core/types.ts | 수정 | a95204c0aca9fd0607c1a52495264063f6137661f0d79091bab36add42570105 |
| src/content/locales/app.ko.json | 수정 | 60030cdb224ae110bd6e57e0a6a41de58b60b540584f5396f08f85382b029ee1 |
| tests/comparison.test.ts | 신규 | 8e6d0f7d3db0b754e41234b0583f63e4468dcce276bc2456c71fc0daea5ed68b |
| tests/gate3.test.ts | 수정 | ea3098f56193477ae102c898e85915805bb1f19839a438c94004eb6bc6c38f84 |

이 밖에 package.json 앱 버전, README의 최신 검수 링크, 대표 계약의 공통 부록 참조, 활성 마스터의 공통 부록 참조를 변경했다. 역사 원본 JSON 3개는 해시가 같다. 규칙 부록/연간 적용 부속 문서/참조 변경 기록과 qa/comparison-free 검수 자료를 새로 저장했다. 이전 Gate 3 검수 보고서·PDF는 당시 버전 증거로 보존했다.

## 산출물과 다음 경계

- qa/comparison-free/ui-completions.json: 12경로 원본 로그.
- qa/comparison-free/recheck/ui-completions.json: 최종 보완 4경로와 인쇄 측정.
- qa/comparison-free/recheck/W24-C1-storybook.pdf 및 W24-C2-storybook.pdf.
- qa/comparison-free/recheck/W24-C1-report.pdf 및 W24-C2-report.pdf.
- qa/comparison-free/isolation-and-legacy.json: 소유권/조건/버전 격리와 과거 기록 보존.
- qa/comparison-free/protected-sha256.json: 보호 378파일 전후 원장.
- qa/comparison-free/FINAL_COMPARISON_QA.json 및 FILE_MANIFEST.json: 최종 집계·무결성.

이번 변경 범위의 남은 P0 없음. 기존 Gate 3 P1 4/P2 2, 연간 설계 P1 27/P2 9는 별도로 그대로 OPEN. W24 통과가 나머지 5개 화면 구현 또는 48개 전체 제작 승인을 뜻하지 않는다. 공통 규칙은 CANDIDATE로 보관하고 여기서 중단한다.
