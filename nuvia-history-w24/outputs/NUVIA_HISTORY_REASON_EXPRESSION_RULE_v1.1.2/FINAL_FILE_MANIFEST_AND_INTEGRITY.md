# 최종 파일 목록과 무결성

## 최종 산출물

| 파일 | 용도 |
|---|---|
| `00_BASELINE_DECLARATION.md` | 최종 기준본 선언과 동결 범위 |
| `NUVIA_HISTORY_REASON_EXPRESSION_RULE_v1.1.2.md` | 최종 이유 자유 표현 규칙 |
| `AGE_INPUT_AND_EVENT_CONTRACT.md` | 6연령 입력·이벤트·저장 계약 |
| `RULE_CONFLICT_AND_W24_BEFORE_AFTER.md` | 기존 충돌과 W24 전후 계약 |
| `REFERENCE_PRIORITY.md` | 참조 우선순위와 효력 범위 |
| `OPEN_ISSUES_P0_P1_P2.md` | P0 3·P1 4·P2 2 및 EO-P1-01 OPEN 목록 |
| `CANDIDATE_TO_FINAL_BASELINE_CHANGELOG.md` | 승인 상태·버전·경로 변경 이력 |
| `SEMANTIC_COMPARISON_REPORT.json` | 후보·최종 의미 절 24개 비교 결과 |
| `PROTECTED_FILES_SHA256.json` | 보호 파일 341개의 개별 SHA-256 |
| `FINAL_QA_AND_SHA256_REPORT.md` | 의미 비교·무결성·최종 판정 |
| `FINAL_FILES.sha256` | 이 매니페스트를 제외한 최종 파일 해시 목록 |
| `FINAL_FILE_MANIFEST_AND_INTEGRITY.md` | 본 파일 목록과 무결성 설명 |

## 해시 요약

- 후보 규칙 본문 SHA-256: `43be70a856726711fc6a54eea193e7485486ff3ba73cee8d9c565028adf5ff24`
- 최종 규칙 본문 SHA-256: `c234f3c26175b7d294aea643d294f06b78ce99f50e60d413c8cc67fea5e5bc37`
- `FINAL_FILES.sha256` SHA-256: `70ff63410b98901cf28c3aa5aa1c32ce29ca46318803241a815c25873a8bf48e`
- 매니페스트 작성 전 최종 폴더 11개 파일 집계 SHA-256: `e169570566010d401360aa8fea8b19233235f3ac0745cb33558baea49123200e`
- 보호 파일 341개 작업 전후 집계 SHA-256: `b6b27350e98077f227bcbe82590a9c61193121a4cf3af17dbb22136e528fb47e`

자기 참조 해시 문제를 피하기 위해 `FINAL_FILE_MANIFEST_AND_INTEGRITY.md`는 `FINAL_FILES.sha256`과 폴더 집계에서 제외했다. 이 파일을 제외한 각 산출물의 SHA-256은 `FINAL_FILES.sha256`에 기록했다.

## 최종 무결성 판정

- 후보 규칙 변경·누락: 0건
- 기존 기준본 변경·누락: 0건
- 코드·UI·사용자 기록 변경: 0건
- 후보와 최종본의 규칙 의미 차이: 0건
- 승인·버전·경로·상태 이외 변경: 0건

W24 구현은 시작하지 않았다.
