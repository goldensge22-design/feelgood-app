/**
 * 플래너 서버 연동 계약 타입.
 * 출처: docs/NUVIA_PLANNER_RESULT_SERVER_INTEGRATION.md §4·§5·§6·§7
 *
 * 플래너는 정적 빌드다. 자체 서버·DB 가 없고 셸(Next.js)의 API 만 호출한다.
 * 백엔드를 직접 부르지 않으며 서비스 API 키를 브라우저에서 다루지 않는다.
 */
import type {Assessment} from '../adaptive/engine';
import type {Workspace} from '../adaptive/workspace';

/** 데모는 실제 결과지처럼 저장·전송하지 않는다 (규칙 v3.1 §3). */
export type Mode='demo'|'production';

/**
 * workspace 저장 범위. 문서 §5·§7 의 네 값으로만 구성한다.
 * 이 네 값 중 하나라도 바뀌면 다른 저장공간이며 자동으로 합치지 않는다.
 */
export interface PlannerProfile {
 mode:Mode;
 subjectId:string;
 assessmentId:string;
 profileVersion:string;
 /** 결과지 해석 버전. v1.0 payload 에는 없을 수 있어 빈 문자열을 허용한다. */
 interpretationVersion:string;
}

/** 전송 결과 분류. 호출자는 이 값만 보고 사용자 안내를 고른다. */
export type TransportStatus='ok'|'conflict'|'unauthorized'|'rejected'|'offline'|'server'|'notFound';

export interface HttpOutcome {
 status:TransportStatus;
 httpStatus:number;
 /** 서버가 준 revision 또는 ETag. 다음 PUT 의 If-Match 에 그대로 싣는다. */
 revision:string;
 body:any;
 error:string;
}

/** workspace 를 어디서 읽었는지. 오프라인 폴백 여부를 호출자가 안다. */
export type WorkspaceSource='server'|'cache'|'blank';

export interface WorkspaceLoadResult {
 source:WorkspaceSource;
 workspace:Workspace;
 revision:string;
 /** 사용자에게 보여줄 한국어 안내. 없으면 ''. */
 error:string;
 /** 이전에 쓰던 profileKey 와 다르면 true. 자동 병합하지 않았다는 뜻이다 (문서 §7). */
 profileChanged:boolean;
 previousProfileKey:string;
}

/**
 * PUT 결과.
 * - `local`   데모 모드라 서버로 보내지 않았다.
 * - `queued`  서버에 닿지 못해 캐시에만 남기고 재시도 대상으로 표시했다.
 * - `conflict` 412. 다중 탭 충돌이다. 조용히 덮어쓰지 않는다.
 */
export type WorkspaceSaveStatus='saved'|'local'|'queued'|'conflict'|'rejected'|'unauthorized';

export interface WorkspaceSaveResult {
 status:WorkspaceSaveStatus;
 revision:string;
 /** 412 일 때만 채운다. 호출자가 사용자에게 어느 쪽을 쓸지 묻는다. */
 serverWorkspace:Workspace|null;
 error:string;
}

/** 컴포넌트 commit() 이 쓰는 반환값. 캐시는 동기, 서버 전송은 비동기다. */
export interface WorkspaceCommitResult {
 /** 로컬 캐시에 남겼는지. false 면 백업 내려받기를 안내한다. */
 cached:boolean;
 error:string;
 synced:Promise<WorkspaceSaveResult>;
}

/** 문서 §6 provenance. 실제 행동과 자기보고·외부 확인을 섞지 않는다. */
export type EventProvenance='actual_behavior'|'self_report'|'external_verification';

/** 결과지 4영역 안정 ID. */
export type AxisId='planning'|'attention'|'simultaneous'|'successive';

/**
 * 수행 이벤트 입력.
 * 검사 원점수 재계산과 플래너 행동 점수화는 이벤트 API 에서 하지 않는다 (문서 §5).
 */
export interface ExecutionEventInput {
 /** 안정 ID 만 쓴다. 번역 문장을 넣지 않는다 (규칙 v3.1 §2-12). */
 eventType:string;
 taskId?:string;
 /** 이번 회차의 지원 영역. 결과지가 정한 값이고 플래너가 다시 판정한 값이 아니다. */
 axis?:AxisId;
 /** 학생이 확인한 실제 시간. 서버 시각과 구분해서 보낸다 (문서 §5). */
 studentConfirmedAt?:string;
 /** 학생이 직접 확인한 값인지. 자기보고와 실제 행동의 provenance 구분용. */
 confirmedByStudent?:boolean;
 /** 기록 근거. 없으면 actual_behavior 로 보낸다. */
 provenance?:EventProvenance;
 /** 목표 행동 수행 근거. 셸에는 goalBehavior 로 간다. */
 outcome?:'performed'|'skipped'|'not_applicable'|'unobserved';
 /** 구조화된 값만. 금지 목록 항목은 전송 직전에 떨어진다. */
 measures?:Record<string,unknown>;
 /** 없으면 생성한다. 재시도해도 같은 값을 유지한다. */
 idempotencyKey?:string;
}

/** 외부 확인 입력. engine.validateVerification 과 같은 모양이다. */
export interface ExternalVerificationInput {
 recordId:string;
 reviewId:string;
 evidenceId:string;
 reviewedAt:string;
 reviewerRole:'teacher'|'parent'|'assessor';
 outcome:'supported'|'not_supported'|'insufficient';
 idempotencyKey?:string;
}

export type EventSendStatus='sent'|'queued'|'skipped'|'rejected'|'unauthorized';

export interface EventSendResult {
 status:EventSendStatus;
 idempotencyKey:string;
 error:string;
}

/** 재시도 큐 항목. 본문은 이미 금지 목록 필터를 통과한 상태로만 보관한다. */
export interface QueuedRequest {
 id:string;
 path:string;
 idempotencyKey:string;
 body:Record<string,unknown>;
 headers:Record<string,string>;
 attempts:number;
 enqueuedAt:string;
}

export interface StorageLike {
 getItem(key:string):string|null;
 setItem(key:string,value:string):void;
 removeItem(key:string):void;
}

export interface PersistenceConfig {
 /** 셸과 같은 오리진이면 ''. 식별자를 URL 에 붙이지 않는다 (문서 §4). */
 baseUrl?:string;
 fetchImpl?:typeof fetch;
 storage?:StorageLike|null;
 now?:()=>number;
 newId?:()=>string;
 timeoutMs?:number;
 maxQueue?:number;
 maxAttempts?:number;
}

export type {Assessment,Workspace};
