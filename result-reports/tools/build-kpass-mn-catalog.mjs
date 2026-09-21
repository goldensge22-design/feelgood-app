import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const work = path.join(root, 'i18n-work');
const output = path.join(work, 'kpass-mn-catalog.ko.json');

const sources = [
  'source-catalog.v7.ko.json',
  'dynamic-source-catalog.ko.json',
  'runtime-label-catalog.ko.json',
  'residual-source-catalog.ko.json'
].map((name) => JSON.parse(fs.readFileSync(path.join(work, name), 'utf8')));
const repair = JSON.parse(fs.readFileSync(path.join(work, 'repair-catalog.ko.json'), 'utf8'));
const items = new Map();

for (const catalog of sources) {
  for (const item of catalog.items || []) {
    if ((item.contexts || []).some((context) => context.startsWith('kpass-child:'))) items.set(item.key, item);
  }
}
for (const item of repair.items || []) {
  if ((item.contexts || []).includes('shared:placeholder-label')) items.set(item.key, item);
}

const catalog = {
  schemaVersion: 1,
  sourceLocale: 'ko',
  targetLocale: 'mn',
  generatedAt: new Date().toISOString(),
  translationProvider: 'google-translate-web',
  reports: ['kpass-child'],
  itemCount: items.size,
  items: [...items.values()].sort((a, b) => a.key.localeCompare(b.key))
};
fs.writeFileSync(output, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(`WROTE ${output} ITEMS ${catalog.itemCount}`);
