# D-CAS 성인 재직자 직무 선택 패치

재직중에서는 학과 선택 대신 현재 직무를 검색·선택하고, 실제 직무명과 담당 업무를 보완 입력합니다. 목록에 없으면 **기타 직접 입력**을 사용합니다. 연령으로 재학생·재직자를 추정하지 않습니다.

## GitHub 위치와 적용 범위

- 저장소: `goldensge22-design/feelgood-app`
- 개발 브랜치: `codex/dcas-employed-job-context`
- 기준 commit: `5a0e932ee7bfe82119f8ebddefe2ab98cd096563` (`codex/pass-guidance-patch`의 결과지 후보본)
- 실행 HTML: `result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_ADULT/adult.work.html`
- 패치 모듈: `result-reports/dcas81/work-context/`
- 공통 입력 adapter: `result-reports/integration/result-report-adapter.js`
- QA: 이 폴더의 `VALIDATION.md`, `qa/unit.json`, `qa/browser.json`, `qa/pdf-export.json`

main, 원본 복구 브랜치, K-PASS/청소년 소스, 기존 원본 ZIP 및 운영 URL은 변경하지 않습니다. 이 브랜치는 **개발 후보본**이며 운영 서버에 배포한 상태가 아닙니다.

제공된 화면의 기존 상황 버튼은 보관 HTML `archive/dcas_adult_report_v2 (3).html`에서 확인했지만 최신 후보본에는 없었습니다. 이 패치는 최신 후보본에 상황 선택을 추가했습니다. 실제 운영 HTML의 목차·DOM·이벤트가 다르면 아래 연결 지점을 맞춰야 합니다. 운영 HTML 전체를 무조건 덮어쓰지 마세요.

## 사용자가 보게 되는 흐름

1. 재학생 / 취업준비 / 재직중 / 아직 미정 중 본인이 상황을 선택합니다.
2. 재직중: 직무 분야 필터 → 직업명·분류 코드 검색 → 현재 직무 선택 → 필요 시 실제 직무명·담당 업무 입력 → 직무 적용.
3. 기타 선택 시 실제 직무명은 필수입니다. 최대 120자이며 담당 업무는 선택 입력, 최대 800자입니다.
4. 재직자에게는 현재 업무에 시도할 방법, 업무 실행·성장 계획, 업무 경험 기록을 보여줍니다. 기존 점수별 지원량과 네 축별 방법을 재사용합니다.
5. 다른 상황으로 돌아가면 기존 학과와 정상 학과 기반 기능을 복원합니다. 새 학과 선택도 정상 반영합니다. 직무 선택·미적용 입력·검색 조건은 같은 페이지 세션 안에서 유지합니다.

재직자에게 학과 적합도나 학과 기반 TOP5를 직무 적합도로 이름만 바꿔 표시하지 않습니다. 직무별 검증된 PASS 요구 점수가 연결되지 않아 새 495개 직업의 적합도 수치·순위는 만들지 않았습니다. 기존 학생 모드의 항공보안학과 10개 직무 및 TOP5는 유지합니다.

## 직업 목록의 범위

고용노동부 한국고용직업분류 2025 항목표의 **10개 대분류, 35개 중분류, 140개 소분류, 495개 세분류 직업**을 코드 기준으로 수록했습니다. UI의 분야 필터는 35개 중분류이며 검색은 직업명·상위 직무군 이름·코드에 대응합니다. 140개 소분류와 495개 세분류를 서로 다른 635개 직업처럼 합산하지 않습니다.

- 공식 출처: [고용노동부 한국고용직업분류 2025 개정 고시](https://www.moel.go.kr/info/lawinfo/instruction/view.do?bbs_seq=20241200770)
- 원본: `source/KECO_2025_MOEL.xlsx`
- SHA-256: `B8B52F438772D695470C09CFE3CA30B6200062FD70F835004BC603FD0AAD1362`
- 재현: `extract-catalog.py` → `catalog.json`, `catalog.js`, `catalog.ko.json`

분류 코드는 직업의 명칭·계층을 나타낼 뿐 PASS 적합도 규준이 아닙니다. 기업별 세부 직책이나 신규 직무는 공식 목록에 반드시 존재하지 않습니다. 예를 들어 공항보안 사무, 항공사보안 사무, 항공화물보안 등 현장 직무명이 정확히 없으면 기타에 실제 명칭을 입력합니다. 키워드로 임의의 학과나 직무 요구 점수를 추정하지 않습니다.

## 개발자가 연결할 데이터

기존 payload에 성인 전용 `workContext`만 선택적으로 추가합니다. 기존 score/user/test 식별자 계약을 삭제하거나 변경하지 마세요. KECO 코드는 선행 0이 있으므로 문자열로 보관합니다. 현재 카탈로그 버전은 `KECO-2025`입니다.

```json
{
  "schemaVersion": 1,
  "reportKind": "dcas-adult",
  "locale": "ko",
  "person": {
    "fullName": "테스트 사용자",
    "givenName": "사용자",
    "genderKey": "X",
    "ageYears": 23
  },
  "test": { "date": { "y": 2026, "m": 10, "d": 21 } },
  "scores": { "P": 75, "A": 53, "S": 64, "Q": 75 },
  "workContext": {
    "status": "employed",
    "occupationCode": "other",
    "jobTitle": "공항보안 사무직",
    "tasks": "보안 관련 문서 검토 및 업무 기록 관리"
  }
}
```

- `status`: `student`, `jobseeker`, `employed`, `undecided`. 누락된 기존 payload는 기존 학생/학과 흐름을 유지합니다.
- `occupationCode`: `catalog.json`의 4자리 세분류 코드, `other`, 또는 아직 선택하지 않았다면 빈 문자열입니다.
- `jobTitle`: 공식 직업을 고른 경우 선택 입력, `other`인 경우 필수입니다.
- `tasks`: 선택 입력입니다. 입력 문구는 번역하거나 분석해서 별도의 능력 점수로 만들지 않습니다.
- 재직중에서는 `person.majorName`, `person.gradeLabel`을 생략할 수 있습니다. 다른 모드의 기존 필수 계약은 유지합니다.
- 서버에서도 길이·상황 값·기타 필수값을 검증하고, 코드를 `catalog.json`에 대조하세요. 공통 adapter는 코드의 형식을 검사하며 UI는 존재하지 않는 코드를 미선택으로 처리합니다.

보고서 엔진이 실행되기 **전에** `ResultReportAdapter.install(payload)`를 호출해 `window.__TEST_PROFILE__`을 설치하세요. 이미 설치된 페이지의 서버 갱신은 `DCasAdultEngine.render({workContext: savedContext})`로 반영할 수 있습니다.

## 저장과 기존 버튼 연결

패치 자체는 서버 주소·인증 방식을 추정하지 않습니다. 다음 이벤트를 기존 저장 API에 연결하면 됩니다.

```js
document.addEventListener('fg-report-context-changed', (event) => {
  const { workContext } = event.detail;
  // 기존 reportId/userId/testId와 함께 인증된 저장 API에 전달합니다.
  // 저장 실패 안내/재시도는 기존 앱의 i18n·알림 체계를 사용합니다.
  saveReportContext(reportId, workContext);
});
```

`saveReportContext`와 `reportId`는 개발자 앱에서 제공할 연결 예시입니다. 브라우저 내부에서 결과지에 적용되었다는 안내를 서버 저장 완료로 해석하지 마세요. 새로고침·다른 기기 복원을 위해 서버가 저장한 `workContext`를 다음 진입 payload에 포함해야 합니다. 개인별 구분 없이 전역 localStorage에 직무 정보를 저장하지 않습니다.

운영 화면에 이미 상황 버튼이 있으면 그 버튼의 기존 상태값을 다음 API에 연결합니다.

```js
DCasWorkContext.setMode('employed');
```

보관 HTML의 `data-role="mode"`, `data-v="employed"`와 같은 값입니다. 기존 `STATE.mode`/`renderDynamic()`을 사용하는 운영판은 이 API 호출 뒤 기존 학과 렌더가 재실행되지 않도록 연결해야 합니다. 후보본에 추가된 toolbar와 운영판의 상황 버튼을 이중으로 노출하지 마세요. 운영판 DOM이 다르면 `major`, `jobs`, `jobskill`, `efficiency`, `roadmap`, `docs` 등 연결 대상을 후보본과 대조해야 합니다.

## 배포에 필요한 파일

후보본 폴더의 기존 의존 파일을 유지한 상태에서 다음 변경분을 적용합니다. 전혀 다른 구버전 HTML에 이 파일들만 넣으면 같은 결과를 보장하지 않습니다.

| 구분 | 파일 |
| --- | --- |
| 성인 HTML | `dcas81/unpacked/APPLIED_FULL/DCAS_ADULT/adult.work.html` |
| 성인 엔진 | `dcas81/unpacked/APPLIED_FULL/DCAS_ADULT/dcas-adult-content-engine.js` |
| 직업 목록 | `dcas81/work-context/catalog.js` |
| 새 다국어 리소스 | `dcas81/work-context/locales.js` |
| 재직자 UI 및 상태 처리 | `dcas81/work-context/work-context.js` |
| 화면 및 인쇄 스타일 | `dcas81/work-context/work-context.css` |
| 입력 adapter | `integration/result-report-adapter.js` |

표의 경로는 모두 `result-reports/` 기준입니다. 기존 `guidance/`, `locales/`, 81유형 코드·데이터와 학과/직무 데이터는 그대로 필요합니다. 신규 직무 모듈은 기존 학과 이벤트가 등록된 뒤 로드하고, 마지막 렌더 단계 및 언어 변경 뒤에 적용됩니다. 순서를 임의로 바꾸면 재직자 내용이 덮어써질 수 있습니다.

## 다국어 및 개인정보

한국어, 영어, 일본어, 중국어 간체·번체, 스페인어, 프랑스어, 러시아어, 베트남어, 태국어, 아랍어, 이탈리아어, 아제르바이잔어, 크메르어, 몽골어를 지원합니다.

새 735개 key만 독립 리소스로 관리합니다. 기존 결과지 번역과 81유형 번역은 재생성하지 않았습니다. 신규 번역은 Google 기계 번역이며 원어민 검수 완료로 표시하지 않습니다. source hash와 `machine-translated` 상태는 내부 manifest/cache에만 보관합니다. 새로운 업무 문구의 의미를 바꾸면 영향받는 key만 재번역하세요.

직무명·담당 업무는 사용자가 입력한 그대로 안전한 textContent로 표시합니다. 언어를 바꿔도 사용자 입력 자체는 번역하지 않습니다. 런타임에 검사 점수나 입력 업무를 Google 번역으로 전송하지 않습니다.

## 운영 적용 전 확인

1. 개발 서버에서 실제 payload와 저장 API를 연결합니다. 재직자에게 학과가 필수로 남지 않는지 서버 스키마도 확인합니다.
2. 기존 상황 버튼과 신규 모듈의 상태를 하나로 연결합니다. 직무 적용 뒤 후속 렌더가 학과 결과를 덮어쓰지 않는지 확인합니다.
3. 직무 적용 후 새로고침·다른 사용자 전환·재접속으로 개인별 저장/권한을 검증합니다.
4. PC/모바일과 사용 언어, 실제 PDF 버튼, 기존 학과 기반 TOP5를 staging에서 확인합니다.
5. 운영 데이터로 확인한 뒤 승인된 배포 절차를 사용합니다. 이 패치 작업에서는 main 병합이나 운영 URL 교체를 하지 않습니다.
