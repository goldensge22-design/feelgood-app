import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { LabSearchError,runLabWebSearch } from '../../artifacts/api-server/src/lib/career-lab-web';
import { isUsefulKeyword } from '../../artifacts/api-server/src/lib/career-lab-evidence-quality';

// Opt-in: three real searches, no user/assessment input.
if(process.env.NUVIA_LAB_LIVE_QA!=='1')throw Error('Set NUVIA_LAB_LIVE_QA=1 to authorize the provider calls');
const out=resolve(import.meta.dirname,'../../generated-artifacts',process.env.NUVIA_REVIEW_QA_DIR??'nuvia-review-gpt-lab-qa');
const started=new Date().toISOString();
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const cases=await Promise.all([{company:'대한항공',job:'지상직'},{company:'프로에스콤',job:'보안'},{company:'네이버',job:'서비스기획'}].map(async query=>{
  const at=Date.now();
  try{
    const answer=await runLabWebSearch(query);
    const rows=answer.result.materials.flatMap(m=>m.evidence.map(row=>({row,informative:isUsefulKeyword(row.keyword,[query.company,query.job,m.company,m.job])})));
    const keywordCheck=rows.length>0&&rows.every(x=>x.informative&&!!x.row.keywordOrigin);
    const wrongExperienceBucket=rows.some(({row})=>row.category==='duties'&&/끝까지 해 보신 분|경험이 있으신 분/.test(row.excerpt));
    return {query,...answer,quality:{keywordCheck,wrongExperienceBucket,labels:rows.map(({row})=>[row.category,row.keyword,row.keywordOrigin])},elapsedMs:Date.now()-at};
  }
  catch(error){return {query,elapsedMs:Date.now()-at,...(error instanceof LabSearchError?
    {code:error.code,status:error.status,diagnostic:error.diagnostic}:{code:'UNEXPECTED_ERROR'})};}
}));
await mkdir(out,{recursive:true});
await writeFile(resolve(out,'live-provider.json'),JSON.stringify({head,started,ended:new Date().toISOString(),cases},null,2));
console.dir(cases.map(x=>({query:x.query,count:x.result?.materials.flatMap(m=>m.evidence).length,quality:x.quality,usage:x.usage,status:x.status,code:x.code,diagnostic:x.diagnostic,elapsedMs:x.elapsedMs})),{depth:5});
if(cases.some(x=>!x.quality?.keywordCheck||x.quality.wrongExperienceBucket))process.exitCode=1;
