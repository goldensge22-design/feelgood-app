# 결과지 연동 개발자 지시서

## 현재 상태와 금지 사항
- 이 ZIP은 **Replit의 분리된 검토 앱 전체 소스**입니다. GitHub 정식 플래너 전체 저장소의 최신 사본이라고 주장하지 않습니다.
- 실제 결과지 서버, 로그인, 학생 소유권, 교사 권한, 기기 간 동기화는 **미연결**입니다. 검토용 JSON 입력은 인증된 서버 결과가 아닙니다.
- 사용자 제시 원격 기준: `feelgood-app`의 `codex/recover-planner-dcas81`, `811609f`. 이 원격 코드 및 과거 `defa19d`와의 호환성을 이번 작업에서 확인하지 않았습니다.
- 사용자는 `811609f`에서 Vitest262개/tsc/build 직접 통과를 확인했습니다. 이 결과를 Replit 구형 4건 불일치와 혼합하지 마세요. 이번 검토 패치와 원격의 결합 호환성은 별도 확인 대상입니다.
- 공식 결과지/D-CAS/다른 프로그램/서버 계약을 변경하지 않았습니다. main 병합·push·운영 배포도 하지 않았습니다.

## 실제 코드의 연결 지점
1. 검토 UI: `src/studio/AssessmentPanel.tsx`. 명시적 검토 모드에서만 예시 또는 JSON을 선택합니다.
2. 로컬 수신 어댑터: `src/studio/insights.ts`의 `installAssessment`, 명령 `assessment.input`. `testKind`, `testDate`, `assessment`를 받습니다.
3. 형식 검증: 기존 `src/official/adaptive/engine.ts`의 `validateAssessment`. **이 파일을 임의 절단점/새 유형표로 교체하지 마세요.**
4. 개인화 경로: `src/enhancement/domain.ts`의 `routeFor`와 기존 공식 엔진. 공식 수준과 지원/강점 순서를 사용하며 점수에서 수준을 다시 계산하지 않습니다.
5. 로컬 저장: `src/studio/store.ts`, `persistence.ts`. `nuvia:studio:v1:personal`과 `nuvia:studio:v1:review`는 분리됩니다.

실제 HTTP endpoint/URL, 요청 인증 헤더, 서버 DB 스키마와 서버 저장 API는 현재 없습니다. 아래 로컬 계약을 곧바로 운영 API라고 사용하지 마세요. 담당 개발자가 최신 서비스 계약을 확인한 후 별도 인증된 어댑터를 구현해야 합니다.

## 합성 입력 예제 — 실제 검사 결과가 아님
```json
{
  "testKind": "K-PASS 합성 계약 예시",
  "testDate": "2026-10-01",
  "assessment": {
    "schemaVersion": "1.1",
    "assessmentId": "synthetic-exam-001",
    "subjectId": "synthetic-owner-001",
    "profileVersion": "example-only-1",
    "educationStage": "middle",
    "scoreSystem": {
      "instrument": "kpass",
      "metric": "standard_score",
      "label": "합성 예시 · 표준점수",
      "interpretationVersion": "example-not-official-type-table"
    },
    "supportOrder": ["planning"],
    "strengthOrder": ["simultaneous"],
    "axes": {
      "planning": {"level": "low", "value": 88, "unit": "표준점수"},
      "attention": {"level": "mid", "value": 101, "unit": "표준점수"},
      "simultaneous": {"level": "high", "value": 115, "unit": "표준점수"},
      "successive": {"level": "mid", "value": 103, "unit": "표준점수"}
    }
  }
}
```
검토 화면에서 이 JSON을 입력하면 **로컬 계약 입력·서버 검증 아님**으로 표시됩니다. 예시 버튼은 **합성 예시**로 구분합니다. 기본 화면은 점수 없이 **미연결**입니다.

## 형식·단위·순서 검증
- 네 축은 `planning`, `attention`, `simultaneous`, `successive`; 공식 수준은 `low/mid/high`입니다.
- `assessmentId`, `subjectId`, `profileVersion`은 비어 있지 않은 문자열(최대 160자). 이것은 형식 검사일 뿐 **소유자 인증이 아닙니다**.
- 신규 로컬 수신은 `1.1`과 네 영역 표시값/동일 단위 및 점수 체계를 요구합니다. 기존 `1.0` 계약은 그대로 보존합니다.
- K-PASS는 `standard_score` 또는 `percentile`, D-CAS는 `accuracy_rate`입니다. D-CAS 1.1은 네 영역 `%`가 필요합니다. 표준점수를 정답률과 섞지 않습니다. 표준점수 로컬 수신 허용 단위는 `표준점수/SS/점/standard_score`, 백분위는 `백분위/PR/percentile/%`입니다.
- `supportOrder`, `strengthOrder`는 축 이름 배열이며 중복/알 수 없는 축을 거절합니다. 여러 하 영역의 순서가 불충분하면 확정된 공식 순환 근거로 취급하지 않습니다. 누락 순서를 임의 점수순으로 보충하지 마세요.
- `educationStage` 계약은 `elementary_1_3/elementary_4_6/middle/high/adult`; 이번 신규 진입/검수는 `middle/high/adult`입니다. 연령을 검사값으로 추측하지 않습니다.
- 외부 81유형별 해석표와 매핑된 상태가 아닙니다. 네 영역 상중하의 `3^4=81` 조합에 5종 실제 목표활동과 4종 강점도움을 조합합니다. 외부 유형 코드/해석은 원본 계약과 대응표를 받은 뒤 검증하며 만들어 넣지 않습니다.
- 현재 로컬 어댑터는 원본 식별정보를 `insights.source/sources`에 보존하되 **합성 실행 공간 내부**의 검사 ID/학생 ID를 정규화합니다. 이 시연용 정규화를 운영 사용자 ID 매핑으로 사용하면 안 됩니다. 재검 수신은 이전 출처/이력을 보존하고 진행 실행이 있으면 거절합니다.

## 실제 서버 연결 전 합의해야 할 항목
아래는 **필요 사항이며 현재 구현된 API 계약이 아닙니다**.
1. 인증된 사용자↔학생 소유권↔검사 ID 연결, 검사기관/프로필/해석 버전과 데이터 출처.
2. 결과 조회 endpoint 및 서버 검증, 권한 없는 검사 ID 조회 차단, 교사 공유 범위와 철회.
3. 서버의 공식 분류/지원순서/강점순서와 전달값 불일치 시 저장 전 중단·안내. 점수에서 재분류하지 않기.
4. 검사 수신과 활동 로그 저장의 버전 및 별도 이력; 검사값은 활동률로 변경 금지.
5. 사용자별 저장 API, 안정적인 카드/실행/회차 ID와 멱등성 키, 중복 재전송 방지.
6. 로컬-서버 충돌 시 선택/재시도와 버전 충돌 응답; 조용한 덮어쓰기 금지. 오프라인 실행은 마지막 확인 시각에서 멈추고 재확인.
7. 미연결/401·403/유효하지 않은 결과/버전 충돌/타임아웃을 구분. 통신 실패를 0점·실패·0%로 바꾸지 않기.
8. 개인 메모/생각 보관함/전체 검사값 자동 공유 금지. 개인 백업과 읽기용 선택 리포트 구분.

## 통합 QA 체크리스트
- 실제/합성/미연결/미확인 출처 표시, 검사종류·날짜·4값·단위·공식 수준 일치.
- 상중하 81조합, 복수하 순서, 모두하/하없음/동률/순서없음/무효 입력; 실제 필수 행동+실행 종료에만 회차 순환.
- 인증된 다른 학생 검사/백업 거절, 공유 전 미리보기·철회, 권한 우회 차단(현재 미검증).
- 최신 공식 결과지와 유형 식별정보 불일치 시 중단. 지원 선택은 공식 검사값을 변경하지 않기.
- 중단/복귀/시간미정/중복실행/재전송/월경계/목표정정/복원/중복 초안승인 및 다국어 상태 보존.
- 정식 서버와 결합 후 별도 통합·보안 QA가 필요합니다. 이번 합성 브라우저 QA로 대신할 수 없습니다.
