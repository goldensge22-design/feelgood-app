import { useState } from 'react';
import { useLocale } from '@/vendor/career-lab/lib/locale';
import { formatMessage } from '@/vendor/career-lab/lib/i18n-runtime';
import type { PracticeLink } from '@/vendor/career-lab/lib/types';
import { TASK_KINDS, SCENARIOS, simulationTask, type SimulationTask, type TaskKind } from '@/vendor/career-lab/lib/activity-assistance';
import { LField, TextIn, TextArea, Tag } from './ui';
import { Button } from '@/vendor/career-lab/components/ui/button';

type Field = 'title' | 'role' | 'problem' | 'steps' | 'scope' | 'artifact' | 'questions';
const FIELDS: { key: Field; label: string; multi?: boolean; list?: boolean }[] = [
  { key: 'title', label: '과제 제목' }, { key: 'role', label: '가상 역할' }, { key: 'problem', label: '해결할 문제', multi: true },
  { key: 'steps', label: '진행 단계 (한 줄에 하나)', multi: true, list: true }, { key: 'scope', label: '범위', multi: true },
  { key: 'artifact', label: '남길 결과물 (계획)' }, { key: 'questions', label: '스스로 확인할 질문 (한 줄에 하나)', multi: true, list: true },
];
interface Draft { task: SimulationTask; edited: Partial<Record<Field, boolean>>; scenarioEdited: boolean }
export interface SimulationContext { strengthIds: string[]; method: PracticeLink['method']; interests: string[]; strengths: string[] }

export function SimulationBuilder({ onConfirm, context }: { onConfirm: (task: SimulationTask) => void; context: SimulationContext }) {
  const { t } = useLocale();
  const [kind, setKind] = useState<TaskKind | ''>('');
  const [scenarioMode, setScenarioMode] = useState<'prepared' | 'manual'>('prepared');
  const [prepared, setPrepared] = useState(SCENARIOS[0]);
  const [manual, setManual] = useState('');
  const [round, setRound] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [candidate, setCandidate] = useState<Draft | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const show = (d: Draft, f: Field) => {
    const v = d.task[f] as string | string[];
    const s = Array.isArray(v) ? v.map(x => d.edited[f] ? x : t(x)).join('\n') : (d.edited[f] ? v : t(v));
    return s;
  };
  const propose = () => {
    setError(''); setNotice('');
    if (!kind) return setError('먼저 과제 유형을 하나 골라 주세요.');
    const manualScenario = scenarioMode === 'manual';
    const scenario = manualScenario ? manual.trim() : prepared;
    if (!scenario) return setError('직접 쓰는 상황을 한 문장 이상 적어 주세요.');
    const next: Draft = { task: simulationTask(kind, scenario, context.method, context.strengthIds, round), edited: {}, scenarioEdited: manualScenario };
    setRound(r => r + 1);
    if (draft && !confirmed && Object.values(draft.edited).some(Boolean)) { setCandidate(next); setNotice('수정한 초안은 그대로 두었어요. 아래 새 제안을 보고 바꿀지 정해 주세요.'); }
    else { setDraft(next); setCandidate(null); setConfirmed(false); }
  };
  const edit = (f: Field, value: string, list?: boolean) => {
    if (!draft || confirmed) return;
    const v = list ? value.split('\n') : value;
    setDraft({ ...draft, task: { ...draft.task, [f]: v }, edited: { ...draft.edited, [f]: true } });
  };
  const confirm = () => {
    if (!draft || confirmed) return;
    const tk = draft.task, e = draft.edited;
    const val = (f: Field) => { const v = tk[f] as string | string[]; return Array.isArray(v) ? v.map(x => (e[f] ? x : t(x)).trim()).filter(Boolean) : (e[f] ? v : t(v)).trim(); };
    const title = val('title') as string, steps = val('steps') as string[];
    if (!title) return setError('과제 제목을 적어 주세요.');
    if (!steps.length) return setError('진행 단계를 한 줄 이상 적어 주세요.');
    if (!tk.minutes || tk.minutes < 5) return setError('예상 시간은 5분 이상으로 적어 주세요.');
    setError('');
    const productSources: Record<string, string | string[]> = {};
    for (const f of FIELDS) if (!e[f.key]) { const v = tk[f.key] as string | string[]; productSources[f.key] = Array.isArray(v) ? [...v] : v; }
    if (!draft.scenarioEdited) productSources.scenario = tk.scenario;
    onConfirm({ ...tk, productSources: productSources as SimulationTask['productSources'], title, role: val('role') as string, problem: val('problem') as string, steps, scope: val('scope') as string,
      artifact: val('artifact') as string, questions: val('questions') as string[] });
    setConfirmed(true); setNotice('이 초안으로 활동을 준비했어요. 다른 과제는 "새 과제 시작"을 눌러 주세요.');
  };
  const reset = () => { setDraft(null); setCandidate(null); setConfirmed(false); setError(''); setNotice(''); setKind(''); };

  return <section className="space-y-5" aria-labelledby="sim-heading" data-testid="simulation-builder">
    <div>
      <h3 id="sim-heading" className="text-lg font-semibold">가상 직무 과제 만들기</h3>
      <p className="text-sm text-muted-foreground">준비된 예시 틀로 과제 초안을 보여 줘요. AI가 만든 결과가 아니고, 실제 근무 경험이나 정답도 아니에요.</p>
      {(context.interests.length > 0 || context.strengths.length > 0) && <p className="mt-2 text-sm">
        {context.interests.length > 0 && <>관심사: <bdi data-i18n-original>{context.interests.join(', ')}</bdi> </>}
        {context.strengths.length > 0 && <>· 내가 확인한 강점: <bdi data-i18n-original>{context.strengths.join(', ')}</bdi></>}
      </p>}
    </div>

    <fieldset className="space-y-2" disabled={confirmed}>
      <legend className="mb-2 font-medium">1. 과제 유형</legend>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label={t('과제 유형')}>
        {(Object.keys(TASK_KINDS) as TaskKind[]).map(k => <button key={k} type="button" role="radio" aria-checked={kind === k}
          onClick={() => setKind(k)} data-testid="simulation-kind" data-kind={k}
          className={`min-h-[44px] rounded-xl border p-3 text-start transition ${kind === k ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'border-input hover:border-primary/50'}`}>
          <span className="block font-medium">{t(TASK_KINDS[k].name)}</span>
          <span className="block text-sm text-muted-foreground">{t(TASK_KINDS[k].description)}</span>
        </button>)}
      </div>
    </fieldset>

    <fieldset className="space-y-2" disabled={confirmed}>
      <legend className="mb-2 font-medium">2. 가상 상황</legend>
      <div className="flex flex-wrap gap-2">
        {(['prepared', 'manual'] as const).map(m => <Button key={m} type="button" variant={scenarioMode === m ? 'default' : 'outline'} className="min-h-[44px]"
          aria-pressed={scenarioMode === m} onClick={() => setScenarioMode(m)} data-testid={`simulation-scenario-mode-${m}`}>
          {m === 'prepared' ? t('준비된 예시 상황') : t('직접 쓰기')}</Button>)}
      </div>
      {scenarioMode === 'prepared'
        ? <div className="space-y-2" role="radiogroup" aria-label={t('준비된 예시 상황')}>{SCENARIOS.map(x => <label key={x} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-input px-3">
            <input type="radio" name="sim-scenario" checked={prepared === x} onChange={() => setPrepared(x)} data-testid="simulation-scenario" className="size-4" />
            <span>{t(x)}</span></label>)}</div>
        : <LField label="내가 정하는 가상 상황" hint="실제 회사·인물 이름 대신 가상의 상황으로 적어 주세요."><TextIn value={manual} onChange={e => setManual(e.target.value)} data-testid="simulation-scenario" className="min-h-[44px]" /></LField>}
    </fieldset>

    <div className="flex flex-wrap gap-2">
      <Button type="button" className="min-h-[44px]" onClick={propose} disabled={confirmed} data-testid="simulation-propose">{draft ? t('다른 예시 제안 보기') : t('과제 초안 제안 받기')}</Button>
      {confirmed && <Button type="button" variant="outline" className="min-h-[44px]" onClick={reset} data-testid="simulation-new">새 과제 시작</Button>}
    </div>
    {error && <p role="alert" className="text-sm text-destructive" data-testid="simulation-error">{error}</p>}
    {notice && <p role="status" className="text-sm" data-testid="simulation-notice">{notice}</p>}

    {candidate && <div className="space-y-2 rounded-xl border border-dashed border-primary/60 p-4" data-testid="simulation-candidate">
      <p className="font-medium">새 제안 미리보기 <Tag tone="outline">아직 적용 안 됨</Tag></p>
      <p className="text-sm">상황: {candidate.scenarioEdited ? <bdi data-i18n-original>{candidate.task.scenario}</bdi> : t(candidate.task.scenario)}</p>
      <p><b>{show(candidate, 'title')}</b> · {show(candidate, 'role')}</p>
      <p className="text-sm">{show(candidate, 'problem')}</p>
      <ol className="list-inside list-decimal text-sm">{show(candidate, 'steps').split('\n').map((x, i) => <li key={i}>{x}</li>)}</ol>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="min-h-[44px]" onClick={() => { setDraft(candidate); setCandidate(null); setNotice(''); }} data-testid="simulation-accept-candidate">새 제안으로 바꾸기</Button>
        <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => { setCandidate(null); setNotice(''); }} data-testid="simulation-keep-draft">내 초안 유지</Button>
      </div>
    </div>}

    {draft && <div className="space-y-3 rounded-xl bg-secondary/60 p-4" data-testid="simulation-draft">
      <p className="text-sm">
        {formatMessage('유형: {0}', [TASK_KINDS[draft.task.kind].name])} · 상황: {draft.scenarioEdited ? <bdi data-i18n-original>{draft.task.scenario}</bdi> : t(draft.task.scenario)}
      </p>
      {FIELDS.map(f => <LField key={f.key} label={f.label}>{f.multi
        ? <TextArea value={show(draft, f.key)} readOnly={confirmed} onChange={e => edit(f.key, e.target.value, f.list)} data-testid={`simulation-${f.key}`} {...(draft.edited[f.key] ? { 'data-i18n-original': '' } : {})} />
        : <TextIn value={show(draft, f.key)} readOnly={confirmed} onChange={e => edit(f.key, e.target.value)} data-testid={`simulation-${f.key}`} className="min-h-[44px]" {...(draft.edited[f.key] ? { 'data-i18n-original': '' } : {})} />}</LField>)}
      <LField label="예상 시간(분)"><TextIn type="number" min={5} value={draft.task.minutes} readOnly={confirmed} className="min-h-[44px]"
        onChange={e => setDraft({ ...draft, task: { ...draft.task, minutes: Math.max(0, Number(e.target.value) || 0) } })} data-testid="simulation-minutes" /></LField>
      <p className="text-sm text-muted-foreground">이 화면은 과제 계획만 만들어요. 답이나 결과는 미리 채우지 않아요. 실제로 해 본 내용은 플래너에서 직접 기록해요.</p>
      <Button type="button" className="min-h-[44px]" onClick={confirm} disabled={confirmed} data-testid="simulation-confirm">{confirmed ? t('확정됨') : t('이 초안으로 확정')}</Button>
    </div>}
  </section>;
}
