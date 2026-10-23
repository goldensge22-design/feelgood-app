# NUVIA PLANNER 라이브러리 연결 패치 인계

## 적용 범위와 판정

이 패치는 직무·진로 라이브러리 카드를 기존 Studio의 과제, 실행, 개인 기록, 백업 및 로드맵에 연결한다. 새 플래너나 별도 타이머를 만들지 않는다. 카드 콘텐츠가 전문 검토 전이므로 **분리된 한국어 검토 모드에서만 연결을 허용**한다. 일반 사용자와 외부 공개 데모에는 미승인 카드를 제공하지 않는다. 실제 결과지 서버 연결과 다국어 카드 출시까지 완료한 패치가 아니다.

- 저장소: `goldensge22-design/feelgood-app`
- 패치 브랜치: `codex/nuvia-planner-library-integration`
- 개발 기준: `07414f18197082b4249f0d252a2e75fb99c61a81`
- 라이브러리 원본: `codex/feelgood-common-master-rules`의 `9cb4ef7e0a294b035713b36db956144837fc8741`
- 결과지 목록 출처 버전: `35a3216e980bd4dd0c0391e5c6790508bb9e72f7`
- 소스 작업 폴더: `nuvia-planner/studio-daily-note-demo/`
- 앱 폴더: 위 폴더의 `artifacts/nuvia-ui-review/`
- 진입점: `studio.html?review=1` → 더보기 → 진로·일상 연습
- `main`, 기존 공개 URL, 정식 `nuvia-planner/demo/NUVIA_PLANNER_2_5D.html`, D-CAS·결과지·구형 BrainMap 파일은 변경하지 않는다.

## 연결된 기능

1. 중·고등학생은 청소년 진로 26개, 대학생·성인은 성인 직무 ID 311개를 검토할 수 있다. 이는 검사 추천 TOP5를 새로 산출하는 기능이 아니다.
2. 각 목록에는 상황 카드 3개와 연결 일상 카드 3개가 제시된다. 337개 목록 × 6개 연결 = 2,022개 연결이며, 원본 카드는 공유한다. 저장 원본은 일상 18개, 성인 공통 상황 60개, 청소년 학교 상황 78개, 보존된 기존 직무 사례 6개로 총 162개다. 기존 사례 6개는 새 337개 매핑에 임의 연결하지 않는다.
3. 시작하지 않은 기존 과제에 연결하거나, 기존 할 일 작성 폼에서 제목·시간·영역을 정해 새 과제와 한 번에 연결한다. 카드 내용을 실제 사용자 제목으로 몰래 복사하지 않는다. 연결만으로 타이머나 수행률이 올라가지 않는다.
4. 기존 작업대로 옮겨 시작·멈춤·복귀·종료한다. 연습 질문에 대한 개인 응답은 별도 저장하고, 실행 종료 후 사용자가 직접 해본 행동임을 확인한다. 과제 완료 여부와 연습 자기보고를 분리한다. 응답 수정 시 이전 확인을 해제하고 수정 이력을 보존한다.
5. 개인 백업에 카드 ID·버전·연결·응답·수정 이력·확인 실행 ID가 함께 저장된다. 손상된 연결이나 다른 workspace의 복원은 거절한다. 오래된 백업에 새 필드가 없어도 기존 기능을 유지한다.
6. 리포트 화면에는 개인 연습 기록을 별도 표시한다. 기존 월간 PASS 수행률 산식을 바꾸거나 연습 응답을 자동 수행 근거로 넣지 않는다. 기존 리포트 HTML 파일에는 이 별도 요약을 아직 포함하지 않는다.
7. 로드맵 원본과 선택 문장 내보내기에는 가상 상황 / 일상 연습 맥락을 유지한다. 가상 직무 연습을 실제 직무 경험으로 바꾸지 않는다. 질문 응답은 자소서·교사·공용 라이브러리에 자동 전송하지 않는다.

## 파일과 데이터 계약

아래 경로는 앱 폴더 기준이다.

| 파일 | 역할 |
| --- | --- |
| `src/planner-library/catalog/` | 공통 라이브러리의 고정 스냅샷. 이 사본에서 원본을 따로 편집하지 않는다. |
| `src/planner-library/domain.ts` | 버전·대상·모드·언어 검사, 선택, 연결, 응답 저장, 자기보고 확인, 복원 검증 |
| `src/planner-library/model.ts` | optional `studio.libraryAttachments`, `library.*` 명령 계약 |
| `src/planner-library/LibraryUI.tsx` | 라이브러리 화면, 과제 안의 질문, 리포트 요약, 가상 상황 표시 |
| `src/planner-library/resources.json` | 신규 UI 25개 key × 15개 언어. 기존 Studio 번역은 변경하지 않음 |
| `src/planner-library/translation-status.json` | 원문 해시, 번역 상태, 카드 출시 비활성화 기록 |
| `src/studio/studio-logic.ts` | 기존 과제 생성과 연결의 원자적 처리. 중복 requestId 재시도 시 중복 생성 방지 |
| `src/studio/persistence.ts` | 기존 백업·복원에 추가 연결 검증 적용 |
| `src/studio/roadmap.ts` | `practiceContext` 보존 및 선택 문장 내보내기 표기 |

`libraryAttachments`는 과제 ID를 키로 사용한다. `catalogCommit`, `templateVersion`, `bindingId`, `templateId`를 함께 보존한다. 카탈로그가 업데이트되어도 기존 기록의 참조 버전을 지우지 말고, 이전 스냅샷을 유지하거나 명시적 migration을 제공해야 한다. 현재 버전은 고정된 스냅샷만 읽는다.

## 결과지 서버에 붙이는 순서

1. 개발자의 최신 결과지 연동 브랜치에서 이 패치와 기준 커밋을 비교한다. `official`, `before`, `previous` 등 비교용 사본으로 정식 제품을 덮어쓰지 않는다.
2. 인증된 결과 adapter가 제공하는 대상과 직무 ID를 사용한다. `lookupBinding(population, sourceId, sourceVersion)`은 고정 버전·정확한 ID만 허용한다. 이름 유사도 매칭, 순위 재계산, PASS 점수 재해석을 하지 않는다. 청소년 ID는 원본 label snapshot에 연결된 내부 ID이며 공식 직업 코드가 아니다.
3. 현재 UI의 전체 직무 선택기는 QA 비교용이다. 실제 사용 화면에서는 서버가 허용한 결과 목록만 제공하고 학생이 선택하도록 한다. 이 연결은 아직 구현되지 않았다.
4. 출시 전 원본 공통 라이브러리의 검토자·도메인 검토·문구·번역·안전 분야 근거·유효기간 조건을 충족시킨다. `review=true`나 클라이언트 JSON의 승인 플래그를 운영 권한으로 사용하지 않는다. 현재 카드는 전부 draft이고 정식 제공 수는 0개다.
5. 개인정보는 학생 소유 workspace에 저장한다. 서버에서는 인증·학생 소유권·수정 충돌·버전·멱등성 검증을 추가한다. 현재는 localStorage이며 검토/개인/외부 데모를 분리하지만 보안 서버가 아니다.
6. 사용자 작성 내용을 공용 템플릿으로 활용하려면 별도 동의 → 비식별화 → 관리자 검토 → 승인본 저장을 구현한다. 현재 패치는 자동 수집·공유나 AI 요청을 하지 않는다.
7. 기존 PASS adapter와 연령별 과제 작성 도움은 유지한다. 라이브러리 행동 6종을 PASS 4영역과 일대일로 대응시키거나, 문장 작성만으로 월간 수행률을 올리지 않는다. 반복으로 새로 생성된 과제에 이전 자기보고를 복사하지 않는다.

## QA와 재실행

검증 결과와 화면은 `../studio-daily-note-demo/handoff/library-integration-qa/`에 보관한다. 작업 디렉터리는 `nuvia-planner/studio-daily-note-demo`다.

```powershell
pnpm --filter @workspace/nuvia-ui-review typecheck
node tools/nuvia-studio/run-library-check.mjs
node tools/nuvia-studio/run-core.mjs --i18n
node tools/nuvia-studio/run-career-review-check.mjs
node tools/nuvia-studio/run-daily-note-check.mjs
node tools/nuvia-studio/run-external-demo-check.mjs
node tools/nuvia-studio/validate-i18n.mjs
node artifacts/nuvia-ui-review/src/planner-library/catalog/validate.mjs
node artifacts/nuvia-ui-review/src/planner-library/catalog/expansion/validate.mjs
$env:PORT='4190'
$env:BASE_PATH='/'
pnpm --filter @workspace/nuvia-ui-review build
node artifacts/nuvia-ui-review/scripts/qa-library.mjs
node artifacts/nuvia-ui-review/scripts/qa-studio-languages.mjs
```

브라우저 스크립트는 생성된 정적 빌드를 격리된 `planner.test` 테스트 origin으로 제공하며 실제 서비스·사용자 저장소를 변경하지 않는다. 환경별 `PLAYWRIGHT_MODULE`과 `CHROME_PATH`를 설정할 수 있다. 새 라이브러리 테스트 전에 `run-library-check.mjs`로 합성 fixture를 생성한다.

검토 UI를 직접 실행하려면 앱 폴더에서 위 환경변수를 설정하고 `pnpm exec vite --host 127.0.0.1 --port 4190`을 실행한다. `http://127.0.0.1:4190/studio.html?review=1`에서 더보기의 진로·일상 연습으로 이동한다. 이 주소는 서버가 실행 중인 로컬 컴퓨터에서만 열리며 공개 데모 링크가 아니다.

## 수동 인수 체크

- 검토 공간에서 중학생·고등학생·대학/성인을 각각 선택하고 목록 대상과 기존 입력 도움을 확인한다.
- 일상/가상 상황 선택 → 새 할 일 생성 → 작업대 배치 → 질문 응답 저장 → 시작 → 중단 → 깃발 → 재개 → 종료 → 행동 자기보고 확인을 진행한다.
- 미완료로 종료해도 자동 완료되지 않는지, 자기보고를 남겨도 PASS 수행률이 자동으로 오르지 않는지 확인한다.
- 질문 응답 수정 시 확인 해제와 이전 이력이 남는지 확인한다.
- 백업 파일을 실제로 다운로드하고 같은 workspace에서 복원한다. 다른 workspace·손상 JSON·끊긴 template/run 참조는 거절되어야 한다.
- 로드맵의 가상 상황 표기와 선택 문장 내보내기 표기를 확인한다. 메모 원문은 사용자가 선택하지 않으면 외부로 나가면 안 된다.
- 일반 모드와 14개 외국어 선택 상태에 미승인 한국어 카드가 나타나지 않아야 한다. UI 안내·언어 선택·입력 상태는 유지되어야 한다.

## 출시 전 남은 조건

- 카드 내용의 교육·직무 전문 검토와 14개 외국어 카드 번역. 신규 UI 번역도 모어 화자 검토 전이다. **15언어 UI 기술 검증은 카드 전문의 15언어 완역을 뜻하지 않는다.**
- 실제 결과지 TOP5 수신, 서버 인증·저장·공유 권한, 공용 라이브러리 제출/심사, AI 미등록 카드 생성은 이번 패치에 포함하지 않았다.
- 실제 iOS/Android·Safari·저사양 기기, 배포 환경의 파일 다운로드와 서버 통합 QA는 별도 필요하다. 빌드의 대형 chunk 경고는 남아 있다.
- 공개 데모 배포 및 정식 플래너 적용은 이 브랜치 저장과 별도의 승인 단계다.
