import {createServer} from 'node:http';
import {readFile, mkdir, writeFile, rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {extname, resolve, sep} from 'node:path';
import {tmpdir} from 'node:os';

const root = resolve(import.meta.dirname, '..', '..');
const outputDirectory = resolve(root, 'teacher-guide', 'screenshots');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png'};

const server = createServer(async (request, response) => {
  try {
    const requested = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = requested === '/' ? 'teacher-guide/index.html' : requested.replace(/^\//, '').replace(/\/$/, '/index.html');
    const file = resolve(root, relative);
    if (!file.startsWith(`${root}${sep}`)) throw new Error('invalid path');
    const content = await readFile(file);
    response.writeHead(200, {'content-type': mime[extname(file)] || 'application/octet-stream'});
    response.end(content);
  } catch {
    response.writeHead(404); response.end('Not found');
  }
});

await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const sitePort = server.address().port;
const debugPort = 9337;
const profileDirectory = resolve(tmpdir(), `teacher-guide-edge-${process.pid}`);
const browser = spawn(edgePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profileDirectory}`,
  '--window-size=1440,900', 'about:blank'
], {stdio: 'ignore'});

async function waitForDebugger() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolveWait => setTimeout(resolveWait, 100));
  }
  throw new Error('Edge debugging endpoint did not start');
}

let socket;
let commandId = 0;
const pending = new Map();
const exceptions = [];

function command(method, params = {}) {
  return new Promise((resolveCommand, rejectCommand) => {
    const id = ++commandId;
    pending.set(id, {resolveCommand, rejectCommand});
    socket.send(JSON.stringify({id, method, params}));
  });
}

function evaluate(expression) {
  return command('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true}).then(result => {
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.result.value;
  });
}

async function waitForLoad() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = await evaluate(`document.readyState === 'complete' && document.querySelectorAll('.profile-card').length === 5 && document.querySelectorAll('#languageSelect option').length === 13`);
    if (ready) return;
    await new Promise(resolveWait => setTimeout(resolveWait, 100));
  }
  throw new Error('Page data did not finish loading');
}

async function screenshot(name, captureBeyondViewport = true) {
  const result = await command('Page.captureScreenshot', {format: 'png', captureBeyondViewport, fromSurface: true});
  await mkdir(outputDirectory, {recursive: true});
  await writeFile(resolve(outputDirectory, name), Buffer.from(result.result.data, 'base64'));
}

const results = {};
try {
  await waitForDebugger();
  const page = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`http://127.0.0.1:${sitePort}/teacher-guide/`)}`, {method:'PUT'}).then(response => response.json());
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolveSocket, rejectSocket) => { socket.onopen = resolveSocket; socket.onerror = rejectSocket; });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const callbacks = pending.get(message.id); pending.delete(message.id);
      if (message.error) callbacks.rejectCommand(new Error(message.error.message)); else callbacks.resolveCommand(message);
    }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
  };
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Emulation.setDeviceMetricsOverride', {width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await command('Page.navigate', {url:`http://127.0.0.1:${sitePort}/teacher-guide/`});
  await waitForLoad();

  results.content = await evaluate(`({
    title: document.title,
    sections: [...document.querySelectorAll('main section')].map(section => section.id).filter(Boolean),
    profiles: document.querySelectorAll('.profile-card').length,
    languages: document.querySelectorAll('#languageSelect option').length,
    logoRatio: +(document.querySelector('.brand img').clientWidth / document.querySelector('.brand img').clientHeight).toFixed(2)
  })`);
  results.links = await evaluate(`[...document.querySelectorAll('a[href^="#"]')].every(link => link.getAttribute('href') === '#top' || document.querySelector(link.getAttribute('href')))`);
  results.interactions = await evaluate(`(() => {
    const pathTitles = [...document.querySelectorAll('[data-path]')].map(button => { button.click(); return document.querySelector('#pathDetail h3').textContent; });
    const dashboardTexts = [...document.querySelectorAll('[data-dashboard]')].map(button => { button.click(); return document.querySelector('#dashboardDetail').textContent; });
    const language = document.querySelector('#languageSelect');
    const languageStates = [...language.options].map(option => { language.value = option.value; language.dispatchEvent(new Event('change')); return option.value === 'ko' ? document.querySelector('#translationNotice').hidden : !document.querySelector('#translationNotice').hidden; });
    language.value = 'km'; language.dispatchEvent(new Event('change'));
    const plan = document.querySelector('[data-filter="계획"]'); plan.value = '하'; plan.dispatchEvent(new Event('input'));
    const filtered = document.querySelectorAll('.profile-card').length;
    document.querySelector('#resetFilters').click();
    const modalStates = [...document.querySelectorAll('[data-profile-id]')].map(button => { button.click(); const opened = document.querySelector('#profileDialog').open; document.querySelector('#profileDialog').close(); return opened; });
    window.__printed = false; window.print = () => { window.__printed = true; }; document.querySelector('footer button').click();
    return {
      pathTitles,
      dashboardTexts,
      languageStates,
      filtered,
      reset: document.querySelectorAll('.profile-card').length,
      modalStates,
      printed: window.__printed
    };
  })()`);
  results.focus = await evaluate(`(() => { document.querySelector('#profileSearch').focus(); return {id:document.activeElement.id, outline:getComputedStyle(document.activeElement).outlineStyle}; })()`);
  await evaluate(`document.documentElement.dir='ltr'; document.querySelector('#languageSelect').value='ko'; document.querySelector('#translationNotice').hidden=true; scrollTo(0,0)`);
  await screenshot('desktop-1440-top.png', false);
  await screenshot('desktop-1440.png');

  await command('Emulation.setDeviceMetricsOverride', {width:360,height:800,deviceScaleFactor:1,mobile:true,screenWidth:360,screenHeight:800});
  await new Promise(resolveWait => setTimeout(resolveWait, 250));
  results.mobile = await evaluate(`(() => { const toggle=document.querySelector('.menu-toggle'); toggle.click(); const menuOpened=document.querySelector('#menu').classList.contains('open') && toggle.getAttribute('aria-expanded')==='true'; document.querySelector('#menu a').click(); return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth,heroTitle:getComputedStyle(document.querySelector('#hero-title')).fontSize,menuOpened,menuClosed:!document.querySelector('#menu').classList.contains('open'),logo:{width:document.querySelector('.brand img').clientWidth,height:document.querySelector('.brand img').clientHeight}}; })()`);
  await evaluate(`scrollTo(0,0)`);
  await screenshot('mobile-360-top.png', false);
  await screenshot('mobile-360.png');

  await command('Emulation.setEmulatedMedia', {media:'print'});
  results.print = await evaluate(`({header:getComputedStyle(document.querySelector('.site-header')).display,bodyBackground:getComputedStyle(document.body).backgroundColor,heroBackground:getComputedStyle(document.querySelector('.hero')).backgroundColor})`);
  results.exceptions = exceptions;

  const failures = [];
  if (results.content.profiles !== 5) failures.push('profiles');
  if (results.content.languages !== 13) failures.push('languages');
  if (!results.links) failures.push('links');
  if (new Set(results.interactions.pathTitles).size !== 4 || new Set(results.interactions.dashboardTexts).size !== 4 || !results.interactions.languageStates.every(Boolean) || !results.interactions.modalStates.every(Boolean) || !results.interactions.printed || results.interactions.reset !== 5) failures.push('interactions');
  if (results.focus.id !== 'profileSearch' || results.focus.outline === 'none') failures.push('focus');
  if (results.mobile.overflow || !results.mobile.menuOpened || !results.mobile.menuClosed) failures.push('mobile');
  if (results.print.header !== 'none') failures.push('print');
  if (exceptions.length) failures.push('javascript-exceptions');
  results.status = failures.length ? `FAIL: ${failures.join(', ')}` : 'PASS';
  console.log(JSON.stringify(results, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  if (socket) socket.close();
  browser.kill();
  server.close();
  await rm(profileDirectory, {recursive:true,force:true}).catch(() => {});
}
