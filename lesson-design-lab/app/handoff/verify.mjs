import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const inventory=JSON.parse(await fs.readFile(path.join(root,'SHA256SUMS.json'),'utf8'));
let failures=0;
for(const file of inventory.files){
 try{if(digest(await fs.readFile(path.join(root,file.path)))!==file.sha256)throw Error('hash mismatch')}
 catch(e){failures++;console.error(file.path,String(e))}
}
const source=JSON.parse(await fs.readFile(path.join(root,'provenance/source-files.json'),'utf8'));
for(const file of source.files){
 if(digest(await fs.readFile(path.join(root,file.path)))!==file.sha256){failures++;console.error('Workspace source identity mismatch:',file.path)}
}
console.log(`${inventory.files.length} package files; ${source.files.length} byte-identical workspace copies; ${failures} failures`);
process.exitCode=failures?1:0;
