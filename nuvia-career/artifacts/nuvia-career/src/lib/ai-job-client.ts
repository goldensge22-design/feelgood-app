import { createCareerAiJob, getCareerAiJob, getCareerAiJobByClient, cancelCareerAiJob,
  type CareerAiAssistInput, type CareerAiAssistResponse, type CareerAiJobStatus } from '@workspace/api-client-react';

export interface AiTicket {
  clientId: string; jobId?: string; contextHash: string; fingerprint: string;
  action: CareerAiAssistInput['task']; experienceIds: string[]; language: string; purpose: string;
}
export const ticketKey = (owner: string, application: string) => `nuvia:ai-ticket:v1:${owner}:${application}`;
export async function contextHash(value: string) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))]
    .map(v => v.toString(16).padStart(2, '0')).join('');
}
export function readTicket(key: string): AiTicket | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null');
    return value && /^[a-f0-9-]{36}$/.test(value.clientId) && typeof value.contextHash === 'string' &&
      typeof value.fingerprint === 'string' && Array.isArray(value.experienceIds) &&
      ['coach', 'draft', 'analyze', 'voice'].includes(value.action) ? value : null;
  } catch { return null; }
}
export function persistTicket(key: string, ticket: AiTicket) {
  // Refuse NEW generation if its recovery pointer cannot be preserved.
  try { localStorage.setItem(key, JSON.stringify(ticket)); }
  catch { throw Object.assign(new Error('AI_PENDING_SAVE_FAILED'), { code: 'AI_PENDING_SAVE_FAILED' }); }
}
export function forgetTicket(key: string, clientId: string) {
  try { if (readTicket(key)?.clientId === clientId) localStorage.removeItem(key); } catch { /* no new generation */ }
}
const pause = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const cancel = () => { clearTimeout(timer); signal.removeEventListener('abort', cancel); reject(new DOMException('Cancelled', 'AbortError')); };
  const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, ms);
  signal.addEventListener('abort', cancel, { once: true }); if (signal.aborted) cancel();
});
async function shortRequest<T>(signal: AbortSignal, work: (s: AbortSignal) => Promise<T>) {
  const controller = new AbortController(), cancel = () => controller.abort();
  const timer = setTimeout(cancel, 15_000);
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) cancel();
  try { return await work(controller.signal); }
  finally { clearTimeout(timer); signal.removeEventListener('abort', cancel); }
}
/** Polling never creates another generation after acceptance. */
export async function receiveJob(ticket: AiTicket, key: string, signal: AbortSignal,
  initialInput?: CareerAiAssistInput): Promise<CareerAiAssistResponse> {
  let accepted = !!ticket.jobId, attempts = 0;
  while (!signal.aborted) {
    let status: CareerAiJobStatus;
    try {
      if (!accepted && initialInput) {
        // Lost acknowledgement? Same client nonce + same content is idempotent.
        status = await shortRequest(signal, s => createCareerAiJob(initialInput, {
          signal: s, headers: { 'X-Career-AI-Client': ticket.clientId },
        }));
      } else {
        status = await shortRequest(signal, s => ticket.jobId
          ? getCareerAiJob(ticket.jobId, { signal: s })
          : getCareerAiJobByClient(ticket.clientId, { signal: s }));
      }
      accepted = true; attempts = 0; ticket.jobId = status.id;
      // Failure to refresh an already saved nonce does not discard the result.
      try { persistTicket(key, ticket); } catch { /* by-client recovery remains */ }
    } catch (error) {
      if (signal.aborted) throw error;
      const e = error as { status?: number; data?: { error?: string } };
      const code = e.data?.error;
      if (code && ['AI_UNCERTAIN', 'AI_RESULT_EXPIRED', 'AI_INVALID_RESPONSE'].includes(code))
        throw Object.assign(new Error(code), { code });
      if (initialInput && !accepted && ([400, 409, 413, 429].includes(e.status ?? 0) ||
        code === 'AI_NOT_CONFIGURED' || code === 'AI_MODEL_CONFIG')) {
        throw Object.assign(new Error(code ?? 'AI_INVALID_RESPONSE'), { code });
      }
      // Temporary network/DB/auth interruption: retain the ticket, reconnect
      // automatically, and NEVER resubmit after a successful acceptance.
      await pause(Math.min(15_000, 2000 * ++attempts), signal); continue;
    }
    if (status.state === 'complete' && status.response) return { ...status.response, sourceFingerprint: ticket.fingerprint };
    if (!['queued', 'running'].includes(status.state)) {
      const code = status.state === 'cancelled' ? 'CANCELLED' : status.error ?? 'AI_UNCERTAIN';
      throw Object.assign(new Error(code), { code });
    }
    await pause(Math.min(10_000, Math.max(500, status.pollAfterMs)), signal);
  }
  throw new DOMException('Cancelled', 'AbortError');
}
export async function cancelTicket(ticket: AiTicket) {
  const controller = new AbortController();
  try {
    const job = ticket.jobId ? { id: ticket.jobId } : await shortRequest(controller.signal, s => getCareerAiJobByClient(ticket.clientId, { signal: s }));
    await shortRequest(controller.signal, s => cancelCareerAiJob(job.id, { signal: s }));
  } catch { /* may already be dispatched; never regenerate */ }
}
