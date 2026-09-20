import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const app=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'), root=path.dirname(app);
const baseline=path.join(root,'nuvia-history-w24/outputs/NUVIA_HISTORY_ANNUAL_INTEGRATED_BASELINE_v1.0');
const runtime=path.join(root,'nuvia-history-w24/outputs/NUVIA_HISTORY_REPRESENTATIVE_6_v1.0_DRAFT');
const require=createRequire(import.meta.url);
const deps=process.env.ARTIFACT_NODE_MODULES||path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {FileBlob,SpreadsheetFile}=await import(pathToFileURL(require.resolve('@oai/artifact-tool',{paths:[deps]})).href);
const digest=b=>createHash('sha256').update(b).digest('hex'), hashes={};
const manifest=await fs.readFile(path.join(baseline,'FINAL_FILE_MANIFEST_AND_INTEGRITY.md'),'utf8');
for(const line of manifest.split('\n')){
 const parts=line.split('|').map(x=>x.trim().replaceAll('\x60',''));
 if(parts.length!==5||!/^[a-f0-9]{64}$/.test(parts[3]))continue;
 assert.equal(digest(await fs.readFile(path.join(baseline,parts[1]))),parts[3],parts[1]);
 hashes[parts[1]]=parts[3];
}
assert.equal(Object.keys(hashes).length,10);
async function sheet(name){
 const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(path.join(baseline,name)));
 const rows=wb.worksheets.getItem('상세').getUsedRange().values;
 return rows.slice(5).filter(row=>row.some(v=>v!==null&&v!=='')).map((row,i)=>({row:i+6,values:Object.fromEntries(rows[4].map((key,j)=>[key,row[j]]))}));
}
const [matrix,ages,books,versions]=await Promise.all([
 sheet('NUVIA_HISTORY_48W_96_CONDITION_INTEGRATED_MATRIX_v1.0.xlsx'),
 sheet('NUVIA_HISTORY_AGE_EXPRESSION_v1.0.xlsx'),
 sheet('NUVIA_HISTORY_BOOK_REPORT_LINKAGE_v1.0.xlsx'),
 sheet('NUVIA_HISTORY_COMMON_VERSION_CONTRACT_v1.0.xlsx')
]);
const entry=JSON.parse(await fs.readFile(path.join(runtime,'src/content/app-entry.json'),'utf8'));
const legacy=JSON.parse(await fs.readFile(path.join(runtime,'src/content/missions.json'),'utf8'));
const messages={},internal=[],missions=[];
const split=v=>String(v||'').split(/[\n;,]+/).map(s=>s.trim()).filter(Boolean);
const text=(key,v)=>{assert.equal(typeof v,'string',key);assert.ok(v.trim(),key);messages[key]=v;return key;};
const contract=v=>/제안|미명시/.test(String(v))?null:String(v||'')||null;
for(const {values:v} of versions){
 const week=Number(v['주차']),id=v.missionId;
 const conditions=matrix.filter(r=>r.values.missionId===id).map(({row,values:c})=>{
  const cid=c.conditionId,prefix='condition.'+cid;
  const ageRows=ages.filter(a=>a.values.conditionId===cid),bookRows=books.filter(b=>b.values.conditionId===cid);
  assert.equal(ageRows.length,6,cid);assert.equal(bookRows.length,8,cid);
  internal.push({conditionId:cid,sourceRow:row,prohibitedClaims:c['금지 문구'],proposedInteractionContractId:c.interactionContractId,proposedCausalMechanismId:c.causalMechanismId,ageExpressions:ageRows,bookMappings:bookRows});
  return {conditionId:cid,shortId:c['조건'],missionId:id,missionVersion:String(c.missionVersion),contentVersion:String(c.contentVersion),
   actualHistoryKey:text(prefix+'.actual',c['확인된 사실']),actualSceneKey:text(prefix+'.scene',c['실제 역사 기준 장면']),
   changedConditionKey:text(prefix+'.changed',c['승인 조건']),mechanismKey:text(prefix+'.mechanism',c['실제 기제']),mechanismLevel:Number(c['기제 등급']),
   directEffectKey:text(prefix+'.direct',c['직접 영향']),shortTermKey:text(prefix+'.short',c['단기 영향']),longTermLimitKey:text(prefix+'.limit',c['장기 영향']),
   additionalConditionKey:text(prefix+'.additional',c['추가 조건']),level3Keys:[text(prefix+'.possibility.A',c['Level3 A']),text(prefix+'.possibility.B',c['Level3 B'])],
   sourceIds:split(c['출처 ID']),passDomain:c.PASS,actionKind:c.actionKind,interactionContractId:contract(c.interactionContractId),causalMechanismId:contract(c.causalMechanismId),contractStatus:'design-reference-only',
   ageBandRuleIds:ageRows.map(a=>a.values.ageBandRuleId),assetRefs:split(c['assetId·materialSet']),assetStatus:'unverified',
   bookPages:bookRows.map(b=>({pageNumber:b.values.pageNumber,pageRole:b.values.pageRole,bookTemplateId:b.values.bookTemplateId,bookTemplateVersion:b.values.bookTemplateVersion})),
   resultIdPolicy:c.resultId,provenance:{file:'NUVIA_HISTORY_48W_96_CONDITION_INTEGRATED_MATRIX_v1.0.xlsx',sheet:'상세',row}};
 });
 const executable=week===24;
 missions.push({week,missionId:id,titleKey:text('mission.'+id+'.title',v['사건명']),missionVersion:String(v.missionVersion),contentVersion:String(v.contentVersion),conditions,
  state:executable?'executable':[1,48].includes(week)?'connecting':'designed',
  readiness:{data:'linked',execution:executable?'legacy-adapter':'blocked',assets:executable?'w24-existing':'asset-pending',content:executable?'w24-existing':week===1?'semantic-source-present':'content-pending',userReview:executable?'legacy-approved-new-link-pending':'pending'},
  runtime:executable?{adapter:'w24-existing-origin',missionId:entry.missionId,missionVersion:entry.missionVersion,contentVersion:entry.contentVersion,contractSource:'src/core/release.ts',changesExcelContract:false}:null,
  existingDataPresent:legacy.some(m=>m.week===week)});
}
missions.sort((a,b)=>a.week-b.week);
assert.deepEqual(missions.map(m=>m.week),Array.from({length:48},(_,i)=>i+1));
assert.equal(new Set(missions.map(m=>m.missionId)).size,48);
const conditions=missions.flatMap(m=>m.conditions);
assert.equal(conditions.length,96);assert.equal(new Set(conditions.map(c=>c.conditionId)).size,96);
for(const m of missions)assert.equal(m.conditions.length,2);
for(const c of conditions){assert.ok(c.sourceIds.length&&c.actionKind&&c.passDomain&&c.missionVersion&&c.contentVersion);assert.ok([1,2].includes(c.mechanismLevel));assert.equal(c.level3Keys.length,2);assert.equal(new Set(c.ageBandRuleIds).size,6);}
const catalog={schemaVersion:1,appVersion:'0.1.0',locale:'ko',contentVersion:'annual-baseline-1.0',sourceHashes:hashes,resultIdPolicy:'preserve-existing-no-backfill',missions};
const payload=JSON.stringify({catalog,messages});
for(const item of internal)if(item.prohibitedClaims)assert.ok(!payload.includes(item.prohibitedClaims),'Private claim leaked: '+item.conditionId);
for(const [name,hash] of Object.entries(hashes))assert.equal(digest(await fs.readFile(path.join(baseline,name))),hash);
await fs.mkdir(path.join(app,'src/generated'),{recursive:true});await fs.mkdir(path.join(app,'internal-qa'),{recursive:true});
await fs.writeFile(path.join(app,'src/generated/catalog.json'),JSON.stringify(catalog,null,2)+'\n');
await fs.writeFile(path.join(app,'src/generated/content.ko.json'),JSON.stringify({locale:'ko',contentVersion:catalog.contentVersion,messages},null,2)+'\n');
await fs.writeFile(path.join(app,'internal-qa/catalog-internal.json'),JSON.stringify({sourceHashes:hashes,conditions:internal},null,2)+'\n');
console.log(JSON.stringify({missions:missions.length,conditions:conditions.length,ageRows:ages.length,bookRows:books.length,protectedBaselineFiles:Object.keys(hashes).length,publicClaimLeaks:0}));
