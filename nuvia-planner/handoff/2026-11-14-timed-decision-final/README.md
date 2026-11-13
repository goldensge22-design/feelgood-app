# 플래너 판단형 활동카드 최종 추가 인계

GitHub 추가 인계일: 2026-11-14. 제품 검수·포장 기준: 2026-11-13.

이 폴더는 기존 GitHub 전달본에 누락된 **플래너 쪽 판단형 활동카드 보강 패키지**를 추가한 것입니다. 기업LAB PR #3과 별도입니다. 제품 코드 변경, main 병합, 배포는 하지 않습니다.

## 개발자가 받을 파일

- [최종 ZIP 다운로드](https://github.com/goldensge22-design/feelgood-app/raw/refs/heads/codex/nuvia-planner-library-integration/nuvia-planner/handoff/2026-11-14-timed-decision-final/NUVIA_PLANNER_TIMED_DECISION_FINAL_HANDOFF_20261113.zip)
- [적용 지시서](START_HERE_개발자_인수.md)
- [패키지 대조 결과](INDEPENDENT_PACKAGE_QA.json)
- [최종 QA 증거 대조](INDEPENDENT_FINAL_EVIDENCE_QA.json)
- [Windows 독립 검수](INDEPENDENT_WINDOWS_REVIEW.md)

최종 ZIP: `NUVIA_PLANNER_TIMED_DECISION_FINAL_HANDOFF_20261113.zip`

SHA256: `14510333a2cbd2aa6e3e6f955ee2363eccb4d3303f963c270ce8bcfe09b47b7c`

크기: 12,477,979 bytes. 원본 ZIP을 수정하지 않고 저장했습니다.

## 포함 및 적용 범위

- ZIP 안의 `FULL_SOURCE`는 이전 V3 플래너 기능을 보존한 전체 소스와 이번 판단형 활동카드 보강을 포함합니다.
- ZIP 안의 `PATCH`는 기준 소스에 적용하는 증분 패치입니다. workspace/standalone 변형과 변경 전후 해시·APPLY.py를 제공합니다.
- 같은 최종 ZIP을 이미 적용했다면 다시 적용할 필요가 없습니다. 이전 패치들을 무조건 순서대로 덮어쓰지 마세요.
- 개발자 최신 브랜치는 별도로 보존하고, APPLY.py의 사전 해시 확인을 먼저 실행하세요. 불일치는 병합 대상으로 검토해야 합니다. 알려진 선행 14개 파일 차이를 이 인계에서 해결한 것은 아닙니다.
- 전체 소스는 재현·비교용입니다. 운영 저장소에 통째로 덮어쓰지 마세요.

## 검수 결과와 남은 연동

동일 제품의 보존된 검수 증거: 15언어 × PC/태블릿/360px 화면 45/45, 충돌 비교 45/45, 언어 선택기·탭 제목 45/45. Windows TypeScript·빌드·회귀 17스위트 통과. V3에 패치를 적용한 결과와 전체 소스의 일치도 확인했습니다. 이번 GitHub 업로드에서 이 기능 검수를 새로 실행한 것은 아닙니다.

**실제 운영 연동 완료를 뜻하지 않습니다.**

- 실제 제공 LAB 1.2 샘플의 합성 계약 검수는 완료했습니다.
- 최신 기업LAB 판단형 1.3은 수신 capability 및 `selected-decision-register/1.0` 확장을 요구합니다. LAB 최종 sender/schema와 플래너 receiver를 대조하고 실제 전달 → 저장 → 실행 → 기록 흐름을 별도로 검수해야 합니다.
- 운영 SSO·사용자 소유권·DB·결과지 PASS/TOP5·외부 STAR/자소서 연결은 개발자 적용 및 공동 검수 대상입니다.
- 사진 업로드는 포함되지 않습니다. 원어민 감수와 실물 기기 검수 완료를 주장하지 않습니다.
- [기업LAB PR #3](https://github.com/goldensge22-design/dcas-company-job-lab/pull/3)은 LAB 소스 전달본입니다. 이 플래너 패키지를 대신하지 않습니다.

## 기록 읽는 방법

ZIP 내부 지시서 및 `QA_STATUS_AT_PACKAGING_20261113.json`의 `githubPushed: false`는 **11월 13일 포장 당시 상태**입니다. 원본 증거 보존을 위해 변경하지 않았습니다. 이번 폴더의 Git 커밋이 GitHub 추가 전달 기록이며, 기능·번역 변경은 없습니다. 이번 포장 검사에서는 중첩 ZIP 7개와 파일 1,309개를 읽었고 지정한 민감 파일명·키 패턴 후보가 발견되지 않았습니다.

개발자는 이 폴더의 지시서와 ZIP을 함께 받아 적용하세요. main 병합과 운영 배포는 별도 결정입니다.
