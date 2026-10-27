import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { CareerState } from '@workspace/api-client-react';
import { useI18n } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace';
import { NextSteps, PageHeader } from '@/components/common';
import { cn } from '@/lib/utils';

type Step = { id: string; href: string; done: (s: CareerState, versions: number) => boolean };
const STEPS: Step[] = [
  { id: 's1', href: '/?view=summary', done: (s) => !!s.report },
  { id: 's2', href: '/?view=summary', done: (s) => !!s.selectedJob.trim() },
  { id: 's3', href: '/criteria', done: (s) => s.criteria.length > 0 },
  { id: 's4', href: '/activities', done: (s) => s.activities.length > 0 },
  { id: 's5', href: '/activities', done: (s) => s.activities.some((a) => !!(a.action || a.result || a.learning)) },
  { id: 's6', href: '/experiences', done: (s) => s.experiences.length > 0 },
  { id: 's7', href: '/experiences', done: (s) => s.experiences.some((e) => e.confirmed) },
  { id: 's8', href: '/questions', done: (s) => s.applications.some((a) => !!a.question.trim()) },
  { id: 's9', href: '/questions', done: (s) => s.applications.some((a) => a.experienceIds.length > 0) },
  { id: 's10', href: '/write', done: (s, v) => s.applications.some((a) => !!a.text.trim()) && v > 0 },
  { id: 's11', href: '/export', done: () => false },
];

export default function JourneyPage() {
  const { t } = useI18n();
  const { state, versions } = useWorkspace();
  const firstOpen = state ? STEPS.findIndex((s) => !s.done(state, versions.length)) : -1;
  return (
    <div>
      <PageHeader eyebrow={t('j.eyebrow')} title={t('nav.journey')} description={t('j.desc')} />
      <ol className="relative space-y-3 before:absolute before:inset-y-4 before:start-[1.35rem] before:w-px before:bg-border">
        {STEPS.map((s, i) => {
          const done = state ? s.done(state, versions.length) : false;
          const current = i === firstOpen;
          return (
            <motion.li key={s.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="relative">
              <Link href={s.href} className={cn('surface flex min-h-11 items-start gap-4 p-4 transition-shadow hover:shadow-md', current && 'ring-2 ring-primary/40')} data-testid={`link-journey-${s.id}`}>
                <span className={cn('relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold', done ? 'bg-ok text-white' : current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{t(`j.${s.id}`)}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{t(`j.${s.id}.ctx`)}</span>
                  {current && <span className="mt-1 inline-block text-xs font-semibold text-primary">{t('j.now')}</span>}
                </span>
              </Link>
            </motion.li>
          );
        })}
      </ol>
      <p className="mt-4 text-xs text-muted-foreground">{t('j.note')}</p>
      <NextSteps prev={{ href: '/?view=summary', label: t('nav.overview') }} next={{ href: '/criteria', label: t('nav.criteria') }} />
    </div>
  );
}
