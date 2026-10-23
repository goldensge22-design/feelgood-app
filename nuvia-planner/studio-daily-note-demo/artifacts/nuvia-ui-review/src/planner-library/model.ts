import {z} from 'zod';
import type {TaskInput} from '../studio/task-plan';
export const LIBRARY_COMMIT='9cb4ef7e0a294b035713b36db956144837fc8741';
const id=z.string().min(1).max(200),text=z.string().max(3000);
export const attachmentSchema=z.object({
 schema:z.literal('nuvia-library-attachment/v1'),taskId:id,bindingId:id,templateId:id,
 templateVersion:z.string(),catalogCommit:z.literal(LIBRARY_COMMIT),contentLocale:z.literal('ko'),
 kind:z.enum(['daily','job-simulation']),reviewOnly:z.literal(true),attachedAt:z.string().datetime(),
 answers:z.array(text).length(3),revision:z.number().int().min(1),updatedAt:z.string().datetime(),
 confirmedRunId:z.string(),confirmedAt:z.string(),
 history:z.array(z.object({at:z.string().datetime(),answers:z.array(text).length(3),revision:z.number().int().min(1)}).strict()).max(1000)
}).strict();
export type Attachment=z.infer<typeof attachmentSchema>;
export type LibraryAction=
 |{type:'library.attach';cardId:string;bindingId:string;templateId:string}
 |{type:'library.create';task:TaskInput;bindingId:string;templateId:string}
 |{type:'library.answers';cardId:string;answers:string[]}
 |{type:'library.confirm';cardId:string};
