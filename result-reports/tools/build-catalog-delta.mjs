import fs from 'node:fs';
import path from 'node:path';

const [beforeArg, afterArg, outputArg] = process.argv.slice(2);
if (!beforeArg || !afterArg || !outputArg) {
  console.error('Usage: node build-catalog-delta.mjs <before.json> <after.json> <output.json>');
  process.exit(2);
}

const before = JSON.parse(fs.readFileSync(path.resolve(beforeArg), 'utf8'));
const after = JSON.parse(fs.readFileSync(path.resolve(afterArg), 'utf8'));
const existingKeys = new Set(before.items.map((item) => item.key));
const items = after.items.filter((item) => !existingKeys.has(item.key));
const output = {
  schemaVersion: 1,
  sourceLocale: after.sourceLocale || 'ko',
  generatedAt: new Date().toISOString(),
  translationProvider: 'google-translate-web',
  purpose: 'adult-profile-runtime-contract-delta',
  itemCount: items.length,
  items
};
fs.writeFileSync(path.resolve(outputArg), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`WROTE ${path.resolve(outputArg)} ITEMS ${items.length}`);
