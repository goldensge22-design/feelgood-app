import {createServer} from 'node:http';
import {readFile, mkdir, writeFile, rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {extname, resolve, sep} from 'node:path';
import {tmpdir} from 'node:os';

const root = resolve(import.meta.dirname, '..', '..');
const outputDirectory = process.env.TEACHER_GUIDE_SCREENSHOT_DIR || resolve(root, 'teacher-guide', 'screenshots');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sitePort = 4187;
const debugPort = 9348;
const routes = ['opening','guide','assessment','assessment-expertise','pass','pathways','results','profiles','teacher','dashboard','nuvia','parents','support','closing'];
const viewports = [
  {name:'PC 1440×900',width:1440,height:900,mobile:false},
  {name:'노트북 1280×720',width:1280,height:720,mobile:false},
  {name:'소형 데스크톱 1024×768',width:1024,height:768,mobile:false},
  {name:'태블릿 768×1024',width:768,height:1024,mobile:true},
  {name:'대형 모바일 430×932',width:430,height:932,mobile:true},
  {name:'모바일 390×844',width:390,height:844,mobile:true},
  {name:'소형 모바일 360×800',width:360,height:800,mobile:true}
];
const zoomWidths = [
  {name:'100%',width:1440},
  {name:'125%',width:1152},
  {name:'150%',width:960},
  {name:'200%',width:720}
];
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png'};
const localeRoot = resolve(root, 'teacher-guide', 'locales');
const localeManifest = JSON.parse(await readFile(resolve(localeRoot, 'languages.json'), 'utf8'));
const translationNoticeSource = 'AI 자동 번역 초안입니다. 의미와 교육·심리 용어는 한국어 승인본을 기준으로 확인해 주세요.';
const localePacks = await Promise.all(localeManifest.filter(language => language.code !== 'ko').map(async language => JSON.parse(await readFile(resolve(localeRoot, language.file), 'utf8'))));
const forbiddenUserPhrases = [...new Set([
  translationNoticeSource,
  'AI-generated translation',
  'Machine-translated draft',
  '번역 검수가 필요합니다.',
  '한국어 승인본을 기준으로 확인해 주세요.',
  '번역 상태',
  '개발 중',
  'QA용 안내',
  '디버그 상태',
  '내부 검수용 문구',
  ...localePacks.flatMap(pack => [pack.disclaimer, pack.messages?.[translationNoticeSource]])
].filter(Boolean))];

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
  const search = socket ? await evaluate('location.search') : '';
  const url = 'http://127.0.0.1:' + sitePort + '/teacher-guide/' + search + '#' + route;
  await command('Page.navigate', {url});
  await waitFor("document.readyState === 'complete' && location.hash === '#" + route + "' && document.querySelectorAll('.chapter:not([hidden])').length === 1", 'route ' + route);
}

async function layoutSnapshot() {
  return evaluate("(() => { const visible=document.querySelector('.chapter:not([hidden])'); const reader=document.querySelector('#reader'); const readerRect=reader.getBoundingClientRect(); const controls=[...visible.querySelectorAll('button,a,select,input')].filter(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}); const clippedElements=[...visible.querySelectorAll('h1,h2,h3,p,span,strong,button,a')].filter(el=>el.scrollWidth>el.clientWidth+2); const outOfReader=[...reader.querySelectorAll('*')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.left<readerRect.left-1||r.right>readerRect.right+1)}).slice(0,8).map(el=>({tag:el.tagName.toLowerCase(),className:el.className,text:el.textContent.trim().slice(0,40),left:Math.round(el.getBoundingClientRect().left),right:Math.round(el.getBoundingClientRect().right)})); return {visible:visible.id,visibleCount:document.querySelectorAll('.chapter:not([hidden])').length,active:document.querySelector('[data-chapter-link][aria-current=page]')?.dataset.chapterLink||'',documentOverflow:document.documentElement.scrollWidth>innerWidth,readerOverflow:reader.scrollWidth>reader.clientWidth+1,readerWidths:[reader.clientWidth,reader.scrollWidth],outOfReader,clipped:clippedElements.length,clippedItems:clippedElements.map(el=>({tag:el.tagName.toLowerCase(),className:el.className,text:el.textContent.trim().slice(0,40),clientWidth:el.clientWidth,scrollWidth:el.scrollWidth})),smallTargets:controls.filter(el=>{const r=el.getBoundingClientRect();return r.width<40||r.height<40}).length}; })()");
}

async function chapterIntegrityMatrix(routeIds = routes) {
  return evaluate(`(() => {
    const routeIds=${JSON.stringify(routeIds)};
    const visible=element=>{const style=getComputedStyle(element),rect=element.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0;};
    const describe=element=>({tag:element.tagName.toLowerCase(),className:String(element.className||''),text:element.textContent.trim().slice(0,90)});
    const intersects=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2;
    const output={};
    for(const id of routeIds){
      renderChapter(id,false);
      const root=document.getElementById(id);
      const reader=document.getElementById('reader');
      const readerRect=reader.getBoundingClientRect();
      const textElements=[...root.querySelectorAll('h1,h2,h3,h4,p,li,a,button,label,span,strong,small,dt,dd,summary,.pass-node')].filter(visible);
      const clipped=textElements.filter(element=>{const style=getComputedStyle(element);const verticalConcealed=['hidden','clip'].includes(style.overflowY)||style.webkitLineClamp&&style.webkitLineClamp!=='none';return element.clientWidth>0&&element.clientHeight>0&&(element.scrollWidth>element.clientWidth+3||verticalConcealed&&element.scrollHeight>element.clientHeight+3);}).map(describe);
      const hiddenContent=textElements.filter(element=>{const style=getComputedStyle(element);const lineClamp=style.webkitLineClamp&&style.webkitLineClamp!=='none';const concealed=['hidden','clip'].includes(style.overflowX)||['hidden','clip'].includes(style.overflowY)||style.textOverflow==='ellipsis'||lineClamp;return concealed&&(element.scrollWidth>element.clientWidth+2||element.scrollHeight>element.clientHeight+2);}).map(describe);
      const outsideViewport=textElements.filter(element=>{const rect=element.getBoundingClientRect();return rect.left<readerRect.left-2||rect.right>readerRect.right+2;}).map(describe);
      const boundarySelector='.chapter-opening,.chapter-closing,.pass-node,article,.button,.card-actions a,.result-guide-head,.profile-controls,.plain-profile-card,.profile-analysis-head';
      const escaped=textElements.filter(element=>{const boundary=element.parentElement?.closest(boundarySelector);if(!boundary||!visible(boundary))return false;const rect=element.getBoundingClientRect(),box=boundary.getBoundingClientRect();return rect.left<box.left-2||rect.right>box.right+2;}).map(describe);
      const boxes=[...root.querySelectorAll('.pass-node,.info-grid>article,.report-grid>article,.pass-grid>article,.teacher-cards>article,.dashboard-grid>article,.nuvia-grid>article,.help-grid>article,.level-grid>article,.profile-analysis-grid>article')].filter(visible);
      const overlaps=[];
      boxes.forEach((first,index)=>boxes.slice(index+1).forEach(second=>{if(first.parentElement===second.parentElement&&intersects(first.getBoundingClientRect(),second.getBoundingClientRect()))overlaps.push(describe(first).text+' / '+describe(second).text);}));
      if(id==='opening'){
        const copy=root.querySelector('.opening-copy'),art=root.querySelector('.cognitive-art');
        if(visible(copy)&&visible(art)&&intersects(copy.getBoundingClientRect(),art.getBoundingClientRect()))overlaps.push('opening-copy / cognitive-art');
      }
      const emptyBoxes=boxes.filter(element=>!element.textContent.trim()).map(describe);
      const buttons=[...root.querySelectorAll('button,a.button,.card-actions a,.open-report,.back-button')].filter(visible);
      const clippedButtons=buttons.filter(element=>element.scrollWidth>element.clientWidth+3||element.scrollHeight>element.clientHeight+3).map(describe);
      output[id]={
        horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1||reader.scrollWidth>reader.clientWidth+1,
        clipped,hiddenContent,outsideViewport,escaped,overlaps,emptyBoxes,clippedButtons
      };
    }
    return output;
  })()`);
}

function summarizeIntegrity(matrix) {
  const chapters = Object.values(matrix);
  const sum = key => chapters.reduce((total, chapter) => total + chapter[key].length, 0);
  const escapedExamples = Object.entries(matrix).flatMap(([route, chapter]) => chapter.escaped.map(item => ({route, ...item}))).slice(0, 5);
  return {
    horizontalOverflow:chapters.filter(chapter => chapter.horizontalOverflow).length,
    clipped:sum('clipped'),hiddenContent:sum('hiddenContent'),outsideViewport:sum('outsideViewport'),
    escaped:sum('escaped'),overlaps:sum('overlaps'),emptyBoxes:sum('emptyBoxes'),clippedButtons:sum('clippedButtons'),
    ...(escapedExamples.length ? {escapedExamples} : {})
  };
}

function integrityPass(summary) {
  return Object.entries(summary).filter(([key]) => key !== 'escapedExamples').every(([, value]) => value === 0);
}

const report = {static:{},routes:{},history:{},pagination:{},interactions:{},external:{},viewports:{},internationalViewports:{},multilingualLayout:{},multilingualZoom:{},zoom:{},print:{},printLayouts:{},console:{},status:'PASS'};
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
  await waitFor("document.querySelector('#profileAnalysis .profile-code')?.textContent==='P-M / A-M / S-M / Q-M' && document.querySelector('#teacherProfileAnalysis .profile-code')?.textContent==='P-M / A-M / S-M / Q-M' && document.querySelector('#parentProfileAnalysis .profile-code')?.textContent==='P-M / A-M / S-M / Q-M' && document.querySelectorAll('[data-language-select] option').length===13", 'profile engines and language data');

  report.static = await evaluate("(() => { const ids=[...document.querySelectorAll('[id]')].map(el=>el.id); const duplicates=ids.filter((id,index)=>ids.indexOf(id)!==index); const empty=[...document.querySelectorAll('a')].filter(a=>!a.getAttribute('href')||a.getAttribute('href')==='#').length; const broken=[...document.querySelectorAll('a[href^=\"#\"]')].filter(a=>!document.querySelector(a.getAttribute('href'))).map(a=>a.getAttribute('href')); const css=[...document.styleSheets].map(sheet=>new URL(sheet.href).pathname.split('/').pop()); const internalStatusDom=document.querySelectorAll('#translationNotice,.translation-notice,.reader-notice,[data-status],[data-build-id],[data-qa-status]').length; return {chapters:document.querySelectorAll('.chapter').length,toc:document.querySelectorAll('[data-chapter-link]').length,duplicates:[...new Set(duplicates)],emptyHref:empty,brokenInternal:broken,stylesheets:css,internalStatusDom}; })()");
  if (report.static.chapters !== 14 || report.static.toc !== 14 || report.static.duplicates.length || report.static.emptyHref || report.static.brokenInternal.length || report.static.stylesheets.join() !== 'ebook.css' || report.static.internalStatusDom) failures.push('static-integrity');

  for (const route of routes) {
    await openRoute(route);
    const snapshot = await layoutSnapshot();
    report.routes[route] = snapshot;
    if (snapshot.visible !== route || snapshot.visibleCount !== 1 || snapshot.active !== route) failures.push('route-' + route);
  }

  await command('Page.reload', {ignoreCache:true});
  await waitFor("location.hash==='#closing' && !document.querySelector('#closing').hidden && document.querySelectorAll('.chapter:not([hidden])').length===1 && document.querySelector('[data-chapter-link=closing]').getAttribute('aria-current')==='page'", 'reload hash');
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
  const profileCombinations = [
    ['H','H','H','H'],['M','M','M','M'],['L','L','L','L'],
    ['H','H','H','L'],['H','H','L','H'],['L','H','H','H'],['H','L','H','H'],
    ['H','L','H','L'],['L','H','L','H']
  ];
  report.interactions.profiles = [];
  for (const combination of profileCombinations) {
    const expectedCode = ['P','A','S','Q'].map((axis,index) => axis + '-' + combination[index]).join(' / ');
    const result = await evaluate(`(() => {
      const ids=['profilePlan','profileAttention','profileSimultaneous','profileSuccessive'];
      ids.forEach((id,index)=>document.getElementById(id).value=${JSON.stringify(combination)}[index]);
      document.querySelector('#profileForm').requestSubmit();
      return {
        code:document.querySelector('#profileAnalysis .profile-code').textContent,
        sections:document.querySelectorAll('#profileAnalysis .profile-analysis-grid article').length,
        caution:document.querySelector('#profileAnalysis .profile-caution').textContent.length>80,
        privacyNotice:document.querySelector('.rule-notice').textContent.includes('검사정보를 외부로 전송하지 않습니다')
      };
    })()`);
    report.interactions.profiles.push({...result,expectedCode});
  }
  await evaluate("document.querySelector('#resetProfile').click()");
  report.interactions.profileReset = await evaluate("document.querySelector('#profileAnalysis .profile-code').textContent==='P-M / A-M / S-M / Q-M' && ['profilePlan','profileAttention','profileSimultaneous','profileSuccessive'].every(id=>document.getElementById(id).value==='M')");
  await openRoute('teacher');
  report.interactions.teacherProfile = await evaluate(`(() => {
    const ids=['teacherPlan','teacherAttention','teacherSimultaneous','teacherSuccessive'];
    const values=['H','L','H','L'];
    const before=document.querySelector('#teacherProfileAnalysis .profile-code').textContent;
    ids.forEach((id,index)=>document.getElementById(id).value=values[index]);
    const unchanged=document.querySelector('#teacherProfileAnalysis .profile-code').textContent===before;
    document.querySelector('#teacherProfileForm').requestSubmit();
    const applied=document.querySelector('#teacherProfileAnalysis .profile-code').textContent==='P-H / A-L / S-H / Q-L';
    const sections=document.querySelectorAll('#teacherProfileAnalysis .support-analysis-grid article').length;
    document.querySelector('#resetTeacherProfile').click();
    const reset=document.querySelector('#teacherProfileAnalysis .profile-code').textContent==='P-M / A-M / S-M / Q-M' && ids.every(id=>document.getElementById(id).value==='M');
    return {unchanged,applied,sections,reset};
  })()`);
  await openRoute('parents');
  report.interactions.parentProfile = await evaluate(`(() => {
    const ids=['parentPlan','parentAttention','parentSimultaneous','parentSuccessive'];
    const values=['L','H','L','H'];
    const before=document.querySelector('#parentProfileAnalysis .profile-code').textContent;
    ids.forEach((id,index)=>document.getElementById(id).value=values[index]);
    const unchanged=document.querySelector('#parentProfileAnalysis .profile-code').textContent===before;
    document.querySelector('#parentProfileForm').requestSubmit();
    const applied=document.querySelector('#parentProfileAnalysis .profile-code').textContent==='P-L / A-H / S-L / Q-H';
    const sections=document.querySelectorAll('#parentProfileAnalysis .support-analysis-grid article').length;
    document.querySelector('#resetParentProfile').click();
    const reset=document.querySelector('#parentProfileAnalysis .profile-code').textContent==='P-M / A-M / S-M / Q-M' && ids.every(id=>document.getElementById(id).value==='M');
    return {unchanged,applied,sections,reset};
  })()`);
  await openRoute('dashboard');
  report.interactions.dashboard = await evaluate("(() => { const before=document.querySelector('#dashboardDetail').textContent; const button=document.querySelector('[data-dashboard=priority]'); button.click(); return {changed:document.querySelector('#dashboardDetail').textContent!==before,pressed:button.getAttribute('aria-pressed')==='true'}; })()");
  await openRoute('teacher');
  const languageSetup = await evaluate("(() => { const select=document.querySelector('.reader-language [data-language-select]'); const options=[...select.options].map(option=>({code:option.value})); const setValues=(ids,values)=>ids.forEach((id,index)=>document.getElementById(id).value=values[index]); setValues(['profilePlan','profileAttention','profileSimultaneous','profileSuccessive'],['H','M','L','H']); setValues(['teacherPlan','teacherAttention','teacherSimultaneous','teacherSuccessive'],['H','L','M','H']); setValues(['parentPlan','parentAttention','parentSimultaneous','parentSuccessive'],['L','H','M','L']); document.querySelector('#profileForm').requestSubmit(); document.querySelector('#teacherProfileForm').requestSubmit(); document.querySelector('#parentProfileForm').requestSubmit(); const dashboardButton=document.querySelector('[data-dashboard=priority]'); if(dashboardButton.getAttribute('aria-pressed')!=='true') dashboardButton.click(); return {options,profile:document.querySelector('#profileAnalysis .profile-code').textContent,teacher:document.querySelector('#teacherProfileAnalysis .profile-code').textContent,parent:document.querySelector('#parentProfileAnalysis .profile-code').textContent,koreanReset:document.querySelector('#resetTeacherProfile').textContent.trim(),koreanHeading:document.querySelector('#teacher .chapter-intro h2').textContent.trim()}; })()");
  const languageResults = [];
  for (const option of languageSetup.options) {
    await evaluate("(() => { const select=document.querySelector('.reader-language [data-language-select]'); select.value='" + option.code + "'; select.dispatchEvent(new Event('change',{bubbles:true})); })()");
    await waitFor("document.documentElement.dataset.requestedLanguage==='" + option.code + "' && !document.querySelector('.reader-language [data-language-select]').disabled", 'language ' + option.code);
    const languageResult = await evaluate("(() => { document.querySelector('#profileForm').requestSubmit(); document.querySelector('#teacherProfileForm').requestSubmit(); document.querySelector('#parentProfileForm').requestSubmit(); const panels=[document.querySelector('#profileAnalysis'),document.querySelector('#teacherProfileAnalysis'),document.querySelector('#parentProfileAnalysis')]; const clippedItems=panels.flatMap(panel=>[...panel.querySelectorAll('h2,h3,h4,p,li,button')]).filter(element=>element.getClientRects().length&&(element.scrollWidth>element.clientWidth+4||element.scrollHeight>element.clientHeight+4)).map(element=>({tag:element.tagName,className:element.className,text:element.textContent.trim().slice(0,80),width:[element.clientWidth,element.scrollWidth],height:[element.clientHeight,element.scrollHeight]})); const guideRoots=[...document.querySelectorAll('.chapter')]; const guideText=guideRoots.map(element=>element.textContent).join(' '); const koreanSamples=[...new Set(guideRoots.flatMap(root=>[...root.querySelectorAll('*')].map(element=>[...element.childNodes].filter(node=>node.nodeType===3).map(node=>node.nodeValue.trim()).join(' ')).filter(value=>/[가-힣]/.test(value))))].slice(0,12); const values=ids=>ids.map(id=>document.getElementById(id).value).join(); return {code:document.documentElement.lang,dir:document.documentElement.dir,reset:document.querySelector('#resetTeacherProfile').textContent.trim(),heading:document.querySelector('#teacher .chapter-intro h2').textContent.trim(),hash:location.hash,profileCode:document.querySelector('#profileAnalysis .profile-code').textContent,teacherCode:document.querySelector('#teacherProfileAnalysis .profile-code').textContent,parentCode:document.querySelector('#parentProfileAnalysis .profile-code').textContent,profileValues:values(['profilePlan','profileAttention','profileSimultaneous','profileSuccessive']),teacherValues:values(['teacherPlan','teacherAttention','teacherSimultaneous','teacherSuccessive']),parentValues:values(['parentPlan','parentAttention','parentSimultaneous','parentSuccessive']),dashboardPressed:document.querySelector('[data-dashboard=priority]').getAttribute('aria-pressed')==='true',teacherHasKorean:/[가-힣]/.test(document.querySelector('#teacherProfileAnalysis').innerText),parentHasKorean:/[가-힣]/.test(document.querySelector('#parentProfileAnalysis').innerText),guideHasKorean:/[가-힣]/.test(guideText),koreanSamples,documentOverflow:document.documentElement.scrollWidth>innerWidth,clipped:clippedItems.length,clippedItems,reportLangs:[...document.querySelectorAll('[data-report-link]')].map(link=>new URL(link.href).searchParams.get('lang'))}; })()");
    languageResult.userSurface = await userSurfaceSnapshot();
    languageResults.push(languageResult);
  }
  await evaluate("(() => { const select=document.querySelector('.reader-language [data-language-select]'); select.value='es'; select.dispatchEvent(new Event('change',{bubbles:true})); })()");
  await waitFor("document.documentElement.dataset.requestedLanguage==='es' && !document.querySelector('.reader-language [data-language-select]').disabled", 'language transition source');
  await evaluate("(() => { const title=document.querySelector('#opening h2'); window.__localeTransitionFrames=[]; window.__localeTransitionObserver=new MutationObserver(()=>window.__localeTransitionFrames.push(title.textContent.trim())); window.__localeTransitionObserver.observe(title,{subtree:true,childList:true,characterData:true}); const select=document.querySelector('.reader-language [data-language-select]'); select.value='ru'; select.dispatchEvent(new Event('change',{bubbles:true})); })()");
  await waitFor("document.documentElement.dataset.requestedLanguage==='ru' && !document.querySelector('.reader-language [data-language-select]').disabled", 'language transition target');
  report.interactions.languageTransition = await evaluate("(() => { window.__localeTransitionObserver.disconnect(); const frames=[...window.__localeTransitionFrames]; delete window.__localeTransitionObserver; delete window.__localeTransitionFrames; return {frames,koreanFlash:frames.some(text=>/[가-힣]/.test(text)),finalLanguage:document.documentElement.lang}; })()");
  report.interactions.language = {
    count:languageSetup.options.length,
    unique:new Set(languageSetup.options.map(option=>option.code)).size,
    ready:localeManifest.filter(option=>option.status==='ready').map(option=>option.code),
    drafts:localeManifest.filter(option=>option.status==='ai-draft').map(option=>option.code),
    results:languageResults
  };
  await evaluate("(() => { const select=document.querySelector('.reader-language [data-language-select]'); select.value='ko'; select.dispatchEvent(new Event('change',{bubbles:true})); })()");
  await waitFor("document.documentElement.dataset.requestedLanguage==='ko' && !document.querySelector('.reader-language [data-language-select]').disabled", 'restore Korean language');
  await openRoute('results');
  await evaluate("document.querySelector('[data-result-guide=teen]').click()");
  await waitFor("location.hash==='#results-teen' && !document.querySelector('[data-result-view=teen]').hidden", 'open result detail before locale state check');
  await evaluate("(() => { const select=document.querySelector('.reader-language [data-language-select]'); select.value='en'; select.dispatchEvent(new Event('change',{bubbles:true})); })()");
  await waitFor("document.documentElement.dataset.requestedLanguage==='en' && !document.querySelector('.reader-language [data-language-select]').disabled", 'result detail locale state');
  report.interactions.localeState = await evaluate("(() => { const values=ids=>ids.map(id=>document.getElementById(id).value).join(); return {hash:location.hash,resultDetail:!document.querySelector('[data-result-view=teen]').hidden,profileCode:document.querySelector('#profileAnalysis .profile-code').textContent,teacherCode:document.querySelector('#teacherProfileAnalysis .profile-code').textContent,parentCode:document.querySelector('#parentProfileAnalysis .profile-code').textContent,profileValues:values(['profilePlan','profileAttention','profileSimultaneous','profileSuccessive']),teacherValues:values(['teacherPlan','teacherAttention','teacherSimultaneous','teacherSuccessive']),parentValues:values(['parentPlan','parentAttention','parentSimultaneous','parentSuccessive']),dashboardPressed:document.querySelector('[data-dashboard=priority]').getAttribute('aria-pressed')==='true'}; })()");
  const localeStatePass = report.interactions.localeState.hash==='#results-teen' && report.interactions.localeState.resultDetail && report.interactions.localeState.profileCode===languageSetup.profile && report.interactions.localeState.teacherCode===languageSetup.teacher && report.interactions.localeState.parentCode===languageSetup.parent && report.interactions.localeState.profileValues==='H,M,L,H' && report.interactions.localeState.teacherValues==='H,L,M,H' && report.interactions.localeState.parentValues==='L,H,M,L' && report.interactions.localeState.dashboardPressed;
  if (!localeStatePass) failures.push('locale-state-preservation');
  await command('Page.reload', {ignoreCache:true});
  await waitFor("document.documentElement.dataset.requestedLanguage==='en' && !document.querySelector('.reader-language [data-language-select]').disabled && location.hash==='#results-teen' && !document.querySelector('[data-result-view=teen]').hidden", 'language URL reload state');
  report.interactions.languageReload = await evaluate("({search:location.search,hash:location.hash,language:document.documentElement.lang,selected:document.querySelector('.reader-language [data-language-select]').value,heading:document.querySelector('#results .chapter-intro h2').textContent,hasKorean:/[가-힣]/.test(document.querySelector('#results').innerText)})");
  if (report.interactions.languageReload.search!=='?lang=en' || report.interactions.languageReload.hash!=='#results-teen' || report.interactions.languageReload.language!=='en' || report.interactions.languageReload.selected!=='en' || report.interactions.languageReload.hasKorean) failures.push('language-url-reload');
  await evaluate("(() => { const select=document.querySelector('.reader-language [data-language-select]'); select.value='ko'; select.dispatchEvent(new Event('change',{bubbles:true})); })()");
  await waitFor("document.documentElement.dataset.requestedLanguage==='ko' && !document.querySelector('.reader-language [data-language-select]').disabled", 'restore Korean after locale state check');
  await evaluate("(() => { const ids=['parentPlan','parentAttention','parentSimultaneous','parentSuccessive']; const values=['L','H','M','L']; ids.forEach((id,index)=>document.getElementById(id).value=values[index]); document.querySelector('#parentProfileForm').requestSubmit(); })()");
  await openRoute('results');
  report.interactions.resultGuides = {};
  for (const guide of ['kpass','teen','adult']) {
    await evaluate("document.querySelector('[data-result-guide=" + guide + "]').click()");
    await waitFor("location.hash==='#results-" + guide + "' && !document.querySelector('[data-result-view=\"" + guide + "\"]').hidden && !document.querySelector('#resultInterpretation').hidden", 'result guide ' + guide);
    report.interactions.resultGuides[guide] = await evaluate("({hash:location.hash,visible:!document.querySelector('[data-result-view=\"" + guide + "\"]').hidden,chooser:document.querySelector('[data-result-view=chooser]').hidden,interpretation:!document.querySelector('#resultInterpretation').hidden})");
    await evaluate("document.querySelector('[data-result-view=\"" + guide + "\"] [data-result-back]').click()");
    await waitFor("location.hash==='#results' && !document.querySelector('[data-result-view=chooser]').hidden && document.querySelector('#resultInterpretation').hidden", 'result back ' + guide);
  }
  const resultGuidesPass = Object.values(report.interactions.resultGuides).every(item => item.visible && item.chooser && item.interpretation);
  const profilesPass = report.interactions.profiles.every(item => item.code===item.expectedCode && item.sections===6 && item.caution && item.privacyNotice) && report.interactions.profileReset;
  const teacherPass = report.interactions.teacherProfile.unchanged && report.interactions.teacherProfile.applied && report.interactions.teacherProfile.sections===8 && report.interactions.teacherProfile.reset;
  const parentPass = report.interactions.parentProfile.unchanged && report.interactions.parentProfile.applied && report.interactions.parentProfile.sections===9 && report.interactions.parentProfile.reset;
  const languagePass = report.interactions.language.count===13 && report.interactions.language.unique===13 && report.interactions.language.ready.join()==='ko' && report.interactions.language.drafts.length===12 && !report.interactions.languageTransition.koreanFlash && report.interactions.languageTransition.finalLanguage==='ru' && languageResults.every(item => !item.documentOverflow && item.clipped===0 && item.hash==='#teacher' && item.profileCode===languageSetup.profile && item.teacherCode===languageSetup.teacher && item.parentCode===languageSetup.parent && item.profileValues==='H,M,L,H' && item.teacherValues==='H,L,M,H' && item.parentValues==='L,H,M,L' && item.dashboardPressed && item.reportLangs.every(code=>code===item.code) && item.userSurface.forbiddenHits.length===0 && item.userSurface.exactStatus.length===0 && item.userSurface.internalElements.length===0 && item.userSurface.cleanTopFlow && (item.code==='ko' ? item.dir==='ltr' && item.teacherHasKorean && item.parentHasKorean && item.guideHasKorean && item.reset===languageSetup.koreanReset && item.heading===languageSetup.koreanHeading : !item.teacherHasKorean && !item.parentHasKorean && !item.guideHasKorean && item.dir===(item.code==='ar'?'rtl':'ltr') && item.reset!==languageSetup.koreanReset && item.heading!==languageSetup.koreanHeading));
  if (report.interactions.openingPathways !== '#pathways' || report.interactions.openingTeacher !== '#teacher' || !profilesPass || !teacherPass || !parentPass || !report.interactions.dashboard.changed || !report.interactions.dashboard.pressed || !languagePass || !resultGuidesPass) failures.push('interactions');

  const internationalViewports = [viewports[0],viewports[2],viewports[4],viewports[5]];
  for (const code of ['en','ar','km']) {
    await evaluate("(() => { const select=document.querySelector('.reader-language [data-language-select]'); select.value='" + code + "'; select.dispatchEvent(new Event('change',{bubbles:true})); })()");
    await waitFor("document.documentElement.dataset.requestedLanguage==='" + code + "' && !document.querySelector('.reader-language [data-language-select]').disabled", 'international viewport language ' + code);
    report.internationalViewports[code] = {};
    for (const viewport of internationalViewports) {
      await setViewport(viewport);
      await openRoute('parents');
      const snapshot = await layoutSnapshot();
      const userSurface = await userSurfaceSnapshot();
      const parentState = await evaluate("(() => ({values:['parentPlan','parentAttention','parentSimultaneous','parentSuccessive'].map(id=>document.getElementById(id).value).join(),code:document.querySelector('#parentProfileAnalysis .profile-code').textContent}))()");
      report.internationalViewports[code][viewport.name] = {snapshot,userSurface,parentState};
      if (snapshot.documentOverflow || snapshot.readerOverflow || snapshot.clipped || snapshot.visibleCount!==1 || snapshot.visible!=='parents' || userSurface.forbiddenHits.length || userSurface.exactStatus.length || userSurface.internalElements.length || !userSurface.cleanTopFlow || parentState.values!=='L,H,M,L' || parentState.code!==languageSetup.parent) failures.push('international-viewport-' + code + '-' + viewport.name);
      if (viewport.width===1440 || viewport.width===360) await screenshot('qa-parents-' + code + '-' + viewport.width + 'x' + viewport.height + '.png');
    }
  }
  await setViewport(viewports[0]);
  await evaluate("(() => { const select=document.querySelector('.reader-language [data-language-select]'); select.value='ko'; select.dispatchEvent(new Event('change',{bubbles:true})); })()");
  await waitFor("document.documentElement.dataset.requestedLanguage==='ko' && !document.querySelector('.reader-language [data-language-select]').disabled", 'restore Korean after international viewport checks');

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
      if ((viewport.width === 1440 || viewport.width === 360) && ['results','profiles','teacher','parents'].includes(route)) {
        await screenshot('qa-' + route + '-' + viewport.width + 'x' + viewport.height + '.png');
      }
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

  for (const language of localeManifest) {
    await evaluate("(() => { const select=document.querySelector('.reader-language [data-language-select]'); select.value='" + language.code + "'; select.dispatchEvent(new Event('change',{bubbles:true})); })()");
    await waitFor("document.documentElement.dataset.requestedLanguage==='" + language.code + "' && !document.querySelector('.reader-language [data-language-select]').disabled", 'multilingual layout ' + language.code);
    report.multilingualLayout[language.code] = {};
    for (const viewport of viewports) {
      await setViewport(viewport);
      const matrix = await chapterIntegrityMatrix();
      const summary = summarizeIntegrity(matrix);
      report.multilingualLayout[language.code][viewport.name] = summary;
      if (!integrityPass(summary)) failures.push('multilingual-layout-' + language.code + '-' + viewport.name);
      if (language.code === 'es' && (viewport.width === 1440 || viewport.width === 360)) {
        await evaluate("renderChapter('opening',false)");
        await screenshot('i18n-after-opening-es-' + viewport.width + 'x' + viewport.height + '.png');
      }
    }
  }

  const zoomRoutes = ['opening','results','profiles','teacher','parents','closing'];
  for (const language of localeManifest) {
    await evaluate("(() => { const select=document.querySelector('.reader-language [data-language-select]'); select.value='" + language.code + "'; select.dispatchEvent(new Event('change',{bubbles:true})); })()");
    await waitFor("document.documentElement.dataset.requestedLanguage==='" + language.code + "' && !document.querySelector('.reader-language [data-language-select]').disabled", 'multilingual zoom ' + language.code);
    report.multilingualZoom[language.code] = {};
    for (const zoom of zoomWidths) {
      await setViewport({width:zoom.width,height:900,mobile:zoom.width<1100});
      const summary = summarizeIntegrity(await chapterIntegrityMatrix(zoomRoutes));
      report.multilingualZoom[language.code][zoom.name] = summary;
      if (!integrityPass(summary)) failures.push('multilingual-zoom-' + language.code + '-' + zoom.name);
    }
  }

  await evaluate("(() => { const select=document.querySelector('.reader-language [data-language-select]'); select.value='ko'; select.dispatchEvent(new Event('change',{bubbles:true})); })()");
  await waitFor("document.documentElement.dataset.requestedLanguage==='ko' && !document.querySelector('.reader-language [data-language-select]').disabled", 'restore Korean after multilingual layout checks');

  for (const zoom of zoomWidths) {
    await setViewport({width:zoom.width,height:900,mobile:zoom.width<1100});
    await openRoute('opening');
    const metrics = await evaluate("(() => { const text=document.querySelector('.opening-copy').getBoundingClientRect(); const art=document.querySelector('.cognitive-art').getBoundingClientRect(); const title=document.querySelector('#opening h2').getBoundingClientRect(); const hero=document.querySelector('#opening').getBoundingClientRect(); const nodes=[...document.querySelectorAll('.cognitive-art .pass-node')].map(n=>({name:n.className,rect:n.getBoundingClientRect()})); const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top; const nodeOverlap=nodes.flatMap((a,i)=>nodes.slice(i+1).filter(b=>intersects(a.rect,b.rect)).map(b=>a.name+' / '+b.name)); return {overflow:document.documentElement.scrollWidth>innerWidth,textArtOverlap:intersects(text,art),titleOutside:title.left<hero.left||title.right>hero.right||title.top<hero.top||title.bottom>hero.bottom,nodeOverlap,logoRatio:+(document.querySelector('.toc-head img').naturalWidth/document.querySelector('.toc-head img').naturalHeight).toFixed(3)}; })()");
    report.zoom[zoom.name] = metrics;
    if (metrics.overflow || metrics.textArtOverlap || metrics.titleOutside || metrics.nodeOverlap.length) failures.push('zoom-' + zoom.name);
  }

  await command('Emulation.setEmulatedMedia', {media:'print'});
  const printViewports = [
    {name:'A4 세로',width:794,height:1123,mobile:false},
    {name:'A4 가로',width:1123,height:794,mobile:false}
  ];
  for (const language of localeManifest) {
    await evaluate("(() => { const select=document.querySelector('.reader-language [data-language-select]'); select.value='" + language.code + "'; select.dispatchEvent(new Event('change',{bubbles:true})); })()");
    await waitFor("document.documentElement.dataset.requestedLanguage==='" + language.code + "' && !document.querySelector('.reader-language [data-language-select]').disabled", 'print language ' + language.code);
    report.printLayouts[language.code] = {};
    for (const viewport of printViewports) {
      await setViewport(viewport);
      const summary = summarizeIntegrity(await chapterIntegrityMatrix());
      report.printLayouts[language.code][viewport.name] = summary;
      if (!integrityPass(summary)) failures.push('print-layout-' + language.code + '-' + viewport.name);
    }
  }
  await evaluate("(() => { const select=document.querySelector('.reader-language [data-language-select]'); select.value='ko'; select.dispatchEvent(new Event('change',{bubbles:true})); })()");
  await waitFor("document.documentElement.dataset.requestedLanguage==='ko' && !document.querySelector('.reader-language [data-language-select]').disabled", 'restore Korean after print layout checks');
  report.print = await evaluate("({visible:[...document.querySelectorAll('.chapter')].filter(chapter=>getComputedStyle(chapter).display!=='none').length,sidebar:getComputedStyle(document.querySelector('#tocPanel')).display,pagination:getComputedStyle(document.querySelector('.chapter-pagination')).display,lineButtonColor:getComputedStyle(document.querySelector('.chapter-opening .button.line')).color})");
  report.print.userSurface = await userSurfaceSnapshot();
  if (report.print.visible !== 14 || report.print.sidebar !== 'none' || report.print.pagination !== 'none' || report.print.lineButtonColor!=='rgb(0, 0, 0)' || report.print.userSurface.forbiddenHits.length || report.print.userSurface.exactStatus.length || report.print.userSurface.internalElements.length || !report.print.userSurface.cleanTopFlow) failures.push('print');

  report.console = {exceptions,errors:consoleErrors};
  if (exceptions.length || consoleErrors.length) failures.push('console');
  report.status = failures.length ? 'FAIL: ' + [...new Set(failures)].join(', ') : 'PASS';
  const output = process.env.TEACHER_GUIDE_QA_SUMMARY === '1' ? {
    status:report.status,
    interactions:{
      openingPathways:report.interactions.openingPathways,
      openingTeacher:report.interactions.openingTeacher,
      profiles:report.interactions.profiles,
      profileReset:report.interactions.profileReset,
      teacherProfile:report.interactions.teacherProfile,
      parentProfile:report.interactions.parentProfile,
      dashboard:report.interactions.dashboard,
      languageTransition:report.interactions.languageTransition,
      localeState:report.interactions.localeState,
      languageReload:report.interactions.languageReload,
      resultGuides:report.interactions.resultGuides
    },
    languages:report.interactions.language.results.map(item => ({code:item.code,dir:item.dir,teacherHasKorean:item.teacherHasKorean,parentHasKorean:item.parentHasKorean,guideHasKorean:item.guideHasKorean,...(item.guideHasKorean&&item.code!=='ko'?{koreanSamples:item.koreanSamples}:{}),overflow:item.documentOverflow,clipped:item.clipped,userSurface:item.userSurface,...(item.clipped ? {clippedItems:item.clippedItems} : {})})),
    viewports:Object.fromEntries(Object.entries(report.viewports).map(([name, value]) => [name, {overflow:value.overflow,clipped:value.clipped,multiple:value.multiple,activeMismatch:value.activeMismatch}])),
    internationalViewports:Object.fromEntries(Object.entries(report.internationalViewports).map(([code, results]) => [code, Object.fromEntries(Object.entries(results).map(([name, value]) => [name, {overflow:value.snapshot.documentOverflow||value.snapshot.readerOverflow,clipped:value.snapshot.clipped,userSurface:value.userSurface,parentState:value.parentState}]))])),
    multilingualLayout:report.multilingualLayout,
    multilingualZoom:report.multilingualZoom,
    zoom:report.zoom,
    print:report.print,
    printLayouts:report.printLayouts,
    console:report.console
  } : report;
  console.log(JSON.stringify(output, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  if (socket) socket.close();
  browser.kill();
  server.close();
  await Promise.race([
    rm(profileDirectory, {recursive:true,force:true}).catch(() => {}),
    new Promise(resolveWait => setTimeout(resolveWait, 1500))
  ]);
}

async function userSurfaceSnapshot() {
  return evaluate(`(() => {
    const bodyText=document.body.innerText;
    const forbidden=${JSON.stringify(forbiddenUserPhrases)};
    const exactStatus=[...document.querySelectorAll('body *')].filter(element=>!element.children.length&&['ai-draft','needs-review','ready'].includes(element.textContent.trim().toLowerCase())).map(element=>element.textContent.trim());
    const internalElements=[...document.querySelectorAll('#translationNotice,.translation-notice,.reader-notice,[data-status],[data-build-id],[data-qa-status]')].map(element=>element.id||element.className||element.tagName);
    const readerHead=document.querySelector('.reader-head');
    return {
      forbiddenHits:forbidden.filter(phrase=>bodyText.includes(phrase)),
      exactStatus,
      internalElements,
      cleanTopFlow:readerHead.nextElementSibling===document.querySelector('.chapter-reader')
    };
  })()`);
}
process.exit(process.exitCode || 0);
