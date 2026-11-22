import {useState,type FormEvent} from 'react';
import {useLocation} from 'wouter';
import StudioApp from '../../vendor/nuvia-original/apps/planner/src/studio/StudioApp';
import type {StudioReviewSlots} from '../../vendor/nuvia-original/apps/planner/src/studio/StudioPage';
import '../review-studio-integration.css';
import {useWorkspace} from '@/lib/workspace';
import {confirmPlannerEvidence,editAccountStory,type AccountAudience,type PlannerEvidence,studyApp} from '@/lib/account-journey';
import {useI18n} from '@/lib/i18n';
import {hashStr} from '@/lib/career';
import {attachPlannerReceipt,currentLabMaterial} from '@/lib/account-lab-handoff';
import {Link} from 'wouter';
import type {enterpriseScenario as Native} from '@workspace/api-zod';

type State=Parameters<StudioReviewSlots['desk']>[0];
type Card=Parameters<StudioReviewSlots['desk']>[1];
const today=()=>{const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;};

function ScenarioOriginal({snapshot,ko}:{snapshot?:string;ko:boolean}){
  if(!snapshot)return null;
  try{
    const card=JSON.parse(snapshot) as Native.ScenarioCardDocument;
    if(!Array.isArray(card.sections))return null;
    return <details className="pm-fold">
      <summary>{ko?'모의 상황카드 원본 보기':'View original simulation card'}</summary>
      {card.sections.map(section=><div className="my-2" key={section.key}>
        <b>{section.title}</b>
        <ul>{section.items.map((item,i)=><li dir="auto" key={i}>{item}</li>)}</ul>
      </div>)}
    </details>;
  }catch{return null;}
}

function EvidenceForm({state,card,audience}:{state:State;card?:Card;audience:AccountAudience}){
  const {state:workspace,update,saveNow}=useWorkspace();
  const [,route]=useLocation();
  const {t,locale}=useI18n();
  const ko=locale==='ko';
  const [date,setDate]=useState(today);
  const [excerpt,setExcerpt]=useState('');
  const [approved,setApproved]=useState(false);
  const [kind,setKind]=useState<PlannerEvidence['context']>('self_reported');
  const note=state.studio?.dailyNotes?.[date];
  const origin=card&&workspace?.integrated?.labHandoffs?.find(h=>h.plannerCardId===card.id);
  const notes=Object.entries(state.studio?.dailyNotes??{}).filter(([,n])=>n.text.trim());
  const [error,setError]=useState(false);
  if(!card&&!notes.length)return null;
  const eligible=!!excerpt.trim()&&(!origin||(currentLabMaterial(workspace!,origin)&&origin.audience===audience))&&(!!card||!!note?.text.includes(excerpt));
  const transfer=(e:FormEvent)=>{
    e.preventDefault(); if(!approved||!eligible)return;
    let ok=false;
    update(s=>{
      if(s.applications.length>=200&&!studyApp(s,audience))return s;
      const [next,id]=confirmPlannerEvidence(s,{
        reference:card?`desk:${card.id}`:`note:${date}`,title:card?.title ?? (ko?'자유 일상기록':'Daily note'),date:card?.date||date,
        action:excerpt, context:origin?.purpose==='simulation'?'thought_exercise':kind, version:card?`account:${hashStr(JSON.stringify(card))}`:note!.updatedAt,
      });
      if(!id)return s;
      ok=true;
      // Existing draft text stays untouched. Only explicit confirmation adds a source.
      const reference=card?`desk:${card.id}`:`note:${date}`;
      const selected=(studyApp(next,audience)?.experienceIds??[])
        .filter(prior=>next.experiences.find(x=>x.id===prior)?.plannerReference!==reference);
      return editAccountStory(next,audience,{experienceIds:[...selected,id]},t('audience.story'));
    });
    if(!ok){setError(true);return;}
    saveNow();route('/storyboard');
  };
  return <>{origin?.purpose==='simulation'&&<p className="st-note" data-testid="account-desk-simulation-label">
    {ko?'LAB 모의 연습 · 실제 근무나 실적이 아닙니다.':'LAB simulation, not real employment or an achievement.'}
  </p>}<details className="pm-fold st-block review-studio-extra" data-testid={card?'account-desk-transfer':'account-note-transfer'}>
    <summary>{ko?'고른 기록을 스토리보드에 연결':'Add a selected record to the storyboard'}</summary>
    {origin&&<ScenarioOriginal snapshot={origin.sourceSnapshot} ko={ko}/>}
    <form onSubmit={transfer}>
      {origin&&<p>{origin.revokedAt?(ko?'사용 철회된 LAB 자료예요. 내 기록은 남아 있습니다.':'LAB material withdrawn. Your record is kept.'):
        !currentLabMaterial(workspace!,origin)?(ko?'LAB 원본이 바뀌었습니다. 새 자료를 다시 확인할 수 있어요.':'The LAB original changed. Review the new source before reuse.'):
        origin.audience!==audience?(ko?'다른 이용 화면에서 고른 자료예요. 이 스토리에는 옮기지 않습니다.':'Selected for the other workspace. It cannot be added to this story.'):
        origin.purpose==='simulation'?(ko?'선택한 생각 연습의 문장만 사용해요.':'Use only the selected thought exercise excerpt.'):(ko?'LAB 탐색 자료 · 직접 한 일만 기록하세요.':'LAB exploration material. Record only what you did.')}</p>}
      {!card&&<label>{ko?'일상기록 날짜':'Note date'}<select value={date} onChange={e=>{setDate(e.target.value);setExcerpt('');setApproved(false);}}>
        {[...new Set([today(),...notes.map(([d])=>d)])].sort().reverse().map(d=><option key={d}>{d}</option>)}
      </select></label>}
      {!card&&note&&<p className="whitespace-pre-wrap" dir="auto">{note.text}</p>}
      <label>{card?(ko?'이 활동에서 내가 한 행동 또는 생각 연습':'Your action or thought exercise'):(ko?'사용할 문장만 원문 그대로 적어 주세요':'Enter only the exact excerpt you want to use')}
        <textarea data-testid="account-activity-excerpt" value={excerpt} onChange={e=>{setExcerpt(e.target.value);setApproved(false);}} maxLength={5000} rows={3} dir="auto"/>
      </label>
      {origin?.purpose!=='simulation'&&<label>{ko?'기록 성격':'Record context'}<select value={kind} onChange={e=>{setKind(e.target.value as PlannerEvidence['context']);setApproved(false);}}>
        <option value="self_reported">{ko?'실제로 한 일 · 자기보고':'Action I took · self-reported'}</option>
        <option value="thought_exercise">{ko?'가정 상황에서 한 생각 연습':'Thought exercise · imagined scenario'}</option>
      </select></label>}
      <label className="pm-check"><input type="checkbox" checked={approved} disabled={!eligible} onChange={e=>setApproved(e.target.checked)}/>{ko?'적은 문장과 기록 성격을 확인했고, 이 부분만 작성에 사용할게요.':'I checked the excerpt and its context and approve just this part for writing.'}</label>
      <button type="submit" className="pm-primary" disabled={!approved||!eligible}>{ko?'선택 기록을 스토리보드에 추가':'Add selected record to storyboard'}</button>
      {error&&<p role="alert">{ko?'자료를 추가하지 못했어요. 입력은 남아 있습니다.':'Could not add this record. Your input is still here.'}</p>}
    </form>
  </details></>;
}

export function AccountPlanner({audience}:{audience:AccountAudience}) {
  const {state,update,refreshGeneration}=useWorkspace();
  const {locale}=useI18n();
  const [mount,setMount]=useState(0);
  const [swap,setSwap]=useState(false);
  return <section className="review-original-studio min-w-0">
    {state?.integrated?.plannerRecovery&&<div className="surface mb-3 p-4">
      <p>{locale==='ko'?'다른 탭의 작업대와 이 탭에서 편집한 작업대를 모두 보관했습니다. 필요하면 보관된 사본을 열 수 있어요.':'Both workbenches were kept. Open the recovered copy when needed.'}</p>
      <button className="text-primary underline" onClick={()=>setSwap(true)}>{locale==='ko'?'보관된 작업대 보기':'Open recovered workbench'}</button>
      {swap&&<button className="ml-3 font-semibold" onClick={()=>{update(s=>({...s,integrated:{...s.integrated,planner:s.integrated?.plannerRecovery,plannerRecovery:s.integrated?.planner}}));setMount(x=>x+1);setSwap(false);}}>{locale==='ko'?'현재 작업대와 사본 바꾸기':'Swap current and recovered copies'}</button>}
    </div>}
    <PlannerAdapter key={`${refreshGeneration}:${mount}`} raw={state?.integrated?.planner} audience={audience}/>
  </section>;
}

function PlannerAdapter({raw,audience}:{raw?:string;audience:AccountAudience}){
  const {state:workspace,update,status,saveNow}=useWorkspace();
  const {locale}=useI18n();
  const [storage]=useState(()=>{
    const entries=new Map<string,string>();
    if(raw)entries.set('nuvia:studio:v1:account',raw);
    return {getItem:(key:string)=>entries.get(key)??null,setItem:(k:string,v:string)=>{entries.set(k,v);},removeItem:(k:string)=>{entries.delete(k);}};
  });
  const slots:StudioReviewSlots={
    assessmentSummary:<p className="st-note">{locale==='ko'?'연결된 실제 결과지가 없습니다. 가상 점수를 넣지 않았어요.':'No real assessment is connected. No example scores were added.'}</p>,
    shelf:(native,act)=>{
      const items=workspace?.integrated?.labHandoffs?.filter(item=>item.audience===audience&&currentLabMaterial(workspace,item))??[];
      if(!items.length)return null;
      return <details className="pm-fold st-block" data-testid="planner-lab-inbox">
        <summary>{locale==='ko'?'LAB에서 확인한 활동 자료':'Confirmed LAB materials'} · {items.length}</summary>
        {items.map(h=>{
          const cardId=native.studio?.creations?.[h.id];
          return <article className="border-t py-2" key={h.id}>
            <b dir="auto">{h.title}</b> · {h.purpose==='simulation'?(locale==='ko'?'모의 연습':'Simulation'):(locale==='ko'?'탐색':'Exploration')}
            <p dir="auto">{h.excerpt}</p>
            <ScenarioOriginal snapshot={h.sourceSnapshot} ko={locale==='ko'}/>
            {cardId?<p role="status">{status==='saved'?(locale==='ko'?'선반에 추가해 계정에 저장했어요.':'Added and saved to your account.'):(locale==='ko'?'작업대 저장 상태를 확인하세요.':'Check the account status above.')}</p>:
              <button type="button" className="pm-primary" onClick={()=>{
                if(act({type:'create',title:h.title,activity:'학습',activityExplicit:true,minutes:null,
                  requestId:h.id,date:today(),scope:h.excerpt,firstAction:locale==='ko'?'자료를 읽고 나의 선택 이유를 기록하기':'Read the material and record my reasoning'}))saveNow();
              }}>{locale==='ko'?'할 일 선반에 추가':'Add to the task shelf'}</button>}
          </article>;
        })}
      </details>;
    },
    desk:(state,card)=><EvidenceForm key={card.id} state={state} card={card} audience={audience}/>,
    notes:(state)=><EvidenceForm state={state} audience={audience}/>,
  };
  return <StudioApp reviewSlots={slots} accountStage={audience} reviewPersistence={{storage,write:(_key,value)=>{
    if(value.length>700000)throw new Error(locale==='ko'?'작업대가 계정 저장 한도를 넘었습니다. 아직 서버에 저장되지 않았습니다.':'The workbench exceeds the account limit and has not been saved.');
    update(s=>attachPlannerReceipt(s,value));
  }}}/>;
}
