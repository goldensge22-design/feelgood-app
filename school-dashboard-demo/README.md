# School Dashboard Demo

세 데모는 첨부된 독립형 원본 HTML 전체를 유지하고, `full-dashboard-shell.js`, `full-dashboard-shell.css`와 안정 key 기반 locale pack으로 공통 상단 탐색·언어 선택을 추가한다. 기존 `app.js`, `styles.css`는 초기 축약 시안 보존본이며 현재 세 HTML에서는 불러오지 않는다.

- `homeroom.html`: 12개 섹션의 담임용 우리 반 성장·상담 화면
- `school.html`: 학교 전체 역할에 맞춘 10개 섹션의 학급 비교·지원 현황·반 편성 화면. 학부모 상담 카드, 우리 반 수업 전략, 짝·모둠 편성은 제외한다.
- `track.html`: 학과 내부 학생 비교와 학생별 추천 직무·진로군 Top 5에 집중한 10개 섹션 화면. 학생별 진로 상담 질문, 자기소개서 경험 정리 구조와 브라우저 로컬 상담 기록을 제공한다. 전체 계열 비교는 학과 학생 비교로 교체하고, 기존 상담 카드, 짝·모둠 편성, 계열 맞춤 지도 전략, 고교학점제 추천 선택과목과 생기부 활동 아이디어는 제외한다.

세 화면 모두 사용자용 목차에서 판정 기준과 데이터 불러오기를 제외한다. 첨부 원본의 계산식, 예시 데이터, 표, 필터, 조치 상태, 반 편성과 인쇄 기능은 유지한다. `scripts/verify-original-content.mjs`는 승인된 섹션 계약 및 핵심 기능 보존을 검사한다.

## Locale

지원 locale은 `ko`, `en`, `ja`, `zh-CN`, `zh-TW`, `es`, `fr`, `ru`, `vi`, `th`, `ar`, `it`, `az`, `mn`, `km`이다. 한국어는 source locale이며 외국어는 `ai-draft` 상태다. 상태와 source hash는 locale resource와 QA에서만 관리하며 일반 사용자 DOM과 인쇄물에는 노출하지 않는다.

locale 결정 순서는 URL `lang` → 저장 locale → 브라우저 locale → `ko`다. 언어 전환은 현재 페이지, 선택 학생·학급·계열, 상담 메모와 조치 상태를 유지한 채 resource 로딩 완료 후 한 번에 적용한다. 중국 본토는 `zh-CN`, 대만은 `zh-TW`로 분리한다.

세 대시보드에서 실제로 렌더링되는 고정 문구와 동적 문구를 모두 수집해 안정 key 또는 placeholder가 포함된 패턴 key로 관리한다. 각 locale pack은 516개 key를 가지며, 화면 제목·목차·표·그래프·필터·상태·알림·상담·인쇄 문구와 동적으로 생성되는 설명까지 변환한다. 한국어는 `ready`, 14개 외국어는 `ai-draft` 상태이므로 데모 확인에는 사용할 수 있지만 정식 API 연동·배포 전에 교육 용어와 자연스러움에 대한 사람 검수가 필요하다.

언어 선택기는 세 화면 모두 상단 고정 영역의 드롭다운으로 제공한다. 데스크톱에서는 왼쪽 목차가 스크롤을 따라가며, 좁은 화면에서는 콘텐츠를 가리지 않도록 상단 가로 스크롤 목차로 전환한다.

## Local preview

정적 서버의 루트를 이 디렉터리로 지정한 뒤 각 HTML을 연다. `file://`로 직접 열면 브라우저의 JSON fetch 제한으로 locale pack을 불러오지 못할 수 있다.

## QA

```text
node school-dashboard-demo/scripts/collect-dom-i18n.mjs
node school-dashboard-demo/scripts/translate-dom-i18n.mjs
node school-dashboard-demo/scripts/build-locales.mjs
node school-dashboard-demo/scripts/verify-original-content.mjs
node school-dashboard-demo/scripts/verify-browser-i18n.mjs
node scripts/check-i18n.mjs
node scripts/check-i18n.mjs --changed --strict-hardcoded
```

`translate-dom-i18n.mjs`는 개발 단계에서 승인된 경우에만 실행하며, 정규화한 고정 UI 원문만 번역 서비스로 전송한다. 학생 식별자·상담 기록·API 데이터는 전송하지 않는다. 브라우저 QA는 `QA_VIEWPORT=360x800`, `768x1024`, `1280x900`으로 실행했으며 세 크기에서 3개 화면 × 15개 locale 조합이 모두 통과했다. 정식 배포 전 외국어 pack의 사람 검수와 대상 기기의 실제 폰트 렌더링 QA가 필요하다.
