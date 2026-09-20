import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const i18nDir = path.join(root, 'proposal-v2', 'i18n');
const htmlPath = path.join(root, 'proposal-v2 (1).html');
const manifestPath = path.join(i18nDir, 'manifest.js');

const sandbox = {};
sandbox.window = sandbox;
sandbox.document = {
  currentScript: { src: 'https://example.test/proposal-v2/i18n/manifest.js' },
  write() {},
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(manifestPath, 'utf8'), sandbox, { filename: manifestPath });

const config = sandbox.PROPOSAL_I18N_CONFIG;
if (!config || !Array.isArray(config.languages) || !config.languages.length) {
  throw new Error('manifest.js에 유효한 languages 목록이 없습니다.');
}

for (const language of config.languages) {
  const file = path.join(i18nDir, `${language.code}.js`);
  if (!fs.existsSync(file)) throw new Error(`언어 파일 누락: ${file}`);
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
}

const html = fs.readFileSync(htmlPath, 'utf8');
const domKeys = new Set(
  [...html.matchAll(/data-i18n(?:-aria-label|-title|-alt|-placeholder|-attr)?="([^"]+)"/g)].map(match => match[1]),
);
const languageCodes = config.languages.map(language => language.code);
const dictionaryKeys = new Set(languageCodes.flatMap(code => Object.keys(sandbox.LANG[code] || {})));
const allKeys = [...new Set([...domKeys, ...dictionaryKeys])].sort();
let failed = false;

console.log(`지원 언어: ${languageCodes.join(', ')}`);
console.log(`전체 번역 키: ${allKeys.length}`);
console.log(`HTML 연결 키: ${domKeys.size}`);

for (const code of languageCodes) {
  const dictionary = sandbox.LANG[code] || {};
  const missing = allKeys.filter(key => !(key in dictionary));
  const empty = allKeys.filter(key => key in dictionary && String(dictionary[key]).trim() === '');
  console.log(`${code}: keys=${Object.keys(dictionary).length}, missing=${missing.length}, empty=${empty.length}`);
  if (missing.length) console.error(`  missing: ${missing.join(', ')}`);
  if (empty.length) console.error(`  empty: ${empty.join(', ')}`);
  failed ||= missing.length > 0 || empty.length > 0;
}

if (!html.includes('proposal-v2/i18n/manifest.js')) {
  console.error('HTML에서 다국어 manifest.js를 불러오지 않습니다.');
  failed = true;
}
if (/window\.LANG\.[a-z-]+\s*=\s*\{/.test(html)) {
  console.error('HTML 안에 번역 사전이 다시 하드코딩되어 있습니다.');
  failed = true;
}

if (failed) process.exit(1);
console.log('PASS: 모든 언어 사전과 HTML 키가 일치합니다.');
