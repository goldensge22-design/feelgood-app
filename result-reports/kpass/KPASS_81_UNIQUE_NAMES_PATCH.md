# K-PASS 81개 고유 노출 명칭 패치

## 목적

K-PASS 후보본은 P/A/S/Q를 상·중·하로 분류해 81개 조합별 본문을 만들고 있었지만, 표지 명칭은 상위 두 축 기준 7종을 반복했습니다. 이 패치는 네 축의 H/M/L 조합별로 81개 모두 서로 다른 명칭을 표시합니다.

## 적용 위치

- 진입 HTML: `result-reports/kpass/candidate/report.kpass.final.html`
- 기존 엔진: `result-reports/kpass/candidate/kpass-content-engine.js`
- 명칭 패치: `result-reports/kpass/candidate/kpass-profile81-unique-names.js`
- 테스트: `result-reports/tools/kpass-profile81-unique-names.test.cjs`

로드 순서는 `kpass-content-engine.js` → `kpass-profile81-unique-names.js` → `kpass-figure-render.js`입니다.

## 유지되는 기존 계약

- 상: 표준점수 `120 이상`
- 중: `86~119`
- 하: `85 이하`
- 공식 전체척도 `fullScaleScore`
- 기존 상위 두 축 콘텐츠, 기질·학습·진로·부모·교사 개인화 문장
- 기존 상대 비교 학습유형과 `BALANCE_THRESHOLD`
- 백분위, 그래프, 안내 및 정밀평가 분기

명칭은 절대 H/M/L 조합을 설명하는 레이어입니다. 상대 비교 학습유형이나 전체척도 판정을 대체하지 않습니다.

## 표시 위치

- 표지 유형명 `#pf-cover-type`
- 결과 요약 유형명 `#pf-herotype`
- 81유형 상세 카드 `#pf-profile81-name`

결과 객체에는 `nameSchema: "kpass81-unique-v1"`, `code`, `compactCode`, `levels`가 포함됩니다.

## 예시

| 코드 | 고유 노출 명칭 |
|---|---|
| `P-H / A-M / S-L / Q-L` | 계획주도 · 구조표현 보완형 실행가 |
| `P-H / A-H / S-H / Q-M` | 전략통찰 · 절차주도 안정형 전략가 |
| `P-M / A-M / S-M / Q-M` | 전영역 균형형 전략 탐색가 |
| `P-L / A-L / S-L / Q-L` | 전영역 균형형 성장 탐험가 |

## 다국어

명칭 생성기는 `ko`, `en`, `ja`, `zh`, `zh-TW`, `es`, `fr`, `ru`, `vi`, `th`, `ar`, `it`, `az`, `km`, `mn`을 지원합니다. 언어 전환 이벤트 `fg-report-locale-changed`에 맞춰 현재 페이지와 사용자 데이터를 유지한 채 명칭만 교체합니다.

번역은 기계 번역 기반 기술 QA 대상이며 원어민 검수 완료를 의미하지 않습니다.

## 검증 명령

```powershell
node result-reports/tools/kpass-profile81-unique-names.test.cjs
node result-reports/tools/kpass-browser-regression.js
node result-reports/tools/multilingual-browser-regression.cjs
node result-reports/tools/validate-reports.mjs
node result-reports/tools/validate-report-locales.mjs
```

운영 서버는 기존과 동일하게 공식 K-PASS 표준점수와 `fullScaleScore`를 전달해야 합니다. 서버에서 81유형 이름을 별도로 계산하거나 하드코딩하지 않습니다.

## 2026-10-02 검증 결과

- `15 locale × 81 조합`: 명칭 중복 0, PASS
- 85/86 및 119/120 경계: PASS
- 기존 파생 점수·백분위·전체척도·균형형·개인화 결과 불변: PASS
- 표지·요약·81유형 카드 명칭과 코드 일치: PASS
- 반대 방향 프로필 및 제보 사례 `P130/A119/S80/Q71`: PASS
- 15개 언어 live 전환, 한국어 잔존, 모바일 가로폭: PASS
- 모바일 390px 및 인쇄/PDF 생성: PASS
- 번역 상태: 기계 번역 기술 QA 완료, 원어민 검수 미실시
