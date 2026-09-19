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
    if (!file.startsWith(root + sep)) throw new Error('invalid path');
    response.writeHead(200, {'content-type': mime[extname(file)] || 'application/octet-stream'});
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const sitePort = server.address().port;
const debugPort = 9341;
const profileDirectory = resolve(tmpdir(), 'teacher-guide-edge-' + process.pid);
const browser = spawn(edgePath, ['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=' + debugPort,'--user-data-dir=' + profileDirectory,'--window-size=1440,900','about:blank'], {stdio:'ignore'});

async function waitForDebugger() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { if ((await fetch('http://127.0.0.1:' + debugPort + '/json/version')).ok) return; } catch {}
    await new Promise(resolveWait => setTimeout(resolveWait, 100));
  }
  throw new Error('Edge debugging endpoint did not start');
}
let socket; let commandId = 0; const pending = new Map(); const exceptions = [];
function command(method, params = {}) {
  return new Promise((resolveCommand, rejectCommand) => {
    const id = ++commandId; pending.set(id, {resolveCommand, rejectCommand}); socket.send(JSON.stringify({id, method, params}));
  });
}
function evaluate(expression) {
  return command('Runtime.evaluate', {expression, awaitPromise:true, returnByValue:true}).then(message => {
    if (message.result.exceptionDetails) throw new Error(message.result.exceptionDetails.text);
    return message.result.result.value;
  });
}
async function waitFor(expression, description) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await evaluate(expression)) return;
    await new Promise(resolveWait => setTimeout(resolveWait, 100));
  }
  throw new Error('Timed out: ' + description);
}
async function screenshot(name, captureBeyondViewport = false) {
  const message = await command('Page.captureScreenshot', {format:'png',captureBeyondViewport,fromSurface:true});
  await mkdir(outputDirectory, {recursive:true});
  await writeFile(resolve(outputDirectory, name), Buffer.from(message.result.data, 'base64'));
}

const results = {};
try {
  await waitForDebugger();
  const url = 'http://127.0.0.1:' + sitePort + '/teacher-guide/#opening';
  const page = await fetch('http://127.0.0.1:' + debugPort + '/json/new?' + encodeURIComponent(url), {method:'PUT'}).then(response => response.json());
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolveSocket, rejectSocket) => { socket.onopen = resolveSocket; socket.onerror = rejectSocket; });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) { const callback = pending.get(message.id); pending.delete(message.id); message.error ? callback.rejectCommand(new Error(message.error.message)) : callback.resolveCommand(message); }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
  };
  await command('Page.enable'); await command('Runtime.enable');
  await command('Emulation.setDeviceMetricsOverride', {width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await waitFor("document.querySelectorAll('.profile-card').length === 5 && document.querySelectorAll('[data-language-select] option').length === 26", 'data loading');
  results.initial = await evaluate("({hash:location.hash,visible:[...document.querySelectorAll('.chapter')].filter(x=>!x.hidden).map(x=>x.id),total:document.querySelectorAll('.chapter').length,active:document.querySelector('[aria-current=page]').dataset.chapterLink})");
  results.desktop = await evaluate("({sidebar:getComputedStyle(document.querySelector('#tocPanel')).position,readerOverflow:getComputedStyle(document.querySelector('#reader')).overflowY,logo:{width:document.querySelector('.toc-head img').clientWidth,height:document.querySelector('.toc-head img').clientHeight}})");
  await screenshot('desktop-1440-top.png');
  await screenshot('desktop-1440.png', true);

  results.navigation = await evaluate("(() => { document.querySelector('[data-chapter-link=assessment]').click(); return {hash:location.hash,visible:[...document.querySelectorAll('.chapter')].filter(x=>!x.hidden).map(x=>x.id),label:document.querySelector('#paginationLabel').textContent}; })()");
  await waitFor("location.hash === '#assessment'", 'assessment hash');
  await evaluate("document.querySelector('#nextChapter').click()");
  await waitFor("location.hash === '#evidence'", 'next chapter');
  await evaluate("document.querySelector('#previousChapter').click()");
  await waitFor("location.hash === '#assessment'", 'previous chapter');
  await evaluate("history.back()");
  await waitFor("location.hash === '#evidence'", 'browser back');
  await evaluate("history.forward()");
  await waitFor("location.hash === '#assessment'", 'browser forward');
  await evaluate("location.hash='#results'");
  await waitFor("location.hash === '#results' && !document.querySelector('#results').hidden", 'legacy results hash');
  results.hash = await evaluate("({hash:location.hash,visible:[...document.querySelectorAll('.chapter')].filter(x=>!x.hidden).map(x=>x.id)})");

  results.interactions = await evaluate("(() => { const d=[...document.querySelectorAll('[data-dashboard]')].map(button=>{button.click();return document.querySelector('#dashboardDetail').textContent.length>20}); const lang=document.querySelector('[data-language-select]'); lang.value='km';lang.dispatchEvent(new Event('change')); const pending=!document.querySelector('#translationNotice').hidden; const plan=document.querySelector('[data-filter=계획]');plan.value='하';plan.dispatchEvent(new Event('input'));const filtered=document.querySelectorAll('.profile-card').length;document.querySelector('#resetFilters').click();document.querySelector('[data-profile-id]').click();const modal=document.querySelector('#profileDialog').open;document.querySelector('#closeProfileDialog').click();const reports=[...document.querySelectorAll('[data-report-link]')];return {dashboard:d.every(Boolean),pending,filtered,reset:document.querySelectorAll('.profile-card').length,modal,reports:reports.length,external:reports.every(a=>a.target==='_blank'&&a.rel.includes('noopener')&&a.rel.includes('noreferrer')&&a.href.includes('?lang=ko'))}; })()");
  await evaluate("(() => { const language=document.querySelector('[data-language-select]'); language.value='ko'; language.dispatchEvent(new Event('change')); })()");

  await command('Emulation.setDeviceMetricsOverride', {width:360,height:800,deviceScaleFactor:1,mobile:true,screenWidth:360,screenHeight:800});
  await new Promise(resolveWait => setTimeout(resolveWait, 200));
  results.mobile = await evaluate("(() => { document.querySelector('#tocToggle').click(); const open=document.querySelector('#tocPanel').classList.contains('open'); document.querySelector('[data-chapter-link=nuvia]').click(); return {open,closed:!document.querySelector('#tocPanel').classList.contains('open'),hash:location.hash,visible:[...document.querySelectorAll('.chapter')].filter(x=>!x.hidden).map(x=>x.id),overflow:document.documentElement.scrollWidth>innerWidth,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth}; })()");
  await waitFor("location.hash === '#nuvia' && document.querySelector('#tocOverlay').hidden && !document.querySelector('#nuvia').hidden", 'mobile chapter transition');
  results.mobile.closed = !await evaluate("document.querySelector('#tocPanel').classList.contains('open')");
  results.mobile.overlayHidden = await evaluate("getComputedStyle(document.querySelector('#tocOverlay')).display === 'none'");
  results.mobile.hash = await evaluate("location.hash");
  results.mobile.visible = await evaluate("[...document.querySelectorAll('.chapter')].filter(x=>!x.hidden).map(x=>x.id)");
  await screenshot('mobile-360-top.png');
  await screenshot('mobile-360.png', true);
  await command('Emulation.setEmulatedMedia', {media:'print'});
  results.print = await evaluate("({visible:[...document.querySelectorAll('.chapter')].filter(x=>getComputedStyle(x).display!=='none').length,sidebar:getComputedStyle(document.querySelector('#tocPanel')).display,readerHeight:getComputedStyle(document.querySelector('#reader')).height})");
  results.exceptions = exceptions;
  const failures = [];
  if (results.initial.hash !== '#opening' || results.initial.visible.join() !== 'opening' || results.initial.total !== 16) failures.push('initial');
  if (results.desktop.sidebar !== 'fixed' || results.desktop.readerOverflow !== 'auto') failures.push('desktop');
  if (results.navigation.visible.join() !== 'assessment' || results.hash.visible.join() !== 'results') failures.push('hash-navigation');
  if (!results.interactions.dashboard || !results.interactions.pending || results.interactions.reset !== 5 || !results.interactions.modal || results.interactions.reports !== 6 || !results.interactions.external) failures.push('interactions');
  if (!results.mobile.open || !results.mobile.closed || !results.mobile.overlayHidden || results.mobile.hash !== '#nuvia' || results.mobile.visible.join() !== 'nuvia' || results.mobile.overflow) failures.push('mobile');
  if (results.print.visible !== 16 || results.print.sidebar !== 'none') failures.push('print');
  if (exceptions.length) failures.push('javascript');
  results.status = failures.length ? 'FAIL: ' + failures.join(', ') : 'PASS';
  console.log(JSON.stringify(results, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  if (socket) socket.close();
  browser.kill(); server.close();
  await rm(profileDirectory, {recursive:true,force:true}).catch(() => {});
}
