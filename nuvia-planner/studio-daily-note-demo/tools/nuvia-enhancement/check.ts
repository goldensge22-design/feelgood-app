import assert from 'node:assert/strict';
import {apply,capacity,createLab,elapsed,evidenceReady,remaining,routeFor} from '../../artifacts/nuvia-ui-review/src/enhancement/domain';
import {exportLab,importLab,validateLab} from '../../artifacts/nuvia-ui-review/src/enhancement/persistence';
import {AXES} from '../../artifacts/nuvia-ui-review/src/official/adaptive/engine';
import type {Command,LabState,Target} from '../../artifacts/nuvia-ui-review/src/enhancement/model';
let checks=0;
const check=(f:()=>void)=>{f();checks++;};
let n=createLab();
const time=(seconds=0)=>new Date(Date.UTC(2026,9,19,12,0,seconds)).toISOString();
const act=(c:Command,sec=0,qa=true)=>{n=apply(n,c,time(sec),qa);validateLab(n);};
const student=()=>n.students['student-a'];
const card=()=>student().cards.at(-1)!;
const run=()=>student().runs.at(-1)!;
function prep(target:Target){
 if(target==='planning'||target==='integrated'){
  act({type:'card.update',cardId:card().id,changes:{scope:'발표 첫 두 장',firstAction:'주제 한 줄 쓰기'}});
  act({type:'card.plan',cardId:card().id});
 }else if(target==='attention')act({type:'card.action',cardId:card().id,action:'발표 주제 한 줄 쓰기'});
 else if(target==='simultaneous')act({type:'card.links',cardId:card().id,links:['목표','자료'],items:{목표:'기후의 변화를 설명',자료:'직접 읽은 월별 기온 표'},relationship:'기온 표에서 변화의 근거를 골라 발표에 사용'});
 else{
  act({type:'card.steps',cardId:card().id,steps:[{id:'one',title:'주제 고르기',done:false},{id:'two',title:'자료 찾기',done:false}]});
  check(()=>assert.equal(evidenceReady(card(),{...run(),round:student().round,target} as any),false));
  act({type:'card.progress',cardId:card().id,stepId:'one'});
 }
}
async function main(){
 check(()=>assert.deepEqual(capacity(student()),{done:10,pending:25,free:55,total:35,capacity:90,over:0}));
 let combinations=0;
 for(const planning of ['high','mid','low'] as const)for(const attention of ['high','mid','low'] as const)for(const simultaneous of ['high','mid','low'] as const)for(const successive of ['high','mid','low'] as const){
  n=createLab();student().cards=[];const axes={planning,attention,simultaneous,successive};
  const lows=[...AXES].reverse().filter(x=>axes[x]==='low'),strengths=AXES.filter(x=>axes[x]==='high');
  act({type:'qa.profile',axes,supportOrder:lows,strengthOrder:strengths});
  check(()=>assert.equal(routeFor(student()).target,lows[0]??'integrated'));
  check(()=>assert.equal(routeFor(student()).support,strengths.find(x=>x!==routeFor(student()).target)??'universal'));
  const official=JSON.stringify(student().assessment);
  act({type:'card.create'});
  // Default, start, timer expiry, reload, pause, dates and explicit skip cannot credit practice.
  act({type:'run.start',cardId:card().id});
  check(()=>assert.equal(evidenceReady(card(),run()),false));
  check(()=>assert.equal(remaining(run(),Date.parse(time(4000))),0));
  n=validateLab(JSON.parse(JSON.stringify(n)));
  check(()=>assert.equal(student().round,0));
  act({type:'run.review',runId:run().id},60);act({type:'run.close',runId:run().id,completion:'no',next:'today'},60);
  check(()=>assert.equal(student().round,0));
  for(let round=0;round<Math.max(1,lows.length);round++){
   const expected=lows[round%lows.length]??'integrated';
   check(()=>assert.equal(routeFor(student()).target,expected));prep(expected);
   act({type:'run.start',cardId:card().id},120+round*200);
   check(()=>assert.equal(student().round,round));
   act({type:'run.pause',runId:run().id},150+round*200);
   act({type:'run.flag',runId:run().id,flag:'从第二张继续 · 2장부터'});
   act({type:'run.resume',runId:run().id},180+round*200);
   act({type:'run.review',runId:run().id},240+round*200);
   check(()=>assert.equal(elapsed(run()),90000));
   act({type:'run.close',runId:run().id,completion:'no',next:'today',actualMinutes:1.25},240+round*200);
   check(()=>assert.equal(run().evidenceStatus,'performed'));
   check(()=>assert.equal(student().round,round+1));
   const nr=student().runs.length,ne=student().experiences.length;
   act({type:'run.close',runId:run().id,completion:'no',next:'today'},250+round*200);
   check(()=>assert.equal(student().runs.length,nr));check(()=>assert.equal(student().experiences.length,ne));
  }
  check(()=>assert.equal(JSON.stringify(student().assessment),official));
  combinations++;
 }
 console.log(`PASS: ${combinations}/81 official high/mid/low combinations; target, strength, zero default credit, ordered rounds, paused clock, duplicate end.`);
 // safe handling of missing order and type mismatch
 n=createLab();act({type:'qa.profile',axes:Object.fromEntries(AXES.map(x=>[x,'low']))});
 check(()=>assert.match(routeFor(student()).warning,/공식 지원 순서/));
 const type={id:'preserve-official-id',axes:Object.fromEntries(AXES.map(x=>[x,'high']))};
 act({type:'qa.profile',axes:{planning:'low',attention:'mid',simultaneous:'mid',successive:'mid'},supportOrder:['planning'],officialType:type});
 check(()=>assert.match(routeFor(student()).warning,/식별정보/));check(()=>assert.equal(student().officialType?.id,type.id));
 check(()=>assert.throws(()=>apply(n,{type:'qa.profile',axes:{}},time(),false),/비교 모드/));
 check(()=>assert.throws(()=>apply(n,{type:'qa.profile',axes:{planning:'invalid'}},time(),true)));
 // each age + no-assessment keeps contexts stable
 for(const stage of ['elementary_1_3','elementary_4_6','middle','high','adult']){
  n=createLab();act({type:'qa.profile',stage,axes:{planning:'low'},supportOrder:['planning']});act({type:'card.create'});prep('planning');act({type:'run.start',cardId:card().id});
  for(const language of ['en','km','ar','ko'])act({type:'language',language});
  check(()=>assert.equal(run().phase,'running'));check(()=>assert.equal(student().stage,stage));
  check(()=>assert.equal(student().assessment?.educationStage,stage));check(()=>assert.equal(student().round,0));
 }
 n=createLab();act({type:'qa.profile',withoutAssessment:true});check(()=>assert.equal(student().assessment,null));act({type:'card.create'});act({type:'run.start',cardId:card().id});
 // 5 more is five measured minutes even after direct actual correction; same practice credit once.
 n=createLab();act({type:'card.create'});prep('planning');act({type:'run.start',cardId:card().id});
 const pid=run().practiceId;act({type:'run.review',runId:run().id},60);
 act({type:'run.close',runId:run().id,completion:'no',next:'five',actualMinutes:40},60);
 check(()=>assert.equal(remaining(run(),Date.parse(time(60))),300));check(()=>assert.equal(run().practiceId,pid));check(()=>assert.equal(student().round,1));
 act({type:'run.review',runId:run().id},70);act({type:'run.close',runId:run().id,completion:'no',next:'today'},70);check(()=>assert.equal(student().round,1));
 // classes, two isolated students, preview snapshots, revoke and end preserve personal cards
 act({type:'role',actor:'teacher'});act({type:'lesson.create',title:'합성 1박2일 캠프',template:'overnight'});const lesson=n.lessons[0];act({type:'lesson.publish',lessonId:lesson.id});
 for(const sid of ['student-a','student-b'] as const){
  act({type:'role',actor:sid});act({type:'lesson.join',code:lesson.code});act({type:'lesson.card',lessonId:lesson.id});act({type:'lesson.card',lessonId:lesson.id});
  const s=n.students[sid],c=s.cards.find(x=>x.sourceClassId===lesson.id)!;
  check(()=>assert.equal(s.cards.filter(x=>x.sourceClassId===lesson.id).length,1));
  act({type:'card.update',cardId:c.id,changes:{method:'내가 고른 방법',reflection:'다음에 한 장만',handoff:'개인 인계 메모'}});
  act({type:'share.save',lessonId:lesson.id,cardId:c.id,fields:{goal:true,method:true}});
  const sh=n.shared.find(x=>x.studentId===sid)!;
  check(()=>assert.deepEqual(Object.keys(sh.fields).sort(),['goal','method']));
  check(()=>assert(!JSON.stringify(sh).includes('개인 인계 메모')));
  act({type:'help.create',lessonId:lesson.id,cardId:c.id,point:'첫 자료 고르기',need:'예시 하나'});
 }
 act({type:'role',actor:'teacher'});
 for(const sh of n.shared)act({type:'feedback.save',shareId:sh.id,text:'한 자료부터 골라 볼까요?',nextDate:'2026-10-20'});
 for(const req of n.requests)act({type:'help.answer',requestId:req.id,answer:'기온 표부터',nextDate:'2026-10-20'});
 check(()=>assert.equal(n.shared.length,2));check(()=>assert.equal(n.requests.filter(x=>x.status==='answered').length,2));
 act({type:'role',actor:'student-a'});const aShare=n.shared.find(x=>x.studentId==='student-a')!;
 act({type:'share.withdraw',shareId:aShare.id});act({type:'role',actor:'teacher'});check(()=>assert.equal(n.shared.length,1));
 check(()=>assert.throws(()=>apply(n,{type:'card.create'},time()),/학생 시연/));
 const count=n.students['student-a'].cards.length;
 act({type:'lesson.end',lessonId:lesson.id});check(()=>assert.equal(n.shared.length,0));check(()=>assert.equal(n.requests.length,0));check(()=>assert.equal(n.students['student-a'].cards.length,count));
 act({type:'role',actor:'student-a'});act({type:'lesson.leave',lessonId:lesson.id});check(()=>assert.equal(student().cards.length,count));
 // goals idempotent, experience and methods persist exact student inputs
 act({type:'goal.save',far:'더 분명히 설명하기',middle:'발표 한 번 해보기',weekly:'주제 한 줄 쓰기',date:'2026-10-20'});
 const g=student().goals.at(-1)!;act({type:'goal.schedule',goalId:g.id});act({type:'goal.schedule',goalId:g.id});check(()=>assert.equal(student().cards.filter(x=>x.id===student().goals.at(-1)!.cardId).length,1));
 const closed=student().runs.find(x=>x.phase==='closed')!;
 act({type:'method.save',runId:closed.id,name:'두 장씩 나누기',helpful:'yes',note:'내 느낌'});
 act({type:'experience.save',runId:closed.id,situation:'발표 준비',role:'자료 조사',action:'표에서 근거 고르기',result:'두 항목을 확인함',selected:true});
 const backup=await exportLab(n),restored=await importLab(backup,n.labId);check(()=>assert.deepEqual(restored,n));
 await assert.rejects(()=>importLab(backup,createLab().labId));checks++;
 await assert.rejects(()=>importLab(backup.replace('두 장씩 나누기','몰래 변경'),n.labId));checks++;
 check(()=>assert.throws(()=>validateLab({...n,students:{...n.students,'student-b':{...n.students['student-b'],id:'student-a'}}})));
 check(()=>assert.throws(()=>validateLab({...n,shared:[{bad:'foreign'}]})));
 // Missing strength order changes presentation only; missing target order must never earn a formal round.
 n=createLab();act({type:'qa.profile',stage:'middle',axes:{planning:'low',attention:'high',simultaneous:'high',successive:'mid'}});
 student().assessment!.strengthOrder=undefined;
 check(()=>assert.equal(routeFor(student()).support,'universal'));check(()=>assert.equal(routeFor(student()).creditAllowed,true));
 prep('planning');act({type:'run.start',cardId:card().id});act({type:'run.review',runId:run().id},5);act({type:'run.close',runId:run().id,completion:'no',next:'today'},5);
 check(()=>assert.equal(student().round,1));
 n=createLab();act({type:'qa.profile',stage:'middle',axes:{planning:'low',attention:'low',simultaneous:'mid',successive:'mid'}});
 student().assessment!.supportOrder=undefined;
 prep('integrated');act({type:'run.start',cardId:card().id});act({type:'run.review',runId:run().id},5);act({type:'run.close',runId:run().id,completion:'no',next:'today'},5);
 check(()=>assert.equal(student().round,0));check(()=>assert.equal(run().evidenceStatus,'unobserved'));
 n=createLab();const fresh=card();act({type:'card.update',cardId:fresh.id,changes:{scope:fresh.scope,minutes:fresh.minutes}});check(()=>assert.equal(card().evidence.planChanged,false));
 act({type:'card.update',cardId:fresh.id,changes:{scope:'직접 고친 범위',firstAction:'첫 장 쓰기',minutes:15}});
 check(()=>assert.equal(evidenceReady(card(),{target:'planning',round:0} as any),true));
 act({type:'role',actor:'teacher'});act({type:'lesson.create',title:'기간 조정 시연',template:'overnight'});
 const dates=n.lessons[0];check(()=>assert.equal(dates.endDate,'2026-10-20'));
 act({type:'lesson.update',lessonId:dates.id,changes:{startDate:'2026-10-23',endDate:'2026-10-24',minutes:360,activities:'회차별 실제 실행과 복귀'}});
 check(()=>assert.equal(n.lessons[0].endDate,'2026-10-24'));
 check(()=>assert.throws(()=>validateLab(apply(n,{type:'lesson.update',lessonId:dates.id,changes:{endDate:'2026-10-01'}},time()))));
 act({type:'lesson.publish',lessonId:dates.id});act({type:'role',actor:'student-a'});act({type:'lesson.join',code:dates.code});
 const oldCount=student().cards.length,existingId=card().id;
 act({type:'lesson.card',lessonId:dates.id,cardId:existingId});act({type:'lesson.card',lessonId:dates.id,cardId:existingId});
 check(()=>assert.equal(student().cards.length,oldCount));check(()=>assert.equal(card().sourceClassId,dates.id));
 prep('simultaneous');prep('successive');
 act({type:'card.update',cardId:existingId,changes:{goal:'내가 정한 발표 목표',condition:'자료를 펴면',alternative:'도움 요청하기',method:'순서를 적고 해보기',reflection:'내가 직접 쓴 돌아보기',deadline:'2026-10-30',middleDeadline:'2026-10-25',owner:'가상 역할 담당',dependency:'표 확인',waiting:true,handoff:'다음 담당에게 메모',subject:'발표 프로젝트'}});
 act({type:'student.settings',changes:{supportChoice:'attention',reduceHelp:true}});
 act({type:'run.start',cardId:existingId});act({type:'run.pause',runId:run().id},3);
 act({type:'student.settings',changes:{supportChoice:'successive'}});
 check(()=>assert.equal(run().supportHistory.at(-1)!.support,'successive'));
 const allFieldsRestored=await importLab(await exportLab(n),n.labId);
 check(()=>assert.deepEqual(allFieldsRestored,n));
 console.log(`PASS: ${checks} checks including 5 ages, profile mismatch/missing order, timer/5min, 2-student sharing, revoke/end, goals/methods/experience, backup integrity, class period and foreign scope.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
