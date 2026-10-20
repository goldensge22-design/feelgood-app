# D-CAS 재직자 직무 선택 검증

검증일: 2026-10-21. 대상은 `codex/dcas-employed-job-context`의 성인 후보본이며 운영 서비스 배포 검증과 구분합니다.

## 구현 판정

- 재직중에서 학과 선택·학과 적합도·학과 TOP5 DOM을 분리하고 직무 선택·업무 지원 화면을 렌더링합니다. 이전 학과 결과를 CSS로만 가리는 방식이 아닙니다.
- 공식 KECO 2025의 495개 직업 코드가 모두 고유합니다. 10개 대분류 / 35개 중분류 / 140개 소분류를 원본 Excel과 연결했습니다.
- 직무 검색, 분야 필터, 기타 필수 직무명, 담당 업무 입력, 직무 적용, 언어 변경, 상황 재전환을 지원합니다.
- 4축 점수, H/M/L 경계, 81유형, S/Q 기준은 변경하지 않았습니다.
- 학과로 복귀한 뒤 새 전공이 초기 전공으로 되돌아가던 렌더 경로와, 번역된 option 문구가 내부 선택값까지 바꾸던 문제를 보완했습니다.
- 새 업무 입력은 textContent로만 출력하며 런타임 번역 서비스에 보내지 않습니다.
- 직무별 PASS 기준이 없는 경우 적합도 백분율·TOP5를 계산하지 않습니다. 현재 업무에 시도할 교육적 방법을 안내하며, 채용·배치·인사평가를 이 결과만으로 결정하지 않도록 안내합니다.

## 자동 검증

| 검사 | 결과 |
| --- | --- |
| `work-context.test.cjs` | 495개 코드, 15개 언어 × 735개 key = 11,025개 값, 빈 값·placeholder·한글/토큰 잔존·source hash·adapter 검사 통과 |
| `browser-qa.cjs` | 15개 언어 × 3개 화면 폭 × 핵심 5개 화면 = 225개 화면 검사 통과 |
| 성인 재직자 실제 DOM의 81조합 | 고유 81개 코드 유지, 원점수 변경 없음, 학과 선택 DOM 재등장 없음 |
| 상황 전환 | 학생 → 재직자 → 학생, 새 학과 선택, 취업준비/미정 복귀, 처음부터 재직자인 payload의 학생 전환 통과 |
| 언어 전환 | 적용 직무·미적용 입력·검색어·현재 화면·기존 URL query/hash 유지 |
| 기타 및 안전성 | 빈 기타 직무명 오류, 길이 제한, HTML 형태 입력을 문자로 출력 |
| 기존 `guidance.test.cjs` | 243개 조합, 3,645개 언어/프로필, 경계·동점·누락·비정상 점수 통과 |
| 기존 3종 `guidance/browser-qa.cjs` | 225개 브라우저 케이스 통과; 원래 QA 기록과 동일 |
| 기존 `profile81.test.js` | 청소년/성인 81유형, 52/53·74/75, S/Q 0·10·11 및 특수 사례 통과 |
| 기존 `unique-profile81-names.test.js` | 15개 언어의 청소년/성인 81개 명칭 고유성 통과 |
| 기존 항공보안 회귀 | 두 학과 별칭의 10개 직무 유지, ko/zh/zh-TW/fr/km/mn 실제 DOM·모바일 검증 통과 |
| 기존 adapter 및 locale validator | 기존 계약·15개 언어·고정/동적 문구 검증 통과 |
| 원본 보존 validator | 3종 결과지 및 4개 불변 원본 검증 통과 |

브라우저는 Windows Chrome headless이며 화면 폭은 390 / 768 / 1440px입니다. 브라우저 오류, 신규 모듈의 번역 누락 경고, 주요 요소/페이지 가로 overflow를 검사했습니다. 모바일 기기 자체의 OS별 동작 시험을 의미하지 않습니다.

## 화면과 PDF

- 한국어·크메르어·아랍어·중국어 번체 모바일 화면을 저장하고 육안 확인했습니다. 아랍어 RTL과 긴 번역의 줄바꿈을 확인했습니다.
- 15개 언어에서 인쇄 모드의 선택 폼 제외와 적용된 직무 표시를 검사했습니다.
- 기존 `PDF 다운로드` 버튼의 html2pdf 경로도 실제 실행했습니다. 14개 결과 섹션이 포함되고 직무 입력 폼과 상황 버튼이 제외됩니다.
- 실제 한국어 다운로드 PDF의 모든 페이지를 이미지로 렌더링해 빈 페이지 여부와 전체 구성을 확인했고, 직무 선택·지원 방법 페이지를 확대 검수했습니다. 페이지 수는 `qa/pdf-pages.json`, 다운로드 검사 결과는 `qa/pdf-export.json`에 기록했습니다.
- PDF/연락 시트는 중간 QA 산출물이며 배포 파일이 아닙니다. `qa/ko-mobile.png`, `qa/km-mobile.png`, `qa/ar-mobile.png`, `qa/zh-TW-mobile.png`는 화면 참고 자료입니다.

## 다국어 범위

새 직무 선택 모듈의 15개 언어 key는 모두 존재합니다. 값과 placeholder, source hash를 검사했고 fallback을 번역 완료로 계산하지 않습니다. 기존 결과지·기존 81유형 번역은 변경하지 않았습니다.

신규 언어 문구는 Google 기계 번역입니다. **원어민 수준의 의미·직업 용어 검수가 완료됐다는 뜻은 아닙니다.** 특히 전문 직업명은 추후 별도 용어 검수 대상입니다. `machine-translated` 상태는 내부 메타데이터로 유지합니다. 사용자 직접 입력은 언어 전환 시 그대로 보존하므로 한국어로 입력한 담당 업무가 외국어 화면에도 한국어로 남는 것은 번역 누락이 아닙니다.

## 중앙 QA의 범위

루트의 `scripts/check-i18n.mjs`는 등록 프로그램만 검사하며 이 구버전 결과지 후보본은 그 레지스트리에 포함되지 않습니다. 결과지는 위 전용 validator와 브라우저 QA로 검증했습니다. 루트의 `--changed --strict-hardcoded` 실행에서는 이번 패치와 무관한 기존 `school-dashboard-demo/homeroom.html` 변경에 대해 한국어 하드코딩 후보 76건이 보고되었습니다. 해당 작업을 임의 수정하지 않았습니다. 저장소 전체 QA가 무조건 통과했다고 보고하지 않습니다.

## 남은 운영 확인

1. 개발자의 실제 운영 HTML은 후보본과 목차·DOM이 다를 수 있습니다. 기존 상황 버튼과 마지막 렌더 순서를 staging에서 연결·확인해야 합니다.
2. 서버 저장 API, 인증/권한, reportId별 저장, 새로고침·재접속 복원은 개발자가 연결해야 합니다. 현재 패치가 서버 저장 완료를 의미하지 않습니다.
3. 495개 직무 각각의 PASS 적합도 규준은 신규 생성하지 않았습니다. 직무별 점수 기반 순위가 필요하면 별도 데이터 계약과 근거를 정한 뒤 연결해야 합니다.
4. 실제 iOS/Android 기기 및 모든 언어 PDF의 전체 페이지 육안 검수는 미실시입니다. 15개 언어 브라우저 화면/인쇄 DOM과 한국어 실제 PDF 다운로드를 검증했습니다.
5. main 병합·운영 URL 교체·운영 배포는 미실시입니다.

## 재실행

저장소 루트에서 실행합니다. 브라우저 스크립트의 Chrome/Playwright 경로는 실행 환경에 맞춰 확인하세요.

```text
node result-reports/dcas81/work-context/work-context.test.cjs
node result-reports/dcas81/work-context/browser-qa.cjs
node result-reports/dcas81/work-context/pdf-qa.cjs
node result-reports/guidance/guidance.test.cjs
node result-reports/integration/result-report-adapter.test.js
node result-reports/dcas81/unpacked/TESTS/profile81.test.js
node result-reports/dcas81/unpacked/TESTS/unique-profile81-names.test.js
node result-reports/tools/adult-aviation-jobs.test.cjs
node result-reports/tools/adult-aviation-browser-regression.cjs
node result-reports/tools/validate-reports.mjs
node result-reports/tools/validate-report-locales.mjs
node result-reports/guidance/browser-qa.cjs
```
