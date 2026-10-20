import {z} from 'zod';
import {AXES,validateAssessment,profileKey} from '../official/adaptive/engine';
import type {Assessment} from '../enhancement/model';
import {routeFor,elapsed} from '../enhancement/domain';
import {AXIS_NAMES,SUPPORT_NAMES} from '../enhancement/model';
import type {PersonalState} from './model';

export type Support='planning'|'attention'|'simultaneous'|'successive'|'universal'|'none';
export interface Source {id:string;kind:string;date:string;mode:'example'|'input';assessment:Assessment;at:string}
export interface ComparisonResponse {id:string;statementId:string;text:string;answer:'agree'|'different'|'unsure';at:string;cardId:string|null;cardTitle:string;example:string;assessmentKey:string|null;previousId?:string}
export interface MethodFeedback {id:string;runId:string;support:Support;answer:'yes'|'neutral'|'no'|'unsure';at:string;previousId?:string}
export interface RunContext {
 runId:string;cardId:string;cardTitle:string;subject:string;scope:string;kind:string;axis:string;at:string;month:string;
 plannedMinutes:number;actualMs:number;closed:boolean;methods:Support[];resumes:{at:string;flag:string;recovery:boolean}[];
 source:Source|null;initialHistory:number;planEdits:number;finalScope:string;
}
export interface Insights {source:Source|null;sources:Source[];comparisons:ComparisonResponse[];feedback:MethodFeedback[];contexts:Record<string,RunContext>}
export type InsightsAction =
 |{type:'assessment.example'}|{type:'assessment.clear'}|{type:'assessment.input';payload:unknown}
 |{type:'comparison.respond';statementId:string;text:string;answer:ComparisonResponse['answer'];cardId:string|null;example:string}
 |{type:'method.respond';runId:string;support:Support;answer:MethodFeedback['answer']}
 |{type:'review.insights-example'};
const text=z.string().max(3000),id=z.string().min(1).max(160),stamp=z.string().refine(x=>Number.isFinite(Date.parse(x)));
const support=z.enum(['planning','attention','simultaneous','successive','universal','none']);
const sourceSchema=z.object({id,kind:z.string().min(1).max(160),date:text,mode:z.enum(['example','input']),assessment:z.unknown(),at:stamp}).strict();
export const insightsSchema=z.object({
 source:sourceSchema.nullable(),sources:z.array(sourceSchema).max(1000),
 comparisons:z.array(z.object({id,statementId:id,text,answer:z.enum(['agree','different','unsure']),at:stamp,cardId:id.nullable(),cardTitle:text,example:text,assessmentKey:text.nullable(),previousId:id.optional()}).strict()).max(20000),
 feedback:z.array(z.object({id,runId:id,support,answer:z.enum(['yes','neutral','no','unsure']),at:stamp,previousId:id.optional()}).strict()).max(20000),
 contexts:z.record(z.string(),z.object({runId:id,cardId:id,cardTitle:text,subject:text,scope:text,kind:text,axis:z.enum(['planning','attention','simultaneous','successive','integrated']),at:stamp,month:z.string().regex(/^\d{4}-\d{2}$/),plannedMinutes:z.number().min(0).max(1440),actualMs:z.number().min(0),closed:z.boolean(),methods:z.array(support).max(6),resumes:z.array(z.object({at:stamp,flag:text,recovery:z.boolean()}).strict()).max(20000),source:sourceSchema.nullable(),initialHistory:z.number().int().min(0),planEdits:z.number().int().min(0),finalScope:text}).strict())
}).strict();
export const emptyInsights=():Insights=>({source:null,sources:[],comparisons:[],feedback:[],contexts:{}});
export const insightsOf=(s:PersonalState):Insights=>s.insights??emptyInsights();
const person=(s:PersonalState)=>s.lab.students['student-a'];
// Preserve the canonical result in Source. The unchanged synthetic lab contract
// requires its own internal IDs; never rewrite the imported Source identifiers.
const labAssessment=(a:Assessment):Assessment=>({...structuredClone(a),subjectId:'student-a',assessmentId:'synthetic-student-a'});
const day=(at:string)=>{const d=new Date(at);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export function previousMonth(m:string){const [y,n]=m.split('-').map(Number);return `${n===1?y-1:y}-${String(n===1?12:n-1).padStart(2,'0')}`;}
export function assessmentView(s:PersonalState){
 const a=person(s).assessment,source=insightsOf(s).source;
 if(!a)return {mode:'none' as const,kind:'검사 미연결',date:'',assessment:null,notice:'실제 결과지 서버는 미연결입니다. 일반 연습이며 공식 보완 판정이 아닙니다.'};
 if(source&&profileKey(a)===profileKey(labAssessment(source.assessment)))return {...source,assessment:source.assessment,notice:source.mode==='example'?'명시적으로 선택한 합성 검사 예시입니다. 실제 학생 점수가 아닙니다.':'검토용 결과 계약 입력입니다. 원본 식별정보·값·분류를 별도 보존하고 합성 실행 공간과 구분합니다. 실제 서버·소유자 검증은 미연결입니다.'};
 return {mode:'unverified' as const,kind:a.scoreSystem?.label??'과거 검사 입력',date:'',assessment:a,notice:'출처·검사일이 확인되지 않은 보관 입력입니다. 실제 연결 결과로 간주하지 않습니다.'};
}
export function guideFor(s:PersonalState){
 const r=routeFor(person(s)),v=assessmentView(s);
 const reasons=v.mode==='none'?'검사 미연결 상태의 일반 연습으로 시작합니다.':r.creditAllowed?(r.targets.length>1?'공식 지원 순서의 여러 하 영역 중 이번 회차 하나를 추천합니다.':r.target==='integrated'?'공식 분류에서 하 영역이 없어 통합 흐름을 추천합니다.':'공식 상중하 입력의 하 영역을 이번 목표로 추천합니다.'):r.warning;
 const required={planning:'오늘 할 범위·시간·순서를 직접 결정하고 계획을 확인하거나 바꾼 뒤 실행을 마칩니다.',attention:'현재 할 행동 하나를 직접 고르고 실행을 마칩니다. 보관·깃발은 필요할 때만 씁니다.',simultaneous:'실제 항목 둘 이상을 연결하고 관계를 직접 확인한 뒤 실행을 마칩니다.',successive:'실제 단계 둘 이상을 확정하고 한 단계 이상 직접 진행 표시한 뒤 실행을 마칩니다.',integrated:'계획을 직접 확정하거나 바꾸고 실제 실행을 마칩니다.'};
 const supportReason=person(s).supportChoice!=='official'?'본인이 바꾼 도움입니다. 공식 결과나 목표는 바꾸지 않습니다.':r.support==='universal'?'상 영역이 없거나 순서를 확인하지 못해 강점을 꾸미지 않고 공통 안내를 씁니다.':'상 영역과 공식 강점 순서에 따른 정보 제시 후보입니다. 학생 대신 답을 정하지 않습니다.';
 return {target:AXIS_NAMES[r.target],reason:reasons,required:required[r.target],support:SUPPORT_NAMES[r.support]+' — '+supportReason,mode:v.notice};
}
export function statements(s:PersonalState){
 const g=guideFor(s),r=routeFor(person(s));
 return [{id:`target-${r.target}`,text:`이번 지원 후보는 ‘${g.target}’입니다. ${g.reason}`,kind:'explanation' as const},{id:`support-${r.support}`,text:`‘${g.support}’ 방식으로 정보를 보는 것이 내 과제에 맞을 수 있습니다.`,kind:'method' as const}];
}
export function exampleEnvelope(stage:Assessment['educationStage']='middle'){
 return {testKind:'K-PASS 합성 검토 예시',testDate:'2026-10-01',assessment:{schemaVersion:'1.1',assessmentId:'personal-explicit-example',subjectId:'student-a',profileVersion:'example-only-1',educationStage:stage,scoreSystem:{instrument:'kpass',metric:'standard_score',label:'합성 예시 · 표준점수',interpretationVersion:'example-not-official-type-table'},supportOrder:['planning'],strengthOrder:['simultaneous'],axes:{planning:{level:'low',value:88,unit:'표준점수'},attention:{level:'mid',value:101,unit:'표준점수'},simultaneous:{level:'high',value:115,unit:'표준점수'},successive:{level:'mid',value:103,unit:'표준점수'}}} as Assessment};
}
function validDay(s:string){try{return /^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}catch{return false;}}
export function installAssessment(s:PersonalState,payload:unknown,mode:Source['mode'],at:string){
 const p=person(s),x=payload as any;
 if(p.runs.some(r=>r.phase!=='closed'))throw Error('현재 실행을 마친 뒤 검사 출발점을 변경하세요.');
 if(!x||typeof x.testKind!=='string'||!x.testKind.trim()||x.testKind.length>160||!validDay(x.testDate))throw Error('검사 종류와 실제 달력 형식의 검사일을 확인하세요.');
 const a=validateAssessment(x.assessment);
 if(a.schemaVersion!=='1.1'||!a.scoreSystem)throw Error('이 검토 입력은 네 영역 값·단위·점수 체계가 명시된 1.1 계약을 요구합니다. 기존 계약은 바꾸지 않습니다.');
 if(a.scoreSystem.metric==='standard_score'&&AXES.some(axis=>!['표준점수','SS','점','standard_score'].includes(a.axes[axis].unit??'')))throw Error('표준점수를 정답률·백분위 단위로 표시할 수 없습니다.');
 if(a.scoreSystem.metric==='percentile'&&AXES.some(axis=>!['백분위','PR','percentile','%'].includes(a.axes[axis].unit??'')))throw Error('백분위 단위를 확인하세요.');
 const old=insightsOf(s).source;
 if(old&&old.kind===x.testKind&&old.date===x.testDate&&old.mode===mode&&profileKey(old.assessment)===profileKey(a)&&p.assessment&&profileKey(p.assessment)===profileKey(labAssessment(a)))return;
 const i=s.insights??=emptyInsights();
 s.assessmentHistory.push({at,source:'검사 출발점 변경 전 보존 · 실제 서버 연결 아님',assessment:structuredClone(p.assessment)});
 const source:Source={id:crypto.randomUUID(),kind:x.testKind.trim(),date:x.testDate,mode,assessment:structuredClone(a),at};
 i.source=source;i.sources.push(structuredClone(source));p.assessment=labAssessment(a);p.stage=a.educationStage;p.round=0;p.creditedPractices=[];
 p.officialType=x.officialType;
 for(const c of p.cards)c.evidence={round:0,planConfirmed:false,planChanged:false,actionSelected:false,linksConfirmed:false,stepsConfirmed:false,progressed:[],skipped:false};
}
export function applyInsight(s:PersonalState,a:InsightsAction,at:string,review:boolean){
 const p=person(s);
 if(a.type.startsWith('assessment.')){
  if(!review)throw Error('검사 입력/예시는 명시적 검토 관리에서만 가능합니다. 실제 서버는 미연결입니다.');
  if(a.type==='assessment.example')installAssessment(s,exampleEnvelope(p.stage),'example',at);
  if(a.type==='assessment.input')installAssessment(s,a.payload,'input',at);
  if(a.type==='assessment.clear'){
   if(p.runs.some(r=>r.phase!=='closed'))throw Error('실행을 마친 뒤 변경하세요.');
   s.assessmentHistory.push({at,source:'검사 미연결 모드 전환 전 보존',assessment:structuredClone(p.assessment)});
   (s.insights??=emptyInsights()).source=null;p.assessment=null;p.officialType=undefined;p.round=0;p.creditedPractices=[];
   for(const c of p.cards)c.evidence={round:0,planConfirmed:false,planChanged:false,actionSelected:false,linksConfirmed:false,stepsConfirmed:false,progressed:[],skipped:false};
  }return;
 }
 const i=s.insights??=emptyInsights();
 if(a.type==='comparison.respond'){
  if(!['agree','different','unsure'].includes(a.answer)||!a.statementId||!a.text.trim()||a.text.length>3000||a.example.length>3000)throw Error('설명과 선택을 확인하세요.');
  const card=a.cardId?p.cards.find(c=>c.id===a.cardId):undefined;if(a.cardId&&!card)throw Error('내 과제를 선택하세요.');
  const v=assessmentView(s);
  const key=v.mode==='example'||v.mode==='input'?i.source!.id:p.assessment?profileKey(p.assessment):null;
  const prev=i.comparisons.filter(c=>c.statementId===a.statementId&&c.cardId===a.cardId&&c.assessmentKey===key).at(-1);
  if(prev?.answer===a.answer&&prev.example===a.example)return;
  i.comparisons.push({id:crypto.randomUUID(),statementId:a.statementId,text:a.text,answer:a.answer,at,cardId:a.cardId,cardTitle:card?.title??'과제 선택 안 함',example:a.example,assessmentKey:key,...(prev&&{previousId:prev.id})});
 }
 if(a.type==='method.respond'){
  if(!['yes','neutral','no','unsure'].includes(a.answer)||!usedMethods(s).some(m=>m.runId===a.runId&&m.support===a.support))throw Error('실제 실행에서 사용한 도움을 선택하세요.');
  const prev=i.feedback.filter(f=>f.runId===a.runId&&f.support===a.support).at(-1);if(prev?.answer===a.answer)return;
  i.feedback.push({id:crypto.randomUUID(),runId:a.runId,support:a.support,answer:a.answer,at,...(prev&&{previousId:prev.id})});
 }
}
export function observeExecution(before:PersonalState,after:PersonalState,command:{type:string;[k:string]:any},at:string){
 const p=person(after),i=after.insights??=emptyInsights(),v=assessmentView(after);
 for(const r of p.runs.filter(r=>!person(before).runs.some(old=>old.id===r.id))){
  const c=p.cards.find(c=>c.id===r.cardId);
  if(r&&c&&!i.contexts[r.id])i.contexts[r.id]={runId:r.id,cardId:c.id,cardTitle:c.title,subject:c.subject,scope:c.scope,kind:after.meta[c.id]?.kind??'',axis:r.target,at:r.startedAt,month:day(r.startedAt).slice(0,7),plannedMinutes:r.budgetMinutes,actualMs:0,closed:false,methods:[],resumes:[],source:v.mode==='example'||v.mode==='input'?structuredClone(i.source):null,initialHistory:c.history.length,planEdits:0,finalScope:c.scope};
 }
 for(const r of p.runs){
  const c=i.contexts[r.id];if(!c)continue;
  const old=person(before).runs.find(x=>x.id===r.id);
  if(r.phase==='running'&&!c.methods.includes(r.support))c.methods.push(r.support);
  if(command.type==='run.resume'&&command.runId===r.id&&old?.phase==='paused')c.resumes.push({at,flag:r.flag,recovery:before.recovery});
  if(r.phase==='closed'&&!c.closed){
   const card=p.cards.find(x=>x.id===r.cardId)!;
   c.closed=true;c.actualMs=elapsed(r);c.month=day(at).slice(0,7);c.finalScope=card.scope;c.planEdits=Math.max(0,card.history.length-c.initialHistory);
  }
 }
}
export function usedMethods(s:PersonalState,month?:string){
 const i=insightsOf(s);
 return Object.values(i.contexts).filter(c=>c.closed&&c.actualMs>0&&(!month||c.month===month)).flatMap(c=>c.methods.map(support=>({runId:c.runId,support,cardTitle:c.cardTitle,subject:c.subject,scope:c.scope,month:c.month,feedback:i.feedback.filter(f=>f.runId===c.runId&&f.support===support).at(-1)})));
}
export function preferredHelp(s:PersonalState){
 return usedMethods(s).filter(m=>m.feedback?.answer==='yes'&&!['universal','none'].includes(m.support)).sort((a,b)=>b.feedback!.at.localeCompare(a.feedback!.at))[0]?.support;
}
export function methodFacts(s:PersonalState,month:string){
 const rows=usedMethods(s,month);
 return [...new Set(rows.map(r=>r.support))].map(support=>{const uses=rows.filter(r=>r.support===support);return {support,uses:uses.length,responses:uses.filter(r=>r.feedback).length,yes:uses.filter(r=>r.feedback?.answer==='yes').length,neutral:uses.filter(r=>r.feedback?.answer==='neutral').length,no:uses.filter(r=>r.feedback?.answer==='no').length,unsure:uses.filter(r=>r.feedback?.answer==='unsure').length,unanswered:uses.filter(r=>!r.feedback).length,contexts:uses};});
}
export function executionFacts(s:PersonalState,month:string){
 const contexts=Object.values(insightsOf(s).contexts).filter(c=>c.closed&&c.month===month);
 const prev=Object.values(insightsOf(s).contexts).filter(c=>c.closed&&c.month===previousMonth(month));
 const key=(c:RunContext)=>c.plannedMinutes>0&&c.scope.trim()&&c.kind&&c.scope===c.finalScope?JSON.stringify([c.cardTitle.trim(),c.subject.trim(),c.scope.trim(),c.axis,c.kind]):'';
 const groups=[...new Set(contexts.map(key).filter(Boolean))].map(k=>{
  const now=contexts.filter(c=>key(c)===k),before=prev.filter(c=>key(c)===k);
  const avg=(rows:RunContext[])=>rows.length?rows.reduce((n,c)=>n+Math.abs(c.plannedMinutes-c.actualMs/60000),0)/rows.length:null;
  return {title:now[0].cardTitle,scope:now[0].scope,now:avg(now),before:avg(before),n:now.length,previousN:before.length};
 });
 return {contexts,returns:contexts.reduce((n,c)=>n+c.resumes.length,0),edits:contexts.reduce((n,c)=>n+c.planEdits,0),groups};
}
export function validateInsights(s:PersonalState){
 if(!s.insights)return;
 const i=insightsOf(s),p=person(s);
 for(const src of [...i.sources,...(i.source?[i.source]:[])]){validateAssessment(src.assessment);if(src.date&&!validDay(src.date))throw Error('검사일 메타데이터가 맞지 않습니다.');}
 const ids=[...i.comparisons.map(x=>x.id),...i.feedback.map(x=>x.id)];if(new Set(ids).size!==ids.length)throw Error('중복 경험 응답 ID입니다.');
 for(const [id,c] of Object.entries(i.contexts)){
  const run=p.runs.find(r=>r.id===id);
  if(!run||id!==c.runId||run.cardId!==c.cardId||run.target!==c.axis||c.closed!==(run.phase==='closed'))throw Error('실행 변화 기록 연결이 맞지 않습니다.');
  if(c.closed&&Math.abs(c.actualMs-elapsed(run))>1)throw Error('일시정지 제외 실행 시간이 맞지 않습니다.');
  if(c.source)validateAssessment(c.source.assessment);
 }
 for(const f of i.feedback)if(!usedMethods(s).some(m=>m.runId===f.runId&&m.support===f.support))throw Error('응답에 연결된 실제 방법 사용이 없습니다.');
 for(const [index,c] of i.comparisons.entries()){
  if(c.cardId&&!p.cards.some(x=>x.id===c.cardId))throw Error('경험 응답 과제 연결이 없습니다.');
  if(c.previousId&&!i.comparisons.slice(0,index).some(x=>x.id===c.previousId&&x.statementId===c.statementId&&x.cardId===c.cardId&&x.assessmentKey===c.assessmentKey))throw Error('경험 응답 변경 연결이 맞지 않습니다.');
 }
 for(const [index,f] of i.feedback.entries())if(f.previousId&&!i.feedback.slice(0,index).some(x=>x.id===f.previousId&&x.runId===f.runId&&x.support===f.support))throw Error('방법 응답 변경 연결이 맞지 않습니다.');
}
