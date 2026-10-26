#!/usr/bin/env node
// Validates language packs: presence, strict equal shape vs Korean source,
// empty strings, placeholders, chapter shape, mixed Korean, emoji, links config.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'i18n');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const locales = read('locales.json');
const config = read('guide-config.json');
const errors = [];
const warn = [];
const HANGUL = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
const EMOJI = /\p{Extended_Pictographic}/u;
const PH = /\{(\w+)\}/g;

function walk(src, other, path, code) {
  if (typeof src === 'string') {
    if (typeof other !== 'string') return errors.push(`${code}: ${path} must be string`);
    if (!other.trim()) errors.push(`${code}: ${path} is empty`);
    if (EMOJI.test(other)) errors.push(`${code}: ${path} contains emoji`);
    if (code !== 'ko' && HANGUL.test(other)) errors.push(`${code}: ${path} contains Korean text`);
    const a = [...src.matchAll(PH)].map((m) => m[1]).sort().join(',');
    const b = [...other.matchAll(PH)].map((m) => m[1]).sort().join(',');
    if (a !== b) errors.push(`${code}: ${path} placeholders {${b}} != {${a}}`);
    return;
  }
  if (Array.isArray(src)) {
    if (!Array.isArray(other)) return errors.push(`${code}: ${path} must be array`);
    if (other.length !== src.length) errors.push(`${code}: ${path} length ${other.length} != ${src.length}`);
    src.forEach((v, i) => walk(v, other[i], `${path}[${i}]`, code));
    return;
  }
  if (!other || typeof other !== 'object') return errors.push(`${code}: ${path} must be object`);
  for (const k of Object.keys(src)) {
    if (!(k in other)) errors.push(`${code}: missing key ${path}.${k}`);
    else walk(src[k], other[k], `${path}.${k}`, code);
  }
  for (const k of Object.keys(other)) if (!(k in src)) errors.push(`${code}: extra key ${path}.${k}`);
}

// Links config
try {
  const u = new URL(config.demoBase);
  if (u.protocol !== 'https:') errors.push('config: demoBase must be https');
} catch { errors.push('config: demoBase invalid URL'); }
if (config.demoVersion !== '14') errors.push('config: demoVersion must be 14');
const EXPECTED_HASHES = [['competencies', 'model'], ['benchmark', 'model'], ['hiring'], ['individual'], ['model'], ['hiring', 'organization', 'development', 'actions']];
if (JSON.stringify(config.chapterHashes) !== JSON.stringify(EXPECTED_HASHES)) errors.push('config: chapterHashes must match the hiring workflow links');
config.chapterHashes.flat().forEach((h) => {
  if (!config.allowedHashes.includes(h)) errors.push(`config: hash "${h}" not allowed`);
});

if (!existsSync(join(root, 'packs', 'ko.json'))) {
  console.error('Korean source pack missing');
  process.exit(1);
}
const source = read('packs/ko.json');
if (source.chapters.length !== 6) errors.push('ko: must have 6 chapters');
if (source.checklist.items.length !== 6) errors.push('ko: checklist must have 6 items');
if (source.cover.workflow.length !== 6) errors.push('ko: cover workflow must have 6 stages');
const guideSrc = readFileSync(join(root, '..', 'guide', 'Guide.tsx'), 'utf8');
if (!/const N_CHECKS = 6;/.test(guideSrc)) errors.push('Guide: N_CHECKS must be 6');
if (!/dcas-guide:checks:v2/.test(guideSrc)) errors.push('Guide: checklist storage key must be versioned');
if (!/onStart\(b\.to\)/.test(guideSrc) || !/to: 1,/.test(guideSrc) || !/to: 3,/.test(guideSrc)) errors.push('Guide: two start buttons (ch1, ch3) required');
source.chapters.forEach((c, i) => {
  if (c.steps.length < 2 || c.steps.length > 4) errors.push(`ko: chapter ${i + 1} needs 2-4 steps`);
  for (const k of ['who', 'prepare', 'open', 'done']) if (!c[k]?.trim()) errors.push(`ko: chapter ${i + 1} missing ${k}`);
  if (!c.example?.lines?.length) errors.push(`ko: chapter ${i + 1} needs example lines`);
  if (c.links.length !== config.chapterHashes[i].length) errors.push(`ko: chapter ${i + 1} link labels != hashes`);
});

const statuses = new Set(['source', 'ai-draft', 'incomplete']);
for (const loc of locales) {
  if (!statuses.has(loc.status)) errors.push(`${loc.code}: invalid status ${loc.status}`);
  if (loc.code === 'ko' && loc.status !== 'source') errors.push('ko must be source');
  if (loc.code !== 'ko' && loc.status === 'source') errors.push(`${loc.code}: only ko may be source`);
  const file = join(root, 'packs', `${loc.code}.json`);
  if (!existsSync(file)) {
    if (loc.status !== 'incomplete') errors.push(`${loc.code}: pack missing but selectable`);
    else warn.push(`${loc.code}: incomplete (disabled)`);
    continue;
  }
  const pack = read(`packs/${loc.code}.json`);
  walk(source, pack, '$', loc.code);
  if (/ai-draft|reviewed|incomplete/i.test(JSON.stringify(pack))) errors.push(`${loc.code}: pack exposes translation status`);
  if (/\b(four|4 items)\b/i.test(pack.checklist?.allDone ?? '')) errors.push(`${loc.code}: allDone must not say four`);
}

warn.forEach((w) => console.warn('warn:', w));
if (errors.length) {
  errors.forEach((e) => console.error('error:', e));
  console.error(`\n${errors.length} problem(s) found.`);
  process.exit(1);
}
console.log(`OK: ${locales.length} locales validated against Korean source.`);
