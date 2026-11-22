import { Languages, Loader2 } from 'lucide-react';
import { useLocale } from '@/vendor/career-lab/lib/locale';
import { APPROVED_LANGUAGES } from '@/vendor/career-lab/lib/languages';
import { hasLanguagePack } from '@/vendor/career-lab/lib/i18n-runtime';
import { useLab } from '@/vendor/career-lab/lib/store';
import { Panel } from '@/vendor/career-lab/components/lab/ui';
import { cn } from '@/vendor/career-lab/lib/utils';
import type { ReactNode } from 'react';

const nameOf = (code: string) => APPROVED_LANGUAGES.find(l => l.code === code)?.name || code;

function LanguageSelect({ testId, className }: { testId?: string; className?: string }) {
  const { requestedLocale, effectiveLocale, switching, requestLocale, preferenceError, t } = useLocale();
  const pending = switching;
  const label = t('화면 언어 선택');
  return (
    <div className={cn('flex flex-col items-end gap-1', className)}>
      <label className="relative inline-flex min-h-[44px] items-center gap-2 rounded-full border border-primary/30 bg-background/90 pl-3 pr-2 text-sm shadow-sm focus-within:ring-2 focus-within:ring-primary" title={label}>
        {pending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden /> : <Languages className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
        <span className="sr-only">{label}</span>
        <span className="sr-only" data-testid={testId === 'select-screen-language' ? 'status-language' : undefined}><bdi data-i18n-original={nameOf(effectiveLocale)}>{nameOf(effectiveLocale)}</bdi></span>
        <select
          value={effectiveLocale}
          onChange={e => requestLocale(e.target.value)}
          aria-label={label}
          aria-busy={pending || undefined}
          className="min-h-[44px] max-w-[11rem] cursor-pointer appearance-none bg-transparent pr-1 font-semibold outline-none"
          data-testid={testId}
        >
          {APPROVED_LANGUAGES.map(l => {
            const ready = hasLanguagePack(l.code);
            return (
              <option key={l.code} value={l.code} disabled={!ready} lang={l.code} dir={l.direction} data-i18n-original={l.name}>
                {l.name}{ready ? '' : ` (${t('준비 중')})`}
              </option>
            );
          })}
        </select>
      </label>
      {pending && <p className="text-[11px] text-muted-foreground" role="status"><bdi data-i18n-original={nameOf(requestedLocale)}>{nameOf(requestedLocale)}</bdi> {t('불러오는 중 · 준비되면 바뀌어요')}</p>}
      {preferenceError && <p className="max-w-[16rem] text-right text-[11px] text-destructive" role="alert" data-testid="text-locale-error">{t(preferenceError)}</p>}
    </div>
  );
}

/** Permanent, always-visible screen language selector. */
export function LanguageStatus({ className }: { className?: string }) {
  return <LanguageSelect testId="select-screen-language" className={className} />;
}
/** Inside a focus-trapped form: language changes must not require closing/discarding it. */
export function DialogLanguageHeader({ children }: { children: ReactNode }) {
  return <div className="space-y-3">
    <div dir="ltr" className="no-print flex justify-end"><LanguageSelect testId="select-dialog-language" /></div>
    <div className="flex flex-col space-y-1.5 text-start">{children}</div>
  </div>;
}

export function LanguageSettings() {
  const { effectiveLocale, t } = useLocale();
  const { state: s } = useLab();
  const story = s.story.writingLanguage || 'ko';
  const rows = [
    [t('화면 언어'), <bdi key="a" data-i18n-original={nameOf(effectiveLocale)}>{nameOf(effectiveLocale)}</bdi>, t('화면의 안내·제품 예시·학과 설명에 적용돼요. 공식 원문과 직접 쓴 기록은 따로 보존해요. 화면 오른쪽 위에서 바꿀 수 있어요.')],
    [t('자료 언어'), t('원문 그대로'), t('공식 자료는 원래 언어로 보여 주고 번역하지 않아요.')],
    [t('수업 언어'), t('프로그램별 확인값'), t('확인되지 않은 경우 미확인으로 표시해요.')],
    [t('이야기 작성 언어'), <bdi key="b" data-i18n-original={nameOf(story)}>{nameOf(story)}</bdi>, t('자동 번역하지 않아요.')],
  ] as const;
  return (
    <Panel title={t('언어')} hint={t('화면 언어를 바꿔도 학생이 직접 쓴 내용은 원문 그대로 남아요.')}>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 p-3">
          <p className="font-medium">{t('화면 언어')}</p>
          <LanguageSelect />
        </div>
        <dl className="grid gap-2 sm:grid-cols-2">
          {rows.map(([k, v, d], i) => (
            <div key={i} className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="font-semibold">{v}</dd>
              <dd className="mt-1 text-xs text-muted-foreground">{d}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">{t('강점, 관심사, 회고, 이야기처럼 직접 입력한 기록과 작성 중인 입력은 번역되거나 바뀌지 않아요.')}</p>
      </div>
    </Panel>
  );
}
