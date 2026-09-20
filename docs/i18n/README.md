# FeelGood / NUVIA 공통 i18n 아키텍처

## 목적과 경계

이 문서는 저장소 전체의 i18n 계약을 정의한다. 번역 문구 자체는 프로그램별 디렉터리에 유지한다. 공통화 대상은 locale 메타데이터, 선택·fallback 규칙, 번역 상태, 검증 방식이며, 기존 앱을 하나의 런타임이나 하나의 사전으로 강제 통합하지 않는다.

공통 영역의 역할은 다음과 같다.

- `docs/i18n/`: FeelGood 전체가 따르는 i18n 개발 계약과 등록 절차
- `i18n/programs.json`: 실제 구조를 확인한 프로그램만 수록하는 registry와 공통 locale metadata
- `scripts/check-i18n.mjs`: registry에 등록된 프로그램을 검사하는 공통 정적 validator

이 validator의 정확한 명칭과 범위는 **Registered-program i18n static QA**다. 현재 등록된 `proposal`, `proposal-v2`, `teacher-guide`만 검사하며, 결과를 FeelGood 전체 프로그램의 QA 통과로 확대 해석하지 않는다.

## 현재 기준선 (2026-09-20)

| 프로그램 | 형식 | 등록 언어 | 기준 언어 | 비고 |
|---|---|---:|---|---|
| `proposal` | `window.LANG` JS 사전 | 9 | `ko` | key 기반, 기존 앱 보존 |
| `proposal-v2` | manifest + `window.LANG` JS 사전 | 10 | `ko` | RTL/report locale 메타데이터 보유 |
| `teacher-guide` | JSON manifest + source-text map | 13 | `ko` | 외국어 pack은 AI draft; 안정 key로 점진 이행 |
| 독립 HTML/ZIP 배포본 | 혼합/미등록 | 미확정 | 대체로 `ko` | 프로그램 단위 조사 후 등록 |

`zh`와 `zh-CN` 같은 코드는 기존 외부 연동 때문에 당장 통일하지 않는다. 중앙 레지스트리의 alias/canonical 정보를 이용해 의미를 명확히 하되 런타임 코드는 호환성을 우선한다.

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

1. 유효한 URL `lang` 값
2. 로그인 사용자 또는 프로그램 저장 설정
3. `localStorage`/cookie의 기존 호환 값
4. 브라우저 locale의 정확 일치, 이어서 language-only alias 일치
5. 프로그램 `defaultLocale`

번역 조회는 `선택 locale → fallbackLocale(기본 ko) → 안전한 일반 문구` 순서다. 마지막 단계에서도 translation key를 화면에 표시하지 않는다. 개발/QA 환경에서는 프로그램명, locale, key를 포함해 누락을 기록한다.

HTML을 포함하는 번역은 최소화한다. 허용 시 프로그램이 정의한 sanitizer/allowlist를 통과해야 하며 `<script>`, event handler, `javascript:` URL은 금지한다. 일반 문구는 `textContent`를 사용한다.

## key, placeholder, 상태

- key는 `domain.feature.element` 형태의 안정적인 의미 키를 권장한다. 예: `planner.timer.start`.
- 배열 순서나 화면 위치를 key의 의미로 사용하지 않는다.
- placeholder는 `{name}`, `{score}`처럼 이름을 사용한다. 언어마다 순서는 바꿀 수 있지만 이름 집합은 같아야 한다.
- 기준 원문 변경 시 locale pack의 `sourceVersion` 또는 `sourceHash`가 달라져야 하며, 검수 전 상태는 `needs-review`다.
- 허용 상태의 기본 집합은 `ready`, `reviewed`, `needs-review`, `draft`, `ai-draft`다. 사용자에게 초안을 제공하는 경우 화면에 초안임을 알린다.

## QA 출력과 실패 기준

`node scripts/check-i18n.mjs`는 등록 프로그램마다 다음을 출력한다.

```text
Program | Language | Total | Translated | Missing | Orphan | Empty | Fallback | Errors | Coverage
```

다음은 오류로 처리한다: manifest/locale 파일 누락, 중복 locale, 기준 key 누락, 빈 번역, placeholder 불일치, 위험한 HTML, 잘못된 locale metadata, 프로그램이 요구하는 source hash 불일치. 한국어 잔존과 orphan key는 정확한 예외 판정이 필요하므로 기본적으로 경고하고, 신규 코드의 직접 하드코딩은 `--changed --strict-hardcoded`에서 오류로 처리한다.

## 점진적 마이그레이션

프로그램 등록은 해당 프로그램을 실제로 수정하는 작업에서 다음 순서로 진행한다.

1. 실제 source와 실행 진입점을 확인한다.
2. 현재 i18n 구조와 runtime loader를 확인한다.
3. locale source와 번역 resource 형식을 확인한다.
4. locale 선택·저장·URL 처리와 fallback을 확인한다.
5. 사용자 노출 UI의 hardcoded 문자열을 탐지한다.
6. 실제 supported locales와 locale별 상태를 확인한다.
7. 검증 가능한 경로만 중앙 registry에 등록한다. 필요하면 먼저 `audit` mode로 등록한다.
8. Registered-program i18n static QA를 실행하고 오류를 해소한다.
9. 해당 프로그램의 실제 기술 스택에 맞는 browser QA를 실행한다.
10. 핵심 사용자 흐름과 결과지·외부 연동 regression QA를 실행한 뒤 검증되면 `strict`로 전환한다.

레거시 전체를 한 번에 변환하지 않는다. ZIP과 배포용 단일 HTML은 원본을 보존하고, 소스 프로그램에서 재생성 가능한 경로를 먼저 확보한다.

`KIDS`, `HISTORY`, `PLANNER`, `CAREER LAB`, `MY NUVIA`, `K-PASS`, `D-CAS`는 실제 source와 locale 구조가 확인되기 전에는 추측한 경로로 등록하지 않는다.

## 신규 프로그램과 확장 경계

새 FeelGood 프로그램은 완성 후 i18n을 덧붙이는 흐름이 아니라, 개발 시작부터 루트 `AGENTS.md`의 MASTER RULE, 프로그램별 i18n/resource 구조, 반응형 구조, QA 등록 계획을 함께 갖춘다. 판단 순서는 `MASTER RULE → program-specific rule → current implementation → requested change`이며, MASTER RULE을 이유로 정상 프로그램을 전면 재작성하지 않는다.

현재 공통화하는 것은 rules, registry, metadata, validation contract, QA contract다. 프로그램별 runtime loader는 기존 구현을 보호하며 지금 하나로 강제 통합하지 않는다. Teacher Guide의 browser/RTL/viewport/zoom/print QA도 Teacher Guide 전용으로 유지한다. 향후 실제 프로그램 등록 과정에서 기술 스택 간 공통점이 검증될 때만 shared browser QA layer를 별도 설계한다.
