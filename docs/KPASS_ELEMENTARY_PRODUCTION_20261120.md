# K-PASS 활동 저장 → 초등 플래너 운영 검증

검증일: 2026-11-20 (KST). 범위: K-PASS 초등 진입, 결과지 활동 저장 후 연령별 이동, 초등 작업대 중복 진입점 제거.

**2026-11-21 추가 발견:** 사용자 Chrome의 구분값 없는 이전 경로에서 일반 MY NUVIA로 이동했다. 아래 11-20 검증은 새로고침한 정상 링크와 별도 로그인 검수 계정의 범위이며, 이전 링크/모든 사용자 세션의 성공 증거가 아니다. 재발 방지 기준은 [전체 경로 계약](ROUTE_DESTINATION_CONTRACT.md)이며 누락값 복원·확정 전 이동 차단을 추가 검수한다.

## 운영 기준선

| 대상 | 배포 브랜치 / commit | 배포 증거 |
| --- | --- | --- |
| FEELGOOD-Co-LTD/nuvia | main / `650dfa8d25e4c050a4201b3479b8e582a941d8fd` | [Actions 44751507131](https://github.com/FEELGOOD-Co-LTD/nuvia/actions/runs/44751507131), verify·이미지 빌드·운영 교체 SUCCESS |
| FEELGOOD-Co-LTD/Feelgood_Backend | master / `9a59ba08e642228f34d0416213dc94ce3dcd89bc` | [Jenkins #818](https://deploy.feel-good.io/job/feelgood-backend/job/feelgood-backend-prod/818/), SUCCESS, 6분 17초, revision 일치 |

백엔드 `master` push는 Jenkins 운영 배포다. 결과지 자료 저장소의 `main`과 혼동하지 않는다. 두 구현 저장소의 작업 브랜치는 `codex/kpass-planner-direct-20261120`이다.

## 원인과 수정

- K-PASS 일반 플래너 링크에 초등 구분값이 없었다. 국내·해외 결과지 모두 기존 활동 엔진의 연령 규칙을 재사용해 `elementary_1_3` 또는 `elementary_4_6`을 전달한다. 점수 판정 기준은 변경하지 않았다.
- 이전 NUVIA 배포 `7fd3702` / Actions `44744261015`는 초등에도 고정 LAB/자소서 SSR 메뉴를 요구하던 LAUNCH-3 테스트에서 실패했다. 새 테스트는 빈 SSR 마운트와 실제 연령별 DOM 검수를 구분한다.
- 최초 Replit 이식본 이후 작업대 중복 버튼 제거 변경이 운영에 누락됐다. 최신 원본 DOM·QA 증거와 대조해 해당 제거 수정만 반영했다. Replit 전체 소스 최신화로 확대 해석하지 않는다.
- 초등 작업대 내부 박물관·정원·월간 바로가기와 중복 rail, 외부 서비스 바를 제거했다. 상단 작업대/경험 박물관/나의 정원 및 기존 기록은 유지한다.
- 결과지 활동 저장 후 초등은 플래너, 중고등은 school MY NUVIA, 대학생/성인은 adult MY NUVIA로 이동한다. D-CAS의 모든 일반 footer 링크를 변경했다는 뜻은 아니다.

## 운영 브라우저 확인

로그인된 실제 K-PASS 원본을 새로고침하고 원본 버튼을 직접 눌렀다. URL을 수동 수정해 성공한 것으로 대신하지 않았다.

1. K-PASS 일반 플래너 버튼 5곳의 `age=elementary_1_3` 전달 확인.
2. 예술 활동의 **플래너에 담기 → 확인하고 저장**을 실제 클릭했다.
3. 이름 선택란과 별도 체크박스 없이 저장 후 초등 작업대로 자동 이동했다.
4. 작업대의 할 일 선반에 **함께 노래하기**가 표시됐다. 선반 표시 건수는 1이었다.
5. 새로고침 및 별도 새 탭에서도 활동이 유지됐다. 일반 **플래너 열기** 버튼도 초등 화면으로 이동했다.
6. 실제 DOM의 외부 서비스 링크와 제거 대상 중복 진입점은 0개. 상단 공간 메뉴 3개는 유지됐다.

운영 검수 계정에는 플래너용 검사 결과가 연결되지 않았다는 안내가 남아 있다. 이번 확인은 **활동 저장·초등 화면 이동**이며, 해당 계정의 검사 점수/결과지 연결까지 완료했다는 의미가 아니다. 개인 결과지 URL, 인증 토큰, 사용자 ID와 검사 점수는 이 문서에 저장하지 않는다.

## 운영 정적 파일 일치

`https://service.feel-good.io/javascript/`의 아래 파일 모두 HTTP 200이며 CRLF/LF 정규화 후 배포 소스와 일치했다.

| 파일 | SHA-256 (줄바꿈 정규화) |
| --- | --- |
| reportV2ActivitiesUi.js | `b3bea7dece865817526e176667fd383041c4bc7d01e6dce4fad3a4092d949c47` |
| reportV2ActivitiesLocales.js | `34072b25a4124232daed78dbb363cc959e558daed45b653bafc7aba0fae5096c` |
| reportV2Navigation.js | `1c8230f304cd7d65411f13d4c6aaf17c0369d2086c204977623f1a134f28734f` |

운영 K-PASS HTML의 activity cache tag는 `20261120-audience-home`, navigation tag는 `20261120-elementary-entry`다. 이미 열린 옛 결과지는 원본을 새로고침한 후 버튼을 다시 눌러야 새 코드를 사용한다.

## 사전 QA와 한계

지원 15개 언어: ko, en, ja, zh-CN, zh-TW, mn, th, vi, ar, ru, km, es, fr, it, az.

- 플래너 단위 374개, shell 단위 93개, shell E2E 75개 통과. 인증/저장 E2E를 명시적 로컬 URL로 실행했다.
- 국내·해외 K-PASS × 초등 2단계 × 15언어 = 60개 실제 HTML 합성 데이터 경로. 선택→저장→이동→표시→새로고침→새 브라우저 세션 복원, 중복 요청·계정 격리 확인.
- 청소년·성인 MY NUVIA 30개 경로, 최종 재검수 브라우저 오류 0건. 초기 hydration 오류는 수정 후 영향 범위를 다시 검수했으며 초기 실패 기록을 보존했다.
- 초등 90개, 수신 화면 45개, MY NUVIA 최종 90개 반응형 화면 확인. PC/태블릿/360px, 언어 전환·상태 보존·RTL·복합 문자 확인.
- 수신 화면 PDF 15개, MY NUVIA PDF 30개 및 D-CAS 변경 활동 영역 실제 PDF 버튼 30개 확인. 빈 페이지/잘림 오류 수정 후 재검수했다. 성인 영어 첫 PDF 시간 초과는 재실행 성공과 함께 기록했다.
- 백엔드 3,645개 프로필/locale 사례, 60개 활동 동작 및 K-PASS 일반 navigation 90개 화면 검사 통과. 기존 번역 138개 보존, 신규 2개 key만 15언어 추가.
- 기존 루트 정적 i18n 등록 검사 통과. strict changed 검사에는 범위 밖 school-dashboard의 기존 76개 후보가 남아 있어 전체 저장소 strict 통과로 보고하지 않는다.
- 기계번역 기술 QA이며 원어민 검수를 의미하지 않는다. 로그인된 운영 원본 종단 검수는 위 K-PASS 한국어 경로이며, 15언어 전체 운영 개인 결과지 검수 또는 전체 제품 다국어 완성을 의미하지 않는다.

근거 파일:

- [NUVIA 검수 자료](https://github.com/FEELGOOD-Co-LTD/nuvia/tree/650dfa8d25e4c050a4201b3479b8e582a941d8fd/docs/qa/report-audience-20261120)
- [백엔드 검수 자료](https://github.com/FEELGOOD-Co-LTD/Feelgood_Backend/tree/9a59ba08e642228f34d0416213dc94ce3dcd89bc/Docs/qa/report-audience-20261120)
- [최신 원본 대조·배포 보호 규칙](UPSTREAM_RELEASE_SYNC_RULES.md)

정책은 앞서 확정한 규칙을 구현한 것으로 추가 변경 없음. 이번 기록은 Git push, CI 성공, 운영 파일 일치, 실제 클릭·저장·복원을 구분해 남긴 운영 증거다.
