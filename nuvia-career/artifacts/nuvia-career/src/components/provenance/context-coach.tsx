import { useState } from 'react';
import { MessageCircleQuestion } from 'lucide-react';
import type { CareerExperience } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { appExpMeta, coachKeys, useSidecar } from '@/lib/provenance';

const GENERIC = ['coach.q1', 'coach.q2', 'coach.q3', 'coach.q4', 'coach.q5', 'coach.q6'];

/** One contextual question at a time. Asks only; never writes or inserts text. */
export function ContextCoach({ exps, appId }: { exps: CareerExperience[]; appId: string }) {
  const { t } = useI18n();
  const { data } = useSidecar();
  const items: { key: string; title?: string }[] = exps.length
    ? exps.flatMap((e) => coachKeys(appExpMeta(data, appId, e.id).nature).map((key) => ({ key, title: e.title })))
    : GENERIC.map((key) => ({ key }));
  const [idx, setIdx] = useState(0);
  const cur = items[idx % items.length];
  return (
    <div className="surface border-blue/30 p-5" aria-live="polite" data-testid="panel-coach">
      <p className="flex items-center gap-2 text-sm font-semibold text-blue"><MessageCircleQuestion className="h-4 w-4" /> {t('w.coach')}</p>
      {cur.title && <p className="mt-2 text-[11px] text-muted-foreground" dir="auto" data-testid="text-coach-target">{t('pv.coachFor', { title: cur.title })}</p>}
      <p className="mt-2 text-[15px] font-medium leading-relaxed" data-testid="text-coach-question">{t(cur.key)}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">{t('w.coachNote')}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="meta">{(idx % items.length) + 1} / {items.length}</span>
        <Button variant="outline" className="min-h-10" onClick={() => setIdx((i) => (i + 1) % items.length)} data-testid="button-next-coach">{t('w.nextQuestion')}</Button>
      </div>
    </div>
  );
}
