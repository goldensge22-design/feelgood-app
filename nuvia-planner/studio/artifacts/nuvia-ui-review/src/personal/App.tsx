import {useEffect,useState} from 'react';
import './personal.css';
import {usePersonal} from './store';
import {localDate,monthOf} from './domain';
import {feelgoodLogo} from '../official/adaptive/brandAssets';
import TodayPage from './TodayPage';
import MonthPage from './MonthPage';
import ReportPage from './ReportPage';
import GrowthPage from './GrowthPage';
import ReviewPanel from './ReviewPanel';
import AssessmentPanel from './AssessmentPanel';
import PersonalGuide from './PersonalGuide';

type Page='today'|'month'|'report'|'growth';
const PAGES:Page[]=['today','month','report','growth'];
const navKey=(ws:string,mode:string)=>`nuvia-personal-nav:${ws}:${mode}`;
function readNav(k:string):{page?:string;month?:string}{try{return JSON.parse(sessionStorage.getItem(k)??'{}')??{};}catch{return {};}}
function writeNav(k:string,v:{page:string;month:string}){try{sessionStorage.setItem(k,JSON.stringify(v));}catch{/* storage blocked: keep in memory only */}}
const REVIEW=new URLSearchParams(location.search).get('review')==='1';
const TABS:[Page,string][]=[['today','오늘'],['month','이번 달'],['report','보고서'],['growth','방법·목표']];

function App(){
 const p=usePersonal();
 const {state,student,act}=p;
 const key=navKey(state.workspaceId,REVIEW?'review':'personal');
 const [page,setPage]=useState<Page>(()=>{const v=readNav(key).page;return PAGES.includes(v as Page)?v as Page:'today';});
 const [month,setMonth]=useState(()=>{const v=readNav(key).month;return typeof v==='string'&&/^\d{4}-\d{2}$/.test(v)?v:monthOf(localDate());});
 useEffect(()=>{writeNav(key,{page,month});},[key,page,month]);
 const months=[...new Set([month,monthOf(localDate()),...state.entries.map(e=>monthOf(e.localDate)),...state.agreements.map(a=>a.month)])].sort().reverse();
 return <div className="pm-root" lang={REVIEW?state.lab.language:'ko'} dir={REVIEW&&state.lab.language==='ar'?'rtl':'ltr'}>
  {REVIEW&&<p className="pm-banner review">검토 모드 · 합성 데이터와 단계 전환은 이 모드에서만 보입니다.</p>}
  <header className="pm-head">
   <div className="pm-brand"><img src={feelgoodLogo} alt="FeelGood"/><div><small>FeelGood</small><h1>NUVIA PLANNER</h1><p>나의 하루와 한 달</p></div></div>
   {page!=='today'&&<label style={{margin:0,minWidth:160}}>달 고르기<select data-testid="month-select" value={month} onChange={e=>setMonth(e.target.value)}>{months.map(m=><option key={m} value={m}>{m}</option>)}</select></label>}
  </header>
  <p className="pm-banner" data-testid="privacy-note">이 브라우저에만 저장돼요. 결과지·로그인·서버·기기 간 동기화는 미연결입니다. 내 기록 백업은 같은 개인 공간의 복원용 평문 파일이므로 직접 보관하세요.</p>
  {p.message&&<div className="pm-toast" role="status"><span>{p.message}</span><button onClick={p.clearMessage}>닫기</button></div>}
  {p.error&&<div className="pm-toast err" role="alert"><span>{p.error}</span><button onClick={p.clearMessage}>닫기</button></div>}
  <nav className="pm-tabs" aria-label="화면">{TABS.map(([k,l])=><button key={k} aria-current={page===k?'page':undefined} onClick={()=>setPage(k)} data-testid={`tab-${k}`}>{l}</button>)}</nav>
  <AssessmentPanel state={state} act={act} review={REVIEW} running={!!student.runs.some(r=>r.phase!=='closed')}/>
  {!state.onboarding&&<PersonalGuide state={state} done={v=>act({type:'onboarding',done:v})}/>}
  {REVIEW&&<ReviewPanel state={state} act={act} backup={p.backup}/>}
  {page==='today'&&<TodayPage state={state} student={student} act={act}/>}
  {page==='month'&&<MonthPage state={state} month={month} act={act}/>}
  {page==='report'&&<ReportPage month={month} report={p.report}/>}
  {page==='growth'&&<GrowthPage state={state} student={student} act={act}/>}
  <footer className="pm-foot">
   <button data-testid="personal-backup" onClick={()=>p.backup('personal')}>내 기록 백업</button>
   <label className="pm-file">복원<input type="file" accept="application/json,.json" data-testid="personal-restore" onChange={e=>{const f=e.target.files?.[0];if(f)p.restore(f);e.target.value='';}}/></label>
   {state.onboarding&&<button onClick={()=>act({type:'onboarding',done:false})} data-testid="guide-replay">안내 다시 보기</button>}
   
  </footer>
 </div>;
}
export default App;
