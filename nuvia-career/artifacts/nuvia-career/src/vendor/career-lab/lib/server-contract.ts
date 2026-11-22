import type { Grade, LabState } from './types';

/**
 * 앱 내부 연결 포트일 뿐, 기존 서버의 실제 API 사양이 아닙니다.
 * URL·인증·DTO가 확정되면 담당 개발자가 이 포트를 실제 시스템에 매핑합니다.
 * 기존 서버가 준비되기 전에는 어떤 요청도 보내지 않습니다.
 */
export type AiTask = 'interpret' | 'explore' | 'activity' | 'reflect' | 'story';
export type ConnectionState = 'unconfigured' | 'unauthenticated' | 'ready' | 'error';
export interface ConnectionStatus { state: ConnectionState; message: string }
export interface StudentSession {
  /** 기존 서버가 인증으로 검증한 불투명한 학생 식별자. 클라이언트가 생성하지 않습니다. */
  studentKey: string;
}
export interface WorkspaceSnapshot {
  studentKey: string;
  revision: string;
  state: LabState;
}
export interface AttachmentReference {
  id: string;
  filename: string;
  mediaType: string;
  /** 공개 URL이 아닌 기존 시스템의 접근 제어된 첨부 참조입니다. */
  access: 'private';
}
export interface AssistanceInput {
  /** Only assistanceContext's qualitative allowlist. No grades/IQ/raw reports/images,
   * admission inference or external NUVIA HISTORY. Server must independently enforce this. */
  task: AiTask;
  grade: Grade;
  /** Internal proposal only; the existing server's actual fields remain unspecified. */
  writingLanguage?: string;
  screenLanguage?: string;
  context: Record<string, unknown>;
}
export interface AssistanceResult {
  kind: 'server-ai-proposal';
  text: string;
  /** 실제 서버 기록에 대한 문단별 참조. 자유 텍스트를 검증된 ID로 간주하지 않습니다. */
  evidence: { paragraph: number; recordIds: string[] }[];
}
export class IntegrationPendingError extends Error {
  readonly code = 'INTEGRATION_PENDING';
  constructor() {
    super('기존 서버 연결 대기 중이에요. 서버 주소·인증·데이터 형식은 아직 미정이며, 파일 해석과 AI 생성은 실행되지 않았어요. 수동 입력·작성은 계속할 수 있어요.');
    this.name = 'IntegrationPendingError';
  }
}
export interface LabServerAdapter {
  status(): ConnectionStatus;
  session(): Promise<StudentSession>;
  loadWorkspace(signal?: AbortSignal): Promise<WorkspaceSnapshot>;
  /** studentKey는 인증 세션과 대조해야 하며 revision 충돌 시 덮어쓰지 않습니다. */
  saveWorkspace(snapshot: WorkspaceSnapshot, signal?: AbortSignal): Promise<WorkspaceSnapshot>;
  uploadAttachment(file: File, signal?: AbortSignal): Promise<AttachmentReference>;
  assist(input: AssistanceInput, signal?: AbortSignal): Promise<AssistanceResult>;
  deleteWorkspace(signal?: AbortSignal): Promise<void>;
  exportWorkspace(signal?: AbortSignal): Promise<Blob>;
}
const pending = async (): Promise<never> => { throw new IntegrationPendingError(); };

/** 실서버 실패를 local/demo로 대체하는 분기는 의도적으로 없습니다. */
export const serverAdapter: LabServerAdapter = {
  status: () => ({ state: 'unconfigured', message: '기존 서버 연결 대기' }),
  session: pending,
  loadWorkspace: pending,
  saveWorkspace: pending,
  uploadAttachment: pending,
  assist: pending,
  deleteWorkspace: pending,
  exportWorkspace: pending,
};
