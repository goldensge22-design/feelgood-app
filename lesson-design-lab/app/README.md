# 수업설계LAB v1.5 STAR 패치 — 전체 개발 인계

수업설계LAB 앱의 최신 소스, 필요한 공통 소스, 의존 잠금 파일, 확정 규칙과 패치, QA 도구/증거를 포함한다.
별도 AI자소서·기업대시보드·플래너 서버는 포함·변경하지 않는다. 실제 학생 데이터와 사용자 브라우저 저장 데이터도 들어 있지 않다.

## 기존 feelgood-app에 넣는 위치

예: `tools/teacher-lesson-lab/`처럼 **별도 폴더 전체**로 보관한다. 기존 저장소의 루트 package.json·잠금 파일·다른 앱을 덮어쓰지 않는다.
이 폴더는 자체 `pnpm-workspace.yaml`이 있는 독립 workspace다. 아래 명령은 모두 **이 README가 있는 폴더에서** 실행한다.
GitHub 연결·커밋·업로드·공개 게시는 이번 인계 작업에서 실행하지 않았다.

## 설치와 실행

Node.js **24**, pnpm **10.26.1**을 준비한다.

```sh
pnpm install --frozen-lockfile
pnpm verify:files
pnpm typecheck
pnpm build
pnpm dev
```

기본 주소: `http://localhost:5173/`. 주요 화면: `/studio`, `/studio/writing`, `/studio/print`, `/rules`.
`PORT`와 `BASE_PATH`의 기본값은 실행 도구가 설정한다. 경로 하위에서 서비스하려면 실제 호스트/프록시에 맞게 `BASE_PATH`를 지정한다.
`pnpm preview`는 빌드한 프런트엔드를 확인한다. 실제 인증/서버 저장을 제공하는 명령은 아니다.

## 무엇이 바뀌었나

- V1 전부터 접근하는 선택적 경험 정리 도움과 한 질문씩 보기. 상황/역할은 비워도 된다.
- 경험/지원동기/가치관/계획/직접 설정 목적과 자동/STAR/목적별/없음 도움 선택.
- 독립 메모와 메모 이력, 학생 직접 작성 V1/V2 보존, 원본 변경/철회 시 새 활용 전 재확인.
- 학생이 출력 포함과 담당자 공유를 각각 선택한 메모만 교사 출력에 포함.
- 경험 정리·글쓰기 점검·면담/수정 기록의 개별/선택/반 전체 및 기존 A4/A5 자료와 함께 출력.
- 대상별 자료/질문/도움/산출물과 15언어. 기존 시간표 총합/휴식·18수업/36종·81유형 지원은 유지.

별도 AI자소서의 한국어 우선 STAR 보강은 사용자가 전달한 별도 제품의 상태다. 이 교사 앱의 15언어 검사와 혼동하지 않는다.

## 검사 재현

```sh
pnpm qa:unit
# 전체 실제 브라우저/PDF 검사 (Chrome/Chromium, Poppler, 다국어 글꼴 필요)
CHROME_BIN=/path/to/chromium pnpm qa
```

PowerShell:

```powershell
$env:CHROME_BIN="C:\Program Files\Google\Chrome\Application\chrome.exe"
pnpm qa
```

Windows 명령 예시는 안내이며 네이티브 Windows 검증 완료를 뜻하지 않는다. `pdfinfo`, `pdftotext`, `pdffonts`가 PATH에서 실행 가능해야 한다.
시스템에 한국어·중/일문·몽골어·태국어·크메르어·아랍어 등 Noto 계열 글꼴을 설치한다. 앱의 외부 Google 글꼴을 쓰려면 인터넷도 필요하다.

- 단위 범위: 기존 508개 + 신규 STAR 로직. `qa:unit`은 브라우저/PDF 검사가 아니다.
- 전체 범위: **기존 564개를 현재 소스로 재실행**하고 신규 STAR 로직/브라우저/PDF를 추가한다.
- 원본 앱/검사 소스는 바꾸지 않는다. 실행 도구가 임시 검사 사본에 로컬 주소·CDP 포트·임시 경로만 치환하고 실행 후 삭제한다.
- QA 서버는 기본 5175, CDP는 9233이며 기존 앱/프로필을 건드리지 않는 가상 명부와 임시 Chrome 프로필을 쓴다.
- 실행 결과는 새 `generated-artifacts/lesson-lab-star-qa/`와 `lesson-lab-report-history-qa/`에 저장한다.
- 자동 검사의 범위와 현재 통과 수는 아래 최신 summary를 따른다. 테스트를 수정하거나 앱을 바꾸면 새로 실행해야 한다.

## 반드시 읽을 증거/문서

- `HANDOFF-VALIDATION.md`: ZIP 분리 설치·빌드·검사 실제 결과/시각/OS/제한.
- `docs/lesson-lab/QA-STAR.md`: 이번 패치 QA와 미실행 항목.
- `qa/evidence/star-patch/summary.json`, `report.html`: 패치 전체 합산 결과/소스 SHA-256.
- `qa/evidence/latest-564/`: 이번 소스로 다시 실행한 기존 회귀 검사.
- `docs/lesson-lab/STAR-HANDOFF.md`: 데이터/공유/원본 변경·철회 처리와 개발자 적용.
- `artifacts/teacher-lesson-lab/public/rules/`: 규칙 1.0/1.1/1.2/1.5 및 추가 STAR 패치.
- `docs/lesson-lab/QA-1.5-REPORT-HISTORY-2026-11-05.md`: 직전 12개 규칙 대조.
- `INTEGRATION-TODO.md`: 실제 인증·담당 수업 권한·서버 저장·결과지/LAB/플래너/AI 연결 후속 작업.

## 소스 동일성과 제외 항목

`SHA256SUMS.json`에 자기 자신을 제외한 모든 파일의 크기와 SHA-256을 기록했다. `pnpm verify:files`로 검증한다.
`provenance/source-files.json`은 원본 프로젝트에서 바이트 그대로 복사한 파일의 경로/해시다.
원래 Replit 루트 설정/잠금 파일은 `provenance/original-workspace/`에 별도 보존한다.

앱 소스는 원본과 동일하다. 루트 실행 설정은 이식용이다. 불필요한 workspace 의존을 제외하고 다른 OS용 네이티브 패키지를 강제로 배제하던 Replit 전용 설정만 제거했다.
보안 최소 배포 대기 설정과 비플랫폼 보안 overrides는 유지했다.

node_modules·dist·캐시·Git 이력·브라우저 프로필·환경파일·비밀키·인증정보·실제 학생 기록은 ZIP에 넣지 않았다.
가상 학생으로 검사한 PDF/스크린샷/검사 로그는 검수 증거로 포함했다.

## 승인하지 않은 범위

현재는 로컬 데모다. 서버 저장 성공·실제 계정 권한·플래너 자동 동기화·AI 연결 성공을 뜻하지 않는다.
원어민 의미 승인, 전체 PDF 육안 승인, 실물 프린터, 네이티브 macOS/Windows/ARM 및 실서버 통합 검증은 별도다.
큰 번들 경고는 남아 있고 숨기지 않는다. 공개 배포는 수행하지 않았다.
