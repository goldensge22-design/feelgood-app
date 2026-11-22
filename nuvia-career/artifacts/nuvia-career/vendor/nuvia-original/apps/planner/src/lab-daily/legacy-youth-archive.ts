import {z} from 'zod/v3';
/** Backup-reading ONLY. Earlier invented demo body was not sender compatible.
 * Never route incoming LAB data through this schema, nor claim this archive as verified. */
const id=z.string().min(1).max(160),stamp=z.string().datetime(),text=z.string().min(1).max(80),item=z.object({id,text}).strict();
export const legacyYouthArchiveSchema=z.object({
 schema:z.literal('daily-exploration-direction/1'),source:z.literal('youth-career'),requestId:id,
 direction:z.object({id,revision:z.number().int().positive(),change:z.enum(['add','switch']),educationStage:z.enum(['middle','high','unspecified']).optional()}).strict(),
 focus:z.object({id,text,kind:z.string().min(1).max(40)}).strict(),strengths:z.array(item).min(1).max(5),interests:z.array(item).min(1).max(5),
 sourceRefs:z.array(z.object({kind:z.string().min(1).max(40),id,version:z.string().min(1).max(40)}).strict()).min(1).max(10),
 locale:z.string(),confirmedAt:stamp,consent:z.object({purpose:z.literal('planner-daily-suggestions'),at:stamp}).strict()
}).strict();
