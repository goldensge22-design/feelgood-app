import {z} from "zod";

export const TIMED_DECISION_CONTRACT="timed-decision-card/1.3" as const;
export const TIMED_DECISION_POLICY="2026-11-12.10" as const;
const text=z.string().min(1).refine(v=>v.trim().length>0);
export const timedDecisionSchema=z.object({
  contract:z.enum(["timed-decision-card/1.2",TIMED_DECISION_CONTRACT]),policy:z.enum(["2026-11-12.9",TIMED_DECISION_POLICY]),
  libraryVersion:z.literal("competency-2026-11-12.4"),
  caseId:text,profileId:text,language:z.enum(["ko","en","ja","zh-CN","zh-TW","mn","th","vi","ar","ru","km","es","fr","it","az"]),
  difficulty:z.enum(["introductory","standard","advanced"]),
  fictional:z.literal(true),expertValidated:z.literal(false),
  jobConnection:text,everydayTransfer:text,creationBoundary:text,
  mainConflict:text,secondaryConflict:text,
  authority:text,collaborators:z.array(z.object({role:text,responsibility:text}).strict()).min(2),
  conditions:z.array(z.object({
    id:text,kind:z.enum(["mandatory","preference","assumption","unknown"]),text,
    documentIds:z.array(text).min(1),
  }).strict()).min(3).max(5),
  documents:z.array(z.object({id:text,author:text,title:text,text}).strict()).min(2),
  alternatives:z.array(z.object({id:text,text,benefit:text,loss:text,conditionIds:z.array(text).min(2)}).strict()).min(2).max(3),
  safeBeforeReply:z.array(text).min(1),
  assumptions:z.array(text).min(1),
  coordinationSteps:z.array(text).min(1),
  cognitiveSupport:z.array(z.object({
    key:z.enum(["planning","attention","simultaneous","sequential"]),label:text,prompt:text,optional:z.literal(true),
    sameTask:z.literal(true),scoreForced:z.literal(false),
  }).strict()).optional(),
  optionalRecords:z.array(z.object({
    key:z.enum(["freeMemo","feeling","difficulty","nextAttempt"]),label:text,value:z.literal(""),
    optional:z.literal(true),blankAllowed:z.literal(true),negativeAllowed:z.literal(true),
    autoShareStar:z.literal(false),autoShareCompany:z.literal(false),storageOwner:z.literal("planner"),
  }).strict()).optional(),
  executionRequirements:z.object({
    contract:z.literal("timed-decision-execution/1.0"),firstJudgmentPreserved:z.literal(true),
    elapsedOwner:z.literal("planner_server"),revealAfterSavedJudgment:z.literal(true),
    oneRevealPerAttempt:z.literal(true),consentedRevisionOnly:z.literal(true),
  }).strict().optional(),
  writingFields:z.array(z.object({key:text,label:text,value:z.literal("")}).strict()).min(10),
  recommendedMinutes:z.literal(20),
  phases:z.tuple([
    z.object({key:z.literal("read"),minutes:z.literal(4)}).strict(),
    z.object({key:z.literal("compare"),minutes:z.literal(6)}).strict(),
    z.object({key:z.literal("change"),minutes:z.literal(6)}).strict(),
    z.object({key:z.literal("check"),minutes:z.literal(4)}).strict(),
  ]),
  timerOwner:z.literal("planner"),
  disclosureOwner:z.literal("planner"),changeLimit:z.literal(1),
  // Full source is server-only. Student projections must have these fields absent,
  // not merely hidden in the DOM. This schema describes the preserved original.
  sealedChange:z.object({information:text,question:text,conditionIds:z.array(text).min(2)}).strict().optional(),
  evaluatorNotes:z.array(text).min(1).optional(),
  comparisonHelp:z.array(text),
  sourceEvidence:z.array(z.object({id:text,sourceId:text,title:text,url:text,locator:text,scope:text,excerpt:text}).strict()).min(1),
  quality:z.object({
    contract:z.literal("timed-decision-quality/1.0"),
    status:z.enum(["reviewed_educational_case","basic_check_only"]),
    shortcutAttempt:text.optional(),shortcutFinding:text.optional(),counterexample:text.optional(),counterexampleFinding:text.optional(),
    sameDecisionAllowed:z.literal(true),expertValidated:z.literal(false),
  }).strict(),
}).strict();
export type TimedDecision=z.infer<typeof timedDecisionSchema>;
export type TimedDecisionDifficulty=TimedDecision["difficulty"];

/** Fail closed for old AI/cache outputs. A verified_ai label is not this contract. */
export function validateTimedDecisionCandidate(value:unknown){
  const card=timedDecisionSchema.parse(value);
  if(card.contract===TIMED_DECISION_CONTRACT&&(
    card.policy!==TIMED_DECISION_POLICY||card.cognitiveSupport?.length!==4||card.optionalRecords?.length!==4||!card.executionRequirements))
    throw new Error("decision_1_3_context_support_and_optional_records_required");
  if(!card.quality.shortcutAttempt||!card.quality.shortcutFinding||!card.quality.counterexample||!card.quality.counterexampleFinding)
    throw new Error("full_source_quality_review_required");
  const ids=new Set(card.conditions.map(c=>c.id)),docs=new Set(card.documents.map(d=>d.id));
  if(ids.size!==card.conditions.length||docs.size!==card.documents.length)throw new Error("duplicate_condition_or_document");
  if(card.conditions.some(c=>c.documentIds.some(id=>!docs.has(id))))throw new Error("missing_condition_document");
  if(card.alternatives.some(a=>new Set(a.conditionIds).size<2||a.conditionIds.some(id=>!ids.has(id))))throw new Error("insufficient_compared_conditions");
  if(!card.sealedChange||card.sealedChange.conditionIds.some(id=>!ids.has(id)))throw new Error("missing_prior_change_criteria");
  if(card.difficulty==="introductory"&&(card.conditions.length!==3||card.alternatives.length!==2||!card.comparisonHelp.length))throw new Error("introductory_support_required");
  if(card.difficulty==="advanced"&&card.collaborators.length<3)throw new Error("advanced_dependency_required");
  if(!card.conditions.some(c=>c.kind==="mandatory")||!card.conditions.some(c=>c.kind==="unknown"))throw new Error("condition_kinds_required");
  return card;
}

/** Private selection context is outside the public task/cache. Preserve raw TOP5;
 * never derive an occupation or a score from it. */
export const decisionSelectionContextSchema=z.object({
  contract:z.literal("lab-selection-context/1.0"),
  resultsState:z.enum(["available","not_connected"]),
  report:z.object({testName:z.string(),version:z.string(),testDate:z.string()}).strict().nullable(),
  top5:z.array(z.object({rank:z.number().int().min(1).max(5),rawName:z.string(),original:z.record(z.unknown())}).strict()).max(5),
  selectedCompany:z.object({id:text,name:text}).strict().nullable(),
  selectedJob:z.object({id:text,name:text}).strict().nullable(),
  selectedProfileId:text,selectionSource:z.literal("explicit_student_choice"),
  recommendedNotScheduled:z.literal(true),
}).strict();
export type DecisionSelectionContext=z.infer<typeof decisionSelectionContextSchema>;
