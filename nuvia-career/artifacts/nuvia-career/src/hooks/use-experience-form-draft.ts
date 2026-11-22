import { useEffect, useRef, useState } from 'react';
import type { CareerExperience } from '@workspace/api-client-react';
import type { ExperienceContext } from '@/lib/provenance';
import type { StarStoryValues } from '@/lib/star-story';
import { clearExperienceForm, readExperienceForm, writeExperienceForm, type ExperienceFormDraft } from '@/lib/experience-form-draft';

export function useExperienceFormDraft(
  owner: string, slot: string, initial: CareerExperience, initialStar: StarStoryValues,
  initialContext: ExperienceContext, savedExperiences: CareerExperience[], acknowledged: boolean,
) {
  const loaded = useRef<ReturnType<typeof readExperienceForm> | null>(null);
  if (!loaded.current) {
    const stored = readExperienceForm(owner, slot);
    // Only retire a submitted form after the workspace has acknowledged the same record.
    const saved = stored.draft && savedExperiences.find(e => e.id === stored.draft!.experience.id);
    if (stored.draft?.submitted && acknowledged && saved && JSON.stringify(saved) === JSON.stringify(stored.draft.experience)) {
      clearExperienceForm(owner, slot, stored.recovery ? null : stored.raw);
      loaded.current = readExperienceForm(owner, slot);
    } else loaded.current = stored;
  }
  const baseSource = slot === 'new' ? null : JSON.stringify(initial);
  const [form, setForm] = useState<ExperienceFormDraft>(() => loaded.current!.draft ?? {
    experience: initial, star: initialStar, context: initialContext, baseSource,
  });
  const [stale, setStale] = useState(() => {
    const cached = loaded.current!.draft;
    const saved = cached && savedExperiences.find(e => e.id === cached.experience.id);
    return !!cached && (cached.baseSource !== baseSource ||
      (slot === 'new' && !!saved && JSON.stringify(saved) !== JSON.stringify(cached.experience)));
  });
  const [error, setError] = useState<'failed' | 'conflict' | null>(loaded.current.recovery ? 'failed' : null);
  const current = useRef(form);
  const expected = useRef(loaded.current.raw);
  const dirty = useRef(!!loaded.current.draft);
  const persist = (next: ExperienceFormDraft) => {
    current.current = next; dirty.current = true;
    const result = writeExperienceForm(owner, slot, next, expected.current);
    if (result.ok) expected.current = result.raw;
    setError(result.ok ? null : result.conflict ? 'conflict' : 'failed');
    return result.ok;
  };
  const change = (patch: Partial<ExperienceFormDraft>) => {
    const next = { ...current.current, ...patch, submitted: false };
    persist(next); setForm(next);
  };
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      const result = writeExperienceForm(owner, slot, current.current, expected.current);
      if (!result.ok && !result.recovered) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [owner, slot]);
  return {
    ...form, error, stale,
    setField: <K extends keyof CareerExperience>(key: K, value: CareerExperience[K]) =>
      change({ experience: { ...current.current.experience, [key]: value } }),
    setStar: (star: StarStoryValues) => change({ star }),
    setContext: (context: ExperienceContext) => change({ context }),
    retry: () => persist(current.current),
    markSubmitted: () => persist({ ...current.current, submitted: true }),
    reviewSource: () => {
      const old = current.current.experience;
      change({ baseSource, context: initialContext, experience: { ...initial, title: old.title, action: old.action, result: old.result,
        learning: old.learning, strengths: old.strengths, criterionIds: old.criterionIds, confirmed: false } });
      setStale(false);
    },
  };
}
