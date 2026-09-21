# NUVIA PLANNER 결과지·서버 연동 지시서

기준 규칙: `NUVIA_PLANNER_FINAL_RULES_v3.1.md`  
프런트 기준: `nuvia-planner/source/src/adaptive/engine.ts`, `AdaptivePlanner.tsx`

## 1. 통합 책임

결과지 서비스는 검사별 공식 점수 해석을 소유한다. PLANNER는 전달된 해석을 검증하고 UI·활동·저장 범위에 적용한다.

```text
K-PASS / D-CAS 결과 서비스
  → 인증된 결과지 adapter
  → Assessment v1.1 검증
  → 상단 PASS 4영역 표시
  → 지원 목표·강점 표현 배정
  → 사용자별 Planner workspace
  → 수행 이벤트 API
```

## 2. Assessment v1.1 payload

```json
{
  "schemaVersion": "1.1",
  "assessmentId": "assessment-opaque-id",
  "subjectId": "subject-opaque-id",
  "profileVersion": "profile-2026-09",
  "educationStage": "high",
  "scoreSystem": {
    "instrument": "dcas",
    "metric": "accuracy_rate",
    "label": "영역별 정답률",
    "interpretationVersion": "dcas-teen-2026-09"
  },
  "axes": {
    "planning": {"level": "low", "value": 42, "unit": "%"},
    "attention": {"level": "mid", "value": 58, "unit": "%"},
    "simultaneous": {"level": "high", "value": 76, "unit": "%"},
    "successive": {"level": "mid", "value": 65, "unit": "%"}
  },
  "supportOrder": ["planning"],
  "strengthOrder": ["simultaneous"]
}
```

허용 ID:

- 영역: `planning`, `attention`, `simultaneous`, `successive`
- 수준: `high`, `mid`, `low`
- 단계: `elementary_1_3`, `elementary_4_6`, `middle`, `high`, `adult`
- 검사: `kpass`, `dcas`
- 점수 종류: `standard_score`, `percentile`, `accuracy_rate`

`label`은 결과지 서비스의 검수된 표시 이름이다. 서버는 한 요청 안에서 서로 다른 척도의 값을 섞지 않는다.

## 3. 검사별 전달 원칙

### K-PASS

- 공식 표준점수 또는 백분위 중 화면에 표시할 한 체계를 `metric`으로 선언한다.
- 공식 상·중·하는 결과지 해석 엔진이 계산한다.
- 95% 신뢰구간이 필요하면 향후 별도 선택 필드로 추가하며 `value`에 문자열을 넣지 않는다.

### D-CAS

- 현재 결과지의 영역별 정답률은 `accuracy_rate`, 단위 `%`로 전달한다.
- 정답률을 또래 백분위로 표시하지 않는다.
- 영역 간 개인 내 패턴과 결과지의 공식 분류를 사용한다.

## 4. 프런트 연결

초기 로드 전에 다음 중 하나로 결과를 주입한다.

```js
window.NUVIA_PLANNER_MODE = 'production';
window.NUVIA_PLANNER_ASSESSMENT = assessmentPayload;
```

이미 화면이 열린 뒤 갱신할 때는:

```js
const result = window.NUVIAPlanner.setAssessment(assessmentPayload);
if (!result.ok) showSafeIntegrationError(result.error);
```

로그아웃·대상 사용자 변경:

```js
window.NUVIAPlanner.clearAssessment();
```

식별자나 해석 버전을 URL query에 노출하지 않는다. 결과지 접근 토큰도 localStorage와 백업 JSON에 넣지 않는다.

## 5. 서버 API 권장 계약

```text
GET  /api/v1/planner/assessment-context
GET  /api/v1/planner/workspace
PUT  /api/v1/planner/workspace            If-Match: <revision>
POST /api/v1/planner/execution-events
POST /api/v1/planner/external-verifications
```

- 인증 세션의 subject와 payload의 `subjectId`를 서버에서 대조한다.
- workspace는 `subjectId + assessmentId + profileVersion + interpretationVersion` 범위로 분리한다.
- PUT은 revision 또는 ETag로 다중 탭 충돌을 검출한다.
- 이벤트는 idempotency key를 사용한다.
- 서버 시각은 저장하되 학생이 확인한 실제 시간과 구분한다.
- 검사 원점수 재계산과 플래너 행동 점수화는 이벤트 API에서 하지 않는다.

## 6. 서버가 저장할 것과 저장하지 않을 것

저장:

- 안정 ID, 결과지 버전, 공식 분류, 표시 점수와 단위
- 과제 구조, 예상 시간, 실제 확인 시간, 완료 여부, 복귀 위치
- 목표 행동의 `performed / skipped / not_applicable / unobserved`
- 실제 행동과 자기보고·외부 확인의 provenance

저장하지 않음:

- 타이머 매초 값
- 집중력 점수, 인지향상 점수, 사용자 간 순위
- 재적용 자유서술 원문
- 결과지 접근 토큰과 검사 문항 원문

## 7. 마이그레이션

- v1.0 payload는 하위 호환으로 읽지만 숫자와 점수 체계가 없을 수 있다.
- 신규 결과지 연동은 v1.1을 사용한다.
- v1.0을 v1.1로 바꿀 때 플래너에서 임의 추정하지 말고 결과지 adapter가 `scoreSystem`, 네 `value`, `supportOrder`, `strengthOrder`를 채운다.
- `profileKey`가 바뀌면 이전 workspace를 자동 합치지 않는다. 명시적 서버 마이그레이션과 감사 로그를 사용한다.

## 8. 필수 통합 테스트

1. K-PASS 표준점수와 단위가 상단 네 카드에 표시된다.
2. D-CAS 정답률이 `%`로 표시되고 백분위 문구가 없다.
3. 네 점수 중 하나가 빠진 v1.1은 거부되고 기존 workspace는 유지된다.
4. `supportOrder`가 코드의 고정 영역 순서보다 우선한다.
5. `supportOrder`가 없으면 같은 단위 내 낮은 값 순서가 안전한 fallback으로 사용된다.
6. 복수 low는 한 회차에 하나만 배정하고 수행·실행 종료 뒤 다음 회차로 순환한다.
7. high 강점은 표시 순서만 바꾸고 과제를 자동 결정·완료하지 않는다.
8. 사용자·assessment·profile·interpretation 버전 변경 시 저장공간이 분리된다.
9. 로그아웃 뒤 이전 점수와 과제가 DOM·스토리지에 남지 않는다.
10. 360px에서 점수 카드가 2열로 배치되고 가로 넘침이 없다.

## 9. GitHub 구현 위치

- 규칙: `nuvia-planner/docs/NUVIA_PLANNER_FINAL_RULES_v3.1.md`
- 이 지시서: `nuvia-planner/docs/NUVIA_PLANNER_RESULT_SERVER_INTEGRATION.md`
- 결과지 schema·검증·배정: `nuvia-planner/source/src/adaptive/engine.ts`
- 상단 점수 UI와 주입 API: `nuvia-planner/source/src/adaptive/AdaptivePlanner.tsx`
- 반응형 스타일: `nuvia-planner/source/src/adaptive/personal-planner.css`
- 계약 테스트: `nuvia-planner/source/src/tests/adaptiveTraining.test.ts`
- 브라우저 검수: `nuvia-planner/source/scripts/verify-browser.cjs`

