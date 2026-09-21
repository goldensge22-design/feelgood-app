import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const localeDir = path.join(repo, 'result-reports', 'locales');
const output = path.join(repo, 'result-reports', 'i18n-work', 'residual-source-catalog.ko.json');
const items = new Map();
const reports = ['kpass-child','dcas-teen','dcas-adult'];

for (const reportId of reports) {
  const sandbox = {window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(localeDir, `${reportId}.locales.js`),'utf8'),sandbox);
  const bundle = sandbox.window.__FG_REPORT_I18N__;
  for (const [locale,entries] of Object.entries(bundle.locales)) {
    for (const entry of entries) {
      if (!/[가-힣]/.test(entry.target) && !/__FG|\[\[\s*(?:FG|FGU)_/.test(entry.target)) continue;
      let protectedText = entry.source;
      (entry.placeholders || []).forEach((placeholder,index) => {
        protectedText = protectedText.replaceAll(placeholder, `__FGPH_${String(index).padStart(3,'0')}__`);
      });
      const context = `${reportId}:bundle-residual:${locale}`;
      if (items.has(entry.key)) {
        if (!items.get(entry.key).contexts.includes(context)) items.get(entry.key).contexts.push(context);
      } else {
        items.set(entry.key,{key:entry.key,source:entry.source,protected:{text:protectedText,placeholders:entry.placeholders || []},contexts:[context]});
      }
    }
  }
}

for (const source of ['계획력은','주의력은','동시처리는','순차처리는']) {
  const key = `FGR_${crypto.createHash('sha256').update(source).digest('hex').slice(0,16).toUpperCase()}`;
  items.set(key,{key,source,protected:{text:source,placeholders:[]},contexts:reports.map((reportId)=>`${reportId}:runtime-fragment`)});
}

const catalog = {schemaVersion:1,sourceLocale:'ko',generatedAt:new Date().toISOString(),translationProvider:'google-translate-web',reports,itemCount:items.size,items:[...items.values()]};
fs.writeFileSync(output,JSON.stringify(catalog,null,2)+'\n','utf8');
console.log(`WROTE ${output} ITEMS ${catalog.itemCount}`);
