import {browser} from './browser-lib.mjs';
const b=await browser(9237);
try{
 await b.viewport(1440,1000);await b.go('/enhancement.html');
 await b.run(`(async()=>{const {validateLab}=await import('/src/enhancement/persistence.ts');const d=JSON.parse(localStorage.getItem('nuvia:enhancement:synthetic:v1'));d.students['student-a'].cards[1].firstAction='첫 장 제목 쓰기';validateLab(d);localStorage.setItem('nuvia:enhancement:synthetic:v1',JSON.stringify(d));})()`);
 await b.go('/enhancement.html');await b.image('same-data-enhancement');
 // These are synthetic comparison fixtures, never imported into a user's existing browser.
 await b.run(`(async()=>{const w=await import('/src/official/adaptive/workspace.ts');const e=await import('/src/official/adaptive/engine.ts');const tb=await import('/src/official/adaptive/timeBlocks.ts');
 const scope=w.scopeFor('demo',e.DEMOS[0],'B'),data=w.blankWorkspace(scope);data.dailyCapacity=90;
 const c=w.createTask('자료 읽고 핵심 고르기','자료 한 쪽');c.subject='프로젝트';c.minutes=10;c.status='done';c.actualMinutes=10;c.steps.forEach(s=>s.done=true);c.completedAt=new Date().toISOString();c.timeBlock={...tb.newTimeBlock('16:00',10),phase:'closed',completed:true,endedAt:c.completedAt,confirmedActualMinutes:10};c.learningScope='자료 한 쪽';
 const p=w.createTask('발표 자료 준비하기','첫 장 제목 쓰기');p.subject='프로젝트';p.minutes=25;p.timeBlock=tb.newTimeBlock('16:10',25);
 data.tasks=[c,p];w.validateWorkspace(data,scope);localStorage.setItem(w.storageKey(scope),JSON.stringify(data));sessionStorage.setItem('nuvia:demo-view',JSON.stringify({demo:0,band:'B',lower:false}));})()`);
 await b.call('Page.navigate',{url:`https://${process.env.REPLIT_DEV_DOMAIN}/`});
 await b.wait('!!document.body?.textContent.includes("발표 자료 준비하기")');await b.image('same-data-approved-b-v2');
 console.log('PASS: actual, unmodified approved B v2 / enhancement same synthetic task-title, first-action, 10+25/90-minute and PASS-score fixtures captured.');
}finally{b.close();}
