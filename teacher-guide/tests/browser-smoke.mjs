import {createServer} from 'node:http';
import {readFile, mkdir, writeFile, rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {extname, resolve, sep} from 'node:path';
import {tmpdir} from 'node:os';

const root = resolve(import.meta.dirname, '..', '..');
const outputDirectory = resolve(root, 'teacher-guide', 'screenshots');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sitePort = 4187;
const debugPort = 9348;
const routes = ['opening','guide','assessment','assessment-expertise','pass','pathways','results','levels','profiles','teacher','dashboard','nuvia','parents','support','closing'];
const viewports = [
  {name:'PC 1440×900',width:1440,height:900,mobile:false},
  {name:'노트북 1280×720',width:1280,height:720,mobile:false},
  {name:'소형 데스크톱 1024×768',width:1024,height:768,mobile:false},
  {name:'태블릿 768×1024',width:768,height:1024,mobile:true},
  {name:'모바일 390×844',width:390,height:844,mobile:true},
  {name:'소형 모바일 360×800',width:360,height:800,mobile:true}
];
const zoomWidths = [
  {name:'100%',width:1440},
  {name:'125%',width:1152},
  {name:'150%',width:960}
];
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png'};

const server = createServer(async (request, response) => {
  try {
    const requested = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = requested === '/' ? 'teacher-guide/index.html' : requested.replace(/^\//, '').replace(/\/$/, '/index.html');
    const file = resolve(root, relative);
    if (!file.startsWith(root + sep)) throw new Error('invalid path');
    response.writeHead(200, {'content-type': mime[extname(file)] || 'application/octet-stream'});
    response.end(await readFile(file));
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});
await new Promise(resolveListen => server.listen(sitePort, '127.0.0.1', resolveListen));

const profileDirectory = resolve(tmpdir(), 'teacher-guide-qa-' + process.pid);
const browser = spawn(edgePath, [
  '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
  '--remote-debugging-port=' + debugPort,'--user-data-dir=' + profileDirectory,
  '--window-size=1440,900','about:blank'
], {stdio:'ignore'});

async function waitForDebugger() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch('http://127.0.0.1:' + debugPort + '/json/version')).ok) return;
    } catch {}
    await new Promise(resolveWait => setTimeout(resolveWait, 100));
  }
  throw new Error('Edge debugging endpoint did not start');
}

let socket;
let commandId = 0;
const pending = new Map();
const exceptions = [];
const consoleErrors = [];

function command(method, params = {}) {
  return new Promise((resolveCommand, rejectCommand) => {
    const id = ++commandId;
    pending.set(id, {resolveCommand, rejectCommand});
    socket.send(JSON.stringify({id, method, params}));
  });
}

function evaluate(expression, userGesture = false) {
  return command('Runtime.evaluate', {expression,awaitPromise:true,returnByValue:true,userGesture}).then(message => {
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

async function setViewport(viewport) {
  await command('Emulation.setDeviceMetricsOverride', {
    width:viewport.width,height:viewport.height,deviceScaleFactor:1,mobile:viewport.mobile,
    screenWidth:viewport.width,screenHeight:viewport.height
  });
  await new Promise(resolveWait => setTimeout(resolveWait, 120));
}

async function screenshot(name) {
  const message = await command('Page.captureScreenshot', {format:'png',captureBeyondViewport:false,fromSurface:true});
  await mkdir(outputDirectory, {recursive:true});
  await writeFile(resolve(outputDirectory, name), Buffer.from(message.result.data, 'base64'));
}

async function openRoute(route) {
  const url = 'http://127.0.0.1:' + sitePort + '/teacher-guide/#' + route;
  await command('Page.navigate', {url});
  await waitFor("document.readyState === 'complete' && location.hash === '#" + route + "' && document.querySelectorAll('.chapter:not([hidden])').length === 1", 'route ' + route);
}

async function layoutSnapshot() {
  return evaluate("(() => { const visible=document.querySelector('.chapter:not([hidden])'); const reader=document.querySelector('#reader'); const controls=[...visible.querySelectorAll('button,a,select,input')].filter(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}); const clippedElements=[...visible.querySelectorAll('h1,h2,h3,p,span,strong,button,a')].filter(el=>el.scrollWidth>el.clientWidth+2); return {visible:visible.id,visibleCount:document.querySelectorAll('.chapter:not([hidden])').length,active:document.querySelector('[data-chapter-link][aria-current=page]')?.dataset.chapterLink||'',documentOverflow:document.documentElement.scrollWidth>innerWidth,readerOverflow:reader.scrollWidth>reader.clientWidth+1,clipped:clippedElements.length,clippedItems:clippedElements.map(el=>({tag:el.tagName.toLowerCase(),className:el.className,text:el.textContent.trim().slice(0,40),clientWidth:el.clientWidth,scrollWidth:el.scrollWidth})),smallTargets:controls.filter(el=>{const r=el.getBoundingClientRect();return r.width<40||r.height<40}).length}; })()");
}

const report = {static:{},routes:{},history:{},pagination:{},interactions:{},external:{},viewports:{},zoom:{},print:{},console:{},status:'PASS'};
const failures = [];

try {
  await waitForDebugger();
  const page = await fetch('http://127.0.0.1:' + debugPort + '/json/new?' + encodeURIComponent('http://127.0.0.1:' + sitePort + '/teacher-guide/#opening'), {method:'PUT'}).then(response => response.json());
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolveSocket, rejectSocket) => { socket.onopen = resolveSocket; socket.onerror = rejectSocket; });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const callback = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) callback.rejectCommand(new Error(message.error.message));
      else callback.resolveCommand(message);
    }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') consoleErrors.push(message.params.args.map(arg => arg.value || arg.description || '').join(' '));
  };
  await command('Page.enable');
  await command('Runtime.enable');
  await setViewport(viewports[0]);
  await waitFor("document.querySelectorAll('.profile-card').length===5 && document.querySelectorAll('[data-language-select] option').length===26", 'data load');

  report.static = await evaluate("(() => { const ids=[...document.querySelectorAll('[id]')].map(el=>el.id); const duplicates=ids.filter((id,index)=>ids.indexOf(id)!==index); const empty=[...document.querySelectorAll('a')].filter(a=>!a.getAttribute('href')||a.getAttribute('href')==='#').length; const broken=[...document.querySelectorAll('a[href^=\"#\"]')].filter(a=>!document.querySelector(a.getAttribute('href'))).map(a=>a.getAttribute('href')); const css=[...document.styleSheets].map(sheet=>new URL(sheet.href).pathname.split('/').pop()); return {chapters:document.querySelectorAll('.chapter').length,toc:document.querySelectorAll('[data-chapter-link]').length,duplicates:[...new Set(duplicates)],emptyHref:empty,brokenInternal:broken,stylesheets:css}; })()");
  if (report.static.chapters !== 15 || report.static.toc !== 15 || report.static.duplicates.length || report.static.emptyHref || report.static.brokenInternal.length || report.static.stylesheets.join() !== 'ebook.css') failures.push('static-integrity');

  for (const route of routes) {
    await openRoute(route);
    const snapshot = await layoutSnapshot();
    report.routes[route] = snapshot;
    if (snapshot.visible !== route || snapshot.visibleCount !== 1 || snapshot.active !== route) failures.push('route-' + route);
  }

  await command('Page.reload', {ignoreCache:true});
  await waitFor("location.hash==='#closing' && !document.querySelector('#closing').hidden", 'reload hash');
  report.routes.reload = await layoutSnapshot();
  if (report.routes.reload.visible !== 'closing') failures.push('reload');

  await openRoute('opening');
  await evaluate("document.querySelector('[data-chapter-link=assessment]').click()");
  await waitFor("location.hash==='#assessment'", 'history assessment');
  await evaluate("document.querySelector('[data-chapter-link=results]').click()");
  await waitFor("location.hash==='#results'", 'history results');
  await evaluate("history.back()");
  await waitFor("location.hash==='#assessment'", 'history back');
  report.history.back = await layoutSnapshot();
  await evaluate("history.forward()");
  await waitFor("location.hash==='#results'", 'history forward');
  report.history.forward = await layoutSnapshot();
  if (report.history.back.visible !== 'assessment' || report.history.forward.visible !== 'results') failures.push('history');

  await evaluate("location.hash='#does-not-exist'");
  await waitFor("location.hash==='#opening' && !document.querySelector('#opening').hidden", 'unknown hash fallback');
  report.history.unknown = await layoutSnapshot();
  if (report.history.unknown.visible !== 'opening') failures.push('unknown-hash');

  await openRoute('opening');
  const forward = ['opening'];
  for (let index = 1; index < routes.length; index += 1) {
    await evaluate("document.querySelector('#nextChapter').click()");
    await waitFor("location.hash==='#" + routes[index] + "'", 'next ' + routes[index]);
    forward.push(await evaluate("document.querySelector('.chapter:not([hidden])').id"));
  }
  const backward = ['closing'];
  for (let index = routes.length - 2; index >= 0; index -= 1) {
    await evaluate("document.querySelector('#previousChapter').click()");
    await waitFor("location.hash==='#" + routes[index] + "'", 'previous ' + routes[index]);
    backward.push(await evaluate("document.querySelector('.chapter:not([hidden])').id"));
  }
  report.pagination = {forward,backward};
  if (forward.join() !== routes.join() || backward.join() !== [...routes].reverse().join()) failures.push('pagination');

  await openRoute('opening');
  await evaluate("document.querySelector('#opening [data-go=pathways]').click()");
  await waitFor("location.hash==='#pathways'", 'opening pathways CTA');
  report.interactions.openingPathways = await evaluate('location.hash');
  await openRoute('opening');
  await evaluate("document.querySelector('#opening [data-go=teacher]').click()");
  await waitFor("location.hash==='#teacher'", 'opening teacher CTA');
  report.interactions.openingTeacher = await evaluate('location.hash');
  await openRoute('profiles');
  report.interactions.profiles = await evaluate("(() => { const filter=document.querySelector('[data-filter=계획]'); filter.value='상'; filter.dispatchEvent(new Event('input',{bubbles:true})); const filtered=document.querySelectorAll('[data-profile-id]').length; document.querySelector('[data-profile-id]').click(); const opened=document.querySelector('#profileDialog').open; document.querySelector('#closeProfileDialog').click(); document.querySelector('#resetFilters').click(); return {filtered,opened,closed:!document.querySelector('#profileDialog').open,reset:document.querySelectorAll('[data-profile-id]').length===5}; })()");
  await openRoute('dashboard');
  report.interactions.dashboard = await evaluate("(() => { const before=document.querySelector('#dashboardDetail').textContent; const button=document.querySelector('[data-dashboard=priority]'); button.click(); return {changed:document.querySelector('#dashboardDetail').textContent!==before,pressed:button.getAttribute('aria-pressed')==='true'}; })()");
  report.interactions.language = await evaluate("(() => { const select=document.querySelector('.reader-language [data-language-select]'); select.value='km'; select.dispatchEvent(new Event('change',{bubbles:true})); const pending=!document.querySelector('#translationNotice').hidden; const synced=[...document.querySelectorAll('[data-language-select]')].every(item=>item.value==='km'); select.value='ko'; select.dispatchEvent(new Event('change',{bubbles:true})); return {pending,synced,restored:document.querySelector('#translationNotice').hidden}; })()");
  if (report.interactions.openingPathways !== '#pathways' || report.interactions.openingTeacher !== '#teacher' || !report.interactions.profiles.opened || !report.interactions.profiles.closed || !report.interactions.profiles.reset || !report.interactions.dashboard.changed || !report.interactions.dashboard.pressed || !report.interactions.language.pending || !report.interactions.language.synced || !report.interactions.language.restored) failures.push('interactions');

  await openRoute('pathways');
  const currentHash = await evaluate('location.hash');
  const resultLinks = await evaluate("[...document.querySelectorAll('#pathways [data-report-link]')].map(a=>({type:a.dataset.reportLink,href:a.href,target:a.target,rel:a.rel}))");
  for (const type of ['kpass','teen','adult']) {
    await evaluate("document.querySelector('#pathways [data-report-link=" + type + "]').click()", true);
    await new Promise(resolveWait => setTimeout(resolveWait, 350));
  }
  const pages = await fetch('http://127.0.0.1:' + debugPort + '/json/list').then(response => response.json());
  report.external = {
    links:resultLinks,
    hashBefore:currentHash,
    hashAfter:await evaluate('location.hash'),
    opened:pages.filter(item=>item.type==='page'&&item.id!==page.id).map(item=>item.url)
  };
  if (report.external.hashAfter !== currentHash || resultLinks.length !== 3 || resultLinks.some(link=>link.target!=='_blank'||!link.rel.includes('noopener')||!link.rel.includes('noreferrer')||!link.href.includes('?lang=ko')) || report.external.opened.length < 3) failures.push('external-links');

  for (const viewport of viewports) {
    await setViewport(viewport);
    const chapterResults = {};
    for (const route of routes) {
      await evaluate("location.hash='#" + route + "'");
      await waitFor("location.hash==='#" + route + "' && !document.querySelector('#" + route + "').hidden", viewport.name + ' ' + route);
      chapterResults[route] = await layoutSnapshot();
    }
    await evaluate("location.hash='#opening'");
    await waitFor("!document.querySelector('#opening').hidden", viewport.name + ' opening screenshot');
    if (viewport.width === 1440) {
      await screenshot('qa-after-desktop-1440x900.png');
      await screenshot('desktop-1440.png');
      await screenshot('desktop-1440-top.png');
    }
    if (viewport.width === 360) {
      await screenshot('qa-after-mobile-360x800.png');
      await screenshot('mobile-360.png');
      await screenshot('mobile-360-top.png');
    }

    const summary = {
      chapters:chapterResults,
      overflow:Object.values(chapterResults).some(item=>item.documentOverflow||item.readerOverflow),
      clipped:Object.values(chapterResults).reduce((sum,item)=>sum+item.clipped,0),
      multiple:Object.values(chapterResults).some(item=>item.visibleCount!==1),
      activeMismatch:Object.values(chapterResults).some((item,index)=>item.active!==routes[index])
    };
    if (viewport.width <= 1100) {
      await evaluate("document.querySelector('#tocToggle').click()");
      summary.drawerOpen = await evaluate("document.querySelector('#tocPanel').classList.contains('open') && !document.querySelector('#tocOverlay').hidden");
      await evaluate("document.querySelector('[data-chapter-link=assessment]').click()");
      await waitFor("location.hash==='#assessment' && !document.querySelector('#tocPanel').classList.contains('open')", viewport.name + ' drawer close');
      summary.drawerClose = await evaluate("document.querySelector('#tocOverlay').hidden && getComputedStyle(document.querySelector('#tocOverlay')).display==='none'");
    }
    report.viewports[viewport.name] = summary;
    if (summary.overflow || summary.clipped || summary.multiple || summary.activeMismatch || (viewport.width<=1100 && (!summary.drawerOpen||!summary.drawerClose))) failures.push('viewport-' + viewport.name);
  }

  for (const zoom of zoomWidths) {
    await setViewport({width:zoom.width,height:900,mobile:zoom.width<1100});
    await openRoute('opening');
    const metrics = await evaluate("(() => { const text=document.querySelector('.opening-copy').getBoundingClientRect(); const art=document.querySelector('.cognitive-art').getBoundingClientRect(); const title=document.querySelector('#opening h2').getBoundingClientRect(); const hero=document.querySelector('#opening').getBoundingClientRect(); const nodes=[...document.querySelectorAll('.cognitive-art .pass-node')].map(n=>({name:n.className,rect:n.getBoundingClientRect()})); const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top; const nodeOverlap=nodes.flatMap((a,i)=>nodes.slice(i+1).filter(b=>intersects(a.rect,b.rect)).map(b=>a.name+' / '+b.name)); return {overflow:document.documentElement.scrollWidth>innerWidth,textArtOverlap:intersects(text,art),titleOutside:title.left<hero.left||title.right>hero.right||title.top<hero.top||title.bottom>hero.bottom,nodeOverlap,logoRatio:+(document.querySelector('.toc-head img').naturalWidth/document.querySelector('.toc-head img').naturalHeight).toFixed(3)}; })()");
    report.zoom[zoom.name] = metrics;
    if (metrics.overflow || metrics.textArtOverlap || metrics.titleOutside || metrics.nodeOverlap.length) failures.push('zoom-' + zoom.name);
  }

  await command('Emulation.setEmulatedMedia', {media:'print'});
  report.print = await evaluate("({visible:[...document.querySelectorAll('.chapter')].filter(chapter=>getComputedStyle(chapter).display!=='none').length,sidebar:getComputedStyle(document.querySelector('#tocPanel')).display,pagination:getComputedStyle(document.querySelector('.chapter-pagination')).display})");
  if (report.print.visible !== 15 || report.print.sidebar !== 'none' || report.print.pagination !== 'none') failures.push('print');

  report.console = {exceptions,errors:consoleErrors};
  if (exceptions.length || consoleErrors.length) failures.push('console');
  report.status = failures.length ? 'FAIL: ' + [...new Set(failures)].join(', ') : 'PASS';
  console.log(JSON.stringify(report, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  if (socket) socket.close();
  browser.kill();
  server.close();
  await rm(profileDirectory, {recursive:true,force:true}).catch(() => {});
}
