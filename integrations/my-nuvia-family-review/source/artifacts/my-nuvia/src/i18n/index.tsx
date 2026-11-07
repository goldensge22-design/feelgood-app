import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useSearch } from 'wouter';
import { ko, type Dict, type TKey } from './ko';
import { en } from './en';
import { ja } from './ja';
import { zhCN } from './zh-CN';
import { zhTW } from './zh-TW';
import { mn } from './mn';
import { th } from './th';
import { vi } from './vi';
import { ar } from './ar';
import { ru } from './ru';
import { km } from './km';
import { es } from './es';
import { fr } from './fr';
import { it } from './it';
import { az } from './az';

export const LANGS = [
  { code: 'ko', native: '한국어', dict: ko as Dict, locale: 'ko-KR' },
  { code: 'en', native: 'English', dict: en, locale: 'en-US' },
  { code: 'ja', native: '日本語', dict: ja, locale: 'ja-JP' },
  { code: 'zh-CN', native: '简体中文', dict: zhCN, locale: 'zh-CN' },
  { code: 'zh-TW', native: '繁體中文', dict: zhTW, locale: 'zh-TW' },
  { code: 'mn', native: 'Монгол', dict: mn, locale: 'mn-MN' },
  { code: 'th', native: 'ไทย', dict: th, locale: 'th-TH' },
  { code: 'vi', native: 'Tiếng Việt', dict: vi, locale: 'vi-VN' },
  { code: 'ar', native: 'العربية', dict: ar, locale: 'ar' },
  { code: 'ru', native: 'Русский', dict: ru, locale: 'ru-RU' },
  { code: 'km', native: 'ភាសាខ្មែរ', dict: km, locale: 'km-KH' },
  { code: 'es', native: 'Español', dict: es, locale: 'es-ES' },
  { code: 'fr', native: 'Français', dict: fr, locale: 'fr-FR' },
  { code: 'it', native: 'Italiano', dict: it, locale: 'it-IT' },
  { code: 'az', native: 'Azərbaycan', dict: az, locale: 'az-AZ' },
] as const;
export type LangCode = (typeof LANGS)[number]['code'];

const isLang = (v: string | null): v is LangCode => !!v && LANGS.some((l) => l.code === v);

type Ctx = {
  lang: LangCode;
  locale: string;
  enRegion: 'en-US' | 'en-GB';
  t: (k: TKey, vars?: Record<string, string | number>) => string;
  setLang: (l: LangCode) => void;
  setEnRegion: (r: 'en-US' | 'en-GB') => void;
  fmtDate: (iso: string | null | undefined, withTime?: boolean) => string;
};
const I18n = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const search = useSearch();
  const [loc, setLoc] = useLocation();
  const params = new URLSearchParams(search);
  const q = params.get('lang');
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('nuvia.lang') : null;
  const lang: LangCode = isLang(q) ? q : isLang(stored) ? stored : 'ko';
  const [enRegion, setRegionState] = useState<'en-US' | 'en-GB'>(() => (typeof localStorage !== 'undefined' && localStorage.getItem('nuvia.enRegion') === 'en-GB' ? 'en-GB' : 'en-US'));
  const meta = LANGS.find((l) => l.code === lang)!;
  const locale = lang === 'en' ? enRegion : meta.locale;

  useLayoutEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const setLang = useCallback(
    (l: LangCode) => {
      localStorage.setItem('nuvia.lang', l);
      document.documentElement.lang = l;
      document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
      const p = new URLSearchParams(window.location.search);
      p.set('lang', l);
      setLoc(`${loc}?${p.toString()}`, { replace: true });
    },
    [loc, setLoc],
  );
  const setEnRegion = useCallback(
    (r: 'en-US' | 'en-GB') => {
      localStorage.setItem('nuvia.enRegion', r);
      setRegionState(r);
    },
    [],
  );

  const value = useMemo<Ctx>(() => {
    const dict = meta.dict;
    const t = (k: TKey, vars?: Record<string, string | number>) => {
      let s: string = dict[k];
      if (vars) for (const [a, b] of Object.entries(vars)) s = s.split(`{${a}}`).join(String(b));
      return s;
    };
    const fmtDate = (iso: string | null | undefined, withTime = false) => {
      if (!iso) return '';
      const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return new Intl.DateTimeFormat(locale, withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(d);
    };
    return { lang, locale, enRegion, t, setLang, setEnRegion, fmtDate };
  }, [lang, locale, enRegion, meta, setLang, setEnRegion]);

  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

export function useI18n() {
  const c = useContext(I18n);
  if (!c) throw new Error('I18nProvider missing');
  return c;
}
export type { TKey };
