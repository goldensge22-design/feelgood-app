# 결과지 서버 연동 — 개발자 최소 작업

서버는 아래 공통 payload 한 개만 HTML보다 먼저 주입한다. `result-report-adapter.js`가 K-PASS와 D-CAS의 기존 `window.__TEST_PROFILE__` 형태로 변환한다.

```html
<script src="/result-reports/integration/result-report-adapter.js"></script>
<script>
  ResultReportAdapter.install({
    schemaVersion: 1,
    reportKind: "dcas-adult",
    locale: "km",
    person: {
      fullName: "홍길동",
      givenName: "길동",
      fullNameEn: "Gildong Hong",
      genderKey: "M",
      ageYears: 23,
      ageMonths: 0,
      gradeLabel: "대학교 4학년",
      majorName: "컴퓨터공학과"
    },
    test: { date: { y: 2026, m: 9, d: 21 } },
    scores: { P: 80, A: 56, S: 89, Q: 78 }
  });
</script>
<!-- 그 다음 기존 결과지 HTML/스크립트 로드 -->
```

## 서버 책임

- 검사자·결과 접근 권한과 식별자
- 확정 점수 전달
- locale 저장/전달
- K-PASS 공식 전체척도 `scores.fullScale` 전달
- XSS가 없는 일반 문자열 전달

## 결과지 책임

- 점수 경계와 유형 계산
- 개인화 문장 선택
- locale 문구와 날짜/숫자 표시
- 그래프/DOM/PDF 렌더링

서버가 유형명, H/M/L, 우세형 문장을 중복 계산하지 않는다. 중복 계산은 52/53, 74/75, 10/11 같은 경계가 서로 어긋나는 원인이 된다.

## locale 안전 규칙

adapter는 요청 locale를 `window.__REPORT_LOCALE__`에 저장한다. 지원 locale는 `ko/en/ja/zh/es/ru/vi/th/ar/it/az/km`이며 지역 코드가 붙은 값은 base locale로 표시한다. 미지원 locale만 한국어로 fallback한다.

## K-PASS 필수 차이

- 표준점수 4축: `P/A/S/Q`
- 공식 전체척도: `scores.fullScale` 필수. 없으면 후보본은 미리보기용 평균을 사용하지만 운영에서는 누락 오류로 처리해야 한다.
- `ageMonths` 사용

## D-CAS 필수 차이

- 0~100 정답률 4축: `P/A/S/Q`
- 전체척도 없음
- `gradeLabel` 사용
- 성인은 `majorName` 필수. adapter가 기존 엔진 프로필까지 전달한다.
- H/M/L: L 0~52, M 53~74, H 75~100
- S/Q: 차이 0~10 균형, 11 이상 높은 축 우세

## 로드 순서

1. `result-report-adapter.js`
2. 서버 payload와 `ResultReportAdapter.install(payload)`
3. 결과지의 데이터 bank
4. 결과지 content engine
5. HTML render
6. HTML 하단의 locale bundle과 `report-i18n-runtime.js`

개발자가 결과지 내부의 예시 `DEFAULT_PROFILE`을 직접 찾아 바꾸지 않는다. 예시값은 서버 데이터가 없을 때 로컬 미리보기에만 사용된다.

성인 전공이 기존 목록에 없으면 입력값을 그대로 표시하고 추천 매핑 미연결 안내를 사용한다. 컴퓨터공학과로 조용히 대체하지 않는다.
