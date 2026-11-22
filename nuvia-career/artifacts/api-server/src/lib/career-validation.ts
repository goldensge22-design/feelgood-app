import type { CareerState } from "@workspace/api-zod";
import { commonCriteria } from "./career-data";
import { officialNcsCriteria } from "./career-ncs";

export class CareerValidationError extends Error {}

// Source trust is established only by a future authenticated server connector,
// never by a client-provided badge or URL.
export function validateCareerState(state: CareerState): void {
  if (state.report !== null) throw new CareerValidationError("REPORT_CONNECTOR_REQUIRED");
  const integrated = state.integrated;
  for(const source of [integrated?.companySource,...(integrated?.recoveredCompanySources??[])])
    if (source && (!safeSourceUrl(source.url) || !source.keyword.trim() || !Number.isFinite(Date.parse(source.observedAt))))
      throw new CareerValidationError("INVALID_SOURCE_URL");
  for(const raw of [integrated?.youthLab,integrated?.youthLabRecovery]){
    if(raw===undefined)continue;
    try{
      const value=JSON.parse(raw);
      if(value?.v!==1||!Array.isArray(value.tests)||value.tests.length>1||
        value.tests.some((entry:{name?:string;date?:string;results?:string;features?:string;inputMethod?:string;strengths?:{kind?:string}[]})=>
          entry.name!==''||entry.date!==''||entry.results!==''||entry.features!==''||entry.inputMethod!=='manual'||
          !Array.isArray(entry.strengths)||entry.strengths.some(x=>x.kind!=='self'))||
        !Array.isArray(value.activities)||!Array.isArray(value.reflections)||!Array.isArray(value.story?.versions))
        throw Error('INVALID_YOUTH_LAB_DRAFT');
    }catch{throw new CareerValidationError("INVALID_YOUTH_LAB_DRAFT");}
  }
  const handoffIds=new Set<string>();
  for(const item of integrated?.labHandoffs??[]){
    if(handoffIds.has(item.id)||!item.title.trim()||!item.excerpt.trim()||
        !Number.isFinite(Date.parse(item.approvedAt))||
        (item.revokedAt&&!Number.isFinite(Date.parse(item.revokedAt)))||
        (item.url&&!safeSourceUrl(item.url)))
      throw new CareerValidationError("INVALID_LAB_HANDOFF");
    if(item.sourceSnapshot){
      try{
        const card=JSON.parse(item.sourceSnapshot);
        if(item.audience!=='adult'||item.purpose!=='simulation'||
          item.sourceId!==`scenario:${card.commonCardId}`||item.sourceVersion!==card.contentVersion||
          typeof card.id!=='string'||!Array.isArray(card.sections)||!Array.isArray(card.officialFacts)||
          card.officialFacts.some((fact:{url?:string})=>!fact.url||!safeSourceUrl(fact.url)))
          throw Error("INVALID_LAB_SCENARIO");
      }catch{throw new CareerValidationError("INVALID_LAB_SCENARIO");}
    }
    handoffIds.add(item.id);
  }
  for (const raw of [integrated?.planner, integrated?.plannerRecovery]) {
    if (raw === undefined) continue;
    try {
      const studio = JSON.parse(raw);
      if (studio.schema !== "nuvia-personal-monthly-1" || studio.mode !== "personal" ||
          studio.studentId !== "student-a" || typeof studio.workspaceId !== "string" ||
          !studio.lab?.students?.["student-a"] ||
          Object.values(studio.lab.students).some((learner) => !!(learner as {assessment?:unknown})?.assessment) ||
          !Array.isArray(studio.assessmentHistory) ||
          studio.assessmentHistory.length !== 0 || studio.insights?.currentAssessment)
        throw new Error("not an unlinked personal planner");
    } catch { throw new CareerValidationError("INVALID_ACCOUNT_PLANNER"); }
  }
  for (const collection of [state.experiences, state.activities, state.applications, state.criteria]) {
    if (collection.some((x) => !x.id.trim()))
      throw new CareerValidationError("EMPTY_ID");
    if (new Set(collection.map((x) => x.id)).size !== collection.length)
      throw new CareerValidationError("DUPLICATE_ID");
  }
  const criterionIds = new Set(state.criteria.map((x) => x.id));
  const experienceIds = new Set(state.experiences.map((x) => x.id));
  const activityIds = new Set(state.activities.map((x) => x.id));
  const sources = new Set<string>();
  for (const criterion of state.criteria) {
    if (criterion.sourceType === "common_example") {
      const original = commonCriteria.find((x) => x.id === criterion.id);
      if (!original || JSON.stringify(original) !== JSON.stringify(criterion))
        throw new CareerValidationError("UNVERIFIED_CRITERION");
    } else if (criterion.sourceType === "official_ncs") {
      const verified = officialNcsCriteria.find((x) => x.id === criterion.id);
      if (!verified) throw new CareerValidationError("SOURCE_CONNECTOR_REQUIRED");
      if (JSON.stringify(verified) !== JSON.stringify(criterion))
        throw new CareerValidationError("UNVERIFIED_CRITERION");
    } else if (criterion.sourceType !== "job_posting") {
      throw new CareerValidationError("SOURCE_CONNECTOR_REQUIRED");
    }
    if (criterion.sourceUrl) {
      const url = safeSourceUrl(criterion.sourceUrl);
      if (!url) throw new CareerValidationError("INVALID_SOURCE_URL");
    }
  }
  for (const experience of state.experiences) {
    if (!["manual", "local_activity"].includes(experience.source))
      throw new CareerValidationError("SOURCE_CONNECTOR_REQUIRED");
    if (experience.source === "local_activity") {
      if (!experience.sourceId || (!activityIds.has(experience.sourceId) && experience.permissionStatus !== "deleted"))
        throw new CareerValidationError("MISSING_LOCAL_SOURCE");
      if (sources.has(experience.sourceId)) throw new CareerValidationError("DUPLICATE_IMPORT");
      sources.add(experience.sourceId);
    }
    if (experience.sourceUrl) throw new CareerValidationError("SOURCE_CONNECTOR_REQUIRED");
    if (experience.criterionIds.some((id) => !criterionIds.has(id)))
      throw new CareerValidationError("MISSING_CRITERION");
  }
  for (const activity of state.activities) {
    if (activity.date && !/^\d{4}-\d{2}-\d{2}$/.test(activity.date))
      throw new CareerValidationError("INVALID_DATE");
    if (activity.criterionId && !criterionIds.has(activity.criterionId))
      throw new CareerValidationError("MISSING_CRITERION");
  }
  for (const application of state.applications) {
    if (application.experienceIds.some((id) => !experienceIds.has(id)))
      throw new CareerValidationError("MISSING_EXPERIENCE");
    if (application.criterionIds.some((id) => !criterionIds.has(id)))
      throw new CareerValidationError("MISSING_CRITERION");
  }
  for (const id of [integrated?.adultStoryId, integrated?.youthStoryId]) {
    if (id && !state.applications.some((a) => a.id === id))
      throw new CareerValidationError("MISSING_STORY_DRAFT");
  }
}

export function safeSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

export function characterCount(text: string, countSpaces: boolean): number {
  return Array.from(countSpaces ? text : text.replace(/\s/gu, "")).length;
}
