# FeelGood / NUVIA MASTER DEVELOPMENT RULES

이 파일은 저장소 전체에 적용되는 공통 MASTER RULE이다. 버전: 1.0 / 사용자 승인 기준일: 2026-09-20.

프로젝트 내부 적용 우선순위는 다음과 같다.
1. 현재 사용자의 명시적 지시
2. 루트 AGENTS.md의 공통 MASTER RULE
3. 프로그램별 AGENTS.md와 승인된 프로그램 마스터
4. 기능별 계약과 동결 기준본
5. 현재 코드의 기존 구현

하위 규칙은 상위 규칙을 약화하거나 반대로 적용할 수 없다. 프로그램별 규칙은 구체 내용을 추가할 수 있으나 조용한 번역 fallback 금지, 기존 기능·사용자 기록·결과지 연동 구조 보호, PC·모바일 반응형, 접근성, 공통 QA, Git 기준선 보호를 변경할 수 없다. 현재 요청을 이유로 범위 밖 프로그램을 일괄 리팩터링하지 않는다.

## 모든 작업의 기본 원칙

별도 요청이 없어도 다국어, PC/태블릿/모바일 반응형, 기존 정상 기능, 결과지·외부 데이터 계약, 연령별 콘텐츠, FeelGood UI/UX, QA, Git·배포본 보호를 완료 조건으로 취급한다. 구조를 모르면 추측하지 말고 기존 코드·컴포넌트·번역·API·adapter·design token·연령 규칙을 먼저 검색한다.

작업 시작 전에 현재 branch, HEAD, uncommitted/untracked 파일, remote를 확인한다. 사용자 지시 없이 main 덮어쓰기, branch 삭제, history 변경, force push, 다른 작업자의 변경 삭제, 공개 URL 교체를 하지 않는다. 기존 작업 트리가 dirty이면 관련 변경을 보존하고 최소 범위만 수정한다.

## 다국어(i18n)는 기본 아키텍처다

모든 사용자 노출 기능은 처음부터 다국어 대응 구조로 개발한다. 새 UI, 기능, 문구, 결과지, 리포트, 활동, 게임, 교사/관리자 화면을 추가하거나 기존 기능을 수정할 때 별도 요청이 없어도 i18n 영향을 검사한다.

- 사용자에게 보이는 문자열을 화면/비즈니스 로직에 직접 하드코딩하지 않는다. 프로그램별 locale/resource에서 안정적인 translation key로 관리한다.
- 공통 엔진과 정책은 공유하되 프로그램별 번역 데이터는 독립적으로 유지한다. 하나의 거대한 번역 파일로 합치지 않는다.
- 새 key는 한국어 원문과 함께 등록하고 모든 지원 언어에서 존재 여부를 확인한다. 번역이 준비되지 않은 언어는 빈 값 대신 명시적인 상태(`draft` 또는 `needs-review`)로 추적한다.
- 한국어 원문이 의미 있게 바뀌면 다른 언어 번역을 자동으로 유효하다고 간주하지 않는다. 영향받는 번역을 `needs-review`로 전환하거나 source version/hash를 갱신한다.
- 선택 locale의 필수 번역이 없거나 pack이 불완전하면 해당 화면/프로그램 진입을 차단한다. 개별 키·화면을 한국어 또는 다른 언어로 대체하지 않는다. 개발·QA에서는 LANGUAGE_NOT_PROVIDED, LOCALE_PACK_INCOMPLETE, TRANSLATION_KEY_MISSING 오류로 실패한다.
- 운영에서는 기술 코드를 노출하지 않고 선택한 언어의 사전 준비된 최소 공통 안내 화면을 사용한다. 그 안내조차 없으면 언어 선택 화면으로 돌아간다. 빈 문자열·키 이름·다른 언어 문장으로 대체하지 않는다.
- 한국어 기본 선택은 최초 진입에서 사용자 선택·결과지·계정·저장 locale이 모두 없고 서비스 defaultLocale이 ko인 경우에만 허용한다. 이미 선택된 다른 locale은 누락 때문에 바꾸지 않는다.
- 언어 오류·언어 변경으로 사용자 입력·진행·resultId를 삭제하거나 초기화하지 않는다. 제공 상태가 release인 언어만 일반 사용자 언어 목록에 노출한다. draft/검수 상태와 release 제공 상태는 구분한다.
- 문자열 연결로 문장을 만들지 않는다. 이름·점수·날짜 같은 동적 값은 명명 placeholder를 사용하고 모든 언어의 placeholder 집합을 원문과 일치시킨다.
- 숫자, 날짜, 시간, 단위, 복수형은 `Intl` 또는 프레임워크의 locale 기능을 사용한다.
- 접근성 텍스트(`aria-label`, `alt`, `title`, `placeholder`), 오류/알림, 그래프 라벨, PDF/인쇄 문구도 번역 대상이다.
- 이미지 안에 언어 의존 텍스트를 넣지 않는다. 불가피하면 locale별 asset mapping과 fallback을 제공한다.
- TTS가 있는 프로그램은 text key, locale, voice, asset, source version을 연결해 원문 변경 시 재생성 대상을 추적한다.
- 레이아웃은 긴 번역, RTL, 모바일/데스크톱, 인쇄/PDF에서 확인한다. 고정 높이와 잘림을 피하고 flexible layout을 우선한다.

## 구현 전 확인과 완료 조건

기존 프로그램을 수정하기 전에 해당 프로그램의 locale manifest, 언어 선택/저장/URL 처리, fallback, 번역 상태, 이미지/TTS, 결과지 연동을 확인한다. 정상 배포본이나 기존 locale code를 임의로 삭제·변경하지 않는다.

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

연령 적응은 글자 크기만 바꾸는 작업이 아니다. 정보량, 어휘, 문제·선택지, 인지 부담, 힌트, 입력, 피드백, 시각 정보, 자율성을 함께 조정한다. 프로그램별 확정 규칙은 상위 공통 원칙을 유지하면서 구체화한다.

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
