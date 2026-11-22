import { requestPracticeLink } from '@/vendor/career-lab/lib/practice';
import { PublicText } from './public-text';
import { RECOMMENDATION_NOTICE } from "@/vendor/career-lab/lib/recommendation-policy";
import { useEffect, useMemo, useState } from 'react';
import { useSearch } from 'wouter';
import { officialProgramOperator } from '@/vendor/career-lab/lib/official-operators';
import { UniversityDirectory, Pager } from '@/vendor/career-lab/components/lab/university-directory';
import { BulkUniversityCatalogue } from '@/vendor/career-lab/components/lab/bulk-university-catalogue';
import { formatMessage, localizeValue } from '@/vendor/career-lab/lib/i18n-runtime';
import { Bookmark, BookmarkCheck, ExternalLink, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useLab } from '@/vendor/career-lab/lib/store';
import { useLocale } from '@/vendor/career-lab/lib/locale';
import { FIELDS, MAJORS, majorById } from '@/vendor/career-lab/lib/catalog';
import { OFFICIAL_PROGRAMS, programsFor, chooseProgram, rememberPublicProgram, degreeLabels, type DegreeLevel, type UniversityProgram, type CurriculumFact } from '@/vendor/career-lab/lib/universities';
import { uid, now, type LabState, type UniLink } from '@/vendor/career-lab/lib/types';
import { useToast } from '@/vendor/career-lab/hooks/use-toast';
import { Panel, Empty, Tag, TextIn, Select, Confirm, LField } from '@/vendor/career-lab/components/lab/ui';
import { TryActions } from '@/vendor/career-lab/components/lab/try-actions';
import { Button } from '@/vendor/career-lab/components/ui/button';
import { cn } from '@/vendor/career-lab/lib/utils';

const ALL = '__all';
const MAX_COMPARE = 3;
const translationLabel: Record<UniversityProgram['nameTranslation'], string> = {
  original: '원문 그대로', editorial: '앱 편집 번역', official: '대학 공식 번역', machine: '기계 번역', 'student-provided': '학생 입력 표기 · 공식 번역 미확인',
};
const sourceStatusLabel = { verified: 'LAB에서 확인한 출처', 'student-confirmed': '학생이 직접 확인', pending: '확인 대기' } as const;

/** 학생 링크 삭제: 저장/비교/임시 대학 선택만 정리하고 과거 활동 기록은 보존한다. */
export function removeStudentLink(d: LabState, linkId: string) {
  const pid = `student:${linkId}`;
  d.uniLinks = d.uniLinks.filter(l => l.id !== linkId);
  d.savedPrograms = (d.savedPrograms || []).filter(x => x !== pid);
  d.comparePrograms = (d.comparePrograms || []).filter(x => x !== pid);
  if (d.tempProgram === pid) d.tempProgram = '';
}

function FactList({ facts, testId }: { facts: CurriculumFact[]; testId?: string }) {
  if (!facts.length) return <p className="text-muted-foreground">공식 자료 연결 대기</p>;
  return (
    <ul className="space-y-1.5" data-testid={testId}>
      {facts.map((f, i) => (
        <li key={i} className="flex flex-wrap items-start gap-1.5">
          <Tag tone={f.status === 'verified' ? 'teal' : 'coral'} className="max-w-full shrink-0 whitespace-normal break-words">{f.status === 'verified' ? '공식 자료에서 확인' : '확인 대기'}</Tag>
          <span className={cn('min-w-0 flex-1 basis-full break-words sm:basis-48', f.status === 'pending' && 'text-muted-foreground')}><PublicText text={f.text} sourceLanguage={f.originalLanguage} /></span>
        </li>
      ))}
    </ul>
  );
}

type Level = 'listing' | 'introduction' | 'curriculum' | 'unverified';
const levelOf = (p: UniversityProgram): Level => p.recordKind === 'student-link' ? 'unverified' : (p.verificationLevel ?? 'curriculum');
const levelLabel: Record<Level, string> = { listing: '공식 학과 목록 · 수업 미확인', introduction: '학과 소개 확인됨', curriculum: '교육과정 확인됨', unverified: '학생 링크 · 미확인' };
const PAGE = 12;
const coverage = (() => {
  const unis = new Set(OFFICIAL_PROGRAMS.map(p => `${p.countryCode}|${p.universityOriginal}`));
  const countries = new Set(OFFICIAL_PROGRAMS.map(p => p.countryCode).filter(Boolean));
  const cur = OFFICIAL_PROGRAMS.filter(p => levelOf(p) === 'curriculum').length;
  const common = OFFICIAL_PROGRAMS.filter(p => p.informationScope === 'faculty-common').length;
  return { unis: unis.size, programs: OFFICIAL_PROGRAMS.length - common, countries: countries.size, cur, common, intro: OFFICIAL_PROGRAMS.length - common - cur };
})();

const langText = (codes: string[]) => codes.length ? codes.join(', ') : '수업 언어 미확인';

type Draft = { university: string; universityOriginal: string; country: string; countryCode: string; region: string; majorId: string; programOriginal: string; degreeLevel: DegreeLevel; teaching: string; sourceLanguage: string; academicVersion: string; url: string; note: string };
const blank = (majorId: string): Draft => ({ university: '', universityOriginal: '', country: '', countryCode: '', region: '', majorId, programOriginal: '', degreeLevel: 'unknown', teaching: '', sourceLanguage: '', academicVersion: '', url: '', note: '' });
const fromLink = (l: UniLink): Draft => ({ university: l.university, universityOriginal: l.universityOriginal || '', country: l.country, countryCode: l.countryCode || '', region: l.region || '', majorId: l.majorId, programOriginal: l.programOriginal || '', degreeLevel: l.degreeLevel || 'unknown', teaching: (l.teachingLanguages || []).join(', '), sourceLanguage: l.sourceLanguage || '', academicVersion: l.academicVersion || '', url: l.url, note: l.note });

function ProgramLinkForm({ editing, onDone }: { editing?: UniLink; onDone: (saved?: boolean) => void }) {
  const { state: s, update } = useLab();
  const [f, setF] = useState<Draft>(() => editing ? fromLink(editing) : blank(s.tempMajor || MAJORS[0]?.id || ''));
  const [err, setErr] = useState('');
  const set = (k: keyof Draft) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = () => {
    if (!f.university.trim()) return setErr('대학 이름을 적어 주세요.');
    if (!f.country.trim()) return setErr('국가를 적어 주세요.');
    if (f.countryCode.trim() && !/^[a-z]{2}$/i.test(f.countryCode.trim())) return setErr('국가 코드는 알파벳 두 글자로 적거나 비워 주세요.');
    try { const u = new URL(f.url); if (!['https:', 'http:'].includes(u.protocol)) throw new Error('x'); }
    catch { return setErr('실제 공식 페이지의 올바른 https:// 주소를 적어 주세요.'); }
    const meta = {
      university: f.university.trim(), universityOriginal: f.universityOriginal.trim() || undefined,
      country: f.country.trim(), countryCode: f.countryCode.trim().toUpperCase() || undefined, region: f.region.trim() || undefined, majorId: f.majorId,
      programOriginal: f.programOriginal.trim() || undefined, degreeLevel: f.degreeLevel,
      teachingLanguages: f.teaching.split(',').map(x => x.trim()).filter(Boolean),
      sourceLanguage: f.sourceLanguage.trim() || undefined, academicVersion: f.academicVersion.trim() || undefined,
      url: f.url.trim(), note: f.note.trim(),
    };
    update(d => {
      if (editing) {
        const x = d.uniLinks.find(y => y.id === editing.id);
        if (x) Object.assign(x, meta, { verified: false, verifiedDate: '' });
      } else d.uniLinks.push({ id: uid(), ...meta, verified: false, verifiedDate: '' });
    });
    onDone(true);
  };
  return (
    <div className="rise grid gap-3 rounded-xl border border-dashed bg-muted/40 p-4 md:grid-cols-2">
      <p className="text-xs text-muted-foreground md:col-span-2">학생이 직접 찾은 링크로 저장돼요(미확인). 운영자가 확인한 교육과정 자료가 아니에요. 입력한 이름·언어는 번역하지 않고 그대로 보관해요.</p>
      <LField label="대학 이름 (표시용)"><TextIn value={f.university} onChange={set('university')} data-testid="field-program-university" /></LField>
      <LField label="대학 원어 이름" hint="공식 페이지에 적힌 그대로"><TextIn value={f.universityOriginal} onChange={set('universityOriginal')} /></LField>
      <LField label="국가"><TextIn value={f.country} onChange={set('country')} placeholder="예: 대한민국" data-testid="field-program-country" /></LField>
      <LField label="국가 코드 (선택)" hint="ISO 두 글자 코드. 모르면 비워 두세요. 국내외 구분용이며 사실 확인을 뜻하지 않아요."><TextIn value={f.countryCode} onChange={set('countryCode')} dir="ltr" data-testid="field-program-country-code" /></LField>
      <LField label="지역"><TextIn value={f.region} onChange={set('region')} placeholder="예: 유럽" data-testid="field-program-region" /></LField>
      <LField label="연결할 일반 학과"><Select value={f.majorId} onChange={set('majorId')} options={MAJORS.map(m => ({ value: m.id, label: m.name }))} /></LField>
      <LField label="학과·프로그램 원어 이름"><TextIn value={f.programOriginal} onChange={set('programOriginal')} data-testid="field-program-original" /></LField>
      <LField label="학위 과정"><Select value={f.degreeLevel} onChange={set('degreeLevel')} options={(Object.keys(degreeLabels) as DegreeLevel[]).map(k => ({ value: k, label: degreeLabels[k] }))} data-testid="field-program-degree" /></LField>
      <LField label="수업 언어" hint="쉼표로 구분, 모르면 비워 두세요"><TextIn value={f.teaching} onChange={set('teaching')} data-testid="field-program-teaching" /></LField>
      <LField label="자료 언어" hint="페이지가 쓰인 언어. 수업 언어와 달라요"><TextIn value={f.sourceLanguage} onChange={set('sourceLanguage')} data-testid="field-program-source-language" /></LField>
      <LField label="학사 연도·버전"><TextIn value={f.academicVersion} onChange={set('academicVersion')} placeholder="예: 2025–2026 카탈로그" data-testid="field-program-version" /></LField>
      <LField label="공식 페이지 주소"><TextIn value={f.url} onChange={set('url')} placeholder="https://" data-testid="field-program-url" /></LField>
      <LField label="메모"><TextIn value={f.note} onChange={set('note')} /></LField>
      {err && <p className="text-sm text-destructive md:col-span-2" role="alert">{err}</p>}
      <div className="flex justify-end gap-2 md:col-span-2">
        <Button size="sm" variant="ghost" onClick={() => onDone(false)}>취소</Button>
        <Button size="sm" onClick={save} data-testid="button-save-program-link">{editing ? '수정 저장' : '저장 (미확인)'}</Button>
      </div>
    </div>
  );
}

function Meta({ p }: { p: UniversityProgram }) {
  const {t} = useLocale();
  const src = p.sources[0];
  return (
    <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
      <div><dt className="inline text-muted-foreground">국가·지역 </dt><dd className="inline">{p.country || '미입력'} · {p.region}</dd></div>
      <div><dt className="inline text-muted-foreground">학위 </dt><dd className="inline">{degreeLabels[p.degreeLevel]}</dd></div>
      <div><dt className="inline text-muted-foreground">수업 언어{p.recordKind === 'student-link' ? ' (학생 입력·미확인)' : ''} </dt><dd className="inline">{langText(p.teachingLanguages)}</dd></div>
      <div><dt className="inline text-muted-foreground">이름 표기 </dt><dd className="inline">{p.recordKind==='official'?t('현지어 명칭은 앱 번역이며 대학의 공식 번역이 아니에요.'):translationLabel[p.nameTranslation]}</dd></div>
      {p.sources.map(x => (
        <div key={x.id} className="sm:col-span-2 flex flex-wrap items-center gap-1.5 rounded-lg bg-muted/50 p-2">
          <Tag tone={x.status === 'verified' ? 'teal' : x.status === 'pending' ? 'coral' : 'outline'}>{sourceStatusLabel[x.status]}</Tag>
          <span className="break-words"><bdi>{x.title}</bdi></span>
          <span className="text-muted-foreground">버전 {p.recordKind === 'official' ? String(localizeValue(x.academicVersion || '미입력', true)) : x.academicVersion ? <bdi data-i18n-original>{x.academicVersion}</bdi> : String(localizeValue('미입력', true))} · 확인일 {x.checkedAt || '없음'} · 자료 언어 {x.language || '미입력'}</span>
          {x.url && <a href={x.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">원문<ExternalLink className="h-3 w-3" /></a>}
        </div>
      ))}
      {!src && <p className="text-muted-foreground">공식 자료 연결 대기</p>}
    </dl>
  );
}

export function UniversityExplorer() {
  const { toast } = useToast();
  const { effectiveLocale } = useLocale();
  const { state: s, update } = useLab();
  const programs = useMemo(() => {
    const all = programsFor(s);
    // Newly saved personal links stay reachable even as the public catalogue grows.
    return [...all.filter(p => p.recordKind === 'student-link').reverse(), ...all.filter(p => p.recordKind !== 'student-link')];
  }, [s]);
  const [q, setQ] = useState('');
  const [scope, setScope] = useState(ALL);
  const [country, setCountry] = useState(ALL);
  const [region, setRegion] = useState(ALL);
  const [uni, setUni] = useState(ALL);
  const [major, setMajor] = useState(ALL);
  const [operatorMajor,setOperatorMajor]=useState(()=>new URLSearchParams(window.location.search).get('operatorMajor')||ALL);
  const search=useSearch();
  useEffect(()=>{setOperatorMajor(new URLSearchParams(search).get('operatorMajor')||ALL);setPage(0);},[search]);
  const [degree, setDegree] = useState(ALL);
  const [teaching, setTeaching] = useState(ALL);
  const [onlySaved, setOnlySaved] = useState(false);
  const [level, setLevel] = useState(ALL);
  const [kind, setKind] = useState(ALL);
  const [field, setField] = useState(ALL);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState('');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState('');
  const [refusal, setRefusal] = useState('');
  const saved = s.savedPrograms || [];
  const compare = s.comparePrograms || [];

  const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean))).sort();
  const opts = (xs: string[], all: string) => [{ value: ALL, label: all }, ...xs.map(x => ({ value: x, label: String(localizeValue(x, true)) }))];
  const isKR = (p: UniversityProgram) => p.countryCode === 'KR';
  const scopeOf = (p: UniversityProgram) => !p.countryCode ? 'unknown' : isKR(p) ? 'domestic' : 'overseas';

  const list = programs.filter(p => {
    const productValues = p.recordKind === 'official'
      ? [localizeValue(p.universityOriginal, true), localizeValue(p.programOriginal || p.programDisplay, true), localizeValue(p.universityDisplay, true), localizeValue(p.programDisplay, true), localizeValue(majorById(p.majorId)?.name || '', true)]
      : [];
    const hay = [p.universityDisplay, p.universityOriginal, p.programDisplay, p.programOriginal, majorById(p.majorId)?.name || '', ...productValues].join(' ').toLowerCase();
    return (operatorMajor===ALL||officialProgramOperator(p,operatorMajor)) && (!q || hay.includes(q.toLowerCase())) &&
      (scope === ALL || scopeOf(p) === scope) &&
      (country === ALL || p.country === country) && (region === ALL || p.region === region) &&
      (uni === ALL || p.universityDisplay === uni) && (major === ALL || p.majorId === major) &&
      (degree === ALL || p.degreeLevel === degree) &&
      (teaching === ALL || (teaching === '__unknown' ? p.teachingLanguages.length === 0 : p.teachingLanguages.includes(teaching))) &&
      (level === ALL || levelOf(p) === level) && (kind === ALL || p.recordKind === kind) &&
      (field === ALL || !!majorById(p.majorId)?.fields.includes(field)) &&
      (!onlySaved || saved.includes(p.id));
  });
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const curPage = Math.min(page, pages - 1);
  const shown = list.slice(curPage * PAGE, curPage * PAGE + PAGE);
  const findPrograms = (name: string) => { setQ(name); setPage(0); document.querySelector<HTMLInputElement>('[data-testid="program-search"]')?.focus(); };

  const toggleSave = (id: string) => update(d => {
    const cur = d.savedPrograms || [];
    if (cur.includes(id)) {
      d.savedPrograms = cur.filter(x => x !== id);
      d.comparePrograms = (d.comparePrograms || []).filter(x => x !== id);
      if (d.tempProgram === id) d.tempProgram = '';
    } else d.savedPrograms = [...cur, id];
  });
  const toggleCompare = (id: string) => {
    if (compare.includes(id)) { setRefusal(''); return update(d => { d.comparePrograms = (d.comparePrograms || []).filter(x => x !== id); }); }
    if (compare.length >= MAX_COMPARE) return setRefusal(`비교는 최대 ${MAX_COMPARE}개까지예요. 기존 항목을 하나 빼야 새 항목을 넣을 수 있어요. 자동으로 바꾸지 않았어요.`);
    setRefusal('');
    update(d => { d.comparePrograms = [...(d.comparePrograms || []), id]; });
  };
  const pick = (p: UniversityProgram) => update(d => {
    if (d.tempProgram === p.id) { d.tempProgram = ''; return; }
    chooseProgram(d, p);
  });
  const inspectBulk = (p: UniversityProgram) => {
    update(d => rememberPublicProgram(d, p));
    setQ(p.universityOriginal); setScope(ALL); setCountry(ALL); setRegion(ALL);
    setUni(ALL); setMajor(ALL); setDegree(ALL); setTeaching(ALL); setLevel(ALL);
    setKind(ALL); setField(ALL); setOnlySaved(false); setPage(0); setOpen(p.id);
    // Explicit inspection does not close or clear a student's unfinished link form.
    requestAnimationFrame(() => document.querySelector('[data-testid="program-search"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  };
  const planBulk = (p: UniversityProgram) => {
    const stamp = now();
    const label = `${p.universityOriginal} · ${p.programOriginal}`;
    const title = p.courses[0]?.originalLanguage
      ? `${label} · 공식 과목 「${p.courses[0].text}」을 읽고 나의 관심과 연결할 질문 적기`
      : p.verificationLevel === 'listing'
      ? `${label} · 공식 학과 목록을 읽고 학과 소개에서 더 확인할 질문 적기`
      : `${label} · 공식 학과 내용과 교과목을 읽고 나의 관심과 연결할 질문 적기`;
    update(d => {
      rememberPublicProgram(d, p);
    });
    requestPracticeLink({sourceType:'program',sourceId:p.id,sourceLabel:label,text:'공식 자료·과목 목록 읽고 질문 3개 적기'});
  };

  const strengths = s.tests.flatMap(t => t.strengths).filter(x => x.fit !== 'unsure').map(x => x.text).filter(Boolean);
  const interests = s.interests.map(i => i.text).filter(Boolean);
  const cmp = compare.map(id => programs.find(p => p.id === id)).filter(Boolean) as UniversityProgram[];
  const temp = programs.find(p => p.id === s.tempProgram);
  const factRows: [string, (p: UniversityProgram) => CurriculumFact[]][] = [['교육과정', p => p.curriculum], ['과목', p => p.courses], ['배움·프로젝트', p => p.learning], ['전공 선택', p => p.selection], ['융합', p => p.fusion]];
  const editing = s.uniLinks.find(l => l.id === editId);

  return (
    <><BulkUniversityCatalogue onInspect={inspectBulk} onPlan={planBulk} />
    <Panel className="mb-8" title="대학별 프로그램 탐색" hint={formatMessage('기존 상세 자료 {0}개와 내가 열거나 저장한 공개 학과 자료를 함께 볼 수 있어요. 위의 전체 공개 목록과 상세 내용 확인 범위는 달라요.', [OFFICIAL_PROGRAMS.length])}
      action={!adding && !editId && <Button size="sm" variant="outline" onClick={() => setAdding(true)} data-testid="button-new-program-link"><Plus className="h-4 w-4" />공식 링크 추가</Button>}>
      {(adding || editing) && <div className="mb-5"><ProgramLinkForm key={editId || 'new'} editing={editing} onDone={didSave => {
        setAdding(false); setEditId('');
        if (didSave) {
          setQ(''); setScope(ALL); setCountry(ALL); setRegion(ALL); setUni(ALL); setMajor(ALL);
          setDegree(ALL); setTeaching(ALL); setLevel(ALL); setKind(ALL); setField(ALL);
          setOnlySaved(false); setPage(0);
        }
      }} /></div>}

      <div className="mb-4 rounded-xl border border-primary/25 bg-secondary/40 p-3 text-sm">
        <b>임시 선택한 대학 프로그램</b>{' '}
        {temp ? <span data-testid="text-temp-program">{temp.recordKind === 'official' ? <><PublicText text={temp.universityOriginal} /> · <PublicText text={temp.programOriginal || temp.programDisplay} /></> : <>{temp.universityOriginal} · {temp.programOriginal || temp.programDisplay}</>}</span> : <span className="text-muted-foreground">없음 — 확정이 아니에요.</span>}
      </div>

      <p className="mb-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground" role="note" data-testid="text-program-search-scope">이 검색은 기존 상세 자료와 내가 열거나 저장한 프로그램 기록만 찾아요. 전체 공개 목록 검색은 위에서 해 주세요.</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2"><Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" /><TextIn value={q} onChange={e => { setQ(e.target.value); setPage(0); }} placeholder="열람·저장한 프로그램 기록 검색" className="ps-9" aria-label="열람·저장한 프로그램 기록 검색" data-testid="program-search" /></div>
        <Select value={scope} onChange={e => { setScope(e.target.value); setPage(0); }} options={[{ value: ALL, label: '국내·해외 전체' }, { value: 'domestic', label: '국내 (KR)' }, { value: 'overseas', label: '해외' }, { value: 'unknown', label: '국내외 구분 미확인' }]} data-testid="program-scope" />
        <Select value={country} onChange={e => { setCountry(e.target.value); setPage(0); }} options={opts(uniq(programs.map(p => p.country)), '모든 국가')} data-testid="program-country" />
        <Select value={region} onChange={e => { setRegion(e.target.value); setPage(0); }} options={opts(uniq(programs.map(p => p.region)), '모든 지역')} data-testid="program-region" />
        <Select value={uni} onChange={e => { setUni(e.target.value); setPage(0); }} options={[{value:ALL,label:'모든 대학'},...uniq(programs.map(p=>p.universityDisplay)).map(value=>{
          const official=programs.find(p=>p.recordKind==='official'&&p.universityDisplay===value);
          return {value,label:official?String(localizeValue(official.universityOriginal,true)):value};
        })]} data-testid="program-university" />
        <label className="space-y-1"><span>이 학과를 배울 수 있는 대학</span><Select value={operatorMajor} onChange={e=>{setOperatorMajor(e.target.value);setPage(0);}} options={[{value:ALL,label:'모든 공식 전공 자료'},...MAJORS.filter(m=>m.id!=='m-open').map(m=>({value:m.id,label:m.name}))]} data-testid="program-operator-major" /></label>
        <Select value={major} onChange={e => { setMajor(e.target.value); setPage(0); }} options={[{ value: ALL, label: '모든 일반 학과' }, ...uniq(programs.map(p => p.majorId)).map(id => ({ value: id, label: majorById(id)?.name || id }))]} data-testid="program-major" />
        <Select value={degree} onChange={e => { setDegree(e.target.value); setPage(0); }} options={[{ value: ALL, label: '모든 학위' }, ...uniq(programs.map(p => p.degreeLevel)).map(k => ({ value: k, label: degreeLabels[k as DegreeLevel] }))]} data-testid="program-degree" />
        <Select value={teaching} onChange={e => { setTeaching(e.target.value); setPage(0); }} options={[{ value: ALL, label: '모든 수업 언어' }, { value: '__unknown', label: '수업 언어 미확인' }, ...uniq(programs.flatMap(p => p.teachingLanguages)).map(x => ({ value: x, label: x }))]} data-testid="program-teaching" />
        <Select aria-label="확인 수준" value={level} onChange={e => { setLevel(e.target.value); setPage(0); }} options={[{ value: ALL, label: '모든 확인 수준' }, { value: 'curriculum', label: '교육과정 확인' }, { value: 'introduction', label: '학과 소개 확인' }, { value: 'unverified', label: '학생 링크 · 미확인' }]} data-testid="program-level" />
        <Select aria-label="자료 종류" value={kind} onChange={e => { setKind(e.target.value); setPage(0); }} options={[{ value: ALL, label: '모든 자료 종류' }, { value: 'official', label: '공식 자료 기반' }, { value: 'student-link', label: '학생이 찾은 링크' }]} data-testid="program-source-kind" />
        <Select aria-label="분야" value={field} onChange={e => { setField(e.target.value); setPage(0); }} options={[{ value: ALL, label: '모든 분야' }, ...FIELDS.filter(f => programs.some(p => majorById(p.majorId)?.fields.includes(f.id))).map(f => ({ value: f.id, label: f.name }))]} data-testid="program-field" />
        <button onClick={() => { setOnlySaved(!onlySaved); setPage(0); }} aria-pressed={onlySaved} className={cn('rounded-lg border px-4 py-2 text-sm text-start', onlySaved && 'bg-foreground text-background')}>저장한 프로그램만</button>
      </div>
      {refusal && <p className="mt-3 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground" role="alert" data-testid="text-compare-refusal">{refusal}</p>}

      {cmp.length > 0 && (
        <div className="mt-5 rounded-xl border p-3" data-testid="program-compare">
          <p className="mb-4 rounded-xl border border-primary/20 bg-secondary/40 p-4 text-base leading-relaxed" role="note" data-testid="program-comparison-notice">{RECOMMENDATION_NOTICE}</p>
          <div className="mb-2 flex items-center justify-between"><b>프로그램 비교 ({cmp.length}/{MAX_COMPARE})</b><button onClick={() => { setRefusal(''); update(d => { d.comparePrograms = []; }); }} className="text-sm text-muted-foreground hover:underline">비우기</button></div>
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr><th className="w-28" />{cmp.map(p => <th key={p.id} className="p-2 text-start align-top"><bdi className="font-display text-base">{p.recordKind === 'official' ? <PublicText text={p.universityOriginal} original /> : p.universityOriginal}</bdi><div className="font-normal">{p.recordKind === 'official' ? <PublicText text={p.programOriginal || p.programDisplay} original /> : p.programOriginal || p.programDisplay}</div>
                <button onClick={() => toggleCompare(p.id)} className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"><X className="h-3 w-3" />빼기</button></th>)}</tr></thead>
              <tbody>
                <tr className="border-t align-top"><td className="p-2 font-semibold text-muted-foreground">자료·메타데이터</td>{cmp.map(p => <td key={p.id} className="p-2"><Meta p={p} /></td>)}</tr>
                <tr className="border-t align-top"><td className="p-2 font-semibold text-muted-foreground">일반 학과</td>{cmp.map(p => <td key={p.id} className="p-2">{majorById(p.majorId)?.name || '미입력'}</td>)}</tr>
                {factRows.map(([l, fn]) => <tr key={l} className="border-t align-top"><td className="p-2 font-semibold text-muted-foreground">{l}</td>{cmp.map(p => <td key={p.id} className="p-2"><FactList facts={fn(p)} /></td>)}</tr>)}
                <tr className="border-t align-top"><td className="p-2 font-semibold text-muted-foreground">메모</td>{cmp.map(p => <td key={p.id} className="p-2">{p.note || '없음'}</td>)}</tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {list.length === 0 ? <Empty title="조건에 맞는 프로그램이 없어요" desc="필터를 바꾸거나 직접 찾은 공식 링크를 추가해 보세요." /> : shown.map(p => {
          const m = majorById(p.majorId); const isOpen = open === p.id; const isSaved = saved.includes(p.id);
          const link = p.recordKind === 'student-link' ? s.uniLinks.find(l => `student:${l.id}` === p.id) : undefined;
          const roles = (m ? FIELDS.filter(f => m.fields.includes(f.id)).flatMap(f => f.roles) : []).slice(0, 4);
          const label = `${p.universityDisplay} ${p.programDisplay}`;
          return (
            <article key={p.id} className={cn('rounded-2xl border bg-card p-4 md:p-5', s.tempProgram === p.id && 'border-primary ring-2 ring-primary/20')} data-testid={`card-program-${p.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button className="min-w-0 flex-[1_1_14rem] text-start" onClick={() => setOpen(isOpen ? '' : p.id)} aria-expanded={isOpen}>
                  <div className="flex flex-wrap gap-1"><Tag tone={p.recordKind === 'official' ? 'teal' : 'coral'}>{p.recordKind === 'official' ? '공식 자료 기반' : '학생 링크 · 운영자 미검증'}</Tag><Tag tone={levelOf(p) === 'curriculum' ? 'teal' : 'outline'}>{levelLabel[levelOf(p)]}</Tag><Tag tone="outline">{scopeOf(p) === 'unknown' ? '국내외 구분 미확인' : isKR(p) ? '국내' : '해외'}</Tag><Tag tone="outline">{p.recordKind==='official'?'기계 번역':translationLabel[p.nameTranslation]}</Tag></div>
                  <h3 className="mt-2 break-words font-display text-lg font-bold">{p.recordKind==='official'?<PublicText text={p.universityOriginal} sourceLanguage={p.sources[0]?.language} original/>:<bdi data-i18n-original>{p.universityOriginal}</bdi>}</h3>
                  <p className="break-words text-sm">{p.recordKind==='official'?<PublicText text={p.programOriginal || p.programDisplay} sourceLanguage={p.sources[0]?.language} original/>:p.programOriginal?<bdi data-i18n-original>{p.programOriginal}</bdi>:<span className="text-muted-foreground">원어 프로그램명 미입력</span>}</p>
                  {p.informationScope === 'faculty-common' && <Tag tone="outline">학부·학과 공통 안내</Tag>}
                </button>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant={isSaved ? 'secondary' : 'outline'} onClick={() => toggleSave(p.id)} data-testid={`save-program-${p.id}`}>{isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{isSaved ? '저장됨' : '저장'}</Button>
                  <Button size="sm" variant={compare.includes(p.id) ? 'secondary' : 'outline'} onClick={() => toggleCompare(p.id)} data-testid={`compare-program-${p.id}`}>{compare.includes(p.id) ? '비교 중' : '비교'}</Button>
                  <Button size="sm" variant={s.tempProgram === p.id ? 'default' : 'outline'} onClick={() => pick(p)} data-testid={`pick-program-${p.id}`}>{s.tempProgram === p.id ? '임시 선택됨' : '임시 선택'}</Button>
                </div>
              </div>
              <div className="mt-3"><Meta p={p} /></div>
              {isOpen && (
                <div className="rise mt-4 space-y-4 border-t pt-4 text-sm">
                  <div className="grid gap-4 md:grid-cols-2">
                    {factRows.map(([l, fn]) => <div key={l}><b>{l}</b><div className="mt-1"><FactList facts={fn(p)} /></div></div>)}
                  </div>
                  {p.note && <p className="text-xs text-muted-foreground">{p.note}</p>}
                  {effectiveLocale !== 'ko' && <p className="text-xs text-muted-foreground">다른 언어로 표시한 앱 제공 설명은 기계 번역이며 대학의 공식 번역이 아니에요. 원문 자료를 함께 확인하세요.</p>}
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs font-semibold tracking-wide text-primary">일반 학과 안내 · 이 대학의 정보 아님</p>
                    <p className="mt-1"><b>{m?.name || '일반 학과 미연결'}</b>{m && <> — 길러지는 역량: {m.competencies.join(', ')}</>}</p>
                    {roles.length > 0 && <p className="mt-1">관련 분야의 일반 직무 예: {roles.map(r => r.name).join(', ')}</p>}
                    <p className="mt-2 text-muted-foreground">내가 적은 강점: {strengths.length ? strengths.join(', ') : '아직 없음'} · 관심사: {interests.length ? interests.join(', ') : '아직 없음'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">점수나 적합도를 매기지 않아요. 내 기록과 위 공식 자료를 나란히 놓고 직접 생각해 보세요.</p>
                  </div>
                  {link && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setAdding(false); setEditId(link.id); }} data-testid={`button-edit-program-link-${link.id}`}><Pencil className="h-4 w-4" />링크 정보 수정</Button>
                      <Confirm title="이 링크를 삭제할까요?" desc="저장·비교·임시 선택에서도 빠져요. 이미 만든 플래너 활동 기록은 그대로 남아요." onConfirm={() => update(d => removeStudentLink(d, link.id))} trigger={o => <Button size="sm" variant="ghost" onClick={o} data-testid={`button-remove-program-link-${link.id}`}><Trash2 className="h-4 w-4" />삭제</Button>} />
                    </div>
                  )}
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm">
                <span className="text-muted-foreground">탐색 활동: 공식 자료·과목 목록 읽고 궁금한 점 적기</span>
                <TryActions sourceType="program" sourceId={p.id} sourceLabel={label} suggestion={`${label} 공식 자료·과목 목록 읽고 질문 3개 적기`} />
              </div>
            </article>
          );
        })}
      </div>
      {pages > 1 && <Pager cur={curPage} pages={pages} setPage={setPage} prefix="programs" />}
      <UniversityDirectory onFindPrograms={findPrograms} />
    </Panel></>
  );
}
