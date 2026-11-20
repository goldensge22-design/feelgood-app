# FeelGood 백엔드 배포 규칙

기록일: 2026-11-17. 근거: 사용자가 이 채팅에서 전달한 백엔드 CI/CD 운영 정보.

## 최신 연결 검증 — 2026-11-19

- 백엔드 운영 `master`는 `0bcf6c662faa69a5b295434211ccd5a955b7112f`, Jenkins #808 성공. 개발 `devel`의 `f87625619`도 #2836 성공.
- 실제 로그인된 결과지 → 기업LAB 결과지 참조 → 플래너 context의 TOP5 명칭·순서가 일치하고, 항공보안 5개 직무의 unmapped=0을 확인했다. 기존 동점 순서 불일치와 프로필 연결 누락을 수정했다.
- 결과지 브라우저/서버 계약 205사례(62학과 및 항공보안 81조합)와 항공 3학과 243사례 통과. 운영 JavaScript 4개 파일은 줄바꿈 정규화 후 소스와 일치.
- NUVIA `main`에 `da0d844265bd7481ecebb0a65dcad74860cfcbf5`를 push했다. 기업LAB 홈이 인증된 결과지 TOP5를 자동 조회하고, 클릭하면 직무명 검색으로 연결한다. 수동 탐색 기록은 보존한다.
- 해당 NUVIA Actions run `44334551334`: verify·이미지 빌드·운영 교체 성공. 운영 홈에서 원본 TOP5 자동 표시를 확인했다.
- NUVIA 단위 테스트 86개 통과. 신규 TOP5 카드 15개 언어 × PC 1280px/모바일 360px 총 30개 DOM 검사에서 5개 직무·잘림·가로 넘침을 확인했고 오류 0건. 아랍어 RTL·크메르어 모바일 화면도 확인했다. 합성 fixture의 원본 직무명은 한국어로 보존했다.
- 위 신규 카드 검수는 전체 결과지·기업LAB 다국어 완료를 뜻하지 않는다. 기존 기업LAB 한국어 고정 설정과 항공 결과지 외국어 needs-review는 별도 작업이다.
- 강점 스토리보드 통합은 로컬 개발 중이며 이번 결과지 연결 배포에서 제외했다. 운영 배포로 오인하지 않는다.

## 최종 직무 이동 보완 — 2026-11-19

- 운영 클릭 QA에서 원본명 `항공보안검색요원`과 카탈로그명 `항공보안 검색` 차이로 검색 0건 발생을 발견했다.
- NUVIA main `b15199203c390eeee8bf6a6bdd128aea83f0aaa6`: 원본 profile_id를 보존해 실제 카탈로그 ID가 있으면 관련 직무 상세로, 등록된 항공 역량만 있으면 기존 daily 선택 화면으로 연결한다. 명칭·순위는 그대로, 자동 활동 생성·사용자 기록 덮어쓰기 없음.
- 단위 87개 및 shell/LAB 타입 검사, LAB 빌드 통과. 실제 컴포넌트 15개 언어 × 1280/360px 총 30개 DOM 검사 오류 0건. Actions 44337798193 verify·빌드·운영 교체 전체 SUCCESS. 운영 PC/360px에서 TOP5 자동 표시·새로고침·3종 직무 상세·보안 역량 선택 확인. 플래너 context의 순위 있는 5개와 명칭·순서 일치, unmapped=0. 비로그인 API는 401/no-store.
- 루트 등록 프로그램 i18n 검사는 통과. `--changed --strict-hardcoded`는 범위 밖 school-dashboard-demo 기존 변경에서 76개 후보로 실패했다. 이 결과를 NUVIA 번역 실패나 전체 i18n 통과로 바꿔 보고하지 않는다.

## 최신 접근·배포 상태 — 2026-11-18

아래의 최초 조사 당시 404/초대 미완료 기록은 이 절의 최신 상태로 대체한다.

- `goldensge22-design` 저장소 초대를 수락했고 backend Git 읽기·쓰기 권한을 실제 확인했다.
- 백엔드 원본 기능 브랜치: `codex/dcas-adult-major-top5-20261118`, commit `d255797dcc991c623ba1829eba994aa4694e3fbd`.
- 개발 `devel`: `a754a132dc104ce47cdef8eecd1fe4c6cc0851d5`, Jenkins #2835 성공.
- 운영 `master`: `d255797dcc991c623ba1829eba994aa4694e3fbd`, Jenkins #807 성공. 운영 `service.feel-good.io/javascript/`의 ranking/data/locales/catalog 4개 파일은 CRLF/LF 정규화 후 승인 소스와 일치한다.
- NUVIA TOP5 등록 프로필 연결: `FEELGOOD-Co-LTD/nuvia` main `bd052cadff64d55963cc10a7101be43bca307e5c`. Actions run `44251571158` 전체 검증·운영 이미지 배포 성공.
- 검증: 브라우저 계산 원본 243사례, 서버 JUnit 5개 테스트 메서드(243사례 포함), 학과 저장 순서·실패 후 재시도, NUVIA 단위 83개 및 타입·빌드 통과. 배포 CI 전체 verify 성공.
- 항공교통물류 29 / 항공외국어 20 / 공항행정 29 연결(고유 직무 55개). 기존 일반 학과와 항공보안 계산은 유지.
- 개인 운영 결과지 링크는 인증 토큰 만료로 새 링크가 필요하다. 로그인된 실제 개인의 결과지 ↔ LAB ↔ 플래너 TOP5 최종 대조는 아직 완료로 기록하지 않는다.
- 추가 발견: NUVIA 결과지 이동 route의 로그인 만료/반환 redirect가 컨테이너 주소를 사용한다. 같은 사이트 상대 redirect로 보완 검증 중이다.
- 한국어 우선 배포다. 새 항공 문구의 14개 외국어는 needs-review이며 전체 다국어 완료를 뜻하지 않는다.
- backend 자체 `AGENTS.md`와 `Docs/BACKEND_DEPLOYMENT_RULES.md`에도 master/devel 계약을 보존했다. 결과지 자료 저장소 main과 혼동하지 않는다.

AWS 키 수신·인증 및 실제 서비스별 조회 결과는 [접근 확인 기록](BACKEND_ACCESS_CHECK_20261117.md)을 먼저 확인한다. 키는 이미 PC에 저장되어 있으므로 다시 요청하지 않는다. EC2 조회 거부를 AWS 전체 접근 실패로 확대 해석하지 않는다.

## 브랜치와 배포 환경

| 백엔드 저장소의 브랜치 | push 이후 동작 | 대상 환경 |
| --- | --- | --- |
| `master` | Jenkins CI/CD가 실행되어 자동 배포 | 운영 서버 |
| `devel` | 자동 배포 | 개발 서버 |

2026-11-18 로그인된 Jenkins에서 운영 `feelgood-backend/feelgood-backend-prod`와 개발 `feelgood-backend/feelgood-backend-test`의 별도 job 및 아래 빌드의 브랜치를 확인했다.

## 다음 세션의 작업 규칙

- 백엔드 변경·push 전에 이 문서를 읽고 실제 저장소의 remote, 현재 브랜치, HEAD, 미커밋 변경과 해당 저장소의 AGENTS.md를 확인한다.
- `master`에 대한 push 또는 merge는 단순 파일 보관이 아니라 운영 배포를 유발하는 작업으로 취급한다. 현재 세션과 이전 대화의 배포 승인 범위를 확인하고 적용한다.
- `devel` push도 개발 서버를 변경한다. 기능 브랜치에서 수정·검증한 뒤 승인된 범위에서 개발 서버 반영과 운영 반영을 구분한다.
- 이 매핑은 **백엔드 저장소에만** 적용한다. `goldensge22-design/feelgood-app`의 `main` push가 운영 백엔드를 배포한다고 추정하거나 `master`와 같은 것으로 취급하지 않는다.
- 백엔드 Git 접근과 Jenkins 배포 경로가 확인되면 AWS 직접 접속 없이도 배포할 수 있다. AWS 관리 권한 부족만으로 Jenkins를 통한 배포까지 불가능하다고 단정하지 않는다.
- push 성공, Jenkins 빌드 성공, 실제 서버 반영, 운영 기능 검증은 각각 확인한다. 운영 URL에서 변경된 결과지와 필요한 연동을 확인하기 전에는 배포 완료라고 보고하지 않는다.
- 결과지 TOP5 → 기업 LAB → 플래너 연동은 코드 배포와 별도로 실제 인증 사용자 데이터의 저장·조회 및 화면 일치를 검증한다. 기존 데이터와 API 계약을 보존한다.
- 배포 실패 시 원인을 확인하고 기존 정상 배포본과 복구 절차를 따른다. 임의의 force push, reset, 서버 파일 덮어쓰기는 하지 않는다.
- 비밀번호, AWS 키, 토큰과 기타 인증정보는 이 문서나 Git에 기록하지 않는다.

## 확인된 정보와 남은 식별 정보

- 관련 운영 서비스: `https://service.feel-good.io` (사용자가 AWS 운영임을 안내).
- 백엔드 저장소: `https://github.com/FEELGOOD-Co-LTD/Feelgood_Backend` (2026-11-18 사용자 제공으로 확인). 기존 추정 후보와 같지만 이제 사용자에게 실제 위치를 확인받았다.
- Jenkins 주소: `https://deploy.feel-good.io` (사용자 제공). 2026-11-18 사용자가 직접 로그인했으며 로그인된 대시보드와 작업공간 읽기 접근을 확인했다.
- 2026-11-18 접근 확인: GitHub 연결 도구와 로컬 Git 인증 모두 위 저장소 조회에 404를 반환했다. 저장소 부재로 판단하지 않으며 현재 작업 계정의 비공개 저장소 권한 또는 연결 범위를 확인해야 한다. 브라우저 소유자 로그인과 CLI/연결 도구 인증은 별개다.
- 운영 job: `https://deploy.feel-good.io/job/feelgood-backend/job/feelgood-backend-prod/`. 조회 당시 최근 성공 #806, `origin/master`, SHA `6903b27823be999325eacb15224d7465c145f1f1`, 소요 6분 17초. GitHub Hook Log에서도 해당 master 변경 감지를 확인했다.
- 개발 job: `https://deploy.feel-good.io/job/feelgood-backend/job/feelgood-backend-test/`. 조회 당시 최근 성공 #2834, `refs/remotes/origin/devel`, SHA `3a2914d4e72f06af87b43b0e9318ef64776088ce`, 소요 9분 38초. 시작 사유는 GitHub push였다.
- 위 결과는 기존 빌드 이력이다. 이번 패치의 새 push·빌드·배포를 실행한 것이 아니며 현재 운영 반영 완료의 증거가 아니다. 개발 서버 URL과 복구 절차는 추가 확인한다.

## 2026-11-18 운영 결과지 소스 조사

- Jenkins 운영 job의 작업공간에서 `src/main/resources/static/javascript/reportV2DcasAdultV.js`, `reportV2DcasAviationCatalog.js`, `reportV2DcasAviationCatalogLocales.js`, `reportV2DcasAviationJobsKo.js`를 찾았다.
- `reportV2DcasAviationCatalog.js`의 VERSION은 `aviation-careers-2026-11-17.1`. `aviation-language`, `aviation-transport`, `airport-administration`은 여전히 `exploration-unranked`다.
- 해당 코드의 `render()`는 `pf-jobcards`를 `replaceChildren()`로 비우고 직무 목록을 넣으며 TOP5 제목·기술 영역·표지 안내를 탐색 문구로 바꾼다. 사용자가 지적한 TOP5 대신 진로 탐색 표시의 소스 근거다.
- 준비된 결과지 저장소 패치 PR #8의 학과별 TOP5 로직을 이 백엔드 구조에 맞게 이식해야 한다. 현재 master를 재빌드하는 것만으로 해결되지 않는다.
- Jenkins의 파일 보기 화면은 한국어 인코딩이 깨져 보였다. 원시 바이트 확인 전에는 실제 소스 파일의 한글 손상으로 단정하지 않는다.
- 작업공간 JavaScript ZIP 다운로드는 도구 시간 초과로 완료 여부를 확인하지 못했다. 검증된 로컬 소스 사본으로 취급하지 않는다.
- GitHub 작업 계정 초대는 사용자 응답상 아직 미완료다. Jenkins 로그인 성공을 로컬 Git 쓰기 권한 확보로 간주하지 않는다. 자격증명을 추출하거나 Jenkins 설정을 임시 배포 경로로 변경하지 않았다.

현재 이 문서는 결과지 작업 저장소에 보관한다. 백엔드 저장소가 식별되면 해당 저장소의 규칙 문서 또는 AGENTS.md에 이 계약을 연결하여 백엔드 세션에서도 읽도록 한다. 연결 전에는 다른 저장소의 세션이 이 문서를 자동으로 읽는다고 가정하지 않는다.


