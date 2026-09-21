import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const catalogPath = path.resolve(process.argv[2] || path.join(repo, 'result-reports/i18n-work/source-catalog.v7.ko.json'));
const machineDir = path.resolve(process.argv[3] || path.join(repo, 'result-reports/i18n-work/google-translations-v9'));
const docDir = path.resolve(process.argv[4] || path.join(repo, 'result-reports/i18n-work/google-translations-final'));
const out = path.resolve(process.argv[5] || path.join(repo, 'result-reports/i18n-work/repair-catalog.ko.json'));
const locales = ['en','ja','zh','es','ru','vi','th','ar','it','az','km'];
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const itemsByKey = new Map(catalog.items.map((item) => [item.key, item]));
const repairKeys = new Set();

for (const locale of locales) {
  const file = locale === 'en' ? path.join(docDir, `${locale}.google-raw.json`) : path.join(machineDir, `${locale}.google-raw.json`);
  if (!fs.existsSync(file)) throw new Error(`missing ${locale}: ${file}`);
  const result = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (Object.keys(result.translations || {}).length !== catalog.items.length) throw new Error(`${locale} incomplete`);
  for (const item of catalog.items) {
    let translated = String(result.translations[item.key] ?? '');
    for (const placeholder of item.protected.placeholders) translated = translated.replaceAll(placeholder, '');
    translated = translated.replace(/__FGPH_\d{3}__/g, '');
    if (/[가-힣]/.test(translated)) repairKeys.add(item.key);
  }
}

const placeholderSources = [...new Set(catalog.items.flatMap((item) => item.protected.placeholders).filter((value) => /[가-힣]/.test(value)))].sort();
const repairItems = [...repairKeys].sort().map((key) => itemsByKey.get(key));
for (const source of placeholderSources) {
  const key = `FG_PH_${crypto.createHash('sha256').update(source).digest('hex').slice(0, 16).toUpperCase()}`;
  repairItems.push({ key, source, protected:{text:source,placeholders:[]}, contexts:['shared:placeholder-label'] });
}
const payload = {
  schemaVersion:1,
  sourceLocale:'ko',
  generatedAt:new Date().toISOString(),
  translationProvider:'google-translate',
  reports:['repair'],
  itemCount:repairItems.length,
  repairItemCount:repairKeys.size,
  placeholderItemCount:placeholderSources.length,
  items:repairItems
};
fs.mkdirSync(path.dirname(out), {recursive:true});
fs.writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`WROTE ${out}`);
console.log(`ITEMS ${repairItems.length} REPAIRS ${repairKeys.size} PLACEHOLDERS ${placeholderSources.length}`);
