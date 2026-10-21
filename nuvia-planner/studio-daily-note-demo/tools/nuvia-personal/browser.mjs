import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browser,sleep} from '../nuvia-enhancement/browser-lib.mjs';
const b=await browser(9241),dir='/tmp/nuvia-personal-downloads-'+process.pid;fs.mkdirSync(dir,{recursive:true});fs.mkdirSync('screenshots/personal',{recursive:true});
b.clickExpr=async expr=>{await b.wait(`!!(${expr})`);const pos=await b.run(`(()=>{const e=${expr};e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await b.call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...pos});await b.call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...pos});await sleep(100);};
let checks=0,review=false;
const check=fn=>{fn();checks++;};
const state=()=>b.run(`JSON.parse(localStorage.getItem("nuvia:personal-monthly:v1:${review?'review':'personal'}"))`);
const go=async(path='/personal-monthly.html')=>{review=path.includes('review=1');await b.call('Page.navigate',{url:`https://${process.env.REPLIT_DEV_DOMAIN}${path}`});await b.wait('!!document.querySelector(".pm-root")');await sleep(220);};
const image=async name=>{await b.run('scrollTo(0,0)');const shot=await b.call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('screenshots/personal/'+name+'.png',Buffer.from(shot.data,'base64'));};
const detail=async text=>b.clickExpr(`Array.from(document.querySelectorAll('summary')).find(e=>e.textContent.trim()===${JSON.stringify(text)})`);
const chooseCard=async()=>{const s=await state(),c=s.lab.students['student-a'].cards.at(-1);await b.click(`[data-testid="card-${c.id}"] .pm-open`);return c;};
const create=async title=>{await b.fill('[data-testid=new-title]',title);await b.click('[data-testid=add-task]');return chooseCard();};
async function closeRun(){
 await b.click('[data-testid=review-run]');await b.clickText('아직 남았어요');await b.clickText('오늘은 여기까지');await b.click('[data-testid=close-run]');
}
async function profile(target){
 await detail('합성 프로필 (네 영역)');
 const map={planning:'할 만큼 정하기',attention:'지금 한 가지',simultaneous:'전체 연결하기',successive:'단계대로 해보기'};
 if(target!=='integrated')await b.clickExpr(`Array.from(document.querySelector('[data-testid=profile-controls]').querySelectorAll('.pm-row')).find(e=>e.querySelector('b')?.textContent===${JSON.stringify(map[target])}).querySelectorAll('button')[2]`);
 await b.clickText('이 프로필 적용');
}
try{
 await b.call('Page.setDownloadBehavior',{behavior:'allow',downloadPath:dir});
 await b.viewport(1440,1000);await go();
 const reviewVisible=await b.run('!!document.querySelector("[data-testid=review-panel]")');check(()=>assert.equal(reviewVisible,false));
 await b.click('[data-testid=guide-skip]');await create('수학 숙제 54쪽 1~3번');
 await b.fill('[data-testid=first-action]','1번 조건 읽기');await b.fill('[data-testid=scope]','1~3번');await b.click('[data-testid=core-save]');await b.click('[data-testid=plan-confirm]');
 await image('personal-desktop-1440');
 await b.run('document.querySelector("[data-testid=start]").click();document.querySelector("[data-testid=start]")?.click()');await sleep(250);
 let s=await state();check(()=>assert.equal(s.lab.students['student-a'].runs.length,1));
 await b.click('[data-testid=pause]');await detail('멈춘 자리 표시 (선택)');await b.inputExpr('document.querySelector("input[aria-label=\'멈춘 자리\']")','2번 조건부터');await b.click('[data-testid=flag-save]');
 await go();s=await state();check(()=>assert.equal(s.lab.students['student-a'].runs[0].flag,'2번 조건부터'));await b.click('[data-testid=resume]');
 await b.viewport(360,874);await image('execution-mobile-360');await closeRun();s=await state();
 check(()=>assert.equal(s.entries.length,1));check(()=>assert.equal(s.entries[0].status,'performed'));check(()=>assert.equal(s.lab.students['student-a'].round,1));
 await b.click('[data-testid=tab-month]');await b.fill('[data-testid=goal-count]','4');await b.click('[data-testid=goal-save]');s=await state();check(()=>assert.equal(s.agreements[0].count,4));
 await image('monthly-mobile-360');await b.click('[data-testid=make-draft]');const before=(await state()).lab.students['student-a'].cards.length;
 await b.click('[data-testid=accept-draft]');await sleep(100);s=await state();check(()=>assert.equal(s.lab.students['student-a'].cards.length,before+1));check(()=>assert.equal(s.drafts[0].status,'accepted'));
 await b.click('[data-testid=tab-report]');await b.click('[data-testid=report-download]');await sleep(400);
 check(()=>assert(fs.existsSync(dir+'/NUVIA_monthly_'+s.entries[0].localDate.slice(0,7)+'.html')));
 const report=await b.run('document.querySelector("[data-testid=report-preview]").srcdoc');check(()=>assert(report.includes('1/4회')));check(()=>assert(!report.includes('scoreSystem')));
 await b.click('[data-testid=share-preview]');const sharedDoc=await b.run('document.querySelector("iframe[title=\'공유 미리보기\']").srcdoc');check(()=>assert(sharedDoc.includes('공유할 항목을 선택하지 않았습니다.')));
 await b.viewport(1440,1000);await image('report-desktop-1440');
 await b.call('Emulation.setEmulatedMedia',{media:'print'});const pdf=await b.call('Page.printToPDF',{printBackground:true});fs.writeFileSync('generated-artifacts/nuvia-personal/monthly-print.pdf',Buffer.from(pdf.data,'base64'));await b.call('Emulation.setEmulatedMedia',{media:''});
 await b.click('[data-testid=personal-backup]');await sleep(350);
 const backupPath=dir+'/NUVIA_my_records.json',backup=JSON.parse(fs.readFileSync(backupPath,'utf8'));check(()=>assert(!backup.data.lab));check(()=>assert(!backup.data.lessons));check(()=>assert(backup.data.student));
 await b.click('[data-testid=tab-today]');await create('복원 후 없어져야 하는 임시 과제');
 const upload=async file=>{await b.call('DOM.enable');const doc=await b.call('DOM.getDocument'),q=await b.call('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'[data-testid=personal-restore]'});await b.call('DOM.setFileInputFiles',{nodeId:q.nodeId,files:[file]});await sleep(300);};
 await b.run('window.confirm=()=>true');await upload(backupPath);s=await state();check(()=>assert.equal(s.lab.students['student-a'].cards.length,backup.data.student.cards.length));
 const damaged=dir+'/damaged.json';fs.writeFileSync(damaged,fs.readFileSync(backupPath,'utf8').replace('수학 숙제','무단 변경'));const validState=await state();await upload(damaged);s=await state();check(()=>assert.deepEqual(s,validState));
 console.log('PASS UI normal personal title→proof→start/pause/flag/reconnect/resume/end→monthly goal→next draft accept→report/print/selective share→personal backup restore/reject.');
 for(const [stage,target] of [['middle','attention'],['high','successive'],['adult','simultaneous'],['adult','integrated']]){
  await go('/personal-monthly.html?review=1');
  if(await b.run('!!document.querySelector("[data-testid=guide-skip]")'))await b.click('[data-testid=guide-skip]');
  await b.clickText({middle:'중학생',high:'고등학생',adult:'대학·성인'}[stage]);await profile(target);
  const card=await create(stage==='adult'?'프로젝트 인계 자료 준비':'과학 수행평가 자료 준비');
  await b.fill('[data-testid=first-action]','자료 제목 읽기');await b.fill('[data-testid=scope]','자료 한 장');await b.click('[data-testid=core-save]');
  if(target==='attention')await b.click('[data-testid=action-confirm]');
  if(target==='successive'){await b.inputExpr('document.querySelector("input[aria-label=\'단계 1\']")','자료 확인');await b.inputExpr('document.querySelector("input[aria-label=\'단계 2\']")','발표 정리');await b.click('[data-testid=steps-confirm]');await b.clickText('자료 확인');}
  if(target==='simultaneous'){
   await b.clickExpr('Array.from(document.querySelectorAll(".pm-check")).find(e=>e.textContent.trim()==="목표").querySelector("input")');await b.inputExpr('document.querySelector("input[aria-label=\'목표 내용\']")','전달할 내용 정리');
   await b.clickExpr('Array.from(document.querySelectorAll(".pm-check")).find(e=>e.textContent.trim()==="자료").querySelector("input")');await b.inputExpr('document.querySelector("input[aria-label=\'자료 내용\']")','실제로 읽은 표');
   await b.fillLabel('두 항목의 관계','표를 근거로 설명');await b.click('[data-testid=links-confirm]');
  }
  if(target==='integrated')await b.click('[data-testid=plan-confirm]');
  if(stage==='adult'){await detail('맡은 일과 기다림 (선택)');await b.fillLabel('책임자','가상 담당');await b.fillLabel('먼저 끝나야 하는 일','표 확인');await b.click('[data-testid=adult-save]');s=await state();check(()=>assert.equal(s.lab.students['student-a'].cards.at(-1).dependency,'표 확인'));}
  await b.viewport(1440,1000);await image(`activity-${stage}-${target}`);await b.click('[data-testid=start]');await b.click('[data-testid=pause]');await go('/personal-monthly.html?review=1');await b.click('[data-testid=resume]');await closeRun();s=await state();
  check(()=>assert.equal(s.entries.at(-1).status,'performed'));check(()=>assert.equal(s.lab.students['student-a'].stage,stage));
  console.log(`PASS actual UI ${stage}/${target}: real input/confirm/start/pause/reconnect/resume/close/proof.`);
 }
 await b.clickText('월간 예시 불러오기');await b.clickText('바꾸기');await b.click('[data-testid=tab-month]');
 await image('monthly-two-areas-desktop');await b.click('[data-testid=make-draft]');await image('next-month-draft-desktop');
 const normalBefore=await b.run('JSON.parse(localStorage.getItem("nuvia:personal-monthly:v1:personal")).entries.length');check(()=>assert.equal(normalBefore,1));
 await b.click('[data-testid=tab-today]');
 for(const width of [1440,768,360]){
  await b.viewport(width,width===1440?1000:874);await image(`today-${width}`);
  const sizes=await b.run('({w:innerWidth,scroll:document.documentElement.scrollWidth})');check(()=>assert(sizes.scroll<=sizes.w+1,JSON.stringify(sizes)));
 }
 await b.run('document.querySelector("[data-testid=new-title]").focus()');await b.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await b.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 const focused=await b.run('document.activeElement!==document.body');check(()=>assert(focused));
 await b.call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});const reduced=await b.run('matchMedia("(prefers-reduced-motion: reduce)").matches');check(()=>assert(reduced));
 check(()=>assert.deepEqual(b.errors,[]));console.log(`PASS browser ${checks} checks, console errors ${b.errors.length}; actual captures saved.`);
}finally{b.close();}
