// Human-reviewed summaries from official pages fetched 2026-10-24.
// No sample records, live vacancies, inferred NCS codes or psychometric rules.
const checkedAt = "2026-10-24";
export type Entity = {
  id:string;kind:"company"|"job"|"relation";name:string;summary:string;status:"reviewed";
  industry?:string;region?:string;size?:string;website?:string;careers?:string;companyId?:string;jobId?:string;
  checkedAt:string;tags:string[];aliases:string[];tasks:string[];knowledge:string[];skills:string[];attitudes:string[];
  preparation:string[];values:string[];behaviors:string[];requirements:string[];tools:string[];questions:string[];
  sources:{title:string;url:string;claim:string;kind:"기업 공식"|"FeelGood 해석";checkedAt:string}[];
};
const source=(title:string,url:string,claim:string,kind:"기업 공식"|"FeelGood 해석"="기업 공식")=>({title,url,claim,kind,checkedAt});
const base=(id:string,kind:Entity["kind"],name:string,summary:string):Entity=>({
  id,kind,name,summary,status:"reviewed",checkedAt,tags:[],aliases:[],tasks:[],knowledge:[],skills:[],attitudes:[],preparation:[],
  values:[],behaviors:[],requirements:[],tools:[],questions:[],sources:[],
});
const company=(id:string,name:string,industry:string,summary:string,url:string,values:string[]=[],behaviors:string[]=[],tags:string[]=[])=>({
  ...base(id,"company",name,summary),industry,region:"정보 부족",size:"정보 부족",website:url,values,behaviors,tags,
  questions:["이 회사가 표방한 가치가 실제 팀의 업무 결정에서는 어떻게 나타나나요?","대학생이 준비할 수 있는 신입 직무와 경력 직무는 어떻게 다른가요?"],
  sources:[source(`${name} 공식 소개`,url,`사업 소개: ${summary} / 공개 가치: ${values.join(", ")||"미확인"} / 공개 사례·행동 원칙: ${behaviors.join("; ")||"미확인"}`)],
});
export const companies:Entity[]=[
  {...company("lg","LG전자","전자·반도체","고객 경험의 혁신을 추구하는 Smart Life Solution 기업입니다.","https://globalcareers.lge.com/our-way",
    ["Customer","Challenge","Excellence","Respect","Integrity"],["고객 관점에서 의사결정한다는 행동 원칙 공개","사람의 삶에서 기회를 찾고 혁신한다는 원칙 공개"],["도전"]),careers:"https://globalcareers.lge.com/"},
  {...company("samsung","삼성전자","전자·반도체","인재와 기술을 바탕으로 전자제품·반도체와 서비스를 만드는 기업입니다.","https://www.samsung.com/sec/about-us/company-info/",
    ["인재제일","최고지향","변화선도","정도경영","상생추구"],["경영원칙을 임직원 행동규범으로 구체화해 공개","2024년 비스포크 AI 콤보 출시 사례 공개"],["도전"]),careers:"https://www.samsungcareers.com/hr/"},
  {...company("naver","네이버","IT·플랫폼","검색, AI, 온라인 광고, 커머스, 콘텐츠, 클라우드, 핀테크 사업을 소개합니다.","https://www.navercorp.com/company/about",
    ["사용자를 나침반으로 변화"],["사용자 데이터 보존을 위한 데이터센터 각 춘천 소개","로봇·AI·클라우드를 융합한 사옥 1784 소개"]),region:"경기",careers:"https://recruit.navercorp.com/"},
  {...company("kakao","카카오","IT·플랫폼","서비스·플랫폼 품질과 AI 및 데이터 제품의 연구·개발 업무를 공식 직무 자료에서 소개합니다.","https://careers.kakao.com/jobs/P-14324",
    [],["Data Scientist 직무에서 A/B 테스트 설계 및 유저 행동 분석 소개","해당 공고에 완전선택근무제와 협업 효율을 고려한 원격근무 안내"],["자율성","협업"]),region:"경기",careers:"https://careers.kakao.com/jobs"},
  {...company("toss","토스","핀테크","금융을 넘어 일상의 변화를 만드는 서비스와 토스 계열 서비스를 소개합니다.","https://toss.im/en-us/company",
    ["Mission over individual","Focus on impact","Question every assumption","Execution over perfection","Ask for feedback"],
    ["완벽한 계획보다 실행과 실험을 우선한다는 원칙 공개","2025년 FacePay와 Mini Apps 출시 사례 공개"],["도전","협업"]),careers:"https://toss.im/career"},
  company("hyundai","현대자동차","자동차·모빌리티","차량과 모빌리티를 통해 인류의 진보를 추구하는 비전을 소개합니다.","https://www.hyundai.com/worldwide/en/brand-journal/our-vision",
    ["Progress for humanity"],["IONIQ 5와 NEXO를 통해 브랜드 비전 소개"]),
  company("cj","CJ제일제당","식품·BIO","K-Food와 Green BIO 기술을 통해 건강·즐거움·편리를 추구합니다.","https://www.cj.co.kr/kr/aboutus/cj-cheiljedang/overview",
    ["정직","열정","창의","존중","ONLYONE","상생"],["국민 건강식생활 증진·환경 생태계 보존·청소년 꿈 실현을 목표로 한 사회공헌 소개"],["도전"]),
  company("amore","아모레퍼시픽","뷰티·생활용품","피부 과학·감성·라이프스타일을 아우르는 뉴뷰티를 추구합니다.","https://www.apgroup.com/int/ko/about-us/amorepacific/our-values/our-values.html",
    ["고객을 중심으로 행동","최초·최고를 위한 시도","열린 마음의 협업","다름 존중","당당하게 일하기"],
    ["ABC Spirit으로 다섯 가지 일의 원칙 공개","AI First와 피부 전문성 기반 스킨케어·이너뷰티·뷰티 테크 전략 공개"],["협업","도전"]),
  {...company("celltrion","셀트리온","바이오·제약","바이오시밀러와 신약 개발·생산을 통해 치료 접근성 확대를 추구하는 생명공학기업입니다.","https://www.celltrion.com/ko-kr/company",
    ["더 많은 사람의 치료 기회"],["항체 바이오시밀러 개발을 통한 치료 접근성 확대 사례 소개"]),region:"인천",careers:"https://celltrion.com/ko-kr/careers/recruit/job"},
  {...company("toss-income","토스인컴","핀테크","소득·세무 영역에서 '숨은 환급액 찾기' 등 개인의 세무 불편을 줄이는 서비스를 소개합니다.","https://toss.im/career/job-detail?job_id=7551674003",
    [],["Product Owner와 디자이너·개발자·분석가로 구성된 사일로의 협업 소개"],["협업","도전"]),careers:"https://toss.im/career/job-detail?job_id=7551674003"},
];
// Tags are an explicitly labelled editorial bridge, not measured company culture.
for(const c of companies) if(c.tags.length) c.sources.push(source("FeelGood 탐색 태그 해석",c.sources[0].url,`공개 설명을 '${c.tags.join(", ")}' 선호 탐색 태그로 연결한 편집상 해석. 팀 문화·적합성의 검증 결과 아님.`,"FeelGood 해석"));

export const jobs:Entity[]=[];
export const relations:Entity[]=[];
function role(companyId:string,id:string,name:string,url:string,tasks:string[],knowledge:string[]=[],skills:string[]=[],attitudes:string[]=[],requirements:string[]=[],tools:string[]=[],aliases:string[]=[]){
  const title=`${companies.find(c=>c.id===companyId)!.name} 공식 직무 소개 · ${name}`;
  const job:Entity={...base(id,"job",name,`${name}의 수행 내용을 기업의 공개 직무 자료를 바탕으로 정리했습니다. 기업별 요구 수준은 다를 수 있습니다.`),
    aliases,tasks,knowledge,skills,attitudes,
    preparation:[`FeelGood 준비 예시: ${tasks[0]}와 관련한 공개 자료 한 개를 찾아 업무 흐름과 궁금한 점을 정리해 보세요. (채용 필수요건 아님)`],
    questions:["이 직무의 신입 담당 범위와 입사 후 배우는 부분은 무엇인가요?"],
    sources:[source(title,url,`해당 기업 사례의 수행 내용: ${tasks.join("; ")}${knowledge.length?`; 업무 지식: ${knowledge.join(", ")}`:""}${skills.length?`; 기술: ${skills.join(", ")}`:""}${attitudes.length?`; 태도: ${attitudes.join(", ")}`:""}`),
      source("FeelGood 진입 준비 예시",url,"공개 직무 업무를 살펴보는 준비 활동 예시. NCS 기준이나 기업 채용 요건이 아닙니다.","FeelGood 해석")]};
  jobs.push(job);
  relations.push({...base(`${companyId}-${id}`,"relation",`${companies.find(c=>c.id===companyId)!.name} · ${name}`,"공식 직무 자료에 근거한 일반 관련 직무 연결입니다. 현재 모집 중 여부를 제공하지 않습니다."),
    companyId,jobId:id,tasks,requirements,tools,
    questions:["자료의 경력 요건과 신입의 업무·교육은 어떻게 다른가요?","업무의 우선순위와 성과 확인 방법은 무엇인가요?"],
    sources:[source(title,url,`기업·직무 연결과 담당 업무: ${tasks.join("; ")} / 해당 자료 요건: ${requirements.join("; ")||"정보 부족"} / 도구: ${tools.join(", ")||"정보 부족"}`)]});
}
const cell="https://celltrion.com/ko-kr/careers/recruit/job";
role("celltrion","bio-development","바이오의약품 개발",cell,["세포주·공정·제형·분석법 개발과 비임상 물질 생산","품질 허가자료 문서화와 규제기관 대응"]);
role("celltrion","drug-discovery","신약 개발",cell,["바이오 신약 항체 발굴과 초기·비임상 연구","ADC·다중항체 등 신규 플랫폼 및 사업 개발"]);
role("celltrion","bio-business","바이오 사업개발",cell,["바이오의약품 제품 개발 진행·관리","신제품 개발 전략과 제품 포트폴리오 수립"]);
role("celltrion","regulatory","의약품 인허가",cell,["국내외 허가 계획·전략 수립 및 실행","허가 유지 관리와 규제기관 대응"],[],[],[],[],[],["RA","허가"]);
role("celltrion","clinical","임상 운영",cell,["임상시험 기획·운영과 글로벌 임상 공급망 관리","의약품 안전성 정보 관리 및 규제기관 대응"]);
role("celltrion","clinical-data","임상 통계·데이터 관리",cell,["연구개발·임상·허가·제조·CMC 통계분석","임상 데이터 관리와 수집 시스템 운영"]);
role("celltrion","chemical-development","케미컬 제품개발",cell,["합성의약품 제품 선정과 임상·허가 개발 진행","글로벌 합성의약품 판매 유통망 구축"]);
role("celltrion","bio-production","바이오 생산관리",cell,["바이오의약품 생산 공정관리와 GMP 문서 업무","생산 문제 해결 및 개선","GMP·연구소 설비와 장비 적격성 평가"]);
role("celltrion","process-support","생산·기술 지원",cell,["생산 공정 관리·검증·기술지원과 결과 분석","DS·DP 및 CMO 기술 이전과 Pilot lab 운영","공정·품질 모니터링과 프로세스 개선"]);
role("celltrion","validation","설비·밸리데이션",cell,["플랜트 설계 및 건설사업 관리","생산설비 운영과 유지·보수","장비·설비·시스템 밸리데이션 수행"]);
role("celltrion","bio-qa","의약품 품질보증(QA)",cell,["문서·교육·일탈·변경·감사 등 GMP 품질시스템 운영","시설부터 물류까지 전 과정 검토·승인","규제기관 실사와 내부감사 대응"]);
role("celltrion","bio-qc","의약품 품질관리(QC)",cell,["원자재와 DS·DP 분석 실험","제조시설과 유틸리티 모니터링"]);
role("celltrion","sop","S&OP·수요 계획",cell,["바이오 DS·DP 생산계획 및 재고·발주 관리","판매계획 수립·실적관리·수요예측","CMO 계약과 네트워크 관리"]);
role("celltrion","logistics","구매·물류",cell,["수출입 운송·통관과 Cold Chain 및 AEO 관련 업무","운송계획과 운송 경로 구성","원부재료 구매·운송·재고·수급·조달 관리"]);
role("celltrion","business-management","경영관리",cell,["전사 사업·업무계획 수립 및 조정","IT 시스템 구축·기획·운영","언론홍보·IR·인력운영·채용·조직문화 기획 및 운영"]);
role("celltrion","finance","재무·회계",cell,["국내외 재무·관리회계와 자금관리","내부회계관리제도 운영 및 외부감사 대응"],[],[],[],[],[],["회계","재무"]);
role("celltrion","legal-ip","법무·지식재산",cell,["정보보안·컴플라이언스·ESG 경영 업무","국내외 법무와 지식재산 관리"]);
role("celltrion","bio-sales","바이오의약품 영업",cell,["신규시장 개척 및 해외 판매네트워크 전략 수립","영업조직 운영 업무"]);
role("celltrion","global-marketing","글로벌 마케팅",cell,["글로벌 마케팅 전략개발과 해외시장 리서치","제품 판매 현황 취합·분석과 P&R 전략 실행"]);
role("kakao","data-scientist","데이터 사이언티스트","https://careers.kakao.com/jobs/P-14324",
  ["임베딩·광고 타겟팅 모델 개발","생성형 AI·NLP 메시지 서비스 개발","A/B 테스트 설계와 유저 행동 분석"],
  ["머신러닝·딥러닝"],["Python·SQL을 통한 데이터 가공·알고리즘 구현"],["논리적 전달과 유관부서 협업"],
  ["공개 사례 필수: 관련 실무 3년 이상, 대용량 처리와 ML/DL 모델 적용 경험","공개 사례 우대: LLM·추천시스템, MLOps, 광고·커머스 도메인 경험"],["Python","SQL","Spark","PyTorch"],["Data Scientist"]);
role("kakao","analytics-engineer","데이터 분석 엔지니어","https://careers.kakao.com/jobs/P-14276",
  ["사용자 요구에 맞는 데이터셋 설계·개발·운영","데이터 품질과 파이프라인 안정성 관리","데이터 활용 플랫폼과 도구 개발"],
  ["데이터 모델링"],["SQL 최적화","Python·Airflow DAG 작성"],["이해관계자와 공통 언어로 소통"],
  ["공개 사례 필수: 데이터 직무 3년 이상, 데이터 모델링·SQL·Python·병렬처리엔진 경험","공개 사례 우대: Hadoop, 초대용량 처리, 자동화 앱 개발·운영"],["SQL","Python","Airflow","Trino","SparkSQL"],["Data Analytics Engineer"]);
role("kakao","software-qa","소프트웨어 QA","https://careers.kakao.com/jobs/P-13744",
  ["QA 계획과 테스트 전략 수립","리스크 기반 요구사항 분석과 테스트 케이스 설계","테스트 진행·이슈 관리와 결과 공유"],
  ["소프트웨어 테스팅","서버·클라이언트 환경"],["테스트 방법 적용"],["유연한 의사소통과 능동적 실행"],
  ["공개 사례 필수: SW QA 2~10년, 테스팅 지식 또는 ISTQB·CSTS","공개 사례 우대: 자동화 설계·스크립트, 테스트·협업 도구 경험"],["Postman","Appium","Selenium","JIRA","Github"],["QA","서비스/플랫폼 QA"]);
role("kakao","llm-post","LLM 사후학습 연구","https://careers.kakao.com/jobs/P-14558",
  ["사후학습용 데이터 수집·생성과 강화학습 환경 연구","학습 파이프라인 고도화 및 효율화","분산 학습 코드 구현·최적화"],
  ["LLM SFT·강화학습"],["분산처리를 이용한 언어모델 학습"],["새 기술 도전과 서비스 연결에 대한 관심"],
  ["공개 사례 필수: 관련 전공 석사 이상 또는 준하는 프로젝트, 분산 언어모델 학습과 사후학습 경험","공개 사례 우대: 파인튜닝 서비스 기여, 대규모 학습 최적화, 논문"],["Torch distributed","DeepSpeed","Ray"]);
role("kakao","llm-pre","LLM 사전학습 연구","https://careers.kakao.com/jobs/P-14559",
  ["효율적인 LLM 구조 탐색·최적화","학습·데이터·알고리즘 비용 효율화 연구","대규모 데이터 수집·생성과 메타정보 부착"],
  ["언어모델 학습"],["모델 병렬 기반 학습"],["연구개발 관심과 도전"],
  ["공개 사례 필수: 관련 석사 이상 또는 준하는 프로젝트, 모델 병렬 학습 경험","공개 사례 우대: 저정밀 학습·양자화·증류·커널 개발"],["Megatron-LM","DeepSpeed","FSDP"]);
role("toss","data-analyst","데이터 분석가","https://toss.im/career/job-detail?job_id=7742346003",
  ["글로벌 제품 사용자 여정의 행동·특성 분석","핵심 지표와 가설 설정","A/B 테스트 설계·분석과 개선 방향 제시"],[],[],[],[],[],["Data Analyst"]);
role("toss","accounting","회계 결산","https://toss.im/career/job-detail?job_id=8010174003",
  ["대출 서비스 월·분기·연 결산과 재무제표 마감","수익·비용·자금흐름 정산과 전표·증빙 관리","외부감사·감독기관 보고와 업무 자동화"],
  ["IFRS","금융 서비스 거래 구조"],["계정 대사와 증빙 관리"],["차이 원인을 끝까지 확인","유관부서 의사소통"],
  ["공개 사례 필수: 회계·결산 5년 이상, IFRS 결산 및 금융 거래 회계처리","공개 사례 선호: ERP·엑셀, 여신 회계·외부감사·세무 신고"],["ERP","Excel"]);
role("toss","account-manager","B2B 영업·제휴","https://toss.im/career/job-detail?job_id=6008890003",
  ["FacePay 브랜드 발굴·계약·가맹점 설치·결제 활성화","프로모션 전략과 신규 사업 기회 발굴"],
  ["파트너사·시장 이해"],["영업·제휴 및 파트너 관리"],["새 산업에 대한 호기심"],
  ["공개 사례 선호: 영업·제휴 및 파트너 관리 경험 4~8년","공개 사례 우대: 오프라인 결제·프랜차이즈, B2B 영업·제휴 경험"]);
role("toss","brand-marketing","브랜드 마케팅","https://toss.im/career/job-detail?job_id=7980102003",
  ["캠페인·콘텐츠에 맞는 채널·플랫폼 발굴 및 제휴","광고 소재 기획·제작·집행과 결과 분석","온드 채널 콘텐츠와 온오프라인 이벤트 운영"],
  ["소셜 미디어와 트렌드"],["브랜드 메시지 전달","다양한 직군과 커뮤니케이션"],["학습 욕구와 주도적 태도"],
  ["공개 사례: 소셜 미디어 기반 브랜드 전달 경험과 원활한 협업","해당 자료는 1년 계약직 사례이며 신입 공통 요건이 아닙니다."],["Meta","Google"]);
role("toss","product-design","프로덕트 디자인(UX/UI)","https://toss.im/career/job-detail?job_id=4326315003",
  ["정성·정량 근거로 사용자 문제 정의","VOC 수집·UX 설계·UI 디자인·프로토타입 제작","제품이 고객에게 닿는 전체 과정의 사용자 경험 의사결정"],
  [],["근거 기반 문제 정의와 가설·솔루션 설계"],["디자인 챕터 리뷰와 학습 공유"],
  ["공개 사례: 근거 기반 문제 정의, 설계 의도가 명확한 솔루션, 제품 개발 전 과정 주도 역량"],[],["Product Designer","UX/UI 디자이너"]);
role("toss-income","product-owner","프로덕트 기획·운영(PO)","https://toss.im/career/job-detail?job_id=7551674003",
  ["서비스 목표·핵심 지표·전략 수립과 실행","고객 요구·사용 데이터 기반 문제 정의와 우선순위 설정","데이터 실험·반복으로 서비스 경험 고도화"],
  [],["복잡한 문제 구조화와 주도적 실행"],["오너십과 팀 협업","끈질긴 도메인 학습"],
  ["공개 사례 선호: 고객 관점 문제 정의·실행, 데이터 기반 문제 해결, 팀 협업 경험"],[],["Product Owner","서비스 기획","프로덕트 매니저"]);
