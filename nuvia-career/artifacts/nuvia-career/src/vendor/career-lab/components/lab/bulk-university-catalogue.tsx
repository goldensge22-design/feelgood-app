import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, ExternalLink, FileSearch, NotebookPen, RotateCw, Search } from 'lucide-react';
import { loadBulkCatalogue, bulkToProgram, type BulkCatalogue, type BulkProgram } from '@/vendor/career-lab/lib/bulk-catalogue';
import { catalogueStats, compactSearch, groupProgrammes, loadSearchLexicon, matchesProgramme, programmeClosed, type ProgrammeGroup, type SearchLexicon } from '@/vendor/career-lab/lib/catalogue-search';
import { chooseProgram, rememberPublicProgram, type UniversityProgram } from '@/vendor/career-lab/lib/universities';
import { useLab } from '@/vendor/career-lab/lib/store';
import { useLocale } from '@/vendor/career-lab/lib/locale';
import { formatMessage } from '@/vendor/career-lab/lib/i18n-runtime';
import { Panel, Empty, Tag, TextIn, Select } from '@/vendor/career-lab/components/lab/ui';
import { Button } from '@/vendor/career-lab/components/ui/button';
import { cn } from '@/vendor/career-lab/lib/utils';
import { officialBulkOperator, OPERATOR_NOTICE } from '@/vendor/career-lab/lib/official-operators';
import { MAJORS } from '@/vendor/career-lab/lib/catalog';
import { useSearch } from 'wouter';
import { PublicText } from './public-text';

const ALL = '__all';
const PAGE = 15;
const MAX_COMPARE = 3;
const levelLabel: Record<BulkProgram['level'], string> = {
  listing: '목록만 · 소개·교육과정 미확인',
  introduction: '학과 소개 확인',
  curriculum: '교육과정 확인',
};
const recordLabel: Record<BulkProgram['recordType'], string> = { 'department-unit': '학과·학부 단위', degree: '학위 과정', major: '전공' };
const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean))).sort((a, b) => a.localeCompare(b));
const isClosed = programmeClosed;

type State = { status: 'pending' } | { status: 'error'; message: string } | { status: 'ready'; data: BulkCatalogue; lexicon: SearchLexicon };
type Indexed = ProgrammeGroup & { hay: string };

export function BulkUniversityCatalogue({ onInspect, onPlan }: { onInspect: (p: UniversityProgram) => void; onPlan: (p: UniversityProgram) => void }) {
  const { t, effectiveLocale } = useLocale();
  const { state: s, update } = useLab();
  const [load, setLoad] = useState<State>({ status: 'pending' });
  const [attempt, setAttempt] = useState(0);
  const [q, setQ] = useState(() => new URLSearchParams(window.location.search).get('catalogueQuery') || '');
  const [country, setCountry] = useState(ALL);
  const [region, setRegion] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [level, setLevel] = useState(ALL);
  const [operatorMajor,setOperatorMajor]=useState(()=>new URLSearchParams(window.location.search).get('operatorMajor')||ALL);
  const search=useSearch();
  useEffect(()=>{setOperatorMajor(new URLSearchParams(search).get('operatorMajor')||ALL);setPage(0);},[search]);
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.has('catalogueQuery')) setQ(params.get('catalogueQuery') || '');
    if (params.has('catalogueQuery') || window.location.hash === '#full-catalogue')
      requestAnimationFrame(() => document.getElementById('full-catalogue')?.scrollIntoView({ block: 'start' }));
  }, [search]);
  const [onlyMine, setOnlyMine] = useState(false);
  const [includeClosed, setIncludeClosed] = useState(false);
  const [page, setPage] = useState(0);
  const [refusal, setRefusal] = useState('');
  const listTop = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let live = true;
    setLoad({ status: 'pending' });
    Promise.all([loadBulkCatalogue(), loadSearchLexicon()]).then(([data, lexicon]) => { if (live) setLoad({ status: 'ready', data, lexicon }); })
      .catch(e => { if (live) setLoad({ status: 'error', message: e instanceof Error && /^(공개|공식)/.test(e.message) ? e.message : '공개 학과 목록을 불러오지 못했어요. 다시 시도해 주세요.' }); });
    return () => { live = false; };
  }, [attempt]);

  const data = load.status === 'ready' ? load.data : null;
  const sources = useMemo(() => new Map((data?.sources || []).map(x => [x.id, x])), [data]);
  const groupIds = useMemo(() => {
    const ids = new Map<string, string[]>();
    if (data) for (const group of groupProgrammes(data)) for (const id of group.memberIds) ids.set(id, group.memberIds);
    return ids;
  }, [data]);
  const lexicon = load.status === 'ready' ? load.lexicon : null;
  const index = useMemo<Indexed[]>(() => data && lexicon ? groupProgrammes(data).map(group => {
    const { inst } = group;
    const values = [
      inst?.name, inst?.displayName, ...(inst?.aliases || []), inst?.country, inst?.region, inst?.schoolType,
      ...group.records.flatMap(row => [row.name, ...row.aliases, row.category,
        row.overview, row.learning, row.combination, ...row.courses.map(c => c.name)]),
    ].filter((v): v is string => !!v);
    const hay = [...new Set(values)].map(v => `${lexicon[v] || compactSearch(v)}\0${compactSearch(t(v))}`).join('\0');
    return { ...group, hay };
  }) : [], [data, lexicon, effectiveLocale]);

  const countries = useMemo(() => uniq((data?.institutions || []).map(i => i.country)), [data]);
  const regions = useMemo(() => uniq((data?.institutions || []).filter(i => country === ALL || i.country === country).map(i => i.region)), [data, country]);
  const types = useMemo(() => uniq((data?.institutions || []).map(i => i.schoolType)), [data]);
  const categories = useMemo(() => uniq((data?.programs || []).map(p => p.category)), [data]);

  const saved = s.savedPrograms || [];
  const compare = s.comparePrograms || [];
  const dq = useDeferredValue(q);
  const mineKey = onlyMine ? [...saved, ...compare, s.tempProgram].join('|') : '';
  const list = useMemo(() => {
    const mine = new Set(mineKey.split('|').filter(Boolean));
    const matching=index.filter(({ row, records, memberIds, inst, hay }) =>
      (country === ALL || inst?.country === country) && (region === ALL || inst?.region === region) &&
      (type === ALL || inst?.schoolType === type) && (category === ALL || row.category === category) &&
      (level === ALL || (level === 'closed' ? records.some(isClosed) : row.level === level)) &&
      (operatorMajor===ALL||records.some(r => officialBulkOperator(r,operatorMajor))) &&
      (includeClosed || level === 'closed' || records.some(r => !isClosed(r))) &&
      (!onlyMine || memberIds.some(id => mine.has(id))) && matchesProgramme(hay, dq));
    // Surface actual educational content without privileging a famous school.
    // Interleave schools within each evidence level; no source records are cut.
    const result: typeof matching=[];
    for(const depth of ['curriculum','introduction','listing']){
      const groups=new Map<string,typeof matching>();
      for(const entry of matching)if(entry.row.level===depth){
        const bucket=groups.get(entry.row.institutionId)||[];
        bucket.push(entry);groups.set(entry.row.institutionId,bucket);
      }
      const buckets=[...groups.values()];
      for(let pos=0, remaining=true;remaining;pos++){
        remaining=false;
        for(const bucket of buckets)if(pos<bucket.length){result.push(bucket[pos]);remaining=true;}
      }
    }
    return result;
  }, [index, dq, country, region, type, category, level, onlyMine, mineKey, includeClosed, operatorMajor]);
  const stale = dq !== q;
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const rows = list.slice(cur * PAGE, cur * PAGE + PAGE).map(group => ({
    ...group,
    row: (level === 'closed' ? group.records.find(isClosed) : undefined) || group.records.find(p => p.id === s.tempProgram) ||
      group.records.find(p => saved.includes(p.id) || compare.includes(p.id)) || group.row,
  }));
  const set = (fn: (v: string) => void) => (e: { target: { value: string } }) => { fn(e.target.value); setPage(0); };
  const go = (n: number) => { setPage(n); listTop.current?.scrollIntoView({ block: 'nearest' }); };

  const toProgram = useCallback((row: BulkProgram) => data ? bulkToProgram(row, data) : null, [data]);
  const withProgram = (row: BulkProgram, fn: (p: UniversityProgram) => void) => { const p = toProgram(row); if (p) fn(p); };
  const toggleSave = (row: BulkProgram) => withProgram(row, p => update(d => {
    const curS = d.savedPrograms || [];
    const ids = groupIds.get(p.id) || [p.id];
    if (curS.some(id => ids.includes(id))) {
      d.savedPrograms = curS.filter(x => !ids.includes(x));
      d.comparePrograms = (d.comparePrograms || []).filter(x => !ids.includes(x));
      if (ids.includes(d.tempProgram || '')) d.tempProgram = '';
    } else { rememberPublicProgram(d, p); d.savedPrograms = [...curS, p.id]; }
  }));
  const toggleCompare = (row: BulkProgram) => withProgram(row, p => {
    const ids = groupIds.get(p.id) || [p.id];
    if (compare.some(id => ids.includes(id))) { setRefusal(''); return update(d => { d.comparePrograms = (d.comparePrograms || []).filter(x => !ids.includes(x)); }); }
    if (compare.length >= MAX_COMPARE) return setRefusal(formatMessage('비교는 최대 {0}개까지예요. 기존 항목을 하나 빼야 새 항목을 넣을 수 있어요. 자동으로 바꾸지 않았어요.', [MAX_COMPARE]));
    setRefusal('');
    update(d => { rememberPublicProgram(d, p); d.comparePrograms = [...(d.comparePrograms || []), p.id]; });
  });
  const pick = (row: BulkProgram) => withProgram(row, p => update(d => {
    if ((groupIds.get(p.id) || [p.id]).includes(d.tempProgram || '')) { d.tempProgram = ''; return; }
    rememberPublicProgram(d, p); chooseProgram(d, p);
  }));
  const plan = (row: BulkProgram) => withProgram(row, p => { update(d => rememberPublicProgram(d, p)); onPlan(p); });

  const totals = useMemo(() => data ? catalogueStats(data) : null, [data]);
  const clearFilters = (includeHistory = false) => {
    setQ(''); setCountry(ALL); setRegion(ALL); setType(ALL); setCategory(ALL); setLevel(ALL);
    setOperatorMajor(ALL); setOnlyMine(false); setIncludeClosed(includeHistory); setPage(0);
    const url = new URL(window.location.href);
    url.searchParams.delete('operatorMajor'); url.searchParams.delete('catalogueQuery');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + '#full-catalogue');
  };

  return (
    <div id="full-catalogue" className="scroll-mt-24">
    <Panel className="mb-8" title="전국·해외 학과 전체 목록" hint="추천 밖의 학과도 여기에서 검색·저장·선택할 수 있어요. 공식 목록과 소개·교육과정 자료의 확인 범위는 서로 달라요." >
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => clearFilters()} data-testid="bulk-clear-filters">검색·필터 초기화</Button>
        <Button variant="outline" onClick={() => clearFilters(true)} data-testid="bulk-show-all">폐과 이력까지 전체 보기</Button>
      </div>
      <label className="mb-4 block space-y-2"><span className="font-semibold">이 학과를 배울 수 있는 대학</span>
        <Select value={operatorMajor} onChange={e=>{setOperatorMajor(e.target.value);setPage(0);}} options={[{value:ALL,label:'모든 공식 전공 자료'},...MAJORS.filter(m=>m.id!=='m-open').map(m=>({value:m.id,label:m.name}))]} data-testid="bulk-operator-major" />
      </label>
      <p className="mb-4 text-sm leading-relaxed">{OPERATOR_NOTICE}</p>
      {load.status === 'pending' && (
        <div className="space-y-2" aria-busy="true" data-testid="status-bulk-pending">
          <p className="text-sm text-muted-foreground" role="status">공식 학과 목록을 불러오고 있어요…</p>
          {[0, 1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/60" />)}
        </div>
      )}
      {load.status === 'error' && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4" role="alert" data-testid="status-bulk-error">
          <p className="font-semibold">학과 목록을 불러오지 못했어요</p>
          <p className="mt-1 text-sm text-muted-foreground">대신 임의 자료를 보여 주지 않아요. 네트워크를 확인한 뒤 다시 시도해 주세요.</p>
          <p className="mt-1 break-words text-xs text-muted-foreground">{t(load.message)}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setAttempt(a => a + 1)} data-testid="button-bulk-retry"><RotateCw className="h-4 w-4" />다시 시도</Button>
        </div>
      )}
      {data && totals && <>
        <p className="mb-3 text-base" data-testid="text-bulk-summary">{formatMessage('{0}개 국가 · 학교·캠퍼스 연결 {1}개 · 폐과 표시만 있는 묶음을 제외한 학과명 묶음 {2}개', [totals.countryCount, totals.schoolCampusKeys, totals.nonClosedGroups])}</p>
        <p className="mb-3 text-sm">같은 학교 연결과 같은 공식 학과명은 한 결과로 묶어요. 비슷한 이름의 학과를 같은 전공으로 확정하지 않으며, 자료 연도 이후 개편·모집 여부는 원문에서 확인해 주세요.</p>
        <details className="mb-4 text-sm">
          <summary className="cursor-pointer">자료 범위와 집계 기준</summary>
          <p className="mt-2">{formatMessage('원자료 {0}건 · 폐과·중단 표시 {1}건 · 같은 학교·학과명 반복 기록 {2}건 · 전체 학과명 묶음 {3}개', [totals.records, totals.closedRecords, totals.repeatedNameRecords, totals.programmeGroups])}</p>
          <p>{formatMessage('학과명 묶음 기준: 소개 확인 {0}개 · 구체 교육과정 확인 {1}개. 나머지는 목록 확인이며 수업 내용을 확인했다는 뜻이 아니에요.', [totals.introductionGroups, totals.curriculumGroups])}</p>
          <p>학교·캠퍼스 연결 수는 독립 대학 수가 아니며, 학과명 묶음은 현재 모집하는 고유 전공 수가 아니에요. 학과·학부·학위 과정·모집단위와 과거 이력이 포함돼요.</p>
        </details>
        {operatorMajor !== ALL && <p className="mb-3 rounded-lg border p-3" data-testid="bulk-active-operator">{formatMessage('현재 관심 학과 운영 대학 조건: {0}. 전체 자료를 보려면 검색·필터를 초기화해 주세요.', [t(MAJORS.find(m => m.id === operatorMajor)?.name || operatorMajor)])}</p>}
        <details className="mb-4 rounded-lg bg-muted/50 p-3 text-xs">
          <summary className="cursor-pointer font-semibold">출처별 수록 범위</summary>
          <ul className="mt-2 space-y-1.5">
            {data.sources.map(x => (
              <li key={x.id} className="break-words">
                <bdi data-i18n-original>{x.title}</bdi> · {x.year} · {t('확인일')} {x.checkedAt} · {formatMessage('공식 보고 {0}건 중 {1}건 수록', [x.reportedCount, x.importedCount])}
                {x.scope && <> · {t(x.scope)}</>}
                {x.url && <> <a href={x.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">원문<ExternalLink className="h-3 w-3" aria-hidden /></a></>}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-muted-foreground">출처가 다루는 범위 밖의 학교·학과는 없을 수 있어요. 목록에 있다는 것만으로 개설 여부나 교육과정을 보장하지 않으니 원문을 함께 확인하세요.</p>
        </details>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative sm:col-span-2 lg:col-span-4">
            <span className="sr-only">{t('학교·학과·관심 키워드 검색')}</span>
            <Search className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden />
            <TextIn value={q} onChange={set(setQ)} placeholder="학교·학과·관심 키워드 검색 (원어·한국어·별칭)" className="ps-9" data-testid="bulk-search" />
          </label>
          <Select aria-label={t('국가')} value={country} onChange={e => { setCountry(e.target.value); setRegion(ALL); setPage(0); }} options={[{ value: ALL, label: t('모든 국가') }, ...countries.map(x => ({ value: x, label: x }))]} data-testid="bulk-country" />
          <Select aria-label={t('지역')} value={region} onChange={set(setRegion)} options={[{ value: ALL, label: t('모든 지역') }, ...regions.map(x => ({ value: x, label: x }))]} data-testid="bulk-region" />
          <Select aria-label={t('학교 유형')} value={type} onChange={set(setType)} options={[{ value: ALL, label: t('모든 학교 유형') }, ...types.map(x => ({ value: x, label: x }))]} data-testid="bulk-school-type" />
          <Select aria-label={t('계열')} value={category} onChange={set(setCategory)} options={[{ value: ALL, label: t('모든 계열') }, ...categories.map(x => ({ value: x, label: x }))]} data-testid="bulk-category" />
          <Select aria-label={t('확인 수준')} value={level} onChange={set(setLevel)} options={[{ value: ALL, label: t('모든 확인 수준') }, { value: 'curriculum', label: t('교육과정 확인') }, { value: 'introduction', label: t('학과 소개 확인') }, { value: 'listing', label: t('목록만') }, { value: 'closed', label: t('폐지·모집 중단 표시') }]} data-testid="bulk-level" />
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={includeClosed} onChange={e => { setIncludeClosed(e.target.checked); setPage(0); }} data-testid="bulk-include-closed" />폐과 이력 포함</label>
          <button type="button" onClick={() => { setOnlyMine(!onlyMine); setPage(0); }} aria-pressed={onlyMine} data-testid="bulk-history"
            className={cn('rounded-lg border px-4 py-2 text-start text-sm transition', onlyMine && 'bg-foreground text-background')}>저장·비교·선택한 기록만</button>
        </div>
        {refusal && <p className="mt-3 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground" role="alert" data-testid="text-bulk-compare-refusal">{refusal}</p>}

        <p ref={listTop} className={cn('mt-4 text-sm text-muted-foreground transition-opacity', stale && 'opacity-60')} aria-live="polite" data-testid="text-bulk-count">
          {formatMessage('{0}개 학과명 묶음 중 {1}–{2}', [list.length, list.length ? cur * PAGE + 1 : 0, cur * PAGE + rows.length])}
        </p>
        {rows.length === 0 ? <div className="mt-3"><Empty title="조건에 맞는 학과 기록이 없어요" desc="현재 확보한 공식 자료에서 찾지 못했어요. 실제 학과가 없다는 뜻은 아니에요. 검색·필터를 초기화하거나 대학 공식 원문을 확인해 주세요." /></div> : (
          <ul className={cn('mt-3 space-y-3 transition-opacity', stale && 'opacity-60')}>
            {rows.map(({ row, inst, records, memberIds }) => {
              const src = sources.get(row.sourceId);
              const pid = row.id;
              const isSaved = memberIds.some(id => saved.includes(id)); const inCmp = memberIds.some(id => compare.includes(id)); const isTemp = memberIds.includes(s.tempProgram || '');
              const closed = isClosed(row);
              const koAliases = row.aliases.filter(a => a && a !== row.name);
              const lang = row.language || undefined;
              return (
                <li key={row.id} className={cn('rounded-2xl border bg-card p-4', isTemp && 'border-primary ring-2 ring-primary/20', closed && 'border-dashed bg-muted/30')} data-testid={`bulk-row-${row.id}`}>
                  <div className="flex flex-wrap gap-1">
                    <Tag tone={row.level === 'curriculum' ? 'teal' : row.level === 'introduction' ? 'navy' : 'outline'}>{t(levelLabel[row.level])}</Tag>
                    {closed && <Tag tone="coral">{t('폐지·모집 중단 표시')} · <bdi data-i18n-original>{row.lifecycle}</bdi></Tag>}
                    <Tag tone="outline">{t(recordLabel[row.recordType])}</Tag>
                    {row.facultyCommon && <Tag tone="outline">{t('학부·학과 공통 안내')}</Tag>}
                    {row.category && <Tag>{t('LAB 탐색 분야')} · {t(row.category)}</Tag>}
                    {inst && <Tag>{t(inst.country)}{inst.region ? ` · ${t(inst.region)}` : ''}</Tag>}
                    {inst?.schoolType && <Tag>{t(inst.schoolType)}</Tag>}
                  </div>
                  <h3 className="mt-2 break-words font-display text-lg font-bold">
                    <PublicText text={inst?.name || row.institutionId} sourceLanguage={lang} original />
                  </h3>
                  <p className="break-words"><PublicText text={row.name} sourceLanguage={lang} original /></p>
                  {koAliases.length > 0 && <p className="mt-0.5 break-words text-xs text-muted-foreground">{t('검색 별칭·분류')}: {koAliases.map((a, i) => <span key={i}>{i > 0 && ', '}<PublicText text={a} sourceLanguage={lang} /></span>)}</p>}
                  {row.level === 'listing' ? (
                    <p className="mt-2 text-sm text-muted-foreground">공식 목록에 이름만 있는 기록이에요. 소개나 교육과정은 원문에서 직접 확인해야 해요.</p>
                  ) : (
                    <div className="mt-2 space-y-1 text-sm">
                      {row.overview && <p className="break-words leading-relaxed"><PublicText text={row.overview} sourceLanguage={lang} /></p>}
                      {row.level === 'curriculum' && row.courses.length > 0 && <p className="break-words text-xs"><span className="text-muted-foreground">{t('공식 과목 예')}: </span>{row.courses.slice(0, 6).map((c, i) => <span key={i}>{i > 0 && ', '}<PublicText text={c.name} sourceLanguage={lang} /></span>)}{row.courses.length > 6 && formatMessage(' 외 {0}개', [row.courses.length - 6])}</p>}
                      {row.overview && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">{t('공식 원문 발췌')}</summary><bdi lang={lang} data-i18n-original>{row.overview}</bdi></details>}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">{t('현지어 명칭과 설명은 이해를 돕는 앱 번역이며 대학의 공식 번역이 아니에요. 공식 원문 페이지 자체를 번역한 것은 아니에요.')}</p>
                  <p className="mt-2 break-words text-xs text-muted-foreground">
                    {t('출처')} {src ? <bdi data-i18n-original>{src.title}</bdi> : row.sourceId}{row.academicVersion && <> · <bdi data-i18n-original>{t(row.academicVersion)}</bdi></>}{src && <> · {t('확인일')} {src.checkedAt}</>}
                    {row.url && <> · <a href={row.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">원문<ExternalLink className="h-3 w-3" aria-hidden /></a></>}
                  </p>
                  {records.length > 1 && <details className="mt-2 text-sm" data-testid={`bulk-evidence-${row.id}`}>
                    <summary className="cursor-pointer">{formatMessage('같은 학과명의 원자료 {0}건과 출처 보기', [records.length])}</summary>
                    <ul className="mt-2 space-y-2">
                      {records.map(record => <li key={record.id} className="rounded-lg border p-2">
                        <PublicText text={record.name} sourceLanguage={record.language} />
                        {' · '}{t(levelLabel[record.level])}
                        {record.academicVersion && <> · <bdi data-i18n-original>{record.academicVersion}</bdi></>}
                        {isClosed(record) && <> · {t('폐지·모집 중단 표시')}</>}
                        {' · '}<a href={record.url} target="_blank" rel="noreferrer" className="text-primary underline">{t('원문')}</a>
                      </li>)}
                    </ul>
                  </details>}
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                    <Button size="sm" variant={isSaved ? 'secondary' : 'outline'} onClick={() => toggleSave(row)} aria-pressed={isSaved} data-testid={`bulk-save-${row.id}`}>{isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{isSaved ? '저장됨' : '저장'}</Button>
                    <Button size="sm" variant={inCmp ? 'secondary' : 'outline'} onClick={() => toggleCompare(row)} aria-pressed={inCmp} data-testid={`bulk-compare-${row.id}`}>{inCmp ? '비교 중' : '비교'}</Button>
                    <Button size="sm" variant={isTemp ? 'default' : 'outline'} onClick={() => pick(row)} aria-pressed={isTemp} data-testid={`bulk-select-${row.id}`}>{isTemp ? '임시 선택됨' : '임시 선택'}</Button>
                    <Button size="sm" variant="outline" onClick={() => withProgram(row, onInspect)} data-testid={`bulk-inspect-${row.id}`}><FileSearch className="h-4 w-4" />자세히</Button>
                    <Button size="sm" variant="outline" onClick={() => plan(row)} data-testid={`bulk-plan-${row.id}`}><NotebookPen className="h-4 w-4" />{row.level === 'listing' ? '원문 찾아 읽기 계획' : '자료 읽기 계획'}</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {pages > 1 && (
          <nav className="mt-4 flex flex-wrap items-center justify-center gap-2" aria-label={t('페이지 이동')}>
            <Button size="sm" variant="outline" disabled={cur === 0} onClick={() => go(0)} data-testid="bulk-first">{t('첫 페이지')}</Button>
            <Button size="sm" variant="outline" disabled={cur === 0} onClick={() => go(cur - 1)} data-testid="bulk-prev"><ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />{t('이전')}</Button>
            <span className="text-sm" data-testid="text-bulk-page" data-page={cur+1} data-pages={pages}>{cur + 1} / {pages}</span>
            <Button size="sm" variant="outline" disabled={cur >= pages - 1} onClick={() => go(cur + 1)} data-testid="bulk-next">{t('다음')}<ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden /></Button>
            <Button size="sm" variant="outline" disabled={cur >= pages - 1} onClick={() => go(pages - 1)} data-testid="bulk-last">{t('마지막 페이지')}</Button>
            <form className="flex max-w-full flex-wrap items-center justify-center gap-2" onSubmit={e => {
              e.preventDefault();
              const n = Number(new FormData(e.currentTarget).get('page'));
              if (Number.isInteger(n) && n >= 1 && n <= pages) go(n - 1);
            }}>
              <input key={cur} type="number" name="page" min={1} max={pages} defaultValue={cur + 1}
                aria-label={t('이동할 페이지 번호')} className="min-h-11 w-24 rounded-lg border bg-background px-3 text-foreground" data-testid="bulk-page-input" />
              <Button size="sm" type="submit" variant="outline" data-testid="bulk-page-go">{t('페이지로 이동')}</Button>
            </form>
          </nav>
        )}
      </>}
    </Panel>
    </div>
  );
}

export default BulkUniversityCatalogue;
