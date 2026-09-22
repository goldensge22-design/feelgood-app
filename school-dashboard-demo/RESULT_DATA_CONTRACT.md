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
    "assessmentType": "K-PASS"
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
  "cognitiveProfile": {
    "type81": "external-contract-value",
    "processingType": "balanced"
  }
}
```

필수 점수는 Planning, Attention, Simultaneous, Successive 네 표준점수다. adapter는 `PLAN/planning/plan`, `ATT/attention/att`, `SIM/simultaneous/sim`, `SUC/successive/sequential/suc` 별칭을 허용한다. IQ, 81유형, 원본 인지특성, `resultId`, `userId`, `testId`는 현재 UI에서 사용하지 않더라도 삭제하거나 개명하지 않고 학생 객체에 보존한다.

학생 이름 대신 권한에 맞는 표시용 익명 ID를 `id`로 내려야 한다. 실명 표시가 필요하면 소속관리 서버에서 권한을 확인한 뒤 별도 필드를 제공한다.

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
