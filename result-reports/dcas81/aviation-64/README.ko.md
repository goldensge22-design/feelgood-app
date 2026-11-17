# D-CAS 성인 항공 전공·직무 한국어 패치

## 사용 범위

- 결과지: `../unpacked/APPLIED_FULL/DCAS_ADULT/adult.work.html` 및 같은 폴더의 항공 catalog/locale/jobs 파일.
- 기존 항공보안학과의 추정 직무 10개와 개인별 TOP5 계산은 유지한다. 이 패치의 18개 항공보안 관련 직무는 **순위와 별도인 탐색 목록**이다.
- 항공교통물류학과 29개, 항공외국어학과 20개, 공항행정학과 29개의 관련 직무를 선택 학과에서 한국어로 모두 보여준다. 네 학과의 고유 직무는 총 64개이고 학과 연결은 96건이다. 이 64개에 임의 PASS 요구점수나 적합도를 부여하지 않는다.
- 강의 슬라이드에서 확인한 추가 산업 직무 15개와 일반 준비 역량 9개는 학과별 추천과 별도의 공통 탐색 영역으로 표시한다. 출처와 해석 한계는 `lecture-supplement.ko.json`에 기록했다.
- 기존 15개 언어의 5개 직무 예시 번역은 보존한다. **64개 전체 직무와 강의 보충 자료의 새 화면은 한국어만 완료**되었다. 다른 언어에서 64개가 번역 완료된 것으로 표시하지 않는다.

## 자료 계약

`dcas-aviation-jobs-ko.js`는 정적 자료이며 `window.DCasAviationJobProfiles`로 제공된다. 생성기는 `../../tools/build-aviation-jobs-ko.mjs`다. 원천은 LAB의 competency catalog 버전과 한국어 직무 라벨이며, 생성 결과 안에 각각 SHA-256이 남는다. 원본 5.6 MB catalog는 이 결과지 저장소에 중복 복사하지 않았다. `lecture-supplement.ko.json`에는 PDF 자체 대신 페이지별 출처 정보와 추가 항목만 기록했다.

서버 연결 시 선택 학과의 `value`(예: `항공교통물류학과`)를 기존 `PROFILE.majorName`에 전달하면 된다. 직무 프로필 ID는 `DCasAviationCatalog.getCareerContext(majorName).profileIds`로 조회할 수 있다. `mode: exploration-unranked`는 개인 순위·적합도 아님을 뜻한다. 항공보안학과는 기존 `mode: existing-interim-ranking`과 TOP5를 보존한다. 실제 서버 점수·사용자 식별·결과 저장 계약은 변경하지 않았다.

## QA

`node result-reports/tools/verify-aviation-korean-browser.cjs`는 실제 HTML을 Chrome에서 열어 360/768/1440px 전공 선택, 직무 29/20/29건, 항공보안 TOP5+18건, 추가 직무 15건, 일반 역량 9건, 15개 언어 전환 시 기존 번역 예시 보존, 가로 넘침, 콘솔 오류와 PDF 생성 여부를 확인한다.

추가로 `node result-reports/tools/adult-aviation-jobs.test.cjs`, `node result-reports/tools/validate-reports.mjs`, `node result-reports/tools/validate-report-locales.mjs`를 실행한다. PDF 생성 확인은 시각적 교정·서버 인쇄 설정 검증을 대신하지 않는다.

## 운영 반영 경계

이 GitHub 후보본은 운영 서버의 `reportV2DcasAviationCatalog.js` 또는 서버가 전달하는 전공 옵션의 원본이 아니다. 운영 코드에서 세 전공을 등록하고 한국어 직무 자료를 로드한 뒤 실제 사용자 결과지로 재검수해야 한다. 기업LAB은 별도 저장소이며 이 결과지 패치만으로 기업 카드가 운영 화면에 반영되지 않는다. `lecture-supplement.ko.json`의 회사 7곳과 일반 역량은 LAB의 정체성/출처 계약을 따라 별도 연결한다.

운영 서버의 두 JS 파일 로딩 순서와 필수 검수 항목은 `SERVER_INTEGRATION.ko.md`에 정리했다.
