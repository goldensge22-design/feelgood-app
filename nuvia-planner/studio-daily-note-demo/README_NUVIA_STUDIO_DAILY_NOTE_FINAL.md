# NUVIA STUDIO DAILY NOTE FINAL — current full project source

## 출처 / Source identity
- Source Git HEAD SHA (기준 커밋): `fbffdc4f467b1dd84e58007f536e0e99e1891b7b`
- Delivered source snapshot SHA-256: `11808b428742223d9e13a92645797f74ecb4f6ecb09d37944364d6762b95dbde`
- ZIP은 위 HEAD에 이번 P2 수정 및 동봉 검사/포장 도구를 더한 **현재 작업 트리**입니다.
  최종 변경이 모두 커밋된 SHA로 위 HEAD를 오인하지 마세요. GitHub 원격 상태/최신 개발자 연동본 호환성은 검증하지 않았습니다.
- 파일별 SHA-256, 크기, 변경 파일 목록은 `SOURCE_MANIFEST.json`에 있습니다.
  생성 README/manifest/QA 첨부는 위 소스 스냅샷 해시 산식에서 제외합니다.

## 수정 / Data protection
Studio 저장 알림은 번역문 대신 키를 보관하고 렌더링 시 현재 언어로 해석합니다.
알림은 메모리의 일시적 UI 상태이며 개인 메모·타이머·과제·검사·저장 계약에 저장되지 않습니다.
기존 15개 언어 리소스와 일일 메모 번역 리소스는 위 HEAD와 바이트 단위로 동일합니다.
새 번역은 추가하지 않았습니다. 외국어 AI 초안의 사람 검수 전 상태도 그대로입니다.
정식/구형 플래너, 결과지, D-CAS, 다른 프로그램 파일은 이번 작업으로 수정하지 않았습니다.
같은 저장소의 정상 실행 의존성을 보존하려고 해당 소스도 사본 그대로 포함합니다.
일일 메모는 개인 기록이며 월간 보고서/로드맵/교사 공유에 자동 포함하지 않습니다.
브라우저 저장·평문 개인 JSON 백업이며 실제 결과지/로그인/서버 동기화는 미연결입니다.

## 포함 / Included
- artifacts 전체 앱 소스·정적 자산·artifact 설정: Studio UI, 비교/기준 소스, API 및 mockup 앱.
- lib 공유 패키지, scripts, tools, docs.
- 원본 루트 package.json, pnpm-lock.yaml, pnpm-workspace.yaml, tsconfig, .npmrc, .replit, ignore 설정, replit.md.
- 일일 메모·15언어 리소스·컴파일 매크로, 검사/패키징 도구 및 `handoff/qa`의 이번 자동 검사 stdout.
- 앱에 내장된 합성 데모·단위 검사 fixture는 코드이며 포함합니다. 실제 사용자 기록은 넣지 않았습니다.

## 제외 / Excluded
- .git 이력/index, .agents 메모리/프로필, .local, .config, .cache 및 환경변수/비밀 값.
- .env*, 개인 키/자격증명 파일, 브라우저 localStorage/sessionStorage/쿠키 덤프, DB/사용자 백업/업로드/세션.
- node_modules, dist, out-tsc, 빌드 캐시/tsbuildinfo/pyc, coverage.
- attached_assets 원본 첨부, deliverables, screenshots, 기존 generated-artifacts 전체/이전 ZIP.
  단, 위에 명시한 자동 검사 stdout만 명시적으로 별도 첨부합니다.
- 의존성 설치본이나 서버/DB 실제 데이터는 소스 보존 대상이 아닙니다.
- 허용 소스 경로/확장자 제한과 알려진 비밀 패턴 거부 검사를 적용했습니다.
  이는 외부 보안 감사나 사람의 개인정보 검토를 대신하지 않습니다.

## 재현 / Run locally
Node.js와 pnpm을 준비하고 새 빈 폴더에 풀어 실행합니다. 기존 운영 폴더에 통째로 덮어쓰지 마세요.
```
pnpm install --frozen-lockfile
pnpm run typecheck:libs
PORT=24422 BASE_PATH=/ pnpm --filter @workspace/nuvia-ui-review dev
```
브라우저: `http://localhost:24422/studio.html`
개발 프록시에서는 해당 프록시 호스트의 `/studio.html`입니다.
Studio 체험 자체는 API 서버/로그인 비밀/DB 없이 브라우저에서 동작합니다.
동봉된 API 서버를 별도로 실행하는 경우 그 서버의 기존 환경설정이 필요하며 이 ZIP은 그 비밀이나 DB를 제공하지 않습니다.
번역은 Vite Studio i18n 컴파일 매크로에 의존하므로 이를 제거하거나 소스 문자열만 복사하지 마세요.
공유 TS 프로젝트의 출력물이 필요하면 위 typecheck:libs 단계를 먼저 실행합니다.
```
node tools/nuvia-studio/run-notice-check.mjs
node tools/nuvia-studio/run-daily-note-check.mjs
node tools/nuvia-studio/run-i18n-check.mjs
node tools/nuvia-studio/validate-i18n.mjs
node tools/nuvia-studio/run-core.mjs --i18n
node tools/nuvia-studio/run-external-demo-check.mjs
pnpm --filter @workspace/nuvia-ui-review typecheck
PORT=24422 BASE_PATH=/ pnpm --filter @workspace/nuvia-ui-review build
```

## 이번 QA / Limits
- 알림 545개: 15×15 전환(az→ko 포함), 현재 언어 해석, 메모/진행 중 실행/계획 보존 및 백업.
- 일일 메모 365개, 언어 동작 136개, Studio 핵심 1392개, 외부 데모 68개 통과.
- 기존 1138키×15언어 및 일일 메모 20키×15언어 리소스 검사 통과.
- Studio TypeScript·Vite build 통과. 큰 청크/비교 페이지 non-module script 빌드 경고는 남습니다.
- 이번 알림 수정은 자동 회귀·타입·빌드/미리보기 확인으로 검증했습니다. 새 15언어 실제 브라우저 클릭 전수 QA나 실제 학생 연구는 수행하지 않았습니다.
- 이전 일일 메모 브라우저 QA의 상세는 docs/STUDIO_DAILY_NOTE.md를 보세요.
  그 문서에 남아 있는 '이전 언어 저장 알림' 관찰은 이번 키 기반 수정 전 기록입니다.
- 과거 정식 기준본의 별도 4개 불일치, 리포트 sandbox 경고, 실제 서버 연동은 해결했다고 주장하지 않습니다.
- 전체 저장소 모든 앱의 root build/typecheck 통과를 의미하지 않습니다. 이번 실행 범위는 위 Studio 명령과 동봉 로그입니다.

## 적용 / Rollback
GitHub에는 별도 브랜치/새 저장소에 보존한 뒤 최신 개발자 연동본과 diff 및 충돌 검토를 하세요.
main 병합·push·공개 URL 교체·배포는 이번 작업에서 수행하지 않았습니다.
알림 수정은 Studio store.ts/notices.ts의 UI 범위입니다. 충돌 시 적용을 중단하고 기존 파일을 보존하세요.
이번 수정에는 데이터 마이그레이션/초기화가 없으므로 되돌리기도 해당 소스만 이전 상태로 복원합니다.
일일 메모 추가 이전 코드로 되돌리는 것은 별개이며, strict schema 때문에 새 메모 백업을 거절할 수 있습니다.
개인 백업은 본인 브라우저에서 따로 보관하고 이 공개용 소스 ZIP/GitHub에 넣지 마세요.
