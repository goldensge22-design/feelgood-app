# D-CAS ENTERPRISE LABS 전자책 개발자 전달 안내

이 패키지는 **인사담당자 채용 실무 가이드의 전체 편집 가능한 소스**, 원래 워크스페이스 설정과 잠금 정보, 공유 소스, 검증한 정적 빌드, 한국어 안내 및 실제 QA 보고서를 전달한다. 기업 대시보드를 대체하는 패키지가 아니다. 기존 공개 서비스나 GitHub 원격을 변경하지 않았다.

## 1. 패키지와 무결성

소스 ZIP과 증거 ZIP들을 같은 상위 폴더에 풀면 하나의 `dcas-guide/` 폴더로 합쳐진다.

- 소스 ZIP: 앱 소스, `lib/` 공유 소스, 루트 패키지/잠금/카탈로그/TypeScript 설정, QA 보고서, 이 안내, `release/` 정적 빌드.
- 증거 ZIP: `generated-artifacts/dcas-qa/` 최종 화면·PDF와 `generated-artifacts/dcas-qa-before/` 수정 전 증거. 용량 때문에 여러 개로 나뉜다.
- `handoff/EVIDENCE_INDEX.json`: 모든 증거 파일의 원래 상대경로·크기·SHA-256·담긴 ZIP 및 공통 packageId.
- `handoff/SOURCE_PROVENANCE.json`: 원본 소스 복사본의 경로·크기·해시. 앱/공유 소스·잠금 파일은 바이트 단위로 그대로 복사했다.
- 각 ZIP의 `handoff/PART_MANIFEST-*.json`은 해당 파일 목록/해시를 제공한다. 소스의 `SHA256SUMS`는 소스 ZIP 내용의 파일별 검증 목록이다. 자기 자신을 해시하는 순환을 피하기 위해 해당 목록과 파트 목록 자신은 목록에서 제외한다.
- 별도 `DELIVERY_INDEX.json`과 `DELIVERY_SHA256SUMS.txt`가 완성 ZIP 전체의 SHA-256을 제공한다.

예: 소스 ZIP을 푼 폴더에서 `sha256sum -c SHA256SUMS`. 전달 ZIP 검증은 모든 ZIP과 `DELIVERY_SHA256SUMS.txt`를 같은 폴더에 두고 `sha256sum -c DELIVERY_SHA256SUMS.txt`.

포함하지 않은 것: 사용자 데이터, 운영 DB, 개인 프로필, 키/토큰/인증정보, `.env`, Git 이력·원격 설정, 브라우저 프로필/쿠키/인증 상태, 캐시, `node_modules`, 다른 앱/API 서버/목업 앱. QA의 가상 채용 사례와 개인용 체크리스트를 구현하는 코드는 제품 소스이며 실제 이용자의 체크 기록은 포함하지 않는다.

## 2. 실행 환경과 설치

실제 재현 검증 환경: Linux x64/glibc, Node.js 24, pnpm 10.26.1. 결과의 정확한 버전·명령·성공/실패는 `handoff/verification/`에 있다. 인터넷으로 공개 npm 패키지를 받아야 한다. 인증키나 운영 DB는 전자책 설치·빌드·실행에 필요 없다.

**원래 `pnpm-workspace.yaml`의 네이티브 패키지 override는 Linux x64 중심이다.** 이를 그대로 보존했다. Windows/macOS 원어민 환경 빌드는 검증하지 않았으며 Linux/WSL/적절한 Linux CI를 권장한다. 다른 운영체제로 바꿀 때는 별도 브랜치에서 네이티브 패키지 override와 잠금 정보를 검토해야 한다. 현재 패키지의 재현 검증을 타 OS 보증으로 해석하지 않는다.

압축을 푼 뒤 `dcas-guide/`에서 실행:

```bash
pnpm install --frozen-lockfile
pnpm exec tsc -b lib/api-client-react
pnpm --filter @workspace/dcas-quick-guide validate:i18n
pnpm --filter @workspace/dcas-quick-guide typecheck
PORT=21888 BASE_PATH=/ pnpm --filter @workspace/dcas-quick-guide run dev
```

개발 서버는 `http://localhost:21888/`에서 확인한다. 위 명령은 **전달받은 개발자의 환경**에서 실행하는 명령이다. 기존 Replit 워크플로나 공개 서비스를 교체하라는 뜻이 아니다.

`api-client-react`는 현재 앱의 명시적 공유 의존성이다. 나머지 `lib/api-spec`, `lib/api-zod`, `lib/db`는 원본 루트 설정과 TypeScript 참조를 유지하기 위해 소스만 포함한다. DB 데이터는 없고 전자책 실행에 API 서버나 DB를 시작할 필요도 없다. 루트의 일반 워크스페이스 스크립트보다 위의 전자책 대상 명령을 우선한다. DB 마이그레이션/스키마 적용 명령은 전자책 설치 과정에 필요 없다.

## 3. 루트 경로 정적 배포

```bash
PORT=21888 BASE_PATH=/ pnpm --filter @workspace/dcas-quick-guide run build
```

- 필수 빌드 설정: `PORT`는 양수, `BASE_PATH`는 `/` 또는 슬래시로 시작하고 끝나는 하위 경로. 두 값은 비밀값이 아니다.
- 결과: `artifacts/dcas-quick-guide/dist/public/`.
- 이 **디렉터리 안의 내용**을 새 정적 호스트의 문서 루트에 올린다. 원본 TypeScript가 아니라 빌드 결과를 호스팅한다.
- 정적 호스트는 필요한 경로를 `/index.html`로 처리하되 실제 JS/CSS 파일은 정상 제공한다. 현재 앱의 장 이동은 `#ch1` 같은 hash를 사용한다.
- `release/static-root/`는 깨끗한 설치에서 실제 생성한 루트 경로용 결과다. 원래 작업 공간에 있던 결과와의 파일별 해시 비교는 `handoff/verification/build-comparison.json`에 있다.
- 원래 Replit 아티팩트 설정은 `artifacts/dcas-quick-guide/.replit-artifact/artifact.toml`에 포함했다. 이 파일은 참고용이며 다른 프로젝트에 복사했다고 자동으로 서비스가 등록되는 것은 아니다.

출력물 로컬 확인:

```bash
PORT=21889 BASE_PATH=/ pnpm --filter @workspace/dcas-quick-guide run serve
```

## 4. 하위 경로 `/dcas-guide/` 배포

```bash
PORT=21888 BASE_PATH=/dcas-guide/ pnpm --filter @workspace/dcas-quick-guide run build
PORT=21889 BASE_PATH=/dcas-guide/ pnpm --filter @workspace/dcas-quick-guide run serve
```

- 접속 URL은 `https://호스트/dcas-guide/?lang=ko#cover` 또는 로컬 `http://localhost:21889/dcas-guide/`.
- 해당 빌드 결과를 호스트의 `/dcas-guide/`에 대응하는 디렉터리에 배치한다.
- 필요한 fallback도 `/dcas-guide/index.html`로 한다. 다른 서비스의 루트 `/index.html`을 덮어쓰지 않는다.
- `/` 빌드와 하위 경로 빌드는 서로 대체 가능하지 않다. 경로가 바뀌면 다시 빌드한다.
- `release/static-subpath-dcas-guide/`는 위 하위 경로로 별도 빌드하고 브라우저로 검사한 결과다.
- GitHub 저장소 안의 소스 디렉터리 이름과 실제 웹 URL의 하위 경로는 별개다. GitHub 업로드만으로 웹 배포가 이루어지지는 않는다.

## 5. 외부 데모 링크와 외부 자원

설정 파일: `artifacts/dcas-quick-guide/src/i18n/guide-config.json`.

- `demoBase`: 현재 공개 데모 URL.
- `demoVersion`: 현재 `14`.
- `chapterHashes`: 각 업무 단계에서 여는 메뉴 hash 목록.
- 링크 조합: `src/i18n/registry.ts`의 `demoUrl()`이 선택 언어의 `lang`, 버전 `v`, 메뉴 hash를 붙인다.
- **별도의 `VITE_DEMO_URL` 환경변수는 구현되어 있지 않다.** 대상을 바꿔야 할 때만 개발자가 설정 파일을 수정하고 링크 QA 후 재빌드한다. 이 전달 패키지는 대상을 바꾸지 않았다.
- 데모는 외부 서비스다. 전자책의 입력 예시가 데모/운영 서버로 전송되거나 저장되지 않는다.
- Google Fonts/Noto 계열 글꼴은 CSS의 외부 URL에서 로드한다. 글꼴과 npm 패키지를 오프라인 설치 파일로 동봉한 것은 아니므로 네트워크·호스트 CSP를 확인한다. 오프라인 글꼴 제공을 추가하려면 라이선스와 문자권별 PDF 표시를 별도 검증한다.

## 6. QA 증거와 한계

원 보고서는 `qa/dcas-guide/README.md`. 실제 실행 JSON, AI 번역 검토/판단, PDF 페이지별 결과, 화면별 결과, 증거 해시가 함께 있다. 증거 ZIP을 풀면 원 보고서의 경로가 그대로 성립한다.

- 언어 15개: ko,en,ja,zh-CN,zh-TW,mn,th,vi,ar,ru,km,es,fr,it,az.
- 표지·6장·체크리스트/예시, 1440/1024/768/360px 및 대표 긴 번역/RTL 가로 화면: 520 상태. 태국어·크메르어 수정 후 80 상태 재검사.
- 인쇄 버튼 실제 실행, 15 PDF/210쪽 생성·전체 페이지 렌더링과 시각 검사.
- 두 시작 경로, 목차·활성/포커스, 이전/다음, 예시, 체크리스트, 새로고침·언어 전환 상태, 파라미터/hash, 연속 언어 전환, 외부 링크 165개를 검사했다.
- **14개 외국어는 AI 대조 초안이며 원어민 검수 미완료다.** AI 검토를 원어민 인증이나 번역 품질 보증으로 표시하지 않는다.
- **운영 로그인 후 지원자 연결·실제 저장/분석 반영은 미검증**이다. 플래너·AI 자소서 통합 자료는 운영 데이터 미연결이라는 확인에 맞춰 조건부로 안내한다.
- **Chromium 이외 브라우저 및 물리 프린터는 미검증**이다.
- 공개 원본의 외국어 역량 모델 버전 관리 버튼 세 개는 잘못된 공통 설명문이어서 실제 운영 화면 명칭 인증을 하지 못했다.
- 실제 설치/재빌드 후 수행한 검사는 추가 smoke 검사다. 위 전체 QA를 새 환경에서 처음부터 모두 다시 수행했다고 주장하지 않는다.

원 QA 재실행에는 시스템 `chromium`, Python 3, Poppler(`pdftoppm`, `pdftotext`, `pdfinfo`), ImageMagick(`magick`)도 필요하다. 원 스크립트는 `which chromium`을 사용한다. OS 패키지로 제공하고 설치를 완료한 후 실행한다:

```bash
GUIDE_TEST_URL=http://localhost:21888 node artifacts/dcas-quick-guide/scripts/qa-full.mjs
MAGICK_THREAD_LIMIT=2 python3 artifacts/dcas-quick-guide/scripts/qa-print-evidence.py
```

이 명령은 QA JSON/화면/PDF를 새로 기록하므로 전달받은 원 증거를 보관한 복사본에서 실행한다.

## 7. 공개 서비스 접근 확인

현재 전달 시점의 익명 브라우저 검사와 배포 메타데이터 결과는 `handoff/verification/production-access.json` 및 화면 증거에 있다. 로그인 페이지/권한 차단이면 표지·장 탐색은 **미실행**이며 성공으로 표기하지 않는다. 공개 상태는 변경될 수 있으므로 결과의 검사 시점을 확인한다. 패키지 준비 과정에서 로그인·권한 변경·재배포를 하지 않았다.

## 8. GitHub 개발자 전달

목적 저장소는 사용자가 지정한 `goldensge22-design/feelgood-app`이다. 이 패키지는 GitHub 원격/자격증명을 포함하지 않으며 자동 푸시하지 않는다.

1. 사용자가 GitHub에서 별도 브랜치를 만든다.
2. 소스 ZIP을 **풀어** 별도 디렉터리(예: `developer-handoff/dcas-guide/`)에 전체 구조를 유지해 올린다. 기존 기업 대시보드 디렉터리를 덮어쓰지 않는다.
3. 숨김 설정 파일, 잠금 파일, 공유 소스와 QA 보고서도 포함되었는지 확인한다.
4. 증거 ZIP은 크기 때문에 Git 이력에 넣지 말고 별도 전달/Release 첨부 등으로 보관한다. 공통 packageId와 `EVIDENCE_INDEX.json`/ZIP 해시로 대응시킨다.
5. 개발자는 해당 전자책 폴더를 독립 pnpm 워크스페이스로 다룬다. 기존 저장소의 다른 워크스페이스에 통합하려면 중복 패키지 이름과 카탈로그·잠금 파일을 별도 검토한다.

이미 존재하는 소스/대시보드/공개 서비스를 이 안내만으로 교체하거나 임의로 배포하지 않는다.
