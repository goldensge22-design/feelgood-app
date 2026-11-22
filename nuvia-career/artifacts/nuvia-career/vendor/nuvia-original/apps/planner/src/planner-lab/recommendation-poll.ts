export type Generation = { id: string; state: string; attempt: number };
export type RecommendationResult = { status: string; generation?: Generation };
type Api = <T>(path: string, signal: AbortSignal, body?: unknown) => Promise<T>;
const pause = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
  const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
  const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
  signal.addEventListener('abort', abort, { once: true });
});

/** One submission, then read-only status/results. A slow or unknown outcome
 * retains its ticket so the next click cannot silently buy another generation. */
export async function receiveRecommendation<T extends RecommendationResult>(
  api: Api, input: Record<string, unknown>, signal: AbortSignal,
  remember: (generation: Generation) => void, existing?: Generation,
  now = () => Date.now(), wait = pause,
): Promise<T> {
  const started = now();
  const poll = (id: string) => api<T>(`recommendations/${encodeURIComponent(id)}?config=${encodeURIComponent(JSON.stringify(input))}`, signal);
  let result = existing && !input.retryFailed ? await poll(existing.id) : await api<T>('recommendations', signal, input);
  while (true) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    if (result.generation) remember(result.generation);
    if (result.status !== 'pending' || !result.generation || now() - started >= 25_000) return result;
    await wait(1000, signal);
    result = await poll(result.generation.id);
  }
}
