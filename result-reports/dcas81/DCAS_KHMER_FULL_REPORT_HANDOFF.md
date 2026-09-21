# D-CAS 캄보디아어 전체 결과지 인계

기준 브랜치: `codex/dcas81-khmer-final`  
기준 원본 보존 commit: `d85af1c48050cf9447ef3a6f7e7610aa2905b0da`  
81유형 기능 기준 commit: `91c6b8fe502e407dd9f45b7e0432381f3a3e52df`

## 현재 완료된 범위

청소년과 성인 양쪽 `dcas-profile81-bank.js`에 캄보디아어(`km`, Khmer)를 추가했다.

- P/A/S/Q 축 이름
- H/M/L 단계 이름
- 81개 코드 조합
- 유형 제목과 요약
- 4축 정적 문장 조합
- 학습/업무 방식
- 진로·학과 및 직업/직무 추천 문장
- ALL_L / ALL_M / ALL_H
- 화면에 주입되는 81유형 요소의 `lang="km"`
- `km-KH` locale 정규화
- LTR 방향

이 번역은 `LOCALE_META.km.status = "ai-draft"`로 추적한다. 운영 확정 전 캄보디아어 원어민/전문가 검수가 필요하다. fallback은 빈 화면 방지용일 뿐 번역 완료 판정에 포함하지 않는다.

## 전체 결과지 현황

현재 저장된 전체 결과지는 다음 구조다.

| 결과지 | 정적 화면 | 동적 콘텐츠 엔진 | 81유형 레이어 |
|---|---|---|---|
| 청소년 | 한국어/영어 | 한국어/영어 분기 중심 | 12개 언어(캄보디아어 포함) |
| 성인 | 한국어 | 한국어 하드코딩 중심 | 12개 언어(캄보디아어 포함) |

따라서 **캄보디아어 전체 결과지는 아직 완료 상태가 아니다.** 현재 완료된 것은 81유형 레이어다. 언어 선택기에 `km`만 추가하면 본문에 한국어/영어가 섞이므로 그렇게 배포하면 안 된다.

## 개발자의 작업을 최소화하는 구현안

점수 계산과 서버 API는 건드리지 않고, 아래 세 계층으로 분리한다.

1. 서버/점수 어댑터: `window.__TEST_PROFILE__` 한 객체만 공급한다.
2. 결과지 locale: stable key 기반 `ko/en/km` 리소스를 공급한다.
3. 렌더러: `PROFILE`과 locale만 받아 기존 DOM ID에 값을 넣는다.

서버가 공급할 최소 계약:

```js
window.__TEST_PROFILE__ = {
  fullName: "...",
  givenName: "...",
  genderKey: "M|F|X",
  ageYears: 16,
  gradeLabel: "...",
  testDate: { y: 2026, m: 9, d: 21 },
  scores: { P: 80, A: 56, S: 89, Q: 58 }
};
window.__DCAS_LANG__ = "km";
```

점수는 0~100 정답률이며 키는 `P/A/S/Q`를 유지한다. 81유형 H/M/L 경계와 S/Q 11점 우세 규칙은 브라우저 결과지 엔진에 이미 있으므로 서버가 중복 판정 문자열을 내려보내지 않는 편이 안전하다.

### 권장 파일 구조

```text
DCAS_COMMON/
  dcas-report-i18n-runtime.js
  locales/
    teen.ko.js
    teen.en.js
    teen.km.js
    adult.ko.js
    adult.km.js
DCAS_TEEN/
  teen.work.html
  dcas-teen-content-engine.js
DCAS_ADULT/
  adult.work.html
  dcas-adult-content-engine.js
```

기존 `SECTIONS.ko/en`의 큰 HTML 문자열을 캄보디아어로 한 벌 더 복사하는 방식은 수정 누락과 혼재를 만들기 쉽다. 먼저 문구를 stable key로 추출하고, HTML 구조는 한 벌만 유지한다. 동적 값은 `{name}`, `{score}`, `{axis}`, `{date}` 같은 named placeholder로 처리한다.

## 개발 적용 순서

1. 청소년 `NAV`, `HEADER`, `COVER`, `SECTIONS`의 사용자 노출 문구를 stable key로 추출한다.
2. 성인 `NAV_KO`, `HEADER`, `COVER_HTML`, `SECTIONS`와 content engine의 한국어 문구를 같은 방식으로 추출한다.
3. `ko`를 기준 locale로 만들고 기존 `en` 값을 그대로 이관한다. 의미가 바뀌지 않은 기존 영어는 재번역하지 않는다.
4. `km` 전체 번역을 넣고 상태를 `ai-draft`로 기록한다.
5. 언어 선택기는 resource load/validation이 성공한 뒤 한 번에 화면을 교체한다.
6. 직무·학과 데이터는 화면 문구와 분리하여 label key를 사용한다.
7. 모든 언어에서 HTML 화면과 PDF를 각각 렌더링한다.

## `files.zip` 활용 방법

`files.zip`의 유용한 부분은 `DCasJobsExtra.setLang(lang)` 호출 한 번으로 기존 `label_ko` 참조를 locale 라벨로 바꾸는 getter 패턴이다. 이 패턴은 성인 직무명에 재사용할 수 있다.

그러나 아래 이유로 파일을 그대로 최종본에 넣으면 안 된다.

- 전체 결과지가 아니라 항공보안 직무 10개 패치다.
- 캄보디아어가 없다.
- 추천 이유문은 한국어다.
- 직무 프로파일이 전문가 확정값이 아니라 추정값이다.

세부 내용은 `FILES_ZIP_AUDIT.md`를 따른다.

## 완료 판정 조건

- 청소년/성인의 사용자 노출 정적 문구와 동적 문구 모두 `km` 존재
- 빈 값, key 노출, 한국어/영어 잔존이 0건
- placeholder 집합이 기준 locale과 일치
- 표지, 기질, 4축, 학습/업무, 진로·학과, 직업/직무, FAQ, 안내/주의문 모두 캄보디아어
- 접근성 문구, 버튼, 메뉴, 오류, PDF 파일명/푸터 포함
- Khmer 글꼴 fallback과 줄바꿈 실제 브라우저 확인
- 390px 모바일에서 가로 overflow 0
- A4 인쇄/PDF에서 잘림·겹침·빈 페이지 오류 없음
- 원어민/전문가 검수 후 `ai-draft`를 `reviewed`로 승격

## 이번 브랜치의 QA 범위

현재 QA는 81유형 레이어에 대해 수행한다.

- 청소년/성인 81개 조합과 특수 사례
- `km-KH` 정규화
- 실제 DOM의 Khmer 렌더링과 `lang="km"`
- 390px 모바일 가로 overflow
- A4 PDF 글리프/잘림 확인

전체 결과지 `km` QA는 전체 locale 리소스가 준비된 뒤 별도 단계로 수행해야 한다.
