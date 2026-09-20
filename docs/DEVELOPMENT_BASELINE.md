# FeelGood 개발 기준선 및 QA 계약

## GLOBAL DEVELOPMENT BASELINE

이 문서는 MASTER RULE과 공통 i18n 기반의 복구 참조점 및 저장소 공통 QA 계약을 기록한다. 저장소 전체 규칙은 루트 `AGENTS.md`, i18n 상세 계약은 `docs/i18n/README.md`, 등록부는 `i18n/programs.json`, 공통 정적 validator는 `scripts/check-i18n.mjs`를 따른다.

공통 validator의 정확한 범위는 **Registered-program i18n static QA**다. 현재 등록 프로그램은 `proposal`, `proposal-v2`, `teacher-guide`이며, 이 결과를 FeelGood 전체 프로그램 QA 통과로 표현하지 않는다. 프로그램별 runtime loader와 browser QA는 현재 구조를 보호하고 강제로 통합하지 않는다.

### 도입 전 기록

아래 기록은 MASTER RULE 도입 전 Git 참조점이다. `8754def`는 현재 `HEAD`의 조상 commit이지만, 이후 Teacher Guide QA 강화 commit들이 존재하므로 새로운 공통 기반 기준선은 아니다. 기존 작업물을 clean 상태라고 오해하지 않도록 당시 dirty 상태도 함께 보존한다.

```text
date: 2026-09-20 (Asia/Seoul)
branch: codex/build-teacher-guide-b
commit: 8754defc20ebe15b441323d01f8c69ed4e8a280c
remote: origin https://github.com/goldensge22-design/feelgood-app.git
status: DIRTY — teacher-guide 수정 및 미추적 테스트 자산이 이미 존재함
```

### 공통 기반 기준선

검증을 마친 MASTER/i18n 공통 파일을 최초로 Git에 기록한 commit을 공통 기반 기준선으로 사용한다. 정확한 commit은 이 문서의 다음 기록 commit에서 고정한다. 이 기준선은 **공통 기반 파일의 기준점**이며, 동시에 존재하는 Teacher Guide 미커밋 작업까지 clean 또는 검증 완료로 선언하지 않는다.

어떤 기준선도 branch를 고정하거나 기존 사용자 변경을 되돌리거나 덮어쓸 권한을 부여하지 않는다. 작업 전 `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, `git remote -v`로 최신 상태를 다시 확인한다.

## 공통 QA 계약

### 반응형 QA

영향받는 핵심 화면을 최소 Mobile 360×800, Tablet 768×1024, Desktop 1440×900에서 확인한다. 프로그램이 가로 게임/키오스크/인쇄를 지원하면 해당 viewport도 추가한다.

각 viewport와 지원 언어에서 navigation, 제목, 본문, 카드, 버튼, 입력, table/chart, modal, 이미지, 결과지/PDF를 확인한다. `scrollWidth > clientWidth`, 잘린 텍스트, 의도하지 않은 가로 스크롤, focus 손실, touch target 부족을 P2 이상 후보로 기록한다.

자동 브라우저 테스트가 있는 프로그램은 기존 스크립트를 재사용한다. 없는 프로그램에는 현재 작업 범위의 핵심 경로부터 추가하고, 스크린샷만으로 기능 성공을 판정하지 않는다.

### 기능·통합 회귀 QA

프로그램별 실제 흐름을 우선하고 공통 참조 흐름은 HOME → START → ACTIVITY → SAVE → RESULT → REPORT다. route/query/localStorage/API/report adapter의 변경 전후 값을 비교한다.

외부 결과지/API가 연결된 경우 fixture/mock과 production adapter를 분리하고 normalized schema를 계약 테스트한다. PASS 네 영역, 81유형, 연령, profile, result/user/test ID 등 pass-through 필드가 유실되지 않는지 확인한다. 실제 운영 endpoint에 쓰기 요청을 보내는 검증은 별도 승인 없이 수행하지 않는다.

### 완료 보고 형식

변경 파일, 실행한 검사와 결과, 미실행 검사의 이유, 남은 P0/P1/P2/P3, 배포 여부를 명시한다. P0/P1이 있으면 완료가 아니라 차단 상태로 보고한다.

## PROGRAM QA STATUS

아래 결과는 프로그램별 상태 기록이며 전역 QA 결과가 아니다.

### Teacher Guide

- 아래 통과 기록은 commit `3432597d04ba0ad1e2d0c789592e7f6545cf8f6c`의 Teacher Guide 기준이며, 이후의 미커밋 콘텐츠 변경까지 검증 완료로 선언하지 않는다.
- 12개 외국어 pack 각각 1,724개 message, 신규·변경·누락·빈 값·한국어 잔존·placeholder 불일치 0개. 아랍어 RTL과 6개 반응형 viewport browser QA를 통과했다.
- 이 수치와 browser/RTL/viewport/zoom/print 결과는 **Teacher Guide 전용 QA 상태**다.
- `teacher-guide/profile-engine.js`, `teacher-guide/locales/`, `teacher-guide/tests/locale-source.mjs`, `teacher-guide/tests/locale-coverage.mjs`, `teacher-guide/tests/browser-smoke.mjs`, `teacher-guide/ebook.css`는 Teacher Guide 전용 구현으로 유지한다.

### Proposal

- `proposal`: DOM에서 직접 참조되지 않는 공통/동적 key 6개가 있다.

### Proposal v2

- `proposal-v2`: DOM에서 직접 참조되지 않는 공통/동적 key 157개가 있다.

제안서의 공통/동적 key는 런타임 참조 가능성이 있으므로 임의 삭제하지 않고 P3 경고로 유지한다.

## 아직 미등록된 프로그램

`KIDS`, `HISTORY`, `PLANNER`, `CAREER LAB`, `MY NUVIA`, `K-PASS`, `D-CAS`는 실제 source, locale resource, fallback, supported locales를 프로그램별 작업에서 확인한 뒤 등록한다. 존재하지 않는 경로나 추측한 locale 구조는 registry에 추가하지 않는다.
