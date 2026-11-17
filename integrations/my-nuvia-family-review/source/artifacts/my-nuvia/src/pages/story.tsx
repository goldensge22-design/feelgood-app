import { useState } from 'react';
import { Link } from 'wouter';
import { AlertTriangle, Check, ExternalLink, Eye, FileText, Lock, PenLine, Wand2 } from 'lucide-react';
import type { ActivityRecord } from '@workspace/api-client-react';
import { useI18n, type TKey } from '@/i18n';
import { cn } from '@/lib/utils';
import { useLocalDraft, useNav } from '@/lib/nuvia';
import { Btn, Card, ErrorBanner, Field, PageHead, SavedFlash, TextArea } from '@/components/bits';
import { FamilyGate, type FamilyCtx } from '@/components/family';

const F = ['action', 'difficulty', 'change', 'result', 'learned'] as const;
type SDraft = { recordIds: string[]; action: string; difficulty: string; change: string; result: string; learned: string; text: string; saveId: string; sourceVersions?: Record<string, number> };
const S0 = (): SDraft => ({ recordIds: [], action: '', difficulty: '', change: '', result: '', learned: '', text: '', saveId: crypto.randomUUID() });

export default function StoryPage() {
  return <FamilyGate>{(ctx) => <Story ctx={ctx} />}</FamilyGate>;
}

function Story({ ctx }: { ctx: FamilyCtx }) {
  const { t, fmtDate } = useI18n();
  const { href } = useNav();
  const { ws, act, session, subject } = ctx;
  const isChild = subject.ageBand === 'child';
  const title = isChild ? t('story.childTitle') : t('story.title');
  const [d, setD, clear] = useLocalDraft<SDraft>(`nuvia.draft.${ctx.scope}.story`, S0());
  const [preview, setPreview] = useState(false);
  const [flash, setFlash] = useState(false);

  if (session.role !== 'self') {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHead eyebrow={t('nav.programs')} title={title} icon={<PenLine className="h-8 w-8 text-plum" aria-hidden />} />
        <Card tone="plum" className="flex gap-4" data-testid="text-story-parent">
          <Lock className="h-6 w-6 shrink-0 text-plum" aria-hidden />
          <p className="leading-relaxed text-navy">{t('story.parent')}</p>
        </Card>
      </div>
    );
  }

  const selected = ws.records.filter((r) => d.recordIds.includes(r.id));
  const toggle = (id: string) => setD({ ...d, recordIds: d.recordIds.includes(id) ? d.recordIds.filter((x) => x !== id) : [...d.recordIds, id], sourceVersions: { ...d.sourceVersions, [id]: ws.records.find(r => r.id === id)?.version ?? 0 } });
  const prefill = () => {
    const join = (k: (typeof F)[number]) => selected.map((r) => r[k]).filter(Boolean).join(' / ');
    setD({ ...d, sourceVersions: Object.fromEntries(selected.map(r => [r.id, r.version])), action: join('action') || d.action, difficulty: join('difficulty') || d.difficulty, change: join('change') || d.change, result: join('result') || d.result, learned: join('learned') || d.learned });
  };
  const compose = () => {
    const text = F.filter((k) => d[k].trim()).map((k) => t(`tpl.${k}` as TKey, { v: d[k].trim() })).join('\n');
    setD({ ...d, text });
    setPreview(true);
  };
  const save = async () => {
    const sourceVersions = d.sourceVersions ?? {};
    const r = await act.run({ type: 'saveDraft', recordIds: d.recordIds, sourceVersions, action: d.action, difficulty: d.difficulty, change: d.change, result: d.result, learned: d.learned, text: d.text }, { key: `draft-${d.saveId}` });
    if (r.ok) {
      clear();
      setPreview(false);
      setFlash(true);
      setTimeout(() => setFlash(false), 2000);
    }
  };
  const share = (rec: ActivityRecord) => void act.run({ type: 'shareRecord', recordId: rec.id, shared: !rec.shared });
  const byId = new Map(ws.records.map((r) => [r.id, r]));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0 lg:col-span-2">
        <PageHead eyebrow={t('nav.programs')} title={title} sub={t('story.sub')} icon={<PenLine className="h-8 w-8 text-plum" aria-hidden />} />
      </div>
      <Card className="no-print min-w-0 space-y-3">
        <h2 className="font-display text-xl font-bold">{t('story.pick')}</h2>
        {ws.records.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground" data-testid="text-story-empty">
            {t('story.empty')}
          </p>
        ) : (
          <ul className="space-y-2">
            {ws.records.map((r) => {
              const on = d.recordIds.includes(r.id);
              return (
                <li key={r.id} className={cn('rounded-xl border p-3 transition-colors', on ? 'border-plum/50 bg-plum-soft/60' : 'border-border bg-card')} data-testid={`row-record-${r.id}`}>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={on} onChange={() => toggle(r.id)} className="mt-1 h-5 w-5 accent-[hsl(var(--plum))]" data-testid={`checkbox-record-${r.id}`} />
                    <span className="min-w-0 flex-1">
                      <span data-user-content translate="no" className="block font-semibold text-navy">{r.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {t(`kind.${r.kind}` as TKey)} · {fmtDate(r.date)}
                      </span>
                      {r.action && <span data-user-content translate="no" className="mt-1 block text-sm text-navy/80">{r.action}</span>}
                    </span>
                  </label>
                  <div className="mt-2 flex flex-wrap items-center gap-2 ps-8">
                    <Link href={href(r.kind === 'history' ? '/history' : '/planner', { record: r.id })} className="tap inline-flex items-center gap-1 text-xs font-medium text-sky" data-testid={`link-source-${r.id}`}>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden /> {t('story.source')}: {t(`kind.${r.kind}` as TKey)}
                    </Link>
                    <label className="tap ms-auto inline-flex items-center gap-2 text-xs text-navy">
                      <input type="checkbox" checked={r.shared} onChange={() => share(r)} className="h-4 w-4 accent-[hsl(var(--sky))]" data-testid={`toggle-share-${r.id}`} />
                      {t('story.share')}
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">{t('story.excluded')}</p>
      </Card>

      <Card tone="plum" className="no-print min-w-0 space-y-3" data-testid="form-story">
        <div className="flex flex-wrap gap-2">
          <Btn variant="quiet" onClick={prefill} disabled={selected.length === 0} data-testid="button-story-prefill">
            <Wand2 className="h-4 w-4" aria-hidden /> {t('story.compose')}
          </Btn>
        </div>
        {F.map((k) => (
          <Field key={k} id={`s-${k}`} label={t(`f.${k}`)}>
            <TextArea id={`s-${k}`} rows={2} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} data-testid={`input-story-${k}`} />
          </Field>
        ))}
        <Btn variant="sky" onClick={compose} disabled={F.every((k) => !d[k].trim())} data-testid="button-story-preview">
          <Eye className="h-4 w-4" aria-hidden /> {t('story.preview')}
        </Btn>
        {preview && (
          <div className="rise space-y-3 rounded-xl bg-card p-4">
            <TextArea aria-label={t('story.preview')} rows={6} value={d.text} onChange={(e) => setD({ ...d, text: e.target.value })} data-testid="input-story-text" />
            <ErrorBanner error={act.error} onRetry={save} />
            <div className="flex flex-wrap items-center gap-2">
              <Btn onClick={save} busy={act.pending === `draft-${d.saveId}`} disabled={!d.text.trim()} data-testid="button-story-save">
                <Check className="h-4 w-4" aria-hidden /> {t('c.confirmSave')}
              </Btn>
              <Btn variant="ghost" onClick={() => setPreview(false)}>
                {t('c.cancel')}
              </Btn>
            </div>
          </div>
        )}
        <SavedFlash show={flash} />
      </Card>

      <Card className="min-w-0 lg:col-span-2">
        <h2 className="mb-3 font-display text-xl font-bold">{t('story.drafts')}</h2>
        {ws.drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('story.noDrafts')}</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {ws.drafts.map((dr) => {
              const changed = dr.recordIds.some((id) => byId.get(id)?.version !== dr.sourceVersions[id]);
              return (
                <li key={dr.id} className="rounded-xl border border-border bg-background/60 p-4" data-testid={`card-draft-${dr.id}`}>
                  {changed && (
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <AlertTriangle className="h-4 w-4" aria-hidden /> {t('story.changed')}
                    </p>
                  )}
                  <p data-user-content translate="no" className="whitespace-pre-wrap text-sm leading-relaxed text-navy">{dr.text}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {dr.recordIds.map((id) => {
                      const rec = byId.get(id);
                      return rec ? (
                        <Link key={id} href={href(rec.kind === 'history' ? '/history' : '/planner', { record: rec.id })} className="tap inline-flex items-center gap-1 rounded-full bg-sky-soft px-3 text-xs text-sky">
                          <FileText className="h-3.5 w-3.5" aria-hidden /> <span data-user-content translate="no">{rec.title}</span>
                        </Link>
                      ) : null;
                    })}
                    <Btn variant="ghost" onClick={() => { setD({ ...S0(), sourceVersions: dr.sourceVersions, recordIds: dr.recordIds.filter((id) => byId.has(id)), action: dr.action, difficulty: dr.difficulty, change: dr.change, result: dr.result, learned: dr.learned, text: dr.text }); setPreview(true); }} data-testid={`button-draft-edit-${dr.id}`}>
                      {t('c.edit')}
                    </Btn>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
