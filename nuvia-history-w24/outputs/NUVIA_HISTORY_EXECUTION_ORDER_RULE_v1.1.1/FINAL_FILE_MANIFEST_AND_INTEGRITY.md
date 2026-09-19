# 최종 파일 목록과 SHA-256 무결성 보고서

작성일: 2026-09-19. 상태: FINAL BASELINE / 동결.

## 최종 판정

`NUVIA_HISTORY_EXECUTION_ORDER_RULE_v1.1.1` 승격·동결 완료.

- P0-W24-PREFLIGHT-01: CLOSED — 최종 부록 등록으로 해소 완료.
- EO-P1-01: OPEN 유지.
- 후보와 최종의 규칙 본문 1~7장: 바이트 동일.
- 승인 상태·버전·경로·P0 상태 외 의미 변경: 0건.
- 정규 실행 단계: 8/8, 누락 0, 순서 일치.
- 코드·UI·빌드·PDF·사용자 기록 변경: 0건.

## 후보와 최종본 비교

| 대상 | SHA-256 |
|---|---|
| 후보 부록 원문 | `ce7781c6f058355dedab93e0e790506f15e7116ea14e5ee1bb38f2e3fe69f48c` |
| 최종 부록 | `240a23dc4e76212ac68c374fa1c3c0336a3dd95431eb46a44700240cd3859c8a` |
| 후보·최종 공통 규칙 본문 1~7장 | `92192737ca977a5be9d9c7a4d4c7126db51811c685cd03f174b11055c221d7da` |

최종 파일의 전체 해시는 승인 상태와 P0 종결 메타데이터 변경 때문에 후보와 다르다. 실행 순서·게이트·도움·불변성·기존 기록·resultId·비AI 규칙인 1~7장 해시는 같다.

## 보호 파일 무결성

최종 폴더 생성 전에 존재한 outputs 파일 1101개를 SHA-256으로 전후 대조했다.

- 변경: 0건
- 누락: 0건
- 후보 부록 포함: 변경·누락 0건
- 최종 마스터·대표 의미 기준본·후보 매니페스트에서 재확인한 항목: 36개

개별 경로와 전후 해시는 `PROTECTED_FILES_SHA256.json`에 기록했다. 수집 범위는 `rg --files outputs --hidden -g '!**/node_modules/**' -g '!**/.git/**'` 결과이며 브라우저 저장소와 전체 컴퓨터 파일을 뜻하지 않는다.

## 최종 산출물

1. `00_BASELINE_DECLARATION.md` — 최종 기준본 선언
2. `NUVIA_HISTORY_EXECUTION_ORDER_RULE_v1.1.1.md` — 최종 실행 순서 부록
3. `CANDIDATE_TO_FINAL_CHANGELOG.md` — 후보→최종 변경 이력
4. `REFERENCE_PRIORITY.md` — 참조 우선순위
5. `OPEN_ISSUES_P0_P1_P2.md` — P0 종결과 OPEN 목록
6. `W24_IMPLEMENTATION_REQUIRED_REFERENCES.md` — 후속 W24 필수 참조
7. `FINAL_FILE_MANIFEST_AND_INTEGRITY.md` — 본 보고서
8. `PROTECTED_FILES_SHA256.json` — 보호 파일 전후 해시 원장
9. `FINAL_FILES.sha256` — 위 8개 파일의 최종 해시 목록

`FINAL_FILES.sha256`은 자기 자신을 해시 목록에 넣지 않는다. 최종 Markdown 참조 17개를 확인했다.

## 미수행 범위

이번 단계에서는 코드 수정, UI 실행, 타입 검사, 자동 테스트, 빌드, PDF 생성, 네트워크 검사와 W24 구현을 수행하지 않았다. 이는 사용자 지시 범위에 따른 정상 종료다.
