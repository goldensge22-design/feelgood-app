import fs from 'node:fs';
import assert from 'node:assert/strict';
import {browser,sleep} from '../nuvia-enhancement/browser-lib.mjs';
const b=await browser(9395);
try{
 await b.call('Page.navigate',{url:`https://${process.env.REPLIT_DEV_DOMAIN}/personal-monthly.html?review=1`});await b.wait('!!document.querySelector(".pm-root")');
 await b.run(`window.confirm=()=>true;Array.from(document.querySelectorAll("summary")).find(e=>e.textContent==="월간 비교 예시 (완료된 두 달)").click()`);
 await b.click('[data-testid=insights-fixture]');await b.click('[data-testid=tab-report]');
 const month=await b.run('JSON.parse(localStorage.getItem("nuvia:personal-monthly:v1:review")).agreements.at(-1).month');await b.fill('[data-testid=month-select]',month);await sleep(1200);
 const tree=await b.call('Page.getFrameTree');fs.writeFileSync('generated-artifacts/nuvia-insights/logs/frames.json',JSON.stringify(tree,null,2));
 const targets=await b.call('Target.getTargets');fs.writeFileSync('generated-artifacts/nuvia-insights/logs/frame-targets.json',JSON.stringify(targets,null,2));
 const frame=tree.frameTree.childFrames?.find(f=>f.frame.url==='about:srcdoc');
 let text;
 if(frame){const world=await b.call('Page.createIsolatedWorld',{frameId:frame.frame.id,worldName:'report-qa'});text=await b.call('Runtime.evaluate',{contextId:world.executionContextId,expression:'document.body.innerText',returnByValue:true});}
 else {
  const target=targets.targetInfos.find(t=>t.type==='iframe');assert(target,'remote report iframe exists');
  const ws=new WebSocket(`ws://127.0.0.1:9395/devtools/page/${target.targetId}`);
  await new Promise(r=>ws.addEventListener('open',r,{once:true}));
  text=await new Promise((resolve,reject)=>{ws.addEventListener('message',m=>{const v=JSON.parse(m.data);if(v.id===1){ws.close();v.error?reject(Error(JSON.stringify(v.error))):resolve(v.result);}});ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:'document.body.innerText',returnByValue:true}}));});
 }
 fs.writeFileSync('generated-artifacts/nuvia-insights/logs/rendered-report.txt',text.result.value??JSON.stringify(text));
 console.log('Rendered frame:',text.result.value?.length,text.result.value?.slice(0,150));
 for(const width of [1440,360]){await b.viewport(width,1000);await b.run('document.querySelector("[data-testid=report-preview]").scrollIntoView({block:"start"})');await sleep(700);const image=await b.call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`screenshots/insights/rendered-report-${width}.png`,Buffer.from(image.data,'base64'));}
 assert(text.result.value?.includes('20퍼센트포인트 증가'));
 await b.viewport(1440,1000);await b.click('[data-testid=tab-month]');await b.click('[data-testid=make-draft]');
 await b.fill('input[aria-label=횟수]','6');await b.clickText('고친 내용 저장');
 for(const width of [1440,360]){await b.viewport(width,1000);await b.run('document.querySelector("[data-testid^=draft-]").scrollIntoView({block:"start"})');await sleep(700);const image=await b.call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`screenshots/insights/next-month-${width}.png`,Buffer.from(image.data,'base64'));}
 console.log('PASS rendered report iframe text/20pp; desktop/mobile settled captures.');
}finally{b.close();}
