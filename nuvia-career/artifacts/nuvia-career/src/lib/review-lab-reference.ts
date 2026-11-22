import type { CareerLabEvidence, CareerLabMaterial, CareerLabResults } from '@workspace/api-client-react';

const reviewedAt='2026-11-19T16:42:23Z';
const air='https://www.koreanair.com/contents/footer/about-us/who-we-are/overview/introduce-corporation';
const airRole='https://koreanair.recruiter.co.kr/career/km12';
const pro='https://www.proscom.co.kr/kr/company/summary.php';
const proRole='https://proscom.ninehire.site/inter';
const hyundai='https://www.jobkorea.co.kr/Recruit/GI_Read/50042655';
type Row=[CareerLabEvidence['category'],string,string,string,string,CareerLabEvidence['kind']];
const source=(id:string,company:string,job:string,rows:Row[]):CareerLabMaterial=>({
  id,company,job,evidence:rows.map(([category,keyword,excerpt,url,source,kind],i)=>({id:`${id}-${i}`,category,keyword,excerpt,url,source,kind})),
});
const airCompany=(category:Row[0],keyword:string,excerpt:string):Row=>[category,keyword,excerpt,air,'대한항공 공식 회사 소개 · KE Way','company'];
const proCompany=(category:Row[0],keyword:string,excerpt:string):Row=>[category,keyword,excerpt,pro,'프로에스콤 공식 회사개요','company'];
export const reviewedLabMaterials:CareerLabResults={
  mode:'curated',version:'reviewed-sources-v1',retrievedAt:reviewedAt,materials:[
    source('official-korean-air','대한항공','지상직·여객서비스',[
      airCompany('overview','항공사','To be the world’s most loved airline'),
      airCompany('philosophy','더 나은 세상을 위한 연결','Connecting for a better world'),
      ...[['전문성','Professional'],['책임','Responsible'],['존중·배려','Caring'],['협력','Collaborative'],['주도성','Proactive'],['도전','Challenging']].map(([word,quote])=>airCompany('values',word,quote)),
      ['duties','환승 여객 지원','대한항공을 통해 환승하는 승객들을 수속해 주',airRole,'대한항공 공식 채용 · 일반직 여객부문 인터뷰 (공고 아님)','role'],
      ['skills','여객 수속 안내','환승하는 승객들을 담당하는 업무',airRole,'대한항공 공식 채용 · 일반직 여객부문 인터뷰 (공고 아님)','role'],
    ]),
    source('official-proscom','프로에스콤','보안',[
      proCompany('overview','서비스 전문기업','서비스 전문 기업이 되겠습니다.'),
      proCompany('philosophy','직원·고객 중심','직원이 행복하고, 고객에게 사랑받는'),
      ...[['사람 존중','사람을 소중히 여기는 기업'],['안전','안전을 최우선으로 하는 기업'],['정직','법과 양심을 준수하는 정직한 기업']].map(([word,quote])=>proCompany('values',word,quote)),
      ...[['창의','창의적인 발상'],['솔선수범','솔선수범'],['긍정','긍정적인 마음'],['도전','열정과 도전']].map(([word,quote])=>proCompany('talent',`행동양식 · ${word}`,quote)),
      ...['순찰관리','비상대응','상황대처','건물안내','VIP신변보호'].map((word):Row=>['duties',word,word,proRole,'프로에스콤 공식 직무소개 (공고 아님)','role']),
      ['skills','상황 대처','상황대처',proRole,'프로에스콤 공식 직무소개 (공고 아님)','role'],
      ['required','더현대서울 공고 · 경력 제한 없음','경력무관',hyundai,'프로에스콤 더현대서울 보안 · 잡코리아 공고 50042655','posting'],
      ['required','더현대서울 공고 · 학력 제한 없음','학력무관',hyundai,'프로에스콤 더현대서울 보안 · 잡코리아 공고 50042655','posting'],
      ['preferred','더현대서울 공고 · 관련 경험','유관업무 경험자',hyundai,'프로에스콤 더현대서울 보안 · 잡코리아 공고 50042655','posting'],
    ]),
  ],
};
export function matchingReviewedMaterials(company:string,job:string) {
  const clean=(s:string)=>s.toLocaleLowerCase().replace(/\s/g,'');
  return {...reviewedLabMaterials,materials:reviewedLabMaterials.materials.filter(m=>
    (!company||clean(m.company).includes(clean(company)))&&(!job||clean(m.job).includes(clean(job))))};
}
