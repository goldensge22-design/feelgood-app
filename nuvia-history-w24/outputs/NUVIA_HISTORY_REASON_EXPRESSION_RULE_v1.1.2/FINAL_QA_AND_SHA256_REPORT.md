# 최종 승격·의미 비교·SHA-256 보고서

검사일: 2026-09-19

## 승격 판정

`NUVIA_HISTORY_REASON_EXPRESSION_RULE_v1.1.2_CANDIDATE`를 사용자 승인에 따라 `NUVIA_HISTORY_REASON_EXPRESSION_RULE_v1.1.2` 최종 기준본으로 승격·동결했다.

- 비교한 핵심 의미 절: 24개
- 의미 차이: 0건
- 변경 범위: 승인 상태, 버전 표기, 경로, 후보/최종 상태 문구
- 구현 P0 자동 종결: 0건
- 코드·UI·콘텐츠·사용자 기록 변경: 0건

상세 기계 비교 결과는 [SEMANTIC_COMPARISON_REPORT.json](./SEMANTIC_COMPARISON_REPORT.json)에 기록했다.

## 기준 파일 SHA-256

- 후보 규칙 본문: `43be70a856726711fc6a54eea193e7485486ff3ba73cee8d9c565028adf5ff24`
- 최종 규칙 본문: `c234f3c26175b7d294aea643d294f06b78ce99f50e60d413c8cc67fea5e5bc37`
- 후보 폴더 8개 파일 집계: `ffa5cb6ce5b1bef1638d0e609dd06d21fb2b379b3af8ed231196a1cb4cc257fc`

후보와 최종 규칙 본문 해시가 다른 이유는 최종 파일명·상태·승인·경로·후속 구현 상태 문구가 달라졌기 때문이다. 규칙 의미 비교는 0건이다.

## 보호 파일 무결성

- 보호 대상: 후보 폴더와 기존 마스터·실행 순서·연간 통합·대표 의미 기준본·대표 6미션 실행 폴더
- 보호 파일: 341개
- 변경: 0개
- 추가: 0개
- 누락: 0개
- 작업 전후 보호 목록 집계 SHA-256: `b6b27350e98077f227bcbe82590a9c61193121a4cf3af17dbb22136e528fb47e`

파일별 해시는 [PROTECTED_FILES_SHA256.json](./PROTECTED_FILES_SHA256.json)에 보존한다.

## OPEN 상태

- P0: 3건 OPEN / 구현 대기
- P1: 4건 OPEN
- P2: 2건 OPEN
- 별도 `EO-P1-01`: OPEN

실제 브라우저·모바일·마이크·터치펜 검수와 코드 테스트·빌드는 이번 규칙 승격 범위가 아니므로 수행하지 않았다.
