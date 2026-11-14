/** Opt-in actual model tests, synthetic records only. No account writes. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { runCareerAiAssist } from '../../artifacts/api-server/src/lib/career-ai.js';
type Input = Parameters<typeof runCareerAiAssist>[0];
const root = new URL('../../', import.meta.url);
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const base: Input = {
  task:'draft', locale:'ko', writingLanguage:'ko', sourceFingerprint:'synthetic-ko-final',
  confirmed:true, factsConfirmed:true, coachPrompt:'',
  application:{company:'합성기업',job:'운영 지원',question:'문제를 발견한 근거와 본인의 판단, 행동, 관찰한 결과를 설명하세요.',body:''},
  strengths:[], experiences:[], userAnswers:[], voiceSources:[], voiceRules:[],
};
function exp(action: string, result: string, nature: 'actual'|'simulation' = 'actual'): Input['experiences'][number] {
  return {title:'개인정보 없는 합성 자기보고',nature,context:nature==='simulation'?'class_simulation':'daily_actual',
    cardType:nature==='simulation'?'job_scenario':'daily_application',source:'manual',sourceTitle:'QA 합성 기록',sourceVersion:'v1',jobConnection:null,
    fields:{situation:'교내 활동 중 안내가 일치하지 않았다.',roleGoal:'확인한 사실만 전달하기',action,result,
      selectionReason:'단정하기 전에 근거를 확인하려고 했다.',changed:'',learning:'확인한 내용과 질문할 내용을 구분했다.',
      resultEvidence:'본인이 관찰한 안내문',supportProvided:'교사가 확인표를 제공했다.',independentSteps:['본인이 비교할 항목을 골랐다.']}};
}
const a=exp('분실물 보관함의 접수표와 물품표를 대조하고 서로 다른 보관 위치를 담당자에게 질문했다.','담당자가 보관 위치 표기를 수정한 것을 확인했다.');
const b=exp('점자안내 지도와 행사장 안내를 비교하고 이동 안내가 빠진 구간을 표시해 행사 담당자에게 전달했다.','행사 담당자가 이동 안내를 덧붙인 것을 확인했다.');
const allText=(r: Awaited<ReturnType<typeof runCareerAiAssist>>) => r.candidates.map(x=>x.text).join('\n');
const results: Array<Record<string,unknown>>=[];
const outputs: Record<string,Awaited<ReturnType<typeof runCareerAiAssist>>>={};
const cases: Array<{id:string;input:Input;check:(r:Awaited<ReturnType<typeof runCareerAiAssist>>)=>void}>=[
  {id:'person-a-same-question',input:{...base,experiences:[a]},check:r=>{assert.ok(r.candidates.length>=2);assert.match(allText(r),/분실물|접수표|물품표/);assert.doesNotMatch(allText(r),/점자/);}},
  {id:'person-b-same-question',input:{...base,experiences:[b]},check:r=>{assert.ok(r.candidates.length>=2);assert.match(allText(r),/점자|이동 안내/);assert.doesNotMatch(allText(r),/분실물/);}},
  {id:'strengths-only-no-action',input:{...base,strengths:[{name:'계획',interpretation:'목표와 완료 기준을 먼저 적는 지원 전략',recommendationReason:''}]},check:r=>{assert.equal(r.candidates.length,0);assert.ok(r.coachQuestion.trim());assert.doesNotMatch(r.coachQuestion,/몇\s*%|팀장으로/);}},
  {id:'direct-experience-only',input:{...base,experiences:[a],strengths:[]},check:r=>{assert.ok(r.candidates.length>=2);assert.doesNotMatch(allText(r),/PASS|IQ|합격률|80%/);}},
  {id:'actual-simulation-mixed',input:{...base,experiences:[a,exp('모의 훈련에서 예약 화면 두 개의 필수 입력란을 비교했다.','가상 화면마다 입력란이 다른 것을 관찰했다.','simulation')]},check:r=>{
    assert.ok(r.candidates.length>=2);
    for(const c of r.candidates) if(/예약|가상 화면/.test(c.text)) assert.match(c.text,/모의|가상|시뮬레이션/);
    assert.doesNotMatch(allText(r),/\d+\s*%|실무 경력|재직/);
  }},
  {id:'modified-record-no-old-outcome',input:{...base,experiences:[{...a,sourceVersion:'v2',fields:{...a.fields,result:'담당자에게 전달했으며 수정 여부는 아직 확인하지 못했다.'}}]},check:r=>{
    assert.ok(r.candidates.length>=2);
    for(const c of r.candidates) assert.match(c.text,/확인하지 못|확인되지 않|알 수 없|확인할 수 없|아직/);
    assert.doesNotMatch(allText(r),/수정한 것을 확인했습니다|수정되었습니다[.!]|수정됐다[.!]/);
  }},
  {id:'missing-evidence-coach',input:{...base,task:'coach',strengths:[{name:'주의',interpretation:'핵심 확인과 방해 줄이기를 돕는 지원 전략',recommendationReason:''}]},check:r=>{assert.ok(r.coachQuestion);assert.equal(r.candidates.length,0);}},
  {id:'voice-original-no-personality',input:{...base,task:'voice',voiceSources:[
    {kind:'user_original',text:'저는 먼저 본 내용을 적습니다. 그다음 확인하지 못한 점을 질문합니다.'},
    {kind:'user_edited',text:'제가 직접 한 행동부터 설명하겠습니다. 관찰한 결과는 마지막에 적겠습니다.'},
  ]},check:r=>{assert.ok(r.voiceRules.length);assert.doesNotMatch(r.voiceRules.map(x=>x.rule).join(' '),/성격이|지능이|PASS 점수|내향적|외향적/);}},
];
const only=process.argv.find(x=>x.startsWith('--only='))?.slice(7);
for(const c of cases.filter(c=>!only||c.id===only)){
  const startedAt=new Date().toISOString();
  try{
    const r=await runCareerAiAssist(c.input,new AbortController().signal);c.check(r);outputs[c.id]=r;
    results.push({id:c.id,status:'pass',startedAt,finishedAt:new Date().toISOString(),inputSha256:hash(JSON.stringify(c.input)),response:r});
  }catch(e){results.push({id:c.id,status:'fail',startedAt,finishedAt:new Date().toISOString(),error:e instanceof Error?e.message:'UNKNOWN'});}
}
if(outputs['person-a-same-question']&&outputs['person-b-same-question']){
  results.push({id:'two-person-candidates-differ',status:allText(outputs['person-a-same-question'])!==allText(outputs['person-b-same-question'])?'pass':'fail'});
}
const failed=results.filter(x=>x.status==='fail').length;
const out=new URL('generated-artifacts/nuvia-korean-final/',root);await mkdir(out,{recursive:true});
const evidence={kind:'ACTUAL_MANAGED_MODEL_SYNTHETIC_NOT_OPERATIONAL_INTEGRATION',executedAt:new Date().toISOString(),
  helperSha256:hash(await readFile(new URL('artifacts/api-server/src/lib/career-ai.ts',root),'utf8')),
  pass:results.length-failed,fail:failed,results};
const name=only?'real-model-korean-retest.json':'real-model-korean.json';
await writeFile(new URL(name,out),JSON.stringify(evidence,null,2));
console.log(JSON.stringify({pass:evidence.pass,fail:failed,evidence:`generated-artifacts/nuvia-korean-final/${name}`}));
if(failed)process.exitCode=1;
