# 기업 인재전략 대시보드 개발자 전달서

## 구현 기준 문서

개발자는 다음 순서로 문서를 확인한다.

1. [`TALENT_SCORING_RULES.md`](./TALENT_SCORING_RULES.md): 준비도·역할 잠재력·추천 경로·판정 상태의 공식 기본 규칙
2. [`DATA_CONTRACT.md`](./DATA_CONTRACT.md): 결과지, 채용시스템, 이력서 분석, 기업 평가와 adapter 데이터 계약
3. [`PRODUCT_PLAN.md`](./PRODUCT_PLAN.md): 전체 제품 목적과 화면 정보 구조
4. [`data-adapter.js`](./data-adapter.js): 운영 API를 대시보드 표준 데이터로 연결하는 진입점
5. [`mock-data.js`](./mock-data.js): 화면 확인용 합성 데이터이며 운영 산출 근거로 사용하지 않음

## 가장 중요한 구현 구분

현재 공개 데모의 아래 값은 모두 고정 합성값이다.

- `status`
- `fit`
- `readiness`
- `leaderPotential`
- `expertPotential`
- `recommendedPath`
- `roleScores`

운영판에서는 이 값을 `mock-data.js`에서 가져오거나 브라우저에서 공식 계산하지 않는다. 서버가 `TALENT_SCORING_RULES.md`에 따라 산출한 `candidate.calculation`을 adapter 응답에 포함해야 한다.

## 서버 구현 순서

1. 지원자 명단의 `candidate.id`와 D-CAS `reportId`를 연결한다.
2. 결과지에서 PASS 네 영역과 추천 직무 Top 5를 읽기 전용으로 가져온다.
3. 채용시스템에서 실제 지원 직무를 가져오고 이력서 분석 결과를 별도 출처로 연결한다.
4. 승인된 기업 평가 입력과 역할별 근거를 저장한다.
5. 준비도, 역할별 인지특성 부합도, 역할 점수와 추천 경로를 계산한다.
6. 기업 평가+D-CAS 신호와 D-CAS/PASS 기반 잠재 신호를 비교해 부합 신호를 계산한다.
7. 기본 라우팅 규칙으로 판정 상태를 만들고 근거 코드·누락 근거·규칙 버전을 함께 반환한다.
8. 프런트엔드는 반환값을 번역된 문구로 표시한다.

## API 응답 최소 확인 항목

```text
candidate.calculation.ruleVersion
candidate.calculation.calculatedAt
candidate.calculation.readiness
candidate.calculation.roleCognitiveFit
candidate.calculation.roleScores
candidate.calculation.leaderPotential
candidate.calculation.expertPotential
candidate.calculation.recommendedPaths
candidate.calculation.integratedScore
candidate.calculation.passOnlyScore
candidate.calculation.alignmentScore
candidate.calculation.status
candidate.calculation.reasons
candidate.calculation.missingEvidence
```

## 배포 전 필수 확인

- 운영 모드에서 mock 데이터가 섞이지 않는다.
- 누락값이 0으로 변환되지 않는다.
- 계산은 서버에서 동일한 규칙 버전으로 재현된다.
- 조직·직무별 임계값 변경 이력이 남는다.
- 결과지 원본값과 기업 평가값의 출처가 구분된다.
- 판정 상태와 추천 경로의 근거가 API에 포함된다.
- 이유 코드는 15개 언어 locale key와 연결된다.
- 경계값과 누락·불일치 상황의 자동 테스트가 통과한다.

## 개발자에게 전달할 한 문장

`enterprise-dashboard/DEVELOPER_HANDOFF.md`부터 확인하고, `TALENT_SCORING_RULES.md`의 v1.0 산식을 서버에서 구현한 뒤 `DATA_CONTRACT.md` 형식으로 `window.FeelGoodEnterpriseAdapter`에 반환해 주세요. 데모의 mock 판정·준비도·잠재력·추천 경로 값은 운영 데이터로 사용하지 마세요.
