import {z} from 'zod';
import {validateAssessment} from '../official/adaptive/engine';
import type {LabState} from './model';
const str=z.string().max(2000),id=z.string().min(1).max(160);
const date=z.string().refine(x=>{if(!x)return true;const d=new Date(x+'T12:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===x;},'날짜 형식');
const stamp=z.string().refine(x=>Number.isFinite(Date.parse(x)),'시각 형식');
const nonnegative=z.number().finite().min(0).max(100000);
const axis=z.enum(['planning','attention','simultaneous','successive']),target=z.enum(['planning','attention','simultaneous','successive','integrated']);
const support=z.enum(['planning','attention','simultaneous','successive','universal','none']);
const stage=z.enum(['elementary_1_3','elementary_4_6','middle','high','adult']);
const levels=z.object({planning:z.enum(['high','mid','low']),attention:z.enum(['high','mid','low']),simultaneous:z.enum(['high','mid','low']),successive:z.enum(['high','mid','low'])}).strict();
const evidence=z.object({round:z.number().int().min(0),planConfirmed:z.boolean(),planChanged:z.boolean(),actionSelected:z.boolean(),linksConfirmed:z.boolean(),stepsConfirmed:z.boolean(),progressed:z.array(id).max(100),skipped:z.boolean()}).strict();
const step=z.object({id,title:z.string().min(1).max(160),done:z.boolean()}).strict();
const card=z.object({
 id,title:z.string().min(1).max(160),subject:str,goal:str,scope:str,firstAction:str,method:str,condition:str,alternative:str,reflection:str,
 minutes:z.number().int().min(1).max(1440),date,startTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),deadline:date,middleDeadline:date,
 owner:str,dependency:str,waiting:z.boolean(),handoff:str,domain:z.enum(['학습','생활','업무']),status:z.enum(['planned','done']),
 steps:z.array(step).max(100),links:z.array(z.enum(['목표','마감','자료','준비물','결과물','관련 과제'])).max(6),linkItems:z.record(z.string(),str),relationship:str,
 evidence,history:z.array(z.object({at:stamp,reason:str,plan:z.string().max(30000)}).strict()).max(5000),sourceClassId:id.optional(),repeat:z.enum(['none','daily','weekdays'])
}).strict();
const run=z.object({
 id,practiceId:id,cardId:id,round:z.number().int().min(0),target,support,phase:z.enum(['running','paused','review','closed']),
 startedAt:stamp,runningSince:z.union([stamp,z.literal('')]),segments:z.array(z.object({start:stamp,end:stamp}).strict()).max(5000),
 budgetMinutes:z.number().finite().min(1).max(1440),flag:str,thoughts:str,returns:z.number().int().min(0).max(10000),
 initialPlan:z.string().max(30000),actualMinutes:nonnegative.optional(),completion:z.enum(['yes','no']).optional(),
 evidenceStatus:z.enum(['performed','skipped','unobserved']).optional(),optionalAttention:z.enum(['used','not_applicable','unobserved']).optional(),
 reflection:str,nextMethod:str,feelingBefore:str,feelingAfter:str,helpRequested:z.boolean(),
 supportHistory:z.array(z.object({at:stamp,support,reduced:z.boolean()}).strict()).min(1).max(5000)
}).strict();
const experience=z.object({id,cardId:id,runId:id,fact:str,situation:str,role:str,action:str,result:str,selected:z.boolean(),createdAt:stamp}).strict();
const student=z.object({
 id:z.enum(['student-a','student-b']),name:str,stage,assessment:z.unknown().nullable(),
 officialType:z.object({id,axes:levels}).strict().optional(),difficulty:axis,round:z.number().int().min(0),creditedPractices:z.array(id).max(5000),
 supportChoice:z.enum(['official','none','planning','attention','simultaneous','successive']),reduceHelp:z.boolean(),dailyCapacity:z.number().int().min(1).max(1440),
 cards:z.array(card).max(500),runs:z.array(run).max(5000),experiences:z.array(experience).max(20000),
 methods:z.array(z.object({id,name:str,support,helpful:z.enum(['yes','no','unsure']),note:str,runId:id}).strict()).max(5000),
 goals:z.array(z.object({id,far:str,middle:str,weekly:str,date,status:z.enum(['active','paused']),cardId:id.optional()}).strict()).max(500),
 joined:z.array(id).max(100),campDays:z.record(z.string(),z.union([z.literal(1),z.literal(2)])),comparison:z.enum(['agree','different','unsure','']),comparisonNote:str,
 exploration:z.object({first:str,second:str,common:str,different:str,question:str,action:str}).strict()
}).strict();
const lesson=z.object({id,title:z.string().min(1).max(160),code:z.string().regex(/^[A-Z0-9]{6}$/),template:z.enum(['45','90','overnight']),minutes:z.number().int().min(1).max(2880),startDate:date,endDate:date,activities:str,published:z.boolean(),ended:z.boolean(),members:z.array(z.enum(['student-a','student-b'])).max(2),createdAt:stamp}).strict().refine(l=>!!l.startDate&&!!l.endDate&&l.endDate>=l.startDate,'수업 기간을 확인해 주세요.');
const shared=z.object({id,classId:id,studentId:id,cardId:id,title:str,fields:z.object({goal:str.optional(),method:str.optional(),reflection:str.optional(),experience:str.optional()}).strict(),at:stamp,
 feedback:z.array(z.object({id,text:str,nextDate:date,at:stamp}).strict()).max(1000)}).strict();
const request=z.object({id,studentId:id,classId:id,cardId:id,point:str,need:str,status:z.enum(['open','answered']),answer:str,nextDate:date}).strict();
const schema=z.object({
 schema:z.literal('nuvia-enhancement-1'),owner:z.literal('synthetic-lab-only'),labId:id,active:z.enum(['teacher','student-a','student-b']),language:z.enum(['ko','en','km','ar']),
 students:z.object({'student-a':student,'student-b':student}).strict(),lessons:z.array(lesson).max(100),shared:z.array(shared).max(1000),requests:z.array(request).max(1000)
}).strict();
function unique(ids:string[]){if(new Set(ids).size!==ids.length)throw Error('중복된 기록 ID가 있습니다.');}
export function validateLab(raw:unknown,expectedLabId?:string):LabState {
 // Additive fields introduced during this isolated review are migrated without replacing any saved record.
 const candidate=structuredClone(raw) as any;
 if(candidate?.schema==='nuvia-enhancement-1'&&candidate.owner==='synthetic-lab-only')for(const l of Array.isArray(candidate.lessons)?candidate.lessons:[]){
  if(!Object.hasOwn(l,'startDate'))l.startDate=l.createdAt?.slice(0,10);
  if(!Object.hasOwn(l,'endDate'))l.endDate=l.startDate;
 }
 if(candidate?.schema==='nuvia-enhancement-1'&&candidate.owner==='synthetic-lab-only')for(const s of Object.values(candidate.students??{}) as any[]){
  if(s&&typeof s==='object'){
   if(!Object.hasOwn(s,'campDays'))s.campDays={};
   for(const c of Array.isArray(s.cards)?s.cards:[]){if(!Object.hasOwn(c,'linkItems'))c.linkItems={};if(c.evidence&&!Object.hasOwn(c.evidence,'planChanged'))c.evidence.planChanged=false;}
   for(const r of Array.isArray(s.runs)?s.runs:[])if(!Object.hasOwn(r,'supportHistory'))r.supportHistory=[{at:r.startedAt,support:r.support,reduced:false}];
  }
 }
 const parsed=schema.safeParse(candidate);
 if(!parsed.success)throw Error('보강 검토 자료의 형식이 손상되었거나 지원하지 않는 자료입니다. 기존 자료는 바꾸지 않았습니다.');
 const n=parsed.data as LabState;
 if(expectedLabId&&expectedLabId!==n.labId)throw Error('다른 검토 공간의 백업입니다. 현재 자료를 바꾸지 않았습니다.');
 unique(n.lessons.map(x=>x.id));unique(n.lessons.map(x=>x.code));unique(n.shared.map(x=>x.id));unique(n.requests.map(x=>x.id));
 for(const sid of ['student-a','student-b'] as const){
  const s=n.students[sid];
  if(s.id!==sid||s.name!==(sid==='student-a'?'가상 학생 가':'가상 학생 나'))throw Error('합성 학생 식별정보가 다릅니다. 실제 학생 자료를 가져올 수 없습니다.');
  if(s.assessment){validateAssessment(s.assessment);if(s.assessment.subjectId!==sid||s.assessment.assessmentId!==`synthetic-${sid}`||s.assessment.educationStage!==s.stage)throw Error('다른 학생의 결과 문맥입니다.');}
  unique(s.cards.map(x=>x.id));unique(s.runs.map(x=>x.id));unique(s.experiences.map(x=>x.id));unique(s.creditedPractices);
  if(s.runs.filter(x=>x.phase!=='closed').length>1)throw Error('한 학생에게 실행 중인 블록이 중복되어 있습니다.');
  for(const c of s.cards){unique(c.steps.map(x=>x.id));unique(c.links);if(c.evidence.progressed.some(id=>!c.steps.some(x=>x.id===id&&x.done)))throw Error('단계 진행 근거가 맞지 않습니다.');}
  for(const r of s.runs){
   if(!s.cards.some(c=>c.id===r.cardId))throw Error('실행의 원래 행동카드를 찾을 수 없습니다.');
   if((r.phase==='running')!==!!r.runningSince||r.segments.some(x=>Date.parse(x.end)<Date.parse(x.start)))throw Error('타이머 구간 정보가 맞지 않습니다.');
   if(r.phase==='closed'&&(!r.completion||!r.evidenceStatus||r.actualMinutes===undefined))throw Error('종료 기록이 빠져 있습니다.');
   if(r.optionalAttention&&r.target!=='attention')throw Error('상황별 행동의 해당 없음은 주의 활동에만 허용됩니다.');
  }
  for(const e of s.experiences)if(!s.runs.some(r=>r.id===e.runId&&r.cardId===e.cardId&&r.phase==='closed'))throw Error('실제 실행에 연결되지 않은 경험입니다.');
  for(const m of s.methods)if(!s.runs.some(r=>r.id===m.runId&&r.phase==='closed'))throw Error('방법의 실행 기록이 없습니다.');
  for(const g of s.goals)if(g.cardId&&!s.cards.some(c=>c.id===g.cardId))throw Error('목표의 행동카드가 없습니다.');
  for(const lid of s.joined)if(!n.lessons.some(l=>l.id===lid&&l.members.includes(sid)))throw Error('수업 참여 문맥이 맞지 않습니다.');
 }
 for(const x of [...n.shared,...n.requests]){
  const s=n.students[x.studentId as 'student-a'|'student-b'],l=n.lessons.find(l=>l.id===x.classId);
  if(!s||!l||l.ended||!s.joined.includes(l.id)||!l.members.includes(s.id)||!s.cards.some(c=>c.id===x.cardId))throw Error('공유·요청의 수업 문맥이 맞지 않습니다.');
 }
 return structuredClone(n);
}
async function checksum(data:unknown){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(data))))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function exportLab(state:LabState){
 const data=validateLab(state);
 return JSON.stringify({format:'NUVIA_SYNTHETIC_ENHANCEMENT_BACKUP',labId:data.labId,checksum:await checksum(data),data},null,2);
}
export async function importLab(json:string,currentLabId:string){
 if(json.length>15000000)throw Error('15MB 이하의 보강 검토 백업만 가져올 수 있습니다.');
 let raw:any;try{raw=JSON.parse(json);}catch{throw Error('JSON 백업이 손상되었습니다.');}
 if(raw?.format!=='NUVIA_SYNTHETIC_ENHANCEMENT_BACKUP'||raw.labId!==currentLabId||typeof raw.checksum!=='string')throw Error('이 검토 공간에서 내려받은 합성 백업만 가져올 수 있습니다.');
 if(await checksum(raw.data)!==raw.checksum)throw Error('백업의 검사값이 맞지 않습니다. 기존 자료를 유지합니다.');
 return validateLab(raw.data,currentLabId);
}
