# FeelGood 개발 기준선 및 QA 계약

버전 1.0 / 공식 공통 규칙 분리: 2026-09-20.

## 공식 저장 범위

- 공통 브랜치: codex/feelgood-common-master-rules
- 안전한 부모 기준점: origin/main, 7216760febff4e5529e812cc9cbd2e83ce3f5427
- 승인 원본 출처: C:/Users/golde/GitHub/feelgood-app의 미추적 공통 규칙 다섯 파일.
- 커밋 대상은 AGENTS.md, docs/i18n/README.md, i18n/programs.json, scripts/check-i18n.mjs, 이 문서뿐이다.
- teacher-guide 선행 커밋·dirty 파일·번역·배포본은 가져오지 않는다. 기존 프로그램 registry 항목도 보존한다.
- HISTORY는 이 공통 커밋 하나만 cherry-pick하며 W24 최신 브랜치와 5192 실행본은 변경하지 않는다.

## 이번 변경 검증 (2026-09-20)

- 변경 전 검사: FAIL, 오류 1 / 경고 19. 안전한 main에는 teacher-guide/locales/languages.json이 없다. 기존 proposal의 동적/orphan 키 6개와 proposal-v2의 157개는 언어별 경고다.
- 변경 후 검사: FAIL, 오류 19 / 경고 24. 검사를 완화해 PASS로 만들지 않는다.
- 새로 탐지한 레거시 부적합 15건: 기존 세 프로그램의 fallback 설정, release metadata 부재, proposal의 release 확인 불가 선택 언어 9개. 기존 프로그램 코드는 이번에 수정하지 않는다.
- 신규 HISTORY 등록 검증 잔여 3건: ko release의 pack/필수 키 계약, RTL 검수 증거, 폰트 검수 증거 미제공. 사용자가 지정한 현재 ko release 상태는 보존하되 새 연간 실행본 검수 완료로 간주하지 않는다.
- 경고 추가 5건: 네 프로그램의 화면 문자열 출처 미검증 및 HISTORY 외부 런타임 미검증. 문자열 출처 데이터 없는 화면의 언어 혼입 검수 통과를 주장하지 않는다.
- 검사기 합성 self-test 17건 통과: 정상 계약, fallback 금지, 혼합/다른 언어 출처, 누락·빈 값·키 이름 대체, placeholder, RTL·폰트·증거 누락, 미지원·planned·blocked 노출, pack/필수 키 계약 누락.
- 기존 아래 teacher-guide P2는 다른 dirty 작업 폴더의 과거 관찰 기록이다. main 기준 검사 결과와 혼합하거나 이번 검사로 재현했다고 표시하지 않는다.
- 공통 규칙 저장 성공과 전체 프로그램 규칙 준수 완료는 별개다. 위 오류가 남아 있으므로 전체 i18n QA 통과/배포 완료로 보고하지 않는다.

## 기록 기준선

이 문서는 MASTER RULE 도입 시점의 복구 참조점이다. 기존 작업물을 clean 상태라고 오해하지 않도록 dirty 상태도 함께 기록한다.

```text
date: 2026-09-20 (Asia/Seoul)
branch: codex/build-teacher-guide-b
commit: 8754defc20ebe15b441323d01f8c69ed4e8a280c
remote: origin https://github.com/goldensge22-design/feelgood-app.git
status: DIRTY — teacher-guide 수정 및 미추적 테스트 자산이 이미 존재함
```

이 기준선은 새 commit을 만들거나 branch를 고정한다는 의미가 아니다. 기존 사용자 변경을 되돌리거나 덮어쓸 권한도 부여하지 않는다. 작업 전 `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, `git remote -v`로 최신 상태를 다시 확인한다.

## 반응형 QA

영향받는 핵심 화면을 최소 Mobile 360×800, Tablet 768×1024, Desktop 1440×900에서 확인한다. 프로그램이 가로 게임/키오스크/인쇄를 지원하면 해당 viewport도 추가한다.

각 viewport와 지원 언어에서 navigation, 제목, 본문, 카드, 버튼, 입력, table/chart, modal, 이미지, 결과지/PDF를 확인한다. `scrollWidth > clientWidth`, 잘린 텍스트, 의도하지 않은 가로 스크롤, focus 손실, touch target 부족을 P2 이상 후보로 기록한다.

자동 브라우저 테스트가 있는 프로그램은 기존 스크립트를 재사용한다. 없는 프로그램에는 현재 작업 범위의 핵심 경로부터 추가하고, 스크린샷만으로 기능 성공을 판정하지 않는다.

## 기능·통합 회귀 QA

프로그램별 실제 흐름을 우선하고 공통 참조 흐름은 HOME → START → ACTIVITY → SAVE → RESULT → REPORT다. route/query/localStorage/API/report adapter의 변경 전후 값을 비교한다.

외부 결과지/API가 연결된 경우 fixture/mock과 production adapter를 분리하고 normalized schema를 계약 테스트한다. PASS 네 영역, 81유형, 연령, profile, result/user/test ID 등 pass-through 필드가 유실되지 않는지 확인한다. 실제 운영 endpoint에 쓰기 요청을 보내는 검증은 별도 승인 없이 수행하지 않는다.

## 완료 보고 형식

변경 파일, 실행한 검사와 결과, 미실행 검사의 이유, 남은 P0/P1/P2/P3, 배포 여부를 명시한다. P0/P1이 있으면 완료가 아니라 차단 상태로 보고한다.

## MASTER RULE 도입 시 알려진 QA 잔여

- P2: `teacher-guide` 영어 pack은 1,724개 source message와 일치하지만, 일본어·중국어(간체)·스페인어·러시아어·베트남어·태국어·아랍어·이탈리아어·아제르바이잔어·몽골어·크메르어 pack은 각각 923개로 801개가 누락되어 fallback을 사용한다. source hash도 영어 확장본보다 이전 상태다.
- P2: 몽골어와 크메르어의 `D-CAS의 %는 또래 백분위가 아닙니다.` 번역에 원문에 없는 `%s`가 있어 placeholder 검토가 필요하다.
- P3: `proposal`에는 DOM에서 직접 참조되지 않는 공통/동적 key 6개, `proposal-v2`에는 157개가 있다. 런타임 참조 가능성이 있으므로 삭제하지 않고 경고로 유지한다.

위 항목은 MASTER RULE 추가 과정에서 새로 만든 문제가 아니다. 기존 진행 중인 번역 작업을 보존하기 위해 자동 번역하거나 locale 파일을 덮어쓰지 않았다.
