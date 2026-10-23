# NUVIA Studio 진로 경험 검토 패치 — 개발자 시작점

## 적용 위치와 보호 범위

- 저장소: `goldensge22-design/feelgood-app`
- 패치 브랜치: `codex/nuvia-studio-career-review-qa15`
- 기준 브랜치/커밋: `origin/codex/nuvia-studio-daily-note-demo` / `8c7e2d1269a19cf7229144db7f2d2996844c6fa6`
- 추가 화면: `nuvia-planner/studio-daily-note-demo/artifacts/nuvia-ui-review/career-review.html`
- 원본 Replit 패치 ZIP: `nuvia-planner/studio-daily-note-demo/handoff/studio-career-review/NUVIA_STUDIO_CAREER_REVIEW_QA15_FINAL_PATCH.zip`
- ZIP SHA-256: `89C13A38184930CBBD5AFD402E862B81818967F2A88E10A1EBD377452E96EAF4`

이 브랜치는 기존 Studio 기준본 위에 **독립 검토 화면과 검사·문서만** 추가한다. `vite.config.ts`에는 새 HTML 빌드 입력 한 줄만 더했다. 정식 `nuvia-planner/demo/NUVIA_PLANNER_2_5D.html`, D-CAS, 결과지, 구형 BrainMap Planner와 `main`은 수정하지 않았다. 기존 배포 URL도 바꾸지 않았다.

이 패치는 결과지와 서버에 이미 연결된 정식 기능이 아니다. `career-review.html`은 별도 로컬 저장 키를 쓰는 검토용 화면이다. 실제 개인정보·검사 결과를 공개 데모에 입력하지 않는다.

## 개발자 적용 순서

1. 현재 결과지·서버 개발 브랜치의 HEAD와 변경 파일을 먼저 확인한다. 기존 Studio 기록 및 계약을 보존한다.
2. 이 브랜치의 패치 커밋을 검토하여 필요한 경로만 cherry-pick 또는 수동 병합한다. **정식 플래너에 ZIP 전체를 덮어쓰지 않는다.** ZIP은 원본 보관·오프라인 비교용이다.
3. 특히 `nuvia-planner/studio-daily-note-demo/artifacts/nuvia-ui-review/vite.config.ts`의 새 HTML 입력만 병합한다. Replit ZIP은 LF, GitHub 기준본은 CRLF라 바이트 해시가 다르지만, 이 브랜치에서 기존 내용과 한 줄 차이를 확인해 수동 병합했다. 다른 최신 개발 브랜치에는 ZIP 적용 스크립트를 강제 실행하지 않는다.
4. 공식 성인 결과지 wire contract와 권한 모델을 확보한 뒤 `src/career-review/model.ts`의 **로컬 검토 어댑터**를 별도 production adapter에 연결한다. 공식 출처, 검사·사용자 ID, 결과 버전, PASS 4영역의 값·단위·해석, 원본 TOP5 순서와 출처를 손실 없이 유지한다. 서로 다른 점수 단위를 앱에서 임의 비교하거나 섞지 않는다. 추천 순위·인지 향상 점수를 새로 계산하지 않는다.
5. 학생/사용자 인증·소유권, 서버 저장·동기화 충돌, 공유 범위·철회, 백업 개인정보 정책은 제품 계약에 맞게 별도 구현한다. 현재 로컬 owner token은 로그인/보안이 아니다.
6. 실제 제품 진입점과 화면 연계는 설계 검토 후 연결한다. 현재 검토 화면이 `studio.html`의 결과지 연동을 자동 대체하지 않는다.

원본 패치의 기능·한계는 `nuvia-planner/studio-daily-note-demo/docs/STUDIO_CAREER_REVIEW_HANDOFF.md`, 테스트 상세는 같은 폴더의 `STUDIO_CAREER_REVIEW_QA.md`, 기존 실패 4건은 `STUDIO_CAREER_REVIEW_ISSUE_TRIAGE.md`에서 확인한다.

## 이 브랜치에서 다시 확인한 사항

작업 환경은 Windows이며, 오프라인 `pnpm install --frozen-lockfile --ignore-scripts`로 의존성을 설치했다. 원래 preinstall은 Windows에 `sh`가 없어 실행되지 않아 설치 스크립트만 생략했다.

| 검사 | 결과 |
| --- | --- |
| `pnpm run typecheck` | 통과 |
| `node tools/nuvia-studio/run-career-review-check.mjs` | 15언어 97키와 도메인 6,077 assertions 통과 |
| `node tools/nuvia-studio/validate-i18n.mjs` | 기존 Studio 15언어 1,138키 및 일일 메모 확장 검사 통과 |
| `node tools/nuvia-studio/run-i18n-check.mjs` | 439 checks 통과 |
| `PORT=4189 BASE_PATH=/ pnpm run build` | 통과, `career-review.html` 산출 확인 |
| 로컬 브라우저 | HTTP 200; 가상 결과 불러오기, 한국어→영어 전환 중 결과 유지, 가상 과제 작성·저장 확인 |

Replit 인계 ZIP에는 15언어×1440/360px **30개 기능 여정·150개 화면 측정**의 원본 로그·결과 JSON·캡처가 있다. 이는 Replit 환경의 증거이며, 이 GitHub 브랜치에서 30개 브라우저 여정을 모두 재실행했다는 뜻은 아니다. 이 브랜치 기준의 실기기·원어민 검수와 실제 결과지/서버 연동은 남아 있다. 외국어 신규 번역은 AI 초안이다.

이 기준 브랜치에는 최상위 `scripts/check-i18n.mjs`가 없어서 그 명령은 실행하지 못했다. 위의 Studio 전용 검사를 실행했다. 빌드에서 기존 비교 HTML의 비모듈 스크립트·큰 번들 경고가 남는다. Replit 구형 기대값 검사 4건과 초기 URL 미확정 404도 해결 완료로 주장하지 않는다.

## 재현 명령

`nuvia-planner/studio-daily-note-demo`에서 실행한다. Windows PowerShell에서는 먼저 `$env:PORT='4189'`와 `$env:BASE_PATH='/'`를 설정한다.

```text
pnpm install --offline --frozen-lockfile --ignore-scripts
pnpm run typecheck
node tools/nuvia-studio/run-career-review-check.mjs
node tools/nuvia-studio/validate-i18n.mjs
node tools/nuvia-studio/run-i18n-check.mjs
pnpm run build
```

빌드 후 `artifacts/nuvia-ui-review/dist/public/career-review.html`을 확인한다. 서버 연동 전에는 실제 사용자 자료로 QA하지 않는다.
