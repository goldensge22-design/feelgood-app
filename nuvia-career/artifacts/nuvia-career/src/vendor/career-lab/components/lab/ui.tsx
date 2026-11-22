import { useEffect, useId, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { cn } from '@/vendor/career-lab/lib/utils';
import { Button } from '@/vendor/career-lab/components/ui/button';
import { useLocale } from '@/vendor/career-lab/lib/locale';
import { forgetOriginal, isProductValue, localizeValue, rememberOriginal, formatMessage } from '@/vendor/career-lab/lib/i18n-runtime';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/vendor/career-lab/components/ui/alert-dialog';

export function PageHeader({ step, title, desc, children }: { step?: string; title: string; desc?: string; children?: ReactNode }) {
  const { t } = useLocale();
  const displayStep = step?.replace(/^STEP\s+(\d+)/, (_, n) => formatMessage('단계 {0}', [n])).replace('AI 자기소개서', t('AI 자기소개서'));
  return (
    <header className="rise mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {step && <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-primary">{displayStep}</p>}
        <h1 className="font-display text-3xl font-bold leading-tight text-foreground md:text-[2.4rem]" data-testid="text-page-title">{t(title)}</h1>
        {desc && <p className="mt-3 text-[15px] text-muted-foreground">{t(desc)}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}

export function Panel({ title, hint, action, children, className, tone }: { title?: string; hint?: string; action?: ReactNode; children: ReactNode; className?: string; tone?: 'teal' | 'coral' | 'plain' }) {
  const { t } = useLocale();
  return (
    <section className={cn('rise rounded-2xl border bg-card p-5 md:p-7', tone === 'teal' && 'border-primary/25 bg-secondary/50', tone === 'coral' && 'border-[hsl(var(--coral)/0.35)] bg-accent/60', className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-[1_1_12rem]">{title && <h2 className="text-lg font-bold">{t(title)}</h2>}{hint && <p className="mt-1 text-sm text-muted-foreground">{t(hint)}</p>}</div>
          {action && <div className="max-w-full shrink-0" data-panel-action>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  const { t } = useLocale();
  return (
    <div className="lab-grid relative overflow-hidden rounded-xl border border-dashed px-6 py-10 text-center" data-testid="state-empty">
      <div className="mx-auto mb-3 h-2 w-10 rounded-full bg-coral/70" />
      <p className="font-semibold">{t(title)}</p>
      {desc && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{t(desc)}</p>}
      {action && <div className="mt-4 flex justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Tag({ children, tone = 'muted', className }: { children: ReactNode; tone?: 'muted' | 'teal' | 'coral' | 'navy' | 'outline'; className?: string }) {
  const t = { muted: 'bg-muted text-muted-foreground', teal: 'bg-secondary text-secondary-foreground', coral: 'bg-accent text-accent-foreground', navy: 'bg-foreground text-background', outline: 'border text-muted-foreground' }[tone];
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', t, className)}>{children}</span>;
}

export function LField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const { t } = useLocale();
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{t(label)}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{t(hint)}</span>}
    </label>
  );
}

export const inputCls = 'w-full rounded-lg border border-input bg-background/70 px-3 py-2 text-[15px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

function useInputPresentation<T extends HTMLInputElement | HTMLTextAreaElement>(value: React.InputHTMLAttributes<HTMLInputElement>['value'], onChange?: React.ChangeEventHandler<T>) {
  const id = useId();
  const [edited, setEdited] = useState<string>();
  useEffect(() => () => forgetOriginal(id), [id]);
  const displayValue = typeof value === 'string' && value !== edited && isProductValue(value) ? String(localizeValue(value)) : value;
  return { value: displayValue, onChange: (event: React.ChangeEvent<T>) => {
    setEdited(event.currentTarget.value);
    rememberOriginal(id, event.currentTarget.value);
    onChange?.(event);
  } };
}
export function TextIn(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { t } = useLocale();
  const presentation = useInputPresentation(props.value, props.onChange);
  return <input dir="auto" {...props} {...presentation} placeholder={props.placeholder ? t(props.placeholder) : undefined} className={cn(inputCls, props.className)} />;
}
export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { t } = useLocale();
  const presentation = useInputPresentation(props.value, props.onChange);
  return <textarea dir="auto" rows={3} {...props} {...presentation} placeholder={props.placeholder ? t(props.placeholder) : undefined} className={cn(inputCls, 'resize-y leading-relaxed', props.className)} />;
}
export function Select({ options, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return <select {...p} className={cn(inputCls, 'appearance-auto', p.className)}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
}

export function Confirm({ trigger, title, desc, confirmLabel = '삭제', onConfirm, destructive = true }: { trigger: (open: () => void) => ReactNode; title: string; desc: string; confirmLabel?: string; onConfirm: () => void; destructive?: boolean }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <>
      {trigger(() => setOpen(true))}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t(title)}</AlertDialogTitle><AlertDialogDescription>{t(desc)}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-confirm-cancel">{t('취소')}</AlertDialogCancel>
            <AlertDialogAction data-testid="button-confirm-ok" className={destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''} onClick={onConfirm}>{t(confirmLabel)}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function NextLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">{children}</Link>;
}

export function SmallBtn(p: React.ComponentProps<typeof Button>) { return <Button size="sm" variant="outline" {...p} />; }
