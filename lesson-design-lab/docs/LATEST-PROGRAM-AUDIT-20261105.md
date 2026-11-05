# 최신 프로그램 대조와 설계 반영 근거

확인일: 2026-11-05. 개발 인계 소스·규칙·패치를 확인한 기록이다. 운영 서비스 전체의 실계정 연동 시험이나 모든 프로그램의 QA 완료 선언이 아니다. `app/`은 규칙 1.5의 검증된 소스이며, 이번 추가 설계는 `LESSON-DESIGN-1.6.md`에 분리한다.

## 최신 자료와 적용 판단

| 프로그램 | 확인한 최신 근거 | 수업에 반영할 기능 | 구현·운영 경계 |
|---|---|---|---|
| 교사용 수업설계LAB | Replit 11월 5일 인계 ZIP, 앱 src SHA-256 `c06dfd24242583357aa8aeca91f2f3c6ab86f25a01ca113264961bffa6488e74` | 18개 수업, 36종 활동지, 유형별 지원, 개별 출력, 시간표, 결과지 이력, V1→면담→V2 | 브라우저 로컬 앱. 564개 검사 통과는 이 앱의 기술 검사 범위 |
| 결과지 | [main 인계](https://github.com/goldensge22-design/feelgood-app/blob/main/result-reports/MAIN_HANDOFF.md), [D-CAS 계약](https://github.com/goldensge22-design/feelgood-app/blob/main/result-reports/dcas81/DCAS_RESULT_DATA_CONTRACT.md), [재직자 패치](https://github.com/goldensge22-design/feelgood-app/blob/main/result-reports/dcas81/work-context/DEVELOPER_HANDOFF.md) | PASS 네 점수·척도·원래 유형, TOP5 순위와 사유, 검사 버전 보존. 학생/취업준비/재직/미정 상황 구분 | D-CAS 정답률과 K-PASS 표준점수를 혼용하지 않음. 495개 재직자 직업 목록은 추천 규준이 아님. 운영 저장 API 별도 |
| 플래너 기본 흐름 | `NUVIA_PLANNER_FINAL_RULES_v3.0.md`, Studio 인계, 라이브러리 패치 인계 | 계획→한 가지 실행→중단 깃발→복귀→실행 종료/과제 완료 구분→시간 조정. PASS는 실제 행동 도움에 적용 | 규칙 문서의 예정 기능과 현재 소스를 구분. 실제 결과지·서버 연결은 별도 |
| 플래너 생활·직무 라이브러리 | `codex/nuvia-planner-library-integration`, `nuvia-planner/docs/PLANNER_LIBRARY_INTEGRATION_HANDOFF_2026-10-23.md`; 로컬 `.planner-career-review-qa15`의 소스와 문서 | 청소년 26·성인 311 목록에 상황/일상 카드 연결, 기존 과제·실행·기록 활용 | 원본 카드 162개와 2,022개 연결을 서로 다른 카드 수로 합산하지 않음. 문서상 정식 승인 카드 0개, 한국어 검토 모드. 후속 Replit 공개 교체 QA는 일부 미완료이므로 출시 완료로 안내 금지 |
| 플래너 결과지→경험 소재 검토판 | `STUDIO_CAREER_REVIEW_HANDOFF.md`, `career-review/model.ts`, 최신 QA15 인계 | 원본 보고서 버전, 계획 revision, 실행 당시 계획, 확인된 경험 버전, 선택 문장만 내보내기 | 별도 검토 화면/저장소. 기존 Studio·AI자소서 서버로 실제 전송된다고 표현 금지. 성인 전용 계약을 청소년에 그대로 사용 금지 |
| 중고생 진로탐색LAB | [비공개 소스](https://github.com/goldensge22-design/career-exploration-lab), 로컬 인계 `artifacts/career-lab/src/pages`와 최신 v3 overlay | 나 이해하기·흥미·학과 탐색·설계·플래너 실험·경험·성장 이야기. 학과의 배우는 내용/교육과정 비교 | 기존 페이지의 내장 플래너와 공통 플래너 연결은 동일 기능이 아님. 최신 개인 워크북은 별도 추가 모듈 |
| 기업·직무탐색LAB | 10월 24일 인계 `routes/lab.ts`와 [11월 5일 v3 PR #1](https://github.com/goldensge22-design/dcas-company-job-lab/pull/1) | 기업·직무·업무·필요 역량·출처 탐색, 개인 조사 워크북, 2~3개 비교, 선택 이유, 선택 활동만 플래너 등록 | 기존 캠프 참여·인증 제한 유지. 일반 교사에게 전역 운영자 권한을 주는 방식은 사용하지 않음 |
| AI자소서 | 현재 인계 `pages/connections,experiences,questions,write,versions,export` 및 v3 overlay | 문항/글자수/작성언어, 선택 경험·직무 기준, 원본 출처, 버전, 준비 팁과 초안의 분리 | 원본 경험과 조사 맥락을 분리. 외부 AI bridge 미설정은 연결 대기/오류이며 가짜 성공 문장 금지 |
| 공통 흐름 v3·My NUVIA | [최신 패치 폴더](https://github.com/goldensge22-design/dcas-company-job-lab/tree/codex/classroom-flow-v3-handoff/integration), `API-CONTRACT.md`, `DESIGN-STATUS.md`, `contracts.mjs` | 직접 탐색→학생 선택→플래너 실행·회고→사실 확인·선택 동의→AI 팁/초안. 중고생은 성장 이야기, 대학생은 취업 준비 우선 | 38개 기능 검사와 15언어 화면 검증은 해당 패치 범위. 운영 로그인·DB·프로필·AI 연결 및 My NUVIA 호스트 장착은 개발자 작업 |
| 학교/반/학과 대시보드 | [학교 데이터 계약](https://github.com/goldensge22-design/feelgood-app/blob/main/school-dashboard-demo/RESULT_DATA_CONTRACT.md), `dashboard-runtime-config.js`, `result-data-adapter.js` | 담당 학교·반·학과 범위 명부와 검사 ID/회차를 선택해 과정 구성 | sample 기본값. live 설정/transport가 존재해도 운영 연동 완료는 아님. 상담 로컬 저장을 서버 상담기록으로 간주 금지 |
| 기업 대시보드 | [공개 인계](https://github.com/goldensge22-design/feelgood-app/blob/main/enterprise-demo/README.md), `enterprise-dashboard/data-adapter.js`; AI자소서 기업 공유 최신 결정 | 학생 수업에는 공개 허용된 기업/직무/업무역량 자료만 참고. 기업별 HR 과정은 후속 | 직원 성과·지원자 평가·조직 분석은 학생에게 자동 전달하지 않음. adapter의 누락 모델 MOCK 보완을 실제 기업 기준으로 사용 금지 |

관련 비공개 프로그램 소스는 이 공개 폴더로 복제하지 않았다. 링크와 계약상 필요한 설계만 기록한다. 위 문서와 해당 소스 진입점을 대조했지만 프로그램 모든 파일/화면의 전수 검증을 주장하지 않는다.

## 이번에 발견한 충돌과 수정할 설계

1. **자동 TOP5 카드 생성 규칙 폐기:** 최신 v3는 결과지 선택적 참고, 직접 탐색, 학생 선택 후 등록이다. 교사의 후보 추천·활동지 사전 출력과 학생 플래너 등록은 별개 동작이다.
2. **학교 PASS와 교사 앱 점수:** 학교 adapter의 표준점수 허용 범위는 40~200, D-CAS는 0~100 정답률이다. 숫자 범위로 검사 종류를 추정하거나 100점으로 환산하지 않는다. 검사종류·척도·원본 해석을 함께 전달한다.
3. **TOP5 계약 부족:** v3 결과지 참조 bridge의 `topJobs[{label,reason}]`만으로는 원래 rank·빈 순위·직무 ID를 완전히 보존하지 못한다. 이 bridge를 교사 결과 요약의 완전한 원본으로 쓰지 말고 별도 무손실 계약을 확정한다.
4. **교사 열람 범위:** v3 교사 progress는 건수와 피드백만 제공하고 검사·회고·자소서 본문을 반환하지 않는다. 교사 앱의 로컬 본문 화면을 실서버에 연결하려면 담당 수업 권한과 별도의 제출/열람 범위를 설계해야 한다.
5. **자동 조 편성:** 구형 수업 설정에는 `proposeGroups`와 `group-editor`가 실제 존재한다. 관심 미션/다양한 방법/유사한 지원 목적과 정원·고정 배치를 지원한다. 새 과정 Studio의 장기 공동 과제 화면과 이 제안 엔진의 연결은 따로 보완해야 한다. ‘전체 미구현’ 또는 ‘모든 과정에 연결 완료’ 둘 다 부정확하다.
6. **카드 라이브러리 승인:** 수량이 많아도 승인되지 않은 자료는 배부 후보로 자동 선택하지 않는다. 교사 검토와 대상/언어/수업 여건을 확인한다.
7. **자소서 기업 공유:** 최종 검토·내보내기 이후 별도 선택 단계. 등록된 기업+지원자 등록 건, 기본 30일/선택 90일, 확정된 직무 업무역량 모델 버전이 최신 결정이다. 이는 수업 이수 조건이 아니며 실제 구현 확인은 남아 있다.
8. **기업의 근거 확인률:** 실제 공유 행동을 담당자가 검토한 기준 수/전체 기준 수. PASS·모의활동·조사 내용 합산 금지, 자료 없음·검토 중은 0%가 아닌 별도 상태. 본 수업 앱에서 채용 적합도를 새로 계산하지 않는다.

## 재현 가능한 확인 기준

- 결과지 문서 blob: main 인계 `226883f8564fe8c0c3c70a8a18b6706a8ec298bd`; D-CAS 계약 `d85a4effbae994f8c06343cf9bbd785374663e33`; 재직자 인계 `65ecc5bd8083ad502586ca17b33c876b9af9c443`.
- 학교 계약 blob `f2b80d9f23e5e4f198f079a9ab6f9930402f2e23`; adapter `b76cd524f3953f935a09c8d2a9e7722429d927b9`.
- 기업 adapter blob `79c6732a4d9eba7524a3a6d3021ebe3ab23e667c`.
- 수업설계LAB 인계 ZIP SHA-256 `ce14537caf83c57960aec1ff8eb3ea05a53eea0d3faaebce6448e1d96d7dd7f7`; 전체 내용 해시는 `app/SHA256SUMS.json`.
- 설계 요구를 추가해도 위 앱의 기존 QA를 새 설계 전체 통과로 재사용하지 않는다.
