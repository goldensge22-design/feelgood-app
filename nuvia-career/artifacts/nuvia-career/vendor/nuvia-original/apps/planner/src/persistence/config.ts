/**
 * 셸 API 경로와 헤더 이름.
 * 문서 §5 의 다섯 엔드포인트 외의 주소를 플래너가 부르지 않는다.
 */
import type {Assessment,PersistenceConfig,PlannerProfile,StorageLike} from './types';

export const ENDPOINTS={
 assessmentContext:'/api/v1/planner/assessment-context',
 workspace:'/api/v1/planner/workspace',
 executionEvents:'/api/v1/planner/execution-events',
 externalVerifications:'/api/v1/planner/external-verifications',
} as const;

/**
 * 저장 범위를 URL query 가 아니라 헤더로 보낸다.
 * 식별자나 해석 버전을 URL query 에 노출하지 않는다 (문서 §4).
 * 셸은 인증 세션의 subject 와 이 헤더의 subjectId 를 대조한다 (문서 §5).
 */
export const HEADERS={
 subjectId:'X-Nuvia-Subject-Id',
 assessmentId:'X-Nuvia-Assessment-Id',
 profileVersion:'X-Nuvia-Profile-Version',
 interpretationVersion:'X-Nuvia-Interpretation-Version',
 idempotencyKey:'Idempotency-Key',
 retryCount:'X-Nuvia-Retry-Count',
 ifMatch:'If-Match',
} as const;

/** 로컬 캐시 키. workspace 본문 키는 기존 저장분과 같은 형식을 유지한다. */
export const REVISION_PREFIX='nuvia-planner:revision:2.0:';
export const DIRTY_PREFIX='nuvia-planner:dirty:2.0:';
export const LAST_PROFILE_KEY='nuvia-planner:profile-key:2.0';
export const QUEUE_KEY='nuvia-planner:queue:2.0';

export interface ResolvedConfig {
 baseUrl:string;
 fetchImpl:typeof fetch|null;
 storage:StorageLike|null;
 now:()=>number;
 newId:()=>string;
 timeoutMs:number;
 maxQueue:number;
 maxAttempts:number;
}

/** localStorage 가 없거나 접근이 막힌 환경(테스트 node, 사생활 보호 모드)에서도 죽지 않는다. */
export function resolveStorage(explicit?:StorageLike|null):StorageLike|null {
 if(explicit!==undefined)return explicit;
 try{const s=(globalThis as any).localStorage;return s&&typeof s.getItem==='function'?s as StorageLike:null;}catch{return null;}
}

export function resolveConfig(config:PersistenceConfig={}):ResolvedConfig {
 const fetchImpl=config.fetchImpl??(typeof globalThis.fetch==='function'?globalThis.fetch.bind(globalThis):null);
 return {
  baseUrl:(config.baseUrl??'').replace(/\/+$/,''),
  fetchImpl,
  storage:resolveStorage(config.storage),
  now:config.now??(()=>Date.now()),
  newId:config.newId??(()=>globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random().toString(36).slice(2)}`),
  timeoutMs:config.timeoutMs??10000,
  maxQueue:config.maxQueue??200,
  maxAttempts:config.maxAttempts??5,
 };
}

/** 저장 범위 식별자. 문서 §5 의 네 값만 쓴다. 점수·이름 같은 내용은 넣지 않는다. */
export function profileKeyOf(profile:PlannerProfile){
 return JSON.stringify([profile.mode,profile.subjectId,profile.assessmentId,profile.profileVersion,profile.interpretationVersion]);
}

/** 결과지 payload 에서 저장 범위를 만든다. v1.0 은 해석 버전이 없어 ''로 둔다 (문서 §7). */
export function profileFromAssessment(mode:PlannerProfile['mode'],assessment:Assessment):PlannerProfile {
 return {
  mode,
  subjectId:assessment.subjectId,
  assessmentId:assessment.assessmentId,
  profileVersion:assessment.profileVersion,
  interpretationVersion:assessment.scoreSystem?.interpretationVersion??'',
 };
}

/** 저장 범위가 비어 있으면 서버로 보내지 않는다. 잘못된 범위의 쓰기를 막는 방어선이다. */
export function profileUsable(profile:PlannerProfile){
 return !!profile&&!!profile.subjectId.trim()&&!!profile.assessmentId.trim()&&!!profile.profileVersion.trim();
}
