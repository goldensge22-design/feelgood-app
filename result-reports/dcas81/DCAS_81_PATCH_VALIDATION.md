# D-CAS 81유형 패치 검증 기록

- 검증일: 2026-09-20
- 대상 원본: `source/DCAS_81_PROFILE_PATCH_v1.0.zip`
- 원본 크기: `433,649 bytes`
- SHA-256: `F9D9B4949A39D29BD23151FFCCB9932D97230F5068C2B144C569D12EABD8334A`
- 출처: GPT Library에서 복구한 `DCAS_81_PROFILE_PATCH_v1.0(1).zip`

## 원본 및 압축 해제본 검증

원본 ZIP은 이름만 `DCAS_81_PROFILE_PATCH_v1.0.zip`으로 정규화해 보존했다. 파일 내용은 변경하지 않았다.

| 검증 항목 | 결과 |
|---|---|
| 저장된 ZIP 크기 | 433,649 bytes — 일치 |
| 저장된 ZIP SHA-256 | 기대값과 일치 |
| ZIP 내부 파일 수 | 36 |
| `unpacked/` 파일 수 | 36 |
| ZIP 대비 누락 파일 | 0 |
| ZIP 대비 추가 파일 | 0 |
| ZIP과 압축 해제본 해시 불일치 | 0 |

검증 시 ZIP 각 엔트리와 `unpacked/`의 대응 파일을 SHA-256으로 개별 비교했다.

## 자동 테스트 결과

실행 명령:

```text
node result-reports/dcas81/unpacked/TESTS/profile81.test.js
```

결과:

```text
PASS: 81 unique profiles, 11 locales, special cases, and BAL routing
```

- 테스트 종료 코드: 0
- `APPLIED_FULL` JavaScript 문법 검사: 20개 파일
- JavaScript 문법 오류: 0

## 기존 GitHub 최종본 대비 변경 범위

기준본: 저장소의 `DCAS_FINAL_REBUILT_20260912 (1).zip`

### 청소년

추가:

- `dcas-profile81-bank.js`

수정:

- `dcas-teen-combo-bank.js`
- `dcas-teen-combo-bank-en.js`
- `dcas-teen-content-engine.js`
- `teen.work.html`

그 밖의 청소년 적용본 파일은 기존 최종본과 동일하다.

### 성인

추가:

- `dcas-profile81-bank.js`

수정:

- `dcas-combo-bank.js`
- `dcas-adult-content-engine.js`
- `adult.work.html`

그 밖의 성인 적용본 파일은 기존 최종본과 동일하다.

`PATCH_FILES`의 모든 파일은 `APPLIED_FULL`의 대응 파일과 해시가 일치한다. 청소년과 성인의 `dcas-profile81-bank.js`도 서로 동일하다.

## 기능 검증 요약

### 청소년

- P/A/S/Q를 H/M/L로 분류: 확인
- 경계값: L 52 이하, M 53~74, H 75 이상
- 81개 고유 코드 생성: 확인
- 코드 형식 `P-M / A-H / S-L / Q-M`: 확인
- 표지와 기질 특성에 81유형 출력: 코드 연결 확인
- 네 영역 정적 문장 조합: 확인
- `ALL_L`, `ALL_M`, `ALL_H`: 확인
- 동점 및 균형형 처리: 확인
- 학습, 진로·학과, 직업 추천 설명 연결: 확인
- S/Q 차이 0~10점 균형, 11점 이상 우세형: 확인
- 81유형 레이어 11개 언어: 확인

### 성인

- P/A/S/Q H/M/L 및 81개 코드: 확인
- 표지, 기질, 학습·업무방식, 진로·학과, 직무 설명 연결: 확인
- `ALL_L`, `ALL_M`, `ALL_H`, 동점·균형형 처리: 확인
- 81유형 레이어 11개 언어: 확인
- S/Q 11점 우세형 판정: 누락

## 다국어 적용 범위

81유형 뱅크가 지원하는 언어는 `ko`, `en`, `ja`, `zh`, `es`, `ru`, `vi`, `th`, `ar`, `it`, `az`이다. 유형명, 요약, 12개 축별 문장, 학습·진로·직무 적용 문구가 포함되며 아랍어는 RTL을 사용한다.

주의: 11개 언어 적용은 `dcas-profile81-bank.js`의 81유형 레이어 중심이다. 청소년 전체 결과지 셸은 한국어/영어, 성인 전체 결과지 셸은 한국어 중심이다. 별도 locale 디렉터리나 manifest는 이 패키지에 없다.

## 아직 검증하지 않은 항목

- 실제 브라우저 DOM 및 화면 회귀
- 모바일 레이아웃
- 인쇄/PDF 출력
- 실제 서버 데이터 계약
- 전체 결과지 11개 언어 전환
- 문구 및 판정 기준의 전문가·규준 감수

이 패키지는 보존·코드 검증 단계의 자료이며 현재 운영 최종본을 대체하지 않는다.
