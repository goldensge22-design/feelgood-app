const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const fs=require('node:fs');const assert=require('node:assert/strict');
(async()=>{
 const {createServer}=await import('vite');
 const server=await createServer({server:{host:'127.0.0.1',port:5173,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLANNER_CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--disable-gpu','--disable-software-rasterizer']});
 const page=await browser.newPage({viewport:{width:1365,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.PLANNER_TEST_URL||'http://127.0.0.1:5173';fs.mkdirSync('qa',{recursive:true});
 const click=async id=>page.getByTestId(id).click();
 await page.goto(base);await page.getByTestId('start-training').waitFor();await page.screenshot({path:'qa/01-home.png',fullPage:true});
 const report=[];
 for(const profile of [0,1])for(const [bi,band] of ['A','B','C','D'].entries()){
  await page.goto(base);await click(`profile-${profile}`);await click(`band-${band}`);await click('start-training');
  assert.equal(await page.getByTestId(profile===0?'order-game':'attention-game').getAttribute('data-conditions'),String(bi+2));
  assert.equal(await page.getByTestId('support-panel').getAttribute('data-support'),profile===0?'simultaneous':'successive');
  await click('pause-training');assert.equal(await page.getByTestId(profile===0?'order-game':'attention-game').isVisible(),false);await click('pause-training');
  for(let round=0;round<2;round++){
   if(round===1)assert.equal(await page.locator('.ad-support-title').getAttribute('aria-expanded'),'false');
   if(profile===0){
    const n=bi+3;
    if(round===0){for(let i=n-1;i>=0;i--)await click(`task-t${i}`);await click('check-order');assert.match(await page.locator('.ad-feedback').textContent(),/수정/);for(let i=0;i<n;i++)await click('undo-order');}
    for(let i=0;i<n;i++)await click(`task-t${i}`);await click('check-order');assert.match(await page.locator('.ad-feedback').textContent(),/모든 조건/);
    if(band==='D'&&round===0)await page.screenshot({path:'qa/02-planning-adult.png',fullPage:true});
    await click('next-round');
   }else{
    const total=6+bi*2;const subject=round===0?(band==='D'?'기획':'수학'):(band==='D'?'운영':'과학');
    for(let i=0;i<total;i++){
     const text=await page.getByTestId('signal-card').textContent();
     const accept=text.includes(subject)&&text.includes('오늘 마감')&&(bi<1||text.includes('공식 요청'))&&(bi<2||text.includes('확인 완료'))&&(bi<3||text.includes('나 담당'));
     await click(accept?'signal-accept':'signal-defer');assert.match(await page.locator('.ad-feedback').textContent(),/조건에 맞게/);await click('next-signal');
    }
    await click('next-round');
   }
  }
  await page.getByTestId('real-task').fill('private-task-title');await page.getByTestId('real-first').fill('private-first-action');await page.getByTestId('real-criteria').fill('private-completion');await page.getByTestId('real-strategy-plan').fill('private-strategy-plan');await click('start-real');
  assert.equal(await page.getByTestId('save-real').isEnabled(),false);await page.getByTestId('real-strategy-review').fill('private-strategy-review');await page.getByTestId('real-actual').fill('12');await page.getByTestId('real-adjustment').selectOption({label:'같은 방법으로 도움을 줄여보기'});await click('save-real');
  await page.getByTestId('followup-domain').selectOption('생활');await page.getByTestId('followup-task').fill('private-new-task');await page.getByTestId('followup-plan').fill('private-new-plan');await click('start-followup');await page.getByTestId('followup-outcome').fill('private-new-outcome');await page.getByTestId('followup-completed').selectOption('yes');await click('save-followup');
  const records=await page.evaluate(()=>window.NUVIAPlanner.getRecords());assert.equal(records.length,3);assert.equal(records[0].context.band,band);assert.equal(records[0].context.target,profile===0?'planning':'attention');assert.equal(records[0].measures.conditions,bi+2);assert.equal(records[1].source,'self_report');assert.equal(records[2].kind,'followup_task');assert.equal(records[2].measures.previousApplicationRecordId,records[1].id);assert.equal(records[2].measures.independentSelfReport,true);assert.equal(records[2].context.transfer.history.evidenceId,profile===0?'demo-history-a':'demo-history-b');assert(!JSON.stringify(records).includes('private-'));assert.equal(records[0].measures.errors,profile===0?1:0);
  await click('tab-GROWTH');assert.equal(await page.locator('.ad-record').count(),3);
  await click(`profile-${profile===0?1:0}`);assert.equal(await page.getByTestId('start-training').isVisible(),true);await click('tab-GROWTH');assert.equal(await page.locator('.ad-record').count(),0);
  report.push(`PASS demo ${profile} / band ${band}: both rounds, pause, invalid plan, conditions, real task, isolated records`);
 }
 // Production mode must never fall back to demo controls or mock observations.
 await page.goto(base+'?mode=production');await page.getByText('검사 결과를 연결해 주세요').waitFor();assert.equal(await page.getByTestId('profile-0').count(),0);
 const assessment={schemaVersion:'1.0',assessmentId:'assessment-test',subjectId:'subject-test',profileVersion:'v1',educationStage:'high',axes:{planning:{level:'mid',value:100,unit:'표준점수'},attention:{level:'low',value:85,unit:'표준점수'},simultaneous:{level:'mid',value:104,unit:'표준점수'},successive:{level:'high',value:121,unit:'표준점수'}}};
 assert.equal((await page.evaluate(a=>window.NUVIAPlanner.setAssessment(a),assessment)).ok,true);
 await page.getByTestId('start-training').waitFor();assert.equal(await page.locator('.adaptive-shell').getAttribute('data-band'),'C');assert.match(await page.locator('.ad-profile').textContent(),/121 표준점수/);await click('start-training');assert.equal(await page.getByTestId('attention-game').getAttribute('data-conditions'),'4');
 assert.equal((await page.evaluate(()=>window.NUVIAPlanner.setAssessment({schemaVersion:'1.0'}))).ok,false);await page.getByText('검사 결과를 연결해 주세요').waitFor();assert.equal(await page.getByTestId('attention-game').count(),0);assert.deepEqual(await page.evaluate(()=>window.NUVIAPlanner.getRecords()),[]);
 await page.evaluate(a=>window.NUVIAPlanner.setAssessment(a),assessment);await page.evaluate(()=>window.NUVIAPlanner.clearAssessment());await page.getByText('검사 결과를 연결해 주세요').waitFor();report.push('PASS production: required report, automatic band and score display, invalidation clears old session, logout clears records');
 // Additional routes supplied by the official adapter.
 for(const target of ['successive','simultaneous']){
  const a=structuredClone(assessment);a.axes.attention.level='high';a.axes.successive.level='mid';a.axes[target].level='low';
  await page.evaluate(a=>window.NUVIAPlanner.setAssessment(a),a);await click('start-training');
  for(let round=0;round<2;round++){
   if(target==='successive'){await click('hide-sequence');for(let i=0;i<5;i++)await click(`task-t${i}`);await click('check-order');}
   else{const pairs=[['자료 찾기','근거 확보'],['핵심 정리','구조 이해'],['연습하기','설명 점검'],['시간 비교','계획 조정'],['역할 확인','중복 방지']];for(const [task,goal] of pairs)if(await page.getByLabel(`${task} 목적`).count())await page.getByLabel(`${task} 목적`).selectOption(goal);await page.getByRole('button',{name:'관계 확인',exact:true}).click();}
   await click('next-round');
  }
  await page.getByTestId('real-task').waitFor();report.push('PASS official route: '+target);
 }
 await page.setViewportSize({width:390,height:844});await page.goto(base);await click('profile-1');await click('band-B');await click('start-training');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'qa/03-attention-mobile.png',fullPage:true});
 await click('tab-WEEK');await click('tab-TODAY');assert.equal(await page.getByTestId('attention-game').isVisible(),true);report.push('PASS mobile 390px: no horizontal overflow; tab switching preserves game');
 assert.deepEqual(errors,[]);report.push('PASS no browser page errors');fs.writeFileSync('qa/browser-results.txt',report.join('\n'));console.log(report.join('\n'));await browser.close();await server.close();
})().catch(e=>{console.error(e);process.exit(1)});
