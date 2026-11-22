export const APPROVED_LANGUAGES = [
  { code: 'ko', name: '한국어', direction: 'ltr' },
  { code: 'en', name: 'English', direction: 'ltr' },
  { code: 'ja', name: '日本語', direction: 'ltr' },
  { code: 'zh-CN', name: '简体中文', direction: 'ltr' },
  { code: 'zh-TW', name: '繁體中文', direction: 'ltr' },
  { code: 'mn', name: 'Монгол', direction: 'ltr' },
  { code: 'th', name: 'ไทย', direction: 'ltr' },
  { code: 'vi', name: 'Tiếng Việt', direction: 'ltr' },
  { code: 'ar', name: 'العربية', direction: 'rtl' },
  { code: 'ru', name: 'Русский', direction: 'ltr' },
  { code: 'km', name: 'ខ្មែរ', direction: 'ltr' },
  { code: 'es', name: 'Español', direction: 'ltr' },
  { code: 'fr', name: 'Français', direction: 'ltr' },
  { code: 'it', name: 'Italiano', direction: 'ltr' },
  { code: 'az', name: 'Azərbaycanca', direction: 'ltr' },
] as const;
export type AppLanguage = typeof APPROVED_LANGUAGES[number]['code'];
export const isAppLanguage = (code: string): code is AppLanguage => APPROVED_LANGUAGES.some(l => l.code === code);
export const BOOT_ERROR_SOURCE = '화면 언어 자료를 불러오지 못했어요. 기록은 변경되지 않았어요. 다시 시도해 주세요.';
export const BOOT_RETRY_SOURCE = '다시 시도';
