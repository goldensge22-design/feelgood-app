import { useI18n } from '@/i18n';
import { PageHead } from '@/components/bits';
import { FamilyGate, WeeklyPanel } from '@/components/family';

export default function WeeklyPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title={t('weekly.title')} sub={t('weekly.sub')} />
      <FamilyGate>{(ctx) => <WeeklyPanel ctx={ctx} />}</FamilyGate>
    </div>
  );
}
