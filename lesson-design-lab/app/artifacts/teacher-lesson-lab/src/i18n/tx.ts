// Authored-string lookup. Dictionaries are flat Record<string,string> keyed by the EXACT Korean source string.
//   src/i18n/generated-ui/{lang}.json   – static UI text (keys listed in src/i18n/ui-source-keys.json)
//   src/i18n/generated-jobs/{lang}.json – generated card text (keys listed in src/i18n/job-source-keys.json)
// Template keys use positional placeholders: "학생 {0}명" -> "{0} students". Placeholders must be kept.
// Missing keys fall back to Korean and are recorded in missing() so the UI can disclose them honestly.
const UI = import.meta.glob<Record<string, string>>('./generated-ui/*.json', { eager: true, import: 'default' });
const JOBS = import.meta.glob<Record<string, string>>('./generated-jobs/*.json', { eager: true, import: 'default' });
const pick = (m: Record<string, Record<string, string>>) => Object.fromEntries(Object.entries(m).map(([p, d]) => [p.replace(/^.*\/(.+)\.json$/, '$1'), d]));
const UID = pick(UI); const JD = pick(JOBS);
export const authoredDictionaries = () => ({ ui: UID, jobs: JD });

let current = 'ko';
export const setTxLang = (l: string) => { current = l; };
export const txLang = () => current;

function fill(s: string, a: unknown[], lang: string): string {
  // English count agreement belongs to the template, not to student-entered text.
  if (lang === 'en') {
    const singular: Record<string,string> = { students:'student', people:'person', persons:'person', groups:'group', cards:'card', items:'item', fields:'field', pages:'page', sheets:'sheet', counselors:'counselor', facts:'fact', copies:'copy', versions:'version', sessions:'session',worksheets:'worksheet',activities:'activity',minutes:'minute',hours:'hour',times:'time',attempts:'attempt',bookings:'booking',records:'record',outputs:'output',questions:'question',lessons:'lesson',participants:'participant',teams:'team',steps:'step',actions:'action',requirements:'requirement',sources:'source',messages:'message',days:'day',weeks:'week',months:'month',targets:'target',supports:'support' };
    s=s.replace(/\b([A-Za-z]+)\(s\)/g,(_,word)=>word.toLowerCase()==='person'?'people':word+'s');
    s = s.replace(/(\{(\d+)\})(\s+(?:(?:virtual|dedicated|draft|target|confirmed|personal|individual|related|example|actual|participating)\s+)*)([A-Za-z]+)\b/gi,
      (all, slot, i, space, noun) => a[+i] === 1 && singular[noun.toLowerCase()] ? `${slot}${space}${singular[noun.toLowerCase()]}` : all);
  }
  return a.length ? s.replace(/\{(\d+)\}/g, (m, i) => a[+i] !== undefined ? typeof a[+i] === 'number' ? new Intl.NumberFormat(lang==='ar'?'ar-u-nu-arab':lang).format(a[+i] as number) : String(a[+i]) : m) : s;
}
const miss = new Set<string>();
export const missing = () => miss;

/** exact lookup in UI dictionary, then job dictionary */
export function tx(lang: string, source: string, ...args: unknown[]): string {
  if (lang === 'ko' || !source) return fill(source, args, lang);
  const v = UID[lang]?.[source] ?? JD[lang]?.[source];
  if (v == null) { miss.add(source); return fill(source, args, lang); }
  return fill(v, args, lang);
}
/** has an exact translation (or lang is ko) */
export const hasTx = (lang: string, source: string) => lang === 'ko' || !source || UID[lang]?.[source] != null || JD[lang]?.[source] != null;
/** static UI text in the current interface language (tree remounts on language change) */
export const T = (source: string, ...args: unknown[]) => tx(current, source, ...args);
export const uiCoverage = (lang: string) => ({ ui: Object.keys(UID[lang] ?? {}).length, jobs: Object.keys(JD[lang] ?? {}).length });
