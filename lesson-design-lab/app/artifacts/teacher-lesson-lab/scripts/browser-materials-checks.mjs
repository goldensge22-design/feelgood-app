// Uses an isolated Chromium profile/CDP endpoint. PDFs and test fixtures stay in /tmp, never student storage.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const fixture = JSON.parse(await fs.readFile('/tmp/lesson-lab-1.2-fixture.json', 'utf8'));
const dev = process.env.REPLIT_DEV_DOMAIN;
if (!dev) throw new Error('REPLIT_DEV_DOMAIN is required for the app proxy URL.');
const origin = `https://${dev}`;
const target = await (await fetch('http://127.0.0.1:9227/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let sequence = 0; const pending = new Map(); const browserErrors = [];
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
});
ws.onmessage = ({ data }) => {
  const m = JSON.parse(String(data));
  if (m.id) {
    const p = pending.get(m.id); if (!p) return; pending.delete(m.id);
    m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result);
  }
  if (m.method === 'Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog', { accept: true });
  if (m.method === 'Runtime.exceptionThrown') browserErrors.push(m.params.exceptionDetails.text);
};
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
const wait = async (expression) => {
  const end = Date.now() + 15000;
  do {
    if (await evaluate(expression)) return;
    await new Promise((r) => setTimeout(r, 70));
  } while (Date.now() < end);
  throw Error(`Timed out: ${expression}`);
};
const selector = (id) => `[data-testid="${id}"]`;
const click = async (id) => {
  await wait(`!!document.querySelector(${JSON.stringify(selector(id))})`);
  await evaluate(`document.querySelector(${JSON.stringify(selector(id))}).click()`);
  await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
};
const input = async (id, value) => {
  await wait(`!!document.querySelector(${JSON.stringify(selector(id))})`);
  await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector(id))});const setter=Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
};
const saved = () => evaluate("JSON.parse(localStorage.getItem('feelgood-lesson-lab-v1'))");
const ids = fixture.students.slice(0, 2).map((s) => s.id);
const navigate = async (query = `ids=${ids.join(',')}`) => {
  await send('Page.navigate', { url: `${origin}/materials?${query}` });
  await wait("!!document.querySelector('[data-testid=\"button-build-bundle\"]')");
};
let pdfCount = 0; let screenshotPath;
const recordsOnly = process.argv.includes('--records-only');
let generated = fixture;
try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__printCalls=0;window.print=()=>{window.__printCalls++}' });
  await send('Page.navigate', { url: `${origin}/` });
  await wait("!!document.querySelector('#root') && document.readyState==='complete'");
  await evaluate(`localStorage.setItem('feelgood-lesson-lab-v1',${JSON.stringify(JSON.stringify(fixture))})`);
  // Real controls: new generation, teacher confirmation, and a repeated request must not duplicate.
  if (!recordsOnly) {
  const empty = { ...fixture, personalWorksheets: [], plannerActivities: [], materialBundles: [] };
  await evaluate(`localStorage.setItem('feelgood-lesson-lab-v1',${JSON.stringify(JSON.stringify(empty))})`);
  await navigate();
  await input('select-template-family', '5');
  await click('check-kind-0'); await click('check-kind-1');
  await click('button-generate-materials');
  await wait("JSON.parse(localStorage.getItem('feelgood-lesson-lab-v1')).plannerActivities.length===2");
  await click('button-generate-materials');
  assert.equal((await saved()).plannerActivities.length, 2);
  await click('button-batch-confirm');
  await wait("JSON.parse(localStorage.getItem('feelgood-lesson-lab-v1')).plannerActivities.every(a=>a.status==='confirmed')");
  console.log('PASS real UI generation, repeat/idempotence and teacher confirmation');
  generated = await saved();
  // Print all three modes in both layouts. Each case captures the same UI markup through Chromium's PDF renderer.
  for (const mode of ['worksheets', 'cards', 'both']) for (const layout of ['A4', 'A5x2']) {
    await navigate();
    await click(`button-print-mode-${mode}`);
    if (mode !== 'worksheets') await input('select-material-layout', layout);
    await click('button-build-bundle');
    const bundle = (await saved()).materialBundles[0];
    assert.ok(bundle && bundle.mode === mode);
    await click(`button-print-bundle-${bundle.id}`);
    await wait("document.body.classList.contains('mat-printing') && window.__printCalls>0");
    await send('Emulation.setEmulatedMedia', { media: 'print' });
    await evaluate('document.fonts.ready');
    const fit = await evaluate(`Array.from(document.querySelectorAll('.mat-print-root .mat-page')).map(p=>({page:p.dataset.testid,body:p.getBoundingClientRect().height,scroll:p.scrollHeight,panels:Array.from(p.querySelectorAll('.mat-panel')).map(q=>({height:q.getBoundingClientRect().height,scroll:q.scrollHeight}))}))`);
    assert.ok(fit.length, 'Print root exists');
    assert.ok(fit.every((p) => p.scroll <= p.body + 3 && p.panels.every((q) => q.scroll <= q.height + 3)), `Overflow: ${JSON.stringify(fit)}`);
    const pdf = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true });
    const file = `/tmp/lesson-lab-${mode}-${layout}.pdf`;
    await fs.writeFile(file, Buffer.from(pdf.data, 'base64'));
    const info = execFileSync('pdfinfo', [file], { encoding: 'utf8' });
    const actualPages = Number(info.match(/Pages:\s+(\d+)/)?.[1]);
    assert.equal(actualPages, bundle.pages.length, 'Physical PDF pages match displayed paper count');
    const text = execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' }).split('\f').filter((p) => p.trim());
    assert.equal(text.length, bundle.pages.length);
    text.forEach((page, i) => {
      assert.ok(page.includes(bundle.pages[i].code), `Missing student code page${i + 1}`);
      fixture.students.filter((s) => s.code !== bundle.pages[i].code).forEach((s) => assert.ok(!page.includes(s.code), 'Other student page mixed'));
      assert.ok(!page.includes('브라우저 저장') && !page.includes('자동 점검') && !page.includes('가상 예시 이름'), 'No internal status or default names');
    });
    assert.equal((await saved()).materialBundles[0].state, 'print-requested');
    await send('Emulation.setEmulatedMedia', { media: '' });
    pdfCount++;
    console.log(`PASS ${mode}/${layout}: ${actualPages} actual PDF pages, ordered per student, no clipping`);
  }
  // One-student and cohort scope, frozen reprint content after an edit.
  await navigate(`ids=${ids[1]}`);
  await click('button-build-bundle');
  const single = (await saved()).materialBundles[0];
  assert.deepEqual(single.studentIds, [ids[1]]);
  await navigate();
  await click('button-scope-cohort'); await input('select-material-cohort', fixture.students[0].cohort);
  await click('button-build-bundle');
  const cohort = (await saved()).materialBundles[0];
  assert.deepEqual(cohort.studentIds, ids);
  const before = JSON.stringify(cohort.pages);
  const changed = await saved(); changed.personalWorksheets[0].fields.answer = '수정 후에도 이전 인쇄본에는 없어야 하는 가상 문구';
  await evaluate(`localStorage.setItem('feelgood-lesson-lab-v1',${JSON.stringify(JSON.stringify(changed))})`);
  await navigate();
  const stored = (await saved()).materialBundles.find((b) => b.id === cohort.id);
  assert.equal(JSON.stringify(stored.pages), before);
  await click(`button-print-bundle-${cohort.id}`);
  await wait("window.__printCalls>0 && document.body.classList.contains('mat-printing')");
  const repeated = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true });
  await fs.writeFile('/tmp/lesson-lab-same-version-reprint.pdf', Buffer.from(repeated.data, 'base64'));
  assert.ok(!execFileSync('pdftotext', ['/tmp/lesson-lab-same-version-reprint.pdf', '-'], { encoding: 'utf8' }).includes('수정 후에도 이전 인쇄본'));
  console.log('PASS one-student scope, whole-cohort scope and frozen-version PDF reprint');
  }
  await navigate(`ids=${ids[1]}`);
  await click('button-build-bundle');
  const one = (await saved()).materialBundles[0];
  await click(`button-print-bundle-${one.id}`);
  await wait("window.__printCalls>0 && document.body.classList.contains('mat-printing')");
  const onePDF = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true });
  await fs.writeFile('/tmp/lesson-lab-one-student.pdf', Buffer.from(onePDF.data, 'base64'));
  const oneText = execFileSync('pdftotext', ['/tmp/lesson-lab-one-student.pdf', '-'], { encoding: 'utf8' });
  assert.ok(oneText.includes(fixture.students[1].code) && !oneText.includes(fixture.students[0].code));
  console.log('PASS real single-student PDF excludes every other student');
  // Open the planner record editor and prove that planned != performed and manual != registered.
  await navigate();
  const activity = generated.plannerActivities[0];
  await click(`button-open-material-${ids[0]}`); await click(`button-doc-${activity.id}`);
  await click(`button-rec-performed-${activity.id}`);
  const invalid = await evaluate(`document.querySelector(${JSON.stringify(selector(`button-pl-confirm-${activity.id}`))}).disabled`);
  assert.equal(invalid, true);
  await click(`button-rec-planned-${activity.id}`);
  await click(`check-reg-manual-${activity.id}`); await click(`button-reg-manual-${activity.id}`);
  assert.equal((await saved()).plannerActivities[0].registration.state, 'manual-confirmed');
  assert.equal((await saved()).plannerActivities[0].record.state, 'planned');
  console.log('PASS actual record confirmation guard and disconnected manual-registration state');
  await click(`button-rec-performed-${activity.id}`);
  await input(`rec-actual-${activity.id}`, '가상 교육용 자료 두 개를 대조하고 누락 내용을 표시했다.');
  await input(`rec-confirmed-by-${activity.id}`, 'teacher');
  await input(`rec-source-${activity.id}`, 'paper');
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector(`button-pl-confirm-${activity.id}`))}).disabled`), true);
  await click(`rec-paper-${activity.id}`);
  await input(`pl-edit-reason-${activity.id}`, '가상 종이 기록을 교사가 확인함');
  await click(`button-pl-confirm-${activity.id}`);
  await wait("JSON.parse(localStorage.getItem('feelgood-lesson-lab-v1')).plannerActivities[0].record.state==='performed'");
  assert.equal((await saved()).experiences.length, fixture.experiences.length);
  assert.notEqual((await saved()).plannerActivities[0].registration.state, 'registered');
  console.log('PASS confirmed manual-paper transcription saves actual performance, not automatic experience or external registration');
  await send('Browser.grantPermissions', { origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
  await send('Page.bringToFront');
  const copyPosition = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector(`button-reg-copy-${activity.id}`))});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...copyPosition, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...copyPosition, button: 'left', clickCount: 1 });
  await wait("JSON.parse(localStorage.getItem('feelgood-lesson-lab-v1')).plannerActivities[0].registration.state==='copied'");
  assert.notEqual((await saved()).plannerActivities[0].registration.state, 'registered');
  console.log('PASS actual browser clipboard copy remains disconnected from external planner registration');
  const sentinel = '언어를 바꾸어도 유지할 학생 작성 원문';
  await input(`rec-actual-${activity.id}`, sentinel);
  const langSelect = await evaluate("Array.from(document.querySelectorAll('select')).find(s=>Array.from(s.options).some(o=>o.value==='ar')).dataset.testid");
  await input(langSelect, 'ar');
  await wait("document.documentElement.dir==='rtl'");
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector(`rec-actual-${activity.id}`))}).value`), sentinel);
  console.log('PASS Arabic direction and language switch preserve unsaved student-authored text');
  // Mobile and Arabic preserve the input/linked record rather than remounting or translating student text.
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
  await evaluate("document.documentElement.lang");
  screenshotPath = '/tmp/lesson-lab-materials-mobile.png';
  const screen = await send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile(screenshotPath, Buffer.from(screen.data, 'base64'));
  assert.equal(browserErrors.length, 0, browserErrors.join('\n'));
  console.log(JSON.stringify({ pdfModesChecked: pdfCount, screenshotPath, browserErrors, fixturesOnly: true }));
} finally {
  ws.close();
  await fetch(`http://127.0.0.1:9227/json/close/${target.id}`).catch(() => {});
}
