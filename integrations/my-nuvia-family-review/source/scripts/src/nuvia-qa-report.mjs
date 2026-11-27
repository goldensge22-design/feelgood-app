import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fingerprint,qaDir } from './nuvia-qa-baseline.mjs';
const dirs=process.argv.slice(2);
assert.ok(dirs.length);
const rows=[],runs=[],pdfs=[];
for(const dir of dirs) {
  const path=`${qaDir}/${dir}`,d=JSON.parse(await readFile(`${path}/results.json`,'utf8'));
  const f=JSON.parse(await readFile(`${path}/finish.json`,'utf8'));
  runs.push({dir,startedAt:d.startedAt,finishedAt:f.finishedAt,start:d.baseline.sha256,end:f.baseline.sha256,unchanged:f.unchanged});
  for(const r of d.results)rows.push({language:r.lang,width:r.viewport.width,height:r.viewport.height,role:r.role,status:r.status,pass:r.steps.filter(s=>s.status==='PASS').length,fail:r.steps.filter(s=>s.status==='FAIL').length,recommendation:r.recommendationBranch??'teacher separate shell',evidence:`${path}/results.json`,audits:r.audits.length,axeChecks:r.audits.filter(a=>a.axe).length});
  for(const name of (await readdir(path)).filter(n=>n.endsWith('.pdf'))) {
    const text=execFileSync('pdftotext',['-layout',`${path}/${name}`,'-'],{encoding:'utf8'});
    const lang=name.split('-')[0];
    const issues=[];
    if(lang!=='ko'&&/[가-힣]/.test(text))issues.push('Korean residue');
    if(/QA execution|SHA-256|browser groups PASS|source unchanged|qa-regression/i.test(text))issues.push('internal metadata');
    if(/\ufffd/.test(text))issues.push('Unicode replacement glyph');
    if(!text.trim())issues.push('empty PDF');
    pdfs.push({file:`${path}/${name}`,status:issues.length?'FAIL':'PASS',issues,characters:text.length,pages:(text.match(/\f/g)??[]).length});
  }
}
const current=await fingerprint();
const codes=['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'];
const expected=codes.flatMap(l=>[360,768,1440].flatMap(w=>['parent','child','teacher'].map(r=>`${l}-${w}-${r}`))).sort();
assert.deepEqual(rows.map(r=>`${r.language}-${r.width}-${r.role}`).sort(),expected,'Missing or duplicated language/viewport/role cases');
for(const pdf of pdfs) {
  const bbox=execFileSync('pdftotext',['-bbox',pdf.file,'-'],{encoding:'utf8',maxBuffer:8*1024*1024});
  const pages=[...bbox.matchAll(/<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g)];
  const outside=[];
  for(let i=0;i<pages.length;i++) {
    const [,w,h,body]=pages[i];
    for(const word of body.matchAll(/<word xMin="([\d.-]+)" yMin="([\d.-]+)" xMax="([\d.-]+)" yMax="([\d.-]+)">/g)) {
      const [,x,y,right,bottom]=word.map(Number);
      if(x < -1 || y < -1 || right > Number(w)+1 || bottom > Number(h)+1)outside.push(i+1);
    }
  }
  pdf.outsidePageWords=outside.length;
  if(outside.length){pdf.status='FAIL';pdf.issues.push('Word bounding box outside printed page');}
}
const summary={
 executedAt:new Date().toISOString(),baseline:current.sha256,
 unchanged:runs.every(r=>r.unchanged&&r.start===current.sha256),
 rows,evidence:`${qaDir}/final-report.json · docs/MY-NUVIA-FULL-QA.md`,
 limitations:['Fictional review accounts only; FeelGood production authentication/integration/live AI NOT CONNECTED.',
 'Chromium browser viewport emulation, not physical iOS/Android devices. Screen-reader and native-speaker review NOT RUN.',
 'Client timer expiry uses a controlled browser clock. Session invalidation uses server revocation, not a real 30-minute wait.',
 'Translation dictionaries are static imports; late translation API responses/failures NOT APPLICABLE.',
 'Browser print only; app-specific PDF/DOCX export NOT PROVIDED. Automated geometry/axe checks are not a complete human visual/accessibility certification.']
};
await writeFile(`${qaDir}/final-report.json`,JSON.stringify({...summary,runs,pdfs,totals:{roleCases:rows.length,passed:rows.filter(r=>r.status==='PASS').length,failed:rows.filter(r=>r.status!=='PASS').length,steps:rows.reduce((n,r)=>n+r.pass+r.fail,0),axeChecks:rows.reduce((n,r)=>n+r.axeChecks,0),pdfs:pdfs.length,pdfFailures:pdfs.filter(p=>p.status==='FAIL').length}},null,2));
await mkdir('artifacts/my-nuvia/public',{recursive:true});
await writeFile('artifacts/my-nuvia/public/review-qa-summary.json',JSON.stringify(summary,null,2));
console.log('QA summary',summary.unchanged?'same final source':'SOURCE CHANGED',rows.length,'role cases',pdfs.length,'PDFs',pdfs.filter(p=>p.status==='FAIL').length,'PDF failures');
if(!summary.unchanged||rows.some(r=>r.status!=='PASS')||pdfs.some(p=>p.status==='FAIL'))process.exitCode=1;
