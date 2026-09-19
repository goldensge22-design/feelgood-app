# 6연령 입력 방식과 이벤트 계약

## 1. 연령별 입력 방식

연령 경로 이름과 ageBandRuleId는 내부에서만 사용한다. 일반 사용자 화면에는 유아·학년·ageBand·QA·PASS명을 노출하지 않는다.

| 내부 연령 경로 | 기본 도구 | 보조 도구 | 화면 원칙 |
|---|---|---|---|
| 유아 | 말로 남기기 또는 그림으로 남기기 | 한 단어·짧은 글 | 글쓰기를 완료 조건으로 강요하지 않는다. 큰 입력 버튼과 한 화면 한 문장을 유지한다. |
| 초등 저학년 | 말하기·그림·짧은 글 중 선택 | 문장 시작 도움 | 고정 답안 없이 한 가지 방식만으로 완료할 수 있다. |
| 초등 고학년 | 짧게 쓰기 | 말하기·그림 | 직접 입력창을 기본 표시하고 별도 모드 버튼을 요구하지 않는다. |
| 중학생 | 직접 쓰기 | 로컬 음성 | 조건과 이유를 짧게 구분해 적는다. 정답·근거 적중 판정을 하지 않는다. |
| 고등학생 | 직접 쓰기 | 로컬 음성 | 근거·불확실성을 쓸 수 있으나 금지 단정문을 학습 문장으로 노출하지 않는다. |
| 성인 | 직접 쓰기 | 로컬 음성 | 자료 한계와 복합 조건을 쓸 수 있으나 모바일 가독성을 유지한다. |

음성은 사용자 기기에 로컬로 녹음·재생한다. 전사문을 자동 생성하지 않는다. 그림은 사용자가 직접 저장한 결과만 참조한다.

## 2. 구조화 데이터

실제 이유 입력이 있을 때만 `reasonRef`를 생성한다.

```ts
type ReasonExpressionSource = 'typed' | 'recorded' | 'drawn';

interface ReasonExpressionRecord {
  reasonRef: string;
  resultId: string;
  missionId: string;
  conditionId: string;
  missionVersion: string;
  contentVersion: string;
  actionEventId: string;
  reasonQuestionId: string;
  source: ReasonExpressionSource;
  reasonText?: string;   // typed 원문만
  voiceRef?: string;     // recorded 로컬 참조만
  drawingRef?: string;   // drawn 로컬 참조만
  createdAt: string;
}
```

하나의 이유 기록은 하나의 주 입력 출처를 가진다. 여러 방식을 함께 남기는 `mixed` 계약은 이 기준본에 추가하지 않는다. 지원이 필요하면 후속 공통 확장으로 검토한다.

이유를 건너뛴 경우 `ReasonExpressionRecord`와 `reasonRef`를 만들지 않는다.

## 3. 이벤트 계약

### 실제 이유 입력

새 공통 이벤트 `reasonExpressionRecorded`를 사용한다. 이벤트 payload에는 사용자 원문·원음·그림 바이너리를 중복 저장하지 않고 참조와 메타데이터만 둔다.

```ts
interface ReasonExpressionRecordedPayload {
  reasonRef: string;
  actionEventId: string;
  reasonQuestionId: string;
  source: 'typed' | 'recorded' | 'drawn';
  hasText: boolean;
  voiceRef?: string;
  drawingRef?: string;
}
```

실제 이유의 원문은 `ReasonExpressionRecord`에만 보존한다. 성장 리포트는 해당 레코드를 같은 ID·버전으로 조회한다.

### 이유 건너뛰기

기존 `activityDeferred`를 이유 범위에 한정하는 payload 확장 계약을 사용한다.

```ts
interface ReasonDeferredPayload {
  scope: 'reason';
  actionEventId: string;
  reasonQuestionId: string;
  source: 'deferred';
}
```

- `scope = reason`은 선택·배열·분류·수정 활동 자체가 보류됐다는 뜻이 아니다.
- 핵심 활동 입력은 `cognitiveActionRecorded`에 실제 입력으로 남는다.
- `reasonRef`는 생략한다. `null`, 빈 문자열, 자동 ID를 만들지 않는다.
- 기존 scope 없는 `activityDeferred`는 수행 당시 버전에서 활동 전체 보류로 해석한다. 소급 변환하지 않는다.
- 접근성상 수행 불가의 구체적 사유는 기록하지 않는다.

### 원자적 저장

사용자가 이유를 저장하거나 건너뛸 때 다음을 한 저장 트랜잭션으로 확정한다.

1. 실제 선택·배열·분류·수정 값을 가진 `cognitiveActionRecorded`
2. 실제 이유가 있으면 `reasonExpressionRecorded`, 없으면 `activityDeferred(scope=reason)`
3. 두 이벤트의 같은 resultId·missionId·conditionId·버전과 상호 참조

저장 실패 시 핵심 활동 완료로 처리하거나 변경 결과를 공개하지 않는다. 기존 전체 활동 보류는 `cognitiveActionRecorded` 없이 `activityDeferred(scope=activity)`로 구분하는 후속 스키마가 필요하다.

## 4. 공통 행동 계약 변경 경계

현재 `classifyEvidence`, `chooseGoalAndSteps`, `prioritizeActions`, `revisePlan`은 `reasonRef`를 필수 문자열로 요구한다. 새 기준본에서는 이유 질문이 있는 행동에 대해 다음 합집합을 허용해야 한다.

- 실제 이유 입력: 유효한 `reasonRef`
- 이유 건너뛰기: `reasonRef` 없음 + 같은 actionEventId의 `activityDeferred(scope=reason)`

`mapRelation`, `arrangeSequence`, `compareStructures`처럼 이유를 묻지 않는 계약에는 이유 필드를 추가하지 않는다. 이유 질문 유무는 질문 의미 데이터로 판정하며 PASS 영역을 바꾸지 않는다.

## 5. 완료·리포트 검증 규칙

- 실제 입력: `reasonRef`와 레코드 및 입력 출처가 모두 존재해야 한다.
- 건너뛰기: reasonRef 0개, reason record 0개, reason-scoped deferred 이벤트 1개여야 한다.
- 빈 입력과 고정 카드 ID는 이유 완료가 아니다.
- 보고서에는 실제 원문 또는 `이번 활동에서는 이유가 기록되지 않았어요`만 표시한다.
- 이유 표현은 나의 이야기·이야기책 6·7·8쪽에 자동 유입되지 않는다.
- 같은 resultId라도 이유 레코드를 다른 행동·질문에 재사용하지 않는다.
