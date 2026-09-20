import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {catalog,missionByWeek,w24Url,resolveLocale,validatePack,translator,messages,requiredKeys,releasedLocales,type Mission} from '../src/adapters';

test('48 weeks / 96 unique conditions / source and version contracts',()=>{
 assert.deepEqual(catalog.missions.map(m=>m.week),Array.from({length:48},(_,i)=>i+1));
 assert.equal(new Set(catalog.missions.map(m=>m.missionId)).size,48);
 const conditions=catalog.missions.flatMap<Mission['conditions'][number]>(m=>m.conditions);
 assert.equal(conditions.length,96);assert.equal(new Set(conditions.map(c=>c.conditionId)).size,96);
 for(const m of catalog.missions){assert.equal(m.conditions.length,2);for(const c of m.conditions){
  assert.equal(c.missionVersion,m.missionVersion);assert.equal(c.contentVersion,m.contentVersion);
  assert.equal(new Set(c.ageBandRuleIds).size,6);assert.equal(c.bookPages.length,8);
  assert.ok(c.sourceIds.length);assert.ok([1,2].includes(c.mechanismLevel));
  assert.equal(c.level3Keys.length,2);assert.ok(c.actionKind&&c.passDomain&&c.resultIdPolicy);
 }}
});
test('W01/W48 remain blocked; only W24 has compatibility execution',()=>{
 for(const week of [1,48]){const m=missionByWeek(week);assert.equal(m.state,'connecting');assert.equal(m.runtime,null);assert.throws(()=>w24Url(m,'http://localhost:5193','ko'),/MISSION_NOT_READY/);}
 assert.equal(missionByWeek(1).existingDataPresent,true);assert.equal(missionByWeek(48).existingDataPresent,false);
 assert.equal(catalog.missions.filter(m=>m.state==='designed').length,45);
 assert.equal(missionByWeek(24).runtime?.missionVersion,'5.3.0');
 assert.equal(missionByWeek(24).runtime?.contentVersion,'3.4.0');
 assert.equal(missionByWeek(24).missionVersion,'1.0.0');
});
test('existing W24 origin, QA parameters, new flag intent preserved without record writes',()=>{
 const target=new URL(w24Url(missionByWeek(24),'http://192.168.45.172:5193/?annual=1&qa=1&age=preschool&pass=attention&new=1','ko'));
 assert.equal(target.origin,'http://192.168.45.172:5192');assert.equal(target.searchParams.get('mission'),'gutenberg');
 assert.equal(target.searchParams.get('pass'),'attention');assert.equal(target.searchParams.get('new'),'1');assert.equal(target.searchParams.has('annual'),false);
 assert.equal(new URL(w24Url(missionByWeek(24),'http://localhost:5193/?new=1','ko')).searchParams.has('new'),false);
 assert.throws(()=>w24Url(missionByWeek(24),'http://localhost:5193','en'),/LANGUAGE_NOT_PROVIDED/);
});
test('common registry supplies release list; explicit and stored locales never silently fall back',()=>{
 assert.deepEqual(releasedLocales,['ko']);assert.equal(resolveLocale(null,null),'ko');
 for(const locale of ['en','fr','zh','ar','xx',''])assert.throws(()=>resolveLocale(locale,null),/LANGUAGE_NOT_PROVIDED/);
 assert.throws(()=>resolveLocale(null,'en'),/LANGUAGE_NOT_PROVIDED/);
 assert.equal(resolveLocale('ko','en'),'ko');
});
test('incomplete packs, missing keys and interpolation fail closed',()=>{
 validatePack('ko',messages,requiredKeys);
 assert.throws(()=>validatePack('ko',{},requiredKeys),/LOCALE_PACK_INCOMPLETE/);
 assert.throws(()=>translator({})('missing'),/TRANSLATION_KEY_MISSING/);
 assert.throws(()=>translator({test:'{name}'})('test'),/LOCALE_PACK_INCOMPLETE/);
});
test('prohibited originals and proposed execution IDs excluded from public payload and build',()=>{
 const internal=JSON.parse(fs.readFileSync('internal-qa/catalog-internal.json','utf8'));
 const publicText=fs.readFileSync('src/generated/catalog.json','utf8')+fs.readFileSync('src/generated/content.ko.json','utf8');
 const build=fs.readdirSync('dist/assets').filter(f=>f.endsWith('.js')).map(f=>fs.readFileSync(path.join('dist/assets',f),'utf8')).join('');
 for(const c of internal.conditions){
  if(c.prohibitedClaims){assert.equal(publicText.includes(c.prohibitedClaims),false);assert.equal(build.includes(c.prohibitedClaims),false);}
 }
 assert.equal(build.includes('prohibitedClaims'),false);assert.equal(build.includes('proposedInteractionContractId'),false);
 for(const c of catalog.missions.flatMap<Mission['conditions'][number]>(m=>m.conditions))assert.ok(!/제안|미명시/.test(String(c.interactionContractId)));
});
