# NUVIA PLANNER 공통규칙과 상황 라이브러리

필굿 공통규칙 저장소의 플래너 전용 설계 패키지다. 기존 플래너 실행 코드, 검사 결과지, 점수 산식과 공개 배포본은 변경하지 않는다.

- [플래너 라이브러리 설계](PLANNER_LIBRARY_DESIGN.md)
- [대표 상황카드 전체 목록과 수량](SCENARIO_CATALOG.md)
- 데이터: `library/manifest.json`, `behaviors.json`, `job-contexts.json`, `cards.json`, `locales/ko.json`
- [개발자 데이터 계약](library/contracts.ts)
- [검수 결과와 구현 전 확인사항](QA.md)
- 검증 명령: `node docs/programs/nuvia-planner/library/validate.mjs`

논리 저장 위치는 **필굿 공통 라이브러리 → 플래너 라이브러리**, namespace는 `feelgood.planner`다. 현재 GitHub 규칙·초기 콘텐츠 패키지이며 운영 DB/API 및 플래너 화면 연결은 후속 개발이다. Git에는 개인 과제·검사 결과·메모를 저장하지 않는다.

초기 원본은 일상 적용형 6개와 직무 상황형 6개, 총 12개다. 6개 대표 직무 맥락별 상황카드는 각각 1개다. 각 맥락에는 공통 일상카드 3개를 연결하며, 연결 18건을 원본 18개로 세지 않는다. 연령·언어·개인화 도움만 바꾼 경우도 원본 수를 늘리지 않는다. 모든 카드는 검토 전 초안이며 운영 제공 카드는 0개다.
