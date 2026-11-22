import { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Search } from 'lucide-react';
import raw from '@/vendor/career-lab/lib/data/university-directory.json';
import foreignRaw from '@/vendor/career-lab/lib/data/foreign-university-directory.json';
import searchAliases from '@/vendor/career-lab/lib/data/institution-search-aliases.json';
import { useLocale } from '@/vendor/career-lab/lib/locale';
import { formatMessage } from '@/vendor/career-lab/lib/i18n-runtime';
import { Empty, Tag, TextIn, Select } from '@/vendor/career-lab/components/lab/ui';
import { Button } from '@/vendor/career-lab/components/ui/button';
import { PublicText } from './public-text';

/** 등록부 학교·캠퍼스 단위 목록. 독립 대학 수나 확인된 교육과정을 뜻하지 않는다. */
export interface DirectoryEntry {
  id: string; name: string; campus: string; countryCode: string; country: string; region: string;
  schoolType: string; sector: string; establishment: string; sourceUrl: string; detailUrl: string;
  sourceTitle: string; sourceYear: string; checkedAt: string; sourceLanguage: string; listingOnly: true;
}
export const DIRECTORY: DirectoryEntry[] = [...raw, ...foreignRaw] as DirectoryEntry[];
const SEARCH_ALIASES: Record<string, {ko?: string; en?: string}> = searchAliases;

const ALL = '__all';
const PAGE = 20;
const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean))).sort((a, b) => a.localeCompare(b));

export function UniversityDirectory({ onFindPrograms }: { onFindPrograms: (name: string) => void }) {
  const { t, effectiveLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [country, setCountry] = useState(ALL);
  const [region, setRegion] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [sector, setSector] = useState(ALL);
  const [page, setPage] = useState(0);

  const countries = useMemo(() => uniq(DIRECTORY.map(r => r.country)), []);
  const regions = useMemo(() => uniq(DIRECTORY.filter(r => country === ALL || r.country === country).map(r => r.region)), [country]);
  const types = useMemo(() => uniq(DIRECTORY.map(r => r.schoolType)), []);
  const sectors = useMemo(() => uniq(DIRECTORY.map(r => r.sector)), []);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return DIRECTORY.filter(r => (!s || `${r.name} ${t(r.name)} ${SEARCH_ALIASES[r.name]?.ko || ''} ${SEARCH_ALIASES[r.name]?.en || ''} ${r.campus} ${r.region} ${r.country}`.toLowerCase().includes(s)) &&
      (country === ALL || r.country === country) && (region === ALL || r.region === region) &&
      (type === ALL || r.schoolType === type) && (sector === ALL || r.sector === sector));
  }, [q, country, region, type, sector, effectiveLocale]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const rows = list.slice(cur * PAGE, cur * PAGE + PAGE);
  const reset = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(0); };
  const opt = (xs: string[], all: string) => [{ value: ALL, label: t(all) }, ...xs.map(x => ({ value: x, label: t(x) }))];
  const nCountries = countries.length;

  return (
    <section className="mt-6 rounded-xl border" data-testid="section-university-directory">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="university-directory-body"
        className="flex w-full items-start justify-between gap-3 p-4 text-start" data-testid="button-toggle-directory">
        <span className="min-w-0">
          <b className="block">학교 목록 (등록부 기준)</b>
          <span className="mt-1 block text-sm text-muted-foreground" data-testid="text-directory-summary">
            {formatMessage('공식 목록의 학교·기관 {0}건, {1}개 국가. 상세 교육과정 확인 건수와는 달라요.', [DIRECTORY.length, nCountries])}
          </span>
        </span>
        <ChevronDown className={`mt-1 h-5 w-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div id="university-directory-body" className="border-t p-4">
          <p className="mb-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">캠퍼스·공시·보고 단위를 포함하므로 독립된 대학 수와 달라요. 국가마다 확보한 범위가 다르며, 세계 모든 대학의 목록은 아니에요. 목록 등록만으로 학과나 교육과정을 확인한 것은 아니니 공식 출처도 함께 살펴보세요.</p>
          {DIRECTORY.length === 0 ? <Empty title="학교 목록을 준비하고 있어요" desc="등록부 자료가 연결되면 여기에 표시돼요." /> : <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="relative sm:col-span-2 lg:col-span-4">
                <span className="sr-only">{t('학교 이름·캠퍼스 검색')}</span>
                <Search className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden />
                <TextIn value={q} onChange={e => reset(setQ)(e.target.value)} placeholder="학교 이름·캠퍼스 검색 (원어 포함)" className="ps-9" data-testid="input-directory-search" />
              </label>
              <Select aria-label={t('국가')} value={country} onChange={e => { reset(setCountry)(e.target.value); setRegion(ALL); }} options={opt(countries, '모든 국가')} data-testid="select-directory-country" />
              <Select aria-label={t('지역')} value={region} onChange={e => reset(setRegion)(e.target.value)} options={opt(regions, '모든 지역')} data-testid="select-directory-region" />
              <Select aria-label={t('학교 유형')} value={type} onChange={e => reset(setType)(e.target.value)} options={opt(types, '모든 학교 유형')} data-testid="select-directory-type" />
              <Select aria-label={t('학제 구분')} value={sector} onChange={e => reset(setSector)(e.target.value)} options={opt(sectors, '모든 학제 구분')} data-testid="select-directory-sector" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground" aria-live="polite" data-testid="text-directory-count">{formatMessage('{0}곳 중 {1}–{2}', [list.length, list.length ? cur * PAGE + 1 : 0, cur * PAGE + rows.length])}</p>
            {rows.length === 0 ? <div className="mt-3"><Empty title="조건에 맞는 학교가 없어요" desc="검색어나 필터를 바꿔 보세요." /></div> : (
              <ul className="mt-3 divide-y rounded-lg border">
                {rows.map(r => (
                  <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-3" data-testid={`row-directory-${r.id}`}>
                    <div className="min-w-0 flex-[1_1_14rem]">
                      <p className="break-words font-semibold"><PublicText text={r.name} sourceLanguage={r.sourceLanguage} original />{r.campus && <span className="font-normal text-muted-foreground"> · <PublicText text={r.campus} sourceLanguage={r.sourceLanguage} /></span>}</p>
                      <p className="mt-1 break-words text-xs text-muted-foreground">{t('현지어 명칭은 앱 번역이며 대학의 공식 번역이 아니에요.')}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Tag tone="outline">{t('목록만 · 교육과정 미확인')}</Tag>
                        <Tag>{t(r.country)}</Tag>{r.region && <Tag>{t(r.region)}</Tag>}
                        {r.schoolType && <Tag>{t(r.schoolType)}</Tag>}{r.establishment && <Tag>{t(r.establishment)}</Tag>}
                      </div>
                      <p className="mt-1 break-words text-xs text-muted-foreground">{t('출처')} <bdi>{r.sourceTitle}</bdi> · {r.sourceYear} · {t('확인일')} {r.checkedAt}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <a href={r.detailUrl || r.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm text-primary hover:bg-muted" data-testid={`link-directory-source-${r.id}`}>{t('공식 출처')}<ExternalLink className="h-3 w-3" aria-hidden /></a>
                      <Button size="sm" variant="outline" onClick={() => onFindPrograms(r.name.replace(/\(.*\)$/, '').trim())} data-testid={`button-directory-find-${r.id}`}>{t('확인된 프로그램 찾기')}</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {pages > 1 && <Pager cur={cur} pages={pages} setPage={setPage} prefix="directory" />}
          </>}
        </div>
      )}
    </section>
  );
}

export function Pager({ cur, pages, setPage, prefix }: { cur: number; pages: number; setPage: (n: number) => void; prefix: string }) {
  const { t } = useLocale();
  return (
    <nav className="mt-3 flex flex-wrap items-center justify-center gap-2" aria-label={t('페이지 이동')}>
      <Button size="sm" variant="outline" disabled={cur === 0} onClick={() => setPage(cur - 1)} data-testid={`button-${prefix}-prev`}><ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />{t('이전')}</Button>
      <span className="text-sm" data-testid={`text-${prefix}-page`}>{cur + 1} / {pages}</span>
      <Button size="sm" variant="outline" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} data-testid={`button-${prefix}-next`}>{t('다음')}<ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden /></Button>
    </nav>
  );
}
