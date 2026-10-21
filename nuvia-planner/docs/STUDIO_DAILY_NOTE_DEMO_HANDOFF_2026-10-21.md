# NUVIA Studio 일일 메모 데모 인계 (2026-10-21)

## 범위와 기준선

- 작업 브랜치: `codex/nuvia-studio-daily-note-demo` (기준: `origin/codex/recover-planner-dcas81`, `ab5f1b1b86d4bb6665bf206b63471dc28201d524`).
- 전체 실행 소스: `nuvia-planner/studio-daily-note-demo/`. 기존 정식 플래너 `nuvia-planner/demo/NUVIA_PLANNER_2_5D.html`과 기존 `nuvia-planner/studio/`는 수정하지 않았다.
- 원본: Replit `ImpassionedWindyHardware`의 `NUVIA_STUDIO_DAILY_NOTE_FINAL.zip` (SHA-256 `A919D90BD0CE2A6FF3270D50D4787F27BC6917483D84AD8B59FC7800D924BFD1`). 동봉된 `SOURCE_MANIFEST.json`은 이 가져온 원본의 목록이다. 아래 두 로컬 보정 이후 최종 상태는 Git 커밋을 기준으로 한다.
- 공개용은 합성 예시 결과만 사용한다. 실제 검사 결과·학생 메모·백업 JSON을 Git 또는 데모에 올리지 않는다.

## 기능과 데이터 경계

일일 메모는 Studio 화면의 개인 기록이다. 날짜별 작성·수정·삭제, 새로고침과 기존 백업 왕복, 언어 전환 중 입력 보존이 테스트에 포함됐다. 메모 원문은 월간 리포트·로드맵·교사 공유에 자동 삽입하지 않는다. 브라우저 로컬 저장/평문 JSON 백업이며 인증, 서버 저장, 실제 결과지 연동은 아직 구현되지 않았다. 연동 개발자는 `nuvia-planner/docs/STUDIO_DEVELOPER_HANDOFF_2026-10-20.md` 및 `nuvia-planner/docs/NUVIA_PLANNER_RESULT_SERVER_INTEGRATION.md`의 계약을 검토하고, 실제 데이터 어댑터·권한·동의·보존 정책을 별도로 구현해야 한다.

가져온 원본에서 이 브랜치에 한정해 두 가지를 보정했다. `pnpm-workspace.yaml`과 lockfile에서 Windows x64 선택 패키지 제외를 해제해 Windows에서도 빌드할 수 있게 했다. `artifacts/nuvia-ui-review/src/studio/report.ts`의 생성 리포트 `<html lang>`과 `dir`을 현재 선택 언어에 맞췄다. 기존 번역값은 재생성하거나 덮어쓰지 않았다.

## 검증

Studio 소스 폴더에서 실행:

```text
pnpm install --frozen-lockfile --ignore-scripts
pnpm run typecheck:libs
pnpm --filter @workspace/nuvia-ui-review typecheck
node tools/nuvia-studio/run-notice-check.mjs
node tools/nuvia-studio/run-daily-note-check.mjs
node tools/nuvia-studio/validate-i18n.mjs
node tools/nuvia-studio/run-i18n-check.mjs
node tools/nuvia-studio/run-core.mjs --i18n
node tools/nuvia-studio/run-external-demo-check.mjs
pnpm --filter @workspace/nuvia-ui-review build
```

2026-10-21 로컬 결과: 알림 545, 일일 메모 365, i18n 동작 136, Studio 핵심 1392, 외부 데모 68 검사 통과. 15개 언어 각각 기본 1138키와 일일 메모 20키의 존재·placeholder·상태 검사를 통과했고 TypeScript와 Vite 프로덕션 빌드가 통과했다. 빌드에는 큰 Studio 청크 및 구 비교 페이지의 non-module script 경고가 남는다.

이 자동 검사는 14개 외국어 번역의 사람 검수나 실제 인지훈련 효과 검증을 뜻하지 않는다. 외국어 일일 메모 20키는 AI 초안/사람 검수 전 상태를 유지한다. 실제 서버·결과지 연동, 전체 저장소의 다른 앱 QA, 기관별 개인정보 검증도 완료 범위 밖이다. 사용자에게는 수행률을 인지능력 향상률로 제시하지 않는다.

## 적용 원칙

이 브랜치는 별도 데모/패치이다. 기존 개발자 연동본에 폴더 전체를 덮어쓰지 않는다. 먼저 파일·상태 계약 diff를 검토하고, 필요한 일일 메모 코드/locale key만 기존 프로젝트에 병합한다. `main` 병합과 정식 서비스 URL 교체는 별도 승인 전까지 금지한다.
