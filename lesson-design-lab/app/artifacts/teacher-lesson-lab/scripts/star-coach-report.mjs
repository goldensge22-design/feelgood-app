import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const app=path.resolve(import.meta.dirname,'..'),root=path.resolve(app,'../..'),out=path.join(root,'generated-artifacts/lesson-lab-star-qa');
const old=JSON.parse(await fs.readFile(path.join(root,'generated-artifacts/lesson-lab-report-history-qa/summary.json'),'utf8'));
const logic=JSON.parse(await fs.readFile(path.join(out,'logic.json'),'utf8')),browser=JSON.parse(await fs.readFile(path.join(out,'browser.json'),'utf8'));
const files=[];async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else files.push(p)}}await walk(path.join(app,'src'));
const hash=crypto.createHash('sha256');for(const p of files.sort()){hash.update(path.relative(app,p));hash.update(await fs.readFile(p))}
const sourceSha256=hash.digest('hex');
if(old.sourceSha256!==sourceSha256)throw Error('Fresh baseline report does not match current STAR source');
const suites=[...old.suites,{name:'star-logic',passed:logic.checks.filter(c=>c.ok).length,failed:logic.checks.filter(c=>!c.ok).length,started:logic.started,ended:logic.ended},
 {name:'star-browser',passed:browser.checks.filter(c=>c.ok).length,failed:browser.checks.filter(c=>!c.ok).length,started:browser.started,ended:browser.ended}];
const failed=suites.reduce((n,c)=>n+c.failed,0),passed=suites.reduce((n,c)=>n+c.passed,0);
const report={version:'1.5-star',generatedAt:new Date().toISOString(),sourceSha256,passed,failed,suites,languages:browser.languages,
 pdfs:{freshBaseline:old.thisRun,star:{files:browser.pdfs.length,pages:browser.pdfs.reduce((n,p)=>n+p.pages,0),items:browser.pdfs}},
 limits:['Local virtual students only; no external AI/planner/authentication integration','Technical checks, not native-speaker semantic approval','No whole-output visual approval or physical printer test','Windows/macOS native runtime not tested'],screenshots:['desktop-coach.png','mobile-en.png','mobile-ar.png']};
await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(report,null,2));
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;');
await fs.writeFile(path.join(out,'report.html'),`<!doctype html><html lang="ko"><meta charset="utf-8"><title>수업설계LAB STAR 패치 QA</title><style>body{font:16px system-ui;max-width:1000px;margin:40px auto;padding:20px;line-height:1.7}table{border-collapse:collapse;width:100%}td,th{padding:8px;border:1px solid #ccd}code{overflow-wrap:anywhere}</style><h1>수업설계LAB v1.5 STAR 패치 기술 QA</h1><p>${esc(report.generatedAt)} · UTC</p><p>통과 ${passed} / 실패 ${failed}. 이전 564 통과를 재사용하지 않고 이번 소스로 다시 실행.</p><p>소스 SHA-256: <code>${sourceSha256}</code></p><table><tr><th>검사</th><th>통과</th><th>실패</th></tr>${suites.map(s=>`<tr><td>${esc(s.name)}</td><td>${s.passed}</td><td>${s.failed}</td></tr>`).join('')}</table><h2>15언어</h2><pre>${esc(JSON.stringify(browser.languages,null,2))}</pre><h2>출력</h2><p>이번 기본 회귀 ${old.thisRun.totalPdfs}PDF·${old.thisRun.totalPages}쪽, 신규 STAR ${report.pdfs.star.files}PDF·${report.pdfs.star.pages}쪽. 이전 168PDF·718쪽 전체 재실행을 뜻하지 않음.</p><h2>한계</h2><ul>${report.limits.map(l=>`<li>${esc(l)}</li>`).join('')}</ul></html>`);
console.log(`${passed} passed; ${failed} failed; source ${sourceSha256}`);process.exitCode=failed?1:0;
