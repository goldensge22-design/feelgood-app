import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const out=path.resolve(import.meta.dirname,'../../../generated-artifacts/lesson-lab-qa');
const started=new Date().toISOString(),results=[],languages=['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'];
const tab=await(await fetch('http://127.0.0.1:9227/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let seq=0;const queue=new Map();
ws.onmessage=({data})=>{const x=JSON.parse(String(data)),p=queue.get(x.id);if(p){queue.delete(x.id);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;queue.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
const ev=async expression=>{const x=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(x.exceptionDetails)throw Error(x.exceptionDetails.exception?.description??x.exceptionDetails.text);return x.result.value};
const settle=()=>ev('new Promise(r=>setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(r)),70))');
const input=async(id,value)=>{await ev(`(()=>{let el=document.querySelector('[data-testid="${id}"]');if(!el)throw Error('Missing ${id}');Object.getOwnPropertyDescriptor(el.tagName==='SELECT'?HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);await settle()};
const click=async id=>{await ev(`(()=>{const e=document.querySelector('[data-testid="${id}"]');if(!e)throw Error('Missing ${id}');e.click()})()`);await settle()};
const nav=async route=>{await ev(`history.pushState({},'',${JSON.stringify(route)});window.dispatchEvent(new PopStateEvent('popstate'))`);await settle()};
const load=async route=>{await send('Page.navigate',{url:'http://127.0.0.1:80'+route});for(let i=0;i<200;i++){if(await ev('document.readyState==="complete"&&!!document.querySelector("[data-testid=select-language]")'))break;await new Promise(r=>setTimeout(r,40))}await settle()};
const state=()=>ev("JSON.parse(localStorage.getItem('feelgood-lesson-lab-v1'))");
const snapshot=s=>JSON.stringify({job:s.students[0].job,ws:s.personalWorksheets[0],cards:s.plannerActivities.filter(a=>a.studentId===s.students[0].id),writing:s.studio.writings[0]});
const fixture=JSON.parse(await fs.readFile('/tmp/lesson-lab-studio-fixture.json','utf8')),sid=fixture.students[0].id,sid2=fixture.students[1].id;
fixture.lang='ko';fixture.studio.actor={role:'student',id:sid};
const doc=structuredClone(fixture.personalWorksheets[0]);doc.id='qa-language-version';doc.studentId=sid2;doc.userOwnedKeys=['goal'];doc.fields.answer='QA_답안_Original_unchanged';fixture.personalWorksheets.push(doc);
const original=snapshot(fixture);
try{
 await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await load('/studio/writing');
 await ev(`localStorage.clear();localStorage.setItem('feelgood-lesson-lab-v1',${JSON.stringify(JSON.stringify(fixture))})`);await load('/studio/writing');
 await input('input-w-text','QA_unsaved_학생원문_123');
 for(const lang of languages){
  const r={lang,ok:false};results.push(r);
  try{
   await input('select-language',lang);assert.equal(await ev('document.querySelector("[data-testid=input-w-text]").value'),'QA_unsaved_학생원문_123');
   await load('/studio/writing');assert.equal(await ev('document.querySelector("[data-testid=input-w-text]").value'),'QA_unsaved_학생원문_123');assert.equal(snapshot(await state()),original);
   await click('button-actor-teacher');await nav('/studio/print');
   const selected=await ev('Array.from(document.querySelectorAll("[data-testid^=toggle-print-]")).filter(x=>x.checked||x.getAttribute("aria-pressed")==="true").map(x=>x.dataset.testid)');
   for(const id of selected)await click(id);
   await click('toggle-print-'+sid);await click('toggle-print-'+sid2);
   await click('button-print-kind-example');await click('button-preview-course');await click('check-studio-print-confirm');
   await input('select-language',lang==='en'?'ja':'en');assert.equal(await ev('!!document.querySelector("[data-testid=button-studio-confirm-print]")'),false);await input('select-language',lang);
   await click('button-preview-course');
   await send('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});
   assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth+2'));
   assert.ok(await ev('!!document.querySelector(".mat-page")'));
   assert.equal(await ev('getComputedStyle(document.querySelector(".mat-page")).direction'),lang==='ar'?'rtl':'ltr');
   if(lang==='en'||lang==='ar'){const png=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,lang+'-360-preview.png'),Buffer.from(png.data,'base64'))}
   await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await click('button-close-preview');
   assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth+2'));
   if(lang==='en'||lang==='ar'){const png=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,lang+'-1280-desktop.png'),Buffer.from(png.data,'base64'))}
   const selectedDoc=await ev('(()=>{let x=document.querySelector("[data-testid=check-doc-qa-language-version]");return x?.checked||x?.getAttribute("aria-pressed")==="true"})()');
   if(!selectedDoc)await click('check-doc-qa-language-version');
   const picker=await ev(`Array.from(document.querySelectorAll('select')).flatMap(el=>Array.from(el.options).filter(o=>o.value.includes('qa-language-version')).map(o=>({id:el.dataset.testid,value:o.value})))[0]`);
   assert.ok(picker);await input(picker.id,picker.value);await input('select-doc-lang-'+doc.id,lang);
   const before=(await state()).personalWorksheets.find(w=>w.id===doc.id);
   await click('button-lang-preview-'+doc.id);assert.ok(await ev('document.querySelector("[data-testid=button-lang-apply-qa-language-version]").disabled'));
   assert.ok((await ev('document.body.innerText')).includes('QA_답안_Original_unchanged'));await click('check-lang-apply-'+doc.id);await click('button-lang-apply-'+doc.id);
   const after=(await state()).personalWorksheets.find(w=>w.id===doc.id);
   assert.equal(after.versions.length,before.versions.length+1);assert.deepEqual(after.versions.slice(0,-1),before.versions);assert.equal(after.fields.answer,'QA_답안_Original_unchanged');assert.equal(after.lang,lang);assert.equal(snapshot(await state()),original);
   await nav('/studio/writing');await click('button-actor-student');await input('select-actor-id',sid);assert.equal(await ev('document.querySelector("[data-testid=input-w-text]").value'),'QA_unsaved_학생원문_123');
   r.ok=true;console.log('PASS',lang,'continuous language/reload preservation + print invalidation + 360px preview/RTL + gated append-only language version');
  }catch(e){r.error=String(e);console.error('FAIL',lang,r.error);await send('Emulation.clearDeviceMetricsOverride');break}
 }
 if(results.length!==15||results.some(x=>!x.ok))process.exitCode=1;
}finally{
 await fs.writeFile(path.join(out,'browser-extras.json'),JSON.stringify({started,ended:new Date().toISOString(),results,checksPerLanguage:4},null,2));
 ws.close();await fetch('http://127.0.0.1:9227/json/close/'+tab.id);
}
