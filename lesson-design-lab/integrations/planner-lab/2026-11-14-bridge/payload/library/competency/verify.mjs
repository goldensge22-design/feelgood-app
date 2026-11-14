import assert from 'node:assert/strict';
import {catalog,createPractice,qualityCheck} from './runtime/practice.mjs';
import {resolveMajor} from './runtime/major-resolver.mjs';
import {cases,caseByProfile} from './runtime/cases.mjs';
const ids=new Set();let cards=0;const gaps=[];
for(const p of catalog.profiles){
 assert.ok(!ids.has(p.id),'duplicate profile '+p.id);ids.add(p.id);assert.ok(p.competencies.length>=3,p.id);
 for(const id of p.sourceIds)assert.ok(catalog.sources[id],'missing source '+id);
 for(const c of p.competencies)for(const id of c.sourceIds)assert.ok(catalog.sources[id],'missing competency source '+id);
 if(p.caseId)assert.ok(cases[p.caseId],'missing authored case '+p.caseId);
 const variants=new Set();for(const kind of ['job','cognitive','reflection'])for(let sequence=0;sequence<6;sequence++){
  const c=createPractice({profileId:p.id,kind,sequence});assert.equal(qualityCheck(c).passed,true,p.id);assert.ok(c.materials.length>=2);assert.equal(c.fictional,true);cards++;if(kind==='job')variants.add(JSON.stringify(c.materials));
 }assert.equal(variants.size,6,p.id);
 if(!p.coverage.ncsFullKsa||!p.coverage.domesticEmployerContext)gaps.push(p.id);
}
for(const m of catalog.resultMajors){assert.equal(resolveMajor(m.name).status,'mapped');for(const id of m.profileIds)assert.ok(ids.has(id));}
assert.equal(resolveMajor('미등록-임의학과').status,'needs_curation');
console.log(JSON.stringify({version:catalog.version,profiles:ids.size,cardConfigurationsChecked:cards,resultMajors:catalog.resultMajors.length,authoredCaseFamilies:Object.keys(cases).length,profilesWithSourceGaps:gaps.length,status:'structural_checks_passed_not_expert_validation'},null,2));
