import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'vite';
const root=path.resolve(import.meta.dirname,'..'),out=path.resolve(root,'../../generated-artifacts/lesson-lab-qa');
const started=new Date().toISOString(),checks=[];
const check=(name,fn)=>{try{fn();checks.push({name,ok:true})}catch(e){checks.push({name,ok:false,error:String(e)});console.error('FAIL',name,e.message)}};
const server=await createServer({root,configFile:false,logLevel:'error',appType:'custom',server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true},resolve:{alias:{'@':path.join(root,'src')}}});
try{
 const m=await server.ssrLoadModule('/src/lib/materials.ts'),ml=await server.ssrLoadModule('/src/lib/material-language.ts'),cards=await server.ssrLoadModule('/src/lib/cards.ts'),authored=await server.ssrLoadModule('/src/i18n/authored.ts'),tx=await server.ssrLoadModule('/src/i18n/tx.ts');
 const base=JSON.parse(await fs.readFile('/tmp/lesson-lab-studio-fixture.json','utf8'));
 const langs=['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'];
 for(const lang of langs)check(`${lang} storage failure and counselor removal accessibility have localized app text`,()=>{for(const key of['브라우저에 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인하고 기존 기록을 내보내세요.','삭제']){const text=tx.tx(lang,key);assert.ok(text);if(lang!=='ko')assert.doesNotMatch(text,/[가-힣]/)}});
 for(const stage of['middle','high','university'])for(const lang of langs)for(let kind=0;kind<4;kind++)check(`${stage}/${lang}/${kind} complete authored warning goal and slash-joined supports`,()=>{
  let s=structuredClone(base);const st={...s.students[0],stage,job:'',family:'',task:''};s.students=[st];s.personalWorksheets=[];s.plannerActivities=[];s.cards=[];s.studio.actor={role:'teacher',id:'teacher-demo'};
  s=m.generateMaterials(s,[st.id],9,[kind],'ko',false);const a=s.plannerActivities[0],p=ml.previewMaterialLanguage(s,a.id,'card',lang);
  assert.equal(p.untranslated.length,0,JSON.stringify(p.untranslated));assert.equal(p.fields.goal,cards.generateFields(st,kind,lang).todayGoal);assert.equal(p.fields.job,cards.generateFields(st,kind,lang).job);
  if(lang!=='ko')assert.doesNotMatch(p.fields.goal,/[가-힣]/);
  const original=JSON.stringify(s);const n=ml.applyMaterialLanguage(s,p);assert.equal(JSON.stringify(s),original);assert.deepEqual(n.plannerActivities[0].record,a.record);assert.equal(n.plannerActivities[0].record.state,'planned');assert.deepEqual(n.plannerActivities[0].versions[0],a.versions[0]);
 });
 for(const lang of langs)check(`${lang} U09 original answer/three worksheet versions/user card edits/actual record survive`,()=>{
  let s=structuredClone(base);const st={...s.students[0],stage:'university',job:'',family:'',task:''};s.students=[st];s.personalWorksheets=[];s.plannerActivities=[];s.cards=[];s.studio.actor={role:'teacher',id:'teacher-demo'};
  s=m.generateMaterials(s,[st.id],9,[0],'ko',false);let w=s.personalWorksheets[0];s=m.saveWorksheet(s,w.id,{...w.fields,answer:'QA_학생_원문_123'},'QA answer','draft');s=ml.applyMaterialLanguage(s,ml.previewMaterialLanguage(s,w.id,'worksheet','en'));
  w=s.personalWorksheets[0];const original=structuredClone(w);const p=ml.previewMaterialLanguage(s,w.id,'worksheet',lang);assert.equal(p.untranslated.length,0);assert.equal(p.fields.answer,'QA_학생_원문_123');assert.equal(p.changedKeys.length,lang==='en'?0:9);
  s=ml.applyMaterialLanguage(s,p);assert.deepEqual(s.personalWorksheets[0].versions.slice(0,3),original.versions);assert.equal(s.personalWorksheets[0].fields.answer,original.fields.answer);
  let a=s.plannerActivities[0];const goal='[직무 과제 미확인 - 교사 확인 필요] 교사가 직접 수정한 원문 / Do not translate';
  s=m.savePlanner(s,a.id,{...a.fields,goal},{...a.record,state:'in-progress',actual:'QA_실제기록_원문',feedback:'feedback 原文'},'QA teacher edit','draft');a=s.plannerActivities[0];
  const ap=ml.previewMaterialLanguage(s,a.id,'card',lang);assert.equal(ap.fields.goal,goal);assert.ok(ap.preservedKeys.includes('goal'));
  const n=ml.applyMaterialLanguage(s,ap);assert.deepEqual(n.plannerActivities[0].record,a.record);assert.deepEqual(n.plannerActivities[0].versions.slice(0,-1),a.versions);assert.equal(n.plannerActivities[0].fields.goal,goal);
 });
 check('Unknown warning slot is not treated as an authored curriculum goal',()=>assert.equal(authored.worksheetGoalWarning('[직무 과제 미확인 - 교사 확인 필요] QA_학생이 쓴 원문','en'),undefined));
 check('Known curriculum goal is not masked by coincidental interest words',()=>{
  let s=structuredClone(base);s.students=[{...s.students[0],stage:'university',family:'프로젝트',job:'학습',task:'네트워킹'}];s.personalWorksheets=[];s.plannerActivities=[];s.cards=[];s.studio.actor={role:'teacher',id:'teacher-demo'};
  s=m.generateMaterials(s,[s.students[0].id],9,[0],'ko',false);const p=ml.previewMaterialLanguage(s,s.plannerActivities[0].id,'card','en');assert.equal(p.untranslated.length,0);assert.doesNotMatch(p.fields.goal,/[가-힣]/);assert.equal(p.fields.job,s.plannerActivities[0].fields.job);
 });
 const result={started,ended:new Date().toISOString(),passed:checks.filter(x=>x.ok).length,failed:checks.filter(x=>!x.ok).length,checks};await fs.writeFile(path.join(out,'u09-regressions.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({passed:result.passed,failed:result.failed}));if(result.failed)process.exitCode=1;
}finally{await server.close()}
