import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createStudio,updateStudio} from '../../artifacts/nuvia-ui-review/src/studio/studio-logic';
import {student,routeFor} from '../../artifacts/nuvia-ui-review/src/studio/domain';
import {validate,exportBackup,importBackup} from '../../artifacts/nuvia-ui-review/src/studio/persistence';
import {DEMOS,AXES} from '../../artifacts/nuvia-ui-review/src/official/adaptive/engine';
import {recommendations,practiceStats} from '../../artifacts/nuvia-ui-review/src/practice-recommendations/domain';
import {resources,content,text,ageContent} from '../../artifacts/nuvia-ui-review/src/practice-recommendations/i18n';
import {stages,templateIds} from '../../artifacts/nuvia-ui-review/src/practice-recommendations/model';
import {practiceReport} from '../../artifacts/nuvia-ui-review/src/practice-recommendations/report';
import {practiceTitle} from '../../artifacts/nuvia-ui-review/src/practice-recommendations/display';
import {locales} from '../../artifacts/nuvia-ui-review/src/studio/i18n/config';
import {label,setLocale} from '../../artifacts/nuvia-ui-review/src/studio/i18n/runtime';
import {previewSteps} from '../../artifacts/nuvia-ui-review/src/practice-recommendations/catalog';
let count=0;const ok=(f:()=>void)=>{f();count++;},at='2026-10-24T10:00:00.000Z';
function fixture(stage:typeof stages[number]='adult'){
 const s=createStudio(at);s.mode='review';const p=student(s);
 p.stage=stage;p.assessment=structuredClone(DEMOS[0]);p.assessment.educationStage=stage;p.assessment.subjectId=p.id;p.assessment.assessmentId='synthetic-'+p.id;return s;
}
for(const stage of stages)for(let combo=0;combo<81;combo++){
 let bits=combo;const s=fixture(stage),p=student(s);
 for(const axis of AXES){p.assessment!.axes[axis].level=(['low','mid','high'] as const)[bits%3];bits=Math.floor(bits/3);}
 p.assessment!.supportOrder=AXES.filter(a=>p.assessment!.axes[a].level==='low').reverse();
 p.assessment!.strengthOrder=AXES.filter(a=>p.assessment!.axes[a].level==='high').reverse();
 const before=JSON.stringify(s);
 for(let round=0;round<Math.max(2,p.assessment!.supportOrder.length*2);round++){
  p.round=round;const expected=routeFor(p),recs=recommendations(s);
  ok(()=>assert.equal(recs.length,2));ok(()=>assert(recs.every(r=>r.target===expected.target&&r.officialHelp===expected.support&&r.stage===stage&&r.basis==='result')));
 }
 p.round=0;ok(()=>assert.equal(JSON.stringify(s),before));
}
for(const locale of locales){
 if(locale==='ko'){
  ok(()=>assert.deepEqual(previewSteps('high','successive',['2026-11-10','2026-11-12','first action','second action']),['first action','second action']));
  ok(()=>assert.deepEqual(previewSteps('adult','successive',['owner','dependency','handoff','first action','second action']),['first action','second action']));
  ok(()=>assert.deepEqual(previewSteps('middle','successive',['first',' ','third']),['first','third']));
  ok(()=>assert.equal(previewSteps('high','planning',['date','date','condition','condition']),undefined));
 }
 setLocale(locale);
 for(const key of ['날짜','최종 마감','책임자','먼저 끝나야 하는 일','넘겨줄 곳','다른 사람을 기다리는 중'])if(locale!=='ko')ok(()=>assert(!/[가-힣]/.test(String(label(key,locale)))));
 const keys=Object.keys(resources.ko).sort();ok(()=>assert.deepEqual(Object.keys(resources[locale]).sort(),keys));
 for(const key of keys){
  const value=text(locale,key);ok(()=>assert(value.trim().length>0&&!/<\/?\w|https?:\/\//.test(value)));
  if(locale!=='ko')ok(()=>assert(!/[가-힣]/.test(value)));
 }
 const s=fixture();s.studio!.locale=locale;const rec=recommendations(s)[0],requestId=crypto.randomUUID();
 let n=updateStudio(s,{type:'practice.view',templateId:rec.id,stage:rec.stage},at,true);
 ok(()=>assert.equal(student(n).cards.length,0));ok(()=>assert.equal(student(n).round,0));
 const a={type:'practice.add' as const,templateId:rec.id,stage:rec.stage,help:'successive' as const,requestId,provided:{title:true,firstAction:true,scope:true},
  task:{title:content(locale,rec.id,'title'),firstAction:content(locale,rec.id,'action'),scope:ageContent(locale,rec.stage,'scope'),minutes:rec.minutes,requestId,timeChosen:false,scopeChosen:false,planReviewed:false}};
  n=validate(updateStudio(n,{...a,details:{owner:'QA owner',dependency:'prior step',waiting:true}},at,true));const id=student(n).cards[0].id;
 ok(()=>assert.equal(student(n).cards.length,1));ok(()=>assert.equal(student(n).runs.length,0));
 ok(()=>assert.equal(student(n).cards[0].evidence.planConfirmed,false));ok(()=>assert.equal(student(n).cards[0].evidence.planChanged,false));
  ok(()=>assert.equal(student(n).cards[0].history.length,1));
  ok(()=>assert.equal(Object.values(n.studio!.sources!).find(source=>source.cardId===id)!.version,1));
 ok(()=>assert.equal(student(n).round,0));ok(()=>assert.equal(n.entries.length,0));ok(()=>assert.equal(n.agreements.length,0));
 ok(()=>assert.equal(updateStudio(n,a,at,true),n));
 n=updateStudio(n,{type:'studio.place',cardId:id},at,true);
 n=updateStudio(n,{type:'legacy',command:{type:'run.start',cardId:id}},at,true);
  let r=student(n).runs[0];ok(()=>assert.equal(r.support,'successive'));ok(()=>assert.equal(r.supportHistory.length,1));
 n=updateStudio(n,{type:'legacy',command:{type:'run.pause',runId:r.id}},'2026-10-24T10:00:08.000Z',true);
 n=updateStudio(n,{type:'legacy',command:{type:'run.flag',runId:r.id,flag:'authored checkpoint'}},'2026-10-24T10:00:08.000Z',true);
 n=updateStudio(n,{type:'legacy',command:{type:'run.resume',runId:r.id}},'2026-10-24T10:00:12.000Z',true);
 n=updateStudio(n,{type:'legacy',command:{type:'run.review',runId:r.id}},'2026-10-24T10:00:20.000Z',true);
 n=updateStudio(n,{type:'legacy',command:{type:'run.close',runId:r.id,completion:'yes'}},'2026-10-24T10:00:21.000Z',true);
 ok(()=>assert.equal(student(n).round,0));ok(()=>assert.equal(n.entries[0].status,'unobserved'));
 ok(()=>assert.equal(practiceStats(n,id).uses,1));ok(()=>assert.equal(practiceStats(n,id).unanswered,1));
 for(const value of ['yes','neutral','no'] as const)n=updateStudio(n,{type:'practice.respond',cardId:id,value},'2026-10-24T10:00:22.000Z',true);
 ok(()=>assert.equal(practiceStats(n,id).responses,1));ok(()=>assert.equal(practiceStats(n,id).no,1));
 ok(()=>assert.equal(n.studio!.practice!.attachments[id].reports.length,3));
 n=validate(n);const backup=await exportBackup(n,'personal'),restored=await importBackup(backup,n);
 ok(()=>assert.deepEqual(restored.studio!.practice,n.studio!.practice));
 ok(()=>assert(practiceReport(n,'2026-10').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').includes(text(locale,'noEffect'))));
 ok(()=>assert.equal(practiceReport(n,'2026-09'),''));
 const other=structuredClone(n);other.studio!.locale=locale==='ko'?'en':'ko';
 ok(()=>assert.equal(practiceTitle(other,student(other).cards[0]),content(other.studio!.locale,rec.id,'title')));
 student(other).cards[0].title='student authored';ok(()=>assert.equal(practiceTitle(other,student(other).cards[0]),'student authored'));
 ok(()=>assert.deepEqual(n.studio!.practice!.attachments[id].source,student(s).assessment));
}
{
 let s=fixture();student(s).assessment!.axes.attention.level='low';
 student(s).assessment!.supportOrder=['planning','attention'];
 const rec=recommendations(s)[0],requestId=crypto.randomUUID();
 const a={type:'practice.add' as const,templateId:rec.id,stage:rec.stage,help:rec.help,requestId,task:{title:'actual learner task',scope:'two actual materials',firstAction:'pick one actual item',minutes:5,requestId,timeChosen:false}};
 s=updateStudio(s,a,at,true);const id=student(s).cards[0].id;
 s=updateStudio(s,{type:'legacy',command:{type:'card.plan',cardId:id}},at,true);
 s=updateStudio(s,{type:'studio.place',cardId:id},at,true);
 s=updateStudio(s,{type:'legacy',command:{type:'run.start',cardId:id}},at,true);
 const run=student(s).runs[0];
 s=updateStudio(s,{type:'legacy',command:{type:'run.review',runId:run.id}},'2026-10-24T10:01:00.000Z',true);
 s=updateStudio(s,{type:'legacy',command:{type:'run.close',runId:run.id,completion:'yes'}},'2026-10-24T10:01:01.000Z',true);
 ok(()=>assert.equal(student(s).round,1));ok(()=>assert.equal(s.entries[0].status,'performed'));
 ok(()=>assert(recommendations(s).every(r=>r.target==='attention')));
 ok(()=>assert.equal(updateStudio(s,a,at,true),s));ok(()=>assert.equal(student(validate(JSON.parse(JSON.stringify(s)))).round,1));
}
for(const stage of stages){
 const s=fixture(stage);s.mode='personal';
 ok(()=>assert.equal(recommendations(s).length,stage.startsWith('elementary')?0:2));
}
for(const kind of ['none','missing-order','invalid','tie','all-low','all-mid','all-high']){
 const s=fixture(),p=student(s);
 if(kind==='none')p.assessment=null;
 if(kind==='invalid')p.assessment!.axes.planning.unit='mixed-unit';
 if(kind==='missing-order'||kind==='all-low'){for(const axis of AXES)p.assessment!.axes[axis].level='low';p.assessment!.supportOrder=kind==='all-low'?[...AXES]:undefined;}
 if(kind==='all-mid'||kind==='all-high')for(const axis of AXES)p.assessment!.axes[axis].level=kind==='all-mid'?'mid':'high';
 if(kind==='tie'){p.assessment!.axes.attention.level='high';p.assessment!.strengthOrder=undefined;}
 const r=recommendations(s);ok(()=>assert.equal(r.length,2));ok(()=>assert.equal(student(s).round,0));
 if(['none','missing-order','invalid'].includes(kind))ok(()=>assert(r.every(x=>x.basis==='general'&&x.target==='integrated')));
}
ok(()=>assert.equal(templateIds.length,10));ok(()=>assert.equal(templateIds.length*stages.length,50));
fs.mkdirSync('generated-artifacts/studio-practice',{recursive:true});
fs.writeFileSync('generated-artifacts/studio-practice/automatic-summary.json',JSON.stringify({assertions:count,locales:locales.length,combinations:81,ages:5,templates:10,ageVariants:50,browser:false},null,2));
console.log(`PASS daily practice ${count} assertions: 81×5 age contracts; 15 locales; create/run/backup/provenance/no auto credit.`);
