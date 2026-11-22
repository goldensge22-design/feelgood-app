import { now, uid, type LabState, type PracticeCard, type PracticeLink, type Reflection } from './types';
import { qualitativeText } from './recommendation-policy';

export const PRACTICE_METHODS = {
  original: { name:'기본 활동 유지', steps:['알아볼 질문 정하기','선택한 범위에서 실행하기','실제로 한 일과 새 질문 남기기'], result:'직접 남긴 기록' },
  observe: { name:'관찰·기록으로 살펴보기', steps:['관찰할 대상과 비교 기준 정하기','같은 기준으로 관찰하고 표에 기록하기','차이와 모르는 점을 구분해 회고하기'], result:'관찰 표와 비교 질문' },
  listen: { name:'대화·질문으로 살펴보기', steps:['동의를 받고 물어볼 질문 정하기','답을 듣고 내 해석과 구분해 기록하기','다르게 들은 내용과 다음 질문 정리하기'], result:'익명 질문·응답 메모' },
  make: { name:'작게 제작하며 살펴보기', steps:['만들 대상을 작은 범위로 정하기','초안을 만들고 바꾼 부분 기록하기','작동한 점과 어려웠던 점 회고하기'], result:'초안과 수정 기록' },
  read: { name:'읽고 설명하며 살펴보기', steps:['읽을 자료와 확인할 질문 정하기','원문 근거와 내 생각을 나누어 적기','내 말로 설명하고 남은 질문 쓰기'], result:'출처가 있는 읽기 메모' },
} as const;
export const confirmedPracticeStrengths=(s:LabState)=>s.tests.flatMap(t=>t.strengths)
  .filter(x=>x.fit==='similar'||x.fit==='partial').map(x=>({...x,text:qualitativeText(x.text)})).filter(x=>x.text);
export function linkPractice(s:LabState,card:PracticeCard,activityId:string,link:PracticeLink){
  const a=s.activities.find(x=>x.id===activityId);if(!a)return false;
  const key=`${card.id}@${card.version}`;
  if(a.practiceLinks?.some(x=>x.cardKey===key))return false;
  (s.practiceCards||={})[key] ||= card;
  if(link.support){
    if(!a.support)a.support=structuredClone(link.support);
    else if(a.support!==link.support){
      const questionKey=(q:typeof link.support.questions[number])=>q.productSource?JSON.stringify([q.productSource,q.productValues||[]]):q.question.trim();
      const existing=new Set(a.support.questions.map(questionKey));
      for(const q of link.support.questions)if(!existing.has(questionKey(q))){a.support.questions.push(structuredClone(q));existing.add(questionKey(q));}
    }
  }
  (a.practiceLinks||=[]).push({...link,cardKey:key,linkedAt:now()});a.updatedAt=now();
  return true;
}
export function contentVersion(text:string){
  let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);
  return (h>>>0).toString(16);
}
export function reflectionFingerprint(r:Reflection){
  const text=JSON.stringify([r.activityId,r.date,r.did,r.role,r.fun,r.hard,r.learned,r.question,r.next,r.links,r.photo,r.direction,r.practiceMode||'everyday',r.practiceCardKeys||[],...(r.support?[r.support]:[])]);
  return contentVersion(text);
}
/** Legacy self-authored records are retained; new/edited records carry explicit receipts. */
export const performedReflection=(r:Reflection)=>!!r.did.trim()&&(!r.confirmation||
  (r.confirmation.status==='confirmed'&&r.confirmation.fingerprint===reflectionFingerprint(r)));
export const storyChoice=(r:Reflection,s?:LabState)=>r.storySelected===true||(r.storySelected===undefined&&!!s?.story.paragraphs.some(p=>p.evidence.includes(`ref:${r.id}`)));
export const storyReflection=(r:Reflection,s?:LabState)=>storyChoice(r,s)&&performedReflection(r);
export const actualLabReflection=(s:LabState,r:Reflection)=>performedReflection(r)&&(
  r.confirmation?.status==='confirmed'||s.activities.some(a=>a.id===r.activityId&&['doing','done'].includes(a.status)));
export function confirmReflection(r:Reflection,previous?:Reflection):Reflection{
  const fingerprint=reflectionFingerprint(r),history=[...(r.reviewHistory||[])];
  if(previous?.confirmation?.status==='confirmed'&&previous.confirmation.fingerprint!==fingerprint)
    history.push({at:now(),previousFingerprint:previous.confirmation.fingerprint});
  return {...r,executionId:r.executionId||uid(),confirmation:{status:'confirmed',fingerprint,at:now()},reviewHistory:history};
}
export type PracticeRequest=Omit<PracticeCard,'id'|'version'>;
export function requestPracticeLink(detail:PracticeRequest){
  window.dispatchEvent(new CustomEvent('careerlab:practice-request',{detail}));
}
