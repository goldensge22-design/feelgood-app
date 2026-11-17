const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../dcas81/unpacked/APPLIED_FULL/DCAS_ADULT');
const g={},ctx=vm.createContext({window:g,globalThis:g});
for(const f of ['dcas-aviation-jobs-ko.js','dcas-aviation-catalog.js','dcas-job-engine.js','dcas-major-requirements.js','dcas-jobs-major47.js','dcas-jobs-extra.js','dcas-aviation-ranking.locales.js','dcas-aviation-ranking.js','dcas-lab-top5-bridge.js'])vm.runInContext(fs.readFileSync(path.join(dir,f),'utf8'),ctx,{filename:f});
const majors=[['항공교통물류학과',29],['항공외국어학과',20],['공항행정학과',29]];
const highPS={P:95,A:50,S:90,Q:50},highAQ={P:50,A:95,S:50,Q:95};
let checked=0;
for(const [major,count] of majors){
 const config=g.DCasAviationCatalog.resolve(major);
 assert.equal(config.mode,'major-ranked');
 assert.equal(g.DCasAviationCatalog.isUnranked(major),false);
 const rank=s=>g.DCasJobEngine.rankJobsForMajor(s,major,[]);
 const pool=g.DCasAviationRanking.getJobs(major);
 assert.equal(pool.length,count);assert.equal(new Set(pool.map(j=>j.id)).size,count);
 assert.ok(pool.every(j=>j.attr_source==='editorial-proxy-estimate'&&j.estimate_template_id));
 assert.notDeepEqual(Array.from(rank(highPS).slice(0,5),x=>x.job.id),Array.from(rank(highAQ).slice(0,5),x=>x.job.id),'TOP5 must respond to the PASS profile');
 for(const P of [40,65,90])for(const A of [40,65,90])for(const S of [40,65,90])for(const Q of [40,65,90]){
   const scores={P,A,S,Q},ranked=rank(scores);
   assert.equal(ranked.length,count);assert.equal(new Set(ranked.slice(0,5).map(x=>x.job.id)).size,5);
   assert.ok(ranked.every((r,i)=>Number.isFinite(r.fit)&&r.fit>=0&&r.fit<=100&&(!i||ranked[i-1].fit>=r.fit)));
   const envelope=g.DCasLabTop5Bridge.buildEnvelope({majorName:major},ranked);
   assert.deepEqual(Array.from(envelope.topJobs,x=>x.label),Array.from(ranked.slice(0,5),x=>x.job.label_ko));
   assert.equal(envelope.sourceMajor,major);checked++;
 }
 for(const score of [0,52,53,74,75,100])assert.equal(rank({P:score,A:score,S:score,Q:score}).length,count);
 for(const bad of [undefined,null,NaN,Infinity,-1,101,'85'])assert.equal(rank({P:bad,A:85,S:80,Q:75}),null);
 for(const alias of config.aliases)assert.deepEqual(Array.from(g.DCasJobEngine.rankJobsForMajor(highPS,alias,[]),x=>x.job.id),Array.from(rank(highPS),x=>x.job.id));
}
const security=g.DCasJobEngine.rankJobsForMajor(highPS,'항공보안학과',g.DCasJobsExtra.JOB_POOL_EXTRA);
assert.equal(security.length,10);assert.ok(security.every(x=>x.job.id>=9101&&x.job.id<=9110));
console.log(`PASS ${checked} profiles across 3 majors; 29/20/29 candidates, personalized TOP5, aliases, boundaries, invalid inputs, LAB order, security 10 preserved`);
