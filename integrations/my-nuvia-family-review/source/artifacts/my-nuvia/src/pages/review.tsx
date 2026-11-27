import { useState } from 'react';
import { DoorOpen, FlaskConical, LogOut, ShieldCheck, TimerOff } from 'lucide-react';
import type { ReviewEntryAccount } from '@workspace/api-client-react';
import { LANGS, useI18n, type TKey } from '@/i18n';
import { cn } from '@/lib/utils';
import { REVIEW_EVIDENCE } from '@/lib/review-evidence';
import { ReviewQa } from '@/components/review-qa';
import { pickSubject, safeReturn, toApiErr, useAccountSwitch, useAct, useNav, useSession, type ApiErr } from '@/lib/nuvia';
import { Btn, Card, ErrorBanner, PageHead, radioKeys } from '@/components/bits';

const ACCOUNTS: ReviewEntryAccount[] = ['parent', 'child', 'teen', 'adult', 'teacher'];
type St = 'implemented' | 'partial' | 'absent' | 'unconfirmed';
const CHECKS: [TKey, St][] = [
  ['chk.menu', 'implemented'],
  ['chk.timer', 'implemented'],
  ['chk.retry', 'implemented'],
  ['chk.conflict', 'implemented'],
  ['chk.story', 'implemented'],
  ['chk.teacher', 'implemented'],
  ['chk.lang', 'implemented'],
  ['chk.locales', 'partial'],
  ['chk.device', 'partial'],
  ['chk.real', 'absent'],
];
const ST_CLS: Record<St, string> = {
  implemented: 'bg-sky-soft text-sky',
  partial: 'bg-peach text-primary',
  unconfirmed: 'bg-plum-soft text-plum',
  absent: 'bg-muted text-muted-foreground',
};

export default function ReviewPage() {
  const { t, fmtDate, lang } = useI18n();
  const { params, setLoc, href } = useNav();
  const returnTo = safeReturn(params.get('returnTo'));
  const sq = useSession();
  const s = sq.data;
  const { enter, leave } = useAccountSwitch();
  const [acct, setAcct] = useState<ReviewEntryAccount>('parent');
  const initialSpace = params.get('space') ?? 'visitor';
  const [space, setSpace] = useState(/^(visitor|legacy|qa-[a-zA-Z0-9-]{1,80})$/.test(initialSpace) ? initialSpace : 'visitor');
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiErr | null>(null);
  const subject = s?.authenticated && s.role !== 'teacher' ? pickSubject(s, null) : null;
  const act = useAct(subject?.id);
  const [simResult, setSimResult] = useState('');

  const doEnter = async () => {
    setBusy(true);
    setErr(null);
    try {
      const ns = await enter(acct, space);
      const dest = ns.role === 'teacher' && returnTo !== '/teacher' && !returnTo.startsWith('/teacher?') ? '/teacher' : returnTo;
      const u = new URL(dest, 'http://x');
      if (params.get('lang') && !u.searchParams.get('lang')) u.searchParams.set('lang', params.get('lang')!);
      u.searchParams.set('space', ns.space ?? 'visitor');
      if (ns.role === 'teacher') u.searchParams.delete('child');
      setLoc(u.pathname + (u.search || ''));
    } catch (e) {
      setErr(toApiErr(e));
    } finally {
      setBusy(false);
    }
  };
  const doLeave = async () => {
    setBusy(true);
    try {
      await leave();
    } catch (e) {
      setErr(toApiErr(e));
    } finally {
      setBusy(false);
    }
  };
  /** Deliberately revokes the session, then opens /login with the planner as destination */
  const expireTest = async () => {
    const dest = href('/planner');
    setBusy(true);
    try {
      await leave({ keepDrafts: true });
      setLoc(href('/login', { returnTo: dest }));
    } catch (e) {
      setErr(toApiErr(e));
    } finally {
      setBusy(false);
    }
  };
  const simulate = async () => {
    const r = await act.run({ type: 'saveNote', text: '' }, { simulateFailure: true });
    setSimResult(r.ok ? 'ok' : `${r.error.status} ${r.error.code}`);
  };

  return (
    <div className="no-print mx-auto max-w-5xl space-y-6">
      <PageHead title={t('review.title')} sub={t('review.notice')} icon={<ShieldCheck className="h-8 w-8 text-sky" aria-hidden />} />

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="space-y-4">
          <h2 className="font-display text-xl font-bold">{t('review.pick')}</h2>
          <label className="block space-y-1 text-xs">
            <span>Fictional dataset: visitor / legacy / qa-… (not authentication)</span>
            <input data-testid="input-review-space" className="tap w-full rounded-xl border border-input px-3 text-navy" value={space} onChange={e => setSpace(e.target.value)} pattern="(visitor|legacy|qa-[a-zA-Z0-9-]{1,80})" />
          </label>
          <div role="radiogroup" aria-label={t('review.pick')} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ACCOUNTS.map((a) => (
              <button key={a} type="button" role="radio" aria-checked={acct === a} onClick={() => setAcct(a)} onKeyDown={radioKeys} className={cn('press tap rounded-xl border px-3 py-3 text-sm font-semibold', acct === a ? 'border-primary bg-peach text-navy' : 'border-input bg-card text-navy')} data-testid={`radio-account-${a}`}>
                {t(`acct.${a}` as TKey)}
              </button>
            ))}
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-muted/60 p-3 text-sm text-navy">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[hsl(var(--primary))]" data-testid="checkbox-ack" />
            {t('review.ack')}
          </label>
          <p className="font-mono text-xs text-muted-foreground">
            {t('review.returnTo')}: {returnTo}
          </p>
          <ErrorBanner error={err} />
          <Btn onClick={doEnter} disabled={!ack} busy={busy} data-testid="button-enter">
            <DoorOpen className="h-4 w-4" aria-hidden /> {t('review.enter')}
          </Btn>
        </Card>

        <Card tone="sky" className="space-y-3">
          <h2 className="font-display text-xl font-bold">{t('review.current')}</h2>
          {s?.authenticated ? (
            <>
              <p className="text-navy" data-testid="text-session">
                {s.account ? t(`acct.${s.account}` as TKey) : ''} · {s.role ? t(`role.${s.role}` as TKey) : ''}
              </p>
              {s.expiresAt && <p className="text-sm text-muted-foreground">{t('acct.expires', { time: fmtDate(s.expiresAt, true) })}</p>}
              <ul className="flex flex-wrap gap-2">
                {s.subjects.map((x) => (
                  <li key={x.id} className="rounded-full bg-card px-3 py-1 text-xs text-navy">
                    {t(`age.${x.ageBand}` as TKey)}
                  </li>
                ))}
              </ul>
              <Btn variant="quiet" onClick={() => void doLeave()} busy={busy} data-testid="button-leave">
                <LogOut className="h-4 w-4 rtl:rotate-180" aria-hidden /> {t('review.leave')}
              </Btn>
            </>
          ) : (
            <p className="text-muted-foreground">{t('review.none')}</p>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-display text-xl font-bold">{t('review.compare')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-start text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 text-start font-medium" />
                <th className="py-2 text-start font-medium">{t('review.see')}</th>
                <th className="py-2 text-start font-medium">{t('review.write')}</th>
              </tr>
            </thead>
            <tbody>
              {(['parent', 'self', 'teacher'] as const).map((r) => (
                <tr key={r} className="border-b border-border/60 align-top">
                  <th className="py-3 pe-3 text-start font-semibold text-navy">{t(`role.${r}`)}</th>
                  <td className="py-3 pe-3">{t(`cmp.${r}.see` as TKey)}</td>
                  <td className="py-3">{t(`cmp.${r}.write` as TKey)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-xl font-bold">{t('review.check')}</h2>
          <ul className="space-y-2">
            {CHECKS.map(([k, st]) => (
              <li key={k} className="flex flex-wrap items-start gap-2 text-sm" data-testid={`row-check-${k}`}>
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', ST_CLS[st])}>{t(`st.${st}`)}</span>
                <span className="min-w-0 flex-1 text-navy">
                  {t(k)}
                  <code className="mt-1 block whitespace-normal break-words text-[11px] text-muted-foreground">{REVIEW_EVIDENCE[k]}</code>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2 rounded-lg bg-muted/60 p-2.5 font-mono text-xs text-navy" data-testid="text-evidence">
            <p>2026-11-06 · Chromium 152 · 55 browser groups PASS · 16 + 5 API checks PASS</p>
            <p>generated-artifacts/nuvia-browser/ · scripts/src/nuvia-browser-*.mjs</p>
            <p>docs/MY-NUVIA-VERIFICATION.md · docs/MY-NUVIA-BROWSER-EVIDENCE.md</p>
          </div>
        </Card>
        <div className="space-y-6">
          <Card tone="plum">
            <h2 className="mb-2 font-display text-xl font-bold">{t('review.boundary')}</h2>
            <ul className="list-disc space-y-1 ps-5 text-sm text-navy">
              <li>{t('review.bnd1')}</li>
              <li>{t('review.bnd2')}</li>
              <li>{t('review.bnd3')}</li>
            </ul>
          </Card>
          <Card className="space-y-3">
            <h2 className="font-display text-xl font-bold">{t('review.test')}</h2>
            <Btn variant="quiet" onClick={simulate} disabled={!subject} busy={!!act.pending} data-testid="button-simulate">
              <FlaskConical className="h-4 w-4" aria-hidden /> {t('review.sim')}
            </Btn>
            {!subject && <p className="text-xs text-muted-foreground">{t('review.simNeed')}</p>}
            {simResult && <p className="font-mono text-sm text-navy" data-testid="text-sim-result">{t('review.simDone', { r: simResult })}</p>}
            <ErrorBanner error={act.error} />
            <Btn variant="ghost" onClick={expireTest} disabled={!s?.authenticated} busy={busy} data-testid="button-expire-test">
              <TimerOff className="h-4 w-4" aria-hidden /> {t('review.expire')}
            </Btn>
          </Card>
        </div>
      </div>

      <ReviewQa />
      <Card>
        <h2 className="mb-1 font-display text-xl font-bold">{t('review.trans')}</h2>
        <p className="mb-3 text-sm text-muted-foreground">{t('review.transNote')}</p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {LANGS.map((l) => (
            <li key={l.code} className={cn('rounded-xl border p-2.5 text-sm', l.code === lang ? 'border-primary' : 'border-border')} lang={l.code}>
              <span className="block font-semibold text-navy">{l.native}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {l.code} · {l.code === 'ko' ? t('review.src') : t('review.mt')}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
