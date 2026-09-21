const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..', 'APPLIED_FULL');
const artifactArg = process.argv.find(arg => arg.startsWith('--artifacts='));
const artifactDir = artifactArg ? path.resolve(artifactArg.slice('--artifacts='.length)) : null;
if (artifactDir) fs.mkdirSync(artifactDir, { recursive:true });

const browserCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);
const browserPath = browserCandidates.find(file => fs.existsSync(file));
if (!browserPath) throw new Error('Chrome/Edge executable not found');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.waiters = new Map();
  }
  async open() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once:true });
      this.ws.addEventListener('error', reject, { once:true });
    });
    this.ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      const queue = this.waiters.get(message.method);
      if (queue && queue.length) queue.shift()(message.params);
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  wait(method) {
    return new Promise(resolve => {
      const queue = this.waiters.get(method) || [];
      queue.push(resolve);
      this.waiters.set(method, queue);
    });
  }
  close() { this.ws.close(); }
}

async function waitForDebugger(port) {
  for (let i = 0; i < 80; i++) {
    try {
      const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
      const page = pages.find(item => item.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch (_) {}
    await delay(100);
  }
  throw new Error('Browser debugging endpoint did not start');
}

function fileUrl(file) {
  return 'file:///' + path.resolve(file).replace(/\\/g, '/').replace(/ /g, '%20');
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue:true, awaitPromise:true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

const cases = [
  { name:'ALL_L', scores:{P:40,A:45,S:50,Q:52}, compact:'LLLL', kind:'ALL_L', processing:'BALANCED' },
  { name:'ALL_M', scores:{P:53,A:60,S:68,Q:74}, compact:'MMMM', kind:'ALL_M', processing:'BALANCED' },
  { name:'ALL_H', scores:{P:75,A:80,S:90,Q:99}, compact:'HHHH', kind:'ALL_H', processing:'BALANCED' },
  { name:'TIE', scores:{P:60,A:60,S:60,Q:60}, compact:'MMMM', kind:'ALL_M', processing:'BALANCED' },
  { name:'DIFF_10', scores:{P:60,A:60,S:70,Q:60}, compact:'MMMM', kind:'ALL_M', processing:'BALANCED' },
  { name:'S_DOM_11', scores:{P:60,A:60,S:71,Q:60}, compact:'MMMM', kind:'ALL_M', processing:'S_DOMINANT' },
  { name:'Q_DOM_11', scores:{P:60,A:60,S:60,Q:71}, compact:'MMMM', kind:'ALL_M', processing:'Q_DOMINANT' },
  { name:'P_DOM', scores:{P:90,A:60,S:60,Q:60}, compact:'HMMM', kind:'PROFILE', processing:'BALANCED' },
  { name:'A_DOM', scores:{P:60,A:90,S:60,Q:60}, compact:'MHMM', kind:'PROFILE', processing:'BALANCED' }
];

async function navigateWithProfile(cdp, html, profile) {
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source:'window.__TEST_PROFILE__=' + JSON.stringify(profile) + ';window.__DCAS_LANG__="ko";'
  });
  const loaded = cdp.wait('Page.loadEventFired');
  await cdp.send('Page.navigate', { url:fileUrl(html) });
  await loaded;
  await delay(900);
}

async function inspect(cdp, track, testCase, profile) {
  const personalizedIds = track === 'teen'
    ? ['pf-hook1','pf-hook2','pf-temp-adapt','pf-temp-mood','pf-learn-kor','pf-parent-docbody2','pf-doc-teuk-body','pf-emo-title','pf-matrix-explain','pf-mission-intro','pf-growth-step1','pf-faq-q1','pf-learning-intro','pf-routine-col3','pf-checkcard-title']
    : ['pf-cover-hook1','pf-cover-hook2','pf-cover-teaser','pf-opinion','pf-workstyle','pf-collabstyle','pf-doc1-body','pf-doc2-body','pf-eff-h2','pf-eff-title1','pf-eff-sym1','pf-growthtip','pf-roadmap-sub','pf-jobs-combotag'];
  const result = await evaluate(cdp, `(() => {
    const text = id => { const el = document.getElementById(id); return el ? el.textContent.trim() : null; };
    const p = window.__DCAS_PROFILE81__;
    return {
      ready:!!p,
      code:p && p.code,
      compact:p && p.compactCode,
      kind:p && p.kind,
      processing:p && p.processing && p.processing.kind,
      coverCode:text('pf-cover-code'),
      coverTitle:text('pf-cover-typename'),
      heroTag:text('pf-herotag'),
      heroTitle:text('pf-herotype'),
      profileCard:text('pf-profile81-card'),
      fragments:document.querySelectorAll('#pf-profile81-card .temp-block').length,
      learning:text('pf-profile81-learning-note'),
      career:text('pf-profile81-career-note'),
      job:text('pf-profile81-job-note'),
      opinion:text('pf-opinion-summary'),
      processingText:text('${track === 'adult' ? 'pf-expert-processing-note' : 'pf-expert-braintype'}'),
      workstyle:text('pf-workstyle'),
      headerTitle:text('t-title'),
      headerMeta:text('t-meta'),
      coverMeta:text('pf-cover-meta'),
      jobsHeading:text('pf-jobs-h2'),
      majorExample:text('pf-major-examplename'),
      radarScores:['P','A','S','Q'].map(k => text('pf-radar-' + k)),
      barScores:['P','A','S','Q'].map(k => text('pf-barval-' + k)),
      personalized:Object.fromEntries(${JSON.stringify(personalizedIds)}.map(id => [id, text(id)])),
      sectionCount:document.querySelectorAll('main section').length,
      bodyTextLength:document.body.innerText.length,
      bodyText:document.body.innerText,
      unresolved:[...document.body.innerText.matchAll(/\\{\\{[^}]+\\}\\}/g)].map(m=>m[0]),
      legacyHits:[...document.querySelectorAll('[id]')]
        .filter(el => !el.children.length && /(?:2026\\.08\\.23|(?:80|56|89|58|84|71|66|91)%)/.test(el.textContent))
        .filter(el => !${JSON.stringify(Object.values(profile.scores).map(value => value + '%'))}.some(value => el.textContent.includes(value)))
        .map(el => ({id:el.id,text:el.textContent.trim()}))
    };
  })()`);
  assert.ok(result.ready, `${track}/${testCase.name}: profile not rendered`);
  assert.strictEqual(result.compact, testCase.compact);
  assert.strictEqual(result.kind, testCase.kind);
  assert.strictEqual(result.processing, testCase.processing);
  assert.ok(result.coverCode.includes(result.code), `${track}/${testCase.name}: cover code overwritten`);
  assert.strictEqual(result.coverTitle, result.heroTitle, `${track}/${testCase.name}: cover/hero title mismatch`);
  assert.ok(result.heroTag.includes(result.code), `${track}/${testCase.name}: hero code missing`);
  assert.strictEqual(result.fragments, 4, `${track}/${testCase.name}: four axis fragments missing`);
  const requiredText = ['profileCard','learning','career','job','processingText'];
  if (track === 'adult') requiredText.push('opinion', 'workstyle');
  for (const key of requiredText) {
    assert.ok(result[key], `${track}/${testCase.name}: missing ${key}`);
  }
  assert.ok(result.sectionCount >= 10 && result.bodyTextLength > 1500, `${track}/${testCase.name}: incomplete report DOM ${JSON.stringify({sectionCount:result.sectionCount, bodyTextLength:result.bodyTextLength})}`);
  assert.ok(result.bodyText.includes(profile.fullName), `${track}/${testCase.name}: injected name missing`);
  assert.ok(!result.bodyText.includes(track === 'teen' ? '이지훈' : '박준서'), `${track}/${testCase.name}: preview name leaked`);
  assert.ok(!result.bodyText.includes('2026.08.23'), `${track}/${testCase.name}: preview date leaked`);
  assert.deepStrictEqual(result.unresolved, [], `${track}/${testCase.name}: unresolved identity placeholders`);
  assert.deepStrictEqual(result.legacyHits, [], `${track}/${testCase.name}: preview score leaked into personalized DOM`);
  assert.ok(result.headerTitle.includes(profile.fullName), `${track}/${testCase.name}: header title is not personalized`);
  assert.ok(result.headerMeta.includes(String(profile.ageYears)), `${track}/${testCase.name}: header age is not personalized`);
  assert.ok(result.coverMeta.includes(String(profile.testDate.y)), `${track}/${testCase.name}: cover date is not personalized`);
  assert.deepStrictEqual(result.barScores, ['P','A','S','Q'].map(k => profile.scores[k] + '%'), `${track}/${testCase.name}: score bars are not personalized`);
  if (track === 'adult') {
    assert.ok(result.coverMeta.includes(profile.majorName), `${track}/${testCase.name}: cover major is not personalized`);
    assert.ok(result.jobsHeading.includes(profile.majorName), `${track}/${testCase.name}: jobs major is not personalized`);
    assert.strictEqual(result.majorExample, '"' + profile.majorName + '"', `${track}/${testCase.name}: major example is not personalized`);
  }
  if (testCase.name === 'ALL_H') {
    assert.ok(!Object.values(result.personalized).some(text => /낮게 나온|came out low/.test(text || '')), `${track}/${testCase.name}: all-high profile described as low`);
  }
  delete result.bodyText;
  await delay(900);
  const lateCover = await evaluate(cdp, `document.getElementById('pf-cover-code').textContent.trim()`);
  assert.strictEqual(lateCover, result.coverCode, `${track}/${testCase.name}: late overwrite detected`);
  return result;
}

async function captureMobile(cdp, track) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width:390, height:844, deviceScaleFactor:1, mobile:true });
  const layout = await evaluate(cdp, `(() => {
    const ids=['pf-cover-code','pf-cover-typename','pf-profile81-card','pf-profile81-learning-note','pf-profile81-career-note','pf-profile81-job-note'];
    ids.forEach(id => { const e=document.getElementById(id); const section=e && e.closest('section'); if (section) section.classList.add('active'); });
    return {
      viewport:innerWidth,
      scrollWidth:document.documentElement.scrollWidth,
      items:ids.map(id => { const e=document.getElementById(id); const r=e && e.getBoundingClientRect(); return {id, exists:!!e, width:r&&r.width, display:e&&getComputedStyle(e).display}; })
    };
  })()`);
  assert.ok(layout.scrollWidth <= layout.viewport + 2, `${track}: horizontal mobile overflow ${layout.scrollWidth}/${layout.viewport}`);
  assert.ok(layout.items.every(item => item.exists && item.display !== 'none' && item.width > 0 && item.width <= layout.viewport + 2), `${track}: mobile item overflow/hidden`);
  if (artifactDir) {
    await evaluate(cdp, `document.getElementById('temperament').scrollIntoView({block:'start'})`);
    await delay(200);
    const shot = await cdp.send('Page.captureScreenshot', { format:'png', fromSurface:true });
    fs.writeFileSync(path.join(artifactDir, `${track}-mobile.png`), Buffer.from(shot.data, 'base64'));
  }
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  return layout;
}

async function applyAndInspectKhmer(cdp, track) {
  const switchExpression = track === 'teen'
    ? "DCasTeenEngine.setProfile81Language('km', PROFILE)"
    : "DCasAdultEngine.setProfile81Language('km')";
  await evaluate(cdp, switchExpression);
  await delay(300);
  const result = await evaluate(cdp, `(() => {
    const text = id => { const el=document.getElementById(id); return el ? el.textContent.trim() : ''; };
    const p=window.__DCAS_PROFILE81__;
    const ids=['pf-cover-typename','pf-herotag','pf-herotype','pf-profile81-card','pf-profile81-learning-note','pf-profile81-career-note','pf-profile81-job-note'];
    return {
      lang:p && p.lang,
      dir:p && p.dir,
      title:p && p.title,
      elements:ids.map(id => {
        const el=document.getElementById(id);
        return {id, text:text(id), lang:el && el.lang, dir:el && el.dir};
      })
    };
  })()`);
  assert.strictEqual(result.lang, 'km', `${track}: Khmer locale not applied`);
  assert.strictEqual(result.dir, 'ltr', `${track}: Khmer direction must be ltr`);
  assert.ok(/[\u1780-\u17FF]/.test(result.title), `${track}: Khmer title missing`);
  for (const item of result.elements) {
    assert.ok(item.text && /[\u1780-\u17FF]/.test(item.text), `${track}: Khmer text missing in ${item.id}`);
    assert.strictEqual(item.lang, 'km', `${track}: lang attribute missing in ${item.id}`);
  }
  return result;
}

async function capturePdf(cdp, track) {
  await evaluate(cdp, `document.getElementById('reportRoot').classList.add('pdf-mode')`);
  await delay(200);
  const pdf = await cdp.send('Page.printToPDF', {
    printBackground:true, preferCSSPageSize:false, paperWidth:8.27, paperHeight:11.69,
    marginTop:0.25, marginBottom:0.25, marginLeft:0.25, marginRight:0.25
  });
  const bytes = Buffer.from(pdf.data, 'base64');
  assert.ok(bytes.length > 100000, `${track}: PDF unexpectedly small`);
  assert.strictEqual(bytes.subarray(0, 4).toString(), '%PDF');
  if (artifactDir) fs.writeFileSync(path.join(artifactDir, `${track}-print.pdf`), bytes);
  await evaluate(cdp, `document.getElementById('reportRoot').classList.remove('pdf-mode')`);
  return { bytes:bytes.length };
}

(async () => {
  const port = 9300 + Math.floor(Math.random() * 300);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dcas81-chrome-'));
  const browser = spawn(browserPath, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--allow-file-access-from-files', `--remote-debugging-port=${port}`, `--user-data-dir=${userDataDir}`, 'about:blank'
  ], { stdio:'ignore' });
  let cdp;
  try {
    cdp = new Cdp(await waitForDebugger(port));
    await cdp.open();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    const summary = { browser:browserPath, tracks:{} };
    const requestedTrack = process.env.DCAS_TRACK;
    const tracks = requestedTrack ? [requestedTrack] : ['teen','adult'];
    assert.ok(tracks.every(track => track === 'teen' || track === 'adult'), 'DCAS_TRACK must be teen or adult');
    for (const track of tracks) {
      const html = path.join(root, track === 'teen' ? 'DCAS_TEEN' : 'DCAS_ADULT', track === 'teen' ? 'teen.work.html' : 'adult.work.html');
      summary.tracks[track] = { cases:{} };
      for (const testCase of cases) {
        const profile = {
          fullName:'검증 사용자', givenName:'검증', fullNameEn:'QA User', givenNameEn:'QA',
          genderKey:'F', ageYears:track === 'teen' ? 16 : 24,
          gradeLabel:track === 'teen' ? '고등학교 1학년' : '대학교 4학년',
          testDate:{y:2026,m:9,d:20}, majorName:track === 'adult' ? (testCase.name === 'A_DOM' ? '미래융합인지학과' : '심리학과') : '', scores:testCase.scores
        };
        await navigateWithProfile(cdp, html, profile);
        summary.tracks[track].cases[testCase.name] = await inspect(cdp, track, testCase, profile);
      }
      const personalizedKeys = Object.keys(summary.tracks[track].cases.ALL_L.personalized);
      summary.tracks[track].personalizationVariation = Object.fromEntries(personalizedKeys.map(key => {
        const values = Object.entries(summary.tracks[track].cases)
          .filter(([caseName]) => !(track === 'adult' && caseName === 'A_DOM'))
          .map(([, item]) => item.personalized[key]).filter(Boolean);
        const unique = new Set(values);
        const expectedCases = track === 'adult' ? cases.length - 1 : cases.length;
        assert.ok(values.length === expectedCases, `${track}: missing personalized target ${key}`);
        assert.ok(unique.size >= 2, `${track}: personalized target stayed fixed ${key}`);
        return [key, unique.size];
      }));
      summary.tracks[track].khmer = await applyAndInspectKhmer(cdp, track);
      summary.tracks[track].mobile = await captureMobile(cdp, track);
      summary.tracks[track].pdf = await capturePdf(cdp, track);
    }
    console.log(JSON.stringify(summary, null, 2));
    console.log('PASS: actual teen/adult DOM, late-overwrite, mobile, and print-PDF regression');
  } finally {
    if (cdp) cdp.close();
    browser.kill();
    await delay(300);
    fs.rmSync(userDataDir, { recursive:true, force:true });
  }
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
