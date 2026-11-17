/* Owner-approved interim estimates. Reuses existing activity-based PASS vectors;
 * mappings are editorial proxies, not validated occupational norms. */
(function(g){
  'use strict';
  const VERSION='aviation-major-top5/2026-11-17.1';
  const templates={
    'air-traffic-planning':'수자원·교통시설엔지니어',
    'flight-operations':'생산관리자',
    'air-cargo-logistics':'물류·공급망분석가',
    'passenger-service':'의료서비스기획자',
    'airport-operations':'건설사업관리자',
    'investigation-analysis':'사회조사분석가',
    'logistics-analysis':'물류·공급망분석가',
    'logistics-engineering':'데이터기반프로세스혁신가',
    'supply-chain':'경영기획자',
    'transport-distribution':'생산기술엔지니어',
    'customs-broker':'준법감시·컴플라이언스담당자',
    'purchasing':'사업개발담당자',
    'production-planning':'생산관리자',
    'transportation-planning':'수자원·교통시설엔지니어',
    'management-analysis':'경영컨설턴트',
    'market-research':'시장조사분석가',
    'airline-revenue':'금융분석가',
    'airline-network':'경영기획자',
    'crew-scheduling':'품질경영전문가',
    'cargo-terminal':'생산기술엔지니어',
    'freight-forwarding':'해외영업담당자',
    'cold-chain':'식품품질관리자',
    'uld-coordination':'설비보전엔지니어',
    'catering-logistics':'생산관리자',
    'security-incident-records':'기록물관리전문요원',
    'airport-accessibility':'사례관리자',
    'irregular-operations-service':'국제교류담당자',
    'aviation-parts-supply':'품질관리엔지니어',
    'airport-commercial':'사업개발담당자',
    'cabin-crew':'의료서비스기획자',
    'interpretation-translation':'통역가',
    'travel-agent':'국제교류담당자',
    'tour-guide':'문화유산교육기획자',
    'hotel-frontdesk':'사례관리자',
    'customer-service':'인사·조직담당자',
    'service-sales':'해외영업기획자',
    'event-planning':'공연기획자',
    'public-relations':'마케팅전문가',
    'airline-sales':'해외영업담당자',
    'baggage-service':'병원행정담당자',
    'airline-localization':'영문콘텐츠에디터',
    'airport-international':'외교·국제협력담당자',
    'industrial-security':'준법감시·컴플라이언스담당자',
    'office-administration':'일반행정공무원',
    'compliance':'준법감시·컴플라이언스담당자',
    'emergency-management':'안전환경엔지니어',
    'human-resources':'인사·조직담당자',
    'budget-analysis':'예산·재정담당자',
    'project-management':'공공기관기획담당자',
    'document-management':'기록물관리전문요원',
    'airline-quality':'품질경영전문가',
    'security-training':'사회교육콘텐츠개발자',
    'access-control-admin':'일반행정공무원',
    'maintenance-admin':'생산관리자',
    'overseas-settlement':'재무·회계담당자'
  };
  // Exact, versioned template identity: ambiguous occupation labels use first
  // occurrence in the preserved 47-major catalog. No fabricated jitter.
  const text=g.DCasAviationRankingLocales.ko;
  const cache=new Map();
  function getJobs(major){
    const context=g.DCasAviationCatalog?.resolve(major);
    if(!context||context.mode!=='major-ranked')return null;
    if(cache.has(context.id))return cache.get(context.id);
    const source=g.DCasAviationJobProfiles, pool=g.DCasMajor47?.JOB_POOL;
    if(!source||!pool)return null;
    const jobs=(source.majorProfileIds[context.id]||[]).map(id=>{
      const template=pool.find(job=>job.label_ko===templates[id]);
      if(!template)throw new Error('Missing aviation ranking template: '+id);
      return {
        id:'aviation-profile::'+id, label_ko:text.labels[id]||source.namesKo[id],
        competency_profile_id:id,
        ncs:{...template.ncs,middle_name:'aviation-major::'+context.id},
        pass_profile:{...template.pass_profile},
        interest_code:template.interest_code,interest_top1:template.interest_top1,
        entry_level:'retool',caution:text.caution,
        attr_source:'editorial-proxy-estimate',attr_confidence:0.5,
        operational_status:'owner-approved-interim',operational_baseline_date:'2026-11-17',
        estimate_template_id:template.id,estimate_template_label:template.label_ko,
        estimate_version:VERSION
      };
    });
    cache.set(context.id,jobs);return jobs;
  }
  const majorProxies={'aviation-transport':'산업공학과','aviation-language':'영어영문학과','airport-administration':'행정학과'};
  function register(){
    const requirements=g.DCAS_MAJOR_REQUIREMENTS;
    if(!requirements)return;
    for(const [id,proxy] of Object.entries(majorProxies)){
      const c=Object.values(g.DCasAviationCatalog?.catalog||{}).find(c=>c.id===id);
      if(c)for(const name of c.aliases)requirements[name]={...requirements[proxy]};
    }
  }
  g.DCasAviationRanking=Object.freeze({version:VERSION,getJobs,register,templates,text,
    translationStatus:g.DCasAviationRankingLocales.status});
  register();
})(typeof window!=='undefined'?window:globalThis);
