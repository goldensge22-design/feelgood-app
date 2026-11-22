/**
 * 대표 Studio 화면(studio/) ↔ NUVIA 셸 연동.
 * 출처: 레퍼런스 nuvia-planner/docs/STUDIO_DEVELOPER_START_HERE_2026-10-22.md 「실제 연결 순서」 2·4.
 *
 * - 결과지: 셸이 심은 결과(assessmentStore, 셸이 v1.1 검증 완료)를 Studio 의 'assessment.connected' 입력 봉투로 만든다.
 *   점수·수준·순서를 다시 계산하지 않는다. 검사일은 계약에 없어 비워 둔다(Studio 는 '미확인'으로 표시).
 * - 저장: Studio 상태를 셸 GET/PUT /api/v1/planner/workspace 에 **검사 버전별 범위**로 둔다(If-Match).
 *   범위(profileKey)가 바뀌면 다른 저장공간이다 — 이전 기록을 자동으로 합치지 않는다(문서 §7).
 *   이 파일은 studio/ 밖에 있어 Studio i18n 매크로를 거치지 않는다. 화면 문구를 만들지 않는다.
 */
import {getAssessmentSnapshot} from './assessmentStore';
import {profileKeyFor} from './contractsBridge';
import type {InjectedAssessment} from './types';
import {ENDPOINTS,HEADERS,profileFromAssessment,profileKeyOf,profileUsable,resolveConfig} from '../persistence/config';
import {createHttp} from '../persistence/http';
import type {HttpOutcome,PlannerProfile} from '../persistence/types';

export interface ConnectedEnvelope {testKind:string;testDate:'';assessment:InjectedAssessment}

export interface StudioScope {
 /** localStorage 키에 붙는 범위 이름. 식별자를 그대로 싣지 않도록 해시한다. */
 id:string;
 /** production 결과일 때만. 개발 mock 은 서버로 보내지 않는다. */
 profile:PlannerProfile|null;
 /** 결과지가 없는 학습자 범위면 null(결과지 연결 입력을 넣지 않는다) */
 envelope:ConnectedEnvelope|null;
}

/**
 * [2026-11-14 대표 QA NUVIA 02·04] D-CAS 결과가 아직 없는 학습자 본인의 서버 저장 범위.
 * 셸 app/api/planner/_lib/scope.ts NO_ASSESSMENT_SCOPE 와 같은 값. 셸이 주입한 학습자 번호(NUVIA_PLANNER_LEARNER)가 있을 때만.
 */
const NO_ASSESSMENT={assessmentId:'no-assessment',profileVersion:'none',interpretationVersion:'none'} as const;
function injectedLearner():string|null{
 try{const v=(globalThis as {NUVIA_PLANNER_LEARNER?:unknown}).NUVIA_PLANNER_LEARNER;return typeof v==='string'&&v.trim()?v.trim():null;}catch{return null;}
}

/** FNV-1a 32bit. 저장 키 구분용(보안 목적 아님). */
function shortHash(text:string){
 let h=0x811c9dc5;
 for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193);}
 return (h>>>0).toString(36);
}

/** 지금 연결된 결과의 저장 범위. 결과가 없으면 null(Studio 원본의 '검사 미연결' 일반 연습). */
export function studioScope():StudioScope|null {
 const snap=getAssessmentSnapshot();
 if(snap.status!=='ready'||!snap.assessment){
  const learner=snap.mode==='production'?injectedLearner():null;
  if(!learner)return null;
  return {id:shortHash('no-assessment:'+learner),envelope:null,
   profile:{mode:'production',subjectId:learner,...NO_ASSESSMENT}};
 }
 const a=snap.assessment;
 const profile=snap.mode==='production'?profileFromAssessment('production',a):null;
 return {
  id:shortHash(profileKeyFor(a)),
  profile:profile&&profileUsable(profile)?profile:null,
  envelope:{testKind:(a.scoreSystem?.label||a.scoreSystem?.instrument||'').slice(0,160),testDate:'',assessment:a},
 };
}

type Request=(input:Parameters<ReturnType<typeof createHttp>>[0])=>Promise<HttpOutcome>;

export interface StudioSyncOptions {request?:Request;storage?:Pick<Storage,'getItem'|'setItem'|'removeItem'>|null;delayMs?:number}

/**
 * 한 범위(scope)의 서버 동기화.
 * - load: 서버본이 있고 이 기기에 못 올린 변경이 없으면 서버본을 돌려준다(화면이 채택).
 *         못 올린 변경이 있으면 이 기기 것을 다시 올린다.
 * - save: 화면 저장마다 호출. 잠깐 모아서 PUT 한 번.
 * - 412(다른 기기·탭이 먼저 저장): 최신 revision 을 받아 이 기기 것을 한 번 더 올린다(마지막 조작 우선).
 * - 오프라인·서버 오류: 변경 표시를 남기고 다음 저장 또는 연결 복구 때 다시 보낸다.
 */
export function createStudioSync(scope:StudioScope,storageKey:string,options:StudioSyncOptions={}){
 const profile=scope.profile;
 const request:Request=options.request??createHttp(resolveConfig());
 const storage=options.storage!==undefined?options.storage:(()=>{try{return globalThis.localStorage??null;}catch{return null;}})();
 const delayMs=options.delayMs??1200;
 const revKey=storageKey+':rev',dirtyKey=storageKey+':dirty';
 const get=(k:string)=>{try{return storage?.getItem(k)??null;}catch{return null;}};
 const set=(k:string,v:string|null)=>{try{if(v===null)storage?.removeItem(k);else storage?.setItem(k,v);}catch{/* 저장소가 막혀도 화면은 계속 */}};
 let latest:unknown=null,timer:ReturnType<typeof setTimeout>|null=null,chain:Promise<unknown>=Promise.resolve();

 function body(data:unknown){
  return {subjectId:profile!.subjectId,schemaVersion:'studio-1',profileKey:profileKeyOf(profile!),clientSavedAt:new Date().toISOString(),data};
 }
 async function put(data:unknown,retried=false):Promise<void> {
  const rev=get(revKey)??'';
  const out=await request({method:'PUT',path:ENDPOINTS.workspace,profile:profile!,headers:rev?{[HEADERS.ifMatch]:rev}:{},body:body(data)});
  if(out.status==='ok'){set(revKey,out.revision||rev);if(latest===data){latest=null;set(dirtyKey,null);}return;}
  if(out.status==='conflict'&&!retried){
   const head=await request({method:'GET',path:ENDPOINTS.workspace,profile:profile!});
   if(head.status==='ok'){set(revKey,head.revision);return put(data,true);}
  }
 }
 function flush(){
  if(!profile||latest===null)return chain;
  const data=latest;
  chain=chain.then(()=>put(data)).catch(()=>undefined);
  return chain;
 }
 return {
  async load():Promise<unknown|null> {
   if(!profile)return null;
   const out=await request({method:'GET',path:ENDPOINTS.workspace,profile});
   if(out.status==='notFound'){set(revKey,'');return null;}
   if(out.status!=='ok')return null;
   set(revKey,out.revision);
   const data=out.body&&typeof out.body==='object'?(out.body as {data?:unknown}).data:null;
   if(get(dirtyKey)==='1')return null;   // 이 기기에 못 올린 변경이 있다 — 다음 save/flush 가 올린다
   return data===undefined?null:data;
  },
  save(data:unknown){
   if(!profile)return;
   latest=data;set(dirtyKey,'1');
   if(timer)clearTimeout(timer);
   timer=setTimeout(()=>{timer=null;void flush();},delayMs);
  },
  flush,
  isDirty:()=>get(dirtyKey)==='1',
 };
}
