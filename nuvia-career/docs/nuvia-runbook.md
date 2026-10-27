# NUVIA 자소서 앱 실행·검증·GitHub 인계

## 다른 제품을 보존하는 저장 위치

대상은 `goldensge22-design/feelgood-app`이다. 2026-10-23 공개 조회 기준
main은 `35a3216e980bd4dd0c0391e5c6790508bb9e72f7`이다.
이 Replit 작업공간의 기존 Git 원격은 GitHub가 아닌 Replit 백업이다.
그 원격을 변경하지 않는다.

GitHub에는 별도 `codex/nuvia-career-v4-qa-20261023` 브랜치의
**`nuvia-career/` 하위에만** 이 앱을 추가한다. 기존 main의 결과지,
플래너, ZIP, 배포 설정은 변경하지 않는다. 같은 이름의 폴더/브랜치가
이미 생겼으면 내용을 비교하기 전 덮어쓰거나 강제 푸시하지 않는다.
원격 권한이 연결되기 전의 로컬 패키지·커밋은 GitHub 저장 완료가 아니다.

## 실행

필요 환경: Node.js 22 이상, pnpm, PostgreSQL, 기존 Clerk 개발용 인증 설정.
비밀값은 안전한 환경 설정으로 제공한다. `.env`, DB 덤프, 세션 쿠키,
사용자 작성문, 개인 검사 결과는 Git에 넣지 않는다.

이 문서의 명령은 추출된 workspace 루트, 즉 GitHub의 `nuvia-career/`에서 실행한다.

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
PORT=8080 pnpm --filter @workspace/api-server run dev
PORT=24976 BASE_PATH=/ pnpm --filter @workspace/nuvia-career run dev
```

- API에는 `DATABASE_URL`, 기존 Clerk 인증 설정이 필요하다. 값은 문서에 적지 않는다.
- 웹은 기존 `VITE_CLERK_PUBLISHABLE_KEY`를 사용한다. 선택적 Clerk 프록시 설정도 보존한다.
- 두 서비스는 같은 외부 origin에서 `/api`는 API로, 나머지는 웹으로 라우팅한다.
  별도 서버의 localhost 주소를 브라우저 코드에 넣지 않는다.
- Replit에서는 이미 구성된 두 관리 서비스를 사용한다. 중복 서비스를 만들지 않는다.
- 최초 DB 준비는 `lib/db/src/schema/career.ts`와 실제 DB 차이를 검토한 후
  기존 마이그레이션 절차로 두 추가 테이블만 적용한다.
  검토용 추가 DDL은 `docs/nuvia-schema.sql`이다. 이미 존재하는 테이블의
  구조를 자동 변경하지 않으므로 기존 구조와의 대조가 필요하다.
  강제 push/기존 테이블 삭제 금지.
- `?space=example&lang=ko`는 명시적인 가상 예시, `?space=guest&lang=ko`는 기기 저장이다.
  로그인하면 계정 저장이며 다른 모드의 기록을 자동 업로드하지 않는다.

## 재현 가능한 검사

```sh
pnpm run typecheck
PORT=24976 BASE_PATH=/ pnpm --filter @workspace/nuvia-career run build
pnpm exec tsx --test artifacts/api-server/src/lib/career*.test.ts \
  artifacts/nuvia-career/src/lib/career.test.ts \
  artifacts/nuvia-career/src/lib/workspace-scope.test.ts
pnpm exec tsx --tsconfig artifacts/nuvia-career/tsconfig.json \
  --test artifacts/nuvia-career/src/lib/locales.test.ts
```

`tsx`는 scripts 패키지에 있으므로 환경에 따라 `pnpm --filter @workspace/scripts exec tsx`
또는 `./scripts/node_modules/.bin/tsx`로 실행한다.
저장소 검사는 별도 합성 owner를 만들고 자신이 만든 DB 행만 제거한다.
실제 사용자 데이터와 전체 테이블을 지우지 않는다.

브라우저 검사에는 Playwright와 Chromium이 필요하다. 현 스크립트의 실행 파일 경로는
Replit의 `/repl/tools/bin/chromium`이다. 다른 환경에서는 설치된 Chromium 경로로
검사 스크립트 설정만 조정한다.

```sh
NUVIA_TEST_ORIGIN=https://YOUR_PREVIEW_ORIGIN \
  ./scripts/node_modules/.bin/tsx scripts/src/nuvia-browser-validation.ts
./scripts/node_modules/.bin/tsx scripts/src/nuvia-checkpoint-regression.ts
./scripts/node_modules/.bin/tsx scripts/src/nuvia-browser-edge-validation.ts
./scripts/node_modules/.bin/tsx scripts/src/nuvia-document-qa.ts
```

전체 브라우저 여정은 **독립된 합성 기기 저장 공간** 검사다.
실제 로그인 및 외부 연동을 검증한 것으로 해석하지 않는다.
계정 검사는 승인된 Clerk 실제 테스트 세션으로 같은 UI 여정을 별도로 수행한다.
세션 발급 도구가 실패하면 인증 생략, 토큰 위조, 브라우저 로그인 우회로 대체하지 않는다.

간헐 크기 관찰 오류 진단을 재현하려면 별도 결과 파일로 다음을 실행한다.
실패 결과를 지우거나 오류 오버레이를 숨기지 않는다.

```sh
NUVIA_TEST_RESULT_FILE=generated-artifacts/resize-stress.json \
  ./scripts/node_modules/.bin/tsx scripts/src/nuvia-browser-validation.ts \
  --case=es-768 --stress-resize
```

## 증거 보존과 제한

- 검증 범위·미확인 항목은 `docs/nuvia-verification.md`에 기록한다.
- GitHub 인계 패키지에는 소스 해시 목록과 검토된 검증 보고서·간결한 QA 요약을 넣는다.
- 원시 검사 로그·화면 캡처·다운로드 문서는 `generated-artifacts/`에 보존하며
  Git 및 배포에서는 제외한다. 요약과 재현 명령을 원시 로그 전체 대신 인계한다.
- 원시 브라우저 콘솔·사용자 저장소·세션·스크린샷 전체·문서 다운로드 전체를 일괄 업로드하지 않는다.
- 인계의 `qa/source-manifest.json` 해시는 검사한 소스와 커밋 소스를 비교하는 기준이다.
  원격 커밋 SHA는 푸시 후 별도로 확인해야 한다.
- Word/한컴 실제 열기, 원어민 검토, 실제 외부 API 검사는 가능한 환경과 권한이 있을 때
  별도 수행한다. ZIP/XML 판독이나 화면 번역 키 검사를 그 증거로 사용하지 않는다.
