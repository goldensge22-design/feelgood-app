/**
 * D-CAS 47개 학과별 진출직무 보강 데이터 v1.0 (2026-09)
 *
 * - 학과별 5개 대표 진출경로를 독립 직무군으로 구성한다.
 * - 직업명/분류 방향: 커리어넷 학과·직업정보, NCS 24대 분류를 기준으로 수기 큐레이션.
 * - PASS 프로필: 실증 규준이 아니라 학과 요구벡터에 직무 활동 유형을 반영한 내부 추정치.
 * - O*NET의 abilities/tasks 구조는 직무 활동 유형을 구분하는 보조 틀로만 참고했다.
 * - 면허·자격·대학원 과정이 필요한 경로는 entry_level='retool'로 표시한다.
 */
(function (global) {
  'use strict';

  const CATALOG = {
    '국어국문학과': ['04','교육·자연·사회과학',[['출판편집자','precision','bridge'],['콘텐츠기획자','strategy','bridge'],['카피라이터','creative','bridge'],['한국어교원','people','retool'],['문학·문화연구원','research','retool']]],
    '영어영문학과': ['04','교육·자연·사회과학',[['번역가','precision','bridge'],['통역가','people','bridge'],['해외영업기획자','strategy','bridge'],['영문콘텐츠에디터','creative','bridge'],['영어교육콘텐츠개발자','people','bridge']]],
    '사학과': ['08','문화·예술·디자인·방송',[['학예연구사(큐레이터)','research','retool'],['기록물관리전문요원','precision','retool'],['역사연구원','research','retool'],['문화유산교육기획자','people','bridge'],['아카이브콘텐츠기획자','creative','bridge']]],
    '철학과': ['04','교육·자연·사회과학',[['인문사회연구원','research','retool'],['윤리·컴플라이언스 담당자','precision','bridge'],['논술·교육콘텐츠개발자','people','bridge'],['출판기획자','strategy','bridge'],['정책·리서치분석가','analysis','bridge']]],
    '문헌정보학과': ['08','문화·예술·디자인·방송',[['사서','precision','retool'],['기록물관리전문요원','precision','retool'],['지식정보관리자','strategy','bridge'],['데이터큐레이터','analysis','bridge'],['디지털아카이브기획자','creative','bridge']]],
    '중어중문학과': ['04','교육·자연·사회과학',[['중국어통번역가','people','bridge'],['중국지역전문가','research','bridge'],['해외영업담당자','strategy','bridge'],['중국어콘텐츠기획자','creative','bridge'],['국제교류담당자','people','bridge']]],
    '일어일문학과': ['04','교육·자연·사회과학',[['일본어통번역가','people','bridge'],['일본지역전문가','research','bridge'],['해외영업담당자','strategy','bridge'],['일본어콘텐츠기획자','creative','bridge'],['국제교류담당자','people','bridge']]],
    '문예창작학과': ['08','문화·예술·디자인·방송',[['작가·시나리오작가','creative','bridge'],['웹소설작가','creative','bridge'],['콘텐츠에디터','precision','bridge'],['출판기획자','strategy','bridge'],['방송작가','people','bridge']]],

    '경영학과': ['02','경영·회계·사무',[['경영기획자','strategy','bridge'],['마케팅전문가','creative','bridge'],['인사·조직담당자','people','bridge'],['재무·회계담당자','precision','bridge'],['사업개발담당자','strategy','bridge']]],
    '경제학과': ['03','금융·보험',[['경제연구원','research','retool'],['금융분석가','analysis','bridge'],['데이터분석가','analysis','bridge'],['정책분석가','strategy','bridge'],['시장조사분석가','people','bridge']]],
    '행정학과': ['01','사업관리',[['일반행정공무원','precision','retool'],['정책분석가','analysis','bridge'],['공공기관기획담당자','strategy','bridge'],['예산·재정담당자','precision','bridge'],['지역개발기획자','people','bridge']]],
    '사회학과': ['04','교육·자연·사회과학',[['사회조사분석가','analysis','bridge'],['정책연구원','research','retool'],['여론조사전문가','analysis','bridge'],['지역사회기획자','people','bridge'],['ESG·사회가치담당자','strategy','bridge']]],
    '심리학과': ['04','교육·자연·사회과학',[['상담심리사','people','retool'],['임상심리전문가','clinical','retool'],['산업·조직심리담당자','strategy','bridge'],['사용자경험리서처','research','bridge'],['심리검사·연구원','analysis','retool']]],
    '정치외교학과': ['04','교육·자연·사회과학',[['국제관계연구원','research','retool'],['외교·국제협력담당자','people','bridge'],['정책보좌·분석가','analysis','bridge'],['국제기구프로젝트담당자','strategy','bridge'],['정치·여론조사분석가','analysis','bridge']]],
    '법학과': ['05','법률·경찰·소방·교도·국방',[['변호사','analysis','retool'],['법무담당자','precision','bridge'],['준법감시·컴플라이언스담당자','precision','bridge'],['노무·인사법무담당자','people','bridge'],['법률·정책연구원','research','retool']]],
    '사회복지학과': ['07','사회복지·종교',[['사회복지사','people','retool'],['정신건강사회복지사','clinical','retool'],['복지정책연구원','research','retool'],['사례관리자','people','bridge'],['사회서비스기획자','strategy','bridge']]],

    '수학과': ['04','교육·자연·사회과학',[['수학연구원','research','retool'],['데이터사이언티스트','analysis','retool'],['보험계리사','precision','retool'],['금융퀀트분석가','analysis','retool'],['수학교육콘텐츠개발자','people','bridge']]],
    '물리학과': ['04','교육·자연·사회과학',[['물리학연구원','research','retool'],['반도체공정·소자연구원','precision','retool'],['광학·레이저엔지니어','analysis','bridge'],['데이터분석가','analysis','bridge'],['계측·시험연구원','field','bridge']]],
    '화학과': ['17','화학·바이오',[['화학연구원','research','retool'],['분석화학시험원','precision','bridge'],['의약품품질관리자','precision','bridge'],['화장품연구원','creative','bridge'],['소재연구원','research','retool']]],
    '생명과학과': ['17','화학·바이오',[['생명과학연구원','research','retool'],['바이오인포매틱스분석가','analysis','retool'],['임상시험코디네이터','people','bridge'],['바이오품질관리자','precision','bridge'],['환경생물연구원','field','retool']]],
    '통계학과': ['04','교육·자연·사회과학',[['통계연구원','research','retool'],['데이터분석가','analysis','bridge'],['데이터사이언티스트','analysis','retool'],['리스크분석가','precision','bridge'],['시장조사분석가','people','bridge']]],
    '지구환경과학과': ['23','환경·에너지·안전',[['지질학연구원','research','retool'],['기후데이터분석가','analysis','bridge'],['환경영향평가원','field','bridge'],['GIS공간정보분석가','analysis','bridge'],['자원탐사연구원','field','retool']]],
    '식품영양학과': ['21','식품가공',[['영양사','clinical','retool'],['임상영양사','clinical','retool'],['식품개발연구원','research','bridge'],['식품품질관리자','precision','bridge'],['식생활교육·정책담당자','people','bridge']]],

    '전자공학과': ['19','전기·전자',[['전자회로설계엔지니어','analysis','bridge'],['반도체설계엔지니어','research','retool'],['임베디드시스템엔지니어','precision','bridge'],['통신장비개발자','creative','bridge'],['전자제품시험·품질엔지니어','precision','bridge']]],
    '기계공학과': ['15','기계',[['기계설계엔지니어','creative','bridge'],['자동차연구개발엔지니어','research','bridge'],['생산기술엔지니어','field','bridge'],['로봇기구설계엔지니어','analysis','bridge'],['설비보전엔지니어','precision','bridge']]],
    '화학공학과': ['17','화학·바이오',[['공정설계엔지니어','analysis','bridge'],['화학플랜트운전·관리자','field','bridge'],['배터리소재연구원','research','retool'],['품질관리엔지니어','precision','bridge'],['안전환경엔지니어','field','bridge']]],
    '산업공학과': ['01','사업관리',[['생산관리자','strategy','bridge'],['품질경영전문가','precision','bridge'],['물류·공급망분석가','analysis','bridge'],['데이터기반프로세스혁신가','creative','bridge'],['경영컨설턴트','people','bridge']]],
    '건축학과': ['14','건설',[['건축설계사','creative','retool'],['도시·공간기획자','strategy','bridge'],['BIM매니저','analysis','bridge'],['건축시공관리자','field','bridge'],['건축환경·에너지컨설턴트','research','bridge']]],
    '토목공학과': ['14','건설',[['토목설계엔지니어','analysis','bridge'],['구조엔지니어','precision','bridge'],['건설사업관리자','strategy','bridge'],['측량·공간정보기술자','field','bridge'],['수자원·교통시설엔지니어','research','bridge']]],
    '신소재공학과': ['16','재료',[['소재연구원','research','retool'],['반도체소재엔지니어','analysis','bridge'],['금속재료엔지니어','field','bridge'],['세라믹·고분자연구원','creative','retool'],['재료시험·품질엔지니어','precision','bridge']]],
    '환경공학과': ['23','환경·에너지·안전',[['환경공학기술자','analysis','bridge'],['수질관리전문가','precision','bridge'],['대기환경전문가','field','bridge'],['폐기물자원화엔지니어','creative','bridge'],['환경안전·ESG담당자','strategy','bridge']]],

    '시각디자인학과': ['08','문화·예술·디자인·방송',[['그래픽디자이너','creative','bridge'],['브랜드디자이너','strategy','bridge'],['UI·UX디자이너','research','bridge'],['모션그래픽디자이너','field','bridge'],['편집디자이너','precision','bridge']]],
    '산업디자인학과': ['08','문화·예술·디자인·방송',[['제품디자이너','creative','bridge'],['UX디자이너','research','bridge'],['서비스디자이너','people','bridge'],['CMF디자이너','precision','bridge'],['디자인리서처','analysis','bridge']]],
    '음악학과': ['08','문화·예술·디자인·방송',[['연주자','field','bridge'],['작곡가','creative','bridge'],['음악감독','strategy','bridge'],['음향엔지니어','precision','bridge'],['음악교육·콘텐츠기획자','people','bridge']]],
    '체육학과': ['12','이용·숙박·여행·오락·스포츠',[['생활스포츠지도사','people','retool'],['운동처방사','clinical','retool'],['스포츠마케팅기획자','strategy','bridge'],['경기분석가','analysis','bridge'],['체육교육기획자','creative','bridge']]],
    '영화영상학과': ['08','문화·예술·디자인·방송',[['영화감독·연출가','strategy','bridge'],['영상촬영감독','field','bridge'],['영상편집자','precision','bridge'],['콘텐츠프로듀서','people','bridge'],['시나리오작가','creative','bridge']]],
    '실용음악학과': ['08','문화·예술·디자인·방송',[['보컬·연주자','field','bridge'],['작곡·편곡가','creative','bridge'],['음악프로듀서','strategy','bridge'],['공연기획자','people','bridge'],['음향엔지니어','precision','bridge']]],
    '무용학과': ['08','문화·예술·디자인·방송',[['무용수','field','bridge'],['안무가','creative','bridge'],['무용교육자','people','retool'],['공연기획자','strategy','bridge'],['움직임·문화예술 프로그램기획자','research','bridge']]],
    '공예학과': ['22','인쇄·목재·가구·공예',[['공예작가','creative','bridge'],['제품·소품디자이너','precision','bridge'],['문화상품개발자','strategy','bridge'],['공방운영자','field','bridge'],['전시·공예교육기획자','people','bridge']]],

    '간호학과': ['06','보건·의료',[['임상간호사','clinical','retool'],['전문간호사','research','retool'],['보건간호사','people','retool'],['임상연구간호사','analysis','retool'],['간호교육·QI담당자','strategy','retool']]],
    '약학과': ['06','보건·의료',[['약사','clinical','retool'],['병원약사','precision','retool'],['제약연구원','research','retool'],['의약품인허가담당자','strategy','bridge'],['약물안전관리자','analysis','bridge']]],
    '의예과': ['06','보건·의료',[['의사','clinical','retool'],['임상연구자','research','retool'],['공중보건의료전문가','people','retool'],['의료데이터연구자','analysis','retool'],['의료정책·병원관리전문가','strategy','retool']]],
    '치의예과': ['06','보건·의료',[['치과의사','clinical','retool'],['구강악안면외과전문의','field','retool'],['치과교정전문의','precision','retool'],['치의학연구원','research','retool'],['구강보건정책전문가','strategy','retool']]],
    '한의예과': ['06','보건·의료',[['한의사','clinical','retool'],['한방임상연구자','research','retool'],['한약·천연물연구원','analysis','retool'],['한방병원운영·기획자','strategy','retool'],['보건정책전문가','people','retool']]],
    '물리치료학과': ['06','보건·의료',[['물리치료사','clinical','retool'],['스포츠재활전문가','field','retool'],['신경계재활전문가','research','retool'],['근골격계재활전문가','precision','retool'],['재활프로그램기획자','people','bridge']]],
    '임상병리학과': ['06','보건·의료',[['임상병리사','clinical','retool'],['분자진단검사전문가','research','retool'],['병리검사품질관리자','precision','bridge'],['임상시험검체관리자','strategy','bridge'],['바이오진단연구원','analysis','retool']]],
    '보건행정학과': ['06','보건·의료',[['보건의료정보관리사','precision','retool'],['병원행정담당자','strategy','bridge'],['건강보험심사담당자','analysis','bridge'],['보건정책분석가','research','bridge'],['의료서비스기획자','people','bridge']]]
  };

  const MOD = {
    strategy: {P:8,A:-3,S:4,Q:-2, interest:'기획·관리형'},
    analysis: {P:4,A:2,S:1,Q:6, interest:'분석·탐구형'},
    precision:{P:0,A:8,S:-3,Q:7, interest:'관리·정밀형'},
    creative: {P:-3,A:-4,S:9,Q:-5, interest:'기획·창의형'},
    people:   {P:-1,A:0,S:8,Q:-4, interest:'소통·지원형'},
    field:    {P:-2,A:7,S:3,Q:0, interest:'제작·실행형'},
    research: {P:4,A:6,S:3,Q:5, interest:'분석·탐구형'},
    clinical: {P:1,A:9,S:0,Q:7, interest:'보건·지원형'}
  };
  // 동일 활동유형의 직무도 완전히 같은 고정점수가 되지 않도록 미세 차등한다.
  const JITTER = [
    {P:1,A:0,S:0,Q:-1}, {P:-1,A:1,S:0,Q:1}, {P:0,A:-1,S:1,Q:0},
    {P:2,A:0,S:-1,Q:0}, {P:-2,A:0,S:0,Q:2}
  ];
  const clamp = n => Math.max(45, Math.min(95, n));
  const requirements = global.DCAS_MAJOR_REQUIREMENTS || {};
  const pool = [];
  const majorMap = {};
  let id = 2001;

  Object.keys(CATALOG).forEach(function (major) {
    const row = CATALOG[major];
    const middleName = '전공진로::' + major;
    const base = requirements[major] || {P:72,A:72,S:72,Q:72};
    majorMap[major] = middleName;
    if (global.DCasJobEngine && global.DCasJobEngine.registerMajor) {
      global.DCasJobEngine.registerMajor(major, middleName);
    }
    row[2].forEach(function (job, index) {
      const m = MOD[job[1]];
      const j = JITTER[index];
      pool.push({
        id: id++, label_ko: job[0],
        ncs: {major: row[0], major_name: row[1], middle: 'DCAS-' + row[0] + '-' + String(index + 1).padStart(2,'0'), middle_name: middleName},
        pass_profile: {planning:clamp(base.P+m.P+j.P), attention:clamp(base.A+m.A+j.A), simultaneous:clamp(base.S+m.S+j.S), successive:clamp(base.Q+m.Q+j.Q)},
        interest_code: 'DCAS', interest_top1: m.interest, entry_level: job[2],
        attr_source: 'career-curated-estimate', attr_confidence: 0.55,
        evidence_basis: 'CareerNet major/occupation information; NCS major classification; O*NET ability/task framework (reference only)',
        caution: job[2] === 'retool' ? '관련 면허·자격·대학원·선발 절차 등 추가 요건 확인 필요' : '채용별 세부 요건 확인 필요'
      });
    });
  });

  // 기존 공공서비스·사범교육 직무군은 4개씩만 있어 TOP5의 한 칸이 비었다.
  // 각 군에 서로 다른 프로필의 진로 1개를 보강해 모든 선택 학과가 5개 이상이 되게 한다.
  const GAP_JOBS = [
    ['범죄예방기획담당자','05','법률·경찰·소방·교도·국방','공공행정·치안(경찰행정)',82,78,84,74,'strategy','bridge'],
    ['항공보안교육담당자','11','경비·청소','공공행정·치안(항공보안)',78,86,80,82,'people','bridge'],
    ['사회복지행정담당자','07','사회복지·종교','사회복지·상담',78,78,80,78,'precision','bridge'],
    ['유아교육콘텐츠개발자','04','교육·자연·사회과학','영유아교육·보육',78,76,88,74,'creative','bridge'],
    ['성인학습상담가','04','교육·자연·사회과학','평생교육·인재개발',80,76,86,76,'people','bridge'],
    ['유아교육연구·기획자','04','교육·자연·사회과학','영유아교육·보육',82,78,86,78,'research','retool'],
    ['초등교육콘텐츠개발자','04','교육·자연·사회과학','초등교육',82,76,88,76,'creative','bridge'],
    ['보조공학·특수교육콘텐츠개발자','04','교육·자연·사회과학','특수교육',82,82,86,80,'analysis','bridge'],
    ['언어평가·교재개발자','04','교육·자연·사회과학','언어교육',80,80,84,84,'precision','bridge'],
    ['사회교육콘텐츠개발자','04','교육·자연·사회과학','사회·인문교육',82,76,88,78,'creative','bridge'],
    ['STEM교육프로그램개발자','04','교육·자연·사회과학','수학·과학교육',86,80,86,84,'research','bridge'],
    ['에듀테크·메이커교육기획자','04','교육·자연·사회과학','기술·생활교육',84,78,88,76,'strategy','bridge'],
    ['예술체육교육프로그램기획자','08','문화·예술·디자인·방송','예술·체육교육',82,78,90,74,'creative','bridge']
  ];
  GAP_JOBS.forEach(function (g) {
    pool.push({id:id++, label_ko:g[0], ncs:{major:g[1],major_name:g[2],middle:'DCAS-GAP',middle_name:g[3]},
      pass_profile:{planning:g[4],attention:g[5],simultaneous:g[6],successive:g[7]},
      interest_code:'DCAS',interest_top1:MOD[g[8]].interest,entry_level:g[9],
      attr_source:'career-curated-estimate',attr_confidence:0.55,
      evidence_basis:'CareerNet major/occupation information; NCS major classification; O*NET ability/task framework (reference only)',
      caution:g[9]==='retool'?'관련 면허·자격·대학원·선발 절차 등 추가 요건 확인 필요':'채용별 세부 요건 확인 필요'});
  });

  global.DCasMajor47 = {JOB_POOL: pool, MAJOR_MAP: majorMap, CATALOG: CATALOG};
})(typeof window !== 'undefined' ? window : globalThis);
