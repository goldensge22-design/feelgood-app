# D-CAS 81개 고유 노출 명칭 패치

## 목적

기존 D-CAS 후보본은 81개 H/M/L 조합을 계산하지만 표지와 기질 영역의 명칭은 소수의 공통 제목을 여러 조합에서 공유했습니다. 이 패치는 P/A/S/Q의 H/M/L 조합을 기준으로 81개 모두 서로 다른 노출 명칭을 반환합니다.

## 적용 위치

- 청소년: `result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_TEEN/`
- 성인: `result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_ADULT/`
- 패치 파일: 각 폴더의 `dcas-profile81-unique-names.js`
- 로드 순서: `dcas-profile81-bank.js` 다음, 콘텐츠 엔진 이전

기존 복구 원본 `result-reports/dcas81/source/`, `PATCH_FILES/`, `dcas/baseline/`, K-PASS는 수정하지 않습니다.

## 동작

1. 기존 `DCasProfile81.classify()`를 호출해 H/M/L 경계와 예외 처리를 그대로 사용합니다.
2. 반환된 네 축 등급 조합으로 고유 명칭을 계산합니다.
3. 기존 `code`, `compactCode`, `kind`, 요약, 네 축 문장, 학습/진로/직무 추천, S/Q 11점 판정은 변경하지 않습니다. 단, 기존 공통 엔진에 없던 `fr`, `mn`, `zh-TW`의 81유형 본문은 중앙 결과지 locale의 기존 번역을 재사용해 한국어 fallback 노출을 막습니다.
4. 결과 객체에 `nameSchema: "dcas81-unique-v1"`을 추가합니다.
5. 기존 콘텐츠 엔진의 마지막 `applyProfile81()` 단계가 표지와 기질 영역에 고유 명칭을 표시합니다.

## 명칭 원칙

- H 영역: 핵심 강점 또는 주도 특성
- M 영역: 안정적으로 활용 가능한 특성
- L 영역: 보완 또는 성장 특성
- HHHH, MMMM, LLLL: 각각 별도 전영역 명칭
- 동일한 명칭은 두 조합 이상에서 사용하지 않음

예시:

| 코드 | 고유 노출 명칭 |
|---|---|
| `P-H / A-H / S-H / Q-M` | 전략통찰 · 절차주도 안정형 전략가 |
| `P-H / A-H / S-H / Q-L` | 전략통찰 · 절차주도 보완형 전략가 |
| `P-M / A-M / S-M / Q-H` | 절차주도 · 전략통찰 안정형 실행가 |
| `P-M / A-M / S-M / Q-M` | 전영역 균형형 전략 탐색가 |

## 언어

고유 명칭 생성기는 다음 15개 locale을 지원합니다.

`ko`, `en`, `ja`, `zh`, `zh-TW`, `es`, `fr`, `ru`, `vi`, `th`, `ar`, `it`, `az`, `km`, `mn`

한국어는 결과지용 조합 명칭을 사용하고, 나머지 언어는 각 언어의 축 이름과 주도·안정·보완·성장 토큰을 조합합니다. 신규 번역은 기계 번역 기반 기술 QA 상태이며 원어민 검수 완료를 의미하지 않습니다.

`fr`, `mn`, `zh-TW`는 `result-reports/locales/dcas-teen.locales.js` 또는 `dcas-adult.locales.js`에서 기존 번역을 읽습니다. 별도 번역 사본을 만들지 않으므로 이후 중앙 locale을 수정하면 81유형 본문에도 같은 번역이 적용됩니다.

## 검증

```powershell
node result-reports/dcas81/unpacked/TESTS/profile81.test.js
node result-reports/dcas81/unpacked/TESTS/unique-profile81-names.test.js
node result-reports/tools/validate-reports.mjs
node result-reports/tools/validate-report-locales.mjs
node result-reports/tools/multilingual-browser-regression.cjs
$env:DCAS_TRACK='teen'
node result-reports/dcas81/unpacked/TESTS/browser-dom-regression.js
$env:DCAS_TRACK='adult'
node result-reports/dcas81/unpacked/TESTS/browser-dom-regression.js
Remove-Item Env:DCAS_TRACK
```

고유 명칭 테스트는 청소년·성인 각각 15개 언어의 81개 조합에서 명칭 중복이 0개인지 확인하고, 기존 코드·종류·요약·추천이 바뀌지 않았는지 비교합니다.

## 2026-10-02 검증 결과

- 청소년·성인 각각 `15 locale × 81 조합`: 명칭 중복 0, PASS
- 52/53, 74/75, ALL_L, ALL_M, ALL_H, S/Q 차이 0·10·11, 양방향 우세, 누락·비정상 점수: PASS
- 청소년 실제 DOM, 늦은 덮어쓰기, 모바일 390px, 인쇄/PDF: PASS
- 성인 실제 DOM, 늦은 덮어쓰기, 모바일 390px, 인쇄/PDF: PASS
- K-PASS·D-CAS 청소년·D-CAS 성인 15개 언어 전환, 한국어 잔존, 모바일 폭: PASS
- 번역 상태: 기계 번역 기술 QA 완료, 원어민 검수 미실시
