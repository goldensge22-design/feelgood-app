import {z} from "zod";
export const cardPlanSchema=z.object({
  title:z.string().min(1).max(500).refine(s=>s.trim().length>0),
  goal:z.string().min(1).max(8000).refine(s=>s.trim().length>0),
  steps:z.string().min(1).max(10000).refine(s=>s.trim().length>0),
  targetCapability:z.string().min(1).max(4000).refine(s=>s.trim().length>0),
  successCriteria:z.string().min(1).max(8000).refine(s=>s.trim().length>0),
  artifactPlan:z.string().min(1).max(4000).refine(s=>s.trim().length>0),
  date:z.string().refine(s=>s===""||(/^\d{4}-\d{2}-\d{2}$/.test(s)&&
    !Number.isNaN(Date.parse(s+"T00:00:00Z"))&&new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s)),
  status:z.literal("planned"),
}).strict();
export type CardPlan=z.infer<typeof cardPlanSchema>;
export const cardPlannerPreviewSchema=z.object({cardId:z.string().min(1).max(100),plan:cardPlanSchema}).strict();
export const cardPlannerSubmitSchema=cardPlannerPreviewSchema.extend({
  requestId:z.string().uuid(),previewHash:z.string().regex(/^[a-f0-9]{64}$/),accepted:z.literal(true),
  newVersionApproved:z.boolean().default(false),
}).strict();
export const cardPlannerRetrySchema=z.object({requestId:z.string().uuid()}).strict();
export type CardDisclosure={historyStatus:"recorded"|"legacy_unknown";revision:number;opened:{branch:"A"|"B"|"custom";at:string}[]};
export type CardPlannerReceipt={
  protocol:"scenario-planner-receipt/1.0"|"selected-decision-receipt/1.0";mode:"isolated_demo"|"verified_service";
  requestId:string;payloadHash:string;cardId:string;contentVersion:string;
  subjectBinding:string;nonce:string;activityId:string;accepted:true;issuedAt:string;signature:string;
  decisionBinding?:{
    contract:"selected-decision-binding/1.0";attemptId:string;cardId:string;contentVersion:string;localizedVersion:string;
    selectionContextHash:string;approvedSourceRevision:number;attemptState:"planned";
  };
};
export const cardPlannerReceiptSchema=z.object({
  protocol:z.literal("scenario-planner-receipt/1.0"),mode:z.enum(["isolated_demo","verified_service"]),
  requestId:z.string().uuid(),payloadHash:z.string().regex(/^[a-f0-9]{64}$/),cardId:z.string(),contentVersion:z.string(),
  subjectBinding:z.string(),nonce:z.string().uuid(),activityId:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  accepted:z.literal(true),issuedAt:z.string().datetime(),signature:z.string().min(20).max(1000),
}).strict();
export const selectedDecisionReceiptSchema=cardPlannerReceiptSchema.extend({
  protocol:z.literal("selected-decision-receipt/1.0"),
  decisionBinding:z.object({
    contract:z.literal("selected-decision-binding/1.0"),attemptId:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
    cardId:z.string(),contentVersion:z.string(),localizedVersion:z.string(),
    selectionContextHash:z.string().regex(/^[a-f0-9]{64}$/),approvedSourceRevision:z.number().int().positive(),
    attemptState:z.literal("planned"),
  }).strict(),
}).strict();
export type CardPlannerView={
  id:string;cardId:string;contentVersion:string;lineageId:string;requestId:string;
  state:"waiting_connection"|"waiting_exploration"|"sending"|"retryable"|"registered"|"demo_registered"|"revoked";
  plan:CardPlan;sourceTitle:string;sourceLanguage:string;sourceRevision:number;
  disclosure:CardDisclosure;consented:boolean;attempts:number;reason:string|null;
  receipt:CardPlannerReceipt|null;taskUrl:string|null;taskLinkStatus:"unconfigured"|"unverified"|"ready";createdAt:string;updatedAt:string;
};
export type CardPlannerPreview={
  cognitiveStrategies?:("planning"|"attention"|"simultaneous"|"sequential")[];
  selectionContext?:import("./timed-decision").DecisionSelectionContext;
  previewHash:string;connection:"unconfigured"|"isolated_demo"|"verified_service";
  displayProjection:{projectionVersion:"scenario-display/1.0";originalCardId:string;originalContentVersion:string;
    card:import("./scenario-model").ScenarioCardDocument};disclosure:CardDisclosure;
  requiresExploration:boolean;
  plan:CardPlan;exploration:{id:string;revision:string|number}|null;
  priorVersions:CardPlannerView[];
};
export type CardPlannerList={connection:CardPlannerPreview["connection"];registrations:CardPlannerView[]};
export function canOpenPlannerTask(r:CardPlannerView){
  if(r.state!=="registered"||r.receipt?.mode!=="verified_service"||r.taskLinkStatus!=="ready"||!r.taskUrl)return false;
  return /^https:\/\/[^/?#@\s]+\/[^?#\s]*$/.test(r.taskUrl)&&z.string().url().safeParse(r.taskUrl).success;
}
