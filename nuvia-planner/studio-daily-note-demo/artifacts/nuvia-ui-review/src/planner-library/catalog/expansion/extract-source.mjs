// Read-only catalog extraction. Runs only the pinned local report scripts, never downloaded code.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(process.argv[2]||'');
const expected='35a3216e980bd4dd0c0391e5c6790508bb9e72f7';
if(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()!==expected) throw Error('SOURCE_HEAD_MISMATCH');
if(execFileSync('git',['status','--porcelain','--','result-reports/dcas81/unpacked/APPLIED_FULL'],{cwd:root,encoding:'utf8'}).trim()) throw Error('SOURCE_DIRTY');
const prefix='result-reports/dcas81/unpacked/APPLIED_FULL/';
const hashes={};
function read(rel){const s=fs.readFileSync(path.join(root,prefix,rel),'utf8').replace(/\r\n/g,'\n');hashes[prefix+rel]=crypto.createHash('sha256').update(s).digest('hex');return s;}
const adult=vm.createContext({});
for(const f of ['dcas-job-engine.js','dcas-major-requirements.js','dcas-jobs-major47.js','dcas-jobs-extra.js']) vm.runInContext(read('DCAS_ADULT/'+f),adult,{timeout:2000});
const html=read('DCAS_ADULT/adult.work.html');
const base=JSON.parse(html.match(/<script[^>]*id=["']job-pool-data["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
const pool=[...base,...adult.DCasJobsExtra.JOB_POOL_EXTRA,...adult.DCasMajor47.JOB_POOL];
const select=html.match(/<select[^>]*id="majorSelect"[^>]*>([\s\S]*?)<\/select>/)[1];
const majors=[...select.matchAll(/<option([^>]*)>(.*?)<\/option>/g)].map(m=>m[1].match(/value="([^"]*)"/)?.[1]??m[2]).filter(x=>x&&x!=='__custom__');
// Use source filters only, never recompute or export suitability scores or PASS vectors.
const majorJobs=majors.map(name=>{const v=adult.DCasJobEngine.MAJOR_TO_NCS_MIDDLE[name];const groups=Array.isArray(v)?v:[v];return {name,jobIds:pool.filter(j=>name==='항공보안학과'||name==='항공보안과'?j.id>=9101&&j.id<=9110:groups.includes(j.ncs.middle_name)).map(j=>String(j.id)).sort()};});
const jobs=pool.map(j=>({id:String(j.id),label:j.label_ko,sourceGroup:j.ncs.middle_name,sourceMajorGroup:j.ncs.major_name,majorNames:majorJobs.filter(m=>m.jobIds.includes(String(j.id))).map(m=>m.name)})).sort((a,b)=>a.id.localeCompare(b.id));
if(jobs.some(j=>!j.label)) {console.log(pool[0]);throw Error('UNKNOWN_LABEL_FIELD');}
const teen=vm.createContext({});teen.window=teen;
for(const f of ['dcas-major-requirements.js','dcas-teen-dept-engine.js']) vm.runInContext(read('DCAS_TEEN/'+f),teen,{timeout:2000});
const previews=teen.DCasTeenDeptEngine.JOB_PREVIEW;
const labels=new Map();
for(const [category,groups] of Object.entries(previews)) for(const [groupIndex,g] of groups.entries()) for(const [pillIndex,label] of g.pills.entries()) {
  if(!labels.has(label))labels.set(label,{id:'teen-'+crypto.createHash('sha256').update(label).digest('hex').slice(0,12),label,sourceIdentity:'internal-label-snapshot-not-official-job-code',occurrences:[]});
  labels.get(label).occurrences.push({category,groupIndex,pillIndex});
}
const teenJobs=[...labels.values()];
const normalize=x=>x.replace(/\s+/g,'');
const duplicateAdultLabels=Object.entries(Object.groupBy(jobs,j=>j.label)).filter(([,a])=>a.length>1).map(([label,a])=>({label,ids:a.map(j=>j.id)}));
const exactNameLinks=teenJobs.map(t=>({teenId:t.id,label:t.label,adultIds:jobs.filter(j=>normalize(j.label)===normalize(t.label)).map(j=>j.id),identityConfirmed:false})).filter(x=>x.adultIds.length);
const data={schema:'feelgood.planner.catalog-snapshot/v1',sourceCommit:expected,sourceHashes:hashes,adult:{majorJobs,jobs:jobs.filter(j=>j.majorNames.length),excludedJobs:jobs.filter(j=>!j.majorNames.length),duplicateLabels:duplicateAdultLabels},teen:{categoryMajors:teen.DCasTeenDeptEngine.CATEGORY_MAJORS,jobs:teenJobs},exactNameLinks};
fs.writeFileSync(path.join(here,'catalog.json'),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({adultMajors:majors.length,adultJobs:data.adult.jobs.length,excluded:data.adult.excludedJobs,teenJobs:teenJobs.length,adultGroups:[...new Set(jobs.map(j=>j.sourceGroup))],teenPreview:previews},null,2));
