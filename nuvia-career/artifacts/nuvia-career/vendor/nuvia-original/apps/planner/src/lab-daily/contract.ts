import {z} from 'zod/v3';
import {locales} from '../studio/i18n/config';
import type {Handoff} from './model';
/** Sender layout reported by the youth LAB. NOT the earlier internal demo layout.
 * Only schemaVersion/sourceLab/requestId/direction exist at the top level. */
const id=z.string().min(1).max(160),stamp=z.string().datetime(),text=z.string().max(300);
export const EXTERNAL_VERSION='daily-exploration-direction/1',PURPOSE='planner-daily-suggestions';
const item=z.object({id,text}).strict();
export const externalSchema=z.object({
 schemaVersion:z.literal(EXTERNAL_VERSION),sourceLab:z.literal('youth-career'),requestId:id,
 direction:z.object({
  id,revision:z.number().int().positive(),action:z.enum(['add','switch']),
  educationStage:z.enum(['middle','high','unspecified']),
  focus:z.object({id,text,kind:z.literal('student-confirmed-direction')}).strict(),
  strengths:z.array(item).max(30),interests:z.array(item).max(30),
  sourceRefs:z.array(z.object({kind:text,id,revision:z.union([z.string().min(1).max(300),z.number().int().nonnegative()])}).strict()).max(30),
  locale:z.enum(locales),confirmedAt:stamp,
  consent:z.object({purpose:z.literal(PURPOSE),confirmedAt:stamp}).strict()
 }).strict()
}).strict();
export type ExternalDirection=z.infer<typeof externalSchema>;
export const ackSchema=z.object({status:z.literal('accepted'),requestId:id,directionId:id,revision:z.number().int().positive(),acceptedAt:stamp}).strict();
export type Ack=z.infer<typeof ackSchema>;
/** Call only after trusted acceptance; matching fields alone do NOT authenticate a sender. */
export const buildAck=(e:ExternalDirection,acceptedAt:string):Ack=>({status:'accepted',requestId:e.requestId,directionId:e.direction.id,revision:e.direction.revision,acceptedAt});
export function isLinked(e:ExternalDirection,ack:unknown){
 const r=ackSchema.safeParse(ack);
 return r.success&&r.data.requestId===e.requestId&&r.data.directionId===e.direction.id&&r.data.revision===e.direction.revision;
}
export const sourceOf=(raw:unknown)=>typeof raw==='object'&&raw&&'sourceLab' in raw?String(raw.sourceLab):'';
/** Raw validity is independent of recommendation readiness. No fabricated missing values. */
export const youthReadiness=(e:ExternalDirection)=>({
 hasConfirmedFocus:!!e.direction.focus.text.trim(),
 hasStrengths:e.direction.strengths.some(x=>!!x.text.trim()),
 hasInterests:e.direction.interests.some(x=>!!x.text.trim()),
 needsAccountStage:e.direction.educationStage==='unspecified',
 needsTrustedContext:true as const
});
export function inspectYouthHandoff(raw:unknown){
 const r=externalSchema.safeParse(raw);
 return r.success?{status:'connection_pending' as const,handoff:r.data,readiness:youthReadiness(r.data)}
  :{status:'invalid' as const,paths:r.error.issues.map(i=>i.path.join('.'))};
}
/** Stage comes from trusted account context; the complete sender body is retained separately. */
export function toInternal(e:ExternalDirection,stage:string):Handoff{
 if(stage!=='middle'&&stage!=='high'&&stage!=='adult')throw new Error('stage');
 const d=e.direction;
 return {schema:'nuvia-lab-handoff/v1',handoffId:e.requestId,version:d.revision,sourceLab:'youth-career',
  confirmedAt:d.confirmedAt,stage,strengths:d.strengths.map(x=>x.text),interests:d.interests.map(x=>x.text),
  direction:{id:d.id,name:d.focus.text},directionChange:d.action};
}
