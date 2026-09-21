import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const outputArg = process.argv.find(arg => arg.startsWith('--out='));
const output = outputArg ? path.resolve(outputArg.slice(6)) : path.join(repo, 'result-reports', 'i18n-work', 'source-catalog.ko.json');

const targets = [
  ['kpass-child', 'result-reports/kpass/candidate'],
  ['dcas-teen', 'result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_TEEN'],
  ['dcas-adult', 'result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_ADULT']
];
const extensions = new Set(['.html','.js','.json']);
const korean = /[가-힣]/;
const occurrences = new Map();

function normalize(value) {
  return value.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function protect(value) {
  const placeholders = [];
  const patterns = [
    /\{\{[^{}]+\}\}/g,
    /\$\{[^{}]+\}/g,
    /\{[A-Za-z_][A-Za-z0-9_]*\}/g,
    /\[[A-Za-z가-힣0-9_· /+-]+\]/g,
    /\b(?:P|A|S|Q)-(?:H|M|L)\b/g,
    /__[^_\s]+__/g
  ];
  let protectedText = value;
  for (const pattern of patterns) {
    protectedText = protectedText.replace(pattern, token => {
      const index = placeholders.push(token) - 1;
      return `__FGPH_${String(index).padStart(3, '0')}__`;
    });
  }
  return { text:protectedText, placeholders };
}

function add(value, context) {
  const source = normalize(value);
  if (!source || !korean.test(source) || source.length < 2) return;
  if (/^(?:\/\/|\/\*|\*|<!--)/.test(source)) return;
  const key = crypto.createHash('sha256').update(source).digest('hex').slice(0, 16).toUpperCase();
  const item = occurrences.get(key) || { key:`FG_${key}`, source, protected:protect(source), contexts:[] };
  if (!item.contexts.includes(context)) item.contexts.push(context);
  occurrences.set(key, item);
}

function addCandidate(value, context) {
  const decoded = value
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/\\(["'`])/g, '$1');
  if (/<[A-Za-z!/][^>]*>/.test(decoded)) {
    const visible = decoded
      .replace(/<!--([\s\S]*?)-->/g, ' ')
      .replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, ' ')
      .split(/<[^>]*>/g);
    visible.forEach((part, index) => add(part, `${context}:html-text:${index}`));
    return;
  }
  if (decoded.length > 3000) {
    decoded.split(/\n{2,}/g).forEach((part, index) => add(part, `${context}:block:${index}`));
    return;
  }
  add(decoded, context);
}

function quotedStrings(content) {
  const found = [];
  for (let i = 0; i < content.length; i++) {
    const quote = content[i];
    if (quote !== "'" && quote !== '"' && quote !== '`') continue;
    let value = '';
    let escaped = false;
    let j = i + 1;
    for (; j < content.length; j++) {
      const ch = content[j];
      if (escaped) { value += ch; escaped = false; continue; }
      if (ch === '\\') { value += ch; escaped = true; continue; }
      if (ch === quote) break;
      value += ch;
    }
    if (j < content.length) {
      found.push(value);
      i = j;
    }
  }
  return found;
}

for (const [report, relativeDir] of targets) {
  const dir = path.join(repo, relativeDir);
  for (const entry of fs.readdirSync(dir, { withFileTypes:true })) {
    if (!entry.isFile() || !extensions.has(path.extname(entry.name).toLowerCase())) continue;
    const relativeFile = path.posix.join(relativeDir.replaceAll('\\','/'), entry.name);
    const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');
    quotedStrings(content).forEach((value, index) => addCandidate(value, `${report}:${relativeFile}:literal:${index}`));
    if (entry.name.endsWith('.html')) {
      const withoutScripts = content
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
      let match;
      const textNode = />([^<>]+)</g;
      let index = 0;
      while ((match = textNode.exec(withoutScripts))) add(match[1], `${report}:${relativeFile}:text:${index++}`);
      const attr = /\b(?:aria-label|alt|title|placeholder)\s*=\s*["']([^"']+)["']/gi;
      index = 0;
      while ((match = attr.exec(withoutScripts))) add(match[1], `${report}:${relativeFile}:attr:${index++}`);
    }
  }
}

const items = [...occurrences.values()].sort((a,b) => a.key.localeCompare(b.key));
const catalog = {
  schemaVersion:1,
  sourceLocale:'ko',
  generatedAt:new Date().toISOString(),
  translationProvider:'google-translate',
  reports:targets.map(([id]) => id),
  itemCount:items.length,
  items
};
fs.mkdirSync(path.dirname(output), { recursive:true });
fs.writeFileSync(output, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
console.log(`WROTE ${output}`);
console.log(`ITEMS ${items.length}`);
console.log(`SOURCE_CHARS ${items.reduce((sum,item) => sum + item.source.length, 0)}`);
