# FeelGood / NUVIA MASTER DEVELOPMENT RULES

이 파일은 저장소 전체에 적용되는 최상위 개발 규칙이다. 프로그램별로 더 구체적이고 검증된 규칙이 있으면 해당 범위에서는 구체 규칙을 우선한다. 우선순위는 `MASTER → PROGRAM → FEATURE → CURRENT TASK`이며, 현재 요청을 이유로 범위 밖 프로그램 전체를 일괄 리팩터링하지 않는다.

## 모든 작업의 기본 원칙

별도 요청이 없어도 다국어, PC/태블릿/모바일 반응형, 기존 정상 기능, 결과지·외부 데이터 계약, 연령별 콘텐츠, FeelGood UI/UX, QA, Git·배포본 보호를 완료 조건으로 취급한다. 구조를 모르면 추측하지 말고 기존 코드·컴포넌트·번역·API·adapter·design token·연령 규칙을 먼저 검색한다.

작업 시작 전에 현재 branch, HEAD, uncommitted/untracked 파일, remote를 확인한다. 사용자 지시 없이 main 덮어쓰기, branch 삭제, history 변경, force push, 다른 작업자의 변경 삭제, 공개 URL 교체를 하지 않는다. 기존 작업 트리가 dirty이면 관련 변경을 보존하고 최소 범위만 수정한다.

## 다국어(i18n)는 기본 아키텍처다

모든 사용자 노출 기능은 처음부터 다국어 대응 구조로 개발한다. 새 UI, 기능, 문구, 결과지, 리포트, 활동, 게임, 교사/관리자 화면을 추가하거나 기존 기능을 수정할 때 별도 요청이 없어도 i18n 영향을 검사한다.

- 사용자에게 보이는 문자열을 화면/비즈니스 로직에 직접 하드코딩하지 않는다. 프로그램별 locale/resource에서 안정적인 translation key로 관리한다.
- 공통 엔진과 정책은 공유하되 프로그램별 번역 데이터는 독립적으로 유지한다. 하나의 거대한 번역 파일로 합치지 않는다.
- 새 key는 한국어 원문과 함께 등록하고 모든 지원 언어에서 존재 여부를 확인한다. 번역이 준비되지 않은 언어는 빈 값 대신 명시적인 상태(`draft` 또는 `needs-review`)로 추적한다.
- 한국어 원문이 의미 있게 바뀌면 다른 언어 번역을 자동으로 유효하다고 간주하지 않는다. 영향받는 번역을 `needs-review`로 전환하거나 source version/hash를 갱신한다.
- **MUST:** 한국어 원문 또는 translation key의 의미가 변경되지 않았다면 기존 다른 언어 번역을 재생성·재번역·덮어쓰기하지 않는다. 번역 작업은 신규 key와 실제로 의미가 변경된 key만 대상으로 하며, 전체 locale 파일이나 전체 번역값을 AI로 다시 생성하지 않는다. 기존 검수 완료 번역을 최대한 보존한다.
- 가능한 프로그램은 source version/hash로 의미 변경을 추적한다. `UNCHANGED`는 기존 번역 유지, `NEW`는 전체 지원 언어 번역, `CHANGED`는 기존 번역을 `needs-review`, `DELETED`는 즉시 삭제하지 않고 orphan/deprecated 여부 검토가 원칙이다. formatting이나 key 순서만 바뀐 경우는 `UNCHANGED`로 취급한다.
- 새 translation key를 만들기 전에 기존 locale/resource에서 동일하거나 실질적으로 같은 의미의 key를 반드시 검색한다. 있으면 재사용하고, 없을 때만 새 key를 만든다. `다음`, `이전`, `저장`, `취소`, `확인`, `닫기`, `시작`, `다시하기`, `계속하기`, `결과 보기` 같은 공통 UI 의미는 가능한 경우 `common.*` 형태의 안정 key를 재사용하며 프로그램 이름만 다른 중복 key를 만들지 않는다. 문맥이나 번역 의미가 실제로 다르면 억지로 합치지 않는다.
- 선택 언어에 값이 없으면 프로그램의 fallback locale(기본 `ko`)을 표시한다. key 자체나 빈 화면을 사용자에게 노출하지 않고 개발/QA 로그에 누락을 기록한다.
- fallback은 빈 화면을 막는 runtime safety일 뿐 번역 완료가 아니다. fallback으로 표시된 key는 coverage에 번역 완료로 계산하지 않고 validator에서 오류 또는 명시적 미완료 상태로 유지한다.
- 문자열 연결로 문장을 만들지 않는다. 이름·점수·날짜 같은 동적 값은 명명 placeholder를 사용하고 모든 언어의 placeholder 집합을 원문과 일치시킨다.
- 숫자, 날짜, 시간, 단위, 복수형은 `Intl` 또는 프레임워크의 locale 기능을 사용한다.
- 접근성 텍스트(`aria-label`, `alt`, `title`, `placeholder`), 오류/알림, 그래프 라벨, PDF/인쇄 문구도 번역 대상이다.
- 이미지 안에 언어 의존 텍스트를 넣지 않는다. 불가피하면 locale별 asset mapping과 fallback을 제공한다.
- TTS가 있는 프로그램은 text key, locale, voice, asset, source version을 연결해 원문 변경 시 재생성 대상을 추적한다.
- 레이아웃은 긴 번역, RTL, 모바일/데스크톱, 인쇄/PDF에서 확인한다. 고정 높이와 잘림을 피하고 flexible layout을 우선한다.

### 최종 사용자 화면 정리

번역 상태, AI 생성 여부, 검수·개발·QA·디버그 상태, `sourceHash`, build ID 같은 운영 메타데이터는 내부 resource와 QA 보고서에서 관리하며 일반 사용자 화면이나 인쇄물에 노출하지 않는다. 초안 상태를 숨기려고 `ready`로 승격해서도 안 된다. 관리자·QA 확인이 필요하면 명시적으로 진입한 전용 모드에서만 DOM을 생성하고 일반 모드에서는 CSS로 가리는 대신 요소 자체를 만들지 않는다. 최종 QA는 내부 문구와 빈 배너·여백을 실제 사용자 DOM과 인쇄 결과에서 탐지한다. 단, 검사 해석의 한계, 추가 평가 기준, 개인정보·결과 공유 범위, 법적 고지처럼 사용자 보호에 필요한 안내는 유지한다. 이 원칙은 FeelGood 전자책·제안서·결과지·NUVIA 프로그램의 최종 사용자 화면에 공통 적용하며 상세 기준은 `docs/i18n/README.md`를 따른다.

## 구현 전 확인과 완료 조건

기존 프로그램을 수정하기 전에 해당 프로그램의 locale manifest, 언어 선택/저장/URL 처리, fallback, 번역 상태, 이미지/TTS, 결과지 연동을 확인한다. 정상 배포본이나 기존 locale code를 임의로 삭제·변경하지 않는다.

언어 변경은 새 세션 시작이 아니다. 가능한 한 current route/page/chapter, selected tab/activity/answers, form input, game progress, timer state, result/report context, user/session identifier를 그대로 유지한다. locale 변경을 이유로 `localStorage`, `sessionStorage`, activity progress, answers, profile, PASS/report data, timer를 초기화하지 않는다. 기술상 reload가 필요하면 변경 전 상태를 저장하고 동일 위치와 진행 상태로 복원한다.

URL의 `lang` parameter를 바꿀 때 기존 path, 다른 query parameter, hash를 보존한다. 예를 들어 `/history/week12?age=elementary&lang=ko`는 영어 전환 후 `/history/week12?age=elementary&lang=en`을 유지해야 하며 HOME으로 이동하거나 `age`를 삭제해서는 안 된다.

기능 완료 전 다음을 수행한다.

1. `node scripts/check-i18n.mjs`로 등록된 프로그램의 key, 빈 값, placeholder, locale, HTML 안전성, source hash/상태를 검사한다.
2. 사용자 노출 UI를 바꿨다면 `node scripts/check-i18n.mjs --changed --strict-hardcoded`로 새 하드코딩 후보를 확인한다. 오탐은 코드에 문자열을 남기는 방식이 아니라 locale resource로 이동해 해소하는 것을 우선한다.
3. 영향받는 모든 지원 언어에서 HOME → START → ACTIVITY → RESULT → REPORT 및 해당 프로그램 핵심 경로를 PC와 모바일로 스모크 테스트한다.
4. 언어별 버튼/카드/제목/메뉴/표/그래프/툴팁/모달/PDF의 잘림과 줄바꿈을 확인한다.

## 반응형과 가독성

- 신규/수정 UI는 Desktop, Laptop, Tablet, Mobile 및 필요한 세로/가로 방향에서 검증한다.
- flex, grid, min/max, `clamp()`, 상대 단위, 명시적 breakpoint를 우선하고 고정 좌표·고정 높이에 과도하게 의존하지 않는다.
- 제목/본문 hierarchy, 충분한 글자 크기, 버튼 hit area, 표·차트·모달·입력·게임 UI overflow를 확인한다. 긴 번역도 동일 QA에 포함한다.
- 한국어는 기존 제품 방향에 맞춰 Pretendard/MaruBuri를 우선 고려하되, 다른 언어에는 문자권별 가독성 좋은 fallback font stack을 제공한다.

### 다국어 반응형 레이아웃

1. 모든 사용자 화면은 번역문이 한국어보다 길거나 짧아질 수 있다는 전제로 설계한다.
2. 한국어 화면에 맞춘 고정 너비·고정 높이 박스에 다른 언어를 억지로 넣지 않는다.
3. 제목·본문·버튼·탭·카드·라벨은 언어별 문장 길이에 따라 줄바꿈, 높이, 간격과 배치가 자연스럽게 조정되어야 한다.
4. 핵심 제목·본문·버튼 문구는 `overflow:hidden`, 강제 말줄임표 또는 `line-clamp`로 내용을 숨기지 않는다.
5. 번역문을 디자인에 맞추기 위해 임의로 삭제하거나 의미를 축소하지 않는다. 먼저 레이아웃을 조정하고, 번역을 줄여야 할 때는 의미가 유지되는 자연스러운 현지어 표현으로 별도 검수한다.
6. 텍스트 컨테이너는 가능한 경우 콘텐츠에 따라 높이가 늘어나게 한다.
7. Grid와 Flex의 텍스트 자식에는 `min-width:0`을 적용하고 필요한 곳에 적절한 줄바꿈을 허용한다.
8. 긴 단어와 복합어에는 언어 특성에 맞는 `overflow-wrap`, `word-break`, `hyphens`를 적용한다.
9. 버튼은 전체 문구를 읽을 수 있는 최소 높이를 사용하고 필요한 경우 두 줄 표시를 허용한다.
10. 제목 글자 크기는 `clamp()` 같은 반응형 방식을 사용하되 가독성 기준 이하로 지나치게 축소하지 않는다.
11. 글자를 무조건 작게 만들지 않는다. 줄바꿈 → 컨테이너 확장 → 열 비율 변경 → 배치 전환 → 제한적 글자 크기 조정 순서로 해결한다.
12. `html[lang]`, `:lang()` 또는 기존 locale class를 이용해 꼭 필요한 언어별 조정을 적용할 수 있게 한다.
13. 아랍어 등 RTL 언어는 방향, 정렬, 아이콘, 여백과 열 배치를 별도로 검증한다.
14. 크메르어·태국어처럼 줄바꿈과 글꼴 렌더링 특성이 다른 언어는 실제 브라우저에서 확인한다.
15. 다국어 QA는 번역 key뿐 아니라 실제 화면의 잘림·겹침·개별 요소 overflow까지 검사한다. 의도된 문서 세로 스크롤은 오류로 보지 않는다.
16. 신규 문장 추가나 번역 변경 뒤에는 지원 언어 전체에서 해당 컴포넌트의 화면 적합성을 다시 검사한다.
17. 특정 언어를 수정하면서 다른 언어의 기존 레이아웃을 깨뜨리면 완료로 판정하지 않는다.
18. 이 규칙은 전자책·제안서·결과지·대시보드·NUVIA 프로그램을 포함한 저장소의 모든 최종 사용자 화면에 기본 적용한다.

## 기존 기능과 외부 연동 보호

수정 전 route, query parameter, API, localStorage/cookie, 사용자 흐름, locale 처리, 결과지 링크와 데이터 구조를 확인한다. 검증되지 않은 전체 rewrite, 정상 기능/route/key 삭제, 사용자 데이터 초기화, 연동값 변경을 하지 않는다.

결과 데이터는 가능한 `UI → adapter → normalized data → report/API data`로 분리한다. mock은 production adapter와 명확히 구분한다. 사용하지 않는 것처럼 보여도 외부 계약의 Planning, Attention, Simultaneous, Sequential, IQ, 인지특성, 81유형, 연령/교육단계, result/user/test ID 및 기타 필드를 임의 삭제·개명하지 않는다.

## 연령 및 PASS 개인화

- 5–7세: 그림·음성 중심, 최소 문장/정보/텍스트 입력.
- 초등 저학년: 그림과 짧은 문장, 직관적 선택, 단순 단계.
- 초등 중·고학년: 이유 연결, 비교, 선택, 짧은 근거.
- 중학생: 근거 판단, 전략 비교, 선택 이유와 자기 설명.
- 고등학생: 분석·계획·비판적 사고·자기주도 입력.
- 대학생/성인: 실제 상황 전이, 메타인지, 실행 계획과 자발적 입력.

연령 적응은 글자 크기만 바꾸는 작업이 아니다. 정보량, 어휘, 문제·선택지, 인지 부담, 힌트, 입력, 피드백, 시각 정보, 자율성을 함께 조정한다. 프로그램별 확정 규칙이 있으면 이를 우선한다.

PASS 개인화는 문구만 바꾸지 않는다. 검증된 규칙 범위에서 활동 방식, 힌트, 정보 제시, 단계, 지원량, 피드백, UI emphasis가 달라져야 한다. 강점은 약한 영역을 지원하는 데 활용하고 복수 약점을 무시하지 않는다. 임의의 심리·임상 판단 로직은 추가하지 않는다.

## FeelGood UI/UX

제품별 개성은 유지하면서 Modern, Clean, Professional, EdTech, 높은 가독성과 낮은 시각적 혼잡도를 지향한다. Orange, Blue/Blue-purple, Deep Navy와 절제된 pastel을 활용하고 과도한 neon/gloss를 피한다. 2.5D는 layered cards, soft depth, subtle shadow, restrained gradient와 명확한 hierarchy로 표현한다.

메뉴/목차 클릭은 실제 콘텐츠 전환, active state, 올바른 scroll/focus로 이어져야 한다. 색상만 바뀌고 내용이 그대로인 탐색 UI를 만들지 않는다.

## QA와 심각도

QA는 개발의 일부다. 변경 범위에 맞춰 다음을 확인한다.

- Functional: 버튼, 링크, navigation, 입력, 저장/복원, 결과, route, query parameter.
- i18n: key, 빈 값, fallback, placeholder, 한국어 잔존, 언어 변경.
- Responsive/Visual: desktop/tablet/mobile, 겹침, 잘림, overflow, 이미지 왜곡, modal/navigation.
- Integration: report input, PASS/age/profile data, mock/production 분리.
- Regression: 프로그램의 핵심 경로. 기본 참조는 `HOME → START → ACTIVITY → SAVE → RESULT → REPORT`.

심각도는 `P0 실행 불가·데이터 손실·핵심 결과 오류`, `P1 핵심 기능 오류`, `P2 주요 UI/i18n/반응형 오류`, `P3 경미한 디자인/문구 오류`로 기록한다. P0/P1이 남으면 완료로 보고하지 않는다.

## 기준선과 배포 보호

중요 프로그램은 branch, commit, date, status를 기준선 문서에 기록한다. Local, Staging/Preview, Production을 구분하며 로컬 성공을 배포 성공으로 간주하지 않는다. 사용자 승인 없이 기존 GitHub Pages/서비스 URL이나 정상 배포본을 교체하지 않는다.

상세 i18n 계약과 프로그램별 현황은 `docs/i18n/README.md`, 중앙 locale 레지스트리는 `i18n/programs.json`, 현재 Git 기준선과 QA 절차는 `docs/DEVELOPMENT_BASELINE.md`를 따른다.

정책과 자동화 범위를 구분한다. MASTER POLICY는 저장소 전체에 적용되지만 AUTOMATED STATIC QA는 `i18n/programs.json`에 등록된 프로그램만, PROGRAM BROWSER QA는 실제 browser QA가 구현된 프로그램만 검사한다. 현재 미등록 프로그램을 이 규칙 추가만을 이유로 일괄 수정하거나 추측한 경로로 등록하지 않는다.
