import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browser,sleep} from './browser-lib.mjs';
const b=await browser(9462),origin=`https://${process.env.REPLIT_DEV_DOMAIN}`,key='nuvia:studio:v1:review';
let count=0;const ok=(x,l)=>{assert(x,l);count++;console.log('PASS',l);},t=id=>`[data-testid="${id}"]`;
const state=()=>b.run(`JSON.parse(localStorage.getItem(${JSON.stringify(key)}))`),person=s=>s.lab.students['student-a'];
const axes=['planning','attention','simultaneous','successive'];
const stageNames={middle:'중학생',high:'고등학생',adult:'대학생·성인'};
const screenshot=async name=>{await b.viewport(1440,1100);await b.run('document.querySelector("[data-testid=activity-panel]").scrollIntoView({block:"center"})');await sleep(200);const x=await b.call('Page.captureScreenshot',{format:'png'});fs.mkdirSync('screenshots/task-add/regression',{recursive:true});fs.writeFileSync(`screenshots/task-add/regression/activity-${name}.png`,Buffer.from(x.data,'base64'));};
try{
 for(const [index,target] of [...axes,'integrated'].entries()){
  await b.call('Page.navigate',{url:origin+'/studio.html?review=1'});await sleep(500);await b.wait('!!document.querySelector("[data-testid=studio-root]")');
  await b.run(`localStorage.removeItem(${JSON.stringify(key)});localStorage.removeItem(${JSON.stringify(key+':id')});sessionStorage.clear()`);await b.call('Page.reload');await sleep(500);await b.wait('!!document.querySelector("[data-testid=profile-controls]")&&document.readyState==="complete"');
  const stage=['middle','high','adult','middle','adult'][index];
  // Use actual review-only controls, not a production student profile switch.
  await b.run(`Array.from(document.querySelector('[data-testid=review-panel]').querySelectorAll('button')).find(x=>x.textContent.trim()===${JSON.stringify(stageNames[stage])})?.click()`);
  if(person(await state()).stage!==stage)await b.run(`Array.from(document.querySelector('[data-testid=review-panel]').querySelectorAll('button')).find(x=>x.textContent.includes(${JSON.stringify(stage==='adult'?'대학':stageNames[stage])}))?.click()`);
  ok(person(await state()).stage===stage,`explicit review ${stage} age path`);
  await b.run('document.querySelector("[data-testid=profile-controls]").open=true');
  if(target!=='integrated')for(const [i,axis] of axes.entries()){
   const label=axis===target?'낮음':i===(index+1)%4?'높음':'보통';
   await b.run(`Array.from(document.querySelector('[data-testid=profile-controls]').querySelectorAll(':scope > .pm-row'))[${i}].querySelectorAll('button')[${label==='높음'?0:label==='보통'?1:2}].click()`);
  }
  await b.clickText('이 프로필 적용');await b.click(t('button-open-task'));await b.fill(t('task-title'),'발표 자료 준비하기');await b.click(t('task-time-25'));await b.click(t('task-save'));
  let s=await state(),id=person(s).cards.at(-1).id;await b.click(t(`button-select-${id}`));await b.click(t(`button-place-${id}`));
  ok(await b.run(`document.querySelector('[data-testid=activity-panel]').classList.contains(${JSON.stringify(target)})`),`${stage} real ${target} UI selection`);
  await b.fill(t('first-action'),'자료 첫 문단 읽기');await b.run(`document.querySelector(${JSON.stringify(t('scope'))}).closest('details').querySelector('summary').click()`);await b.fill(t('scope'),'발표 자료 한 쪽');await b.click(t('core-save'));
  if(target==='planning'||target==='integrated')ok(person(await state()).cards.at(-1).evidence.planChanged&&!await b.run(`!!document.querySelector(${JSON.stringify(t('plan-confirm'))})`),'actual saved plan replaces redundant confirm');
  if(target==='attention')await b.click(t('action-confirm'));
  if(target==='simultaneous'){
   for(const name of ['목표','자료']){await b.run(`Array.from(document.querySelector('[data-testid=activity-panel]').querySelectorAll('label')).find(x=>x.textContent.trim()===${JSON.stringify(name)}).querySelector('input').click()`);await b.fill(`input[aria-label="${name} 내용"]`,name==='목표'?'발표 핵심 설명':'책 12쪽');}
   await b.fillLabel('두 항목의 관계','책의 내용을 발표 설명에 근거로 사용한다');await b.click(t('links-confirm'));
  }
  if(target==='successive'){
   await b.fill('input[aria-label="단계 1"]','자료 열기');await b.fill('input[aria-label="단계 2"]','핵심 찾기');await b.click(t('steps-confirm'));await b.clickText('자료 열기','document.querySelector("[data-testid=activity-panel]")');
  }
  await screenshot(target);await b.click(t('start'));await b.click(t('pause'));await b.click(t('resume'));await b.click(t('review-run'));await b.clickText('아직 남았어요');await b.clickText('오늘은 여기까지');await b.click(t('close-run'));
  s=await state();ok(s.entries.at(-1).status==='performed'&&person(s).round===1,`${target} actual input/end evidence and rotation`);
  ok(person(s).cards[0].status==='planned',`${target} performance not equal task completion`);
  if(stage==='adult'){
   await b.run(`Array.from(document.querySelectorAll('summary')).find(x=>x.textContent.includes('담당')||x.textContent.includes('프로젝트'))?.click()`);
   const exists=await b.run('!!document.querySelector("[data-testid=adult-save]")');ok(exists,'adult distinct owner/dependency/handoff controls');
  }
  if(stage==='high')ok(await b.run('!!document.querySelector("[data-testid=split-planner]")'),'high editable split/reverse planning path');
 }
 // Render the actual sandboxed monthly iframe with explicit comparison fixture.
 await b.run('window.confirm=()=>true;Array.from(document.querySelectorAll("summary")).find(e=>e.textContent==="월간 비교 예시 (완료된 두 달)").click()');
 await b.click(t('insights-fixture'));await b.click(t('tab-report'));const month=(await state()).agreements.at(-1).month;await b.fill(t('select-month'),month);
 await b.run('document.querySelector("[data-testid=report-preview]").scrollIntoView({block:"start"})');await sleep(700);
 const targets=await b.call('Target.getTargets'),target=targets.targetInfos.find(t=>t.type==='iframe');let text='';
 if(target){const ws=new WebSocket(`ws://127.0.0.1:9462/devtools/page/${target.targetId}`);await new Promise(r=>ws.addEventListener('open',r,{once:true}));text=await new Promise((r,j)=>{ws.addEventListener('message',m=>{const x=JSON.parse(m.data);if(x.id===1){ws.close();x.error?j(Error(JSON.stringify(x.error))):r(x.result.result.value);}});ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:'document.body.innerText',returnByValue:true}}));});}
 else{const tree=await b.call('Page.getFrameTree'),frame=tree.frameTree.childFrames.find(f=>f.frame.url==='about:srcdoc');const w=await b.call('Page.createIsolatedWorld',{frameId:frame.frame.id,worldName:'studio-report'});text=(await b.call('Runtime.evaluate',{contextId:w.executionContextId,expression:'document.body.innerText',returnByValue:true})).result.value;}
 fs.writeFileSync('generated-artifacts/nuvia-studio/logs/rendered-report.txt',text);ok(text.includes('20퍼센트포인트 증가'),'rendered report 60→80 is 20 percentage points');
 for(const width of [1440,360]){await b.viewport(width,1100);await b.run('document.querySelector("[data-testid=report-preview]").scrollIntoView({block:"start"})');await sleep(700);const x=await b.call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`screenshots/studio/rendered-report-${width}.png`,Buffer.from(x.data,'base64'));}
 await b.call('Runtime.evaluate',{expression:'document.querySelector("[data-testid=report-print]").click()',userGesture:true});await sleep(500);
 const printTarget=(await b.call('Target.getTargets')).targetInfos.find(x=>x.type==='page'&&x.url.startsWith('blob:'));
 ok(!!printTarget,'print opens full standalone report not clipped iframe');
 if(printTarget){const ws=new WebSocket(`ws://127.0.0.1:9462/devtools/page/${printTarget.targetId}`);await new Promise(r=>ws.addEventListener('open',r,{once:true}));const pdf=await new Promise((r,j)=>{ws.addEventListener('message',m=>{const x=JSON.parse(m.data);if(x.id===2){ws.close();x.error?j(Error(JSON.stringify(x.error))):r(x.result.data);}});ws.send(JSON.stringify({id:2,method:'Page.printToPDF',params:{printBackground:true,preferCSSPageSize:true}}));});fs.writeFileSync('generated-artifacts/nuvia-studio/synthetic-monthly-print.pdf',Buffer.from(pdf,'base64'));ok(Buffer.from(pdf,'base64').length>10000,'standalone report actual PDF print generated');}
 ok(b.errors.length===0,'activity/report console clean');console.log(`PASS ${count} activity/browser checks: five real card interactions, three stages, pauses/returns, report iframe rendered and full PDF print.`);
}finally{b.close();}
