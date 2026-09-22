# K-PASS Dashboard Result Data Contract

이 문서는 소속관리·결과지·서버 개발자가 세 대시보드에 데이터를 연결할 때 사용하는 프런트엔드 계약이다. 화면 계산은 정규화된 `classes` 배열만 사용하며 서버 원본 필드는 adapter에서 보존한다.

## 조회 범위와 URL context

- 학급용: `homeroom.html?schoolId={schoolId}&classId={classId}`
- 학교 전체: `school.html?schoolId={schoolId}`
- 학과별: `track.html?schoolId={schoolId}&departmentId={departmentId}`
- 공통 선택값: `organizationId`, `assessmentCycleId`, `assessmentType`, `lang`

URL의 다른 query와 hash는 언어 변경 후에도 유지된다. 서버 경로는 `dashboard-runtime-config.js`의 `endpoints`로 변경할 수 있고, 복잡한 인증·GraphQL·BFF가 필요하면 `window.KPASSDashboardTransport.load(request)`를 구현한다.

## 응답 envelope

```json
{
  "meta": {
    "requestId": "req-2026-001",
    "generatedAt": "2026-09-22T09:00:00Z",
    "organizationId": "org-1",
    "schoolId": "school-1",
    "assessmentCycleId": "2026-2",
    "assessmentType": "K-PASS",
    "testedAt": "2026-09-20T01:00:00Z",
    "policy": {
      "version": "school-approved-2026-2",
      "hi": 120,
      "lo": 85,
      "crisis": 80,
      "crisisCount": 2,
      "lrGap": 11,
      "lrGap5": 12,
      "lrImb": 20,
      "spread": 40,
      "profileStrengthGap": 10
    },
    "schoolMeans": {"planning": 101.2, "attention": 99.8, "simultaneous": 102.1, "successive": 98.7}
  },
  "classes": []
}
```

단일 학급 API는 `class` 한 건을 반환해도 된다. `data.classes`, `data.class` envelope도 adapter가 허용한다.

## Class

```json
{
  "id": "class-2-3",
  "classId": "class-2-3",
  "schoolId": "school-1",
  "departmentId": "dept-business",
  "label": "2학년 3반",
  "grade": 2,
  "enrolled": 24,
  "trainingRate": 42,
  "testedAt": "2026-09-20T01:00:00Z",
  "careerTrackCode": "ICT",
  "students": []
}
```

`id`, `label`, `students`는 필수다. `enrolled`는 검사 완료율의 분모, `trainingRate`는 인지훈련 참여율에 사용한다.

## Student result

```json
{
  "id": "anonymous-display-id",
  "studentId": "student-internal-id",
  "userId": "user-id",
  "resultId": "result-id",
  "testId": "test-id",
  "assessmentType": "K-PASS",
  "assessmentCycleId": "2026-2",
  "testedAt": "2026-09-20T01:00:00Z",
  "ageYears": 8,
  "ageMonths": 5,
  "ageLabel": "8세 5개월",
  "scores": {
    "planning": 101,
    "attention": 99,
    "simultaneous": 97,
    "successive": 98,
    "iq": 100
  },
  "careerAptitude": {
    "profileName": "융합 문제해결형",
    "summary": "전체 구조를 파악하고 실행 계획으로 옮기는 강점이 두드러집니다."
  },
  "careerTop5": [
    {"rank": 1, "jobCode": "DATA_ANALYST", "name": "데이터 분석가", "fitScore": 91, "strengths": ["PLAN", "ATT"]},
    {"rank": 2, "jobCode": "PRODUCT_MANAGER", "name": "디지털 제품기획자", "fitScore": 88, "strengths": ["PLAN", "SIM"]}
  ],
  "cognitiveProfile": {
    "type81": "external-contract-value",
    "processingType": "balanced"
  }
}
```

필수 점수는 Planning, Attention, Simultaneous, Successive 네 표준점수다. adapter는 `PLAN/planning/plan`, `ATT/attention/att`, `SIM/simultaneous/sim`, `SUC/successive/sequential/suc` 별칭을 허용한다. IQ, 81유형, 원본 인지특성, `resultId`, `userId`, `testId`는 현재 UI에서 사용하지 않더라도 삭제하거나 개명하지 않고 학생 객체에 보존한다.

학생 이름 대신 권한에 맞는 표시용 익명 ID를 `id`로 내려야 한다. 실명 표시가 필요하면 소속관리 서버에서 권한을 확인한 뒤 별도 필드를 제공한다.

## 결과지에서 연결할 위치 — 개발자 필독

대시보드는 결과지 화면의 HTML을 읽지 않는다. 결과지를 만든 서버 원본/결과 JSON에서 아래 값을 BFF 응답의 학생 객체로 복사한다. **결과지와 대시보드가 같은 계산 결과를 공유**해야 하며 대시보드에서 점수나 진로 결과를 다시 임의 산출하지 않는다.

| 결과지 파트 | 결과지 원본 후보 경로 | 대시보드 정규화 경로 | 용도 |
|---|---|---|---|
| 점수 요약 | `result.scoreSummary`, `result.scores`, `standardScores` | `student.scores.planning`, `.attention`, `.simultaneous`, `.successive` | 세 대시보드의 평균·분포·지원 등급·학생 비교 전체 |
| 전체/IQ | `result.scoreSummary.iq`, `result.scores.iq` | `student.scores.iq` | 계약 보존 필드. 화면 확장 시 사용 |
| 진로 적성 | `result.careerAptitude`, `result.career.aptitude` | `student.careerAptitude` | 학과별 대시보드의 학생 진로적성 요약 |
| 직무 Top 5 | `result.careerTop5`, `result.jobTop5`, `result.career.top5`, `result.careerAptitude.topJobs` | `student.careerTop5[0..4]` | 학생별 추천 직무·진로군 Top 5 |
| 검사 식별자 | 결과 저장 레코드의 ID | `resultId`, `testId`, `userId`, `studentId` | 중복 제거·추적·상세 결과지 연결 |
| 검사일 | `testedAt`, `completedAt`, `assessedAt` | `student.testedAt` 또는 `class.testedAt` | 검사일 표시·재검사 권장 시점 |
| 연령 | 검사 시점의 `ageYears`, `ageMonths` | 동일 필드 | 5세 S/Q 기준 적용. 현재 나이가 아니라 검사 시점 나이 사용 |

### 권장 BFF 매핑 예시

```js
function toDashboardStudent(result) {
  return {
    id: result.displayStudentId,
    studentId: result.studentId,
    userId: result.userId,
    resultId: result.id,
    testId: result.testId,
    testedAt: result.testedAt,
    ageYears: result.ageAtTest?.years,
    ageMonths: result.ageAtTest?.months,
    scores: {
      planning: result.scoreSummary.planning.standardScore,
      attention: result.scoreSummary.attention.standardScore,
      simultaneous: result.scoreSummary.simultaneous.standardScore,
      successive: result.scoreSummary.successive.standardScore,
      iq: result.scoreSummary.iq?.standardScore
    },
    careerAptitude: result.careerAptitude,
    careerTop5: result.careerTop5
  };
}
```

실제 결과지 속성명이 다르면 **서버/BFF의 위 매핑 함수만 변경**한다. 프런트 adapter는 호환을 위해 위 표의 후보 별칭을 받지만, 신규 개발은 정규화 경로를 사용한다. `careerTop5` 항목은 최소 `rank`, `name`이 필요하며 가능하면 `jobCode`, `fitScore`, `strengths` 또는 `fitReason`도 제공한다.

API는 요청의 `Accept-Language`에 맞춰 `careerAptitude.summary`, `careerTop5[].name`, `fitReason`을 현지화해서 반환하거나, 프런트 locale resource에서 해석 가능한 안정적인 `messageKey/jobCode`를 함께 제공한다. 학생별 결과 문장을 한국어 한 언어로만 저장해 다른 언어 화면에 그대로 노출하지 않는다.

실사용 모드에서 `careerTop5`가 없으면 화면은 “결과지 연동 필드 확인”을 표시한다. 공개 샘플에서만 내장 직무 라이브러리 계산을 사용하므로 실제 학생에게 임의 계산값이 노출되지 않는다.

## 집계·개인화 규칙

- 동일 학생 결과가 여러 건이면 `testedAt/completedAt/assessedAt/resultDate/updatedAt` 중 최신 시각의 결과 한 건만 사용한다. 서버에서도 해당 `assessmentCycleId` 범위의 최신 결과만 내려주는 것을 권장한다.
- 점수 네 개 중 하나라도 없거나 40~200 범위를 벗어나면 해당 학생은 집계에서 제외하고 제외 건수를 알린다. 유효 학생이 0명인 학급/학과는 표시하지 않는다.
- 학급 API에서 학교 평균을 비교하려면 `class.schoolMeans`, `class.comparison.schoolMeans` 또는 `meta.schoolMeans`를 반드시 제공한다. 한 학급 데이터만 받은 상태에서 그 학급을 “학교 평균”으로 재사용하지 않는다.
- `policy`는 학교/검사 버전별 승인 기준이다. 서버 값이 있으면 화면 문구와 계산이 함께 갱신된다. `version`과 시행일은 서버 감사 로그에 보존한다.
- 학과 ID가 UUID인 경우 내장 샘플 코드와 혼동하지 않도록 `careerTrackCode`를 별도로 제공한다. 실사용 Top 5는 이 코드가 아니라 결과지 `careerTop5`가 우선이다.

## 실행 모드

- `data=sample`: 명시적으로 샘플 사용
- `data=live`: 명시적으로 실제 API 사용
- `auto`: localhost와 `file:`은 sample, 배포 hostname은 live

공개 데모 보호를 위해 저장소 기본 설정은 `sample`이다. 실사용 서버에 배포할 때 개발자가 `dashboard-runtime-config.js`의 `dataMode`를 `live`로 변경한다.

실사용 환경에서 API 오류가 나면 샘플로 위장하지 않고 오류 화면을 표시한다. 서버 개발 중 임시 fallback이 꼭 필요할 때만 `allowSampleFallback:true`를 명시한다.

## 보안 및 저장

- API 요청은 기본적으로 same-origin, `credentials: include`다.
- 상담 메모와 조치 상태의 서버 저장은 별도 개발 범위다. 현재 브라우저 localStorage는 데모용이다.
- 서버는 조직·학교·학급·학과 권한을 매 요청마다 검증해야 한다.
- 브라우저에 전달되는 데이터는 현재 화면에 필요한 최소 범위로 제한한다.
