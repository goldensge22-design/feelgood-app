import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {lookupReleased,findBinding} from './lookup.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const hash=x=>crypto.createHash('sha256').update(String(x).replace(/\r\n/g,'\n')).digest('hex');
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const unique=xs=>new Set(xs).size===xs.length;
const manifest=read('manifest.json'),catalog=read('catalog.json'),cards=read('cards.json'),bindings=read('bindings.json'),families=read('families.json'),messages=read('locales/ko.json'),registry=read('translation-plan.json');
const baseCards=read('../cards.json'),baseMessages=read('../locales/ko.json'),behaviors=read('../behaviors.json');
const allCards=[...baseCards,...cards],allMessages={...baseMessages,...messages};
const data={manifest,bindings,cards:allCards,sourceMessages:allMessages,packs:{}};
let checks=0;
const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const input=b=>({population:b.population,sourceId:b.sourceRef.id,sourceVersion:catalog.sourceCommit,locale:'ko',audience:b.population==='adult'?'university-adult':'middle'});
test('legacy text preserved across checkout line endings',()=>{for(const [p,digest]of Object.entries(manifest.preservedFiles))assert.equal(hash(fs.readFileSync(path.join(root,'..',p))),digest);});
test('generated artifacts reproducible',()=>execFileSync(process.execPath,[path.join(root,'build.mjs'),'--check']));
test('source fixed 61 adult majors and 311 unique reachable IDs',()=>{assert.equal(catalog.adult.majorJobs.length,61);assert.equal(catalog.adult.jobs.length,311);assert(unique(catalog.adult.jobs.map(j=>j.id)));assert.deepEqual(catalog.adult.excludedJobs.map(j=>j.id),['2237']);assert.deepEqual([...new Set(catalog.adult.majorJobs.flatMap(m=>m.jobIds))].sort(),catalog.adult.jobs.map(j=>j.id).sort());});
test('teen 8 categories 61 majors 27 occurrences 26 names',()=>{assert.equal(Object.keys(catalog.teen.categoryMajors).length,8);assert.equal(Object.values(catalog.teen.categoryMajors).flat().length,61);assert.equal(catalog.teen.jobs.length,26);assert.equal(catalog.teen.jobs.flatMap(j=>j.occurrences).length,27);});
test('source has no PASS vectors or personal payload',()=>{const s=JSON.stringify(catalog);for(const field of ['pass_profile','fit','scores','ownerId','studentId','resultId','userId'])assert(!s.includes('"'+field+'":'));assert(Object.values(catalog.sourceHashes).every(h=>/^[a-f0-9]{64}$/.test(h)));});
test('duplicate names keep IDs and no fuzzy identity merge',()=>{assert.equal(catalog.adult.duplicateLabels.length,13);assert.equal(catalog.exactNameLinks.length,6);assert(catalog.exactNameLinks.every(x=>x.identityConfirmed===false));assert.equal(new Set(catalog.adult.jobs.map(j=>j.label)).size,297);});
function validateBindings(bs){
 assert.equal(bs.length,337);assert(unique(bs.map(b=>b.id)));
 for(const b of bs){
  assert.equal(b.status,'draft');assert.equal(b.reviewedBy,null);assert.equal(b.domainReviewRequired,true);assert.equal(b.domainReviewedBy,null);
  const source=b.population==='adult'?catalog.adult.jobs:catalog.teen.jobs;assert(source.some(j=>j.id===b.sourceRef.id));assert.equal(b.sourceRef.version,catalog.sourceCommit);
  assert.equal(b.templateIds.length,3);assert(unique(b.templateIds));assert.equal(b.dailyTemplateIds.length,3);assert(unique(b.dailyTemplateIds));
  assert(b.templateIds.every(id=>cards.some(c=>c.id===id&&c.kind==='job-simulation')));
  assert(b.dailyTemplateIds.every(id=>allCards.some(c=>c.id===id&&c.kind==='daily')));
  for(let i=0;i<3;i++)assert.equal(allCards.find(c=>c.id===b.templateIds[i]).behaviorId,allCards.find(c=>c.id===b.dailyTemplateIds[i]).behaviorId);
  if(b.population==='adult'){assert(families.some(f=>f.id===b.familyId&&JSON.stringify(f.templateIds)===JSON.stringify(b.templateIds)));assert(b.templateIds.every(id=>cards.find(c=>c.id===id).audiences.join()==='university-adult'));}
  else assert(b.templateIds.every(id=>cards.find(c=>c.id===id).contextId===b.sourceRef.id&&cards.find(c=>c.id===id).audiences.join()==='middle,high'));
 }
}
test('all 337 source bindings three scenarios and three daily links',()=>validateBindings(bindings));
test('broken source mapping rejected',()=>{const bs=structuredClone(bindings);bs[0].sourceRef.id='missing';assert.throws(()=>validateBindings(bs));});
test('duplicate or broken card connections rejected',()=>{const bs=structuredClone(bindings);bs[0].templateIds[1]=bs[0].templateIds[0];assert.throws(()=>validateBindings(bs));bs[0].templateIds[1]='missing';assert.throws(()=>validateBindings(bs));});
test('daily originals exactly three per six behaviors',()=>{const d=allCards.filter(c=>c.kind==='daily');assert.equal(d.length,18);for(const b of behaviors)assert.equal(d.filter(c=>c.behaviorId===b.id).length,3);});
test('150 new and 162 stored originals distinct scenarios',()=>{assert.equal(cards.length,150);assert.equal(allCards.length,162);assert(unique(allCards.map(c=>c.id)));assert(unique(allCards.map(c=>allMessages[c.text.scenarioKey].normalize('NFKC').replace(/\s/g,''))));assert.equal(families.length,20);});
test('all new cards draft preserve evidence contract and no personal fields',()=>{
 const allowed=Object.keys(baseCards[0]).sort();
 for(const c of cards){assert.deepEqual(Object.keys(c).sort(),allowed);assert.equal(c.status,'draft');assert.equal(c.visibility,'internal-design');assert.equal(c.countsAsRealWorkExperience,false);assert.equal(c.completion,'user-confirmed-action-evidence-not-timer');assert.equal(c.personalization,'existing-pass-adapter-not-behavior-equals-pass');assert.deepEqual(c.evidenceFields,behaviors.find(b=>b.id===c.behaviorId).evidenceFields);assert.equal(c.source.reviewedBy,null);assert.equal(c.source.officialReferences.length,0);for(const k of Object.values(c.text).flat())assert(nonempty(allMessages[k]));}
});
test('new translation keys separate and all 15 statuses explicit',()=>{assert.deepEqual(Object.keys(registry).sort(),Object.keys(messages).sort());assert.equal(Object.keys(messages).length,810);for(const [k,v]of Object.entries(messages)){assert(!(k in baseMessages));assert(nonempty(v));assert(!/<[^>]+>/.test(v));assert.equal(registry[k].sourceHash,hash(v));assert.deepEqual(Object.keys(registry[k].locales),manifest.requiredLocales);for(const l of manifest.requiredLocales)assert.equal(registry[k].locales[l],l==='ko'?'draft':'needs-review');}});
const now=Date.parse('2026-10-23T00:00:00Z');
test('all 337 bindings blocked across 15 release locales, no automatic AI',()=>{for(const b of bindings)for(const locale of manifest.requiredLocales){const r=lookupReleased(data,{...input(b),locale},now);assert.equal(r.status,'unavailable');assert.deepEqual(r.cards,[]);assert.equal(r.aiRequested,false);}});
test('unknown ID version population fail closed',()=>{const i=input(bindings[0]);for(const change of [{sourceId:'unknown'},{sourceVersion:'next-version'},{population:'child'}])assert.equal(findBinding(data,{...i,...change}),null);});
function fixture(){const d=structuredClone(data);const b=d.bindings.find(b=>b.familyId==='text');Object.assign(b,{status:'reviewed',reviewedBy:'test-only',reviewedAt:'2026-10-22',domainReviewedBy:'test-only',domainReviewedAt:'2026-10-22'});for(const id of [...b.templateIds,...b.dailyTemplateIds]){const c=d.cards.find(c=>c.id===id);c.status='approved';c.visibility='public';Object.assign(c.source,{reviewedBy:'test-only',reviewedAt:'2026-10-22'});}d.packs.ko={locale:'ko',status:'reviewed',sourceVersion:'1.0.0',messages:allMessages,sourceHashes:Object.fromEntries(Object.entries(allMessages).map(([k,v])=>[k,hash(v)])),keyStatus:Object.fromEntries(Object.keys(allMessages).map(k=>[k,'reviewed']))};return {d,b,i:input(b)};}
test('complete approved synthetic fixture resolves without network',()=>{const {d,i}=fixture();const r=lookupReleased(d,i,now);assert.equal(r.status,'available');assert.equal(r.cards.length,3);assert.equal(r.dailyCards.length,3);assert.equal(r.aiRequested,false);});
for(const [name,change]of [
 ['draft mapping',(d,b)=>b.status='draft'],['missing domain reviewer',(d,b)=>b.domainReviewedBy=null],['future mapping review',(d,b)=>b.reviewedAt='2027-01-01'],
 ['retired card',(d,b)=>d.cards.find(c=>c.id===b.templateIds[0]).status='retired'],['private card',(d,b)=>d.cards.find(c=>c.id===b.templateIds[0]).visibility='internal-design'],
 ['missing key',(d,b)=>{d.packs.ko.messages={...allMessages};delete d.packs.ko.messages[d.cards.find(c=>c.id===b.templateIds[0]).text.titleKey];}],
 ['stale source hash',(d,b)=>d.packs.ko.sourceHashes[d.cards.find(c=>c.id===b.templateIds[0]).text.titleKey]='stale'],
 ['unreviewed key',(d,b)=>d.packs.ko.keyStatus[d.cards.find(c=>c.id===b.templateIds[0]).text.titleKey]='needs-review'],
 ['wrong pack version',d=>d.packs.ko.sourceVersion='0'],['wrong pack locale',d=>d.packs.ko.locale='en'],
 ['missing safety references',(d,b)=>d.cards.find(c=>c.id===b.templateIds[0]).risk='safety-sensitive'],
 ['unknown risk',(d,b)=>d.cards.find(c=>c.id===b.templateIds[0]).risk='unknown']
])test(name+' blocked',()=>{const {d,b,i}=fixture();change(d,b);assert.equal(lookupReleased(d,i,now).status,'unavailable');});
test('adult scenario not served to teen',()=>{const {d,i}=fixture();assert.equal(lookupReleased(d,{...i,audience:'high'},now).status,'unavailable');});
test('expired safety reference blocked',()=>{const {d,b,i}=fixture();const c=d.cards.find(c=>c.id===b.templateIds[0]);c.risk='safety-sensitive';c.source.officialReferences=[{uri:'https://example.invalid/fixture',version:'test-only',jurisdiction:'test-only',effectiveAt:'2026-01-01'}];c.source.reviewDueAt='2026-10-22';assert.equal(lookupReleased(d,i,now).status,'unavailable');});
test('no network or model invocation in reference lookup',()=>{const s=fs.readFileSync(path.join(root,'lookup.mjs'),'utf8');assert(!/fetch\s*\(|https\.request|XMLHttpRequest|openai|anthropic/i.test(s));});
console.log(JSON.stringify({result:'PASS',checks,counts:manifest.counts,releaseTranslations:0,browserQA:'not-applicable-library-only',contentExpertReview:'pending'},null,2));
