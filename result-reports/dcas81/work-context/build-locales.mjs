// Only NEW work-context source text is sent to Google; never profile or user input.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const locales=['ko','en','ja','zh','zh-TW','es','fr','ru','vi','th','ar','it','az','km','mn'];
const source={...JSON.parse(fs.readFileSync(path.join(root,'ui.ko.json'))),...JSON.parse(fs.readFileSync(path.join(root,'catalog.ko.json')))};
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
const tokenSet=text=>[...text.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort().join('|');
const directory=path.join(root,'translations');fs.mkdirSync(directory,{recursive:true});
const caches={};
const existing={};
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'../../locales/dcas-adult.locales.js'),'utf8'),ctx);
for(const [locale,entries] of Object.entries(ctx.window.__FG_REPORT_I18N__.locales)) existing[locale]=new Map(entries.map(e=>[e.source,e.target]));
async function translate(locale,texts){
  const tokens=[];
  const q=texts.map((text,i)=>`[[FG${String(i).padStart(3,'0')}]]\n`+text.replace(/\{\w+\}/g,t=>`__FGPH${String(tokens.push(t)-1).padStart(3,'0')}__`)).join('\n\n');
  const url=new URL('https://translate.googleapis.com/translate_a/single');
  Object.entries({client:'gtx',sl:'ko',tl:locale==='zh'?'zh-CN':locale,dt:'t',q}).forEach(([k,v])=>url.searchParams.set(k,v));
  const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
  if(!response.ok) throw new Error('Google HTTP '+response.status);
  let value=(await response.json())[0].map(r=>r[0]||'').join('').replace(/__\s*FGPH\s*(\d{3})\s*__/gi,(_,i)=>tokens[Number(i)]);
  const found=[...value.matchAll(/\[\[\s*FG\s*(\d{3})\s*\]\]\s*([\s\S]*?)(?=\[\[\s*FG\s*\d{3}\s*\]\]|$)/gi)];
  const out=[];
  for(const match of found){const i=Number(match[1]),t=match[2].trim();if(!t||/[가-힣]|FGPH/.test(t)||tokenSet(t)!==tokenSet(texts[i]))throw new Error('Invalid translation '+t);out[i]=t;}
  if(found.length!==texts.length||texts.some((_,i)=>!out[i]))throw new Error('Missing translation marker');
  return out;
}
async function run(locale){
  const file=path.join(directory,locale+'.json');
  const cache=caches[locale]=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{locale,provider:'google-translate',status:'machine-translated',entries:{}};
  const save=()=>fs.writeFileSync(file,JSON.stringify(cache,null,2)+'\n');
  const missing=[];
  for(const s of new Set(Object.values(source))){
    if(cache.entries[hash(s)]?.source===s)continue;
    const prior=existing[locale]?.get(s);
    if(prior&&!/[가-힣]/.test(prior)&&tokenSet(prior)===tokenSet(s))cache.entries[hash(s)]={source:s,target:prior,origin:'existing-unchanged'};
    else missing.push(s);
  }
  if(missing.length&&!process.argv.includes('--translate'))throw new Error(locale+': untranslated '+missing.length);
  for(let i=0;i<missing.length;i+=12){
    const batch=missing.slice(i,i+12);let result;
    try{result=await translate(locale,batch);}catch(e){console.warn(locale,'individual retry',e.message);result=[];for(const s of batch)result.push((await translate(locale,[s]))[0]);}
    batch.forEach((s,j)=>cache.entries[hash(s)]={source:s,target:result[j],origin:'google-new'});save();
    if(i%120===0||i+12>=missing.length)console.log(locale,Math.min(i+12,missing.length)+'/'+missing.length);
  }save();
}
for(let i=1;i<locales.length;i+=3)await Promise.all(locales.slice(i,i+3).map(run));
const sourceHash=hash(JSON.stringify(source));
const pack={sourceLocale:'ko',sourceHash,locales:{ko:source},metadata:{}};
for(const locale of locales.slice(1)){pack.locales[locale]=Object.fromEntries(Object.entries(source).map(([k,s])=>[k,caches[locale].entries[hash(s)].target]));pack.metadata[locale]={sourceHash,status:'machine-translated',provider:'google-translate'};}
fs.writeFileSync(path.join(root,'locales.js'),'(function(g){g.DCasWorkResources='+JSON.stringify(pack,null,2)+';})(typeof window!=="undefined"?window:globalThis);\n');
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({schemaVersion:1,program:'dcas-adult-work-context',sourceHash,locales,keys:Object.keys(source).length,translationStatus:'machine-translated',catalogVersion:'KECO-2025'},null,2)+'\n');
console.log('Built work-context bundle',Object.keys(source).length,'keys /',locales.length,'locales');
