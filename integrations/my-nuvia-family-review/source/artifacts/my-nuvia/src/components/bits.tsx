import { forwardRef, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode, type TextareaHTMLAttributes, type InputHTMLAttributes } from 'react';
import { Link } from 'wouter';
import { AlertCircle, LogIn, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n, type TKey } from '@/i18n';
import { useNav, type ApiErr } from '@/lib/nuvia';

export function Card({ className, children, tone = 'plain', ...rest }: { className?: string; children: ReactNode; tone?: 'plain' | 'sky' | 'plum' | 'peach' } & React.HTMLAttributes<HTMLElement>) {
  const tones = { plain: 'bg-card', sky: 'bg-sky-soft', plum: 'bg-plum-soft', peach: 'bg-peach' };
  return (
    <section className={cn('rounded-2xl border border-card-border p-5 shadow-sm sm:p-6', tones[tone], className)} {...rest}>
      {children}
    </section>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' | 'ghost' | 'sky'; busy?: boolean };
export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn({ variant = 'primary', busy, className, children, disabled, ...rest }, ref) {
  const v = {
    primary: 'bg-primary text-primary-foreground shadow-sm hover:brightness-105',
    sky: 'bg-sky text-white shadow-sm hover:brightness-105',
    quiet: 'bg-card text-navy border border-input hover:bg-muted',
    ghost: 'text-navy hover:bg-muted',
  }[variant];
  return (
    <button
      ref={ref}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn('press tap inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50', v, className)}
      {...rest}
    >
      {busy && <RotateCw className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function Field({ label, hint, children, id }: { label: string; hint?: string; children: ReactNode; id: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-navy">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
const inputCls = 'w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 min-h-[44px]';
export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TI(p, ref) {
  return <input ref={ref} {...p} className={cn(inputCls, p.className)} />;
});
export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TA(p, ref) {
  return <textarea ref={ref} rows={3} {...p} className={cn(inputCls, 'resize-y leading-relaxed', p.className)} />;
});

/** Radio buttons support arrow/Home/End selection as well as Tab/Space/Enter. */
export function radioKeys(e: KeyboardEvent<HTMLElement>) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
  const group = e.currentTarget.closest('[role="radiogroup"]');
  const buttons = Array.from(group?.querySelectorAll<HTMLButtonElement>('button[role="radio"]:not(:disabled)') ?? []);
  if (!buttons.length) return;
  e.preventDefault();
  const i = buttons.indexOf(e.currentTarget as HTMLButtonElement);
  const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
  const backwards = e.key === 'ArrowUp' || e.key === (rtl ? 'ArrowRight' : 'ArrowLeft');
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (i + (backwards ? -1 : 1) + buttons.length) % buttons.length;
  buttons[next].focus();
  buttons[next].click();
}

export function Chip({ active, onClick, children, testId }: { active: boolean; onClick: () => void; children: ReactNode; testId?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      onKeyDown={radioKeys}
      data-testid={testId}
      className={cn('press tap rounded-full border px-4 py-2 text-sm font-medium transition-colors', active ? 'border-navy bg-navy text-background' : 'border-input bg-card text-navy hover:border-navy/40')}
    >
      {children}
    </button>
  );
}

export function ErrorBanner({ error, onRetry }: { error: ApiErr | null; onRetry?: () => void }) {
  const { t } = useI18n();
  const { href, full } = useNav();
  if (!error || error.code === 'pending') return null;
  const key = `err.${error.code}` as TKey;
  return (
    <div role="alert" className="rise flex flex-wrap items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-sm text-foreground" data-testid="status-error">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
      <p className="min-w-0 flex-1">{t(key)}</p>
      <div className="flex gap-2">
        {error.status === 401 && (
          <Link href={href('/login', { returnTo: full })} className="tap inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 text-sm font-semibold text-background" data-testid="link-reconnect">
            <LogIn className="h-4 w-4" aria-hidden /> {t('err.reconnect')}
          </Link>
        )}
        {onRetry && error.status !== 401 && error.status !== 403 && (
          <Btn variant="quiet" onClick={onRetry} data-testid="button-retry">
            <RotateCw className="h-4 w-4" aria-hidden /> {t('c.retry')}
          </Btn>
        )}
      </div>
    </div>
  );
}

export function Skel({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-muted', className)} aria-hidden />;
}

export function PageHead({ eyebrow, title, sub, icon }: { eyebrow?: string; title: string; sub?: string; icon?: ReactNode }) {
  return (
    <header className="rise mb-6 sm:mb-8">
      {eyebrow && <p className="mb-2 font-mono text-xs uppercase tracking-[0.14em] text-plum">{eyebrow}</p>}
      <div className="flex items-center gap-3">
        {icon}
        <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
      </div>
      {sub && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{sub}</p>}
    </header>
  );
}

export function SavedFlash({ show }: { show: boolean }) {
  const { t } = useI18n();
  return (
    <span aria-live="polite" className="text-sm font-medium text-sky">
      {show ? t('c.saved') : ''}
    </span>
  );
}
