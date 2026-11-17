# 운영 성인 D-CAS: 신규 3개 학과 TOP5 적용

이 문서는 이전 무순위 진로 탐색 지시서를 대체한다. 기존 TOP5를 탐색 목록으로 대체하지 않는다.

## 백엔드 배포 경로

사용자 제공 계약: 백엔드 `master` push는 Jenkins 운영 자동 배포, `devel` push는 개발 서버 자동 반영이다. [백엔드 배포 규칙](../../../docs/BACKEND_DEPLOYMENT_RULES.md)을 먼저 읽는다. 이 결과지 저장소의 `main`과 백엔드 `master`를 혼동하지 않는다. 백엔드 remote와 CI/CD 상태를 확인하고 적용하며, AWS 직접 접속 권한 부족만으로 Git/Jenkins 배포가 불가능하다고 판단하지 않는다.

## 전달 파일

result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_ADULT/ 아래의 파일을 운영 reportV2 소스와 대조한다.

- dcas-aviation-jobs-ko.js: 학과별 후보 ID·명칭 자료(기존 64개/96개 연결)
- dcas-aviation-ranking.locales.js: 신규 한국어 문구와 언어별 미완료 상태
- dcas-aviation-ranking.js: 신규 3개 학과의 직무 모델·추정 출처·명칭·학과 요구치 등록
- dcas-aviation-catalog.js: 3개 학과 옵션 등록 및 TOP5 덮어쓰기 제거
- dcas-job-engine.js: mode major-ranked 학과의 실제 후보를 기존 computeFit으로 정렬
- dcas-adult-content-engine.js: 신규 학과 요구치와 계산 연결; rankedJobs를 기존 역량·실행계획·LAB 전달에 재사용
- dcas-lab-top5.locales.js, dcas-lab-top5-bridge.js: TOP5 서버 전달 계약; nuvia.feel-good.io/lab/company/ 이동 허용
- adult.work.html: 정적 후보본의 참조 로딩 순서. 이 HTML 자체가 운영 서버 템플릿을 대체하지는 않는다.

## 로딩·연결

기존 aviation locales → jobs-ko → aviation catalog → LAB locales/bridge → job engine → major requirements → jobs-major47 → aviation ranking locales → aviation ranking → adult engine 순서를 유지한다. 운영 파일명이 reportV2로 달라도 각 글로벌 계약은 동일해야 한다. 기존 운영 패치를 통째로 덮어쓰지 않는다.

각 학과의 resolve().mode는 major-ranked다. rankJobsForMajor의 조기 null 반환과 항공보안학과로 일괄 치환을 신규 학과에 적용하면 안 된다. 신규 후보는 DCasAviationRanking.getJobs(학과명)에서 얻으며 각각 29/20/29개다. applyJobs가 만든 같은 rankedJobs로 카드·역량·실행계획·LAB을 갱신한다. 상태를 바꾼 뒤 캐시된 과거 TOP5를 전송하면 안 된다.

운영 서버의 DCasMajor47 또는 대응 47개 학과 JOB_POOL이 없으면 ranking의 추정 원본 템플릿을 함께 이식해야 한다. 없는 템플릿을 임의 기본 점수로 대체하지 않는다. 브라우저 로드 오류를 반드시 확인한다.

## 실제 서비스 수용 검사

- 신규 3개 학과를 선택할 수 있고 각각 TOP5 카드 5개가 표시된다.
- 서로 다른 PASS 점수에서 실제 순위가 달라진다. 점수 부족·비정상이면 순위를 확정하지 않는다.
- 기존 항공보안 10개 후보·TOP5 및 일반 학과와 재직중 흐름을 보존한다.
- 화면 TOP5 명칭·순서와 LAB 전달 envelope가 일치한다.
- 기존 사용자 기록을 보존하는 인증 서버 어댑터로 저장한 후 GET으로 재확인한다.
- 360px 모바일, PC, 실제 PDF에서 누락·덮어쓰기를 확인한다.

현재 GitHub의 HTML QA만 통과했다. AWS 배포·운영 LAB 저장은 미완료다. 새로운 3개 학과 직무의 전체 15개 언어 번역도 미완료다.
