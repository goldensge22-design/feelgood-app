import { APPROVED_LANGUAGES, BOOT_ERROR_SOURCE, isAppLanguage, type AppLanguage } from './languages';
import buildStatus from './message-status.json';
import type { ProductMessage } from './types';
import { fetchCatalogueLanguage, type CatalogueLanguage } from './catalogue-language';
import catalogueManifest from './data/catalogue-language-manifest.json';

export interface MessagePack {
  locale: string;
  messages: Record<string, string>;
  review: { method: string; checked: number; pending: number; sourceHash: string };
  catalogue?: CatalogueLanguage;
}
const loaders = import.meta.glob('./messages/*.json', { import: 'default' }) as Record<string, () => Promise<MessagePack>>;
let active: AppLanguage = 'ko';
let pack: MessagePack | undefined;
let originals = new Set<string>();
let productValues = new Set<string>();
let productRecipes = new Map<string, ProductMessage[]>();
const unsavedOriginals = new Map<string, string>();
export const rememberOriginal = (id: string, value: string) => { unsavedOriginals.set(id, value); };
export const forgetOriginal = (id: string) => { unsavedOriginals.delete(id); };
export const isProductValue = (value: string) => productValues.has(value);
export const getOriginalTexts = (includeUnsaved = true) => [...new Set([...originals, ...(includeUnsaved ? unsavedOriginals.values() : [])])];
export const hasUnsavedOriginals = () => [...unsavedOriginals.values()].some(v => !!v.trim() && !originals.has(v));
const scaffoldHeadings = new Set(['나의 특징', '관심 계기', '탐색한 이유', '실제 경험과 배움', '학과에 관심 갖는 이유', '앞으로의 계획']);
const missing = new Set<string>();
export const runtimeLanguage = () => active;
export const currentPack = () => pack;
export const missingMessages = () => [...missing];
const status = buildStatus as { languages: Record<string, { ready: boolean; bootError?: string; retry?: string }>; keywords: Record<string, string[]> };
export const hasLanguagePack = (code: string) => (catalogueManifest.languages as string[]).includes(code) &&
  (code === 'ko' || (!!loaders[`./messages/${code}.json`] && !!status.languages[code]?.ready));
export function productKeywordIn(text: string, source: string) {
  const normalized = text.normalize('NFKC').toLowerCase();
  return (status.keywords[source] || [source]).some(v => normalized.includes(v.normalize('NFKC').toLowerCase()));
}

export async function fetchLanguage(code: AppLanguage) {
  if (code === 'ko') return { locale: code, messages: {}, review: {method:'source',checked:0,pending:0,sourceHash:''}, catalogue: await fetchCatalogueLanguage(code) };
  const load = loaders[`./messages/${code}.json`];
  if (!load) throw new Error('Language resource is not prepared');
  const [result, catalogue] = await Promise.all([load(), fetchCatalogueLanguage(code)]);
  if (result.locale !== code || !result.messages || result.review.pending) throw new Error('Language resource is incomplete');
  return {...result, catalogue};
}
export function activateLanguage(code: AppLanguage, data?: MessagePack) {
  active = code; pack = data; missing.clear();
}
export async function preloadLanguage() {
  let code: AppLanguage = 'ko';
  const url = new URL(location.href);
  const fromLink = url.searchParams.get('lang');
  try {
    const p = JSON.parse(localStorage.getItem('careerlab:language-preferences:v1') || 'null');
    if (isAppLanguage(p?.requestedLocale) && hasLanguagePack(p.requestedLocale)) code = p.requestedLocale;
  } catch { /* Browser preferences are optional, not student data. */ }
  if (fromLink && isAppLanguage(fromLink) && hasLanguagePack(fromLink)) code = fromLink;
  try {
    activateLanguage(code, await fetchLanguage(code));
    if (fromLink === code) {
      try { localStorage.setItem('careerlab:language-preferences:v1', JSON.stringify({requestedLocale:code,layoutDirection:'auto'})); } catch { /* Switching UI reports persistent preference errors separately. */ }
    }
    return true;
  } catch {
    // Never flash Korean or silently "succeed" after a saved language fails to load.
    document.documentElement.lang = code; document.documentElement.dir = languageDirection(code);
    const root = document.getElementById('root')!;
    const message = document.createElement('p');
    message.setAttribute('role','alert'); message.textContent = status.languages[code]?.bootError || BOOT_ERROR_SOURCE;
    const retry = document.createElement('button');
    retry.textContent = status.languages[code]?.retry || '다시 시도';
    retry.style.minHeight = '44px'; retry.onclick = () => location.reload();
    root.replaceChildren(message, retry);
    return false;
  }
}
const isTextKey = (key: string) => /^(name|text|note|reason|why|results|features|statement|title|purpose|artifact|did|role|fun|hard|learned|question|next|connection|futurePath|toLearn|target|problem|idea|experiment|heading|majorCompetencies|university|universityOriginal|programOriginal|country|region)$/.test(key);
function entryAt(value: unknown, key: string, entry: unknown) {
  if (Array.isArray(value) && entry && typeof entry === 'object' && 'id' in entry) return value.find(v => v?.id === (entry as { id: string }).id);
  return (value as Record<string, unknown> | undefined)?.[key];
}
function pathKey(key: string, entry: unknown) {
  return /^\d+$/.test(key) && entry && typeof entry === 'object' && 'id' in entry ? String((entry as { id: string }).id) : key;
}
export function recordAuthoredChanges(previous: unknown, next: unknown): string[] {
  const paths = new Set((previous as { authoredPaths?: string[] })?.authoredPaths || []);
  function visit(a: unknown, b: unknown, path: string) {
    if (!b || typeof b !== 'object') return;
    for (const [key, value] of Object.entries(b)) {
      const old = entryAt(a, key, value);
      const p = `${path}.${pathKey(key, value)}`;
      if (isTextKey(key) && typeof old === 'string' && typeof value === 'string' && old !== value) paths.add(p);
      else if (value && typeof value === 'object') visit(old, value, p);
    }
  }
  visit(previous, next, '');
  return [...paths];
}
export function setOriginalRecords(state: unknown, baseline: unknown, demo: boolean) {
  const protectedValues = new Set<string>();
  const products = new Set<string>();
  const recipes = new Map<string, ProductMessage[]>();
  const authored = new Set((state as { authoredPaths?: string[] })?.authoredPaths || []);
  function visit(value: unknown, base: unknown, path: string, product = false) {
    if (!value || typeof value !== 'object') return;
    const obj = value as Record<string, unknown>;
    if (obj.origin === 'example-template' && typeof obj.text === 'string' && Array.isArray(obj.displayParts)) recipes.set(obj.text, obj.displayParts as ProductMessage[]);
    if (Array.isArray(obj.preserveOriginals)) obj.preserveOriginals.forEach(v => { if (typeof v === 'string') protectedValues.add(v); });
    const productObject = obj.productProvided === true || obj.origin === 'example-template' || (typeof obj.id === 'string' && obj.id.startsWith('r-') && ['job', 'role', 'startup'].includes(String(obj.type)));
    for (const [key, v] of Object.entries(obj)) {
      const p = `${path}.${pathKey(key, v)}`;
      const b = entryAt(base, key, v);
      if (typeof v === 'string' && v.trim() && (isTextKey(key) || path.endsWith('.activityAnswers'))) {
        const isProduct = !authored.has(p) && ((demo && v === b && obj.origin !== 'manual') || productObject || (key === 'heading' && scaffoldHeadings.has(v) && !obj.headingAuthored));
        if (!isProduct) protectedValues.add(v);
        else products.add(v);
      } else if (v && typeof v === 'object') visit(v, b, p, false);
    }
  }
  visit(state, baseline, '');
  originals = protectedValues;
  productValues = products;
  productRecipes = recipes;
}

let patternsFor: MessagePack | undefined;
let patterns: { re: RegExp; segment?: RegExp; target: string; fixedLength: number }[] = [];
let fragments: string[] = [];
function prepare() {
  if (patternsFor === pack) return;
  patternsFor = pack;
  patterns = []; fragments = [];
  for (const [source, target] of Object.entries(pack?.messages || {})) {
    if (/\{\d+\}/.test(source)) {
      const chunks = source.split(/(\{\d+\})/g);
      const groups: number[] = [];
      const regex = chunks.map(c => /^\{\d+\}$/.test(c) ? (groups.push(Number(c.slice(1, -1))), '([\\s\\S]*?)') : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('');
      const fixedLength = chunks.filter(c => !/^\{\d+\}$/.test(c)).join('').length;
      if (groups.every((g, i) => g === i)) patterns.push({ re: new RegExp(`^${regex}$`), segment: fixedLength >= 8 ? new RegExp(regex, 'g') : undefined, target, fixedLength });
    } else if (/[가-힣]/.test(source) && source.length >= 2) fragments.push(source);
  }
  fragments.sort((a, b) => b.length - a.length);
  patterns.sort((a, b) => b.fixedLength - a.fixedLength);
}
/** Product text only. A missing translation is recorded for QA, never counted as translated. */
export function tx(source: string): string {
  if (!source) return source;
  const exact = pack?.messages[source] ?? pack?.catalogue?.messages[source];
  if (exact !== undefined) return exact;
  if (active !== 'ko' && /[가-힣]/.test(source)) missing.add(source);
  return source;
}
/** Render-time localization, never mutation of saved data or free-form user records. */
export function localizeValue(value: unknown, forceProduct = false): unknown {
  if (typeof value === 'number') return new Intl.NumberFormat(active).format(value);
  if (typeof value !== 'string' || !value) return value;
  const protectedValues = new Set([...originals, ...unsavedOriginals.values()]);
  if (!forceProduct && protectedValues.has(value)) return value;
  const recipe = productRecipes.get(value);
  if (recipe) return recipe.map(part => (part.separator || '') + renderProductMessage(part)).join('');
  const exact = pack?.messages[value] ?? pack?.catalogue?.messages[value];
  if (exact !== undefined) return exact;
  // Public programme provenance combines names with this explicit delimiter.
  // Exact lookups only: do not run 28k catalogue names as substring replacements
  // over students' writing, nor add them to the UI fragment matcher.
  if (value.includes(' · ')) {
    const parts = value.split(' · ');
    const translated = parts.map(p => pack?.catalogue?.messages[p] ?? p);
    if (translated.some((p, i) => p !== parts[i])) return translated.join(' · ');
  }
  if (active === 'ko') return value;
  prepare();
  const kept: string[] = [];
  let text = value;
  if (!forceProduct) for (const original of [...protectedValues].sort((a, b) => b.length - a.length)) {
    if (text.includes(original)) { const i = kept.push(original) - 1; text = text.split(original).join(`\uE000${i}\uE001`); }
  }
  const restore = (s: string) => s.replace(/\uE000(\d+)\uE001/g, (whole, i) => kept[Number(i)] ?? whole);
  const translateArgument = (v: unknown) => typeof v === 'string' && /[\uE000\uE100\uE200]/.test(v) ? v : localizeValue(v, forceProduct);
  for (const { re, target } of patterns) {
    const match = re.exec(text);
    if (match) return restore(target.replace(/\{(\d+)\}/g, (_, i) => String(translateArgument(match[Number(i) + 1]))));
  }
  const translatedSegments: string[] = [];
  for (const { segment, target } of patterns) if (segment) {
    text = text.replace(segment, (...args: unknown[]) => {
      const translated = target.replace(/\{(\d+)\}/g, (_, i) => String(translateArgument(args[Number(i) + 1])));
      const index = translatedSegments.push(translated) - 1;
      return `\uE200${index}\uE201`;
    });
  }
  // Composite labels (e.g. a list of product catalog terms). Protect user originals first.
  const replacements: string[] = [];
  for (const source of fragments) if (text.includes(source)) {
    const i = replacements.push(pack!.messages[source]) - 1;
    text = text.split(source).join(`\uE100${i}\uE101`);
  }
  text = text.replace(/\uE100(\d+)\uE101/g, (_, i) => replacements[Number(i)]);
  for (let pass=0; pass<32 && /\uE200/.test(text); pass++) text = text.replace(/\uE200(\d+)\uE201/g, (whole, i) => translatedSegments[Number(i)] ?? whole);
  text = restore(text);
  if (/[가-힣]/.test(text) && !kept.some(v => text.includes(v)) && !forceProduct) missing.add(value);
  return text;
}
export function formatMessage(source: string, values: unknown[]) {
  const template = tx(source);
  return template.replace(/\{(\d+)\}/g, (_, i) => String(localizeValue(values[Number(i)])));
}
function renderProductMessage(part: ProductMessage): string {
  const output = tx(part.source).replace(/\{(\d+)\}/g, (_, i) => {
    const v = part.values[Number(i)];
    return typeof v === 'object' ? renderProductMessage(v) : String(localizeValue(v || ''));
  });
  return /^\s/.test(part.source) && !/^\s/.test(output) ? ' ' + output : output;
}
export const languageDirection = (code: string) => APPROVED_LANGUAGES.find(l => l.code === code)?.direction || 'ltr';
