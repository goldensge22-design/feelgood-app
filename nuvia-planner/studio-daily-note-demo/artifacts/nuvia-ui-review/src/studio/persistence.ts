import {z} from 'zod';
import {validateStudioLab} from './task-plan';
import {validateAssessment} from '../official/adaptive/engine';
import {student} from './monthly';
import type {PersonalState} from './model';
import {insightsSchema,validateInsights} from './insights';
import {studioSchema} from './studio-model';
import {validateStudioLinks} from './roadmap';
import {validateLibrary} from '../planner-library/domain';
const id=z.string().min(1).max(160),text=z.string().max(3000),stamp=z.string().refine(s=>Number.isFinite(Date.parse(s)));
const date=z.string().refine(s=>{try{return /^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}catch{return false;}});
const axis=z.enum(['planning','attention','simultaneous','successive','integrated']),count=z.number().int().min(0).max(10000),month=z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const meta=z.object({kind:text,examDate:z.union([date,z.literal('')]),weeklyScope:text,materials:text,nextPosition:text,output:text,difficulty:text,proposal:text.optional(),originDraft:id.optional(),helpPreference:z.enum(['planning','attention','simultaneous','successive','universal','none','official']).optional()}).strict();
const agreement=z.object({id,month,axis,count,at:stamp,reason:text,after:z.union([stamp,z.literal('')]),previousId:id.optional()}).strict();
const entry=z.object({id,practiceId:id,runId:id,axis,status:z.enum(['performed','skipped','unobserved']),localDate:date,originalDate:date,enteredAt:stamp,cardTitle:text,proof:z.array(text).max(100),optionalAttention:z.enum(['unobserved','used','not_applicable']),output:text,feeling:text,difficulty:text,assessment:z.unknown(),corrections:z.array(z.object({at:stamp,from:date,to:date,reason:z.string().min(1).max(3000)}).strict()).max(1000)}).strict();
const draft=z.object({id,fromMonth:month,toMonth:month,axis,count,chunk:text,method:text,help:z.enum(['planning','attention','simultaneous','successive','universal','none','official']),date,reasons:z.array(text),baseline:z.object({count,chunk:text,method:text,help:text}).strict(),status:z.enum(['pending','accepted','deferred']),createdAt:stamp,acceptedAt:stamp.optional(),cardIds:z.array(id)}).strict();
const schema=z.object({schema:z.literal('nuvia-personal-monthly-1'),mode:z.enum(['personal','review']),workspaceId:id,studentId:z.literal('student-a'),lab:z.unknown(),meta:z.record(z.string(),meta),agreements:z.array(agreement).max(10000),entries:z.array(entry).max(20000),drafts:z.array(draft).max(10000),onboarding:z.boolean(),lastSeen:stamp,recovery:z.boolean(),assessmentHistory:z.array(z.object({at:stamp,source:text,assessment:z.unknown()}).strict()).max(1000),insights:insightsSchema.optional(),studio:studioSchema.optional()}).strict();
function unique(values:string[]){if(new Set(values).size!==values.length)throw Error('중복 기록 ID가 있습니다.');}
export function validate(raw:unknown,workspaceId?:string):PersonalState{
 const result=schema.safeParse(raw);if(!result.success)throw Error('개인 보강 자료 형식이 맞지 않습니다. 기존 자료는 유지합니다.');
 const n=result.data as PersonalState;n.lab=validateStudioLab(n);
 if(workspaceId&&n.workspaceId!==workspaceId)throw Error('다른 개인 검토 공간의 자료입니다.');
 unique(n.agreements.map(g=>g.id));unique(n.entries.map(g=>g.id));unique(n.entries.map(g=>g.runId));unique(n.drafts.map(g=>g.id));
 const p=student(n);
 for(const e of n.entries){
  const r=p.runs.find(r=>r.id===e.runId);
  const fixture=n.mode==='review'&&e.runId.startsWith('fixture-')&&e.proof.some(x=>x.includes('합성'));
  if(!fixture&&(!r||r.phase!=='closed'||r.target!==e.axis||r.practiceId!==e.practiceId||r.evidenceStatus!==e.status))throw Error('수행 근거와 실행 기록의 연결이 맞지 않습니다.');
  if(e.status==='performed'&&!e.proof.length)throw Error('필수 행동 근거가 없습니다.');
  if(e.assessment)validateAssessment(e.assessment);
  if(e.corrections.length&&e.corrections.at(-1)!.to!==e.localDate)throw Error('정정 이력이 맞지 않습니다.');
 }
 for(const g of n.agreements)if(g.previousId&&!n.agreements.some(old=>old.id===g.previousId&&old.axis===g.axis&&old.month===g.month))throw Error('목표 변경의 이전 기준이 없습니다.');
 for(const d of n.drafts)if(d.cardIds.some(id=>!p.cards.some(c=>c.id===id)))throw Error('초안 일정 연결이 맞지 않습니다.');
 for(const cid of Object.keys(n.meta))if(!p.cards.some(c=>c.id===cid))throw Error('내 과제 연결이 맞지 않습니다.');
 validateInsights(n);validateStudioLinks(n);validateLibrary(n);return structuredClone(n);
}
export function freezeTimers(state:PersonalState,at=state.lastSeen){
 const n=structuredClone(state);let recovery=false;
 for(const p of Object.values(n.lab.students))for(const r of p.runs.filter(r=>r.phase==='running')){
  const end=new Date(Math.max(Date.parse(r.runningSince),Math.min(Date.parse(at),Date.now()))).toISOString();
  r.segments.push({start:r.runningSince,end});r.runningSince='';r.phase='paused';recovery=true;
 }
 n.recovery=recovery||n.recovery;return n;
}
export async function checksum(data:unknown){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(data))))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export async function exportBackup(state:PersonalState,scope:'personal'|'workspace'){
 if(scope==='workspace'&&state.mode!=='review')throw Error('전체 시연 공간 백업은 검토 관리에서만 가능합니다.');
 const n=freezeTimers(validate(state));
 let data:any=n;
 if(scope==='personal'){
  const p=structuredClone(student(n));p.joined=[];p.campDays={};for(const c of p.cards)delete c.sourceClassId;
  data={schema:n.schema,mode:n.mode,workspaceId:n.workspaceId,studentId:n.studentId,student:p,meta:n.meta,agreements:n.agreements,entries:n.entries,drafts:n.drafts,onboarding:n.onboarding,lastSeen:n.lastSeen,recovery:n.recovery,assessmentHistory:n.assessmentHistory,...(n.insights&&{insights:n.insights}),...(n.studio&&{studio:n.studio})};
 }
 return JSON.stringify({format:'NUVIA_STUDIO_BACKUP',scope,workspaceId:n.workspaceId,studentId:n.studentId,checksum:await checksum(data),data},null,2);
}
export async function importBackup(text:string,current:PersonalState){
 if(text.length>15000000)throw Error('15MB 이하 백업만 선택하세요.');
 let raw:any;try{raw=JSON.parse(text);}catch{throw Error('JSON 백업이 손상되었습니다.');}
 if(raw.format!=='NUVIA_STUDIO_BACKUP'||raw.workspaceId!==current.workspaceId||raw.studentId!==current.studentId||!['personal','workspace'].includes(raw.scope))throw Error('백업의 종류 또는 개인 공간이 다릅니다.');
 if(await checksum(raw.data)!==raw.checksum)throw Error('백업 검사값이 맞지 않습니다.');
 if(raw.scope==='workspace'){
  if(current.mode!=='review')throw Error('일반 개인 화면에는 전체 공간을 복원할 수 없습니다.');
  return freezeTimers(validate(raw.data,current.workspaceId));
 }
 const d=raw.data;
 const keys=['schema','mode','workspaceId','studentId','student','meta','agreements','entries','drafts','onboarding','lastSeen','recovery','assessmentHistory','insights','studio'];
 if(Object.keys(d).some(k=>!keys.includes(k))||d.mode!==current.mode||d.student?.id!==current.studentId)throw Error('내 기록 백업 범위가 맞지 않습니다.');
 const n=structuredClone(current);n.lab.students['student-a']=d.student;
 for(const k of ['meta','agreements','entries','drafts','onboarding','lastSeen','recovery','assessmentHistory'] as const)(n as any)[k]=d[k];
 if(d.insights)n.insights=d.insights;else delete n.insights;
 if(d.studio)n.studio=d.studio;else delete n.studio;
 n.lab.shared=n.lab.shared.filter(x=>x.studentId!==n.studentId);n.lab.requests=n.lab.requests.filter(x=>x.studentId!==n.studentId);
 for(const l of n.lab.lessons)l.members=l.members.filter(id=>id!==n.studentId);
 return freezeTimers(validate(n,current.workspaceId));
}
