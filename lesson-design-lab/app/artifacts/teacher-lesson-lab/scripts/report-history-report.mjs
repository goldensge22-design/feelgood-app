import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),out=path.resolve(root,'../../generated-artifacts/lesson-lab-report-history-qa');
const read=name=>fs.readFile(path.join(out,name),'utf8');
const logic=JSON.parse(await read('logic.json')),browser=JSON.parse(await read('browser.json'));
const logSuite=async(name,file,expected)=>{const log=await read(file),passed=(log.match(/^PASS /gm)??[]).length;assert.equal(passed,expected);assert.doesNotMatch(log,/^FAIL|AssertionError/gm);return{name,passed,failed:0,completedAt:(await fs.stat(path.join(out,file))).mtime.toISOString()}};
const suites=[await logSuite('core','core.log',28),await logSuite('legacy','legacy.log',21),await logSuite('existing-browser','browser-existing.log',11)];
for(const [name,file]of [['language-regression','language-regression.log'],['u09-regression','u09-regression.log']]){
 const match=(await read(file)).match(/\{"passed":(\d+),"failed":(\d+)\}/);assert.ok(match);assert.equal(Number(match[2]),0);
 suites.push({name,passed:Number(match[1]),failed:Number(match[2]),completedAt:(await fs.stat(path.join(out,file))).mtime.toISOString()});
}
for(const [name,data]of [['new-logic',logic],['new-browser',browser]]){
 assert.ok(data.checks.every(c=>c.ok));suites.push({name,passed:data.checks.length,failed:0,started:data.started,ended:data.ended});
}
assert.match(await read('build.log'),/built in/);assert.doesNotMatch(await read('typecheck.log'),/error TS/);
const list=async(dir)=>{let files=[];for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);files.push(...entry.isDirectory()?await list(file):[file])}return files.sort()};
const hash=crypto.createHash('sha256');for(const file of await list(path.join(root,'src'))){hash.update(path.relative(root,file));hash.update(await fs.readFile(file))}
const existingPdfs=[];
for(const name of ['class-blank','private-comparison','one-student-mixed']){
 const file=path.join(out,`main-${name}.pdf`);await fs.copyFile(`/tmp/studio-${name}.pdf`,file);
 const info=execFileSync('pdfinfo',[file],{encoding:'utf8'});existingPdfs.push({file:path.basename(file),pages:Number(info.match(/Pages:\s+(\d+)/)[1])});
}
const result={generatedAt:new Date().toISOString(),sourceSha256:hash.digest('hex'),suites,passed:suites.reduce((sum,s)=>sum+s.passed,0),failed:0,
 build:'pass (large bundle warning retained)',typecheck:'pass',previousEvidence:{pdfs:168,pages:718,status:'historical, not a full rerun'},
 thisRun:{newSummaryPdfs:browser.pdfs,existingScenarioPdfs:existingPdfs,totalPdfs:browser.pdfs.length+existingPdfs.length,totalPages:browser.pdfs.reduce((sum,p)=>sum+p.pages,0)+existingPdfs.reduce((sum,p)=>sum+p.pages,0)},
 limits:['Local fictional demo only; no external service, AI or real authentication integration','No native-speaker or educational efficacy approval','Only English and Arabic new summary first pages visually reviewed; not all pages or physical printers','Three diagnostic human-signoff placeholders are not three automated failures','Initial test harness selector/wrapped-text comparisons corrected; incorrect Arabic screenshot locale assertion corrected and rerun'],
 evidenceDirectory:'generated-artifacts/lesson-lab-report-history-qa'};
await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(result,null,2));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const rows=suites.map(s=>`<tr><td>${esc(s.name)}</td><td>${s.passed}</td><td>${s.failed}</td><td>${esc(s.ended??s.completedAt)}</td></tr>`).join('');
await fs.writeFile(path.join(out,'report.html'),`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>수업설계LAB 결과지 보존 QA</title><style>body{font:16px system-ui;max-width:1000px;margin:32px auto;padding:0 20px;color:#172846}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccd6df;padding:10px;text-align:left}code{overflow-wrap:anywhere}.ok{color:#056744}li{margin:8px 0}</style><h1>수업설계LAB 결과지 보존 기술 QA</h1><p>${esc(result.generatedAt)} · 가상 QA 데이터 · 공개 배포 없음</p><p>소스 SHA-256: <code>${result.sourceSha256}</code></p><h2 class="ok">이번 검사 ${result.passed}개 통과 · 실패 0</h2><table><tr><th>범위</th><th>통과</th><th>실패</th><th>완료 UTC</th></tr>${rows}</table><h2>수정 내용</h2><ul><li>TOP5 빈 첫·중간 순위를 유지하고 화면·개인 자료·후보·PDF에 원순위 사용.</li><li>PASS4·척도·유형·TOP5·출처의 수정 전 저장본 보존. 교사 화면에서 현재·이전 버전 확인.</li><li>미션 선택 당시 결과 근거를 별도 보존. 기존 자료·글·V1/V2 비변경. 과거 근거·시각 미기록은 추정하지 않음.</li><li>저장 실패에는 현재·이력 모두 미변경, 원문 초안 유지 후 재시도.</li></ul><h2>출력 증거 구분</h2><p>이전: 168PDF·718쪽 — 과거 증거로 보존, 이번 전체 재실행 아님.<br>이번: 새 15언어 개인 결과 요약 15PDF·15쪽 + 기존 주요 시나리오 3PDF·96쪽 = ${result.thisRun.totalPdfs}PDF·${result.thisRun.totalPages}쪽.</p><h2>12개 규칙 대조</h2><p>대상 차별화, 18/36·81유형 지원, 원순위/원본 보존, 시간표/로컬 단계, 장기 공동과제, 개별 출력, 선택/검토/로컬 재시도, 계획/모의/수행 구분, V1/V2·선택 공유, 상담 수용량은 로컬 구현 범위 준수. 장기는 직접 설정도 포함. 15언어는 기술 적용 확인이며 전체 의미 검수 미실행. 외부 연결 표시는 구분되나 실제 연동·인증 미구현.</p><h2>검수 한계</h2><ul>${result.limits.map(l=>`<li>${esc(l)}</li>`).join('')}</ul></html>`);
console.log(JSON.stringify({passed:result.passed,failed:0,pdfs:result.thisRun.totalPdfs,pages:result.thisRun.totalPages,sourceSha256:result.sourceSha256}));
