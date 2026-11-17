import { T } from '@/i18n/tx';
import { useRef, useState } from 'react';
import { Link } from 'wouter';
import { Plus, Wand2, Download, Upload, Trash2, Pencil, IdCard, X, Layers } from 'lucide-react';
import { useApp, setState, uid, now, exportJSON, importJSON, type Student } from '@/lib/store';
import { fictionalStudents, regenerateCards, findJobTask, demoAssign } from '@/lib/cards';
import { DOMAINS, DOMAIN_KO, JOB_FAMILIES, MAJOR_FAMILIES, supportPlan, GENERAL_SUPPORTS, reportVerified, type Level } from '@/lib/domain';
import { STAGES, STAGE_LABEL, type Stage } from '@/data/worksheets';
import { PageHead, Panel, Pill, Btn, Field, inputCls } from '@/components/shell';
import { useToast } from '@/hooks/use-toast';

const blank = (stage: Stage): Student => ({ id: uid('st'), code: '', stage, grade: '', major: '', family: '', job: '', task: '', report: { verified: false, testName: '', version: '', criteria: '', levels: {}, top5: [] }, supports: [], practiceGoals: [], prior: '', minutes: 50, teacherNote: '' });

export default function Students() {
  const { students, stage, cards, camp } = useApp((s) => s);
  const [edit, setEdit] = useState<Student | null>(null);
  const [genStage, setGenStage] = useState<Stage>(stage);
  const [genN, setGenN] = useState(0);
  const exampleOn = useApp((st) => st.camp.example === 'hanseo');
  const tracksOn = useApp((st) => st.camp.tracks);
  const fileRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [bFam, setBFam] = useState(''); const [bJob, setBJob] = useState(''); const [bTask, setBTask] = useState('');
  const applyBulk = () => {
    if (!picked.length || !bFam || !bJob) return;
    setState((st) => ({ ...st, students: st.students.map((x) => (picked.includes(x.id) ? { ...x, family: bFam, job: bJob, task: bTask || x.task } : x)) }));
    toast({ title: T("{0}명에게 직무 일괄 적용", picked.length), description: T("{0} / {1} · 교사가 선택한 값입니다.", bFam, bJob) });
  };
  const bulkCards = () => {
    if (!camp.kinds.length) return;
    const targets = students.filter((x) => picked.includes(x.id));
    setState((st) => ({ ...st, cards: targets.reduce((all, x) => regenerateCards(all, x, camp.kinds), st.cards) }));
    toast({ title: T("카드 초안 {0}장 생성", targets.length * camp.kinds.length), description: T("확정 전 미리보기에서 확인하세요.") });
  };
  const { toast } = useToast();

  const save = (s: Student) => {
    setState((st) => ({ ...st, students: st.students.some((x) => x.id === s.id) ? st.students.map((x) => (x.id === s.id ? s : x)) : [...st.students, s] }));
    setEdit(null); toast({ title: T("학생 정보를 브라우저에 저장했습니다"), description: s.code });
  };
  const genCards = (s: Student) => {
    if (!camp.kinds.length) return;
    const hasConfirmed = cards.some((c) => c.studentId === s.id && c.status === 'confirmed');
    if (hasConfirmed && !confirm(T("확정된 카드가 있습니다. 이전 원본과 버전을 보존하고 선택한 카드 종류를 다시 생성할까요?"))) return;
    setState((st) => ({ ...st, cards: regenerateCards(st.cards, s, camp.kinds) }));
    toast({ title: T("카드 초안 {0}장 생성", camp.kinds.length), description: T("미리보기에서 확인·수정 후 확정하세요.") });
  };

  return (
    <div>
      <PageHead kicker="Fictional roster only" title={T("가상 학생 명단")}>
        <Btn data-testid="button-add-student" onClick={() => setEdit(blank(stage))}><Plus className="h-4 w-4" />{T("학생 추가")}</Btn>
        <Btn variant="outline" data-testid="button-export" onClick={exportJSON}><Download className="h-4 w-4" />{T("백업 내보내기")}</Btn>
        <Btn variant="outline" data-testid="button-import" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />{T("가져오기")}</Btn>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { importJSON(await f.text()); toast({ title: T("백업을 가져왔습니다") }); } catch (err) { toast({ title: T("가져오기 실패"), description: String((err as Error).message), variant: 'destructive' }); } e.target.value = ''; }} />
      </PageHead>
      <Panel className="no-print mb-4 flex flex-wrap items-end gap-3 bg-accent/60">
        <div className="flex-1 min-w-[220px]"><div className="font-bold">{T("가상 학생 일괄 생성")}</div><p className="text-xs text-muted-foreground">{T("실제 학생 정보 입력 금지. 생성 시 빈 값(직무·결과지·경험)은 지어내지 않고 비워 둡니다.")}</p></div>
        <Field label={T("학교급")}><select className={inputCls} value={genStage} onChange={(e) => setGenStage(e.target.value as Stage)} data-testid="select-gen-stage">{STAGES.map((s) => <option key={s} value={s}>{T(STAGE_LABEL[s])}</option>)}</select></Field>
        <Field label={T("인원")}><input type="number" min={0} max={200} className={inputCls + ' w-24'} value={genN || ''} placeholder={T('인원 입력')} onChange={(e) => setGenN(Math.max(0, Math.min(200, Number(e.target.value) || 0)))} data-testid="input-gen-n" /></Field>
        <Btn variant="orange" disabled={genN < 1} data-testid="button-generate" onClick={() => { setState((st) => ({ ...st, students: [...st.students, ...fictionalStudents(genN, genStage, exampleOn ? 'hanseo' : 'general')] })); toast({ title: T("가상 학생 {0}명 생성", genN) }); }}><Wand2 className="h-4 w-4" />{T("생성")}</Btn>
        {students.length > 0 && <Btn variant="danger" data-testid="button-clear" onClick={() => confirm(T("모든 학생과 카드를 삭제할까요?")) && setState((st) => ({ ...st, students: [], cards: [], bundles: [] }))}>{T("전체 삭제")}</Btn>}
      </Panel>
      <Panel className="no-print mb-4">
        <b>{T("카드 종류 선택 (생성에 반영)")}</b>
        <div className="mt-2 flex flex-wrap gap-2">
          {['계획', '실행·점검', '경험·피드백', '전문가 질문·7일 실행'].map((kind, i) => (
            <label key={kind} className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm">
              <input type="checkbox" checked={camp.kinds.includes(i)} onChange={() => setState((st) => {
                const kinds = st.camp.kinds.includes(i) ? st.camp.kinds.filter((k) => k !== i) : [...st.camp.kinds, i].sort();
                return { ...st, camp: { ...st.camp, kinds, cardsPer: kinds.length } };
              })} data-testid={`check-student-card-kind-${i}`} />{T(kind)}
            </label>
          ))}
        </div>
      </Panel>

      {students.length > 0 && (
        <Panel className="no-print mb-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <b>{T("일괄 작업")}</b><span className="text-sm text-muted-foreground">{T("선택")}{' '}{picked.length}{T("명")}</span>
            <Btn variant="ghost" onClick={() => setPicked(students.map((x) => x.id))} data-testid="button-pick-all">{T("전체 선택")}</Btn>
            <Btn variant="ghost" onClick={() => setPicked(students.filter((x) => !x.job).map((x) => x.id))} data-testid="button-pick-nojob">{T("직무 미선택만")}</Btn>
            <Btn variant="ghost" onClick={() => setPicked([])} data-testid="button-pick-none">{T("해제")}</Btn>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Field label={T("직무 계열")}><select className={inputCls} value={bFam} onChange={(e) => { setBFam(e.target.value); setBJob(''); }} data-testid="select-bulk-family"><option value="">{T("선택")}</option>{Object.keys(JOB_FAMILIES).map((f) => <option key={f}>{f}</option>)}</select></Field>
            <Field label={T("직무")}><select className={inputCls} value={bJob} onChange={(e) => setBJob(e.target.value)} data-testid="select-bulk-job"><option value="">{T("선택")}</option>{(JOB_FAMILIES[bFam] ?? []).map((j) => <option key={j}>{j}</option>)}</select></Field>
            <Field label={T("과제/역할(선택)")}><input className={inputCls} value={bTask} onChange={(e) => setBTask(e.target.value)} data-testid="input-bulk-task" /></Field>
            <Btn disabled={!picked.length || !bJob} onClick={applyBulk} data-testid="button-bulk-apply">{T("선택 학생에 적용")}</Btn>
            <Btn variant="outline" disabled={!picked.length || !camp.kinds.length} onClick={bulkCards} data-testid="button-bulk-cards"><IdCard className="h-4 w-4" />{T("선택 학생 카드 생성")}</Btn>
          </div>
          {exampleOn && <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2 text-sm" data-testid="panel-example-demo">
            <span className="flex-1 min-w-[220px]">{T("한서대 예시 사용 중: 직무가 비어 있는 선택 학생에게 선택한 개인 직무 예시({0})를 한 명씩 채웁니다. 가상 데모이며 진로 추천이 아닙니다.", tracksOn.map((x) => T(x)).join(', '))}</span>
            <Btn variant="orange" disabled={!picked.length} onClick={() => { if (!confirm(T("선택 학생 중 직무가 빈 학생에게 데모 직무를 순서대로 배정할까요? (추천 아님)"))) return; setState((st) => { const sel = st.students.filter((x) => picked.includes(x.id)); const assigned = demoAssign(sel, st.camp.tracks); return { ...st, students: st.students.map((x) => assigned.find((a) => a.id === x.id) ?? x) }; }); toast({ title: T("데모 배정 완료"), description: T("학생 메모에 [데모 배정] 표시가 남습니다.") }); }} data-testid="button-demo-assign">{T("데모 샘플 배정")}</Btn>
          </div>}
        </Panel>
      )}
      {students.length === 0 ? (
        <Panel className="py-14 text-center"><div className="mx-auto mb-3 h-12 w-12 rounded-full border-4 border-dashed border-primary/40" /><p className="font-semibold">{T("명단이 비어 있습니다")}</p><p className="text-sm text-muted-foreground">{T("학생을 추가하거나 가상 학생을 생성하세요.")}</p></Panel>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-start text-xs text-muted-foreground"><tr>{['', '코드', '소속반', '학교급', '전공', '직무 계열 / 직무 / 과제', '결과지', '카드', ''].map((h, i) => <th key={i} className="px-3 py-2 text-start font-semibold whitespace-nowrap">{T(h)}</th>)}</tr></thead>
            <tbody>
              {students.map((s) => {
                const sc = cards.filter((c) => c.studentId === s.id && !c.archived);
                const jt = s.job ? findJobTask(s.stage, s.family, s.job) : undefined;
                return (
                  <tr key={s.id} className="border-t hover:bg-muted/40" data-testid={`row-student-${s.id}`}>
                    <td className="px-3 py-2"><input type="checkbox" checked={picked.includes(s.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, s.id] : p.filter((x) => x !== s.id)))} data-testid={`check-student-${s.id}`} /></td>
                    <td className="px-3 py-2 font-mono">{s.code || '-'}</td>
                    <td className="px-3 py-2">{s.cohort || '—'}</td>
                    <td className="px-3 py-2">{T(STAGE_LABEL[s.stage])} {s.grade}</td>
                    <td className="px-3 py-2">{s.major || <span className="text-muted-foreground">{T("미입력")}</span>}</td>
                    <td className="px-3 py-2">{s.job ? <>{s.family} / {s.job}{s.task && ` / ${s.task}`} {!jt && <Pill tone="red">{T("과제 미등록")}</Pill>}</> : <span className="text-muted-foreground">{T("학생 선택 전")}</span>}</td>
                    <td className="px-3 py-2">{reportVerified(s.report) ? <Pill>{T("확인됨")}</Pill> : <Pill tone="gray">{T("미확인")}</Pill>}</td>
                    <td className="px-3 py-2 font-mono">{sc.length ? `${sc.filter((c) => c.status === 'confirmed').length}/${sc.length}` : '-'}</td>
                    <td className="px-3 py-2"><div className="flex gap-1 justify-end">
                      <Btn variant="ghost" data-testid={`button-edit-${s.id}`} onClick={() => setEdit(structuredClone(s))}><Pencil className="h-4 w-4" /></Btn>
                      <Link href={`/materials?ids=${s.id}`} title={T("개인 활동지·플래너 카드 만들기")} data-testid={`link-materials-${s.id}`} className="inline-flex items-center rounded-lg px-2 py-2 text-primary hover:bg-muted"><Layers className="h-4 w-4" /></Link>
                      <Btn variant="ghost" disabled={!camp.kinds.length} data-testid={`button-cards-${s.id}`} onClick={() => genCards(s)} title={T("이전 방식 직무 카드 초안 생성")}><IdCard className="h-4 w-4" /></Btn>
                      <Btn variant="ghost" data-testid={`button-delete-${s.id}`} onClick={() => confirm(T("삭제할까요?")) && setState((st) => ({ ...st, students: st.students.filter((x) => x.id !== s.id), cards: st.cards.filter((c) => c.studentId !== s.id) }))}><Trash2 className="h-4 w-4 text-destructive" /></Btn>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {students.length > 0 && <div className="mt-3 flex flex-wrap justify-end gap-4"><Link href={picked.length ? `/materials?ids=${students.filter((x) => picked.includes(x.id)).map((x) => x.id).join(',')}` : '/materials?all=1'} className="text-sm font-semibold text-primary" data-testid="link-materials-scope">{picked.length ? T("선택한 {0}명 개인 활동지·플래너 카드 만들기", picked.length) : T("전체 명단 개인 활동지·플래너 카드 만들기")}</Link><Link href="/cards" className="text-sm font-semibold text-primary" data-testid="link-cards">{T("이전 직무 카드 보기")}</Link></div>}
      {edit && <StudentEditor s={edit} onClose={() => setEdit(null)} onSave={save} />}
    </div>
  );
}

function StudentEditor({ s: init, onClose, onSave }: { s: Student; onClose: () => void; onSave: (s: Student) => void }) {
  const [s, setS] = useState<Student>(init);
  const [exp, setExp] = useState(''); const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const allExp = useApp((st) => st.experiences);
  const experiences = allExp.filter((e) => e.studentId === init.id);
  const up = (p: Partial<Student>) => setS((x) => ({ ...x, ...p }));
  const upR = (p: Partial<Student['report']>) => setS((x) => ({ ...x, report: { ...x.report, ...p } }));
  const plan = supportPlan(s.stage, s.report);
  const suggestedFam = MAJOR_FAMILIES[s.major] ?? [];
  const allFam = Object.keys(JOB_FAMILIES);
  const jobs = JOB_FAMILIES[s.family] ?? [];
  const jt = s.job ? findJobTask(s.stage, s.family, s.job) : undefined;
  const supportOptions = Array.from(new Set([...plan.supports, ...GENERAL_SUPPORTS]));
  const toggle = (arr: string[], v: string, max?: number) => (arr.includes(v) ? arr.filter((x) => x !== v) : max && arr.length >= max ? arr : [...arr, v]);
  const top5 = s.report.top5.length ? s.report.top5 : [];

  return (
    <div className="no-print fixed inset-0 z-50 flex justify-end" role="dialog">
      <div className="absolute inset-0 bg-sidebar/50" onClick={onClose} />
      <div className="relative h-full w-full max-w-2xl overflow-y-auto bg-background p-5 shadow-2xl rise">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold">{T("가상 학생 편집")}</h2><button onClick={onClose} data-testid="button-close-editor"><X /></button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label={T("학생 코드(가상)")}><input className={inputCls} value={s.code} onChange={(e) => up({ code: e.target.value })} data-testid="input-code" /></Field>
          <Field label={T("학교급(명시 선택, 나이와 무관)")}><select className={inputCls} value={s.stage} onChange={(e) => up({ stage: e.target.value as Stage })} data-testid="select-stage">{STAGES.map((x) => <option key={x} value={x}>{T(STAGE_LABEL[x])}</option>)}</select></Field>
          <Field label={T("학년")}><input className={inputCls} value={s.grade} onChange={(e) => up({ grade: e.target.value })} data-testid="input-grade" /></Field>
          <Field label={T("표시 이름 (선택 · 교사가 고를 때만 인쇄)")}><input className={inputCls} value={s.displayName ?? ''} onChange={(e) => up({ displayName: e.target.value })} data-testid="input-student-display-name" /></Field>
          <Field label={T("코호트·반 (명단 관리용, 선택)")}><input className={inputCls} value={s.cohort ?? ''} onChange={(e) => up({ cohort: e.target.value })} data-testid="input-student-cohort" /></Field>
          <Field label={T("전공/관심 계열")}><input className={inputCls} list="majors" value={s.major} onChange={(e) => up({ major: e.target.value })} data-testid="input-major" /><datalist id="majors">{Object.keys(MAJOR_FAMILIES).map((m) => <option key={m} value={m} />)}</datalist></Field>
        </div>
        <Panel className="mt-4">
          <h3 className="font-bold">{T("직무 선택 — 학생이 고릅니다")}</h3>
          <p className="text-xs text-muted-foreground">{T("전공은 여러 계열로 이어질 수 있습니다. 강조 표시는 예시일 뿐 강제 연결이 아닙니다.")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{allFam.map((f) => <button key={f} onClick={() => up({ family: f, job: '' })} data-testid={`button-family-${f}`} className={`rounded-full border px-3 py-1 text-xs font-semibold ${s.family === f ? 'bg-primary text-primary-foreground border-primary' : suggestedFam.includes(f) ? 'border-[hsl(var(--sidebar-primary))]' : ''}`}>{f}</button>)}</div>
          {s.family && <div className="mt-2 flex flex-wrap gap-1.5">{jobs.map((j) => <button key={j} onClick={() => up({ job: j })} data-testid={`button-job-${j}`} className={`rounded-lg border px-3 py-1 text-sm ${s.job === j ? 'bg-sidebar text-white' : ''}`}>{j}</button>)}</div>}
          <div className="mt-2"><Field label={T("맡을 과제/역할(선택)")}><input className={inputCls} value={s.task} onChange={(e) => up({ task: e.target.value })} data-testid="input-task" /></Field></div>
          {s.job && (jt ? <p className="mt-2 text-xs text-primary">{T("직무 과제 연결됨:")}{' '}{jt.goal}</p> : <p className="mt-2 text-xs text-destructive">{T("이 조합에 등록된 직무 과제가 없습니다. 추천을 지어내지 않으며, 카드는 교사 확인이 필요합니다.")}</p>)}
        </Panel>
        <Panel className="mt-4">
          <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={s.report.verified} onChange={(e) => upR({ verified: e.target.checked })} data-testid="check-verified" />{T("결과지 확인함(검사명·버전·기준 대조)")}</label>
          <p className="text-xs text-muted-foreground">{T("결과지가 없으면 자기 진술로 임시 진행하며 검사 결과로 다루지 않습니다.")}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <Field label={T("검사명")}><input className={inputCls} value={s.report.testName} onChange={(e) => upR({ testName: e.target.value })} data-testid="input-test" /></Field>
            <Field label={T("버전")}><input className={inputCls} value={s.report.version} onChange={(e) => upR({ version: e.target.value })} data-testid="input-version" /></Field>
            <Field label={T("수준 기준")}><input className={inputCls} value={s.report.criteria} onChange={(e) => upR({ criteria: e.target.value })} data-testid="input-criteria" /></Field>
          </div>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DOMAINS.map((d) => (
              <Field key={d} label={T(DOMAIN_KO[d])}><select className={inputCls} disabled={!reportVerified(s.report)} value={s.report.levels[d] ?? ''} onChange={(e) => upR({ levels: { ...s.report.levels, [d]: (e.target.value || undefined) as Level | undefined } })} data-testid={`select-level-${d}`}><option value="">{T("미입력")}</option><option value="H">H</option><option value="M">M</option><option value="L">L</option></select></Field>
            ))}
          </div>
          {s.stage === 'university' && (
            <div className="mt-3">
              <div className="text-sm font-semibold">{T("TOP5 (결과지 원순서·사유 그대로, 재점수화 없음)")}</div>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="mt-1 grid grid-cols-[24px_1fr_2fr] gap-2 items-center">
                  <span className="font-mono text-sm">{i + 1}</span>
                  <input className={inputCls} placeholder={T("직무")} value={top5[i]?.title ?? ''} onChange={(e) => { const t = [...top5]; while (t.length <= i) t.push({ title: '', reason: '' }); t[i] = { ...t[i], title: e.target.value }; upR({ top5: t }); }} data-testid={`input-top5-${i}`} />
                  <input className={inputCls} placeholder={T("원문 사유")} value={top5[i]?.reason ?? ''} onChange={(e) => { const t = [...top5]; while (t.length <= i) t.push({ title: '', reason: '' }); t[i] = { ...t[i], reason: e.target.value }; upR({ top5: t }); }} />
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel className="mt-4">
          <h3 className="font-bold">{T("지원 선택 (교사 패널 · 인쇄되지 않는 근거)")}</h3>
          <p className="text-xs text-muted-foreground">{T(plan.note)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{supportOptions.map((o) => <button key={o} onClick={() => up({ supports: toggle(s.supports, o) })} className={`rounded-lg border px-2.5 py-1 text-xs text-start ${s.supports.includes(o) ? 'bg-secondary border-primary' : ''}`} data-testid="button-support">{T(o)}</button>)}</div>
          <div className="mt-3 text-sm font-semibold">{T("의식적 연습 목표 (최대 2개)")}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">{['계획 먼저 세우기', '중간 점검하기', '전체 그림 먼저 보기', '단계 순서 지키기', '질문하기', '다른 방법 시도'].map((g) => <button key={g} onClick={() => up({ practiceGoals: toggle(s.practiceGoals, g, 2) })} className={`rounded-full border px-2.5 py-1 text-xs ${s.practiceGoals.includes(g) ? 'bg-accent border-[hsl(var(--sidebar-primary))]' : ''}`} data-testid="button-practice">{T(g)}</button>)}</div>
        </Panel>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px]">
          <Field label={T("이전 경험·수행 근거")}><textarea className={inputCls} rows={2} value={s.prior} onChange={(e) => up({ prior: e.target.value })} data-testid="input-prior" /></Field>
          <Field label={T("시간(분)")}><input type="number" className={inputCls} value={s.minutes} onChange={(e) => up({ minutes: Number(e.target.value) || 50 })} data-testid="input-minutes" /></Field>
        </div>
        <Field label={T("교사 메모(인쇄 안 됨)")}><textarea className={inputCls} rows={2} value={s.teacherNote} onChange={(e) => up({ teacherNote: e.target.value })} data-testid="input-teacher-note" /></Field>
        {init.code && (
          <Panel className="mt-4">
            <h3 className="font-bold">{T("주간·월간 경험 기록")}</h3>
            <p className="text-xs text-muted-foreground">{T("학생이 확인한 이야기만 확정 표시합니다. 계획을 완료로 자동 표시하지 않습니다.")}</p>
            <div className="mt-2 flex gap-2"><select className={inputCls + ' w-28'} value={period} onChange={(e) => setPeriod(e.target.value as 'weekly' | 'monthly')}><option value="weekly">{T("주간")}</option><option value="monthly">{T("월간")}</option></select><input className={inputCls} value={exp} onChange={(e) => setExp(e.target.value)} placeholder={T("실제로 한 경험")} data-testid="input-exp" /><Btn onClick={() => { if (!exp.trim()) return; setState((st) => ({ ...st, experiences: [...st.experiences, { id: uid('ex'), studentId: init.id, period, text: exp.trim(), confirmedByStudent: false, at: now() }] })); setExp(''); }} data-testid="button-add-exp">{T("추가")}</Btn></div>
            <ul className="mt-2 space-y-1 text-sm">{experiences.map((e) => <li key={e.id} className="flex items-center gap-2"><Pill tone="gray">{e.period === 'weekly' ? T("주간") : T("월간")}</Pill><span className="flex-1">{e.text}</span><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={e.confirmedByStudent} onChange={(ev) => setState((st) => ({ ...st, experiences: st.experiences.map((x) => (x.id === e.id ? { ...x, confirmedByStudent: ev.target.checked } : x)) }))} />{T("학생 확인")}</label></li>)}</ul>
          </Panel>
        )}
        <div className="sticky bottom-0 mt-5 flex gap-2 bg-background py-3"><Btn onClick={() => onSave(s)} data-testid="button-save-student">{T("저장")}</Btn><Btn variant="ghost" onClick={onClose}>{T("취소")}</Btn></div>
      </div>
    </div>
  );
}
