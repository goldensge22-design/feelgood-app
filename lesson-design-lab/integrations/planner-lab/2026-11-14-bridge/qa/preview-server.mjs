// LOOPBACK SYNTHETIC QA ONLY. Never package this as a product server/login.
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createPlannerLabBridge} from '../payload/library/competency/runtime/planner-lab-bridge.mjs';
import {createPlannerLabStore} from '../payload/library/competency/runtime/planner-lab-store.mjs';
import {createPlannerLabHttp} from '../payload/library/competency/runtime/planner-lab-http.mjs';
const base=import.meta.dirname,profiles=['aviation-security-screening','logistics-analysis','cabin-crew','office-administration'];
const names=['항공보안 · 문서 확인·인계 연습','항공교통물류 · 일정·비용 조정 연습','항공외국어 · 객실 서비스 협업 연습','항공행정 · 자료·협업 우선순위 연습'];
const store=createPlannerLabStore(path.join(base,'preview/synthetic.sqlite'));
let seq=0;
const bridge=createPlannerLabBridge({store,registeredProfileIds:profiles,loadContext:async()=>({report:{id:'synthetic-ui-report',version:'qa-1'},jobs:profiles.map((profileId,i)=>({id:`job-${i}`,profileId,label:names[i],rank:i+1,source:'합성 QA 결과지',verifiedMapping:true}))}),
 assertCurrent:async()=>{},labRequest:async(_p,method,url,input)=>{
  if(url==='/api/lab/session')return {signedIn:true,hasAccess:true,camp:{id:'personal-workspace',revision:1}};
  if(url.endsWith('/select'))return {selected:true,state:'waiting_connection'};
  if(method==='POST'&&url==='/api/lab/daily')return {day:'2026-11-14',version:'synthetic-qa',cards:Array.from({length:input.count},(_,i)=>({id:`preview-${++seq}`,profileId:input.profileIds[0],language:input.language,kind:input.mode==='extra'?input.kind:['work','strategy','reflection'][i],aiStatus:'verified_ai',inputHash:'synthetic',content:{
   title:`${names[profiles.indexOf(input.profileIds[0])]} ${i+1}`,minutes:10,
   materials:[{title:'가상의 교내 행사 안내 A',body:'14:00 배포 마감, 예산 30000원입니다. 자료 20건 중 3건은 수량 확인 중이고 검수 담당자는 1명입니다.'},{title:'가상의 발주·인력 안내 B',body:'A안: 20000원, 13:50 도착. B안: 28000원, 13:20 도착이나 확인 작업이 20분 필요합니다. 담당자 회신은 13:40 이후 가능합니다.'}],
   alternatives:['A안을 택하면 비용은 줄지만 검수 시간이 부족합니다. 미확인 3건을 어떻게 다룰지 결정해야 합니다.','B안을 택하면 시간이 생기지만 추가 인력·재발주 예산 여유가 줄어듭니다.'],
   steps:['정확성·시간·예산의 우선순위를 정합니다.','미확인 정보와 회신 전 가능한 행동을 적습니다.','근거와 감수할 손실을 비교표·인계 메모로 작성합니다.'],artifact:'대안 비교표와 5문장 인계 메모',safety:'교내 가상 문서로 연습합니다. 실제 보안·운항 절차를 수행하지 않습니다.',changeCondition:'담당자가 다른 업무로 이동하여 검수 인원이 줄어듭니다. 결정 유지·수정 이유를 기록하세요.',rubric:['초기 공개 금지'],sourceUses:[{evidenceId:'synthetic-ui-fixture',quote:'합성 검증 예시',application:'UI 흐름 시험용이며 실 AI 생성·직무 전문가 검증이 아닙니다.'}],
  }}))};throw Error('unknown_fixture_request');
 }});
const api=createPlannerLabHttp({bridge,authenticate:async()=>({subject:'synthetic-ui-only',sessionId:'synthetic-ui-session'}),verifyMutation:async req=>{if(req.headers.origin!==`http://127.0.0.1:${port}`)throw Error('origin');}});
const port=Number(process.env.BRIDGE_QA_PORT??43871);
const server=createServer(async(req,res)=>{
 res.once('finish',()=>console.log(req.method,req.url,res.statusCode));
 if(req.url.startsWith('/api/'))return api(req,res);
 if(req.url==='/app.js'||req.url==='/app.css'){res.setHeader('Content-Type',req.url.endsWith('js')?'text/javascript':'text/css');return res.end(await fs.readFile(path.join(base,'preview',req.url.slice(1))));}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><title>플래너 LAB 연결 합성 QA</title><link rel="stylesheet" href="/app.css"><body style="font-family:system-ui;margin:12px"><p>로컬 합성 QA · 실제 계정·기업 AI 연결 아님</p><div id="root"></div><script type="module" src="/app.js"></script></body></html>');
});server.listen(port,'127.0.0.1',()=>console.log(`SYNTHETIC_QA http://127.0.0.1:${port}`));
