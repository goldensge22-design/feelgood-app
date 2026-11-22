import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { APPROVED_LANGUAGES, isAppLanguage } from './languages';
import { activateLanguage, fetchLanguage, languageDirection, runtimeLanguage, tx } from './i18n-runtime';

export const LANGUAGE_TARGET = 15;
export const LANGUAGE_LIST_CONFIRMED = true;
export const LANGUAGE_SLOTS = APPROVED_LANGUAGES.map((l, i) => ({
  id: `language-slot-${i + 1}`, ...l, translation: 'qa-managed', review: 'qa-managed',
}));
export const LANGUAGE_SURFACES = [
  '대시보드·메뉴', '결과지 입력·해석 확인', '관심사', '분야·직무·창업', '대학·학과·비교',
  '플래너', '경험·첨부', '진로 지도', '나의 이야기', '알림·오류', '빈 화면·도움말',
  '날짜·시간·숫자', '내보내기·인쇄',
];
export type LayoutDirection = 'auto' | 'ltr' | 'rtl';
const KEY = 'careerlab:language-preferences:v1';
interface Preferences { requestedLocale: string; layoutDirection: LayoutDirection }

export function canonicalLocale(input: string): string | null {
  try { return Intl.getCanonicalLocales(input.trim())[0] || null; } catch { return null; }
}
function loadPreferences(): Preferences {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null');
    return { requestedLocale: runtimeLanguage(),
      layoutDirection: ['auto', 'ltr', 'rtl'].includes(p?.layoutDirection) ? p.layoutDirection : 'auto' };
  } catch { return { requestedLocale: 'ko', layoutDirection: 'auto' }; }
}

interface LocaleContext {
  requestedLocale: string; effectiveLocale: string; isFallback: boolean;
  direction: 'ltr' | 'rtl'; layoutDirection: LayoutDirection; preferenceError: string;
  switching: boolean;
  requestLocale: (code: string) => boolean; setLayoutDirection: (d: LayoutDirection) => void;
  t: (source: string) => string;
  formatDate: (value: string) => string; formatDateTime: (value: string) => string;
  formatTime: (value: string) => string; formatNumber: (value: number) => string;
}
const Context = createContext<LocaleContext | null>(null);

export function LocaleProvider({ children,embeddedLocale }: { children: ReactNode;embeddedLocale?:string }) {
  const [prefs, setPrefs] = useState(loadPreferences);
  const [preferenceError, setError] = useState('');
  const [effectiveLocale, setEffective] = useState(runtimeLanguage);
  const [switching, setSwitching] = useState(false);
  const [pendingLocale, setPendingLocale] = useState('');
  const sequence = useRef(0);
  const isFallback = false;
  const direction = prefs.layoutDirection === 'auto' ? languageDirection(effectiveLocale) : prefs.layoutDirection;
  const change = useCallback((next: Preferences) => {
    setPrefs(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); setError(''); }
    catch { setError('언어 설정을 브라우저에 저장하지 못했어요. 학생 기록은 변경하지 않았어요.'); }
  }, []);
  const requestLocale = (code: string) => {
    const canonical = canonicalLocale(code);
    if (!canonical || !isAppLanguage(canonical)) return false;
    const n = ++sequence.current;
    setPendingLocale(canonical);
    setSwitching(true);
    void fetchLanguage(canonical).then(data => {
      if (n !== sequence.current) return;
      activateLanguage(canonical, data);
      const url = new URL(location.href);
      if (url.searchParams.has('lang')) {
        url.searchParams.set('lang', canonical);
        history.replaceState(history.state, '', url);
      }
      setEffective(canonical);
      change({ ...prefs, requestedLocale: canonical });
      setSwitching(false);
      setPendingLocale('');
    }).catch(() => {
      if (n !== sequence.current) return;
      setSwitching(false);
      setPendingLocale('');
      setError(tx('언어를 불러오지 못했어요. 현재 언어와 작성 중인 내용은 그대로 유지했어요.'));
    });
    return true;
  };
  useLayoutEffect(() => {
    if(embeddedLocale)return;
    document.documentElement.lang = effectiveLocale;
    document.documentElement.dir = direction;
    document.documentElement.dataset.requestedLocale = prefs.requestedLocale;
    document.title = tx('중고생용 진로 탐색 LAB');
  }, [direction, prefs.requestedLocale, effectiveLocale,embeddedLocale]);
  useLayoutEffect(()=>{
    if(!embeddedLocale||!isAppLanguage(embeddedLocale))return;
    let active=true;
    if(runtimeLanguage()!==embeddedLocale){
      void fetchLanguage(embeddedLocale).then(pack=>{
        if(active){activateLanguage(embeddedLocale,pack);setEffective(embeddedLocale);}
      }).catch(()=>{if(active)setError('이 언어의 진로 LAB 자료를 읽지 못했어요. 입력한 원문은 보존합니다.');});
    }
    return()=>{active=false;};
  },[embeddedLocale]);
  const value: LocaleContext = useMemo(() => ({
    requestedLocale: pendingLocale || prefs.requestedLocale, effectiveLocale, isFallback, direction,
    layoutDirection: prefs.layoutDirection, preferenceError, requestLocale, switching,
    setLayoutDirection: d => change({ ...prefs, layoutDirection: d }), t: tx,
    formatDate: v => {
      if (!v) return tx('날짜 미정');
      const date = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00`) : new Date(v);
      return Number.isNaN(date.getTime()) ? v : new Intl.DateTimeFormat(effectiveLocale, { dateStyle: 'medium' }).format(date);
    },
    formatDateTime: v => {
      const d = new Date(v); return Number.isNaN(d.getTime()) ? v : new Intl.DateTimeFormat(effectiveLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
    },
    formatTime: v => {
      if (!/^\d{2}:\d{2}$/.test(v)) return v;
      return new Intl.DateTimeFormat(effectiveLocale, { hour: 'numeric', minute: '2-digit' }).format(new Date(`2000-01-01T${v}:00`));
    },
    formatNumber: v => new Intl.NumberFormat(effectiveLocale).format(v),
  }), [prefs, preferenceError, change, isFallback, direction, effectiveLocale, switching, pendingLocale]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLocale() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('LocaleProvider missing');
  return ctx;
}

export function localeExportMetadata(requestedLocale: string, storyLanguage?: string) {
  return { requestedScreenLanguage: requestedLocale, displayedScreenLanguage: runtimeLanguage(),
    languageListConfirmed: true, targetLanguageCount: LANGUAGE_TARGET,
    storyWritingLanguage: storyLanguage || 'ko', userInputPolicy: 'original-preserved-no-automatic-translation',
    aiGeneration: 'existing-server-not-connected' };
}
