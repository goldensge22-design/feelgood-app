/**
 * Handoff boundary for a future authenticated central implementation.
 * There is intentionally no URL, network client, device-owner override or research uploader here.
 */
export type SourceRevision={id:string;version:string;origin:'assessment'|'top5'|'planner'|'lab'|'storyboard'|'user'};
export type CentralAssessmentReference={
  report:SourceRevision; interpretation:SourceRevision; top5?:SourceRevision;
};
export type ReviewRecordOrigin='self-reported-action'|'imagined-situation'|'synthetic-example'|'ai-proposal'|'user-confirmed-writing';
export type ResearchChoice={
  purpose:'assessment-refinement-research'; policyVersion:string; pseudonym:string;
  state:'not-selected'|'granted'|'withdrawn'; clientAt:string; serverReceivedAt?:string;
};
export type CentralMutation = {
  schema:1; eventId:string; entity:{kind:'card'|'worksheet'|'free-note'|'storyboard'|'lab-preference'|'lab-search'|'navigation'|'consent';id:string};
  expectedRevision:number; activity:string; occurredAtDevice:string;
  sourceRevisions:readonly SourceRevision[]; assessment?:CentralAssessmentReference;
  origin:ReviewRecordOrigin; purpose:'personal-service-storage';
  change:Readonly<Record<string,unknown>>;
};
export type CentralReceipt =
  | {status:'stored'|'duplicate';eventId:string;revision:number;receivedAtServer:string}
  | {status:'conflict';eventId:string;serverRevision:number}
  | {status:'failed'|'forbidden';eventId:string;retryable:boolean};
export type CentralReviewPersistence = {
  /** Session identity and resource ownership must be checked on every server operation. */
  append(event:CentralMutation):Promise<CentralReceipt>;
  read(entity:CentralMutation['entity']):Promise<{revision:number;value:unknown}|null>;
};
export const CENTRAL_REVIEW_CONNECTION = {
  state:'not-connected', verifiedAccountStorage:false, transmitsServiceData:false, transmitsResearchData:false,
} as const;
