import {createServer} from 'node:http';
import {readFile, mkdir, writeFile, rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {extname, resolve, sep} from 'node:path';
import {tmpdir} from 'node:os';

const root = resolve(import.meta.dirname, '..', '..');
const guideDirectory = resolve(root, 'teacher-guide');
const outputDirectory = resolve(guideDirectory, 'screenshots');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sitePort = 4187;
const debugPort = 9348;
const viewports = [
  {name:'데스크톱 1440×900',width:1440,height:900,mobile:false},
  {name:'노트북 1024×768',width:1024,height:768,mobile:false},
  {name:'태블릿 768×1024',width:768,height:1024,mobile:true},
  {name:'모바일 390×844',width:390,height:844,mobile:true}
];
const profileCases = [
  {levels:['H','H','H','H'],code:'P-H / A-H / S-H / Q-H'},
  {levels:['M','M','M','M'],code:'P-M / A-M / S-M / Q-M'},
  {levels:['L','L','L','L'],code:'P-L / A-L / S-L / Q-L'},
  {levels:['H','M','H','L'],code:'P-H / A-M / S-H / Q-L'},
  {levels:['L','H','M','H'],code:'P-L / A-H / S-M / Q-H'},
  {levels:['H','L','L','M'],code:'P-H / A-L / S-L / Q-M'},
  {levels:['M','H','L','M'],code:'P-M / A-H / S-L / Q-M'},
  {levels:['L','M','H','L'],code:'P-L / A-M / S-H / Q-L'}
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

const browserProfile = resolve(tmpdir(), 'teacher-guide-qa-' + process.pid);
const browser = spawn(edgePath, [
  '--headless=new','--disable-gpu','--no-sandbox','--disable-crash-reporter','--disable-features=NetworkServiceSandbox','--no-first-run','--no-default-browser-check',
  '--remote-debugging-port=' + debugPort,'--user-data-dir=' + browserProfile,
  '--window-size=1440,900','about:blank'
], {stdio:'ignore'});

async function waitForDebugger() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch('http://127.0.0.1:' + debugPort + '/json/version')).ok) return; } catch {}
    await new Promise(resolveWait => setTimeout(resolveWait, 100));
  }
  throw new Error('Edge debugging endpoint did not start');
}

let socket;
let commandId = 0;
const pending = new Map();
const exceptions = [];
const consoleErrors = [];
const networkRequests = [];

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
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(expression)) return;
    await new Promise(resolveWait => setTimeout(resolveWait, 80));
  }
  throw new Error('Timed out: ' + description);
}

async function setViewport(viewport) {
  await command('Emulation.setDeviceMetricsOverride', {
    width:viewport.width,height:viewport.height,deviceScaleFactor:1,mobile:viewport.mobile,
    screenWidth:viewport.width,screenHeight:viewport.height
  });
  await new Promise(resolveWait => setTimeout(resolveWait, 100));
}

async function screenshot(name) {
  const message = await command('Page.captureScreenshot', {format:'png',captureBeyondViewport:false,fromSurface:true});
  await mkdir(outputDirectory, {recursive:true});
  await writeFile(resolve(outputDirectory, name), Buffer.from(message.result.data, 'base64'));
}

async function navigate(url, expectedRoute) {
  await command('Page.navigate', {url});
  await waitFor("document.readyState==='complete' && document.querySelector('#chapterContent')?.dataset.route==='" + expectedRoute + "'", expectedRoute);
}

async function openHttpRoute(route) {
  await navigate('http://127.0.0.1:' + sitePort + '/teacher-guide/#' + route, route);
}

async function layoutSnapshot() {
  return evaluate(`(() => {
    const content=document.querySelector('#chapterContent');
    const reader=document.querySelector('#reader');
    const visibleControls=[...content.querySelectorAll('button,a,select,input')].filter(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0});
    const clipped=[...content.querySelectorAll('h2,h3,p,button,a,code,dt,dd')].filter(el=>el.scrollWidth>el.clientWidth+2 && getComputedStyle(el).overflowX!=='auto');
    return {
      route:content.dataset.route,
      active:document.querySelector('#tocNav [data-route][aria-current=page]')?.dataset.route||'',
      expanded:[...document.querySelectorAll('.toc-group-button[aria-expanded=true]')].map(el=>el.dataset.groupRoute),
      overflow:document.documentElement.scrollWidth>innerWidth||reader.scrollWidth>reader.clientWidth+1,
      clipped:clipped.map(el=>({tag:el.tagName,text:el.textContent.trim().slice(0,45),client:el.clientWidth,scroll:el.scrollWidth})),
      smallTouchTargets:innerWidth<=820?visibleControls.filter(el=>{const r=el.getBoundingClientRect();return r.width<40||r.height<40}).length:0
    };
  })()`);
}

const report = {static:{},routes:{},history:{},pagination:{},profiles:{},external:{},viewports:{},fileProtocol:{},console:{},status:'PASS'};
const failures = [];

try {
  await waitForDebugger();
  const page = await fetch('http://127.0.0.1:' + debugPort + '/json/new?' + encodeURIComponent('http://127.0.0.1:' + sitePort + '/teacher-guide/#assessment'), {method:'PUT'}).then(response => response.json());
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
    if (message.method === 'Network.requestWillBeSent') networkRequests.push(message.params.request.url);
  };
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Network.enable');
  await setViewport(viewports[0]);
  await waitFor("document.querySelectorAll('.toc-group').length===5 && document.querySelectorAll('[data-language-select] option').length===26", 'initial data');

  const routes = await evaluate("[...document.querySelectorAll('#tocNav [data-route]')].map(link=>link.dataset.route)");
  report.static = await evaluate(`(() => {
    const routes=[...document.querySelectorAll('#tocNav [data-route]')].map(link=>link.dataset.route);
    return {
      topLevel:document.querySelectorAll('.toc-group').length,
      routeCount:routes.length,
      uniqueRoutes:new Set(routes).size,
      visibleSubnav:document.querySelectorAll('.toc-subnav:not([hidden])').length,
      profileCount:window.FEELGOOD_PROFILE_DATA?.profiles?.length||0,
      scripts:[...document.scripts].map(script=>script.src.split('/').pop())
    };
  })()`);
  if (report.static.topLevel!==5 || report.static.routeCount!==48 || report.static.uniqueRoutes!==48 || report.static.visibleSubnav!==1 || report.static.profileCount!==81) failures.push('static-structure');

  for (const route of routes) {
    await evaluate("location.hash='#" + route + "'");
    await waitFor("document.querySelector('#chapterContent').dataset.route==='" + route + "'", 'route ' + route);
    const snapshot = await layoutSnapshot();
    report.routes[route] = {active:snapshot.active,expanded:snapshot.expanded};
    if (snapshot.active!==route || snapshot.expanded.length!==1) failures.push('route-' + route);
  }

  await openHttpRoute('school-dashboard');
  await evaluate("document.querySelector('[data-route=assessment-profiles]').click()");
  await waitFor("location.hash==='#assessment-profiles'", 'history second route');
  await evaluate('history.back()');
  await waitFor("location.hash==='#school-dashboard' && document.querySelector('#chapterContent').dataset.route==='school-dashboard'", 'history back');
  report.history.back = await evaluate("document.querySelector('#chapterContent').dataset.route");
  await evaluate('history.forward()');
  await waitFor("location.hash==='#assessment-profiles' && document.querySelector('#chapterContent').dataset.route==='assessment-profiles'", 'history forward');
  report.history.forward = await evaluate("document.querySelector('#chapterContent').dataset.route");
  if (report.history.back!=='school-dashboard' || report.history.forward!=='assessment-profiles') failures.push('history');

  await openHttpRoute(routes[0]);
  const forward = [routes[0]];
  for (let index=1; index<routes.length; index+=1) {
    await evaluate("document.querySelector('#nextChapter').click()");
    await waitFor("location.hash==='#" + routes[index] + "'", 'next ' + routes[index]);
    forward.push(await evaluate("document.querySelector('#chapterContent').dataset.route"));
  }
  const backward = [routes.at(-1)];
  for (let index=routes.length-2; index>=0; index-=1) {
    await evaluate("document.querySelector('#previousChapter').click()");
    await waitFor("location.hash==='#" + routes[index] + "'", 'previous ' + routes[index]);
    backward.push(await evaluate("document.querySelector('#chapterContent').dataset.route"));
  }
  report.pagination = {forward:forward.length,backward:backward.length};
  if (forward.join()!==routes.join() || backward.join()!==[...routes].reverse().join()) failures.push('pagination');

  await openHttpRoute('assessment-profiles');
  report.profiles.defaultCode = await evaluate("document.querySelector('.profile-result-head code').textContent");
  for (const item of profileCases) {
    const result = await evaluate(`(() => {
      const values=${JSON.stringify(item.levels)};
      ['planning','attention','simultaneous','successive'].forEach((name,index)=>{document.querySelector('[name='+name+']').value=values[index]});
      document.querySelector('#profileForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
      return {code:document.querySelector('.profile-result-head code').textContent,sections:document.querySelectorAll('.profile-result-grid article').length,text:document.querySelector('#profileResult').textContent};
    })()`);
    report.profiles[item.code] = {code:result.code,sections:result.sections};
    if (result.code!==item.code || result.sections!==8 || !result.text.includes('해석 시 주의사항')) failures.push('profile-' + item.code);
    if (item.code==='P-L / A-L / S-L / Q-L' && !result.text.includes('전문기관의 종합적인 평가와 지원')) failures.push('profile-all-low-guidance');
  }
  const enterCheck = await evaluate(`(() => {
    const values=['H','L','M','H'];
    const selects=[...document.querySelectorAll('#profileForm select')];
    selects.forEach((select,index)=>{select.value=values[index];select.dispatchEvent(new Event('change',{bubbles:true}));});
    selects.at(-1).dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    return document.querySelector('.profile-result-head code').textContent;
  })()`);
  report.profiles.enterSubmit = enterCheck;
  if (enterCheck!=='P-H / A-L / S-M / Q-H') failures.push('profile-enter-submit');
  const staleCheck = await evaluate(`(() => {
    const selects=[...document.querySelectorAll('#profileForm select')];
    const before=document.querySelector('.profile-result-head code').textContent;
    selects[0].value='H';selects[0].dispatchEvent(new Event('change',{bubbles:true}));
    const unchanged=document.querySelector('.profile-result-head code').textContent===before;
    document.querySelector('#resetProfile').click();
    return {unchanged,reset:document.querySelector('.profile-result-head code').textContent};
  })()`);
  report.profiles.staleAndReset = staleCheck;
  if (!staleCheck.unchanged || staleCheck.reset!=='P-M / A-M / S-M / Q-M') failures.push('profile-apply-reset');

  await openHttpRoute('assessment-reports');
  const reportLinks = await evaluate("[...document.querySelectorAll('[data-report-link]')].map(a=>({href:a.href,target:a.target,rel:a.rel}))");
  const reportHash = await evaluate('location.hash');
  await evaluate("document.querySelector('[data-report-link=kpass]').click()", true);
  await new Promise(resolveWait=>setTimeout(resolveWait,300));
  const hashAfterReport = await evaluate('location.hash');
  await openHttpRoute('school-dashboard');
  const dashboardLink = await evaluate("(() => {const a=document.querySelector('.external-dashboard-link');return {href:a.href,target:a.target,rel:a.rel}})()");
  const dashboardHash = await evaluate('location.hash');
  await evaluate("document.querySelector('.external-dashboard-link').click()", true);
  await new Promise(resolveWait=>setTimeout(resolveWait,300));
  const hashAfterDashboard = await evaluate('location.hash');
  report.external = {reportLinks,reportHash,hashAfterReport,dashboardLink,dashboardHash,hashAfterDashboard};
  if (reportLinks.length!==3 || reportLinks.some(link=>link.target!=='_blank'||!link.rel.includes('noopener')||!link.rel.includes('noreferrer')) || reportHash!==hashAfterReport || dashboardLink.target!=='_blank' || !dashboardLink.rel.includes('noopener') || dashboardHash!==hashAfterDashboard) failures.push('external-links');

  const responsiveRoutes = ['assessment','assessment-profiles','school-dashboard','school-strengths','business','military-police','nuvia','nuvia-dashboard'];
  for (const viewport of viewports) {
    await setViewport(viewport);
    const results = {};
    for (const route of responsiveRoutes) {
      await openHttpRoute(route);
      results[route] = await layoutSnapshot();
    }
    const summary = {
      overflow:Object.values(results).some(item=>item.overflow),
      clipped:Object.values(results).reduce((count,item)=>count+item.clipped.length,0),
      smallTouchTargets:Object.values(results).reduce((count,item)=>count+item.smallTouchTargets,0)
    };
    if (viewport.width<=1100) {
      await openHttpRoute('assessment');
      await evaluate("document.querySelector('#tocToggle').click()");
      summary.drawerOpen = await evaluate("document.querySelector('#tocPanel').classList.contains('open') && !document.querySelector('#tocOverlay').hidden");
      await evaluate("document.querySelector('[data-route=school-dashboard]').click()");
      await waitFor("location.hash==='#school-dashboard' && !document.querySelector('#tocPanel').classList.contains('open')", 'drawer close ' + viewport.name);
      summary.drawerClose = await evaluate("document.querySelector('#tocOverlay').hidden");
    }
    report.viewports[viewport.name] = summary;
    if (summary.overflow || summary.clipped || summary.smallTouchTargets || (viewport.width<=1100 && (!summary.drawerOpen||!summary.drawerClose))) failures.push('viewport-' + viewport.name);
    if (viewport.width===1440) { await openHttpRoute('school-dashboard'); await screenshot('qa-after-desktop-1440x900.png'); }
    if (viewport.width===390) { await openHttpRoute('assessment-profiles'); await screenshot('qa-after-mobile-390x844.png'); }
  }

  const fileUrl = 'file:///' + resolve(guideDirectory, 'index.html').replaceAll('\\','/') + '#assessment-profiles';
  const networkBeforeFile = networkRequests.length;
  await navigate(fileUrl, 'assessment-profiles');
  const fileResult = await evaluate(`(() => {
    const values=['L','L','L','L'];
    ['planning','attention','simultaneous','successive'].forEach((name,index)=>{document.querySelector('[name='+name+']').value=values[index]});
    document.querySelector('#profileForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    return {protocol:location.protocol,code:document.querySelector('.profile-result-head code').textContent,count:window.FEELGOOD_PROFILE_DATA?.profiles?.length||0,text:document.querySelector('#profileResult').textContent,languageOptions:document.querySelectorAll('[data-language-select] option').length};
  })()`);
  const fileRequests = networkRequests.slice(networkBeforeFile);
  report.fileProtocol = {...fileResult,externalRequests:fileRequests.filter(url=>/^https?:/i.test(url))};
  if (fileResult.protocol!=='file:' || fileResult.code!=='P-L / A-L / S-L / Q-L' || fileResult.count!==81 || fileResult.languageOptions!==26 || !fileResult.text.includes('전문기관의 종합적인 평가와 지원') || report.fileProtocol.externalRequests.length) failures.push('file-protocol');

  report.console = {exceptions,errors:consoleErrors};
  if (exceptions.length || consoleErrors.length) failures.push('console');
  report.status = failures.length ? 'FAIL: ' + [...new Set(failures)].join(', ') : 'PASS';
  console.log(JSON.stringify(report, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  if (socket) socket.close();
  browser.kill();
  server.close();
  await rm(browserProfile, {recursive:true,force:true}).catch(() => {});
}
