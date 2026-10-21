import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browser,sleep} from '../nuvia-enhancement/browser-lib.mjs';
const b=await browser(9242);let checks=0;
const check=fn=>{fn();checks++;};
const state=()=>b.run('JSON.parse(localStorage.getItem("nuvia:personal-monthly:v1:review"))');
const go=async path=>{await b.call('Page.navigate',{url:`https://${process.env.REPLIT_DEV_DOMAIN}${path}`});await b.wait(path.startsWith('/enhancement')?'!!document.querySelector(".nx-root")':'!!document.querySelector(".pm-root")');await sleep(150);};
const clickExpr=async expr=>{await b.wait(`!!(${expr})`);await b.run(`(${expr}).click()`);await sleep(140);};
const fold=async text=>clickExpr(`Array.from(document.querySelectorAll('summary')).find(e=>e.textContent.trim()===${JSON.stringify(text)})`);
const capture=async name=>{const shot=await b.call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`screenshots/personal/${name}.png`,Buffer.from(shot.data,'base64'));};
try{
 await b.viewport(1440,1000);await go('/personal-monthly.html?review=1');await b.click('[data-testid=guide-skip]');await b.clickText('고등학생');
 await b.fill('[data-testid=new-title]','수학 시험범위 1~3단원');await b.click('[data-testid=add-task]');
 let s=await state(),c=s.lab.students['student-a'].cards.at(-1);await b.click(`[data-testid=card-${c.id}] .pm-open`);
 await b.fill('[data-testid=first-action]','1단원 핵심 정리');await b.fill('[data-testid=scope]','1단원 문제 3개');await b.click('[data-testid=core-save]');
 await fold('기본 정보 고치기');const end=await b.run('(()=>{const d=new Date();d.setDate(d.getDate()+4);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")})()');
 await b.fillLabel('최종 마감',end);await b.fillLabel('중간 마감',end);await b.click('[data-testid=base-save]');
 const cardCount=(await state()).lab.students['student-a'].cards.length;
 await fold('남은 날에 나눠 보기 (제안)');await b.click('[data-testid=split-make]');s=await state();check(()=>assert.equal(s.lab.students['student-a'].cards.length,cardCount));
 await b.inputExpr('document.querySelector("input[aria-label=\'1번 분량\']")','1단원 1~3번');
 await b.fillLabel('나누는 이유','실제 가용 시간에 맞춰 나누기');
 const partsCount=await b.run('document.querySelector("[data-testid=split-planner] tbody").children.length');
 await b.run('(()=>{const button=document.querySelector("[data-testid=split-accept]");button.click();button.click()})()');await sleep(200);s=await state();check(()=>assert.equal(s.lab.students['student-a'].cards.length,cardCount+partsCount));
 await b.run('scrollTo(0,document.querySelector("[data-testid=detail-"+'+JSON.stringify(c.id)+'+"]").offsetTop)');await capture('high-school-editable-division');
 // QA language change must not discard typed (not yet saved) action, scope or current page.
 await b.fill('[data-testid=first-action]','ខ្ញុំកំពុងរៀន — '+('مرحلة طويلة '.repeat(12)));const draftText=await b.run('document.querySelector("[data-testid=first-action]").value');
 await b.clickText('ar');s=await state();check(()=>assert.equal(s.lab.language,'ar'));const afterLang=await b.run('document.querySelector("[data-testid=first-action]").value');check(()=>assert.equal(afterLang,draftText));
 await b.viewport(360,874);const overflow=await b.run('document.documentElement.scrollWidth-innerWidth');check(()=>assert(overflow<=1));await capture('long-rtl-360');
 await b.clickText('ko');await b.click('[data-testid=start]');await sleep(1200);
 s=await state();const activeId=s.lab.students['student-a'].runs.at(-1).id;
 await b.clickText('en');s=await state();check(()=>assert.equal(s.lab.language,'en'));check(()=>assert.equal(s.lab.students['student-a'].runs.at(-1).id,activeId));check(()=>assert.equal(s.lab.students['student-a'].runs.at(-1).phase,'running'));await b.clickText('ko');
 await go('/personal-monthly.html?review=1');s=await state();check(()=>assert.equal(s.lab.students['student-a'].runs.at(-1).phase,'paused'));
 const timeBefore=s.lab.students['student-a'].runs.at(-1).segments.reduce((n,v)=>n+Date.parse(v.end)-Date.parse(v.start),0);await sleep(1400);s=await state();const timeAfter=s.lab.students['student-a'].runs.at(-1).segments.reduce((n,v)=>n+Date.parse(v.end)-Date.parse(v.start),0);check(()=>assert.equal(timeBefore,timeAfter));
 await b.click('[data-testid=resume]');await b.click('[data-testid=review-run]');await b.clickText('아직 남았어요');await b.clickText('오늘은 여기까지');await b.click('[data-testid=close-run]');
 await b.clickText('월간 예시 불러오기');await b.clickText('바꾸기');await b.click('[data-testid=tab-month]');await b.click('[data-testid=make-draft]');
 for(const width of [1440,768,360]){
  await b.viewport(width,width===1440?1000:874);await b.click('[data-testid=tab-month]');
  await b.run('document.querySelector("[aria-label=\'월간 목표\']").scrollIntoView({block:"start"})');await capture(`monthly-${width}`);
  const monthOverflow=await b.run('document.documentElement.scrollWidth-innerWidth');check(()=>assert(monthOverflow<=1));
  if(width===1440)await capture('monthly-two-areas-desktop');
  await b.run('document.querySelector("[aria-label=\'다음 달 초안\']").scrollIntoView({block:"start"})');await capture(`next-month-${width}`);
  const draftOverflow=await b.run('document.documentElement.scrollWidth-innerWidth');check(()=>assert(draftOverflow<=1));
  if(width===1440)await capture('next-month-draft-desktop');
  await b.click('[data-testid=tab-report]');await b.run('document.querySelector("[aria-label=\'월간 보고서\']").scrollIntoView({block:"start"})');await capture(`report-${width}`);
  const reportOverflow=await b.run('document.documentElement.scrollWidth-innerWidth');check(()=>assert(reportOverflow<=1));
 }
 // Same-data comparison via actual UI fixtures, previous source/store untouched.
 await b.viewport(1440,1000);await b.clickText('이전 화면과 같은 데이터');await b.clickText('바꾸기');await b.click('[data-testid=tab-today]');s=await state();
 const planned=s.lab.students['student-a'].cards.map(c=>({title:c.title,minutes:c.minutes,status:c.status}));await b.run('document.querySelector("[aria-label=\'오늘 블록\']").scrollIntoView({block:"start"})');await capture('same-data-personal-monthly');
 await go('/enhancement.html');const old=await b.run('JSON.parse(localStorage.getItem("nuvia:enhancement:synthetic:v1"))');check(()=>assert.deepEqual(old.students['student-a'].cards.map(c=>({title:c.title,minutes:c.minutes,status:c.status})),planned));check(()=>assert.deepEqual(old.students['student-a'].assessment,s.lab.students['student-a'].assessment));check(()=>assert.equal(old.students['student-a'].dailyCapacity,s.lab.students['student-a'].dailyCapacity));
 await b.run('document.querySelector(".nx-board").scrollIntoView({block:"start"})');await capture('same-data-previous-enhancement');
 check(()=>assert.deepEqual(b.errors,[]));console.log(`PASS supplemental ${checks}: editable high-school division before/after approval and dedup; long Khmer/Arabic draft + RTL; paused reload no offline time; same data previous/new actual capture.`);
}finally{b.close();}
