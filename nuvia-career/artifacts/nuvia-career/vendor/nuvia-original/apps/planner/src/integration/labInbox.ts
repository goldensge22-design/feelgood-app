/**
 * [NUVIA 연동 2026-11-10] LAB 탐색 방향 수신 — 셸 /api/lab-inbox(학습자 세션으로만 읽음)에서 받아
 * 대표 lab-daily 의 서버 수신 경로(receive + YouthServerContext / applyVerifiedJobSnapshotForReview + JobServerContext)로 넣는다.
 * 대표 02 FINAL_START_HERE 「운영 서버 연결 필수 항목」 1~4: 인증 사용자·현재 세션·서버 순서를 adapter 에 연결.
 * 서버 확인 값(subject 해시·세션 세대·만료·확인 시각·순서)은 셸 응답에서만 온다. 화면은 이 값을 만들지 않는다.
 * 하루 수락 한도(모든 LAB·기기 합계 3개)는 수락 전에 셸 /api/lab-inbox/accept 로 확인한다.
 */
import type {PersonalState,Action} from '../studio/model';
import type {LabDailyAction} from '../lab-daily/model';
import type {YouthServerContext} from '../lab-daily/youth-context';
import type {JobServerContext} from '../lab-daily/job-adapter';
import {JOB_OWNER} from '../lab-daily/job-contract';
import {stable} from '../lab-daily/canonical';
import {student} from '../studio/domain';
import {scenarioMinutes} from './scenario-minutes';
import {studioScope} from './studioServer';

/** 운영 연결(필굿 결과지 + 서버 저장) 상태인가. 검토·데모 공간은 false */
export const labInboxLive=()=>!!studioScope()?.profile;

interface InboxEvent {requestId:string;sourceLab:'youth-career'|'job'|'scenario-card'|'lesson-mission';payload:Record<string,unknown>;serverOrder:number;receivedAt:string}
interface InboxServer {provider:'central-nuvia';subject:string;sessionGeneration:string;sessionExpiresAt:string;checkedAt:string}

/** 지금 연결 상태에서 읽을 수 있으면 [시각, 동작] 목록. 실패하면 빈 목록(화면은 기존 기록을 그대로 쓴다) */
export async function inboxActions(state:PersonalState,scopeKey:string):Promise<{at:string;action:LabDailyAction|Action}[]>{
 let body:{events?:InboxEvent[];server?:InboxServer};
 try{
  const r=await fetch('/api/lab-inbox',{credentials:'same-origin',cache:'no-store'});
  if(!r.ok)return [];
  body=await r.json();
 }catch{return [];}
 const server=body.server,events=(body.events??[]).slice().sort((a,b)=>a.serverOrder-b.serverOrder);
 if(!server||server.provider!=='central-nuvia'||!server.sessionGeneration)return [];
 const d=state.studio?.labDaily,timeZone=d?.account.timeZone??Intl.DateTimeFormat().resolvedOptions().timeZone;
 const raw=String(student(state).stage||'');
 const stage:'middle'|'high'|'adult'=raw==='middle'||raw==='high'?raw:'adult';
 const current={subject:server.subject,camp:'nuvia',sessionGeneration:server.sessionGeneration,scopeKey,sessionExpiresAt:server.sessionExpiresAt,stage,timeZone};
 const out:{at:string;action:LabDailyAction|Action}[]=[];
 for(const e of events){
  const base={provider:'central-nuvia' as const,subject:server.subject,camp:'nuvia',sessionGeneration:server.sessionGeneration,scopeKey,campOwned:true,consent:'granted' as const,serverOrder:e.serverOrder,checkedAt:server.checkedAt};
  if(e.sourceLab==='youth-career'){
   const dir=e.payload.direction as {confirmedAt?:string}|undefined;
   const youth:YouthServerContext={current,verified:{...base,sourceLab:'youth-career',snapshotFingerprint:stable(e.payload),confirmedAt:dir?.confirmedAt??''}};
   out.push({at:server.checkedAt,action:{type:'labdaily.server-receive',requestId:e.requestId,payload:e.payload,youth}});
  }else if(e.sourceLab==='scenario-card'){
   // 기업 LAB 시나리오 카드에서 학생이 확인·수락한 계획 → 일반 과제(자동 시작·완료 없음). requestId 로 한 번만 만든다
   const plan=(e.payload.plan??{}) as Record<string,string>;
   if(!plan.title)continue;
   const steps=String(plan.steps??'').split(/\n+|→/).map(s=>s.trim()).filter(Boolean).slice(0,12);
   out.push({at:e.receivedAt,action:{type:'create',requestId:`scn:${e.requestId}`,title:String(plan.title).slice(0,200),
    scope:[plan.goal,plan.successCriteria&&`완료 기준: ${plan.successCriteria}`,plan.artifactPlan&&`남길 결과물: ${plan.artifactPlan}`].filter(Boolean).join('\n').slice(0,2000),
    firstAction:steps[0]??'',steps,date:/^\d{4}-\d{2}-\d{2}$/.test(plan.date??'')?plan.date:undefined,minutes:scenarioMinutes(e.payload),activity:'기타',activityExplicit:true,timeChosen:scenarioMinutes(e.payload)!==null,scopeChosen:false,planReviewed:false} as Action});
  }else if(e.sourceLab==='lesson-mission'){
   // 수업설계LAB: 학생이 고르고 교사가 확정한 미션 → 일반 과제(자동 시작·완료 없음). 수행·사실은 학생이 직접 적는다
   const m=(e.payload.mission??{}) as {title?:string;goal?:string;firstAction?:string;steps?:string[];deliverable?:string;criterion?:string;minutes?:number|null};
   if(!m.title)continue;
   out.push({at:e.receivedAt,action:{type:'create',requestId:`lesson:${e.requestId}`,title:String(m.title).slice(0,200),
    scope:[m.goal,m.criterion&&`완료 기준: ${m.criterion}`,m.deliverable&&`남길 결과물: ${m.deliverable}`].filter(Boolean).join('\n').slice(0,2000),
    firstAction:String(m.firstAction??m.steps?.[0]??''),steps:(m.steps??[]).slice(0,12),minutes:m.minutes??null,
    activity:'기타',activityExplicit:true,timeChosen:!!m.minutes,scopeChosen:false,planReviewed:false} as Action});
  }else if(e.sourceLab==='job'){
   const job:JobServerContext={current,verified:{...base,ownerProgram:JOB_OWNER,snapshotFingerprint:stable(e.payload),confirmedAt:String(e.payload.generatedAt??e.receivedAt)}};
   out.push({at:server.checkedAt,action:{type:'labdaily.server-receive',requestId:e.requestId,payload:e.payload,job}});
  }
 }
 return out;
}

/** 수락 전 서버 한도 확인. true 면 수락해도 된다 */
export async function reserveAccept(day:string,requestId:string):Promise<'ok'|'limit'|'error'>{
 try{
  const r=await fetch('/api/lab-inbox/accept',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({day,requestId})});
  if(r.ok)return 'ok';
  return r.status===409?'limit':'error';
 }catch{return 'error';}
}
