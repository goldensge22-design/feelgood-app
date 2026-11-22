/**
 * 결과지 주입 스토어.
 * 출처: docs/NUVIA_PLANNER_RESULT_SERVER_INTEGRATION.md §4 · §7 · §8-3 · §8-9
 *
 * - 초기 로드에서 window.NUVIA_PLANNER_ASSESSMENT 를 읽고,
 *   이후 setAssessment / clearAssessment 로만 바뀐다.
 * - 검증에 실패하면 이전 결과와 workspace 를 그대로 유지한다(§8-3).
 * - 범위(profileKey)나 결과 내용이 바뀌면 generation 을 올려 이전 workspace 와 섞이지 않게 한다(§7).
 * - clear 는 전역 payload·스냅샷을 비우고 정리 담당자에게 알린다(§8-9).
 */
import {DEMOS} from '../adaptive/engine';
import {assessmentIdentity, profileKeyFor, validateInjectedAssessment} from './contractsBridge';
import {clearInjectedPayload, plannerGlobalScope, readInjectedPayload} from './globalScope';
import {integrationError, type AssessmentState, type InjectedAssessment, type IntegrationResult, type PlannerMode} from './types';

type Listener=()=>void;

const listeners=new Set<Listener>();
const clearHandlers=new Set<Listener>();

/** 개발 모드에서 쓸 mock payload. 기본값은 승인된 데모 결과지다. */
let developmentPayload:unknown=null;

let state:AssessmentState|null=null;
let generation=0;
/** 현재 결과의 내용 키. 범위나 내용이 바뀌었는지 판단해 generation 을 올린다. */
let identity:string|null=null;

/** production 이면 주입 없이는 동작하지 않는다. 실제 payload 가 들어온 상태도 production 으로 본다. */
function resolveMode():PlannerMode {
 const declared=plannerGlobalScope().NUVIA_PLANNER_MODE;
 if(declared==='production')return 'production';
 return readInjectedPayload()!==undefined?'production':'development';
}

function ready(assessment:InjectedAssessment,source:AssessmentState['source'],mode:PlannerMode):AssessmentState {
 identity=assessmentIdentity(assessment);
 return {status:'ready',mode,assessment,source,profileKey:profileKeyFor(assessment),error:null,generation};
}

function empty(mode:PlannerMode,error:AssessmentState['error']):AssessmentState {
 identity=null;
 return {status:error?'error':'awaiting',mode,assessment:null,source:null,profileKey:null,error,generation};
}

/** 개발 모드 진단만 남긴다. 사용자 화면에는 안전 문구만 나간다. */
function diagnose(mode:PlannerMode,detail:string):void {
 if(mode!=='production')console.warn('[nuvia:planner] 결과지 주입을 사용할 수 없습니다 —',detail);
}

function buildInitialState():AssessmentState {
 const mode=resolveMode();
 const injected=readInjectedPayload();
 if(injected!==undefined){
  const result=validateInjectedAssessment(injected);
  if(result.ok)return ready(result.value,'injected',mode);
  diagnose(mode,result.detail);
  return empty(mode,integrationError('unavailable'));
 }
 if(mode==='development'){
  const result=validateInjectedAssessment(developmentPayload??DEMOS[0]);
  if(result.ok)return ready(result.value,'development-fallback',mode);
  diagnose(mode,result.detail);
 }
 return empty(mode,null);
}

function notify():void {
 for(const listener of [...listeners])listener();
}

/**
 * 전역 주입을 다시 읽어 스토어를 초기 상태로 되돌린다.
 * 앱 부팅 시 한 번 호출하면 되고, 호출하지 않아도 첫 조회에서 같은 초기화가 일어난다.
 */
export function bootAssessmentStore():AssessmentState {
 state=buildInitialState();
 notify();
 return state;
}

/** 개발 모드에서 쓸 mock payload 를 지정한다. src/mock 의 기존 mock 은 수정하지 않고 여기로 넘긴다. */
export function setDevelopmentPayload(raw:unknown):void {
 developmentPayload=raw;
}

/** useSyncExternalStore 규약: 바뀌지 않았으면 같은 참조를 돌려준다. */
export function getAssessmentSnapshot():AssessmentState {
 if(!state)state=buildInitialState();
 return state;
}

export function subscribeAssessment(listener:Listener):()=>void {
 listeners.add(listener);
 return ()=>{listeners.delete(listener);};
}

/** clear 때 DOM·스토리지 잔존을 지울 담당자를 등록한다(§8-9). 스토어 밖 정리는 여기로 붙인다. */
export function onAssessmentCleared(handler:Listener):()=>void {
 clearHandlers.add(handler);
 return ()=>{clearHandlers.delete(handler);};
}

/**
 * 화면이 열린 뒤 결과를 갱신한다.
 * 실패하면 이전 결과와 workspace 를 그대로 두고 안전 문구만 돌려준다(§8-3).
 */
export function setAssessment(raw:unknown):IntegrationResult {
 const previous=getAssessmentSnapshot();
 const result=validateInjectedAssessment(raw);
 if(!result.ok){
  diagnose(previous.mode,result.detail);
  const error=integrationError(raw===undefined||raw===null?'not_connected':'unavailable');
  state={...previous,mode:'production',status:previous.assessment?'ready':'error',error};
  notify();
  return {ok:false,error};
 }
 // 범위든 내용이든 바뀌면 이전 workspace 와 합치지 않고 새로 연다(§7).
 if(assessmentIdentity(result.value)!==identity)generation+=1;
 state=ready(result.value,'runtime','production');
 notify();
 return {ok:true,value:result.value};
}

/**
 * 로그아웃·대상 사용자 변경.
 * 스토어가 할 수 있는 정리(스냅샷 비우기, 전역 payload 제거, 구독자·정리 담당자 통지)를 모두 한다.
 */
export function clearAssessment():void {
 const mode=getAssessmentSnapshot().mode;
 generation+=1;
 clearInjectedPayload();
 state=empty(mode,null);
 for(const handler of [...clearHandlers]){
  try{handler();}
  catch{/* 한 담당자의 실패가 나머지 정리를 막지 않는다. */}
 }
 notify();
}

/** 현재 결과. 없으면 null. */
export function currentAssessment():InjectedAssessment|null {
 return getAssessmentSnapshot().assessment;
}
