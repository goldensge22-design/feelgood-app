import { useEffect, useState } from 'react';
import { useWorkspace } from '@/lib/workspace';
import { appExpMeta, invalidateJobConnectionReviews, setStarNotes, useSidecar } from '@/lib/provenance';
import { storyValues, type StarStoryValues } from '@/lib/star-story';
import { StarStoryFields } from '@/components/provenance/star-story-fields';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import type { CareerExperience } from '@workspace/api-client-react';
import { useI18n } from '@/lib/i18n';

export function ExperienceStoryHelp({
  experience,
  appId,
}: {
  experience: CareerExperience;
  appId: string;
}) {
  const { t } = useI18n();
  const { update } = useWorkspace();
  const { data, patch } = useSidecar();
  const meta = appExpMeta(data, appId, experience.id);
  const [draft, setDraft] = useState<StarStoryValues>(() => storyValues(experience, meta));
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    setDraft(storyValues(experience, meta));
    setSaved(false);
    setSaveError(false);
    // Reset only when the selected draft or experience changes. Locale changes
    // keep this component mounted and preserve an in-progress Korean entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, experience.id]);

  const save = () => {
    const contentChanged = draft.action !== experience.action || draft.result !== experience.result || draft.learning !== experience.learning;
    const persisted = patch((current) => {
      let next = setStarNotes(current, experience.id, {
        situation: draft.situation,
        roleGoal: draft.roleGoal,
        selectionReason: draft.selectionReason,
        resultEvidence: draft.resultEvidence,
      }, appId);
      if (contentChanged) next = invalidateJobConnectionReviews(next, { appId, experienceId: experience.id });
      return next;
    });
    if (!persisted) {
      setSaved(false);
      setSaveError(true);
      return;
    }

    if (contentChanged) {
      update((state) => ({
        ...state,
        experiences: state.experiences.map((item) => item.id === experience.id
          ? { ...item, action: draft.action, result: draft.result, learning: draft.learning }
          : item),
      }));
    }
    setSaveError(false);
    setSaved(true);
  };

  return (
    <details className="surface p-4" data-testid={`details-star-help-${experience.id}`}>
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">
        {t('star.helpTitle', { title: experience.title })}
      </summary>
      <div className="mt-3 space-y-3">
        <p className="rounded-md bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
          {t('star.helpIntro')}
        </p>
        <StarStoryFields value={draft} onChange={(next) => { setDraft(next); setSaved(false); setSaveError(false); }}
          testPrefix={`star-help-${appId}-${experience.id}`} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" className="min-h-11" onClick={save} data-testid={`button-save-star-help-${experience.id}`}>
            <Save className="h-4 w-4" /> {t('star.saveButton')}
          </Button>
          {saved && <span role="status" className="text-xs text-muted-foreground">{t('star.savedStatus')}</span>}
          {saveError && <span role="alert" className="text-xs text-destructive">{t('star.saveError')}</span>}
        </div>
      </div>
    </details>
  );
}
