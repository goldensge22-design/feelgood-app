# NUVIA PLANNER Studio 15언어 시안 인계 및 QA — 2026-10-22

## 개발자가 구분해야 할 세 대상

1. **이번 GitHub 인계본:** `codex/nuvia-studio-daily-note-demo`의 `nuvia-planner/studio-daily-note-demo/`. 오른쪽 상단 언어 선택, 합성 데모 과제·안내·보고서의 표시 전용 현지화, 접근 가능한 이름을 포함한다.
2. **기존 정식 플래너:** `nuvia-planner/demo/NUVIA_PLANNER_2_5D.html` 및 기존 `nuvia-planner/source/`. 이번 변경에서 수정·배포하지 않았다. Studio의 15언어 QA를 정식본의 15언어 완역으로 보고하지 않는다.
3. **결과지·서버 개발본:** 인증·권한·결과 해석의 소유자다. Studio의 합성 점수와 예시 과제를 실제 결과지로 오인하거나 운영 데이터로 이전하지 않는다.

`main`, D-CAS, 결과지, 구형 BrainMap Planner는 이 인계에서 변경하지 않았다. 정식본에 적용할 때는 브랜치 전체를 덮어쓰지 말고, 현재 결과지 연동 브랜치의 adapter·저장 계약과 비교해 필요한 UI와 번역 계층을 이식한다. 승인 전 운영 병합·배포 금지.

## 이번 변경의 동작 경계

- 상단 선택기는 15언어를 지원하고 현재 화면·입력·실행 상태를 바꾸지 않고 `studio.locale`을 저장한다. 모바일에서는 제목보다 위, 화면 오른쪽에 배치한다.
- `src/studio/i18n/demo-resources.ts`는 기관별 합성 과제의 제목·과목·고지 등 **신규 14개 표시 key**만 담는다. 기존 1,138 key locale pack과 일일 메모 20 key를 재생성하지 않았다. 외국어 신규 문구는 AI 초안이다.
- `src/studio/i18n/demo-copy.ts`는 출처 ID, 최초 이력 시각, 제목·과목 원문이 일치하는 *수정되지 않은 합성 과제*에만 표시 번역을 적용한다. 같은 제목의 사용자가 만든 과제나 수정·복사된 과제는 번역하지 않는다. 저장값·편집 입력값·백업·실행 기록은 원문 그대로다. 보고서 출력에는 임시 복제본만 사용한다.
- `src/studio/i18n/StudioDemoNotice.tsx`는 실제 개인정보·검사 결과 입력 금지, 브라우저 로컬 저장, 미연결 서버, 평문 백업, 가상 점수 한계를 선택 언어로 고지한다.
- 편집·네임택 색·계획 순서 버튼의 접근 가능한 이름도 표시 전용 합성 과제명을 사용한다. 사용자가 직접 쓴 한국어는 임의 번역하지 않는다.
- Windows에서 동작하던 `src/studio/i18n/compiler.mjs`의 경로 처리는 유지했다. 리플릿의 POSIX 전용 변경을 가져오지 않았다.

## 확인한 QA

| 검증 | 결과 |
| --- | --- |
| Studio 리소스 validator | 1,138 key × 15언어, 일일 메모 20 key × 15언어 통과 |
| 새 합성 데모·접근성 정적 검사 | 1,606개 통과 |
| 기존 Studio i18n / 핵심 / 알림 / 메모 / 외부 데모 | 439 / 1,392 / 545 / 365 / 68개 통과 |
| TypeScript / Vite build | 통과. 기존 bundle 크기·comparison script 경고는 남음 |
| 로컬 실제 Chromium 화면 | 15언어 × 기관별 3종 × 1440px·360px = 90조합, 일반 Studio × 15언어 × 2폭 = 30조합; 선택기, 합성 과제, 한국어 잔존, 접근성 속성, 저장 원문, 가로 넘침, 언어 유지 확인; 오류 0 |
| Replit 시안 측 추가 화면 QA | 15언어 × 4진입점 × 2폭 × 4화면 = 480/480 통과 보고; 접근성 선택/일시정지 168/168 통과 보고 |

Replit 측의 상세 보고서 사본은 `nuvia-planner/studio-daily-note-demo/handoff/studio-i18n-qa/`에 있다. 로컬 120조합은 `artifacts/nuvia-ui-review/scripts/qa-studio-languages.mjs`로 재현할 수 있다. 그 스크립트는 데모 resource에서 기대 문구를 직접 읽어 이전 번역 fixture와의 오탐을 막는다. 화면 캡처는 같은 artifact의 `qa-studio-desktop.png`, `qa-studio-mobile.png`에 있다.

저장소 루트 `node scripts/check-i18n.mjs`는 등록 프로그램에 대해 통과했다. `--changed --strict-hardcoded`는 **별도 작업 중인 school-dashboard-demo의 한국어 하드코딩 후보 76건**으로 실패했다. Studio는 현재 중앙 `i18n/programs.json` 등록 대상이 아니므로 루트 정적 QA 통과를 Studio 완역 증거로 계산하지 않는다.

## 남은 작업 및 출시 기준

- 기존 정식 한국어 전용 파일에 15언어가 자동 적용된 것은 아니다. 결과지·서버 연동 브랜치와 충돌 검토, 정식본용 locale 구조·문구 분리, 실제 계약 통합 테스트가 별도 필요하다.
- 번역의 key 존재·브라우저 표시 QA는 통과했으나 14개 언어의 원어민 의미·자연스러움 검수는 하지 않았다. AI 초안을 `reviewed`로 승격하지 않는다.
- 실제 iPhone/Safari, 실제 학생·교사의 사용성, 개인정보·권한·백업 복원, 인지 향상·교육 효과 검증은 이 데모 QA의 범위가 아니다.
- 공개 Replit 주소는 GitHub 브랜치와 독립 배포다. 공개 화면에 이 변경이 나타나는지는 배포 후 별도 확인해야 한다.

## 개발자 재현 명령

`nuvia-planner/studio-daily-note-demo/`에서:

```powershell
pnpm install --frozen-lockfile --ignore-scripts
node tools/nuvia-studio/validate-i18n.mjs
node tools/nuvia-studio/run-i18n-check.mjs
node tools/nuvia-studio/run-demo-locale-check.mjs
node tools/nuvia-studio/run-core.mjs --i18n
node tools/nuvia-studio/run-notice-check.mjs
node tools/nuvia-studio/run-daily-note-check.mjs
node tools/nuvia-studio/run-external-demo-check.mjs
pnpm run typecheck:libs
pnpm --filter @workspace/nuvia-ui-review typecheck
$env:PORT='5173'; $env:BASE_PATH='/'; pnpm --filter @workspace/nuvia-ui-review build
cd artifacts/nuvia-ui-review
node scripts/qa-studio-languages.mjs
```

브라우저 스크립트는 로컬 Playwright/Chrome 경로가 없으면 환경변수 `PLAYWRIGHT_MODULE`, `CHROME_PATH`를 지정해야 한다.
