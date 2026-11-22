/**
 * 공용 계약(@nuvia/contracts) 연결부.
 *
 * 검증·지원순서·강점순서·범위키는 전부 공용 계약이 소유한다.
 * 여기서는 그 결과를 플래너가 쓰는 모양으로 옮기기만 하고 새 판정 규칙을 만들지 않는다.
 * 계약에 없는 필드(결과지 접근 토큰 등)는 이 경계에서 전부 버린다(§6).
 */
import {
 AXIS_IDS, profileKey, resolveStrengthOrder, resolveSupportOrder, supportTargetForRound, validateAssessment,
} from '@nuvia/contracts';
import type {Assessment, AxisId} from '@nuvia/contracts';
import {profileKey as engineProfileKey, validateTransfer} from '../adaptive/engine';
import type {InjectedAssessment} from './types';

export {AXIS_IDS};

export type BridgeResult={ok:true;value:InjectedAssessment}|{ok:false;detail:string};

/**
 * 계약이 통과시킨 값을 알려진 필드만 골라 다시 만든다.
 * 전이 근거(transfer)는 공용 계약 밖의 플래너 확장이라 기존 engine 검증기를 그대로 쓴다.
 */
function pick(a:Assessment,raw:unknown):InjectedAssessment {
 const axes={} as InjectedAssessment['axes'];
 for(const axis of AXIS_IDS){
  const score=a.axes[axis];
  axes[axis]={level:score.level,value:score.value,unit:score.unit};
 }
 const transfer=(raw as {transfer?:unknown}).transfer;
 return {
  schemaVersion:'1.1',
  assessmentId:a.assessmentId,
  subjectId:a.subjectId,
  profileVersion:a.profileVersion,
  educationStage:a.educationStage,
  scoreSystem:{
   instrument:a.scoreSystem.instrument,
   metric:a.scoreSystem.metric,
   label:a.scoreSystem.label,
   interpretationVersion:a.scoreSystem.interpretationVersion,
  },
  axes,
  ...(a.supportOrder?{supportOrder:[...a.supportOrder]}:{}),
  ...(a.strengthOrder?{strengthOrder:[...a.strengthOrder]}:{}),
  ...(transfer!==undefined?{transfer:validateTransfer(transfer)}:{}),
 };
}

/**
 * 주입 payload 검증. v1.1 만 받는다 — v1.0 하위 호환 읽기는 결과지 adapter 몫이다(§7).
 * detail 은 개발 모드 진단용이며 사용자 화면에는 나가지 않는다.
 */
export function validateInjectedAssessment(raw:unknown):BridgeResult {
 if(raw===undefined||raw===null)return {ok:false,detail:'payload 없음'};
 const result=validateAssessment(raw);
 if(!result.ok)return {ok:false,detail:`${result.error.code} @${result.error.path||'-'}`};
 try{return {ok:true,value:pick(result.value,raw)};}
 catch(e){return {ok:false,detail:(e as Error).message};}
}

/** 지원 대상 영역 순서. supportOrder 가 코드의 고정 순서보다 우선한다(§8-4·§8-5). */
export function resolveSupportOrderFor(a:InjectedAssessment):AxisId[] {
 return resolveSupportOrder(a);
}

/** 강점 영역 순서. 표시 순서만 바꾼다(§8-7). */
export function resolveStrengthOrderFor(a:InjectedAssessment):AxisId[] {
 return resolveStrengthOrder(a);
}

/** 이번 회차의 지원 목표 하나. 복수 low 라도 한 회차에 하나만 배정한다(§8-6). */
export function supportTargetFor(a:InjectedAssessment,round:number):AxisId|null {
 return supportTargetForRound(a,round);
}

/**
 * workspace 범위 키(§5).
 * subjectId + assessmentId + profileVersion + interpretationVersion 네 가지 조합이다.
 * 바뀌면 이전 workspace 를 자동으로 합치지 않는다(§7).
 */
export function profileKeyFor(a:InjectedAssessment):string {
 return profileKey(a);
}

/** 서버 workspace 범위도 같은 키를 쓴다. 호출부에서 뜻이 드러나도록 이름만 따로 둔다. */
export const workspaceScopeKey=profileKeyFor;

/**
 * 결과 내용이 조금이라도 바뀌었는지 보는 키(점수·순서·전이 근거 포함).
 * 화면 재마운트 판단에만 쓰고 저장 범위 판단에는 쓰지 않는다.
 */
export function assessmentIdentity(a:InjectedAssessment):string {
 return engineProfileKey(a);
}
