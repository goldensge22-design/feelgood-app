/**
 * User-specified places to look for public postings, not claims that these
 * organizations are hiring, employ the role directly, or confirmed a partnership.
 */
export const partnerWatchlist = [
  {id:'icn-cargo',site:'인천공항',label:'인천공항 화물보안검색·경비',service:'화물보안검색·경비',recruiter:'프로에스콤'},
  {id:'the-hyundai',site:'서울 더현대백화점',label:'서울 더현대백화점 경비',service:'경비',recruiter:'프로에스콤'},
  {id:'gimhae-airbusan',site:'김해공항',label:'김해공항 에어부산 지상직',service:'에어부산 지상직',recruiter:'바스'},
  {id:'signiel',site:'롯데 시그니엘 서울',label:'롯데 시그니엘 서울 보안',service:'보안',recruiter:'프로에스콤'},
  {id:'ibk',site:'IBK기업은행 데이터센터',label:'IBK기업은행 데이터센터 특수경비',service:'특수경비',recruiter:'프로에스콤'},
  {id:'kftc',site:'금융결제원 명동',label:'금융결제원 명동 보안',service:'보안',recruiter:'프로에스콤'},
  {id:'coupang-icn',site:'인천 쿠팡 물류센터',label:'인천 쿠팡 물류센터',service:'',recruiter:'프로에스콤'},
  {id:'hyatt-busan',site:'하이야트플레이스 부산',label:'하이야트플레이스 부산',service:'',recruiter:'프로에스콤'},
] as const;

export type ApprovedPartnerPosting = Readonly<{
  siteId: typeof partnerWatchlist[number]['id'];
  employer: string;
  role?: string;
  region?: string;
  schedule?: string;
  required?: string;
  preferred?: string;
  postedOn?: string;
  closesOn?: string;
  ongoing?: boolean;
  sourceUrl:string;
  checkedOn:string;
  status:'open'|'closed'|'pending';
}>;

// Public source summaries approved for this review edition, as checked by the
// product owner on the given date. No live feed or public editing endpoint.
export const approvedPublicPartnerPostings: readonly ApprovedPartnerPosting[] = [
  {siteId:'the-hyundai',employer:'프로에스콤',role:'더현대서울 보안',region:'서울 영등포구',
    schedule:'주간 로테이션 / 야간고정',required:'경력·학력 무관',preferred:'관련 업무 경험, 교대근무 가능 등',
    postedOn:'2026-09-23',closesOn:'2026-11-22',checkedOn:'2026-11-20',status:'open',
    sourceUrl:'https://www.jobkorea.co.kr/Recruit/GI_Read/50042655?Oem_Code=C1&listno=12&logpath=1&sc=630&stext=%EB%B3%B4%EC%95%88%EC%9A%94%EC%9B%90+%EC%84%9C%EC%9A%B8'},
  {siteId:'ibk',employer:'프로에스콤',role:'IBK기업은행 하남 데이터센터 특수경비',region:'경기 하남시',
    required:'경력·학력 무관',postedOn:'2026-11-12',closesOn:'2026-12-12',checkedOn:'2026-11-20',status:'open',
    sourceUrl:'https://www.jobkorea.co.kr/Recruit/GI_Read/50355436'},
  {siteId:'coupang-icn',employer:'프로에스콤',role:'인천 BRF 또는 45센터 보안사원 (쿠팡 직접 물류작업자 채용 아님)',region:'인천 서구',
    required:'경력 표기 공고 · 학력 무관. 경력 세부 요건은 원문을 확인해 주세요.',preferred:'관련 업무 경험, 교대·야간근무 가능 등',
    postedOn:'2026-11-02',closesOn:'2026-12-29',checkedOn:'2026-11-20',status:'open',
    sourceUrl:'https://www.jobkorea.co.kr/Recruit/GI_Read/50285569'},
];

export function matchingPartnerPosting(site:typeof partnerWatchlist[number], posting:ApprovedPartnerPosting) {
  return posting.siteId===site.id && posting.employer===site.recruiter && !!officialHttps(posting.sourceUrl);
}

export function officialHttps(value:string) {
  try { const url=new URL(value);return url.protocol==='https:' && !url.username && !url.password ? url.href : null; }
  catch {return null;}
}

export const partnerCalendarDate=(at=new Date())=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(at);
export function partnerPostingStatus(posting:ApprovedPartnerPosting|undefined, today=partnerCalendarDate()):'open'|'closed'|'pending' {
  if(!posting)return 'pending';
  if(posting.status==='closed'||posting.closesOn && posting.closesOn<today)return 'closed';
  if(posting.status==='open' && (!posting.postedOn || posting.postedOn<=today) &&
    (posting.ongoing || !!posting.closesOn))return 'open';
  return 'pending';
}
