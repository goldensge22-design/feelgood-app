import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const out=path.resolve(import.meta.dirname,'../../../generated-artifacts/lesson-lab-report-history-qa'),started=new Date().toISOString(),checks=[],pdfs=[];
const fixture=JSON.parse(await fs.readFile(path.join(out,'browser-fixture.json'),'utf8'));
const target=await(await fetch('http://127.0.0.1:9227/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let seq=0;const pending=new Map();
ws.onmessage=({data})=>{const x=JSON.parse(String(data)),p=pending.get(x.id);if(p){pending.delete(x.id);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value};
const wait=async expression=>{for(let i=0;i<250;i++){if(await ev(expression))return;await new Promise(r=>setTimeout(r,80))}throw Error('Timeout '+expression)};
const settle=()=>ev('new Promise(r=>setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(r)),80))');
const load=async route=>{await send('Page.navigate',{url:'http://127.0.0.1:80'+route});await wait('document.readyState==="complete"&&!!document.querySelector("[data-testid=select-language]")');await settle()};
const click=async id=>{await wait(`!!document.querySelector('[data-testid="${id}"]')`);await ev(`document.querySelector('[data-testid="${id}"]').click()`);await settle()};
const input=async(id,value)=>{await ev(`(()=>{const e=document.querySelector('[data-testid="${id}"]');Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(String(value))});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`);await settle()};
const state=()=>ev("JSON.parse(localStorage.getItem('feelgood-lesson-lab-v1'))");
const pass=name=>{checks.push({name,ok:true});console.log('PASS',name)};
const cid=fixture.studio.activeCourseId,sid=fixture.studio.reports[0].studentId;
const current=s=>s.studio.reports.find(r=>r.studentId===sid);
const unchanged=s=>JSON.stringify({w:s.personalWorksheets,p:s.plannerActivities,wr:s.studio.writings,f:s.studio.facts,m:s.studio.missions,st:s.students});
try{
 await send('Page.enable');await load('/studio/results');
 await ev(`(()=>{localStorage.clear();localStorage.setItem('feelgood-lesson-lab-v1',${JSON.stringify(JSON.stringify(fixture))})})()`);await load('/studio/results');
 const card=`[data-testid="card-report-${sid}"]`;
 assert.equal(await ev(`document.querySelector('${card} [data-rank="2"] b').textContent`),'QA-RANK-2');
 assert.equal(await ev(`document.querySelector('${card} [data-rank="4"] b').textContent`),'QA-RANK-4');
 pass('actual results screen preserves empty first/middle ranks');
 await ev(`document.querySelector('[data-testid="report-history-${sid}"]').open=true`);await settle();
 assert.equal(await ev(`document.querySelectorAll('[data-testid="history-report-${sid}"]').length`),2);
 assert.match(await ev(`document.querySelector('[data-testid="report-bases-${sid}"]').innerText`),/v2/);
 pass('teacher sees previous full report cards and original material basis revision');
 const original=unchanged(await state()),initialHistory=structuredClone((await state()).studio.reportHistory);
 for(const p of [81,82]){
   await input('input-score-P',p);await input('input-scale',`QA scale ${p}`);await input('input-version',`QA source ${p}`);
   await click('button-save-report');
   let s=await state();assert.equal(current(s).scores.P,p);assert.equal(await ev('document.querySelector("[data-testid=input-score-P]").value'),String(p));
   assert.equal(unchanged(s),original);pass(`single UI save ${p} keeps latest inputs and all existing documents/V1/V2`);
   await load('/studio');await load('/studio/results');s=await state();
   assert.equal(current(s).scores.P,p);assert.equal(await ev('document.querySelector("[data-testid=input-score-P]").value'),String(p));
   assert.equal(await ev(`document.querySelector('${card}').dataset.revision`),String(current(s).revision));
   pass(`save ${p}: navigation/reload preserves current revision and history`);
 }
 const before=await state(),beforeJSON=JSON.stringify(before);
 await input('input-score-P',99);
 await ev(`window.qaOriginalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='feelgood-lesson-lab-v1')throw Error('QA deliberately blocked storage');return window.qaOriginalSet.call(this,k,v)}`);
 await click('button-save-report');
 assert.equal(JSON.stringify(await state()),beforeJSON);
 const memory=await ev("(async()=>{const m=await import('/src/lib/store.ts');return m.getState()})()");
 assert.equal(JSON.stringify(memory),beforeJSON);
 assert.equal(await ev('document.querySelector("[data-testid=input-score-P]").value'),'99');
 assert.match(await ev('document.body.innerText'),/Could not save|브라우저에 저장하지 못했습니다|Failed to save|Unable to save|Could not be saved|browser/i);
 pass('blocked storage changes neither committed memory nor current/history, retains latest draft and error');
 await load('/studio/results');assert.equal(current(await state()).scores.P,82);assert.equal(await ev('document.querySelector("[data-testid=input-score-P]").value'),'99');
 pass('reload after failed save retains old committed report plus unsaved new input');
 await click('button-save-report');const after=await state();
 assert.equal(current(after).scores.P,99);assert.equal(after.studio.reportHistory.length,before.studio.reportHistory.length+1);
 assert.deepEqual(after.studio.reportHistory.slice(0,initialHistory.length),initialHistory);assert.equal(unchanged(after),original);
 pass('retry commits current/history together exactly once, existing versions and originals unchanged');
 // Invalid report must also be atomic, not just blocked localStorage.
 await input('input-score-P',101);const valid=JSON.stringify(await state());await click('button-save-report');assert.equal(JSON.stringify(await state()),valid);await input('input-score-P',99);
 pass('invalid score cannot add history or replace current report');
 for(const lang of ['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az']){
   await input('select-language',lang);await settle();await load('/studio/results');
   assert.equal(unchanged(await state()),original);assert.equal(current(await state()).scores.P,99);
   await ev(`document.querySelector('[data-testid="report-history-${sid}"]').open=true`);await settle();
   const label=await ev(`document.querySelector('[data-testid="report-history-${sid}"] summary').textContent`);
   if(lang!=='ko')assert.doesNotMatch(label,/[가-힣]/);
   assert.equal(await ev(`document.querySelector('${card} [data-rank="4"] b').textContent`),'QA-RANK-4');
   assert.equal(await ev('document.documentElement.dir'),lang==='ar'?'rtl':'ltr');
   pass(`${lang}: actual history UI/ranks, original documents and V1/V2 preserved after language change + reload`);
   // Use the actual print UI and its shared screen/print markup.
   await ev(`localStorage.setItem('lesson-lab-studio-draft:print-ids-${cid}',${JSON.stringify(JSON.stringify([sid]))})`);
   await load('/studio/print');await click('button-print-kind-summary');await click('button-preview-course');
   await wait('!!document.querySelector("[data-testid=material-pages]")');
   const text=await ev('document.querySelector("[data-testid=material-pages]").innerText');
   assert.match(text,/2\. QA-RANK-2/);assert.match(text,/4\. QA-RANK-4/);assert.match(text,/원문 순위 2/);
   const expected=current(await state()).revision;assert.match(text,new RegExp(`v${expected}`));
   await ev('window.print=()=>{}');await click('check-studio-print-confirm');await click('button-studio-confirm-print');await settle();
   await send('Emulation.setEmulatedMedia',{media:'print'});await ev('document.fonts.ready');
   const domPages=await ev('document.querySelectorAll(".mat-print-root .mat-page").length');
   const direction=await ev('document.querySelector(".mat-print-root .mat-page").dir');
   assert.ok(await ev('Array.from(document.querySelectorAll(".mat-print-root .mat-page")).every(p=>p.scrollHeight<=p.getBoundingClientRect().height+2)'));
   const result=await send('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});
   const file=path.join(out,`${lang}-result-summary.pdf`);await fs.writeFile(file,Buffer.from(result.data,'base64'));
   const pdftext=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});
   const comparable=pdftext.replace(/[\u202a-\u202e\u2066-\u2069]/g,'');
   assert.match(comparable,/QA-RANK-2/);assert.match(comparable,/QA-RANK-4/);assert.match(comparable,/QA\s+source\s+82/);
   const info=execFileSync('pdfinfo',[file],{encoding:'utf8'}),pages=Number(info.match(/Pages:\s+(\d+)/)[1]);
   assert.equal(pages,domPages);
   const fonts=execFileSync('pdffonts',[file],{encoding:'utf8'});assert.doesNotMatch(pdftext,/\uFFFD/);
   const fontRows=fonts.split('\n').slice(2).map(l=>l.match(/\s(yes|no)\s+(yes|no)\s+(yes|no)\s+\d+\s+\d+\s*$/)).filter(Boolean);
   assert.ok(fontRows.length&&fontRows.every(row=>row[1]==='yes'&&row[3]==='yes'));
   assert.equal(direction,lang==='ar'?'rtl':'ltr');
   await send('Emulation.setEmulatedMedia',{media:''});
   await fs.writeFile(path.join(out,`${lang}-result-summary.txt`),pdftext);await fs.writeFile(path.join(out,`${lang}-fonts.txt`),fonts);
   pdfs.push({lang,file:path.basename(file),pages,expectedRevision:expected,ok:true});
   pass(`${lang}: actual summary preview/PDF original ranks, source and current revision match`);
 }
 for(const lang of ['ar','en'])for(const width of [1280,360]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===360});
   await load('/studio/results');await input('select-language',lang);
   await load('/studio/results');await ev(`document.querySelector('[data-testid="report-history-${sid}"]').open=true`);await settle();
   assert.equal(await ev('document.documentElement.dir'),lang==='ar'?'rtl':'ltr');
   const overflow=await ev('document.documentElement.scrollWidth>innerWidth+1');assert.equal(overflow,false);
   const image=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,`history-${lang}-${width}.png`),Buffer.from(image.data,'base64'));
   pass(`${lang} ${width}px results/history: direction verified, inputs and selector accessible, no page overflow`);
 }
 // Legacy current-only browser state has no artificial prior history on load.
 const legacy=structuredClone(fixture);delete legacy.studio.reportHistory;for(const r of legacy.studio.reports){delete r.savedAt;delete r.snapshotId;delete r.revision;delete r.capturedAt}
 await ev(`(()=>{localStorage.clear();localStorage.setItem('feelgood-lesson-lab-v1',${JSON.stringify(JSON.stringify(legacy))})})()`);await load('/studio/results');
 assert.equal((await state()).studio.reportHistory,undefined);
 assert.match(await ev(`document.querySelector('${card}').innerText`),/earlier save time unknown/);
 await input('input-score-P',66);await click('button-save-report');await load('/studio/results');
 const saved=await state();assert.equal(saved.studio.reportHistory.length,1);assert.equal(saved.studio.reportHistory[0].savedAt,undefined);assert.ok(saved.studio.reportHistory[0].capturedAt);assert.equal(current(saved).revision,2);
 pass('legacy browser load/edit/reload archives only observed original with unknown previous save time');
 await ev(`(async()=>{const m=await import('/src/lib/store.ts');m.setState(s=>({...s,lang:'en'}))})()`);await load('/studio/results');
}catch(error){checks.push({name:'browser execution',ok:false,error:String(error)});console.error(error);process.exitCode=1}
finally{
 await fs.writeFile(path.join(out,'browser.json'),JSON.stringify({started,ended:new Date().toISOString(),checks,pdfs},null,2));
 ws.close();await fetch(`http://127.0.0.1:9227/json/close/${target.id}`);
}
console.log(`${checks.length} browser checks; ${checks.filter(c=>!c.ok).length} failed; ${pdfs.length} PDFs`);
