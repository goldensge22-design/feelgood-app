import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

// Read-only verification. Never applies the vendor patch or changes a checkout.
const root=path.dirname(fileURLToPath(import.meta.url));
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const json=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const safe=(base,relative)=>{
  const resolved=path.resolve(base,relative);
  if(!resolved.startsWith(path.resolve(base)+path.sep))throw Error('Unsafe path: '+relative);
  return resolved;
};
const errors=[];
let checksums=0;
for(const line of fs.readFileSync(path.join(root,'SHA256SUMS.txt'),'utf8').trim().split(/\r?\n/)){
  const match=line.match(/^([a-f0-9]{64})\s+(.+)$/);
  if(!match){errors.push('Invalid checksum row');continue;}
  if(hash(safe(root,match[2]))!==match[1])errors.push('Checksum mismatch: '+match[2]);
  checksums++;
}
const manifest=json('SOURCE_MANIFEST.json');
for(const row of manifest.files){
  if(hash(safe(path.join(root,'payload'),row.path))!==row.after)errors.push('Payload mismatch: '+row.path);
}
const expected=['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'];
const prefix='payload/artifacts/nuvia-ui-review/src/practice-recommendations/';
const source=json(prefix+'locales/ko.json');
const keys=Object.keys(source).sort();
const placeholders=text=>[...new Set([...text.matchAll(/\{([A-Za-z_][\w]*)\}/g)].map(m=>m[1]))].sort().join('|');
for(const locale of expected){
  const values=json(prefix+'locales/'+locale+'.json');
  if(Object.keys(values).sort().join('|')!==keys.join('|'))errors.push('Key mismatch: '+locale);
  for(const key of keys){
    if(typeof values[key]!=='string'||!values[key].trim())errors.push('Empty/non-string: '+locale+'/'+key);
    else if(placeholders(values[key])!==placeholders(source[key]))errors.push('Placeholder mismatch: '+locale+'/'+key);
  }
}
const status=json(prefix+'translation-status.json');
if(status.keyCount!==keys.length||status.locales.length!==expected.length)errors.push('Translation manifest count mismatch');
if(status.nativeSpeakerReviewed||status.contentProfessionalReview||status.efficacyEstablished)errors.push('Unexpected review promotion');
const original=path.join(root,'NUVIA_STUDIO_DAILY_PRACTICE_REVIEW_PATCH.zip');
if(hash(original)!=='ab061639e4e3d2dee20d6cf6a911070c20445dc83d5725ad89d04bcb841c5396')errors.push('Original ZIP mismatch');
const args=process.argv.slice(2),baselineArg=args.indexOf('--baseline');
let baseline=null;
if(baselineArg!==-1){
  if(!args[baselineArg+1])throw Error('--baseline requires a checkout directory');
  const base=path.resolve(args[baselineArg+1]);
  const conflicts=[];
  let matching=0;
  for(const row of manifest.files){
    const f=safe(base,row.path),current=fs.existsSync(f)?hash(f):null;
    if(current!==row.before)conflicts.push({path:row.path,reason:current===null?'required baseline file missing':row.before===null?'new path already exists':'before hash differs'});
    else matching++;
  }
  baseline={matching,conflicts,readyToApply:conflicts.length===0};
}
console.log(JSON.stringify({packageIntegrity:errors.length?'FAIL':'PASS',checksums,sourceFiles:manifest.files.length,localeFiles:expected.length,keysPerLocale:keys.length,translationReview:status.status,errors,baseline},null,2));
if(errors.length)process.exitCode=1;
else if(baseline&&!baseline.readyToApply)process.exitCode=2;
