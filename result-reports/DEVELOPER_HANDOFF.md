# FeelGood 결과지 개발자 인계 지시서

작성일: 2026-09-21. 대상: K-PASS 아동, D-CAS 청소년, D-CAS 성인.

## 1. GitHub 작업 위치와 상태

- 저장소: https://github.com/goldensge22-design/feelgood-app
- 개발 브랜치: `codex/result-reports-google-i18n`
- 시작 위치: https://github.com/goldensge22-design/feelgood-app/tree/codex/result-reports-google-i18n/result-reports
- 코드/개인화 QA 기준 커밋: `cd46159a8c50379d091127379d3ba26cbe547bd8`
- 원본 복구 기준 커밋: `d85af1c48050cf9447ef3a6f7e7610aa2905b0da`
- 원본 브랜치: `codex/recover-planner-dcas81`. 원본 열람은 변경될 수 있는 브랜치 HEAD보다 위 커밋을 사용한다.
- 현재 상태: 개발 후보본. 전체 12개 언어 완료본이나 운영 배포 완료본이 아니다. main 병합 및 기존 운영 결과지 교체 승인은 아직 없다.

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

### 성인 전공 전달: 현재 adapter 보완 필요

**P1: `person.majorName`을 넣어도 현 adapter의 normalize/toLegacyProfile이 전달하지 않는다.** 성인 엔진은 `window.__TEST_PROFILE__.majorName`을 읽는다. 직접 프로필 주입 QA는 통과했지만 adapter 경유 전공 연동은 완료되지 않았다.

연동 브랜치에서 선택 필드 `person.majorName`을 검증·보존하고 legacy `majorName`으로 전달하도록 보완한다. 제공된 전공이 선택 목록에 없을 때 기본 컴퓨터공학과로 잘못 추천되지 않도록 사용자 정의 전공 처리도 확인한다. 영문 given name 필요 시 `givenNameEn` 전달 계약을 함께 확인한다. 이 지시서는 adapter 코드를 변경하지 않는다.

## 4. 검증된 범위와 한계

개인화 QA 기준은 위 `cd46159` 커밋이다.

- K-PASS: 반대 방향 점수 프로필 2개, 주요 개인화 대상 9개 변화 확인.
- D-CAS: 청소년·성인 각 9개 프로필, 각각 주요 대상 15개/14개 변화 확인.
- 대표 사례: ALL_L/M/H, 동점, S/Q 차이 10/11, S/Q 양방향 우세, P/A 강점.
- 예시 이름/검사일, 지정된 예시 점수, 미치환 신원 placeholder 검사.
- D-CAS 표지 81유형의 지연 덮어쓰기, 390px 주요 레이어 너비, PDF 생성 및 파일 형식/크기 검사 통과.
- 크메르어 검사는 81유형 레이어 대상이다. 전체 결과지 크메르어 완료를 의미하지 않는다.

통과는 모든 문장의 의미적 정합성이나 모든 페이지의 시각 검수 완료를 뜻하지 않는다. 이름/날짜 일부 검사는 현재 보이는 `innerText`, 지정 점수 검사는 ID가 있는 일부 요소를 사용한다. 모든 탭·숨겨진 섹션·전체 인쇄물·모든 언어를 순회한 누출 검사는 추가 필요하다. PDF 생성 통과와 전체 PDF 페이지 육안 검수는 구분한다.

### 추가 수정/확인 항목

1. 위 성인 `majorName` adapter 누락과 지원되지 않는 전공의 기본값 오적용.
2. **P1 검토: 81유형 예외와 기존 문장 엔진의 의미 충돌.** 청소년 P=75/A=80/S=90/Q=99에서 표지는 ALL_H이지만 FAQ는 “계획력이 낮게 나온 게 걱정돼요”로 출력됐다. 상대적 최저와 절대적 하 수준을 구분하도록 FAQ/성장/추천 문장 전체를 확인한다. 기존 H/M/L 임계값을 임의 변경하지 않는다.
3. K-PASS 성장 문장은 비균형형에서 약한 축을 일률적으로 “또래 평균 수준”이라고 쓰는 코드가 남아 있다(`kpass-content-engine.js`, `pf-growthdesc`). 실제 해당 축 수준과 표현을 맞추는 보완 검토가 필요하다.
4. D-CAS 청소년 검사 진행 정보의 `148`, `약 55분`은 고정 텍스트다. 검사 규격인지 실제 응시 문항수/소요시간인지 구분하고, 실제 기록이라면 서버 필드로 연결한다. 응시 시간 데이터가 없는 상태에서 실측값으로 표시하지 않는다.
5. K-PASS 공식 전체척도와 95% CI/규준 자료 연결. 전체척도 누락 시 평균을 운영 점수로 대체하지 않는다.
6. 기존 상위축 조합 균형 기준(K-PASS 15, D-CAS 20)은 소스에 임시 기준 표시가 있다. 확정 매뉴얼과 대조한다. D-CAS S/Q 11점 기준 및 81유형 52/53·74/75 기준과 다른 용도의 값이다.
7. adapter 날짜는 현재 월 1~12/일 1~31 검사만 한다. 실제 존재하지 않는 날짜, 월령 범위, 성별 X, 특수문자 이름, 누락/이상 점수도 서버→adapter→DOM 경로로 검사한다.

따라서 이전 “고정값 누출 미발견” 보고를 모든 개인화 문장·운영 연동이 완성됐다는 의미로 확대하지 않는다.

## 5. 다국어 현황과 완료 기준

| 결과지 | manifest 전체 언어 | 부분 범위 |
|---|---|---|
| K-PASS | ko | 기존 표지/메뉴 9개 추가 locale. az/km 누락으로 기록됨. |
| D-CAS 청소년 | ko/en | 81유형 레이어 12개 locale |
| D-CAS 성인 | ko | 81유형 레이어 12개 locale |

목표: ko/en/ja/zh/es/ru/vi/th/ar/it/az/km. 크메르어는 캄보디아어 `km`이다.

사용자 결정: 원어민 검수를 완료 조건으로 요구하지 않고 Google 번역을 사용한다. 기존 번역은 원문 의미가 바뀌지 않으면 유지하며, 신규·변경·누락 문구만 작업한다. 이 결정은 검사 판정 기준을 임의 확정할 권한과는 별개다.

전체 본문, 개인화 문장, 버튼, 그래프, 접근성, 오류, 인쇄/PDF까지 번역하고 placeholder·누락·한국어 잔존·언어 전환 시 프로필 유지·RTL·크메르 글꼴/줄바꿈을 검증한 후 전체 locale를 활성화한다. fallback은 번역 완료로 계산하지 않는다. locale의 `ai-draft` 등 내부 상태를 근거 없이 ready로 바꾸지 않는다.

로컬 `result-reports/i18n-work/`와 Google 번역 실험 도구는 이 인계 기준에서 미추적/미완료이며 GitHub 제공물에 포함하지 않았다. 개발자는 완성 번역 파일로 간주하지 않는다.

## 6. 실행할 검증

저장소 루트에서 Node.js로 실행한다. 브라우저 검사는 Chrome/Edge가 필요하다. 아래 PowerShell에서 D-CAS는 트랙별로 실행할 수 있다.

```powershell
node result-reports/integration/result-report-adapter.test.js
node result-reports/tools/validate-reports.mjs
node result-reports/dcas81/unpacked/TESTS/profile81.test.js
node result-reports/tools/kpass-browser-regression.js
$env:DCAS_TRACK='teen'
node result-reports/dcas81/unpacked/TESTS/browser-dom-regression.js
$env:DCAS_TRACK='adult'
node result-reports/dcas81/unpacked/TESTS/browser-dom-regression.js
Remove-Item Env:DCAS_TRACK
```

현재 브라우저 테스트는 legacy 프로필 직접 주입 방식이다. adapter와 서버 payload까지 포함하는 연동 회귀 테스트를 추가해야 한다. 지원 언어 전체 탭, 모바일/태블릿/PC, 인쇄 모든 페이지를 확인한다. 후보 브랜치에 중앙 i18n 검사기가 있을 경우 저장소 규칙의 검사도 실행하되 등록되지 않은 프로그램까지 검사 완료됐다고 보고하지 않는다.

## 7. 개발 완료 보고 요청

수정 파일, 브랜치/commit, 서버 payload 예시, 지원 locale, 개인화/경계값/누락값 QA, 실제 DOM/모바일/PDF 검수 결과, 미완료 항목, staging URL을 제출한다. main 병합 및 기존 서비스 교체는 검수 후 별도 승인받는다.
