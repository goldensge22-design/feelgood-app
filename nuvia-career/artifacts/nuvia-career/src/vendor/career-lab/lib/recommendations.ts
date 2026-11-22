import { actualLabReflection } from './practice';
import { FIELDS, MAJORS, majorById } from './catalog';
import { productKeywordIn } from './i18n-runtime';
import { qualitativeText } from './recommendation-policy';
import type { LabState } from './types';

// Multiple independent concrete features, not a score or a single "analysis" keyword.
const features = {
  measurement: { keywords: ['측정', '물 사용량', '전력 사용량', '무게', '온도', '길이', '리터', '계량', '재었', '세었', '수치 기록'] },
  representation: { keywords: ['비교', '표로', '그래프', '평균', '분포', '시각화', '날짜별', '요일별'] },
  making: { keywords: ['만들었', '제작', '그렸', '디자인', '배치', '스케치', '시제품', '고쳤'] },
  visual: { keywords: ['포스터', '색상', '글자', '표지판', '그림', '가독성', '시각', '레이아웃'] },
  interview: { keywords: ['인터뷰', '질문했', '면담', '응답', '들었', '경청'] },
  social: { keywords: ['주민', '친구', '사람', '사용자', '불편', '의견', '접근성', '이유'] },
  experiment: { keywords: ['실험', '조건', '변인', '대조군', '발아', '성장', '식물', '생물'] },
  code: { keywords: ['코딩', '프로그램', '파이썬', '코드', '디버깅', '자동화', '구현'] },
  teaching: { keywords: ['가르쳤', '설명했', '수업', '학습', '이해', '피드백'] },
  writing: { keywords: ['글을', '기사', '썼', '작성', '스토리', '촬영', '편집'] },
  context: { keywords: ['환경', '물', '기후', '쓰레기', '에너지', '온도', '집', '학교', '지역', '사람', '시간', '식물', '생활', '동아리'] },
  environment: { keywords: ['환경', '기후', '쓰레기', '물 사용량', '수도', '리터', '수질', '재활용', '오염', '탄소', '전력 사용량'] },
};
type Feature = keyof typeof features;
const kw=(text:string,k:string)=>productKeywordIn(text,k)||text.replace(/\s+/g,'').includes(k.replace(/\s+/g,''));
const has = (text: string, key: Feature) => features[key].keywords.some(k => kw(text,k));
const rules: { id: string; majorId: string; groups: Feature[]; bridge: string }[] = [
  { id:'measured-comparison', majorId:'m-stats', groups:['measurement','representation','context'], bridge:'측정 자료·표현·비교에 관해 적은 수행 내용과 회고를 확률·실험 설계·데이터 시각화의 학습 질문과 연결해 볼 수 있어요. 회고에 없는 측정이나 성과를 인정하는 뜻은 아니에요.' },
  { id:'visual-making', majorId:'m-design', groups:['making','visual'], bridge:'시각물의 제작·표현에 관해 적은 수행 내용과 회고를 조형·타이포그래피·디자인 리서치의 학습 질문과 연결해 볼 수 있어요. 실제로 한 일의 범위는 내가 적은 기록을 기준으로 해요.' },
  { id:'listening-context', majorId:'m-sociology', groups:['interview','social'], bridge:'사람의 응답·생활 맥락에 관해 적은 수행 내용과 회고를 사회조사·사회이론의 학습 질문과 연결해 볼 수 있어요. 기록에 없는 조사 수행을 추가하지 않아요.' },
  { id:'living-experiment', majorId:'m-biomed', groups:['experiment','measurement'], bridge:'생명 현상·실험 조건·측정에 관해 적은 수행 내용과 회고를 생명과학과 실험 설계의 학습 질문과 연결해 볼 수 있어요. 기록 밖의 실험 수행이나 의료 능력·자격을 판단하지 않아요.' },
  { id:'coded-solution', majorId:'m-cs', groups:['code','making'], bridge:'코드·구현에 관해 적은 수행 내용과 회고를 프로그래밍·자료구조의 학습 질문과 연결해 볼 수 있어요. 읽거나 관찰한 내용을 직접 개발한 성과로 바꾸지 않아요.' },
  { id:'teaching-feedback', majorId:'m-edu', groups:['teaching','social'], bridge:'설명·이해 과정의 반응에 관해 적은 수행 내용과 회고를 학습 원리·수업 설계의 학습 질문과 연결해 볼 수 있어요. 기록 밖의 교육 경험이나 역량을 만들지 않아요.' },
  { id:'writing-voices', majorId:'m-media', groups:['writing','interview'], bridge:'응답·글·영상 구성에 관해 적은 수행 내용과 회고를 취재·글쓰기·미디어 윤리의 학습 질문과 연결해 볼 수 있어요. 실제 제작이나 취재의 범위는 내가 적은 기록을 기준으로 해요.' },
  { id:'user-prototype', majorId:'m-hci', groups:['making','interview','social'], bridge:'사용자의 반응·제작에 관해 적은 수행 내용과 회고를 사용자 조사·프로토타이핑·사용성 평가의 융합 학습 질문과 연결해 볼 수 있어요. 관찰한 일과 직접 수행한 일을 구분해요.' },
];
export interface RecommendationEvidence {
  id: string; kind: 'initial' | 'experience'; strengthIds: string[]; interestIds: string[];
  strengths: string[]; interests: string[]; reflectionId?: string; activityId?: string;
  did?: string; role?: string; learning?: string; bridge: string; study: string[];
}
export interface Recommendation {
  majorId: string; origin: 'initial' | 'experience'; decision: 'active' | 'hold' | 'hidden';
  evidence: RecommendationEvidence[]; stale: boolean; saved: boolean; blocked: boolean;
}
export function recommendationEvidence(s: LabState) {
  const strengths=s.tests.flatMap(t=>t.strengths).filter(x=>x.fit==='similar'||x.fit==='partial')
    .map(x=>({...x,text:qualitativeText(x.text)})).filter(x=>x.text);
  const interests=s.interests.map(x=>({...x,text:qualitativeText(x.text),reason:qualitativeText(x.reason)})).filter(x=>x.text);
  const result=new Map<string,RecommendationEvidence[]>();
  if(!strengths.length||!interests.length)return result;
  const base={strengthIds:strengths.map(x=>x.id),interestIds:interests.map(x=>x.id),strengths:strengths.map(x=>x.text),interests:interests.map(x=>x.text)};
  const add=(id:string,e:RecommendationEvidence)=>{ if(id==='m-open')return;result.set(id,[...(result.get(id)||[]),e]); };
  for(const f of FIELDS){
    const matched=interests.filter(i=>f.keywords.some(k=>productKeywordIn(`${i.text} ${i.reason}`,k)));
    if(!matched.length)continue;
    for(const id of f.majors){
      const m=majorById(id);if(!m)continue;
      add(id,{...base,interestIds:matched.map(x=>x.id),interests:matched.map(x=>x.text),id:`initial:${f.id}`,kind:'initial',
        bridge:'내가 확인한 강점을 이 관심 분야의 학습 질문에 활용해 볼 수 있어요. 능력이나 적합도를 확정하는 판단은 아니에요.',study:m.study});
    }
  }
  for(const r of s.reflections){
    if(!actualLabReflection(s,r))continue;
    const a=s.activities.find(x=>x.id===r.activityId);
    const did=qualitativeText(r.did),role=qualitativeText(r.role);
    const learning=[r.learned,r.fun,r.question].map(qualitativeText).filter(Boolean).join(' · ');
    if(!did||!learning||/하지\s*않|못\s*했|예정|할\s*계획|하지\s*못|did not|have not|plan to|will measure/i.test(did))continue;
    const action=`${did} ${role}`;
    const connected=interests.filter(i=>{
      const topic=`${action} ${learning}`;
      if(i.text.length>=2&&kw(topic,i.text))return true;
      return FIELDS.some(f=>f.keywords.some(k=>kw(`${i.text} ${i.reason}`,k))&&
        (f.keywords.some(k=>kw(topic,k))||(f.id==='f-env'&&has(topic,'environment'))||
          (a?.sourceType==='field'&&a.sourceId===f.id)||(a?.sourceType==='major'&&f.majors.includes(a.sourceId)))); 
    });
    if(!connected.length)continue;
    for(const rule of rules){
      if(!rule.groups.every(g=>has(action,g)))continue;
      // The reflection must connect at least one concrete process, not just repeat "analysis".
      if(!rule.groups.some(g=>g!=='context'&&has(learning,g)))continue;
      const m=majorById(rule.majorId);if(!m)continue;
      add(m.id,{...base,interestIds:connected.map(i=>i.id),interests:connected.map(i=>i.text),id:`ref:${r.id}:${rule.id}`,kind:'experience',reflectionId:r.id,activityId:r.activityId,
        did,role,learning,bridge:rule.bridge,study:m.study});
    }
  }
  return result;
}
export function reconcileRecommendations(s: LabState) {
  const evidence=recommendationEvidence(s);
  s.recommendationHistory ??= {};
  for(const [id,rows] of evidence)if(!s.recommendationHistory[id]){
    const blocked=majorById(id)?.fields.some(f=>s.fields[f]?.status==='not');
    s.recommendationHistory[id]={origin:rows.some(x=>x.kind==='initial')?'initial':'experience',discoveredAt:new Date().toISOString(),decision:blocked?'hidden':'active'};
  }
}
export function recommendationsFor(s: LabState): Recommendation[] {
  const evidence=recommendationEvidence(s);
  const ids=new Set([...Object.keys(s.recommendationHistory||{}),...evidence.keys()]);
  return MAJORS.filter(m=>ids.has(m.id)).map(m=>{
    const h=s.recommendationHistory?.[m.id],rows=evidence.get(m.id)||[];
    const key=dismissalKey(s,m.id);
    const blocked=!!key&&!(h?.overrideDismissal&&h.reviewedDismissals===key);
    return {majorId:m.id,origin:h?.origin||(rows.some(x=>x.kind==='initial')?'initial':'experience'),
      decision:blocked?'hidden':h?.decision||'active',evidence:rows,stale:!rows.length,saved:s.savedMajors.includes(m.id),blocked};
  });
}
export function decideRecommendation(s:LabState,id:string,decision:Recommendation['decision']){
  reconcileRecommendations(s);
  const h=s.recommendationHistory?.[id];if(!h)return;
  h.decision=decision;if(decision==='active'){h.overrideDismissal=true;h.reviewedDismissals=dismissalKey(s,id);}
}
function dismissalKey(s:LabState,id:string){return majorById(id)?.fields.filter(f=>s.fields[f]?.status==='not').map(f=>`${f}:${s.fields[f].date}`).join('|')||'';}
