import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { KEYS } from '@/lib/career';
import { MESSAGES, PARTIAL } from '@/lib/messages';
import { PROV_MESSAGES, PROV_PARTIAL } from '@/lib/provenance-messages';
import { clientStorage } from '@/lib/public-demo';

export const LOCALES = [
  { id: 'ko', name: '한국어' },
  { id: 'en', name: 'English' },
  { id: 'ja', name: '日本語' },
  { id: 'zh-CN', name: '简体中文' },
  { id: 'zh-TW', name: '繁體中文' },
  { id: 'mn', name: 'Монгол' },
  { id: 'th', name: 'ไทย' },
  { id: 'vi', name: 'Tiếng Việt' },
  { id: 'ar', name: 'العربية' },
  { id: 'ru', name: 'Русский' },
  { id: 'km', name: 'ខ្មែរ' },
  { id: 'es', name: 'Español' },
  { id: 'fr', name: 'Français' },
  { id: 'it', name: 'Italiano' },
  { id: 'az', name: 'Azərbaycan' },
] as const;

export type LocaleId = (typeof LOCALES)[number]['id'];

/** Internal translation review metadata. Only Korean is source text; everything else is an unreviewed machine draft. */
const REVIEW: Record<LocaleId, 'source' | 'machine_draft'> = {
  ko: 'source', en: 'machine_draft', ja: 'machine_draft', 'zh-CN': 'machine_draft', 'zh-TW': 'machine_draft',
  mn: 'machine_draft', th: 'machine_draft', vi: 'machine_draft', ar: 'machine_draft', ru: 'machine_draft',
  km: 'machine_draft', es: 'machine_draft', fr: 'machine_draft', it: 'machine_draft', az: 'machine_draft',
};

const ALIASES: Record<string, LocaleId> = {
  zh: 'zh-CN', 'zh-hans': 'zh-CN', 'zh-cn': 'zh-CN', 'zh-sg': 'zh-CN', 'zh-hans-cn': 'zh-CN',
  'zh-hant': 'zh-TW', 'zh-tw': 'zh-TW', 'zh-hk': 'zh-TW', 'zh-mo': 'zh-TW', 'zh-hant-tw': 'zh-TW',
};

export function resolveLocale(input: string | null | undefined): LocaleId | null {
  if (!input) return null;
  const low = input.trim().replace(/_/g, '-').toLowerCase();
  if (ALIASES[low]) return ALIASES[low];
  const exact = LOCALES.find((l) => l.id.toLowerCase() === low);
  if (exact) return exact.id;
  if (low.startsWith('zh-')) return /hant|tw|hk|mo/.test(low) ? 'zh-TW' : 'zh-CN';
  const base = low.split('-')[0];
  const b = LOCALES.find((l) => l.id === base);
  return b ? b.id : null;
}

type Vars = Record<string, string | number>;
interface I18nCtx {
  locale: LocaleId;
  localeName: string;
  setLocale: (l: LocaleId) => void;
  t: (key: string, vars?: Vars) => string;
  dir: 'ltr' | 'rtl';
  reviewed: boolean;
  coverage: number;
}

const Ctx = createContext<I18nCtx | null>(null);
const TOTAL = Object.keys(MESSAGES).length;

function initialLocale(): LocaleId {
  try {
    const requested = resolveLocale(new URLSearchParams(window.location.search).get('lang'));
    if (requested) return requested;
    const target = clientStorage(KEYS.locale);
    const stored = target.storage.getItem(target.key);
    return resolveLocale(stored) ?? 'ko';
  } catch {
    return 'ko';
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleId>(initialLocale);
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const setLocale = useCallback((l: LocaleId) => {
    try { const target = clientStorage(KEYS.locale); target.storage.setItem(target.key, l); } catch { /* ignore */ }
    // Keep deep-link parameters and hash, but do not let an old ?lang override
    // the user's newly selected language on refresh.
    const url = new URL(window.location.href);
    url.searchParams.set('lang', l);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    setLocaleState(l);
  }, []);

  const t = useCallback(
    (key: string, vars?: Vars) => {
      const entry = MESSAGES[key] ?? PROV_MESSAGES[key];
      let s: string;
      if (locale === 'ko') s = entry?.[0] ?? key;
      else if (locale === 'en') s = entry?.[1] ?? key;
      else s = PARTIAL[locale]?.[key] ?? PROV_PARTIAL[locale]?.[key] ?? entry?.[1] ?? key; // never Korean fallback
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
      return s;
    },
    [locale],
  );

  const coverage = useMemo(() => {
    if (locale === 'ko' || locale === 'en') return 1;
    const own = PARTIAL[locale] ?? {};
    return Object.keys(own).filter((k) => k in MESSAGES).length / TOTAL;
  }, [locale]);

  const value = useMemo<I18nCtx>(
    () => ({
      locale,
      localeName: LOCALES.find((l) => l.id === locale)?.name ?? locale,
      setLocale,
      t,
      dir,
      reviewed: REVIEW[locale] === 'source',
      coverage,
    }),
    [locale, setLocale, t, dir, coverage],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error('I18nProvider missing');
  return c;
}
