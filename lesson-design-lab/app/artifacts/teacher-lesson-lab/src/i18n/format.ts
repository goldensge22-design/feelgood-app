import { txLang } from './tx';

export const DISPLAY_TIME_ZONE = 'UTC';
const locale = (lang: string) => lang === 'ar' ? 'ar-u-nu-arab' : lang === 'zh-CN' ? 'zh-Hans' : lang === 'zh-TW' ? 'zh-Hant' : lang;
/** Display only: never convert or write the original date/input value. */
export function formatDateTime(value: string, lang = txLang()): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return `${new Intl.DateTimeFormat(locale(lang), { dateStyle: 'medium', timeStyle: 'short', timeZone: DISPLAY_TIME_ZONE }).format(date)} · UTC`;
}
export function formatDate(value: string, lang = txLang()): string {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value);
  return Number.isFinite(date.getTime()) ? `${new Intl.DateTimeFormat(locale(lang), { dateStyle: 'medium', timeZone: DISPLAY_TIME_ZONE }).format(date)} · UTC` : value;
}
export const formatNumber = (n: number, lang = txLang()) => new Intl.NumberFormat(locale(lang)).format(n);
/** Word-aware wrapping for print pagination. Never insert a newline inside a word or combining cluster. */
export function printLines(text: string, columns = 45, lang = txLang()): string[] {
  const segmenter = new Intl.Segmenter(locale(lang), { granularity: 'word' });
  return text.split('\n').flatMap((line) => {
    if (!line) return [''];
    const out: string[] = []; let row = '';
    for (const { segment } of segmenter.segment(line)) {
      if (row && Array.from(row + segment).length > columns && segment.trim()) { out.push(row.trimEnd()); row = ''; }
      row += segment;
    }
    if (row) out.push(row.trimEnd());
    return out.length ? out : [''];
  });
}
