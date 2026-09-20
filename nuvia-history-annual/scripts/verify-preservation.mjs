import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve('..'),prefix='nuvia-history-w24';
const baseline='cede993abcb68b5d017b1ca147ce335fc6f98bd6';
const git=(args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const changed=git(['diff','--name-status',baseline,'--',prefix]);
if(changed)throw Error('Protected baseline diff: '+changed);
const tracked=git(['ls-files',prefix]).split('\n').filter(Boolean);
const oldManifest=JSON.parse(fs.readFileSync(path.join(root,prefix,'outputs/NUVIA_HISTORY_MASTER_RULES_v1.1/PROTECTED_FILES_INTEGRITY.json'),'utf8'));
const checked=[],hash=b=>createHash('sha256').update(b).digest('hex');
for(const file of oldManifest.files){
 const normalized=file.path.replaceAll('\\','/'),offset=normalized.indexOf('/outputs/');
 if(offset<0)throw Error('Unknown manifest source root');
 const relative=normalized.slice(offset+9),target=path.resolve(root,prefix,'outputs',relative);
 if(!target.startsWith(path.resolve(root,prefix,'outputs')+path.sep))throw Error('Unsafe manifest path');
 if(!fs.existsSync(target)){checked.push({relative,status:'not-present-in-recovered-baseline'});continue;}
 const actual=hash(fs.readFileSync(target));
 checked.push({relative,status:actual===(file.afterSHA256||file.beforeSHA256)?'original-hash-match':'historical-hash-difference',actual,expected:file.afterSHA256||file.beforeSHA256});
}
const report={baseline,trackedFilesCompared:tracked.length,changedSinceRecoveredBaseline:0,
 historicalManifestEntries:checked.length,
 originalHashMatch:checked.filter(x=>x.status==='original-hash-match').length,
 historicalHashDifference:checked.filter(x=>x.status==='historical-hash-difference').length,
 notPresentInRecoveredBaseline:checked.filter(x=>x.status==='not-present-in-recovered-baseline').length,
 note:'Historical manifest describes an earlier PC/version. Differences and absent files are not claimed as restored; Git comparison verifies this work did not modify the recovered baseline.',
 files:checked};
fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/preservation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,files:undefined}));
