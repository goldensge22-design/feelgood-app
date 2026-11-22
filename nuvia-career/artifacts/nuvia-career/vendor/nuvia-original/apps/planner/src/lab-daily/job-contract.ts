import {z} from 'zod/v3';

/** JOB snapshot, NEVER a youth single-direction command.
 * Field layout compared with the three user-provided fictional buildContract fixtures.
 * No trimming, defaults, inferred strengths or youth 1..5/80-character coercion. */
export const JOB_VERSION='direction-handoff/1.0';
export const JOB_OWNER='dcas-company-job-lab';
const id=z.string().min(1).max(160),stamp=z.string().datetime(),text=z.string().max(300);
const positive=z.number().int().positive();
export const jobItemSchema=z.discriminatedUnion('source',[
 z.object({text:text.min(1),source:z.literal('student_written')}).strict(),
 z.object({text:text.min(1),source:z.literal('student_confirmed_from_my_top5'),refId:id}).strict(),
 z.object({text:text.min(1),source:z.literal('student_confirmed_from_my_favorites'),refId:id}).strict()
]);
export const jobContentSchema=z.object({
 title:z.string().min(1).max(120),lessonNote:z.string().max(2000),strengths:z.array(jobItemSchema).max(10),
 interests:z.array(jobItemSchema).max(10),directions:z.array(jobItemSchema).max(10),
 language:z.string().min(1).max(60)
}).strict().refine(c=>c.strengths.length+c.interests.length+c.directions.length>0,'At least one confirmed item is required');
// Sender supplies metadata ONLY. No missing historic text is invented.
const priorVersion=z.object({version:positive,savedAt:stamp}).strict();
export const jobDirectionSchema=z.object({
 directionId:id,status:z.enum(['active','previous']),createdVia:z.enum(['first','add','switch']),
 sequence:z.number().int().nonnegative(),version:positive,deduplicationKey:z.string().min(1).max(300),
 studentConfirmed:z.literal(true),content:jobContentSchema,sourceNotice:z.string(),priorVersions:z.array(priorVersion)
}).strict();
export const jobSnapshotSchema=z.object({
 contractVersion:z.literal(JOB_VERSION),ruleVersion:z.string().min(1),ownerProgram:z.literal(JOB_OWNER),requestId:id,generatedAt:stamp,
 delivery:z.object({status:z.literal('not_connected'),externalReceipt:z.null(),adapter:z.literal('not_implemented')}).strict(),
 studentConsent:z.object({plannerLink:z.literal('granted'),changedAt:stamp,scope:z.literal('student_confirmed_directions_only')}).strict(),
 defaultDirectionId:id.nullable(),directions:z.array(jobDirectionSchema),
 excluded:z.array(z.string()),
 importRequirements:z.object({
  verifiedAccountBinding:z.literal(true),campOwnershipCheck:z.literal(true),explicitStudentConsentRecheck:z.literal(true),
  idempotencyFields:z.array(z.string()),note:z.string()
 }).strict()
}).strict().superRefine((s,ctx)=>{
 const ids=s.directions.map(d=>d.directionId);
 if(new Set(ids).size!==ids.length)ctx.addIssue({code:'custom',path:['directions'],message:'Duplicate directionId'});
 if(s.defaultDirectionId!==null&&!s.directions.some(d=>d.directionId===s.defaultDirectionId&&d.status==='active'))
  ctx.addIssue({code:'custom',path:['defaultDirectionId'],message:'Default must reference an active direction'});
 if(s.defaultDirectionId===null&&s.directions.some(d=>d.status==='active'))
  ctx.addIssue({code:'custom',path:['defaultDirectionId'],message:'Active directions require a default'});
});
export type JobSnapshot=z.infer<typeof jobSnapshotSchema>;
export type JobDirection=z.infer<typeof jobDirectionSchema>;
/** Only server-owned confirmation/order/account fields, stored separately from raw sender data. */
export const jobRecordSchema=z.object({
 snapshot:jobSnapshotSchema,serverOrder:positive,confirmedAt:stamp,receivedAt:stamp,
 stage:z.enum(['middle','high','adult']),timeZone:z.string().min(1),
 reviewOnly:z.literal(true)
}).strict();
export type JobRecord=z.infer<typeof jobRecordSchema>;
export const jobHandoffId=(s:JobSnapshot)=>'job:'+s.requestId;
export const isJobCandidate=(raw:unknown)=>!!raw&&typeof raw==='object'&&(
 ('ownerProgram' in raw&&raw.ownerProgram===JOB_OWNER)||('contractVersion' in raw&&raw.contractVersion===JOB_VERSION)
);
