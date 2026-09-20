import {createHash} from 'node:crypto';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {profileLocaleInventory} from './locale-source.mjs';

const localeRoot = resolve(import.meta.dirname, '..', 'locales');
const manifest = JSON.parse(await readFile(resolve(localeRoot, 'languages.json'), 'utf8'));
const flags = new Set(process.argv.slice(2));
const sync = flags.has('--sync');
const runBrowser = flags.has('--browser');
const inventory = profileLocaleInventory();
const profileSources = inventory.sources;
const failures = [];
const codes = manifest.map(language => language.code);
const ready = manifest.filter(language => language.status === 'ready').map(language => language.code);
const drafts = manifest.filter(language => language.status === 'ai-draft');
const allowedPackStatuses = new Set(['ai-draft', 'needs-review']);
const placeholderPattern = /\{[A-Za-z_][\w.-]*\}|\{\{\s*[A-Za-z_][\w.-]*\s*\}\}|%\d*\$?[sdif]/g;

function placeholders(value) {
  return [...new Set(String(value || '').match(placeholderPattern) || [])].map(value => value.replace(/\s+/g, '')).sort();
}

function sourceHash(keys) {
  return createHash('sha256').update([...keys].sort().join('\n')).digest('hex');
}

if (manifest.length !== 13 || new Set(codes).size !== 13) failures.push('언어 코드 13개 고유성');
if (ready.join() !== 'ko') failures.push('한국어 승인본 상태');
if (drafts.length !== 12) failures.push('외국어 AI 초안 상태');

const loaded = [];
for (const language of drafts) {
  try {
    const file = resolve(localeRoot, language.file);
    const pack = JSON.parse(await readFile(file, 'utf8'));
    loaded.push({language, file, pack, originalKeys:new Set(Object.keys(pack.messages || {}))});
  } catch (caught) {
    failures.push(language.code);
    loaded.push({language, error:caught});
  }
}

const baselineKeys = Object.keys(loaded.find(item => item.pack)?.pack.messages || {}).sort();
const expectedKeys = [...new Set([...baselineKeys, ...profileSources])].sort();
const expectedHash = sourceHash(expectedKeys);
let generatedKeys = 0;

if (sync) {
  for (const entry of loaded) {
    if (!entry.pack) continue;
    const missing = expectedKeys.filter(key => !(key in (entry.pack.messages || {})));
    if (!missing.length) continue;
    entry.pack.messages ||= {};
    missing.forEach(key => { entry.pack.messages[key] = ''; });
    entry.pack.needsReview = [...new Set([...(entry.pack.needsReview || []), ...missing])].sort();
    entry.pack.status = 'needs-review';
    entry.pack.sourceHash = expectedHash;
    await writeFile(entry.file, JSON.stringify(entry.pack, null, 2) + '\n');
    generatedKeys += missing.length;
  }
}

const results = {};
for (const entry of loaded) {
  const {language} = entry;
  if (!entry.pack) {
    results[language.code] = {error:entry.error.message, valid:false};
    continue;
  }
  const pack = sync ? JSON.parse(await readFile(entry.file, 'utf8')) : entry.pack;
  const keys = Object.keys(pack.messages || {}).sort();
  const missing = expectedKeys.filter(key => !(key in (pack.messages || {})));
  const empty = expectedKeys.filter(key => key in pack.messages && !String(pack.messages[key] || '').trim());
  const koreanValues = expectedKeys.filter(key => /[가-힣]/.test(String(pack.messages[key] || '')));
  const placeholderMismatch = expectedKeys.filter(key => key in pack.messages && placeholders(key).join('|') !== placeholders(pack.messages[key]).join('|'));
  const newOrChanged = profileSources.filter(key => !String(pack.messages[key] || '').trim());
  const needsReview = [...new Set(pack.needsReview || [])];
  const sameKeys = keys.length === expectedKeys.length && keys.every((key, index) => key === expectedKeys[index]);
  const direction = language.code === 'ar' ? 'rtl' : 'ltr';
  const metadataValid = pack.locale === language.code && pack.sourceLocale === 'ko' && allowedPackStatuses.has(pack.status) && pack.direction === direction;
  const stateValid = pack.status === 'needs-review' ? needsReview.length > 0 : needsReview.length === 0;
  const valid = metadataValid && stateValid && sameKeys && !missing.length && !empty.length && !koreanValues.length && !placeholderMismatch.length && !newOrChanged.length;
  results[language.code] = {
    messages:keys.length,
    newOrChanged:newOrChanged.length,
    generated:sync ? expectedKeys.filter(key => !entry.originalKeys.has(key)).length : 0,
    translationStatus:pack.status,
    needsReview:needsReview.length,
    missing:missing.length,
    empty:empty.length,
    koreanValues:koreanValues.length,
    placeholderMismatch:placeholderMismatch.length,
    sameKeys,
    direction:pack.direction,
    valid
  };
  if (!valid) failures.push(language.code);
}

const report = {
  languages:manifest.length,
  ready,
  drafts:drafts.length,
  source:{
    profileKeys:profileSources.length,
    occurrences:inventory.occurrences,
    uniqueCommonKeys:inventory.uniqueKeys,
    reusedCommonKeys:inventory.reusedKeys,
    reusedOccurrences:inventory.reusedOccurrences,
    groups:Object.fromEntries(Object.entries(inventory.groups).map(([group, keys]) => [group, keys.length]))
  },
  expectedMessages:expectedKeys.length,
  generatedKeys,
  results,
  browserQA:runBrowser ? 'running' : 'not-requested',
  status:failures.length ? 'FAIL: ' + [...new Set(failures)].join(', ') : 'PASS'
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;

if (runBrowser && !failures.length) {
  const screenshotDirectory = await mkdtemp(join(tmpdir(), 'teacher-guide-i18n-qa-'));
  process.env.TEACHER_GUIDE_SCREENSHOT_DIR = screenshotDirectory;
  process.env.TEACHER_GUIDE_QA_SUMMARY = '1';
  try {
    await import('./browser-smoke.mjs');
  } finally {
    await rm(screenshotDirectory, {recursive:true, force:true});
  }
}
