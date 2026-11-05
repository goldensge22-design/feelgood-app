import { T } from '@/i18n/tx';
import { useEffect, useMemo, useState } from 'react';
import { Download, CheckCircle2, CircleDashed, XCircle, RefreshCw } from 'lucide-react';
import { runChecks } from '@/lib/diagnostics';
import { LANGS } from '@/i18n/ui';
import { coverage } from '@/i18n/content';
import { useApp, exportJSON, resetAll } from '@/lib/store';
import { Link } from 'wouter';
import { PageHead, Panel, Pill, Btn } from '@/components/shell';
import { cn } from '@/lib/utils';

const RULES = { '1.5': `${import.meta.env.BASE_URL}rules/lesson-lab-rules-1.5.md`, '1.2': `${import.meta.env.BASE_URL}rules/lesson-lab-rules-1.2.md`, '1.1': `${import.meta.env.BASE_URL}rules/lesson-lab-rules-1.1.md`, '1.0': `${import.meta.env.BASE_URL}rules/lesson-lab-rules-1.0.md` } as const;
type Ver = keyof typeof RULES;
const REFS = ['https://replit.com/replid/440b5b48-58e3-4c20-a90a-355dc0f5714c', 'https://github.com/goldensge22-design/dcas-company-job-lab', 'https://github.com/goldensge22-design/feelgood-app'];
const TABS = ['1.5 작업 흐름', '현재 규칙', '구현 상태', '연동 대기', '검증', '번역', '변경 이력'] as const;

export default function Rules() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('1.5 작업 흐름');
  const [ver, setVer] = useState<Ver>('1.5');
  const [md, setMd] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [seed, setSeed] = useState(0);
  const lang = useApp((s) => s.lang);
  useEffect(() => { setErr(false); setMd(null); fetch(RULES[ver]).then((r) => (r.ok ? r.text() : Promise.reject())).then(setMd).catch(() => setErr(true)); }, [seed, ver]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const checks = useMemo(() => runChecks(), [seed]);
  return (
    <div>
      <PageHead kicker="Rules 1.5 · inherits 1.2 + 1.1 + 1.0" title={T("규칙 · 버전 · 상태")}>
        <a href={RULES['1.5']} download="lesson-lab-rules-1.5.md" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground" data-testid="link-download-rules"><Download className="h-4 w-4" />{T("규칙 1.5 다운로드")}</a>
        <a href={RULES['1.2']} download="lesson-lab-rules-1.2.md" className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold" data-testid="link-download-rules-1-2"><Download className="h-4 w-4" />{T("이전 1.2 원문")}</a>
        <a href={RULES['1.1']} download="lesson-lab-rules-1.1.md" className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold" data-testid="link-download-rules-1-1"><Download className="h-4 w-4" />{T("이전 1.1 원문")}</a>
        <a href={RULES['1.0']} download="lesson-lab-rules-1.0.md" className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold" data-testid="link-download-rules-1-0"><Download className="h-4 w-4" />{T("이전 1.0 원문")}</a>
        <Btn variant="outline" onClick={exportJSON} data-testid="button-backup">{T("데이터 백업")}</Btn>
        <Btn variant="danger" onClick={() => confirm(T("브라우저에 저장된 모든 데이터를 지울까요?")) && resetAll()} data-testid="button-reset">{T("초기화")}</Btn>
      </PageHead>
      <div className="no-print mb-4 flex flex-wrap gap-1.5">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} data-testid={`tab-rules-${t}`} className={cn('rounded-full border px-3.5 py-1.5 text-sm font-semibold', tab === t ? 'bg-sidebar text-white border-sidebar' : 'bg-card')}>{T(t)}</button>)}</div>

      {tab === '1.5 작업 흐름' && (
        <Panel className="text-sm space-y-3">
          <p>{T("1.5는 1.2·1.1·1.0을 승계합니다. 수업 준비에서 학생이 고른 미션, 확인된 경험 사실, 글쓰기·상담·모의 면접까지 한 과정 안에서 연결합니다. 기존 학생 앱을 대체하지 않습니다.")}</p>
          <ol className="grid gap-1.5 sm:grid-cols-3">{([['/studio', '과정 만들기 · 하루(개인) 또는 장기'], ['/studio/results', 'PASS 4점수와 TOP5 원본 순서'], ['/studio/sources', '기업·직무 출처 분류와 승인 증빙'], ['/studio/agenda', '진행표'], ['/studio/live', '탐색 → 후보 → 선택 → 검토 → 로컬 등록 → 기록 → 학생 확인'], ['/studio/writing', 'V1 보존 · 공유 선택 · 예약 · 상담 · 사실 확인 · V2'], ['/studio/interview', '경험/가정 질문 연습, 점수 없음'], ['/studio/print', '과정 자료와 개인 자료 인쇄'], ['/studio/status', '단계 구분과 거짓 성과 점검']] as const).map(([h, l], i) => <li key={h}><Link href={h} className="flex gap-2 rounded-lg border p-2.5 hover:border-primary" data-testid={`link-rules-flow-${i}`}><span className="font-mono text-xs text-[hsl(var(--sidebar-primary))]">{String(i + 1).padStart(2, '0')}</span><span>{T(l)}</span></Link></li>)}</ol>
          <ul className="list-disc ps-5 text-muted-foreground space-y-1">
            <li>{T("역할 선택은 데모 미리보기입니다. 실제 로그인·권한 보안이 아닙니다.")}</li>
            <li>{T("플래너 등록은 이 브라우저 안의 로컬 기록입니다. 외부 플래너·학생 앱에 전송하지 않습니다.")}</li>
            <li>{T("글 제안과 질문은 규칙 기반이며 외부 AI를 쓰지 않습니다. 합격·점수를 판정하지 않습니다.")}</li>
            <li>{T("상담자에게는 학생이 선택한 항목만 전달됩니다. 정확도(%)와 데모 정규화 값은 비교하지 않습니다.")}</li>
          </ul>
        </Panel>
      )}
      {tab === '현재 규칙' && (
        <Panel>
          <div className="mb-3 flex flex-wrap items-center gap-2">{(["1.5", "1.2", "1.1", "1.0"] as Ver[]).map((v) => <button key={v} type="button" aria-pressed={ver === v} onClick={() => setVer(v)} data-testid={`button-rules-ver-${v}`} className={cn("rounded-full border px-3 py-1 text-sm font-semibold", ver === v ? "bg-primary text-primary-foreground border-primary" : "bg-card")}>{v === "1.5" ? T("1.5 현재 규칙") : v === "1.2" ? T("1.2 원문 (승계됨)") : v === "1.1" ? T("1.1 원문 (승계됨)") : T("1.0 원문 (승계됨)")}</button>)}{ver === "1.5" ? <Pill tone="orange">{T("1.5는 1.2·1.1·1.0을 승계하고 개정 사항만 덧붙입니다")}</Pill> : <Pill tone="gray">{T("보관용 · 개정된 부분은 최신 규칙이 우선")}</Pill>}</div>
          {err ? <div className="text-sm"><p className="text-destructive font-semibold">{T("규칙 문서를 불러오지 못했습니다.")}</p><Btn variant="outline" className="mt-2" onClick={() => setSeed((s) => s + 1)}><RefreshCw className="h-4 w-4" />{T("다시 시도")}</Btn></div>
            : md === null ? <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-4 rounded bg-muted animate-pulse" style={{ width: `${90 - i * 12}%` }} />)}</div>
            : <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 max-h-[70vh] overflow-y-auto" data-testid="text-rules">{md}</pre>}
        </Panel>
      )}
      {tab === '구현 상태' && (
        <Panel className="text-sm space-y-2">
          <p className="text-xs text-muted-foreground">{T("구현 = 코드에 있음 · 자동 점검 = 스크립트로 확인 · 사람 확인 대기 = 화면·인쇄·번역 수동 검수 전 · 외부/미연동 = 이 앱 밖")}</p>
          {([['규칙 1.5: 과정·진행표·결과지·출처·현장 미션·글쓰기·상담·모의 면접·인쇄·상태', '구현', '사람 확인 대기'], ['규칙 1.5: 3분 플래너 기본 연습과 로컬 플래너 등록', '구현(로컬)', '외부/미연동'], ['규칙 1.5: 역할 전환(교사·학생·상담자)', '데모 필터', '외부/미연동'], ['수업 18개 · 활동지 36개 · 6개 모델', '구현', '자동 점검'], ['수업 편집·저장·복제·인쇄·활동 교체 이력', '구현', '사람 확인 대기'], ['규칙 1.1: 빈 일반 설정으로 시작, 한서대는 선택 예시', '구현', '자동 점검'], ['규칙 1.1: 개인 미션 기본, 학과·직무별 반/조 편성 없음', '구현', '자동 점검'], ['규칙 1.1: 조별·혼합 수업의 조 편성 제안·검토·확정', '구현', '자동 점검'], ['규칙 1.1: 1:1 지도 인원 경고', '구현', '사람 확인 대기'], ['가상 학생 명단·코호트·백업 내보내기/가져오기', '구현', '사람 확인 대기'], ['개인 직무 카드 미리보기·수정·확정·버전·묶음 인쇄·재인쇄', '구현', '사람 확인 대기'], ['지원 엔진 243 조건', '구현', '자동 점검'], ['A4·A5 실제 인쇄·PDF', '구현', '사람 확인 대기'], ['15개 언어 UI·콘텐츠', '작성 번역', '사람 확인 대기'], ['계정·권한·서버 저장', '없음(로컬 데모)', '외부/미연동'], ['규칙 1.2: 개인 활동지와 플래너 카드 분리 생성·연결', '구현', '사람 확인 대기'], ['규칙 1.2: 활동지·카드 모든 항목 수정·버전·개별/일괄 확정', '구현', '사람 확인 대기'], ['규칙 1.2: 계획·진행 중·수행 완료 실행 기록 구분', '구현', '사람 확인 대기'], ['규칙 1.2: 활동지만·카드만·둘 다 인쇄 묶음 고정·재인쇄', '구현', '사람 확인 대기'], ['규칙 1.2: 플래너 등록 (텍스트 복사·TXT/JSON·수동 입력 확인)', '수동만', '외부/미연동'], ['학생 계정 내려받기', '없음(인증 필요)', '외부/미연동'], ['외부 AI·외부 서비스', '사용 안 함', '외부/미연동']] as const).map(([a, b, c]) => <div key={a} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2"><span className="flex-1">{T(a)}</span><Pill tone={b === '구현' ? 'blue' : 'gray'}>{T(b)}</Pill><Pill tone={c === '자동 점검' ? 'blue' : c === '외부/미연동' ? 'gray' : 'orange'}>{T(c)}</Pill></div>)}
        </Panel>
      )}
      {tab === '연동 대기' && (
        <Panel className="text-sm space-y-3">
          <p>{T("아래 주소는 제공받은 참고 주소일 뿐 접근·연동을 확인하지 않았습니다. 학생 LAB, 플래너, 외부 저장소와 자동 동기화하지 않습니다.")}</p>
          <ul className="space-y-1.5">{REFS.map((u) => <li key={u} className="flex flex-wrap items-center gap-2"><Pill tone="gray">{T("제공됨 · 미확인 · 미연동")}</Pill><a href={u} target="_blank" rel="noreferrer" className="break-all text-primary underline" data-testid="link-ref">{u}</a></li>)}</ul>
          <p className="text-muted-foreground">{T("연동 안내는 docs/lesson-lab/INTEGRATION.md를 참고하세요. 현재 데이터 이동 방법: JSON 백업, 카드 텍스트 복사, 플래너용 텍스트 내려받기(수동). 플래너 등록 상태는 모두 미연동이며 '수동 입력 확인'은 교사 표시일 뿐 외부 확인이 아닙니다.")}</p>
        </Panel>
      )}
      {tab === '검증' && (
        <Panel>
          <p className="text-sm text-muted-foreground mb-3">{T("자동 구조 점검은 데이터 개수와 구성을 확인할 뿐, 전체 품질 보증이 아닙니다. 인쇄·번역은 사람 확인이 필요합니다.")}</p>
          <ul className="space-y-1.5">{checks.map((c) => <li key={c.id} className="flex items-start gap-2 text-sm">{c.kind === 'human' ? <CircleDashed className="h-4 w-4 text-[hsl(var(--sidebar-primary))] mt-0.5" /> : c.ok ? <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> : <XCircle className="h-4 w-4 text-destructive mt-0.5" />}<span className="flex-1">{T(c.label)} <span className="text-muted-foreground">{T(c.detail)}</span></span><Pill tone={c.kind === 'human' ? 'orange' : 'gray'}>{c.kind === 'human' ? T("사람 확인 대기") : T("자동")}</Pill></li>)}</ul>
          <Btn variant="outline" className="mt-3" onClick={() => setSeed((s) => s + 1)} data-testid="button-rerun"><RefreshCw className="h-4 w-4" />{T("다시 점검")}</Btn>
        </Panel>
      )}
      {tab === '번역' && (
        <Panel>
          <p className="text-sm mb-3">{T("UI 문구는 15개 언어로 작성했으나 사람 검토 전입니다. 교육 콘텐츠는 번역이 없으면 \"한국어 원문 · 번역 대기\"로 표시합니다. 사용자가 입력한 글은 자동 번역하지 않습니다. 현재 언어:")}{' '}<b>{lang}</b></p>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-start text-xs text-muted-foreground"><th className="text-start py-1">{T("언어")}</th><th className="text-start">UI</th><th className="text-start">{T("활동지 36")}</th><th className="text-start">{T("수업 18")}</th><th className="text-start">{T("사람 검토")}</th></tr></thead>
            <tbody>{LANGS.map((l) => { const c = coverage(l.code); return <tr key={l.code} className="border-t"><td className="py-1.5">{l.name} <span className="font-mono text-xs text-muted-foreground">{l.code}</span></td><td>{l.code === 'ko' ? T("원문") : T("작성 번역")}</td><td className="font-mono">{c.ws}/36</td><td className="font-mono">{c.lessons}/18</td><td>{l.code === 'ko' ? T("원문") : c.reviewed ? T("완료") : <Pill tone="orange">{T("대기")}</Pill>}</td></tr>; })}</tbody></table></div>
        </Panel>
      )}
      {tab === '변경 이력' && (
        <Panel className="text-sm space-y-2">
          <div><b className="font-mono">1.5</b> {' '}{T("· 1.2·1.1·1.0 승계 개정. 과정(하루·장기) 생성, 3분 플래너 기본 연습 후 직무 탐색, 학생이 고른 미션의 검토·로컬 등록·실행 기록·학생 확인, 확인된 사실만 쓰는 글쓰기와 선택 공유 상담, 모의 면접, 7일 안 다음 행동. 역할 전환은 데모 미리보기이며 실제 인증이 아닙니다.")}</div>
          <div><b className="font-mono">1.2</b> {' '}{T("· 1.1·1.0 승계 개정. 학생마다 읽을 수 있는 개인 활동지와 실행할 플래너 카드를 따로 만들고 연결. 모든 항목 수정·버전·확정, 계획/진행 중/수행 완료 구분, 활동지만·카드만·둘 다 인쇄 묶음 고정과 재인쇄, 외부 등록 없이 수동 내보내기만. 날짜는 규칙 1.2 문서를 따릅니다.")}</div>
          <div><b className="font-mono">1.1</b> {' '}{T("· 2026-10-27 · 1.0 승계 개정. 일반 제품은 빈 설정으로 시작, 한서대 캠프는 선택 예시. 학생마다 개인 미션 수행(학과·직무별 반/조 편성 금지). 1:1·개별·조별·혼합 수업 형태와 교사 검토 후 확정하는 조 편성. 날짜는 규칙 1.1 문서를 따릅니다.")}</div>
          <div><b className="font-mono">1.0</b> {' '}{T("· 2026-10-27 · 최초 승인 규칙. 교사용 수업설계LAB 로컬 데모, 수업 18·활동지 36·지원 243 조건·카드 인쇄·캠프 제안안.")}</div>
          <p className="text-muted-foreground">{T("전체 변경 이력은 docs/lesson-lab/CHANGELOG.md에서 관리됩니다.")}</p>
        </Panel>
      )}
    </div>
  );
}
