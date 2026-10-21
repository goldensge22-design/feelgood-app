import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createStudio,updateStudio,studioCapacity,scheduleProposal} from '../../artifacts/nuvia-ui-review/src/studio/studio-logic';
import {student,localDate,createState,update} from '../../artifacts/nuvia-ui-review/src/studio/domain';
import {validate,exportBackup,importBackup} from '../../artifacts/nuvia-ui-review/src/studio/persistence';
import {executionFacts} from '../../artifacts/nuvia-ui-review/src/studio/insights';
import {reportHTML} from '../../artifacts/nuvia-ui-review/src/studio/report';
import {sourceFacts} from '../../artifacts/nuvia-ui-review/src/studio/roadmap';
import type {Action} from '../../artifacts/nuvia-ui-review/src/studio/model';
async function main(){
let count=0;
function ok(v:unknown,label:string){assert(v,label);count++;}
let s=createStudio('2026-10-20T09:00:00.000Z');
const at=(m=0)=>new Date(Date.parse('2026-10-20T09:00:00.000Z')+m*60000).toISOString();
const act=(a:Action,m=0)=>{s=validate(updateStudio(s,a,at(m)));};
const p=()=>student(s),last=()=>p().cards.at(-1)!;
const cmd=(command:any,m=0)=>act({type:'legacy',command},m);
const fresh=()=>{s=createStudio(at());};
const close=(id:string,m=3,completion='yes',next='today')=>{cmd({type:'run.review',runId:id},m);cmd({type:'run.close',runId:id,completion,next},m);};
fresh();act({type:'create',title:'시간 모르는 정리',activity:'생활',activityExplicit:true,minutes:null,requestId:'one'});
const id=last().id,first=structuredClone(s);
ok(last().minutes===0&&s.studio!.placements[id].estimateKnown===false,'canonical unknown not invented minutes');
ok(!last().evidence.planChanged&&!last().evidence.planConfirmed,'unknown/category no plan proof');
ok(studioCapacity(s,localDate(new Date(at()))).pending===0&&studioCapacity(s,localDate(new Date(at()))).unknown===1,'capacity separates unknown');
act({type:'create',title:'같은 클릭',minutes:25,requestId:'one'});
ok(p().cards.length===1,'request id fast duplicate dedup');
act({type:'studio.place',cardId:id});ok(p().runs.length===0,'placement no start');
cmd({type:'run.start',cardId:id});const run=p().runs.at(-1)!;ok(run.budgetMinutes===0,'elapsed run no fake budget');
cmd({type:'run.pause',runId:run.id},2);cmd({type:'run.resume',runId:run.id},5);close(run.id,6);
ok(p().runs[0].segments.length===2&&s.insights!.contexts[run.id].actualMs===180000,'pause excludes three offline minutes');
ok(s.insights!.contexts[run.id].plannedMinutes===0&&p().runs[0].evidenceStatus==='unobserved'&&p().round===0,'untimed direct start no credit');
ok(executionFacts(s,'2026-10').groups.length===0,'unknown excluded from prediction comparisons');
const html=reportHTML(s,'2026-10',{summary:true,evidence:true,methods:true,outputs:true});
ok(html.includes('예상 미정 / 실행 3분 / 시간 차이 계산 안 함'),'report honest elapsed only');
const src=Object.values(s.studio!.sources).find(x=>x.cardId===id)!;
ok(src.snapshot.minutes===0&&src.initial.minutes===0&&sourceFacts(src).slice(0,2).every(x=>x.includes('예상 미정')),'roadmap current/initial unknown');
const text=await exportBackup(s,'personal'),back=await importBackup(text,s);
ok(back.lab.students['student-a'].runs[0].budgetMinutes===0&&back.lab.students['student-a'].cards[0].minutes===0,'backup canonical zero roundtrip');
const bad=structuredClone(s);delete bad.studio!.placements[id].estimateKnown;
assert.throws(()=>validate(bad));count++;
act({type:'studio.estimate',cardId:id,minutes:10});
ok(p().cards[0].minutes===10&&p().runs[0].budgetMinutes===0&&s.insights!.contexts[run.id].plannedMinutes===0,'future estimate does not rewrite old execution');
for(const n of [0,-1,1.5,1441,NaN,Infinity]){
 const before=JSON.stringify(s);assert.throws(()=>updateStudio(s,{type:'create',title:'잘못된 시간',minutes:n},at()));ok(JSON.stringify(s)===before,'invalid estimate refuses before mutation');
}
for(const n of [10,25,45,37,1440]){
 fresh();act({type:'create',title:'직접 정한 시간',minutes:n,timeChosen:true,scope:'문제 1~3',scopeChosen:true,firstAction:'1번 조건 읽기',activity:'학습',subject:'수학'});
 const c=last();ok(c.minutes===n&&c.subject==='수학'&&c.evidence.planChanged,'explicit plan creation saved once');
 act({type:'studio.place',cardId:c.id});cmd({type:'run.start',cardId:c.id});close(p().runs[0].id);
 ok(p().round===1&&s.entries[0].status==='performed','actual fields + close count one without repeated confirm');
}
for(const activity of ['학습','생활','업무','기타'] as const){
 fresh();act({type:'create',title:activity+' 직접 과제',activity,activityExplicit:true,minutes:null});
 ok(s.studio!.placements[last().id].activity===activity&&s.studio!.lastActivity===activity,'four activities retained without old reclassification');
 ok(!last().evidence.planChanged,'activity not practice evidence');
}
fresh();act({type:'create',title:'복사한 기본값',minutes:25,scope:'한 쪽',firstAction:'책 펴기'});
ok(!last().evidence.planChanged&&!last().evidence.planConfirmed,'copied preset is not evidence');
act({type:'studio.place',cardId:last().id});cmd({type:'run.start',cardId:last().id});close(p().runs[0].id);
ok(p().round===0,'copied default and direct start no rotation');
fresh();act({type:'create',title:'검토한 복사',minutes:25,scope:'한 쪽',firstAction:'책 펴기',planReviewed:true});
act({type:'studio.place',cardId:last().id});cmd({type:'run.start',cardId:last().id});close(p().runs[0].id);
ok(p().round===1,'explicit copied-plan review + proof + close');
fresh();act({type:'create',title:'미정 반복',minutes:null,activity:'기타'});const original=last().id;
cmd({type:'card.repeat',cardId:original,repeat:'daily'});act({type:'studio.place',cardId:original});cmd({type:'run.start',cardId:original});close(p().runs[0].id);
ok(last().id!==original&&last().minutes===0&&s.studio!.placements[last().id].activity==='기타','repeat inherits unknown and activity');
fresh();act({type:'create',title:'미정 다음 블록',minutes:null,activity:'생활'});act({type:'studio.place',cardId:last().id});cmd({type:'run.start',cardId:last().id});close(p().runs[0].id,3,'no','next');
ok(p().cards.length===2&&last().minutes===0&&s.studio!.placements[last().id].activity==='생활','next block preserves unknown without fake minutes');
fresh();act({type:'create',title:'추가 5분',minutes:null});act({type:'studio.place',cardId:last().id});cmd({type:'run.start',cardId:last().id});close(p().runs[0].id,3,'no','five');
ok(p().runs[1].budgetMinutes===5&&s.insights!.contexts[p().runs[1].id].plannedMinutes===5,'explicit five-minute continuation is timed');
fresh();act({type:'create',title:'미정 일정',minutes:null,startTime:'09:00'});const a=last().id;
act({type:'create',title:'정한 일정',minutes:10,startTime:'10:00'});const b=last().id;
cmd({type:'card.move',cardId:b,direction:-1});
ok(p().cards.find(c=>c.id===a)!.startTime==='09:00'&&p().cards.find(c=>c.id===b)!.startTime==='10:00','reorder with unknown preserves explicit times');
ok(scheduleProposal(s,localDate(new Date(at())),'08:00').length===0,'no invented automatic schedule');
const before=JSON.stringify(s);assert.throws(()=>updateStudio(s,{type:'studio.editPlan',cardId:a,minutes:-1,changes:{title:'바뀌면 안 됨'}}));ok(before===JSON.stringify(s),'invalid compound edit atomic');
const old=update(createState(at()),{type:'create',title:'이전 형식 합성 과제',minutes:25},at());const saved=JSON.stringify(old.lab);validate(old);ok(saved===JSON.stringify(old.lab),'legacy-shaped positive records without studio metadata not converted');
fs.mkdirSync('generated-artifacts/nuvia-task-add',{recursive:true});
console.log(`PASS task-add ${count} checks: four areas/unknown canonical/elapsed/pause/monthly/roadmap/backup/default proof/dedup/reuse/timed choices/repeat/order/previous records.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
