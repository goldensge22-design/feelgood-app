# D-CAS 결과지 서버 연동 최소 계약

이 문서는 개발자가 점수/서버 연동만 담당할 수 있도록 브라우저 결과지에 넘길 데이터 경계를 고정한다. 서버는 결과지 문장을 만들거나 81유형 코드를 별도로 계산하지 않는다.

## 입력

결과지 스크립트가 실행되기 전에 아래 전역 객체를 주입한다.

```js
window.__TEST_PROFILE__ = {
  fullName: "홍길동",
  givenName: "길동",
  fullNameEn: "Gildong Hong",
  genderKey: "M",
  ageYears: 16,
  gradeLabel: "고등학교 1학년",
  testDate: { y: 2026, m: 9, d: 21 },
  scores: { P: 80, A: 56, S: 89, Q: 58 }
};
window.__DCAS_LANG__ = "km";
```

## 필드 규칙

| 필드 | 필수 | 규칙 |
|---|---|---|
| `fullName` | 예 | 표시 이름. HTML이 아닌 일반 문자열 |
| `givenName` | 예 | 문장 삽입용 이름 |
| `fullNameEn` | 아니오 | 영문 파일명/표지용. 없으면 `fullName` 사용 |
| `genderKey` | 예 | `M`, `F`, `X` 중 하나 |
| `ageYears` | 예 | 0 이상의 정수 |
| `gradeLabel` | 예 | 서버가 확정한 교육단계 표시 문자열 |
| `testDate` | 예 | `{y,m,d}` 정수. 표시는 locale formatter 사용 |
| `scores.P/A/S/Q` | 예 | 각각 0~100 유한 숫자. 정답률 |
| `__DCAS_LANG__` | 예 | BCP 47 또는 지원 alias. 캄보디아어는 `km`/`km-KH` |

## 책임 분리

서버/점수 시스템:

- 사용자·검사 식별과 권한
- 원점수 산출 및 P/A/S/Q 정답률 확정
- 위 객체의 검증·주입
- locale 저장과 전달

결과지:

- H/M/L 판정(0~52 L, 53~74 M, 75~100 H)
- 81유형 코드/유형명
- ALL_L / ALL_M / ALL_H
- S/Q 차이 0~10 균형, 11 이상 우세
- locale 문구 선택과 PDF 렌더링

두 계층이 같은 판정을 중복 구현하면 경계값 불일치가 생길 수 있으므로 서버는 `typeName`, `level`, `dominance` 같은 파생 문자열을 필수 입력으로 만들지 않는다.

## 실패 처리

- 점수 누락, `NaN`, 무한값, 범위 밖 값은 결과 생성 중단 및 내부 오류 로그
- 사용자 화면에는 translation key가 아닌 locale 오류 안내 표시
- locale 리소스 로딩 실패 시에만 명시적 fallback 적용
- fallback을 번역 완료로 집계하지 않음
- 사용자 입력은 `innerHTML`에 직접 삽입하지 않음

## 개발자 연결 지점

현재 청소년은 HTML의 `PROFILE`이 `window.__TEST_PROFILE__`을 읽고, 성인은 `dcas-adult-content-engine.js`가 같은 객체를 읽는다. 따라서 서버 템플릿 또는 초기 bootstrap에서 객체를 먼저 주입하면 점수 연동을 위해 결과지 엔진을 다시 작성할 필요가 없다.

전체 캄보디아어 locale가 완성되면 언어 전환은 `window.__DCAS_LANG__` 갱신 후 공용 locale runtime과 기존 content engine의 render를 호출하는 한 경로로 통합한다.
