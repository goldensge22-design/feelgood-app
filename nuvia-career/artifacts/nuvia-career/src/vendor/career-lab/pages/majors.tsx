import { useEffect, useMemo, useState } from 'react';
import { useSearch } from 'wouter';
import { Bookmark, BookmarkCheck, Plus, Trash2, ExternalLink, Search } from 'lucide-react';
import { useLab } from '@/vendor/career-lab/lib/store';
import { COUNTRIES, FIELDS, MAJORS, majorById, type Major } from '@/vendor/career-lab/lib/catalog';
import { today, uid } from '@/vendor/career-lab/lib/types';
import { PageHeader, Panel, Empty, Tag, TextIn, Select, Confirm, LField } from '@/vendor/career-lab/components/lab/ui';
import { TryActions } from '@/vendor/career-lab/components/lab/try-actions';
import { UniversityExplorer, removeStudentLink } from '@/vendor/career-lab/components/lab/university-explorer';
import { programById } from '@/vendor/career-lab/lib/universities';
import { Button } from '@/vendor/career-lab/components/ui/button';
import { cn } from '@/vendor/career-lab/lib/utils';
import { MajorRecommendations } from '@/vendor/career-lab/components/lab/major-recommendations';
import { RECOMMENDATION_NOTICE } from '@/vendor/career-lab/lib/recommendation-policy';
import { formatMessage } from '@/vendor/career-lab/lib/i18n-runtime';

function LinkForm({ majorId, onDone }: { majorId: string; onDone: () => void }) {
  const { update } = useLab();
  const [f, setF] = useState({ university: '', country: '한국', url: '', note: '' });
  const [err, setErr] = useState('');
  const save = () => {
    if (!f.university.trim()) return setErr('대학 이름을 적어 주세요.');
    try {
      const url = new URL(f.url);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('invalid');
    } catch { return setErr('실제 공식 페이지의 올바른 https:// 주소를 적어 주세요.'); }
    update(d => { d.uniLinks.push({ id: uid(), majorId, ...f, verified: false, verifiedDate: '' }); }); onDone();
  };
  return (
    <div className="grid gap-2 rounded-lg bg-muted/50 p-3 md:grid-cols-2">
      <TextIn placeholder="대학 이름" value={f.university} onChange={e => setF({ ...f, university: e.target.value })} data-testid="input-uni-name" />
      <Select value={f.country} onChange={e => setF({ ...f, country: e.target.value })} options={COUNTRIES.map(c => ({ value: c, label: c }))} />
      <TextIn placeholder="공식 학과 페이지 링크" value={f.url} onChange={e => setF({ ...f, url: e.target.value })} className="md:col-span-2" data-testid="input-uni-url" />
      <TextIn placeholder="메모 (예: 융합전공 있음 — 직접 확인 필요)" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} className="md:col-span-2" />
      {err && <p className="text-sm text-destructive md:col-span-2">{err}</p>}
      <div className="flex justify-end gap-2 md:col-span-2"><Button size="sm" variant="ghost" onClick={onDone}>취소</Button><Button size="sm" onClick={save} data-testid="button-save-uni">저장 (미확인)</Button></div>
    </div>
  );
}

function MajorDetail({ m }: { m: Major }) {
  const { state: s, update } = useLab();
  const [adding, setAdding] = useState(false);
  const links = s.uniLinks.filter(l => l.majorId === m.id);
  return (
    <div className="rise space-y-4 text-sm">
      <p className="rounded-lg bg-secondary/50 p-3 text-secondary-foreground"><b>다루는 질문</b> — {m.questions}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div><b>무엇을 공부하나</b><ul className="mt-1 list-disc pl-5">{m.study.map(x => <li key={x}>{x}</li>)}</ul></div>
        <div><b>예시 과제·프로젝트</b><ul className="mt-1 list-disc pl-5">{m.projects.map(x => <li key={x}>{x}</li>)}</ul></div>
        <p><b>공부 방식</b> {m.style}</p>
        <p><b>고교 관련 과목</b> {m.hsSubjects.join(', ')}</p>
        <p className="md:col-span-2"><b>전공 선택·융합 기회</b> {m.fusion}</p>
      </div>
      <p className="text-xs text-muted-foreground">위 내용은 여러 대학에 공통으로 볼 수 있는 일반 안내예요. 특정 대학의 교육과정·입시와 다를 수 있어요.</p>
      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between"><b>내가 찾은 대학 공식 링크</b>{!adding && <Button size="sm" variant="outline" onClick={() => setAdding(true)} data-testid={`button-add-uni-${m.id}`}><Plus className="h-4 w-4" />링크 저장</Button>}</div>
        {adding && <div className="mt-3"><LinkForm majorId={m.id} onDone={() => setAdding(false)} /></div>}
        {links.length === 0 && !adding && <p className="mt-2 text-muted-foreground">대학별 정보는 공식 홈페이지에서 직접 확인해 저장해요. 이 앱은 대학 정보를 지어내지 않아요.</p>}
        <ul className="mt-3 space-y-2">{links.map(l => (
          <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 p-2.5">
            <span className="font-semibold">{l.university}</span><Tag tone="outline">{l.country}</Tag>
            {l.verified ? <Tag tone="teal">내가 확인함 · {l.verifiedDate}</Tag> : <Tag tone="coral">미확인</Tag>}
            {l.url && <a href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">공식 페이지<ExternalLink className="h-3 w-3" /></a>}
            {(l.programOriginal || l.academicVersion) && <span className="text-xs text-muted-foreground"><bdi>{l.programOriginal}</bdi>{l.academicVersion ? ` · ${l.academicVersion}` : ''}</span>}
            {l.note && <span className="w-full text-muted-foreground">{l.note}</span>}
            <span className="ml-auto flex gap-1">
              <button onClick={() => update(d => { const x = d.uniLinks.find(y => y.id === l.id)!; x.verified = !x.verified; x.verifiedDate = x.verified ? today() : ''; })} className="rounded px-2 py-1 text-xs hover:bg-background" data-testid={`button-verify-${l.id}`}>{l.verified ? '미확인으로' : '공식 페이지에서 직접 확인했어요'}</button>
              <Confirm title="이 링크를 삭제할까요?" desc="저장한 대학 링크가 사라져요." onConfirm={() => update(d => removeStudentLink(d, l.id))} trigger={o => <button onClick={o} aria-label="삭제" className="rounded p-1 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>} />
            </span>
          </li>
        ))}</ul>
      </div>
    </div>
  );
}

export default function Majors() {
  const { state: s, update } = useLab();
  const initial = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('m') ?? '' : '';
  const [q, setQ] = useState(''); const [country, setCountry] = useState('전체'); const [field, setField] = useState('전체'); const [onlySaved, setOnlySaved] = useState(false);
  const [open, setOpen] = useState(initial);
  const search=useSearch();
  useEffect(()=>{const params=new URLSearchParams(search);const id=params.get('m');if(id)setOpen(id);if(params.get('operatorMajor'))requestAnimationFrame(()=>document.getElementById('operator-universities')?.scrollIntoView({block:'start'}));},[search]);
  const list = useMemo(() => MAJORS.filter(m =>
    (!q || (m.name + m.en + m.questions).toLowerCase().includes(q.toLowerCase())) &&
    (country === '전체' || m.countries.includes(country) || s.uniLinks.some(l => l.majorId === m.id && l.country === country)) &&
    (field === '전체' || m.fields.includes(field)) && (!onlySaved || s.savedMajors.includes(m.id))), [q, country, field, onlySaved, s.savedMajors, s.uniLinks]);
  const toggleSave = (id: string) => update(d => { d.savedMajors = d.savedMajors.includes(id) ? d.savedMajors.filter(x => x !== id) : [...d.savedMajors, id]; if (!d.savedMajors.includes(id)) { d.compare = d.compare.filter(x => x !== id); if (d.tempMajor === id) d.tempMajor = ''; } if (d.tempProgram && programById(d, d.tempProgram)?.majorId !== d.tempMajor) d.tempProgram = ''; });
  const toggleCompare = (id: string) => update(d => { d.compare = d.compare.includes(id) ? d.compare.filter(x => x !== id) : [...d.compare, id].slice(-3); });
  const pickTemp = (id: string) => update(d => { d.tempMajor = d.tempMajor === id ? '' : id; if (d.tempMajor) { d.tempHistory.push({ majorId: id, date: today() }); if (!d.savedMajors.includes(id)) d.savedMajors.push(id); } if (d.tempProgram && programById(d, d.tempProgram)?.majorId !== d.tempMajor) d.tempProgram = ''; });
  const cmp = s.compare.map(majorById).filter(Boolean) as Major[];
  const rows: [string, (m: Major) => string][] = [['다루는 질문', m => m.questions], ['공부', m => m.study.join(', ')], ['예시 프로젝트', m => m.projects.join(', ')], ['공부 방식', m => m.style], ['고교 과목', m => m.hsSubjects.join(', ')], ['융합 기회', m => m.fusion], ['길러지는 역량', m => m.competencies.join(', ')], ['내가 저장한 대학', m => s.uniLinks.filter(l => l.majorId === m.id).map(l => `${l.university}(${l.verified ? '확인' : '미확인'})`).join(', ') || '없음']];
  return (
    <div>
      <PageHeader step="STEP 04" title="국내외 대학·학과" desc="전국·해외 공개 자료에서 학과를 찾고, 추천과 비교하며 나의 탐색으로 이어가요. 임시 선택은 언제든 바꿀 수 있어요." />
      <nav className="mb-6 flex flex-wrap gap-3" aria-label="학과 탐색 이동">
        <a href="#full-catalogue" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground" data-testid="button-majors-full-catalogue">전국·해외 학과 전체 목록</a>
        <a href="#recommendations" className="inline-flex min-h-11 items-center rounded-xl border px-5 py-3 text-sm font-semibold">학과 추천</a>
      </nav>
      <div id="recommendations" className="scroll-mt-24"><MajorRecommendations /></div>
      <div id="operator-universities" className="scroll-mt-24 rounded-xl border border-primary/30 bg-secondary/40 p-5 mb-6 text-base leading-relaxed" data-testid="university-recommendation-notice">
        <h2 className="font-bold mb-2">관심 학과 운영 대학 찾기</h2>
        <p>{RECOMMENDATION_NOTICE}</p>
      </div>
      <Panel tone="teal" className="mb-6" title="임시 선택" hint="확정이 아니라 지금 가장 궁금한 학과예요. 진로 설계에 쓰여요.">
        {s.tempMajor ? <p className="font-display text-2xl font-bold" data-testid="text-temp-major">{majorById(s.tempMajor)?.name}</p> : <p className="text-muted-foreground">아직 없어요. 아래 학과에서 ‘임시 선택’을 눌러 보세요. (전공 미정이어도 괜찮아요)</p>}
        {s.tempHistory.length > 0 && <p className="mt-2 text-xs text-muted-foreground">변경 기록: {s.tempHistory.slice(-5).map(h => `${majorById(h.majorId)?.name}(${h.date})`).join(' → ')}</p>}
      </Panel>

      <UniversityExplorer />

      {cmp.length > 0 && (
        <Panel className="mb-6" title={`학과 비교 (${cmp.length}/3)`} action={<button onClick={() => update(d => { d.compare = []; })} className="text-sm text-muted-foreground hover:underline">비우기</button>}>
          <p className="mb-4 rounded-xl border border-primary/20 bg-secondary/40 p-4 text-base leading-relaxed" role="note" data-testid="general-comparison-notice">{RECOMMENDATION_NOTICE}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm"><thead><tr><th className="w-28" />{cmp.map(m => <th key={m.id} className="p-2 text-left font-display text-lg">{m.name}</th>)}</tr></thead>
              <tbody>{rows.map(([l, fn]) => <tr key={l} className="border-t align-top"><td className="p-2 font-semibold text-muted-foreground">{l}</td>{cmp.map(m => <td key={m.id} className="p-2">{fn(m)}</td>)}</tr>)}</tbody></table>
          </div>
        </Panel>
      )}

      <section className="mb-4 border-t-2 border-dashed pt-6" aria-labelledby="general-guides-title" data-testid="section-general-major-guides">
        <h2 id="general-guides-title" className="font-display text-xl font-bold">{formatMessage('일반 학과 안내 ({0}개)', [MAJORS.length])}</h2>
        <p className="mt-1 text-sm text-muted-foreground">여러 대학에 공통으로 볼 수 있는 학과 계열 학습 안내예요. 대학이나 개설 학과를 찾는 검색이 아니에요. 대학·학과는 위의 전체 공개 목록에서 찾아 주세요.</p>
      </section>
      <div className="mb-6 grid gap-3 md:grid-cols-[1fr_10rem_12rem_auto]">
        <div className="relative"><Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" /><TextIn value={q} onChange={e => setQ(e.target.value)} placeholder="일반 학과 안내·질문 검색" aria-label="일반 학과 안내 검색" className="ps-9" data-testid="input-major-search" /></div>
        <LField label=""><Select value={country} onChange={e => setCountry(e.target.value)} options={['전체', ...COUNTRIES].map(c => ({ value: c, label: c === '전체' ? '모든 국가' : c }))} data-testid="select-country" /></LField>
        <Select value={field} onChange={e => setField(e.target.value)} options={[{ value: '전체', label: '모든 분야' }, ...FIELDS.map(f => ({ value: f.id, label: f.name }))]} data-testid="select-field" />
        <button onClick={() => setOnlySaved(!onlySaved)} aria-pressed={onlySaved} className={cn('rounded-lg border px-4 text-sm', onlySaved && 'bg-foreground text-background')}>저장한 학과만</button>
      </div>
      {country !== '전체' && <p className="-mt-3 mb-4 text-xs text-muted-foreground">국가 필터: 그 나라에서 일반적으로 개설되는 학과 계열 또는 내가 그 나라 대학 링크를 저장한 학과를 보여줘요. 특정 대학 개설 여부는 공식 홈페이지로 확인하세요.</p>}
      {list.length === 0 ? <Empty title="조건에 맞는 학과가 없어요" desc="검색어나 필터를 바꿔 보세요." /> : (
        <div className="space-y-4">{list.map(m => {
          const saved = s.savedMajors.includes(m.id); const isOpen = open === m.id;
          return (
            <article key={m.id} className={cn('rounded-2xl border bg-card p-5 transition md:p-6', s.tempMajor === m.id && 'border-primary ring-2 ring-primary/20')} data-testid={`card-major-${m.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button className="text-left" onClick={() => setOpen(isOpen ? '' : m.id)} aria-expanded={isOpen}>
                  <h3 className="font-display text-xl font-bold">{m.name} <span className="font-sans text-sm font-normal text-muted-foreground">{m.en}</span></h3>
                  <p className="mt-1 text-sm text-muted-foreground">{m.questions}</p>
                  <div className="mt-2 flex flex-wrap gap-1">{m.fields.map(f => <Tag key={f}>{FIELDS.find(x => x.id === f)?.name}</Tag>)}</div>
                </button>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant={saved ? 'secondary' : 'outline'} onClick={() => toggleSave(m.id)} data-testid={`button-save-major-${m.id}`}>{saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{saved ? '저장됨' : '저장'}</Button>
                  <Button size="sm" variant={s.compare.includes(m.id) ? 'secondary' : 'outline'} onClick={() => toggleCompare(m.id)} data-testid={`button-compare-${m.id}`}>{s.compare.includes(m.id) ? '비교 중' : '비교'}</Button>
                  <Button size="sm" variant={s.tempMajor === m.id ? 'default' : 'outline'} onClick={() => pickTemp(m.id)} data-testid={`button-temp-${m.id}`}>{s.tempMajor === m.id ? '임시 선택됨' : '임시 선택'}</Button>
                </div>
              </div>
              {isOpen && <div className="mt-5 border-t pt-5"><MajorDetail m={m} /></div>}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm"><span>작은 실험: {m.tryIt}</span><TryActions sourceType="major" sourceId={m.id} sourceLabel={m.name} suggestion={m.tryIt} /></div>
            </article>
          );
        })}</div>
      )}
    </div>
  );
}
