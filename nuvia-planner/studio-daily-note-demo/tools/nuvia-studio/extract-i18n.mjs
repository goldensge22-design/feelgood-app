import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {transformStudio,keyFor} from '../../artifacts/nuvia-ui-review/src/studio/i18n/compiler.mjs';
const dir='artifacts/nuvia-ui-review/src/studio',sources={};
let messages={};try{messages=JSON.parse(await readFile(dir+'/i18n/locales/ko.json','utf8'));}catch{}
for(const f of await readdir(dir)){
 if(!/\.tsx?$/.test(f))continue;
 const file=path.join(dir,f),text=await readFile(file,'utf8');
 transformStudio(text,file,(key,value,file,offset)=>{messages[key]=value;(sources[key]??=[]).push({file,offset});},false);
}
// Imported legacy label/error text is read-only. Its source is never transformed.
for(const f of ['model.ts','domain.ts']){
 const file='artifacts/nuvia-ui-review/src/enhancement/'+f;
 transformStudio(await readFile(file,'utf8'),file,(key,value,file,offset)=>{messages[key]=value;(sources[key]??=[]).push({file,offset});},false);
}
await mkdir(dir+'/i18n/locales',{recursive:true});
await writeFile(dir+'/i18n/locales/ko.json',JSON.stringify(messages,null,2)+'\n');
await writeFile(dir+'/i18n/catalogue.json',JSON.stringify(sources,null,2)+'\n');
console.log(Object.keys(messages).length,'keys',JSON.stringify(messages).length,'characters');
