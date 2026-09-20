# FeelGood / NUVIA 공통 i18n 아키텍처

버전 1.0 / 사용자 승인 및 충돌 해소: 2026-09-20. 우선순위는 현재 사용자 지시 → 루트 AGENTS.md → 프로그램 승인 규칙 → 기능 계약·동결 기준본 → 기존 구현이다.

## 목적과 경계

이 문서는 저장소 전체의 i18n 계약을 정의한다. 번역 문구 자체는 프로그램별 디렉터리에 유지한다. 공통화 대상은 locale 메타데이터, 선택·fallback 규칙, 번역 상태, 검증 방식이며, 기존 앱을 하나의 런타임이나 하나의 사전으로 강제 통합하지 않는다.

## 현재 기준선 (2026-09-20)

| 프로그램 | 형식 | 등록 언어 | 기준 언어 | 비고 |
|---|---|---:|---|---|
| `proposal` | `window.LANG` JS 사전 | 9 | `ko` | key 기반, 기존 앱 보존 |
| `proposal-v2` | manifest + `window.LANG` JS 사전 | 10 | `ko` | RTL/report locale 메타데이터 보유 |
| `teacher-guide` | JSON manifest + source-text map | 13 | `ko` | 외국어 pack은 AI draft; 안정 key로 점진 이행 |
| 독립 HTML/ZIP 배포본 | 혼합/미등록 | 미확정 | 대체로 `ko` | 프로그램 단위 조사 후 등록 |

`zh`와 `zh-CN` 같은 코드는 임의로 통일하지 않는다. HISTORY의 zh는 변형 미결정·reviewRequired이며 zh-CN/zh-TW로 자동 변환하지 않는다. fr 등록은 다른 프로그램 지원을 의미하지 않는다.

## 권장 디렉터리 계약

새 프로그램은 기술 스택에 맞춰 이름을 조정할 수 있지만 다음 역할을 갖춰야 한다.

```text
<program>/
  i18n/ 또는 locales/
    manifest.json          # 언어, 방향, 상태, 파일, 외부 연동 코드
    ko.json                # 기준 원문
    en.json ...            # 프로그램별 번역
  src/i18n/                # locale resolution, t(), Intl helpers
  tests/i18n.*             # key/placeholder/smoke tests
```

중앙 `i18n/programs.json`은 저장소의 지원 언어를 한 배열로 획일화하지 않는다. 대신 canonical locale catalog와 프로그램별 실제 지원 목록/파일 위치/예외를 관리한다.

## 런타임 계약

locale 결정 순서는 다음과 같다.

1. 명시적인 URL `lang` 값 (미지원 값도 선택 의도로 보존하고 오류 처리)
2. 로그인 사용자 또는 프로그램 저장 설정
3. `localStorage`/cookie의 기존 호환 값
4. 위 선택·저장 locale이 모두 없는 최초 진입에서만 프로그램 `defaultLocale`

번역 조회는 선택 locale의 완전한 pack만 허용한다. 언어가 미제공이면 LANGUAGE_NOT_PROVIDED, 필수 pack이 불완전하면 LOCALE_PACK_INCOMPLETE, 개별 필수 키 누락이면 TRANSLATION_KEY_MISSING 오류로 개발·QA를 실패시킨다. 화면 또는 프로그램 진입을 차단하며 개별 누락 키의 한국어 fallback, 키 이름·빈 문자열·다른 언어 대체를 모두 금지한다.

운영에서는 선택 언어로 준비된 최소 공통 안내 화면만 표시한다. 해당 언어의 안내도 없으면 언어 선택 화면으로 돌아간다. 기술 코드는 운영 사용자에게 직접 표시하지 않는다. 언어 오류는 입력·진행 기록·resultId를 삭제·초기화하지 않는다. 한국어는 사용자 선택·결과지·계정·저장 locale이 전혀 없는 최초 진입이고 서비스 기본 locale이 ko일 때만 기본 선택할 수 있다.

언어 제공 상태는 planned / blocked / release로 관리한다. 일반 사용자 선택 목록에는 release만 노출한다. 번역 작업 상태(draft / ai-draft / needs-review / reviewed 등)는 제공 상태와 별개이며 reviewed도 자동 출시가 아니다.

HTML을 포함하는 번역은 최소화한다. 허용 시 프로그램이 정의한 sanitizer/allowlist를 통과해야 하며 `<script>`, event handler, `javascript:` URL은 금지한다. 일반 문구는 `textContent`를 사용한다.

## key, placeholder, 상태

- key는 `domain.feature.element` 형태의 안정적인 의미 키를 권장한다. 예: `planner.timer.start`.
- 배열 순서나 화면 위치를 key의 의미로 사용하지 않는다.
- placeholder는 `{name}`, `{score}`처럼 이름을 사용한다. 언어마다 순서는 바꿀 수 있지만 이름 집합은 같아야 한다.
- 기준 원문 변경 시 locale pack의 `sourceVersion` 또는 `sourceHash`가 달라져야 하며, 검수 전 상태는 `needs-review`다.
- 번역 작업 상태는 `ready`, `reviewed`, `needs-review`, `draft`, `ai-draft` 등으로 추적한다. 일반 사용자에게는 release만 제공하며 초안 검토는 별도 QA 경로로 분리한다.

## QA 출력과 실패 기준

`node scripts/check-i18n.mjs`는 등록 프로그램마다 다음을 출력한다.

```text
Program | Language | Total | Translated | Missing | Orphan | Empty | Fallback | Errors | Coverage
```

다음은 오류로 처리한다: manifest/locale 파일 누락, 중복 locale, 기준 key 누락, 빈 번역, placeholder 불일치, 위험한 HTML, 잘못된 locale metadata, 프로그램이 요구하는 source hash 불일치. 한국어 잔존과 orphan key는 정확한 예외 판정이 필요하므로 기본적으로 경고하고, 신규 코드의 직접 하드코딩은 `--changed --strict-hardcoded`에서 오류로 처리한다.

## 점진적 마이그레이션

1. 프로그램을 중앙 레지스트리에 `audit`로 등록한다.
2. 언어/파일/선택/fallback/URL/TTS/이미지/리포트 연동을 조사한다.
3. 사용자 노출 문구를 안정 key로 이동하고 한국어 기준 pack을 만든다.
4. 기존 locale code와 저장값을 alias로 보존한다.
5. validator를 `strict`로 전환한다.
6. PC/모바일 핵심 경로와 PDF/인쇄를 검증한다.

레거시 전체를 한 번에 변환하지 않는다. ZIP과 배포용 단일 HTML은 원본을 보존하고, 소스 프로그램에서 재생성 가능한 경로를 먼저 확보한다.

## 검사 데이터 계약

중앙 policy는 모든 프로그램에 적용한다. 기존 프로그램의 fallbackLocale은 보존된 레거시 위반 설정이지 허용 예외가 아니다. 검사기는 이를 오류로 보고하되 다른 프로그램을 자동 수정하지 않는다.

프로그램 languages 항목은 code, availability, 선택적 pack/requiredKeys, review.rtl 및 review.font를 사용한다. release pack은 필수 키·placeholder·검수 증거를 모두 갖춰야 한다. review는 status=reviewed와 evidence가 있어야 하며 미검수 값을 만들어 넣지 않는다. selectableLocales에는 release만 허용한다.

screenBundles에는 locale과 messages(키 → {text, locale})를 기록한다. 이는 문장의 의미/언어를 추측하는 AI 검사가 아니라 문자열 출처 검사다. 서로 다른 locale 출처 또는 현재 locale과 다른 출처를 오류로 처리한다. 레거시에 출처 데이터가 없으면 미검증 경고이며 혼입 검수 통과가 아니다.

등록만 한 외부 구현은 format=registered-external로 표시한다. pack 경로·검수 증거가 없으면 release 검증 오류를 유지한다. HISTORY ko의 사용자 지정 release 등록은 새 연간 실행본의 번역·RTL·폰트 검수를 완료했다는 뜻이 아니다.

node scripts/check-i18n.mjs --self-test는 금지 fallback, 혼합 출처, release 누락·placeholder·RTL/폰트, 미지원/비release 선택 노출을 합성 fixture로 검사한다. --json은 감사 결과를 구조화하며 --program=ID는 범위를 선택한다. 전체 검사는 기존 부적합도 실패로 보고한다.
