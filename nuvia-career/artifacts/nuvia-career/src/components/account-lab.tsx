import {useAuth} from '@clerk/react';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Link} from 'wouter';
import {getCareerLabJob,searchCareerLab,type CareerLabResults} from '@workspace/api-client-react';
import {useI18n} from '@/lib/i18n';
import {useWorkspace} from '@/lib/workspace';
import {editAccountStory,pickCompany,type AccountAudience} from '@/lib/account-journey';
import {safeUrl} from '@/lib/career';

const inputClass='w-full min-w-0 rounded-lg border bg-white px-3 py-2';
export function AccountLab({audience}:{audience:AccountAudience}){
  return audience==='youth'?<YouthLab/>:<CompanyLab/>;
}
function YouthLab(){
  const {locale,t}=useI18n();const ko=locale==='ko';
  const {state,update,saveNow}=useWorkspace();
  const [interest,setInterest]=useState(state?.integrated?.youthInterest??'');
  return <section className="surface space-y-4 p-4 sm:p-6">
    <h1 className="text-xl font-bold">{t('audience.career')}</h1>
    <p>{ko?'공식 진로 자료와 실제 검사 결과지가 아직 연결되지 않았어요. 궁금한 진로와 살펴볼 키워드를 직접 고르고, 무엇을 해보고 싶은지 플래너에 적어 보세요.':'Official career materials and assessments are not connected. Pick a career and a keyword to explore, then record what you want to try.'}</p>
    <form className="space-y-3" onSubmit={e=>{e.preventDefault();if(!interest.trim())return;update(s=>{
      const next=editAccountStory(s,'youth',{job:interest.trim()},t('audience.story'));
      return {...next,integrated:{...next.integrated,youthInterest:interest.trim()}};
    });saveNow();}}>
      <label className="block">{ko?'관심 진로와 살펴볼 키워드':'Career interest and keyword'}
        <input className={inputClass} maxLength={300} value={interest} onChange={e=>setInterest(e.target.value)} data-testid="account-youth-interest"/>
      </label>
      <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground" disabled={!interest.trim()}>{ko?'진로 선택 저장':'Save career interest'}</button>
    </form>
    {!!state?.integrated?.recoveredYouthInterests?.length&&<details>
      <summary>{ko?'다른 탭에서 복구한 진로 선택':'Career choices recovered from another tab'}</summary>
      {state.integrated.recoveredYouthInterests.map(choice=><button type="button" key={choice} className="block min-h-11 text-start text-primary underline" onClick={()=>setInterest(choice)}>{choice}</button>)}
      <p className="text-sm">{ko?'선택을 불러온 뒤 진로 선택 저장을 눌러 반영하세요.':'Load a choice, then save the career interest to use it.'}</p>
    </details>}
    <Link href="~/planner" className="mr-4 text-primary underline">{t('audience.activity')}</Link>
    <Link href="~/storyboard" className="text-primary underline">{t('audience.story')}</Link>
  </section>;
}
function CompanyLab(){
  const {locale,t}=useI18n();const ko=locale==='ko';
  const {state,update,saveNow}=useWorkspace();
  const {getToken}=useAuth();
  const selected=state?.integrated?.companySource;
  const [company,setCompany]=useState(selected?.company??'');
  const [job,setJob]=useState(selected?.job??'');
  const [url,setUrl]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [results,setResults]=useState<CareerLabResults|null>(null);
  const run=useRef<AbortController|null>(null);
  useEffect(()=>()=>run.current?.abort(),[]);
  async function search(e:FormEvent){
    e.preventDefault();if(run.current||(!company.trim()&&!job.trim()&&!url.trim()))return;
    const controller=new AbortController();run.current=controller;setBusy(true);setMessage('');setResults(null);
    try{
      const token=await getToken();
      if(!token||controller.signal.aborted)throw Error('AUTH_REQUIRED');
      const options={signal:controller.signal,headers:{Authorization:`Bearer ${token}`}};
      let reply=await searchCareerLab({company:company.trim(),job:job.trim(),...(url.trim()?{url:url.trim()}:{})},options);
      const stop=Date.now()+120000;
      while(reply.state==='pending'&&Date.now()<stop&&!controller.signal.aborted){
        await new Promise(r=>window.setTimeout(r,2000));
        if(controller.signal.aborted)return;
        reply=await getCareerLabJob(reply.id,options);
      }
      if(reply.state==='completed'&&reply.result?.mode==='gpt-web'){setResults(reply.result);return;}
      throw Error(reply.error??'WAIT_EXPIRED');
    }catch{
      if(!controller.signal.aborted)setMessage(ko?'검색을 완료하지 못했어요. 로그인과 연결을 확인하고 다시 시도해 주세요. 저장한 자료는 그대로입니다.':'Search could not finish. Check sign-in and your connection, then try again. Saved sources are unchanged.');
    }finally{if(!controller.signal.aborted){run.current=null;setBusy(false);}}
  }
  return <section className="surface space-y-4 p-4 sm:p-6">
    <h1 className="text-xl font-bold">{t('audience.company')}</h1>
    <p>{ko?'GPT는 여기에 입력한 공개 기업명·직무명·링크만 검색합니다. 결과지와 플래너 기록은 검색에 보내지 않아요.':'GPT searches only the public company, role and link you enter. Reports and planner records are not sent.'}</p>
    <form onSubmit={search} className="grid gap-3 sm:grid-cols-2">
      <label>{ko?'공개 기업명':'Public company name'}<input className={inputClass} value={company} onChange={e=>setCompany(e.target.value)} maxLength={100} /></label>
      <label>{ko?'직무명':'Role'}<input className={inputClass} value={job} onChange={e=>setJob(e.target.value)} maxLength={100} /></label>
      <label className="sm:col-span-2">{ko?'공개 기업/공고 링크 (선택)':'Public company or posting URL (optional)'}<input className={inputClass} value={url} onChange={e=>setUrl(e.target.value)} maxLength={1500} inputMode="url"/></label>
      <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground" disabled={busy||(!company.trim()&&!job.trim()&&!url.trim())}>{busy?(ko?'공개 자료 확인 중…':'Checking public sources…'):(ko?'검색':'Search')}</button>
    </form>
    {message&&<p role="alert">{message}</p>}
    {!!results&&<div className="space-y-3" aria-live="polite">
      {!results.materials.length&&<p>{ko?'확인한 기업·직무 자료가 없어요.':'No verified public sources were returned.'}</p>}
      {results.materials.map(m=><div key={m.id} className="space-y-2 rounded-lg border p-3">
        <h2 className="font-semibold">{m.company} · {m.job}</h2>
        {m.evidence.filter(x=>safeUrl(x.url)).map(e=><article key={e.id} className="space-y-1 border-t pt-2">
          <p><b>{e.keyword}</b> · {e.keywordOrigin==='official_named'?(ko?'공식 명칭':'Official term'):(ko?'원문 기반 키워드':'Source-based keyword')}</p>
          <p dir="auto">{e.excerpt}</p>
          <a className="mr-3 break-all text-primary underline" href={e.url} target="_blank" rel="noreferrer">{e.source}</a>
          <button className="text-primary underline" onClick={()=>{update(s=>pickCompany(s,{
            company:m.company.slice(0,300),job:m.job.slice(0,300),keyword:e.keyword.slice(0,300),excerpt:e.excerpt.slice(0,1200),url:e.url,observedAt:results.retrievedAt,
          },t('audience.story')));saveNow();}}>{ko?'이 키워드를 스토리보드에 저장':'Save this keyword to storyboard'}</button>
        </article>)}
      </div>)}
    </div>}
    {selected&&<details open className="rounded-lg border p-3"><summary>{ko?'계정에 보관하는 선택 자료':'Selected account source'} · {selected.keyword}</summary>
      <p>{selected.company} · {selected.job} · {selected.observedAt}</p><p>{selected.excerpt}</p>
      <a className="text-primary underline" href={safeUrl(selected.url)??undefined} target="_blank" rel="noreferrer">{ko?'원문 열기':'Open source'}</a>
    </details>}
    {!!state?.integrated?.recoveredCompanySources?.length&&<details className="rounded-lg border p-3">
      <summary>{ko?'다른 탭에서 복구한 기업·직무 자료':'Company and role sources recovered from another tab'}</summary>
      {state.integrated.recoveredCompanySources.map(source=><article key={JSON.stringify(source)} className="my-2 border-t pt-2">
        <p dir="auto">{source.company} · {source.job} · {source.keyword}</p>
        <p dir="auto">{source.excerpt}</p>
        {safeUrl(source.url)&&<a className="mr-3 text-primary underline" href={source.url} target="_blank" rel="noreferrer">{ko?'원문':'Source'}</a>}
        <button type="button" className="min-h-11 text-primary underline" onClick={()=>{update(s=>pickCompany(s,source,t('audience.story')));saveNow();}}>{ko?'이 자료 사용하기':'Use this source'}</button>
      </article>)}
    </details>}
    <Link href="~/storyboard" className="text-primary underline">{t('audience.story')}</Link>
  </section>;
}
