# NUVIA HISTORY — 대표 미션 DRAFT

현재 범위: **Gate 3 W24 구텐베르크 실제 앱 구현·브라우저 검수**. 나머지 5개 대표 미션은 공통 모듈/콘텐츠 데이터 단계 그대로다.

- [Gate 3 구현·검수 보고서](docs/05_GATE_3_W24_IMPLEMENTATION_AND_QA.md)
- [실제 UI 12경로](docs/06_GATE_3_UI_COMPLETION_MATRIX.md)
- [OPEN 항목](docs/OPEN_ISSUES_GATE_3.md)
- Gate 1/2 이전 보고서는 docs에 보존했다.

실행 중인 프로덕션 앱: http://127.0.0.1:5188/?qa=1&age=preschool&mission=gutenberg

로컬 모의 프로필 URL이며 화면에는 연령/QA 문구가 없다. 연동 프로필이 없는 일반 URL에서 나이를 추정하지 않는다. 실제 연동은 sessionStorage의 `nuvia.linkedProfile.v1` 입력 인터페이스를 사용한다.

개발: `npm run dev:app` (5187). 앱 빌드: `npm run build:app` → `dist-app`. 프로덕션 미리보기: `npx vite preview --config vite.app.config.ts --host 127.0.0.1 --port 5188`.

기존 `npm run build`는 공통 라이브러리를 만든다. 5186의 tests/browser-harness.html은 실제 게임이 아닌 Gate 2 계약 검수 화면이다.

현재 node_modules는 이 컴퓨터의 기존 로컬 의존성 연결이다. 신규 AI SDK/서버를 설치하지 않았다. 모든 사용자 입력과 그림·녹음은 이 실행 주소의 브라우저 저장소에 남는다. 다른 주소/브라우저 프로필로 자동 이동하지 않는다.

실제 휴대전화·터치펜·Windows 인쇄 대화상자·실제 마이크·사전 안내 음성·실제 결과지 연동 검수는 보고서의 OPEN 항목을 따른다. 동결 구텐베르크의 과거 54/54를 새 앱의 검수 결과로 사용하지 않는다.

## 최신 비교 규칙 반영 — 2026-09-19

[W24 자유 표현 비교 검수](docs/12_COMPARISON_FREE_EXPRESSION_QA.md) 및 [공통 규칙 부록](../COMPARISON_FREE_EXPRESSION_RULE_v1.1_CANDIDATE/COMPARISON_FREE_EXPRESSION_RULE_v1.1_CANDIDATE.md)을 참조한다. 이전 Gate 3 보고서는 당시 버전의 검수 이력이다. 새 실행 버전은 mission 2.0.0 / content 1.1.0 / app 0.3.1. 기존 기록은 변환하지 않는다. 새 기록 시작: http://127.0.0.1:5188/?qa=1&age=preschool&mission=gutenberg&new=1
