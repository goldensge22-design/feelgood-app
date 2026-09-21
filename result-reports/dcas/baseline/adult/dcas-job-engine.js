/**
 * D-CAS 직무매칭 런타임 엔진 (3단계)
 *
 * dcas-career-zero-cost-design.md에서 설계한 구조 그대로입니다.
 *   - 직무 요구벡터(dcas-jobs-master.json)는 1회성 콘텐츠 — 이미 만들어져 있음
 *   - 이 파일은 런타임에 점수 vs 요구벡터를 계산만 함 — AI 호출 없음
 *
 * 61개 선택 학과 전체를 연결합니다. 47개 일반 학과는 dcas-jobs-major47.js가
 * 학과별 독립 직무군을 런타임 등록하며, 공공서비스·사범교육 13개와
 * 컴퓨터공학과는 아래 고정 매핑을 사용합니다.
 *
 * ★ fit% 계산 공식은 1차안입니다. 유클리드 거리 기반이며, 기존 리포트의
 * 예시 숫자(89%, 85%...)와 정확히 일치하지 않을 수 있습니다 — 그 예시는
 * 손으로 쓴 샘플이라 실제 계산식과 애초에 연결돼 있지 않았습니다. 공식
 * 자체가 타당한지는 검증 필요합니다.
 */
(function (global) {

  const MAJOR_TO_NCS_MIDDLE = {
    '컴퓨터공학과': '정보기술(SW)',
    /* ===== 패치: 공공서비스계열 · 사범교육계열 추가 (dcas-jobs-extra.js와 짝) ===== */
    '경찰행정과': '공공행정·치안(경찰행정)',
    '항공보안과': '공공행정·치안(항공보안)',
    '사회복지과': '사회복지·상담',
    '유아교육과': '영유아교육·보육',
    '평생교육융합학부': '평생교육·인재개발',
    '유아교육': '영유아교육·보육',
    '초등교육': '초등교육',
    '특수교육': '특수교육',
    '언어교육': '언어교육',
    '사회인문교육': '사회·인문교육',
    '수학과학교육': '수학·과학교육',
    '기술생활교육': '기술·생활교육',
    '예술체육교육': '예술·체육교육',
  };

  /* "기타" 직접 입력 시, 추정된 계열의 ncsMiddle을 입력한 학과명 그대로에
   * 런타임으로 등록한다 — 이후 rankJobsForMajor(scores, 입력한학과명, ...)가
   * 정상 동작하게 된다. */
  function registerMajor(majorName, ncsMiddle) {
    if (!majorName || !ncsMiddle) return;
    MAJOR_TO_NCS_MIDDLE[majorName] = ncsMiddle;
  }

  const AXIS_LABEL = { P: '계획력', A: '주의력', S: '동시처리', Q: '순차처리' };
  const AXIS_TO_JOBKEY = { P: 'planning', A: 'attention', S: 'simultaneous', Q: 'successive' };

  /* ===== fit% 계산 — 유클리드 거리 기반, 0~100 스케일로 환산 ===== */
  function computeFit(userScores, jobProfile) {
    let sq = 0;
    ['P', 'A', 'S', 'Q'].forEach(function (k) {
      // 패치: 기존엔 (내점수-요구치)²로 대칭 계산해서, 요구치보다 "높은" 점수도
      // 낮은 점수와 똑같이 감점됐음(예: 요구 80일 때 100점도 60점만큼 감점).
      // 요구 수준을 넘는 능력은 감점하지 않도록 "부족분만" 반영.
      const shortfall = Math.max(0, jobProfile[AXIS_TO_JOBKEY[k]] - userScores[k]);
      sq += shortfall * shortfall;
    });
    const dist = Math.sqrt(sq);
    // 최대 가능 거리(각 축 100점 부족 기준)로 정규화
    const maxDist = Math.sqrt(4 * 100 * 100);
    const fit = Math.round(100 - (dist / maxDist) * 100);
    return Math.max(0, Math.min(100, fit));
  }

  /* ===== 근거 문장 생성 — 문장 조각 조합. AI 아님 ===== */
  function topAxes(profile, n) {
    return ['planning', 'attention', 'simultaneous', 'successive']
      .map(function (k) { return { k: k, v: profile[k] }; })
      .sort(function (a, b) { return b.v - a.v; })
      .slice(0, n)
      .map(function (x) { return Object.keys(AXIS_TO_JOBKEY).find(function (ak) { return AXIS_TO_JOBKEY[ak] === x.k; }); });
  }
  function buildReasonText(userScores, job) {
    const jobTop2 = topAxes(job.pass_profile, 2);
    const label = jobTop2.map(function (k) { return AXIS_LABEL[k] + ' ' + userScores[k] + '%'; }).join('×');
    return '이 직무가 요구하는 핵심 축은 ' + jobTop2.map(function (k) { return AXIS_LABEL[k]; }).join('·') +
      '이에요. 회원님의 ' + label + ' 조합과 맞닿아 있어요.';
  }

  /* ===== 학과 선택 → 순위 매긴 직무 배열 (1회 계산, 이후 재사용) ===== */
  function rankJobsForMajor(userScores, majorName, JOB_POOL) {
    const ncsMiddle = MAJOR_TO_NCS_MIDDLE[majorName];
    if (!ncsMiddle) return null; // 매핑 안 된 학과 — 2단계에서 채워야 함
    const pool = JOB_POOL.filter(function (j) { return j.ncs.middle_name === ncsMiddle; });
    const scored = pool.map(function (j) {
      return {
        job: j,
        fit: computeFit(userScores, j.pass_profile),
        reason: buildReasonText(userScores, j),
      };
    }).sort(function (a, b) { return b.fit - a.fit; });
    return scored;
  }

  global.DCasJobEngine = {
    MAJOR_TO_NCS_MIDDLE: MAJOR_TO_NCS_MIDDLE,
    computeFit: computeFit,
    rankJobsForMajor: rankJobsForMajor,
    buildReasonText: buildReasonText,
    registerMajor: registerMajor,
  };

})(typeof window !== 'undefined' ? window : globalThis);
