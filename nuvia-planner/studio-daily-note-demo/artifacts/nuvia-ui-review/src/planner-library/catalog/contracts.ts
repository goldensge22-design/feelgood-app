/** Design contract only. Does not replace an existing report, Card, Run or DB schema. */
export type Locale = 'ko'|'en'|'ja'|'zh-CN'|'zh-TW'|'mn'|'th'|'vi'|'ar'|'ru'|'km'|'es'|'fr'|'it'|'az';
export type Behavior = 'sequence'|'adapt'|'verify'|'compare'|'communicate'|'resume';
export type PracticeKind = 'daily'|'job-simulation';
export type ReviewStatus = 'draft'|'in-review'|'approved'|'retired';
export type Ref = {id:string;version:string};
export type OfficialJobBinding = {
  sourceJob: {id:string;sourceVersion:string;sourceUri:string;population:'adult'|'teen'};
  contextId:string;
  behaviorIds:Behavior[];
  status:'unmapped'|'draft'|'reviewed'|'retired';
  reviewedBy:string|null;
  reviewedAt:string|null;
  sourceRefs:string[];
};
/** IDs in seed job-contexts.json are NOT official occupation codes. */
export type SharedTemplate = {
  id:string;version:string;kind:PracticeKind;behaviorId:Behavior;contextId:string|null;
  audiences:('middle'|'high'|'university-adult')[];
  status:ReviewStatus;visibility:'internal-design'|'public';
  risk:'general'|'safety-sensitive';
  source:{
    kind:'authored-design-example'|'reviewed-editorial'|'reviewed-ai-adaptation';
    officialReferences:{uri:string;version:string;jurisdiction:string;effectiveAt:string}[];
    reviewedBy:string|null;reviewedAt:string|null;reviewDueAt:string|null;
  };
  text:{titleKey:string;scenarioKey:string;goalKey:string;promptKeys:string[];
    exampleKey:string;completionKey:string;noticeKey:string};
  evidenceFields:string[];
  personalization:'existing-pass-adapter-not-behavior-equals-pass';
  completion:'user-confirmed-action-evidence-not-timer';
  countsAsRealWorkExperience:false;
};
/** Private store: never serialize into the public library or commit to Git. */
export type ActivityAttachment = {
  schema:'feelgood.planner-activity-attachment/v1';
  tenantId:string;ownerId:string;
  id:string;revision:number;idempotencyKey:string;
  plannerTaskRef:Ref;
  templateRef:Ref|null;templateSnapshot:SharedTemplate|null;
  origin:'shared-library'|'user-authored'|'ai-private';
  practiceKind:PracticeKind;behaviorId:Behavior;
  reportRef:Ref|null;jobBindingRef:Ref|null;
  assessmentSourceSnapshotRef:Ref|null;
  practiceId:string;roundId:string;
  passTarget:'planning'|'attention'|'simultaneous'|'successive'|'integrated';
  helpChoice:string;helpVersion:string;
  evidenceState:'unconfirmed'|'performed'|'skipped'|'not-applicable';
  notApplicableScope:'attention-conditional-action'|null;
  fields:{goal:string;method:string;firstAction:string;conditions:string;alternative:string;reflection:string};
};
/** Preserve external Sequential alias in adapter; do not rename source payload fields. */
export type RoadmapEvidence = {
  schema:'feelgood.planner-roadmap-evidence/v1';
  id:string;version:number;ownerId:string;tenantId:string;
  attachmentRef:Ref;taskRef:Ref;runRef:Ref;templateRef:Ref|null;
  practiceKind:PracticeKind;
  experienceContext:'real-life'|'simulation';
  fields:Partial<Record<'context'|'difficulty'|'action'|'adjustment'|'result'|'learning',string>>;
  selectedFields:string[];
  confirmation:{at:string;byUser:true;sourceVersions:Ref[]}|null;
  verification:'user-confirmed-only'|'external-confirmed';
  externalVerificationRef:Ref|null;
  revokedAt:string|null;
};
/** These are proposed server operations, not existing endpoints. */
export interface PlannerLibraryAdapter {
  listApproved(input:{locale:Locale;audience:string;contextId?:string;behaviorId?:Behavior}):Promise<SharedTemplate[]>;
  getApprovedVersion(input:{id:string;version:string;locale:Locale}):Promise<SharedTemplate|null>;
  savePrivateAttachment(input:ActivityAttachment):Promise<Ref>;
  requestPrivateGeneration(input:{
    idempotencyKey:string;locale:Locale;audience:string;behaviorId:Behavior;
    sanitizedContext:string;confirmedForAi:true;budgetPolicyId:string;
  }):Promise<Ref>;
  submitSanitizedCandidate(input:{
    privateTemplateRef:Ref;explicitShareConsentRef:Ref;redactionReviewRef:Ref;
  }):Promise<Ref>;
}
/** Implementations must authorize tenant/owner on every read/write/export.
 * listApproved must never return private, retired, untranslated or expired safety cards.
 * Shared publication requires a separate authenticated reviewer, never a client flag.
 * Completion and timer events do not authorize résumé export or AI text generation.
 */
