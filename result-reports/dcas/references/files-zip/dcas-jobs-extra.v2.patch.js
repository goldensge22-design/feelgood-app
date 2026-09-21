/**
 * dcas-jobs-extra.v2.patch.js — 학과·직무 데이터 패치 v2
 *
 * ===== 이 패치가 하는 일 =====
 *   1) "항공보안학과"의 직무군을 기존 4개(항공보안요원/공항운영관리자/
 *      항공기 내 보안요원/출입국관리 지원직, id 911~914)에서 아래 10개로
 *      전면 교체한다.
 *        ① 공항보안 사무직        ⑥ 항공사보안요원
 *        ② 항공사보안 사무직      ⑦ 항공화물보안요원
 *        ③ 항공보안검색요원        ⑧ 산업보안 사무직
 *        ④ 항공경비요원           ⑨ 산업보안 경비요원
 *        ⑤ 대테러보안요원         ⑩ 산업보안검색요원
 *   2) 필수역량(pass_profile) — NCS 항공보안 직무기술서(인천공항공사 공개
 *      자료) 및 산업보안 NCS 미분류영역 선행연구를 근거로 1차 추정.
 *      기존 파일과 동일하게 attr_source: 'estimated', attr_confidence: 0.5.
 *      각 직무 객체의 competency_note에 근거를 남겨둠 — 문수백 교수님 감수
 *      전까지는 "estimated"임을 리포트에서 절대 숨기지 말 것.
 *   3) 직무를 "직무군(job_group_ko)"으로 묶어, 기존에 확인했던 9개 직무군
 *      표(보안검색/출입통제·경비/보안상황감시·대응/항공사보안운영/보안기획
 *      관리/보안교육품질관리/국가중요시설·기업보안/경호신변보호/공공치안보안)
 *      중 실제로 채용 경로가 있는 카테고리에 매핑해둠. (⑥보안교육·품질관리,
 *      ⑨공공치안·보안, ⑧경호·신변보호는 이번 10개에 해당 직무가 없어 제외 —
 *      필요하면 아래 DEPARTMENTS.jobs에 같은 패턴으로 추가하면 됨.)
 *   4) 다국어 라벨 — 직무 데이터에는 i18n_key만 갖고, 실제 텍스트는
 *      dcas-job-i18n-bank.js에 있음. label_ko는 getter로 만들어서, 이미
 *      리포트 전체(dcas-adult-content-engine.js)에 박혀 있는
 *      `job.label_ko` 참조 수십 곳을 하나도 안 고쳐도 언어가 바뀌면 자동으로
 *      바뀐 문자열을 돌려준다. 언어를 바꾸려면 DCasJobsExtra.setLang('en')
 *      한 줄만 호출하면 됨 (아래 참고).
 *
 * ===== 다음 학과(직무군) 추가하는 법 — 이게 이번 요청의 핵심 =====
 *   1) 아래 DEPARTMENTS 배열에 객체 하나 추가:
 *        {
 *          deptKey: '새학과명', deptAliases: ['드롭다운에 이미 있는 이름'],
 *          deptBaseId: 92,  // 901~9199 등 기존과 안 겹치는 두 자리 수만 새로 정하면 됨
 *          ncsMiddles: [{ code:'EX-XX', name_ko:'NCS 중분류명' }, ...],
 *          jobs: [
 *            { slug:'kebab-case-id', label_ko:'직무명', ncsCode:'EX-XX',
 *              job_group_ko:'직무군명',
 *              pass_profile:{planning:80,attention:76,simultaneous:78,successive:82},
 *              interest_code:'OAQ', interest_top1:'관리·정밀형', entry_level:'direct',
 *              competency_note:'근거' },
 *            ...
 *          ],
 *        }
 *   2) dcas-job-i18n-bank.js의 JOB_LABEL_I18N에 `새학과명.kebab-case-id` 키로
 *      11개 언어 번역 블록을 추가한다 (번역이 없으면 자동 ko 폴백이라 당장
 *      깨지진 않지만, 정식 반영 전엔 채워야 함).
 *   3) 이 파일의 build()·MAJOR_TO_NCS_MIDDLE 갱신 로직은 그대로 재사용되므로
 *      다른 코드는 아무것도 안 고쳐도 된다.
 *
 * ===== 적용 순서 =====
 *   기존 dcas-jobs-extra.js 뒤에, dcas-job-engine.js보다 반드시 "앞에" 로드:
 *   <script src="dcas-jobs-extra.js"></script>
 *   <script src="dcas-job-i18n-bank.js"></script>
 *   <script src="dcas-jobs-extra.v2.patch.js"></script>   <!-- 이 파일 -->
 *   <script src="dcas-job-engine.js"></script>
 *   <script src="dcas-job-engine.v2.patch.js"></script>   <!-- 배열 ncsMiddle 지원 -->
 */
(function (global) {
  'use strict';

  var DEPARTMENTS = [
    {
      deptKey: '항공보안학과',
      // 기존 adult.work.html 드롭다운 옵션명이 '항공보안과'이므로 그대로 별칭 등록.
      // (드롭다운 자체를 '항공보안학과'로 바꾸고 싶다면 adult.work.html의
      //  <option>항공보안과</option> 한 줄만 바꾸면 되고, 이 패치는 두 이름
      //  모두를 같은 데이터에 연결해두므로 어느 쪽을 쓰든 동작한다.)
      deptAliases: ['항공보안과'],
      deptBaseId: 91, // → id 9101~9110
      ncsMiddles: [
        { code: 'EX-AV', name_ko: '공공행정·치안(항공보안)' },
        { code: 'EX-IS', name_ko: '공공행정·치안(산업보안)' },
      ],
      jobs: [
        {
          slug: 'airport-sec-admin', label_ko: '공항보안 사무직', ncsCode: 'EX-AV',
          job_group_ko: '⑤ 보안기획·관리',
          pass_profile: { planning: 82, attention: 76, simultaneous: 76, successive: 84 },
          interest_code: 'OAQ', interest_top1: '관리·정밀형', entry_level: 'bridge',
          competency_note: '항공보안 기본계획·규정 관리, 관련 고시·훈령 검토, 유관기관 협조 문서 처리 — 인천공항공사 NCS 항공보안기획 직무기술서 기준(계획 수립·규정 이해·보고 능력 강조).',
        },
        {
          slug: 'airline-sec-admin', label_ko: '항공사보안 사무직', ncsCode: 'EX-AV',
          job_group_ko: '④ 항공사 보안 운영',
          pass_profile: { planning: 82, attention: 74, simultaneous: 78, successive: 80 },
          interest_code: 'OAQ', interest_top1: '관리·정밀형', entry_level: 'bridge',
          competency_note: '항공사 보안절차 이행·협력업체 조정 등 사무 업무. 직접고용/협력업체 소속 여부가 채용마다 달라 entry_level을 bridge로 설정.',
        },
        {
          slug: 'avsec-screener', label_ko: '항공보안검색요원', ncsCode: 'EX-AV',
          job_group_ko: '① 보안검색',
          pass_profile: { planning: 72, attention: 92, simultaneous: 80, successive: 78 },
          interest_code: 'OSA', interest_top1: '안전·통제형', entry_level: 'direct',
          competency_note: 'X-ray 영상 판독(패턴 동시통합) + 검색 절차 준수(순차) + 장시간 집중(주의력) — NCS 항공보안 직무기술서 "세밀한 관찰력", "예외 없는 검색을 실시하려는 윤리의식" 항목 반영.',
        },
        {
          slug: 'airport-guard', label_ko: '항공경비요원', ncsCode: 'EX-AV',
          job_group_ko: '② 출입통제·항공경비',
          pass_profile: { planning: 70, attention: 86, simultaneous: 74, successive: 80 },
          interest_code: 'OSA', interest_top1: '안전·통제형', entry_level: 'direct',
          competency_note: '출입권한 확인·순찰 등 절차 기반 경비 업무 — 경비업 NCS(보안·경호 세분류, 36개 능력단위) 기준.',
        },
        {
          slug: 'counter-terror', label_ko: '대테러보안요원', ncsCode: 'EX-AV',
          job_group_ko: '③ 보안상황 감시·대응',
          pass_profile: { planning: 78, attention: 88, simultaneous: 86, successive: 80 },
          interest_code: 'SOA', interest_top1: '안전·통제형', entry_level: 'retool',
          competency_note: '이상상황 판단·현장대응 협조 등 위기관리 비중이 높아 동시처리(전체 상황 통합 판단)를 다른 직무보다 높게 설정. 특수경비·대테러 관련 별도 교육/자격이 필요해 entry_level은 retool.',
        },
        {
          slug: 'airline-sec-officer', label_ko: '항공사보안요원', ncsCode: 'EX-AV',
          job_group_ko: '④ 항공사 보안 운영',
          pass_profile: { planning: 74, attention: 88, simultaneous: 78, successive: 78 },
          interest_code: 'OSA', interest_top1: '안전·통제형', entry_level: 'direct',
          competency_note: '항공기·화물 보안 운영 현장 이행 — 기존 v1의 "항공기 내 보안요원"(id 913) 프로파일을 계승.',
        },
        {
          slug: 'cargo-sec-officer', label_ko: '항공화물보안요원', ncsCode: 'EX-AV',
          job_group_ko: '① 보안검색',
          pass_profile: { planning: 76, attention: 88, simultaneous: 76, successive: 84 },
          interest_code: 'OSQ', interest_top1: '안전·통제형', entry_level: 'direct',
          competency_note: '화물 검색·통관 서류 등 절차·문서 처리 비중이 승객검색보다 커 순차처리 비중을 더 높게 설정.',
        },
        {
          slug: 'industrial-sec-admin', label_ko: '산업보안 사무직', ncsCode: 'EX-IS',
          job_group_ko: '⑦ 국가중요시설·기업보안',
          pass_profile: { planning: 84, attention: 78, simultaneous: 80, successive: 82 },
          interest_code: 'AOQ', interest_top1: '분석·탐구형', entry_level: 'bridge',
          competency_note: '자산 식별·위험평가·보안계획 수립·법규(산업기술보호법 등) 검토 — "국가직무능력표준에서의 산업보안 직무 및 직무능력 추출을 위한 탐색적 연구"(임동선 외, 2020) 기준.',
        },
        {
          slug: 'industrial-sec-guard', label_ko: '산업보안 경비요원', ncsCode: 'EX-IS',
          job_group_ko: '⑦ 국가중요시설·기업보안',
          pass_profile: { planning: 70, attention: 86, simultaneous: 74, successive: 78 },
          interest_code: 'OSA', interest_top1: '안전·통제형', entry_level: 'direct',
          competency_note: '항공경비요원과 동일 계열의 물리보안 역량을 산업시설로 확장 — 경비업 NCS 기준.',
        },
        {
          slug: 'industrial-sec-screener', label_ko: '산업보안검색요원', ncsCode: 'EX-IS',
          job_group_ko: '⑦ 국가중요시설·기업보안',
          pass_profile: { planning: 74, attention: 90, simultaneous: 78, successive: 80 },
          interest_code: 'OSA', interest_top1: '안전·통제형', entry_level: 'direct',
          competency_note: '반출입 물품·인원 검색으로 기술유출 방지 — 항공보안검색요원과 유사한 관찰력·절차준수 역량 요구.',
        },
      ],
    },

    /* ===== 다음 학과는 여기 아래에 같은 패턴으로 객체만 추가하면 됩니다. =====
     * deptBaseId는 기존 값(경찰행정 90x, 항공보안 911~914(구), 사회복지 92x,
     * 유아교육 93x, 평생교육 94x, 초등 95x, 특수교육 96x, 언어교육 97x,
     * 사회인문 98x, 수학과학 99x, 기술생활 100x, 예술체육 101x, 신규 항공보안 91xx)
     * 와 겹치지 않는 두 자리 수(예: 92)를 새로 골라 92xx로 쓰면 안전합니다.
     */
  ];

  // ===== 여기서부터는 로직 — 새 학과 추가할 때 건드릴 필요 없음 =====

  var currentLang = 'ko';

  function buildJobObject(dept, job, idx, codeToName) {
    var id = dept.deptBaseId * 100 + (idx + 1);
    var i18nKey = dept.deptKey + '.' + job.slug;
    var obj = {
      id: id,
      i18n_key: i18nKey,
      job_group_ko: job.job_group_ko,
      ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: job.ncsCode, middle_name: codeToName[job.ncsCode] },
      pass_profile: job.pass_profile,
      interest_code: job.interest_code,
      interest_top1: job.interest_top1,
      entry_level: job.entry_level,
      attr_source: 'estimated',
      attr_confidence: 0.5,
      competency_note: job.competency_note,
      _label_ko_raw: job.label_ko, // 번역이 전혀 없을 때의 최종 폴백
    };
    // label_ko를 getter로 정의 — 기존 코드가 참조하는 job.label_ko가
    // currentLang에 맞는 문자열을 자동으로 돌려주게 한다.
    Object.defineProperty(obj, 'label_ko', {
      enumerable: true,
      get: function () {
        var t = (global.DCasJobI18n && global.DCasJobI18n.get(i18nKey, currentLang));
        return t || obj._label_ko_raw;
      },
    });
    return obj;
  }

  function buildFromDepartments() {
    var pool = [];
    var majorMap = {};
    var categoryListExtra = [];
    DEPARTMENTS.forEach(function (dept) {
      var codeToName = {};
      dept.ncsMiddles.forEach(function (m) { codeToName[m.code] = m.name_ko; });
      var ncsMiddleNames = dept.ncsMiddles.map(function (m) { return m.name_ko; });
      dept.jobs.forEach(function (job, idx) {
        pool.push(buildJobObject(dept, job, idx, codeToName));
      });
      var keys = [dept.deptKey].concat(dept.deptAliases || []);
      keys.forEach(function (k) { majorMap[k] = ncsMiddleNames; });
      categoryListExtra.push({ ncsMiddles: ncsMiddleNames, label: dept.deptKey });
    });
    return { pool: pool, majorMap: majorMap, categoryListExtra: categoryListExtra };
  }

  var BUILT = buildFromDepartments();

  global.DCasJobsExtra = global.DCasJobsExtra || {};

  // 기존(v1) JOB_POOL_EXTRA 중 항공보안 구 4개(id 911~914)는 이번 10개로
  // "완전 대체"한다. 그 외(경찰행정 90x, 사회복지 92x, ... )는 그대로 유지.
  var LEGACY_POOL = global.DCasJobsExtra.JOB_POOL_EXTRA || [];
  var LEGACY_POOL_WITHOUT_OLD_AVSEC = LEGACY_POOL.filter(function (j) {
    return !(j.id >= 911 && j.id <= 914);
  });

  global.DCasJobsExtra.JOB_POOL_EXTRA = LEGACY_POOL_WITHOUT_OLD_AVSEC.concat(BUILT.pool);
  global.DCasJobsExtra.DEPARTMENTS = DEPARTMENTS;
  // dcas-job-engine.js가 아직 로드되지 않은 시점(권장 로드 순서상 이 파일이 먼저 온다)
  // 이라 MAJOR_TO_NCS_MIDDLE에 바로 등록할 수 없다. 대신 여기 담아두고,
  // dcas-job-engine.v2.patch.js가 로드 시점에 병합한다.
  global.DCasJobsExtra.MAJOR_MAP_EXTRA = BUILT.majorMap;

  // CUSTOM_MAJOR_KEYWORDS / CATEGORY_LIST("기타" 직접입력 학과 지원)에
  // 산업보안 키워드도 추가 — 기존 항목은 그대로 두고 이어붙이기만 함.
  if (global.DCasJobsExtra.CATEGORY_LIST) {
    var already = global.DCasJobsExtra.CATEGORY_LIST.some(function (c) { return c.label === '항공보안학과'; });
    if (!already) {
      global.DCasJobsExtra.CATEGORY_LIST.push({ ncsMiddle: '공공행정·치안(항공보안)', label: '항공보안학과' });
    }
  }

  // 언어 전환 — 화면 상단 언어 스위처(lang-btn)에서 호출.
  // 예: onclick="setLang('en')" 안에서 DCasJobsExtra.setLang('en')도 같이 호출.
  global.DCasJobsExtra.setLang = function (lang) {
    currentLang = (global.DCasJobI18n && global.DCasJobI18n.LANGS.indexOf(lang) !== -1) ? lang : 'ko';
  };
  global.DCasJobsExtra.getLang = function () { return currentLang; };

})(typeof window !== 'undefined' ? window : globalThis);
