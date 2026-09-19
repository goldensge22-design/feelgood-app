# Gate 2 구현 및 검수 — 대표 6개 DRAFT

2026-09-19. W01 조건부 승인 반영 후 진행. 동결 기준본·격리 원본 불변. 최종 게임 출시 판정이 아니다.

## W01 반영

사용자 지정 4곳(화면/안내 문자열 5개)을 정확히 수정했다. 다른 19개 화면/안내 문자열은 승인 전 제안과 동일하다. 12행은 `src/content/w01-age-approved.ko.json`에 저장했다. 이를 번역 키가 있는 한국어 콘텐츠로 연결했으며 조건 ID, 연령 ID, 표현 방식, 출처 참조, PASS는 변경하지 않았다.

실제 ID: `nuvia.age.elementary-low.v1`, `nuvia.age.elementary-high.v1`. 역슬래시 0개. 보고서의 과거 누락 표기는 발견 이력이고 실행 문구가 아니다.

|요청 검사|결과|
|---|---|
|W01 연령 표현|12/12|
|빈 문구 / 누락 표기|0 / 0|
|금지 단정문 / 잘못된 ageBandRuleId|0 / 0|
|다른 장소·대체 도구의 존재를 전제하는 변경 대상 문구|0|
|조건·표현 방식·지원 규칙 참조 보존|12/12|
|보호 파일 대조|378파일 변경 0·누락 0|

금지 문장/존재 전제 검사는 지정 문장 대조와 승인 12행 전수 검토다. 단순 패턴 검사를 모든 역사 문장의 의미 검증으로 확대하지 않는다.

## 실제 구현 파일과 역할

|파일|구현 내용|
|---|---|
|src/core/types.ts|6연령·7행동, 미션/조건/버전, Field의 네 미기록 상태, 이벤트·결과·캔버스 연결 타입|
|src/core/content.ts|로컬 콘텐츠/한국어 지연 로딩, ID·문구·버전·계약·연령 참조 검사|
|src/core/contracts.ts|7개 행동 payload의 필수 필드·재료 ID·관계·순서·분류 검사; 점수 등 임의 필드 거부|
|src/core/profile.ts|결과지 프로필 인터페이스, 명시적 테스트 프로필, 자동 지원 규칙; 검사 점수 필드 제외|
|src/core/engine.ts|단계 전환, 실제 입력 이벤트, 최초 예측 잠금, 두 비교, resultId·버전·소유자 무결성, 완료 기록 불변|
|src/core/storage.ts|기존 DB와 다른 IndexedDB, revision 충돌 검사, 다른 사용자/결과의 기록·음성 거부, 저장 인터페이스|
|src/core/artifacts.ts|미션 8쪽 모델, 단일 읽기 전용 성장 리포트, 과거 미기록값 무추론 어댑터|
|src/core/assetRegistry.ts|고유 ID·실파일/참조 슬롯 구분; 없는 자산은 미제공 오류|
|src/ui/ActivityRenderer.tsx|7개 공통 조작 렌더러; missionId 분기 없음; 키보드 가능한 버튼·분할 제시·판단 보류|
|src/ui/activity.css|얕은 프레임·눌림·포커스·모바일·모션 감소 CSS|
|src/content/missions.json|확정된 대표 6미션/12조건, 번역 키·출처 ID·행동·연령·책 참조|
|src/content/locales/ko.json|대표 12조건의 한국어 콘텐츠와 승인 W01 문구|
|src/content/locales/ui.ko.json|공통 조작 UI 문구|
|src/content/w01-age-approved.ko.json|사용자 승인 12행의 원문 및 기존 참조 필드|
|src/index.ts|공통 라이브러리의 공개 인터페이스|
|tests/*|모델·승인 문자열·브라우저 계약 검증용 테스트; 출시 콘텐츠 아님|
|package.json / tsconfig.json / vite.config.ts|별도 DRAFT의 실행·타입·라이브러리 빌드 설정|

격리 초안을 그대로 합치지 않았다. `03_GATE_2_CONTRACT_REVIEW.md` 대조에 따라 예측/저장 보호 및 입력 계약을 보완해 새 모듈을 작성했다. 기존 StoryCanvas와 로컬 녹음기의 실제 화면 이전은 Gate 3에서 연결해야 한다. 기존 SpeechRecognition 구현은 새 런타임에 넣지 않았다.

## 데이터와 이벤트 계약

- 고정 `missionId`, 승인 `conditionId`, `missionVersion=1.0.0`, `contentVersion=1.0.0`; 앱 구현 버전은 별도 `appVersion=0.2.0`.
- 결과는 새 resultId와 당시 미션/언어 스냅샷을 저장한다. 과거 결과에 최신 문구를 덮어쓰지 않는다.
- 연령은 명시적인 프로필에서 해석한다. 임의 기본 연령이나 검사 점수를 추정하지 않는다. 실제 결과지 시스템 연결은 어댑터 경계만 제공했다.
- 모든 필수 수행 이벤트의 공통 헤더를 유지한다. `historyViewed`, `alternateViewed`, `supportApplied`, `activityDeferred`, `activityRetried`, `cognitiveActionRecorded`는 새 공통 엔진의 실행 기록이다. 과거 로그에 소급 추가하지 않는다.
- 역사 확인은 `historyViewed`이며 선택 변경 횟수에 포함하지 않는다. 자동 지원과 사용자가 요청한 도움도 따로 센다.
- 두 비교는 `comparisonCompleted`의 별도 eventId와 `comparisonKind=history/prediction`으로 구분한다. 예측을 바꾸는 활동으로 처리하지 않는다.
- 이동은 완료 메타데이터만, 그리기는 선 수·도구 등만 이벤트로 받는다. 그림 좌표·PNG는 별도 캔버스 결과에 둔다.
- 검사 점수는 `notCollected`. 기록 없음·미관찰·미수집·미제공을 유지한다. 모르겠어요/건너뛰기로 인지 관찰 문구를 생성하지 않는다.
- 책은 미션별 정확히 8개 역할. 월별 합본은 포함하지 않는다. 보고서는 같은 resultId/버전의 실제 입력만 참조한다.

## 원본 콘텐츠 보존

12조건의 역사 조건, 실제 사실/기제, 직접·단기·장기·추가 조건, A/B, PASS, 행동을 원본 추출 값과 전수 대조했다. 다른 60행 연령 표현은 그대로 유지했고 W01 12행에만 승인 보완을 적용했다.

기준본의 `activityId`, `interactionContractId`, `causalMechanismId` 셀에 붙은 “(제안…)”은 메타 설명으로 분리했다. 원문 셀 값과 실행 ID의 대응을 `CONTENT_ID_PROVENANCE.json`에 남겼다. 동결 파일의 ID를 수정하지 않았다.

`INTERNAL_PROHIBITED_CLAIMS.json`은 src/public 밖의 내부 감사 자료다. UI·TTS·책·리포트가 읽지 않는다. 한국어 전체 번역 11개 언어 적용은 아직 하지 않았고 자동 번역도 없다.

## 검수 결과와 범위

|항목|결과|확인 범위|
|---|---|---|
|TypeScript|통과|새 src·tests 전체|
|자동 테스트|94/94|승인 문구, 72경로 모델, 거부 경로·무결성·재현성|
|72경로|통과|6미션×2조건×6연령의 상태 전환·메모리 저장·8쪽/리포트 모델. 실제 게임 완주 아님|
|프로덕션 빌드|통과|공통 엔진 ES 라이브러리 3개 JS 파일; 전체 게임 앱 배포 아님|
|PC 조작|12/12|1440×900 공통 계약 화면|
|모바일 조작|12/12|390×844, Chrome 터치 가능 컨텍스트의 자동 클릭. 실제 손가락 검수 아님|
|가로 넘침 / 44px 미만 조작 버튼|0 / 0|위 24개 테스트 화면|
|콘솔 오류·경고|0|계약 화면 테스트 범위|
|연령·PASS·QA 시스템 표시|0|계약 화면 테스트 범위|
|저장 충돌·타 사용자 조회|거부 확인|Chrome 실제 IndexedDB, 격리 테스트 프로필|
|새로고침 후 저장 복구|통과|revision 1의 테스트 수행 기록|
|다른 결과의 음성 조회·기록 혼입|거부 확인|16바이트 테스트 Blob. 실제 녹음/재생 검수 아님|
|키보드 포커스|BUTTON 확인|기본 Tab 탐색; 전체 보조공학 검수는 아님|
|모션 감소|설정 적용|테스트 컨텍스트 reduce, CSS 규칙 포함|
|스크린샷 육안 검토|PC·모바일 확인|W24-C1 PC, W15-C2 모바일의 글자·버튼 잘림 없음|
|AI SDK/API 키·실시간 음성/외부 호출 코드 패턴|0|src 및 dist 정적 검사|
|외부 네트워크 요청|0|24개 계약 조작·개발 서버 테스트. 로컬 127.0.0.1만|
|새 이미지·음성 제작|0|기존 자산 대량 복사/제작도 시작하지 않음|

테스트 이벤트와 모의 프로필은 `tests` 및 `qa` 자료다. 아이의 실제 수행 데이터로 표시하거나 출시에 포함하지 않는다. 결정적 재현성은 같은 입력·콘텐츠 버전·resultId/시각 메타데이터 조건에서 모델 결과를 비교했다. 새 미션마다 새 resultId와 시각을 발급하는 원칙은 유지한다.

실행 도구는 로컬 기존 의존성을 재사용했다: React 19.3.0, TypeScript 5.9.3, Vite 6.4.3, tsx 4.23.13. 새 AI 패키지나 원격 서비스를 설치하지 않았다.

## 남은 작업

Gate 3의 구텐베르크 실제 화면·StoryCanvas·녹음·책 넘김·통합 리포트 이전, 이어서 나머지 5개 미션의 화면 완주와 Gate 5 검수는 아직 완료하지 않았다. 사전 녹음 안내는 미제공이며, 실시간 TTS로 대체하지 않는다. 실제 휴대전화·태블릿·터치펜·Windows PDF 저장은 확인하지 않았다.

기존 P1 27건·P2 9건은 OPEN 그대로다. 이번 테스트 일부가 관련 증거를 제공하지만 원본 이슈를 자동 종결하지 않았다. 신규 게임의 전체 P0/P1/P2 최종 판정도 아직 하지 않았다.

## 보호·실행 위치

- 새 코드: 대표 미션 DRAFT의 `src/core`, `src/ui`, `src/content`.
- 기존 격리 코드: `work/representative-six/unvalidated-engine`에 그대로 보존.
- 보호 파일 378개: 변경 0, 누락 0. 이번 SHA-256 결과는 `qa/gate2-integrity-and-runtime.json` 및 `qa/GATE_2_FILE_MANIFEST.json` 참조.
- 공통 활동 확인 주소: `http://127.0.0.1:5186/tests/browser-harness.html?index=0`. 일반 게임 주소가 아닌 개발 검증 화면이다.
- 실행 앱은 아직 공개/배포하지 않았다. 동결 기준본은 수정하지 않았다.
