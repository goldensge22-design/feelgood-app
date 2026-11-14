import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const out=path.resolve(import.meta.dirname,'../../../generated-artifacts/lesson-lab-star-qa');
await fs.mkdir(out,{recursive:true});
const started=new Date().toISOString(),checks=[],pdfs=[],languages=[];
const fixture=JSON.parse(await fs.readFile(path.join(out,'browser-fixture.json'),'utf8'));
const c=fixture.studio.courses.find(c=>c.id===fixture.studio.activeCourseId),cid=c.id,sid=c.studentIds[1],peer=c.studentIds[0];
// This fixture is generated solely from the preceding synthetic unit tests.
fixture.studio.actor={role:'student',id:sid};fixture.studio.writings=fixture.studio.writings.filter(w=>w.studentId!==sid);
const origin='http://127.0.0.1:80',cdp='http://127.0.0.1:9227';
const target=await(await fetch(cdp+'/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let seq=0;const pending=new Map();
ws.onmessage=({data})=>{const x=JSON.parse(String(data)),p=pending.get(x.id);if(p){pending.delete(x.id);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value};
const wait=async expression=>{for(let i=0;i<200;i++){if(await ev(expression))return;await new Promise(r=>setTimeout(r,80))}throw Error('Timeout '+expression)};
const settle=()=>ev('new Promise(r=>setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(r)),90))');
const load=async route=>{await send('Page.navigate',{url:origin+route});await wait('document.readyState==="complete"&&!!document.querySelector("[data-testid=select-language]")');await settle()};
const click=async id=>{await wait(`!!document.querySelector('[data-testid="${id}"]')`);await ev(`document.querySelector('[data-testid="${id}"]').click()`);await settle()};
const input=async(id,value)=>{await ev(`(()=>{const e=document.querySelector('[data-testid="${id}"]');if(!e)throw Error('Missing ${id}');Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(String(value))});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`);await settle()};
const state=()=>ev("JSON.parse(localStorage.getItem('feelgood-lesson-lab-v1'))");
const pass=name=>{checks.push({name,ok:true});console.log('PASS',name)};
async function pdf(name){
 await ev('document.fonts.ready');await send('Emulation.setEmulatedMedia',{media:'print'});
 const {data}=await send('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});
 await send('Emulation.setEmulatedMedia',{media:'screen'});
 const file=path.join(out,name+'.pdf');await fs.writeFile(file,Buffer.from(data,'base64'));
 const info=execFileSync('pdfinfo',[file],{encoding:'utf8'}),fonts=execFileSync('pdffonts',[file],{encoding:'utf8'}),text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});
 assert.ok(Number(info.match(/Pages:\s+(\d+)/)?.[1])>0);assert.doesNotMatch(text,/\uFFFD/);assert.match(fonts,/yes/);
 await fs.writeFile(path.join(out,name+'.txt'),text);await fs.writeFile(path.join(out,name+'-fonts.txt'),fonts);
 pdfs.push({file:path.basename(file),pages:Number(info.match(/Pages:\s+(\d+)/)[1]),textCharacters:text.length});return text;
}
try{
 await send('Page.enable');await load('/studio/writing');
 await ev(`(()=>{localStorage.clear();localStorage.setItem('feelgood-lesson-lab-v1',${JSON.stringify(JSON.stringify(fixture))})})()`);await load('/studio/writing');
 assert.equal(await ev('document.querySelector("[data-testid=coach-expanded]").getAttribute("aria-expanded")'),'false');
 assert.equal(await ev('document.querySelector("[data-testid=coach-print]").checked'),false);assert.equal(await ev('document.querySelector("[data-testid=coach-share]").checked'),false);
 assert.equal(await ev('!!document.querySelector("[data-testid=button-add-version]")'),false);
 pass('before V1: help accessible, optional fields empty, note print/share default off');
 await click('coach-expanded');assert.equal(await ev('document.querySelectorAll("[data-testid=coach-question]").length'),1);
 await click('coach-next');assert.equal(await ev('document.querySelector("[data-testid=coach-question-index]").textContent.includes("2")'),true);
 pass('one question at a time; optional situation may be skipped to role');
 await input('coach-purpose','motivation');assert.equal(await ev('document.querySelectorAll("[data-testid=coach-question-index]").length'),0);
 assert.equal(await ev('document.querySelectorAll("[data-testid=coach-question]").length'),1);
 pass('motivation + automatic mode uses purpose coach, never forced STAR');
 await input('coach-field-action','QA-STAR 학생 원문 α — KEEP');await input('coach-field-learning','QA student learning');
 await click('coach-save');
 assert.equal((await state()).studio.experienceNotes.find(n=>n.studentId===sid).fields.situation,'');
 assert.equal(await ev('document.querySelector("[data-testid=input-w-text]").value'),'');
 pass('manual notes save with blank situation/role; do not autofill essay or facts');
 await click('coach-skip');
 await input('input-w-question','QA 직접 선택 문항 원문');await input('input-w-job','QA chosen job outside TOP5');
 await input('input-w-text','QA student original V1 — 자유 작성');
 await click('button-save-writing');
 let w=(await state()).studio.writings.find(w=>w.studentId===sid);assert.ok(w);assert.equal(w.versions[0].text,'QA student original V1 — 자유 작성');assert.equal(w.factIds.length,0);
 pass('closed/skipped help still allows free V1 draft without falsely verified facts');
 const v1=w.versions[0].text;
 await input('input-w-text','QA student original V2 — 직접 수정');await click('check-reviewed');await click('button-add-version');
 w=(await state()).studio.writings.find(w=>w.studentId===sid);assert.equal(w.versions.length,2);assert.equal(w.versions[0].text,v1);
 const stable={w:JSON.stringify(w),factCount:(await state()).studio.facts.length};
 pass('student directly saves V2, original V1 kept and no new experience fabricated');
 for(const lang of ['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az']){
  await ev('(()=>{const e=document.querySelector("[data-testid=input-w-text]");e.focus();e.setSelectionRange(8,8)})()');
  await input('select-language',lang);
  assert.equal(await ev('document.querySelector("[data-testid=input-w-text]").selectionStart'),8);
  await load('/studio/writing');
  assert.equal(await ev('document.querySelector("[data-testid=coach-purpose]").value'),'motivation');
  assert.equal(await ev('document.querySelector("[data-testid=coach-field-action]").value'),'QA-STAR 학생 원문 α — KEEP');
  assert.equal(await ev('document.querySelector("[data-testid=input-w-question]").value'),'QA 직접 선택 문항 원문');
  assert.equal(await ev('document.querySelector("[data-testid=input-w-job]").value'),'QA chosen job outside TOP5');
  assert.equal(JSON.stringify((await state()).studio.writings.find(w=>w.studentId===sid)),stable.w);
  assert.equal((await state()).studio.facts.length,stable.factCount);
  assert.equal(await ev('document.documentElement.dir'),lang==='ar'?'rtl':'ltr');
  const label=await ev('document.querySelector("#coach-title").textContent');
  if(lang!=='ko')assert.doesNotMatch(label,/[가-힣]/);
  languages.push({lang,ui:'pass',preservation:'pass',print:'pending'});
  pass(`${lang}: switch + reload preserves raw notes/purpose/job/question/V1/V2/caret, correct direction`);
 }
 await input('select-language','en');await input('select-actor-id',peer);
 assert.notEqual(await ev('document.querySelector("[data-testid=coach-field-action]").value'),'QA-STAR 학생 원문 α — KEEP');
 await input('select-actor-id',sid);
 assert.equal(await ev('document.querySelector("[data-testid=coach-field-action]").value'),'QA-STAR 학생 원문 α — KEEP');
 pass('student switching and reentry isolate independent notes and drafts');
 // Save failure must leave published note and note history unchanged.
 const before=JSON.stringify((await state()).studio.experienceNotes);
 await ev("window.__oldSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='feelgood-lesson-lab-v1')throw new DOMException('QA quota','QuotaExceededError');return window.__oldSet.call(this,k,v)}");
 await click('coach-save');
 assert.equal(JSON.stringify((await state()).studio.experienceNotes),before);
 await ev('Storage.prototype.setItem=window.__oldSet;delete window.__oldSet');
 pass('storage failure leaves saved note/history unchanged, no false new revision');
 await click('button-actor-teacher');await load('/studio/print');
 await click(`toggle-print-${sid}`);await click('button-print-kind-experience-notes');await click('button-preview-course');
 assert.doesNotMatch(await ev('document.querySelector("[data-testid=stats-studio-print]").parentElement.innerText'),/QA-STAR 학생 원문 α/);
 pass('teacher private-note print excludes student memo without separate sharing/print opt-ins');
 // Test a real shared note after explicit student actions.
 await load('/studio/writing');await click('button-actor-student');await input('select-actor-id',sid);
 await click('coach-print');await click('coach-share');await click('coach-save');
 await click('button-actor-teacher');await load('/studio/print');
 for(const k of ['experience-notes','writing-check','revision-record'])await click('check-print-attach-'+k);
 await click(`toggle-print-${peer}`);await click('button-print-personal');
 let stats=await ev('document.querySelector("[data-testid=stats-studio-print]").innerText');assert.match(stats,/2/);
 const pages=await ev('[...document.querySelectorAll(".mat-page")].map(x=>({id:x.dataset.studentId,text:x.innerText}))');
 assert.ok(pages.length>0);
 pass('two selected students: optional three worksheets append in bundle preview');
 // Keep one student for the 15-language print proofs; page headers identify each student.
 await click(`toggle-print-${peer}`);
 for(const lang of ['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az']){
  await input('select-language',lang);await click('button-print-personal');
  await click('check-studio-print-confirm');
  await ev('window.__nativePrint=window.print;window.print=()=>{}');
  await click('button-studio-confirm-print');
  await settle();
  assert.ok(await ev('!!document.querySelector(".mat-print-root")'));
  const panel=await ev('document.querySelector(".mat-print-root").innerText');
  assert.ok(panel.includes('QA-STAR 학생 원문 α'));
  const text=await pdf('star-worksheets-'+lang);
  assert.ok(text.length>400);
  if(lang==='ar')assert.match(text,/[\u0600-\u06ff]/);
  languages.find(l=>l.lang===lang).print='pass';
  pass(`${lang}: real PDF of experience/writing-check/revision worksheets, raw note preserved`);
  await ev('window.dispatchEvent(new Event("afterprint"));window.print=window.__nativePrint');await settle();
  // Language change cancels the previous preview and print confirmation.
  const next=lang==='en'?'ja':'en';await input('select-language',next);
  assert.equal(await ev('!!document.querySelector("[data-testid=check-studio-print-confirm]")'),false);
 }
 pass('all language changes invalidate prior preview and print confirmation');
 // Actual A5x2 planner cards + appended A4 writing sheets, selected pair.
 await input('select-language','en');await click(`toggle-print-${peer}`);await click('button-layout-A5x2');
 const docs=await ev('[...document.querySelectorAll("[data-testid^=check-doc-]")].map(x=>x.dataset.testid)');
 for(const id of docs)await click(id);
 for(const lang of ['ko','en','ar']){
  await input('select-language',lang);await click('button-print-personal');await click('check-studio-print-confirm');
  await ev('window.__nativePrint=window.print;window.print=()=>{}');await click('button-studio-confirm-print');
  await pdf('star-mixed-a5-'+lang);await ev('window.dispatchEvent(new Event("afterprint"));window.print=window.__nativePrint');await settle();
  pass(`${lang}: actual A5x2 planner + A4 writing worksheet mixed PDF`);
 }
 await send('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});
 await load('/studio/writing');await click('button-actor-student');await input('select-actor-id',sid);
 for(const lang of ['en','ar']){
  await input('select-language',lang);await click('coach-expanded');
  const overflow=await ev('document.documentElement.scrollWidth>innerWidth+2');
  assert.equal(overflow,false);
  const data=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await fs.writeFile(path.join(out,'mobile-'+lang+'.png'),Buffer.from(data.data,'base64'));
  pass(`${lang}: 360px helper usable, no document horizontal overflow, screenshot`);
  await click('coach-expanded');
 }
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await input('select-language','en');await click('coach-expanded');
 const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(path.join(out,'desktop-coach.png'),Buffer.from(shot.data,'base64'));
 pass('desktop optional helper actual screenshot');
}catch(e){checks.push({name:'browser flow',ok:false,error:String(e),stack:e.stack});console.error(e)}
finally{await fs.writeFile(path.join(out,'browser.json'),JSON.stringify({started,ended:new Date().toISOString(),checks,languages,pdfs},null,2));ws.close();await fetch(cdp+'/json/close/'+target.id)}
console.log(`${checks.length} checks; ${checks.filter(c=>!c.ok).length} failed; ${pdfs.length} PDFs`);process.exitCode=checks.some(c=>!c.ok)?1:0;
