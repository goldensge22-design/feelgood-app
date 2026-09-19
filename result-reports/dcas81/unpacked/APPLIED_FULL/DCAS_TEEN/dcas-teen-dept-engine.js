/**
 * D-CAS 청소년 리포트 — 06 계열매트릭스 · 07 추천학과 · 08 선택과목 · 09 직업미리보기
 *
 * dcas-major-requirements.js(성인용에서 만든 48개 학과 데이터)를 그대로
 * 재사용합니다 — 새 데이터를 만들지 않고 기존 것을 다른 각도로 계산만 합니다.
 * (dcas-career-zero-cost-design.md에서 세운 원칙: 콘텐츠는 1회, 계산은 매번.)
 *
 * ★ 48개 학과 데이터 자체가 1차 추정치(attr_confidence 0.5)이므로, 이 계산
 *   결과도 같은 수준의 신뢰도입니다. 감수 완료 전 참고용으로만 쓰세요.
 */
(function (global) {

  const CATEGORY_MAJORS = {
    '인문': ['국어국문학과','영어영문학과','사학과','철학과','문헌정보학과','중어중문학과','일어일문학과','문예창작학과'],
    '사회': ['경영학과','경제학과','행정학과','사회학과','심리학과','정치외교학과','법학과','사회복지학과'],
    '자연': ['수학과','물리학과','화학과','생명과학과','통계학과','지구환경과학과','식품영양학과'],
    '공학': ['컴퓨터공학과','전자공학과','기계공학과','화학공학과','산업공학과','건축학과','토목공학과','신소재공학과','환경공학과'],
    '예체능': ['시각디자인학과','산업디자인학과','음악학과','체육학과','영화영상학과','실용음악학과','무용학과','공예학과'],
    '의약': ['간호학과','약학과','의예과','치의예과','한의예과','물리치료학과','임상병리학과','보건행정학과'],
    // 패치: 성인용엔 있었으나 청소년 추천학과에서 빠져있던 2개 계열(13개 학과) 추가
    '공공서비스': ['경찰행정과','항공보안과','사회복지과','유아교육과','평생교육융합학부'],
    '사범교육': ['유아교육','초등교육','특수교육','언어교육','사회인문교육','수학과학교육','기술생활교육','예술체육교육'],
  };

  // 계열별 핵심 근거 문구 템플릿 — 강점축 조합에 따라 자동 조립
  const CATEGORY_REASON = {
    '인문': { high: '텍스트·맥락을 종합적으로 읽어내는 힘', low: '순차 논증 다소 보완 필요' },
    '사회': { high: '맥락 종합·설득 전략', low: '체계적 자료 정리 보완 필요' },
    '자연': { high: '가설-검증형 계획력', low: '정밀 계산 반복 훈련 필요' },
    '공학': { high: '구조 설계·문제해결 계획력', low: '절차 검증 습관 보완 필요' },
    '예체능': { high: '직관적 종합·창의적 표현', low: '완성도 마무리 훈련 필요' },
    '의약': { high: '정밀 절차 반복 수행력', low: '정밀 절차 반복 훈련 필요' },
    '공공서비스': { high: '현장 대응력·규정 준수', low: '돌발상황 대응 훈련 필요' },
    '사범교육': { high: '설명·전달과 학습설계 능력', low: '개별 학습자 맞춤 대응 훈련 필요' },
  };

  function categoryAvg(reqs, cat) {
    const majors = CATEGORY_MAJORS[cat];
    const avg = { P: 0, A: 0, S: 0, Q: 0 };
    majors.forEach(function (m) { ['P','A','S','Q'].forEach(function (k) { avg[k] += reqs[m][k]; }); });
    ['P','A','S','Q'].forEach(function (k) { avg[k] = Math.round(avg[k] / majors.length); });
    return avg;
  }

  function fitPct(userScores, reqVec) {
    let sq = 0;
    // 패치: 요구치보다 높은 점수도 감점되던 대칭 거리 계산을 '부족분만' 반영하도록 수정
    ['P','A','S','Q'].forEach(function (k) { const d = Math.max(0, reqVec[k] - userScores[k]); sq += d * d; });
    const dist = Math.sqrt(sq);
    const maxDist = Math.sqrt(4 * 100 * 100);
    return Math.max(0, Math.min(100, Math.round(100 - (dist / maxDist) * 100)));
  }

  function rankCategories(userScores, reqs) {
    return Object.keys(CATEGORY_MAJORS).map(function (cat) {
      const avg = categoryAvg(reqs, cat);
      return { category: cat, fit: fitPct(userScores, avg), reqVec: avg };
    }).sort(function (a, b) { return b.fit - a.fit; });
  }

  function rankMajors(userScores, reqs, limit) {
    return Object.keys(reqs).filter(function (k) { return k !== '_meta'; }).map(function (name) {
      return { name: name, fit: fitPct(userScores, reqs[name]), reqVec: reqs[name] };
    }).sort(function (a, b) { return b.fit - a.fit; }).slice(0, limit || 5);
  }

  // 계열별 선택과목 추천 (성적표가 아닌 계열 특성 기반 — 6개 계열 고정 콘텐츠)
  const SUBJECT_GUIDE = {
    '공학': [
      { area: '수학', subjects: '기하, 미적분Ⅱ, 인공지능수학', reason: '공학·디자인 계열 필수 사고력 기반' },
      { area: '과학', subjects: '물리학, 역학과 에너지, 융합과학탐구', reason: '구조·시스템 이해 및 설계 기초' },
      { area: '기술·정보', subjects: '정보, 데이터과학, 인공지능기초', reason: '강점을 실무기술로 연결' },
      { area: '진로선택', subjects: '창의경영, 융합선택(프로젝트형)', reason: '계획력 발휘 + 보완축 훈련' },
    ],
    '자연': [
      { area: '수학', subjects: '미적분Ⅱ, 기하, 확률과 통계', reason: '자연계열 전반의 논리적 사고 기반' },
      { area: '과학', subjects: '화학, 생명과학, 세포와 물질대사', reason: '가설-검증형 탐구 활동의 기초' },
      { area: '기술·정보', subjects: '데이터과학, 정보', reason: '데이터 기반 분석 역량 강화' },
      { area: '진로선택', subjects: '과학과제연구, 융합과학탐구', reason: '실험 설계·검증 능력 훈련' },
    ],
    '의약': [
      { area: '수학', subjects: '확률과 통계, 미적분Ⅱ', reason: '의약계열 정량 분석 기초' },
      { area: '과학', subjects: '생명과학, 화학, 세포와 물질대사', reason: '인체·약리 이해의 기본 소양' },
      { area: '기술·정보', subjects: '보건, 정보', reason: '임상·보건 데이터 이해' },
      { area: '진로선택', subjects: '융합과학탐구, 사회문제탐구', reason: '정밀 절차 수행 + 소통 역량 훈련' },
    ],
    '예체능': [
      { area: '수학', subjects: '수학Ⅰ·Ⅱ (기본)', reason: '입시 최소 요건 충족' },
      { area: '과학', subjects: '통합과학', reason: '입시 최소 요건 충족' },
      { area: '기술·정보', subjects: '정보, 미술창작(해당 시)', reason: '디지털 툴 활용 역량' },
      { area: '진로선택', subjects: '예술과 매체, 융합선택(프로젝트형)', reason: '직관적 표현력을 완성도로 연결' },
    ],
    '사회': [
      { area: '수학', subjects: '확률과 통계', reason: '사회과학 데이터 해석 기초' },
      { area: '탐구', subjects: '사회와 문화, 정치, 법과 사회', reason: '맥락 종합·설득 전략의 기초 소양' },
      { area: '기술·정보', subjects: '정보', reason: '데이터 기반 정책·전략 이해' },
      { area: '진로선택', subjects: '사회문제탐구, 융합선택(프로젝트형)', reason: '기획력을 실전 프로젝트로 훈련' },
    ],
    '인문': [
      { area: '국어', subjects: '화법과 언어, 독서와 작문', reason: '텍스트 해석·논증 능력 기초' },
      { area: '탐구', subjects: '세계사, 윤리와 사상', reason: '맥락 종합 능력의 기초 소양' },
      { area: '외국어', subjects: '심화 외국어 과목', reason: '전공별 원서 독해 대비' },
      { area: '진로선택', subjects: '고전 읽기, 융합선택(프로젝트형)', reason: '순차 논증 보완 훈련' },
    ],
    '공공서비스': [
      { area: '사회', subjects: '정치, 법과 사회', reason: '행정·치안·복지 현장의 제도적 기반' },
      { area: '탐구', subjects: '사회문제탐구, 사회와 문화', reason: '현장 대응 및 공동체 이해 소양' },
      { area: '체육·안전', subjects: '스포츠 생활, 안전한 사회', reason: '체력·현장 대응력 기초' },
      { area: '진로선택', subjects: '사회문제탐구, 융합선택(프로젝트형)', reason: '규정 준수 + 돌발상황 대응 훈련' },
    ],
    '사범교육': [
      { area: '국어', subjects: '화법과 언어, 독서와 작문', reason: '설명·전달력의 기초 소양' },
      { area: '교육·심리', subjects: '교육학(해당 시), 심리학(해당 시)', reason: '학습자 이해의 기초' },
      { area: '탐구', subjects: '사회와 문화, 융합과학탐구', reason: '전공 교과별 심화 이해' },
      { area: '진로선택', subjects: '교육 관련 융합선택(프로젝트형)', reason: '학습설계 능력 + 개별맞춤 대응 훈련' },
    ],
  };

  // 계열별 직업 미리보기 (job-pill 태그)
  const JOB_PREVIEW = {
    '공학': [
      { group: '공학·디자인 계열', pills: ['제품 디자이너', 'UX/UI 엔지니어', '3D프린팅운영전문가', '메타버스크리에이터'] },
      { group: '경영·기획 계열', pills: ['신사업아이디어컨설턴트', '데이터시각화디자이너'] },
    ],
    '자연': [
      { group: '연구·분석 계열', pills: ['연구원', '데이터 분석가', '환경컨설턴트'] },
    ],
    '의약': [
      { group: '보건·의료 계열', pills: ['임상연구코디네이터', '보건정보관리사', '재활치료사'] },
    ],
    '예체능': [
      { group: '디자인·콘텐츠 계열', pills: ['콘텐츠 크리에이터', '전시기획자', '공간디자이너'] },
    ],
    '사회': [
      { group: '경영·기획 계열', pills: ['신사업아이디어컨설턴트', '정책분석가', '마케팅기획자'] },
    ],
    '인문': [
      { group: '문화·콘텐츠 계열', pills: ['출판편집자', '문화콘텐츠기획자', '번역가'] },
    ],
    '공공서비스': [
      { group: '공공행정·치안 계열', pills: ['경찰관', '항공보안요원', '사회복지사'] },
    ],
    '사범교육': [
      { group: '교육 계열', pills: ['초등교사', '특수교사', '교육콘텐츠기획자'] },
    ],
  };

  // ===== 영어 콘텐츠 =====
  const CATEGORY_LABEL_EN = { '인문':'Humanities', '사회':'Social Sciences', '자연':'Natural Sciences', '공학':'Engineering', '예체능':'Arts', '의약':'Medicine/Health', '공공서비스':'Public Service', '사범교육':'Education (Teaching)' };
  const CATEGORY_REASON_EN = {
    '인문': { high: 'ability to synthesize text and context', low: 'sequential argumentation needs some work' },
    '사회': { high: 'contextual synthesis & persuasion strategy', low: 'systematic data organization needs work' },
    '자연': { high: 'hypothesis-testing planning', low: 'precise calculation drills needed' },
    '공학': { high: 'structural design & problem-solving planning', low: 'procedure-verification habits needed' },
    '예체능': { high: 'intuitive synthesis & creative expression', low: 'finishing/polish training needed' },
    '의약': { high: 'precise, repeated-procedure execution', low: 'precise, repeated-procedure training needed' },
    '공공서비스': { high: 'field responsiveness & rule-following', low: 'training for handling the unexpected needed' },
    '사범교육': { high: 'explaining clearly & designing instruction', low: 'training for adapting to individual learners needed' },
  };
  const SUBJECT_GUIDE_EN = {
    '공학': [
      { area: 'Math', subjects: 'Geometry, Calculus II, AI Mathematics', reason: 'Core reasoning foundation for engineering/design' },
      { area: 'Science', subjects: 'Physics, Mechanics & Energy, Integrated Science Inquiry', reason: 'Basis for structural/system understanding & design' },
      { area: 'Tech/Info', subjects: 'Informatics, Data Science, AI Fundamentals', reason: 'Turns strength into applied skill' },
      { area: 'Career elective', subjects: 'Creative Management, Project-based elective', reason: 'Exercises planning strength + trains weaker axis' },
    ],
    '자연': [
      { area: 'Math', subjects: 'Calculus II, Geometry, Probability & Statistics', reason: 'Logical reasoning foundation for natural sciences' },
      { area: 'Science', subjects: 'Chemistry, Biology, Cells & Metabolism', reason: 'Basis for hypothesis-testing inquiry' },
      { area: 'Tech/Info', subjects: 'Data Science, Informatics', reason: 'Strengthens data-driven analysis' },
      { area: 'Career elective', subjects: 'Science Research Project, Integrated Science Inquiry', reason: 'Trains experiment design & verification' },
    ],
    '의약': [
      { area: 'Math', subjects: 'Probability & Statistics, Calculus II', reason: 'Quantitative-analysis foundation for health sciences' },
      { area: 'Science', subjects: 'Biology, Chemistry, Cells & Metabolism', reason: 'Basic literacy in physiology & pharmacology' },
      { area: 'Tech/Info', subjects: 'Health, Informatics', reason: 'Understanding clinical/health data' },
      { area: 'Career elective', subjects: 'Integrated Science Inquiry, Social Issues Inquiry', reason: 'Trains precise procedure + communication skills' },
    ],
    '예체능': [
      { area: 'Math', subjects: 'Math I & II (basic)', reason: 'Meets minimum admission requirements' },
      { area: 'Science', subjects: 'Integrated Science', reason: 'Meets minimum admission requirements' },
      { area: 'Tech/Info', subjects: 'Informatics, Art & Media (if offered)', reason: 'Digital tool proficiency' },
      { area: 'Career elective', subjects: 'Art & Media, Project-based elective', reason: 'Turns intuitive expression into polished output' },
    ],
    '사회': [
      { area: 'Math', subjects: 'Probability & Statistics', reason: 'Foundation for interpreting social-science data' },
      { area: 'Inquiry', subjects: 'Society and Culture, Politics, Law and Society', reason: 'Foundation for contextual synthesis & persuasion' },
      { area: 'Tech/Info', subjects: 'Informatics', reason: 'Understanding data-driven policy/strategy' },
      { area: 'Career elective', subjects: 'Social Issues Inquiry, Project-based elective', reason: 'Trains planning strength via real projects' },
    ],
    '인문': [
      { area: 'Korean', subjects: 'Speech & Language, Reading & Writing', reason: 'Foundation for textual interpretation & argument' },
      { area: 'Inquiry', subjects: 'World History, Ethics & Thought', reason: 'Foundation for contextual synthesis' },
      { area: 'Foreign Language', subjects: 'Advanced foreign-language courses', reason: 'Prepares for original-text reading in major' },
      { area: 'Career elective', subjects: 'Reading Classics, Project-based elective', reason: 'Trains sequential argumentation' },
    ],
    '공공서비스': [
      { area: 'Social Studies', subjects: 'Politics, Law and Society', reason: 'Institutional foundation for administration/policing/welfare fieldwork' },
      { area: 'Inquiry', subjects: 'Social Issues Inquiry, Society and Culture', reason: 'Field-response and community-understanding literacy' },
      { area: 'PE/Safety', subjects: 'Sports for Life, Safe Society', reason: 'Physical fitness & field-response foundation' },
      { area: 'Career elective', subjects: 'Social Issues Inquiry, Project-based elective', reason: 'Trains rule-following + handling the unexpected' },
    ],
    '사범교육': [
      { area: 'Korean', subjects: 'Speech & Language, Reading & Writing', reason: 'Foundation for explaining and conveying ideas' },
      { area: 'Education/Psychology', subjects: 'Education (if offered), Psychology (if offered)', reason: 'Foundation for understanding learners' },
      { area: 'Inquiry', subjects: 'Society and Culture, Integrated Science Inquiry', reason: 'Deepens subject-specific understanding' },
      { area: 'Career elective', subjects: 'Education-related project-based elective', reason: 'Trains instructional design + individualized adaptation' },
    ],
  };
  const JOB_PREVIEW_EN = {
    '공학': [
      { group: 'Engineering & Design', pills: ['Product Designer', 'UX/UI Engineer', '3D Printing Specialist', 'Metaverse Creator'] },
      { group: 'Business & Planning', pills: ['New-Business Idea Consultant', 'Data Visualization Designer'] },
    ],
    '자연': [ { group: 'Research & Analysis', pills: ['Researcher', 'Data Analyst', 'Environmental Consultant'] } ],
    '의약': [ { group: 'Health & Medicine', pills: ['Clinical Research Coordinator', 'Health Information Manager', 'Rehabilitation Therapist'] } ],
    '예체능': [ { group: 'Design & Content', pills: ['Content Creator', 'Exhibition Planner', 'Spatial Designer'] } ],
    '사회': [ { group: 'Business & Planning', pills: ['New-Business Idea Consultant', 'Policy Analyst', 'Marketing Planner'] } ],
    '인문': [ { group: 'Culture & Content', pills: ['Publishing Editor', 'Cultural Content Planner', 'Translator'] } ],
    '공공서비스': [ { group: 'Public Administration & Safety', pills: ['Police Officer', 'Aviation Security Officer', 'Social Worker'] } ],
    '사범교육': [ { group: 'Education', pills: ['Elementary Teacher', 'Special Education Teacher', 'Education Content Planner'] } ],
  };

  global.DCasTeenDeptEngine = {
    CATEGORY_MAJORS: CATEGORY_MAJORS, CATEGORY_REASON: CATEGORY_REASON,
    SUBJECT_GUIDE: SUBJECT_GUIDE, JOB_PREVIEW: JOB_PREVIEW,
    CATEGORY_LABEL_EN: CATEGORY_LABEL_EN, CATEGORY_REASON_EN: CATEGORY_REASON_EN,
    SUBJECT_GUIDE_EN: SUBJECT_GUIDE_EN, JOB_PREVIEW_EN: JOB_PREVIEW_EN,
    rankCategories: rankCategories, rankMajors: rankMajors, fitPct: fitPct,
  };
})(typeof window !== 'undefined' ? window : globalThis);
