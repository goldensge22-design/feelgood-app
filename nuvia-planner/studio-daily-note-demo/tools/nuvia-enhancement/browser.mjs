import assert from 'node:assert/strict';
import {browser,sleep} from './browser-lib.mjs';
const b=await browser();
let checks=0;
const ok=(value,message)=>{assert(value,message);checks++;};
const a=async()=> (await b.state()).students['student-a'];
const latest=async()=> (await a()).runs.at(-1);
const tick=async(name,fn)=>{await fn();console.log('PASS browser:',name);};
try{
 await b.viewport(1440,1000);await b.go('/enhancement.html');
 await tick('isolated capacity 10+25+55=90; real planning input, save, start',async()=>{
  const s=await a();ok(s.dailyCapacity===90&&s.cards.length===2,'initial synthetic shelf');
  await b.image('plan-1440');
  await b.fillLabel('어디까지?','발표 첫 두 장','document.querySelector(".nx-detail")');
  await b.fillLabel('가장 먼저 할 행동','발표 주제 한 줄 쓰기','document.querySelector(".nx-detail")');
  await b.click('[data-testid="button-planning-confirm"]');
  ok((await a()).cards.at(-1).evidence.planConfirmed,'explicit plan confirmed');
  await b.run('const start=document.querySelector("[data-testid=button-start]");start.click();start.click()');await sleep(500);
  ok((await latest()).phase==='running','timer starts');ok((await a()).round===0,'start cannot advance');
  ok((await a()).runs.length===1,'rapid double start never duplicates an execution');
  ok((await b.run('document.querySelector("[data-testid=text-current-action]").textContent')).includes('주제 한 줄'),'actual chosen action shown');
  await b.image('execution-1440');
 });
 await tick('pause, flag, refresh, preserved time and resume, explicit incomplete close',async()=>{
  await b.click('[data-testid="button-pause"]');const r=await latest();
  await b.run('document.querySelector(".nx-now details").open=true');
  await b.fill('[aria-label="걸린 점"]','두 번째 장에서 이어가기');await b.clickText('표시');
  await b.go('/enhancement.html');ok((await latest()).phase==='paused','pause reload');
  await b.wait('!!document.querySelector("[data-testid=button-resume]")');
  ok((await latest()).flag==='두 번째 장에서 이어가기','flag persisted');
  await b.click('[data-testid="button-resume"]');
  ok((await latest()).id===r.id,'same run resumed');ok((await latest()).returns===1,'real return counted');
  await b.click('[data-testid="button-review"]');
  await b.click('[data-testid="button-completion-no"]');await b.click('[data-testid="button-next-today"]');
  await b.fillLabel('실제로 쓴 시간','2.5');await b.fillLabel('한 줄 돌아보기','두 장씩 하니 시작하기 쉬웠어요');await b.fillLabel('다음엔 이렇게','두 장씩 나누기');
  await b.click('[data-testid="button-close-run"]');
  ok((await latest()).actualMinutes===2.5,'actual correction saved');ok((await a()).round===1,'performed after execution only');
  ok((await a()).experiences.some(e=>e.fact==='멈춘 뒤 다시 이어갔어요'),'real return fact');
  await b.go('/enhancement.html');ok((await latest()).phase==='closed','closed reload');ok((await a()).round===1,'round survives no duplicate');
 });
 await tick('subjective method, goal schedule idempotence, real experience edit/select, exploration',async()=>{
  await b.click('[data-testid="tab-reflect"]');
  await b.fillLabel('방법 이름','두 장씩 나누기');await b.clickText('도움 됐어요');
  await b.click('[data-testid^="button-save-method-"]');ok((await a()).methods.some(m=>m.name==='두 장씩 나누기'),'method stored');
  await b.click('[data-testid="tab-everyday"]');await b.image('everyday-initial');
  await b.run('document.querySelector(".nx-goalform").closest("details").open=true');
  await b.fillLabel('멀리 있는 목표','내 생각을 분명히 설명하기');await b.fillLabel('중간 목표','발표를 한 번 해보기');await b.fillLabel('이번 주 할 일','목차 두 줄 적기');await b.clickText('목표 추가');
  await b.clickText('오늘 블록으로 넣기');
  ok((await a()).goals.length===1&&!!(await a()).goals[0].cardId,'one selected goal scheduled');
  await b.run('Array.from(document.querySelectorAll("details")).find(e=>e.querySelector("summary")?.textContent==="새 경험 쓰기").open=true');
  await b.fillLabel('상황','발표를 준비하면서');await b.fillLabel('내 역할','자료 조사 담당');await b.fillLabel('내가 한 행동','표 두 개를 비교했어요');await b.fillLabel('결과','설명할 근거를 골랐어요');
  await b.clickText('경험 저장');
  ok((await a()).experiences.some(e=>e.action==='표 두 개를 비교했어요'),'experience actual user text saved');
  for(const [label,value] of [['후보 1','전공 후보 가'],['후보 2','전공 후보 나'],['공통점','자료 읽기'],['다른 점','확인할 내용이 다름'],['더 알고 싶은 질문','수업에서는 무엇을 하나요?'],['이번 주 해볼 행동','공식 학과 소개 읽기']])await b.fillLabel(label,value);
  await b.clickText('탐색 저장');
  await b.image('everyday-1440');
  await b.go('/enhancement.html');ok((await a()).exploration.action==='공식 학과 소개 읽기','exploration saved across reconnect');
  await b.click('[data-testid="tab-everyday"]');const before=(await a()).cards.length;
  await b.clickText('플래너에서 실행하기');ok((await a()).cards.length===before,'action-card opens same planner task without duplication');
 });
 await tick('teacher 1 / student 2 overnight class, preview, feedback, help, revoke/end without deleting cards',async()=>{
  await b.click('[data-testid="button-role-teacher"]');await b.fill('[data-testid="input-lesson-title"]','합성 1박2일 발표 캠프');
  await b.clickText('1박2일 캠프');await b.click('[data-testid="button-create-lesson"]');
  await b.clickText('공개하고 코드 만들기');
  const lesson=(await b.state()).lessons.at(-1);ok(lesson.activities.includes('둘째날'),'actual two-day template');
  for(const sid of ['student-a','student-b']){
   await b.click(`[data-testid="button-role-${sid}"]`);await b.click('[data-testid="tab-class"]');
   await b.fill('[data-testid="input-join-code"]',lesson.code);await b.clickText('참여');
   await b.clickText('맞아요');
   await b.clickText('이 수업 블록을 내 계획에 넣기');
   const student=(await b.state()).students[sid],c=student.cards.find(c=>c.sourceClassId===lesson.id);
   ok(!!c,'class linked card created');
   // Use the actual linked card, not a duplicate personal task.
   await b.click('[data-testid="tab-plan"]');
   if(!await b.run(`!!document.querySelector('[data-testid="detail-${c.id}"]')`))await b.click(`[data-testid="card-block-${c.id}"] .nx-open`);
   if(sid==='student-a'){
    await b.fillLabel('어디까지?','발표 첫 장','document.querySelector(".nx-detail")');await b.fillLabel('가장 먼저 할 행동','표 제목 쓰기','document.querySelector(".nx-detail")');await b.click('[data-testid="button-planning-confirm"]');
   }else{await b.fill('.pn-attention input','표 제목 쓰기');await b.clickText('이걸로 고르기');}
   await b.click('[data-testid="button-start"]');await b.click('[data-testid="button-pause"]');
   await b.run('document.querySelector(".nx-now details").open=true');
   await b.fill('[aria-label="걸린 점"]','내일 표 제목 다음부터');await b.clickText('표시');
   await b.go('/enhancement.html');await b.click('[data-testid="tab-class"]');await b.clickText('2일차');
   ok((await b.state()).students[sid].campDays[lesson.id]===2,'camp day saved');
   await b.clickText('이어서 하기');await b.click('[data-testid="button-resume"]');await b.click('[data-testid="button-review"]');
   await b.click('[data-testid="button-completion-no"]');await b.click('[data-testid="button-next-today"]');await b.fillLabel('한 줄 돌아보기','표 제목을 고르고 다시 이어했어요');await b.click('[data-testid="button-close-run"]');
   await b.click('[data-testid="tab-class"]');
   await b.run('Array.from(document.querySelectorAll("details")).find(e=>e.querySelector("summary")?.textContent==="선생님에게 공유하기").open=true');
   ok(!(await b.run('document.querySelector("[data-testid=button-share]").disabled===false')),'no preselected share');
   await b.click('.nx-card details label.nx-checkline input');
   await b.click('[data-testid="button-share"]');
   await b.run('Array.from(document.querySelectorAll("details")).find(e=>e.querySelector("summary")?.textContent?.includes("도움 요청")).open=true');
   await b.fillLabel('어디에서 막혔나요?','근거 자료 고르기');await b.fillLabel('어떤 도움이 필요해요?','질문 하나를 같이 보기');await b.clickText('요청 보내기');
  }
  await b.click('[data-testid="button-role-teacher"]');ok((await b.state()).shared.length===2,'two distinct snapshots');
  ok(!(await b.run('document.querySelector(".nx-page").textContent')).includes('내일 표 제목 다음부터'),'private return flags never visible to teacher');
  await b.fill('[aria-label="피드백"]','처음 고른 자료의 이유를 알려 주세요');await b.fill('[aria-label="다음 날짜"]','2026-10-23');await b.clickText('피드백 보내기');
  await b.fill('[aria-label="답"]','자료의 출처부터 같이 볼까요?');await b.clickText('답하기');
  await b.image('teacher-shared-1440');
  await b.click('[data-testid="button-role-student-a"]');await b.click('[data-testid="tab-class"]');await b.clickText('공유 철회');
  await b.click('[data-testid="button-role-teacher"]');ok((await b.state()).shared.length===1,'withdraw removed teacher share');
  const count=(await a()).cards.length;
  await b.run('window.confirm=()=>true');await b.clickText('수업 끝내기');
  ok((await b.state()).shared.length===0,'end removes classroom snapshots');
  await b.click('[data-testid="button-role-student-a"]');await b.go('/enhancement.html');ok((await a()).cards.length===count,'personal cards survive camp end/reconnect');
 });
 console.log('BROWSER basic checks:',checks,'errors:',b.errors);
 assert.deepEqual(b.errors,[]);
}finally{b.close();}
