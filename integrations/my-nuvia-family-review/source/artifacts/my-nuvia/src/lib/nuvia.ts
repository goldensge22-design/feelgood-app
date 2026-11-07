import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useSearch } from 'wouter';
import {
  actNuviaWorkspace,
  enterNuviaReview,
  getGetNuviaSessionQueryKey,
  getGetNuviaWorkspaceQueryKey,
  leaveNuviaReview,
  useGetNuviaSession,
  useGetNuviaWorkspace,
  type ReviewAction,
  type ReviewEntryAccount,
  type ReviewSession,
  type ReviewWorkspace,
  type Subject,
} from '@workspace/api-client-react';

export type ApiErr = { status: number; code: string };
const KNOWN = ['session_required', 'forbidden', 'conflict', 'active_run', 'source_changed', 'invalid_input', 'simulated_failure'];

export function toApiErr(e: unknown): ApiErr {
  const o = (e ?? {}) as { status?: number; data?: unknown };
  const d = o.data as { error?: unknown } | null | undefined;
  const raw = d && typeof d === 'object' && typeof d.error === 'string' ? d.error : '';
  const status = typeof o.status === 'number' ? o.status : 0;
  let code = KNOWN.includes(raw) ? raw : '';
  if (!code) code = status === 401 ? 'session_required' : status === 403 ? 'forbidden' : status === 409 ? 'conflict' : status === 400 ? 'invalid_input' : 'network';
  return { status, code };
}

/* URL helpers: preserve child/lang (and activity) across navigation */
export function useNav() {
  const search = useSearch();
  const [loc, setLoc] = useLocation();
  const params = new URLSearchParams(search);
  const href = (path: string, extra?: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const k of ['child', 'lang', 'space']) {
      const v = params.get(k);
      if (v) p.set(k, v);
    }
    if (extra) for (const [k, v] of Object.entries(extra)) p.set(k, v);
    const s = p.toString();
    return s ? `${path}?${s}` : path;
  };
  const full = loc + (search ? `?${search}` : '');
  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(search);
    if (v === null) p.delete(k);
    else p.set(k, v);
    const s = p.toString();
    setLoc(s ? `${loc}?${s}` : loc, { replace: true });
  };
  return { href, params, loc, full, setLoc, setParam };
}

export function safeReturn(v: string | null): string {
  return v && v.startsWith('/') && !v.startsWith('//') && !/[\\\u0000-\u001f]/.test(v) ? v : '/';
}

export function useSession() {
  return useGetNuviaSession({ query: { queryKey: getGetNuviaSessionQueryKey(), retry: false, staleTime: 15_000, refetchInterval: 60_000 } });
}

/** Returns the subject for the URL child param. A non-empty but unauthorized
 * id yields `invalid: true` instead of silently switching to another person. */
export function resolveSubject(session: ReviewSession | undefined, id: string | null): { subject: Subject | null; invalid: boolean } {
  const list = session?.subjects ?? [];
  if (id) {
    const found = list.find((s) => s.id === id);
    return found ? { subject: found, invalid: false } : { subject: null, invalid: true };
  }
  return { subject: list[0] ?? null, invalid: false };
}
export function pickSubject(session: ReviewSession | undefined, id: string | null): Subject | null {
  return resolveSubject(session, id).subject;
}

export function useWorkspace(subjectId: string | undefined, enabled: boolean) {
  const id = subjectId ?? '';
  return useGetNuviaWorkspace(id, {
    query: { enabled: !!subjectId && enabled, queryKey: getGetNuviaWorkspaceQueryKey(id), refetchInterval: 10_000, retry: false },
  });
}

/** Clears every account-scoped cache entry; used on enter/leave */
export function useAccountSwitch() {
  const qc = useQueryClient();
  const clear = () => {
    qc.removeQueries({ predicate: (q) => typeof q.queryKey[0] === 'string' && (q.queryKey[0].startsWith('/api/nuvia/subjects') || q.queryKey[0].startsWith('/api/nuvia/teacher')) });
  };
  const enter = async (account: ReviewEntryAccount, space = 'visitor') => {
    const prev = qc.getQueryData<ReviewSession>(getGetNuviaSessionQueryKey());
    if (prev?.account && (prev.account !== account || prev.space !== space)) clearAccountDrafts(`${prev.space ?? 'legacy'}.${prev.account}`);
    clear();
    const s = await enterNuviaReview({ account, space, acknowledged: true });
    qc.setQueryData(getGetNuviaSessionQueryKey(), s);
    return s;
  };
  const leave = async (opts?: { keepDrafts?: boolean }) => {
    const prev = qc.getQueryData<ReviewSession>(getGetNuviaSessionQueryKey());
    await leaveNuviaReview();
    if (!opts?.keepDrafts && prev?.account) clearAccountDrafts(`${prev.space ?? 'legacy'}.${prev.account}`);
    clear();
    await qc.invalidateQueries({ queryKey: getGetNuviaSessionQueryKey() });
  };
  return { enter, leave };
}

type Payload = Omit<ReviewAction, 'version' | 'requestId'>;
type ActResult = { ok: true; data: ReviewWorkspace } | { ok: false; error: ApiErr };

/**
 * Sends a ReviewAction. When `key` is given, the requestId is persisted in
 * sessionStorage so an uncertain retry (network/5xx, reload, double-click)
 * reuses the same id. It is cleared only on success or definitive rejection.
 */
export function useAct(subjectId: string | undefined) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ApiErr | null>(null);
  const inflight = useRef(new Set<string>());

  const run = useCallback(
    async (payload: Payload, opts?: { key?: string; simulateFailure?: boolean }): Promise<ActResult> => {
      if (!subjectId) return { ok: false, error: { status: 401, code: 'session_required' } };
      const lockKey = opts?.key ?? payload.type + (payload.planId ?? '');
      if (inflight.current.has(lockKey)) return { ok: false, error: { status: 0, code: 'pending' } };
      inflight.current.add(lockKey);
      const qk = getGetNuviaWorkspaceQueryKey(subjectId);
      const ws = qc.getQueryData<ReviewWorkspace>(qk);
      const storeKey = opts?.key ? `nuvia.req.${subjectId}.${opts.key}` : null;
      let requestId = storeKey ? sessionStorage.getItem(storeKey) : null;
      if (!requestId) {
        requestId = opts?.key?.startsWith('create-') && /^[\w-]{8,128}$/.test(opts.key) ? opts.key : crypto.randomUUID();
        if (storeKey) sessionStorage.setItem(storeKey, requestId);
      }
      setPending(lockKey);
      setError(null);
      try {
        const next = await actNuviaWorkspace(subjectId, {
          ...payload,
          version: ws?.version ?? 0,
          requestId,
          ...(opts?.simulateFailure ? { simulateFailure: true } : {}),
        });
        qc.setQueryData(qk, next);
        if (storeKey) sessionStorage.removeItem(storeKey);
        return { ok: true, data: next };
      } catch (e) {
        const err = toApiErr(e);
        setError(err);
        if ([400, 403, 409].includes(err.status) && storeKey) sessionStorage.removeItem(storeKey);
        if (err.status === 409) await qc.invalidateQueries({ queryKey: qk });
        if (err.status === 401) await qc.invalidateQueries({ queryKey: getGetNuviaSessionQueryKey() });
        return { ok: false, error: err };
      } finally {
        inflight.current.delete(lockKey);
        setPending(null);
      }
    },
    [subjectId, qc],
  );
  return { run, pending, error, clearError: () => setError(null) };
}

/** Temporary local recovery draft (server stays source of truth).
 * Re-reads synchronously when the key changes so a previous scope's value is
 * never written into a new account/subject key. */
function readDraft<T>(key: string, initial: T): { val: T; had: boolean } {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { val: JSON.parse(raw) as T, had: true } : { val: initial, had: false };
  } catch {
    return { val: initial, had: false };
  }
}
export function useLocalDraft<T>(key: string, initial: T) {
  const [state, setState] = useState(() => ({ key, ...readDraft(key, initial) }));
  let cur = state;
  if (state.key !== key) {
    cur = { key, ...readDraft(key, initial) };
    setState(cur);
  }
  const setVal = useCallback(
    (v: T) => {
      localStorage.setItem(key, JSON.stringify(v));
      setState((s) => ({ ...s, key, val: v }));
    },
    [key],
  );
  const clear = () => {
    localStorage.removeItem(key);
    setState({ key, val: initial, had: false });
  };
  return [cur.val, setVal, clear, cur.had] as const;
}

export function clearAccountDrafts(account: string | undefined) {
  if (!account) return;
  const prefix = `nuvia.draft.${account}.`;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) localStorage.removeItem(k);
  }
}

export function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [active]);
  return now;
}

export function fmtClock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
