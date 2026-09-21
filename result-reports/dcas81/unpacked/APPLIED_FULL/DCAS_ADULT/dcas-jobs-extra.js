/**
 * D-CAS 성인 리포트 — 추가 학과·직무 데이터 (패치)
 *
 * ★★★ 스코프 안내 ★★★
 * 요청하신 3가지만 다룹니다:
 *   1) 학과 추가 (공공서비스계열 5개 + 사범교육계열 8개)
 *   2) "기타" 직접 입력 학과 지원
 *   3) 위 학과들에 대한 직무 추천(점수 기반 매칭)
 * 기존에 남아있던 다른 미완료 항목(48개 학과 중 나머지 매핑, 06번 감수 플래그 등)은
 * 이번 패치 범위가 아니라 건드리지 않았습니다.
 *
 * pass_profile 수치는 dcas-major-requirements.js와 동일한 성격의 "1차 추정치"입니다.
 * 항공보안학과 10개 항목은 2026-09-22 소유자 결정에 따라 전문가 업데이트 전까지
 * 운영 기준값으로 사용합니다. 출처 추적을 위해 attr_source: 'estimated'는 유지합니다.
 */
(function (global) {

  const JOB_POOL_EXTRA = [
    // ===== 공공서비스계열 · 경찰행정과 =====
    { id: 901, label_ko: '경찰공무원', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-PA', middle_name: '공공행정·치안(경찰행정)' },
      pass_profile: { planning: 78, attention: 88, simultaneous: 74, successive: 80 }, interest_code: 'OSA', interest_top1: '안전·통제형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 902, label_ko: '교정직 공무원', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-PA', middle_name: '공공행정·치안(경찰행정)' },
      pass_profile: { planning: 76, attention: 86, simultaneous: 70, successive: 82 }, interest_code: 'OSA', interest_top1: '안전·통제형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 903, label_ko: '범죄분석관', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-PA', middle_name: '공공행정·치안(경찰행정)' },
      pass_profile: { planning: 84, attention: 82, simultaneous: 80, successive: 86 }, interest_code: 'AOB', interest_top1: '분석·탐구형', entry_level: 'retool', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 904, label_ko: '보호관찰관', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-PA', middle_name: '공공행정·치안(경찰행정)' },
      pass_profile: { planning: 80, attention: 80, simultaneous: 78, successive: 78 }, interest_code: 'OSA', interest_top1: '안전·통제형', entry_level: 'bridge', attr_source: 'estimated', attr_confidence: 0.5 },

    // ===== 공공서비스계열 · 항공보안학과 (files.zip v2 통합) =====
    { id: 9101, i18n_key: '항공보안학과.airport-sec-admin', label_ko: '공항보안 사무직', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-AV', middle_name: '공공행정·치안(항공보안)' },
      pass_profile: { planning: 82, attention: 76, simultaneous: 76, successive: 84 }, interest_code: 'OAQ', interest_top1: '관리·정밀형', entry_level: 'bridge', job_group_ko: '⑤ 보안기획·관리', attr_source: 'estimated', attr_confidence: 0.5, competency_note: '항공보안 기본계획·규정 관리, 관련 고시·훈령 검토, 유관기관 협조 문서 처리.' },
    { id: 9102, i18n_key: '항공보안학과.airline-sec-admin', label_ko: '항공사보안 사무직', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-AV', middle_name: '공공행정·치안(항공보안)' },
      pass_profile: { planning: 82, attention: 74, simultaneous: 78, successive: 80 }, interest_code: 'OAQ', interest_top1: '관리·정밀형', entry_level: 'bridge', job_group_ko: '④ 항공사 보안 운영', attr_source: 'estimated', attr_confidence: 0.5, competency_note: '항공사 보안절차 이행·협력업체 조정 등 사무 업무.' },
    { id: 9103, i18n_key: '항공보안학과.avsec-screener', label_ko: '항공보안검색요원', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-AV', middle_name: '공공행정·치안(항공보안)' },
      pass_profile: { planning: 72, attention: 92, simultaneous: 80, successive: 78 }, interest_code: 'OSA', interest_top1: '안전·통제형', entry_level: 'direct', job_group_ko: '① 보안검색', attr_source: 'estimated', attr_confidence: 0.5, competency_note: 'X-ray 영상 판독, 검색 절차 준수, 장시간 집중과 세밀한 관찰이 필요한 업무.' },
    { id: 9104, i18n_key: '항공보안학과.airport-guard', label_ko: '항공경비요원', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-AV', middle_name: '공공행정·치안(항공보안)' },
      pass_profile: { planning: 70, attention: 86, simultaneous: 74, successive: 80 }, interest_code: 'OSA', interest_top1: '안전·통제형', entry_level: 'direct', job_group_ko: '② 출입통제·항공경비', attr_source: 'estimated', attr_confidence: 0.5, competency_note: '출입권한 확인·순찰 등 절차 기반 경비 업무.' },
    { id: 9105, i18n_key: '항공보안학과.counter-terror', label_ko: '대테러보안요원', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-AV', middle_name: '공공행정·치안(항공보안)' },
      pass_profile: { planning: 78, attention: 88, simultaneous: 86, successive: 80 }, interest_code: 'SOA', interest_top1: '안전·통제형', entry_level: 'retool', job_group_ko: '③ 보안상황 감시·대응', attr_source: 'estimated', attr_confidence: 0.5, competency_note: '이상상황 판단·현장대응 협조 등 위기관리와 별도 교육·자격이 필요한 업무.' },
    { id: 9106, i18n_key: '항공보안학과.airline-sec-officer', label_ko: '항공사보안요원', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-AV', middle_name: '공공행정·치안(항공보안)' },
      pass_profile: { planning: 74, attention: 88, simultaneous: 78, successive: 78 }, interest_code: 'OSA', interest_top1: '안전·통제형', entry_level: 'direct', job_group_ko: '④ 항공사 보안 운영', attr_source: 'estimated', attr_confidence: 0.5, competency_note: '항공기·화물 보안 운영의 현장 이행 업무.' },
    { id: 9107, i18n_key: '항공보안학과.cargo-sec-officer', label_ko: '항공화물보안요원', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-AV', middle_name: '공공행정·치안(항공보안)' },
      pass_profile: { planning: 76, attention: 88, simultaneous: 76, successive: 84 }, interest_code: 'OSQ', interest_top1: '안전·통제형', entry_level: 'direct', job_group_ko: '① 보안검색', attr_source: 'estimated', attr_confidence: 0.5, competency_note: '화물 검색·통관 서류 등 절차와 문서 처리 비중이 높은 업무.' },
    { id: 9108, i18n_key: '항공보안학과.industrial-sec-admin', label_ko: '산업보안 사무직', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-IS', middle_name: '공공행정·치안(산업보안)' },
      pass_profile: { planning: 84, attention: 78, simultaneous: 80, successive: 82 }, interest_code: 'AOQ', interest_top1: '분석·탐구형', entry_level: 'bridge', job_group_ko: '⑦ 국가중요시설·기업보안', attr_source: 'estimated', attr_confidence: 0.5, competency_note: '자산 식별·위험평가·보안계획 수립·관련 법규 검토 업무.' },
    { id: 9109, i18n_key: '항공보안학과.industrial-sec-guard', label_ko: '산업보안 경비요원', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-IS', middle_name: '공공행정·치안(산업보안)' },
      pass_profile: { planning: 70, attention: 86, simultaneous: 74, successive: 78 }, interest_code: 'OSA', interest_top1: '안전·통제형', entry_level: 'direct', job_group_ko: '⑦ 국가중요시설·기업보안', attr_source: 'estimated', attr_confidence: 0.5, competency_note: '산업시설의 출입통제·순찰 등 물리보안 업무.' },
    { id: 9110, i18n_key: '항공보안학과.industrial-sec-screener', label_ko: '산업보안검색요원', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-IS', middle_name: '공공행정·치안(산업보안)' },
      pass_profile: { planning: 74, attention: 90, simultaneous: 78, successive: 80 }, interest_code: 'OSA', interest_top1: '안전·통제형', entry_level: 'direct', job_group_ko: '⑦ 국가중요시설·기업보안', attr_source: 'estimated', attr_confidence: 0.5, competency_note: '반출입 물품·인원 검색을 통한 기술유출 방지 업무.' },

    // ===== 공공서비스계열 · 사회복지과 =====
    { id: 921, label_ko: '사회복지사', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-SW', middle_name: '사회복지·상담' },
      pass_profile: { planning: 76, attention: 78, simultaneous: 84, successive: 74 }, interest_code: 'SOB', interest_top1: '돌봄·지원형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 922, label_ko: '지역사회복지사', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-SW', middle_name: '사회복지·상담' },
      pass_profile: { planning: 78, attention: 76, simultaneous: 86, successive: 72 }, interest_code: 'SOB', interest_top1: '돌봄·지원형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 923, label_ko: '정신건강사회복지사', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-SW', middle_name: '사회복지·상담' },
      pass_profile: { planning: 76, attention: 80, simultaneous: 88, successive: 74 }, interest_code: 'SOA', interest_top1: '돌봄·지원형', entry_level: 'retool', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 924, label_ko: '의료사회복지사', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-SW', middle_name: '사회복지·상담' },
      pass_profile: { planning: 80, attention: 82, simultaneous: 82, successive: 78 }, interest_code: 'SOB', interest_top1: '돌봄·지원형', entry_level: 'bridge', attr_source: 'estimated', attr_confidence: 0.5 },

    // ===== 영유아교육·보육 (공공서비스계열 유아교육과 + 사범교육계열 유아교육 공용) =====
    { id: 931, label_ko: '유치원교사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-EC', middle_name: '영유아교육·보육' },
      pass_profile: { planning: 78, attention: 82, simultaneous: 86, successive: 74 }, interest_code: 'SAB', interest_top1: '돌봄·지원형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 932, label_ko: '보육교사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-EC', middle_name: '영유아교육·보육' },
      pass_profile: { planning: 74, attention: 84, simultaneous: 84, successive: 72 }, interest_code: 'SAB', interest_top1: '돌봄·지원형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 933, label_ko: '유아교육프로그램개발자', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-EC', middle_name: '영유아교육·보육' },
      pass_profile: { planning: 84, attention: 76, simultaneous: 88, successive: 78 }, interest_code: 'ASB', interest_top1: '기획·창의형', entry_level: 'retool', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 934, label_ko: '어린이집 원장 · 기관운영자', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-EC', middle_name: '영유아교육·보육' },
      pass_profile: { planning: 86, attention: 78, simultaneous: 82, successive: 80 }, interest_code: 'OSB', interest_top1: '관리·정밀형', entry_level: 'bridge', attr_source: 'estimated', attr_confidence: 0.5 },

    // ===== 공공서비스계열 · 평생교육융합학부 =====
    { id: 941, label_ko: '평생교육사', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-LL', middle_name: '평생교육·인재개발' },
      pass_profile: { planning: 80, attention: 76, simultaneous: 84, successive: 76 }, interest_code: 'SAB', interest_top1: '기획·창의형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 942, label_ko: '기업교육담당자(HRD)', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-LL', middle_name: '평생교육·인재개발' },
      pass_profile: { planning: 84, attention: 78, simultaneous: 82, successive: 80 }, interest_code: 'OAB', interest_top1: '기획·창의형', entry_level: 'bridge', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 943, label_ko: '교육프로그램기획자', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-LL', middle_name: '평생교육·인재개발' },
      pass_profile: { planning: 86, attention: 76, simultaneous: 86, successive: 78 }, interest_code: 'ASB', interest_top1: '기획·창의형', entry_level: 'retool', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 944, label_ko: '학습컨설턴트', ncs: { major: 'EX', major_name: '공공서비스계열(임시분류)', middle: 'EX-LL', middle_name: '평생교육·인재개발' },
      pass_profile: { planning: 80, attention: 78, simultaneous: 84, successive: 76 }, interest_code: 'SAB', interest_top1: '돌봄·지원형', entry_level: 'bridge', attr_source: 'estimated', attr_confidence: 0.5 },

    // ===== 사범교육계열 · 초등교육 =====
    { id: 951, label_ko: '초등학교교사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-EL', middle_name: '초등교육' },
      pass_profile: { planning: 82, attention: 82, simultaneous: 86, successive: 78 }, interest_code: 'SAB', interest_top1: '지도·교육형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 952, label_ko: '초등돌봄전담사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-EL', middle_name: '초등교육' },
      pass_profile: { planning: 74, attention: 82, simultaneous: 82, successive: 72 }, interest_code: 'SAB', interest_top1: '돌봄·지원형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 953, label_ko: '방과후프로그램기획자', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-EL', middle_name: '초등교육' },
      pass_profile: { planning: 82, attention: 76, simultaneous: 84, successive: 76 }, interest_code: 'ASB', interest_top1: '기획·창의형', entry_level: 'bridge', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 954, label_ko: '교육과정개발자', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-EL', middle_name: '초등교육' },
      pass_profile: { planning: 86, attention: 78, simultaneous: 84, successive: 84 }, interest_code: 'AOB', interest_top1: '기획·창의형', entry_level: 'retool', attr_source: 'estimated', attr_confidence: 0.5 },

    // ===== 사범교육계열 · 특수교육 =====
    { id: 961, label_ko: '특수학교교사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-SP', middle_name: '특수교육' },
      pass_profile: { planning: 82, attention: 88, simultaneous: 84, successive: 80 }, interest_code: 'SOA', interest_top1: '돌봄·지원형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 962, label_ko: '통합교육지원교사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-SP', middle_name: '특수교육' },
      pass_profile: { planning: 78, attention: 86, simultaneous: 82, successive: 78 }, interest_code: 'SOA', interest_top1: '돌봄·지원형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 963, label_ko: '특수교육 치료지원사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-SP', middle_name: '특수교육' },
      pass_profile: { planning: 76, attention: 88, simultaneous: 80, successive: 76 }, interest_code: 'SOA', interest_top1: '돌봄·지원형', entry_level: 'bridge', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 964, label_ko: '특수교육행정가', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-SP', middle_name: '특수교육' },
      pass_profile: { planning: 84, attention: 80, simultaneous: 80, successive: 82 }, interest_code: 'OSA', interest_top1: '관리·정밀형', entry_level: 'retool', attr_source: 'estimated', attr_confidence: 0.5 },

    // ===== 사범교육계열 · 언어교육 =====
    { id: 971, label_ko: '국어교사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-LG', middle_name: '언어교육' },
      pass_profile: { planning: 80, attention: 80, simultaneous: 78, successive: 84 }, interest_code: 'SAO', interest_top1: '지도·교육형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 972, label_ko: '외국어교사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-LG', middle_name: '언어교육' },
      pass_profile: { planning: 78, attention: 80, simultaneous: 80, successive: 82 }, interest_code: 'SAO', interest_top1: '지도·교육형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 973, label_ko: '언어재활사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-LG', middle_name: '언어교육' },
      pass_profile: { planning: 78, attention: 86, simultaneous: 78, successive: 84 }, interest_code: 'SOA', interest_top1: '돌봄·지원형', entry_level: 'retool', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 974, label_ko: '언어교재·콘텐츠개발자', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-LG', middle_name: '언어교육' },
      pass_profile: { planning: 84, attention: 78, simultaneous: 80, successive: 86 }, interest_code: 'AOB', interest_top1: '기획·창의형', entry_level: 'bridge', attr_source: 'estimated', attr_confidence: 0.5 },

    // ===== 사범교육계열 · 사회인문교육 =====
    { id: 981, label_ko: '사회교사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-HU', middle_name: '사회·인문교육' },
      pass_profile: { planning: 80, attention: 78, simultaneous: 82, successive: 82 }, interest_code: 'SAO', interest_top1: '지도·교육형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 982, label_ko: '역사교사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-HU', middle_name: '사회·인문교육' },
      pass_profile: { planning: 78, attention: 78, simultaneous: 80, successive: 86 }, interest_code: 'AOS', interest_top1: '분석·탐구형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 983, label_ko: '시민교육강사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-HU', middle_name: '사회·인문교육' },
      pass_profile: { planning: 78, attention: 76, simultaneous: 84, successive: 78 }, interest_code: 'SAB', interest_top1: '기획·창의형', entry_level: 'bridge', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 984, label_ko: '사회·인문 교육콘텐츠기획자', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-HU', middle_name: '사회·인문교육' },
      pass_profile: { planning: 84, attention: 76, simultaneous: 82, successive: 82 }, interest_code: 'AOB', interest_top1: '기획·창의형', entry_level: 'retool', attr_source: 'estimated', attr_confidence: 0.5 },

    // ===== 사범교육계열 · 수학과학교육 =====
    { id: 991, label_ko: '수학교사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-MS', middle_name: '수학·과학교육' },
      pass_profile: { planning: 86, attention: 80, simultaneous: 78, successive: 88 }, interest_code: 'AOS', interest_top1: '분석·탐구형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 992, label_ko: '과학교사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-MS', middle_name: '수학·과학교육' },
      pass_profile: { planning: 84, attention: 82, simultaneous: 80, successive: 86 }, interest_code: 'AOS', interest_top1: '분석·탐구형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 993, label_ko: 'STEM 교육콘텐츠개발자', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-MS', middle_name: '수학·과학교육' },
      pass_profile: { planning: 86, attention: 78, simultaneous: 84, successive: 84 }, interest_code: 'AOB', interest_top1: '기획·창의형', entry_level: 'retool', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 994, label_ko: '과학관 교육사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-MS', middle_name: '수학·과학교육' },
      pass_profile: { planning: 80, attention: 78, simultaneous: 84, successive: 78 }, interest_code: 'ASB', interest_top1: '지도·교육형', entry_level: 'bridge', attr_source: 'estimated', attr_confidence: 0.5 },

    // ===== 사범교육계열 · 기술생활교육 =====
    { id: 1001, label_ko: '기술·가정교사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-TL', middle_name: '기술·생활교육' },
      pass_profile: { planning: 80, attention: 80, simultaneous: 80, successive: 82 }, interest_code: 'OAS', interest_top1: '관리·정밀형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 1002, label_ko: '진로직업교사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-TL', middle_name: '기술·생활교육' },
      pass_profile: { planning: 80, attention: 76, simultaneous: 84, successive: 78 }, interest_code: 'SAB', interest_top1: '지도·교육형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 1003, label_ko: '창업교육강사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-TL', middle_name: '기술·생활교육' },
      pass_profile: { planning: 84, attention: 74, simultaneous: 86, successive: 76 }, interest_code: 'ASB', interest_top1: '기획·창의형', entry_level: 'bridge', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 1004, label_ko: '메이커교육지도사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-TL', middle_name: '기술·생활교육' },
      pass_profile: { planning: 78, attention: 78, simultaneous: 86, successive: 76 }, interest_code: 'ASB', interest_top1: '기획·창의형', entry_level: 'bridge', attr_source: 'estimated', attr_confidence: 0.5 },

    // ===== 사범교육계열 · 예술체육교육 =====
    { id: 1011, label_ko: '음악교사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-AP', middle_name: '예술·체육교육' },
      pass_profile: { planning: 78, attention: 78, simultaneous: 88, successive: 76 }, interest_code: 'ASB', interest_top1: '지도·교육형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 1012, label_ko: '체육교사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-AP', middle_name: '예술·체육교육' },
      pass_profile: { planning: 76, attention: 80, simultaneous: 86, successive: 74 }, interest_code: 'SOB', interest_top1: '지도·교육형', entry_level: 'direct', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 1013, label_ko: '예술강사', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-AP', middle_name: '예술·체육교육' },
      pass_profile: { planning: 76, attention: 76, simultaneous: 90, successive: 72 }, interest_code: 'ASB', interest_top1: '기획·창의형', entry_level: 'bridge', attr_source: 'estimated', attr_confidence: 0.5 },
    { id: 1014, label_ko: '문화예술교육기획자', ncs: { major: 'EX', major_name: '교육계열(임시분류)', middle: 'EX-AP', middle_name: '예술·체육교육' },
      pass_profile: { planning: 84, attention: 76, simultaneous: 88, successive: 78 }, interest_code: 'ASB', interest_top1: '기획·창의형', entry_level: 'retool', attr_source: 'estimated', attr_confidence: 0.5 },
  ];

  /* ===== "기타" 직접 입력 학과명 → 계열 자동 추정용 키워드맵 =====
   * 정확히 일치하는 학과 데이터가 없을 때, 입력 텍스트에 포함된 키워드로
   * 가장 가까운 계열을 1차로 추정한다. 매칭 안 되면 UI에서 수동 선택으로 넘어간다.
   */
  const CUSTOM_MAJOR_KEYWORDS = [
    { keywords: ['컴퓨터', '소프트웨어', '정보통신', '전산'], ncsMiddle: '정보기술(SW)', label: '컴퓨터공학·IT 계열' },
    { keywords: ['경찰행정', '경찰', '치안', '수사'], ncsMiddle: '공공행정·치안(경찰행정)', label: '공공행정·치안(경찰행정)' },
    { keywords: ['항공보안', '공항보안', '공항운영', '보안검색'], ncsMiddle: '공공행정·치안(항공보안)', label: '공공행정·치안(항공보안)' },
    { keywords: ['산업보안', '기업보안', '시설보안'], ncsMiddle: '공공행정·치안(산업보안)', label: '공공행정·치안(산업보안)' },
    { keywords: ['사회복지', '복지'], ncsMiddle: '사회복지·상담', label: '사회복지·상담' },
    { keywords: ['유아', '보육'], ncsMiddle: '영유아교육·보육', label: '영유아교육·보육' },
    { keywords: ['평생교육', '인재개발', 'hrd'], ncsMiddle: '평생교육·인재개발', label: '평생교육·인재개발' },
    { keywords: ['초등'], ncsMiddle: '초등교육', label: '초등교육' },
    { keywords: ['특수교육', '특수'], ncsMiddle: '특수교육', label: '특수교육' },
    { keywords: ['언어교육', '국어교육', '영어교육', '언어'], ncsMiddle: '언어교육', label: '언어교육' },
    { keywords: ['사회교육', '역사교육', '인문교육', '사회인문'], ncsMiddle: '사회·인문교육', label: '사회·인문교육' },
    { keywords: ['수학교육', '과학교육', '수학과학'], ncsMiddle: '수학·과학교육', label: '수학·과학교육' },
    { keywords: ['기술교육', '가정교육', '생활교육', '기술가정'], ncsMiddle: '기술·생활교육', label: '기술·생활교육' },
    { keywords: ['예술교육', '체육교육', '음악교육', '미술교육', '예체능'], ncsMiddle: '예술·체육교육', label: '예술·체육교육' },
  ];

  // 운영 승인과 산출 출처는 별도 축이다. 현재 값은 운영에 사용하지만 전문가 검수값으로 오인하지 않는다.
  JOB_POOL_EXTRA.forEach(function (job) {
    if (job.id >= 9101 && job.id <= 9110) {
      job.operational_status = 'owner-approved-interim';
      job.operational_baseline_date = '2026-09-22';
      job.replaced_by_expert_version = null;
    }
  });

  /* 수동 선택 fallback용 — 자동 키워드 매칭 실패 시 보여줄 계열 목록 (중복 제거) */
  const CATEGORY_LIST = [
    { ncsMiddle: '정보기술(SW)', label: '컴퓨터공학·IT 계열' },
    { ncsMiddle: '공공행정·치안(경찰행정)', label: '공공행정·치안(경찰행정)' },
    { ncsMiddle: '공공행정·치안(항공보안)', label: '공공행정·치안(항공보안)' },
    { ncsMiddle: '공공행정·치안(산업보안)', label: '공공행정·치안(산업보안)' },
    { ncsMiddle: '사회복지·상담', label: '사회복지·상담' },
    { ncsMiddle: '영유아교육·보육', label: '영유아교육·보육' },
    { ncsMiddle: '평생교육·인재개발', label: '평생교육·인재개발' },
    { ncsMiddle: '초등교육', label: '초등교육' },
    { ncsMiddle: '특수교육', label: '특수교육' },
    { ncsMiddle: '언어교육', label: '언어교육' },
    { ncsMiddle: '사회·인문교육', label: '사회·인문교육' },
    { ncsMiddle: '수학·과학교육', label: '수학·과학교육' },
    { ncsMiddle: '기술·생활교육', label: '기술·생활교육' },
    { ncsMiddle: '예술·체육교육', label: '예술·체육교육' },
  ];

  function guessCategory(rawText) {
    const text = (rawText || '').trim().toLowerCase();
    if (!text) return null;
    for (let i = 0; i < CUSTOM_MAJOR_KEYWORDS.length; i++) {
      const row = CUSTOM_MAJOR_KEYWORDS[i];
      for (let j = 0; j < row.keywords.length; j++) {
        if (text.indexOf(row.keywords[j].toLowerCase()) !== -1) return row;
      }
    }
    return null;
  }

  global.DCasJobsExtra = {
    JOB_POOL_EXTRA: JOB_POOL_EXTRA,
    CATEGORY_LIST: CATEGORY_LIST,
    guessCategory: guessCategory,
  };

})(typeof window !== 'undefined' ? window : globalThis);
