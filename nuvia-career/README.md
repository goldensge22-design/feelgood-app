# NUVIA 자소서 프로그램 — 개발자 인계

2026-10-27 인계 기준. 이 폴더는 Replit의 최신 작업본을 가져온 독립 pnpm workspace입니다. 기존 결과지·플래너 프로그램의 파일은 변경하지 않았습니다.

## 저장 위치와 기준선

- 저장소: https://github.com/goldensge22-design/feelgood-app
- 인계 브랜치: `codex/nuvia-career-handoff-20261027`
- 소스 위치: 이 브랜치의 `nuvia-career/`
- GitHub 기준 main: `292f022c0667e114d0be1f616fa1a8f5e720dd56`
- Replit 원본: HeavenlyWiltedConstants, 앱 ID `546ebb1e-3eed-447d-99fc-f558586d3f51`
- Replit 원본 커밋: `84774e18dbb63c1bf0d8cc92e4ce595674cd56ae` (2026-10-24 01:09:54 UTC). 2026-10-27 패키징 당시 작업 트리는 clean.
- 다운로드 ZIP SHA-256: `79639d423f74cce3d0e85f5daf1dcd9ada77d9bd18f31ec12d0ef956de0b2bff`
- 원본 ZIP 238개 파일 중 manifest를 제외한 237개 파일의 크기·SHA-256을 재검증했습니다. 최초 인계에서는 원본 앱·번역·설정을 보존하고 이 README를 추가했습니다. 이후 추가한 규칙 문서는 아래 개발 규칙 링크에서 확인합니다.
- 과거 문서의 `codex/nuvia-career-v4-qa-20261023`는 당시 준비 계획이며 이번 실제 인계 브랜치가 아닙니다. 저장 위치·기준선은 이 문서가 우선합니다.

## 공개 체험

- [체험 화면](https://heavenly-wilted-constants.replit.app/demo?lang=ko)
- [로그인 없이 읽는 공개 안내](https://heavenly-wilted-constants.replit.app/demo-info/ko.html)

Replit의 2026-10-27 읽기 전용 확인은 15개 공개 안내 HTTP 200, 체험 경로 HTTP 200, 비인증 개인 API HTTP 401입니다. 세부 근거는 `qa/public-guide/live-public-access.json`에 있습니다. 이 소스 저장 작업은 재배포가 아닙니다.

## 개발자가 이어서 구현할 범위

1. **결과지 실제 연동:** K-PASS/D-CAS 결과 계약을 확인하고 네 처리 영역·81유형·IQ·식별자·직무 TOP5의 순서와 근거를 보존해 adapter에 매핑합니다. 누락 결과를 임의 생성하거나 추천 순위를 재계산하지 않습니다.
2. **플래너 실제 연동:** 직무 선택 → 일상 적용형/직무 상황형 활동 → 실제 행동·선택 이유·수정·결과·배움 → 사용자가 확인·선택한 경험 전송을 연결합니다. 활동 카드 종류와 실제/모의 경험 여부는 별도 속성입니다. 비공개 메모·미선택 필드는 전송하지 않습니다.
3. **서버 저장·권한:** 사용자 소유권, 공유 동의/철회, 원본 버전, 중복 요청, 변경 비교, 오류/만료/삭제 상태를 서버에서 검증하고 출처 부가정보 및 버전 스냅샷을 저장합니다. 현재 새 출처 부가정보의 기기 저장은 서버 저장 완료가 아닙니다.
4. **기업·NCS 기준:** 제공되는 실제 데이터의 출처·버전·기준일을 보존해 매핑합니다. 현재 공통 예시 기준을 공식 NCS/기업 인재상으로 표시하지 않습니다.
5. **왕복 연결:** 검증된 플래너 원본 복귀 URL과 계획 생성 API를 연결합니다. 사용자 확인과 API 성공 이전에 생성/저장 완료로 표시하지 않습니다.

현재 서버가 외부 planner 출처를 `SOURCE_CONNECTOR_REQUIRED`로 거절하는 검증을 우회하거나 출처를 manual로 바꾸지 마세요. 기존 작성문과 제출 버전은 원본이 바뀌어도 자동 덮어쓰지 않습니다.

## 추가 개발 규칙

[기업 공유 동의·행동 근거 지표·면접 확인 규칙](docs/COMPANY_SHARING_EVIDENCE_RULES.md)을 구현 기준으로 사용합니다. 한국어 흐름을 먼저 검토·수정·확정하고 나머지 14개 언어에 변경사항을 반영합니다. 규칙의 저장은 해당 기능의 구현 완료가 아닙니다. 이 프로그램의 [AGENTS.md](AGENTS.md)에도 필수 요약을 등록했습니다.

## 읽을 문서

- [실제 연동 담당 경계·입력·수용 기준](docs/nuvia-frontend-integration-handoff.md)
- [기존 연동 계약](docs/nuvia-integration-contract.md)
- [실행·DB·인증·QA 안내](docs/nuvia-runbook.md)
- [기존 검증 보고서](docs/nuvia-verification.md)
- [공개 접속 확인 기록](qa/public-guide/live-public-access.json)
- [원본 스냅샷과 포함/제외 목록](README-HANDOFF.md)
- [파일별 원본 체크섬](PACKAGE-MANIFEST.json)

기존 문서는 당시 검증 기록으로 보존했습니다. 과거 비공개 배포 상태는 이번 공개 접속 확인과 구분해서 읽어주세요.

## 실행 환경

`nuvia-career/`에서 Node.js 24와 pnpm을 사용합니다. 원본 lockfile과 workspace 설정을 함께 보존했습니다. 원본은 Linux x64/Replit용이며 Windows/macOS 네이티브 빌드 의존성을 제외한 설정과 POSIX shell 명령이 있습니다. 그대로 재현할 때는 Linux x64 개발 환경 또는 WSL2를 사용하고, 다른 환경 지원은 별도로 검증하세요.

API에는 PostgreSQL과 기존 Clerk 개발용 환경 설정이 필요합니다. 비밀값은 별도 안전한 환경 설정으로 전달하며 GitHub에 넣지 않습니다. 프런트엔드와 API는 같은 외부 origin의 `/api` 라우팅을 구성합니다. DB DDL 적용은 실제 스키마와 비교한 뒤 수행하세요.

## QA 완료와 미완료의 구분

- **이번 인계에서 직접 확인:** ZIP 체크섬, 원본 manifest 237개 파일 크기/해시 일치, 경로 탈출·심볼릭 링크 없음, .env/.git/node_modules/DB덤프 경로 없음, 대표 자격증명 패턴 검사에서 발견 없음, 최신 public-guide 소스 포함. 이 검사는 전체 보안 감사가 아닙니다.
- **Replit의 기존 보고:** 합성 자료 기반 프런트엔드 15개 언어 × PC/태블릿/360px 45건, 상태 검사·단위 검사, DOCX/HWPX 다운로드·구조/본문 검증. 상세 범위와 재시도 이력은 원본 문서 참조.
- **이번 저장 작업에서 재실행하지 않음:** 전체 설치·빌드·브라우저 여정. 실행 소스는 원본과 동일합니다. 본 저장소 main에는 공통 `scripts/check-i18n.mjs`가 없으며 이 앱의 등록 여부나 저장소 전체 QA 통과를 추정하지 않습니다. 앱 자체 locale 검증과 검사 스크립트를 보존했습니다.
- **남은 수용 검사:** 실제 테스트 계정 로그인 후 전체 여정, 실제 결과지·플래너 왕복·계정별 서버 저장, Word와 한컴에서 내려받은 문서 직접 열기, 원어민 번역 검수.
- 지원 언어는 `ko`, `en`, `ja`, `zh-CN`, `zh-TW`, `mn`, `th`, `vi`, `ar`, `ru`, `km`, `es`, `fr`, `it`, `az`입니다. 기존 번역을 보존하고 추가·의미 변경 key만 검수하세요.

이 인계는 최신 소스 보관과 개발 준비 상태를 뜻합니다. 실제 통합 및 남은 QA까지 제품 전체 완료로 판정하지 않습니다.
