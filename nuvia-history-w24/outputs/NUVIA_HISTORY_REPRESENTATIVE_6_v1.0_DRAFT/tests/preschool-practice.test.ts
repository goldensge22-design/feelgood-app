import test from 'node:test';
import assert from 'node:assert/strict';
import {loadContent} from '../src/core/content';
import {releaseContent} from '../src/core/release';
import {newRun,transition,assertRun} from '../src/core/engine';
import {PRACTICE_DOMAINS,type PracticeDomain,type PracticeStep} from '../src/core/types';
import {phases,practiceValue,validatePracticeSteps,practiceMethods,sequenceCards,shuffled} from '../src/core/preschoolPractice';
import {kidKo,kidTranslationAudit,kidText,KID_PLANNED_LOCALES} from '../src/content/preschool.ko';
import {MemoryRepository} from '../src/core/storage';
import {bookModel,reportModel} from '../src/core/artifacts';
import {deterministic,profile} from './helpers';
import entry from '../src/content/app-entry.json';
import semantic from '../src/content/w24-semantic.json';
import strings from '../src/content/locales/w24-semantic.ko.json';
const base=await loadContent(),bundle=releaseContent(base,entry,semantic,strings);
export function trace(domain:PracticeDomain,cid:string,method=practiceMethods(cid)[0].id):PracticeStep[]{const paper=cid.endsWith('c1');return phases(domain).map(phase=>({phase,ids:phase==='context'?[]:phase==='goal'?[paper?'make':'hear']:['method','revise','observe','linkMethod','scene'].includes(phase)?[method]:phase==='sequence'?sequenceCards(cid,method).map(x=>x.id):['linkPerson','findPerson'].includes(phase)?[paper?'printer':'reader']:phase==='linkPlace'?[paper?'press':'place']:[paper?'oneSheet':'day']}));}
for(const domain of PRACTICE_DOMAINS)for(const cid of ['gutenberg.c1','gutenberg.c2'])test(`${domain}/${cid}: required actions, restore, independent reason and full book`,async()=>{
 const d=deterministic(),repo=new MemoryRepository();let r=newRun(bundle,'gutenberg',{...profile,practiceDomain:domain},d);await repo.create(r);
 async function apply(c:Parameters<typeof transition>[1]){const next=transition(r,c,d);await repo.save(next,r.revision);r=(await repo.load(r.resultId,r.profile.learnerId))!;}
 for(const c of r.contentSnapshot.conditions)await apply({type:'historyViewed',conditionId:c.id});await apply({type:'continueHistory'});await apply({type:'selectCondition',conditionId:cid});await apply({type:'prediction',expression:{method:'unknown',text:''}});
 const steps=trace(domain,cid),value=practiceValue(domain,cid,steps);
 assert.throws(()=>transition(r,{type:'action',value,reason:{source:'deferred'}},d),/PRACTICE/);
 assert.throws(()=>transition(r,{type:'deferAction',reason:'skip'},d),/PRACTICE_REQUIRED/);
 assert.throws(()=>transition(r,{type:'story',expression:{method:'text',text:'이야기'}},d),/INVALID_STAGE/);
 for(const step of steps)await apply({type:'practiceStep',step});assert.equal(r.action.status,'notRecorded');assert.equal(r.reasonExpressions,undefined);
 await apply({type:'action',value,reason:{source:'deferred'}});assert.equal(r.action.status,'recorded');assert.equal(r.events.filter(e=>e.eventType==='practiceInteraction').length,steps.length);assert.equal(r.reasonExpressions,undefined);
 await apply({type:'reveal',possibility:'A'});assert.throws(()=>transition(r,{type:'story',expression:{method:'skip',text:''}},d),/STORY_INPUT_REQUIRED/);await apply({type:'story',expression:{method:'text',text:'내가 만든 이야기'}});
 for(const kind of ['history','prediction'] as const)await apply({type:'comparison',kind,expression:{method:'skip',text:''}});
 assert.equal(r.stage,'complete');assertRun(r);assert.equal(bookModel(r).pages.length,8);assert.equal(reportModel(r).details.observationStatus,'recorded');assert.deepEqual(reportModel(r).together.thoughts,[]);
 const corrupt=structuredClone(r);corrupt.events=corrupt.events.filter(e=>e.eventType!=='practiceInteraction');assert.throws(()=>assertRun(corrupt),/PRACTICE/);
});
test('all six methods have valid distinct choices and independent outcome IDs',()=>{for(const cid of ['gutenberg.c1','gutenberg.c2'])for(const method of practiceMethods(cid))for(const domain of PRACTICE_DOMAINS)assert.equal(practiceValue(domain,cid,trace(domain,cid,method.id)).methodId,method.id);});
test('sequence permits alternatives before the final step; rejects finishing first',()=>{const steps=trace('sequential','gutenberg.c2');steps.find(s=>s.phase==='sequence')!.ids=['meet','prepare','finish'];assert.doesNotThrow(()=>validatePracticeSteps('sequential','gutenberg.c2',steps,true));steps.find(s=>s.phase==='sequence')!.ids=['finish','prepare','meet'];assert.throws(()=>validatePracticeSteps('sequential','gutenberg.c2',steps,true),/PRACTICE_SEQUENCE/);});
test('relation and attention gates reject irrelevant choices',()=>{for(const domain of ['simultaneous','attention'] as const){const steps=trace(domain,'gutenberg.c2');steps[domain==='attention'?1:2].ids=['listener'];assert.throws(()=>validatePracticeSteps(domain,'gutenberg.c2',steps,true),/PRACTICE_CHOICE/);}});
test('sequence presentation shuffles across seeds; original arrays stay unchanged',()=>{const cards=sequenceCards('gutenberg.c2','tell'),before=JSON.stringify(cards);assert.ok(new Set(Array.from({length:20},(_,i)=>shuffled(cards,String(i)).map(x=>x.id).join())).size>1);assert.equal(JSON.stringify(cards),before);});
test('new runtime preserves source mission and legacy profiles',()=>{assert.equal(base.missions[0].conditions[0].activity.actionKind,'revisePlan');const legacy=newRun(bundle,'gutenberg',profile,deterministic());assert.notEqual(legacy.contentSnapshot.conditions[0].activity.actionKind,'preschoolActivity');assert.equal(newRun(bundle,'gutenberg',{...profile,practiceDomain:'attention'},deterministic()).contentSnapshot.conditions[0].activity.actionKind,'preschoolActivity');});
test('supported locale has every ID; all unprovided locales fail without Korean fallback',()=>{assert.ok(Object.keys(kidKo).length>60);assert.deepEqual(kidTranslationAudit('ko').missing,[]);for(const locale of KID_PLANNED_LOCALES.filter(x=>x!=='ko')){assert.equal(kidTranslationAudit(locale).missing.length,Object.keys(kidKo).length);assert.throws(()=>kidText('goal',locale),/TRANSLATION_MISSING/);}});
