import assert from "node:assert/strict";
import test from "node:test";
import type { Response } from "openai/resources/responses/responses";
import { publicCitation,publicLabLink,publicLabTerm,readCitedLabResponse } from "./career-lab-web";
import {publicIpv4,publicPageText} from "./career-lab-public-page";

function provider(text:string,urls:string[],searched=true){
  return {status:"completed",output:[
    ...(searched?[{type:"web_search_call",status:"completed",action:{type:"search"}}]:[]),
    {type:"message",content:[{type:"output_text",text,annotations:urls.map(url=>({type:"url_citation",url,title:"QA source"}))}]},
  ]} as unknown as Response;
}
const row=(company:string,role:string,category:string,kind:string,keyword:string,excerpt:string,url:string,section="-",origin="ai_interpretation")=>
  ["E",company,role,category,kind,origin,keyword,section,excerpt,url].join("|");
const air="https://www.koreanair.com/contents/official";
const query={company:"대한항공",job:"지상직"};
test("only public posting links without private identifiers or credentials enter the provider",()=>{
  assert.equal(publicLabLink("https://recruit.navercorp.com/rcrt/view.do?annoId=30005630&utm_source=tracking"),
    "https://recruit.navercorp.com/rcrt/view.do?annoId=30005630");
  for(const link of ["http://www.example.com/jobs","https://192.0.2.1/jobs","https://corp.internal/jobs",
    "https://www.example.com/private/jobs","https://www.example.com/jobs?token=sample","https://www.example.com/jobs?redirect=other",
    "https://www.example.com/a%2Fb","https://www.example.com/jobs#sample","https://name@www.example.com/jobs"])
    assert.equal(publicLabLink(link),null);
});
test("pasted link requires a completed open_page for the exact submitted page",()=>{
  const response=provider(row("대한항공","지상직","environment","company","유연 근무","유연한 근무 일정",air),[air]);
  assert.throws(()=>readCitedLabResponse(response,{...query,url:air}),{code:"LAB_LINK_UNREADABLE"});
  response.output.unshift({id:"sample_open",type:"web_search_call",status:"completed",action:{type:"open_page",url:air}});
  const result=readCitedLabResponse(response,{...query,url:air});
  assert.equal(result.materials[0]?.evidence[0]?.category,"environment");
});
test("a pinned public response can confirm the exact quote, not an adjacent quote",()=>{
  const response=provider(row("대한항공","지상직","environment","company","유연 근무","유연한 근무 일정",air),[]);
  assert.throws(()=>readCitedLabResponse(response,{...query,url:air},undefined,"전혀 다른 문장이 있습니다."));
  assert.equal(readCitedLabResponse(response,{...query,url:air},undefined,"기업 소개 유연한 근무 일정 적용").materials.length,1);
});
test("public page verification rejects private and special-use resolution and ignores page scripts",()=>{
  for(const address of ["0.0.0.0","10.1.1.1","100.64.0.5","127.1.2.3","169.254.169.254","172.16.1.1","192.168.1.1","192.0.2.2","198.18.1.1","203.0.113.1","224.0.0.1","::ffff:127.1.2.3"])
    assert.equal(publicIpv4(address),false);
  assert.equal(publicIpv4("93.184.216.34"),true);
  assert.equal(publicPageText("<style>secret</style><script>data</script><p>계획&nbsp;순서</p>"),"계획 순서");
});
test("does not mark a response as searched without a completed web call",()=>{
  assert.throws(()=>readCitedLabResponse(provider("NO_VERIFIED_MATERIALS",[],false),query),{code:"LAB_WEB_SEARCH_NOT_VERIFIED"});
});
test("rejects uncited, unrelated-company and mislabeled job requirements",()=>{
  const lines=[
    row("대한항공","지상직","values","company","협력","Collaborative",air,"Core Values","official_named"),
    row("대한항공","지상직","required","company","학력","요건",air),
    row("대한항공","지상직","duties","posting","여객 안전","허구","https://bad.example/uncited"),
    row("다른기업","지상직","values","company","정직","정직",air),
    row("대한항공","지상직","values","company","정직","정직","https://bad.example/cited","핵심가치","official_named"),
  ];
  const result=readCitedLabResponse(provider(lines.join("\n"),[air,"https://bad.example/cited"]),query);
  assert.equal(result.mode,"gpt-web");
  assert.deepEqual(result.materials[0]?.evidence.map(x=>x.keyword),["협력"]);
  assert.equal(result.materials[0]?.evidence[0]?.keywordOrigin,"ai_interpretation","a Korean rendering of an English value is not its exact name");
});
test("unlisted employer can return cited evidence from a completed search",()=>{
  const url="https://company.example/career";
  const result=readCitedLabResponse(provider(row("아라","콘텐츠기획","duties","role","접근성 검토","서비스 접근성 검토",url),[url]),{company:"아라",job:"콘텐츠기획"});
  assert.equal(result.materials[0]?.evidence[0]?.url,url);
  assert.deepEqual(readCitedLabResponse(provider("NO_VERIFIED_MATERIALS",[]),query).materials,[]);
});
test("accepts only public URLs matching a returned web source through citation decoration",()=>{
  const url="https://site.example/careers";
  const response=provider([
    row("아라","콘텐츠기획","duties","role","접근성 검토","서비스 접근성 검토",`[원문](https://www.site.example/careers) \uE200cite\uE202source\uE201`),
    row("아라","콘텐츠기획","duties","role","허구의 업무","가짜 페이지","https://site.example/unseen"),
  ].join("\n"),[]);
  const action=response.output[0];
  if(action?.type!=="web_search_call"||action.action.type!=="search")throw Error("invalid evidence fixture");
  action.action.sources=[{type:"url",url}];
  const result=readCitedLabResponse(response,{company:"아라",job:"콘텐츠기획"});
  assert.deepEqual(result.materials[0]?.evidence.map(r=>r.keyword),["접근성 검토"]);
});
test("recovers citation-only rows without borrowing an adjacent or unrelated URL",()=>{
  const url="https://www.proscom.co.kr/kr/company/summary.php";
  const marker="\uE200cite\uE202source\uE201";
  const first=row("프로에스콤","보안","philosophy","company","모토","작은일도 정성스럽게",marker,"exact source section");
  const second=row("프로에스콤","보안","philosophy","company","친절한 인사","친절하게 인사",marker);
  const response=provider(`${first}\n${second}`,[]);
  for(const item of response.output)if(item.type==="message")for(const c of item.content)if(c.type==="output_text"){
    c.annotations.push({type:"url_citation",url,title:"회사개요",start_index:first.indexOf(marker),end_index:first.length});
  }
  const result=readCitedLabResponse(response,{company:"프로에스콤",job:"보안"});
  assert.deepEqual(result.materials[0]?.evidence.map(r=>[r.keyword,r.url]),[["정성",url]]);
  assert.equal(result.materials[0]?.evidence[0]?.sourceSection,undefined);
});
test("filters search term copies and generic category labels without inventing replacements",()=>{
  const url="https://www.proscom.co.kr/kr/company/summary.php";
  const out=readCitedLabResponse(provider(["보안","보 안","보안 담당 업무","프로에스콤","기업 개요","모토"].map(
    word=>row("프로에스콤","보안","philosophy","company",word,"작은일도  정성스럽게",url),
  ).join("\n"),[url]),{company:"프로에스콤",job:"보안"});
  assert.deepEqual(out.materials[0]?.evidence.map(x=>[x.keyword,x.excerpt,x.keywordOrigin]),
    [["정성","작은일도  정성스럽게","ai_interpretation"]]);
  assert.deepEqual(readCitedLabResponse(provider(
    row("프로에스콤","보안","philosophy","company","CEO 인사","해당 항목 없음",url),[url],
  ),{company:"프로에스콤",job:"보안"}).materials,[]);
});
test("specific named values are separated from interpreted values and a wrong source section",()=>{
  const result=readCitedLabResponse(provider([
    row("대한항공","지상직","values","company","책임","책임 (Responsible)",air,"핵심가치","official_named"),
    row("대한항공","지상직","values","company","전문성","Professional",air,"핵심가치","official_named"),
    row("대한항공","지상직","values","company","친절","친절",air,"CEO 인사말","official_named"),
  ].join("\n"),[air]),query);
  assert.deepEqual(result.materials[0]?.evidence.map(x=>x.keywordOrigin),["official_named","ai_interpretation","ai_interpretation"]);
});
test("moves applicant experience out of duties only with supporting context",()=>{
  const url="https://recruit.navercorp.com/rcrt/view.do?annoId=30005630";
  const quote="서비스 기획 또는 UX 설계를 프로젝트 단위로 끝까지 해 보신 분";
  const result=readCitedLabResponse(provider([
    row("네이버","서비스기획","duties","posting","지원자 경험/자격",quote,url,"이런 분과 함께하고 싶습니다"),
    row("네이버","서비스기획","duties","posting","지원자 UX 경험",quote,url,"담당 업무"),
    row("네이버","서비스기획","required","posting","시제품 제작 경험","(우대) 웹·앱 서비스를 직접 만들어 배포해 본 경험이 있으신 분",url,"이런 분과 함께하고 싶습니다"),
    row("네이버","서비스기획","duties","posting","시나리오 구체화","미니앱 컨셉 설계 및 핵심 사용 시나리오 구체화",url,"이런 과제를 함께 수행합니다"),
    row("네이버","서비스기획","skills","posting","맥락 없는 요건","Figma를 사용해 보신 분",url),
  ].join("\n"),[url]),{company:"네이버",job:"서비스기획"});
  assert.deepEqual(result.materials[0]?.evidence.map(x=>[x.category,x.keyword]),[
    ["required","서비스 기획·UX 설계 프로젝트 경험"],["preferred","시제품 제작 경험"],["duties","시나리오 구체화"],
  ]);
  assert.equal(result.materials[0]?.evidence[0]?.excerpt,quote);
});
test("public-only input and safe source URL",()=>{
  assert.equal(publicLabTerm("네이버 서비스기획"),"네이버 서비스기획");
  assert.equal(publicLabTerm("student@example.com"),null);
  assert.equal(publicLabTerm("010-1234-5678"),null);
  assert.equal(publicCitation("https://example.org/apply?access_token=abc"),null);
  assert.equal(publicCitation("https://example.org/auth/login"),null);
  assert.equal(publicCitation("http://127.0.0.1/"),null);
  assert.equal(publicCitation("https://www.proscom.co.kr/view?idx=3173&utm_source=ads"),"https://www.proscom.co.kr/view?idx=3173");
});
