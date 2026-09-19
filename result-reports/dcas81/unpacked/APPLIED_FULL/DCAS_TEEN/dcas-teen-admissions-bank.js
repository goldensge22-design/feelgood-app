/**
 * D-CAS 청소년 리포트 — 12 입시전략 콘텐츠 뱅크
 *
 * ===== 근거 자료 =====
 * 2026학년도 대학입학전형 시행계획(한국대학교육협의회, 2025) 기준:
 *   - 수시모집 비중 79.9%, 이 중 85.9%가 학생부위주 전형
 *   - 정시모집은 92.2%가 수능위주 전형
 *   - 수능최저학력기준을 도입/강화하는 대학이 늘어나는 추세 (예: 이화여대,
 *     경희대 등이 2026학년도부터 신규 도입)
 *   - 논술전형 확대 추세 (수도권 대학 중심)
 * 이 파일은 위 네 가지 전형 유형(학생부종합·학생부교과·논술·정시)의 실제
 * 특징을 바탕으로, PASS 강점 조합과 "어느 정도 결이 맞는지"를 안내합니다.
 *
 * ★★★ 중요 ★★★
 * 이건 "이 조합이면 이 전형에 붙는다"는 합격 예측이 아닙니다. 전형 선택은
 * 실제 내신·모의고사 성적, 학교생활기록부 내용, 지원 대학의 구체적 요강을
 * 종합해서 정해야 합니다. 이 콘텐츠는 "내 강점이 어떤 전형의 평가 방식과
 * 잘 맞는 성향인지"를 참고하는 용도로만 안내해야 합니다.
 */
(function (global) {
  const AXIS_LABEL = { P: '계획력', A: '주의력', S: '동시처리', Q: '순차처리' };
  function hasBatchimLocal(str) {
    const ch = str.charCodeAt(str.length - 1);
    if (ch < 0xAC00 || ch > 0xD7A3) return false;
    return (ch - 0xAC00) % 28 !== 0;
  }

  // 전형 유형 4종 — 실제 특징 기반 설명
  const TRACK = {
    holistic: {
      name: '학생부종합전형',
      note: '서류(학생부)와 면접으로 활동 과정을 종합 평가. {{ADMYEAR}}학년도 기준에서도 수시 중 비중이 가장 큼. (2024학년도 대입부터 대교협 공통 자기소개서는 폐지됐고, 학생부 안의 세부능력 특기사항·창의적 체험활동 기록으로 대체됨)',
      fitAxes: ['S', 'P'], // 전체를 기획하고 실행한 "과정"을 서사로 보여줘야 함
      whyFit: '동시처리로 활동의 전체 맥락을 잡고, 계획력으로 그걸 구체적 실행 과정으로 풀어내는 힘이 학생부의 "활동 서사"(세특·창체 기록)를 쌓을 때 그대로 강점이 돼요.',
    },
    grades: {
      name: '학생부교과전형',
      note: '내신 성적(교과 등급)을 중심으로 평가. 최근 수능최저학력기준을 새로 도입하는 대학이 늘고 있어, 수능 대비도 함께 필요해지는 추세.',
      fitAxes: ['A', 'Q'],
      whyFit: '순차처리와 주의력이 강하면, 꾸준히 절차를 지키며 내신을 관리하는 힘이 있다는 뜻이라 이 전형의 평가 방식과 결이 잘 맞아요.',
    },
    essay: {
      name: '논술전형',
      note: '주어진 자료를 분석해 논리적으로 서술하는 시험. 최근 수도권 대학 중심으로 선발 인원이 늘어나는 추세.',
      fitAxes: ['S', 'Q'],
      whyFit: '동시처리로 자료 전체의 핵심을 빠르게 파악하고, 순차처리로 그걸 논리적 순서로 풀어 쓰는 힘이 논술 답안 작성과 직접 연결돼요.',
    },
    csat: {
      name: '정시(수능위주전형)',
      note: '수능 성적이 절대적 기준. 정해진 시간 안에 여러 과목을 정확하게 반복 처리해야 함. 최근 정시에도 학생부를 일부 반영하는 대학이 늘고 있음.',
      fitAxes: ['A', 'Q'],
      whyFit: '주의력과 순차처리가 강하면, 제한된 시간 안에서 절차를 지키며 정확도를 유지하는 수능형 문제풀이에 강점이 있다는 뜻이에요.',
    },
  };

  function scoreTrack(scores, track) {
    return track.fitAxes.reduce(function (sum, k) { return sum + scores[k]; }, 0) / track.fitAxes.length;
  }

  function rankTracks(scores, trackBank) {
    trackBank = trackBank || TRACK;
    return Object.keys(trackBank).map(function (key) {
      return { key: key, track: trackBank[key], score: scoreTrack(scores, trackBank[key]) };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  // 예상 면접질문 — 축 조합 기반 (기존 3문항 구조 유지, 답변가이드만 동적)
  function buildInterviewGuide(scores, strong2Keys, weakKey) {
    const isBal = /^BAL_/.test(weakKey || '');
    const tier = isBal ? weakKey.replace('BAL_', '') : null;
    const s1 = AXIS_LABEL[strong2Keys[0]], s2 = AXIS_LABEL[strong2Keys[1]], w = isBal ? null : AXIS_LABEL[weakKey];
    const Q1_BAL = { LOW: '아직 특정 강점을 굳히기보다 여러 방식을 하나씩 시도해보며 작은 일을 끝까지 완료했던 경험 1개를 STAR 구조로 30초 분량 답변으로 미리 준비해두세요.', MID: '상황에 맞게 계획·종합·절차 등 여러 방식을 유연하게 활용해 완수한 경험 1개를 STAR 구조로 30초 분량 답변으로 미리 준비해두세요.', HIGH: '여러 방식을 동시에 통합해 복합적인 과제를 완수한 경험 1개를 STAR 구조로 30초 분량 답변으로 미리 준비해두세요.' };
    const Q2_BAL = { LOW: '뭘 시도해도 끝까지 못 갔던 경험 → 작게 나누어 반복한 끝에 완료해본 과정을 "성장 서사"로 답하면 설득력이 높아요.', MID: '한 가지 방식이 통하지 않아 어려움을 겪었던 경험 → 다른 접근으로 바꿔 극복한 과정을 "성장 서사"로 답하면 설득력이 높아요.', HIGH: '여러 가지를 동시에 처리하다 버거웠던 경험 → 우선순위를 정해 통합적으로 해결한 과정을 "성장 서사"로 답하면 설득력이 높아요.' };
    return [
      { q: '본인의 강점을 활동 경험과 함께 설명해주세요.', a: isBal
        ? Q1_BAL[tier]
        : s1 + (hasBatchimLocal(s1)?'과':'와') + ' ' + s2 + (hasBatchimLocal(s2)?'을':'를') + ' 함께 발휘해 완수한 경험 1개를 STAR 구조로 30초 분량 답변으로 미리 준비해두세요.' },
      { q: '힘들었던 순간을 어떻게 극복했나요?', a: isBal
        ? Q2_BAL[tier]
        : w + ' 약점 때문에 어려움을 겪었던 경험 → 스스로 방법을 찾아 극복한 과정을 "성장 서사"로 답하면 설득력이 높아요.' },
      { q: '우리 학과/전공을 선택한 이유는?', a: '계열매트릭스·추천학과 섹션의 인지프로파일 근거를 자신의 언어로 재구성해 답변하세요. 점수를 그대로 언급하지 말고 "나는 이런 식으로 사고한다"로 풀어내세요.' },
    ];
  }

  // ===== 영어 버전 =====
  const TRACK_EN = {
    holistic: {
      name: 'Holistic Admissions (school-record & portfolio review)',
      note: 'Evaluated via school records and interview, weighing the full activity process. Currently the largest share of early-admissions tracks.',
      fitAxes: ['S', 'P'],
      whyFit: 'Using simultaneous processing to grasp the full context of an activity, then planning to translate that into a concrete execution narrative, directly strengthens the "activity story" in your school record (subject-specific notes, creative activities log).',
    },
    grades: {
      name: 'Grade-Based Admissions (in-school GPA)',
      note: 'Weighted mainly on in-school subject grades. More universities are now adding standardized-test minimums, so test prep matters too.',
      fitAxes: ['A', 'Q'],
      whyFit: 'Strong attention and successive processing mean a steady ability to follow procedures and maintain GPA consistently, which fits well with how this track is evaluated.',
    },
    essay: {
      name: 'Essay-Based Admissions',
      note: 'A written exam analyzing given material and building a logical argument. Selection numbers have been growing, especially at metro-area universities.',
      fitAxes: ['S', 'Q'],
      whyFit: 'Using simultaneous processing to grasp the core of source material quickly, then successive processing to lay it out in logical order, connects directly to writing an essay answer.',
    },
    csat: {
      name: 'Standardized-Test-Based Admissions (CSAT)',
      note: 'Standardized test score is the deciding factor. Requires processing multiple subjects accurately and repeatedly within a fixed time. More universities are also weighting school records here.',
      fitAxes: ['A', 'Q'],
      whyFit: 'Strong attention and successive processing mean you can maintain accuracy while following procedure under a fixed time limit, which fits the demands of standardized testing.',
    },
  };

  function buildInterviewGuideEn(scores, strong2Keys, weakKey) {
    const AXIS_LABEL_EN = { P:'planning', A:'attention', S:'simultaneous processing', Q:'successive processing' };
    const isBal = /^BAL_/.test(weakKey || '');
    const tier = isBal ? weakKey.replace('BAL_', '') : null;
    const s1 = AXIS_LABEL_EN[strong2Keys[0]], s2 = AXIS_LABEL_EN[strong2Keys[1]], w = isBal ? null : AXIS_LABEL_EN[weakKey];
    const Q1_BAL = { LOW: 'Prepare one story about trying a few different approaches — without settling on a fixed strength yet — and seeing a small task through to completion, structured in STAR format as a ~30-second answer.', MID: 'Prepare one story that shows you flexibly switching between planning, synthesizing, and following procedure as the situation called for it, structured in STAR format as a ~30-second answer.', HIGH: 'Prepare one story about integrating multiple approaches at once to handle a complex task, structured in STAR format as a ~30-second answer.' };
    const Q2_BAL = { LOW: 'A moment where you couldn\'t finish something, followed by breaking it into smaller repeated steps until you did, makes a compelling growth narrative.', MID: 'A moment where one approach wasn\'t working, followed by switching to a different one to overcome it, makes a compelling growth narrative.', HIGH: 'A moment where juggling several things felt overwhelming, followed by prioritizing and integrating them, makes a compelling growth narrative.' };
    return [
      { q: 'Tell us about a strength of yours, with an example.', a: isBal
        ? Q1_BAL[tier]
        : 'Prepare one story that shows both ' + s1 + ' and ' + s2 + ' working together, structured in STAR format as a ~30-second answer.' },
      { q: 'How did you overcome a difficult moment?', a: isBal
        ? Q2_BAL[tier]
        : 'A moment where you struggled due to weaker ' + w + ', followed by finding your own way to overcome it, makes a compelling growth narrative.' },
      { q: 'Why did you choose this major?', a: 'Reframe the cognitive rationale from the Field-Fit and Top Majors sections in your own words. Avoid citing scores directly — instead describe "how I think" as a person.' },
    ];
  }

  global.DCasTeenAdmissionsBank = { TRACK: TRACK, AXIS_LABEL: AXIS_LABEL, rankTracks: rankTracks, buildInterviewGuide: buildInterviewGuide, TRACK_EN: TRACK_EN, buildInterviewGuideEn: buildInterviewGuideEn };
})(typeof window !== 'undefined' ? window : globalThis);
