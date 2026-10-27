import type { CareerExperience, CareerState } from '@workspace/api-client-react';
import { uid } from '@/lib/career';
import { setExpMeta, type Sidecar } from '@/lib/provenance';
import { seedInput, type SyntheticSeed } from '@/lib/synthetic-records';
import type { PlannerInput } from '@/lib/provenance';

export type InputField = keyof PlannerInput;
export const ALL_INPUT_FIELDS: InputField[] = ['selectedAction', 'selectionReason', 'changed', 'result', 'learning'];

type Update = (fn: (s: CareerState) => CareerState) => void;
type Patch = (fn: (s: Sidecar) => Sidecar) => boolean;

/**
 * Appends a NEW synthetic experience to the local (demo/guest) workspace.
 * Source is always 'example' (synthetic, never 'planner' or 'manual').
 * Never touches existing records. confirmed stays false: the user reconfirms in the library.
 */
export function addSyntheticExperience(seed: SyntheticSeed, revision: number, update: Update, patch: Patch, consent = true, include: InputField[] = ALL_INPUT_FIELDS): string | null {
  const full = seedInput(seed, revision);
  // Deselected fields are dropped entirely: not in the record, not in metadata.
  const input = Object.fromEntries(ALL_INPUT_FIELDS.filter((f) => include.includes(f)).map((f) => [f, full[f]])) as Partial<PlannerInput>;
  const id = uid('exp');
  const exp: CareerExperience = {
    id, title: seed.title, action: input.selectedAction ?? '', result: input.result ?? '', learning: input.learning ?? '',
    strengths: seed.strengths, criterionIds: [], confirmed: false, source: 'example',
  };
  const ok = patch((s) => setExpMeta(s, id, {
    nature: seed.nature, cardType: seed.cardType, origin: 'example', synthetic: true, syntheticKey: seed.key, seedLocale: seed.locale ?? 'ko', sourceRevision: revision,
    planner: input as PlannerInput, plannerFields: ALL_INPUT_FIELDS.filter((f) => include.includes(f)), factConsent: consent, usageConsent: consent, consentAt: new Date().toISOString(),
    selectedJob: seed.selectedJob, practiceAction: seed.practiceAction, checkCriterion: seed.checkCriterion,
    strengthStrategy: seed.strengthStrategy, supportProvided: seed.supportProvided, independentSteps: seed.independentSteps, observedEvidence: seed.observedEvidence,
  }));
  if (!ok) return null; // metadata not persisted: do not add the record
  update((s) => ({ ...s, experiences: [...s.experiences, exp] }));
  return id;
}
