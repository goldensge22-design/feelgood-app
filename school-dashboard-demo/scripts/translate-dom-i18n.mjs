import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');
const source=JSON.parse(fs.readFileSync(path.join(root,'i18n-source','dom-ko.json'),'utf8'));
const targets=['en','ja','zh-CN','zh-TW','es','fr','ru','vi','th','ar','it','az','mn','km'];
const outDir=path.join(root,'i18n-source','translated');
fs.mkdirSync(outDir,{recursive:true});

function chunks(entries,maxLength=3200){
  const result=[];let current=[],length=0;
  for(const entry of entries){
    const next=entry.source.length+20;
    if(current.length&&length+next>maxLength){result.push(current);current=[];length=0;}
    current.push(entry);length+=next;
  }
  if(current.length)result.push(current);
  return result;
}

function translateBatch(sourceLocale,locale,batch){
  const query=batch.map((entry,index)=>{
    const number=String(index).padStart(3,'0');
    const protectedSource=entry.source.replace(/__V([0-9]+)__/g,'<x id=V$1></x>');
    return `${protectedSource}\nZXQEND${number}ZXQ`;
  }).join('\n');
  const args=['-sS','--max-time','60','--get','--data-urlencode','client=gtx','--data-urlencode',`sl=${sourceLocale}`,'--data-urlencode',`tl=${locale}`,'--data-urlencode','dt=t','--data-urlencode',`q=${query}`,'https://translate.googleapis.com/translate_a/single'];
  for(let attempt=1;attempt<=3;attempt++){
    const call=spawnSync('curl.exe',args,{encoding:'utf8',maxBuffer:8*1024*1024});
    if(call.status!==0){if(attempt===3)throw new Error(`${locale}: curl failed: ${call.stderr}`);continue;}
    try{
      const data=JSON.parse(call.stdout);
      const text=(data[0]||[]).map(part=>part[0]||'').join('');
      const translated={};
      let cursor=0;
      batch.forEach((entry,index)=>{
        const number=String(index).padStart(3,'0');
        const endMarker=`ZXQEND${number}ZXQ`;
        const end=text.indexOf(endMarker,cursor);
        if(end<0)throw new Error(`missing end marker ${endMarker}`);
        const segment=text.slice(cursor,end);
        translated[entry.key]=segment.trim().replace(/<x\s+id\s*=\s*["']?\s*V([0-9]+)\s*["']?\s*>\s*<\/x\s*>/gi,'__V$1__');
        cursor=end+endMarker.length;
      });
      for(const entry of batch){
        const value=translated[entry.key];
        if(!value)throw new Error(`empty translation for ${entry.key}`);
        const expected=new Set([...entry.source.matchAll(/__V([0-9]+)__/g)].map(x=>x[1]));
        const actual=new Set([...value.matchAll(/__V([0-9]+)__/g)].map(x=>x[1]));
        const missing=[...expected].filter(marker=>!actual.has(marker));
        const unexpected=[...actual].filter(marker=>!expected.has(marker));
        if(unexpected.length)throw new Error(`placeholder mismatch for ${entry.key}: unexpected ${unexpected}`);
        if(missing.length){
          translated[entry.key]+=` (${missing.map(marker=>`__V${marker}__`).join(' · ')})`;
          console.warn(`${locale}: preserved omitted placeholders for ${entry.key}: ${missing.join(',')}`);
        }
      }
      return translated;
    }catch(error){if(attempt===3)throw error;}
  }
}

for(const locale of targets){
  const file=path.join(outDir,`${locale}.json`);
  let messages={};
  if(!process.argv.includes('--fresh')&&fs.existsSync(file))messages=JSON.parse(fs.readFileSync(file,'utf8')).messages||{};
  let translationSource='ko';
  let entries=source.strings;
  if(locale!=='en'){
    translationSource='en';
    const english=JSON.parse(fs.readFileSync(path.join(outDir,'en.json'),'utf8')).messages;
    entries=source.strings.map(entry=>({...entry,source:english[entry.key]}));
  }
  const pending=entries.filter(entry=>!messages[entry.key]);
  const work=chunks(pending);
  console.log(`${locale}: ${pending.length} pending in ${work.length} batches`);
  for(let index=0;index<work.length;index++){
    Object.assign(messages,translateBatch(translationSource,locale,work[index]));
    fs.writeFileSync(file,`${JSON.stringify({locale,sourceLocale:'ko',translationSource,status:'ai-draft',normalizationVersion:source.normalizationVersion,messages},null,2)}\n`);
    console.log(`${locale}: batch ${index+1}/${work.length}`);
  }
}
console.log('DOM translation drafts complete.');
