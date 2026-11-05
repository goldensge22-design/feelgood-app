# 수업설계LAB 개발 인계

이 폴더 전체가 **독립 pnpm 작업공간**이다. 기존 `feelgood-app` 저장소 안의 별도 폴더(예: `tools/teacher-lesson-lab-handoff/`)로 넣고 이 폴더에서 명령을 실행한다.
기존 저장소 루트의 package.json·잠금 파일·기업대시보드·학생 LAB·자소서 앱을 교체하거나 합치지 않는다.
이 ZIP은 공개 게시·실서버 연결 승인이 아니다.

## 빠른 시작

필수: **Node.js 24 LTS**, **pnpm 10.26.1**, 인터넷(공개 npm 및 화면 글꼴).
예: `npm install -g pnpm@10.26.1` 후 이 폴더에서:

```sh
pnpm install --frozen-lockfile
pnpm verify:files
pnpm typecheck
pnpm build
pnpm dev
```

개발 주소: `http://localhost:5173` / 과정 결과 화면: `http://localhost:5173/studio/results`.
빌드 결과: `artifacts/teacher-lesson-lab/dist/public`. `pnpm preview`로 확인한다.
실제 계정·학생 데이터·브라우저 저장소·API 키는 포함하지 않았다. 처음 실행하면 비어 있으며 앱의 가상 명단 생성으로 시작한다.
실제 학생 기록을 공개 데모에 넣지 않는다. 개발 실행에는 비밀키나 DB가 필요하지 않다.

`handoff/run.mjs`는 기존 Vite 설정이 요구하는 `PORT=5173`, `BASE_PATH=/`를 자식 프로세스에만 제공한다. 시스템 환경을 바꾸지 않는다.
포트 변경은 실행 전 `PORT`를 지정한다. 하위 URL 배포를 개발자가 시험할 때만 `BASE_PATH`를 지정한다. 이는 게시 명령이 아니다.

## 구조와 원본 동일성

- `artifacts/teacher-lesson-lab/`: 최신 앱 소스·공개 규칙·기존 검사 코드. 설치 결과물은 제외했다.
- `lib/api-client-react/`, `tsconfig.base.json`: 필요한 공통 소스·설정.
- `pnpm-lock.yaml`: **이 별도 폴더용으로 검증한 잠금 파일**.
- `provenance/original-workspace/`: 원래 루트 package/workspace/lock/tsconfig의 변경 없는 사본.
- `provenance/source-files.json`: 원본 파일 경로와 SHA-256. 앱 `src` 집계 해시는 최신 564개 QA의 `c06dfd24242583357aa8aeca91f2f3c6ab86f25a01ca113264961bffa6488e74`와 같아야 한다.
- `SHA256SUMS.json`: 인계 패키지 전체 파일 목록·크기·해시. 자기 자신은 제외한다.
- `qa/evidence/latest-564/`: 원래 실행 시각을 가진 최신 **564 통과·실패 0** 증거와 대표 출력.
- `docs/lesson-lab/`: 확정 규칙 변경 이력, 12개 규칙 대조, 연동 안내, 과거 검수의 범위.
- `HANDOFF-VALIDATION.md`: 분리 설치·빌드·실행/검사 결과와 플랫폼 범위.

루트 실행 스크립트와 작업공간은 인계 편의를 위한 오버레이다. 앱·공통 소스는 원본과 동일하다.
원래 Replit 루트에서 제외했던 macOS/Windows/ARM용 네이티브 선택 패키지를 이 사본에서는 제외하지 않는다.
공급망 보호 `minimumReleaseAge: 1440`과 비플랫폼 보안 overrides는 유지했다.
검증한 OS는 안내의 실제 결과를 따른다. 네이티브 Windows/macOS 설치를 실제 검증했다고 해석하지 않는다.

## 검사 재현

```sh
pnpm qa:unit
```

핵심 28 + 자동 회귀 21 + 언어 회귀 203 + U09 회귀 212 + 결과 이력 회귀 44 = **508개**.
진단의 사람 승인 대기 3개는 자동 실패 3개가 아니다.

전체 564개와 실제 PDF를 재현하려면:

1. Chrome 또는 Chromium을 설치하고 `CHROME_BIN`을 실행 파일의 절대 경로로 설정한다.
2. Poppler의 `pdfinfo`, `pdftotext`, `pdffonts`를 PATH에 둔다.
3. 인터넷 및 한글·CJK·아랍어 등 대상 언어 글꼴을 준비한다. Linux 권장: Noto Sans CJK, Noto Sans Arabic, Noto Sans Khmer/Thai 등.
4. `pnpm qa`를 실행한다. 실제 학생 프로필이 아닌 **별도 임시 Chrome 프로필**과 가상 학생을 사용한다.

Linux 예:
```sh
CHROME_BIN=/usr/bin/chromium pnpm qa
```

PowerShell 예:
```powershell
$env:CHROME_BIN = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
pnpm qa
```

자동 검사 도구의 기본 포트는 앱 5175, CDP 9233이다. 충돌 시 `PORT`와 `QA_CDP_PORT`를 변경한다.
생성 결과는 `generated-artifacts/`에만 쓰고 기존 `qa/evidence/` 증거를 덮어쓰지 않는다.
일부 원래 검사는 Replit 프록시·9227·`/tmp` 경로를 사용한다. 런처는 **일회용 검사 사본**에서만 이를 로컬 주소·CDP·임시 경로로 교체한다.
원래 검사 로직과 앱 소스는 수정하지 않으며 임시 검사 사본은 종료 시 제거한다.
`qa`는 508개 + 기존 브라우저 11개 + 신규 브라우저 45개 = **564개** 및 별도 타입/빌드를 실행한다.
네이티브 OS 차이·글꼴·Poppler·Chrome 버전에 따라 결과는 달라질 수 있으며 새 실행 결과를 원래 증거와 구분한다.

## QA 상태를 과장하지 않는 기준

기존 168PDF·718쪽은 과거 증거이며 최신 수정 후 전체 재실행이 아니다.
최신 564개 실행에서 확인한 출력은 새 15언어 개인 요약 15PDF·15쪽과 기존 시나리오 3PDF·96쪽, 합계 **18PDF·111쪽**이다.
영어·아랍어 대표 페이지 시각 확인과 PDF 기술 검사를 전체 출력 육안 승인으로 표현하지 않는다.
원어민·교육 전문가 의미 승인, 실물 프린터, 실서버/외부 AI/인증 통합은 미실행이다.
확정 규칙은 `artifacts/teacher-lesson-lab/public/rules/`의 **1.5 및 승계 1.2/1.1/1.0**을 보존한다.
12개 규칙 대조는 `docs/lesson-lab/QA-1.5-REPORT-HISTORY-2026-11-05.md`를 읽는다.
별도 연동·권한 작업은 `INTEGRATION-TODO.md`를 따른다.

## GitHub 인계 시 주의

사용자가 기존 `feelgood-app` 저장소의 별도 폴더로 업로드한다. 이 인계 작업은 저장소 연결·커밋·푸시·공개 설정 변경을 수행하지 않았다.
설치 후 생긴 node_modules·dist·임시 프로필·학생 데이터·.env를 커밋하지 않는다.
MIT 표기는 원래 루트 package.json의 표기이며 모든 외부 의존/글꼴을 별도 재라이선스한다는 뜻은 아니다.
