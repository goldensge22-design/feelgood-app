const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const ctx={console,document:{addEventListener(){}},Intl};ctx.window=ctx;
for(const file of ['catalog.js','locales.js','work-context.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx);
const catalog=ctx.DCasOccupationCatalog,pack=ctx.DCasWorkResources,api=ctx.DCasWorkContext;
assert.equal(catalog.occupations.length,495);assert.equal(new Set(catalog.occupations.map(o=>o.code)).size,495);
for(const [length,count] of [[1,10],[2,35],[3,140]])assert.equal(catalog.groups.filter(g=>g.code.length===length).length,count);
const sourceHash=crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'source/KECO_2025_MOEL.xlsx'))).digest('hex');
assert.equal(sourceHash,catalog.sha256);
const source=pack.locales.ko,keys=Object.keys(source).sort();
assert.equal(crypto.createHash('sha256').update(JSON.stringify(source)).digest('hex'),pack.sourceHash);
const tokens=s=>[...s.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort();
for(const [locale,values] of Object.entries(pack.locales)){
  if(locale!=='ko'){assert.equal(pack.metadata[locale].sourceHash,pack.sourceHash);assert.equal(pack.metadata[locale].status,'machine-translated');}
  assert.deepEqual(Object.keys(values).sort(),keys,locale);
  for(const key of keys){assert.ok(values[key]?.trim(),locale+'/'+key);assert.deepEqual(tokens(values[key]),tokens(source[key]),locale+'/'+key);if(locale!=='ko')assert.ok(!/[가-힣]|FGPH|\[\[FG/.test(values[key]),locale+'/'+key);}
}
assert.equal(Object.keys(pack.locales).length,15);
for(const job of catalog.occupations){assert.ok(source['occupation.'+job.code]);assert.equal(api.normalize({status:'employed',occupationCode:job.code}).occupationCode,job.code);assert.ok(api.valid({occupationCode:job.code}));}
assert.equal(api.normalize({status:'employed',occupationCode:'9999'}).occupationCode,'');
assert.equal(api.valid({occupationCode:'other',jobTitle:' '}),false);
assert.equal(api.valid({occupationCode:'other',jobTitle:'공항보안 사무직'}),true);
assert.equal(api.normalize({status:'employed',jobTitle:'a'.repeat(121)}).jobTitle.length,120);
assert.equal(api.search('보안','').length>0,true);assert.equal(api.search('5412','').length,1);
require('../../integration/result-report-adapter.js');
const adapter=globalThis.ResultReportAdapter;
const payload={schemaVersion:1,reportKind:'dcas-adult',locale:'ko',person:{fullName:'Tester',genderKey:'X',ageYears:23},test:{date:{y:2026,m:10,d:21}},scores:{P:75,A:53,S:64,Q:75},workContext:{status:'employed',occupationCode:'5412',jobTitle:'항공보안검색요원',tasks:'항공화물 검색'}};
const normalized=adapter.install(payload);assert.equal(normalized.person.majorName,undefined);assert.equal(normalized.person.gradeLabel,undefined);
assert.deepEqual(globalThis.__TEST_PROFILE__.workContext,payload.workContext);
assert.deepEqual(globalThis.__TEST_PROFILE__.scores,payload.scores);
for(const bad of [{status:'bad'},{status:'employed',occupationCode:'other'},{status:'employed',occupationCode:'x'},{status:'employed',tasks:'a'.repeat(801)}])assert.throws(()=>adapter.normalize({...payload,workContext:bad}));
assert.throws(()=>adapter.normalize({...payload,workContext:undefined}),/gradeLabel|majorName/);
const result={status:'pass',catalog:{major:10,middle:35,group:140,occupations:495,sha256:sourceHash},locales:Object.keys(pack.locales),keys:keys.length,translationChecks:keys.length*15,adapter:'pass',sourceMetadata:pack.metadata};
fs.mkdirSync(path.join(__dirname,'qa'),{recursive:true});fs.writeFileSync(path.join(__dirname,'qa/unit.json'),JSON.stringify(result,null,2)+'\n');
console.log('PASS work context: 495 jobs, 15 locales, '+result.translationChecks+' translations, adapter boundaries');
