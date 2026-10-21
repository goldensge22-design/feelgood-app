import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browser,sleep} from '../nuvia-enhancement/browser-lib.mjs';
const b=await browser(9393);let checks=0;
const downloads=`/tmp/nuvia-insights-downloads-${process.pid}`;fs.mkdirSync(downloads,{recursive:true});
const check=fn=>{fn();checks++;};
const key='nuvia:personal-monthly:v1:review';
const state=()=>b.run(`JSON.parse(localStorage.getItem(${JSON.stringify(key)}))`);
const go=async(path='/personal-monthly.html?review=1')=>{await b.call('Page.navigate',{url:`https://${process.env.REPLIT_DEV_DOMAIN}${path}`});await b.wait('!!document.querySelector(".pm-root")');await sleep(250);};
const clickExpr=async expr=>{await b.wait(`!!(${expr})`);const point=await b.run(`(()=>{const e=${expr};e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);for(const type of ['mousePressed','mouseReleased'])await b.call('Input.dispatchMouseEvent',{type,button:'left',clickCount:1,...point});await sleep(120);};
const fold=async text=>clickExpr(`Array.from(document.querySelectorAll('summary')).find(e=>e.textContent.trim()===${JSON.stringify(text)})`);
const capture=async(name,selector)=>{if(selector)await b.run(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:"start"})`);await sleep(700);const image=await b.call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`screenshots/insights/${name}.png`,Buffer.from(image.data,'base64'));};
const last=async()=>{const s=await state();return {s,c:s.lab.students['student-a'].cards.at(-1),r:s.lab.students['student-a'].runs.at(-1)};};
async function add(title){await b.click('[data-testid=tab-today]');await b.fill('[data-testid=new-title]',title);await b.click('[data-testid=add-task]');const {c}=await last();await b.click(`[data-testid=card-${c.id}] .pm-open`);await b.fill('[data-testid=first-action]','첫 자료 펼치기');await b.fill('[data-testid=scope]','자료 2개만 정리');await b.click('[data-testid=core-save]');await b.click('[data-testid=plan-confirm]');return c.id;}
async function close(){await b.click('[data-testid=review-run]');await b.clickText('아직 남았어요');await b.clickText('오늘은 여기까지');await b.click('[data-testid=close-run]');}
try{
 await b.call('Page.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});await b.run('window.confirm=()=>true');
 await b.viewport(1440,1000);await go('/personal-monthly.html');
 let text=await b.run('document.querySelector("[data-testid=assessment-status]").textContent');check(()=>assert(text.includes('결과 없음')&&!text.includes('88')));
 await go();await b.run('window.confirm=()=>true');await b.click('[data-testid=assessment-review-toggle]');await b.click('[data-testid=assessment-example]');
 let s=await state();check(()=>assert.equal(s.insights.source.mode,'example'));text=await b.run('document.querySelector("[data-testid=assessment-values]").textContent');check(()=>assert(text.includes('88 표준점수')&&text.includes('115 표준점수')));
 await b.click('[data-testid=guide-toggle]');text=await b.run('document.querySelector("[aria-label=\'나에게 맞춘 안내\']").textContent');check(()=>assert(text.includes('실제로 할 행동')&&text.includes('이유')&&text.includes('바꿀')));
 await capture('assessment-and-personal-guide-1440','[data-testid=assessment-status]');await b.click('[data-testid=guide-skip]');
 const ids=[];const cardA=await add('내 발표 준비');let {c}=await last();
 await b.click('[data-testid=start]');await sleep(1100);await b.click('[data-testid=pause]');
 await fold('멈춘 자리 표시 (선택)');await b.fill('input[aria-label="멈춘 자리"]','자료 둘째 항목');await b.click('[data-testid=flag-save]');
 await go();s=await state();check(()=>assert.equal(s.lab.students['student-a'].runs.at(-1).phase,'paused'));check(()=>assert.equal(s.lab.students['student-a'].runs.at(-1).flag,'자료 둘째 항목'));
 await b.click('[data-testid=resume]');await sleep(600);await capture('resume-current-action-1440','[data-testid=run-panel]');await close();let x=await last();ids.push({id:x.r.id,support:x.r.support});
 check(()=>assert.equal(x.s.entries.at(-1).status,'performed'));
 for(let i=0;i<3;i++){
  await add(`다른 과제 ${i+1}`);await fold('다른 도움');await b.clickText('핵심만 또렷하게','document.querySelector("[data-testid=help-view]")');
  await b.click('[data-testid=start]');await sleep(180);await close();x=await last();ids.push({id:x.r.id,support:x.r.support});
 }
 const originalScores=JSON.stringify((await state()).lab.students['student-a'].assessment);
 await b.click('[data-testid=tab-growth]');const sid='target-planning';
 await b.fill(`[data-testid=comparison-card-${sid}]`,cardA);await b.fill(`[data-testid=comparison-example-${sid}]`,'과제 종류에 따라 다른 경험도 있어요.');
 await b.click(`[data-testid=comparison-answer-${sid}-agree]`);await b.click(`[data-testid=comparison-answer-${sid}-different]`);
 await b.click(`[data-testid=comparison-answer-${sid}-unsure]`);
 s=await state();check(()=>assert.equal(s.insights.comparisons.length,3));check(()=>assert.equal(s.insights.comparisons[1].previousId,s.insights.comparisons[0].id));check(()=>assert.equal(s.insights.comparisons[0].cardId,cardA));
 const secondCard=s.lab.students['student-a'].cards[1].id;
 await b.fill(`[data-testid=comparison-card-${sid}]`,secondCard);await b.click(`[data-testid=comparison-answer-${sid}-different]`);
 for(let i=0;i<3;i++)await b.clickText(['도움 됨','중립','도움되지 않음'][i],`document.querySelector("[data-testid=method-fb-${ids[i].id}-${ids[i].support}]")`);
 s=await state();check(()=>assert.equal(s.insights.feedback.length,3));check(()=>assert.equal(Object.keys(s.insights.contexts).length,4));
 await b.clickText('모르겠어요',`document.querySelector("[data-testid=method-fb-${ids[0].id}-${ids[0].support}]")`);
 await b.clickText('도움 됨',`document.querySelector("[data-testid=method-fb-${ids[0].id}-${ids[0].support}]")`);
 await capture('contextual-responses-1440','[aria-label="설명과 내 경험 비교"]');await capture('method-use-feedback-1440','[aria-label="써 본 도움 방식 돌아보기"]');
 await go();
 const growthVisible=await b.run('!!document.querySelector("[aria-label=\'설명과 내 경험 비교\']")');check(()=>assert(growthVisible));
 await b.run('window.confirm=()=>true');await b.click('[data-testid=personal-backup]');await sleep(200);
 const backupPath=downloads+'/NUVIA_my_records.json';check(()=>assert(fs.existsSync(backupPath)));const backed=JSON.parse(fs.readFileSync(backupPath,'utf8'));check(()=>assert(backed.data.insights.feedback.length===5&&!backed.data.lab&&!backed.data.studentB));
 const input=await b.call('DOM.getDocument'),file=await b.call('DOM.querySelector',{nodeId:input.root.nodeId,selector:'[data-testid=personal-restore]'});await b.call('DOM.setFileInputFiles',{nodeId:file.nodeId,files:[backupPath]});await sleep(180);
 check(()=>assert.equal((backed.data.insights.comparisons.length),4));s=await state();check(()=>assert.equal(s.insights.comparisons.length,4));
 // Local result contract input is NOT an authenticated server integration.
 check(()=>assert.equal(JSON.stringify(s.lab.students['student-a'].assessment),originalScores));
 await b.click('[data-testid=assessment-review-toggle]');await b.clickText('예시 형식을 입력칸에 넣기');let envelope=JSON.parse(await b.run('document.querySelector("[data-testid=assessment-json]").value'));envelope.testKind='로컬 결과 계약 검토';envelope.testDate='2026-09-12';envelope.assessment.axes.planning.value=91;
 await b.fill('[data-testid=assessment-json]',JSON.stringify(envelope));await b.click('[data-testid=assessment-import]');s=await state();check(()=>assert.equal(s.insights.source.mode,'input'));check(()=>assert.equal(s.insights.source.assessment.axes.planning.value,91));
 check(()=>assert.equal(s.insights.comparisons.length,4));text=await b.run('document.querySelector("[data-testid=assessment-status]").textContent');check(()=>assert(text.includes('서버 검증 아님')));
 envelope.assessment.axes.planning.unit='%';await b.fill('[data-testid=assessment-json]',JSON.stringify(envelope));await b.click('[data-testid=assessment-import]');s=await state();check(()=>assert.equal(s.insights.source.assessment.axes.planning.unit,'표준점수'));
 await b.click('[data-testid=tab-report]');let report=await b.run('document.querySelector("[data-testid=report-preview]").srcdoc');check(()=>assert(report.includes('고정된 검사 출발점')&&report.includes('나의 실행 변화')&&report.includes('다음 달 제안')));
 await b.click('[data-testid=share-preview]');const shared=await b.run('document.querySelector("iframe[title=\'공유 미리보기\']").srcdoc');check(()=>assert(!shared.includes('88 표준점수')&&!shared.includes('91 표준점수')));
 // Two completed synthetic months: 6/10 -> 8/10, not ability gain.
 await fold('월간 비교 예시 (완료된 두 달)');await b.click('[data-testid=insights-fixture]');s=await state();check(()=>assert.equal(s.entries.length,20));const months=s.agreements.map(g=>g.month).sort(),selected=months.at(-1);await b.fill('[data-testid=month-select]',selected);
 report=await b.run('document.querySelector("[data-testid=report-preview]").srcdoc');check(()=>assert(report.includes('20퍼센트포인트 증가')));check(()=>assert(report.includes('환경·난도')));
 await b.click('[data-testid=tab-month]');await b.click('[data-testid=make-draft]');await b.fill('input[aria-label=횟수]','6');await b.fill('input[aria-label=분량]','문제 하나부터');await b.clickText('고친 내용 저장');
 s=await state();check(()=>assert.equal(s.drafts[0].count,6));const before=s.lab.students['student-a'].cards.length;
 await b.click('[data-testid=accept-draft]');s=await state();check(()=>assert.equal(s.lab.students['student-a'].cards.length,before+1));
 const acceptDisabled=await b.run('document.querySelector("[data-testid=accept-draft]")?.disabled??true');check(()=>assert(acceptDisabled));
 for(const width of [1440,360]){
  await b.viewport(width,width===1440?1000:874);
  await b.click('[data-testid=tab-report]');await capture(`report-${width}`,'[aria-label="월간 보고서"]');
  let overflow=await b.run('document.documentElement.scrollWidth-innerWidth');check(()=>assert(overflow<=1));
  await b.click('[data-testid=tab-growth]');await capture(`responses-${width}`,'[aria-label="설명과 내 경험 비교"]');
  overflow=await b.run('document.documentElement.scrollWidth-innerWidth');check(()=>assert(overflow<=1));
  await b.run('document.querySelector("[data-testid=tab-today]").focus()');await b.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await b.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  const focused=await b.run('document.activeElement!==document.body');check(()=>assert(focused));
 }
 check(()=>assert.deepEqual(b.errors,[]));console.log(`PASS insights browser ${checks}: no result/explicit example/local contract input; response changes/task context; method yes/neutral/no/unsure/unanswered; execution/pause/flag/reload/resume/close; backup restore; fixed baseline/20pp/approval dedup; desktop/360/keyboard, console exceptions 0.`);
}catch(e){fs.writeFileSync('generated-artifacts/nuvia-insights/logs/browser-failure.json',JSON.stringify({state:await state(),text:await b.run('document.body.innerText'),report:await b.run('document.querySelector("[data-testid=report-preview]")?.srcdoc'),errors:b.errors},null,2));throw e;}finally{b.close();}
