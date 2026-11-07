import { Link } from 'wouter';
import { ArrowRight, DoorOpen, RefreshCcw } from 'lucide-react';
import { useI18n } from '@/i18n';
import { safeReturn, useNav, useSession } from '@/lib/nuvia';
import { Card, PageHead } from '@/components/bits';

export default function LoginPage() {
  const { t } = useI18n();
  const { params, href } = useNav();
  const dest = safeReturn(params.get('returnTo'));
  const { data: s, isLoading } = useSession();
  return (
    <div className="mx-auto max-w-xl">
      <PageHead title={t('login.title')} sub={t('login.body')} icon={<RefreshCcw className="h-7 w-7 text-sky" aria-hidden />} />
      <Card className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('login.dest')}</p>
        <p className="break-all rounded-lg bg-muted p-3 font-mono text-sm text-navy" data-testid="text-return-to">
          {dest}
        </p>
        {!isLoading && s?.authenticated ? (
          <>
            <p className="text-sky">{t('login.valid')}</p>
            <Link href={dest} className="press tap inline-flex items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground" data-testid="link-continue">
              {t('login.continue')} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </Link>
          </>
        ) : (
          <Link href={href('/review', { returnTo: dest })} className="press tap inline-flex items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground" data-testid="link-reenter">
            <DoorOpen className="h-4 w-4" aria-hidden /> {t('login.reenter')}
          </Link>
        )}
      </Card>
    </div>
  );
}
