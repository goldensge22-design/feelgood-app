import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'vite';

const root=path.resolve(import.meta.dirname,'..'),out=path.resolve(root,'../../generated-artifacts/lesson-lab-report-history-qa');
await fs.mkdir(out,{recursive:true});
const started=new Date().toISOString(),checks=[];
const check=(name,fn)=>{try{fn();checks.push({name,ok:true});console.log('PASS',name)}catch(e){checks.push({name,ok:false,error:String(e)});console.error('FAIL',name,e)}};
const server=await createServer({root,configFile:false,logLevel:'error',appType:'custom',server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true},resolve:{alias:{'@':path.join(root,'src')}}});
try {
  const e=await server.ssrLoadModule('/src/lib/studio/index.ts'),r=await server.ssrLoadModule('/src/lib/studio/reports.ts'),labels=await server.ssrLoadModule('/src/lib/studio/report-labels.ts'),tx=await server.ssrLoadModule('/src/i18n/tx.ts'),store=await server.ssrLoadModule('/src/lib/store.ts');
  const fixture=JSON.parse(await fs.readFile('/tmp/lesson-lab-studio-fixture.json','utf8'));
  let s=e.switchActor(fixture,{role:'teacher',id:'teacher-demo'});
  const cid=s.studio.activeCourseId,sid=s.studio.courses.find(c=>c.id===cid).studentIds[0];
  const base={studentId:sid,kind:'accuracy-percent',scores:{P:71,A:62,S:83,Q:54},pattern:'HMLM',
    top5:[{title:'',reason:''},{title:'QA-RANK-2',reason:'원문 순위 2'},{title:'',reason:'빈 중간 원문'},{title:'QA-RANK-4',reason:'원문 순위 4'},{title:'QA-RANK-5',reason:'원문 순위 5'}],
    test:'QA 원본 검사',date:'2026-11-05',scale:'정답률 %',version:'QA source v1',connected:false,confirmed:true};
  const preserved=Object.fromEntries(['students','personalWorksheets','plannerActivities','cards','experiences'].map(k=>[k,structuredClone(s[k])]));
  const writings=structuredClone(s.studio.writings);
  s.studio.reports=s.studio.reports.filter(x=>x.studentId!==sid);s.studio.reportHistory=[];
  const input=structuredClone(base);
  s=e.saveReport(s,base);
  check('first save creates v1, no invented earlier history or input mutation',()=>{assert.equal(s.studio.reports.find(x=>x.studentId===sid).revision,1);assert.equal(s.studio.reportHistory.length,0);assert.deepEqual(base,input)});
  const v1=structuredClone(s.studio.reports.find(x=>x.studentId===sid));
  check('blank first and middle ranks remain 1/2/3/4/5',()=>{assert.deepEqual(r.rankedTop5(v1).map(x=>[x.rank,x.title]),[[1,''],[2,'QA-RANK-2'],[3,''],[4,'QA-RANK-4'],[5,'QA-RANK-5']]);assert.match(r.top5Text(v1),/2\. QA-RANK-2/);assert.match(r.top5Text(v1),/4\. QA-RANK-4/)});
  const changed={...v1,scores:{P:11,A:22,S:33,Q:44},pattern:'LLLL',test:'QA changed source',scale:'보존할 새 척도',version:'QA source v2'};
  s=e.saveReport(s,changed);
  check('second save archives exact previous scores/scale/type/ranks/source',()=>{assert.deepEqual(s.studio.reportHistory[0],v1);assert.equal(s.studio.reports.find(x=>x.studentId===sid).revision,2)});
  const v2=structuredClone(s.studio.reports.find(x=>x.studentId===sid));
  s=e.saveReport(s,{...v2,kind:'demo-normalized',pattern:'MMMM',version:'QA source v3'});
  check('third save retains v1 and v2 with different unique snapshot IDs',()=>{assert.deepEqual(s.studio.reportHistory,[v1,v2]);assert.equal(s.studio.reports.find(x=>x.studentId===sid).revision,3);assert.equal(new Set([...s.studio.reportHistory,s.studio.reports.find(x=>x.studentId===sid)].map(x=>x.snapshotId)).size,3)});
  check('save does not modify existing students/materials/cards/originals/V1/V2',()=>{for(const k of Object.keys(preserved))assert.deepEqual(s[k],preserved[k]);assert.deepEqual(s.studio.writings,writings)});
  check('invalid score rejects whole mutation including history',()=>{const before=JSON.stringify(s);assert.throws(()=>e.saveReport(s,{...v2,scores:{P:101,A:0,S:0,Q:0}}));assert.equal(JSON.stringify(s),before)});
  check('reload normalization preserves exact current report and history',()=>{const reloaded=store.normalizeState(JSON.parse(JSON.stringify(s)));assert.deepEqual(reloaded.studio.reports,s.studio.reports);assert.deepEqual(reloaded.studio.reportHistory,s.studio.reportHistory)});
  check('current summary print preserves rank/scale/source and saved revision',()=>{const b=e.coursePrint(s,cid,[sid],'summary');const text=b.pages.flatMap(p=>p.panels.flatMap(p=>p.blocks.map(b=>b.text))).join('\n');assert.match(text,/2\. QA-RANK-2/);assert.match(text,/4\. QA-RANK-4/);assert.match(text,/QA source v3/);assert.ok(b.pages.every(p=>p.panels.every(p=>p.version===3)))});
  let legacy=structuredClone(s);delete legacy.studio.reportHistory;
  legacy.studio.reports=[structuredClone(base)];
  const old=structuredClone(legacy.studio.reports[0]);
  check('loading legacy report does not fabricate history or save date',()=>{const n=store.normalizeState(legacy);assert.deepEqual(n.studio.reports[0],old);assert.equal(n.studio.reportHistory.length,0);assert.equal(n.studio.reports[0].savedAt,undefined)});
  legacy=e.saveReport(legacy,{...base,pattern:'HHHH'});
  check('first legacy edit archives only observed original, earlier timestamp unknown',()=>{assert.equal(legacy.studio.reportHistory.length,1);const h=legacy.studio.reportHistory[0];assert.equal(h.savedAt,undefined);assert.ok(h.capturedAt);for(const k of Object.keys(old))assert.deepEqual(h[k],old[k]);assert.equal(h.revision,1);assert.equal(legacy.studio.reports[0].revision,2)});
  check('current support uses latest confirmed type, not archived type',()=>{assert.equal(e.supportForStudent(legacy,cid,sid).pattern,'HHHH')});
  let student=e.switchActor(legacy,{role:'student',id:sid});
  const exp=student.studio.explorations.find(x=>x.courseId===cid&&x.studentId===sid);
  student=e.saveExploration(student,cid,sid,{...exp,job:'QA-RANK-4',question:'QA 새 탐색 질문',outsideReason:''});
  const ex=student.studio.explorations.find(x=>x.courseId===cid&&x.studentId===sid);
  const candidates=e.getCandidates(student,cid,sid);
  check('candidate rank is original fourth place despite earlier gaps',()=>assert.ok(candidates.every(c=>c.reportRank===4)));
  student=e.selectCandidate(student,ex.id,candidates[0],'QA 학생 목표 원문','QA 학생 첫 행동');
  const m=student.studio.missions.at(-1);
  if(m.status==='review-needed'){student=e.switchActor(student,{role:'teacher',id:'teacher-demo'});student=e.reviewMission(student,m.id,true,'QA 교사 확인')}
  student=e.registerMission(student,m.id);
  const selected=structuredClone(student.studio.missions.find(x=>x.id===m.id)),docs=structuredClone([student.personalWorksheets,student.plannerActivities]);
  let updated=e.switchActor(student,{role:'teacher',id:'teacher-demo'});
  updated=e.saveReport(updated,{...updated.studio.reports[0],pattern:'LLLL',version:'QA latest v3'});
  check('selected mission keeps exact earlier report and material IDs after result change',()=>{assert.deepEqual(updated.studio.missions.find(x=>x.id===m.id),selected);assert.deepEqual([updated.personalWorksheets,updated.plannerActivities],docs);assert.equal(selected.reportBasis.pattern,'HHHH');assert.equal(updated.studio.reports[0].pattern,'LLLL')});
  check('old unrecorded basis and explicitly absent report are different',()=>{assert.notEqual(r.reportBasisLabel({...selected,reportBasis:undefined}),r.reportBasisLabel({...selected,reportBasis:null}))});
  for(const lang of ['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az']){
    tx.setTxLang(lang);
    check(`${lang}: all seven new report labels provided, no Korean fallback`,()=>{for(const key of ['history','current','revision','legacy','basis','unknown','none']){const text=labels.reportLabel(key);assert.ok(text.length>0);if(lang!=='ko')assert.doesNotMatch(text,/[가-힣]/)}});
    check(`${lang}: printed rank and untouched source/reason originals`,()=>{const b=e.coursePrint({...s,lang},cid,[sid],'summary');const text=b.pages.flatMap(p=>p.panels.flatMap(p=>p.blocks.map(b=>b.text))).join('\n');assert.match(text,/2\. QA-RANK-2/);assert.match(text,/4\. QA-RANK-4/);assert.match(text,/원문 순위 2/);assert.match(text,/QA source v3/)});
  }
  await fs.writeFile(path.join(out,'browser-fixture.json'),JSON.stringify({...updated,lang:'en'}));
} finally {
  await server.close();
  await fs.writeFile(path.join(out,'logic.json'),JSON.stringify({started,ended:new Date().toISOString(),checks},null,2));
}
console.log(`${checks.length} checks; ${checks.filter(c=>!c.ok).length} failed`);
process.exitCode=checks.some(c=>!c.ok)?1:0;
