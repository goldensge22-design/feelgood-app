import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createStudio,updateStudio,studioOf,placement,studioCapacity,noticeCards,scheduleProposal} from '../../artifacts/nuvia-ui-review/src/studio/studio-logic';
import {student,routeFor,stats,localDate} from '../../artifacts/nuvia-ui-review/src/studio/domain';
import {validate,exportBackup,importBackup,checksum} from '../../artifacts/nuvia-ui-review/src/studio/persistence';
import {roadSources,experienceState,roadmapExport} from '../../artifacts/nuvia-ui-review/src/studio/roadmap';
import {executionFacts} from '../../artifacts/nuvia-ui-review/src/studio/insights';
import type {Action,PersonalState,Target} from '../../artifacts/nuvia-ui-review/src/studio/model';
const out='generated-artifacts/nuvia-studio';fs.mkdirSync(out,{recursive:true});
let checks=0,clock=Date.parse('2026-10-01T10:00:00Z'),s=createStudio(new Date(clock).toISOString());
const ok=(fn:()=>void)=>{fn();checks++;};
const act=(a:Action)=>{s=validate(updateStudio(s,a,new Date(clock+=1000).toISOString(),s.mode==='review'));};
const cmd=(command:any)=>act({type:'legacy',command}),p=()=>student(s),c=()=>p().cards.at(-1)!,r=()=>p().runs.at(-1)!;
const reset=()=>{clock=Date.parse('2026-10-01T10:00:00Z');s=createStudio(new Date(clock).toISOString());};
const create=(title='합성 과제',minutes=15)=>{act({type:'create',title,minutes,date:'2026-10-01'});return c().id;};
const place=(id=c().id)=>act({type:'studio.place',cardId:id});
const reject=(a:Action)=>ok(()=>assert.throws(()=>updateStudio(s,a,new Date(clock).toISOString(),s.mode==='review')));
function prep(target:Target){
 if(target==='planning'||target==='integrated'){cmd({type:'card.update',cardId:c().id,changes:{scope:'문제 1~3번',firstAction:'1번 조건 읽기'}});cmd({type:'card.plan',cardId:c().id});}
 if(target==='attention')cmd({type:'card.action',cardId:c().id,action:'1번 조건 읽기'});
 if(target==='simultaneous')cmd({type:'card.links',cardId:c().id,items:{목표:'발표 핵심',자료:'책 12쪽'},links:['목표','자료'],relationship:'책의 설명을 발표 근거로 씁니다'});
 if(target==='successive'){cmd({type:'card.steps',cardId:c().id,steps:[{title:'자료 열기'},{title:'핵심 찾기'}],confirmed:true});cmd({type:'card.progress',cardId:c().id,stepId:c().steps[0].id,done:true});}
}
function close(completion:'yes'|'no'='no',next='today'){cmd({type:'run.review',runId:r().id});cmd({type:'run.close',runId:r().id,completion,next});}
async function main(){
 act({type:'studio.setup',stage:'high',title:'첫 과제'});ok(()=>assert.equal(p().stage,'high'));ok(()=>assert.equal(p().cards.length,1));ok(()=>assert.equal(studioOf(s).stageChosen,true));
 ok(()=>assert.equal(p().runs.length,0));act({type:'studio.select',cardId:c().id});ok(()=>assert.equal(p().runs.length,0));reject({type:'legacy',command:{type:'run.start',cardId:c().id}});
 place();ok(()=>assert.equal(p().runs.length,0));const a=c().id;prep('planning');cmd({type:'run.start',cardId:a});clock+=60000;
 const before=structuredClone(r());act({type:'studio.archive',cardId:a,flag:'교재 3쪽',nextDate:'2026-10-05'});
 ok(()=>assert.equal(r().phase,'paused'));ok(()=>assert.equal(r().target,before.target));ok(()=>assert.equal(r().budgetMinutes,before.budgetMinutes));ok(()=>assert.equal(r().flag,'교재 3쪽'));ok(()=>assert.equal(s.entries.length,0));ok(()=>assert.equal(p().cards[0].status,'planned'));
 const b=create('다른 과제',25);reject({type:'studio.place',cardId:b});reject({type:'legacy',command:{type:'run.start',cardId:b}});reject({type:'studio.exclude',cardId:a});
 act({type:'studio.take',cardId:a});ok(()=>assert.equal(r().phase,'paused'));ok(()=>assert.equal(r().id,before.id));clock+=86400000;
 cmd({type:'run.resume',runId:r().id});clock+=60000;close('yes');ok(()=>assert.equal(placement(s,a).place,'collection'));ok(()=>assert.equal(p().cards.find(c=>c.id===a)!.status,'done'));
 ok(()=>assert(r().segments.reduce((n,x)=>n+Date.parse(x.end)-Date.parse(x.start),0)<130000));
 const initialCount=s.agreements.length;act({type:'studio.exclude',cardId:a});ok(()=>assert.equal(s.agreements.length,initialCount));ok(()=>assert.equal(studioCapacity(s,'2026-10-01').done,15));act({type:'studio.restore',cardId:a});ok(()=>assert.equal(placement(s,a).place,'collection'));
 reset();const done=create('완료 계획',10);place(done);prep('planning');cmd({type:'run.start',cardId:done});close('yes');const pending=create('예정 계획',25);
 let cap=studioCapacity(s,'2026-10-01');ok(()=>assert.deepEqual([cap.done,cap.pending,cap.free,cap.available],[10,25,55,90]));
 act({type:'agreement',month:'2026-10',axis:'planning',count:10,reason:'본인이 확인'});
 act({type:'studio.archive',cardId:pending});cap=studioCapacity(s,'2026-10-01');ok(()=>assert.deepEqual([cap.done,cap.pending,cap.free],[10,25,55]));
 act({type:'studio.exclude',cardId:pending});ok(()=>assert.equal(s.agreements[0].count,10));ok(()=>assert.equal(studioCapacity(s,'2026-10-01').pending,0));act({type:'studio.restore',cardId:pending});ok(()=>assert.equal(placement(s,pending).place,'archive'));
 reset();const id=create('보관 안내');act({type:'studio.archive',cardId:id});const archiveAt=Date.parse(placement(s,id).archivedAt!);
 clock=archiveAt+7*86400000-1001;act({type:'studio.visit',sessionId:'before'});ok(()=>assert.equal(noticeCards(s).length,0));
 clock=archiveAt+7*86400000-1000;act({type:'studio.visit',sessionId:'boundary'});ok(()=>assert.equal(noticeCards(s).length,1));
 act({type:'studio.visit',sessionId:'refresh'});ok(()=>assert.equal(noticeCards(s).length,0));act({type:'studio.keep',cardId:id});clock+=20*86400000;act({type:'studio.visit',sessionId:'later'});ok(()=>assert.equal(noticeCards(s).length,0));
 act({type:'studio.take',cardId:id});act({type:'studio.archive',cardId:id,nextDate:'2026-12-01'});clock+=8*86400000;act({type:'studio.visit',sessionId:'future'});ok(()=>assert.equal(noticeCards(s).length,0));
 clock=Date.parse('2026-12-01T12:00:00Z');act({type:'studio.visit',sessionId:'due'});ok(()=>assert.equal(noticeCards(s).length,1));
 reset();const x=create('첫 보관'),y=create('둘째 보관');act({type:'studio.archive',cardId:x});act({type:'studio.archive',cardId:y});act({type:'studio.settings',archiveReminders:false});clock+=8*86400000;act({type:'studio.visit',sessionId:'off'});ok(()=>assert.equal(noticeCards(s).length,0));
 act({type:'studio.settings',archiveReminders:true});ok(()=>assert.equal(noticeCards(s).length,0));act({type:'studio.visit',sessionId:'group'});ok(()=>assert.equal(noticeCards(s).length,2));act({type:'studio.exclude',cardId:y});ok(()=>assert.equal(noticeCards(s).length,1));
 reset();const planned=create('미래 날짜');cmd({type:'card.update',cardId:planned,changes:{date:'2026-12-20'}});act({type:'studio.archive',cardId:planned});clock+=9*86400000;act({type:'studio.visit',sessionId:'planned-date'});ok(()=>assert.equal(noticeCards(s).length,0));
 reset();const one=create('순서 1'),two=create('순서 2');cmd({type:'card.update',cardId:one,changes:{startTime:''}});cmd({type:'card.update',cardId:two,changes:{startTime:''}});
 const proposal=scheduleProposal(s,'2026-10-01','09:00');ok(()=>assert.deepEqual(proposal.map(x=>x.startTime),['09:00','09:15']));ok(()=>assert.equal(placement(s,one).timeSet,false));act({type:'studio.schedule',day:'2026-10-01',start:'09:00'});ok(()=>assert.equal(p().cards[1].startTime,'09:15'));
 cmd({type:'card.move',cardId:two,direction:-1});ok(()=>assert.equal(p().cards[0].id,two));ok(()=>assert.equal(p().cards[0].startTime,'09:00'));reject({type:'studio.schedule',day:'2026-10-01',start:'25:00'});
 reset();const rid=create('로드맵 경험');place(rid);prep('planning');cmd({type:'run.start',cardId:rid});cmd({type:'run.thought',runId:r().id,thought:'민감한 다른 생각'});act({type:'meta',cardId:rid,changes:{difficulty:'개인 어려움 원문',output:'내가 만든 요약 1장'}});clock+=20000;close('no');
 let src=roadSources(s)[0];ok(()=>assert.equal(roadSources(s).length,1));ok(()=>assert(!JSON.stringify(src).includes('민감한 다른 생각')&&!JSON.stringify(src).includes('개인 어려움 원문')));ok(()=>assert.equal(src.initial.scope,''));ok(()=>assert.equal(src.snapshot.scope,'문제 1~3번'));
 const version=src.version;act({type:'studio.color',cardId:rid,tone:'orange'});ok(()=>assert.equal(roadSources(s)[0].version,version));act({type:'studio.sync'});ok(()=>assert.equal(roadSources(s).length,1));
 act({type:'roadmap.create',sourceId:src.id});act({type:'roadmap.create',sourceId:src.id});ok(()=>assert.equal(studioOf(s).experiences.length,1));
 let e=studioOf(s).experiences[0];ok(()=>assert.equal(e.fields.difficulty,''));ok(()=>assert.equal(e.fields.learning,''));reject({type:'roadmap.select',id:e.id,selected:true});
 act({type:'roadmap.edit',id:e.id,fields:{action:'자료 두 개를 직접 비교했다',learning:'범위를 작게 정하는 것이 도움이 됐다'}});act({type:'roadmap.confirm',id:e.id});act({type:'roadmap.select',id:e.id,selected:true});act({type:'roadmap.draft'});const draftId=studioOf(s).draft!.id;act({type:'roadmap.draft'});ok(()=>assert.equal(studioOf(s).draft!.id,draftId));
 const lines=studioOf(s).draft!.sentences;ok(()=>assert(!JSON.stringify(lines).includes('PASS')&&!JSON.stringify(lines).includes('개인 어려움 원문')));
 for(const line of lines)act({type:'roadmap.sentence',id:line.id,confirmed:true,selected:true});
 let exported=roadmapExport(s);ok(()=>assert(exported.text.includes('근거:')&&!exported.text.includes('민감한 다른 생각')));
 act({type:'roadmap.sentence',id:lines[0].id,text:'본인이 고친 문장'});ok(()=>assert.throws(()=>roadmapExport(s)));act({type:'roadmap.sentence',id:lines[0].id,confirmed:true});
 cmd({type:'card.update',cardId:rid,changes:{scope:'문제 1~2번'}});e=studioOf(s).experiences[0];ok(()=>assert.equal(experienceState(s,e),'changed'));ok(()=>assert.equal(e.fields.action,'자료 두 개를 직접 비교했다'));ok(()=>assert.throws(()=>roadmapExport(s)));act({type:'roadmap.refresh',id:e.id});ok(()=>assert.equal(studioOf(s).experiences[0].confirmed,false));
 act({type:'roadmap.confirm',id:e.id});act({type:'roadmap.select',id:e.id,selected:true});act({type:'roadmap.draft'});for(const l of studioOf(s).draft!.sentences)act({type:'roadmap.sentence',id:l.id,confirmed:true,selected:true});
 const backup=await exportBackup(s,'personal'),restored=await importBackup(backup,s);ok(()=>assert.deepEqual(restored.studio,s.studio));ok(()=>assert.equal(roadmapExport(restored).text,roadmapExport(s).text));
 const broken=JSON.parse(backup);broken.data.studio.experiences[0].sourceId='missing';broken.checksum=await checksum(broken.data);await assert.rejects(()=>importBackup(JSON.stringify(broken),s));checks++;
 const foreign=createStudio();await assert.rejects(()=>importBackup(backup,foreign));checks++;
 const missing=structuredClone(s);missing.lab.students['student-a'].cards=[];missing.lab.students['student-a'].runs=[];missing.meta={};missing.entries=[];missing.insights=undefined;missing.studio!.placements={};missing.studio!.deskId='';missing.studio!.selectedId='';
 const vanished=updateStudio(missing,{type:'studio.sync'},new Date(clock).toISOString());ok(()=>assert.equal(experienceState(vanished,vanished.studio!.experiences[0]),'missing'));ok(()=>assert.throws(()=>roadmapExport(vanished)));
 reset();create('추가 5분');place();prep('planning');cmd({type:'run.start',cardId:c().id});clock+=61000;close('no','five');ok(()=>assert.equal(p().runs.length,2));ok(()=>assert.equal(Object.keys(s.insights!.contexts).length,2));clock+=310000;close('yes');ok(()=>assert.equal(stats(s,'2026-10','planning').performed,1));ok(()=>assert.equal(executionFacts(s,'2026-10').contexts.length,2));
 const levels=['high','mid','low'] as const,axes=['planning','attention','simultaneous','successive'] as const;
 for(const a of levels)for(const b of levels)for(const c_ of levels)for(const d of levels){
  reset();s.mode='review';const map={planning:a,attention:b,simultaneous:c_,successive:d},lows=axes.filter(k=>map[k]==='low'),highs=axes.filter(k=>map[k]==='high');
  cmd({type:'qa.profile',axes:map,stage:'middle',supportOrder:[...axes],strengthOrder:[...axes]});
  for(let i=0;i<Math.max(1,lows.length)*2+1;i++){
   const route=routeFor(p());ok(()=>assert.equal(route.target,lows.length?lows[i%lows.length]:'integrated'));ok(()=>assert.equal(route.support,highs[0]??'universal'));
   create();place();prep(route.target);cmd({type:'run.start',cardId:c().id});clock+=1000;close();ok(()=>assert.equal(s.entries.at(-1)!.status,'performed'));ok(()=>assert.equal(p().round,i+1));
  }
 }
 reset();s.mode='review';create('직접 시작');place();cmd({type:'qa.profile',axes:{planning:'low',attention:'mid',simultaneous:'high',successive:'mid'},stage:'middle',supportOrder:[...axes],strengthOrder:[...axes]});cmd({type:'run.start',cardId:c().id});close();ok(()=>assert.equal(p().round,0));ok(()=>assert.equal(s.entries[0].status,'unobserved'));
 // Persist only synthetic test fixtures, isolated from all user browser storage.
 reset();s.mode='review';create('7일 안내 합성');act({type:'studio.archive',cardId:c().id});fs.writeFileSync(out+'/notice-fixture.json',JSON.stringify(s));
 console.log(`PASS studio ${checks} assertions: 81 combinations/two rotations/actual proof; explicit movement/single run/archive flag/recovery/collection; 7day boundary/future/once/group/off/keep; capacity/reorder/time consent; roadmap sources/privacy/staleness/citations/selection/backup/missing; 5-minute continuation dedup.`);
}
main().catch(e=>{console.error(e);process.exit(1);});
