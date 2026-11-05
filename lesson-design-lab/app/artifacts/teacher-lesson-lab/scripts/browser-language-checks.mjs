import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const out=path.resolve(import.meta.dirname,'../../../generated-artifacts/lesson-lab-qa');
await fs.mkdir(out,{recursive:true});
const start=new Date().toISOString(),origin='http://127.0.0.1:80';
const target=await(await fetch('http://127.0.0.1:9227/json/new?about:blank',{method:'PUT'})).json();
const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
let seq=0;const pending=new Map(),exceptions=[];
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))});
socket.onmessage=({data})=>{const x=JSON.parse(String(data));if(x.id){const p=pending.get(x.id);pending.delete(x.id);if(p)x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails.exception?.description??x.params.exceptionDetails.text)};
const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value};
const settle=()=>ev('new Promise(r=>setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(r)),60))');
const wait=async expression=>{for(let i=0;i<240;i++){if(await ev(expression))return;await new Promise(r=>setTimeout(r,50))}throw Error('TIMEOUT '+expression)};
const click=async id=>{await wait(`!!document.querySelector('[data-testid="${id}"]')`);await ev(`document.querySelector('[data-testid="${id}"]').click()`);await settle()};
const input=async(id,value)=>{await wait(`!!document.querySelector('[data-testid="${id}"]')`);await ev(`(()=>{const el=document.querySelector('[data-testid="${id}"]'),p=el.tagName==='SELECT'?HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);await settle()};
const nav=async p=>{await ev(`history.pushState({},'',${JSON.stringify(p)});window.dispatchEvent(new PopStateEvent('popstate'))`);await settle()};
const reload=async p=>{await send('Page.navigate',{url:origin+p});await wait("document.readyState==='complete'&&!!document.querySelector('[data-testid=\"select-language\"]')");await settle()};
const saved=()=>ev("JSON.parse(localStorage.getItem('feelgood-lesson-lab-v1'))");
const firstId=prefix=>ev(`Array.from(document.querySelectorAll('[data-testid]')).find(x=>x.dataset.testid.startsWith(${JSON.stringify(prefix)})&&!x.disabled)?.dataset.testid`);
const body=()=>ev('document.body.innerText');
const screenshot=async name=>{const x=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,name+'.png'),Buffer.from(x.data,'base64'))};
const languages=(process.env.QA_LANGS??'ko,en,ja,zh-CN,zh-TW,mn,th,vi,ar,ru,km,es,fr,it,az').split(','),results=[];
const fixture=JSON.parse(await fs.readFile('/tmp/lesson-lab-studio-fixture.json','utf8'));
fixture.studio.actor={role:'teacher',id:'teacher-demo'};fixture.lang='ko';
const course=fixture.studio.courses[0],cid=course.id,sid=course.studentIds[0],sid2=course.studentIds[1];
fixture.studio.activeCourseId=cid;
fixture.studio.writings[0].sharing.counselorIds.push('teacher-demo');fixture.studio.writings[0].sharing.versions=true;
const originalStudent=s=>JSON.stringify({student:s.students.find(x=>x.id===sid),worksheets:s.personalWorksheets.filter(x=>x.studentId===sid),cards:s.plannerActivities.filter(x=>x.studentId===sid),facts:s.studio.facts.filter(x=>x.studentId===sid),writings:s.studio.writings.filter(x=>x.studentId===sid)});
const original=originalStudent(fixture);
const persist=()=>fs.writeFile(path.join(out,process.env.QA_RESULT_FILE??'browser-languages.json'),JSON.stringify({version:'1.5 QA correction',start,end:new Date().toISOString(),results,exceptions},null,2));
async function pdf(lang,kind){
 await click('check-studio-print-confirm');await wait("!document.querySelector('[data-testid=\"button-studio-confirm-print\"]').disabled");await click('button-studio-confirm-print');await wait("!!document.querySelector('.mat-print-root .mat-page')");
 await send('Emulation.setEmulatedMedia',{media:'print'});await ev('document.fonts.ready');
 const dom=await ev(`(()=>{const r=document.querySelector('.mat-print-root');return{text:r.innerText,titles:Array.from(r.querySelectorAll('.mat-title')).map(x=>x.textContent),direction:getComputedStyle(r.querySelector('.mat-page')).direction,pages:r.querySelectorAll('.mat-page').length,footers:Array.from(r.querySelectorAll('[data-current-page]')).map(x=>({current:x.dataset.currentPage,total:x.dataset.totalPages,text:x.innerText})),overflow:Array.from(r.querySelectorAll('.mat-page')).filter(e=>e.scrollHeight>e.getBoundingClientRect().height+3).map(e=>({actual:e.scrollHeight,bound:e.getBoundingClientRect().height}))}})()`);
 assert.equal(dom.overflow.length,0,lang+' '+kind+' '+JSON.stringify(dom.overflow));
 assert.equal(dom.direction,lang==='ar'?'rtl':'ltr');
 assert.ok(dom.footers.every(x=>+x.current>=1&&+x.current<=+x.total));
 if(kind==='personal-cards'||kind==='personal-both'){
   const reason=await ev(`(async()=>{const tx=await import('/src/i18n/tx.ts');return tx.tx(${JSON.stringify(lang)},'플래너 기본 사용을 실제 활동으로 연습')})()`);
   assert.ok(dom.text.replace(/\s+/g,'').includes(reason.replace(/\s+/g,'')),lang+' app-authored basic practice reason');
 }
 const data=await send('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});
 const file=path.join(out,lang+'-'+kind+'.pdf');await fs.writeFile(file,Buffer.from(data.data,'base64'));
 const info=execFileSync('pdfinfo',[file],{encoding:'utf8'}),pages=Number(info.match(/Pages:\s+(\d+)/)[1]);
 assert.equal(pages,dom.pages);const text=execFileSync('pdftotext',[file,'-'],{encoding:'utf8'});assert.ok(text.length>50);assert.ok(!text.includes('\uFFFD'));
 await send('Emulation.setEmulatedMedia',{media:''});await ev("window.dispatchEvent(new Event('afterprint'))");await settle();
 return{kind,file:path.relative(process.cwd(),file),pages,footers:dom.footers,direction:dom.direction,titles:dom.titles,text:dom.text};
}
try{
 await send('Page.enable');await send('Runtime.enable');await send('Page.addScriptToEvaluateOnNewDocument',{source:'window.print=()=>{}'});
 await reload('/studio');
 for(const lang of languages){
  const r={lang,checks:[],pdfs:[],ok:false};results.push(r);
  const mark=(name)=>{r.checks.push({name,ok:true});console.log('PASS',lang,name)};
  try{
   await ev(`localStorage.clear();localStorage.setItem('feelgood-lesson-lab-v1',${JSON.stringify(JSON.stringify({...fixture,lang:'ko'}))})`);await reload('/studio');
   await input('select-language',lang);await wait(`document.documentElement.lang===${JSON.stringify(lang)}`);
   await input('input-course-name','QA course '+lang);await click('button-create-course');assert.equal((await saved()).studio.courses.length,2);
   await input('select-active-course',cid);mark('UI language + real course creation');
   for(const route of['/studio/results','/studio/sources','/studio/agenda','/studio/live','/studio/writing','/studio/interview','/studio/status','/rules']){
    await nav(route);assert.ok((await body()).length>200);
    if(route==='/studio/agenda'){const heading=await ev("Array.from(document.querySelectorAll('h2,h3')).map(x=>x.innerText)");assert.ok(!heading.some(x=>/^0\s*(회차|session)/i.test(x)));r.agendaHeadings=heading}
   }mark('results/agenda/exploration/writing/counseling/interview/rules screens');
   for(const id of['M01','H01','U01']){await nav('/worksheets/'+id);assert.ok((await body()).length>500)}mark('three-stage educational material screens');
   await nav('/studio/live');await click('button-actor-student');await input('select-actor-id',sid2);
   await input('input-practice-goal','QA 준비 원문');await input('input-practice-first','QA 첫 행동 원문');await click('button-plan-practice');
   await input('input-practice-actual','QA 자료를 실제 준비했다.');await input('input-practice-reflection','QA 준비 순서를 확인했다.');await click('check-practice-confirmed');await click('button-complete-practice');
   const values={'input-ex-job':'QA 직무 원문','input-ex-question':'QA 학생 질문 원문','input-ex-duties':'QA 학생 업무 원문','input-ex-reason':'QA 선택 이유 원문','input-ex-outside':'QA 관심 이유 원문','input-ex-source':'QA 교사 예시 원자료','input-ex-behavior':'QA 요구 행동 원문','input-ex-remaining':'12'};
   for(const[id,v]of Object.entries(values))await input(id,v);
   await click('button-get-candidates');const first=await firstId('button-candidate-');assert.ok(first);await click(first);
   await input('input-goal','QA 학생 목표 원문');await input('input-first-action','QA 학생 첫 행동 원문');await click('check-scope-confirm');await click('button-select-candidate');
   let state=await saved(),mid=state.studio.missions.find(x=>x.studentId===sid2).id;
   assert.equal(state.studio.missions.find(x=>x.id===mid).status,'review-needed');mark('student exploration → translated candidate → selected review-needed card');
   await click('button-actor-teacher');await click('button-approve-'+mid);assert.equal((await saved()).studio.missions.find(x=>x.id===mid).status,'review-needed');mark('approval without review opinion blocked');
   await input('input-review-note-'+mid,'QA 교사 검토 원문');await click('button-approve-'+mid);
   await input('select-scope-student',sid2);
   await click('check-force-fail-'+mid);await click('button-register-'+mid);assert.equal((await saved()).studio.missions.find(x=>x.id===mid).registration,'failed');
   await click('check-force-fail-'+mid);await click('button-actor-student');await input('select-actor-id',sid2);await click('button-register-'+mid);
   await ev(`(async()=>{const e=await import('/src/lib/studio/index.ts'),st=await import('/src/lib/store.ts');st.setState(s=>e.registerMission(e.registerMission(s,${JSON.stringify(mid)}),${JSON.stringify(mid)}));})()`);
   assert.equal((await saved()).personalWorksheets.filter(x=>x.studentId===sid2).length,1);mark('registration failure/retry/idempotent registration');
   for(const[k,v]of Object.entries({actual:'QA 내가 직접 두 항목을 비교했다.',result:'QA 불일치 한 곳을 기록했다.',reflection:'QA 확인 근거의 중요성을 배웠다.',evidence:'QA 결과물',changed:'QA 항목별로 확인했다.'}))await input('input-'+k+'-'+mid,v);
   await input('select-record-status-'+mid,'performed');await click('button-record-'+mid);
   await click('button-confirm-exp-'+mid);
   state=await saved();assert.ok(state.studio.facts.find(x=>x.studentId===sid2)?.simulation);mark('actual record + student fact confirmation retains simulation');
   await nav('/studio/writing');const toggle=await firstId('check-fact-');await click(toggle);await input('input-w-question','QA 본인 행동과 결과 원문');await input('input-w-job','QA 직무 원문');await input('input-w-text','QA V1 학생 원문 · Original 123');await click('button-save-writing');
   const wid=(await saved()).studio.writings.find(x=>x.studentId===sid2).id;
   await click('check-share-v1');await click('check-share-exp');await click('toggle-share-counselor-demo');await click('button-save-sharing');
   await click(await firstId('button-slot-counselor-demo-'));await click('button-actor-counselor');
   await input('input-consult-q-'+wid,'QA 상담 질문 원문');await input('input-consult-f-'+wid,'QA 비교한 자료의 확인일을 추가로 표시했다.');await input('input-consult-e-'+wid,'QA 표현 제안');await click('button-save-consult-'+wid);
   await click('button-actor-student');await input('select-actor-id',sid2);await click(await firstId('button-fact-yes-'));
   await input('input-w-text','QA V2 학생 수정 원문 · Original 456');await click('check-reviewed');await click('button-add-version');
   const versions=(await saved()).studio.writings.find(x=>x.id===wid).versions;assert.equal(versions[0].text,'QA V1 학생 원문 · Original 123');assert.equal(versions[1].text,'QA V2 학생 수정 원문 · Original 456');
   await reload('/studio/writing');assert.equal(await ev("document.querySelector('[data-testid=\"input-w-text\"]').value"),'QA V2 학생 수정 원문 · Original 456');
   await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:out});await click('button-export-writing');
   const exportFile=path.join(out,'writing-'+wid+'.txt');for(let i=0;i<100;i++){try{await fs.access(exportFile);break}catch{await new Promise(r=>setTimeout(r,40))}}
   const exportText=await fs.readFile(exportFile,'utf8');assert.ok(exportText.includes(versions[0].text)&&exportText.includes(versions[1].text));mark('V1 → booking → consultation → student facts → V2/reopen/export');
   await nav('/studio/interview');assert.ok((await body()).length>500);
   await click('button-actor-teacher');await nav('/studio/print');
   await ev("Object.keys(localStorage).filter(k=>k.startsWith('lesson-lab-studio-draft:print-')).forEach(k=>localStorage.removeItem(k))");await nav('/studio');await nav('/studio/print');
   await click('toggle-print-'+sid);
   for(const kind of['example','blank','guide','consultation','feedback','comparison','interview']){
    await click('button-print-kind-'+kind);await click('button-preview-course');
    if(kind==='example'&&lang==='en'){await click('check-studio-print-confirm');await input('select-language','ja');assert.equal(await ev("!!document.querySelector('[data-testid=\"button-studio-confirm-print\"]')"),false);await input('select-language','en');await click('button-preview-course');mark('language change clears preview and old print confirmation')}
    const p=await pdf(lang,kind);
    if(kind==='guide')assert.ok(!/(^|\n)0\s*(회차|session)/i.test(p.text));
    r.pdfs.push({...p,text:undefined});await click('button-close-preview');
   }
   await click('button-layout-A5x2');await click('check-doc-'+fixture.personalWorksheets[0].id);for(const a of fixture.plannerActivities.filter(x=>x.studentId===sid))await click('check-doc-'+a.id);
   for(const mode of['worksheets','cards','both']){
    await click('button-mode-'+mode);await click('button-print-personal');const p=await pdf(lang,'personal-'+mode);
    const expected=await ev(`(async()=>{const st=await import('/src/lib/store.ts'),m=await import('/src/lib/material-language.ts');return m.previewMaterialLanguage(st.getState(),${JSON.stringify(fixture.personalWorksheets[0].id)},'worksheet',${JSON.stringify(lang)}).fields})()`);
    if(mode!=='cards'){assert.ok(p.titles.includes(expected.title));const clean=s=>s.replace(/\s+/g,'');assert.ok(clean(p.text).includes(clean(expected.reading.split('\n')[0])));assert.ok(clean(p.text).includes(clean(expected.questions[0])))}
    r.pdfs.push({...p,text:undefined});await click('button-close-preview');
   }mark('10 real PDFs: A4/A5x2/mixed + guide/counseling/comparison/interview; translated body and physical pages');
   await nav('/studio/agenda');if(lang==='en'||lang==='ar')await screenshot(lang+'-desktop-agenda');
   await send('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});
   for(const route of['/studio','/studio/live','/studio/writing','/studio/print']){await nav(route);assert.ok(await ev('document.documentElement.scrollWidth<=window.innerWidth+2'),lang+' '+route+' mobile overflow')}
   if(lang==='en'||lang==='ar')await screenshot(lang+'-360-print');
   await send('Emulation.clearDeviceMetricsOverride');mark('360px course/input/language/writing/print screen');
   await reload('/studio');const final=await saved();assert.equal(originalStudent(final),original);assert.equal(final.lang,lang);mark('original student job/card/facts/V1/V2 preserved after language and reload');
   r.ok=true;
  }catch(error){r.error=String(error);console.error('FAIL',lang,r.error);await send('Emulation.setEmulatedMedia',{media:''});await send('Emulation.clearDeviceMetricsOverride');await screenshot(lang+'-failure').catch(()=>{})}
  await persist();
 }
 assert.equal(exceptions.length,0,exceptions.join('\n'));
 const failed=results.filter(x=>!x.ok).length;
 console.log(JSON.stringify({languages:results.length,passed:results.length-failed,failed,pdfs:results.flatMap(x=>x.pdfs).length,pages:results.flatMap(x=>x.pdfs).reduce((n,p)=>n+p.pages,0)}));
 if(failed)process.exitCode=1;
}finally{await persist();socket.close();await fetch('http://127.0.0.1:9227/json/close/'+target.id)}
