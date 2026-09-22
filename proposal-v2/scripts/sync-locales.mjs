import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const localeDir = path.join(root, 'i18n');
const args = new Map(process.argv.slice(2).map(argument => {
  const [name, ...rest] = argument.replace(/^--/, '').split('=');
  return [name, rest.join('=') || true];
}));

function loadDictionary(locale) {
  const file = path.join(localeDir, `${locale}.js`);
  if (!fs.existsSync(file)) return {};
  const sandbox = {window: {LANG: {}}};
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, {filename: file});
  return JSON.parse(JSON.stringify(sandbox.window.LANG[locale] || {}));
}

function writeDictionary(locale, dictionary) {
  const labels = {'zh-TW': '繁體中文', es: 'Español', fr: 'Français', it: 'Italiano', az: 'Azərbaycan'};
  const label = labels[locale] || locale;
  const source = `// FeelGood proposal translations: ${label}\nwindow.LANG = window.LANG || {};\nwindow.LANG[${JSON.stringify(locale)}] = ${JSON.stringify(dictionary, null, 2)};\n`;
  fs.writeFileSync(path.join(localeDir, `${locale}.js`), source, 'utf8');
}

function chunks(entries, maxLength = 2800) {
  const result = [];
  let current = [];
  let length = 0;
  for (const entry of entries) {
    const nextLength = entry.source.length + 24;
    if (current.length && length + nextLength > maxLength) {
      result.push(current);
      current = [];
      length = 0;
    }
    current.push(entry);
    length += nextLength;
  }
  if (current.length) result.push(current);
  return result;
}

const protectedTerms = [
  'K-PASS', 'D-CAS', 'NUVIA KIDS', 'NUVIA HISTORY', 'NUVIA PLANNER',
  'NUVIA CAREER LAB', 'MY NUVIA', 'NUVIA', 'PASS', 'FeelGood', 'MindCompass',
  'Planning', 'Attention', 'Simultaneous', 'Successive', '2E'
];

function protect(source) {
  const values = [];
  const protectValue = value => `<x id="FG${values.push(value) - 1}"></x>`;
  let text = source.replace(/<[^>]+>/g, protectValue);
  for (const term of protectedTerms) text = text.replaceAll(term, protectValue(term));
  text = text.replace(/\{[^{}]+\}|__V\d+__/g, protectValue);
  return {text, values};
}

function restore(text, values) {
  let restored = text;
  values.forEach((value, index) => {
    const expression = new RegExp(`<x\\s+id\\s*=\\s*["']?FG${index}["']?\\s*>\\s*<\\/x\\s*>`, 'gi');
    restored = restored.replace(expression, value);
  });
  return restored.trim();
}

async function translateBatch(locale, batch) {
  const prepared = batch.map(entry => ({...entry, ...protect(entry.source)}));
  const query = prepared.map((entry, index) => `${entry.text}\nZXQEND${String(index).padStart(3, '0')}ZXQ`).join('\n');
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const call = spawnSync('curl.exe', [
        '-sS', '--max-time', '60', '--get',
        '--data-urlencode', 'client=gtx',
        '--data-urlencode', 'sl=en',
        '--data-urlencode', `tl=${locale}`,
        '--data-urlencode', 'dt=t',
        '--data-urlencode', `q=${query}`,
        'https://translate.googleapis.com/translate_a/single'
      ], {encoding: 'utf8', maxBuffer: 8 * 1024 * 1024});
      if (call.status !== 0) throw new Error(call.stderr || `curl exited ${call.status}`);
      const data = JSON.parse(call.stdout);
      const translatedText = (data[0] || []).map(part => part[0] || '').join('');
      const translated = {};
      let cursor = 0;
      prepared.forEach((entry, index) => {
        const marker = `ZXQEND${String(index).padStart(3, '0')}ZXQ`;
        const end = translatedText.indexOf(marker, cursor);
        if (end < 0) throw new Error(`Missing translation marker ${marker}`);
        const value = restore(translatedText.slice(cursor, end), entry.values);
        if (!value) throw new Error(`Empty translation for ${entry.key}`);
        translated[entry.key] = value;
        cursor = end + marker.length;
      });
      return translated;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError;
}

const source = loadDictionary('en');
const locales = String(args.get('locales') || '').split(',').map(value => value.trim()).filter(Boolean);
const overwrite = new Set(String(args.get('overwrite') || '').split(',').map(value => value.trim()).filter(Boolean));

if (!locales.length) {
  console.error('Usage: node proposal-v2/scripts/sync-locales.mjs --locales=es,fr [--translate-missing] [--overwrite=key_a,key_b]');
  process.exit(2);
}

for (const locale of locales) {
  const dictionary = loadDictionary(locale);
  const missing = Object.keys(source).filter(key => !Object.prototype.hasOwnProperty.call(dictionary, key) || dictionary[key] === '');
  const requested = [...new Set([...missing, ...overwrite])].filter(key => Object.prototype.hasOwnProperty.call(source, key));
  console.log(`${locale}: ${Object.keys(dictionary).length}/${Object.keys(source).length} keys, ${missing.length} missing, ${overwrite.size} explicitly refreshed`);
  if (!args.has('translate-missing')) continue;
  const entries = requested.map(key => ({key, source: source[key]}));
  const work = chunks(entries);
  for (let index = 0; index < work.length; index += 1) {
    Object.assign(dictionary, await translateBatch(locale, work[index]));
    writeDictionary(locale, dictionary);
    console.log(`${locale}: translated batch ${index + 1}/${work.length}`);
  }
  const ordered = {};
  for (const key of Object.keys(source)) ordered[key] = dictionary[key];
  writeDictionary(locale, ordered);
}
