// Incremental Google translation. Sends ONLY source recommendation text, never profiles.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const kinds = ['kpass-child','dcas-teen','dcas-adult'];
const locales = ['ko','en','ja','zh','zh-TW','es','fr','ru','vi','th','ar','it','az','km','mn'];
const sources = Object.fromEntries(kinds.map(kind => [kind,JSON.parse(fs.readFileSync(path.join(root,'sources',kind+'.ko.json'),'utf8'))]));
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const unique = [...new Set(Object.values(sources).flatMap(source => Object.values(source)))];
const tokenSet = text => [...text.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort().join('|');
const outDir = path.join(root,'translations');
fs.mkdirSync(outDir,{recursive:true});
const caches = {};
const existing = {};
// Reuse established PASS terminology; isolated 상/하 must not become "award"/"ha".
const glossaryContext={console};glossaryContext.window=glossaryContext;
for(const file of ['../locales/dcas-adult.locales.js','../dcas81/unpacked/APPLIED_FULL/DCAS_ADULT/dcas-profile81-bank.js','../dcas81/unpacked/APPLIED_FULL/DCAS_ADULT/dcas-profile81-unique-names.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),glossaryContext);
}
for (const kind of kinds) {
  const context={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'../locales',kind+'.locales.js'),'utf8'),context);
  for (const [locale,entries] of Object.entries(context.window.__FG_REPORT_I18N__.locales)) {
    existing[locale] ||= new Map();
    entries.forEach(entry=>existing[locale].set(entry.source,entry.target));
  }
}
function save(locale) { fs.writeFileSync(path.join(outDir,locale+'.json'),JSON.stringify(caches[locale],null,2)+'\n'); }
async function translateBatch(locale, texts) {
  const tokens=[];
  const q=texts.map((text,index)=>`[[FG${String(index).padStart(3,'0')}]]\n`+text.replace(/\{\w+\}/g, token=>{
    const i=tokens.push(token)-1; return `__FGPH${String(i).padStart(3,'0')}__`;
  })).join('\n\n');
  const url=new URL('https://translate.googleapis.com/translate_a/single');
  Object.entries({client:'gtx',sl:'ko',tl:locale==='zh'?'zh-CN':locale,dt:'t',q}).forEach(([k,v])=>url.searchParams.set(k,v));
  const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
  if(!response.ok) throw new Error('Google HTTP '+response.status);
  const body=await response.json();
  let text=body[0].map(row=>row[0]||'').join('');
  text=text.replace(/__\s*FGPH\s*(\d{3})\s*__/gi,(_,index)=>tokens[Number(index)]);
  const found=[...text.matchAll(/\[\[\s*FG\s*(\d{3})\s*\]\]\s*([\s\S]*?)(?=\[\[\s*FG\s*\d{3}\s*\]\]|$)/gi)];
  if(found.length!==texts.length) throw new Error('Translation marker mismatch: '+text.slice(0,100));
  const output=[];
  for (const match of found) {
    const index=Number(match[1]), target=match[2].trim();
    if(!target || /[가-힣]|FGPH|\[\[FG/.test(target) || tokenSet(target)!==tokenSet(texts[index])) throw new Error('Translation validation failed: '+target);
    output[index]=target;
  }
  if(output.length!==texts.length||texts.some((_,i)=>!output[i])) throw new Error('Missing translation');
  return output;
}
async function runLocale(locale) {
  const file=path.join(outDir,locale+'.json');
  caches[locale]=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{locale,provider:'google-translate',status:'machine-translated-technical-qa-pending',entries:{}};
  caches[locale].status='machine-translated';
  const cache=caches[locale].entries;
  const missing=[];
  for(const source of unique) {
    if(cache[hash(source)]?.source===source) continue;
    const prior=existing[locale]?.get(source);
    if(prior && tokenSet(prior)===tokenSet(source) && !/[가-힣]/.test(prior)) cache[hash(source)]={source,target:prior,origin:'existing-unchanged'};
    else missing.push(source);
  }
  if(missing.length && !process.argv.includes('--translate')) throw new Error(`${locale}: ${missing.length} untranslated strings; run --translate`);
  for(let i=0;i<missing.length;i+=6) {
    const batch=missing.slice(i,i+6); let translated;
    try { translated=await translateBatch(locale,batch); }
    catch(error) {
      console.warn(locale,'batch retry individually:',error.message);
      translated=[];
      for(const source of batch) translated.push((await translateBatch(locale,[source]))[0]);
    }
    batch.forEach((source,index)=>cache[hash(source)]={source,target:translated[index],origin:'google-new'});
    save(locale);
    console.log(locale,Math.min(i+6,missing.length)+'/'+missing.length);
  }
  save(locale);
}
// Bound concurrency; identical source is translated once and copied into independent program resources.
for(let i=1;i<locales.length;i+=2) await Promise.all(locales.slice(i,i+2).map(runLocale));
const manifest={schemaVersion:1,version:'2026-10-17.1',sourceLocale:'ko',locales,provider:'google-translate',status:'machine-translated',technicalQA:'../PASS_GUIDANCE_PATCH.md',programs:{}};
for(const kind of kinds) {
  const source=sources[kind], sourceHash=hash(JSON.stringify(source));
  const pack={schemaVersion:1,kind,sourceHash,locales:{ko:source},metadata:{}};
  for(const locale of locales.slice(1)) {
    pack.locales[locale]=Object.fromEntries(Object.entries(source).map(([key,value])=>[key,caches[locale].entries[hash(value)].target]));
    for(const fragment of glossaryContext.DCasProfile81.classify({P:30,A:60,S:85,Q:30},locale).fragments) {
      pack.locales[locale]['axis.'+fragment.axis]=fragment.axisLabel;
      pack.locales[locale]['level.'+fragment.level]=fragment.levelLabel;
    }
    pack.metadata[locale]={sourceHash,status:'machine-translated',terminologySource:'existing-profile81-bank'};
  }
  fs.writeFileSync(path.join(root,kind+'.locales.js'),'(function(g){g.FeelGoodGuidanceResources=g.FeelGoodGuidanceResources||{};g.FeelGoodGuidanceResources['+JSON.stringify(kind)+']='+JSON.stringify(pack,null,2)+';})(typeof window!=="undefined"?window:globalThis);\n');
  manifest.programs[kind]={sourceHash,keys:Object.keys(source).length,bundle:kind+'.locales.js'};
}
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Built independent guidance bundles for 3 reports / 15 locales');
