import { useState } from 'react';
import { Search } from 'lucide-react';
import { loadJSON, saveJSON } from '@/lib/career';
import { REVIEW_ROLES, type ReviewRole, type ReviewRoleId } from '@/lib/review-everyday-model';

const QUERY_KEY = 'review:lab-search:v1';

export function ReviewLabSearch({ role, onRole, children }: {
  role: ReviewRole;
  onRole: (id: ReviewRoleId) => void;
  children: (roles: ReviewRole[]) => React.ReactNode;
}) {
  const [query, setQuery] = useState(() => {
    const value = loadJSON<unknown>(QUERY_KEY);
    return typeof value === 'string' ? value : '';
  });
  const [searched, setSearched] = useState(query);
  const [help, setHelp] = useState(false);
  const [helpCompany, setHelpCompany] = useState('');
  const [helpRole, setHelpRole] = useState(role.id);
  const [helpNeed, setHelpNeed] = useState('');
  const [example, setExample] = useState<{company:string;role:ReviewRole;need:string}|null>(null);
  const [error, setError] = useState(false);
  function search(value: string) {
    setSearched(value.trim());
    setError(!saveJSON(QUERY_KEY, value.trim()));
    setHelp(false);
    setExample(null);
  }
  const terms = searched.toLowerCase().split(/\s+/).filter(Boolean);
  const roles = REVIEW_ROLES.filter(r => {
    const searchable = [r.company, r.job, ...r.needs.flatMap(n => [n.title, n.keyword])].join(' ').toLowerCase();
    return terms.every(term => searchable.includes(term));
  });
  return (
    <div className="mt-4 space-y-3" data-testid="view-review-lab-search">
      <div>
        <h3 className="font-bold">기업 추천·기업 탐색</h3>
        <p className="mt-1 text-xs text-muted-foreground">관심 직무: <strong data-testid="text-review-lab-interest">{role.job}</strong> · 가상 자료만 검색하며 외부 웹이나 실제 채용 정보를 조회하지 않습니다.</p>
      </div>
      <form className="flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); search(query); }}>
        <label className="min-w-48 flex-1 text-sm font-semibold">기업·직무·필요역량 검색
          <input id="review-lab-query" value={query} onChange={e=>setQuery(e.target.value)} maxLength={80} placeholder="예: 교육 운영, 누락 점검"
            className="mt-1 block min-h-11 w-full rounded-lg border bg-card px-3 font-normal" data-testid="input-review-lab-search" />
        </label>
        <button type="submit" className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-blue px-3 text-sm font-semibold text-white" data-testid="button-review-lab-search"><Search className="h-4 w-4" aria-hidden />찾기</button>
        {searched && <button type="button" onClick={()=>{setQuery('');search('');}} className="min-h-11 px-2 text-sm font-semibold text-blue underline" data-testid="button-review-lab-search-reset">전체 보기</button>}
      </form>
      {error && <p role="alert" className="text-sm text-destructive">검색 조건을 이 탭에 보관하지 못했어요. 입력을 유지한 채 다시 검색할 수 있어요.</p>}
      {roles.length ? <>
        <p className="text-xs text-muted-foreground" role="status" data-testid="text-review-lab-search-count">{searched ? `가상 자료 ${roles.length}건을 찾았어요.` : '기업 또는 직무를 바꿔 볼 수 있어요.'}</p>
        {roles.includes(role) && <section className="rounded-lg border bg-blue-soft/50 p-3 text-sm" data-testid="view-review-lab-recommendation">
          <p><strong>가상 추천 · {role.company}</strong></p>
          <p className="mt-1">{role.sourceTitle}에서 관심 직무인 {role.job}의 필요역량을 살펴볼 수 있어요{searched ? ' (입력한 검색 조건 일치)' : ''}. 채용 가능성이나 회사 적합도를 뜻하지 않아요.</p>
          <p className="mt-1 text-xs text-muted-foreground">출처: {role.sourceTitle} · {role.sourceVersion}</p>
        </section>}
        {children(roles)}
      </> : <section className="space-y-2 rounded-xl border p-3" data-testid="view-review-lab-no-data">
        <p role="status" className="font-semibold">조건과 일치하는 자료가 없어요.</p>
        <button type="button" aria-expanded={help} aria-controls="review-lab-help" onClick={()=>setHelp(!help)} className="min-h-11 font-semibold text-blue underline" data-testid="button-review-lab-help">AI로 찾아보기 / 분석 도움받기</button>
        {help && <div id="review-lab-help" className="space-y-2 text-sm" data-testid="view-review-lab-help">
          <p><strong>LAB 검토용 도움 · 합성 응답 · 실제 AI 호출 아님</strong></p>
          <p>찾으려는 조건을 확인한 뒤 예시를 살펴보세요. 이 데모에는 실시간 검색·AI 조사가 연결되지 않았고, 입력을 외부에 보내지 않습니다.</p>
          <form className="grid gap-2 sm:grid-cols-2" onSubmit={e=>{
            e.preventDefault();
            const picked=REVIEW_ROLES.find(item=>item.id===helpRole);
            if(picked) setExample({company:helpCompany.trim(),role:picked,need:helpNeed.trim()});
          }}>
            <label className="min-w-0">찾으려는 기업 또는 조건 (선택)
              <input value={helpCompany} onChange={e=>{setHelpCompany(e.target.value);setExample(null);}} maxLength={80}
                className="mt-1 block min-h-11 w-full rounded-lg border bg-card px-2" data-testid="input-review-lab-help-company" />
            </label>
            <label className="min-w-0">알아볼 직무
              <select value={helpRole} onChange={e=>{setHelpRole(e.target.value as ReviewRoleId);setExample(null);}}
                className="mt-1 block min-h-11 w-full rounded-lg border bg-card px-2" data-testid="select-review-lab-help-role">
                {REVIEW_ROLES.map(item=><option key={item.id} value={item.id}>{item.job}</option>)}
              </select>
            </label>
            <label className="min-w-0 sm:col-span-2">궁금한 역량 (선택)
              <input value={helpNeed} onChange={e=>{setHelpNeed(e.target.value);setExample(null);}} maxLength={80}
                className="mt-1 block min-h-11 w-full rounded-lg border bg-card px-2" data-testid="input-review-lab-help-need" />
            </label>
            <button type="submit" className="min-h-11 justify-self-start rounded-lg bg-blue px-3 text-sm font-semibold text-white" data-testid="button-review-lab-help-preview">탐색 도움 예시 보기</button>
          </form>
          {example && <section className="space-y-3 rounded-xl bg-muted/50 p-3" data-testid="view-review-lab-help-result" aria-live="polite">
            <p className="text-xs text-muted-foreground">합성 응답 · 확인된 회사 정보나 채용 공고가 아닙니다.</p>
            {example.company && <p className="break-words">내가 찾으려는 조건: {example.company} · 이 조건에 맞는 실제 기업은 확인하지 않았어요.</p>}
            <div><h4 className="font-semibold">기업 탐색 후보</h4><p>{example.role.company} · {example.role.job} (합성 자료에서 연결 구조만 살펴보는 예시)</p></div>
            <div><h4 className="font-semibold">역량 가설 · 검토 필요</h4>
              <p className="break-words">{example.need ? `“${example.need}”이(가) 이 직무에서 어떻게 쓰이는지` : `${example.role.needs[0].title}이(가) 직무 자료에 실제로 언급되는지`} 확인해 보세요. 실제 요구 역량으로 확인된 것은 아니에요.</p>
            </div>
            <div><h4 className="font-semibold">확인할 공개자료</h4><ul className="list-disc ps-5"><li>기업 공식 채용 페이지의 {example.role.job} 직무 소개</li><li>공개 채용 공고의 담당 업무·자격 요건·게시일</li></ul></div>
            <button type="button" onClick={()=>{setQuery('');search('');onRole(example.role.id);}}
              className="min-h-11 font-semibold text-blue underline" data-testid="button-review-lab-help-use">가상 후보를 기업·직무 선택에 열기</button>
          </section>}
          <button type="button" onClick={()=>{setHelp(false);document.getElementById('review-lab-query')?.focus();}}
            className="min-h-11 font-semibold text-blue underline" data-testid="button-review-lab-help-back">자료 검색으로 돌아가기</button>
        </div>}
      </section>}
    </div>
  );
}
