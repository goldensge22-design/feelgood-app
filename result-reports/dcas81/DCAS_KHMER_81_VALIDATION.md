# D-CAS 캄보디아어 81유형 검증

검증일: 2026-09-21  
대상 브랜치: `codex/dcas81-khmer-final`

## 변경 범위

청소년과 성인의 동일한 `dcas-profile81-bank.js`에 `km`을 추가했다. 기존 11개 locale 값은 변경하지 않았다. `APPLIED_FULL`과 `PATCH_FILES`의 대응 파일을 동일하게 유지한다.

캄보디아어 locale 메타데이터:

```text
locale: km
direction: ltr
status: ai-draft
sourceLocale: ko
sourceVersion: ko-profile81-v1
```

## 자동 단위 테스트

명령:

```text
node result-reports/dcas81/unpacked/TESTS/profile81.test.js
```

결과:

```text
PASS: teen/adult 81 profiles, H/M/L boundaries, S/Q 0/10/11, invalid scores, 12 locales including Khmer, special cases, and BAL routing
```

확인 항목:

- 청소년/성인 81개 고유 조합
- 52/53 및 74/75 경계
- ALL_L / ALL_M / ALL_H
- S/Q 차이 0, 10, 11
- S 우세 및 Q 우세
- 누락/비정상 점수 거부
- `km-KH` → `km` 정규화
- Khmer 문자열 존재
- `dir=ltr`
- `LOCALE_META.km.status=ai-draft`

## 실제 브라우저 DOM 회귀

명령:

```text
node result-reports/dcas81/unpacked/TESTS/browser-dom-regression.js
```

결과:

```text
PASS: actual teen/adult DOM, late-overwrite, mobile, and print-PDF regression
```

확인 항목:

- 청소년/성인 실제 HTML 로드
- 표지 유형명, hero, 81유형 카드, 학습/업무, 진로, 직업/직무 노트
- 각 Khmer 요소의 `lang="km"`
- 나중에 실행되는 기존 렌더가 81유형 값을 다시 덮어쓰지 않음
- 390px 모바일 viewport에서 청소년/성인 `scrollWidth=390`
- A4 인쇄 PDF 생성
- Khmer 글리프 렌더링, 검은 네모, 명백한 잘림/겹침 없음

생성된 QA PDF:

- 청소년: 22페이지, 2,772,557 bytes
- 성인: 16페이지, 1,550,276 bytes

QA 산출물은 임시 검사 자료이며 운영 결과지로 배포하지 않는다.

## 저장소 공통 i18n 검사

다음 명령은 이 기준 브랜치에 스크립트가 없어 실행할 수 없었다.

```text
node scripts/check-i18n.mjs
node scripts/check-i18n.mjs --changed --strict-hardcoded
```

오류: `MODULE_NOT_FOUND: scripts/check-i18n.mjs`

이는 테스트 실패가 아니라 현재 브랜치에 중앙 검사기가 없는 상태다. 향후 중앙 i18n 구조가 있는 브랜치로 이관할 때 반드시 실행한다.

## 판정

캄보디아어 **81유형 레이어**는 코드 및 브라우저 회귀를 통과했다. 전체 결과지 캄보디아어 번역은 포함하지 않으며, 그 범위와 완료 조건은 `DCAS_KHMER_FULL_REPORT_HANDOFF.md`를 따른다. 번역은 현재 `ai-draft`이므로 원어민/전문가 검수 전 운영 확정본으로 표시하지 않는다.
