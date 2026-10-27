import { SAMPLE_BY_KO } from '@/lib/messages';
import { useEffect, type ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, ArrowRight, ExternalLink, RefreshCw, type LucideIcon } from 'lucide-react';
import type { CareerCriterion } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n';
import { useWorkspace } from '@/lib/workspace';
import { safeUrl, strengthTranslationKey } from '@/lib/career';
import { cn } from '@/lib/utils';

export function PageHeader({
  eyebrow, title, description, actions,
}: { eyebrow: string; title: string; description?: string; actions?: ReactNode }) {
  useEffect(() => { document.title = `${title} · NUVIA`; }, [title]);
  return (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h1 className="text-2xl font-bold text-foreground md:text-[2rem] md:leading-tight" data-testid="text-page-title">{title}</h1>
        {description && <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ icon: Icon, title, body, children }: { icon: LucideIcon; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="surface rule-grid flex flex-col items-center px-6 py-14 text-center" data-testid="state-empty">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-soft text-blue">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>
      {children && <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" data-testid="state-loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="surface border-destructive/30 flex flex-col items-start gap-3 p-6" data-testid="state-error">
      <p className="text-sm text-destructive">{message}</p>
      <Button variant="outline" onClick={onRetry} className="tap" data-testid="button-retry">
        <RefreshCw className="h-4 w-4" /> {t('common.retry')}
      </Button>
    </div>
  );
}

/** Wrap whole page workspace-dependent content */
export function WorkspaceGate({ children }: { children: (s: NonNullable<ReturnType<typeof useWorkspace>['state']>) => ReactNode }) {
  const { state, loadError, retryLoad } = useWorkspace();
  const { t } = useI18n();
  if (loadError) return <ErrorBlock message={t('error.load')} onRetry={retryLoad} />;
  if (!state) return <LoadingBlock />;
  return <>{children(state)}</>;
}

export function sourceTypeKey(c: CareerCriterion) {
  return `source.${c.sourceType}`;
}

export function SourceMeta({ c, compact }: { c: CareerCriterion; compact?: boolean }) {
  const { t } = useI18n();
  const url = safeUrl(c.sourceUrl);
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', compact ? 'text-xs' : 'text-[13px]')}>
      <span className={cn(
        'rounded-md px-2 py-0.5 text-xs font-medium',
        c.sourceType === 'common_example' ? 'bg-warn-soft text-warn' : 'bg-blue-soft text-blue',
      )} data-testid={`text-source-type-${c.id}`}>
        {t(sourceTypeKey(c))}
      </span>
      {c.sourceType !== 'common_example' && <span className="meta">{c.sourceLabel}</span>}
      <span className="meta">{t('criteria.asOf')} {c.asOf}</span>
      <span className="meta">v{c.version}</span>
      {url && (
        <a href={url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs text-blue underline-offset-2 hover:underline">
          {t('criteria.source')} <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

/** Translates criterion title only for rendering when it's a known common criterion. Stored data is untouched. */
export function useCriterionText() {
  const { t, locale } = useI18n();
  return (c: CareerCriterion) => {
    const k = `crit.${c.id}`;
    const title = t(`${k}.title`);
    if (locale === 'ko' || title === `${k}.title`) return { title: c.title, description: c.description, translated: false };
    return { title, description: t(`${k}.desc`), translated: true };
  };
}

export function NextSteps({ prev, next }: { prev?: { href: string; label: string }; next?: { href: string; label: string } }) {
  const { t, dir } = useI18n();
  const Back = dir === 'rtl' ? ArrowRight : ArrowLeft;
  const Fwd = dir === 'rtl' ? ArrowLeft : ArrowRight;
  return (
    <nav aria-label={t('common.flow')} className="mt-12 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:justify-between">
      {prev ? (
        <Link href={prev.href} className="tap inline-flex items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" data-testid="link-prev-step">
          <Back className="h-4 w-4" /> <span>{t('common.prev')} · {prev.label}</span>
        </Link>
      ) : <span />}
      {next && (
        <Link href={next.href} className="tap inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-4 text-sm font-medium text-white hover:bg-navy-soft" data-testid="link-next-step">
          <span>{t('common.next')} · {next.label}</span> <Fwd className="h-4 w-4" />
        </Link>
      )}
    </nav>
  );
}

/** Marks user/example content with its original language so it's never presented as a translation. */
function sampleKeyFor(text: string): string | null {
  return SAMPLE_BY_KO.get(text.trim()) ?? null;
}

export function OriginalContent({ children, className, as = 'div', badge = true }: { children: ReactNode; className?: string; as?: 'div' | 'span' | 'p'; badge?: boolean }) {
  const { mode } = useWorkspace();
  const { locale, t } = useI18n();
  const Tag = as;
  const foreign = mode === 'demo' && locale !== 'ko';
  let translated = false;
  let untranslated = false;
  // Display-only: only untouched fictional sample strings are swapped. Stored records are never mutated; edited samples stay as typed.
  const swap = (c: ReactNode): ReactNode => {
    if (typeof c !== 'string' || !foreign) { if (typeof c === 'string' && c.trim()) untranslated = true; return c; }
    const prefix = c.startsWith(' · ') ? ' · ' : '';
    const key = sampleKeyFor(c.slice(prefix.length));
    if (!key) { if (/[\uac00-\ud7af\u1100-\u11ff]/.test(c)) untranslated = true; return c; }
    translated = true;
    return prefix + t(key);
  };
  const out = Array.isArray(children) ? children.map(swap) : swap(children);
  const keepKo = foreign && untranslated && !translated;
  return (
    <Tag className={className} lang={keepKo ? 'ko' : undefined} dir="auto">
      {out}
      {foreign && badge && (translated || keepKo) && (
        <span className="ms-2 inline-block rounded bg-muted px-1.5 py-0.5 align-middle text-[10px] font-medium text-muted-foreground" lang={locale} dir="auto">
          {t(translated && !untranslated ? 'content.sampleTranslated' : 'content.originalKo')}
        </span>
      )}
    </Tag>
  );
}

export function StrengthChip({ value }: { value: string }) {
  const { t } = useI18n();
  const { mode } = useWorkspace();
  const key = strengthTranslationKey(value);
  const label = t(key);
  return (
    <span className="rounded-full border border-blue/20 bg-blue-soft px-2.5 py-0.5 text-xs font-medium text-blue">
      {label !== key ? label : SAMPLE_BY_KO.get(value) && mode === 'demo' ? t(SAMPLE_BY_KO.get(value)!) : <span dir="auto">{value}</span>}
    </span>
  );
}
