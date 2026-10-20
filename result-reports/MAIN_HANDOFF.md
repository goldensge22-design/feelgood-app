# FeelGood 결과지 main 작업 인계

2026-10-21 사용자 요청에 따라 개발자가 `main`에서 K-PASS, D-CAS 청소년·성인 결과지와 최신 성인 재직자 직무 선택 패치를 이어서 작업할 수 있도록 구성했습니다. GitHub 소스 인계이며 운영 서버 배포 완료를 뜻하지 않습니다.

## 개발자가 먼저 볼 위치

- 최신 성인 재직자 패치: [데이터 계약과 적용 지시서](dcas81/work-context/DEVELOPER_HANDOFF.md)
- 재직자 QA 범위와 남은 확인: [검증 기록](dcas81/work-context/VALIDATION.md)
- 공통 입력 adapter: `integration/result-report-adapter.js`
- 세 결과지 위치: [작업공간 안내](README.md)

| 결과지 | 실행 HTML |
| --- | --- |
| K-PASS | `result-reports/kpass/candidate/report.kpass.final.html` |
| D-CAS 청소년 | `result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_TEEN/teen.work.html` |
| D-CAS 성인 및 재직자 | `result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_ADULT/adult.work.html` |

HTML만 단독 복사하지 말고 상대 경로로 참조하는 엔진·locale·guidance·work-context 파일을 함께 유지하세요. `baseline/`, `references/`, `PATCH_FILES/`와 원본 ZIP을 실행 후보본 대신 연결하지 마세요.

## main 통합 기준

- 통합 전 원격 main: `abca7e745cc6e99d061d9c38e22aa8f06a79b14c`
- 원래 결과지 패치 기준: `be3259e9a23101a4914cbad8322d8981851c6321`
- 결과지 전용 선행 변경: 원래 `d85af1c`부터 `be3259e`까지 15개 커밋
- main에는 `result-reports/` 자체가 없었으므로 실행에 필요한 공통 파일·원본 증거본·검증 자료를 포함한 결과지 작업 폴더를 추가했습니다.
- 통합 직후 352개 결과지 파일의 Git tree가 원래 검증본과 동일한 것을 확인했습니다. 이후 변경은 main 위치를 안내하는 인계 문서뿐입니다.
- NUVIA 관련 커밋은 제외했습니다. 기존 main 파일, 루트 ZIP, 대시보드, 제안서 및 공개 URL은 변경하지 않았습니다.
- 원래 복구·패치 브랜치는 그대로 보존합니다. 선택 적용 과정에서 main 쪽 커밋 SHA는 원래 커밋 SHA와 다릅니다.

## 통합 검증

통합본에서 다음 검사를 다시 실행해 통과했습니다. 결과지 소스는 원래 QA 통과본과 같으며 원어민 검수나 운영 배포 검증을 대신하지 않습니다.

- 재직자 모듈: 495개 코드, 15개 언어 × 735개 key, adapter·placeholder·source hash 검사
- 기존 3종 결과지: 불변 원본, locale, 개인화 243개 조합/3,645개 언어·프로필, 공통 adapter 검사
- D-CAS: 81유형, H/M/L 경계, S/Q 0·10·11점 및 15개 언어 명칭 검사
- 재직자 브라우저: 15개 언어 × 3개 화면 폭 × 5개 핵심 화면, 실제 DOM 81조합 및 상황/언어 전환
- 기존 항공보안: 10개 직무와 6개 언어 실제 DOM 회귀 검사

기존 실제 PDF 다운로드 검증 결과는 `dcas81/work-context/qa/pdf-export.json`, 전체 페이지 검사 기록은 `qa/pdf-pages.json`을 참고하세요. 이번 main 통합은 PDF 생성 코드나 번역값을 변경하지 않습니다.

통합 기준 main에는 `scripts/check-i18n.mjs`가 없어 결과지 전용 validator를 사용했습니다. 다른 개발 브랜치의 중앙 QA 스크립트나 프로그램을 이 인계를 위해 임의로 추가하지 않았습니다.

## 개발자가 이어서 할 작업

1. 로컬 변경을 보존한 뒤 최신 `origin/main`을 가져옵니다. 새 작업은 최신 main 기준의 별도 개발 브랜치에서 진행하는 것을 권장합니다.
2. 성인 payload에 `workContext.status`, `occupationCode`, `jobTitle`, `tasks`를 연결합니다. 재직자는 학과를 필수로 요구하지 않습니다.
3. `fg-report-context-changed` 이벤트를 기존 reportId별 저장 API에 연결하고 재진입 payload로 복원합니다.
4. 실제 운영 화면의 기존 상황 버튼과 모듈을 연결해 학과 결과가 나중에 덮어쓰지 않는지 확인합니다.
5. staging에서 실제 데이터·권한·새로고침·모바일·PDF를 확인한 뒤 별도 운영 배포 절차를 진행합니다.

15개 언어 신규 문구는 Google 기계 번역입니다. 실제 모바일 기기와 모든 언어 PDF 전체 페이지 육안 검수는 별도 확인 대상입니다. 직무 분류를 검증된 직무 적합도 규준으로 간주하거나 검사 결과만으로 채용·배치·인사평가를 결정하지 마세요.
