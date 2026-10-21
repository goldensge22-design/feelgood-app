import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browser} from './browser-lib.mjs';
const b=await browser(9232);
let checks=0;const ok=(v,m)=>{assert(v,m);checks++;};
const student=async()=> (await b.state()).students['student-a'];
const axes=['planning','attention','simultaneous','successive'];
try{
 await b.viewport(1440,1000);await b.go('/enhancement.html');await b.image('same-data-enhancement');
 for(const [i,stage,target] of [
  [0,'elementary_1_3','planning'],[1,'elementary_4_6','attention'],
  [2,'middle','simultaneous'],[3,'high','successive'],[4,'adult','integrated']
 ]){
  await b.reset();await b.go('/enhancement.html?qa=1');
  await b.fill('.nx-qa > label select',stage);
  for(const [j,axis] of axes.entries())await b.inputExpr(`document.querySelectorAll(".nx-qa .nx-row select")[${j}]`,axis===target?'low':'mid');
  await b.clickText('표본 적용');await b.go('/enhancement.html?qa=1&view=plan');
  ok((await student()).stage===stage,'real age choice stored');ok(!(await student()).cards.at(-1).evidence.planConfirmed,'no preset credit');
  if(target==='planning'||target==='integrated'){
   await b.fillLabel('어디까지?','발표 첫 두 장','document.querySelector(".nx-detail")');await b.fillLabel('가장 먼저 할 행동','첫 장 제목 쓰기','document.querySelector(".nx-detail")');
   await b.click(`[data-testid="button-${target}-confirm"]`);
   // Explicitly change a real scope/time, not just confirm a default.
   await b.fillLabel('어디까지?','발표 첫 장과 출처','document.querySelector(".nx-detail")');await b.clickText('15분','document.querySelector(".nx-detail")');
   await b.click(`[data-testid="button-${target}-confirm"]`);
  }else if(target==='attention'){
   await b.fill('.pn-attention input','지금은 제목 한 줄 쓰기');await b.clickText('이걸로 고르기');
  }else if(target==='simultaneous'){
   await b.fill('[data-testid="input-link-목표"]','내 생각을 근거와 함께 설명하기');await b.fill('[data-testid="input-link-자료"]','직접 고른 비교 표');
   await b.fillLabel('어떻게 이어져 있나요?','비교 표에서 설명의 근거 하나를 골라 발표에 써요');await b.click('[data-testid="button-links-confirm"]');
  }else{
   await b.fill('.nx-steps li:nth-child(1) input','자료에서 근거 고르기');await b.fill('.nx-steps li:nth-child(2) input','발표 제목 적기');
   await b.click('.nx-steps li:nth-child(2) button[aria-label="위로"]');await b.click('[data-testid="button-steps-confirm"]');await b.click('.nx-progress button');
   ok((await student()).cards.at(-1).steps[0].title==='발표 제목 적기','internal steps reordered independently');
  }
  await b.run('document.querySelector(".nx-detail").scrollIntoView({block:"start"})');
  // Capture actual filled target panels, not generated images or read-only examples.
  await b.call('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(`screenshots/enhancement/target-${target}.png`,Buffer.from(r.data,'base64')));
  await b.click('[data-testid="button-start"]');const original=(await student()).runs.at(-1);
  await b.click('[data-testid="button-pause"]');await b.go('/enhancement.html?qa=1&view=plan');
  ok((await student()).runs.at(-1).id===original.id&& (await student()).runs.at(-1).phase==='paused','age pause and reconnect preserved');
  await b.click('[data-testid="button-resume"]');await b.click('[data-testid="button-review"]');
  await b.click('[data-testid="button-completion-no"]');await b.click('[data-testid="button-next-today"]');await b.fillLabel('한 줄 돌아보기',stage+'에서 내 방법을 해봤어요');await b.click('[data-testid="button-close-run"]');
  ok((await student()).round===1,'target actually practiced and ended');ok((await student()).runs.at(-1).evidenceStatus==='performed','real target evidence');
  await b.click('[data-testid="tab-plan"]');await b.click('[data-testid="button-start"]');
  ok((await student()).runs.length===2,'restart independent execution');
  await b.click('[data-testid="button-review"]');await b.click('[data-testid="button-completion-no"]');await b.click('[data-testid="button-next-today"]');await b.click('[data-testid="button-close-run"]');
  ok((await student()).round===1,'no stale evidence carried to next round');
  console.log('PASS actual input/edit/start/pause/reload/resume/end/reflection/restart:',stage,target);
 }
 await b.reset();await b.go('/enhancement.html?qa=1');await b.image('four-targets-qa-board');
 await b.go('/enhancement.html?qa=1&view=plan');
 for(const width of [1440,768,360]){
  await b.viewport(width,width===360?874:1000);
  await b.fillLabel('어디까지?','아주 긴 과제 분량을 직접 확인하며 이번에 실제로 할 일만 한 문장으로 적어 두기','document.querySelector(".nx-detail")');
  await b.fillLabel('가장 먼저 할 행동','설명에 필요한 자료를 펴고 제목 한 줄 읽기','document.querySelector(".nx-detail")');
  await b.click('[data-testid="button-planning-confirm"]');
  ok(await b.run('document.documentElement.scrollWidth<=innerWidth+1'),'no horizontal overflow '+width);
  await b.image('plan-'+width);
 }
 await b.click('[data-testid="button-start"]');await b.image('execution-360');
 const runId=(await student()).runs.at(-1).id,round=(await student()).round;
 for(const lang of ['en','km','ar','ko']){
  await b.fill('header select',lang);
  ok((await student()).runs.at(-1).id===runId&& (await student()).round===round,'language does not reset execution');
  ok(await b.run('document.documentElement.scrollWidth<=innerWidth+1'),'no overflow in '+lang);
  await b.image('execution-360-'+lang);
 }
 await b.click('[data-testid="button-review"]');await b.click('[data-testid="button-completion-no"]');await b.click('[data-testid="button-next-today"]');await b.click('[data-testid="button-close-run"]');
 await b.click('[data-testid="tab-plan"]');
 // A saved input draft is not remounted by changing QA language.
 await b.fill('.pn-planning input','저장 전 직접 쓰던 긴 입력도 언어 변경 때 그대로 유지하기');
 await b.fill('header select','ar');
 ok(await b.run('document.querySelector(".pn-planning input").value==="저장 전 직접 쓰던 긴 입력도 언어 변경 때 그대로 유지하기"'),'unsaved draft retained through language');
 await b.click('[data-testid="toggle-qa-long"]');ok(await b.run('document.documentElement.scrollWidth<=innerWidth+1'),'long RTL layout no overflow');await b.image('plan-360-ar-long');await b.click('[data-testid="toggle-qa-long"]');await b.fill('header select','ko');
 await b.viewport(1440,1000);
 ok(await b.run('Array.from(document.querySelectorAll(".nx-root button")).filter(e=>e.getBoundingClientRect().height>0).every(e=>e.getBoundingClientRect().height>=44)'),'visible buttons at least 44px');
 await b.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 ok(await b.run('document.activeElement!==document.body'),'keyboard focus enters controls');
 assert.deepEqual(b.errors,[]);console.log('PASS representative/viewport/language checks:',checks);
}finally{b.close();}
