import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createPlannerLabBridge,BridgeError,languages,hash} from '../payload/library/competency/runtime/planner-lab-bridge.mjs';
import {createPlannerLabStore} from '../payload/library/competency/runtime/planner-lab-store.mjs';
import {createPlannerLabHttp,createLabTransport} from '../payload/library/competency/runtime/planner-lab-http.mjs';
import catalog from '../payload/library/competency/runtime/catalog.mjs';
const profiles=['aviation-security-screening','logistics-analysis','cabin-crew','office-administration'];
const jobs=profiles.map((profileId,i)=>({id:`original-job-${i}`,profileId,label:catalog.profiles.find(p=>p.id===profileId).name,rank:i+1,source:'synthetic-owned-report-v1',verifiedMapping:true}));
const original={id:'synthetic-owned-report',version:'fixture-1'};
const principal={subject:'qa-student-a',sessionId:'qa-session-a'};
let now=Date.UTC(2026,10,14,0),rejectSession=false,scope='personal-workspace',calls=[],provider='verified_ai',batchProfile=null;
function fixture(profileId,language,kind,index=0){return {id:`practice-${profileId}-${kind}-${index}`,profileId,language,kind,day:'2026-11-14',aiStatus:provider,inputHash:`fixture-${profileId}-${index}`,libraryVersion:catalog.version,content:provider==='verified_ai'?{
 title:`${profileId} 교육용 비교·인계 과제`,minutes:10,
 materials:[{title:'행사 자료 A',body:'가상의 행사입니다. 예산 30000원, 마감 14:00. 자료 20건 중 3건은 수량 미확인입니다.',privateSecret:'must-not-leak'},
 {title:'행사 자료 B',body:'대안 A는 20000원에 13:50 도착, 검수 인원 1명. 대안 B는 28000원에 13:20 도착, 재확인에 20분 필요합니다.'}],
 alternatives:['A: 비용을 아끼지만 검수 시간이 부족합니다. 확인 전 배포 범위를 제한해야 합니다.','B: 도착 여유가 있지만 예산과 확인 인력이 줄어듭니다.'],
 steps:['정확성·시간·예산의 우선순위를 비교합니다.','미확인 정보와 회신 전 행동을 적습니다.','선택 이유와 감수할 손실을 기록합니다.'],artifact:'대안 비교표와 담당자 인계 메모',safety:'교내 문서로 하는 교육용 모의 연습입니다. 실제 보안·운항 업무를 수행하지 않습니다.',changeCondition:'PRIVATE_CHANGE: 담당자가 13:30부터 다른 업무로 이동하여 검수 인력이 줄어듭니다.',rubric:['PRIVATE_RUBRIC'],sourceUses:[{evidenceId:'fixture-source',quote:'합성 시험 자료',application:'HTTP 계약 검증용 예시이며 실제 AI 생성·현장 검증 자료가 아닙니다.'}],
 }:null};}
const lab=createServer(async(req,res)=>{
 const user=req.headers.authorization?.replace('Bearer ','');res.setHeader('Content-Type','application/json');
 const send=(status,v)=>{res.statusCode=status;res.end(JSON.stringify(v));};
 if(user!=='qa-student-a'&&user!=='qa-student-b')return send(401,{error:'session_expired'});
 if(req.url==='/api/lab/session')return send(200,{signedIn:true,hasAccess:scope!==null,camp:scope?{id:scope,revision:1}:undefined});
 if(req.headers['x-lab-camp']!==scope)return send(403,{error:'context_changed'});
 let chunks=[];for await(const c of req)chunks.push(c);const body=JSON.parse(Buffer.concat(chunks).toString()||'{}');calls.push({user,url:req.url,body,scope:req.headers['x-lab-camp']});
 if(req.url==='/api/lab/daily'){
  if(body.mode==='daily'&&batchProfile&&batchProfile!==body.profileIds[0])return send(409,{error:'request_content_conflict'});
  if(body.mode==='daily')batchProfile=body.profileIds[0];
  return send(200,{cards:Array.from({length:body.count},(_,i)=>fixture(body.profileIds[0],body.language,body.mode==='extra'?body.kind:['work','strategy','reflection'][i],body.mode==='extra'?body.requestId:i)),day:'2026-11-14',version:catalog.version});
 }
 if(req.url.endsWith('/select'))return send(200,{selected:true,state:'waiting_connection',scheduled:false});
 send(404,{error:'not_found'});
});
await new Promise(r=>lab.listen(0,'127.0.0.1',r));
const labOrigin=`http://127.0.0.1:${lab.address().port}`;
const temp=mkdtempSync(path.join(tmpdir(),'nuvia-bridge-')),filename=path.join(temp,'bridge.sqlite');
let store=createPlannerLabStore(filename);
const transport=createLabTransport({origin:labOrigin,allowLoopbackForTests:true,credentialFor:async p=>p.subject});
const makeBridge=()=>createPlannerLabBridge({store,loadContext:async()=>({report:original,jobs:[...jobs,{id:'unmapped-job',profileId:'invented',label:'미검증',verifiedMapping:true}]}),labRequest:transport,assertCurrent:async()=>{if(rejectSession)throw new BridgeError(401,'session_expired');},registeredProfileIds:catalog.profiles.map(p=>p.id),clock:()=>now});
let bridge=makeBridge();
const handler=createPlannerLabHttp({bridge:{context:(...a)=>bridge.context(...a),recommendations:(...a)=>bridge.recommendations(...a),select:(...a)=>bridge.select(...a),activity:(...a)=>bridge.activity(...a),list:(...a)=>bridge.list(...a),save:(...a)=>bridge.save(...a)},
 // Synthetic identity is loopback QA ONLY, deliberately absent from payload.
 authenticate:async req=>req.headers['x-qa-user']?{subject:req.headers['x-qa-user'],sessionId:'qa-session'}:null,
 verifyMutation:async req=>{if(req.headers.origin!=='http://127.0.0.1')throw new BridgeError(403,'csrf_failed');}});
const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const http=async(route,body,user='qa-student-a')=>{const r=await fetch(origin+'/api/planner/lab/'+route,{method:body?'POST':'GET',headers:{'x-qa-user':user,'x-planner-binding':hash([user,'qa-session']),Origin:'http://127.0.0.1','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};
const request=(overrides={})=>({requestId:crypto.randomUUID(),jobId:jobs[0].id,language:'ko',mode:'extra',...overrides});
let selected,recommendation;
await test('camp-code-free owned context preserves original ranks, excludes unregistered mapping',async()=>{const r=await http('context');assert.equal(r.status,200);assert.equal(r.data.scopeId,'personal-workspace');assert.deepEqual(r.data.jobs.map(j=>j.rank),[1,2,3,4]);assert.deepEqual(r.data.report,original);assert.equal(r.data.unmapped,1);});
await test('unauthenticated request is denied',async()=>{assert.equal((await http('context',undefined,'')).status,401);});
await test('browser subject and camp code are not accepted as inputs',async()=>{assert.equal((await http('recommendations',request({campCode:'ignored',subject:'qa-student-b'}))).status,400);});
await test('daily recommendations are three unscheduled candidates, no activity',async()=>{const r=await http('recommendations',request({mode:'daily'}));assert.equal(r.status,200);assert.equal(r.data.cards.length,3);assert.deepEqual(r.data.cards.map(c=>c.kind),['work','strategy','reflection']);assert.equal((await http('activities')).data.activities.length,0);assert.ok(calls.every(c=>c.scope==='personal-workspace'));});
await test('hidden change, rubric and nested private keys are absent from student response',async()=>{const r=await http('recommendations',request());recommendation=r.data.cards[0];assert.ok(recommendation);assert.doesNotMatch(JSON.stringify(r),/PRIVATE_CHANGE|PRIVATE_RUBRIC|must-not-leak|changeCondition|privateSecret/);});
await test('daily different-job conflict is explicit, extra supports changed job',async()=>{assert.equal((await http('recommendations',request({jobId:jobs[1].id,mode:'daily'}))).status,409);assert.equal((await http('recommendations',request({jobId:jobs[1].id}))).status,200);});
await test('four aviation departments × 15 language routes preserve language and profile (synthetic transport only)',async()=>{for(const job of jobs)for(const language of languages){const r=await http('recommendations',request({jobId:job.id,language}));assert.equal(r.status,200);assert.equal(r.data.cards[0].language,language);assert.equal(r.data.cards[0].profileId,job.profileId);}});
await test('additional requests exceed three without daily extra cap',async()=>{for(let i=0;i<5;i++)assert.equal((await http('recommendations',request())).status,200);});
await test('unmapped job is rejected, not guessed',async()=>{assert.equal((await http('recommendations',request({jobId:'unmapped-job'}))).status,422);});
await test('same request identifier with modified content conflicts',async()=>{const input=request();assert.equal((await http('recommendations',input)).status,200);assert.equal((await http('recommendations',{...input,jobId:jobs[1].id})).status,409);});
await test('provider not configured gives unavailable state, no generated card',async()=>{provider='unconfigured';const r=await http('recommendations',request());assert.equal(r.data.status,'provider_unavailable');assert.equal(r.data.cards.length,0);provider='verified_ai';});
await test('selection needs explicit consent and current owned version',async()=>{assert.equal((await http('select',{requestId:crypto.randomUUID(),cardId:recommendation.id,version:recommendation.version,consent:false})).status,400);assert.equal((await http('select',{requestId:crypto.randomUUID(),cardId:recommendation.id,version:'modified',consent:true})).status,404);});
await test('one selection is persisted; simultaneous retries never register duplicates',async()=>{const input={requestId:crypto.randomUUID(),cardId:recommendation.id,version:recommendation.version,consent:true};const r=await Promise.all(Array.from({length:4},()=>http('select',input)));assert.ok(r.every(x=>x.status===200));assert.equal(new Set(r.map(x=>x.data.id)).size,1);selected=r[0].data;assert.equal(selected.savedToServer,true);assert.equal(selected.startedAt,null);assert.equal((await http('activities')).data.activities.length,1);});
await test('different account cannot read, select or modify saved card/activity',async()=>{assert.equal((await http(`activities/${selected.id}`,undefined,'qa-student-b')).status,404);assert.equal((await http('select',{requestId:crypto.randomUUID(),cardId:recommendation.id,version:recommendation.version,consent:true},'qa-student-b')).status,404);});
await test('write/start and free reflection persist with revision checks',async()=>{const r=await http(`activities/${selected.id}/answers`,{revision:0,start:true,answers:{priority:'정확성과 시간',decision:'조건부 대안 B',actions:'두 자료를 비교했다',feeling:'고민이 되었다',memo:'자유 기록'}});assert.equal(r.status,200);assert.equal(r.data.revision,1);assert.equal(r.data.startedAt,now);selected=r.data;assert.equal((await http(`activities/${selected.id}/answers`,{revision:0,answers:{}})).status,409);});
await test('server withholds situation change before release, rejects premature change answer',async()=>{assert.equal((await http(`activities/${selected.id}`)).data.change,null);assert.equal((await http(`activities/${selected.id}/answers`,{revision:1,answers:{changeDecision:'위조 조기 변경'}})).status,409);});
await test('situation released by server time after half exercise; original stays private',async()=>{now+=301000;const r=await http(`activities/${selected.id}`);assert.match(r.data.change.text,/PRIVATE_CHANGE/);assert.ok(!('changeCondition' in r.data.card));});
await test('SQLite close/reopen retains activity and answer history',async()=>{store.close();store=createPlannerLabStore(filename);bridge=makeBridge();const r=await http(`activities/${selected.id}`);assert.equal(r.data.answers.memo,'자유 기록');assert.equal(r.data.revision,1);});
await test('revoked camp cannot silently fall back to personal scope',async()=>{scope=null;assert.equal((await http('context')).status,403);scope='personal-workspace';});
await test('session revoked during request cannot commit cards',async()=>{rejectSession=true;assert.equal((await http('recommendations',request())).status,401);rejectSession=false;});
await test('unconfigured SSO is explicit, never fabricates a user token',async()=>{const noAuth=createLabTransport({origin:labOrigin,allowLoopbackForTests:true,credentialFor:async()=>null});await assert.rejects(()=>noAuth(principal,'GET','/api/lab/session'),e=>e.code==='lab_sso_unconfigured');});
await test('mutation CSRF/origin check is enforced',async()=>{const r=await fetch(origin+'/api/planner/lab/select',{method:'POST',headers:{'x-qa-user':'qa-student-a','x-planner-binding':hash(['qa-student-a','qa-session']),'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,403);});
await test('old account browser binding cannot read or mutate under new login',async()=>{const r=await fetch(origin+'/api/planner/lab/activities',{headers:{'x-qa-user':'qa-student-b','x-planner-binding':hash(['qa-student-a','qa-session'])}});assert.equal(r.status,409);});
await test('oversized/unknown answer keys cannot be stored',async()=>{assert.equal((await http(`activities/${selected.id}/answers`,{revision:1,answers:{fakeAchievement:'採用実績'}})).status,400);});
store.close();await new Promise(r=>server.close(r));await new Promise(r=>lab.close(r));rmSync(temp,{recursive:true,force:true});
