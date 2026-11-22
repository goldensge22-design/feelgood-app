import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { emptyState, type LabState } from './types';
import { demoState } from './demo';
import { setOriginalRecords, recordAuthoredChanges, getOriginalTexts, hasUnsavedOriginals, tx } from './i18n-runtime';
import { exampleStoryTemplate } from './story-template';
import { reconcileRecommendations } from './recommendations';

const USER_KEY = 'careerlab:user:v1';
const DEMO_KEY = 'careerlab:demo:v1';
const MODE_KEY = 'careerlab:mode';
export type Mode = 'user' | 'demo';

function sourceKey(s: LabState) {
  return JSON.stringify([s.grade, s.tests, s.interests, s.activityAnswers, s.statement, s.fields, s.savedMajors, s.tempMajor, s.uniLinks, s.savedPrograms, s.tempProgram, s.design, s.activities, s.reflections]);
}

function load(key: string, fallback: () => LabState): { state: LabState; error: string } {
  const prepare=(s:LabState)=>{reconcileRecommendations(s);return s;};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { state: prepare(fallback()), error: '' };
    const baseline = fallback();
    const state = { ...baseline, ...JSON.parse(raw) } as LabState;
    if (key === DEMO_KEY) {
      // Older examples gain display metadata only; never replace their saved text.
      setOriginalRecords(state, baseline, true);
      const originals = getOriginalTexts(false); // Never copy the other mode's unsaved form.
      const templates = exampleStoryTemplate(state);
      for (const p of [...state.story.paragraphs, ...state.story.versions.flatMap(v => v.paragraphs)]) {
        if (p.origin !== 'example-template' || p.displayParts) continue;
        const match = templates.find(t => t.text === p.text);
        if (match) { p.displayParts = match.displayParts; if (p.heading !== match.heading) p.headingAuthored = true; }
        p.preserveOriginals = [...new Set([...(p.preserveOriginals || []), ...originals, ...(!match ? [p.text] : [])])];
      }
    }
    return { state: prepare(state), error: '' };
  } catch {
    return { state: fallback(), error: '저장된 기록을 읽지 못했어요. 브라우저 저장소가 막혀 있거나 데이터가 손상되었을 수 있어요.' };
  }
}

interface Ctx {
  state: LabState; mode: Mode; saveError: string; lastSaved: string;
  update: (recipe: (d: LabState) => void) => void;
  setMode: (m: Mode) => void; resetUser: () => boolean; resetDemo: () => boolean; retrySave: () => void;
}
const LabCtx = createContext<Ctx | null>(null);

type AccountDraft = {
  state: LabState;
  update: Ctx['update'];
  retrySave: () => void;
};
export function AccountLabProvider({children,draft}:{children:ReactNode;draft:AccountDraft}){
  setOriginalRecords(draft.state,demoState(),false);
  return <LabCtx.Provider value={{...draft,mode:'user',saveError:'',lastSaved:'',
    setMode:()=>{},resetUser:()=>false,resetDemo:()=>false}}>{children}</LabCtx.Provider>;
}

export function editLabState(prev:LabState,recipe:(draft:LabState)=>void){
  const d=structuredClone(prev);recipe(d);
  reconcileRecommendations(d);
  d.authoredPaths=recordAuthoredChanges(prev,d);
  if(sourceKey(prev)!==sourceKey(d))d.sourceUpdatedAt=new Date().toISOString();
  return d;
}

export function LabProvider({ children }: { children: ReactNode }) {
  const [mode, setModeS] = useState<Mode>(() => { try { return localStorage.getItem(MODE_KEY) === 'demo' ? 'demo' : 'user'; } catch { return 'user'; } });
  const initial = useRef(load(mode === 'demo' ? DEMO_KEY : USER_KEY, mode === 'demo' ? demoState : emptyState));
  const [state, setState] = useState<LabState>(initial.current.state);
  const [saveError, setSaveError] = useState(initial.current.error);
  const [lastSaved, setLastSaved] = useState('');
  const skip = useRef(true);

  const persist = useCallback((s: LabState, m: Mode) => {
    try {
      localStorage.setItem(m === 'demo' ? DEMO_KEY : USER_KEY, JSON.stringify(s));
      setSaveError(''); setLastSaved(new Date().toISOString());
    } catch (e) {
      const quota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
      setSaveError(quota ? '브라우저 저장 공간이 가득 찼어요. 큰 사진을 지우거나 기록을 내보낸 뒤 정리해 주세요. 방금 입력한 내용은 아직 저장되지 않았어요.' : '이 브라우저에 저장하지 못했어요. 시크릿 모드이거나 저장소가 차단되었을 수 있어요. 방금 입력한 내용은 아직 저장되지 않았어요.');
    }
  }, []);

  useEffect(() => { if (skip.current) { skip.current = false; return; } persist(state, mode); }, [state, mode, persist]);

  const update = useCallback((recipe: (d: LabState) => void) => {
    setState(prev => {
      const d = structuredClone(prev); recipe(d);
      reconcileRecommendations(d);
      d.authoredPaths = recordAuthoredChanges(prev, d);
      if (sourceKey(prev) !== sourceKey(d)) d.sourceUpdatedAt = new Date().toISOString();
      return d;
    });
  }, []);

  const setMode = useCallback((m: Mode) => {
    if (m === mode) return;
    if (hasUnsavedOriginals() && !window.confirm(tx('공간을 바꾸면 아직 저장하지 않은 입력은 닫혀요. 저장한 기록은 각 공간에 그대로 남아요. 계속할까요?'))) return;
    let modeError = '';
    try { localStorage.setItem(MODE_KEY, m); } catch { modeError = '체험 모드 선택을 저장하지 못했어요. 새로고침하면 이전 모드로 돌아갈 수 있어요.'; }
    const r = load(m === 'demo' ? DEMO_KEY : USER_KEY, m === 'demo' ? demoState : emptyState);
    skip.current = true; setModeS(m); setState(r.state); setSaveError(r.error || modeError); setLastSaved('');
  }, [mode]);

  const resetUser = useCallback(() => {
    try { localStorage.removeItem(USER_KEY); } catch { setSaveError('임시 작성 기록을 삭제하지 못했어요. 브라우저 설정에서 사이트 데이터를 직접 지워 주세요.'); return false; }
    if (mode === 'user') { skip.current = true; setState(emptyState()); }
    setSaveError(''); setLastSaved('');
    return true;
  }, [mode]);
  const resetDemo = useCallback(() => {
    try { localStorage.removeItem(DEMO_KEY); } catch { setSaveError('예시 체험을 초기화하지 못했어요. 브라우저 설정을 확인해 주세요.'); return false; }
    if (mode === 'demo') { skip.current = true; setState(demoState()); }
    setSaveError(''); setLastSaved('');
    return true;
  }, [mode]);
  const retrySave = useCallback(() => persist(state, mode), [persist, state, mode]);

  setOriginalRecords(state, demoState(), mode === 'demo');
  return <LabCtx.Provider value={{ state, mode, saveError, lastSaved, update, setMode, resetUser, resetDemo, retrySave }}>{children}</LabCtx.Provider>;
}

export function useLab() {
  const c = useContext(LabCtx);
  if (!c) throw new Error('LabProvider missing');
  return c;
}
