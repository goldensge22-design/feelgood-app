# W24 최신 작업본 복구·서버 재시작

상태: **W24 복구 후 기술 재검수 / 사용자 화면 검토 대기**. W24 동결·W01 구현·main 병합 없음.

## 확정한 소스와 보존

- 최신 복구 기준: `3c839f91ddb5acbcaec0e9e03c5f1e60acfab844` (2026-09-20 15:50 KST).
- 이전 기준본: `625dd10796f0ed7de2cd47fe5645a897a0fc5269`. 수정·초기화하지 않았다. 검수된 최신 W24로 표시하지 않는다.
- `706bc03`은 원본 RECHECK 복구, `1cf1629`는 LAN UUID 호환, `a60c184`는 활동 UI, `3c839f9`는 유아 렌더링 가드 수정이다. 검수 원본과 이후 수정본을 혼동하지 않는다.
- `SOURCE_SNAPSHOT_SHA256.json`의 실제 468개 목록을 `706bc03` Git 객체와 이번에 다시 대조: 468개 일치, 누락/불일치 0. 이후 커밋은 의도적인 변경이므로 최신본이 원본 468개와 같다고 주장하지 않는다.
- RECHECK `preschool-simplification/REVIEW.md`, `c2-collapsed.png` 및 최신 `PRESCHOOL_RENDERING_GUARD_2026-09-20.md`, `qa/preschool-guard/preschool-c2-reason.png`를 직접 대조했다. 원본의 말·그림/다른 방법/이유 생략과 최신 그림 중심 화면은 서로 다른 시점이다.
- 최신 소스를 찾았으므로 이번에 화면 기능을 추정 재구현하지 않았다. 기존 활동·질문·그림·CSS·콘텐츠·엔진은 `3c839f9`와 동일하다.

## 검색 범위와 후보

- origin fetch 후 모든 로컬/원격 추적 ref, worktree, stash, 전체 reflog를 조회했다. 검색 당시 로컬 브랜치 7개, 기존 worktree 5개, stash 0개, reflog 고유 커밋 36개. 새 worktree는 이후 추가했다. 내부 Codex checkpoint ref도 포함해 HISTORY 경로 이력을 조회했다.
- GitHub, `.codex/worktrees`, Documents, OneDrive, Downloads에서 무시된 파일을 포함해 소스/outputs/dist/검수·백업 후보를 검색했다. node_modules, .git 및 런타임 dependencies는 제외했다.
- Downloads와 저장소 루트 zip의 엔트리를 조회했다. `NUVIA_HISTORY_review.zip` 및 `(1)`은 2026-09-15 설계 v3.1 / 배포 커밋 `d7022543...`의 별도 퍼즐 데모다. W24 RECHECK 이후 후보가 아니다. `NUVIA_FINAL.zip`은 CAREER LAB이다.
- 기존 HISTORY worktree에 최신 W24 소스·빌드·검수 캡처가 함께 있었고 작업 트리는 깨끗했다. 조사 범위에서 `3c839f9` 이후 별도 W24 소스는 발견하지 못했다.
- 원본 원격 작업의 read_thread는 호스트 unavailable로 응답했다. 원격 PC의 현재 미커밋 파일까지 확인한 것으로 주장하지 않는다. 이번 확정은 로컬에 보존된 원본 스냅샷과 Git 이력에 근거한다.
- main 작업 폴더의 교사가이드 미커밋 변경(`app.js` 삭제 상태, `index.html` 수정, 데이터 파일 3개 추가)은 건드리지 않았다. PLANNER·D-CAS·기존 HISTORY 폴더도 수정하지 않았다.

## 서버 사실관계

중지 전 PID 30948은 `625dd10` 루트가 아니라 기존 `nuvia-history-w24/feelgood-app/nuvia-history-w24/outputs/NUVIA_HISTORY_REPRESENTATIVE_6_v1.0_DRAFT/dist-app`을 제공하고 있었다. 해당 worktree HEAD는 `3c839f9`이고 깨끗했다. 따라서 '현재 서버가 625dd10을 실행 중'이라는 전제는 이번 프로세스 조사와 일치하지 않는다.

- 새 브랜치: `codex/nuvia-history-w24-latest`
- 새 worktree: `C:\Users\golde\.codex\worktrees\nuvia-history-w24-latest\feelgood-app`
- 앱: 위 폴더의 `nuvia-history-w24\outputs\NUVIA_HISTORY_REPRESENTATIVE_6_v1.0_DRAFT`
- 실제 서비스: 앱의 `dist-app`; 포트 5192; 재시작 PID 19548(현재 세션 한정).
- 미션 5.2.0 / 콘텐츠 3.3.0.
- LAN: <http://192.168.45.172:5192/?qa=1&age=preschool&mission=gutenberg&new=1>
- 서버 PC: <http://127.0.0.1:5192/?qa=1&age=preschool&mission=gutenberg&new=1>
- 재시작 스크립트: `START_LATEST_W24.ps1`. 기존 포트가 사용 중이면 자동 종료하지 않고 중단한다. 전용 브랜치 확인 후 절대 dist 경로로 실행한다.
- 메인 JS: `index-BwEn2zZ-.js`; SHA-256 `AECA758C2ECAE2C76ADE61B53B294B46C252CEBC26765EC66E46AB0A0DB6734C`.

## 이번 변경: 실행 연결만

- `mission=gutenberg`를 이제 실제로 읽고 지원 미션을 검증한다. 미지원/빈 mission은 묵살하지 않고 진입을 차단한다. 기존 mission 없는 링크는 Gutenberg로 유지한다.
- `qa=1` 모의 진입과 `age=preschool` 연령 검증은 기존 구현을 유지한다. 실제 연결 프로필이 존재하면 기존 프로필 우선 규칙도 유지한다.
- `new=1`은 자동 재개만 막으며 저장소를 지우지 않는다. 새 시작 뒤 기존 run과 새 run이 함께 남는지 실제 IndexedDB에서 검사했다.
- 이전 검수 환경의 정확한 의존성 잠금 파일을 보존했다. 설치 스크립트 자동 실행은 허용하지 않았다. Node로 tsc/vite/tsx를 직접 실행했다.
- 새 QA 산출물은 `qa/latest-restore/`에 별도 저장하여 이전 검수 캡처를 덮어쓰지 않았다.

## 재검수 결과

| 검사 | 이번 결과 |
|---|---|
| TypeScript / Vite 프로덕션 빌드 | 통과 |
| 자동 테스트 | 285/285 (기존 282 + 진입 파라미터 3) |
| LAN query / resume / new 비삭제 / 잘못된 mission 차단 | 통과, `entry-results.json` |
| 390×844, 5개 대표 연령 × C1/C2 | 10경로·54개 화면 검사 통과, 시각 warning 0 |
| 1440×900, 같은 대표 경로 | 10경로·54개 화면 검사 통과, 시각 warning 1 |
| 그림 초안 새로고침 복원 / C1 이유 저장 / C2 이유 생략 | 통과 |
| 행동 선택·관찰·수정 후 이유 생략 | 통과; 핵심 행동 단계 생략 없음 |
| 내 이야기 입력 → 실제 역사/최초 예측 비교 → 완료 | 통과 |
| QA Inspector와 실제 플레이 영역 분리 | 통과 |
| 내장 브라우저 실제 LAN 시작 화면 | 확인; 기존 기록의 이어서 버튼 보존 |

데스크톱 `desktop-preschool-c1-history-comparison`에서 그림 영역 측정값 62.2% warning이 기록됐다. 그 순간 측정 목록에는 사용자 그림 이미지가 빠져 있고 캡처에는 이미지가 보인다. 이미지 비동기 로딩 타이밍의 영향일 가능성이 있으나 원인 확정/수정하지 않았다. 복구 요청 범위에 맞춰 화면/CSS를 바꾸지 않고 후속 화면 QA 항목으로 남긴다. 기능 검증 통과와 시각 warning을 구분한다.

실제 LAN HTTP에서 마이크가 지원되지 않으면 말 버튼을 작동 가능한 것처럼 표시하지 않는다. 녹음 지원 기기에서는 말·그림 우선, 쓰기는 다른 방법이다. 이번에는 실제 마이크/휴대전화/터치펜을 검증하지 않았다. 런타임 언어는 한국어이며 다국어 완료로 표시하지 않는다. 과거 보호 파일 1,147개 전체 원본은 이 복구 폴더에 모두 없으므로 해당 숫자를 새 검증 결과로 재사용하지 않는다.

현재 기술 복구 완료는 교육 활동 승인이나 사용자 화면 승인, W24 동결을 의미하지 않는다.
