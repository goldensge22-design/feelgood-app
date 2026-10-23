# FeelGood 기업 인재전략 대시보드

## 진입 파일

- 공개 진입점: `FeelGood_HR_TalentAnalytics_Demo.html`
- 제품 기획: `enterprise-dashboard/PRODUCT_PLAN.md`
- 결과지/API 계약: `enterprise-dashboard/DATA_CONTRACT.md`
- 인재 산출 기본 규칙: `enterprise-dashboard/TALENT_SCORING_RULES.md`
- 개발자 전달서: `enterprise-dashboard/DEVELOPER_HANDOFF.md`
- 운영 adapter 진입점: `enterprise-dashboard/data-adapter.js`
- 데모 데이터: `enterprise-dashboard/mock-data.js`

## 주요 기능

- 경영 요약
- 기업 인재상과 복수 성공 프로파일
- D-CAS/PASS 결과지 읽기 전용 신호와 기업 평가자 입력의 명확한 분리
- 기업 평가 + D-CAS 인재상과 D-CAS/PASS 기반 잠재 인재상의 나란한 비교
- 채용 후보자 직무·역할 분석
- 지원자 명단과 D-CAS 결과 연결, 이름 선택 후 개인 상세 진입
- 이력서 연결 및 이력서 기반 직무군 매칭(D-CAS 추천과 출처 분리)
- 기존 직원 기준 프로파일 비교
- 기존 직원 D-CAS 결과와 업무성과를 결합한 직무별 기업 인재상
- 관리자 업무성과·역할근거 입력, 임시저장·승인 후 직무별 분석 재계산
- 결과지만으로 산출한 직무 잠재부합 후보 분리 표시
- 개인 결과지 요약, PASS 네 영역과 D-CAS 추천 직무 Top 5
- 신입사원의 리더·전문가·프로젝트 책임자·실무 수행 경로 검토
- 30·60·90일 온보딩·성장계획
- 조직 역량 공백과 실행계획
- 기업·직무별 업무역량 모델 편집

공개 데모의 기업, 지원자, 직원, 인원수, 점수, 매칭률, 성과, 진행률과 일정은 모두 가상 데이터다. 화면 상단의 안내에서 인원·점수·가중치 해석과 운영 API 교체 기준을 항상 확인할 수 있다.

데모의 판정 상태, 현재 직무 준비도, 리더·전문가 잠재력, 추천 경로와 역할 점수는 합성 고정값이며 프런트엔드 산출 결과가 아니다. 운영판은 [`TALENT_SCORING_RULES.md`](./TALENT_SCORING_RULES.md)에 따라 서버에서 산출한 값과 근거·규칙 버전을 adapter로 전달해야 한다.

## 15개 언어

`ko`, `en`, `ja`, `zh-CN`, `zh-TW`, `vi`, `th`, `km`, `mn`, `ru`, `ar`, `az`, `fr`, `es`, `it`

한국어는 기준 원문 `ready`다. 신규 외국어 pack은 원어민 검수 전 `ai-draft`로 추적한다. 언어 선택은 상단 드롭다운이며 URL의 다른 query parameter와 현재 hash를 보존한다. 아랍어는 RTL을 적용한다.

## 로컬 실행

저장소 루트에서 정적 HTTP 서버를 실행한 후 다음 주소를 연다.

```text
http://127.0.0.1:<port>/FeelGood_HR_TalentAnalytics_Demo.html?lang=ko#overview
```

`file://`에서는 브라우저의 JSON fetch 제한 때문에 locale을 읽지 못할 수 있다.

## 검증

```bash
node enterprise-dashboard/scripts/verify-i18n.mjs
node enterprise-dashboard/scripts/verify-data.mjs
node scripts/check-i18n.mjs
node scripts/check-i18n.mjs --changed --strict-hardcoded
```

마지막 두 명령은 중앙 registry에 등록된 프로그램만 검사한다. 기업 대시보드는 전용 validator 결과를 함께 확인한다.

데모에서는 관리자 입력값을 브라우저 `localStorage`에 저장한다. 운영판에서는 `window.FeelGoodEnterpriseAdapter.saveEmployeePerformanceRecords()`와 `window.FeelGoodEnterpriseAdapter.saveCandidateEvaluations()`를 구현해 서버 저장·권한·감사 이력과 연결해야 한다. 지원자 평가 화면의 PASS 인지특성과 추천 직무는 결과지 연동값이므로 읽기 전용으로 유지한다.

