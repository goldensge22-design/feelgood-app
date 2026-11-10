import { useState } from 'react';
import { MessageCircleQuestion } from 'lucide-react';
import type { CareerApplication, CareerExperience } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { appExpMeta, coachKeys, jobConnectionOf, useSidecar } from '@/lib/provenance';
import { jobConnectionPrompts, prefersExistingQuestionCoach, starCoachPrompts, starCoachQuestionKey } from '@/lib/star-story';

const GENERIC = ['coach.q1', 'coach.q2', 'coach.q3', 'coach.q4', 'coach.q5', 'coach.q6'];

/** One contextual question at a time. Asks only; never writes or inserts text. */
export function ContextCoach({ exps, app }: { exps: CareerExperience[]; app: CareerApplication }) {
  const { t, locale } = useI18n();
  const { data } = useSidecar();
  const preserveExisting = prefersExistingQuestionCoach(app.question, locale);
  const [useStarCoach, setUseStarCoach] = useState(false);
  const starEnabled = exps.length > 0 && (!preserveExisting || useStarCoach);
  const rawStarPrompts = starEnabled
    ? starCoachPrompts(exps, (id) => appExpMeta(data, app.id, id))
    : null;
  const jobPrompts = starEnabled
    ? jobConnectionPrompts(
      exps,
      (id) => appExpMeta(data, app.id, id),
      (id) => jobConnectionOf(data, app.id, id),
      app.job,
      app.company,
    )
    : [];
  const starPrompts = rawStarPrompts
    ? rawStarPrompts[0]?.topic === 'reflection'
      ? [...jobPrompts, ...rawStarPrompts]
      : [...rawStarPrompts, ...jobPrompts]
    : null;
  const items: { key: string; title?: string }[] = exps.length
    ? exps.flatMap((e) => coachKeys(appExpMeta(data, app.id, e.id).nature).map((key) => ({ key, title: e.title })))
    : GENERIC.map((key) => ({ key }));
  const [idx, setIdx] = useState(0);
  const [promptId, setPromptId] = useState('');
  const cur = items[idx % items.length];
  const activePrompt = starPrompts
    ? starPrompts.find((prompt) => prompt.id === promptId) ?? starPrompts[0]
    : null;
  const coachTitle = activePrompt?.title || cur.title;
  return (
    <div className="surface border-blue/30 p-5" aria-live="polite" data-testid="panel-coach">
      <p className="flex items-center gap-2 text-sm font-semibold text-blue"><MessageCircleQuestion className="h-4 w-4" /> {t('w.coach')}</p>
      {preserveExisting && exps.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/60 p-3">
          <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
            {t('star.coachToggleNote')}
          </p>
          <Button type="button" variant="outline" className="min-h-11" aria-pressed={useStarCoach}
            onClick={() => { setUseStarCoach((value) => !value); setPromptId(''); setIdx(0); }}
            data-testid="button-toggle-star-coach">
            {useStarCoach ? t('star.coachUseExisting') : t('star.coachUseStar')}
          </Button>
        </div>
      )}
      {coachTitle && <p className="mt-2 text-[11px] text-muted-foreground" dir="auto" data-testid="text-coach-target">{t('pv.coachFor', { title: coachTitle })}</p>}
      <p className="mt-2 text-[15px] font-medium leading-relaxed" data-testid="text-coach-question">{activePrompt ? t(starCoachQuestionKey(activePrompt)) : t(cur.key)}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {activePrompt
          ? activePrompt.topic.startsWith('job') ? t('joblink.coachNote') : t('star.coachNote')
          : t('w.coachNote')}
      </p>
      <div className="mt-3 flex items-center justify-between">
        {activePrompt
          ? <span className="text-[11px] text-muted-foreground">{t('star.coachNoScore')}</span>
          : <span className="meta">{(idx % items.length) + 1} / {items.length}</span>}
        <Button variant="outline" className="min-h-11" onClick={() => {
          if (starPrompts) {
            const current = starPrompts.findIndex((prompt) => prompt.id === (activePrompt?.id ?? ''));
            setPromptId(starPrompts[(current + 1) % starPrompts.length].id);
          } else setIdx((i) => (i + 1) % items.length);
        }} data-testid="button-next-coach">{t('w.nextQuestion')}</Button>
      </div>
    </div>
  );
}
