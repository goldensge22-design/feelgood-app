// Lightweight Chrome DevTools smoke run; uses the Chromium already in the environment.
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const chrome = spawn('chromium', [
  '--headless', '--no-sandbox', '--disable-dev-shm-usage',
  '--remote-debugging-port=9223', '--remote-allow-origins=*',
  `--user-data-dir=/tmp/nuvia-qa-chrome-${process.pid}`,
  '--window-size=1440,1000', 'about:blank',
], { stdio: 'ignore' });
const origin = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : 'http://localhost:80';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let targets;
for (let n = 0; n < 40; n++) {
  try { targets = await (await fetch('http://127.0.0.1:9223/json')).json(); if (targets.length) break; }
  catch { /* Chrome is starting. */ }
  await sleep(250);
}
if (!targets?.length) throw new Error('Chromium did not start');
const socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
const pending = new Map();
let next = 0;
socket.onmessage = e => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  }
};
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++next;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
const run = async expression => {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const click = async selector => run(`(() => {let el=document.querySelector(${JSON.stringify(selector)}); if(!el) throw Error(${JSON.stringify(`missing ${selector}`)}); el.click(); return el.textContent?.trim()})()`);
const fill = async (selector, value) => run(`(() => {let el=document.querySelector(${JSON.stringify(selector)}); if(!el) throw Error(${JSON.stringify(`missing ${selector}`)}); let setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set; setter.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));return el.value})()`);
const image = async name => {
  const { data } = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.mkdirSync('screenshots', { recursive: true });
  fs.writeFileSync(`screenshots/${name}.png`, Buffer.from(data, 'base64'));
};
const navigate = async url => { await call('Page.navigate', { url }); await sleep(1700); };
try {
  await call('Page.enable');
  await call('Runtime.enable');
  await navigate(`${origin}/`);
  console.log('title', await run('document.title'));
  console.log('create', await fill('[aria-label="블록 할 일"]', '수학 문제집 1~20번'));
  await click('.tb-create form .np-primary');
  await sleep(450);
  console.log('added', await run('document.querySelectorAll(".tb-mini").length'));
  await image('nuvia-after-plan');
  await navigate(`${origin}/?view=before`);
  await image('nuvia-before-plan');
  console.log('baseline task', await run('document.body.textContent.includes("수학 문제집 1~20번")'));
  await navigate(`${origin}/`);
  await click('.tb-phase-ready .tb-immediate-start');
  await sleep(200);
  console.log('running', await run('document.querySelector(".tb-phase-running")?.textContent.includes("수학 문제집 1~20번")'));
  await image('nuvia-after-running');
  await click('.tb-phase-running .tb-controls button:first-child');
  await fill('[aria-label="중단 다음 시작 위치"]', '11번 문제부터');
  await image('nuvia-after-paused');
  await navigate(`${origin}/`);
  console.log('pause restored', await run('document.querySelector("[aria-label=\\"중단 다음 시작 위치\\"]")?.value'));
  await click('.tb-phase-paused .tb-controls .np-primary');
  await click('.tb-phase-running .tb-controls .np-primary');
  await sleep(150);
  console.log('review', await run('!!document.querySelector(".tb-phase-review")'));
  await image('nuvia-after-review');
  console.log('actual edited', await fill('[aria-label="실제 사용 시간 직접 수정"]', '7'));
  console.log('actual in workspace', await run('NUVIAPlanner.getWorkspace().tasks.find(t=>t.timeBlock?.phase==="review")?.actualMinutes'));
  console.log('edited workspace validated', await run('NUVIAPlanner.setWorkspace(NUVIAPlanner.getWorkspace())'));
  await run(`(() => {let x=document.querySelector('[aria-label="블록 완료 여부"]');x.value="no";x.dispatchEvent(new Event("change",{bubbles:true}));})()`);
  await sleep(100);
  console.log('incomplete options', await run('document.querySelector(".tb-review")?.textContent.includes("5분 더 하기")'));
  await click('.tb-review [aria-label="미완료 다음 선택"] button:first-child');
  await click('.tb-review .np-primary');
  console.log('five minute running', await run('!!document.querySelector(".tb-phase-running")'));
  await image('nuvia-after-five-minute');
  await click('[data-testid="tab-report"]');
  await image('nuvia-after-report');
  // Simulate a stalled/failed entry module on a fresh navigation: the HTML
  // must provide a retry action instead of leaving a loading message forever.
  await call('Network.enable');
  await call('Network.setCacheDisabled', { cacheDisabled: true });
  await call('Network.setBlockedURLs', { urls: ['*src/main.tsx*'] });
  await navigate(`${origin}/`);
  await sleep(11000);
  console.log('connection help', await run('!document.getElementById("app-boot-help").hidden && document.getElementById("app-boot-help").textContent.includes("다시 시도")'));
  await image('nuvia-loading-retry');
  await call('Network.setBlockedURLs', { urls: [] });
  await click('#app-boot-help button');
  await sleep(1700);
  console.log('retry restored planner', await run('!!document.querySelector("[data-testid=\\"time-block-board\\"]")'));
  await call('Network.setCacheDisabled', { cacheDisabled: false });
  await call('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
  await navigate(`${origin}/?compare=1&scene=entry`);
  const mobile = await run(`(() => {
    const start = document.querySelector('.tb-immediate-start');
    const card = document.querySelector('.tb-mini.selected');
    const rect = start?.getBoundingClientRect();
    return {isolated: !(localStorage instanceof Storage), task: card?.textContent.includes('수학 문제집'), scope: card?.querySelector('.tb-detail-slot')?.textContent.includes('문제집 1~20번'),
      startVisible: !!rect && rect.top >= 0 && rect.bottom <= innerHeight, startBottom: rect?.bottom, overflow: document.documentElement.scrollWidth-innerWidth,
      scoreCount: document.querySelectorAll('.np-axes > div').length};
  })()`);
  console.log('mobile entry', JSON.stringify(mobile));
  await image('candidate-mobile-entry');
  await click('[data-block-id="compare-korean"] .tb-open');
  console.log('mobile selected inline', await run(`(() => { const card=document.querySelector('[data-block-id="compare-korean"]').closest('.tb-mini');return !!card?.querySelector('.tb-detail-slot') && card.querySelector('.tb-station')?.textContent.includes('국어 독서 기록') && !document.querySelector('[data-block-id="compare-math"]').closest('.tb-mini').querySelector('.tb-detail-slot');})()`));
  await image('candidate-mobile-selected');
  await click('.tb-phase-ready .tb-immediate-start');
  console.log('mobile start correct task', await run('document.querySelector(".tb-phase-running")?.textContent.includes("국어 독서 기록")'));
  await image('candidate-mobile-running');
  await click('.tb-phase-running .tb-controls button:first-child');
  await run(`document.querySelector('.tb-pause details').open=true`);
  await fill('[aria-label="중단 다음 시작 위치"]', '독서 2장부터');
  await image('candidate-mobile-paused');
  console.log('mobile return flag', await run('document.querySelector(".tb-phase-paused")?.textContent.includes("독서 2장부터")'));
  await click('.tb-phase-paused .tb-controls .np-primary');
  await click('.tb-phase-running .tb-controls .np-primary');
  await image('candidate-mobile-review');
  await click('[data-testid="tab-report"]');
  await image('candidate-mobile-report');
  await navigate(`${origin}/?compare=1&scene=entry`);
  await run(`document.querySelector('[data-block-id="compare-english"]').scrollIntoView({block:'center'})`);
  const touchPoints = await run(`(() => { const a=document.querySelector('[data-block-id="compare-english"] .tb-drag').getBoundingClientRect(),b=document.querySelector('[data-block-id="compare-science"]').getBoundingClientRect();return {x:a.x+a.width/2,y:a.y+a.height/2,tx:b.x+b.width/2,ty:b.y+b.height/2};})()`);
  await call('Emulation.setTouchEmulationEnabled', { enabled: true });
  const touch = (type, x, y) => call('Input.dispatchTouchEvent', { type, touchPoints: type==='touchEnd' ? [] : [{ x, y, id: 1 }] });
  await touch('touchStart', touchPoints.x, touchPoints.y);
  await touch('touchMove', touchPoints.tx, touchPoints.ty);
  await touch('touchEnd', touchPoints.tx, touchPoints.ty);
  await sleep(250);
  console.log('touch reordered', await run('Array.from(document.querySelectorAll(".tb-mini .tb-open b")).map(x=>x.textContent).join(" | ")'));
  await call('Emulation.setTouchEmulationEnabled', { enabled: false });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await navigate(`${origin}/?compare=1&scene=entry`);
  await image('candidate-desktop-entry');
  const desktop = await run(`(() => { const x=document.querySelector('.tb-immediate-start').getBoundingClientRect();return {startBottom:x.bottom,visible:x.bottom<=innerHeight,overflow:document.documentElement.scrollWidth-innerWidth};})()`);
  console.log('desktop entry', JSON.stringify(desktop));
  const mousePoints = await run(`(() => { const a=document.querySelector('[data-block-id="compare-math"] .tb-drag').getBoundingClientRect(),b=document.querySelector('[data-block-id="compare-korean"]').getBoundingClientRect();return {x:a.x+a.width/2,y:a.y+a.height/2,tx:b.x+b.width/2,ty:b.y+b.height/2};})()`);
  const mouse = (type, x, y, buttons) => call('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons });
  await mouse('mouseMoved', mousePoints.x, mousePoints.y, 0);
  await mouse('mousePressed', mousePoints.x, mousePoints.y, 1);
  await mouse('mouseMoved', mousePoints.tx, mousePoints.ty, 1);
  await mouse('mouseReleased', mousePoints.tx, mousePoints.ty, 0);
  await sleep(150);
  console.log('mouse reordered', await run('document.querySelector(".tb-mini .tb-open b")?.textContent'));
  await navigate(`${origin}/?compare=1&scene=entry`);
  await click('[data-block-id="compare-science"] .tb-open');
  console.log('desktop selected science', await run('document.querySelector(".tb-station")?.textContent.includes("과학 실험 보고서")'));
  await image('candidate-desktop-selected');
  await click('[aria-label="과학 실험 보고서 초안 위로"]');
  console.log('button reorder and time', await run('Array.from(document.querySelectorAll(".tb-mini .tb-open")).map(x=>x.textContent).join(" | ")'));
  await image('candidate-desktop-reordered');
  await navigate(`${origin}/?compare=1&scene=report`);
  await click('[data-testid="tab-report"]');
  await image('candidate-desktop-report');
  await call('Emulation.setDeviceMetricsOverride', { width: 768, height: 900, deviceScaleFactor: 1, mobile: false });
  await navigate(`${origin}/?compare=1&scene=paused`);
  await image('candidate-tablet-paused');
  console.log('tablet inline detail', await run('!!document.querySelector(".tb-mini.selected .tb-detail-slot")'));
  await navigate(`${origin}/?compare=1&scene=over`);
  console.log('overcapacity choices', await run('document.querySelector(".tb-capacity-options")?.textContent'));
  await navigate(`${origin}/?compare=1&scene=empty`);
  console.log('empty prompt', await run('document.querySelector(".tb-create summary")?.textContent'));
  await navigate(`${origin}/?compare=1&scene=long`);
  console.log('long title overflow', await run('document.documentElement.scrollWidth-innerWidth'));
  await navigate(`${origin}/`);
  const initialDesk = await run('document.querySelector(".np-desk-color input").value');
  const chosenDesk = initialDesk.toLowerCase()==='#c0d7ed'?'#dbe8eb':'#c0d7ed';
  await fill('.np-desk-color input', chosenDesk);
  console.log('color immediate and stored', await run(`(() => ({value:document.querySelector(".np-desk-color input").value,stored:localStorage.getItem("nuvia:desk-color:v1")}))()`));
  await navigate(`${origin}/`);
  console.log('color after reload', await run('document.querySelector(".np-desk-color input").value'));
  await navigate(`${origin}/?compare=1&scene=review&student=1`);
  console.log('round before review', await run('NUVIAPlanner.getWorkspace().plannerRound??0'));
  await run(`(() => {let s=document.querySelector('[aria-label="지금 한 가지 · 주의 상태"]');s.value='performed';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await sleep(100);
  await click('.np-goal-evidence > details:nth-of-type(2) [type="checkbox"]');
  console.log('round before execution end', await run('NUVIAPlanner.getWorkspace().plannerRound??0'));
  await fill('[aria-label="실제 사용 시간 직접 수정"]', '7');
  await run(`(() => {let s=document.querySelector('[aria-label="블록 완료 여부"]');s.value='no';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await sleep(100);
  await click('.tb-review [aria-label="미완료 다음 선택"] button:last-child');
  await click('.tb-review .np-primary');
  await sleep(150);
  console.log('round after performed execution end', await run('({round:NUVIAPlanner.getWorkspace().plannerRound, actual:NUVIAPlanner.getWorkspace().records.at(-1)?.measures.actualMinutes, goal:NUVIAPlanner.getWorkspace().records.at(-1)?.measures.goalPerformed})'));
  console.log('evidence workspace validated', await run('NUVIAPlanner.setWorkspace(NUVIAPlanner.getWorkspace())'));
  await navigate(`${origin}/?compare=1&scene=review&student=1`);
  await run(`(() => {let s=document.querySelector('[aria-label="블록 완료 여부"]');s.value='no';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await sleep(100);
  await click('.tb-review [aria-label="미완료 다음 선택"] button:last-child');
  await click('.tb-review .np-primary');
  console.log('round after unobserved execution end', await run('NUVIAPlanner.getWorkspace().plannerRound??0'));
  for (const width of [360, 768, 1440]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: width===360 ? 800 : 900, deviceScaleFactor: 1, mobile: false });
    for (const [label, path, selector] of [
      ['previous', '/previous.html', '.tb-immediate-start'],
      ['candidate', '/', '.tb-immediate-start'],
    ]) {
      await navigate(`${origin}${path}?compare=1&scene=entry&student=1`);
      await image(`${label}-${width}-entry`);
      const metrics = await run(`(() => {
        const button=document.querySelector(${JSON.stringify(selector)}), root=document.getElementById('root');
        const task=document.querySelector('.tb-station h3');
        return {bodyReady:!!document.querySelector('[data-testid="time-block-board"]'),
          startPresent:!!button, startBottomInApp:button?Math.round(button.getBoundingClientRect().bottom-root.getBoundingClientRect().top):null,
          taskVisible:!!task, overflow:document.documentElement.scrollWidth-innerWidth};
      })()`);
      console.log(`first start ${width} ${label}`, JSON.stringify(metrics));
      if (metrics.startPresent) {
        await click(selector);
        console.log(`first start clicked ${width} ${label}`, await run('!!document.querySelector(".tb-phase-running")'));
        await image(`${label}-${width}-running`);
      }
    }
  }
  await call('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: false });
  for (const [stage, lower, marker] of [
    ['A', 1, 'lower'], ['A', 0, 'upper'], ['B', 0, 'B'], ['C', 0, 'C'], ['D', 0, 'D'],
  ]) {
    await navigate(`${origin}/?compare=1&scene=entry&student=1&band=${stage}&lower=${lower}`);
    const route = await run(`(() => ({stage:document.querySelector('.np-profile .np-eyebrow')?.textContent,
      age:!!document.querySelector('[data-testid="block-age-${marker}"]'),
      scores:document.querySelectorAll('.np-axes>div').length,
      start:!!document.querySelector('.tb-immediate-start')}))()`);
    console.log(`age route ${stage}${lower?' lower':''}`, route);
    await image(`candidate-age-${stage}${lower?'-lower':''}`);
  }
} finally {
  socket.close();
  chrome.kill();
}