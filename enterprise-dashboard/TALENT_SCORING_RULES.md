# 기업 인재전략 산출 기본 규칙 v1.0

이 문서는 기업 인재전략 대시보드의 판정 상태, 현재 직무 준비도, 역할 잠재력과 추천 경로를 운영 서버에서 산출하기 위한 기본 계약이다. 조직·직무별 검증을 거쳐 가중치와 임계값을 조정할 수 있지만, 입력 출처 분리, 누락값 처리, 산출 근거와 규칙 버전 반환은 변경하지 않는다.

## 1. 현재 데모와 운영판의 차이

공개 데모의 `status`, `fit`, `readiness`, `leaderPotential`, `expertPotential`, `recommendedPath`, `roleScores`는 기능을 설명하기 위한 합성 고정값이다. 현재 프런트엔드는 이 값을 계산하지 않고 adapter가 전달한 값을 표시한다.

운영판에서는 데모 고정값을 복사하지 않는다. 결과지·채용시스템·이력서 분석·기업 평가 입력을 서버가 검증한 뒤 이 문서의 규칙 버전에 따라 산출하고, 프런트엔드는 서버 결과를 표시한다.

## 2. 데이터 계층과 책임

### 2.1 결과지 읽기 전용 데이터

- Planning, Attention, Simultaneous, Sequential
- D-CAS 추천 직무 Top 5와 각 추천 신호
- 결과지 ID, 검사일, 결과 버전
- 인지특성, 81유형 등 기존 결과지 계약 필드

기업 평가자는 이 값을 수정할 수 없다. 운영 서버는 결과지 서비스에서 다시 확인하고 0–100 정규화 기준과 결과 버전을 기록한다.

### 2.2 채용·이력서 데이터

- 실제 지원 직무: 채용시스템 또는 담당자 입력
- 이력서 기반 직무 Top 3 이상
- 지원 직무에 대한 이력서 근거 점수 `resumeAppliedJobEvidence`

D-CAS 추천 직무와 이력서 기반 직무는 출처가 다르므로 하나의 원본 점수로 합치거나 서로 덮어쓰지 않는다.

### 2.3 기업 평가자 입력

- `jobCompetencyEvidence`: 면접·경력 등으로 확인한 직무역량 근거
- `coreValueBehavior`: 기업 핵심가치에 부합하는 관찰 행동
- `workSampleScore`: 업무 과제 또는 시뮬레이션 결과
- `roleEvidence.leader`: 리더십 행동·경험 근거
- `roleEvidence.projectLead`: 프로젝트 책임·조정 근거
- `roleEvidence.specialist`: 직무 전문성·심층 문제해결 근거
- `roleEvidence.practitioner`: 실행·운영·지속 수행 근거

모든 점수는 0–100이며 평가자, 평가일, 근거 ID, 승인 상태를 함께 저장한다. `draft`는 공식 산출에 사용하지 않고 `approved`만 사용한다.

### 2.4 서버 산출 데이터

- 현재 직무 준비도
- 역할별 인지특성 부합도
- 역할별 종합 점수
- 리더 잠재력과 전문가 잠재력
- 추천 경로
- 기업 인재상 부합 신호
- 판정 상태와 근거

프런트엔드는 운영판의 공식 산출 주체가 아니다.

## 3. 현재 직무 준비도

현재 직무 준비도는 지원자가 지금 해당 직무를 수행할 준비가 어느 정도인지 나타내며, 장기 잠재력이나 PASS 평균과 분리한다.

```text
readiness =
  jobCompetencyEvidence       × 0.35
+ workSampleScore             × 0.40
+ coreValueBehavior           × 0.15
+ resumeAppliedJobEvidence    × 0.10
```

- 최종값은 반올림한 0–100 정수로 반환한다.
- 네 항목 중 하나라도 없거나 승인되지 않았으면 공식 준비도를 확정하지 않는다.
- 누락 항목의 가중치를 다른 항목에 자동 재배분하지 않는다.
- 부분값이 필요하면 `provisionalScore`로 분리하고 `status: "incomplete"`와 누락 항목을 함께 반환한다.

## 4. 역할별 인지특성 부합도

후보자의 PASS 네 영역과 업무성과가 확인된 기존 직원군의 역할별 PASS 프로파일을 비교한다.

```text
roleCognitiveFit(role) =
  clamp(100 - Σ(domainWeight × abs(candidatePASS - roleProfilePASS)), 0, 100)
```

기본 `domainWeight`는 네 영역 각각 0.25다. 직무별 가중치를 적용하려면 합계가 1이어야 하고 모델 버전에 함께 저장한다. 비교 프로파일은 `minimumCohortSize` 이상의 승인 표본으로 만든 복수 성공 프로파일을 사용한다.

PASS는 역할과 동일하지 않으므로 인지특성 부합도만으로 리더·전문가·프로젝트 책임자·실무 수행형을 확정하지 않는다.

## 5. 역할별 종합 점수

역할 점수는 인지특성 부합도와 역할별 행동 근거를 결합한다.

| 역할 | 인지특성 부합도 | 역할별 근거 | 보조 근거 A | 보조 근거 B |
| --- | ---: | ---: | ---: | ---: |
| 리더 후보 | 40% | 리더십 행동·경험 30% | 핵심가치 행동 15% | 협업·조정 과제 15% |
| 프로젝트 책임자 후보 | 40% | 프로젝트 책임·조정 30% | 직무역량 근거 15% | 업무과제 15% |
| 전문가 성장형 | 40% | 직무 전문성 근거 30% | 직무역량 근거 15% | 전문 과제 15% |
| 실무 수행형 | 35% | 실행·운영 근거 30% | 직무역량 근거 20% | 업무과제 15% |

협업·조정 과제와 전문 과제를 별도로 운영하지 않는 기업은 `workSampleScore` 안에 평가 하위척도를 두고 해당 하위척도 점수를 사용한다. 하위척도가 없으면 전체 업무과제 점수로 조용히 대체하지 않고 미수집 상태로 반환한다.

```text
leaderPotential = roleScores.leader
expertPotential = roleScores.specialist
```

화면의 리더·전문가 값은 이 역할 점수를 사용하며 별도의 임의 고정값을 두지 않는다.

## 6. 추천 경로

1. `leader`, `projectLead`, `specialist`, `practitioner` 역할 점수를 내림차순으로 정렬한다.
2. 최고점이 70 미만이면 경로를 강제로 확정하지 않고 `추가 확인`을 반환한다.
3. 1위와 2위의 차이가 5점 미만이면 두 경로를 `recommendedPaths`에 함께 반환한다.
4. 그 외에는 최고점 역할을 주 추천 경로로 반환한다.
5. 지원 직무와 D-CAS 추천 직무 1순위가 다르면 대안 직무와 점수 차이를 함께 표시한다.

기존 단일값 호환이 필요하면 `recommendedPath`에는 `recommendedPaths[0]`을 넣되, 운영 UI는 복수 추천을 표시할 수 있어야 한다.

## 7. 기업 인재상 부합 신호

기업 평가와 D-CAS/PASS를 결합한 신호는 다음 기본 가중치를 사용한다.

```text
passScore = mean(planning, attention, simultaneous, sequential)

integratedScore =
  passScore                  × 0.35
+ jobCompetencyEvidence      × 0.25
+ coreValueBehavior          × 0.20
+ workSampleScore            × 0.20
```

D-CAS/PASS 기반 잠재 신호는 결과지의 추천 직무 1순위 점수 `passOnlyScore`를 사용한다. 두 신호의 공통 수준은 낮은 값을 더 크게 반영한다.

```text
alignmentScore = min(integratedScore, passOnlyScore) × 0.75
               + max(integratedScore, passOnlyScore) × 0.25
```

지원 직무와 추천 직무 1순위가 다르면 두 직무를 교차 검토 직무군으로 반환한다. 점수 방향이 다르더라도 한 값을 다른 값으로 덮어쓰지 않는다.

## 8. 판정 상태 기본 라우팅

판정 상태는 합격·탈락값이 아니라 담당자가 확인할 업무 흐름이다. 조직·직무별 임계값은 서버 정책으로 조정할 수 있으며 변경 시 규칙 버전을 올린다.

판정 순서는 다음과 같다.

1. 필수 결과지, 지원 직무, 승인된 기업 평가 또는 필수 역할 근거가 누락되면 `hold`.
2. 유효한 대안 직무 점수가 지원 직무 부합 신호보다 8점 이상 높고 대안 직무 점수가 75 이상이면 `alternate`.
3. `alignmentScore >= 85`, `readiness >= 75`, 필수 자료 완료, 미확인 중요 근거가 없으면 `priority`.
4. `alignmentScore >= 70`이거나 구조화 면접·업무과제에서 추가 확인할 항목이 있으면 `validate`.
5. 그 밖에는 `hold`.

| 코드 | 화면 의미 |
| --- | --- |
| `priority` | 직무 기준과 부합 근거가 충분하여 우선 검토 |
| `validate` | 구조화 면접이나 과제에서 추가 확인 |
| `alternate` | 다른 직무에서 강점 활용 가능성 검토 |
| `hold` | 필수 자료 부족 또는 결과 불일치로 판단 보류 |

## 9. 운영 응답 계약

서버는 최종 숫자만 반환하지 말고 산출 구성요소, 누락 근거와 규칙 버전을 함께 반환한다.

```js
candidate.calculation = {
  ruleVersion: "enterprise-talent-v1.0",
  calculatedAt: "2026-10-23T00:00:00Z",
  readiness: {
    score: 82,
    provisionalScore: null,
    status: "complete",
    components: {
      jobCompetencyEvidence: 84,
      workSampleScore: 86,
      coreValueBehavior: 76,
      resumeAppliedJobEvidence: 80
    }
  },
  roleCognitiveFit: {
    leader: 74,
    projectLead: 82,
    specialist: 79,
    practitioner: 73
  },
  roleScores: {
    leader: 76,
    projectLead: 84,
    specialist: 79,
    practitioner: 73
  },
  leaderPotential: 76,
  expertPotential: 79,
  recommendedPaths: ["projectLead"],
  integratedScore: 83,
  passOnlyScore: 82,
  alignmentScore: 83,
  status: "validate",
  reasons: ["role.projectLead.primary", "evidence.workSample.strong"],
  missingEvidence: []
};
```

`reasons`와 `missingEvidence`는 화면 문장을 직접 저장하지 않고 안정적인 코드나 translation key로 반환한다. 모든 사용자 표시 문구는 locale resource에서 번역한다.

## 10. 서버 구현 필수 규칙

- 운영 서버가 공식 산출과 상태 라우팅을 수행한다.
- 입력 점수의 범위, 결과지 소유자, 지원자 ID, 직무 ID, 평가자 권한을 서버에서 다시 확인한다.
- `null` 또는 미수집 값을 0점으로 바꾸지 않는다.
- 데모 `synthetic` 값과 운영 `production` 값을 혼합하지 않는다.
- 성별, 연령, 출신지역, 학교 등 보호·비직무 정보는 산식에서 제외한다.
- 가중치, 임계값, 역할 프로파일, 조직·직무 ID, 모델 버전과 변경 이력을 저장한다.
- 같은 입력과 같은 규칙 버전에는 같은 결과를 반환하도록 결정적으로 구현한다.
- 산출 근거와 원본 평가 변경 이력을 감사 로그에 남긴다.
- 직무별 표본이 `minimumCohortSize` 미만이면 새 역할 프로파일을 생성하지 않는다.

## 11. 개발 완료 검증

1. 데모 고정값을 제거해도 운영 adapter 응답으로 동일 UI가 렌더링되는지 확인한다.
2. 누락값이 0점으로 계산되지 않고 `incomplete` 또는 `hold`로 처리되는지 확인한다.
3. 경계값 69/70, 74/75, 84/85와 대안 직무 점수 차이 7/8을 단위 테스트한다.
4. 복수 추천 경로의 점수 차이 4/5를 테스트한다.
5. 규칙 버전과 구성 점수가 API 응답 및 감사 로그에 남는지 확인한다.
6. 운영 모드에서 API 오류가 발생할 때 데모값으로 대체되지 않는지 확인한다.
7. 15개 언어에서 상태·근거 코드가 번역되고 원시 key가 노출되지 않는지 확인한다.
