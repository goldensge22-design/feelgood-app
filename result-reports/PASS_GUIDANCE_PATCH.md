# K-PASS / D-CAS 점수별 실행 권고 패치

2026-10-17 · 개발 후보본 · 운영 배포 아님

## 개발자가 가져올 위치

- 저장소: https://github.com/goldensge22-design/feelgood-app
- 패치 브랜치: `codex/pass-guidance-patch`
- 시작 기준 커밋: `76fa518257c3c810dec85d65c33ed977415ea15f` (K-PASS/D-CAS 81개 고유 명칭 포함).
- 최신 코드: https://github.com/goldensge22-design/feelgood-app/tree/codex/pass-guidance-patch/result-reports
- 기존 복구 증거 커밋: `d85af1c48050cf9447ef3a6f7e7610aa2905b0da`. 복구 브랜치, 원본 ZIP, main은 이번 패치의 수정 대상이 아니다.

작업 트리를 먼저 확인한 뒤, 별도 연동 브랜치에서 진행한다. 자동 병합/자동 운영 배포 지시가 아니다.

```sh
git fetch origin
git switch -c codex/pass-guidance-integration origin/codex/pass-guidance-patch
```

| 결과지 | 진입 파일 |
|---|---|
| K-PASS 아동 | `result-reports/kpass/candidate/report.kpass.final.html` |
| D-CAS 청소년 | `result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_TEEN/teen.work.html` |
| D-CAS 성인 | `result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_ADULT/adult.work.html` |

HTML 한 개만 복사하면 안 된다. 각 결과지의 기존 JS/JSON과 `result-reports/locales/`, 신규 `result-reports/guidance/`, `result-reports/integration/`의 상대 경로를 유지한다. 위 브랜치의 `result-reports` 전체를 기준으로 연동하면 파일 누락을 줄일 수 있다. source/baseline/references는 운영 진입점이 아니다.

## 달라진 내용

81유형 분류와 실제 점수 차이를 분리했다. 모두 상/중/하라도 큰 점수 차이가 있으면 자동으로 균형형을 부여하지 않는다. HHHH/MMMM/LLLL의 명칭은 전 영역의 범위를 표현하도록 조정했고, 각 결과지·언어별 81개 명칭의 고유성은 유지한다.

특히 LLLL은 가능성·성격·업무 능력을 단정하지 않는다. 상대적으로 높은 영역은 확정된 강점 대신 먼저 시도할 방법으로 안내한다. 작은 차이에서는 한 방법을 우선하지 않고 비교하도록 하며, 최고점 동점은 모두 유지한다. 다른 낮은 영역에 필요한 도움도 누락하지 않는다.

새 실행 계획에는 실제 P/A/S/Q 점수, 시도할 방법, 영역별 지원량, 연령에 맞는 활동, 관찰 항목과 다음 조정 방법이 포함된다. 정확도·완료 시간·도움·부담을 비교하도록 안내하며, 훈련이 검사 점수 또는 인지능력 향상을 보장한다고 표현하지 않는다. 추천 학과·직무와 자기소개서도 실제 체험/수행 근거와 함께 해석하도록 보완했다. 기존 학과/직무 목록과 순위 계산은 교체하지 않았다.

추가로 성인 미등록 학과에서 예시 점수 91/84/66이 남던 부분, 모두 상인데 낮은 영역을 전제하던 FAQ, K-PASS 일부 과도한 능력 단정, D-CAS 브라우저 인쇄가 현재 섹션만 출력하던 부분을 수정했다.

## 유지한 점수 기준

| 규칙 | K-PASS | D-CAS 청소년·성인 |
|---|---|---|
| L / M / H | ≤85 / 86–119 / ≥120 | ≤52 / 53–74 / ≥75 |
| 네 영역 균형 판단 | 최고–최저 <15 | 최고–최저 <20 |
| S/Q 비교 | 기존 연령별 규칙 유지 | 차이 0–10 균형, 11 이상 높은 영역 우세 |

K-PASS의 기존 S/Q 규칙은 5세 이하 차이 11까지, 그 외 차이 10까지 균형이다. 네 영역 균형 판단과 S/Q 판단을 혼동하지 않는다. 위 기준은 기존 제품 규칙을 보존한 것이며 임상적으로 새로 검증한 유의차가 아니다. 새로운 점수 컷오프나 진단 판단은 만들지 않았다.

## 점수·관심 정보 연결

[기존 연동 계약](integration/RESULT_REPORT_INTEGRATION.md)과 `result-report-adapter.js`를 사용한다. 숫자형 P/A/S/Q, 연령, 검사일 등 기존 계약을 유지한다. 누락/문자열/범위 밖 점수를 임의의 평균이나 0으로 바꾸지 않는다. K-PASS 종합점수와 네 영역 등급을 서로 대체하지 않는다.

선택 필드 `person.interestLabel`을 추가했다. 사용자가 직접 선택한 관심 활동만 전달한다. 없으면 관심 활동을 선택하도록 안내하며, 학과나 직업을 곧 관심사로 추정하지 않는다. 사용자 입력은 textContent로 표시한다. 관심 정보가 없을 때도 결과지가 동작하므로 신규 서버 필드는 필수가 아니다. 서버는 기존 adapter에 실제 결과 데이터를 연결하고 인증·접근 권한·저장/PDF 다운로드 경로를 검증하면 된다.

## 다국어와 리소스

지원 locale은 `ko, en, ja, zh, zh-TW, es, fr, ru, vi, th, ar, it, az, km, mn`이다. 중국어 간체/번체를 별도 locale로 센 15개다. 크메르어와 몽골어도 포함된다.

- 공통 정책/렌더: `guidance/pass-guidance-engine.js`, `pass-guidance-ui.js`, `pass-guidance.css`.
- 프로그램별 원문: `guidance/sources/{reportKind}.ko.json`.
- 프로그램별 번들: `guidance/{reportKind}.locales.js`.
- 언어·source hash: `guidance/manifest.json`.
- 번역 캐시/출처: `guidance/translations/`. Google로 신규·변경 문구만 번역했고 기존 전체 결과지 번역 번들은 재생성하지 않았다. PASS 영역/상중하 용어는 기존 81유형 번역을 재사용했다.

한국어 원문 56/55/53 keys(K-PASS/청소년/성인)와 각 외국어 key·placeholder·source hash를 검사한다. 번역은 기계번역이며 원어민 검수 완료/의미 무오류를 보장하지 않는다. source hash가 달라지면 기존 캐시를 그대로 새 의미에 재사용하지 않는다. 내부 상태는 사용자 화면·인쇄물에 표시하지 않는다.

공통 번역기가 새 권고 DOM을 재번역하거나 한국어로 덮어쓰지 않도록 소유 경계를 둔다. 언어 변경 시 같은 프로필·현재 위치·query/hash를 유지한다. 보조 문구를 붙이는 폴링 방식이 아니라 기존 개인화 렌더의 마지막 단계에서 갱신한다.

## QA 범위와 실행

새 로직: 3종 ×81 조합, 15 locale에서 총 3,645 조합/언어 평가. 고유 명칭, H/M/L 경계, 모두 상/중/하, 크고 작은 차이, 동점, 누락/비정상 점수, 연령, 지원량, S/Q 0/10/11 양방향을 확인한다. 외국어 14 locale의 81개 조합은 실제 Chrome의 Intl 지원 차이에 따른 한국어 혼입도 별도 검사한다. 크메르어처럼 ListFormat이 지원되지 않는 환경에서는 시스템 한국어 접속사 대신 중립적인 목록 구분 기호를 사용한다.

브라우저: 한국어 11 프로필과 나머지 14 locale의 대표 LLLL 프로필을 각 390/768/1440px에서 검사한다(총 225 cases). 새 권고 패널/페이지 overflow, 예시 점수 잔존, 언어 연속 전환, 프로필 보존, late overwrite, 인쇄의 전체 섹션 노출을 검사한다. 결과는 `guidance/qa/browser-results.json`에 기록한다. 한국어/크메르어/아랍어의 3종 PDF를 생성해 대표 페이지를 확인한다. 모든 언어·모든 PDF 페이지의 수동 시각 검수라는 뜻은 아니다.

```sh
node result-reports/guidance/guidance.test.cjs
node result-reports/integration/result-report-adapter.test.js
node result-reports/dcas81/unpacked/TESTS/profile81.test.js
node result-reports/dcas81/unpacked/TESTS/unique-profile81-names.test.js
node result-reports/tools/kpass-profile81-unique-names.test.cjs
node result-reports/tools/adult-aviation-jobs.test.cjs
node result-reports/tools/adult-aviation-browser-regression.cjs
node result-reports/tools/validate-reports.mjs
node result-reports/tools/validate-report-locales.mjs
node result-reports/guidance/browser-qa.cjs
node result-reports/tools/kpass-browser-regression.js
node result-reports/dcas81/unpacked/TESTS/browser-dom-regression.js
node result-reports/tools/multilingual-browser-regression.cjs
```

새 브라우저 검사는 Playwright와 Chrome을 사용한다. 다른 PC에서는 `PLAYWRIGHT_MODULE`, `CHROME_PATH`를 환경에 맞게 지정한다. `GUIDANCE_PDF=1`이면 대표 9개 PDF를 추가 생성한다. 산출 PNG/PDF는 Git에서 제외하며 QA JSON은 보존한다. 캐시에서 재빌드는 `node result-reports/guidance/build-locales.mjs`, 새 번역 요청은 명시적으로 `--translate`를 붙인다. 외부 Google 요청에는 원문 리소스만 보내고 개인 점수/이름을 보내지 않는다.

## 배포 전 남는 확인

이번 패치는 로컬 후보본이다. 실제 서버 인증·권한, 실사용 결과 payload, 서버 PDF/다운로드, CSP/CDN 접근, 운영 브라우저는 개발자의 staging에서 확인해야 한다. 브라우저 native print/PDF와 결과지의 외부 PDF 라이브러리 버튼은 서로 다른 경로다. 후자의 서버 환경까지 검증했다고 간주하지 않는다.

15개 locale 기술 검사는 번역의 의미 정확성 인증이나 전체 과거 문구의 임상 검증이 아니다. 기존 직무 추정치의 전문적 타당성도 이번 교육적 권고 패치로 확정하지 않는다. main 병합, 원본 증거본 교체, 운영 URL 교체는 수행하지 않는다.
