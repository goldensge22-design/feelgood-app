# 결과지 패치 계보와 적용 판정

이 문서는 파일명 순서가 아니라 Git commit 날짜, ZIP 해시, 실제 코드 차이를 기준으로 적용 관계를 정리한다.

## K-PASS

| 날짜/commit | 자료 | 판정 |
|---|---|---|
| 2026-08-23 `9c461a0` | `report.kpass.final.html` | 과거 단일 HTML. archive 보존 |
| 2026-08-24 `113e3d3` | `report.kpass.overseas (1).html` | 과거 해외/언어 실험본. archive 보존 |
| 2026-09-07 `d85116f` | `files (26).zip` 안 `KPASS-STATUS.md`, `kpass-score-engine.js` | 진단/설계 참고. 09-12 최종본보다 오래되어 자동 덮어쓰기 금지 |
| 2026-09-12 `f7e1752` | `KPASS_CHILD_FINAL_2026-09-12.zip` | 현재 K-PASS 코드 기준본 |
| 현재 통합 브랜치 | `result-reports/kpass/candidate/` | 위 ZIP 압축 해제본 + 불완전 locale 사용자 노출 차단 |

K-PASS의 09-12 결과지는 `window.__TEST_PROFILE__` 개인화, `fullScaleScore`, 점수 그래프/표지 연동 코드를 포함한다. 그러나 상세 본문은 한국어이며 표지·메뉴만 번역된 locale가 혼재한다. 기존 locale 값은 삭제하지 않고, 전체 번역 전까지 언어 메뉴에는 `ko`만 노출한다.

## D-CAS 공통 기준본

| 날짜/commit | 자료 | 판정 |
|---|---|---|
| 2026-09-11 `a7c3a4d` | `dcas-adult-patched.zip` | 과거 패치 1차 |
| 2026-09-11 `440e4db` | `dcas-adult-patched (1).zip` | 과거 패치 2차 |
| 2026-09-11 `d5b9c7e` | `dcas-adult-patched (2).zip` | 과거 패치 3차 |
| 2026-09-11 `e1a92c4` | `dcas-adult-patched (4).zip`, `dcas-teen-patched (1).zip` | 최종 ZIP 직전 패치 |
| 2026-09-13 `0990e21` | `DCAS_FINAL_REBUILT_20260912.zip` | 기준 최종 ZIP |
| 2026-09-13 `e57b93c` | `DCAS_FINAL_REBUILT_20260912 (1).zip` | 위 파일과 SHA-256 동일. 중복 업로드 |
| 현재 통합 브랜치 | `result-reports/dcas/baseline/` | 최종 ZIP 내부 teen/adult 압축 해제 기준본 |

`DCAS_FINAL_REBUILT_20260912.zip`과 `(1).zip`은 크기와 SHA-256이 동일하다. 둘 중 `(1).zip`을 manifest 원본 경로로 기록했지만 내용상 우열은 없다.

## D-CAS 81유형

| 날짜/commit | 자료 | 판정 |
|---|---|---|
| 2026-09-19 GPT Library | `DCAS_81_PROFILE_PATCH_v1.0.zip` | 복구 원본 증거본 |
| 2026-09-20 `d85af1c` | `codex/recover-planner-dcas81` | 원본 ZIP·압축 해제본 보존. 수정 금지 |
| 2026-09-20 `91c6b8f` | `codex/dcas81-finalize` | 성인 S/Q 11점 기준, 81조합/DOM/mobile/PDF QA 완료 |
| 2026-09-21 `2a9b5dc` | `codex/dcas81-khmer-final` | Khmer 81유형 레이어와 QA 추가. 전체 결과지 Khmer는 아님 |
| 현재 통합 브랜치 | `result-reports/dcas81/unpacked/APPLIED_FULL/` | D-CAS 청소년/성인 현재 개발 후보본 |

## 후속 선택 패치

### `files.zip` — commit `793e213`, 2026-09-15

성인 항공보안학과 직무 10개 패치다. 전체 결과지나 K-PASS가 아니다.

- 적용 상태: 현재 성인 개발 후보본에 통합. 원본 ZIP과 reference는 증거본으로 유지
- 데이터 상태: `pass_profile`은 원본대로 `estimated`, confidence 0.5이며 전문가 확정값은 아님
- 통합 범위: 요청된 10개 직무 전용 풀, 항공보안/산업보안 복수 직무군, `항공보안과`/`항공보안학과` 별칭
- 언어: 공통 D-CAS locale 번들로 `ko/en/ja/zh/es/ru/vi/th/ar/it/az/km` 전체 문장 연결
- QA: 10개 고유 직무 단위검사 및 `ko/zh/km` 실제 DOM·모바일·인코딩 검사 통과
- 위치: `result-reports/dcas/references/files-zip/`

### `files (21).zip`, `files (26).zip`

직무 데이터, 부분 `report-i18n.json`, 과거 진단과 패치가 섞인 자료다. `report-i18n.json`은 전체 결과지 locale가 아니라 일부 페이지의 `ko/en/ja/zh-CN` 문구다. 전체 언어팩으로 적용하지 않는다.

## 개발 시 사용 금지

- 파일명이 더 최근처럼 보인다는 이유로 archive ZIP을 후보본 위에 덮어쓰기
- `files (26).zip`의 과거 `kpass-score-engine.js`를 09-12 K-PASS 엔진 위에 통째로 복사
- `files.zip`의 추정 직무 프로파일을 전문가 검수 없이 운영 적용
- D-CAS 81유형 locale 수를 전체 결과지 언어 수로 표시
- 부분 번역 locale를 운영 언어 메뉴에 노출

## 현재 단일 기준

- K-PASS: `result-reports/kpass/candidate/`
- D-CAS 청소년: `result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_TEEN/`
- D-CAS 성인: `result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_ADULT/`
- 서버 연동: `result-reports/integration/result-report-adapter.js`
- 상태/언어 판정: `result-reports/reports-manifest.json`
- 자동 검사: `node result-reports/tools/validate-reports.mjs`
