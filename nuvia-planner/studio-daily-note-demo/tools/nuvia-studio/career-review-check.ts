import assert from 'node:assert/strict';
import * as m from '../../artifacts/nuvia-ui-review/src/career-review/model';
import {COPY,display,choiceLabel,getFixtureReport,isFixture} from '../../artifacts/nuvia-ui-review/src/career-review/copy';
let checks=0;
function ok(value:unknown){assert.ok(value);checks++;}
function eq(a:unknown,b:unknown){assert.deepEqual(a,b);checks++;}
function rejects(f:()=>unknown,code:m.ErrorCode){assert.throws(f,(e:unknown)=>e instanceof m.ReviewError&&e.code===code);checks++;}
const report:m.Report={schema:'nuvia-career-review-report/v1',id:'source-adult',version:'1',population:'adult',synthetic:true,
 source:{name:'Unmodified source name',issuedAt:'2026-10-01',uri:'urn:synthetic'},
 pass:m.DOMAIN_IDS.map((id,i)=>({id,score:[42,58,76,65][i],unit:'%',level:['L','M','H','M'][i],interpretation:'Original interpretation '+id})),
 occupations:Array.from({length:5},(_,i)=>({id:'job-'+i,rank:i+1,label:'Original job '+i,source:'original ranking source'}))};
const raw=JSON.stringify(report);
let s=m.installReport(m.fresh('owner'),report);
eq(s.reports[0],report);eq(JSON.stringify(report),raw);
eq(m.parseReport(raw),report);
for(const bad of [
 {...report,population:'youth'}, {...report,pass:report.pass.slice(1)},
 {...report,pass:report.pass.map((p,i)=>i? p:{...p,score:NaN})},
 {...report,pass:report.pass.map(p=>({...p,id:'attention'}))},
 {...report,occupations:[...report.occupations].reverse()},
 {...report,occupations:report.occupations.map(o=>({...o,id:'duplicate'}))},
 {...report,occupations:report.occupations.slice(0,4)},
 {...report,source:{...report.source,name:''}},
])rejects(()=>m.validateReport(bad),'invalidReport');
rejects(()=>m.parseReport('{"__proto__":{}}'),'invalidReport');
rejects(()=>m.installReport(s,{...report,source:{...report.source,name:'changed same version'}}),'invalidReport');
s=m.choose(s,{kind:'recommended',id:'job-0',label:'Original job 0'});
rejects(()=>m.choose(s,{kind:'recommended',id:'job-0',label:'invented'}),'invalidAction');
rejects(()=>m.savePlan(s,'t1','date'),'required');
s={...s,draft:{...s.draft,title:'User original title',method:'Ask two stakeholders',criteria:'Both replies recorded',evidence:'A comparison table'}};
const originalPlan=JSON.stringify(s.draft);
s=m.savePlan(s,'t1','2026-10-22');eq(s.runs.length,0);eq(s.tasks.length,1);
s=m.savePlan(s,'t1','2026-10-22');eq(s.tasks[0].revisions.length,1);
s=m.start(s,'t1','r1',1000);eq(s.runs.length,1);eq(m.start(s,'t1','r1',2000),s);
rejects(()=>m.start(s,'t1','r2',2000),'activeRun');
rejects(()=>m.openExperience(s,'r1','e1'),'invalidAction');
s=m.clock(s,'r1','tick',4000);eq(s.runs[0].elapsedMs,3000);
s=m.clock(s,'r1','pause',9000);eq(s.runs[0].elapsedMs,8000);
s=m.clock(s,'r1','tick',99000);eq(s.runs[0].elapsedMs,8000);
s=m.clock(s,'r1','resume',100000);
s=m.clock(s,'r1','end',102000);eq(s.runs[0].elapsedMs,10000);
eq(JSON.stringify(s.tasks[0].revisions[0].plan),originalPlan);
s=m.openExperience(s,'r1','e1');s=m.openExperience(s,'r1','e2');eq(s.experiences.length,1);
rejects(()=>m.confirmExperience(s,'e1','now'),'required');
rejects(()=>m.exportMaterial(s,'e1'),'stale');
s=m.updateExperience(s,'e1',{...s.experiences[0].fields,action:'I spoke to two colleagues',result:'Both replies added to table'},['action']);
s=m.confirmExperience(s,'e1','confirmed');ok(m.canExport(s,s.experiences[0]));
const export1=m.exportMaterial(s,'e1');eq(export1.statements.length,1);eq(export1.statements[0].text,'I spoke to two colleagues');
ok(!JSON.stringify(export1).includes('Both replies added to table'));ok(!JSON.stringify(export1).includes('interpretation'));
eq(export1.source.originalRecommendation,{id:'job-0',rank:1,source:'original ranking source'});
eq(m.confirmExperience(s,'e1','double-confirm'),s);
const confirmedSnapshot=JSON.stringify(s.experiences[0].history[0]);
eq(m.parseBackup(JSON.stringify(s),'owner'),s);
rejects(()=>m.parseBackup(JSON.stringify(s),'other-owner'),'wrongOwner');
for(const broken of [
 {...s,activeReport:{id:'missing',version:'1'}},
 {...s,runs:[{...s.runs[0],taskVersion:99}]},
 {...s,runs:[{...s.runs[0],elapsedMs:-1}]},
 {...s,experiences:[{...s.experiences[0],runId:'unknown'}]},
 {...s,experiences:[{...s.experiences[0],fields:{...s.experiences[0].fields,action:'silently changed'}}]},
 {...s,experiences:[s.experiences[0],{...s.experiences[0],id:'duplicate-run'}]},
 {...s,tasks:[s.tasks[0],s.tasks[0]]},
 {...s,locale:'invalid'},
 {...s,selectedExperienceId:'missing'},
])rejects(()=>m.parseBackup(JSON.stringify(broken),'owner'),'invalidBackup');
s=m.editTask(s,'t1');s={...s,draft:{...s.draft,method:'Changed future method'}};
s=m.savePlan(s,'unused','later');eq(s.tasks[0].revisions.length,2);ok(!m.canExport(s,s.experiences[0]));
rejects(()=>m.exportMaterial(s,'e1'),'stale');
eq(JSON.stringify(s.tasks[0].revisions[0].plan),originalPlan);
s=m.confirmExperience(s,'e1','reconfirmed revision');ok(m.canExport(s,s.experiences[0]));
eq(m.exportMaterial(s,'e1').source.executedTaskVersion,1);
eq(m.exportMaterial(s,'e1').source.acknowledgedTaskVersion,2);
eq(JSON.stringify(s.experiences[0].history[0]),confirmedSnapshot);
s=m.installReport(s,{...report,version:'2',source:{...report.source,name:'New report version'}});
ok(!m.canExport(s,s.experiences[0]));
s=m.confirmExperience(s,'e1','reconfirmed report');ok(m.canExport(s,s.experiences[0]));
eq(m.exportMaterial(s,'e1').source.originalReport?.version,'1');
eq(m.exportMaterial(s,'e1').source.reconfirmedReport?.version,'2');
eq(s.reports[0],report);
s=m.updateExperience(s,'e1',{...s.experiences[0].fields,action:'Corrected self-report'},['action']);ok(!m.canExport(s,s.experiences[0]));
eq(JSON.stringify(s.experiences[0].history[0]),confirmedSnapshot);
s=m.confirmExperience(s,'e1','corrected confirmed');ok(m.canExport(s,s.experiences[0]));
eq(m.parseBackup(JSON.stringify(s),'owner'),s);
let general=m.fresh('owner2');
general=m.choose(general,{kind:'custom',id:'',label:'My own occupation'});
general={...general,draft:{...general.draft,title:'General task',method:'My method',criteria:'My criteria',evidence:'My evidence'}};
general=m.savePlan(general,'tg','now');general=m.start(general,'tg','rg',10);
general=m.clock(general,'rg','tick',110);
const recovered=m.parseBackup(JSON.stringify(general),'owner2');
eq(recovered.runs[0].phase,'paused');eq(recovered.runs[0].elapsedMs,100);
eq(recovered.runs[0].lastAt,null);eq(general.runs[0].phase,'running');
for(const locale of ['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'] as const){
 const switched={...general,locale};eq(switched.draft,general.draft);eq(switched.runs,general.runs);
 eq(m.parseBackup(JSON.stringify(switched),'owner2').locale,locale);
 const keys=Object.keys(COPY.en).sort(),pack=COPY[locale];
 eq(Object.keys(pack).sort(),keys);
 for(const key of keys){
  const value=pack[key as keyof typeof pack];ok(typeof value==='string'&&value.trim().length>0);
  eq([...value.matchAll(/\{(\w+)\}/g)].map(x=>x[1]).sort(),[...COPY.en[key as keyof typeof pack].matchAll(/\{(\w+)\}/g)].map(x=>x[1]).sort());
  ok(!/<\/?[a-z][^>]*>/i.test(value));if(locale!=='ko')ok(!/[가-힣]/.test(value));
 }
 const fixture=getFixtureReport(),bytes=JSON.stringify(fixture),shown=display(locale,fixture);
 ok(shown.fixture);eq(shown.source,pack.fixtureSource);eq(shown.interp(0),pack.fixtureInterp);
 fixture.occupations.forEach((o,i)=>eq(shown.job(i),pack[`job${i+1}` as keyof typeof pack]));
 eq(choiceLabel(locale,fixture,{kind:'recommended',...fixture.occupations[0]}),pack.job1);
 eq(JSON.stringify(fixture),bytes);
 const edited={...fixture,source:{...fixture.source,name:'User-edited original source'}};
 ok(!isFixture(edited));eq(display(locale,edited).source,'User-edited original source');
 eq(display(locale,report).interp(0),report.pass[0].interpretation);
 eq(display(locale,report).job(0),report.occupations[0].label);
 eq(choiceLabel(locale,fixture,{kind:'custom',id:'fixture-job-1',label:'사용자 원문'}),'사용자 원문');
 console.log(`locale ${locale}: PASS ${keys.length} keys, placeholders/markup/foreign Hangul and fixture/raw source preservation`);
}
console.log(`PASS career review domain ${checks} assertions: source/order preservation, no score/rank calculation, task and experience revisions, pause/offline exclusion, version-gated selected export, local ownership/backup validation and 15 locale state invariants.`);
