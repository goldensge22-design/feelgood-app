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

## 판정 상태

- `priority`: 직무 기준과 부합 근거가 충분하여 우선 검토
- `validate`: 구조화 면접이나 과제에서 추가 확인
- `alternate`: 다른 직무에서 강점 활용 가능성 검토
- `hold`: 데이터 부족 또는 결과 불일치로 판단 보류

어떤 상태도 자동 합격·탈락을 의미하지 않는다.

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

