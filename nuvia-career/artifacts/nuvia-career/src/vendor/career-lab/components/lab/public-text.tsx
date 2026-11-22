import { useLocale } from '@/vendor/career-lab/lib/locale';

/** Public source facts only. Never use this for student-authored text. */
export function PublicText({text, sourceLanguage, original = false}: {
  text: string; sourceLanguage?: string; original?: boolean;
}) {
  const {t, effectiveLocale} = useLocale();
  const translated = t(text);
  return <span data-public-text>
    <bdi lang={effectiveLocale} data-public-translation>{translated}</bdi>
    {original && translated !== text && <span className="block break-words text-xs font-normal text-muted-foreground">
      <bdi lang={sourceLanguage} data-i18n-original>{text}</bdi>
    </span>}
  </span>;
}
