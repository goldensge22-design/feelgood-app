import type {enterpriseScenario as Types} from "@workspace/api-zod";
type ScenarioInput=Types.ScenarioInput;
type ScenarioSource=Types.ScenarioSource;
type Company={id:string;name:string;website?:string};
const checkedAt="2026-11-10";
const contexts=[
 {id:"hanseo-kasc",host:"airsecure.co.kr",jobs:["aviation-security-screening","aviation-security-guard"],
  url:"https://airsecure.co.kr/contents/recruit_guide_job.php",name:"한국공항보안",
  fact:"공식 직무안내는 보안검색과 항공경비를 구분하고 승객·수하물 검색, 보호구역 출입통제와 공항시설 방호를 안내합니다."},
 {id:"hanseo-korean-air",host:"koreanair.recruiter.co.kr",jobs:["cabin-crew"],
  url:"https://koreanair.recruiter.co.kr/career/km3",name:"대한항공",
  fact:"공식 객실승무직 소개는 입사 교육·전문훈련 후 기내 안전과 서비스 관련 업무를 수행한다고 설명합니다."},
 {id:"hanseo-korean-air",host:"koreanair.recruiter.co.kr",jobs:["passenger-service","flight-operations","air-cargo-logistics","office-administration"],
  url:"https://koreanair.recruiter.co.kr/career/km1",name:"대한항공",
  fact:"공식 일반직 소개는 여객운송의 탑승수속·수하물 업무, 화물운송 지원, 운항정보 수집·분석과 전략지원 업무를 각각 구분합니다."},
 {id:"hanseo-asiana-airport",host:"asianaairport.com",jobs:["air-cargo-logistics"],
  url:"https://asianaairport.com/kr/sub/business/cargoOperation.asp",name:"아시아나에어포트",
  fact:"공식 사업소개는 수출입·통과화물의 수송준비와 화물보관 서비스를 안내합니다. 아시아나항공 객실승무 업무와 다른 법인의 사업입니다."},
 {id:"org-16600841b0dff4ff7401632bbe57",host:"www.airport.kr",jobs:["office-administration","aviation-security-guard"],
  url:"https://www.airport.kr/co_ko/834/subview.do",name:"인천국제공항공사",
  fact:"공식 일반직 소개는 사무행정의 문서·데이터 관리와 항공보안의 보호구역 경비·출입통제 등을 구분합니다. 자회사 채용 근거로 전용하지 않습니다."},
 {id:"org-34e2d756436255117d242307726f",host:"www.airport.co.kr",jobs:["air-traffic-planning","airport-operations"],
  url:"https://www.airport.co.kr/www/cms/frCon/index.do?MENU_ID=2760",name:"한국공항공사",
  fact:"공식 계류장관제 소개는 지상이동 항공기 안전·교통흐름을 위한 관제와 실시간 관제 정보 생성 등을 안내합니다. 전문 관제업무는 학습자의 일상 연습과 다릅니다."},
];
export function aviationScenarioSource(input:ScenarioInput,company?:Company):ScenarioSource|null{
 if(!company||company.id!==input.companyId||!input.jobId)return null;
 const c=contexts.find(c=>c.id===company.id&&c.jobs.includes(input.jobId!)&&company.name===c.name);
 if(!c)return null;
 let host="";try{host=new URL(company.website??"").hostname.toLowerCase();}catch{return null;}
 // Existing public catalogue homepage can differ from the readable careers host.
 const allowed=c.id==="hanseo-korean-air"?["www.koreanair.com","koreanair.com",c.host]:c.id==="org-34e2d756436255117d242307726f"?["www.airport.co.kr","airport.co.kr"]: [c.host,c.host.replace(/^www\./,"")];
 if(!allowed.includes(host))return null;
 return {url:c.url,title:c.name+" 공식 공개 업무",summary:c.fact,
  scope:"회사 공개 업무 사실만 참고합니다. 판단자료·수치·과제는 회사의 실제 사건이 아닌 교육용 가상 일상 연습이며 전문자격 업무 수행·완료를 인증하지 않습니다. 현재 채용 여부는 별도 확인입니다.",
  checkedAt,language:"ko"};
}
