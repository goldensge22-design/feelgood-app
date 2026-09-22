# FeelGood 결과지 개발자 인계 지시서

작성일: 2026-09-21. 대상: K-PASS 아동, D-CAS 청소년, D-CAS 성인.

> 최종 상태: 전공 전달, 절대/상대 수준 개인화 문장, K-PASS·D-CAS 청소년·D-CAS 성인 각 15개 locale까지 후보본에 반영했다. 번역 상태는 `Google machine-translated + technical QA`이며 원어민 검수 완료본은 아니다.

## 1. GitHub 작업 위치와 상태

- 저장소: https://github.com/goldensge22-design/feelgood-app
- 개발 브랜치: `codex/result-reports-google-i18n`
- 시작 위치: https://github.com/goldensge22-design/feelgood-app/tree/codex/result-reports-google-i18n/result-reports
- 코드/개인화/다국어 QA 기준: 이 문서가 포함된 `codex/result-reports-google-i18n` 브랜치 HEAD. 최종 SHA는 인계 보고서에서 확인한다.
- 원본 복구 기준 커밋: `d85af1c48050cf9447ef3a6f7e7610aa2905b0da`
- 원본 브랜치: `codex/recover-planner-dcas81`. 원본 열람은 변경될 수 있는 브랜치 HEAD보다 위 커밋을 사용한다.
- 현재 상태: 세 결과지 모두 15개 언어 기술 QA가 포함된 개발 후보본. 운영 배포 완료본은 아니며 main 병합 및 기존 운영 결과지 교체 승인은 아직 없다.

새 작업 브랜치는 개발 후보본 기준으로 만든다. 기존 작업 트리가 깨끗한지 먼저 확인한다.

```sh
git fetch origin
git switch -c codex/result-reports-server-integration origin/codex/result-reports-google-i18n
```

## 2. 실제 사용할 파일

HTML 하나만 복사하지 말고 같은 디렉터리의 JS/JSON/locale 등 상대 경로 의존 파일을 함께 유지한다.

| 대상 | 진입 HTML | GitHub 폴더 |
|---|---|---|
| K-PASS | `result-reports/kpass/candidate/report.kpass.final.html` | [K-PASS 후보본](https://github.com/goldensge22-design/feelgood-app/tree/codex/result-reports-google-i18n/result-reports/kpass/candidate) |
| D-CAS 청소년 | `result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_TEEN/teen.work.html` | [청소년 후보본](https://github.com/goldensge22-design/feelgood-app/tree/codex/result-reports-google-i18n/result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_TEEN) |
| D-CAS 성인 | `result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_ADULT/adult.work.html` | [성인 후보본](https://github.com/goldensge22-design/feelgood-app/tree/codex/result-reports-google-i18n/result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_ADULT) |

- [공통 adapter](integration/result-report-adapter.js): 입력 검증과 기존 엔진 프로필 변환.
- [연동 계약](integration/RESULT_REPORT_INTEGRATION.md): payload 및 로드 순서.
- [manifest](reports-manifest.json): 진입점, 언어 범위, 원본 해시.
- [패치 목록](PATCH_CATALOG.md): 과거 패치의 적용 상태.
- [언어 범위](LANGUAGE_COVERAGE.md): 전체 번역과 부분 번역 구분.
- [locale 번들](locales/manifest.json): 세 결과지 전체 번역과 공통 runtime.

보호 대상: 루트 원본 ZIP, `dcas81/source/`, `dcas/baseline/`, 복구 기준 커밋. `references/` 및 루트 `files.zip`은 참고 패치이며 후보본 전체에 자동 덮어쓰기하지 않는다. `files.zip`은 K-PASS 전체 결과지 패키지가 아니다.

81유형 원본 증거 ZIP: `result-reports/dcas81/source/DCAS_81_PROFILE_PATCH_v1.0.zip`

- 크기: 433,649 bytes
- 기록된 SHA-256: `F9D9B4949A39D29BD23151FFCCB9932D97230F5068C2B144C569D12EABD8334A`

## 3. 개발자가 연결할 데이터

서버는 확정 점수와 검사자 정보를 전달하고, 기존 결과지 엔진이 유형·문장·추천을 계산하도록 연결한다. 서버에서 동일 판정 로직을 다시 작성하지 않는다.

| 필드 | 계약 |
|---|---|
| `schemaVersion` | `1` |
| `reportKind` | `kpass-child`, `dcas-teen`, `dcas-adult` |
| `locale` | manifest에서 전체 적용을 허용한 locale |
| `person` | `fullName`, `givenName`, `fullNameEn`, `genderKey`, `ageYears`, `ageMonths`, `gradeLabel` |
| `test.date` | `{y, m, d}` |
| `scores.P/A/S/Q` | K-PASS: 표준점수 / D-CAS: 0~100 정답률. 단위를 혼용하지 않는다. |
| `scores.fullScale` | K-PASS 공식 전체척도, 필수. D-CAS에는 불필요. |

1. 결과 HTML의 초기 스크립트 실행 전에 adapter를 로드하고 `ResultReportAdapter.install(payload)`를 호출한다. 별도 부모 창에서 호출할 경우 결과 iframe에 자동 전달되지 않는다. 결과 문서의 동일 window에서 실행해야 한다.
2. 기존 HTML의 bank/engine/render 순서를 유지한다. 데이터 로딩이 끝나기 전에 결과 문서를 실행하지 않는다.
3. 운영에서는 payload가 없거나 검증에 실패하면 결과 렌더링을 중단한다. `DEFAULT_PROFILE`은 미리보기용이며 실제 결과로 사용하지 않는다.
4. 결과 접근 권한과 사용자/검사/결과 ID는 서버에서 보존·검증한다. 현재 adapter 반환 객체는 이들 ID를 보존하는 저장 계약이 아니다.
5. 개인정보를 URL query에 넣지 않는다. JSON을 HTML에 넣을 때 안전한 직렬화를 적용하고, 이름·전공 등 문자열의 HTML 삽입도 점검한다. adapter는 HTML sanitizer가 아니다.

### 성인 전공 전달: 완료

`person.majorName`은 D-CAS 성인의 필수 필드이며 adapter가 legacy `majorName`까지 전달한다. 기존 47개 전공은 추천에 연결되고, 목록에 없는 전공은 입력값을 그대로 표시하며 컴퓨터공학과로 잘못 대체하지 않는다.

## 4. 검증된 범위와 한계

개인화 QA 기준은 이 문서가 포함된 개발 브랜치 HEAD다.

- K-PASS: 반대 방향 점수 프로필 2개, 주요 개인화 대상 9개 변화 확인.
- K-PASS 제보 사례(P 130/A 119/S 80/Q 71, 전체척도 101)를 별도 회귀 사례로 고정했다. H/M/L은 `H/M/L/L`, 백분위는 `97.7/89.7/9.1/2.7`, 전체척도는 `52.7`로 일관되게 렌더링하며 낮은 점수는 `하위 9.1%/하위 2.7%`로 표시한다.
- 위 사례의 S/Q 차이 9점은 균형형을 유지하되, 두 점수가 모두 규준적 약(85 이하)이므로 일반 균형형과 구분한 `균형형 학습자(동반 저하)` 문장과 계획력 강점·S/Q 지원 필요를 함께 반영한 진로 안내를 사용한다.
- D-CAS: 청소년·성인 각 9개 프로필, 각각 주요 대상 15개/14개 변화 확인.
- 대표 사례: ALL_L/M/H, 동점, S/Q 차이 10/11, S/Q 양방향 우세, P/A 강점.
- 예시 이름/검사일, 지정된 예시 점수, 미치환 신원 placeholder 검사.
- D-CAS 표지 81유형의 지연 덮어쓰기, 390px 주요 레이어 너비, 대표 한국어 PDF 생성 및 파일 형식/크기 검사 통과.
- K-PASS와 D-CAS 청소년·성인 각 15개 locale(총 45개 모바일 렌더)에서 언어 코드, RTL, 이름·성인 전공, 한국어/내부 토큰 잔존, 가로 overflow를 검사한다. 2026-09-22 추가 언어는 중국어 번체(`zh-TW`)와 프랑스어(`fr`)이며, D-CAS에는 몽골어(`mn`)도 전체 적용했다.
- `files.zip`의 항공보안학과 10개 직무를 성인 후보본에 통합했다. `항공보안과`/`항공보안학과` 두 별칭 모두 요청된 10개 전용 풀만 반환하며 산업보안 3개 직무도 포함한다. 원본의 `estimated`, confidence 0.5 상태는 유지한다.
- 2026-09-22 소유자 결정: 위 10개 `pass_profile`은 전문가 업데이트 전까지 운영 기준값으로 사용한다. 내부 provenance는 `estimated`, confidence 0.5로 유지하고 `operational_status: owner-approved-interim`으로 구분한다. 서버 연동·배포를 막는 미완료 항목은 아니다.
- 중국어 locale 전체를 replacement character·UTF-8 mojibake·한국어 잔존·내부 token 기준으로 검사했고, 항공보안학과 실제 중국어 DOM도 별도 통과했다.
- 각 결과지에서 크메르어 → 아랍어 live 전환 시 URL, 사용자 데이터, 방향 전환 보존을 검사했다.
- 크메르어는 81유형 레이어뿐 아니라 전체 결과지 공통 locale 번들에도 포함된다.

통과는 기계 번역 문장의 원어민 수준 의미·문체 검수 완료를 뜻하지 않는다. 지원 locale에서 실제 DOM과 모바일 가로폭은 자동 순회했지만, 모든 언어의 전체 PDF 페이지 육안 검수까지 한 것은 아니다. 대표 PDF 생성 통과와 전 언어 인쇄물 육안 검수는 구분한다.

### 추가 수정/확인 항목

1. 성인 `majorName` 전달과 미등록 전공의 기본값 오적용은 수정 완료했다.
2. ALL_H FAQ와 K-PASS 성장 문장은 절대 H/M/L과 상대적 최저 영역을 구분하도록 수정했다.
3. K-PASS 규준 라벨은 `강 120 이상 / 약 85 이하`로 통일했다. 페이지별 별도 강점 판정(`>115`)과 비강점 점수의 평균권 오표시는 제거했고, 백분위는 한 자리 소수로 통일했다.
4. D-CAS 청소년 검사 진행 정보의 `148`, `약 55분`은 검사 규격 고정 문구로 남겼다. 실제 응시 기록으로 바꾸려면 서버 계약을 별도로 확장한다.
5. K-PASS 공식 전체척도와 95% CI/규준 자료는 서버가 공식 값을 전달한다. 전체척도 누락 시 운영에서 평균으로 대체하지 않는다.
6. 기존 상위축 조합 균형 기준(K-PASS 15, D-CAS 20)은 소스에 임시 기준 표시가 있다. 확정 매뉴얼과 대조한다. D-CAS S/Q 11점 기준 및 81유형 52/53·74/75 기준과 다른 용도의 값이다.
7. adapter는 실제 달력 날짜, 월령 0~11, locale, 누락/이상 점수와 성인 전공을 검증한다. 서버는 XSS 안전 직렬화와 접근 권한을 별도로 책임진다.
8. 저장소 규칙에 기재된 `scripts/check-i18n.mjs`는 현재 브랜치에 존재하지 않는다. 결과지 전용 `validate-report-locales.mjs`로 키·placeholder·한국어/내부 토큰 잔존을 검사했다.

따라서 이전 “고정값 누출 미발견” 보고를 모든 개인화 문장·운영 연동이 완성됐다는 의미로 확대하지 않는다.

## 5. 다국어 현황과 완료 기준

| 결과지 | manifest 전체 언어 | 부분 범위 |
|---|---|---|
| K-PASS | ko/en/ja/zh/zh-TW/es/fr/ru/vi/th/ar/it/az/km/mn | 전체 shell·개인화·접근성 |
| D-CAS 청소년 | ko/en/ja/zh/zh-TW/es/fr/ru/vi/th/ar/it/az/km/mn | 전체 shell + 기존 81유형 레이어 + 전체 번들 |
| D-CAS 성인 | ko/en/ja/zh/zh-TW/es/fr/ru/vi/th/ar/it/az/km/mn | 전체 shell + 기존 81유형 레이어 + 전체 번들 |

목표: ko/en/ja/zh/zh-TW/es/fr/ru/vi/th/ar/it/az/km/mn. `zh`는 중국어 간체 호환 코드, `zh-TW`는 중국어 번체, `km`은 크메르어(캄보디아어)다.

사용자 결정: 원어민 검수를 완료 조건으로 요구하지 않고 Google 번역을 사용한다. 기존 번역은 원문 의미가 바뀌지 않으면 유지하며, 신규·변경·누락 문구만 작업한다. 이 결정은 검사 판정 기준을 임의 확정할 권한과는 별개다.

전체 본문, 개인화 문장, 버튼, 그래프, 접근성, 오류, 인쇄/PDF DOM을 번역했다. placeholder·누락·한국어 잔존·RTL·크메르 글꼴/줄바꿈은 자동/브라우저 QA로 검사한다. 기존 81유형 레이어의 `ai-draft` 등 원본 provenance는 임의로 바꾸지 않았다.

`result-reports/i18n-work/`에는 정적 원문 3,607개, 실제 렌더 동적 원문 1,689개, 보정 51개, 런타임 성별 라벨 2개와 Google 번역 결과를 증거로 보존한다. K-PASS 기존 몽골어 1,838개 카탈로그는 그대로 보존하고, D-CAS 몽골어와 신규 `fr`·`zh-TW`는 공통 원문 카탈로그의 증분 번역으로 추가했다. 운영 로드는 `result-reports/locales/` 번들만 사용한다.

## 6. 실행할 검증

저장소 루트에서 Node.js로 실행한다. 브라우저 검사는 Chrome/Edge가 필요하다. 아래 PowerShell에서 D-CAS는 트랙별로 실행할 수 있다.

```powershell
node result-reports/integration/result-report-adapter.test.js
node result-reports/tools/validate-reports.mjs
node result-reports/tools/validate-report-locales.mjs
node result-reports/dcas81/unpacked/TESTS/profile81.test.js
node result-reports/tools/multilingual-browser-regression.cjs
node result-reports/tools/kpass-browser-regression.js
node result-reports/tools/adult-aviation-jobs.test.cjs
node result-reports/tools/adult-aviation-browser-regression.cjs
$env:DCAS_TRACK='teen'
node result-reports/dcas81/unpacked/TESTS/browser-dom-regression.js
$env:DCAS_TRACK='adult'
node result-reports/dcas81/unpacked/TESTS/browser-dom-regression.js
Remove-Item Env:DCAS_TRACK
```

현재 브라우저 테스트는 결과 엔진의 공식 `window.__TEST_PROFILE__` 계약을 직접 주입한다. adapter 자체 계약은 별도 단위 테스트로 검증했으며, 실제 서버 템플릿/인증/저장/API를 포함한 staging E2E는 개발자가 연결 후 추가한다. 배포 전 태블릿·PC 및 지원 언어 PDF 육안 검수를 수행한다.

## 7. 개발 완료 보고 요청

수정 파일, 브랜치/commit, 서버 payload 예시, 지원 locale, 개인화/경계값/누락값 QA, 실제 DOM/모바일/PDF 검수 결과, 미완료 항목, staging URL을 제출한다. main 병합 및 기존 서비스 교체는 검수 후 별도 승인받는다.
