import { T } from '@/i18n/tx';
import { Printer, Plus, Trash2, ArrowUp, ArrowDown, FileX2, BookMarked, AlertTriangle, Coffee } from 'lucide-react';
import { Link } from 'wouter';
import { useApp, setState, uid } from '@/lib/store';
import { CARD_KINDS, regenerateCards, demoAssign, CAMP_TRACKS } from '@/lib/cards';
import { campSheets } from '@/lib/print-pages';
import { blankTeaching, hanseoExample, MODE_LABELS, usesGroups, type TeachingConfig, type TeachingMode, type SessionBlock } from '@/lib/teaching';
import { STAGES, STAGE_LABEL, type Stage } from '@/data/worksheets';
import { useToast } from '@/hooks/use-toast';
import { GroupEditor } from '@/components/group-editor';
import { PageHead, Panel, Pill, Btn, Field, inputCls } from '@/components/shell';
import { cn } from '@/lib/utils';

const MODES: TeachingMode[] = ['individual', 'one-to-one', 'group', 'mixed'];

/** General teaching setup (route /camp kept for compatibility). Starts blank; the Hanseo camp is only an optional, editable example. */
export default function Camp() {
  const camp = useApp((s) => s.camp);
  const allStudents = useApp((s) => s.students);
  const hasLegacy = useApp((s) => !!s.legacyCamp);
  const { toast } = useToast();
  const set = (p: Partial<TeachingConfig>) => setState((s) => ({ ...s, camp: { ...s.camp, ...p } }));
  const cohort = camp.cohort.trim();
  const scope = allStudents.filter((x) => x.stage === camp.target && (!cohort || (x.cohort ?? '').trim() === cohort));
  const perStudent = camp.kinds.length;
  const plannedStudents = camp.students;
  const cards = plannedStudents * perStudent;
  const sheets = campSheets(plannedStudents, perStudent);
  const teach = camp.sessions.filter((s) => !s.isBreak).reduce((a, s) => a + s.minutes, 0);
  const rest = camp.sessions.filter((s) => s.isBreak).reduce((a, s) => a + s.minutes, 0);
  const sessionTotal = teach + rest;
  const oneToOneOver = camp.mode === 'one-to-one' && (camp.students > 1 || scope.length > 1);
  const isBlank = JSON.stringify({ ...camp, grouping: null }) === JSON.stringify({ ...blankTeaching(camp.target), grouping: null });

  const loadExample = () => {
    if (!isBlank && !confirm(T('현재 운영 설정을 한서대 예시로 바꿀까요? 학생 명단·카드·결과·저장한 수업은 그대로 유지됩니다. 조 편성 기록도 유지됩니다.'))) return;
    setState((s) => ({ ...s, camp: { ...hanseoExample(), grouping: s.camp.grouping } }));
    toast({ title: T('한서대 예시를 불러왔습니다'), description: T('모든 값은 수정할 수 있는 예시입니다. 개인 미션 수업으로 시작합니다.') });
  };
  const startBlank = () => {
    if (!isBlank && !confirm(T('운영 설정만 빈 일반 설정으로 바꿀까요? 학생 명단·카드·결과·저장한 수업과 조 편성 기록은 지우지 않습니다.'))) return;
    setState((s) => ({ ...s, camp: { ...blankTeaching(s.camp.target), grouping: s.camp.grouping } }));
    toast({ title: T('빈 일반 설정으로 시작합니다') });
  };
  const setMode = (m: TeachingMode) => {
    if (m === 'one-to-one' && (camp.students > 1 || scope.length > 1)) toast({ title: T('1:1 지도는 교사 1명과 학생 1명입니다'), description: T('대상 학생이 2명 이상입니다. 데이터는 지우지 않으니 대상을 1명으로 맞추세요.'), variant: 'destructive' });
    set({ mode: m }); // grouping draft/confirmed stays stored even when hidden
  };
  const toggleKind = (i: number) => {
    const kinds = camp.kinds.includes(i) ? camp.kinds.filter((k) => k !== i) : [...camp.kinds, i].sort();
    set({ kinds, cardsPer: kinds.length });
  };
  const toggleTrack = (t: string) => set({ tracks: camp.tracks.includes(t) ? camp.tracks.filter((k) => k !== t) : [...camp.tracks, t] });
  const upSession = (id: string, p: Partial<SessionBlock>) => set({ sessions: camp.sessions.map((s) => (s.id === id ? { ...s, ...p } : s)) });
  const addSession = (isBreak: boolean) => set({ sessions: [...camp.sessions, { id: uid('ss'), title: isBreak ? T('휴식') : '', minutes: isBreak ? 10 : 50, isBreak }] });
  const moveSession = (i: number, d: number) => { const a = [...camp.sessions]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set({ sessions: a }); };

  const generate = () => {
    if (oneToOneOver) { toast({ title: T('1:1 지도 대상이 2명 이상입니다'), description: T('대상 학생을 1명으로 맞춘 뒤 생성하세요.'), variant: 'destructive' }); return; }
    const noJob = scope.filter((x) => !x.job).length;
    if (noJob && !confirm(T('개인 직무가 비어 있는 학생 {0}명이 있습니다. 이들의 카드는 "교사 확인 필요" 상태로 생성됩니다. 계속할까요?', noJob))) return;
    setState((st) => ({ ...st, cards: scope.reduce((all, u) => regenerateCards(all, st.students.find((x) => x.id === u.id) ?? u, st.camp.kinds), st.cards) }));
    toast({ title: T('카드 {0}장 생성·갱신', scope.length * perStudent), description: T('기존 카드는 같은 ID로 새 버전이 됩니다. 개인 직무 카드에서 확인·확정하세요.') });
  };
  const demo = () => {
    if (!confirm(T('대상 학생 중 개인 직무가 빈 학생에게만 선택한 예시 직무를 한 명씩 채울까요? 가상 데모이며 추천이 아닙니다. 채운 뒤 학생별로 검토하세요.'))) return;
    setState((st) => {
      const ids = new Set(scope.map((x) => x.id));
      const a = demoAssign(st.students.filter((x) => ids.has(x.id)), st.camp.tracks);
      return { ...st, students: st.students.map((x) => a.find((y) => y.id === x.id) ?? x) };
    });
  };

  return (
    <div>
      <PageHead kicker="Teaching setup · rules 1.1" title={T('수업 운영 설정')}>
        <Btn variant="outline" onClick={startBlank} data-testid="button-blank-setup"><FileX2 className="h-4 w-4" />{T('빈 일반 설정')}</Btn>
        <Btn variant="outline" onClick={loadExample} data-testid="button-load-hanseo"><BookMarked className="h-4 w-4" />{T('예시 불러오기: 한서대 캠프')}</Btn>
        <Btn variant="orange" onClick={() => window.print()} data-testid="button-print-camp"><Printer className="h-4 w-4" />{T('운영안 인쇄')}</Btn>
      </PageHead>

      <Panel className="mb-4 bg-accent/40">
        <div className="flex flex-wrap items-center gap-2">
          {camp.example === 'hanseo' ? <Pill tone="orange">{T('한서대 예시 사용 중 · 수정 가능 · 확정 아님')}</Pill> : <Pill tone="gray">{T('일반 설정 · 예시 없음')}</Pill>}
          <Pill>{T(MODE_LABELS[camp.mode])}</Pill>
          <Pill tone="gray">{T(STAGE_LABEL[camp.target])}</Pill>
        </div>
        <p className="mt-2 text-sm">{T('학생마다 자기 직무와 개인 미션을 수행합니다. 학과·전공·직무별로 반이나 조를 나누지 않습니다.')}{camp.example === 'hanseo' && <>{' '}{T('예시 직무(공항·항공사·보안·물류)는 개인 선택을 돕는 예시일 뿐 그룹 이름이나 필수 트랙이 아닙니다.')}</>}</p>
        {hasLegacy && <p className="mt-1 text-xs text-muted-foreground">{T('이전 버전 캠프 설정은 백업 데이터(legacyCamp)에 보관되어 있으며 현재 설정에 적용하지 않았습니다.')}</p>}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4 min-w-0">
          <Panel className="space-y-3">
            <h2 className="font-bold">{T('기본 정보')}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label={T('기관 (선택)')}><input className={inputCls} value={camp.institution} onChange={(e) => set({ institution: e.target.value })} data-testid="input-institution" /></Field>
              <Field label={T('코호트·반 이름 (명단 관리용, 선택)')}><input className={inputCls} value={camp.cohort} onChange={(e) => set({ cohort: e.target.value })} data-testid="input-cohort" /></Field>
              <Field label={T('대상 학교급')}><select className={inputCls} value={camp.target} onChange={(e) => set({ target: e.target.value as Stage })} data-testid="select-target">{STAGES.map((s) => <option key={s} value={s}>{T(STAGE_LABEL[s])}</option>)}</select></Field>
              <Field label={T('수업 형태')}><select className={inputCls} value={camp.mode} onChange={(e) => setMode(e.target.value as TeachingMode)} data-testid="select-mode">{MODES.map((m) => <option key={m} value={m}>{T(MODE_LABELS[m])}</option>)}</select></Field>
              <Field label={T('전공·학과 (선택)')}><input className={inputCls} value={camp.major} onChange={(e) => set({ major: e.target.value })} data-testid="input-major" /></Field>
              <Field label={T('관심 분야 (선택)')}><input className={inputCls} value={camp.interest} onChange={(e) => set({ interest: e.target.value })} data-testid="input-interest" /></Field>
            </div>
            <Field label={T('운영 목표')}><textarea className={inputCls} rows={2} value={camp.goal} onChange={(e) => set({ goal: e.target.value })} data-testid="input-setup-goal" /></Field>
            {oneToOneOver && <div className="flex gap-1.5 rounded-lg bg-destructive/10 p-2 text-xs text-destructive" data-testid="warn-one-to-one"><AlertTriangle className="h-4 w-4 shrink-0" />{T('1:1 지도는 교사 1명과 학생 1명입니다. 현재 계획 인원 {0}명, 대상 명단 {1}명입니다. 카드 생성이 막혀 있으며 기존 데이터는 지우지 않았습니다.', camp.students, scope.length)}</div>}
            {camp.mode === 'individual' && <p className="text-xs text-muted-foreground">{T('개별 수행 수업에는 조 편성이 없습니다. 이전에 만든 조 편성 기록은 숨겨진 채 보관됩니다.')}</p>}
          </Panel>

          <Panel>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold">{T('시간 구성')}</h2>
              <span className="font-mono text-sm text-muted-foreground" data-testid="text-session-total">{T('수업 {0} + 휴식 {1} = {2}분', teach, rest, sessionTotal)}</span>
              {camp.minutes > 0 && sessionTotal !== camp.minutes && <Pill tone="red">{T('목표 {0}분과 {1}분 차이', camp.minutes, sessionTotal - camp.minutes)}</Pill>}
              {camp.minutes > 0 && sessionTotal === camp.minutes && <Pill>{T('목표 시간과 일치')}</Pill>}
            </div>
            <div className="mt-2 max-w-[200px]"><Field label={T('목표 총 시간(분, 선택)')}><input type="number" min={0} className={inputCls} value={camp.minutes} onChange={(e) => set({ minutes: Math.max(0, Number(e.target.value) || 0) })} data-testid="input-setup-minutes" /></Field></div>
            {camp.sessions.length === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">{T('아직 시간 구성이 없습니다. 교시와 휴식을 직접 추가하거나 예시를 불러오세요.')}</div>
            ) : (
              <ol className="mt-3 space-y-1.5">
                {camp.sessions.map((s, i) => (
                  <li key={s.id} className={cn('flex flex-wrap items-center gap-2 rounded-lg border p-2', s.isBreak && 'border-dashed bg-muted/50')}>
                    {s.isBreak ? <Coffee className="h-4 w-4 text-muted-foreground" /> : <span className="font-mono text-xs w-6 text-primary">{camp.sessions.slice(0, i + 1).filter((x) => !x.isBreak).length}</span>}
                    <input className={cn(inputCls, 'flex-1 min-w-[160px] py-1.5')} value={s.title} placeholder={s.isBreak ? T('휴식') : T('교시 제목')} onChange={(e) => upSession(s.id, { title: e.target.value })} aria-label={T('교시 제목')} data-testid={`input-session-title-${i}`} />
                    <input type="number" min={1} className={cn(inputCls, 'w-20 py-1.5')} value={s.minutes} onChange={(e) => upSession(s.id, { minutes: Math.max(1, Number(e.target.value) || 1) })} aria-label={T('분')} data-testid={`input-session-minutes-${i}`} />
                    <span className="text-xs">{T('분')}</span>
                    <button type="button" onClick={() => moveSession(i, -1)} aria-label={T('위로')} className="text-muted-foreground"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" onClick={() => moveSession(i, 1)} aria-label={T('아래로')} className="text-muted-foreground"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" onClick={() => set({ sessions: camp.sessions.filter((x) => x.id !== s.id) })} aria-label={T('삭제')} className="text-muted-foreground hover:text-destructive" data-testid={`button-remove-session-${i}`}><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-2 flex gap-2">
              <Btn variant="outline" onClick={() => addSession(false)} data-testid="button-add-session"><Plus className="h-4 w-4" />{T('교시 추가')}</Btn>
              <Btn variant="ghost" onClick={() => addSession(true)} data-testid="button-add-break"><Coffee className="h-4 w-4" />{T('휴식 추가')}</Btn>
            </div>
          </Panel>

          {usesGroups(camp.mode) && (
            <GroupEditor students={scope} mode={camp.mode} value={camp.grouping} onChange={(g) => set({ grouping: g })} scopeLabel={T('대상 {0}명', scope.length)} />
          )}
        </div>

        <div className="space-y-4">
          <Panel>
            <h2 className="font-bold">{T('대상 명단')}</h2>
            <p className="mt-1 text-sm"><b className="font-mono" data-testid="text-scope-count">{scope.length}</b>{T('명')} · {T(STAGE_LABEL[camp.target])}{cohort ? ` · ${cohort}` : ''}</p>
            <p className="mt-1 text-xs text-muted-foreground">{T('카드 생성·예시 배정은 대상 학교급과 (입력한 경우) 코호트가 일치하는 학생에게만 적용됩니다. 다른 학생은 바꾸지 않습니다.')}</p>
            <Link href="/students" className="mt-2 inline-block text-sm font-semibold text-primary" data-testid="link-scope-students">{T('학생 명단에서 개인 직무 확인')}</Link>
          </Panel>
          <Panel>
            <h2 className="font-bold">{T('카드 종류 (학생당)')}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">{CARD_KINDS.map((k, i) => <label key={k} className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm has-[:checked]:border-primary has-[:checked]:bg-secondary"><input type="checkbox" checked={camp.kinds.includes(i)} onChange={() => toggleKind(i)} data-testid={`check-kind-${i}`} />{T(k)}</label>)}</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Field label={T('계획 학생 수')}><input type="number" min={0} className={inputCls} value={camp.students} onChange={(e) => set({ students: Math.max(0, Number(e.target.value) || 0) })} data-testid="input-camp-students" /></Field>
              <div className="text-sm"><span className="mb-1 block font-semibold text-muted-foreground">{T('학생당 카드')}</span><span className="font-mono text-lg font-bold">{perStudent}{T('장')}</span></div>
            </div>
            {scope.length > 0 && scope.length !== camp.students && <button type="button" className="mt-2 text-xs font-semibold text-primary" onClick={() => set({ students: scope.length })} data-testid="button-use-roster">{T('대상 명단 인원({0}명) 사용', scope.length)}</button>}
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><dt>{T('개인 맞춤 카드')}</dt><dd className="font-mono font-bold" data-testid="text-camp-cards">{cards}{T('장')}</dd></div>
              <div className="flex justify-between"><dt>{T('A4 용지 (A5 2장/A4)')}</dt><dd className="font-mono font-bold" data-testid="text-camp-sheets">{sheets}{T('매')}</dd></div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">{T('간이 계산은 기존 카드 기준입니다. 별도 활동지와 이어지는 카드 면을 포함한 실제 용지 수는 개인 자료의 인쇄 묶음에서 확인하세요.')}</p>
            <Btn className="mt-3 w-full" disabled={!scope.length || !perStudent || oneToOneOver} onClick={generate} data-testid="button-camp-generate">{T('대상 {0}명 카드 생성·갱신', scope.length)}</Btn>
            {!perStudent && <p className="mt-1 text-xs text-muted-foreground">{T('카드 종류를 하나 이상 고르세요.')}</p>}
            <Link href="/cards" className="mt-2 inline-block text-sm font-semibold text-primary" data-testid="link-camp-cards">{T('카드 확인')}</Link>
            <Link href={scope.length ? `/materials?ids=${scope.map((u) => u.id).join(',')}` : '/materials'} className="mt-2 ms-3 inline-block text-sm font-semibold text-primary" data-testid="link-camp-materials">{T('대상 {0}명 개인 활동지·플래너 카드 따로 만들기', scope.length)}</Link>
          </Panel>
          {camp.example === 'hanseo' && <Panel>
            <h2 className="font-bold">{T('개인 직무 예시 (선택)')}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{T('학생이 각자 고르는 직무의 예시 묶음입니다. 그룹 이름이나 필수 트랙이 아닙니다.')}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{Object.keys(CAMP_TRACKS).map((t) => <label key={t} className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm has-[:checked]:border-primary has-[:checked]:bg-secondary"><input type="checkbox" checked={camp.tracks.includes(t)} onChange={() => toggleTrack(t)} data-testid={`check-track-${t}`} />{T(t)}</label>)}</div>
            <Btn variant="outline" className="mt-3" disabled={!scope.length || !camp.tracks.length} onClick={demo} data-testid="button-camp-demo">{T('빈 개인 직무만 예시로 채우기(데모)')}</Btn>
          </Panel>}
        </div>
      </div>
    </div>
  );
}
