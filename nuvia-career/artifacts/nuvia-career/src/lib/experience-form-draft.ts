import type { CareerExperience } from '@workspace/api-client-react';
import type { StarStoryValues } from './star-story';
import type { ExperienceContext } from './provenance';
import { clientStorage } from './public-demo';

export interface ExperienceFormDraft {
  experience: CareerExperience;
  star: StarStoryValues;
  context: ExperienceContext;
  baseSource: string | null;
  submitted?: boolean;
}
const keyOf = (owner: string, slot: string) =>
  `nuvia:experience-form:v1:${encodeURIComponent(owner)}:${encodeURIComponent(slot)}`;
// Last resort for same-document navigation when both browser stores reject writes.
// A full reload still needs browser storage; the editor warns before that navigation.
const volatileRecovery = new Map<string, string>();
function parse(raw: string | null): ExperienceFormDraft | null {
  try {
    const value = JSON.parse(raw ?? 'null');
    return value && typeof value.experience?.id === 'string' &&
      ['title', 'action', 'result', 'learning'].every(k => typeof value.experience[k] === 'string') &&
      Array.isArray(value.experience.strengths) && Array.isArray(value.experience.criterionIds) &&
      value.star && typeof value.star === 'object' && typeof value.context === 'string' &&
      (value.baseSource === null || typeof value.baseSource === 'string') ? value : null;
  } catch { return null; }
}
export function readExperienceForm(owner: string, slot: string) {
  const key = keyOf(owner, slot);
  try {
    const target = clientStorage(key);
    const raw = target.storage.getItem(target.key);
    const recovery = volatileRecovery.get(key) ?? window.sessionStorage.getItem(`${key}:recovery`);
    return { draft: parse(recovery) ?? parse(raw), raw, recovery: !!parse(recovery) };
  } catch { return { draft: parse(volatileRecovery.get(key) ?? null), raw: null, recovery: !!volatileRecovery.get(key) }; }
}
/** Synchronous on each edit: no debounce/unmount gap. Never overwrite a newer tab. */
export function writeExperienceForm(owner: string, slot: string, draft: ExperienceFormDraft, expected: string | null) {
  const key = keyOf(owner, slot);
  const raw = JSON.stringify(draft);
  let conflict = false;
  try {
    const target = clientStorage(key);
    conflict = target.storage.getItem(target.key) !== expected;
    if (conflict) throw new Error('draft_conflict');
    target.storage.setItem(target.key, raw);
    volatileRecovery.delete(key);
    window.sessionStorage.removeItem(`${key}:recovery`);
    return { ok: true, raw, conflict: false, recovered: false };
  } catch {
    volatileRecovery.set(key, raw);
    let recovered = false;
    try { window.sessionStorage.setItem(`${key}:recovery`, raw); recovered = true; } catch { /* do not report saved */ }
    return { ok: false, raw: expected, conflict, recovered };
  }
}
export function clearExperienceForm(owner: string, slot: string, expected: string | null) {
  const key = keyOf(owner, slot);
  volatileRecovery.delete(key);
  try {
    const target = clientStorage(key);
    if (target.storage.getItem(target.key) === expected) target.storage.removeItem(target.key);
    window.sessionStorage.removeItem(`${key}:recovery`);
  } catch { /* retained drafts are safer than premature deletion */ }
}
