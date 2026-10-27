import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@clerk/react';
import { PUBLIC_DEMO, localWorkspaceMode } from '@/lib/public-demo';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetCareerOverview,
  getGetCareerOverviewQueryKey,
  useGetCareerExample,
  getGetCareerExampleQueryKey,
  useGetCareerWorkspace,
  getGetCareerWorkspaceQueryKey,
  useSaveCareerWorkspace,
  useGetCareerVersions,
  getGetCareerVersionsQueryKey,
  useCreateCareerVersion,
  type CareerOverview,
  type CareerState,
  type CareerVersion,
} from '@workspace/api-client-react';
import { KEYS, emptyState, isCareerState, loadJSON, mergeAsDraft, removeKey, saveJSON, uid } from '@/lib/career';
import { WorkspaceScope } from '@/lib/workspace-scope';

export type Mode = 'demo' | 'guest' | 'account';
export type SaveStatus = 'loading' | 'local' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';
type Recovery = { baseRevision: number; state: CareerState; at: number };

interface WorkspaceCtx {
  mode: Mode;
  setLocalMode: (m: 'demo' | 'guest') => void;
  authLoaded: boolean;
  userId: string | null;
  overview: CareerOverview | undefined;
  overviewLoading: boolean;
  overviewError: boolean;
  retryOverview: () => void;
  state: CareerState | null;
  loadError: boolean;
  retryLoad: () => void;
  update: (fn: (s: CareerState) => CareerState) => void;
  status: SaveStatus;
  savedAt: string | null;
  saveNow: () => void;
  hasUnsaved: () => boolean;
  reloadServer: () => Promise<void>;
  recoverAsDraft: () => Promise<number>;
  recovery: Recovery | null;
  applyRecovery: () => void;
  discardRecovery: () => void;
  versions: CareerVersion[];
  versionsLoading: boolean;
  createVersion: (appId: string, label: string, submitted: boolean) => Promise<CareerVersion>;
  restoreVersion: (v: CareerVersion) => string;
  selectedAppId: string | null;
  setSelectedAppId: (id: string | null) => void;
  selectedExpId: string | null;
  setSelectedExpId: (id: string | null) => void;
  resetDemo: () => void;
}

const Ctx = createContext<WorkspaceCtx | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { isLoaded, isSignedIn, userId } = PUBLIC_DEMO
    ? { isLoaded: true, isSignedIn: false, userId: null }
    : auth;
  const qc = useQueryClient();
  const [localMode, setLocalModeState] = useState<'demo' | 'guest'>(() => {
    const space = new URLSearchParams(window.location.search).get('space');
    if (space === 'example') return 'demo';
    if (space === 'guest') return 'guest';
    return loadJSON<string>(KEYS.mode) === 'demo' ? 'demo' : 'guest';
  });
  const mode: Mode = localWorkspaceMode(PUBLIC_DEMO, !!isSignedIn, localMode);
  const ctxKey = !isLoaded ? 'pending' : mode === 'account' ? `account:${userId}` : mode;
  const scope = useRef(new WorkspaceScope());
  scope.current.select(ctxKey);

  const [state, setStateRaw] = useState<CareerState | null>(null);
  const stateRef = useRef<CareerState | null>(null);
  const setStateBoth = useCallback((s: CareerState | null) => {
    stateRef.current = s;
    setStateRaw(s);
  }, []);
  const [status, setStatus] = useState<SaveStatus>('loading');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [localVersions, setLocalVersions] = useState<CareerVersion[]>([]);
  const [selectedAppId, setSelectedAppIdRaw] = useState<string | null>(null);
  const setSelectedAppId = useCallback((id: string | null) => {
    setSelectedAppIdRaw(id);
    if (ctxKey === 'pending') return;
    if (id) saveJSON(KEYS.selection(ctxKey), id);
    else removeKey(KEYS.selection(ctxKey));
  }, [ctxKey]);
  const restoreSelection = useCallback((s: CareerState) => {
    const id = loadJSON<string>(KEYS.selection(ctxKey));
    setSelectedAppIdRaw(s.applications.some((a) => a.id === id) ? id : s.applications[0]?.id ?? null);
    const experienceId = loadJSON<string>(KEYS.experienceSelection(ctxKey));
    setSelectedExpIdRaw(s.experiences.some((e) => e.id === experienceId) ? experienceId : null);
  }, [ctxKey]);
  const [selectedExpId, setSelectedExpIdRaw] = useState<string | null>(null);
  const setSelectedExpId = useCallback((id: string | null) => {
    setSelectedExpIdRaw(id);
    if (ctxKey === 'pending') return;
    if (id) saveJSON(KEYS.experienceSelection(ctxKey), id);
    else removeKey(KEYS.experienceSelection(ctxKey));
  }, [ctxKey]);

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const userRef = useRef<string | null>(userId ?? null);
  userRef.current = userId ?? null;
  const revRef = useRef(0);
  const dirtyRef = useRef(false);
  const inFlight = useRef(false);
  const pending = useRef(false);
  const conflictRef = useRef(false);
  const timer = useRef<number | null>(null);
  const initKey = useRef<string | null>(null);
  const initGeneration = useRef(-1);
  const requestIds = useRef(new Map<string, string>());
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (timer.current) window.clearTimeout(timer.current); }; }, []);

  const overviewQ = useGetCareerOverview({ query: { queryKey: getGetCareerOverviewQueryKey(), staleTime: 300_000 } });
  const exampleQ = useGetCareerExample({
    query: { enabled: mode === 'demo', queryKey: getGetCareerExampleQueryKey(), staleTime: Infinity },
  });
  const wsQ = useGetCareerWorkspace({
    query: {
      enabled: isLoaded && mode === 'account',
      queryKey: [...getGetCareerWorkspaceQueryKey(), userId],
      refetchOnWindowFocus: false,
      retry: 1,
    },
  });
  const versionsQ = useGetCareerVersions({
    query: { enabled: isLoaded && mode === 'account', queryKey: [...getGetCareerVersionsQueryKey(), userId] },
  });
  const saveM = useSaveCareerWorkspace();
  const saveRef = useRef(saveM.mutateAsync);
  saveRef.current = saveM.mutateAsync;
  const createM = useCreateCareerVersion();
  const createRef = useRef(createM.mutateAsync);
  createRef.current = createM.mutateAsync;

  // Initialise once per context (guest / demo / account:<user>). Server refetches never replace local edits.
  useEffect(() => {
    if (ctxKey === 'pending' ||
      (initKey.current === ctxKey && initGeneration.current === scope.current.capture())) return;
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    dirtyRef.current = false;
    conflictRef.current = false;
    pending.current = false;
    inFlight.current = false;
    revRef.current = 0;
    requestIds.current.clear();
    setRecovery(null);
    if (mode === 'guest') {
      initKey.current = ctxKey;
      initGeneration.current = scope.current.capture();
      const s = loadJSON<unknown>(KEYS.guest);
      const initial = isCareerState(s) ? s : emptyState();
      setStateBoth(initial);
      restoreSelection(initial);
      setLocalVersions(loadJSON<CareerVersion[]>(KEYS.guestVersions) ?? []);
      setStatus('local');
      setSavedAt(null);
      return;
    }
    if (mode === 'demo') {
      const saved = loadJSON<unknown>(KEYS.demo);
      const st = isCareerState(saved) ? saved : exampleQ.data ?? null;
      if (!st) { setStateBoth(null); setStatus('loading'); return; }
      if (!isCareerState(saved)) saveJSON(KEYS.demo, st);
      initKey.current = ctxKey;
      initGeneration.current = scope.current.capture();
      setStateBoth(st);
      restoreSelection(st);
      setLocalVersions(loadJSON<CareerVersion[]>(KEYS.demoVersions) ?? []);
      setStatus('local');
      setSavedAt(null);
      return;
    }
    if (!wsQ.data || !userId) { setStateBoth(null); setStatus('loading'); return; }
    initKey.current = ctxKey;
    initGeneration.current = scope.current.capture();
    revRef.current = wsQ.data.revision;
    setStateBoth(wsQ.data.state);
    restoreSelection(wsQ.data.state);
    setSavedAt(wsQ.data.savedAt);
    setStatus('saved');
    const rec = loadJSON<Recovery>(KEYS.recovery(userId));
    if (rec && isCareerState(rec.state) && JSON.stringify(rec.state) !== JSON.stringify(wsQ.data.state)) setRecovery(rec);
    else if (rec) removeKey(KEYS.recovery(userId));
  }, [ctxKey, mode, exampleQ.data, wsQ.data, userId, setStateBoth, restoreSelection]);

  const flush = useCallback(async () => {
    if (modeRef.current !== 'account' || conflictRef.current) return;
    if (inFlight.current) { pending.current = true; return; }
    const snap = stateRef.current;
    const requestOwner = userRef.current;
    const generation = scope.current.capture();
    if (!snap || !dirtyRef.current) return;
    inFlight.current = true;
    setStatus('saving');
    try {
      const res = await saveRef.current({ data: { revision: revRef.current, state: snap } });
      if (!mounted.current || !scope.current.accepts(generation)) return;
      revRef.current = res.revision;
      setSavedAt(res.savedAt);
      qc.setQueryData([...getGetCareerWorkspaceQueryKey(), requestOwner], res);
      if (stateRef.current === snap) {
        dirtyRef.current = false;
        setStatus('saved');
        if (userRef.current) removeKey(KEYS.recovery(userRef.current));
      }
    } catch (e) {
      if (!mounted.current || !scope.current.accepts(generation)) return;
      pending.current = false;
      if ((e as { status?: number })?.status === 409) {
        conflictRef.current = true;
        setStatus('conflict');
      } else setStatus('error');
      return;
    } finally {
      // A stale request must neither block the next account's save queue nor
      // clear a newer account's active request.
      if (scope.current.accepts(generation)) inFlight.current = false;
    }
    if (!scope.current.accepts(generation)) return;
    if (pending.current || stateRef.current !== snap) {
      pending.current = false;
      void flush();
    }
  }, [qc]);

  const update = useCallback(
    (fn: (s: CareerState) => CareerState) => {
      const cur = stateRef.current;
      if (!cur) return;
      const next = fn(cur);
      setStateBoth(next);
      const m = modeRef.current;
      if (m === 'guest' || m === 'demo') {
        const ok = saveJSON(m === 'guest' ? KEYS.guest : KEYS.demo, next);
        dirtyRef.current = !ok;
        setStatus(ok ? 'local' : 'error');
        return;
      }
      dirtyRef.current = true;
      if (userRef.current) saveJSON(KEYS.recovery(userRef.current), { baseRevision: revRef.current, state: next, at: Date.now() });
      if (conflictRef.current) return;
      setStatus('dirty');
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => { timer.current = null; void flush(); }, 1200);
    },
    [flush, setStateBoth],
  );

  const saveNow = useCallback(() => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    if (modeRef.current === 'account') { if (!conflictRef.current) void flush(); }
    else if (stateRef.current) {
      const ok = saveJSON(modeRef.current === 'demo' ? KEYS.demo : KEYS.guest, stateRef.current);
      dirtyRef.current = !ok;
      setStatus(ok ? 'local' : 'error');
    }
  }, [flush]);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current || inFlight.current) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  const fetchServer = useCallback(async () => {
    const generation = scope.current.capture();
    const res = await wsQ.refetch();
    if (!mounted.current || !scope.current.accepts(generation)) throw new Error('CONTEXT_CHANGED');
    if (!res.data) throw new Error('reload failed');
    return res.data;
  }, [wsQ]);

  const reloadServer = useCallback(async () => {
    const local = stateRef.current;
    if (local && userRef.current) saveJSON(KEYS.conflictBackup(userRef.current), { state: local, at: Date.now() });
    const server = await fetchServer();
    revRef.current = server.revision;
    conflictRef.current = false;
    dirtyRef.current = false;
    setStateBoth(server.state);
    setSavedAt(server.savedAt);
    setStatus('saved');
    if (userRef.current) removeKey(KEYS.recovery(userRef.current));
  }, [fetchServer, setStateBoth]);

  const recoverAsDraft = useCallback(async () => {
    const local = stateRef.current;
    const server = await fetchServer();
    revRef.current = server.revision;
    conflictRef.current = false;
    if (!local) { setStateBoth(server.state); setStatus('saved'); return 0; }
    const merged = mergeAsDraft(server.state, local);
    setStateBoth(merged.state);
    dirtyRef.current = true;
    if (userRef.current) saveJSON(KEYS.recovery(userRef.current), { baseRevision: server.revision, state: merged.state, at: Date.now() });
    setStatus('dirty');
    void flush();
    return merged.added;
  }, [fetchServer, flush, setStateBoth]);

  const applyRecovery = useCallback(() => {
    if (!recovery) return;
    const rec = recovery;
    setRecovery(null);
    update((cur) => (rec.baseRevision === revRef.current ? rec.state : mergeAsDraft(cur, rec.state).state));
  }, [recovery, update]);

  const discardRecovery = useCallback(() => {
    if (userRef.current) removeKey(KEYS.recovery(userRef.current));
    setRecovery(null);
  }, []);

  const setLocalMode = useCallback((m: 'demo' | 'guest') => {
    if (PUBLIC_DEMO) return;
    saveJSON(KEYS.mode, m);
    // Explicit links must agree with the selected space after a refresh.
    // Preserve the current route, language, other context and hash.
    const url = new URL(window.location.href);
    url.searchParams.set('space', m === 'demo' ? 'example' : 'guest');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    setLocalModeState(m);
  }, []);

  const resetDemo = useCallback(() => {
    removeKey(KEYS.demo);
    removeKey(KEYS.demoVersions);
    setLocalVersions([]);
    if (exampleQ.data) { setStateBoth(exampleQ.data); saveJSON(KEYS.demo, exampleQ.data); }
  }, [exampleQ.data, setStateBoth]);

  const createVersion = useCallback(
    async (appId: string, label: string, submitted: boolean) => {
      const cur = stateRef.current;
      const app = cur?.applications.find((a) => a.id === appId);
      if (!cur || !app) throw new Error('missing application');
      const m = modeRef.current;
      if (m !== 'account') {
        const v: CareerVersion = {
          id: uid('ver'),
          label,
          submitted,
          createdAt: new Date().toISOString(),
          application: JSON.parse(JSON.stringify(app)),
          criteria: cur.criteria.filter((c) => app.criterionIds.includes(c.id)),
        };
        const key = m === 'demo' ? KEYS.demoVersions : KEYS.guestVersions;
        const list = [...(loadJSON<CareerVersion[]>(key) ?? []), v];
        if (!saveJSON(key, list)) throw new Error('LOCAL_SAVE_FAILED');
        setLocalVersions(list);
        return v;
      }
      if (dirtyRef.current || inFlight.current || conflictRef.current) throw new Error('UNSAVED');
      const idKey = `${appId}|${revRef.current}|${label}|${submitted}`;
      let requestId = requestIds.current.get(idKey);
      if (!requestId) { requestId = uid('req'); requestIds.current.set(idKey, requestId); }
      const generation = scope.current.capture();
      const v = await createRef.current({
        data: { applicationId: appId, revision: revRef.current, label, submitted, requestId },
      });
      if (!mounted.current || !scope.current.accepts(generation)) throw new Error('CONTEXT_CHANGED');
      requestIds.current.delete(idKey);
      await qc.invalidateQueries({ queryKey: getGetCareerVersionsQueryKey() });
      return v;
    },
    [qc],
  );

  const restoreVersion = useCallback(
    (v: CareerVersion) => {
      const id = uid('app');
      update((s) => {
        const known = new Set(s.experiences.map((e) => e.id));
        const crit = new Set(s.criteria.map((c) => c.id));
        return {
          ...s,
          applications: [
            ...s.applications,
            {
              ...v.application,
              id,
              experienceIds: v.application.experienceIds.filter((x) => known.has(x)),
              criterionIds: v.application.criterionIds.filter((x) => crit.has(x)),
            },
          ],
        };
      });
      setSelectedAppId(id);
      return id;
    },
    [update, setSelectedAppId],
  );

  const versions = useMemo(() => {
    const list = mode === 'account' ? versionsQ.data ?? [] : localVersions;
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [mode, versionsQ.data, localVersions]);

  const loadError = mode === 'account' ? wsQ.isError && !state : mode === 'demo' ? exampleQ.isError && !state : false;

  const value: WorkspaceCtx = {
    mode,
    setLocalMode,
    authLoaded: isLoaded,
    userId: userId ?? null,
    overview: overviewQ.data,
    overviewLoading: overviewQ.isLoading,
    overviewError: overviewQ.isError,
    retryOverview: () => void overviewQ.refetch(),
    state: initKey.current === ctxKey ? state : null,
    loadError,
    retryLoad: () => void (mode === 'account' ? wsQ.refetch() : exampleQ.refetch()),
    update,
    status,
    savedAt,
    saveNow,
    hasUnsaved: () => dirtyRef.current || inFlight.current,
    reloadServer,
    recoverAsDraft,
    recovery,
    applyRecovery,
    discardRecovery,
    versions,
    versionsLoading: mode === 'account' && versionsQ.isLoading,
    createVersion,
    restoreVersion,
    selectedAppId: initKey.current === ctxKey ? selectedAppId : null,
    setSelectedAppId,
    selectedExpId: initKey.current === ctxKey ? selectedExpId : null,
    setSelectedExpId,
    resetDemo,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace() {
  const c = useContext(Ctx);
  if (!c) throw new Error('WorkspaceProvider missing');
  return c;
}
