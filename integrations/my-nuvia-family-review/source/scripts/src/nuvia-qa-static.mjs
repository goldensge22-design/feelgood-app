import { readFile, mkdir, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fingerprint, qaDir } from './nuvia-qa-baseline.mjs';
const codes=['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'];
const dicts={},results=[];
const extra=await readFile('artifacts/my-nuvia/src/i18n/first-week.ts','utf8');
const first=vm.runInNewContext('('+extra.slice(extra.indexOf('= {')+2,extra.indexOf('\n}')+2)+')');
for(const code of codes) {
  const src=await readFile(`artifacts/my-nuvia/src/i18n/${code}.ts`,'utf8');
  const values=vm.runInNewContext('('+src.slice(src.indexOf('= {')+2,src.indexOf('\n}')+2)+')');
  dicts[code]=values;
  const keys=[...src.matchAll(/^  ['"]([^'"]+)['"]:/gm)].map(m=>m[1]);
  assert.equal(keys.length,new Set(keys).size);
  assert.deepEqual(Object.keys(values).sort(),Object.keys(dicts.ko).sort());
  for(const [key,value]of Object.entries({...values,...first[code]})) {
    assert.ok(value.trim(),`${code}/${key} empty`);
    assert.ok(!/<\s*script|javascript:|onerror\s*=/i.test(value),`${code}/${key} unsafe`);
    const reference=dicts.ko[key]??first.ko[key];
    assert.deepEqual([...value.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(),[...reference.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort());
    if(code!=='ko')assert.ok(!/[가-힣]/.test(value),`${code}/${key} Korean residue`);
  }
  results.push({language:code,status:'PASS',keys:keys.length,firstWeekKeys:Object.keys(first[code]).length,duplicateEmptyPlaceholdersUnsafeHangul:'checked',translationStatus:code==='ko'?'source; no independent native review':'machine-assisted draft; native review NOT RUN'});
}
const runtime=await readFile('artifacts/my-nuvia/src/i18n/index.tsx','utf8');
const dynamicLoading=/\bimport\s*\(/.test(runtime);
assert.equal(dynamicLoading,false);
await mkdir(qaDir,{recursive:true});
await writeFile(`${qaDir}/static.json`,JSON.stringify({at:new Date().toISOString(),baseline:await fingerprint(),results,translationNetworkFaults:{status:'NOT_APPLICABLE',reason:'All 15 dictionaries synchronously statically imported; no async language loader or translation API. Core-JS failure is not a late translation response.'},formatExport:{status:'NOT_APPLICABLE',reason:'No app PDF/DOCX/export action. Browser print audited separately.'}},null,2));
console.log('PASS static 15 × (265 + 3) keys; native review NOT RUN; async translation requests N/A');
