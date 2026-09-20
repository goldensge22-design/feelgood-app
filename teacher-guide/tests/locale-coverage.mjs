import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {profileLocaleSources} from './locale-source.mjs';

const localeRoot = resolve(import.meta.dirname, '..', 'locales');
const manifest = JSON.parse(await readFile(resolve(localeRoot, 'languages.json'), 'utf8'));
const failures = [];
const codes = manifest.map(language => language.code);
const ready = manifest.filter(language => language.status === 'ready').map(language => language.code);
const drafts = manifest.filter(language => language.status === 'ai-draft');
const profileSources = profileLocaleSources();

if (manifest.length !== 13 || new Set(codes).size !== 13) failures.push('언어 코드 13개 고유성');
if (ready.join() !== 'ko') failures.push('한국어 승인본 상태');
if (drafts.length !== 12) failures.push('외국어 AI 초안 상태');

let expectedKeys;
let expectedHash;
const results = {};
for (const language of drafts) {
  try {
    const pack = JSON.parse(await readFile(resolve(localeRoot, language.file), 'utf8'));
    const keys = Object.keys(pack.messages || {}).sort();
    const empty = keys.filter(key => !String(pack.messages[key] || '').trim());
    const koreanValues = keys.filter(key => /[가-힣]/.test(String(pack.messages[key] || '')));
    const missingProfileSources = profileSources.filter(key => !String(pack.messages[key] || '').trim());
    if (!expectedKeys) {
      expectedKeys = keys;
      expectedHash = pack.sourceHash;
    }
    const sameKeys = keys.length === expectedKeys.length && keys.every((key, index) => key === expectedKeys[index]);
    const direction = language.code === 'ar' ? 'rtl' : 'ltr';
    const valid = pack.locale === language.code && pack.sourceLocale === 'ko' && pack.status === 'ai-draft' && pack.direction === direction && pack.sourceHash === expectedHash && sameKeys && !empty.length && !koreanValues.length && !missingProfileSources.length;
    results[language.code] = {messages:keys.length,empty:empty.length,koreanValues:koreanValues.length,missingProfileSources:missingProfileSources.length,sameKeys,direction:pack.direction,valid};
    if (!valid) failures.push(language.code);
  } catch (error) {
    results[language.code] = {error:error.message,valid:false};
    failures.push(language.code);
  }
}

console.log(JSON.stringify({languages:manifest.length,ready,drafts:drafts.length,profileSources:profileSources.length,expectedMessages:expectedKeys?.length || 0,results,status:failures.length ? 'FAIL: ' + failures.join(', ') : 'PASS'}, null, 2));
if (failures.length) process.exitCode = 1;
