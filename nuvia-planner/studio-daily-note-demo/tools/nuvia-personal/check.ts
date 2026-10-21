import assert from 'node:assert/strict';
import {createState,update,student,routeFor,stats,localDate,nextMonth,splitProposal} from '../../artifacts/nuvia-ui-review/src/personal/domain';
import {validate,exportBackup,importBackup,freezeTimers,checksum} from '../../artifacts/nuvia-ui-review/src/personal/persistence';
import {elapsed,remaining} from '../../artifacts/nuvia-ui-review/src/enhancement/domain';
import {AXES} from '../../artifacts/nuvia-ui-review/src/official/adaptive/engine';
import {reportHTML} from '../../artifacts/nuvia-ui-review/src/personal/report';
import type {PersonalState,Action,Target} from '../../artifacts/nuvia-ui-review/src/personal/model';
let checks=0,clock=Date.parse('2026-10-01T10:00:00Z'),s=createState(new Date(clock).toISOString());
const check=(fn:()=>void)=>{fn();checks++;};
function act(a:Action){clock+=1000;s=update(s,a,new Date(clock).toISOString(),s.mode==='review');validate(s);}
const cmd=(command:any)=>act({type:'legacy',command});
const p=()=>student(s),c=()=>p().cards.at(-1)!,r=()=>p().runs.at(-1)!;
function prepare(target:Target){
 if(target==='planning'||target==='integrated'){cmd({type:'card.update',cardId:c().id,changes:{scope:'수학 1~3번',firstAction:'1번 조건 읽기'}});cmd({type:'card.plan',cardId:c().id});}
 if(target==='attention')cmd({type:'card.action',cardId:c().id,action:'1번 조건 읽기'});
 if(target==='simultaneous')cmd({type:'card.links',cardId:c().id,links:['목표','자료'],items:{목표:'근거 설명하기',자료:'직접 읽은 표'},relationship:'표의 값으로 근거를 설명한다'});
 if(target==='successive'){cmd({type:'card.steps',cardId:c().id,steps:[{title:'조건 읽기'},{title:'식 세우기'}]});cmd({type:'card.progress',cardId:c().id,stepId:c().steps[0].id});}
}
function finish(){cmd({type:'run.review',runId:r().id});cmd({type:'run.close',runId:r().id,completion:'no',next:'today'});}
function fixture(done:number,goal:number,status='performed' as 'performed'|'skipped'|'unobserved'){
 const n=createState();n.mode='review';
 n.agreements=[{id:'initial',month:'2026-10',axis:'planning',count:goal,at:'2026-10-01T00:00:00Z',after:'',reason:'합성 테스트'}];
 for(let i=0;i<done;i++)n.entries.push({id:'fixture-'+i,runId:'fixture-'+i,practiceId:'fixture-'+i,axis:'planning',status,localDate:`2026-10-${String(i%14*2+1).padStart(2,'0')}`,originalDate:`2026-10-${String(i%14*2+1).padStart(2,'0')}`,enteredAt:`2026-10-${String(i%14*2+1).padStart(2,'0')}T10:00:00Z`,cardTitle:'합성 테스트',proof:['합성 목표 행동 및 종료'],optionalAttention:'unobserved',output:'',feeling:'',difficulty:'',assessment:null,corrections:[]});
 return validate(n);
}
async function main(){
 check(()=>assert.equal(p().cards.length,0));check(()=>assert.equal(p().assessment,null));
 let combinations=0;
 for(const planning of ['low','mid','high'])for(const attention of ['low','mid','high'])for(const simultaneous of ['low','mid','high'])for(const successive of ['low','mid','high']){
  s=createState();s.mode='review';const axes={planning,attention,simultaneous,successive},lows=[...AXES].reverse().filter(x=>axes[x]==='low'),highs=AXES.filter(x=>axes[x]==='high');
  cmd({type:'qa.profile',axes,supportOrder:lows,strengthOrder:highs});
  check(()=>assert.equal(routeFor(p()).target,lows[0]??'integrated'));check(()=>assert.equal(routeFor(p()).support,highs[0]??'universal'));
  const original=JSON.stringify(p().assessment);
  act({type:'create',title:'나의 실제 과제'});
  cmd({type:'run.start',cardId:c().id});check(()=>assert.equal(remaining(r(),Date.parse(r().startedAt)+999999),0));
  s=validate(JSON.parse(JSON.stringify(s)));check(()=>assert.equal(p().round,0));finish();check(()=>assert.equal(p().round,0));check(()=>assert.equal(s.entries[0].status,'unobserved'));
  for(let i=0;i<Math.max(1,lows.length)*2;i++){
   const target=lows[i%lows.length]??'integrated';check(()=>assert.equal(routeFor(p()).target,target));
   act({type:'create',title:'직접 정한 학습 과제'});prepare(target);
   cmd({type:'run.start',cardId:c().id});cmd({type:'run.pause',runId:r().id});cmd({type:'run.flag',runId:r().id,flag:'다음 식부터'});cmd({type:'run.resume',runId:r().id});finish();
   check(()=>assert.equal(p().round,i+1));check(()=>assert.equal(s.entries.at(-1)!.status,'performed'));
   const length=s.entries.length;cmd({type:'run.close',runId:r().id,completion:'no',next:'today'});check(()=>assert.equal(s.entries.length,length));
  }
  check(()=>assert.equal(routeFor(p()).target,lows[0]??'integrated'));
  // Explicit skip and changing date must not advance, including after a full rotation.
  act({type:'create',title:'건너뛰는 과제'});prepare(routeFor(p()).target);cmd({type:'card.skip',cardId:c().id});cmd({type:'card.update',cardId:c().id,changes:{date:'2026-11-01'}});const before=p().round;
  cmd({type:'run.start',cardId:c().id});finish();check(()=>assert.equal(p().round,before));check(()=>assert.equal(s.entries.at(-1)!.status,'skipped'));
  check(()=>assert.equal(JSON.stringify(p().assessment),original));combinations++;
 }
 console.log(`PASS ${combinations}/81: target, strength, two full rotations + wrap, actual proof, blank/direct/time/reload/skip/date no credit, duplicate close.`);
 for(const [done,goal,band,shown] of [[0,0,null,'—'],[0,10,null,'—'],[1,1,'100','100%'],[10,10,'100','100%'],[199,200,'70','99.5%'],[7,10,'70','70%'],[699,1000,'50','69.9%'],[5,10,'50','50%'],[499,1000,'0','49.9%'],[12,10,'100','100%']] as const){
  const v=stats(fixture(done,goal),'2026-10','planning');
  check(()=>assert.equal(v.band,band));check(()=>assert.equal(v.displayRate,shown));check(()=>assert.equal(v.extra,Math.max(0,done-goal)));
 }
 check(()=>assert.equal(stats(fixture(1,1),'2026-10','planning').conservative,true));
 check(()=>assert.equal(stats(fixture(2,10,'unobserved'),'2026-10','planning').rawRate,null));
 check(()=>assert.equal(stats(fixture(2,10,'skipped'),'2026-10','planning').rawRate,0));
 s=fixture(7,10);s.entries.push({...structuredClone(s.entries[0]),id:'duplicate-id',runId:'fixture-duplicate'});check(()=>assert.equal(stats(s,'2026-10','planning').performed,7));
 act({type:'agreement',month:'2026-10',axis:'attention',count:4,reason:'별도 약점 목표'});
 check(()=>assert.equal(stats(s,'2026-10','attention').performed,0));check(()=>assert.equal(stats(s,'2026-10','planning').denominator,10));
 clock=Date.parse('2026-10-31T12:00:00Z');
 act({type:'agreement',month:'2026-10',axis:'planning',count:1,reason:'남은 일정 축소'});
 check(()=>assert.equal(stats(s,'2026-10','planning').denominator,10));check(()=>assert.equal(stats(s,'2026-10','planning',s.agreements.at(-1)!.id).performed,0));
 const e=s.entries[0];act({type:'correct',entryId:e.id,date:'2026-11-01',reason:'늦게 입력한 실제 수행일 정정'});
 check(()=>assert.equal(s.entries[0].axis,e.axis));check(()=>assert.equal(s.entries[0].status,e.status));check(()=>assert.equal(s.entries[0].originalDate,e.originalDate));
 check(()=>assert.equal(stats(s,'2026-11','planning').performed,1));check(()=>assert.equal(s.entries[0].corrections.length,1));
 check(()=>assert.equal(localDate(new Date(2026,9,31,23,59)),'2026-10-31'));check(()=>assert.equal(localDate(new Date(2026,10,1,0,1)),'2026-11-01'));check(()=>assert.equal(nextMonth('2026-12'),'2027-01'));
 s=fixture(10,10);act({type:'draft.make',month:'2026-10',axis:'planning'});const d=s.drafts[0];
 check(()=>assert.equal(d.count,10));check(()=>assert.equal(student(s).cards.length,0));
 act({type:'draft.accept',id:d.id});const count=p().cards.length;act({type:'draft.accept',id:d.id});check(()=>assert.equal(p().cards.length,count));
 check(()=>assert.equal(c().evidence.planConfirmed,false));check(()=>assert.equal(c().evidence.planChanged,false));check(()=>assert.equal(c().firstAction,''));
 for(const [performed,goal,expected] of [[7,10,'70'],[5,10,'50'],[4,10,'0']] as const){
  s=fixture(performed,goal);act({type:'draft.make',month:'2026-10',axis:'planning'});check(()=>assert.equal(stats(s,'2026-10','planning').band,expected));check(()=>assert.equal(s.drafts[0].count,goal));
 }
 s=fixture(4,10);act({type:'create',title:'일정 변경이 있는 과제'});act({type:'meta',cardId:c().id,changes:{difficulty:'시간 부족'}});
 act({type:'draft.make',month:'2026-10',axis:'planning'});check(()=>assert.equal(s.drafts[0].count,5));
 act({type:'create',title:'기존 다음 달 계획',date:'2026-11-01'});
 check(()=>assert.throws(()=>update(s,{type:'draft.accept',id:s.drafts[0].id},new Date(clock).toISOString(),true),/기존/));
 const oldTitle=c().title;act({type:'draft.accept',id:s.drafts[0].id,conflict:'keep'});check(()=>assert.equal(c().title,oldTitle));
 s=createState();s.mode='review';cmd({type:'qa.profile',axes:{planning:'low',attention:'low',simultaneous:'mid',successive:'mid'}});
 act({type:'create',title:'순서 없는 검사'});prepare('integrated');cmd({type:'run.start',cardId:c().id});finish();check(()=>assert.equal(p().round,0));check(()=>assert.equal(s.entries.at(-1)!.status,'unobserved'));
 s=createState();clock=Date.now()-60000;act({type:'create',title:'개인만 들어갈 과제'});prepare('planning');cmd({type:'run.start',cardId:c().id});
 s.lastSeen=new Date(Date.parse(r().runningSince)+10000).toISOString();const frozen=freezeTimers(s);
 check(()=>assert.equal(frozen.lab.students['student-a'].runs[0].phase,'paused'));check(()=>assert.equal(elapsed(frozen.lab.students['student-a'].runs[0]),10000));
 const backup=await exportBackup(s,'personal'),raw=JSON.parse(backup);
 check(()=>assert.equal(raw.data.lab,undefined));check(()=>assert.equal(raw.data.student.name,'가상 학생 가'));check(()=>assert.equal(raw.data.lessons,undefined));
 const restored=await importBackup(backup,s);check(()=>assert.equal(student(restored).runs[0].phase,'paused'));check(()=>assert.equal(elapsed(student(restored).runs[0]),10000));
 await assert.rejects(()=>importBackup(backup,createState()));checks++;
 await assert.rejects(()=>importBackup(backup.replace('개인만 들어갈 과제','손상'),s));checks++;
 raw.data.entries=[{bad:'orphan'}];raw.checksum=await checksum(raw.data);await assert.rejects(()=>importBackup(JSON.stringify(raw),s));checks++;
 await assert.rejects(()=>exportBackup(s,'workspace'));checks++;
 s=restored;clock+=20000;cmd({type:'run.resume',runId:r().id});finish();const snap=await importBackup(await exportBackup(s,'personal'),s);
 check(()=>assert.deepEqual(snap.entries,s.entries));check(()=>assert.deepEqual(snap.agreements,s.agreements));
 s.mode='review';const roundtrip=await importBackup(await exportBackup(s,'workspace'),s);check(()=>assert.deepEqual(roundtrip,s));
 const html=reportHTML(s,'2026-10',{summary:true,evidence:true,methods:true,outputs:true});
 check(()=>assert(html.includes('월간 활용 요약')));check(()=>assert(!html.includes('scoreSystem')));check(()=>assert(!html.includes('runningSince')));
 const privateReport=reportHTML(s,'2026-10',{summary:false,evidence:false,methods:false,outputs:false});check(()=>assert(!privateReport.includes('개인만 들어갈 과제')));
 s=createState();s.mode='review';
 cmd({type:'qa.profile',axes:Object.fromEntries(AXES.map(a=>[a,'high']))});
 check(()=>assert.equal(routeFor(p()).support,'universal'));check(()=>assert.equal(routeFor(p()).target,'integrated'));
 check(()=>assert.throws(()=>update(s,{type:'legacy',command:{type:'qa.profile',axes:{planning:'invalid'}}},new Date(clock).toISOString(),true)));
 const axes={planning:'low',attention:'mid',simultaneous:'high',successive:'mid'};
 cmd({type:'qa.profile',axes,supportOrder:['planning'],strengthOrder:['simultaneous'],officialType:{id:'preserve-external-id',axes:Object.fromEntries(AXES.map(a=>[a,'high']))}});
 check(()=>assert.equal(routeFor(p()).creditAllowed,false));check(()=>assert.equal(p().officialType?.id,'preserve-external-id'));
 s=createState();s.mode='review';cmd({type:'qa.profile',axes:{attention:'low'},supportOrder:['attention']});
 act({type:'create',title:'행동 선택 없이 시작'});cmd({type:'run.start',cardId:c().id});cmd({type:'run.review',runId:r().id});cmd({type:'run.close',runId:r().id,completion:'no',next:'today',optionalAttention:'not_applicable'});
 check(()=>assert.equal(p().round,0));check(()=>assert.equal(s.entries[0].status,'unobserved'));
 s=fixture(10,10);act({type:'draft.make',month:'2026-10',axis:'planning'});act({type:'draft.edit',id:s.drafts[0].id,changes:{help:'attention'}});
 act({type:'draft.accept',id:s.drafts[0].id});cmd({type:'run.start',cardId:c().id});check(()=>assert.equal(r().support,'attention'));check(()=>assert.equal(r().target,'planning'));
 cmd({type:'run.review',runId:r().id});cmd({type:'run.close',runId:r().id,completion:'no',next:'today',nextPosition:'5번 문제부터'});
 cmd({type:'run.start',cardId:c().id});check(()=>assert.equal(r().flag,'5번 문제부터'));finish();
 s=fixture(4,10);const moved=s.entries[0];act({type:'correct',entryId:moved.id,date:'2026-09-30',reason:'이전 달 수행일로 정정'});
 const oldMonthReport=reportHTML(s,'2026-10',{summary:true,evidence:true,methods:false,outputs:false});check(()=>assert(oldMonthReport.includes('이전 달 수행일로 정정')));
 console.log(`PASS ${checks} assertions: monthly boundaries/no records/low samples/dedup/areas/revisions/corrections/local months/draft approval/conflict/privacy/timer recovery/backup.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
