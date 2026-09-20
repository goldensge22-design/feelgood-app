import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const root = process.cwd();
const flags = new Set(process.argv.slice(2));
const registry = JSON.parse(fs.readFileSync(path.join(root, 'i18n/programs.json'), 'utf8'));
const rows = [];
const issues = [];
const statuses = new Set(['ready', 'reviewed', 'needs-review', 'draft', 'ai-draft', 'pending', 'release', 'planned', 'blocked']);
const error = (program, message) => issues.push({severity:'error', program, message});
const warn = (program, message) => issues.push({severity:'warning', program, message});

function tokens(value) {
  return [...new Set(String(value ?? '').match(/\{[A-Za-z_][\w.-]*\}|\{\{\s*[A-Za-z_][\w.-]*\s*\}\}|%\d*\$?[sdif]/g) || [])]
    .map(value => value.replace(/\s+/g, '')).sort();
}

function unsafe(value) {
  return /<\s*script\b|\son[a-z]+\s*=|javascript\s*:/i.test(String(value ?? ''));
}

// Pure contract checks. Text-language provenance is explicit, not guessed from prose.
function policyIssues(program, catalog, packs = {}) {
  const found = [];
  const fail = (code, detail) => found.push({code, detail});
  if (program.fallbackLocale || program.crossLocaleFallback === true ||
      (program.missingTranslation && program.missingTranslation !== 'block')) {
    fail('CROSS_LOCALE_FALLBACK_FORBIDDEN', 'legacy fallback configuration must not fill selected-locale gaps');
  }
  const languages = program.languages || [];
  if (new Set(languages.map(item => item.code)).size !== languages.length) fail('LOCALE_PACK_INCOMPLETE', 'duplicate locale registration');
  const registered = new Map(languages.map(item => [item.code, item]));
  for (const code of program.selectableLocales || program.supportedLocales || []) {
    if (!catalog[code] || !registered.has(code) || registered.get(code).availability !== 'release') {
      fail('LANGUAGE_NOT_PROVIDED', 'non-release or unsupported selector locale: ' + code);
    }
  }
  for (const item of languages) {
    if (!catalog[item.code] || !['planned', 'blocked', 'release'].includes(item.availability)) {
      fail('LANGUAGE_NOT_PROVIDED', 'invalid locale registration: ' + item.code);
    }
    if (item.availability !== 'release') continue;
    const pack = packs[item.code];
    const required = item.requiredKeys || program.requiredKeys;
    if (!pack || !Array.isArray(required) || !required.length || pack.locale !== item.code) {
      fail('LOCALE_PACK_INCOMPLETE', item.code + ': pack or required-key contract missing');
    } else {
      for (const key of required) {
        const value = pack.messages?.[key];
        if (typeof value !== 'string' || !value.trim() || value === key) {
          fail('TRANSLATION_KEY_MISSING', item.code + ':' + key);
        }
        const source = packs[program.sourceLocale || program.defaultLocale]?.messages?.[key];
        if (source === undefined) fail('LOCALE_PACK_INCOMPLETE', 'source key missing: ' + key);
        else if (tokens(source).join('|') !== tokens(value).join('|')) {
          fail('PLACEHOLDER_MISMATCH', item.code + ':' + key);
        }
        if (unsafe(value)) fail('UNSAFE_TRANSLATION', item.code + ':' + key);
      }
    }
    for (const kind of ['rtl', 'font']) {
      if (item.review?.[kind]?.status !== 'reviewed' || !item.review[kind].evidence) {
        fail('RELEASE_REVIEW_MISSING', item.code + ':' + kind);
      }
    }
  }
  for (const bundle of program.screenBundles || []) {
    const values = Object.values(bundle.messages || {});
    const origins = new Set(values.map(value => value.locale));
    if (!bundle.locale || !values.length || values.some(value => !value.locale || typeof value.text !== 'string')) {
      fail('LOCALE_PACK_INCOMPLETE', 'screen bundle provenance missing: ' + bundle.id);
    } else if (origins.size !== 1 || !origins.has(bundle.locale)) {
      fail('MIXED_LOCALE_BUNDLE', 'mixed or wrong source locale: ' + bundle.id);
    }
  }
  return found;
}

function selfTest() {
  const review = {rtl:{status:'reviewed', evidence:'fixture'}, font:{status:'reviewed', evidence:'fixture'}};
  const catalog = {ko:{dir:'ltr'}, en:{dir:'ltr'}};
  const program = {id:'fixture', sourceLocale:'ko', supportedLocales:['ko','en'], selectableLocales:['ko','en'],
    requiredKeys:['greeting'], languages:['ko','en'].map(code => ({code, availability:'release', review})),
    screenBundles:[{id:'home', locale:'en', messages:{greeting:{text:'Hello {name}', locale:'en'}}}]};
  const packs = {ko:{locale:'ko', messages:{greeting:'fixture {name}'}}, en:{locale:'en', messages:{greeting:'Hello {name}'}}};
  assert.deepEqual(policyIssues(program, catalog, packs), []);
  const cases = [
    ['CROSS_LOCALE_FALLBACK_FORBIDDEN', p => {p.fallbackLocale='ko';}],
    ['CROSS_LOCALE_FALLBACK_FORBIDDEN', p => {p.crossLocaleFallback=true;}],
    ['MIXED_LOCALE_BUNDLE', p => {p.screenBundles[0].messages.other={text:'fixture',locale:'ko'};}],
    ['MIXED_LOCALE_BUNDLE', p => {p.screenBundles[0].messages.greeting.locale='ko';}],
    ['TRANSLATION_KEY_MISSING', (p,b) => {delete b.en.messages.greeting;}],
    ['TRANSLATION_KEY_MISSING', (p,b) => {b.en.messages.greeting='';}],
    ['TRANSLATION_KEY_MISSING', (p,b) => {b.en.messages.greeting='greeting';}],
    ['PLACEHOLDER_MISMATCH', (p,b) => {b.en.messages.greeting='Hello {other}';}],
    ['RELEASE_REVIEW_MISSING', p => {delete p.languages[1].review.rtl;}],
    ['RELEASE_REVIEW_MISSING', p => {delete p.languages[1].review.font;}],
    ['RELEASE_REVIEW_MISSING', p => {delete p.languages[1].review.font.evidence;}],
    ['LANGUAGE_NOT_PROVIDED', p => {p.selectableLocales.push('xx');}],
    ['LANGUAGE_NOT_PROVIDED', p => {p.languages[1].availability='planned';}],
    ['LANGUAGE_NOT_PROVIDED', p => {p.languages[1].availability='blocked';}],
    ['LOCALE_PACK_INCOMPLETE', (p,b) => {delete b.en;}],
    ['LOCALE_PACK_INCOMPLETE', p => {p.requiredKeys=[];}]
  ];
  for (const [code, mutate] of cases) {
    const copy = structuredClone(program), data = structuredClone(packs);
    mutate(copy, data);
    assert.ok(policyIssues(copy, catalog, data).some(issue => issue.code === code), code);
  }
  console.log('Policy self-test PASS: ' + (cases.length + 1) + ' cases');
}

if (flags.has('--self-test')) {
  selfTest();
  process.exit(0);
}

function checkPolicy(program) {
  const packs = {};
  for (const item of program.languages || []) {
    if (item.pack && fs.existsSync(path.join(root, item.pack))) {
      packs[item.code] = JSON.parse(fs.readFileSync(path.join(root, item.pack), 'utf8'));
    }
  }
  for (const issue of policyIssues(program, registry.localeCatalog, packs)) {
    error(program.id, issue.code + ': ' + issue.detail);
  }
  if (!program.languages) error(program.id, 'RELEASE_METADATA_MISSING: existing selector has no release contract');
  if (!program.screenBundles?.length) warn(program.id, 'SCREEN_BUNDLE_PROVENANCE_NOT_VERIFIED: no runtime bundle evidence');
}

function compare(program, locale, source, dictionary, usedKeys) {
  const sourceKeys = Object.keys(source).sort();
  const targetKeys = Object.keys(dictionary).sort();
  const missing = sourceKeys.filter(key => !(key in dictionary));
  const empty = sourceKeys.filter(key => key in dictionary && !String(dictionary[key] ?? '').trim());
  const orphan = usedKeys ? targetKeys.filter(key => !usedKeys.has(key)) : targetKeys.filter(key => !(key in source));
  const invalid = sourceKeys.filter(key => key in dictionary && (
    tokens(source[key]).join('|') !== tokens(dictionary[key]).join('|') || unsafe(dictionary[key])
  ));
  const translated = sourceKeys.length - missing.length - empty.length;
  rows.push({program:program.id, language:locale, total:sourceKeys.length, translated,
    missing:missing.length, orphan:orphan.length, empty:empty.length,
    blockedKeys:missing.length + empty.length, errors:invalid.length,
    coverage:sourceKeys.length ? `${(translated / sourceKeys.length * 100).toFixed(1)}%` : '100.0%'});
  if (missing.length) error(program.id, `${locale}: missing ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '…' : ''}`);
  if (empty.length) error(program.id, `${locale}: empty ${empty.slice(0, 10).join(', ')}${empty.length > 10 ? '…' : ''}`);
  if (invalid.length) error(program.id, `${locale}: placeholder/unsafe HTML ${invalid.slice(0, 10).join(', ')}${invalid.length > 10 ? '…' : ''}`);
  if (orphan.length) warn(program.id, `${locale}: orphan or dynamic keys ${orphan.length}`);
}

function checkJs(program) {
  const context = {window:null, document:{currentScript:{src:'https://qa.invalid/manifest.js'}, write(){}}};
  context.window = context;
  vm.createContext(context);
  let locales = program.supportedLocales;
  if (program.manifest) {
    const file = path.join(root, program.manifest);
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename:file});
    const manifest = context.PROPOSAL_I18N_CONFIG;
    if (!manifest?.languages?.length) throw new Error('invalid language manifest');
    locales = manifest.languages.map(item => item.code);
    for (const item of manifest.languages) {
      const expected = registry.localeCatalog[item.code];
      if (!expected) error(program.id, `unknown locale ${item.code}`);
      if (expected && item.dir !== expected.dir) error(program.id, `${item.code}: direction mismatch`);
    }
  }
  if (new Set(locales).size !== locales.length) error(program.id, 'duplicate locales');
  if (!locales.includes(program.fallbackLocale)) error(program.id, 'fallback locale is not supported');
  for (const locale of locales) {
    const file = path.join(root, program.localeDir, `${locale}.js`);
    if (!fs.existsSync(file)) { error(program.id, `${locale}: locale file missing`); continue; }
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename:file});
  }
  const dictionaries = context.LANG || {};
  const source = dictionaries[program.fallbackLocale] || {};
  const html = fs.readFileSync(path.join(root, program.html), 'utf8');
  const used = new Set([...html.matchAll(/data-i18n(?:-aria-label|-title|-alt|-placeholder|-attr)?=["']([^"']+)["']/g)].map(match => match[1]));
  for (const key of used) if (!(key in source)) error(program.id, `HTML key missing from fallback: ${key}`);
  for (const locale of locales) compare(program, locale, source, dictionaries[locale] || {}, used);
}

function duplicateMessageKeys(raw) {
  const offset = raw.indexOf('"messages"');
  if (offset < 0) return [];
  const keys = [...raw.slice(offset).matchAll(/^\s*"((?:\\.|[^"\\])+)"\s*:/gm)].map(match => match[1]);
  return [...new Set(keys.filter((key, index) => keys.indexOf(key) !== index))];
}

function checkJsonMap(program) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, program.manifest), 'utf8'));
  const locales = manifest.map(item => item.code);
  if (new Set(locales).size !== locales.length) error(program.id, 'duplicate locales');
  if (!locales.includes(program.fallbackLocale)) error(program.id, 'fallback locale is not supported');
  const packs = {};
  for (const item of manifest) {
    if (!registry.localeCatalog[item.code]) error(program.id, `unknown locale ${item.code}`);
    if (!statuses.has(item.status)) error(program.id, `${item.code}: invalid status ${item.status}`);
    if (item.code === program.sourceLocale) continue;
    const file = path.join(root, program.localeDir, item.file);
    if (!fs.existsSync(file)) { error(program.id, `${item.code}: locale file missing`); continue; }
    const raw = fs.readFileSync(file, 'utf8');
    const duplicate = duplicateMessageKeys(raw);
    if (duplicate.length) error(program.id, `${item.code}: duplicate message keys ${duplicate.slice(0, 10).join(', ')}`);
    const pack = JSON.parse(raw);
    packs[item.code] = pack;
    if (pack.locale !== item.code || pack.sourceLocale !== program.sourceLocale) error(program.id, `${item.code}: locale metadata mismatch`);
    if (pack.status && !statuses.has(pack.status)) error(program.id, `${item.code}: invalid pack status ${pack.status}`);
    const direction = registry.localeCatalog[item.code]?.dir;
    if (pack.direction && direction && pack.direction !== direction) error(program.id, `${item.code}: direction mismatch`);
  }
  const first = Object.values(packs)[0] || {messages:{}};
  const source = Object.fromEntries(Object.keys(first.messages || {}).map(key => [key, key]));
  const hash = first.sourceHash;
  for (const item of manifest) {
    if (item.code === program.sourceLocale) { compare(program, item.code, source, source); continue; }
    const pack = packs[item.code] || {messages:{}};
    if (hash && pack.sourceHash !== hash) error(program.id, `${item.code}: sourceHash mismatch`);
    compare(program, item.code, source, pack.messages || {});
    const residual = Object.keys(source).filter(key => pack.messages?.[key] === key && /[가-힣]/.test(key));
    if (residual.length) warn(program.id, `${item.code}: unchanged Korean source ${residual.length}`);
  }
}

function checkChanged() {
  let diff;
  try {
    diff = execFileSync('git', ['diff', '--unified=0', '--', '*.html', '*.htm', '*.js', '*.mjs', '*.jsx', '*.ts', '*.tsx', '*.vue', '*.svelte'], {cwd:root, encoding:'utf8'});
  } catch (cause) { warn('repository', `cannot inspect git diff: ${cause.message}`); return; }
  let file = '';
  let lineNumber = 0;
  const hits = [];
  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith('+++ b/')) { file = line.slice(6); continue; }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunk) { lineNumber = Number(hunk[1]); continue; }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      const text = line.slice(1);
      const exemptFile = /(^|\/)(i18n|locales|tests?|docs?|data)(\/|$)/i.test(file);
      const exemptLine = /^\s*(\/\/|\/\*|\*|<!--)/.test(text) || /data-i18n(?:-|=)/.test(text);
      if (!exemptFile && !exemptLine && /[가-힣]/.test(text)) hits.push(`${file}:${lineNumber}`);
      lineNumber++;
    } else if (line && !line.startsWith('-') && !line.startsWith('diff ') && !line.startsWith('index ')) lineNumber++;
  }
  if (hits.length) (flags.has('--strict-hardcoded') ? error : warn)('repository', `changed Korean hardcoding candidates ${hits.length}: ${hits.slice(0, 20).join(', ')}${hits.length > 20 ? '…' : ''}`);
}

const selectedProgram = [...flags].find(flag => flag.startsWith('--program='))?.slice(10);
if (selectedProgram && !registry.programs.some(program => program.id === selectedProgram)) {
  error('registry', 'LANGUAGE_NOT_PROVIDED: unknown program ' + selectedProgram);
}
if (registry.policy?.missingTranslation !== 'block' || registry.policy?.crossLocaleFallback !== false ||
    registry.fallbackLocale || registry.policy?.userSelectableAvailability?.join(',') !== 'release' ||
    registry.policy?.preserveUserDataOnLocaleError !== true) {
  error('registry', 'INVALID_COMMON_POLICY');
}
for (const program of registry.programs.filter(program => !selectedProgram || program.id === selectedProgram)) {
  try {
    checkPolicy(program);
    if (program.format.startsWith('js-global')) checkJs(program);
    else if (program.format === 'json-source-map') checkJsonMap(program);
    else if (program.format === 'registered-external') warn(program.id, 'EXTERNAL_RUNTIME_NOT_AUDITED: registration is not runtime QA');
    else warn(program.id, `unsupported format ${program.format}`);
  } catch (cause) { error(program.id, cause.message); }
}
if (flags.has('--changed')) checkChanged();

const errors = issues.filter(item => item.severity === 'error');
if (flags.has('--json')) console.log(JSON.stringify({rows, issues, status:errors.length ? 'FAIL' : 'PASS'}, null, 2));
else {
  console.table(rows);
  for (const item of issues) console[item.severity === 'error' ? 'error' : 'warn'](`[${item.severity.toUpperCase()}] ${item.program}: ${item.message}`);
  console.log(`i18n QA: ${errors.length ? `FAIL (${errors.length} errors)` : 'PASS'}`);
}
if (errors.length) process.exitCode = 1;
