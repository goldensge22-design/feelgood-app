/**
 * 결과지 주입 계약의 타입과 안전 문구.
 * 출처: docs/NUVIA_PLANNER_RESULT_SERVER_INTEGRATION.md §4 · §8-9,
 *      apps/shell/INTEGRATION_READINESS.md (7) "실패 사유는 세분화해 노출하지 않는다".
 *
 * 플래너는 결과지가 계산한 해석을 검증해 쓰기만 한다. 원점수 재계산·임의 판정은 하지 않는다.
 */
import type {Assessment} from '@nuvia/contracts';
import type {TransferLink} from '../adaptive/engine';

/**
 * 주입된 결과지. 공용 계약(@nuvia/contracts)의 Assessment 에
 * 기존 플래너가 쓰는 전이 근거(transfer)만 선택 항목으로 얹는다.
 * engine.Assessment 보다 좁으므로 기존 engine 함수에 그대로 넘길 수 있다.
 */
export interface InjectedAssessment extends Assessment {transfer?:TransferLink}

/**
 * 실패 사유는 두 가지로만 구분한다.
 * - not_connected: 아직 결과가 연결되지 않음
 * - unavailable:   연결된 결과를 쓸 수 없음(형식·범위·버전 불문)
 * 스키마 위반의 종류를 사용자에게 구분해 보여 주지 않는다.
 */
export type IntegrationErrorCode='not_connected'|'unavailable';

/** showSafeIntegrationError 로 넘어가는 값. 식별자·해석 버전·토큰을 담지 않는다. */
export interface IntegrationError {code:IntegrationErrorCode;message:string}

export type IntegrationResult<T=InjectedAssessment>={ok:true;value:T}|{ok:false;error:IntegrationError};

/** 'production' 이면 주입 없이는 동작하지 않는다. 개발 모드에서만 mock 을 쓴다. */
export type PlannerMode='production'|'development';

/** injected=초기 전역 주입, runtime=setAssessment 호출, development-fallback=개발용 mock */
export type AssessmentSource='injected'|'runtime'|'development-fallback';

/** awaiting=연결 대기, ready=사용 가능, error=연결되었으나 쓸 수 없음 */
export type AssessmentStatus='awaiting'|'ready'|'error';

export interface AssessmentState {
 status:AssessmentStatus;
 mode:PlannerMode;
 assessment:InjectedAssessment|null;
 source:AssessmentSource|null;
 /** 현재 workspace 범위 키. 바뀌면 이전 workspace 를 자동으로 합치지 않는다(§7). */
 profileKey:string|null;
 /** 사용자에게 보여 줘도 되는 오류만 담는다. 없으면 null. */
 error:IntegrationError|null;
 /** profileKey 가 바뀌거나 결과가 해제될 때마다 증가한다. 화면 재마운트 키로 쓴다. */
 generation:number;
}

/** 사용자에게 보여 주는 유일한 문구 집합. 여기 밖의 문자열은 화면에 내보내지 않는다. */
export const SAFE_MESSAGES:Record<IntegrationErrorCode,string>={
 not_connected:'검사 결과를 기다리고 있어요. 필굿 서비스에서 검사 결과를 연결해 주세요.',
 unavailable:'지금은 검사 결과를 사용할 수 없어요. 필굿 서비스에서 검사 결과를 다시 연결해 주세요.',
};

export function integrationError(code:IntegrationErrorCode):IntegrationError {
 return {code,message:SAFE_MESSAGES[code]};
}

/**
 * showSafeIntegrationError 에 넘길 문구를 만든다.
 * 넘어온 message 를 그대로 믿지 않고 항상 안전 문구로 다시 만든다 —
 * 검증기 내부 메시지에 식별자나 버전이 섞여 들어와도 화면으로 새지 않게 한다.
 */
export function safeIntegrationMessage(error:unknown):string {
 const code=(error as IntegrationError|undefined)?.code;
 return code==='not_connected'?SAFE_MESSAGES.not_connected:SAFE_MESSAGES.unavailable;
}
