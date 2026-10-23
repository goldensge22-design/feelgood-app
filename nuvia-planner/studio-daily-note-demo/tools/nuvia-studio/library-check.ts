import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createStudio,updateStudio} from '../../artifacts/nuvia-ui-review/src/studio/studio-logic';
import {student} from '../../artifacts/nuvia-ui-review/src/studio/domain';
import {validate,exportBackup,importBackup,checksum} from '../../artifacts/nuvia-ui-review/src/studio/persistence';
import {bindings,selectableTemplates,lookupBinding,sourceVersion,attachmentOf} from '../../artifacts/nuvia-ui-review/src/planner-library/domain';
import {locales} from '../../artifacts/nuvia-ui-review/src/studio/i18n/config';
import resources from '../../artifacts/nuvia-ui-review/src/planner-library/resources.json';
import {libText} from '../../artifacts/nuvia-ui-review/src/planner-library/i18n';
import type {Action} from '../../artifacts/nuvia-ui-review/src/studio/model';
let count=0,clock=Date.parse('2026-10-23T01:00:00Z'),s=createStudio(new Date(clock).toISOString());
const ok=(f:()=>void)=>{f();count++;};
const act=(a:Action)=>{s=validate(updateStudio(s,a,new Date(clock+=1000).toISOString(),s.mode==='review'));};
const cmd=(command:any)=>act({type:'legacy',command});
const id=()=>student(s).cards.at(-1)!.id;
const reset=(stage:'middle'|'high'|'adult'='adult')=>{s=createStudio(new Date(clock).toISOString());s.mode='review';act({type:'studio.setup',stage});s.onboarding=true;};
for(const locale of locales){ok(()=>assert.equal(resources[locale].length,resources.keys.length));for(const key of resources.keys)ok(()=>{const v=libText(locale,key as any);assert(v.trim());assert(!/[<>]/.test(v));if(locale!=='ko')assert(!/[가-힣]/.test(v));});}
ok(()=>assert.equal(bindings.length,337));
for(const b of bindings){reset(b.population==='adult'?'adult':'middle');const cards=selectableTemplates(s,b.id,true);ok(()=>assert.equal(cards.length,6));ok(()=>assert.equal(lookupBinding(b.population,b.sourceRef.id,sourceVersion)?.id,b.id));ok(()=>assert.equal(lookupBinding(b.population,b.sourceRef.id,'unknown'),undefined));for(const c of cards){act({type:'library.create',task:{title:'User task',minutes:25,requestId:crypto.randomUUID()},bindingId:b.id,templateId:c.id});ok(()=>assert.equal(attachmentOf(s,id())!.templateId,c.id));}}
reset();const b=bindings.find(b=>b.population==='adult')!,template=b.templateIds[0];
const create:Action={type:'library.create',task:{title:'Private practice',minutes:25,requestId:'qa-dedup'},bindingId:b.id,templateId:template};act(create);const taskId=id();act(create);ok(()=>assert.equal(student(s).cards.length,1));
const before=JSON.stringify(s);ok(()=>assert.throws(()=>updateStudio(s,{type:'library.create',task:{title:'Invalid',minutes:25},bindingId:'missing',templateId:template},new Date(clock).toISOString(),true)));ok(()=>assert.equal(JSON.stringify(s),before));
ok(()=>assert.throws(()=>updateStudio(s,{type:'library.confirm',cardId:taskId},new Date(clock).toISOString(),true)));
act({type:'library.answers',cardId:taskId,answers:['Check items','Ask the responsible person','Record the handoff']});ok(()=>assert.equal(s.entries.length,0));ok(()=>assert.equal(student(s).round,0));
act({type:'studio.place',cardId:taskId});cmd({type:'run.start',cardId:taskId});const run=()=>student(s).runs.at(-1)!;
clock+=60000;cmd({type:'run.pause',runId:run().id});cmd({type:'run.flag',runId:run().id,flag:'Second item'});clock+=300000;cmd({type:'run.resume',runId:run().id});clock+=60000;
cmd({type:'run.review',runId:run().id});cmd({type:'run.close',runId:run().id,completion:'no',next:'today'});
ok(()=>assert.equal(attachmentOf(s,taskId)!.confirmedRunId,''));ok(()=>assert.equal(student(s).cards[0].status,'planned'));
const entries=JSON.stringify(s.entries);act({type:'library.confirm',cardId:taskId});ok(()=>assert.equal(attachmentOf(s,taskId)!.confirmedRunId,run().id));ok(()=>assert.equal(JSON.stringify(s.entries),entries));
ok(()=>assert(Object.values(s.studio!.sources).every(x=>x.snapshot.practiceContext==='simulation')));
const backup=await exportBackup(s,'personal'),restored=await importBackup(backup,s);ok(()=>assert.deepEqual(restored.studio,s.studio));
for(const mutate of [(x:any)=>x.data.studio.libraryAttachments[taskId].templateId='missing',(x:any)=>x.data.studio.libraryAttachments[taskId].confirmedRunId='missing',(x:any)=>delete x.data.studio.libraryAttachments,(x:any)=>x.data.studio.libraryAttachments[taskId].catalogCommit='bad']){const raw=JSON.parse(backup);mutate(raw);raw.checksum=await checksum(raw.data);await assert.rejects(()=>importBackup(JSON.stringify(raw),s));count++;}
await assert.rejects(()=>importBackup(backup,createStudio()));count++;
for(const locale of locales){act({type:'studio.locale',locale});ok(()=>assert.equal(selectableTemplates(s,b.id,true).length,locale==='ko'?6:0));ok(()=>assert.equal(attachmentOf(s,taskId)!.answers[0],'Check items'));}
act({type:'studio.locale',locale:'ko'});act({type:'library.answers',cardId:taskId,answers:['Changed','Ask','Record']});ok(()=>assert.equal(attachmentOf(s,taskId)!.confirmedRunId,''));ok(()=>assert.equal(attachmentOf(s,taskId)!.history.length,2));
for(const stage of ['middle','high','adult'] as const){reset(stage);const binding=bindings.find(b=>b.population===(stage==='adult'?'adult':'teen'))!;act({type:'library.create',task:{title:'Age example',minutes:10},bindingId:binding.id,templateId:binding.dailyTemplateIds[0]});ok(()=>assert.equal(attachmentOf(s,id())!.kind,'daily'));}
const personal=createStudio();ok(()=>assert.equal(selectableTemplates(personal,b.id,true).length,0));ok(()=>assert.throws(()=>updateStudio(personal,create,new Date(clock).toISOString(),false)));ok(()=>assert.equal(student(personal).cards.length,0));
for(const stage of ['middle','high'] as const){reset(stage);fs.writeFileSync(`generated-artifacts/library-qa/fixture-${stage}.json`,JSON.stringify(s));}
reset();act({type:'library.create',task:{title:'Library QA task',minutes:25},bindingId:b.id,templateId:template});fs.writeFileSync('generated-artifacts/library-qa/fixture.json',JSON.stringify(s));
fs.writeFileSync('generated-artifacts/library-qa/result.json',JSON.stringify({passed:count,bindings:337,templateConnections:2022,locales:15}));console.log(`PASS library integration: ${count} assertions`);
