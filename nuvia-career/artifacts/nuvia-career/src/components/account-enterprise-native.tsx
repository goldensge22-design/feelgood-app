import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {getOriginalEnterprise,previewOriginalEnterpriseScenario} from '@workspace/api-client-react';
import {enterpriseScenario} from '@workspace/api-zod';
import type {enterpriseScenario as Native} from '@workspace/api-zod';
import {useI18n} from '@/lib/i18n';
import {useWorkspace} from '@/lib/workspace';
import {safeUrl} from '@/lib/career';
import OriginalScenarioPreview from '@/vendor/enterprise-lab/scenario-source-card-preview';
import {LabMaterialConsent,LabMaterialHistory} from './account-lab-material';

type Source={title:string;claim:string;url:string;checkedAt:string;kind:string};
type Entity={id:string;name:string;summary:string;aliases:string[];values:string[];skills:string[];requirements:string[];tasks:string[];sources:Source[];companyId?:string;jobId?:string};
type Catalogue={companies:Entity[];jobs:Entity[];relations:Entity[];sourceVersion:string};
const key='enterprise-original';
const form='min-h-11 w-full rounded-lg border bg-white px-3 py-2';
const button='min-h-11 rounded-lg bg-primary px-3 font-semibold text-primary-foreground disabled:opacity-50';

export default function AccountEnterpriseNative(){
  const {locale}=useI18n(),ko=locale==='ko';
  const {userId}=useWorkspace();
  const cat=useQuery({queryKey:[key,userId],enabled:!!userId,retry:false,
    queryFn:({signal})=>getOriginalEnterprise({signal}).then(x=>x as unknown as Catalogue)});
  const [q,setQ]=useState('');
  const [applied,setApplied]=useState('');
  const [selected,setSelected]=useState<Entity|null>(null);
  const [materialKeyword,setMaterialKeyword]=useState('');
  const [family,setFamily]=useState<Native.ScenarioFamily>('administration');
  const [occupation,setOccupation]=useState('');
  const [kind,setKind]=useState<'job'|'daily'|'workplace'>('job');
  const [preview,setPreview]=useState<Native.ScenarioCardDocument|null>(null);
  const [busy,setBusy]=useState(false);
  const [failed,setFailed]=useState(false);
  const language=enterpriseScenario.scenarioLanguages.find(l=>l===locale)??'ko';
  const labels={software:ko?'소프트웨어':'Software',manufacturing:ko?'제조':'Manufacturing',administration:ko?'사무·운영':'Administration',logistics:ko?'물류':'Logistics',aviation:ko?'항공':'Aviation'};
  const normalize=(x:string)=>x.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,'');
  const wanted=normalize(applied);
  const items=[...(cat.data?.companies??[]),...(cat.data?.jobs??[]),...(cat.data?.relations??[])].filter(item=>!wanted||
    [item.name,item.summary,...item.aliases].some(s=>normalize(s).includes(wanted)));
  const company=cat.data?.companies.find(e=>e.id===selected?.id||e.id===selected?.companyId);
  const source=selected?.sources.find(p=>p.kind!=='FeelGood 해석'&&safeUrl(p.url));
  const selectionKeywords=selected?(selected.values.length?selected.values:selected.skills).slice(0,6):[];
  async function create(){
    if(busy)return;
    setFailed(false);setBusy(true);setPreview(null);
    try{
      const result=await previewOriginalEnterpriseScenario({language,type:kind,family,audience:'university',
        ...(occupation?{jobId:occupation}:{}),...(company?{companyId:company.id}:{})});
      setPreview((result as unknown as {card:Native.ScenarioCardDocument}).card);
    }catch{setFailed(true);}
    finally{setBusy(false);}
  }
  return <section className="space-y-3" data-testid="account-native-enterprise">
    <section className="surface space-y-3 p-4">
      <h2 className="font-semibold">{ko?'원본 기업·직무 자료 찾기':'Original company and role catalogue'}</h2>
      <p className="text-sm">{ko?'기존 기업직무 LAB의 출처가 있는 자료입니다. 자료의 확인일과 현재 채용 여부는 별개입니다. 아래 공개 웹 검색도 사용할 수 있어요.':'These are the Enterprise LAB’s original referenced entries, not a current vacancy feed. Public web search is also available below.'}</p>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={e=>{e.preventDefault();setApplied(q);setSelected(null);setPreview(null);}}>
        <input aria-label={ko?'원본 자료 기업명 또는 직무명':'Company or role in original catalogue'} className={form} value={q} maxLength={100} onChange={e=>setQ(e.target.value)}/>
        <button className={button}>{ko?'원본 자료 검색':'Search original catalogue'}</button>
      </form>
      {cat.isLoading&&<p>{ko?'자료를 불러옵니다…':'Loading…'}</p>}
      {cat.isError&&<button className="underline" onClick={()=>void cat.refetch()}>{ko?'자료를 읽지 못했어요 · 다시 시도':'Catalogue could not load · Retry'}</button>}
      {cat.isSuccess&&<><p className="text-sm">{items.length}{ko?'건':' entries'}</p>
        <div className="max-h-72 overflow-auto" data-testid="original-enterprise-results">
        {items.map(e=><button type="button" key={e.id} aria-pressed={selected?.id===e.id}
          className="m-1 min-h-11 rounded border bg-white px-2 aria-pressed:border-primary aria-pressed:bg-blue-50"
          onClick={()=>{setSelected(e);setMaterialKeyword('');setPreview(null);}}>{e.name}</button>)}</div></>}
      {selected&&<article className="space-y-2 rounded-lg border p-3">
        <h3 className="font-semibold">{selected.name}</h3><p>{selected.summary}</p>
        {selected.values.length>0&&<p><b>{ko?'원본 LAB의 기업 가치 정리':'Enterprise LAB’s summary of values'}:</b> {selected.values.join(' · ')}</p>}
        {selected.tasks.length>0&&<p><b>{ko?'담당 업무':'Role duties'}:</b> {selected.tasks.join(' · ')}</p>}
        {selected.skills.length>0&&<p><b>{ko?'직무 역량':'Role skills'}:</b> {selected.skills.join(' · ')}</p>}
        {selected.requirements.length>0&&<p><b>{ko?'해당 자료의 지원 조건 (현재 공고 아님)':'Listed qualifications (not a current opening)'}:</b> {selected.requirements.join(' · ')}</p>}
        <details><summary>{ko?'출처·확인일':'Sources and dates'}</summary>
          {selected.sources.filter(s=>safeUrl(s.url)).map((s,i)=><p key={i} className="break-words">
            <a className="text-primary underline" href={s.url} target="_blank" rel="noreferrer">{s.title}</a> · {s.checkedAt} · {s.kind}<br/>{s.claim}</p>)}
        </details>
        {source&&<label className="block text-sm">{ko?'사용할 키워드':'Keyword to use'}
          <select aria-label={ko?'사용할 키워드':'Keyword to use'} className={form} key={selected.id} onChange={e=>setMaterialKeyword(e.target.value)} value={selectionKeywords.includes(materialKeyword)?materialKeyword:(selectionKeywords[0]??selected.name)}>
            {(selectionKeywords.length?selectionKeywords:[selected.name]).map(x=><option key={x}>{x}</option>)}
          </select>
        </label>}
        {source&&<LabMaterialConsent material={{audience:'adult',sourceId:`catalogue:${selected.id}`,sourceVersion:`${cat.data!.sourceVersion}/${source.checkedAt}`,
          title:selected.name.slice(0,150),keyword:(selectionKeywords.includes(materialKeyword)?materialKeyword:selectionKeywords[0]??selected.name).slice(0,300),
          excerpt:source.claim.slice(0,1200),url:source.url,purpose:'exploration',
          company:company?.name.slice(0,180),job:(cat.data?.jobs.find(j=>j.id===(selected.jobId??selected.id))?.name)?.slice(0,180)}}/>}
      </article>}
    </section>
    <section className="surface space-y-2 p-4">
      <h2 className="font-semibold">{ko?'원본 상황카드 · 모의 연습':'Original scenario cards · Simulation'}</h2>
      <div className="grid gap-2 sm:grid-cols-3">
        <label>{ko?'직무군':'Job family'}<select className={form} value={family} onChange={e=>{setFamily(e.target.value as Native.ScenarioFamily);setOccupation('');setPreview(null);}}>
          {enterpriseScenario.scenarioFamilies.map(x=><option key={x} value={x}>{labels[x]}</option>)}</select></label>
        <label>{ko?'세부 직무 (선택)':'Specific role (optional)'}<select className={form} value={occupation} onChange={e=>{setOccupation(e.target.value);setPreview(null);}}>
          <option value="">{ko?'선택하지 않음':'None'}</option>{enterpriseScenario.scenarioOccupationIds.filter(id=>enterpriseScenario.scenarioOccupationFamily(id)===family)
            .map(id=><option key={id} value={id}>{enterpriseScenario.scenarioOccupationName(language,id)}</option>)}</select></label>
        <label>{ko?'연습 종류':'Practice type'}<select className={form} value={kind} onChange={e=>{setKind(e.target.value as typeof kind);setPreview(null);}}>
          <option value="job">{ko?'직무 상황':'Job scenario'}</option><option value="daily">{ko?'일상 적용':'Everyday application'}</option>
          <option value="workplace">{ko?'가정한 업무 상황':'Imagined workplace'}</option></select></label>
      </div>
      <button type="button" className={button} disabled={busy} onClick={()=>void create()}>{busy?(ko?'만드는 중…':'Preparing…'):(ko?'원본 상황카드 미리보기':'Preview an original scenario')}</button>
      {failed&&<p role="alert">{ko?'만들지 못했어요. 다시 시도하세요.':'Could not generate the scenario. Please retry.'}</p>}
      {preview&&<div className="rounded-lg border p-3" data-testid="account-enterprise-scenario">
        <p className="font-medium">{ko?'모의 · 원본 규칙으로 생성, AI 아님':'Simulation · Original rule engine, not AI'}</p>
        <details><summary>{preview.title}</summary>
          <OriginalScenarioPreview language={language} projection={{projectionVersion:'scenario-display/1.0',originalCardId:preview.id,originalContentVersion:preview.contentVersion,card:preview}}/>
        </details>
        <LabMaterialConsent material={{audience:'adult',sourceId:`scenario:${preview.commonCardId}`,sourceVersion:preview.contentVersion,
          title:preview.title.slice(0,150),keyword:occupation?enterpriseScenario.scenarioOccupationName(language,occupation as Native.ScenarioOccupationId):labels[family],
          excerpt:(preview.sections.find(x=>x.key==='goal')?.items.join('\n')||preview.title).slice(0,1200),purpose:'simulation',
          sourceSnapshot:JSON.stringify(preview)}}/>
      </div>}
    </section>
    <LabMaterialHistory audience="adult"/>
  </section>;
}
