import fs from 'node:fs';
import assert from 'node:assert/strict';
import {transformStudio} from '../../artifacts/nuvia-ui-review/src/studio/i18n/compiler.mjs';
const root='artifacts/nuvia-ui-review/src/studio',dir=root+'/i18n/locales';
const locales=['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'];
const ko=JSON.parse(fs.readFileSync(dir+'/ko.json','utf8')),keys=Object.keys(ko).sort();
const notes=JSON.parse(fs.readFileSync(root+'/i18n/note-resources.json','utf8'));
for(const locale of locales){
 assert.equal(notes[locale].length,notes.keys.length,'daily note key coverage: '+locale);
 for(const value of notes[locale]){assert.equal(typeof value,'string');assert(value.trim());if(locale!=='ko')assert(!/[가-힣]/.test(value),'daily note Korean fallback: '+locale);}
}
assert.equal(new Set(notes.keys).size,notes.keys.length);
assert.equal(notes.status,'AI_DRAFT_NOT_HUMAN_REVIEWED');
const markers=s=>[...s.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(m=>m[1]).sort();
const html=s=>s.match(/<\/?[A-Za-z][^>]*>/g)||[];
const css=s=>s.match(/<style>[\s\S]*?<\/style>/g)||[];
const scripts={ja:/[ぁ-ヿ㐀-鿿]/,'zh-CN':/[㐀-鿿]/,'zh-TW':/[㐀-鿿]/,mn:/[Ѐ-ӿ]/,ru:/[Ѐ-ӿ]/,ar:/[؀-ۿ]/,th:/[\u0e00-\u0e7f]/,km:/[\u1780-\u17ff]/};
const rows=[];
for(const locale of locales){
 const errors=[],r=JSON.parse(fs.readFileSync(`${dir}/${locale}.json`,'utf8'));
 notes[locale].forEach((value,i)=>{
  if(scripts[locale]&&!scripts[locale].test(value))errors.push('note.'+notes.keys[i]+': target script');
  if(JSON.stringify(markers(value))!==JSON.stringify(markers(notes.ko[i])))errors.push('note.'+notes.keys[i]+': placeholders');
  if(JSON.stringify(html(value))!==JSON.stringify(html(notes.ko[i])))errors.push('note.'+notes.keys[i]+': HTML');
 });
 if(JSON.stringify(Object.keys(r).sort())!==JSON.stringify(keys))errors.push('key set mismatch');
 for(const key of keys){
  const text=r[key];if(typeof text!=='string'||!text.trim()){errors.push(key+': missing/empty');continue;}
  if(locale!=='ko'&&/[가-힣]/.test(text))errors.push(key+': Hangul remains');
  if(scripts[locale]&&!scripts[locale].test(text))errors.push(key+': target language script missing');
  if(locale==='km'&&/[\u0e00-\u0e7f]/.test(text)||locale==='th'&&/[\u1780-\u17ff]/.test(text))errors.push(key+': wrong language script');
  if(JSON.stringify(markers(text))!==JSON.stringify(markers(ko[key])))errors.push(key+': placeholders');
  if(JSON.stringify(html(text))!==JSON.stringify(html(ko[key])))errors.push(key+': HTML');
  if(JSON.stringify(css(text))!==JSON.stringify(css(ko[key])))errors.push(key+': CSS');
 }
 rows.push({locale,keys:Object.keys(r).length,status:errors.length?'FAIL':'PASS',errors,review:locale==='ko'?'SOURCE':'AI_DRAFT_NOT_HUMAN_REVIEWED'});
}
const uncovered=[];
for(const file of fs.readdirSync(root).filter(f=>/\.tsx?$/.test(f))){
 transformStudio(fs.readFileSync(root+'/'+file,'utf8'),root+'/'+file,(key,text)=>{if(ko[key]!==text)uncovered.push({file,key,text});},false);
}
const result={resourceKeys:keys.length,extensions:{dailyNote:{keys:notes.keys.length,locales:locales.length,status:notes.status}},locales:rows,uncoveredSource:uncovered};
fs.mkdirSync('generated-artifacts/studio-i18n',{recursive:true});
fs.writeFileSync('generated-artifacts/studio-i18n/resource-validation.json',JSON.stringify(result,null,2));
for(const row of rows)console.log(row.locale,row.status,row.keys,'keys',row.errors.length,'errors');
console.log('Daily note extension:',notes.keys.length,'keys ×',locales.length,'locales;',notes.status);
assert.equal(uncovered.length,0,'unextracted source copy');
assert(rows.every(r=>r.status==='PASS'),'resource validation failed');
