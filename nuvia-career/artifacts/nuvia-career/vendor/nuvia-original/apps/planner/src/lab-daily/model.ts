import {z} from 'zod/v3';
import {externalSchema,ackSchema} from './contract';
import {jobRecordSchema} from './job-contract';
import {legacyYouthArchiveSchema} from './legacy-youth-archive';
import type {YouthServerContext} from './youth-context';
import type {JobServerContext} from './job-adapter';
/** nuvia-lab-handoff/v1 — proposal pending agreement with LAB. No user id field: the server derives the user from the session. */
const id=z.string().min(1).max(160),stamp=z.string().datetime(),label=z.string().max(300);
export const SUPPORTS=['planning','attention','simultaneous','successive','universal','none'] as const;
export const handoffSchema=z.object({
 schema:z.literal('nuvia-lab-handoff/v1'),handoffId:id,version:z.number().int().positive(),
 sourceLab:z.enum(['youth-career','job']),confirmedAt:stamp,stage:z.enum(['middle','high','adult']),
 strengths:z.array(label).max(30),interests:z.array(label).max(30),
 direction:z.object({id,name:label}).strict(),directionChange:z.enum(['none','add','switch']),
 support:z.enum(SUPPORTS).optional(),productSample:z.literal(true).optional()
}).strict();
export type Handoff=z.infer<typeof handoffSchema>;
export const TEMPLATES=['observe','compare','classify','plan','reflect','mixed'] as const;
export type TemplateId=typeof TEMPLATES[number];
const contextText=z.string().max(300),handoffId=z.string().min(1).max(164);
const proposal=z.object({id,slot:z.number().int().min(0).max(2),templateId:z.enum(TEMPLATES),interest:contextText,directionId:id,directionName:contextText,
 sourceLab:z.enum(['youth-career','job']).optional(),contextKind:z.enum(['interests','directions','strengths']).optional(),
 handoffId,handoffVersion:z.number().int().min(1),minutes:z.number().int().min(5).max(10),status:z.enum(['offered','replaced','accepted']),cardId:id.optional()}).strict();
export type Proposal=z.infer<typeof proposal>;
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const labDailySchema=z.object({
 account:z.object({timeZone:z.string().min(1).max(60)}).strict(),
 handoffs:z.array(z.object({payload:handoffSchema,receivedAt:stamp,virtual:z.literal(true),contract:z.union([externalSchema,legacyYouthArchiveSchema]).optional(),ack:ackSchema.optional(),serverOrder:z.number().int().positive().optional()}).strict()).max(200),
 pendingYouth:z.array(z.object({handoff:externalSchema,receivedAt:stamp,status:z.literal('connection_pending')}).strict()).optional(),
 youthReviewScope:z.string().min(1).optional(),
 jobSnapshots:z.array(jobRecordSchema).optional(),
 jobReviewScope:z.string().min(1).optional(),
 days:z.record(day,z.object({extra:z.preprocess(v=>v===true?2:v===false?0:v,z.number().int().min(0).max(2)),proposals:z.array(proposal)}).strict()),
 withdrawals:z.array(z.object({requestId:id,sourceLab:z.enum(['youth-career','job']),directionId:id,at:stamp}).strict()).max(200).optional(),
 requests:z.record(id,z.object({day,kind:z.enum(['receive','propose','more','replace','accept','withdraw']),fp:z.string()}).strict()),
 cards:z.record(id,z.object({proposalId:id,handoffId,handoffVersion:z.number().int().min(1),day,directionId:id,directionName:contextText,sourceLab:z.enum(['youth-career','job']),source:z.enum(['suggested','edited','written']),minutes:z.number().int().min(5).max(10)}).strict())
}).strict();
export type LabDaily=z.infer<typeof labDailySchema>;
export type LabDailyAction=
 |{type:'labdaily.receive';requestId:string;payload:unknown;demo?:true}
 /** [NUVIA 연동] 셸 수신함(/api/lab-inbox)에서 읽은 방향. 서버 확인 정보는 integration/labInbox 만 만든다(화면에서 만들지 않음) */
 |{type:'labdaily.server-receive';requestId:string;payload:unknown;youth?:YouthServerContext;job?:JobServerContext}
 |{type:'labdaily.withdraw';requestId:string;sourceLab:'youth-career'|'job';directionId:string}
 |{type:'labdaily.propose';requestId:string}
 |{type:'labdaily.more';requestId:string}
 |{type:'labdaily.replace';requestId:string;proposalId:string}
 |{type:'labdaily.accept';requestId:string;proposalId:string;question:string;scope:string;minutes:number;source:'suggested'|'edited'|'written'};
export const DAILY_LIMIT=3,FIRST=1;
