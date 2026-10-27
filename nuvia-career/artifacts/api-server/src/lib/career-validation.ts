import type { CareerState } from "@workspace/api-zod";
import { commonCriteria } from "./career-data";
import { officialNcsCriteria } from "./career-ncs";

export class CareerValidationError extends Error {}

// Source trust is established only by a future authenticated server connector,
// never by a client-provided badge or URL.
export function validateCareerState(state: CareerState): void {
  if (state.report !== null) throw new CareerValidationError("REPORT_CONNECTOR_REQUIRED");
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
