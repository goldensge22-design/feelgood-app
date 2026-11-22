import { useContext, useEffect, useRef, useState } from 'react';
import { Building2, ExternalLink, Search } from 'lucide-react';
import { getCareerLabJob, searchCareerLab, type CareerLabResults } from '@workspace/api-client-react';
import { useI18n } from '@/lib/i18n';
import { loadJSON, saveJSON } from '@/lib/career';
import { REVIEW_ROLES, type ReviewRoleId, type ReviewTraitId } from '@/lib/review-everyday-model';
import { reviewBlueAction } from '@/components/review-daily-cards';
import ReviewPartnerPostings from '@/components/review-partner-postings';
import { officialHttps } from '@/lib/review-partner-postings';
import { publicSourceRef, recordReviewAction, reviewPreferences, safeLabTerm, setReviewPreference, type Preference } from '@/lib/review-trail';
import ReviewLabEvidence from './review-lab-evidence';
import { ReviewLabSession } from '@/lib/review-lab-session';
import { matchingReviewedMaterials } from '@/lib/review-lab-reference';
import type { LabConnection } from '@/lib/review-lab-analysis';

type Material = {
  company:string; job:string; source:string; check:string; posted:string; deadline:string; raw:string;
  profile:string; value:string; duties:string; required:string; preferred:string; skillMaterial?:string; synthetic?:boolean;
};
const empty:Material={company:'',job:'',source:'',check:'',posted:'',deadline:'',raw:'',profile:'',value:'',duties:'',required:'',preferred:''};
const fixtures:Material[]=REVIEW_ROLES.map(r=>({...empty,company:r.company,job:r.job,source:r.sourceTitle+' · '+r.sourceVersion,
  profile:`${r.company}의 공개 소개를 살펴보는 방법을 보여 주는 가상 예시입니다.`,value:'이용자가 필요한 안내를 쉽게 찾도록 돕는 것을 중요하게 여긴다는 가상 소개입니다.',
  duties:r.needs.map(n=>n.quote).join('\n'),required:'같은 기준으로 정보를 정리해 설명하기 (가상 공고 예시)',
  preferred:'짧은 안내 자료를 정리해 본 사례 (가상 공고 예시)',
  skillMaterial:r.needs.map(n=>`${n.title} · ${n.quote}`).join('\n'),synthetic:true}));
const shell='min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5';
const field='mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
const SEARCH_KEY='review:lab-search:v1';
const PENDING_KEY='review:lab-search-pending:v1';
const RESULTS_KEY='review:lab-results:v1';
const SEARCH_CONDITION='official-careers-and-public-postings';
type SearchTerms={company:string;job:string;url?:string};
type PendingSearch={terms:SearchTerms;id?:string};
type SavedResults={terms:SearchTerms;results:CareerLabResults};
function publicPageInput(raw:string){
  try{
    const u=new URL(raw);
    if(!publicSourceRef(raw)||u.hash||u.port||!/\.[a-z]{2,}$/i.test(u.hostname)||
      /\.(?:local|internal|localhost|example|test|invalid|onion|home|lan|arpa)$/i.test(u.hostname)||
      /(^|\.)(?:localhost|metadata|127|replit|ngrok|nip|sslip|xip)(\.|$)/i.test(u.hostname)||
      /(?:^|\.)(?:drive\.google\.com|docs\.google\.com|notion\.site|notion\.so|dropbox\.com|sharepoint\.com|bit\.ly|t\.co|tinyurl\.com)$/i.test(u.hostname)||
      /(?:^|\/)(?:private|account|profile|messages|dashboard|admin|internal|share|download|uploads?|student|candidate)(?:\/|$)|%|@|[\w-]{48,}/i.test(u.pathname))return null;
    for(const [k,v] of [...u.searchParams]){
      if(/^(utm_.+|fbclid|gclid|logpath|listno|stext)$/i.test(k)){u.searchParams.delete(k);continue;}
      if(!/^(annoId|recruitId|jobId|id|page|lang|hl|oem_code)$/i.test(k)||!/^[a-zA-Z0-9_-]{1,32}$/.test(v))return null;
    }
    u.searchParams.sort();
    return u.href;
  }catch{return null;}
}
function searchPause(signal:AbortSignal){
  return new Promise<void>((resolve,reject)=>{
    const stop=()=>{window.clearTimeout(timer);reject(signal.reason);};
    const timer=window.setTimeout(()=>{signal.removeEventListener('abort',stop);resolve();},1800);
    if(signal.aborted)stop();else signal.addEventListener('abort',stop,{once:true});
  });
}
function webJobSearch(terms:SearchTerms){
  const q=[terms.company,terms.job,'채용 공식 채용공고'].filter(Boolean).join(' ');
  return `https://www.google.com/search?${new URLSearchParams({q})}`;
}
export type ReviewInterest={company:string; job:string; source:string; synthetic:boolean; lab?:LabConnection};
export function ReviewCompanyLab({role,trait,focus,onUse}: {
  role:ReviewRoleId|null;trait:ReviewTraitId;focus?:ReviewTraitId;onUse:(interest:ReviewInterest)=>boolean;
}) {
  const {t,locale}=useI18n();
  const ko=locale==='ko';
  const preset=role?REVIEW_ROLES.find(r=>r.id===role)?.job ?? '':'';
  const initial=()=>loadJSON<SearchTerms>(SEARCH_KEY)??{company:'',job:preset};
  const [company,setCompany]=useState(()=>initial().company);
  const [job,setJob]=useState(()=>initial().job);
  const [url,setUrl]=useState(()=>initial().url??'');
  const getToken=useContext(ReviewLabSession);
  const previousPending=useRef(loadJSON<PendingSearch|SearchTerms>(PENDING_KEY));
  const initialPending=()=>{
    const old=previousPending.current;
    const terms=old&&'terms'in old?old.terms:old;
    return terms&&JSON.stringify(terms)===JSON.stringify(initial())?terms:null;
  };
  const [search,setSearch]=useState<SearchTerms|null>(initialPending);
  const [saved,setSaved]=useState(()=>loadJSON<SavedResults>(RESULTS_KEY));
  const [results,setResults]=useState<CareerLabResults|null>(()=>saved&&JSON.stringify(saved.terms)===JSON.stringify(initial())?saved.results:null);
  const [isSearching,setSearching]=useState(false);
  const [searchError,setSearchError]=useState(()=>initialPending()?'daily.lab.resumeSearch':'');
  const lastSearch=useRef({signature:'',at:0});
  const request=useRef<AbortController|null>(null);
  useEffect(()=>()=>{request.current?.abort();request.current=null;},[]);
  const companyField=useRef<HTMLInputElement|null>(null);
  const [preferences,setPreferences]=useState(reviewPreferences);
  const [comparison,setComparison]=useState<Material[]>(()=>loadJSON<Material[]>('review:lab-comparison:v1')??[]);
  const [status,setStatus]=useState('');
  const [showExamples,setShowExamples]=useState(false);
  const searchField=useRef<HTMLInputElement|null>(null);
  useEffect(()=>{
    const old=previousPending.current;
    if(getToken&&old&&'terms'in old&&old.id&&initialPending())void submitSearch(true);
  },[getToken]);
  function traceSearchLink(terms:SearchTerms,method:string,tabStatus:string){
    return recordReviewAction('lab.external.open-attempt','public-web-job-search',{...terms,filter:SEARCH_CONDITION,method,tabStatus});
  }
  function resetSearch(){
    request.current?.abort();request.current=null;setSearching(false);setSearch(null);setResults(null);setSearchError('');
  }
  async function submitSearch(retry=false){
    const terms:SearchTerms={company:safeLabTerm(company),job:safeLabTerm(job)};
    if(url.trim()){
      const normalized=publicPageInput(url.trim());
      if(!normalized){
        setSearch(null);setSearchError('simpleStory.linkInvalid');return;
      }
      terms.url=normalized;
    }
    if((company.trim()&&!terms.company)||(job.trim()&&!terms.job)){
      setSearch(null);setSearchError('daily.lab.searchPlain');return;
    }
    if(!terms.company&&!terms.job&&!terms.url){
      setSearch(null);setSearchError('daily.lab.searchEmpty');companyField.current?.focus();return;
    }
    const signature=JSON.stringify(terms),at=Date.now();
    if(request.current || (!retry&&signature===lastSearch.current.signature&&at-lastSearch.current.at<600))return;
    if(!retry&&saved?.results.mode==='gpt-web'&&saved.results.version!=='gpt-cited-lab-v1'&&at-Date.parse(saved.results.retrievedAt)<900_000&&
      JSON.stringify(saved.terms)===signature){setSearch(terms);setResults(saved.results);setSearchError('');return;}
    lastSearch.current={signature,at};
    const previous=loadJSON<PendingSearch|SearchTerms>(PENDING_KEY);
    const jobId=previous&&'terms'in previous&&JSON.stringify(previous.terms)===signature?previous.id:undefined;
    const pending:PendingSearch={terms,id:jobId};
    const persisted=saveJSON(SEARCH_KEY,terms)&&saveJSON(PENDING_KEY,pending)&&recordReviewAction('lab.search.submitted','gpt-web',
      {company:terms.company,job:terms.job,...(terms.url?{ref:publicSourceRef(terms.url)}:{}),filter:SEARCH_CONDITION});
    if(!persisted){setSearchError('daily.failed');return;}
    setSearch(terms);setResults(null);setSearchError('');setSearching(true);
    const controller=new AbortController();request.current=controller;
    try{
      const token=getToken&&await getToken();
      const options:RequestInit={credentials:'same-origin',signal:controller.signal,headers:token?{Authorization:`Bearer ${token}`}:{}};
      let work=jobId?await getCareerLabJob(jobId,options):await searchCareerLab(terms,options);
      if(controller.signal.aborted)return;
      if(!work?.id)throw Error('invalid job');
      if(!jobId&&!saveJSON(PENDING_KEY,{terms,id:work.id}))throw Object.assign(Error('storage'),{status:507});
      const horizon=Date.now()+66_000;
      while(work.state==='pending'){
        if(Date.now()>=horizon)throw Object.assign(Error('wait'),{status:504});
        await searchPause(controller.signal);
        work=await getCareerLabJob(work.id,options);
      }
      if(controller.signal.aborted)return;
      if(work.state==='failed'){
        saveJSON(PENDING_KEY,{terms});
        throw Object.assign(Error('provider'),{status:work.error==='LAB_LINK_UNREADABLE'?422:work.error==='LAB_SEARCH_LIMIT'?429:work.error==='LAB_SEARCH_TIMEOUT'?504:502});
      }
      const value=work.result;
      if(value?.mode!=='gpt-web'||!Array.isArray(value.materials))throw Error('invalid');
      const next={terms,results:value};
      if(saveJSON(RESULTS_KEY,next)&&recordReviewAction('lab.results.shown','gpt-web',{company:terms.company,job:terms.job,
        ...(terms.url?{ref:publicSourceRef(terms.url)}:{}),analysisVersion:value.version,resultIds:value.materials.map(x=>x.id)})){
        setSaved(next);
        saveJSON(PENDING_KEY,null);
      }else setSearchError('daily.failed');
      setResults(value);
    }catch(error){
      if(controller.signal.aborted)return;
      const status=typeof error==='object'&&error&&'status'in error?error.status:null;
      if(status===404)saveJSON(PENDING_KEY,{terms});
      setSearchError(status===422?'simpleStory.linkUnreadable':status===400&&terms.url?'simpleStory.linkInvalid':status===401?'daily.lab.authSearch':status===429?'daily.lab.rateSearch':
        status===507?'daily.failed':status===404?'daily.lab.resumeSearch':
        status===504?'daily.lab.timeoutSearch':status===400?'daily.lab.searchPlain':'daily.lab.failSearch');
    }finally{if(request.current===controller){request.current=null;setSearching(false);}}
  }
  function prefer(kind:Preference['kind'],value:string,source='lab.search'){
    const label=safeLabTerm(value);if(!label)return;
    const pref={id:`${kind}:${label.toLocaleLowerCase()}`,kind,label,source};
    const next=setReviewPreference(pref,true);
    if(next)setPreferences(next);else setStatus('daily.failed');
  }
  const skillsUrl=`https://www.google.com/search?q=${encodeURIComponent(`${safeLabTerm(company)} ${safeLabTerm(job)} 직무기술서 필요역량 담당업무`)}`;
  const attach=(m:Material)=>{
    const ok=onUse({company:m.company,job:m.job,source:m.synthetic?m.source:publicSourceRef(m.source),synthetic:!!m.synthetic});
    if(ok)recordReviewAction('lab.result.selected',m.synthetic?'demo-catalogue':'user-provided-public-material',{company:safeLabTerm(m.company),job:safeLabTerm(m.job),ref:publicSourceRef(m.source),roleId:REVIEW_ROLES.find(r=>r.company===m.company&&r.job===m.job)?.id??''});
    setStatus(ok?'daily.lab.saved':'daily.failed');
  };
  const materialId=(m:Material)=>[m.company,m.job,m.source].join('\u0001');
  function compare(m:Material){
    const old=comparison.some(item=>materialId(item)===materialId(m));
    const next=old?comparison.filter(item=>materialId(item)!==materialId(m)):[...comparison.slice(-1),m];
    if(!saveJSON('review:lab-comparison:v1',next)){setStatus('daily.failed');return;}
    setComparison(next);
    recordReviewAction('lab.comparison.changed','explicit-comparison',{items:next.map(item=>`${safeLabTerm(item.company)} · ${safeLabTerm(item.job)}`)});
  }
  return <div className="mx-auto max-w-5xl space-y-4" data-testid="view-review-company-lab">
    <ReviewPartnerPostings onExplore={(recruiter,role)=>{
      resetSearch();setCompany(recruiter);setJob(role);
      setSearchError(saveJSON(SEARCH_KEY,{company:recruiter,job:role})?'':'daily.failed');
      searchField.current?.focus();searchField.current?.scrollIntoView({block:'center'});
    }}/>
    <header className={`${shell} border-blue/25 bg-[#f1f7ff]`}>
      <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl"><Building2 className="w-6 text-blue" aria-hidden/>{t('audience.company')}</h1>
      <p className="text-sm">{t('daily.lab.intro')}</p><p className="text-sm text-slate-600">{t('daily.lab.offline')}</p>
      <form className="space-y-2" onSubmit={e=>{e.preventDefault();void submitSearch();}} onChange={resetSearch}>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm font-semibold">{t('daily.lab.company')}<input ref={companyField} type="search" className={field} maxLength={100} value={company} onChange={e=>setCompany(e.target.value)} data-testid="input-company-lab-company"/></label>
          <label className="text-sm font-semibold">{t('daily.lab.job')}<input ref={searchField} type="search" className={field} maxLength={100} value={job} onChange={e=>setJob(e.target.value)} data-testid="input-company-lab-job"/></label>
        </div>
        <details open={url?true:undefined}>
          <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-blue">{t('simpleStory.linkOption')}</summary>
          <label className="text-sm">{t('simpleStory.linkOption')}<input type="url" value={url} onChange={e=>setUrl(e.target.value)} maxLength={500}
            className={field} placeholder="https://" data-testid="input-company-lab-public-url"/></label>
          <p className="mt-1 text-xs text-muted-foreground">{t('simpleStory.linkHint')}</p>
        </details>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="submit" disabled={isSearching} className={`${reviewBlueAction} disabled:opacity-50`} data-testid="button-company-lab-search"><Search aria-hidden className="h-4 w-4"/>{t('daily.lab.search')}</button>
          <a href={skillsUrl} target="_blank" rel="noreferrer" onClick={()=>recordReviewAction('lab.role.explore','public-role-search',{job:safeLabTerm(job)})} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue underline" data-testid="link-company-lab-skills">{t('daily.lab.skills')}<ExternalLink aria-hidden className="h-4 w-4 shrink-0"/></a>
        </div>
      </form>
      {isSearching&&<p role="status" data-testid="status-lab-searching">{t('daily.lab.searching')}</p>}
      {searchError&&<p role="alert" className="text-sm text-slate-800" data-testid="status-company-lab-input">{t(searchError)}</p>}
      {search&&<div className="rounded-lg border border-blue/15 bg-white px-3 py-2 text-sm" data-testid="section-company-lab-search-link">
        {searchError==='daily.lab.authSearch'&&<a href={`${import.meta.env.BASE_URL.replace(/\/$/,'')}/sign-in?review-lab=1&lang=${encodeURIComponent(locale)}`} className="me-3 inline-flex min-h-11 items-center font-semibold text-blue underline" data-testid="link-lab-auth">{t('daily.lab.signInSearch')}</a>}
        {searchError&&searchError!=='daily.lab.authSearch'&&<button type="button" className="me-3 min-h-11 font-semibold text-blue underline" onClick={()=>void submitSearch(true)}>{t('daily.lab.retrySearch')}</button>}
        <a href={webJobSearch(search)} target="_blank" rel="noopener noreferrer" onClick={()=>{
          if(!traceSearchLink(search,'fallback-link','link-requested'))setSearchError('daily.failed');
        }} className="inline-flex min-h-11 items-center gap-2 font-semibold text-blue underline" data-testid="link-company-lab-external">{t('daily.lab.external')}<ExternalLink aria-hidden className="h-4 w-4 shrink-0"/></a>
        <p>{t('daily.lab.searchFallback')}</p>
        {!isSearching&&(!results||!results.materials.length)&&<button type="button" className="min-h-11 font-semibold text-blue underline" data-testid="button-lab-reviewed-source" onClick={()=>{
          const references=matchingReviewedMaterials(search.company,search.job);
          if(!saveJSON(RESULTS_KEY,{terms:search,results:references})||!recordReviewAction('lab.results.shown','curated',{...search,analysisVersion:references.version,resultIds:references.materials.map(x=>x.id)}))setSearchError('daily.failed');
          setResults(references);
        }}>{t('daily.lab.reviewedSearch')}</button>}
      </div>}
    </header>
    {results&&<ReviewLabEvidence key={`${results.mode}:${results.retrievedAt}:${trait}:${focus}`} results={results} trait={trait} focus={focus} onUse={onUse}/>}
    <details className={shell} data-testid="view-company-preferences">
      <summary className="min-h-11 cursor-pointer content-center font-semibold">{ko?'내 관심 기업·직무군':'My saved companies and job groups'} · {preferences.length}</summary>
      <p className="text-sm">{ko?'검색하거나 공고를 본 것만으로는 관심 목록에 추가되지 않아요.':'Searching or opening a posting does not save a preference.'}</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="min-h-11 text-blue underline disabled:opacity-50" disabled={!safeLabTerm(company)} onClick={()=>prefer('company',company)} data-testid="button-company-prefer-company">{ko?'입력한 기업을 관심에 저장':'Save entered company'}</button>
        <button type="button" className="min-h-11 text-blue underline disabled:opacity-50" disabled={!safeLabTerm(job)} onClick={()=>prefer('job',job)} data-testid="button-company-prefer-job">{ko?'입력한 직무군을 관심에 저장':'Save entered job group'}</button>
      </div>
      <ul>{preferences.map(pref=><li key={pref.id} className="flex items-center gap-3 break-all">
        <span>{pref.kind==='company'?(ko?'기업':'Company'):(ko?'직무군':'Job group')} · {pref.label}</span>
        <button type="button" className="min-h-11 shrink-0 text-blue underline" aria-label={`${ko?'관심 해제':'Remove'}: ${pref.label}`} data-testid={`button-company-preference-remove-${pref.kind}`} onClick={()=>{
          const next=setReviewPreference(pref,false);if(next)setPreferences(next);else setStatus('daily.failed');
        }}>{ko?'해제':'Remove'}</button>
      </li>)}</ul>
    </details>
    {!!comparison.length&&<section className={shell} data-testid="view-company-comparison">
      <h2 className="font-bold">{ko?'고른 자료 비교 (최대 두 건)':'Compare selected material (up to two)'}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{comparison.map(m=><article className="min-w-0 break-words rounded-lg border p-3" key={materialId(m)}>
        <h3 className="font-semibold">{m.company} · {m.job}</h3>
        <p className="text-sm">{m.synthetic?t('daily.lab.sample'):t('daily.lab.user')}</p>
        <p className="whitespace-pre-wrap text-sm">{m.required||m.skillMaterial||t('daily.lab.none')}</p>
        <button type="button" className="min-h-11 text-blue underline" onClick={()=>compare(m)}>{ko?'비교에서 빼기':'Remove from comparison'}</button>
      </article>)}</div>
    </section>}
    <details className={shell} data-testid="section-company-lab-examples" onToggle={e=>setShowExamples(e.currentTarget.open)}>
      <summary className="min-h-11 cursor-pointer content-center font-semibold">{t('daily.lab.exampleMaterials')}</summary>
      {showExamples&&fixtures.map(m=><MaterialView key={materialId(m)} data={m} onUse={()=>attach(m)} onCompare={()=>compare(m)} compared={comparison.some(x=>materialId(x)===materialId(m))}/>)}
    </details>
    {status&&<p role="status" className="rounded-lg border border-blue/20 bg-blue-soft p-3 text-sm" data-testid="status-company-source">{t(status)}</p>}
  </div>;
}
function MaterialView({data,onUse,onCompare,compared}:{data:Material;onUse:()=>void;onCompare:()=>void;compared:boolean}) {
  const {t,locale}=useI18n();
  const source=!data.synthetic && officialHttps(data.source);
  const row=(key:keyof Material)=><div key={key}>
    <dt className="font-semibold">{t(`daily.lab.${key}`)}</dt>
    <dd dir="auto" className="whitespace-pre-wrap break-words text-slate-700">{data[key]||t('daily.lab.none')}</dd>
  </div>;
  return <article className={shell} data-testid={data.synthetic?'card-company-fixture':'card-company-provided'}>
    <span className="inline-flex rounded-full bg-[#eaf3ff] px-3 py-1 text-xs font-semibold text-[#1a4d8d]">{t(data.synthetic?'daily.lab.sample':'daily.lab.user')}</span>
    <h2 className="break-words text-lg font-bold">{[data.company,data.job].filter(Boolean).join(' · ')}</h2>
    <div className="grid gap-2 md:grid-cols-2">
      <dl className="space-y-2 rounded-lg bg-[#f2f7ff] p-3 text-sm">{(['profile','value'] as const).map(row)}</dl>
      <div className="rounded-lg bg-[#fff8ec] p-3">
        <h3 className="font-bold">{t('daily.lab.posting')}</h3>
        <dl className="mt-2 space-y-2 text-sm">{(['duties','required','preferred'] as const).map(row)}</dl>
      </div>
    </div>
    <dl className="text-sm">{row('skillMaterial')}</dl>
    <dl className="grid gap-2 text-xs sm:grid-cols-2">{(['source','check','posted','deadline'] as const).map(row)}</dl>
    {source&&<a className="inline-flex min-h-11 items-center text-sm text-blue underline" href={source} target="_blank" rel="noreferrer" onClick={()=>recordReviewAction('lab.external.open-attempt','user-provided-public-material',{ref:publicSourceRef(data.source)})}>{t('daily.lab.visit')}</a>}
    <details onToggle={e=>{if(e.currentTarget.open)recordReviewAction('lab.result.opened',data.synthetic?'demo-catalogue':'user-provided-public-material',{company:safeLabTerm(data.company),job:safeLabTerm(data.job),ref:publicSourceRef(data.source)});}}>
      <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">{data.raw?t('daily.lab.raw'):(locale==='ko'?'역량 세부자료 보기':'Open skill details')}</summary>
      {data.raw?<p dir="auto" className="whitespace-pre-wrap break-words text-sm">{data.raw}</p>:<p className="text-sm">{data.skillMaterial}</p>}
    </details>
    <div className="flex flex-wrap gap-2">
      <button className={reviewBlueAction} onClick={onUse} data-testid="button-company-use">{t('daily.lab.use')}</button>
      <button type="button" className="min-h-11 text-blue underline" onClick={onCompare} aria-pressed={compared} data-testid="button-company-compare">
        {locale==='ko'?(compared?'비교에서 빼기':'비교에 넣기'):(compared?'Remove from comparison':'Add to comparison')}
      </button>
    </div>
  </article>;
}
