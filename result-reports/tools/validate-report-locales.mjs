import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const reportRoot = path.join(repo, 'result-reports');
const expectedLocales = ['ko','en','ja','zh','es','ru','vi','th','ar','it','az','km','mn'];
const targetLocales = expectedLocales.slice(1, -1);
const reportLocales = {
  'kpass-child': expectedLocales,
  'dcas-teen': expectedLocales.slice(0, -1),
  'dcas-adult': expectedLocales.slice(0, -1)
};
const manifest = JSON.parse(fs.readFileSync(path.join(reportRoot, 'reports-manifest.json'), 'utf8'));
const localeManifest = JSON.parse(fs.readFileSync(path.join(reportRoot, 'locales', 'manifest.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'source-catalog.v7.ko.json'), 'utf8'));
const repairCatalog = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'repair-catalog.ko.json'), 'utf8'));
const dynamicCatalog = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'dynamic-source-catalog.ko.json'), 'utf8'));
const dynamicBaseCatalog = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'dynamic-source-catalog.base.ko.json'), 'utf8'));
const adultDeltaCatalog = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'adult-dynamic-delta.ko.json'), 'utf8'));
const runtimeLabelCatalog = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'runtime-label-catalog.ko.json'), 'utf8'));
const kpassConsistencyCatalog = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'kpass-consistency-delta.ko.json'), 'utf8'));
const kpassBalancedLowCatalog = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'kpass-balanced-low-delta.ko.json'), 'utf8'));
const kpassFullScaleCatalog = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'kpass-fullscale-delta.ko.json'), 'utf8'));
const adultAviationCatalog = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'adult-aviation-delta.ko.json'), 'utf8'));
const adultAviationFixCatalog = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'adult-aviation-fix-delta.ko.json'), 'utf8'));
const errors = [];

function loadBundle(file) {
  const sandbox = { window:{} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename:file });
  return sandbox.window.__FG_REPORT_I18N__;
}

function sameArray(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

if (!sameArray(localeManifest.locales, expectedLocales)) errors.push('locale manifest does not list the canonical locale union');
if (localeManifest.provider !== 'google-translate') errors.push('locale manifest provider must be google-translate');
if (localeManifest.reviewStatus !== 'machine-translated') errors.push('locale manifest review status must remain machine-translated');

for (const locale of targetLocales) {
  const primaryDir = locale === 'en' ? 'google-translations-final' : 'google-translations-v9';
  const primary = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', primaryDir, `${locale}.google-raw.json`), 'utf8'));
  const repair = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'google-translations-repair', `${locale}.google-raw.json`), 'utf8'));
  const dynamic = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'google-translations-dynamic', `${locale}.google-raw.json`), 'utf8'));
  const adultDelta = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'google-translations-adult-delta', `${locale}.google-raw.json`), 'utf8'));
  const runtimeLabels = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'google-translations-runtime-labels', `${locale}.google-raw.json`), 'utf8'));
  const kpassConsistency = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'google-translations-kpass-consistency', `${locale}.google-raw.json`), 'utf8'));
  const kpassBalancedLow = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'google-translations-kpass-balanced-low', `${locale}.google-raw.json`), 'utf8'));
  const kpassFullScale = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'google-translations-kpass-fullscale', `${locale}.google-raw.json`), 'utf8'));
  const adultAviation = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'google-translations-adult-aviation', `${locale}.google-raw.json`), 'utf8'));
  const adultAviationFix = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'google-translations-adult-aviation-fix', `${locale}.google-raw.json`), 'utf8'));
  if (Object.keys(primary.translations || {}).length !== catalog.items.length) errors.push(`${locale}: incomplete primary translation`);
  if (Object.keys(repair.translations || {}).length !== repairCatalog.items.length) errors.push(`${locale}: incomplete repair translation`);
  if (Object.keys(dynamic.translations || {}).length !== dynamicBaseCatalog.items.length) errors.push(`${locale}: incomplete base dynamic translation`);
  if (Object.keys(adultDelta.translations || {}).length !== adultDeltaCatalog.items.length) errors.push(`${locale}: incomplete adult dynamic delta translation`);
  if (Object.keys(runtimeLabels.translations || {}).length !== runtimeLabelCatalog.items.length) errors.push(`${locale}: incomplete runtime label translation`);
  if (Object.keys(kpassConsistency.translations || {}).length !== kpassConsistencyCatalog.items.length) errors.push(`${locale}: incomplete K-PASS consistency translation`);
  if (Object.keys(kpassBalancedLow.translations || {}).length !== kpassBalancedLowCatalog.items.length) errors.push(`${locale}: incomplete K-PASS balanced-low translation`);
  if (Object.keys(kpassFullScale.translations || {}).length !== kpassFullScaleCatalog.items.length) errors.push(`${locale}: incomplete K-PASS full-scale translation`);
  if (Object.keys(adultAviation.translations || {}).length !== adultAviationCatalog.items.length) errors.push(`${locale}: incomplete adult aviation translation`);
  if (Object.keys(adultAviationFix.translations || {}).length !== adultAviationFixCatalog.items.length) errors.push(`${locale}: incomplete adult aviation fix translation`);
  const dynamicKeys = new Set([...Object.keys(dynamic.translations || {}), ...Object.keys(adultDelta.translations || {}), ...Object.keys(kpassConsistency.translations || {}), ...Object.keys(kpassBalancedLow.translations || {}), ...Object.keys(kpassFullScale.translations || {}), ...Object.keys(adultAviation.translations || {}), ...Object.keys(adultAviationFix.translations || {})]);
  if (dynamicCatalog.items.some((item) => !dynamicKeys.has(item.key))) errors.push(`${locale}: unresolved full dynamic catalog item`);
}

const kpassMnCatalog = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'kpass-mn-catalog.ko.json'), 'utf8'));
const kpassMn = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'google-translations-kpass-mn', 'mn.google-raw.json'), 'utf8'));
if (Object.keys(kpassMn.translations || {}).length !== kpassMnCatalog.items.length) errors.push('mn: incomplete K-PASS translation');

for (const [reportId, report] of Object.entries(manifest.reports)) {
  if (!sameArray(report.fullReportLocales || [], reportLocales[reportId])) errors.push(`${reportId}: fullReportLocales mismatch`);
  if (!report.localeBundle || !report.localeRuntime) errors.push(`${reportId}: locale bundle/runtime path missing`);
  for (const field of ['localeBundle','localeRuntime']) {
    if (report[field] && !fs.existsSync(path.join(repo, report[field]))) errors.push(`${reportId}: missing ${field}`);
  }
  const html = fs.readFileSync(path.join(repo, report.entry), 'utf8');
  if (!html.includes(path.basename(report.localeBundle || 'missing'))) errors.push(`${reportId}: HTML does not load its locale bundle`);
  if (!html.includes(path.basename(report.localeRuntime || 'missing'))) errors.push(`${reportId}: HTML does not load the locale runtime`);

  const bundle = loadBundle(path.join(repo, report.localeBundle));
  if (bundle.reportId !== reportId) errors.push(`${reportId}: bundle reportId mismatch`);
  if (bundle.provider !== 'google-translate' || bundle.reviewStatus !== 'machine-translated') errors.push(`${reportId}: bundle provenance/status mismatch`);
  const expectedTargets = reportLocales[reportId].slice(1);
  if (!sameArray(Object.keys(bundle.locales), expectedTargets)) errors.push(`${reportId}: bundle target locale order/coverage mismatch`);
  const expectedCount = localeManifest.reports[reportId].itemCount;
  for (const locale of expectedTargets) {
    const entries = bundle.locales[locale] || [];
    if (entries.length !== expectedCount) errors.push(`${reportId}/${locale}: expected ${expectedCount} entries, got ${entries.length}`);
    const keys = new Set();
    for (const entry of entries) {
      if (keys.has(entry.key)) errors.push(`${reportId}/${locale}: duplicate key ${entry.key}`);
      keys.add(entry.key);
      if (typeof entry.target !== 'string') errors.push(`${reportId}/${locale}/${entry.key}: target is not a string`);
      if (/[가-힣]/.test(entry.target)) errors.push(`${reportId}/${locale}/${entry.key}: Korean residue`);
      // 단독 Â는 베트남어의 정상 문자(예: Âm nhạc)이므로 실제 UTF-8 mojibake 조합만 탐지한다.
      if (/\uFFFD|Ã[\u0080-\u00BF]|â(?:€|€™|€œ)|(?:æœ|å­|ä¸|é—)/.test(entry.target)) errors.push(`${reportId}/${locale}/${entry.key}: encoding corruption marker`);
      if (/__FG(?:PH|U)_|\[\[(?:FG|FGU)_/.test(entry.target)) errors.push(`${reportId}/${locale}/${entry.key}: internal translation token residue`);
      for (const placeholder of entry.placeholders || []) {
        if (placeholder.startsWith('{') && !entry.target.includes(placeholder)) {
          errors.push(`${reportId}/${locale}/${entry.key}: dynamic placeholder ${placeholder} missing`);
        }
      }
    }
  }
}

if (errors.length) {
  console.error(errors.slice(0, 200).map((error) => `ERROR: ${error}`).join('\n'));
  if (errors.length > 200) console.error(`ERROR: ${errors.length - 200} more errors omitted`);
  process.exit(1);
}

console.log(`PASS: K-PASS 13 locales + D-CAS teen/adult 12 locales; ${catalog.items.length} static + ${dynamicCatalog.items.length} dynamic source items; ${repairCatalog.items.length} repair + ${runtimeLabelCatalog.items.length} runtime label items; no Korean/token/encoding residue; dynamic placeholders preserved`);
