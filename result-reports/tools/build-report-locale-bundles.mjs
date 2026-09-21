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
const kpassConsistencyCatalogPath = path.join(repo, 'result-reports/i18n-work/kpass-consistency-delta.ko.json');
const kpassConsistencyDir = path.join(repo, 'result-reports/i18n-work/google-translations-kpass-consistency');
const kpassBalancedLowCatalogPath = path.join(repo, 'result-reports/i18n-work/kpass-balanced-low-delta.ko.json');
const kpassBalancedLowDir = path.join(repo, 'result-reports/i18n-work/google-translations-kpass-balanced-low');
const kpassFullScaleCatalogPath = path.join(repo, 'result-reports/i18n-work/kpass-fullscale-delta.ko.json');
const kpassFullScaleDir = path.join(repo, 'result-reports/i18n-work/google-translations-kpass-fullscale');
const kpassMnCatalogPath = path.join(repo, 'result-reports/i18n-work/kpass-mn-catalog.ko.json');
const kpassMnTranslationPath = path.join(repo, 'result-reports/i18n-work/google-translations-kpass-mn/mn.google-raw.json');
const adultAviationCatalogPath = path.join(repo, 'result-reports/i18n-work/adult-aviation-delta.ko.json');
const adultAviationDir = path.join(repo, 'result-reports/i18n-work/google-translations-adult-aviation');
const adultAviationFixCatalogPath = path.join(repo, 'result-reports/i18n-work/adult-aviation-fix-delta.ko.json');
const adultAviationFixDir = path.join(repo, 'result-reports/i18n-work/google-translations-adult-aviation-fix');
const outputDir = path.join(repo, 'result-reports', 'locales');
const locales = ['en','ja','zh','es','ru','vi','th','ar','it','az','km'];
const reports = ['kpass-child','dcas-teen','dcas-adult'];
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const dynamicCatalog = JSON.parse(fs.readFileSync(dynamicCatalogPath, 'utf8'));
const dynamicBaseCatalog = JSON.parse(fs.readFileSync(dynamicBaseCatalogPath, 'utf8'));
const adultDeltaCatalog = JSON.parse(fs.readFileSync(adultDeltaCatalogPath, 'utf8'));
const runtimeLabelCatalog = JSON.parse(fs.readFileSync(runtimeLabelCatalogPath, 'utf8'));
const kpassConsistencyCatalog = JSON.parse(fs.readFileSync(kpassConsistencyCatalogPath, 'utf8'));
const kpassBalancedLowCatalog = JSON.parse(fs.readFileSync(kpassBalancedLowCatalogPath, 'utf8'));
const kpassFullScaleCatalog = JSON.parse(fs.readFileSync(kpassFullScaleCatalogPath, 'utf8'));
const kpassMnCatalog = JSON.parse(fs.readFileSync(kpassMnCatalogPath, 'utf8'));
const kpassMnResult = JSON.parse(fs.readFileSync(kpassMnTranslationPath, 'utf8'));
if (Object.keys(kpassMnResult.translations || {}).length !== kpassMnCatalog.items.length) {
  throw new Error(`mn: K-PASS translated ${Object.keys(kpassMnResult.translations || {}).length}/${kpassMnCatalog.items.length}`);
}
const kpassMnTranslations = kpassMnResult.translations;
const adultAviationCatalog = JSON.parse(fs.readFileSync(adultAviationCatalogPath, 'utf8'));
const adultAviationFixCatalog = JSON.parse(fs.readFileSync(adultAviationFixCatalogPath, 'utf8'));
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
  const kpassConsistencyFile = path.join(kpassConsistencyDir, `${locale}.google-raw.json`);
  if (!fs.existsSync(kpassConsistencyFile)) throw new Error(`missing K-PASS consistency translation file: ${kpassConsistencyFile}`);
  const kpassConsistency = JSON.parse(fs.readFileSync(kpassConsistencyFile, 'utf8'));
  if (Object.keys(kpassConsistency.translations || {}).length !== kpassConsistencyCatalog.items.length) {
    throw new Error(`${locale}: K-PASS consistency translated ${Object.keys(kpassConsistency.translations || {}).length}/${kpassConsistencyCatalog.items.length}`);
  }
  Object.assign(translations, kpassConsistency.translations);
  const kpassBalancedLowFile = path.join(kpassBalancedLowDir, `${locale}.google-raw.json`);
  if (!fs.existsSync(kpassBalancedLowFile)) throw new Error(`missing K-PASS balanced-low translation file: ${kpassBalancedLowFile}`);
  const kpassBalancedLow = JSON.parse(fs.readFileSync(kpassBalancedLowFile, 'utf8'));
  if (Object.keys(kpassBalancedLow.translations || {}).length !== kpassBalancedLowCatalog.items.length) {
    throw new Error(`${locale}: K-PASS balanced-low translated ${Object.keys(kpassBalancedLow.translations || {}).length}/${kpassBalancedLowCatalog.items.length}`);
  }
  Object.assign(translations, kpassBalancedLow.translations);
  const kpassFullScaleFile = path.join(kpassFullScaleDir, `${locale}.google-raw.json`);
  if (!fs.existsSync(kpassFullScaleFile)) throw new Error(`missing K-PASS full-scale translation file: ${kpassFullScaleFile}`);
  const kpassFullScale = JSON.parse(fs.readFileSync(kpassFullScaleFile, 'utf8'));
  if (Object.keys(kpassFullScale.translations || {}).length !== kpassFullScaleCatalog.items.length) {
    throw new Error(`${locale}: K-PASS full-scale translated ${Object.keys(kpassFullScale.translations || {}).length}/${kpassFullScaleCatalog.items.length}`);
  }
  Object.assign(translations, kpassFullScale.translations);
  const adultAviationFile = path.join(adultAviationDir, `${locale}.google-raw.json`);
  if (!fs.existsSync(adultAviationFile)) throw new Error(`missing adult aviation translation file: ${adultAviationFile}`);
  const adultAviation = JSON.parse(fs.readFileSync(adultAviationFile, 'utf8'));
  if (Object.keys(adultAviation.translations || {}).length !== adultAviationCatalog.items.length) {
    throw new Error(`${locale}: adult aviation translated ${Object.keys(adultAviation.translations || {}).length}/${adultAviationCatalog.items.length}`);
  }
  Object.assign(translations, adultAviation.translations);
  const adultAviationFixFile = path.join(adultAviationFixDir, `${locale}.google-raw.json`);
  if (!fs.existsSync(adultAviationFixFile)) throw new Error(`missing adult aviation fix translation file: ${adultAviationFixFile}`);
  const adultAviationFix = JSON.parse(fs.readFileSync(adultAviationFixFile, 'utf8'));
  if (Object.keys(adultAviationFix.translations || {}).length !== adultAviationFixCatalog.items.length) {
    throw new Error(`${locale}: adult aviation fix translated ${Object.keys(adultAviationFix.translations || {}).length}/${adultAviationFixCatalog.items.length}`);
  }
  Object.assign(translations, adultAviationFix.translations);
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
  locales:['ko', ...locales, 'mn'],
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
    localeNames:{ko:'한국어',en:'English',ja:'日本語',zh:'中文',es:'Español',ru:'Русский',vi:'Tiếng Việt',th:'ไทย',ar:'العربية',it:'Italiano',az:'Azərbaycanca',km:'ភាសាខ្មែរ',mn:'Монгол'},
    locales:{}
  };
  const reportLocales = report === 'kpass-child' ? [...locales, 'mn'] : locales;
  for (const locale of reportLocales) {
    const translationMap = locale === 'mn' ? kpassMnTranslations : localeMaps[locale];
    bundle.locales[locale] = items.map((item) => ({
      key:item.key,
      source:item.source,
      target:(() => {
        let value = restore(item, translationMap[item.key]);
        for (const placeholder of item.protected.placeholders) {
          const key = placeholderKeys.get(placeholder);
          if (placeholder.startsWith('[') && key && translationMap[key] !== undefined) value = value.replaceAll(placeholder, translationMap[key]);
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
