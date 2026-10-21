import {useEffect,useState} from 'react';
import './personal.css';
import './studio.css';
import {usePersonal} from './store';
import {localDate,monthOf} from './domain';
import {studioOf,noticeCards} from './studio-logic';
import type {Action} from './model';
import {feelgoodLogo} from '../official/adaptive/brandAssets';
import StudioPage from './StudioPage';
import RoadmapPage from './RoadmapPage';
import MonthPage from './MonthPage';
import ReportPage from './ReportPage';
import GrowthPage from './GrowthPage';
import ReviewPanel from './ReviewPanel';
import AssessmentPanel from './AssessmentPanel';
import PersonalGuide from './PersonalGuide';
import {TaskForm} from './TaskCreator';
import {locales,localeNames,localeOf,type Locale} from './i18n/config';
import {demoAudience} from '../demo/session';
import DemoNotice from '../demo/DemoNotice';
import AzDemoNotice from './i18n/AzDemoNotice';

type Page='now'|'plan'|'reflect'|'report'|'roadmap'|'growth'|'settings';
const PAGES:Page[]=['now','plan','reflect','report','roadmap','growth','settings'];
const MAIN:[Page,string][]=[['now','지금'],['plan','계획'],['reflect','돌아보기'],['report','리포트']];
const MORE:[Page,string][]=[['roadmap','나의 로드맵'],['growth','방법·목표'],['settings','설정·백업']];
const REVIEW=!demoAudience&&new URLSearchParams(location.search).get('review')==='1';
const STAGES:[string,string][]=[['middle','중학생'],['high','고등학생'],['adult','대학·성인']];
function readNav(k:string):{page?:string;month?:string}{try{return JSON.parse(sessionStorage.getItem(k)??'{}')??{};}catch{return {};}}

function StudioApp(){
 const p=usePersonal();
 const {state,student,act:dispatch}=p;
 const studio=studioOf(state);
 const key=`nuvia-studio-nav:${state.workspaceId}:${REVIEW?'review':'personal'}`;
 const [page,setPage]=useState<Page>(()=>{const v=readNav(key).page;return PAGES.includes(v as Page)?v as Page:'now';});
 const [month,setMonth]=useState(()=>{const v=readNav(key).month;return typeof v==='string'&&/^\d{4}-\d{2}$/.test(v)?v:monthOf(localDate());});
 const [menu,setMenu]=useState(false);
 useEffect(()=>{try{sessionStorage.setItem(key,JSON.stringify({page,month}));}catch{/* memory only */}},[key,page,month]);
 const [hideNotice,setHideNotice]=useState(false);
 const notices=studio.archiveReminders?noticeCards(state):[];
 const months=[...new Set([month,monthOf(localDate()),...state.entries.map(e=>monthOf(e.localDate)),...state.agreements.map(a=>a.month)])].sort().reverse();
 const go=(k:Page)=>{setPage(k);setMenu(false);};
 const [deskFocus,setDeskFocus]=useState<{id:string}|null>(null);
 const act=(a:Action)=>{
  const ok=dispatch(a);
  if(ok&&(a.type==='studio.place'||a.type==='studio.take')){go('now');setDeskFocus({id:a.cardId});}
  return ok;
 };
 useEffect(()=>{
  if(!deskFocus||page!=='now'||studio.deskId!==deskFocus.id)return;
  const frame=requestAnimationFrame(()=>{
   const title=document.querySelector<HTMLElement>('[data-testid="text-desk-title"]');
   if(!title)return;
   title.focus({preventScroll:true});
   title.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  });
  return()=>cancelAnimationFrame(frame);
 },[deskFocus,studio.deskId,page]);
 const running=student.runs.some(r=>r.phase!=='closed');
 const needsSetup=!REVIEW&&!studio.stageChosen&&student.cards.length===0;
 const copyPrevious=(p as {copyPrevious?:()=>unknown}).copyPrevious;
 const MOBILE:[Page,string][]=[['now','지금'],['plan','계획'],['reflect','돌아보기']];
 const MMORE:[Page,string][]=[['report','리포트'],...MORE];
 const [setup,setSetup]=useState({stage:'',title:''});
 const moreMenu=(id:string,items:[Page,string][])=>{const moreActive=items.some(([k])=>k===page);return <div className="st-more">
  <button aria-expanded={menu} aria-haspopup="true" aria-current={moreActive?'page':undefined} data-testid={`button-more-${id}`} onClick={()=>setMenu(!menu)}>{moreActive?items.find(([k])=>k===page)?.[1]:'더보기'}</button>
  {menu&&<div className="st-menu" role="menu">{items.map(([k,l])=><button key={k} role="menuitem" data-testid={`menu-${k}-${id}`} aria-current={page===k?'page':undefined} onClick={()=>go(k)}>{l}</button>)}</div>}
 </div>;};

 return <div className={`pm-root st-root ${studio.appearance}`} lang={localeOf(state)} dir={localeOf(state)==='ar'?'rtl':'ltr'} data-testid="studio-root">
  <header className="st-head">
   <div className="st-title-group"><div className="st-brand"><img src={feelgoodLogo} alt=""/><small>FeelGood</small><b>NUVIA PLANNER</b></div><h1>내 하루 작업대</h1><p>지금 한 가지를 하고, 해낸 일을 모아요.</p></div>
   <div className="st-head-actions">
    <label className="st-language-control">화면 언어<select data-testid="select-language" aria-label="화면 언어" value={localeOf(state)} onChange={e=>act({type:'studio.locale',locale:e.target.value as Locale})}>{locales.map(l=><option key={l} value={l}>{localeNames[l]}</option>)}</select></label>
    {!demoAudience&&<a className="st-link" data-testid="link-previous" href={`./personal-monthly.html${REVIEW?'?review=1':''}`}>이전 화면 보기</a>}
    {(page==='reflect'||page==='report'||page==='roadmap')&&<label style={{margin:0,minWidth:160}}>달 고르기<select data-testid="select-month" value={month} onChange={e=>setMonth(e.target.value)}>{months.map(m=><option key={m} value={m}>{m}</option>)}</select></label>}
   </div>
  </header>
  {REVIEW&&<p className="pm-banner review">검토 모드 · 합성 데이터와 단계 전환은 이 모드에서만 보입니다.</p>}
  {demoAudience&&(localeOf(state)==='az'?<AzDemoNotice audience={demoAudience}/>:<DemoNotice audience={demoAudience}/>)}
  <nav className="st-nav" aria-label="화면">{MAIN.map(([k,l])=><button key={k} aria-current={page===k?'page':undefined} data-testid={`tab-${k}`} onClick={()=>go(k)}>{l}</button>)}{moreMenu('top',MORE)}</nav>
  {p.message&&<div className="pm-toast" role="status" data-testid="status-message"><span>{p.message}</span><button onClick={p.clearMessage} data-testid="button-close-message">닫기</button></div>}
  {p.error&&<div className="pm-toast err" role="alert" data-testid="status-error"><span>{p.error}</span><button onClick={p.clearMessage}>닫기</button></div>}

  {notices.length>0&&!hideNotice&&!needsSetup&&<aside className="st-notice" aria-label="보관함 알림" data-testid="archive-notice">
   <p className="st-eye">보관한 지 7일이 지났어요</p>{running&&<p className="st-note" data-testid="text-notice-running">실행 중인 과제가 있으면 빼기 전에 그 실행을 먼저 마쳐야 해요.</p>}
   <ul className="st-tags">{notices.slice(0,3).map(c=><li key={c.id} data-testid={`notice-${c.id}`}><b>{c.subject?`${c.subject} · `:''}{c.title}</b>
    <div className="st-row"><button data-testid={`button-notice-take-${c.id}`} onClick={()=>act({type:'studio.take',cardId:c.id})}>작업대로</button><button data-testid={`button-notice-keep-${c.id}`} onClick={()=>act({type:'studio.keep',cardId:c.id})}>계속 보관</button><button data-testid={`button-notice-exclude-${c.id}`} onClick={()=>act({type:'studio.exclude',cardId:c.id})}>이번 계획에서 빼기</button></div></li>)}</ul>
   {notices.length>3&&<p className="st-note">외 {notices.length-3}개는 보관함에서 볼 수 있어요.</p>}
   <div className="st-row"><button data-testid="button-notice-hide" onClick={()=>setHideNotice(true)}>닫기</button><button data-testid="button-notice-settings" onClick={()=>{setHideNotice(true);go('settings');}}>알림 설정</button></div>
  </aside>}
  {needsSetup?<section className="st-block st-stage" aria-label="처음 시작" data-testid="studio-setup">
   <p className="st-eye">처음 시작</p><h2>지금 어디에서 공부하거나 일하나요</h2>
   <p className="st-note">고른 단계에 맞춰 과제 종류와 도움 문구가 달라져요. 검사 없이도 시작할 수 있어요.</p>
   <div className="pm-chips" role="radiogroup" aria-label="단계">{STAGES.map(([k,l])=><button key={k} role="radio" aria-checked={setup.stage===k} aria-pressed={setup.stage===k} data-testid={`button-stage-${k}`} onClick={()=>setSetup({...setup,stage:k})}>{l}</button>)}</div>
   {setup.stage&&<TaskForm state={state} stage={setup.stage} draftKey={`nuvia-first-task:${state.workspaceId}`} onSave={task=>act({type:'studio.setup',stage:setup.stage,task} as Action)} onCancel={()=>act({type:'studio.setup',stage:setup.stage} as Action)}/>}
   <button className="pm-primary pm-big" data-testid="button-setup-start" disabled={!setup.stage} onClick={()=>act({type:'studio.setup',stage:setup.stage} as Action)}>추가 없이 작업대 열기</button>
  </section>:<>
   <AssessmentPanel state={state} act={act} review={REVIEW} running={running}/>
   {!state.onboarding&&<PersonalGuide state={state} done={v=>act({type:'onboarding',done:v})}/>}
   {REVIEW&&<details className="st-review-console" data-testid="review-console"><summary>합성 예시·검토 설정</summary><ReviewPanel state={state} act={act} backup={p.backup}/></details>}
   {(page==='now'||page==='plan'||page==='reflect')&&<StudioPage view={page} state={state} student={student} act={act}/>}
   {page==='reflect'&&<MonthPage state={state} month={month} act={act}/>}
   {page==='report'&&<ReportPage month={month} report={p.report}/>}
   {page==='roadmap'&&<RoadmapPage state={state} month={month} act={act} onMonth={setMonth} onOpenCard={id=>{act({type:'studio.select',cardId:id});go('now');}}/>}
   {page==='growth'&&<GrowthPage state={state} student={student} act={act}/>}
   {page==='settings'&&<section className="st-block" aria-label="설정" data-testid="section-settings">
    <h2>설정·백업</h2>
    <label className="pm-check"><input type="checkbox" data-testid="checkbox-archive-reminders" checked={studio.archiveReminders} onChange={e=>act({type:'studio.settings',archiveReminders:e.target.checked})}/>보관한 지 7일 지난 과제를 작게 알려 주기</label>
    <h3>화면 색</h3>
    <div className="pm-chips">{([['ivory','아이보리'],['navy','차분한 네이비']] as const).map(([k,l])=><button key={k} aria-pressed={studio.appearance===k} data-testid={`button-appearance-${k}`} onClick={()=>act({type:'studio.settings',appearance:k})}>{l}</button>)}</div>
    <p className="st-note">지난 공간 기록 가져오기는 지금 공간에 과제가 하나도 없을 때만 쓸 수 있어요. 기존 기록을 덮어쓰지 않기 위해서예요.</p>
    <p className="pm-banner" data-testid="text-privacy">이 브라우저에만 저장돼요. 로그인·서버·기기 간 동기화는 없습니다. 백업 파일은 평문이므로 직접 보관하세요.</p>
    <div className="st-row">
     <button data-testid="button-backup" onClick={()=>p.backup('personal')}>내 기록 백업</button>
     {!demoAudience&&<label className="pm-file">복원<input type="file" accept="application/json,.json" data-testid="input-restore" onChange={e=>{const f=e.target.files?.[0];if(f)p.restore(f);e.target.value='';}}/></label>}
     {!demoAudience&&<button data-testid="button-copy-previous" disabled={!copyPrevious||student.cards.length>0} onClick={()=>copyPrevious?.()}>지난 공간 기록 가져오기</button>}
     {state.onboarding&&<button data-testid="button-guide-replay" onClick={()=>act({type:'onboarding',done:false})}>안내 다시 보기</button>}
    </div>
   </section>}
  </>}


  {!needsSetup&&<nav className="st-bottom" aria-label="화면 (모바일)">{MOBILE.map(([k,l])=><button key={k} aria-current={page===k?'page':undefined} data-testid={`mtab-${k}`} onClick={()=>go(k)}>{l}</button>)}{moreMenu('bottom',MMORE)}</nav>}
 </div>;
}
export default StudioApp;
