import {useEffect,useRef,useState} from 'react';
import './planner-lab.css';
type Card={id:string;version:string;title:string;minutes:number;jobId:string;kind:string;materials:{title:string;body:string}[];alternatives:string[];steps:string[];artifact:string;safety:string;sourceUses:{evidenceId:string;quote:string;application:string}[]};
type Context={binding:string;jobs:{id:string;label:string;rank:number|null;source:string}[];scopeId:string;report:{id?:string;version?:string}|null;unmapped:number};
type Activity={id:string;card:Card;job:{label:string};revision:number;answers:Record<string,string>;startedAt:number|null;deadline:number|null;serverNow:number;change:{text:string}|null;savedToServer:boolean};
const labels:Record<string,string>={login_required:'NUVIA 로그인이 필요합니다.',lab_login_required:'기업 LAB 로그인 연결을 확인해 주세요.',lab_sso_unconfigured:'기업 LAB 로그인 연결이 아직 설정되지 않았습니다.',lab_scope_unavailable:'LAB 이용 권한을 확인해 주세요. 만료된 캠프를 이용했다면 LAB에서 개인 공간으로 전환해 주세요.',job_mapping_required:'이 직무는 LAB 연결 근거 확인이 필요합니다.',request_content_conflict:'오늘 추천의 직무 설정이 다릅니다. 선택 직무로 추가 카드 요청을 이용해 주세요.',generation_pending:'LAB에서 카드를 생성하고 있습니다. 잠시 후 같은 요청으로 다시 시도해 주세요.',context_changed:'로그인 또는 수업 공간이 바뀌었습니다. 화면을 다시 열어 주세요.',answer_revision_conflict:'다른 화면에서 수정했습니다. 작성 내용을 따로 보관한 뒤 저장본을 다시 열어 주세요.',connection_unavailable:'플래너 연결 서버가 준비되지 않았습니다.',invalid_lab_response:'LAB 응답 형식을 확인해야 합니다.',lab_transport_unavailable:'기업 LAB에 연결하지 못했습니다. 다시 시도해 주세요.'};
class ApiError extends Error{constructor(public code:string){super(labels[code]??`처리하지 못했습니다 (${code}). 다시 시도해 주세요.`);}}
async function httpApi<T>(path:string,signal:AbortSignal,body?:unknown,binding?:string):Promise<T>{
 const r=await fetch(`/api/planner/lab/${path}`,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',...(binding?{'x-planner-binding':binding}:{})},body:body===undefined?undefined:JSON.stringify(body),signal});
 let value;try{value=await r.json();}catch{throw new ApiError('connection_unavailable');}
 if(!r.ok)throw new ApiError(value.error??'connection_unavailable');return value;
}
const fields=[['priority','우선순위'],['decision','최초 선택'],['reason','선택 이유와 근거'],['uncertainty','아직 확인하지 못한 사항'],['beforeReply','회신 전 할 수 있는 행동'],['tradeoff','감수할 손실·결정을 바꿀 조건'],['changeDecision','변경 정보 후 결정 유지·수정 이유'],['actions','실제로 한 행동'],['result','확인한 결과·직접 만든 결과물'],['jobConnection','이 행동이 필요한 실제 직무와 연결 근거'],['learning','배운 점·다음에 적용할 행동'],['feeling','활동 후 느낌'],['memo','자유 메모']] as const;
/** sessionKey MUST change on host login/account/logout/scope changes. This is
 * UI invalidation only: the server derives identity from its real SSO session. */
export default function PlannerLabRecommendations({sessionKey,language='ko'}:{sessionKey:string;language?:string}){
 const [context,setContext]=useState<Context|null>(null),[job,setJob]=useState(''),[cards,setCards]=useState<Card[]>([]),[unavailable,setUnavailable]=useState(0);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[kind,setKind]=useState('work'),[difficulty,setDifficulty]=useState('foundation');
 const [activity,setActivity]=useState<Activity|null>(null),[draft,setDraft]=useState<Record<string,string>>({}),[history,setHistory]=useState<Activity[]>([]),[dirty,setDirty]=useState(false);
 const [tick,setTick]=useState(Date.now());
 const epoch=useRef(0),abort=useRef(new AbortController()),intent=useRef<{key:string;id:string}|null>(null),selectId=useRef<string|null>(null);
 const offset=useRef(0),editRevision=useRef(0);
 const binding=useRef('');
 function api<T>(path:string,signal:AbortSignal,body?:unknown){return httpApi<T>(path,signal,body,binding.current);}
 const resetRequests=()=>{epoch.current++;abort.current.abort();abort.current=new AbortController();intent.current=null;};
 async function run<T>(work:(signal:AbortSignal)=>Promise<T>,done:(v:T)=>void){
  const generation=epoch.current,signal=abort.current.signal;setBusy(true);setError('');
  try{const v=await work(signal);if(generation===epoch.current)done(v);}
  catch(err){if(generation===epoch.current&&!signal.aborted&&!(err instanceof Error&&err.name==='AbortError')){
   if(err instanceof ApiError&&['context_changed','login_required','lab_login_required'].includes(err.code)){setContext(null);setCards([]);setActivity(null);setDraft({});setHistory([]);setDirty(false);resetRequests();}
   setError(err instanceof Error?err.message:'연결 상태를 확인해 주세요.');setBusy(false);
  }}
  finally{if(generation===epoch.current)setBusy(false);}
 }
 useEffect(()=>{
  resetRequests();binding.current='';setContext(null);setJob('');setCards([]);setUnavailable(0);setActivity(null);setDraft({});setDirty(false);setError('');setNotice('');setHistory([]);setBusy(false);
  const e=epoch.current,signal=abort.current.signal;
  setBusy(true);api<Context>('context',signal)
   .then(async c=>{if(e!==epoch.current)return;binding.current=c.binding;const h=await api<{activities:Activity[]}>('activities',signal);if(e!==epoch.current)return;setContext(c);setHistory(h.activities);const id=new URLSearchParams(location.search).get('labActivity');const found=h.activities.find(a=>a.id===id);if(found)open(found);})
   .catch(err=>{if(e===epoch.current&&err.name!=='AbortError')setError(err.message);}).finally(()=>{if(e===epoch.current)setBusy(false);});
  return()=>{epoch.current++;abort.current.abort();};
 },[sessionKey,language]);
 useEffect(()=>{const t=setInterval(()=>setTick(Date.now()),1000);return()=>clearInterval(t);},[]);
 useEffect(()=>{
  const warn=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
 },[dirty]);
 function open(a:Activity){setActivity(a);setDraft(a.answers);setDirty(false);editRevision.current++;offset.current=a.serverNow-Date.now();selectId.current=null;}
 async function request(mode:'daily'|'extra',retryFailed=false){
  if(!job)return;
  const key=JSON.stringify([job,language,mode,kind,difficulty]);
  if(intent.current?.key!==key)intent.current={key,id:crypto.randomUUID()};
  const requestId=intent.current.id;
  await run(signal=>api<{cards:Card[];unavailable:unknown[];status:string}>('recommendations',signal,{requestId,jobId:job,language,mode,kind,difficulty,retryFailed}),r=>{
   setCards(r.cards);setUnavailable(r.unavailable.length);setNotice(r.cards.length?'아직 등록되지 않은 추천 카드입니다. 하나를 골라 플래너에 저장하세요.':r.status==='empty'?'추천 목록이 비어 있습니다.':'LAB 생성·번역 상태를 확인해야 합니다.');
   if(!r.unavailable.length)intent.current=null;
  });
 }
 async function select(c:Card){
  if(dirty&&!window.confirm('현재 작성 중인 내용이 저장되지 않았습니다. 다른 카드를 열까요?'))return;
  selectId.current??=crypto.randomUUID();
  await run(signal=>api<Activity>('select',signal,{requestId:selectId.current,cardId:c.id,version:c.version,consent:true}),a=>{open(a);setHistory(h=>[a,...h.filter(x=>x.id!==a.id)]);setNotice('선택한 카드 1개가 플래너 서버에 저장되었습니다. 실행 완료 기록은 아닙니다.');});
 }
 async function save(start=false){if(!activity)return;const atEdit=editRevision.current;
  await run(signal=>api<Activity>(`activities/${activity.id}/answers`,signal,{revision:activity.revision,answers:draft,start}),a=>{
   setActivity(a);offset.current=a.serverNow-Date.now();setHistory(h=>[a,...h.filter(x=>x.id!==a.id)]);
   if(editRevision.current===atEdit)setDirty(false);setNotice('서버 저장을 확인했습니다. 작성한 내용은 자기보고이며 실행 증명과 구분됩니다.');
  });
 }
 const elapsed=activity?.startedAt?Math.max(0,tick+offset.current-activity.startedAt):0;
 const releaseAt=(activity?.card.minutes??0)*30000;
 useEffect(()=>{
  if(!activity?.startedAt||activity.change||elapsed<releaseAt)return;
  const id=activity.id,e=epoch.current;api<Activity>(`activities/${id}`,abort.current.signal).then(a=>{if(e===epoch.current)setActivity(old=>old?.id===id?{...old,change:a.change}:old);}).catch(()=>{});
 },[activity?.id,activity?.startedAt,activity?.change,elapsed>=releaseAt]);
 return <section className="planner-lab" data-testid="planner-lab-recommendations" aria-label="기업 LAB 추천 카드">
  <h2>기업 LAB 추천 활동카드</h2><p>직무 선택 → 추천 카드 확인 → 하나 선택·저장 → 시간 안에 판단·기록</p>
  {context&&<><p>{context.scopeId==='personal-workspace'?'개인 공간 · 캠프 코드 없이 이용':'소속 수업 공간'} · TOP5 원본의 순위와 직무명은 유지합니다.</p>
   {!context.jobs.length&&<p>연결된 TOP5 또는 검증된 관심 직무가 없습니다. 결과지 연결과 직무 매핑을 확인해 주세요.</p>}
   {context.unmapped>0&&<p>아직 LAB 연결 근거가 확인되지 않은 직무 {context.unmapped}개는 자동 연결하지 않았습니다.</p>}
   <label>훈련할 직무<select value={job} disabled={busy} onChange={e=>{resetRequests();setJob(e.target.value);setCards([]);setUnavailable(0);setError('');setNotice('');setBusy(false);}}><option value="">직무를 직접 선택하세요</option>{context.jobs.map(j=><option key={j.id} value={j.id}>{j.rank?`${j.rank}위 · `:''}{j.label}</option>)}</select></label>
   <button disabled={busy||!job} onClick={()=>void request('daily')}>오늘 추천 1~3개 불러오기</button>
   <label>추가 카드 종류<select value={kind} disabled={busy} onChange={e=>setKind(e.target.value)}><option value="work">직무·일상 훈련</option><option value="strategy">인지전략 훈련</option><option value="reflection">판단 회고 훈련</option></select></label>
   <label>도움 수준<select value={difficulty} disabled={busy} onChange={e=>setDifficulty(e.target.value)}><option value="foundation">기초</option><option value="extended">심화</option></select></label>
   <button disabled={busy||!job} onClick={()=>void request('extra')}>선택 직무로 추가 카드 요청</button><p>자동 추천 개수와 별개로 개인 추가 요청에는 하루 3개 제한이 없습니다.</p>
  </>}
  {busy&&<p role="status">LAB 요청·저장 처리 중…</p>}{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {unavailable>0&&<p>미완료 카드 {unavailable}개 <button disabled={busy} onClick={()=>void request(intent.current?.key.includes('extra')?'extra':'daily',true)}>같은 요청으로 재시도</button></p>}
  <div className="plb-candidates">{cards.map(c=><article key={`${c.id}:${c.version}`}><h3>{c.title}</h3><p>{c.minutes}분 · 교육용 연습 · {c.kind==='strategy'?'인지전략':c.kind==='reflection'?'판단 회고':'직무·일상 훈련'}</p><CardBody card={c}/><button disabled={busy} onClick={()=>void select(c)}>이 카드 선택 · 플래너에 저장</button></article>)}</div>
  {!!history.length&&<label>저장된 LAB 활동<select value={activity?.id??''} disabled={busy} onChange={e=>{if(dirty&&!window.confirm('저장하지 않은 내용이 있습니다. 저장본을 열까요?'))return;const a=history.find(x=>x.id===e.target.value);if(a)void run(signal=>api<Activity>(`activities/${a.id}`,signal),open);}}><option value="">활동 선택</option>{history.map(a=><option key={a.id} value={a.id}>{a.card.title}</option>)}</select></label>}
  {activity&&<article data-testid="lab-activity-editor"><h3>{activity.card.title}</h3><p>{activity.job.label} · 교육용 모의·일상 연습입니다. 실제 기업 근무 경험으로 쓰지 않습니다.</p><CardBody card={activity.card}/>
   <p>{activity.startedAt?`남은 시간 ${Math.max(0,Math.min(activity.card.minutes,Math.ceil(((activity.deadline??0)-(tick+offset.current))/60000)))}분`:`설정 시간 ${activity.card.minutes}분 · 시작 전`}</p>
   <button disabled={busy||!!activity.startedAt} onClick={()=>void save(true)}>이 시간으로 시작</button>
   {activity.change&&<p className="plb-change"><b>추가 상황 정보</b><br/>{activity.change.text}</p>}
   {fields.filter(([key])=>key!=='changeDecision'||activity.change).map(([key,label])=><label key={key}>{label}<textarea value={draft[key]??''} maxLength={20000} onChange={e=>{editRevision.current++;setDraft(d=>({...d,[key]:e.target.value}));setDirty(true);}}/></label>)}
   <p>결과물은 직접 만든 내용·보관 위치를 적어 주세요. 첨부파일 업로드·강사 확인 기능과는 구분됩니다.</p>
   <button disabled={busy} onClick={()=>void save()}>작성 내용 서버에 저장</button><span aria-live="polite">{dirty?' 미저장 내용 있음':activity.savedToServer?' 서버 저장본 확인':''}</span>
  </article>}
 </section>;
}
function CardBody({card}:{card:Card}){return <details><summary>자료·대안·수행 과제 보기</summary>{card.materials.map((m,i)=><div key={i}><b>{m.title}</b><p>{m.body}</p></div>)}<h4>비교할 대안</h4><ol>{card.alternatives.map((a,i)=><li key={i}>{a}</li>)}</ol><h4>할 일</h4><ol>{card.steps.map((s,i)=><li key={i}>{s}</li>)}</ol><p>제출 결과물: {card.artifact}</p><p>{card.safety}</p>{card.sourceUses?.map((s,i)=><p key={i}>{s.evidenceId} · {s.application}</p>)}</details>;}
