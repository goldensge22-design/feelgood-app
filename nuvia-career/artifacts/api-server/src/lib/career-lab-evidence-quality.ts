const compact=(value:string)=>value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu,"");
const generic=new Set([
  "기업","기업개요","기업소개","회사","회사개요","회사소개","철학","기업철학","미션","비전","가치","핵심가치","인재상",
  "업무","담당업무","직무","직무내용","직무명","직무역량","역량","필요역량","직무기술서","지원조건","지원요건","자격요건",
  "우대","우대조건","우대사항","채용","모집","모집분야","경험","경력","기업문화","사업영역","필수자격","신입","인재경영",
  "역량키워드","경력채용","직무소개","공고","채용공고",
  "모토","슬로건","기업미션","기업비전","ceo인사","ceo인사말","인사말","경영철학",
  "지원자","지원자경험","지원자자격","지원자경험자격","경험자격","과제","과제예시","직무과제","채용분야",
]);
const roleSuffix=/^(?:담당|업무|직무|직군|관련업무|경력|경력직|신입|채용|모집|역량|능력|직무역량|필요역량|일반|분야|자격|자격요건|우대)+$/u;
export function isUsefulKeyword(keyword:string, entities:string[]) {
  const key=compact(keyword);
  return /[가-힣]/u.test(keyword) && /^[\p{L}\p{N}\p{M} ·/&()+\-]+$/u.test(keyword) && keyword.length<=38 &&
    !generic.has(key) && !/(?:과제예시|직무과제)$/.test(key) && !entities.some(entity=>{
      const fixed=compact(entity);
      return fixed&&(key===fixed||(key.startsWith(fixed)&&roleSuffix.test(key.slice(fixed.length))));
    });
}

// Only recover a short noun phrase already supported by the quotation, not the
// search terms or a made-up competence. If nothing matches, omit the row.
export function groundedKeyword(excerpt:string, category:string) {
  if(category==="required"&&/서비스\s*기획|UX\s*설계/iu.test(excerpt)&&/프로젝트|경험|해\s*보신/u.test(excerpt)){
    const words=[/서비스\s*기획/u.test(excerpt)&&"서비스 기획",/UX\s*설계/iu.test(excerpt)&&"UX 설계"].filter(Boolean);
    return `${words.join("·")} ${/프로젝트/u.test(excerpt)?"프로젝트 경험":"경험"}`;
  }
  if(category==="duties"&&/프로토타입/u.test(excerpt)&&/설계|구현|제작/u.test(excerpt))return "프로토타입 설계·구현".replace(
    /설계·구현/u,/설계/u.test(excerpt)&&/구현/u.test(excerpt)?"설계·구현":/설계/u.test(excerpt)?"설계":/구현/u.test(excerpt)?"구현":"제작");
  if((category==="required"||category==="preferred"||category==="skills")&&/사용자\s*조사/u.test(excerpt))return "사용자 조사";
  if(category==="overview"||category==="philosophy"||category==="values"||category==="talent"){
    if(/정성스럽게/u.test(excerpt))return "정성";
    if(/사용자라는\s*나침반/u.test(excerpt))return "사용자 중심";
    if(/친절하게\s*인사/u.test(excerpt))return "친절한 인사";
    if(/지속적으로\s*성장/u.test(excerpt))return "지속 성장";
    if(/가능성을\s*연결/u.test(excerpt))return "가능성 연결";
  }
  return null;
}

const preferredHeading=/우대|prefer(?:red|ence)|nice.to.have|bonus/iu;
const requiredHeading=/지원\s*(?:자격|자격요건|조건|요건)|(?:필수|기본)\s*(?:자격|역량|요건|조건)|자격\s*요건|경험\s*요건|(?:이런|이러한)\s*분.{0,18}(?:함께|찾)|who.{0,26}(?:looking for|you are)|what you.ll bring|(?:basic|minimum|required)\s+qualifications/iu;
const dutiesHeading=/담당\s*업무|주요\s*업무|업무\s*내용|하는\s*일|(?:과제|업무).{0,15}수행|(?:responsibilities|what you.ll do|the role)/iu;
const qualificationVoice=/(?:(?:해\s*보신|있으신|없으신|가능하신|계신|하신|되신|있는|가능한)\s*분(?:\s|[.),]|$)|경험자|경력자|[가-힣]+이수자|[가-힣]+소지자|(?:경력|학력)\s*무관|years of.{0,24}experience|(?:must have|you have))/iu;
const preferredExcerpt=/^(?:\(\s*우대\s*\)|\[\s*우대\s*\])|(?:이수자|가능자|경험자|경력자|경험)\s*우대\s*[.)]?$/u;

/** Require public posting section evidence for eligibility, rather than guessing from the job title. */
export function postingCategory(category:string, kind:string, section:string, excerpt:string) {
  if(!["duties","required","preferred","skills"].includes(category))return category;
  const preferred=preferredHeading.test(section)||preferredExcerpt.test(excerpt);
  const required=requiredHeading.test(section);
  const qualification=qualificationVoice.test(excerpt);
  if(kind!=="posting")return preferred||required||qualification||category==="required"||category==="preferred"?null:category;
  if(preferred)return "preferred";
  if(required)return "required";
  if(qualification||category==="preferred"||category==="required")return null;
  return dutiesHeading.test(section)?category:null;
}

const officialValuesHeading=/^(?:[^\r\n]{0,35}\s)?(?:핵심\s*가치|core\s*values|our\s*values|가치와\s*행동)(?:\s*[·/–-]\s*(?:핵심\s*가치|core\s*values|our\s*values))?$/iu;
export function isNamedValue(category:string, intent:string, section:string, name:string, excerpt:string, trustedEmployerHost:boolean) {
  if(category!=="values"||intent!=="official_named"||!trustedEmployerHost||!officialValuesHeading.test(section))return false;
  const named=compact(name);
  // One exact name only. Otherwise the Korean label is a translation or summary.
  return named.length>=2 && [compact(excerpt),compact(excerpt.split(/[/(:：]/u)[0]??"")].includes(named);
}
