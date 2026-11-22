import {z} from 'zod/v3';
const text=z.string().max(3000),id=z.string().min(1).max(200),stamp=z.string().datetime();
export const fieldsSchema=z.object({
 action:text,result:text,next:text,link:z.string().max(2000),
 evidence:text,help:text,role:text,kind:z.enum(['unspecified','actual','simulation']),selfConfirmed:z.boolean()
}).strict();
export type SummaryFields=z.infer<typeof fieldsSchema>;
export const revisionSchema=z.object({version:z.number().int().min(1),at:stamp,fields:fieldsSchema}).strict();
export type SummaryRevision=z.infer<typeof revisionSchema>;
export const summarySchema=z.object({
 runId:id,cardId:id,workspaceId:id,studentId:id,createdAt:stamp,draftAt:stamp,draft:fieldsSchema,
 saved:revisionSchema.optional(),history:z.array(revisionSchema).max(2000)
}).strict();
export type ExecutionSummary=z.infer<typeof summarySchema>;
export const summariesSchema=z.record(z.string(),summarySchema);
export const refsSchema=z.array(z.object({runId:id,version:z.number().int().min(1)}).strict()).max(100);
export type SummaryRef=z.infer<typeof refsSchema>[number];
export type SummaryAction=
 |{type:'summary.draft';runId:string;fields:SummaryFields}
 |{type:'summary.save';runId:string}
 |{type:'summary.cite';experienceId:string;runIds:string[]};
export const blankSummary=(next=''):SummaryFields=>({action:'',result:'',next,link:'',evidence:'',help:'',role:'',kind:'unspecified',selfConfirmed:false});
export const validSummaryLink=(v:string)=>!v||/^https?:\/\//i.test(v)&&(()=>{try{return !!new URL(v).hostname;}catch{return false;}})();
