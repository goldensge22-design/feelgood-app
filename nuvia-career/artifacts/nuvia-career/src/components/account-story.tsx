import {useRef,useState} from 'react';
import {Link} from 'wouter';
import type {CareerVersion} from '@workspace/api-client-react';
import {useI18n} from '@/lib/i18n';
import {useWorkspace} from '@/lib/workspace';
import {accountPlannerSourceCurrent,editAccountStory,storyKey,studyApp,type AccountAudience} from '@/lib/account-journey';
import {emptyStoryboard,storedStoryboard} from '@/lib/storyboard';
import {downloadStoryboard} from '@/lib/storyboard-export';
import {uid} from '@/lib/career';
import {currentLabMaterial,latestLabMaterial} from '@/lib/account-lab-handoff';

const button='rounded-lg border bg-white px-3 py-2 text-sm font-medium disabled:opacity-50';
const primary='rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50';
export function AccountStory({audience}:{audience:AccountAudience}){
  const ws=useWorkspace();
  const {locale,t}=useI18n();const ko=locale==='ko';
  const title=t('audience.story');
  const state=ws.state!;
  const app=studyApp(state,audience);
  const selected=app?.experienceIds??[];
  const sources=state.experiences.filter(x=>x.confirmed&&x.plannerReference&&
    x.permissionStatus!=='revoked'&&x.permissionStatus!=='deleted'&&x.permissionStatus!=='unverified');
  const handoffs=state.integrated?.labHandoffs??[];
  const sourceLab=(reference?:string)=>reference?.startsWith('desk:')?handoffs.find(h=>`desk:${h.plannerCardId}`===reference):undefined;
  const live=new Set(sources.filter(x=>{
    const source=sourceLab(x.plannerReference);
    return (!source||currentLabMaterial(state,source)&&source.audience===audience)&&accountPlannerSourceCurrent(state.integrated?.planner,x);
  }).map(x=>x.id));
  const evidence=sources.filter(x=>selected.includes(x.id)&&live.has(x.id));
  const sourceChanged=sources.some(x=>selected.includes(x.id)&&!live.has(x.id));
  const company=audience==='adult'?state.integrated?.companySource:null;
  const labMaterial=latestLabMaterial(state,audience);
  const keyword=labMaterial?.keyword||(audience==='youth'?state.integrated?.youthInterest:company?.keyword);
  const body=app?.text??'';
  const thought=app?.integratedThought??'';
  const signature=JSON.stringify([app?.id,body,thought,company,keyword,labMaterial?.id,evidence,sourceChanged]);
  const [candidate,setCandidate]=useState<{value:string;stamp:string}|null>(null);
  const [undo,setUndo]=useState<{original:string;applied:string;id:string}|null>(null);
  const [approved,setApproved]=useState('');
  const [format,setFormat]=useState<'txt'|'pdf'|'docx'|'hwpx'>('pdf');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const lock=useRef(false);
  const [oldDraft,setOldDraft]=useState('');
  const [view,setView]=useState<CareerVersion|null>(null);
  const earlier=ws.versions.filter(v=>v.application.id===app?.id||v.application.integratedAudience===audience);
  const priorApplications=state.applications.filter(a=>a.id!==app?.id&&
    (a.text.trim()||(a.integratedAudience===audience&&a.integratedThought?.trim())));
  const update=(patch:Parameters<typeof editAccountStory>[2])=>ws.update(s=>editAccountStory(s,audience,patch,title));
  function make(withThought:boolean){
    let value:string;
    if(withThought){
      if(!body.trim()||!thought.trim())return;
      value=`${body}\n\n${thought.trim()}`;
    }else{
      if(!evidence.length){setNotice(ko?'내가 한 행동이나 생각을 담은 플래너 기록을 한 건 이상 골라 주세요.':'Choose a planner record describing an action or thought.');return;}
      value=evidence.map(e=>`${e.activityContext==='thought_exercise'?(ko?'가정 상황에서 적은 생각':'Thought exercise'):(ko?'내가 기록한 행동':'My recorded action')}: ${e.action}`).join('\n\n');
      if(keyword)value+=`\n\n${ko?'더 살펴보고 싶은 키워드':'Keyword I want to explore'}: ${keyword}`;
    }
    setNotice('');setCandidate({value,stamp:signature});
  }
  async function finalize(){
    if(!app||ws.status!=='saved'||approved!==signature||sourceChanged||!body.trim()||lock.current)return;
    lock.current=true;setBusy(true);setNotice('');
    try{setView(await ws.createVersion(app.id,`V${earlier.filter(v=>v.application.id===app.id).length+1}`,false));setNotice(ko?'확인한 글을 계정 버전으로 저장했어요.':'The confirmed text was saved as an account version.');}
    catch{setNotice(ko?'버전을 저장하지 못했어요. 글은 남아 있습니다. 서버 저장 상태를 다시 확인하세요.':'The version could not be saved. Your text is still here. Check account save status.');}
    finally{lock.current=false;setBusy(false);}
  }
  async function download(version:CareerVersion){
    if(lock.current)return;
    lock.current=true;setBusy(true);setNotice('');
    try{
      await downloadStoryboard({...emptyStoryboard(),company:version.application.company,job:version.application.job,
        sections:[version.application.text,'','','']},[title,'','','',''],format,locale);
      setNotice(ko?'파일을 브라우저에 전달했어요. 다운로드 목록에서 확인해 주세요.':'The file was sent to your browser. Check your downloads.');
    }catch{setNotice(ko?'파일을 만들지 못했어요. 버전과 원문은 그대로입니다.':'Download failed. Your text and saved version are unchanged.');}
    finally{lock.current=false;setBusy(false);}
  }
  const localLegacy = ws.userId&&(() => {
    const old=storedStoryboard(`account:${ws.userId}`);
    return old?.sections.filter(Boolean).join('\n\n')??'';
  })();
  const selectedOlderDraft=priorApplications.find(x=>x.id===oldDraft);
  const olderText=oldDraft==='device'?localLegacy:selectedOlderDraft?.text;
  const olderThought=selectedOlderDraft?.integratedAudience===audience?selectedOlderDraft.integratedThought:undefined;
  const hasOlderContent=!!(olderText?.trim()||olderThought?.trim());
  const otherAccountDrafts=priorApplications.filter(a=>a.integratedAudience===audience);
  return <section className="space-y-3" data-testid="account-story">
    <h1 className="text-2xl font-bold">{title}</h1>
    <section className="surface space-y-3 p-4 sm:p-6">
      <h2 className="font-semibold">1. {ko?'내 이야기 재료':'Choose your materials'}</h2>
      <div className="grid gap-2 md:grid-cols-3">
        <div className="rounded-lg border p-3"><b>{ko?'결과지 강점':'Report strengths'}</b><p>{ko?'연결된 실제 결과지 없음':'No real report connected'}</p></div>
        <div className="rounded-lg border p-3"><b>{ko?'확인한 플래너 기록':'Confirmed planner records'}</b><p>{evidence.length}{ko?'건 선택':' selected'}</p><Link href="/planner" className="text-primary underline">{t('audience.activity')}</Link></div>
        <div className="rounded-lg border p-3"><b>{ko?'관심 키워드':'Interest keyword'}</b><p dir="auto">{keyword??(ko?'선택하지 않음':'Not selected')}</p><Link href="/lab" className="text-primary underline">{audience==='youth'?t('audience.career'):t('audience.company')}</Link>
          {company&&<details><summary>{ko?'기업 근거 보기':'Company source'}</summary><p>{company.excerpt}</p><p>{company.observedAt}</p></details>}
          {labMaterial&&<details data-testid="story-lab-material"><summary>{ko?'확인한 LAB 출처':'Confirmed LAB source'} · {labMaterial.purpose==='simulation'?(ko?'모의':'Simulation'):(ko?'탐색':'Exploration')}</summary>
            <p dir="auto">{labMaterial.title} · {labMaterial.excerpt}</p>
            {labMaterial.url&&<a href={labMaterial.url} target="_blank" rel="noreferrer" className="underline">{ko?'공개 원문':'Public source'}</a>}
          </details>}
        </div>
      </div>
      {sources.length>0&&<details><summary>{ko?'작성에 쓸 기록 바꾸기':'Change selected records'}</summary>
        {sources.map(item=><label key={item.id} className="flex items-start gap-2 py-2" dir="auto">
          <input type="checkbox" checked={selected.includes(item.id)} disabled={!live.has(item.id)&&!selected.includes(item.id)} onChange={e=>{
            const ids=e.target.checked?[...selected,item.id]:selected.filter(id=>id!==item.id);update({experienceIds:ids});
          }}/><span className="min-w-0 break-words"><b>{item.title}</b> · {item.activityContext==='thought_exercise'?
            (sourceLab(item.plannerReference)?.purpose==='simulation'?(ko?'가정 상황에서 적은 생각 · 모의 연습':'Thought recorded in an imagined situation · Simulation'):
              (ko?'생각 연습':'Thought exercise')):(ko?'자기보고':'Self-reported')}{!live.has(item.id)&&(ko?' · 이전 기록':' · Earlier record')}<br/>{item.action}</span>
        </label>)}
      </details>}
      {sourceChanged&&<p role="status">{ko?'선택한 원본 일부가 바뀌었습니다. 플래너에서 다시 확인하거나 이전 기록의 선택을 해제하세요. 기존 글과 버전은 남아 있습니다.':'A selected original changed. Confirm it again in the planner or deselect the earlier copy. Your text and versions are unchanged.'}</p>}
    </section>
    <section className="surface space-y-3 p-4 sm:p-6">
      <h2 className="font-semibold">2. {ko?'나의 강점 문장 만들기':'Preview a strength statement'}</h2>
      <p className="text-sm text-muted-foreground">{ko?'선택한 기록을 옮겨 보는 규칙형 미리보기입니다. GPT 요청이 아니며, 기록에 없는 성과를 만들지 않습니다.':'This preview organizes selected notes using rules, not GPT. It does not create achievements.'}</p>
      <button className={primary} onClick={()=>make(false)}>{ko?'내 기록으로 문장 미리보기':'Preview from my records'}</button>
      {candidate&&<div className="space-y-2 rounded-lg border p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div><b>{ko?'현재 내 글':'My current text'}</b><p className="whitespace-pre-wrap break-words" dir="auto">{body}</p></div>
          <div><b>{ko?'적용 전 미리보기':'Candidate preview'}</b><p className="whitespace-pre-wrap break-words" dir="auto">{candidate.value}</p></div>
        </div>
        <button className={button} disabled={candidate.stamp!==signature||candidate.value.length>100000} onClick={()=>{
          update({text:candidate.value});setUndo({id:app?.id??'',original:body,applied:candidate.value});setCandidate(null);
        }}>{ko?'이 문장 적용':'Apply this text'}</button>
        <button className={button} onClick={()=>setCandidate(null)}>{ko?'취소':'Cancel'}</button>
        {candidate.stamp!==signature&&<p>{ko?'글 또는 자료가 바뀌었어요. 미리보기를 다시 만들어 주세요.':'Text or sources changed. Make a new preview.'}</p>}
      </div>}
    </section>
    <section className="surface space-y-3 p-4 sm:p-6">
      <h2 className="font-semibold">3. {ko?'내 말로 다듬기':'Edit in my own words'}</h2>
      <label className="block">{ko?'내 글':'My text'}<textarea className="block w-full min-w-0 rounded-lg border p-3" rows={6} maxLength={100000} dir="auto" data-testid="account-story-body" value={body} onChange={e=>update({text:e.target.value})}/></label>
      <label className="block">{ko?'덧붙이고 싶은 내 생각':'My thought to add'}<textarea className="block w-full min-w-0 rounded-lg border p-3" rows={2} maxLength={5000} dir="auto" value={thought} data-testid="account-story-thought" onChange={e=>update({integratedThought:e.target.value})}/></label>
      <div className="flex flex-wrap gap-2">
        <button className={button} disabled={!body.trim()||!thought.trim()} onClick={()=>make(true)}>{ko?'내 생각을 담아 미리보기':'Preview with my thought'}</button>
        <button className={button} disabled={!undo||undo.applied!==body||!!undo.id&&undo.id!==app?.id} onClick={()=>{if(undo)update({text:undo.original});setUndo(null);}}>{ko?'적용 전 글 복원':'Restore text before applying'}</button>
        <button className={button} onClick={ws.saveNow}>{ko?'계정에 초안 저장':'Save account draft'}</button>
      </div>
      {audience==='adult'&&<Link href="/write" onClick={()=>{if(app)ws.setSelectedAppId(app.id);}} className="block text-sm text-primary underline">{ko?'기존 자소서 편집·AI 도움 열기':'Open the existing application editor and AI tools'}</Link>}
      <details className="text-sm"><summary>{ko?'이전 작업 자료 열기':'Open earlier workspace material'}</summary>
        <Link href="/storyboard/legacy" className="mr-4 text-primary underline">{ko?'이 기기의 이전 스토리보드':'Earlier storyboard on this device'}</Link>
        <Link href="/versions" className="text-primary underline">{ko?'계정의 기존 문서 버전':'Existing account document versions'}</Link>
      </details>
      <label className="flex items-start gap-2">
        <input type="checkbox" disabled={!body.trim()||sourceChanged} checked={!!approved&&approved===signature} onChange={e=>{
          if(!e.target.checked){setApproved('');return;}
          update({...(labMaterial?.purpose==='exploration'&&labMaterial.audience==='adult'&&
            (labMaterial.company||labMaterial.job)?{company:labMaterial.company??'',job:labMaterial.job??''}:{}),
            integratedEvidence:[...(keyword?[`keyword: ${keyword}`]:[]),...(company&&(!labMaterial||labMaterial.url===company.url)?[company.url,company.observedAt]:[]),
            ...(labMaterial?[`lab:${labMaterial.id}:${labMaterial.sourceVersion}`]:[]),
            ...evidence.slice(0,12).map(x=>{const source=sourceLab(x.plannerReference);return [
              x.id,x.sourceVersion,x.activityContext,source&&`${source.audience}:${source.sourceId}:${source.sourceVersion}`,x.action,
            ].filter(Boolean).join(' ').slice(0,1000);})]});
          setApproved(signature);
        }}/>{ko?'본문과 사용한 자료를 확인했어요. 새 버전으로 보관할게요.':'I reviewed the text and its sources and want to keep a new version.'}
      </label>
      <button className={primary} disabled={approved!==signature||sourceChanged||ws.status!=='saved'||busy} onClick={()=>void finalize()}>{ko?'확인한 글 버전 저장':'Save confirmed version'}</button>
      {(priorApplications.length>0||localLegacy)&&<details open={otherAccountDrafts.length>0||undefined} data-testid="account-story-draft-copies">
        <summary>{ko?'보관한 글 · 이전 초안과 충돌 복구 사본':'Kept writing · earlier drafts and recovered copies'}</summary>
        <p className="my-2 text-sm text-slate-600">{ko?'다른 탭에서 복구한 글은 여기에 따로 남아요. 글을 골라 확인하거나, 현재 글을 보존한 채 새 사본에서 이어 쓸 수 있어요.':'Edits recovered from another tab stay here. Review a draft, or continue in a new copy without replacing your current writing.'}</p>
        <select className={`${button} max-w-full`} aria-label={ko?'확인할 보관 글':'Kept writing to review'} value={oldDraft} onChange={e=>setOldDraft(e.target.value)}>
          <option value="">{ko?'그대로 보존할 기존 글 고르기':'Choose earlier writing to copy'}</option>
          {localLegacy&&<option value="device">{ko?'이 기기의 기존 스토리보드':'Older storyboard on this device'}</option>}
          {priorApplications.map((a,i)=><option key={a.id} value={a.id}>{`${i+1}. ${(a.text.trim()||(a.integratedAudience===audience?a.integratedThought:'')||a.question).replace(/\s+/g,' ').slice(0,64)}`}</option>)}
        </select>
        {hasOlderContent&&<div className="my-2 space-y-2 rounded-lg border p-2" data-testid="account-story-draft-copy-preview">
          {olderText&&<p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words" dir="auto">{olderText}</p>}
          {olderThought&&<div className="border-t pt-2">
            <b>{ko?'이 사본에 저장한 내 생각':'My thought saved with this copy'}</b>
            <p className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words" dir="auto">{olderThought}</p>
          </div>}
        </div>}
        <button className={button} disabled={!hasOlderContent||state.applications.length>=200} onClick={()=>{
          if(!hasOlderContent)return;
          ws.update(s=>{
            const existing=s.applications.find(a=>a.id===oldDraft);
            if(s.applications.length>=200)return s;
            if(!existing)return oldDraft==='device'&&olderText?
              editAccountStory({...s,integrated:{...s.integrated,[storyKey(audience)]:undefined}},audience,{text:olderText},title):s;
            const id=uid('story');
            const compatible=existing.integratedAudience===audience;
            const copy={...existing,id,integratedAudience:audience,question:title,
              ...(!compatible?{company:'',job:'',experienceIds:[],criterionIds:[],integratedEvidence:[],integratedThought:''}:{})};
            return {...s,applications:[...s.applications,copy],integrated:{...s.integrated,[storyKey(audience)]:id}};
          });
          setOldDraft('');setUndo(null);
        }}>{ko?'현재 글을 남기고 새 사본 열기':'Open a copy and keep my current draft'}</button>
      </details>}
      <details open={!!view||undefined}><summary>{ko?'저장한 버전·다운로드':'Saved versions and downloads'}</summary>
        {earlier.map(v=><button className={button} key={v.id} onClick={()=>setView(v)}>{v.label} · {v.createdAt.slice(0,10)}</button>)}
        {view&&<div className="space-y-2 rounded-lg border p-3">
          <p className="whitespace-pre-wrap break-words" dir="auto">{view.application.text}</p>
          <button className={button} onClick={()=>{const id=ws.restoreVersion(view);ws.update(s=>({...s,integrated:{...s.integrated,[storyKey(audience)]:id}}));}}>{ko?'이 버전을 새 사본으로 열기':'Open this version as a new copy'}</button>
          <label className="block">{ko?'파일 형식':'File format'} <select className={button} value={format} onChange={e=>setFormat(e.target.value as typeof format)}>{['pdf','docx','hwpx','txt'].map(f=><option key={f}>{f}</option>)}</select></label>
          <button className={button} disabled={busy} onClick={()=>void download(view)}>{ko?'저장한 버전 다운로드':'Download saved version'}</button>
        </div>}
      </details>
      {notice&&<p aria-live="polite">{notice}</p>}
    </section>
  </section>;
}
