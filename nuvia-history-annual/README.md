# HISTORY 연간 연결 1단계 — 사용자 화면 검토 대기

## 범위와 기준

이 결과는 48편 전체 실행본이나 W01·W48 활동 완료본이 아니다. 승인된 설계 48편의 카탈로그, 연간 선택 화면, W24 기존 실행본 연결, 미준비 활동 차단을 구현했다.

- 공통 원본: 저장소 루트 AGENTS.md / docs/i18n/README.md / i18n/programs.json / scripts/check-i18n.mjs / docs/DEVELOPMENT_BASELINE.md. 이 폴더에 공통 규칙을 복제하지 않는다.
- 공통 원격 커밋: efba534ffeead74bcfde0c6d450e118067649855
- HISTORY cherry-pick: 6f7066e (공통 커밋 하나만 가져옴)
- W24 보존 기준: cede993abcb68b5d017b1ca147ce335fc6f98bd6
- 현재 작업 경로: C:/Users/golde/.codex/worktrees/nuvia-history-annual-engine/feelgood-app/nuvia-history-annual
- 브랜치: codex/nuvia-history-annual-engine
- W24 최신 브랜치·main·교사가이드·D-CAS·PLANNER는 수정하지 않음.

## 실행

새 연간 주소: http://192.168.45.172:5193/?annual=1&qa=1&age=preschool
로컬 주소: http://localhost:5193/?annual=1&qa=1&age=preschool
시작 명령: 이 폴더에서 node scripts/serve.mjs
서버는 dist만 제공하며 internal-qa, 소스, Excel은 제공하지 않는다. 기본 포트 5193, 5192로 시작 시 오류.
현재 서버 PID 27968. 기존 W24 5192 PID 19548은 유지했다.
같은 Wi-Fi 주소는 서버 PC에서 HTTP 200을 확인했다. 다른 노트북·실제 휴대기기·방화벽 통과까지 확인한 것은 아니다.

W24 시작은 같은 호스트의 5192로 이동한다. 별도 포트는 별도 저장소 origin이므로 W24를 5193에 복사해 기록이 사라진 것처럼 보이게 하지 않는다. 기존 localStorage/IndexedDB/resultId/비교/작품 엔진을 이 어댑터가 읽거나 변환하지 않는다.
qa=1에서만 age/grade/pass/support/learner/new 의도를 전달한다. new를 자동으로 붙이지 않는다. 일반 실행은 기존 결과지 프로필 연동이 필요하다. 외부 계정 연동을 새로 완료한 것은 아니다.

## 구조

- scripts/generate-catalog.mjs: 동결 Excel 네 파일 읽기 전용 변환. bundled artifact-tool 사용.
- src/generated/catalog.json: 48 미션·96 조건, 안정 ID, 버전, 출처, 기제 등급, PASS/actionKind, 6연령 규칙, 자산 참조, 책 역할, resultId 정책.
- src/generated/content.ko.json: 역사 콘텐츠 번역 키·한국어 원문.
- internal-qa/catalog-internal.json: 금지 문구 원문, 제안 계약 ID, 연령 원본 표현, 책 원본 매핑. 빌드에 import하지 않음.
- src/adapters.ts: 중앙 등록 언어/제공 상태 참조, locale 차단, W24 호환 연결.
- src/locales/ko.json: UI·접근성·운영 안내 키.
- src/main.ts / style.css: 반응형 연간 목록·준비 상태·언어 선택.
- tests/annual.test.ts, scripts/browser-qa.mjs, scripts/verify-preservation.mjs: 자동 검사.
- 생성기는 frozen 파일 10개의 기록된 SHA-256을 전후 확인한다. 실패하면 생성하지 않는다.
- ARTIFACT_NODE_MODULES로 bundled 라이브러리 경로를 지정할 수 있다. 저장소 외 개인 폴더의 design_data.json은 이 PC에서 확인되지 않아 합치지 않았다.

## 버전과 실행 계약

Excel missionVersion/contentVersion 1.0.0은 설계 버전으로 보존한다. W24 실제 실행 manifest 5.3.0 / 3.4.0은 runtime 필드에 따로 둔다. W24-C2 및 preschool PASS 활동은 기존 src/core/release.ts와 엔진이 소유한다. Excel 값으로 덮어쓰지 않는다.
실행 순서 실제 역사 → 조건 선택 → 최초 예측은 기존 엔진 그대로다.
제안·미명시 interaction/causal ID는 공개 데이터에서 null, 원문은 내부 QA로 분리한다. 명시된 설계 ID도 design-reference-only이며 새 실행 계약 승인으로 간주하지 않는다.

## 사건별 상태

| 사건 | 데이터 | 실행 | 이미지 | 콘텐츠 | 사용자 검토 |
|---|---|---|---|---|---|
| W01 | 두 조건·6연령·8쪽 연결 | 차단 | asset-pending | 기존 의미 원본 있음, 연간 화면 활동 미연결 | 대기 |
| W24 | 두 조건 연결 | 기존 5192 어댑터 | 기존 W24만 사용 | 기존 코드·질문·저장 그대로 | 기존 승인과 신규 링크 검토 구분 |
| W48 | 두 조건·6연령·8쪽 연결 | 차단 | asset-pending | content-pending | 대기 |
| 나머지 45편 | 설계 카탈로그 | 시작 버튼 없음 | 미검수 | 추가 연결 필요 | 미실시 |

W01과 W48에 구텐베르크 이미지·질문을 대체 사용하지 않았다. 새 PASS 과제나 역사 해석을 임의 확정하지 않았다. W01의 기존 엔진 단위 테스트 통과와 실제 앱 실행 가능 여부는 다르다.

## 다국어·기록

공식 범위는 중앙 HISTORY 등록의 11개를 그대로 읽는다. ko만 release, zh blocked/reviewRequired, 나머지 planned. 추가 언어 자동 번역·zh 코드 변환은 없음.
명시 URL locale와 연동 프로필 locale, 저장 locale을 존중한다. 미지원 언어의 한국어 fallback은 없다. 오류 시 선택 언어의 최소 안내가 없으면 native-name 언어 선택으로 돌아가며 사용자 기록을 지우지 않는다.
연간 화면은 수행 결과를 새로 만들지 않는다. 기존 W24 결과에 locale/contentVersion을 소급 추가하지 않았다. 새 미션 저장 엔진은 이번에 구현하지 않았다.

## 기술 검증 결과

- 생성: 48 미션 / 96 조건 / 576 연령 행 / 768 책 매핑 / 보호된 기준 파일 10개 해시 일치.
- 연간 단위 테스트 6건 통과: 행·ID·조건·버전·기제·출처·연령·책, W01/W48 차단, W24 origin/query, locale 선택·누락, 빌드 금지 문구 누출.
- 연간 TypeScript noEmit 및 production build 통과.
- 기존 W24 전체 테스트 299건 통과, TypeScript noEmit 통과. PASS 4영역·이유 건너뛰기·복구·비교·resultId 관련 테스트 포함.
- 자동 브라우저: 1440×900 / 768×1024 / 360×800. 48카드·W24 링크 하나·W48 차단, 가로 overflow 0, 콘솔 오류 0, dialog Escape/포커스 복원, 언어 오류 후 테스트 기록 보존.
- 캡처: qa/annual-desktop.png, qa/annual-tablet.png, qa/annual-mobile.png. PC/모바일 캡처를 직접 시각 검토.
- internal-qa HTTP 접근 404. 생성 JSON과 production JS에 금지 문구 원문 및 내부 QA 필드 누출 없음.
- 기존 5192 첫 화면 응답과 버튼 렌더링 확인. 모든 PASS 실제 화면을 이번에 다시 완주한 것은 아니다.
- QA 대상은 새 브라우저 프로필이며 기존 사용자 데이터를 테스트에 사용하지 않았다.

## 보존 검증

qa/preservation.json 참조.
- cede993의 HISTORY 추적 파일 836개: Git diff 변경·삭제 0.
- 이전 PC 보호 목록 실제 1,014항목: 과거 해시 일치 253, 차이 30, 현재 복구본에 미존재 731.
- 과거 해시 차이와 미존재는 이번 변경으로 발생한 것이 아니다. 이전 목록 전체가 복구됐다고 표시하지 않는다.
- 숫자 1,147을 재사용하지 않았다.

## 남은 문제 / 검수 경계

- 공통 검사기 자체 self-test 17건 통과. 공통 브랜치 전체 audit는 FAIL(오류19/경고24): 기존 main 파일 누락1, 레거시 부적합15, HISTORY pack·RTL·font 증거 미연결3.
- HISTORY 중앙 등록만 대상으로 한 공통 audit도 오류3/경고2로 FAIL이다. 새 연간 화면 검사를 HISTORY 전체 pack 및 W24 화면의 공통 규칙 준수 완료로 확대하지 않는다.
- 새 연간 앱의 안정 키/차단/저장 보존은 검증했지만 HISTORY 전체 release pack·RTL·폰트 증거를 중앙 검사기에 연결하는 작업은 남아 있다. W24 기존 하드코딩을 이번 어댑터 단계에서 전면 변경하지 않았다.
- W01·W48의 승인 이미지, 활동 자료, W48 출처 상세·의미 원본, 사용자 검토가 필요하다. 기존 OPEN P1 27/P2 9를 임의 종결하지 않는다.
- 실제 휴대기기, 화면낭독기, 터치펜, 다른 노트북 접속, 인쇄/PDF는 이번 새 연간 화면에서 미검수.
- 교육 활동 적합성·역사 고증·번역 원어민 검수는 기술 테스트와 별개다.
- 상태: 연간 목록/호환 연결 기술 검증 완료, 사용자 화면 검토 대기. 48편 실행 완료·W24 동결·W01/W48 승인 완료 아님.

## 재검사 명령

1. node scripts/generate-catalog.mjs
2. npm run build
3. npm test
4. node scripts/serve.mjs (5193가 비어 있을 때만)
5. node scripts/browser-qa.mjs
6. node scripts/verify-preservation.mjs

기존 W24 테스트는 이 worktree의 nuvia-history-w24/outputs/NUVIA_HISTORY_REPRESENTATIVE_6_v1.0_DRAFT에서 npm test 및 npm run typecheck.
기존 서버 worktree에서는 실행·빌드·파일 수정을 하지 않는다.
