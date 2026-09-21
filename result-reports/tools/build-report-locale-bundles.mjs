import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const catalogPath = path.resolve(process.argv[2] || path.join(repo, 'result-reports/i18n-work/source-catalog.v7.ko.json'));
const machineDir = path.resolve(process.argv[3] || path.join(repo, 'result-reports/i18n-work/google-translations-v9'));
const docDir = path.resolve(process.argv[4] || path.join(repo, 'result-reports/i18n-work/google-translations-final'));
const repairCatalogPath = path.resolve(process.argv[5] || path.join(repo, 'result-reports/i18n-work/repair-catalog.ko.json'));
const repairDir = path.resolve(process.argv[6] || path.join(repo, 'result-reports/i18n-work/google-translations-repair'));
const dynamicCatalogPath = path.resolve(process.argv[7] || path.join(repo, 'result-reports/i18n-work/dynamic-source-catalog.ko.json'));
const dynamicDir = path.resolve(process.argv[8] || path.join(repo, 'result-reports/i18n-work/google-translations-dynamic'));
const residualCatalogPath = path.resolve(process.argv[9] || path.join(repo, 'result-reports/i18n-work/residual-source-catalog.ko.json'));
const residualDir = path.resolve(process.argv[10] || path.join(repo, 'result-reports/i18n-work/google-translations-residual'));
const dynamicBaseCatalogPath = path.join(repo, 'result-reports/i18n-work/dynamic-source-catalog.base.ko.json');
const adultDeltaCatalogPath = path.join(repo, 'result-reports/i18n-work/adult-dynamic-delta.ko.json');
const adultDeltaDir = path.join(repo, 'result-reports/i18n-work/google-translations-adult-delta');
const runtimeLabelCatalogPath = path.join(repo, 'result-reports/i18n-work/runtime-label-catalog.ko.json');
const runtimeLabelDir = path.join(repo, 'result-reports/i18n-work/google-translations-runtime-labels');
const outputDir = path.join(repo, 'result-reports', 'locales');
const locales = ['en','ja','zh','es','ru','vi','th','ar','it','az','km'];
const reports = ['kpass-child','dcas-teen','dcas-adult'];
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const dynamicCatalog = JSON.parse(fs.readFileSync(dynamicCatalogPath, 'utf8'));
const dynamicBaseCatalog = JSON.parse(fs.readFileSync(dynamicBaseCatalogPath, 'utf8'));
const adultDeltaCatalog = JSON.parse(fs.readFileSync(adultDeltaCatalogPath, 'utf8'));
const runtimeLabelCatalog = JSON.parse(fs.readFileSync(runtimeLabelCatalogPath, 'utf8'));
const residualCatalog = fs.existsSync(residualCatalogPath) ? JSON.parse(fs.readFileSync(residualCatalogPath, 'utf8')) : {items:[]};

function readLocale(locale) {
  const preferred = locale === 'en' ? path.join(docDir, `${locale}.google-raw.json`) : path.join(machineDir, `${locale}.google-raw.json`);
  if (!fs.existsSync(preferred)) throw new Error(`missing translation file: ${preferred}`);
  const result = JSON.parse(fs.readFileSync(preferred, 'utf8'));
  if (Object.keys(result.translations || {}).length !== catalog.items.length) {
    throw new Error(`${locale}: translated ${Object.keys(result.translations || {}).length}/${catalog.items.length}`);
  }
  const translations = { ...result.translations };
  if (fs.existsSync(repairCatalogPath)) {
    const repairFile = path.join(repairDir, `${locale}.google-raw.json`);
    if (!fs.existsSync(repairFile)) throw new Error(`missing repair translation file: ${repairFile}`);
    Object.assign(translations, JSON.parse(fs.readFileSync(repairFile, 'utf8')).translations || {});
  }
  const dynamicFile = path.join(dynamicDir, `${locale}.google-raw.json`);
  if (!fs.existsSync(dynamicFile)) throw new Error(`missing dynamic translation file: ${dynamicFile}`);
  const dynamic = JSON.parse(fs.readFileSync(dynamicFile, 'utf8'));
  if (Object.keys(dynamic.translations || {}).length !== dynamicBaseCatalog.items.length) {
    throw new Error(`${locale}: base dynamic translated ${Object.keys(dynamic.translations || {}).length}/${dynamicBaseCatalog.items.length}`);
  }
  Object.assign(translations, dynamic.translations);
  const adultDeltaFile = path.join(adultDeltaDir, `${locale}.google-raw.json`);
  if (!fs.existsSync(adultDeltaFile)) throw new Error(`missing adult dynamic delta translation file: ${adultDeltaFile}`);
  const adultDelta = JSON.parse(fs.readFileSync(adultDeltaFile, 'utf8'));
  if (Object.keys(adultDelta.translations || {}).length !== adultDeltaCatalog.items.length) {
    throw new Error(`${locale}: adult dynamic delta translated ${Object.keys(adultDelta.translations || {}).length}/${adultDeltaCatalog.items.length}`);
  }
  Object.assign(translations, adultDelta.translations);
  const runtimeLabelFile = path.join(runtimeLabelDir, `${locale}.google-raw.json`);
  if (!fs.existsSync(runtimeLabelFile)) throw new Error(`missing runtime label translation file: ${runtimeLabelFile}`);
  const runtimeLabels = JSON.parse(fs.readFileSync(runtimeLabelFile, 'utf8'));
  if (Object.keys(runtimeLabels.translations || {}).length !== runtimeLabelCatalog.items.length) {
    throw new Error(`${locale}: runtime labels translated ${Object.keys(runtimeLabels.translations || {}).length}/${runtimeLabelCatalog.items.length}`);
  }
  Object.assign(translations, runtimeLabels.translations);
  const unresolvedDynamic = dynamicCatalog.items.filter((item) => translations[item.key] === undefined);
  if (unresolvedDynamic.length) throw new Error(`${locale}: unresolved dynamic items ${unresolvedDynamic.length}`);
  const residualFile = path.join(residualDir, `${locale}.google-raw.json`);
  if (fs.existsSync(residualFile)) Object.assign(translations, JSON.parse(fs.readFileSync(residualFile, 'utf8')).translations || {});
  return translations;
}

function restore(item, translated) {
  let value = String(translated ?? '')
    .replace(/\s*\[\[(?:FG|FGU)_[A-Z0-9]+\]\]/g, '')
    .replace(/\s*\[\[\s*(?:FG|FGU)_[^\]]+\]\s*\]/g, '');
  item.protected.placeholders.forEach((placeholder, index) => {
    value = value.replaceAll(`__FGPH_${String(index).padStart(3, '0')}__`, placeholder);
  });
  return value;
}

fs.mkdirSync(outputDir, { recursive:true });
const localeMaps = Object.fromEntries(locales.map((locale) => [locale, readLocale(locale)]));
const repairCatalog = fs.existsSync(repairCatalogPath) ? JSON.parse(fs.readFileSync(repairCatalogPath, 'utf8')) : {items:[]};
const placeholderKeys = new Map(repairCatalog.items.filter((item) => item.contexts.includes('shared:placeholder-label')).map((item) => [item.source, item.key]));
const manifest = {
  schemaVersion:1,
  sourceLocale:'ko',
  generatedAt:new Date().toISOString(),
  provider:'google-translate',
  reviewStatus:'machine-translated',
  locales:['ko', ...locales],
  reports:{}
};

for (const report of reports) {
  const items = catalog.items.filter((item) => item.contexts.some((context) => context.startsWith(`${report}:`)))
    .concat(dynamicCatalog.items.filter((item) => item.contexts.some((context) => context.startsWith(`${report}:`))))
    .concat(runtimeLabelCatalog.items.filter((item) => item.contexts.some((context) => context.startsWith(`${report}:`))));
  const itemKeys = new Set(items.map((item) => item.key));
  for (const item of residualCatalog.items.filter((entry) => entry.contexts.some((context) => context.startsWith(`${report}:`)))) {
    if (!itemKeys.has(item.key)) { items.push(item); itemKeys.add(item.key); }
  }
  const bundle = {
    schemaVersion:1,
    reportId:report,
    sourceLocale:'ko',
    provider:'google-translate',
    reviewStatus:'machine-translated',
    localeNames:{ko:'한국어',en:'English',ja:'日本語',zh:'中文',es:'Español',ru:'Русский',vi:'Tiếng Việt',th:'ไทย',ar:'العربية',it:'Italiano',az:'Azərbaycanca',km:'ភាសាខ្មែរ'},
    locales:{}
  };
  for (const locale of locales) {
    bundle.locales[locale] = items.map((item) => ({
      key:item.key,
      source:item.source,
      target:(() => {
        let value = restore(item, localeMaps[locale][item.key]);
        for (const placeholder of item.protected.placeholders) {
          const key = placeholderKeys.get(placeholder);
          if (placeholder.startsWith('[') && key && localeMaps[locale][key] !== undefined) value = value.replaceAll(placeholder, localeMaps[locale][key]);
        }
        return value;
      })(),
      placeholders:item.protected.placeholders
    }));
  }
  const target = path.join(outputDir, `${report}.locales.js`);
  fs.writeFileSync(target, `window.__FG_REPORT_I18N__ = ${JSON.stringify(bundle)};\n`, 'utf8');
  manifest.reports[report] = {
    itemCount:items.length,
    staticItemCount:catalog.items.filter((item) => item.contexts.some((context) => context.startsWith(`${report}:`))).length,
    dynamicItemCount:dynamicCatalog.items.filter((item) => item.contexts.some((context) => context.startsWith(`${report}:`))).length,
    bundle:path.posix.join('result-reports','locales',path.basename(target))
  };
  console.log(`WROTE ${target} ITEMS ${items.length}`);
}

fs.writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`WROTE ${path.join(outputDir, 'manifest.json')}`);
