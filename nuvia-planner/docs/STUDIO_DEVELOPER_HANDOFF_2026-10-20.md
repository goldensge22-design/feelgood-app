# 내 하루 작업대 — 개발자 인계 지시서

## 1. 상태와 위치

저장소: `goldensge22-design/feelgood-app`  
대상 브랜치: `codex/recover-planner-dcas81`  
작업 전 GitHub 기준: `811609f437c5cfb4a525a6465d1aec8774465766`

**운영 적용 보류:** 한국어 기능 후보의 소스를 보관·인계하는 단계입니다. 15개 언어 QA는 미통과이고, 실제 서버·인증·소유권·동기화는 미연결입니다. 아래 남은 조건을 해결한 뒤 승인받아 적용하세요. main 병합·배포·기존 URL 교체는 수행하지 않았습니다.

| 대상 | 경로 | 용도 |
| --- | --- | --- |
| 새 전체 소스 | `nuvia-planner/studio/` | 독립 실행 검토 앱; 기존 GitHub 저장소 전체의 대체본 아님 |
| 최신 UI | `studio/artifacts/nuvia-ui-review/src/studio/` | 내 하루 작업대, 월간, 로드맵, 저장/백업 |
| 브라우저 진입 | `studio/artifacts/nuvia-ui-review/studio.html` | 일반 개인 화면; `?review=1`은 분리 합성 검토 |
| 연동 상세 | `studio/artifacts/nuvia-ui-review/docs/RESULT_INTEGRATION.md` | 실제 코드 수신 지점과 합성 payload |
| 기존 공식 연동 | `docs/NUVIA_PLANNER_RESULT_SERVER_INTEGRATION.md` | 기존 플래너의 Assessment v1.1 계약 |
| 요구사항/QA | 같은 폴더의 `STUDIO_APPROVED_REQUIREMENTS`, `STUDIO_FINAL_QA`, `STUDIO_I18N_QA` 문서 | 요구와 구현 증거·미완료 구분 |
| 제작 도구 증거 | `studio/screenshots/nuvia-final/`, `studio/artifacts/nuvia-ui-review/docs/qa-logs/` | Replit 제공 캡처/로그; 독립 재실행 증거와 구분 |

`index.html`, `before.html`, `previous.html`, `enhancement.html`, `personal-monthly.html`은 패키지의 비교/이전 화면입니다. **최신 작업대는 studio.html**입니다. `src/official`, `src/before`, `src/previous`는 Replit에 있던 사본이며 GitHub의 기존 `nuvia-planner/source`를 대체하지 않습니다.

## 2. 출처와 변경 범위

- 수신 ZIP: `NUVIA_PLANNER_FINAL_FULL_SOURCE_20261020_QA_FIXED.zip`
- 크기: 4,336,897 bytes
- SHA-256: `99008ceba56b88388ca38387bae695ae3135339fc15aeb8e6d445c5be41c708c`
- Replit 최종 체크포인트(제작 도구 보고): `b60f130a8818362b57621051ba58d8e5968deb61`
- Replit 패치 시작점: `59d2e9cf8b4318c5821ac74bc0973f098a804b6a`

원본 ZIP의 앱 소스는 새 폴더에 보존했습니다. 인계 과정의 추가 변경은 Windows x64 빌드 패키지 제외 해제, 파일 삭제 없는 Node 기반 pnpm 확인, lockfile 보완, 생성물 제외, 핵심 테스트 runner에 최소 입력 검사 추가, 언어 감사 도구와 문서입니다. 기존 번역을 재생성하지 않았습니다.

`studio/SHA256SUMS.json`은 **수신 원본**의 해시 목록입니다. 위 로컬 실행 설정 변경 이후 파일 전체의 해시라고 해석하지 마세요. 최종 Git commit이 인계 파일의 기준입니다.

`studio/handoff/CHANGES.patch`는 Replit 시작점 전용입니다. **GitHub 811609f에 직접 apply하면 안 됩니다.** 이 인계는 그 patch를 기존 제품에 적용하지 않고 독립 폴더로 저장한 것입니다.

## 3. 독립 재현

Node.js 24 이상, pnpm 사용. 이 인계에서는 Windows x64 / pnpm 11.25.0으로 확인했습니다. macOS·ARM은 패키지의 기존 플랫폼 제외 설정 때문에 별도 조정/검증이 필요합니다.

PowerShell:

```powershell
Set-Location nuvia-planner/studio
pnpm install --frozen-lockfile --ignore-scripts
$env:PORT='4188'
$env:BASE_PATH='/'
pnpm run build
node tools/nuvia-studio/run-core.mjs
pnpm --filter @workspace/nuvia-ui-review serve --host 127.0.0.1 --port 4188
```

`http://127.0.0.1:4188/studio.html` / 합성 검수 `http://127.0.0.1:4188/studio.html?review=1`.
`pnpm run build`는 타입 검사와 Vite production build입니다. 배포 명령이 아닙니다.
`node tools/nuvia-studio/audit-languages.mjs --strict`는 현재 **종료 코드 1**이 정상적인 미완료 탐지 결과입니다. 이를 건너뛰고 다국어 완료로 보고하지 마세요.

기존 제품의 `build:delivery`는 기존 독립 HTML을 덮어쓰므로 새 Studio 검수에는 사용하지 않습니다. `dist/`, node_modules, 사용자 백업, .env는 커밋하지 않습니다.

## 4. 결과지 연동 방식

1. 최신 서버 담당 브랜치에서 기존 계약과 변경사항을 먼저 비교합니다. 이 후보로 개발자의 진행 작업을 덮어쓰지 않습니다.
2. 결과 서비스가 보낸 원본 `assessmentId`, `subjectId`, `profileVersion`, `educationStage`, `scoreSystem`, 4축의 값·단위·공식 수준, `supportOrder`, `strengthOrder`를 보존합니다.
3. 수신 UI `AssessmentPanel.tsx` → `insights.ts/installAssessment` → 기존 `official/adaptive/engine.ts/validateAssessment` → `enhancement/domain.ts/routeFor` 경로를 확인합니다.
4. 현재 로컬 입력은 합성 실행 공간의 ID로 정규화합니다. 이것은 **인증/소유자 검증이 아닙니다.** 운영 어댑터는 인증된 학생과 검사 소유권을 서버에서 확인하고 실제 ID·이력을 연결해야 합니다.
5. 81은 네 영역 상·중·하의 조합이며, 현재 설계는 5종 목표활동과 4종 강점 도움 조합입니다. 81개 독립 임상 해석표가 구현돼 있다고 설명하지 않습니다. 공식 유형 코드/해석표가 있다면 제공된 계약으로 별도 대조합니다.
6. 복수 약점 순서가 미확정이면 임의 점수순으로 채우지 않습니다. 활동률로 검사값·공식 수준을 변경하지 않습니다.
7. 상단에 결과지의 검사종류·검사일·네 영역 값·단위를 표시하되 미연결을 0점으로 표시하지 않습니다.
8. 공식 동기화, 인증 실패/403, 네트워크 끊김, 중복 저장/멱등성, 동시 편집 충돌, 재검 수신, 다른 학생 접근 차단을 실제 서버에서 검사합니다.

## 5. 저장·개인정보

- `nuvia:studio:v1:personal`과 `nuvia:studio:v1:review`는 별개입니다. 합성 검수로 개인 데이터를 덮어쓰지 마세요.
- 이전 `personal-monthly.html`과 Studio는 자동 동기화되지 않습니다. 빈 Studio에만 명시적 복사 경로가 있습니다.
- Studio 백업은 같은 workspace/student 계약을 검사합니다. 다른 브라우저/계정 이전 또는 기존 정식 플래너 백업과의 호환성을 보장하지 않습니다. 서버 기반 이관은 별도 구현·동의가 필요합니다.
- checksum은 손상 탐지이지 암호화·인증이 아닙니다. 백업은 평문이며 개인 기록을 GitHub에 올리면 안 됩니다.
- 회차·실행·카드·검사 출처 ID를 유지하고 월간 분모/목표 변경 이력을 보존합니다. 실행 시간은 일시정지를 제외한 참고값이지 집중력 측정이 아닙니다.
- 월간 수행률 구간: 100 / 70–99 / 50–69 / 0–49. 목표 없음·기록 부족은 0% 실패로 대체하지 않습니다. 다음 달 방식은 제안 후 본인 수락으로 반영합니다.
- 로드맵은 실제 기록의 근거와 본인 확인·선택 문장만 출력합니다. 개인 메모/생각 보관함 자동 공유 및 인지 향상률 추정 금지.

## 6. 운영 전 필수 후속 작업

1. **15개 언어 구현·검수:** 현재 4개 선택값만 있고 외국어 대부분 미번역. 안정 key/manifest, 원문 버전, 신규·변경 키 상태, 기존 번역 재사용, 문장/오류/aria/인쇄까지 리소스 분리. 임의 fallback을 완료로 계산하지 않기.
2. 언어 전환 시 현재 페이지·입력·실행 유지, `lang` query·기존 query/hash 보존, `html[lang]`·방향 일치. 현재 문서 lang은 ko 고정이고 내부 root만 바뀌는 상태입니다.
3. 15개 언어 전체에서 PC/태블릿/360px HOME→START→ACTIVITY→SAVE→RESULT→REPORT와 로드맵·월간·백업을 실제 검수. 긴 번역/RTL/크메르·태국 문자/인쇄 포함.
4. 서버 인증·검사 소유권·기기 동기화·권한별 공유/철회 통합 QA.
5. 실제 중·고생/성인 독립 사용성 검증. 합성 테스트는 사용 편의성과 한 달 효과 검증을 대신하지 않습니다.
6. 최종 사용자 승인 뒤에만 기존 제품으로 이식·배포합니다.
