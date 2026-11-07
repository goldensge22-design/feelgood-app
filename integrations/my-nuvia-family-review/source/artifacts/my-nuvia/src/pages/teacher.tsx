import { Link } from 'wouter';
import { GraduationCap, ShieldAlert } from 'lucide-react';
import { getGetNuviaTeacherQueryKey, useGetNuviaTeacher } from '@workspace/api-client-react';
import { useI18n, type TKey } from '@/i18n';
import { pickSubject, toApiErr, useNav, useSession } from '@/lib/nuvia';
import { Card, ErrorBanner, PageHead } from '@/components/bits';
import { PageSkel } from '@/components/family';
import { LangSelect } from '@/components/shell';

export default function TeacherPage() {
  const { t, fmtDate } = useI18n();
  const { href, full, params, setParam } = useNav();
  const sq = useSession();
  const s = sq.data;
  const isTeacher = !!s?.authenticated && s.role === 'teacher';
  const subj = isTeacher ? pickSubject(s, params.get('child')) : null;
  const id = subj?.id ?? '';
  const tq = useGetNuviaTeacher(id, { query: { enabled: isTeacher && !!subj, queryKey: getGetNuviaTeacherQueryKey(id), retry: false } });

  return (
    <div className="min-h-[100dvh] bg-[hsl(214_40%_96%)]">
      <header className="border-b border-border bg-navy text-background">
        <div dir="ltr" className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <GraduationCap className="h-6 w-6" aria-hidden />
          <span className="font-display text-lg font-bold text-background">MY NUVIA · {t('teacher.title')}</span>
          <div className="ms-auto text-navy">
            <LangSelect />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-4 py-8 pb-safe sm:px-6">
        {sq.isLoading ? (
          <PageSkel />
        ) : !isTeacher ? (
          <Card className="mx-auto max-w-xl text-center" data-testid="text-teacher-refuse">
            <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-primary" aria-hidden />
            <p className="text-navy">{t('teacher.refuse')}</p>
            <Link href={href('/review', { returnTo: full })} className="tap mt-4 inline-flex items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground" data-testid="link-teacher-review">
              {t('nav.review')}
            </Link>
          </Card>
        ) : (
          <>
            <PageHead title={t('teacher.title')} sub={t('teacher.sub')} />
            {s.subjects.length > 1 && (
              <select value={id} onChange={(e) => setParam('child', e.target.value)} className="tap mb-4 rounded-xl border border-input bg-card px-3" aria-label={t('acct.subject')}>
                {s.subjects.map((x) => (
                  <option key={x.id} value={x.id}>
                    {t(`age.${x.ageBand}` as TKey)}
                  </option>
                ))}
              </select>
            )}
            {!subj && (
              <Card role="alert" data-testid="status-subject-forbidden" className="space-y-4">
                <p>{t('err.subject')}</p>
                <Link href={href('/teacher', { child: s.subjects[0]?.id ?? '' })} className="tap inline-flex items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground" data-testid="link-allowed-subject">
                  {t('err.subjectCta')}
                </Link>
              </Card>
            )}
            {tq.isLoading && <PageSkel />}
            {tq.isError && <ErrorBanner error={toApiErr(tq.error)} onRetry={() => tq.refetch()} />}
            {tq.data && (
              <>
                <p className="mb-4 text-sm text-muted-foreground">{t(`age.${tq.data.subject.ageBand}` as TKey)}</p>
                {tq.data.records.length === 0 ? (
                  <Card className="text-center text-muted-foreground">{t('teacher.empty')}</Card>
                ) : (
                  <ul className="grid gap-4 md:grid-cols-2">
                    {tq.data.records.map((r) => (
                      <li key={r.id}>
                        <Card data-testid={`card-teacher-record-${r.id}`}>
                          <p className="text-xs text-muted-foreground">
                            {t(`kind.${r.kind}` as TKey)} · {fmtDate(r.date)}
                          </p>
                          <h3 data-user-content translate="no" className="mt-1 font-display text-lg font-bold">{r.title}</h3>
                          <dl className="mt-2 space-y-1 text-sm">
                            {(['action', 'difficulty', 'change', 'result', 'learned'] as const).map((k) =>
                              r[k] ? (
                                <div key={k}>
                                  <dt className="inline font-semibold text-navy">{t(`f.${k}`)}: </dt>
                                  <dd data-user-content translate="no" className="inline">{r[k]}</dd>
                                </div>
                              ) : null,
                            )}
                          </dl>
                        </Card>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
