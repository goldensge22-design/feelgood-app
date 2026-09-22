import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const manifestPath = path.join(repo, 'result-reports', 'reports-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const errors = [];

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

for (const [id, source] of Object.entries(manifest.sourceArchives)) {
  const file = path.join(repo, source.path);
  if (!fs.existsSync(file)) {
    errors.push(`${id}: missing ${source.path}`);
    continue;
  }
  const stat = fs.statSync(file);
  if (stat.size !== source.bytes) errors.push(`${id}: expected ${source.bytes} bytes, got ${stat.size}`);
  const actual = sha256(file);
  if (actual !== source.sha256) errors.push(`${id}: SHA-256 mismatch`);
}

for (const [id, report] of Object.entries(manifest.reports)) {
  for (const field of ['candidate','entry']) {
    if (!fs.existsSync(path.join(repo, report[field]))) errors.push(`${id}: missing ${field} ${report[field]}`);
  }
  const full = new Set(report.fullReportLocales || []);
  for (const locale of report.partialLocales || []) {
    if (full.has(locale)) errors.push(`${id}: ${locale} cannot be both full and partial`);
  }
  for (const locale of report.layerLocales || []) {
    if (!/^[a-z]{2}$/.test(locale)) errors.push(`${id}: invalid layer locale ${locale}`);
  }
  const expectedLocaleCount = 15;
  if ((report.fullReportLocales || []).length !== expectedLocaleCount) errors.push(`${id}: expected ${expectedLocaleCount} full report locales`);
  for (const field of ['localeBundle','localeRuntime']) {
    if (!report[field] || !fs.existsSync(path.join(repo, report[field] || ''))) errors.push(`${id}: missing ${field}`);
  }
}

const kpassHtml = fs.readFileSync(path.join(repo, manifest.reports['kpass-child'].entry), 'utf8');
if (!kpassHtml.includes('KPASS_FULL_REPORT_LOCALES.forEach')) {
  errors.push('kpass-child: language menu is not restricted to full report locales');
}
if (!kpassHtml.includes("km: { status:'full'")) {
  errors.push('kpass-child: Khmer full status is not explicit');
}
if (!kpassHtml.includes("mn: { status:'full'")) {
  errors.push('kpass-child: Mongolian full status is not explicit');
}

const teenBank = fs.readFileSync(path.join(repo, manifest.reports['dcas-teen'].candidate, 'dcas-profile81-bank.js'), 'utf8');
const adultBank = fs.readFileSync(path.join(repo, manifest.reports['dcas-adult'].candidate, 'dcas-profile81-bank.js'), 'utf8');
for (const [id, bank] of [['dcas-teen',teenBank],['dcas-adult',adultBank]]) {
  if (!bank.includes("km:{label:'ខ្មែរ'")) errors.push(`${id}: Khmer locale metadata missing`);
  if (!bank.includes("status:'ai-draft'")) errors.push(`${id}: curated 81-layer Khmer provenance missing`);
}

if (errors.length) {
  console.error(errors.map(x => `ERROR: ${x}`).join('\n'));
  process.exit(1);
}

console.log(`PASS: ${Object.keys(manifest.reports).length} reports, ${Object.keys(manifest.sourceArchives).length} immutable sources, locale exposure guards`);
