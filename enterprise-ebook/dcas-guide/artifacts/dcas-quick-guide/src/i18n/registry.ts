import type { LocaleEntry, Pack } from './types';
import localesJson from './locales.json';
import config from './guide-config.json';

export const LOCALES = localesJson as LocaleEntry[];
export const DEFAULT_LOCALE = 'ko';
export const CHAPTER_HASHES = config.chapterHashes as string[][];

const loaders = import.meta.glob<{ default: Pack }>('./packs/*.json');

export function findLocale(code: string | null | undefined): LocaleEntry | undefined {
  if (!code) return undefined;
  return LOCALES.find((l) => l.code === code && l.status !== 'incomplete');
}

/** Strict equal-shape check against the Korean source. */
export function sameShape(src: unknown, other: unknown): boolean {
  if (typeof src === 'string') return typeof other === 'string' && other.trim().length > 0;
  if (Array.isArray(src)) {
    return Array.isArray(other) && other.length === src.length && src.every((v, i) => sameShape(v, other[i]));
  }
  if (src && typeof src === 'object') {
    if (!other || typeof other !== 'object' || Array.isArray(other)) return false;
    const a = Object.keys(src).sort();
    const b = Object.keys(other).sort();
    if (a.join('|') !== b.join('|')) return false;
    return a.every((k) => sameShape((src as Record<string, unknown>)[k], (other as Record<string, unknown>)[k]));
  }
  return false;
}

const cache = new Map<string, Pack>();

async function rawLoad(code: string): Promise<Pack> {
  const hit = cache.get(code);
  if (hit) return hit;
  const loader = loaders[`./packs/${code}.json`];
  if (!loader) throw new Error(`missing pack ${code}`);
  const mod = await loader();
  cache.set(code, mod.default);
  return mod.default;
}

/** Loads a full pack. Rejects instead of silently falling back to Korean. */
export async function loadPack(code: string): Promise<Pack> {
  if (!findLocale(code)) throw new Error(`unavailable locale ${code}`);
  const [source, pack] = await Promise.all([rawLoad(DEFAULT_LOCALE), rawLoad(code)]);
  if (!sameShape(source, pack)) throw new Error(`pack shape mismatch ${code}`);
  return pack;
}

export function demoUrl(lang: string, hash: string): string {
  const u = new URL(config.demoBase);
  u.searchParams.set('lang', lang);
  u.searchParams.set('v', config.demoVersion);
  u.hash = hash;
  return u.toString();
}
