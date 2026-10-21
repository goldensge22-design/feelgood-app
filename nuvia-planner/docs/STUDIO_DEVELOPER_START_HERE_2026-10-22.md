# NUVIA PLANNER Studio — 개발자 연동 시작점 (2026-10-22)

## 현재 기준

- 저장소: `goldensge22-design/feelgood-app`
- 인계 브랜치: `codex/nuvia-studio-daily-note-demo`
- 검수된 기준 커밋: `3091a8fc9a56e5dcf79182ef9315110718322c21`
- 전체 Studio 데모 소스: `nuvia-planner/studio-daily-note-demo/`
- 실행 진입점: `nuvia-planner/studio-daily-note-demo/artifacts/nuvia-ui-review/studio.html`
- 공개 **합성 데이터 데모**: `https://impassioned-windy-hardware.replit.app/studio.html?demo=school`

이 문서가 Studio 데모의 **최신 인계 상태**다. `STUDIO_DEVELOPER_HANDOFF_2026-10-20.md`와 `STUDIO_DAILY_NOTE_DEMO_HANDOFF_2026-10-21.md`는 당시의 기준선·발견사항을 남긴 이력 문서다. 특히 그 문서의 브랜치, i18n 미통과 및 아제르바이잔어 P1 서술을 현재 최종 상태로 읽지 않는다. 수정 경위와 아직 남은 한계는 `STUDIO_NAVIGATION_FINAL_QA_2026-10-22.md`를 따른다.

**정식 제품 적용 승인이나 서버 연동 완료를 뜻하지 않는다.** 정식 `nuvia-planner/demo/NUVIA_PLANNER_2_5D.html`, D-CAS, 결과지, 구형 BrainMap Planner와 `main`은 이 인계로 덮어쓰지 않았다. 현재 개발 중인 결과지 연동 브랜치와 파일·데이터 계약을 먼저 비교하고 필요한 부분만 이식한다.

## 먼저 읽을 파일

| 목적 | 파일 |
| --- | --- |
| 최신 범위·검수·남은 한계 | `nuvia-planner/docs/STUDIO_NAVIGATION_FINAL_QA_2026-10-22.md` |
| 승인 요구사항 | `nuvia-planner/docs/STUDIO_APPROVED_REQUIREMENTS_2026-10-20.md` |
| 결과지·서버 기존 계약 | `nuvia-planner/docs/NUVIA_PLANNER_RESULT_SERVER_INTEGRATION.md` |
| Studio 실제 수신 지점·합성 예제 | `nuvia-planner/studio-daily-note-demo/artifacts/nuvia-ui-review/docs/RESULT_INTEGRATION.md` |
| 브라우저 언어별 증거 | `nuvia-planner/studio-daily-note-demo/handoff/navigation-qa/QA_BROWSER.md`와 `matrix.json` |

## 실제 연결 순서

1. 현재 결과지·서버 개발 브랜치와 위 기준 커밋을 비교한다. Studio 폴더에는 `official`, `before`, `previous`의 **비교용 사본**도 들어 있다. 이를 정식 코드나 서버 계약 위에 통째로 복사하지 않는다.
2. 결과지 서비스가 공식 해석을 소유한다. 인증된 결과 adapter가 Assessment v1.1의 검사·대상·프로필·해석 버전, 교육단계, `scoreSystem`, 네 영역의 값·단위·공식 수준, `supportOrder`와 `strengthOrder`를 전달한다. 점수로 수준이나 81유형 해석을 Studio에서 새로 계산하지 않는다.
3. Studio 수신 코드는 `artifacts/nuvia-ui-review/src/studio/AssessmentPanel.tsx` → `insights.ts`의 `installAssessment` → `src/official/adaptive/engine.ts`의 `validateAssessment` → `src/enhancement/domain.ts`의 `routeFor` 순서로 확인한다. 현재 JSON 입력과 예시 점수는 **로컬 합성 검토용**이며 서버 인증이 아니다.
4. 저장 코드는 `src/studio/store.ts`, `persistence.ts`를 검토한다. 현재 `nuvia:studio:v1:personal`과 `nuvia:studio:v1:review`는 브라우저 저장소에서 분리된다. 서버 적용 시 인증된 학생 소유권, 검사 버전별 workspace, 권한·공유 철회, 동기화 충돌, 멱등성을 별도로 구현한다. 기존 사용자 기록을 조용히 초기화하거나 합치지 않는다.
5. 일일 메모의 작성·저장 UI는 `src/studio/DailyNote.tsx`와 `daily-note.css`에 있다. 메모 원문은 월간 리포트·로드맵·교사 화면에 자동 공유하지 않는다. JSON 백업은 평문이므로 실제 개인정보 입력·배포 정책을 별도로 정한다.
6. 번역 리소스는 `src/studio/i18n/`에 있다. 15개 언어의 key·placeholder·화면 구조는 검사했지만 외국어 번역은 AI 초안이며 모어 화자 승인이 아니다. 기존 검수 번역을 전체 재생성하지 말고 변경 key만 검토한다. 언어 전환 시 실행·입력·저장 상태를 보존한다.

위 `src/...` 경로는 별도 표시가 없으면 `nuvia-planner/studio-daily-note-demo/artifacts/nuvia-ui-review/` 기준이다. 정식 결과지 계약의 출처와 안전 경계는 두 결과 연동 문서의 상세 내용을 우선 확인한다.

## 독립 실행과 재검증

`nuvia-planner/studio-daily-note-demo/`에서 Node/pnpm 환경을 준비한 뒤:

```text
pnpm install --frozen-lockfile --ignore-scripts
pnpm run typecheck:libs
pnpm --filter @workspace/nuvia-ui-review typecheck
node tools/nuvia-studio/validate-i18n.mjs
node tools/nuvia-studio/run-i18n-check.mjs
node tools/nuvia-studio/run-core.mjs --i18n
node tools/nuvia-studio/run-notice-check.mjs
node tools/nuvia-studio/run-daily-note-check.mjs
node tools/nuvia-studio/run-external-demo-check.mjs
```

Windows PowerShell 빌드 예:

```powershell
$env:PORT='4188'
$env:BASE_PATH='/'
pnpm --filter @workspace/nuvia-ui-review build
```

2026-10-22 기준: 15언어 각 1,138 key, i18n 439, 핵심 1,392, 알림 545, 일일 메모 365, 외부 데모 68 검사와 타입·빌드가 통과했다. 데스크톱 1440px/모바일 360px에서 15언어 탐색의 넘침·잘림·터치 크기를 검사했고, 공개 주소도 최신 빌드로 재게시해 아제르바이잔어 360px과 콘솔을 확인했다. 이 결과는 **합성 데모 QA**다. 사람 번역 검수, 실제 iPhone Safari, 실제 결과지·인증·서버 연동, 학생 대상 효과성 검증은 남아 있다. 일반 기관 데모의 공통 외부 이용 안내는 아제르바이잔어 전용 안내를 제외하면 한국어·영어 병기(P2)이므로 15언어 완역으로 표시하지 않는다.

## 적용 결정 전 확인

- 실제 학생·검사 결과·개인 메모를 합성 데모나 GitHub에 넣지 않는다.
- 검사 미연결·무효·권한 없음은 0점 또는 수행 실패로 바꾸지 않는다. 활동 수행률은 인지능력 향상률이 아니다.
- 인증된 학생 외의 결과·메모 조회 차단, 공유 미리보기와 철회, 백업 복원 소유권, 재검·다중 탭 충돌, 서버 장애를 통합 QA한다.
- 정식 제품 이식과 `main` 병합·운영 배포는 개발자 비교 검토와 사용자 승인 후 별도 단계로 진행한다.
