# 기업 인재전략 대시보드 데이터 계약

## 연결 위치

대시보드는 [`data-adapter.js`](./data-adapter.js)의 `loadDashboardData(context)`만 호출한다. 운영 시스템은 페이지 로드 전에 다음 전역 adapter를 제공하면 된다.

```js
window.FeelGoodEnterpriseAdapter = {
  async loadDashboardData(context) {
    // context: reportId, api, organIdx, base, lang
    const response = await fetch(/* 회사 API */);
    return normalizeEnterpriseDashboard(await response.json());
  }
};
```

adapter가 없으면 [`mock-data.js`](./mock-data.js)의 가상 데이터가 사용된다. UI 파일에 개인 점수나 고정 판정값을 넣지 않는다.

## 결과지 연결 필드

### 점수 요약

결과지의 점수 요약 파트에서 다음 값을 연결한다.

```js
candidate.pass = {
  planning: Number,
  attention: Number,
  simultaneous: Number,
  sequential: Number
};
```

원점수, 표준점수, 백분위 중 어떤 값을 쓰는지는 서버 계약에서 명시하고 한 화면에서 혼합하지 않는다. 현재 데모는 0–100 정규화 예시다.

### 결과지의 직무 Top 5

결과지에 이미 제공되는 진로·적성 또는 추천 직무 Top 5를 다음 필드로 연결한다.

```js
candidate.topJobs = [
  ["productStrategy", 88],
  ["businessPlanning", 86],
  ["projectManagement", 82],
  ["servicePlanning", 79],
  ["dataPlanning", 75]
];
```

첫 값은 회사 직무 taxonomy ID, 두 번째 값은 D-CAS 결과지에서 제공하는 0–100 추천 신호다. 결과지 직무명과 회사 직무명이 다르면 서버 또는 adapter에서 mapping한다. 이 값은 이력서 기반 매칭과 합산하지 않는다.

### 지원자 명단·이력서 연결

채용시스템의 지원자 명단은 `candidate.id`를 기준으로 D-CAS 결과지와 연결한다. 실제 지원 직무는 검사에서 추정하지 않고 채용시스템 또는 담당자 입력값을 사용한다.

```js
candidate.appliedJob = "productStrategy";
candidate.appliedJobSource = "recruitmentSystem"; // 또는 managerInput
candidate.reportId = "DCR-2026-2401";
candidate.assessedAt = ISODateString;
candidate.resume = {
  fileId: String,       // 운영 서버의 보안 저장소 ID
  fileName: String,
  updatedAt: ISODateString
};
candidate.resumeTopJobs = [
  ["productStrategy", 84],
  ["projectManagement", 81],
  ["businessPlanning", 78]
];
```

`resumeTopJobs`는 이력서의 경력·기술·프로젝트 근거로 별도 계산한다. `topJobs`(D-CAS), `resumeTopJobs`(이력서), `fit`(실제 지원 직무와 기업 모델)을 서로 다른 출처로 저장하고 UI에서도 분리해 표시한다. 데모는 개인정보 보호를 위해 파일 자체를 저장하거나 전송하지 않고 파일명 메타데이터만 브라우저에 보관한다. 운영판의 업로드·악성파일 검사·권한·보유기간·삭제는 서버에서 구현한다.

### 결과지의 인지특성과 81유형

기존 외부 계약의 인지특성, 81유형, 결과 유형, 연령·경력, 사용자·검사·결과 ID를 삭제하거나 이름을 바꾸지 않는다. UI에 바로 사용하지 않더라도 `source` 아래 보존한다.

```js
candidate.source = {
  reportId: String,
  resultId: String,
  userId: String,
  testId: String,
  resultVersion: String,
  testedAt: ISODateString,
  cognitiveType: String,
  type81: String,
  raw: Object
};
```

## 표준화 데이터 최소 구조

```js
{
  meta: {
    mode: "production",
    dataProvenance: "production|synthetic",
    scoreScale: "normalized0to100|normalizedDemo0to100",
    organizationName: String,
    cycle: String,
    modelId: String,
    modelVersion: String,
    updatedAt: ISODateString,
    minimumCohortSize: Number,
    analyzedCount: Number,
    priorityReviewCount: Number,
    leaderReviewCount: Number,
    capabilityGapCount: Number
  },
  passDomains: ["planning", "attention", "simultaneous", "sequential"],
  organizationAverage: {
    planning: Number,
    attention: Number,
    simultaneous: Number,
    sequential: Number
  },
  employeeProfileWeights: {
    dcas: Number,
    workPerformance: Number,
    roleEvidence: Number
  },
  employeeSuccessProfiles: [{
    job: String,
    sampleSize: Number,
    dcasScore: Number,
    workPerformanceScore: Number,
    roleEvidenceScore: Number,
    profile: String
  }],
  employeePerformanceRecords: [{
    employeeId: String,
    job: String,
    profile: String,
    reviewPeriod: String,
    dcasScore: Number,
    workPerformanceScore: Number,
    roleEvidenceScore: Number,
    evaluatorRole: String,
    status: "draft|approved",
    updatedAt: ISODateString
  }],
  candidateEvaluations: [{
    candidateId: String,
    jobCompetencyEvidence: Number,
    coreValueBehavior: Number,
    workSampleScore: Number,
    evaluatorRole: String,
    status: "draft|approved",
    updatedAt: ISODateString
  }],
  roleReadiness: [
    { role: "leader|projectLead|specialist|practitioner", count: Number, percent: Number }
  ],
  profiles: [
    {
      id: String,
      role: String,
      type: String,
      sampleSize: Number,
      confidence: Number,
      pass: { planning: Number, attention: Number, simultaneous: Number, sequential: Number },
      strengths: [String]
    }
  ],
  candidates: [
    {
      id: String,
      name: String,
      reportId: String,
      assessedAt: ISODateString,
      appliedJob: String,
      appliedJobSource: "recruitmentSystem|managerInput",
      status: "priority|validate|alternate|hold",
      fit: Number,
      readiness: Number,
      leaderPotential: Number,
      expertPotential: Number,
      recommendedPath: "leader|projectLead|specialist|practitioner",
      pass: Object,
      topJobs: [[String, Number]],
      resume: { fileId: String, fileName: String, updatedAt: ISODateString } | null,
      resumeTopJobs: [[String, Number]],
      evidence: [TranslationKey],
      verify: [TranslationKey],
      workStyle: [TranslationKey],
      priorities: [TranslationKey],
      actions: [TranslationKey],
      source: Object
    }
  ],
  jobCoverage: [{ job: String, current: Number, target: Number }],
  actions: [{ id: String, type: String, subject: String, owner: String, due: ISODateString, status: String }],
  reviewStageCompletion: [{ type: String, value: Number }],
  accessRoles: [{ role: String, access: String }]
}
```

## 사내 역할 기준 생성 원칙

1. 기존 직원의 결과만으로 성공 기준을 만들지 않는다.
2. 직무, 역할, 근속기간, 검증된 업무성과와 복수 평가 근거를 연결한다.
3. 한 명의 우수 직원을 기준으로 사용하지 않고 역할별 복수 성공 프로파일을 만든다.
4. 비교 집단이 `minimumCohortSize`보다 작으면 개인 식별이 가능한 집단 통계를 제공하지 않는다.
5. 성별, 연령, 출신지역, 학교 등 비직무·보호 정보는 적합도 계산에서 제외한다.
6. `leaderPotential`은 자동 선발 점수가 아니라 추가 검토 신호다.

## 직무별 기업 인재상과 결과지 단독 신호

기업 인재상은 동일 직무 기존 직원의 D-CAS 결과와 검증된 업무성과를 함께 사용한다. 업무성과가 없는 지원자에게 기존 직원의 성과점수를 복사하거나 추정하지 않는다.

```js
employeeProfileWeights = {
  dcas: 40,
  workPerformance: 45,
  roleEvidence: 15
};

employeeSuccessProfiles = [{
  job: "productStrategy",
  sampleSize: 18,
  dcasScore: 82,
  workPerformanceScore: 91,
  roleEvidenceScore: 86,
  profile: "strategyLeader"
}];
```

- `dcasScore`: 동일 직무 기존 직원 집단의 D-CAS 직무 관련 정규화 점수
- `workPerformanceScore`: KPI 하나가 아니라 회사가 검증한 복수 업무성과 근거의 정규화 점수
- `roleEvidenceScore`: 역할수준·행동평가·협업 등 검증된 직무 행동 근거
- `sampleSize`: 프로파일 산출에 포함된 기존 직원 수이며 최소 집단 기준 이상이어야 한다.

`candidate.topJobs`는 결과지만으로 계산된 직무 추천 신호다. 실제 업무성과가 없으므로 “직무 우수자” 확정값이나 `employeeSuccessProfiles`의 성과연계 점수로 표시하지 않는다. UI에서는 “직무 잠재부합 후보”로 분리하고 면접·업무과제·경력 확인을 요구한다.

### 지원자 기업 평가와 두 인재상 비교

지원자별 `candidate.pass`와 `candidate.topJobs`는 연결된 D-CAS 결과지에서만 읽으며 기업 평가자가 수정하지 못한다. 기업 평가자는 지원 직무에 대해 다음 세 항목만 입력한다.

- `jobCompetencyEvidence`: 면접·경력·직무 수행 근거를 확인한 직무역량 점수
- `coreValueBehavior`: 기업 핵심가치에 부합하는 관찰 행동 점수
- `workSampleScore`: 업무 과제 또는 시뮬레이션 평가 점수

대시보드는 다음 두 신호를 분리해 나란히 제공한다.

1. **기업 평가 + D-CAS 인재상:** 지원 직무에 대한 기업 평가 3개 항목과 D-CAS/PASS 인지특성을 함께 반영한다.
2. **D-CAS/PASS 기반 잠재 인재상:** 기업 평가를 섞지 않고 결과지의 추천 직무 Top 5와 잠재 신호를 그대로 사용한다.

두 값의 방향이 다르면 오류로 덮어쓰지 않고 면접·업무과제·지원 직무 근거를 다시 확인하도록 표시한다. 운영 서버는 아래 저장 메서드를 구현하고 평가자 권한, 0~100 범위, 감사 이력, 동시수정 버전을 검증한다.

UI는 두 신호의 공통 수준과 차이를 반영한 0~100 **기업 인재상 부합 신호**를 함께 산출한다. 기업 담당자는 이 값을 면접 우선순위와 직무군별 인재 발탁 기준에 활용하고, 조직별 운영 기준과 구간을 서버 정책으로 설정할 수 있다. 지원 직무와 D-CAS 추천 1순위가 같으면 공통 직무군으로, 다르면 두 직무를 교차 검토 직무군으로 표시한다.

```js
window.FeelGoodEnterpriseAdapter = {
  async loadDashboardData(context) { /* ... */ },
  async saveCandidateEvaluations({ records, context }) {
    return api.saveCandidateEvaluations(records, context);
  }
};
```

### 관리자 업무성과 입력과 분석 반영

직원별 D-CAS 직무 신호는 결과지 adapter가 제공하는 읽기 전용 값이다. 관리자는 `workPerformanceScore`와 `roleEvidenceScore`만 입력하며, 평가기간·평가자 역할·상태·수정시각을 함께 저장한다. 임시저장(`draft`) 기록은 분석에서 제외하고 승인(`approved`)된 기록만 직무별 평균과 성과연계 기업 인재상 계산에 사용한다.

```js
window.FeelGoodEnterpriseAdapter = {
  async loadDashboardData(context) { /* ... */ },
  async saveEmployeePerformanceRecords({ records, context }) {
    // 서버에서 관리자 권한, 0~100 범위, 평가기간, 동시수정 버전을 검증하고 감사 이력을 남긴다.
    return api.savePerformanceRecords(records, context);
  }
};
```

운영 서버는 화면에서 전달된 `dcasScore`, `employeeId`, `job`을 신뢰하지 않고 결과지·인사 마스터와 다시 대조해야 한다. 동일 직원·직무·평가기간의 중복 레코드를 방지하고, 승인 취소와 변경 이력을 보존한다. 직무별 승인 표본이 `minimumCohortSize`보다 작으면 새 집계값을 공개하지 않고 마지막 승인 기준 또는 “표본 부족” 상태를 반환한다. 데모판만 브라우저 `localStorage`를 사용한다.

## 판정 상태

- `priority`: 직무 기준과 부합 근거가 충분하여 우선 검토
- `validate`: 구조화 면접이나 과제에서 추가 확인
- `alternate`: 다른 직무에서 강점 활용 가능성 검토
- `hold`: 데이터 부족 또는 결과 불일치로 판단 보류

각 상태의 실제 활용 기준과 후속 절차는 기업 담당자가 운영 정책으로 정한다.

## 보안과 권한

- 상세 결과는 승인된 HR 담당자에게만 기본 제공한다.
- 현업 면접관과 관리자는 업무상 필요한 요약만 제공한다.
- 경영진 화면은 비식별 집단 통계를 기본으로 한다.
- 서버에서 역할 기반 접근권한을 강제하며 프런트엔드 숨김만 사용하지 않는다.
- 열람·다운로드·인쇄·변경 이력을 서버에 기록한다.
- 개인정보 열람·정정·결과 활용 설명 요청은 회사의 기존 개인정보 문의 채널과 연결한다.

## 실패 처리

- 점수가 없으면 0으로 대체하지 않고 `null` 또는 명시적 미수집 상태를 사용한다.
- 결과 버전이 다르면 adapter에서 단위를 확인한 후 정규화한다.
- API 실패 시 이전 개인 데이터를 다른 사용자에게 재사용하지 않는다.
- production adapter 오류를 mock 데이터로 조용히 대체하지 않는다. 데모 모드와 운영 모드를 명확히 구분한다.

## 공개 데모 데이터 원칙

공개 데모는 `meta.mode = "demo"`, `meta.dataProvenance = "synthetic"`로 표시한다. 인원수, 점수, 매칭률, 업무성과, 역할근거, 진행률, 날짜와 ID는 모두 기능 설명용 가상값을 사용한다. 화면의 퍼센트는 0–100 정규화 가상 예시 신호다. 운영 adapter는 이 표시를 `production`으로 바꾸고 실제 API 데이터로 전체 필드를 교체해야 하며 데모값과 운영값을 혼합하지 않는다.

