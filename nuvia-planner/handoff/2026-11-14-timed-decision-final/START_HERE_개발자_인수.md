# NUVIA PLANNER 판단형 활동카드 보강 패치 인수

작성일: 2026-11-13. **플래너 단독 기능·합성 환경 QA 완료 / 실제 운영 연동 미완료**.

이번 패치는 기업LAB에서 받은 판단형 활동을 같은 카드·활동·시도에 연결하여 계획, 시간 관리, 부분 답안, 최초 결정과 변경, 회고·확인·선택 동의를 보존하는 기능이다. 사진 업로드 패치가 아니다.

## 먼저 받을 파일

1. `NUVIA_PLANNER_TIMED_DECISION_15LANG_P2_LAYOUT_TITLE_HANDOFF_FULL_SOURCE.zip`: 재현 가능한 독립 검수용 전체 소스.
2. `NUVIA_PLANNER_TIMED_DECISION_15LANG_P2_LAYOUT_TITLE_HANDOFF_PATCH.zip`: 개발자 적용용. workspace/standalone 두 변형, 변경 전후 해시와 APPLY.py 포함.
3. `NUVIA_PLANNER_P2_LAYOUT_TITLE_HANDOFF_RESULTS_DOCS_LOGS_CONTRACTS_V2.zip`: 최종 검수 JSON·로그·계약·개발자 문서.
4. `INDEPENDENT_FINAL_EVIDENCE_QA.json`, `INDEPENDENT_PACKAGE_QA.json`, `INDEPENDENT_WINDOWS_REVIEW.md`, `windows-validation/`: Codex가 별도로 확인한 증거. Replit 인수서에 보고된 회귀12개 뒤 나머지5개도 완료하여 Windows 최종17스위트 통과.
5. 폭별 SCREENSHOTS ZIP 3개 및 `independent-browser/`: 화면 증거. 큰 전체 화면 PNG405개는 Replit 프로젝트에 보존되며 QA 묶음의 MAIN_SCREENSHOT_SHA256SUMS.json으로 식별한다.

`PENDING`, 이전 `REVIEW_CANDIDATE`, V3는 역사 자료다. 이번 최종 적용 대상은 **HANDOFF** 이름의 소스와 패치다. 원본 ZIP은 수정하지 않았다.

## 확인된 기준

| 기준 | 값 |
|---|---|
| 원본 Replit workspace | 8058a288bbc3d1410488f71354fd1190e8afe30e |
| 최종 Replit 로컬 커밋 | 732ac15b2e4a79959e0c0e4f3deedf39638b3d31 |
| 검수 제품 지문 | 5aab898a50b48eb3bc63fc9960777b65dae42c198e00b57b04e9f504935949a6 |
| 전체 소스 ZIP SHA256 | f6f32ca047bb3dafca263fc1b27aad8f6a527b05d24c7f3f8ade888d8aad7bb6 |
| 패치 ZIP SHA256 | 3976bd15f99df77a3ed1e61b97e21238b2acaa042b06b35085f47c2bca0683ca |

## 검수 결과

- 15언어 × 1440/768/360 전체 화면 **45/45**, 충돌 비교 **45/45**, 오른쪽 상단 언어 선택기·탭 제목 **45/45**. 같은 제품 지문으로 실제 실행한 원본 JSON을 대조했다.
- 최종 소스815파일, 자체 목록 제외814해시 일치. 보존 V3에 standalone130파일 패치를 적용한 전체 결과가 최종 소스와 정확히 같다.
- 제품654파일이 Replit 검수본 및 Windows 실행본과 일치. 마지막 포장 차이는 문서·포장도구·전달정보뿐이다.
- Windows 새 폴더 설치, 네이티브 도구4종, TypeScript, 일반/public 빌드, 17개 회귀 스위트 통과. 판단형153개·실제 제공 LAB1.2 샘플106개 assertion 포함.
- Windows 브라우저에서 보정 후 한국어/아제르바이잔어/아랍어360px 직접 확인: 오른쪽 상단 선택기, 번역된 제목, RTL, 가로 넘침 없음, 경고/오류 로그0.
- 별도 한국어 합성 검수에서 실제 백업파일 왕복·다른 계정 거부·확인 후 수정 시 동의 무효화·날짜별 메모 비공개 유지 확인. Windows 자동화의 파일 업로드 백업 왕복은 별도 미검증.

브라우저 자동화 검수는 번역문 적용·레이아웃·조작 검증이다. 원어민 언어 감수, 실물 스마트폰/태블릿, 실제 프린터 검수 완료를 뜻하지 않는다. 초기 과거404의 정확한 URL은 미확정이며 재검수에서 재현되지 않았다. 빌드의 큰 번들 경고는 남아 있다.

## 개발자 적용 순서

1. 개발자 최신 브랜치/커밋과 변경 파일을 먼저 보존한다. 현재 ZIP이 GitHub 최신 작업에 바로 덮어써도 되는 의미는 아니다. 이전 확인된14개 선행 파일 차이는 임의 해결하지 않았다.
2. 전체 소스를 임시 검수 폴더에 풀어 `docs/STUDIO_TIMED_DECISION_FINAL_HANDOFF.md`와 `STUDIO_TIMED_DECISION_PORTABLE_INSTALL.md`를 읽는다.
3. workspace 변형은 원본 monorepo, standalone 변형은 보존 V3 독립 소스에만 사용한다. 최소 workspace 설정이나 lock을 원본 monorepo에 통째로 덮어쓰지 않는다.
4. Python3로 `APPLY.py --root <검수사본> --variant workspace` 또는 `standalone`을 실행하여 변경 전 해시를 확인한다. 차이가 있으면 멈추고 병합한다. 통과한 사본에서만 `--apply`로 적용한다.
5. PowerShell 실행 전 `$env:PORT='5199'; $env:BASE_PATH='/'` 설정. pnpm frozen-lockfile 설치, 타입 검사와 일반/public 빌드 및 회귀를 실행한다. 독립 Windows 검수에서는 pnpm11.25.0을 사용했다.
6. `/timed-decision.html?review=1`에서 합성 계정으로 확인한다. 운영 인증으로 합성 계정을 제공하지 않는다.

## 반드시 별도로 연결·검수할 부분

- 기존 NUVIA SSO, 사용자·활동·시도 소유권, 운영 DB, 서버 시각/접수 순서, 결과지 원본 PASS/TOP5 어댑터.
- 실제 제공된 기업LAB **1.2** 샘플의 서명/원문 계약 호환은 검수했다. 기업LAB 최종 **1.3** 원문·스키마와 실제 두 서비스 왕복은 아직 미제공/미검증이다.
- 미공개 추가상황은 서버에만 보관하고 최초 답안 보존·활동 경과·1회 공개 조건을 서버에서 검증한다. 검토용 테스트 키를 운영 신뢰키로 사용하지 않는다.
- 중앙 저장 성공과 기기 저장 성공을 구분한다. 현재 확인·동의한 답안 버전만 자소서/STAR로 전달하며 날짜별 개인 메모와 선택하지 않은 느낌은 자동 공유하지 않는다.
- 외부 자소서 앱/기업 공유·실제 확인자 인증, 사진 첨부는 이번 완료 범위가 아니다.

이 인수 작업에서 main 병합·Git push·배포·기존 공개 URL 교체는 하지 않았다. 기존 D-CAS·결과지·구형 플래너와 사용자 기록도 수정하지 않았다.
