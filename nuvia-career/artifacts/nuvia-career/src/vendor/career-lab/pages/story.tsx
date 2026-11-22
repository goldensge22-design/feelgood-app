import { useState } from 'react';
import { Plus, Trash2, Copy, Printer, Download, History, RotateCcw, ArrowUp, ArrowDown, Save } from 'lucide-react';
import { useLab } from '@/vendor/career-lab/lib/store';
import { reflectionTitle } from '@/vendor/career-lab/lib/activity-assistance';
import { now, uid, gradeLabel, type StoryParagraph } from '@/vendor/career-lab/lib/types';
import { evidenceOptions, latestRecordAt, strengthsOf } from '@/vendor/career-lab/lib/links';
import { majorById } from '@/vendor/career-lab/lib/catalog';
import { exampleStoryTemplate } from '@/vendor/career-lab/lib/story-template';
import { canonicalLocale, useLocale } from '@/vendor/career-lab/lib/locale';
import { APPROVED_LANGUAGES, isAppLanguage } from '@/vendor/career-lab/lib/languages';
import { tx, localizeValue, getOriginalTexts, formatMessage } from '@/vendor/career-lab/lib/i18n-runtime';
import { programById } from '@/vendor/career-lab/lib/universities';
import { PageHeader, Panel, Empty, Tag, TextIn, TextArea, Confirm } from '@/vendor/career-lab/components/lab/ui';
import { ActivitySupport } from '@/vendor/career-lab/components/lab/activity-support';
import { AiPanel } from '@/vendor/career-lab/components/lab/ai-panel';
import { Button } from '@/vendor/career-lab/components/ui/button';
import { useToast } from '@/vendor/career-lab/hooks/use-toast';

const SECTIONS = ['나의 특징', '관심 계기', '탐색한 이유', '실제 경험과 배움', '학과에 관심 갖는 이유', '앞으로의 계획'];
const toText = (ps: StoryParagraph[]) => ps.map(p => (p.heading ? `[${String(localizeValue(p.heading))}]\n` : '') + String(localizeValue(p.text))).join('\n\n');

export default function Story() {
  const { state: s, update, mode } = useLab();
  const { requestedLocale, effectiveLocale, formatDateTime, formatNumber } = useLocale();
  const [languageDraft, setLanguageDraft] = useState(s.story.writingLanguage || 'ko');
  const [languageError, setLanguageError] = useState('');
  const { toast } = useToast();
  const [showVer, setShowVer] = useState(false);
  const opts = evidenceOptions(s);
  const ps = s.story.paragraphs;
  const exportText = (paragraphs: StoryParagraph[], language = s.story.writingLanguage || 'ko') => `${tx(mode === 'demo' ? '[예시 체험 자기소개서 — AI 생성 결과가 아닌 편집용 예시 기록]\n\n' : '[서버 연결 전 임시 작성 초안 — 기존 서버 저장·현재 AI 생성 실행 안 함]\n\n')}${tx('화면 언어')}: ${effectiveLocale}\n${tx('자기소개서 작성 언어')}: ${language}\n${tx('기존 글은 자동 번역하지 않아요.')}\n\n${toText(paragraphs)}`;
  const setP = (fn: (p: StoryParagraph[]) => void) => update(d => {
    fn(d.story.paragraphs);
    d.story.paragraphs.forEach(p => {
      const old = s.story.paragraphs.find(x => x.id === p.id);
      if (old && p.text !== old.text) { p.origin = 'manual'; delete p.displayParts; }
    });
  });
  const latest = latestRecordAt(s);
  const stale = ps.length > 0 && s.story.basedAt && latest > s.story.basedAt;
  const cited = new Set(ps.flatMap(p => p.evidence));
  const newRecords = s.reflections.filter(r => r.updatedAt > (s.story.basedAt || '') );
  const uncited = opts.filter(o => !cited.has(o.id) && (o.group === '경험 기록' || o.group === '강점'));

  const snapshot = (label: string) => update(d => { d.story.versions.unshift({ id: uid(), createdAt: now(), label, paragraphs: structuredClone(d.story.paragraphs), writingLanguage: d.story.writingLanguage || 'ko' }); d.story.basedAt = now(); });
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); toast({ title: '복사했어요' }); } catch { toast({ title: '복사하지 못했어요', description: '텍스트를 직접 선택해 복사해 주세요.', variant: 'destructive' }); } };
  const download = (t: string) => { const b = new Blob([t], { type: 'text/plain;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = formatMessage('나의이야기_{0}.txt', [new Date().toISOString().slice(0, 10)]); a.click(); URL.revokeObjectURL(a.href); };
  const facts = () => ({
    writingLanguage: s.story.writingLanguage || 'ko',
    screenLanguage: effectiveLocale,
    languagePolicy: '작성 요청 언어로 학생의 연령 수준에 맞게 작성. 원본 사실과 미래 계획을 구분. 기존 원문을 번역으로 덮어쓰지 않음. 확인되지 않은 대학 재학·수강·성과를 만들지 않음.',
    selectedProgramExplorationNotEnrollment: s.tempProgram ? programById(s, s.tempProgram) : null,
    grade: gradeLabel[s.grade],
    strengths: strengthsOf(s).map(x => ({ ref: `str:${x.id}`, text: x.text, source: x.kind === 'test' ? '검사 결과' : '자기 진술', studentFeels: x.fit })),
    interests: s.interests.map(i => ({ ref: `int:${i.id}`, text: i.text, reason: i.reason })), statement: s.statement,
    majors: s.savedMajors.map(m => majorById(m)?.name), tempMajor: majorById(s.tempMajor)?.name ?? '전공 미정',
    design: { connection: s.design.connection, jobs: s.design.jobs.map(j => j.title), futurePath: s.design.futurePath },
    experiences: s.reflections.map(r => ({ ref: `ref:${r.id}`, title: r.title, did: r.did, role: r.role, learned: r.learned, question: r.question, direction: r.direction })),
    plans_future_only: s.activities.filter(a => a.status !== 'done').map(a => ({ ref: `act:${a.id}`, title: a.title })),
    currentDraft: toText(ps),
  });

  return (
    <div>
      <PageHeader step="STEP 09 · AI 자기소개서" title="나의 이야기" desc="AI 자기소개서 — 지도에 쌓인 실제 기록으로 쓰는 자기소개서. 문단마다 근거가 된 내 기록을 표시해요. 없는 활동이나 성과는 쓰지 않아요.">
        <Button className="no-print" variant="outline" onClick={() => setShowVer(!showVer)} data-testid="button-versions"><History className="h-4 w-4" />버전 {s.story.versions.length}</Button>
        <Button className="no-print" onClick={() => { snapshot(`버전 ${s.story.versions.length + 1}`); toast({ title: '현재 내용을 버전으로 저장했어요' }); }} disabled={!ps.length} data-testid="button-save-version"><Save className="h-4 w-4" />버전 저장</Button>
      </PageHeader>
      <ActivitySupport id="story-support" value={s.story.support} onChange={support=>update(d=>{d.story.support=support;})} context={{interests:s.interests.map(x=>x.text),strengths:s.tests.flatMap(x=>x.strengths).filter(x=>x.fit==='similar'||x.fit==='partial').map(x=>x.text)}} />
      <Panel className="no-print mb-6" title="자기소개서 작성 언어" hint="화면 언어·대학 자료 원문·실제 수업 언어와 별개예요. 이 선택은 기존 글을 번역하거나 덮어쓰지 않아요.">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 text-sm">작성 언어
            <select value={languageDraft} onChange={e => setLanguageDraft(e.target.value)} className="block min-h-[44px] w-full rounded-lg border bg-background px-3" data-testid="input-story-language">
              {!isAppLanguage(languageDraft) && <option value={languageDraft}>{languageDraft} (이전 요청 원문)</option>}
              {APPROVED_LANGUAGES.map(l => <option key={l.code} value={l.code} lang={l.code} data-i18n-original={l.name}>{l.name}</option>)}
            </select>
          </label>
          <Button variant="outline" data-testid="button-story-language" onClick={() => {
            const lang = canonicalLocale(languageDraft);
            if (!lang || !isAppLanguage(lang)) { setLanguageError('확정된 15개 언어 중에서 골라 주세요. 기존 요청 원문과 글은 보존돼요.'); return; }
            update(d => { d.story.writingLanguage = lang; }); setLanguageDraft(lang); setLanguageError('');
          }}>작성 언어 요청 저장</Button>
        </div>
        <p className="mt-3 text-sm" data-testid="text-story-language">작성 요청: <bdi>{s.story.writingLanguage || 'ko'}</bdi> · 실제 다국어 AI 생성·번역은 기존 서버 연결 후 사용할 수 있어요. 학생이 직접 쓴 글은 자동으로 바꾸지 않아요.</p>
        {languageError && <p role="alert" className="text-sm text-destructive">{languageError}</p>}
      </Panel>
      <p className="hidden print:block mb-4">{mode === 'demo' ? '[예시 체험 자기소개서 — AI 생성 결과가 아닌 편집용 예시 기록]\n\n' : '[서버 연결 전 임시 작성 초안 — 기존 서버 저장·현재 AI 생성 실행 안 함]\n\n'}</p>
      <Panel tone="teal" className="no-print mb-6" title={mode === 'demo' ? '예시 자기소개서 · 실제 AI 생성 결과가 아니에요' : '연결 전 임시 작성 초안'} hint={mode === 'demo' ? '가상의 예시 학생 기록을 인용한 편집용 글이에요. 직접 고치고 문단별 근거를 확인한 뒤 예시 버전으로 저장해 보세요.' : '기존 서버의 AI·학생 계정 연결을 기다리고 있어요. 지금 쓰는 글은 이 브라우저에만 임시로 보관되며, 서버에 전송되거나 저장되지 않아요.'}>
        {mode === 'demo' && <Confirm destructive={false} confirmLabel="예시 문단 추가" title="현재 예시 기록으로 편집 틀을 추가할까요?" desc="AI 생성이 아니라 현재 예시 입력을 그대로 인용한 편집 틀이에요. 기존 문단은 덮어쓰지 않아요." onConfirm={() => update(d => { d.story.paragraphs.push(...exampleStoryTemplate(d, getOriginalTexts())); d.story.basedAt = now(); })} trigger={open => <Button size="sm" variant="outline" onClick={open} data-testid="button-example-outline">현재 예시 기록으로 문단 틀 추가</Button>} />}
      </Panel>

      {stale && (
        <Panel tone="coral" className="no-print mb-6" title="반영할 만한 새 기록이 있어요" hint="마지막 버전 저장 이후 기록이 바뀌었어요. 자동으로 고치지 않아요 — 원하면 문단에 근거로 연결하거나 직접 고쳐 쓰세요.">
          <div className="flex flex-wrap gap-2">{(newRecords.length ? newRecords.map(r => ({ id: `ref:${r.id}`, label: reflectionTitle(r,s.activities) })) : uncited).slice(0, 8).map(o => <Tag key={o.id} tone="coral" className="bg-card">{o.label}</Tag>)}</div>
          <button className="mt-3 text-sm underline" onClick={() => update(d => { d.story.basedAt = now(); })}>확인했어요 (알림 닫기)</button>
        </Panel>
      )}

      {showVer && (
        <Panel className="no-print mb-6" title="저장된 버전" hint="저장된 버전은 바뀌지 않아요. 복원하면 현재 초안이 그 버전으로 바뀌며, 현재 초안은 먼저 자동 보관돼요.">
          {s.story.versions.length === 0 ? <p className="text-sm text-muted-foreground">아직 저장한 버전이 없어요.</p> : (
            <ul className="divide-y">{s.story.versions.map(v => (
              <li key={v.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                <span className="font-semibold">{v.label}</span><span className="text-xs text-muted-foreground">{formatDateTime(v.createdAt)} · {formatNumber(v.paragraphs.length)}문단 · 작성 요청 <bdi>{v.writingLanguage || 'ko'}</bdi></span>
                <span className="ml-auto flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => copy(exportText(v.paragraphs, v.writingLanguage || 'ko'))}><Copy className="h-4 w-4" />복사</Button>
                  <Button size="sm" variant="ghost" onClick={() => download(exportText(v.paragraphs, v.writingLanguage || 'ko'))}><Download className="h-4 w-4" />내려받기</Button>
                  <Confirm destructive={false} confirmLabel="복원" title="이 버전으로 복원할까요?" desc="현재 초안은 ‘복원 전 자동 보관’ 버전으로 먼저 저장돼요. 글만 복원하고 현재 작성 언어 요청은 유지해요." onConfirm={() => update(d => { if (d.story.paragraphs.length) d.story.versions.unshift({ id: uid(), createdAt: now(), label: '복원 전 자동 보관', paragraphs: structuredClone(d.story.paragraphs), writingLanguage: d.story.writingLanguage || 'ko' }); d.story.paragraphs = structuredClone(v.paragraphs); })}
                    trigger={o => <Button size="sm" variant="outline" onClick={o} data-testid={`button-restore-${v.id}`}><RotateCcw className="h-4 w-4" />복원</Button>} />
                </span>
              </li>
            ))}</ul>
          )}
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)]">
        <div className="space-y-4">
          {ps.length === 0 ? <Empty title="아직 초안이 없어요" desc="기존 서버 AI는 연결 대기 중이에요. 문단 틀을 만들고 직접 작성할 수 있어요. 어떤 경험을 했고 무엇을 배웠는지 짧게 적어 보세요." action={<Button onClick={() => update(d => { SECTIONS.forEach(h => d.story.paragraphs.push({ id: uid(), heading: h, text: '', evidence: [], origin: 'manual' })); d.story.basedAt = now(); })} data-testid="button-scaffold">문단 틀 만들기</Button>} /> :
            ps.map((p, i) => (
              <article key={p.id} className="rise rounded-2xl border bg-card p-5" data-testid={`paragraph-${p.id}`}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                  <TextIn value={p.heading} onChange={e => setP(x => { x[i].heading = e.target.value; x[i].headingAuthored = true; })} placeholder="문단 주제" className="no-print border-transparent bg-transparent px-1 font-semibold" />
                  <span className="no-print flex">
                    <button disabled={i === 0} onClick={() => setP(x => { [x[i - 1], x[i]] = [x[i], x[i - 1]]; })} aria-label="위로" className="p-1.5 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                    <button disabled={i === ps.length - 1} onClick={() => setP(x => { [x[i + 1], x[i]] = [x[i], x[i + 1]]; })} aria-label="아래로" className="p-1.5 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                    <Confirm title="문단을 삭제할까요?" desc="저장한 버전에는 남아 있어요." onConfirm={() => setP(x => { x.splice(i, 1); })} trigger={o => <button onClick={o} aria-label="문단 삭제" className="p-1.5 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>} />
                  </span>
                </div>
                <TextArea rows={5} value={p.text} onChange={e => setP(x => { x[i].text = e.target.value; })} className="no-print font-display mt-2 border-transparent bg-background/40 text-[16px] leading-loose" placeholder="학생다운 말로 직접 써 보세요. 계획은 ‘~해 보고 싶다’처럼 미래형으로." data-testid={`input-paragraph-${i}`} />
                <div className="hidden print:block whitespace-pre-wrap" data-testid={`print-paragraph-${i}`}><h2 className="font-semibold">{p.heading}</h2><p>{p.text}</p></div>
                <div className="mt-3">
                  <p className="text-xs font-semibold text-muted-foreground">근거가 된 내 기록 {p.evidence.length === 0 && <span className="text-coral">— 아직 없음</span>}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {p.evidence.map(e => { const o = opts.find(x => x.id === e); return <span key={e}><button data-testid={`citation-${p.id}-${e}`} onClick={() => setP(x => { x[i].evidence = x[i].evidence.filter(y => y !== e); })} className="no-print"><Tag tone={o ? 'teal' : 'muted'}>{o ? `${o.group}: ${o.label}` : '근거 재확인 필요'} ×</Tag></button><span className="hidden print:inline text-xs">{o ? `${o.group}: ${o.label}` : '근거 재확인 필요'}; </span></span>; })}
                    <select className="no-print rounded-full border bg-background px-2 py-0.5 text-xs" value="" onChange={e => { const v = e.target.value; if (v) setP(x => { if (!x[i].evidence.includes(v)) x[i].evidence.push(v); }); }} aria-label="근거 추가" data-testid={`select-evidence-${i}`}>
                      <option value="">+ 근거 연결</option>{opts.filter(o => !p.evidence.includes(o.id)).map(o => <option key={o.id} value={o.id}>{o.group} · {o.label}</option>)}
                    </select>
                  </div>
                </div>
              </article>
            ))}
          {ps.length > 0 && <Button variant="outline" className="no-print w-full border-dashed" onClick={() => setP(p => { p.push({ id: uid(), heading: '', text: '', evidence: [] }); })} data-testid="button-add-paragraph"><Plus className="h-4 w-4" />문단 추가</Button>}
        </div>

        <aside className="no-print space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Panel title="내보내기" hint="공유는 내가 직접 할 때만 일어나요.">
            <div className="grid gap-2">
              <Button variant="outline" disabled={!ps.length} onClick={() => copy(exportText(ps))} data-testid="button-copy"><Copy className="h-4 w-4" />복사</Button>
              <Button variant="outline" disabled={!ps.length} onClick={() => window.print()} data-testid="button-print"><Printer className="h-4 w-4" />인쇄 / PDF</Button>
              <Button variant="outline" disabled={!ps.length} onClick={() => download(exportText(ps))} data-testid="button-download"><Download className="h-4 w-4" />텍스트 파일</Button>
            </div>
          </Panel>
          <Panel title="AI 초안 도움" hint={`학년: ${gradeLabel[s.grade]} — 설명 수준만 달라져요.`}>
            <AiPanel task="story" testId="story" label="내 기록으로 초안·질문 받기" desc="기록이 부족하면 짧은 질문을 돌려줘요. 내 초안을 바꾸지 않고 새 문단으로만 추가돼요."
              getContext={() => ({ purpose: '학생의 실제 기록만으로 자기소개서 문단(특징, 관심 계기, 탐색 이유, 실제 경험과 배움, 학과 이유, 계획)을 선택한 작성 언어와 학생의 연령 수준에 맞춰 작성. 각 문단 끝에 근거 ref를 [ref:...] 형식으로 표기. 기록이 부족한 부분은 지어내지 말고 짧은 질문으로 대신할 것. 계획은 미래형. 전공이 미정이면 미정이라고 표현.', facts: facts() })}
              applyLabel="새 문단으로 추가" applyDesc="제안을 새 문단으로 맨 아래에 추가해요. 기존 문단은 바뀌지 않아요. 표기된 근거 ID는 자동으로 연결돼요."
              onApply={x => update(d => {
                for (const block of x.split(/\n\s*\n/).filter(b => b.trim())) {
                  const ev = Array.from(new Set((block.match(/(str|int|ref|act|maj|job):[a-z0-9-]+/gi) ?? []))).filter(e => opts.some(o => o.id === e));
                  d.story.paragraphs.push({ id: uid(), heading: 'AI 제안 (검토 중)', text: block.trim(), evidence: ev, origin: 'server-ai-proposal' });
                }
                d.story.basedAt = now();
              })} />
          </Panel>
        </aside>
      </div>
    </div>
  );
}
