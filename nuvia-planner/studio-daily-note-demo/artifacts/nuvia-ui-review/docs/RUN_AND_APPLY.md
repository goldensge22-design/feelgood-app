# 전체 소스 실행·안전 적용·복구 안내

## ZIP의 범위
검토 앱의 모든 진입 화면(`studio`, `personal-monthly`, `enhancement`, 기존 비교/기준 화면), 소스, 브랜드 리소스, Vite/TypeScript 설정, package.json, pnpm workspace/lockfile, 필요한 API client 라이브러리, 검사용 도구, 승인 이미지 참고자료를 포함합니다. node_modules/.git/환경 비밀키/브라우저 사용자 저장내용/운영 DB/학생자료는 포함하지 않습니다. 정식 GitHub 전체 저장소를 대체하는 ZIP이 아닙니다.

ZIP 최상위 package 스크립트와 TypeScript 참조만 독립 검토 앱 범위에 맞춰 구성합니다. Replit의 원래 루트 설정 파일은 변경하지 않습니다. 의존성 버전과 lockfile은 보존합니다.

## 로컬 재현
필요: Node.js 24 이상, pnpm 10 이상(이 환경의 lockfile을 사용), 브라우저.
```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-client-react exec tsc --build
pnpm --filter @workspace/nuvia-ui-review typecheck
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/nuvia-ui-review build
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/nuvia-ui-review dev
```
- 개인 화면: `http://localhost:3000/studio.html`
- 합성 검토: `http://localhost:3000/studio.html?review=1`
- 합성 예시: **합성 예시·검토 설정 → 승인 이미지 작업대 예시 → 바꾸기**. 이 경로는 개인 저장 키를 바꾸지 않습니다.
- 세부 수정과 목표 연습: 작업대의 **수정 · 방법과 세부 내용**을 펼칩니다. 선택/이동은 시작이 아니며 **바로 시작**을 눌러야 실행됩니다.
- `BASE_PATH`는 앱 마운트 경로입니다. 하위 경로에 호스팅할 경우 Vite와 프록시 경로를 일치시키세요. 임시 Replit 미리보기는 워크플로가 종료되면 열리지 않을 수 있습니다.
- 도메인/서버/인증 환경변수를 임의로 만들어 넣지 마세요. 이 앱은 로컬 브라우저 저장 시연입니다.

## 검수 도구
- `tools/nuvia-studio/check.ts`: 81조합/근거/순환/7일안내/로드맵/백업 핵심 로직.
- `task-add-check.ts`: 최소 입력/미정 시간/증거/반복·재사용.
- `final-browser.mjs`, `browser.mjs`, `activity-browser.mjs`, `task-add-browser.mjs`: 실제 Chromium 클릭 회귀. Chromium 실행파일이 PATH에 필요합니다. `REPLIT_DEV_DOMAIN`을 지정하거나 해당 도구의 origin을 로컬 검토 서버로 맞추세요. 테스트는 새 임시 브라우저 프로필만 사용합니다.
- `node tools/nuvia-studio/run-core.mjs`로 핵심 TypeScript 검사를 번들해 실행합니다.
- 일부 기존 보관 fixture 의존 도구는 이전 산출물이 필요한 경우가 있으므로, 실행 결과와 보고서를 구분하세요. 일반 사용자 기록을 테스트 fixture로 쓰면 안 됩니다.

## 적용 전 반드시 확인
- 작업 시작 시 Replit 소스 기준: `59d2e9cf8b4318c5821ac74bc0973f098a804b6a`.
- 사용자가 제시한 원격 `811609f` 및 이전 `defa19d`와 **호환성 미검증**. 원격 소스를 최신이라고 가정하지 않았고 가져오거나 push하지 않았습니다.
- 사용자가 GitHub `811609f`에서 Vitest262개/tsc/build 통과를 직접 확인한 결과는 별도 기록입니다. Replit 구형 4건 불일치와 혼합하지 않으며 이번 변경의 원격 통합 검증을 대신하지 않습니다.
- 전체 소스 ZIP은 검토/독립 실행용입니다. 정식 저장소에 통째로 덮어쓰지 마세요.
1. 개발자가 작업 브랜치와 깨끗한 상태, 실제 기준 SHA를 확인하고 기존 코드/사용자 백업을 보존합니다.
2. `CHANGES.patch`와 파일 해시 목록을 먼저 읽고 `git apply --check CHANGES.patch`로 검사합니다. 이는 위 Replit 기준의 차이이며 다른 원격 기준에 대한 안전 보장이 아닙니다.
   ZIP에서는 `handoff/`에 있습니다. 대상 저장소를 바꾸기 전에 `python /ZIP경로/handoff/verify_preconditions.py /대상저장소경로`로 시작 기준 해시를 확인하세요. 불일치면 중단합니다.
3. 충돌·기존 경로 중복·저장/결과지 계약 차이가 있으면 **중단**. 강제 덮어쓰기, 자동 재분류·초기화 금지. 개발자 최신 브랜치에서 수동 이식·검수합니다.
4. 주 변경 범위는 `src/studio/*`의 표현/검토 fixture 및 도구·문서입니다. 정식 `official`, D-CAS, backend 및 이전 데모 소스는 수정하지 않았습니다.
5. 기존 카드/회차/월간/로드맵 저장 왕복과 공식 결과지 통합 QA를 별도 수행한 후 사용자 승인으로 적용합니다.

## 되돌리기
검토 앱 독립 브랜치/폴더에 적용하고 적용 전 커밋/백업을 기록하세요. 아직 공식 서비스에 연결하지 않은 검토본은 그 폴더/라우트 변경만 되돌리면 됩니다. 검토용 상태를 개인 상태에 복원하지 마세요. 코드 되돌리기와 데이터 복원은 별개이며, 현재 기록 백업 후 정확한 본인 공간/범위를 확인해야 합니다. 데이터 삭제나 localStorage 전체 초기화로 복구하지 마세요.

실제 서버 연동 및 운영 배포는 별도 승인 범위입니다. 이번 검수는 합성 개발검수이며 실제 학생 독립사용/4주 추적/인지 효과 연구가 아닙니다. 신규 문구의 영어·크메르어·아랍어 번역은 미완료이며 한국어 fallback을 완료 번역으로 표시하지 않습니다.
