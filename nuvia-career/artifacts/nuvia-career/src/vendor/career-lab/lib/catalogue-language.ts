// Exact public-data translations are kept separate from compositional UI text.
// They never enter, mutate or translate student-authored records.
import manifest from './data/catalogue-language-manifest.json';
export interface CatalogueLanguage {
  locale: string;
  sourceHash: string;
  messages: Record<string, string>;
}
const pending = new Map<string, Promise<CatalogueLanguage>>();
export function fetchCatalogueLanguage(locale: string): Promise<CatalogueLanguage> {
  let request = pending.get(locale);
  if (!request) {
    request = (async () => {
      const revision=(manifest as {languageHashes?:Record<string,string>}).languageHashes?.[locale]||manifest.sourceHash;
      const r = await fetch(`${import.meta.env.BASE_URL}career-lab-original/data/locales/${locale}.json.gz?v=${revision}`);
      if (!r.ok) throw new Error('Catalogue language unavailable');
      const bytes = new Uint8Array(await r.arrayBuffer());
      const data = bytes[0] === 31 && bytes[1] === 139
        ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json()
        : JSON.parse(new TextDecoder().decode(bytes));
      if (data.locale !== locale || data.sourceHash !== manifest.sourceHash || !data.messages ||
        Object.keys(data.messages).length !== manifest.sourceCount) throw new Error('Invalid catalogue language');
      return data as CatalogueLanguage;
    })().catch(e => { pending.delete(locale); throw e; });
    pending.set(locale, request);
  }
  return request;
}
