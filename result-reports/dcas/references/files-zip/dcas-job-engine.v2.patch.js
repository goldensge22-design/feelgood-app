/**
 * dcas-job-engine.v2.patch.js — rankJobsForMajor가 "학과 1개 → NCS 중분류
 * 여러 개"를 처리하도록 확장.
 *
 * ===== 왜 필요한가 =====
 * 기존 dcas-job-engine.js의 MAJOR_TO_NCS_MIDDLE는 학과당 문자열 1개만
 * 허용했다. 그런데 이번 항공보안학과는 직무군이 "항공보안" + "산업보안"
 * 두 NCS 중분류에 걸쳐 있다(요청하신 10개 직무 중 마지막 3개가 산업보안).
 * dcas-jobs-extra.v2.patch.js는 MAJOR_TO_NCS_MIDDLE에 배열을 등록해두므로,
 * 이 파일은 rankJobsForMajor / registerMajor가 배열도 읽을 수 있게 한다.
 * 기존처럼 문자열 1개만 등록된 다른 학과(경찰행정과 등)는 그대로 동작한다
 * (하위호환).
 *
 * ===== 적용 순서 =====
 * dcas-job-engine.js 로드 "다음", dcas-jobs-extra.v2.patch.js 로드 "다음"에 둔다.
 */
(function (global) {
  'use strict';

  if (!global.DCasJobEngine) {
    // eslint-disable-next-line no-console
    console.error('[dcas-job-engine.v2.patch] DCasJobEngine이 아직 로드되지 않았습니다 — 스크립트 순서를 확인하세요.');
    return;
  }

  function toList(v) {
    if (!v) return null;
    return Array.isArray(v) ? v : [v];
  }

  // rankJobsForMajor 재정의 — 배열/문자열 둘 다 지원
  var original = global.DCasJobEngine;

  // dcas-jobs-extra.v2.patch.js가 준비해둔 학과→NCS중분류(배열) 매핑을 병합.
  // 기존 키(예: '항공보안과' → 문자열 1개)는 여기서 배열로 덮어써진다 —
  // 이제 항공보안 학과가 산업보안 NCS까지 함께 매칭되어야 하므로 의도된 동작.
  if (global.DCasJobsExtra && global.DCasJobsExtra.MAJOR_MAP_EXTRA) {
    Object.keys(global.DCasJobsExtra.MAJOR_MAP_EXTRA).forEach(function (k) {
      original.MAJOR_TO_NCS_MIDDLE[k] = global.DCasJobsExtra.MAJOR_MAP_EXTRA[k];
    });
  }

  function rankJobsForMajor(userScores, majorName, JOB_POOL) {
    var middleList = toList(original.MAJOR_TO_NCS_MIDDLE[majorName]);
    if (!middleList) return null;
    var pool = JOB_POOL.filter(function (j) { return middleList.indexOf(j.ncs.middle_name) !== -1; });
    var scored = pool.map(function (j) {
      return {
        job: j,
        fit: original.computeFit(userScores, j.pass_profile),
        reason: original.buildReasonText(userScores, j),
      };
    }).sort(function (a, b) { return b.fit - a.fit; });
    return scored;
  }

  // registerMajor도 배열을 받을 수 있게 확장 (기존 문자열 입력도 그대로 동작)
  function registerMajor(majorName, ncsMiddle) {
    if (!majorName || !ncsMiddle) return;
    original.MAJOR_TO_NCS_MIDDLE[majorName] = ncsMiddle;
  }

  original.rankJobsForMajor = rankJobsForMajor;
  original.registerMajor = registerMajor;

})(typeof window !== 'undefined' ? window : globalThis);
