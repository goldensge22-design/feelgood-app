/** 2026-09-13 approved adaptive training layer. Does not recalculate legacy Growth/Level. */
export const AXES = ['planning', 'attention', 'simultaneous', 'successive'] as const;
export type Axis = typeof AXES[number];
export type Band = 'A' | 'B' | 'C' | 'D';
export type Level = 'high' | 'mid' | 'low';
export const AXIS_LABEL: Record<Axis, string> = {planning:'계획',attention:'주의',simultaneous:'동시처리',successive:'순차처리'};
export const LEVEL_LABEL: Record<Level,string> = {high:'상',mid:'중',low:'하'};
export const BAND_LABEL: Record<Band,string> = {A:'초등학생',B:'중학생',C:'고등학생',D:'대학생·성인'};
export type Route = Axis | 'combined' | 'integrated';
export const ROUTE_LABEL:Record<Route,string> = {planning:'계획 훈련',attention:'주의 훈련',simultaneous:'관계 연결 훈련',successive:'순서 실행 훈련',combined:'복합 지원 훈련',integrated:'통합 적용·심화'};
export const STRATEGY_LABELS = {STEP_BREAKDOWN:'단계 나누기',EVIDENCE_COMPARE:'근거 비교',JUDGMENT_REVISION:'판단 수정',PLAN_DO_CHECK:'순서 정하기·실행·확인'} as const;
export type TransferStrategy = keyof typeof STRATEGY_LABELS;
export interface TransferLink {bridgeId:string;strategyId:TransferStrategy;history:{activityId:string;evidenceId:string};kids?:{activityId:string;evidenceId:string};}
export interface Verification {recordId:string;subjectId:string;assessmentId:string;reviewId:string;evidenceId:string;reviewedAt:string;reviewerRole:'teacher'|'parent'|'assessor';outcome:'supported'|'not_supported'|'insufficient';}
export interface Assessment {
 schemaVersion:'1.0'; assessmentId:string; subjectId:string; profileVersion:string;
 educationStage:'elementary_1_3'|'elementary_4_6'|'middle'|'high'|'adult';
 axes:Record<Axis,{level:Level;value?:number;unit?:string}>; transfer?:TransferLink;
}
export const STAGE_BAND:Record<Assessment['educationStage'],Band>={elementary_1_3:'A',elementary_4_6:'A',middle:'B',high:'C',adult:'D'};
export const DEMOS:Assessment[] = [
 {schemaVersion:'1.0',assessmentId:'demo-a',subjectId:'demo-a',profileVersion:'demo-1',educationStage:'elementary_4_6',transfer:{bridgeId:'demo-bridge-a',strategyId:'STEP_BREAKDOWN',history:{activityId:'demo-history-sequence',evidenceId:'demo-history-a'},kids:{activityId:'demo-kids-sequence',evidenceId:'demo-kids-a'}},axes:{planning:{level:'low'},attention:{level:'mid'},simultaneous:{level:'high'},successive:{level:'mid'}}},
 {schemaVersion:'1.0',assessmentId:'demo-b',subjectId:'demo-b',profileVersion:'demo-1',educationStage:'elementary_4_6',transfer:{bridgeId:'demo-bridge-b',strategyId:'EVIDENCE_COMPARE',history:{activityId:'demo-history-evidence',evidenceId:'demo-history-b'},kids:{activityId:'demo-kids-compare',evidenceId:'demo-kids-b'}},axes:{planning:{level:'mid'},attention:{level:'low'},simultaneous:{level:'mid'},successive:{level:'high'}}}
];
function validId(x:unknown):x is string{return typeof x==='string'&&x.trim().length>0&&x.length<=160;}
export function validateTransfer(raw:unknown):TransferLink {
 const r=raw as any;
 if(!r||!validId(r.bridgeId)||!Object.hasOwn(STRATEGY_LABELS,r.strategyId)||!r.history||!validId(r.history.activityId)||!validId(r.history.evidenceId))throw new Error('HISTORY 전략의 출처 기록이 필요합니다.');
 if(r.kids&&(!validId(r.kids.activityId)||!validId(r.kids.evidenceId)))throw new Error('KIDS 출처 기록이 올바르지 않습니다.');
 return {bridgeId:r.bridgeId,strategyId:r.strategyId,history:{activityId:r.history.activityId,evidenceId:r.history.evidenceId},...(r.kids?{kids:{activityId:r.kids.activityId,evidenceId:r.kids.evidenceId}}:{})};
}
export function validateVerification(raw:unknown,records:TrainingRecord[]):Verification {
 const r=raw as any;
 if(!r||!['recordId','subjectId','assessmentId','reviewId','evidenceId'].every(k=>validId(r[k]))||!['teacher','parent','assessor'].includes(r.reviewerRole)||!['supported','not_supported','insufficient'].includes(r.outcome)||typeof r.reviewedAt!=='string'||!Number.isFinite(Date.parse(r.reviewedAt)))throw new Error('외부 확인 기록 형식이 올바르지 않습니다.');
 const record=records.find(x=>x.id===r.recordId&&x.context.subjectId===r.subjectId&&x.context.assessmentId===r.assessmentId&&x.context.mode==='production'&&x.kind!=='rehearsal');
 if(!record)throw new Error('현재 사용자의 실제 적용 기록과 일치하지 않습니다.');
 return {recordId:r.recordId,subjectId:r.subjectId,assessmentId:r.assessmentId,reviewId:r.reviewId,evidenceId:r.evidenceId,reviewedAt:r.reviewedAt,reviewerRole:r.reviewerRole,outcome:r.outcome};
}
export function validateAssessment(raw:unknown):Assessment {
 if (!raw || typeof raw!=='object') throw new Error('결과지 데이터를 기다리고 있습니다.');
 const r=raw as Record<string,unknown>;
 if(r.schemaVersion!=='1.0')throw new Error('지원하지 않는 결과지 형식입니다.');
 for(const k of ['assessmentId','subjectId','profileVersion'])if(typeof r[k]!=='string'||!(r[k] as string).trim()||(r[k] as string).length>160)throw new Error('검사 식별 정보와 버전이 필요합니다.');
 if(typeof r.educationStage!=='string'||!Object.hasOwn(STAGE_BAND,r.educationStage))throw new Error('학습 단계 정보가 필요합니다.');
 if(!r.axes||typeof r.axes!=='object')throw new Error('PASS 4영역 결과가 필요합니다.');
 const axes={} as Assessment['axes'];
 for(const axis of AXES){
  const a=(r.axes as any)[axis];
  if(!a||!['high','mid','low'].includes(a.level))throw new Error('4영역의 공식 상·중·하 분류가 모두 필요합니다.');
  if(a.value!==undefined&&(typeof a.value!=='number'||!Number.isFinite(a.value)||typeof a.unit!=='string'||!a.unit.trim()||a.unit.length>40))throw new Error('점수에는 유효한 숫자와 점수 단위가 필요합니다.');
  axes[axis]={level:a.level,...(a.value!==undefined?{value:a.value,unit:a.unit}:{})};
 }
 return {schemaVersion:'1.0',assessmentId:r.assessmentId as string,subjectId:r.subjectId as string,profileVersion:r.profileVersion as string,educationStage:r.educationStage as Assessment['educationStage'],axes,...(r.transfer!==undefined?{transfer:validateTransfer(r.transfer)}:{})};
}
export function profileKey(a:Assessment){return JSON.stringify([a.subjectId,a.assessmentId,a.profileVersion,AXES.map(x=>a.axes[x]),a.transfer??null]);}
export function resolveTraining(a:Assessment){
 const lows=AXES.filter(x=>a.axes[x].level==='low');
 const route:Route=lows.length===0?'integrated':lows.length>1?'combined':lows[0];
 // First iteration prioritizes planning -> attention -> simultaneous -> successive; preserve remaining targets.
 const target:Axis=lows[0]??'planning';
 const strengths=AXES.filter(x=>a.axes[x].level==='high'&&x!==target);
 const preference:Axis[]=target==='attention'?['successive','planning','simultaneous','attention']:['simultaneous','successive','planning','attention'];
 const support=preference.find(x=>strengths.includes(x))??'universal';
 return {route,target,support,remainingTargets:lows.slice(1),reason:`${AXIS_LABEL[target]} 과정을 직접 연습하고, ${support==='universal'?'공통 안내':AXIS_LABEL[support]+' 강점'}를 발판으로 사용합니다.`};
}
export type Assignment=ReturnType<typeof resolveTraining>;
export const AGE_RULES:Record<Band,{conditions:number;items:number;cards:number;judgment:string}>={
 A:{conditions:2,items:3,cards:6,judgment:'두 조건을 확인하고 다음 행동 판단'},
 B:{conditions:3,items:4,cards:8,judgment:'순서와 마감 또는 정보 출처를 함께 판단'},
 C:{conditions:4,items:5,cards:10,judgment:'시간·선후관계 또는 정보 신뢰도를 종합 판단'},
 D:{conditions:5,items:6,cards:12,judgment:'업무 의존성·연속 실행 또는 담당 범위까지 판단'}
};
export interface Task {id:string;title:string;minutes:number;group:string;}
export type Rule = {kind:'before';a:string;b:string;label:string}|{kind:'deadline';a:string;limit:number;label:string}|{kind:'last';a:string;label:string}|{kind:'adjacent';a:string;b:string;label:string};
export interface Puzzle{title:string;tasks:Task[];rules:Rule[];display:Task[];solution:string[];}
function rotate<T>(a:T[],n:number){const k=n%a.length;return [...a.slice(k),...a.slice(0,k)];}
export function makePuzzle(band:Band,round:number):Puzzle{
 const titles:Record<Band,string[][]>={
  A:[['자료 읽기','핵심 정리','발표 연습'],['준비물 확인','작품 만들기','작품 소개']],
  B:[['자료 조사','발표안 작성','슬라이드 제작','발표 연습'],['실험 준비','실험 실행','결과 정리','보고서 제출']],
  C:[['근거 조사','주장 작성','반론 검토','보고서 편집','최종 제출'],['자료 수집','분석 설계','결과 해석','발표 편집','최종 발표']],
  D:[['요구 확인','초안 작성','외부 검토','수정 반영','품질 확인','고객 전달'],['요건 분석','기획 초안','협업 검토','기획 수정','승인 확인','최종 전달']]
 };
 const names=titles[band][round%2];
 const tasks=names.map((title,i)=>({id:`t${i}`,title,minutes:[5,10,5,10,5,5][i],group:i<2?'준비':'실행'}));
 const label=(i:number)=>names[i];
 const rules:Rule[]=[{kind:'before',a:'t0',b:'t1',label:`${label(0)} 후 ${label(1)}`},{kind:'before',a:'t1',b:'t2',label:`${label(1)} 후 ${label(2)}`}];
 if(band!=='A')rules.push({kind:'deadline',a:round%2?'t2':'t1',limit:round%2?20:15,label:`${label(round%2?2:1)}을 시작 후 ${round%2?20:15}분 이내 완료`});
 if(band==='C'||band==='D')rules.push({kind:'last',a:`t${tasks.length-1}`,label:`${label(tasks.length-1)}는 모든 작업 뒤에`});
 if(band==='D')rules.push({kind:'adjacent',a:'t2',b:'t3',label:`${label(2)} 바로 다음에 ${label(3)}`});
 return {title:band==='D'?'협업 프로젝트 운영':band==='C'?'탐구 프로젝트 설계':band==='B'?'팀 과제 작전':'오늘의 과제 작전',tasks,rules,display:rotate([...tasks].reverse(),round+1),solution:tasks.map(t=>t.id)};
}
export function evaluatePuzzle(p:Puzzle,order:string[]){
 const complete=order.length===p.tasks.length&&new Set(order).size===order.length&&order.every(id=>p.tasks.some(t=>t.id===id));
 const results=p.rules.map(r=>{
  if(!complete)return false;
  const i=order.indexOf(r.a);
  if(r.kind==='before')return i<order.indexOf(r.b);
  if(r.kind==='last')return i===order.length-1;
  if(r.kind==='adjacent')return order.indexOf(r.b)===i+1;
  return order.slice(0,i+1).reduce((sum,id)=>sum+p.tasks.find(t=>t.id===id)!.minutes,0)<=r.limit;
 });
 return {complete,results,ok:complete&&results.every(Boolean)};
}
export interface Signal {id:string;title:string;subject:string;urgent:boolean;source:string;verified:boolean;owner:string;}
export interface SignalRule {key:'subject'|'urgent'|'source'|'verified'|'owner';value:string|boolean;label:string;}
export function signalRules(band:Band,round:number):SignalRule[]{
 const subject=round===0?(band==='D'?'기획':'수학'):(band==='D'?'운영':'과학');
 return ([{key:'subject',value:subject,label:`${subject} 과제만`},{key:'urgent',value:true,label:'오늘 마감만'},{key:'source',value:'공식',label:'공식 요청만'},{key:'verified',value:true,label:'확인된 정보만'},{key:'owner',value:'나',label:'내 담당만'}] as SignalRule[]).slice(0,AGE_RULES[band].conditions);
}
export function matchesSignal(s:Signal,rules:SignalRule[]){return rules.every(r=>s[r.key]===r.value);}
export function makeSignals(band:Band,round:number):Signal[]{
 const rules=signalRules(band,round),subject=String(rules[0].value),n=AGE_RULES[band].cards;
 const cards:Array<Signal>=Array.from({length:n},(_,i)=>{
  const c:Signal={id:`r${round}-${i}`,title:['검토 요청','자료 확인','진행 메모','질문 답변','초안 점검','제출 준비'][i%6],subject,urgent:true,source:'공식',verified:true,owner:'나'};
  // Each active predicate receives a counterexample; subsequent cards match all rules.
  if(i<rules.length){const k=rules[i].key;if(k==='subject')c.subject=round===0?(band==='D'?'운영':'과학'):(band==='D'?'기획':'수학');else if(k==='urgent')c.urgent=false;else if(k==='source')c.source='친구';else if(k==='verified')c.verified=false;else c.owner='동료';}
  return c;
 });return rotate(cards,round+2);
}
export function sequenceTarget(p:Puzzle){return p.tasks.map(t=>t.id);}
export function relationPairs(band:Band,round:number){
 const pairs=[['자료 찾기','근거 확보'],['핵심 정리','구조 이해'],['연습하기','설명 점검'],['시간 비교','계획 조정'],['역할 확인','중복 방지']];
 return rotate(pairs,round).slice(0,AGE_RULES[band].conditions);
}
export interface TrainingRecord {
 id:string;createdAt:string;context:{mode:'demo'|'production';assessmentId:string;subjectId:string;profileVersion:string;profileKey:string;band:Band;route:Route;target:Axis;support:Assignment['support'];rulesVersion:'planner-1.6'|'planner-1.7'|'planner-1.8'|'planner-2.0';axes:Assessment['axes'];transfer:TransferLink|null;strategyId:TransferStrategy};
 kind:'rehearsal'|'real_task'|'followup_task';verification?:Verification;source:'system_observed'|'self_report';
 measures:Record<string,number|string|boolean>;
}
