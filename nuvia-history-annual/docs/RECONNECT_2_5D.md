# 기존 2.5D 디자인 재연결 — 사용자 화면 검토 대기

## 범위와 보존 기준

신규 아트 제작이나 활동 재설계가 아니다. 48편 실행 완료본도 아니다.
- 시각 원본: `706bc0364eb415441b4a8b3acb025bb17b41040d`.
- 작업 시작 HEAD: `991ad9c5870136c343734ca575bd3a1cd6a6b0d8`, 시작 시 작업 트리 깨끗함.
- 새 브랜치: `codex/nuvia-history-2-5d-reconnect`.
- 새 worktree: `C:/Users/golde/.codex/worktrees/nuvia-history-2-5d/feelgood-app`.
- 보호된 W24 원본 HEAD: `cede993abcb68b5d017b1ca147ce335fc6f98bd6`, 작업 후에도 clean.
- 기존 5192 Python 서버 PID 19548 및 원본 dist-app 유지. main 병합·W24 동결·기존 배포 교체 없음.
- 공통 규칙 원문은 루트 AGENTS.md, docs/i18n/README.md, i18n/programs.json, scripts/check-i18n.mjs, docs/DEVELOPMENT_BASELINE.md를 직접 참조한다. HISTORY 승인 규칙·동결 Excel도 수정하지 않았다.

## 변경 전 원인 판정

| 확인 항목 | 판정 |
|---|---|
| annual/index.html | production build가 아닌 Vite 소스 진입점. 기존 src/main.ts가 별도 DOM 목록과 style.css를 구성 |
| 기존 W24 React | src/main.tsx → app/App.tsx. 일반 경로는 app.css·HistoryScene·자산 registry 사용 |
| PreschoolPlay | App.tsx의 조기 분기로 기존 app-shell을 우회. 단순 SVG·preschool.css 중심 |
| 연간 CSS/폰트/이미지 | W24의 app.css·자산 registry·공방 장면을 사용하지 않았음 |
| W24 어댑터 | 기존에는 URL/데이터만 연결하고 5192로 이동. 연간 카탈로그 자체에 게임 셸 없음 |
| file:// | 이번 재현은 HTTP에서도 같아 근본 원인이 아님. 소스 index.html을 직접 열어도 정상 실행 불가 |
| 카탈로그 초안 여부 | 의도된 1단계 카탈로그이지만 승인된 2.5D 셸과 연결되지 않은 상태 |

## 재사용/폐기/어댑터 분석표

아래 W는 `nuvia-history-w24/outputs/NUVIA_HISTORY_REPRESENTATIVE_6_v1.0_DRAFT`이다. 표의 경로는 worktree 루트 기준이다.

| 현재 경로 | 기존 시각 근거·재사용 항목 | 복구하지 않은 항목 | 어댑터·수정 파일 | 저장/PASS/i18n 영향 |
|---|---|---|---|---|
| annual/index.html → src/main.ts | W/src/app/app.css의 app-shell, brand, history-panel; 기존 색·그림자·폰트 | 평면 목록을 새 아트 스타일로 대체하지 않음 | annual/src/main.tsx, journey.css, vite.config.ts | 카탈로그·locale adapter 그대로, 수행 기록 쓰기 없음 |
| App → PreschoolPlay 조기 분기 | 기존 공방/책/종이/cast, 장면 프레임, 입체 버튼 | 과거 단일 답 카드·정답 번호·중복 진행 버튼·긴 설계 설명 | W/src/ui/history/HistoryUI.tsx, history-ui.css; PreschoolPlay.tsx | 화면 래퍼만 연결, PlayGuard·질문·저장 명령 유지 |
| PreschoolPractice | 기존 PictureArt의 행동 단서를 유지하며 승인 이미지 프레임과 조합 | PASS 행동을 이미지 선택 한 번으로 축소하지 않음 | W/src/app/W24Illustration.tsx, PreschoolPractice.tsx | core/preschoolPractice·선택 수·셔플·단계 검증 무변경 |
| 표현·비교·책 | KidExpression, ExpressionView, ResultViews 재사용; 실제/내 이야기 양면과 최초예측 타임라인 구분 | 음성 계약 임의 확정, 기록 자동 변환 없음 | 공통 HistoryComparisonSpread / PredictionComparisonTimeline | 기존 callback·draft key·resultId·독립 비교 데이터 유지 |
| W01/W48 선택 | 카탈로그의 실제 준비 상태 | W24 이미지/질문 대체, 가짜 시작 버튼 | 연간 React 선택 패널 | 실행 차단 유지, 새 사건 콘텐츠 없음 |

W/src/app/app.css, assets.json, public 자산은 그대로 import/조회한다. 원본 화면 전체 복제나 과거 앱 롤백이 아니다.
기존 canvas/ExpressionEditor/ResultViews를 그대로 재사용하며 이를 새 저장 모듈로 만들지 않았다.
공통 UI 파일에는 사건명·질문·선택지·저장 로직을 넣지 않았다. W24Illustration에만 W24 자산 매핑이 있다.

## 실행 방법

- 연간: http://192.168.45.172:5194/?qa=1&age=preschool&lang=ko
- 유아 W24: http://192.168.45.172:5194/w24.html?qa=1&age=preschool&mission=gutenberg&lang=ko
- 로컬: http://127.0.0.1:5194/
- 실행 경로: `C:/Users/golde/.codex/worktrees/nuvia-history-2-5d/feelgood-app/nuvia-history-annual`.
- 명령(PowerShell): `$env:PORT='5194'; node scripts/serve.mjs`.
- 현재 새 서버 PID 18036, 0.0.0.0:5194. LAN URL은 이 PC에서 HTTP 200 확인; 다른 기기 접속/방화벽 통과는 미확인.
- production build: `C:/Users/golde/.codex/worktrees/nuvia-history-2-5d/feelgood-app/nuvia-history-annual/dist`.
- Vite 다중 진입점: index.html(연간), w24.html(현재 W24). 소스 index.html을 file://로 열지 않는다.
- 5194는 검수 전용 별도 origin이다. 5192 기존 기록은 자동 이동/복사/변환하지 않는다. 연간 화면의 ‘이전 기록 열기’는 기존 5192로 연결한다.
- 새 링크에 new=1을 자동으로 붙이지 않는다. 명시된 QA 파라미터는 기존 adapter를 통과한다.
- 일반 운영 프로필/외부 결과지 인증을 새로 구현하거나 승인한 것은 아니다.

## 기능 검증

| 항목 | 결과 |
|---|---|
| W24 타입·기존 테스트 | PASS, 299/299 |
| 연간 타입·production build·테스트 | PASS, 6/6 |
| 유아 PASS 4 × C1/C2 × 3 해상도 | 24개 전체 경로 작품 완성 |
| 계획 | 목표 → 방법 → 결과 → 유지/수정, 세 방법의 서로 다른 결과와 수정 반영 확인 |
| 주의 | 관련 인물·종이/시간 단서 탐색 → 방법 선택 → 단서 적용 유지 |
| 순차 | 오순서 차단, 3개 과정 재배치, 도중 reload 후 순서 복구 |
| 동시 | 인물·장소·전달 방식 연결 → 전체 장면 선택 유지 |
| 표현 | 선택 글쓰기 즉시 표시, 줄무늬 없음, 입력/버튼 겹침 없음. 글/그림 reload 복구 |
| 이유 건너뛰기 | 앞서 수행한 action=recorded 유지, 이유 표현과 별도 기록 |
| 비교·결과 | 실제 역사/내 이야기, 최초 예측/실제 역사 두 단계 및 최종 resultId 유지 |
| new=1 | 새 시작 전 기존 기록 그대로, 새 resultId 생성 후 이전 기록 그대로 |
| 음성 | 합성 마이크 녹음·reload·저장 통과. 실제 장치 마이크 미검수 |
| 자산·콘솔 | 대표 화면 51장 경로에서 HTTP 오류·콘솔 오류 0, 폰트 로딩 확인 |
| 반응형 | 390×844 / 768×1024 / 1440×900, 가로 넘침 없음 |
| 연령 대표 화면 | 유아, 초1, 초2, 초3, 중학생, 고등학생, 성인; 비유아는 실제 역사/예측 화면 스모크, 전체 완주 주장은 하지 않음 |
| 키보드 | 연간 카드 Enter 선택 및 선택 제목으로 포커스 이동 확인 |
| 보호 | 등록 자산 12개 SHA-256 일치; public은 706bc03과 diff 0. core/canvas/기존 tests/원본 CSS/규칙/동결 자료 diff 0 |

연간 빌드의 금지 문구 검사는 **양쪽 entry 전체에서 원문 누출 검사**를 유지한다.
W24에 원래 있던 prohibitedClaims 방어 검사 문자열/참조 ID는 내부 원문이 아니다. 내부 필드명 검사는 Vite manifest의 연간 entry 그래프에 적용하도록 다중 entry 검사 범위를 명확히 했다. W24 엔진 방어 검사는 삭제하지 않았다.

## i18n

기존 translator/ui/kidText·언어 레지스트리를 그대로 사용했다. 기존 한국어 하드코딩 일부를 기존 locale 파일/키로 이동하고 연간 신규 표시 키를 추가했다. 언어 목록·번역 시스템·fallback 정책 변경 없음.

신규 파일을 intent-to-add로 포함한 `node scripts/check-i18n.mjs --program=nuvia-history --changed --strict-hardcoded` 결과:
- 기존 오류 3건 유지: LOCALE_PACK_INCOMPLETE ko; RELEASE_REVIEW_MISSING ko:rtl; RELEASE_REVIEW_MISSING ko:font.
- 기존 경고 2건 유지. 신규 한국어 하드코딩 후보 오류 없음.
- 저장소 전체 audit 20개 오류는 시작 기준 worktree와 동일(절대 worktree 경로만 정규화). 다른 프로그램의 기존 누락/규칙 오류는 수정하지 않음.
- 미지원 en/fr 진입을 차단하고 ko로 돌아왔을 때 활동·그림·글·resultId 보존 확인.
- 실제 제공은 ko뿐. RTL/다른 언어/원어민/중앙 폰트 검수 완료를 주장하지 않는다.

## 캡처·재검사

커밋에 보존한 대표 캡처:
- [연간 PC](../qa/reconnect/annual-1440.png) / [연간 모바일](../qa/reconnect/annual-390.png)
- [W24 계획 PC](../qa/reconnect/w24-planning-1440.png) / [W24 계획 모바일](../qa/reconnect/w24-planning-390.png)
- 기계 검수 요약: [reconnect-results.json](../qa/reconnect-results.json)
- 전체 로컬 캡처/상태: `nuvia-history-annual/.runtime/four-paths`, `.runtime/surfaces`.
- 수정 전 4장: `C:/Users/golde/.codex/visualizations/2026/09/19/01a0ba2c-3639-78f2-a5a8-97325961b5e4/history-before-{annual,w24}-{pc,mobile}.png`.

새 worktree의 annual 디렉터리에서:
```text
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build --configLoader runner
node node_modules/tsx/dist/cli.mjs --test tests/*.test.ts
node scripts/qa-entry.cjs
node scripts/qa-surfaces.cjs
node scripts/qa-reconnect.cjs
```
브라우저 검수는 PLAYWRIGHT_MODULE_PATH 및 W24_QA_WIDTH=390/768/1440을 사용한다. 기본 검수 URL은 5194이며 5192를 사용하지 않는다.
기존 개발환경 node_modules는 읽기 전용 재사용했으며 install/update는 하지 않았다.

## OPEN / 승인 경계

- **P2 시각 면적**: 비글쓰기 화면의 그림 면적 70% 검사에서 모바일 50상태/94, 태블릿 6/82, PC 6/82 경고. 모바일 수치는 추가 분기/합성음성 검사도 포함한다. 순수 그림/조작 배치 비율 경고이며 겹침·텍스트 정책 FAIL은 없음. 기준을 낮추거나 경고를 숨기지 않았다.
- 작은 카드의 행동 그림을 확대했고 PC 활동 화면 경고를 줄였으나, 일부 결과/비교/완성 화면의 면적 기준은 아직 미충족이다. 최종 시각 QA 통과라고 표시하지 않는다.
- **ART_BIBLE 문서 OPEN**: 누락 파일을 생성/복구하지 않았다. 기존 구현·실제 master 아트 방향·검수 캡처가 시각 근거다.
- **C-P1-01 미결정으로 음성 관련 기능 변경 없음**. 저장/녹음/재생/기존 노출의 계약을 그대로 유지했다.
- 다른 실제 기기, 실제 마이크, 화면낭독기, 인쇄/PDF 전체 경로는 미검수.
- W01/W48 승인 이미지·실행 연결은 계속 준비 중, 시작 차단.
- 기술 검증과 교육 활동/역사 고증/디자인 사용자 승인은 별개이다.
- 상태: **2.5D 재연결 후 기술 재검수 / 사용자 화면 검토 대기**.
