import type { CareerExperience } from '@workspace/api-client-react';
import { REVIEW_OPTIONS } from './review-demo-fixture';
import { REVIEW_ROLES } from './review-everyday-model';
import { editStoryboard, emptyStoryboard, sourceRevision, type StoryboardDraft } from './storyboard';
import type { ExpMeta } from './provenance';

export const REVIEW_START_KEY = 'review:started';
export const REVIEW_SELECTION_KEY = 'review:selection';
export const REVIEW_APPLIED_KEY = 'review:applied';
export const REVIEW_RESUME_KEY = 'review:adult-resume:v1';
export function reviewResumePath(path: unknown): string | null {
  if (typeof path !== 'string') return null;
  if (['/report','/lab','/activity','/worksheet','/planner','/planner/daily','/storyboard'].includes(path)) return path;
  return /^\/planner\/(?:card|daily)\/review-card-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(path) ? path : null;
}
export type ReviewSelection = { option: string; approved: boolean };

export function reviewOption(id: unknown) {
  const legacy = REVIEW_OPTIONS.find((option) => option.id === id);
  if (legacy) return legacy;
  const role = REVIEW_ROLES.find(item=>item.id===id);
  return role && { id:role.id, company:role.company, job:role.job, keyword:role.needs[0].keyword, reason:role.needs[0].reason };
}

export function bindReviewStoryboard(
  current: StoryboardDraft | null,
  selection: ReviewSelection | null,
  applied: string | null,
  record: CareerExperience,
  meta: ExpMeta,
): StoryboardDraft | null {
  const option = reviewOption(selection?.option);
  if (!option || !selection?.approved || !record.confirmed || record.source !== 'example' ||
    meta.nature !== 'simulation' || !meta.synthetic) return null;
  const revision = sourceRevision(record, { meta, syntheticStatus: null });
  if (current?.experienceId === record.id && current.sourceRevision === revision && applied === option.id) return current;
  const sameRecord = current?.experienceId === record.id && applied === option.id;
  // A reviewed selection changes the context, not any student text or versions.
  return editStoryboard(current ?? emptyStoryboard(), {
    experienceId: record.id, sourceRevision: revision,
    ...(sameRecord ? {} : { company: option.company, job: option.job, keyword: option.keyword, applicationId: undefined }),
  });
}
