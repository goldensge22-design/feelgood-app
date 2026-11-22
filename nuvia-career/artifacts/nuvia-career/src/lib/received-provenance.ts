import type { CareerExperience } from '@workspace/api-client-react';
import type { ExpMeta } from './provenance';

/**
 * Frontend receiving adapter only. The deployed API must explicitly provide
 * this metadata; the current CareerExperience contract does not yet require it.
 * No inference from card type, title, free text, scores, or source product.
 */
export function receivedExperienceMeta(experience: CareerExperience): Partial<ExpMeta> | null {
  const raw = experience as CareerExperience & { provenance?: unknown };
  if (!raw.provenance || typeof raw.provenance !== 'object' || Array.isArray(raw.provenance)) return null;
  const p = raw.provenance as Record<string, unknown>;
  if (p.nature !== 'actual' && p.nature !== 'simulation' && p.nature !== 'unconfirmed') return null;
  // Metadata must bind to the SAME version as the selected received record.
  // Missing/mismatched versions remain unconfirmed rather than silently upgraded.
  if (!experience.sourceVersion || p.sourceVersion !== experience.sourceVersion) return null;
  const out: Partial<ExpMeta> = { nature: p.nature, origin: experience.source };
  if (p.cardType === 'daily_application' || p.cardType === 'job_scenario') out.cardType = p.cardType;
  if (['daily_activity', 'class_simulation', 'job_experience', 'synthetic_example', 'unknown'].includes(String(p.experienceContext))) {
    out.experienceContext = p.experienceContext as ExpMeta['experienceContext'];
  }
  if (p.synthetic === true) { out.synthetic = true; out.experienceContext = 'synthetic_example'; }
  // Do not infer confirmation, sharing consent or externally verified facts.
  return out;
}
