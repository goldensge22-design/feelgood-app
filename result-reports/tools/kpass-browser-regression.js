const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const html = path.resolve(__dirname, '..', 'kpass', 'candidate', 'report.kpass.final.html');
const browserPath = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean).find(file => fs.existsSync(file));
if (!browserPath) throw new Error('Chrome/Edge executable not found');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const fileUrl = file => 'file:///' + path.resolve(file).replace(/\\/g, '/').replace(/ /g, '%20');

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.waiters = new Map();
  }
  async open() {
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
        return message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result);
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

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue:true, awaitPromise:true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function navigate(cdp, profile, locale) {
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source:`window.__TEST_PROFILE__=${JSON.stringify(profile)};window.__REPORT_LOCALE__=${JSON.stringify(locale)};`
  });
  const loaded = cdp.wait('Page.loadEventFired');
  await cdp.send('Page.navigate', { url:fileUrl(html) });
  await loaded;
  await delay(900);
}

async function inspect(cdp) {
  return evaluate(cdp, `(() => ({
    lang:document.documentElement.lang,
    menu:[...document.querySelectorAll('.lang-item')].map(x => x.dataset.code),
    title:document.getElementById('coverTitle').textContent.trim(),
    child:document.getElementById('pf-childchip').textContent.trim(),
    scores:['P','A','S','Q'].map(k => document.getElementById('pf-side-'+k).textContent.trim()),
    body:document.body.innerText,
    personalized:{
      hero:document.getElementById('pf-herotype').textContent.trim(),
      home:document.getElementById('pf-homeai').textContent.trim(),
      temperament:document.getElementById('pf-temperament').textContent.trim(),
      subject:document.getElementById('pf-subject-grid').textContent.trim(),
      opinion:document.getElementById('pf-opinionlead').textContent.trim(),
      career:document.getElementById('pf-careerdesc').textContent.trim(),
      growth:document.getElementById('pf-growthdesc').textContent.trim(),
      teacher:document.getElementById('pf-teachermsg').textContent.trim(),
      brain:document.getElementById('pf-learntype-name').textContent.trim()
    },
    errors:window.__KPASS_LOCALE_COVERAGE__
  }))()`);
}

(async () => {
  const port = 9600 + Math.floor(Math.random() * 200);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kpass-report-chrome-'));
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

    const profile = {
      name:'통합 검증 아동', genderKey:'F', ageYears:10, ageMonths:2,
      testDate:{y:2026,m:9,d:21}, fullScaleScore:111,
      scores:{P:120,A:110,S:100,Q:90}
    };
    await navigate(cdp, profile, 'en');
    const result = await inspect(cdp);
    assert.strictEqual(result.lang, 'ko', 'partial English locale must fall back to Korean');
    assert.deepStrictEqual(result.menu, ['ko'], 'partial locales must not appear in the user menu');
    assert.ok(result.title.includes(profile.name), 'profile name was not applied to the cover');
    assert.ok(result.child.includes(profile.name), 'profile name was not applied to the identity chip');
    assert.deepStrictEqual(result.scores, ['120','110','100','90'], 'scores were not applied consistently');
    assert.ok(!result.body.includes('송서우'), 'default preview name remains after personalization');
    assert.ok(!result.body.includes('2023.02.27'), 'default preview date remains after personalization');
    assert.strictEqual(result.errors.km.status, 'missing');

    const opposite = {
      name:'역방향 검증 아동', genderKey:'M', ageYears:11, ageMonths:1,
      testDate:{y:2026,m:9,d:22}, fullScaleScore:114,
      scores:{P:90,A:95,S:120,Q:145}
    };
    await navigate(cdp, opposite, 'ko');
    const oppositeResult = await inspect(cdp);
    assert.ok(oppositeResult.title.includes(opposite.name));
    assert.deepStrictEqual(oppositeResult.scores, ['90','95','120','145']);
    assert.ok(!oppositeResult.body.includes(profile.name), 'previous profile name leaked after reload');
    for (const key of Object.keys(result.personalized)) {
      assert.ok(result.personalized[key], `missing personalized target ${key}`);
      assert.ok(oppositeResult.personalized[key], `missing opposite personalized target ${key}`);
      assert.notStrictEqual(result.personalized[key], oppositeResult.personalized[key], `personalized target stayed fixed: ${key}`);
    }
    console.log('PASS: K-PASS personalization and full-locale-only menu');
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
