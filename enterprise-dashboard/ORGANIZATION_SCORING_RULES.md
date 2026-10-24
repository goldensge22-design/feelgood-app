# 조직·팀 분석 산출 규칙 v1.0

이 문서는 조직·팀 화면의 직무 확보율, 역할 경로 구성, 부서 비교, 승계 후보와 내부 이동 가능 경로를 계산하는 기본 계약이다. 공개 데모는 합성 직원 25명의 승인된 업무평가 기록으로 아래 산식을 실제 실행한다. 운영판의 공식 산출은 서버가 수행한다.

## 1. 입력과 포함 조건

- D-CAS 직무 신호 `dcasScore`
- 관리자가 승인한 업무성과 `workPerformanceScore`
- 관리자가 승인한 역할·행동 근거 `roleEvidenceScore`
- PASS 네 영역, 부서, 현재 직무, 역할별 점수
- 직무별 필요 인원과 목표 확보율

`approved`이면서 필수값이 완전한 기록만 포함한다. 누락값을 0으로 대체하지 않는다. 부서·경로별 인원이 `minimumCohortSize` 미만이면 집계 결과를 표시하지 않는다.

## 2. 직원 직무역량 신호

```text
capabilityScore = dcasScore × 0.40
                + workPerformanceScore × 0.45
                + roleEvidenceScore × 0.15
```

80점 이상은 확보 인원 1명, 70–79점은 성장 인원 0.5명, 70점 미만은 확보 인원에 포함하지 않는다.

## 3. 직무별 인재 확보율

```text
effectiveHeadcount = Σ(확보 인원 환산값)
jobCoverage = min(100, effectiveHeadcount / requiredHeadcount × 100)
gap = targetCoverage - jobCoverage
```

직무 목표를 초과해도 화면의 확보율은 100%로 제한한다. 최대 역량 공백은 양의 `gap` 가운데 최댓값이다.

## 4. 역할 경로 구성

각 직원의 `leader`, `projectLead`, `specialist`, `practitioner` 점수 중 최고 역할을 주 경로로 배정한다. 동점은 서버에 저장된 안정적 역할 순서를 사용한다.

```text
rolePercent = primaryRoleCount / includedMemberCount × 100
```

## 5. 부서 비교

- `leaderReady`: 리더 점수 80 이상이면서 직무역량 신호 75 이상
- `specialistReady`: 전문가 점수 80 이상이면서 직무역량 신호 75 이상
- `coverage`: 해당 부서 직무 확보율의 평균
- `priorityGap`: 목표 대비 공백이 가장 큰 직무

부서 인원이 최소 표시 인원보다 작으면 행 자체를 생성하지 않는다.

## 6. 승계 후보

```text
readyNow   = roleScore >= 80 and capabilityScore >= 75
readyLater = 70 <= roleScore < 80 and capabilityScore >= 70
effectivePool = readyNow + readyLater × 0.5
successionGap = max(0, ceil(requiredRoleCount - effectivePool))
```

리더, 프로젝트 책임자, 전문가 경로를 각각 계산한다.

## 7. 내부 직무 이동 가능 경로

다음 조건을 모두 만족할 때만 후보 경로에 포함한다.

1. 목표 직무 신호 75 이상
2. 목표 직무 신호가 현재 직무역량 신호보다 8점 이상 높음
3. D-CAS 추천 직무 목록에 목표 직무가 포함됨
4. 동일 이동 경로의 인원이 `minimumCohortSize` 이상

이 값은 이동 확정이 아니라 인력계획 검토용 집계 신호다.

## 8. 운영 응답

```js
organizationAnalysis = {
  ruleVersion: "enterprise-organization-v1.0",
  organizationAverage: { planning, attention, simultaneous, sequential },
  roleReadiness: [{ role, count, percent }],
  jobCoverage: [{ job, current, target }],
  departments: [{ department, headcount, leaderReady, specialistReady, coverage, gap }],
  succession: [{ role, readyNow, readyLater, gap }],
  internalMobility: [{ from, to, count }]
};
```

운영 서버는 규칙 버전, 산출시각, 포함·제외 인원수와 원본 평가 버전을 함께 기록한다.
