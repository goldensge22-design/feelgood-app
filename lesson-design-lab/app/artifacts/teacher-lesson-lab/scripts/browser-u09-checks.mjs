import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const out=path.resolve(import.meta.dirname,'../../../generated-artifacts/lesson-lab-qa');
const before=process.env.QA_EXPECT_BUG==='1',started=new Date().toISOString(),results=[];
const langs=before?['en']:['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'];
const tab=await(await fetch('http://127.0.0.1:9227/json/new?about:blank',{method:'PUT'})).json();
const socket=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>socket.onopen=r);
let n=0;const pending=new Map();socket.onmessage=({data})=>{const x=JSON.parse(String(data)),p=pending.get(x.id);if(p){pending.delete(x.id);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++n;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))});
const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value};
const wait=async expression=>{for(let i=0;i<180;i++){if(await ev(expression))return;await new Promise(r=>setTimeout(r,80))}throw Error('Timeout '+expression)};
const settle=()=>ev('new Promise(r=>setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(r)),70))');
const click=async id=>{await wait(`!!document.querySelector('[data-testid="${id}"]')`);await ev(`document.querySelector('[data-testid="${id}"]').click()`);await settle()};
const input=async(id,value)=>{await ev(`(()=>{const e=document.querySelector('[data-testid="${id}"]');if(!e)throw Error('Missing ${id}');Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`);await settle()};
const load=async route=>{await send('Page.navigate',{url:'http://127.0.0.1:80'+route});await wait('document.readyState==="complete"&&!!document.querySelector("[data-testid=select-language]")');await settle()};
const snapshot=()=>ev("JSON.parse(localStorage.getItem('feelgood-lesson-lab-v1'))");
const fixture=JSON.parse(await fs.readFile('/tmp/lesson-lab-studio-fixture.json','utf8'));
try{
 await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1280,height:950,deviceScaleFactor:1,mobile:false});await load('/materials');
 await ev(`window.qaSeed=${JSON.stringify(fixture)}`);
 const seed=await ev(`(async()=>{const store=await import('/src/lib/store.ts'),m=await import('/src/lib/materials.ts'),ml=await import('/src/lib/material-language.ts');let s=structuredClone(window.qaSeed);s.lang='ko';s.students=[{...s.students[0],stage:'university',job:'',family:'',task:''}];s.personalWorksheets=[];s.plannerActivities=[];s.cards=[];s.studio.actor={role:'teacher',id:'teacher-demo'};const sid=s.students[0].id;s=m.generateMaterials(s,[sid],9,[0,1,2,3],'ko',false);let w=s.personalWorksheets[0];s=m.saveWorksheet(s,w.id,{...w.fields,answer:'QA_학생_답안_ORIGINAL_123'},'QA original answer','draft');s=ml.applyMaterialLanguage(s,ml.previewMaterialLanguage(s,w.id,'worksheet','en'));const card=s.plannerActivities.find(a=>a.kind===0);card.record={...card.record,state:'in-progress',actual:'QA_실제기록_원문_123',feedback:'QA_feedback_原文'};store.setState(()=>s);return {base:s,sid,wid:w.id,cid:card.id,originalWorksheet:s.personalWorksheets[0],originalRecord:card.record}})()`);
 for(const lang of langs){
  const r={lang,ok:false,checks:[]};results.push(r);
  await ev(`(async()=>{const st=await import('/src/lib/store.ts');st.setState(()=>(${JSON.stringify(seed.base)}))})()`);await load('/materials?ids='+seed.sid);
  await input('select-language',lang);await click('button-open-material-'+seed.sid);await click('button-doc-'+seed.cid);await input('select-doc-lang-'+seed.cid,lang);await click('button-lang-preview-'+seed.cid);
  const p=await ev(`(async()=>{const st=await import('/src/lib/store.ts'),ml=await import('/src/lib/material-language.ts');return ml.previewMaterialLanguage(st.getState(),${JSON.stringify(seed.cid)},'card',${JSON.stringify(lang)})})()`);
  if(before){
   assert.ok(p.untranslated.length>=1);assert.match(p.fields.goal,/직무 준비를 프로젝트/);r.untranslated=p.untranslated;
   r.goal=p.fields.goal;r.summary=await ev(`document.querySelector('[data-testid=text-lang-summary-${seed.cid}]').textContent`);r.reproduced=true;
   const img=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'u09-before-goal.png'),Buffer.from(img.data,'base64'));
   await click('button-doc-'+seed.wid);
   r.headerVersion=await ev(`document.querySelector('[data-testid=editor-worksheet-${seed.wid}]').innerText.match(/v(\\d+)/)[1]`);r.historyVersion=3;assert.equal(r.headerVersion,'1');
   const img2=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'u09-before-version.png'),Buffer.from(img2.data,'base64'));break;
  }
  assert.equal(p.untranslated.length,0);if(lang!=='ko')assert.doesNotMatch(p.fields.goal,/[가-힣]/);r.checks.push('complete U09 warning and authored goal');
  assert.equal(await ev(`document.querySelector('[data-testid=button-lang-apply-${seed.cid}]').disabled`),true);
  await click('check-lang-apply-'+seed.cid);await click('button-lang-apply-'+seed.cid);
  const saved=await snapshot(),card=saved.plannerActivities.find(x=>x.id===seed.cid);assert.deepEqual(card.record,seed.originalRecord);assert.equal(card.versions.at(-1).version,2);
  assert.equal(await ev(`document.querySelector('[data-testid=text-current-version-${seed.cid}]').textContent`),'v2');r.checks.push('card save current header v2 and original performance preserved');
  await input('select-doc-lang-'+seed.cid,lang==='en'?'ja':'en');await click('button-lang-preview-'+seed.cid);await click('check-lang-apply-'+seed.cid);await click('button-lang-apply-'+seed.cid);
  const updated=await snapshot(),a=updated.plannerActivities.find(x=>x.id===seed.cid);assert.deepEqual(a.versions.slice(0,-1),card.versions);assert.deepEqual(a.record,seed.originalRecord);
  assert.equal(await ev(`document.querySelector('[data-testid=text-current-version-${seed.cid}]').textContent`),'v3');r.checks.push('second card language version header/history v3');
  await click('button-doc-'+seed.wid);assert.equal(await ev(`document.querySelector('[data-testid=text-current-version-${seed.wid}]').textContent`),'v3');
  assert.deepEqual(updated.personalWorksheets[0],seed.originalWorksheet);r.checks.push('existing U09 answer and three worksheet versions unchanged');
  await input('select-doc-lang-'+seed.wid,lang);await click('button-lang-preview-'+seed.wid);
  const wp=await ev(`(async()=>{const st=await import('/src/lib/store.ts'),ml=await import('/src/lib/material-language.ts');return ml.previewMaterialLanguage(st.getState(),${JSON.stringify(seed.wid)},'worksheet',${JSON.stringify(lang)})})()`);
  assert.equal(wp.untranslated.length,0);assert.equal(wp.fields.answer,'QA_학생_답안_ORIGINAL_123');assert.ok(wp.changedKeys.length===9||lang==='en');
  await click('check-lang-apply-'+seed.wid);await click('button-lang-apply-'+seed.wid);
  assert.equal(await ev(`document.querySelector('[data-testid=text-current-version-${seed.wid}]').textContent`),'v4');
  await load('/materials?ids='+seed.sid);await click('button-open-material-'+seed.sid);await click('button-doc-'+seed.wid);
  const restored=await snapshot(),ws=restored.personalWorksheets[0];assert.deepEqual(ws.versions.slice(0,3),seed.originalWorksheet.versions);assert.equal(ws.fields.answer,'QA_학생_답안_ORIGINAL_123');assert.equal(await ev(`document.querySelector('[data-testid=text-current-version-${seed.wid}]').textContent`),'v4');r.checks.push('nine worksheet fields/save/reload/current header v4 and three original versions preserved');
  if(lang==='en'||lang==='ar'){const image=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'u09-'+lang+'-after.png'),Buffer.from(image.data,'base64'))}
  // Fictional teacher review via the normal engine, followed by the actual bundle/print UI.
  await ev(`(async()=>{const st=await import('/src/lib/store.ts'),m=await import('/src/lib/materials.ts');st.setState(s=>{let n=s;for(const w of s.personalWorksheets)n=m.saveWorksheet(n,w.id,w.fields,'QA print review','confirmed');for(const a of s.plannerActivities)n=m.savePlanner(n,a.id,a.fields,a.record,'QA print review','confirmed');return n})})()`);
  await load('/materials?ids='+seed.sid);await click('button-build-bundle');const bundle=(await snapshot()).materialBundles[0];assert.equal(bundle.language??bundle.lang,lang);
  await ev('window.print=()=>{window.qaPrintCalled=true}');await click('button-print-bundle-'+bundle.id);await wait("document.body.classList.contains('mat-printing')&&window.qaPrintCalled");
  await send('Emulation.setEmulatedMedia',{media:'print'});await ev('document.fonts.ready');
  const print=await ev(`(()=>{const root=document.querySelector('.mat-print-root');return{text:root.innerText,pages:root.querySelectorAll('.mat-page').length,overflow:[...root.querySelectorAll('.mat-page')].some(p=>p.scrollHeight>p.clientHeight+3)}})()`);
  assert.ok(print.text.replace(/\s+/g,'').includes(p.fields.goal.replace(/\s+/g,'')));assert.equal(print.overflow,false);assert.ok(print.text.includes('QA_학생_답안_ORIGINAL_123'));assert.ok(print.text.includes('QA_실제기록_원문_123'));
  const pdf=await send('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});const file=path.join(out,'u09-'+lang+'-both.pdf');await fs.writeFile(file,Buffer.from(pdf.data,'base64'));
  const pages=Number(execFileSync('pdfinfo',[file],{encoding:'utf8'}).match(/Pages:\s+(\d+)/)[1]);assert.equal(pages,print.pages);r.pdf={file,pages,goal:p.fields.goal};r.checks.push('real U09 A4 worksheet/A5 cards PDF includes complete localized goal and original answer/performance');
  await send('Emulation.setEmulatedMedia',{media:'screen'});
  r.ok=true;console.log('PASS U09 '+lang+' '+r.checks.length+' browser checkpoints');
 }
}catch(error){const r=results.at(-1);if(r)r.error=String(error);process.exitCode=1;console.error(error)}
finally{await fs.writeFile(path.join(out,before?'u09-before-fix.json':'browser-u09.json'),JSON.stringify({started,ended:new Date().toISOString(),results},null,2));socket.close()}
