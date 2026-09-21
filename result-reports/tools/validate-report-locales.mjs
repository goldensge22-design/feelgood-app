import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const reportRoot = path.join(repo, 'result-reports');
const expectedLocales = ['ko','en','ja','zh','es','ru','vi','th','ar','it','az','km'];
const targetLocales = expectedLocales.slice(1);
const manifest = JSON.parse(fs.readFileSync(path.join(reportRoot, 'reports-manifest.json'), 'utf8'));
const localeManifest = JSON.parse(fs.readFileSync(path.join(reportRoot, 'locales', 'manifest.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'source-catalog.v7.ko.json'), 'utf8'));
const repairCatalog = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'repair-catalog.ko.json'), 'utf8'));
const dynamicCatalog = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'dynamic-source-catalog.ko.json'), 'utf8'));
const dynamicBaseCatalog = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'dynamic-source-catalog.base.ko.json'), 'utf8'));
const adultDeltaCatalog = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'adult-dynamic-delta.ko.json'), 'utf8'));
const runtimeLabelCatalog = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'runtime-label-catalog.ko.json'), 'utf8'));
const errors = [];

function loadBundle(file) {
  const sandbox = { window:{} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename:file });
  return sandbox.window.__FG_REPORT_I18N__;
}

function sameArray(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

if (!sameArray(localeManifest.locales, expectedLocales)) errors.push('locale manifest does not list the canonical 12 locales');
if (localeManifest.provider !== 'google-translate') errors.push('locale manifest provider must be google-translate');
if (localeManifest.reviewStatus !== 'machine-translated') errors.push('locale manifest review status must remain machine-translated');

for (const locale of targetLocales) {
  const primaryDir = locale === 'en' ? 'google-translations-final' : 'google-translations-v9';
  const primary = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', primaryDir, `${locale}.google-raw.json`), 'utf8'));
  const repair = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'google-translations-repair', `${locale}.google-raw.json`), 'utf8'));
  const dynamic = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'google-translations-dynamic', `${locale}.google-raw.json`), 'utf8'));
  const adultDelta = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'google-translations-adult-delta', `${locale}.google-raw.json`), 'utf8'));
  const runtimeLabels = JSON.parse(fs.readFileSync(path.join(reportRoot, 'i18n-work', 'google-translations-runtime-labels', `${locale}.google-raw.json`), 'utf8'));
  if (Object.keys(primary.translations || {}).length !== catalog.items.length) errors.push(`${locale}: incomplete primary translation`);
  if (Object.keys(repair.translations || {}).length !== repairCatalog.items.length) errors.push(`${locale}: incomplete repair translation`);
  if (Object.keys(dynamic.translations || {}).length !== dynamicBaseCatalog.items.length) errors.push(`${locale}: incomplete base dynamic translation`);
  if (Object.keys(adultDelta.translations || {}).length !== adultDeltaCatalog.items.length) errors.push(`${locale}: incomplete adult dynamic delta translation`);
  if (Object.keys(runtimeLabels.translations || {}).length !== runtimeLabelCatalog.items.length) errors.push(`${locale}: incomplete runtime label translation`);
  const dynamicKeys = new Set([...Object.keys(dynamic.translations || {}), ...Object.keys(adultDelta.translations || {})]);
  if (dynamicCatalog.items.some((item) => !dynamicKeys.has(item.key))) errors.push(`${locale}: unresolved full dynamic catalog item`);
}

for (const [reportId, report] of Object.entries(manifest.reports)) {
  if (!sameArray(report.fullReportLocales || [], expectedLocales)) errors.push(`${reportId}: fullReportLocales must list all 12 locales`);
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
  if (!sameArray(Object.keys(bundle.locales), targetLocales)) errors.push(`${reportId}: bundle target locale order/coverage mismatch`);
  const expectedCount = localeManifest.reports[reportId].itemCount;
  for (const locale of targetLocales) {
    const entries = bundle.locales[locale] || [];
    if (entries.length !== expectedCount) errors.push(`${reportId}/${locale}: expected ${expectedCount} entries, got ${entries.length}`);
    const keys = new Set();
    for (const entry of entries) {
      if (keys.has(entry.key)) errors.push(`${reportId}/${locale}: duplicate key ${entry.key}`);
      keys.add(entry.key);
      if (typeof entry.target !== 'string') errors.push(`${reportId}/${locale}/${entry.key}: target is not a string`);
      if (/[가-힣]/.test(entry.target)) errors.push(`${reportId}/${locale}/${entry.key}: Korean residue`);
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

console.log(`PASS: 3 reports × 12 locales; ${catalog.items.length} static + ${dynamicCatalog.items.length} dynamic source items; ${repairCatalog.items.length} repair + ${runtimeLabelCatalog.items.length} runtime label items; no Korean/token residue; dynamic placeholders preserved`);
