# 운영 성인 D-CAS reportV2 연결 지시서

운영 서버의 `reportV2DcasAviationCatalog.js`는 정적 결과지와 파일명이 다르다. 이 저장소의 `DCAS_ADULT/adult.work.html`만 배포해도 `service.feel-good.io` 결과지는 바뀌지 않는다. 운영 소스 저장소·배포 파이프라인은 아직 이 GitHub 저장소에 확인되지 않았다.

## 개발자가 적용할 파일

1. `../unpacked/APPLIED_FULL/DCAS_ADULT/dcas-aviation-jobs-ko.js`를 운영 결과지의 정적 JS 자산에 추가한다. 64개 직무와 96개 학과 연결, 강의 직무 15개와 공통 역량 9개의 **한국어 탐색 자료**다.
2. 같은 폴더의 `dcas-aviation-catalog.js`를 현재 운영 `reportV2DcasAviationCatalog.js`와 비교해 교체한다. 운영 고유의 다른 패치가 있으면 지우지 말고 이 파일의 `majorOf`, `ensureMajorOptions`, `render`, `beforeRender`, `refreshNavigation` 계약을 합친다.
3. 스크립트는 기존 `reportV2DcasAviationCatalogLocales.js` 다음, 성인 결과지 엔진 실행 전 순서로 **jobs-ko → catalog**를 로드한다. `window.DCasAviationJobProfiles`가 없으면 새 64개 목록은 표시되지 않는다.
4. `majorSelect`의 선택 `value`를 `PROFILE.majorName` 또는 현재 선택값으로 유지하고, 변경 후 기존 결과지 렌더 함수를 호출한다. 후보 코드의 `majorOf()`는 서버처럼 `PROFILE.majorName`이 없는 경우에도 선택값을 읽는다.
5. 기존 항공보안 10개 임시 추정 직무와 TOP5 계산은 유지한다. 새 18개 항공보안 직무와 강의의 15개 직무는 별도 **무순위 탐색 목록**이다. 3개 신규 전공의 29/20/29개도 개인 적합도 퍼센트로 변환하지 않는다.
6. 재직중 선택 시에는 기존 직무 전환 흐름을 유지한다. `workContext.status === 'employed'`일 때 이 전공 탐색 레이어가 직무 매칭을 덮어쓰지 않는다.

## 실제 서비스 검수

- 인증된 테스트 결과에서 세 전공 선택지가 나타나고 선택값·이름·점수·현재 언어가 유지되는지 확인한다.
- 한국어에서 신규 전공별 29/20/29개, 항공보안 기존 TOP5와 별도 18개, 강의 공통 15개·9개가 보이는지 확인한다.
- 기존 15개 언어에서는 검증된 5개 예시를 유지하고 새 한국어 목록이 섞이지 않는지 확인한다. 새 목록의 15개 언어 번역은 후속 단계다.
- 360px 모바일, 데스크톱, 실제 서비스 PDF에서 잘림·인쇄 누락·뒤늦은 엔진 덮어쓰기가 없는지 확인한다.
- 실제 서버 반영 commit, 배포 시각, 인증된 URL, QA 결과를 별도로 남긴다. GitHub 브랜치/PR 존재만으로 운영 반영 완료라고 보고하지 않는다.
