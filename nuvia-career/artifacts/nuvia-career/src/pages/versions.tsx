import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Columns2, FileClock, Lock, RotateCcw } from 'lucide-react';
import type { CareerVersion } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useI18n } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace';
import { countChars, formatDate } from '@/lib/career';
import { useToast } from '@/hooks/use-toast';
import { EmptyState, LoadingBlock, NextSteps, PageHeader } from '@/components/common';
import { cn } from '@/lib/utils';
import { VersionProvenance } from '@/components/provenance/version-provenance';
import { restoreFromSnapshot, useSidecar } from '@/lib/provenance';

function VersionColumn({ v }: { v: CareerVersion }) {
  const { t, locale } = useI18n();
  const a = v.application;
  return (
    <div className="surface min-w-0 p-5" data-testid={`compare-col-${v.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold" dir="auto">{v.label}</p>
        {v.submitted && <span className="inline-flex items-center gap-1 rounded-full bg-navy px-2 py-0.5 text-[10px] font-semibold text-white"><Lock className="h-3 w-3" /> {t('ver.submitted')}</span>}
      </div>
      <p className="meta mt-1">{formatDate(v.createdAt, locale)}</p>
      <p className="mt-3 text-xs text-muted-foreground" dir="auto">{a.company || '—'} · {a.job || '—'}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-medium" dir="auto">{a.question}</p>
      <div className="mt-4 whitespace-pre-wrap border-t pt-4 text-[15px] leading-[1.85]" dir="auto" lang={a.writingLanguage || undefined}>{a.text || <span className="text-muted-foreground">{t('ver.emptyText')}</span>}</div>
      <p className="meta mt-3">{countChars(a.text, a.countSpaces).toLocaleString()}{a.limit > 0 ? ` / ${a.limit}` : ''}</p>
      <VersionProvenance versionId={v.id} />
    </div>
  );
}

export default function VersionsPage() {
  const { t, locale } = useI18n();
  const { versions, versionsLoading, restoreVersion, mode } = useWorkspace();
  const [picked, setPicked] = useState<string[]>([]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { patch } = useSidecar();
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2)));
  const compare = picked.map((id) => versions.find((v) => v.id === id)).filter(Boolean) as CareerVersion[];

  return (
    <div>
      <PageHeader eyebrow={t('ver.eyebrow')} title={t('nav.versions')} description={t('ver.desc')} />
      <p className="mb-6 text-xs text-muted-foreground">{t(mode === 'account' ? 'ver.storeAccount' : 'ver.storeLocal')}</p>
      {versionsLoading ? <LoadingBlock /> : versions.length === 0 ? (
        <EmptyState icon={FileClock} title={t('ver.emptyTitle')} body={t('ver.emptyBody')} />
      ) : (
        <>
          <ul className="space-y-2">
            {versions.map((v) => (
              <li key={v.id} className={cn('surface flex flex-wrap items-center gap-3 p-4', picked.includes(v.id) && 'ring-2 ring-blue/40')} data-testid={`row-version-${v.id}`}>
                <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <Checkbox checked={picked.includes(v.id)} onCheckedChange={() => toggle(v.id)} aria-label={t('ver.pick')} data-testid={`checkbox-version-${v.id}`} />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold" dir="auto">{v.label}</span>
                      {v.submitted && <span className="inline-flex items-center gap-1 rounded-full bg-navy px-2 py-0.5 text-[10px] font-semibold text-white"><Lock className="h-3 w-3" /> {t('ver.submitted')}</span>}
                    </span>
                    <span className="meta block" dir="auto">{formatDate(v.createdAt, locale)} · {v.application.company || '—'} · {v.application.job || '—'}</span>
                  </span>
                </label>
                <Button variant="outline" className="min-h-11" onClick={() => { const newId = restoreVersion(v); patch((s) => restoreFromSnapshot(s, v.id, newId)); toast({ title: t('ver.restored') }); setLocation('/write'); }} data-testid={`button-restore-${v.id}`}>
                  <RotateCcw className="h-4 w-4" /> {t('ver.restore')}
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">{t('ver.restoreNote')}</p>
          <section className="mt-8" aria-label={t('ver.compare')}>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Columns2 className="h-5 w-5 text-blue" /> {t('ver.compare')}</h2>
            {compare.length < 2 ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t('ver.pickTwo')}</p> : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 md:grid-cols-2">
                {compare.map((v) => <VersionColumn key={v.id} v={v} />)}
              </motion.div>
            )}
          </section>
        </>
      )}
      <NextSteps prev={{ href: '/write', label: t('nav.write') }} next={{ href: '/export', label: t('nav.export') }} />
    </div>
  );
}
