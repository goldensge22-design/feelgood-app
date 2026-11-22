/**
 * 전역 주입 지점 접근기.
 *
 * window 의 타입 선언은 adaptive/AdaptivePlanner.tsx 의 declare global 하나만 둔다.
 * 여기서 다시 선언하면 같은 속성을 두 번 선언하게 되므로, 전역을 좁은 view 로만 본다.
 * node 테스트 환경처럼 window 가 없어도 동작해야 하므로 globalThis 를 쓴다.
 */
export interface PlannerGlobalScope {
 NUVIA_PLANNER_MODE?:string;
 NUVIA_PLANNER_ASSESSMENT?:unknown;
 NUVIAPlanner?:Record<string,unknown>;
}

export function plannerGlobalScope():PlannerGlobalScope {
 return globalThis as unknown as PlannerGlobalScope;
}

/** 주입된 원본 payload. 아직 주입 전이면 undefined. */
export function readInjectedPayload():unknown {
 const raw=plannerGlobalScope().NUVIA_PLANNER_ASSESSMENT;
 return raw===null?undefined:raw;
}

/** 로그아웃·대상 변경 시 전역에 남은 이전 결과를 지운다(§8-9). */
export function clearInjectedPayload():void {
 const scope=plannerGlobalScope();
 if('NUVIA_PLANNER_ASSESSMENT' in scope)delete scope.NUVIA_PLANNER_ASSESSMENT;
}
