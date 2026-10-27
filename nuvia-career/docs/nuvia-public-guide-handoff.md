# GPT/JavaScript 미실행 도구용 합성 안내 — 게시 인계

## 이번 결과

- `public-guide.ts`의 Vite 플러그인으로 `/demo-info/ko.html` 및 기본 15개 언어의 **초기 HTML 본문**을 생성한다. JavaScript, Clerk, API, 쿠키, 기존 사용자 저장소를 필요로 하지 않는다.
- 본문은 기존 합성 예시의 **제목·직무·행동·관찰 결과·배움만 명시적으로 선택**한다. 실제 수행/모의 연습 모두 가상 인물의 사례임을 첫 문단에 명시했다. 원본 식별자·비공개 메모·세션·계정 기록을 직렬화하지 않는다.
- 상단 현재 언어명/네이티브 HTML 언어 메뉴, 네이비·파랑·진한 주황, 44px 이상 조작 영역, RTL과 모바일 재배치를 적용했다. 신규 문구는 15개 언어 초안이며 원어민 검수 완료로 간주하지 않는다. 기존 번역은 수정하지 않았다.
- `/demo?lang=…`는 기존 합성 체험으로 연결된다. 실제 D-CAS·플래너·계정 서버 저장 연결 완료라고 안내하지 않는다.
- 크롤링 허용은 `/demo-info/`만으로 제한했다. 나머지 경로는 robots에서 제외하고 기존 앱의 `noindex, nofollow`는 보존했다. **robots는 접근 보안이 아니며 기존 서버 인증·소유권 검사를 변경하지 않았다.**

## 최신 실제 검사

결과는 `generated-artifacts/public-guide-qa/`에 저장했다. 생성 자료는 Git·배포 제외 대상이다.

| 검사 | 결과 |
|---|---|
| 최신 운영 빌드 | 성공. 새 정적 안내 HTML 16개(15개 언어+기본 index) 생성. |
| JS 비활성 브라우저, 15개 언어 × 1440/768/360 | **45/45 통과**, 2026-10-24 00:36:50 UTC. 초기 HTML의 사례 2개·전체 단계·언어 이동·44px·RTL·넘침·API/쿠키 없음. `guide.json` 및 화면 증거. |
| 기존 익명 경계·기록 보존·401·API 실패/재시도·비밀정보 패턴 검사 | **8/8 통과**, 00:33:27 UTC. `privacy.json`. 이후 변경은 안내 HTML favicon만이며 최종 안내 45건에서 재검사. 실제 비밀 환경값은 읽거나 출력하지 않았다. |
| 기존 전체 체험 45건과 일치 | 인터랙티브 JS/CSS 산출물이 직전 45/45 전체 체험 검증본과 **바이트 단위 동일**. 기존 45건을 새 안내 페이지 45건과 혼동하지 않는다. |
| 정상 JS 브라우저 진입 | **통과**, 00:37:50 UTC. 운영 빌드의 한국어 안내→시작 버튼→합성 체험→직무 기준 카드 6개. `interactive-entry.json`. |
| 타입 검사 | 프런트엔드·검증 스크립트 통과. |
| 배포 외부 요청 | **차단 유지**, 00:37:27 UTC. 메타데이터 `private`; 쿠키 없는 `/`, `/demo?lang=ko`, `/demo-info/ko.html` 모두 **307 → Replit 인증 보호**. `deployment.json`. |

결합 검사 명령 1회는 실행 제한 120초를 초과했다. 안내 45건은 완료됐으며, 보호 검사를 별도로 실행하여 8건 모두 통과했다. 앱 결함이나 인증 우회로 처리하지 않았다.

## 남은 사용자 조작 — 공개 링크는 아직 완료 아님

현재 공식 메타데이터:
- 배포: `https://heavenly-wilted-constants.replit.app`
- 배포 존재·기존 배포 빌드 성공, **visibility = private**.
- 제공된 Agent 도구에는 배포 visibility 변경 기능이 없고, 실제 Publish는 사용자 조작이다. 같은 private 설정으로 다시 배포하거나 다른 방법으로 우회하지 않았다.

1. 이 프로젝트 **Publishing → 해당 앱 배포 → Adjust settings → Sharing/접근 범위**를 연다.
2. 현재 **Private(제한 공개) → Public(누구나 URL로 접근)**로 설정한다. 워크스페이스·저장소 공개 설정은 바꾸지 않는다.
3. 이미 게시된 앱에서 접근 범위 변경이 잠겨 있다면 공식 문서는 **Unpublish 후 공유 범위 선택·재게시**를 안내한다. 이는 잠깐의 서비스 중단이 있을 수 있으므로 사용자 UI에서 진행하고 기존 도메인 유지 여부도 확인한다. Agent가 임의 게시 해제하지 않는다.
4. 최신 수정본을 Publish/재게시한다. 자동 승인 검토가 있으면 정식 검토를 거친다.
5. 이후 쿠키 없는 외부 요청으로 다음을 다시 확인해야 한다:
   - `/demo-info/ko.html`: **200**, 인증 리다이렉트 없음, 합성 안내 본문 존재.
   - `/demo?lang=ko`: **200**, 일반 JS 브라우저에서 합성 체험 진입.
   - `/api/career/workspace`, `/api/career/versions`: 익명 **401** 유지.
   - 공개 robots 정책과 다른 방문자의 기록 분리.

위 두 경로는 **게시 후 확인할 경로이지 지금 공개 성공으로 확인한 주소가 아니다.** 모든 GPT 도구의 접근/수집을 보장하지 않는다. 실제 계정 간 운영 QA·외부 제품 연결·서버 저장은 별도 개발자 범위로 유지한다.

공식 설정 안내: https://docs.replit.com/features/publishing/private-deployments

## 재현

```sh
PORT=24976 BASE_PATH=/ pnpm --filter @workspace/nuvia-career run build
# 기존 API가 실행 중인 로컬 환경, 별도 터미널에서만:
./scripts/node_modules/.bin/tsx scripts/src/nuvia-built-demo-server.ts
NUVIA_TEST_ORIGIN=http://127.0.0.1:4319 pnpm --filter @workspace/scripts exec tsx src/nuvia-public-guide-qa.ts
NUVIA_TEST_ORIGIN=http://127.0.0.1:4319 NUVIA_PRIVACY_OUT=public-guide-qa pnpm --filter @workspace/scripts exec tsx src/nuvia-public-demo-privacy-qa.ts
```
