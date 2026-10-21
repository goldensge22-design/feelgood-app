import {useEffect,useState} from 'react';
import {useLab} from './store';
import {t,LANGS,C,setLongQA,isLongQA} from './copy';
import {feelgoodLogo} from '../official/adaptive/brandAssets';
import PlanPage from './PlanPage';
import NowPage from './NowPage';
import ReflectPage from './ReflectPage';
import EverydayPage from './EverydayPage';
import ClassPage from './ClassPage';
import TeacherPage from './TeacherPage';
import QABoard from './QABoard';
import type {Actor} from './model';

type Page='plan'|'now'|'reflect'|'everyday'|'class';
const qp=new URLSearchParams(location.search);const isQA=qp.get('qa')==='1';if(!isQA)setLongQA(false,false);const qa=qp.get('qa')==='1'&&qp.get('view')!=='plan';const qaPlan=qp.get('qa')==='1'&&qp.get('view')==='plan';
const compareBoard=new URLSearchParams(location.search).get('board')==='1';

function App(){
 const rawLab=useLab();
 const lab=isQA?rawLab:{...rawLab,state:{...rawLab.state,language:'ko' as const}};
 const {state,student,act,message,clearMessage}=lab;
 const [page,setPage]=useState<Page>(()=>student?.runs.some(r=>r.phase!=='closed')?'now':'plan');
 const [selectedCard,setSelectedCard]=useState<string>();
 const [long,setLong]=useState(isLongQA());
 const lang=isQA?state.language:'ko';
 useEffect(()=>{if(student?.runs.some(r=>r.phase!=='closed'))setPage('now');},[student?.id]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';},[lang]);
 useEffect(()=>{if(!message)return;const id=setTimeout(clearMessage,5000);return()=>clearTimeout(id);},[message,clearMessage]);
 const roles:[Actor,string][]=[['student-a',t(lang,'studentA')],['student-b',t(lang,'studentB')],['teacher',t(lang,'teacher')]];
 const pages:[Page,string][]=[['plan',t(lang,'plan')],['now',t(lang,'now')],['reflect',t(lang,'reflect')],['everyday',t(lang,'everyday')],['class',t(lang,'klass')]];
 const reviewed=LANGS.find(l=>l.id===lang)?.reviewed;
 return <div className="nx-root">
  <div className="nx-demo" role="note" data-testid="text-demo-boundary">{t(lang,'demo')}</div>
  <header className="nx-head">
   <div className="nx-brand"><img src={feelgoodLogo} alt="FeelGood" className="nx-logo"/><h1>{t(lang,'brand')}</h1><p>{t(lang,'sub')}</p></div>
   <div className="nx-switches">
    <fieldset className="nx-seg"><legend>{t(lang,'role')}</legend>{roles.map(([id,l])=><button key={id} aria-pressed={state.active===id} data-testid={'button-role-'+id} onClick={()=>act({type:'role',actor:id})}>{l}</button>)}</fieldset>
    {isQA&&<>    <label className="nx-lang">Language<select data-testid="select-language" value={lang} onChange={e=>act({type:'language',language:e.target.value})}>{LANGS.map(l=><option key={l.id} value={l.id}>{l.label}{l.reviewed?'':' *'}</option>)}</select></label><label className="nx-checkline nx-lang"><input type="checkbox" data-testid="toggle-qa-long" checked={long} onChange={e=>{setLongQA(e.target.checked);setLong(e.target.checked);}}/>QA long text</label></>}
   </div>
  </header>
  {isQA&&!reviewed&&<p className="nx-note" data-testid="text-unreviewed">{t(lang,'unreviewed')}</p>}
  {lab.loadError&&<p className="nx-error" role="alert">{String(lab.loadError)}</p>}
  {message&&<div className="nx-toast" role="status" data-testid="text-message"><span>{message}</span><button onClick={clearMessage}>닫기</button></div>}
  {qa? <QABoard lab={lab}/> : compareBoard? <QABoard lab={lab} compare/> : state.active==='teacher'? <TeacherPage lab={lab}/> : student? <>
   <nav className="nx-tabs" aria-label="페이지">{pages.map(([id,l])=><button key={id} aria-current={page===id?'page':undefined} data-testid={'tab-'+id} onClick={()=>setPage(id)}>{l}{id==='now'&&student.runs.some(r=>r.phase!=='closed')?' ·':''}</button>)}</nav>
   <main key={student.id}>
    {page==='plan'&&<PlanPage lab={lab} student={student} selectedId={selectedCard} goNow={()=>setPage('now')}/>}
    {page==='now'&&<NowPage lab={lab} student={student} goPlan={()=>setPage('plan')}/>}
    {page==='reflect'&&<ReflectPage lab={lab} student={student}/>}
    {page==='everyday'&&<EverydayPage lab={lab} student={student} openCard={id=>{setSelectedCard(id);setPage('plan');}}/>}
    {page==='class'&&<ClassPage lab={lab} student={student} go={setPage}/>}
   </main></> : <p className="nx-card">학생 데이터를 불러오지 못했어요.</p>}
  <footer className="nx-foot">
   <button data-testid="button-backup" onClick={()=>lab.backup()}>{t(lang,'backup')}</button>
   <label className="nx-file">{t(lang,'restore')}<input type="file" accept="application/json" data-testid="input-restore" onChange={e=>{const f=e.target.files?.[0];if(f)lab.restore(f);e.target.value='';}}/></label>
   <a href={`${import.meta.env.BASE_URL}?compare=1&student=1`} data-testid="link-compare-old">{t(lang,'compareOld')}</a>
   <a href="?board=1" data-testid="link-compare-new">{t(lang,'compareNew')}</a>
   {(qa||compareBoard)&&<a href="?">일반 화면으로</a>}
   {qa&&<a href="?qa=1&view=plan" data-testid="link-qa-plan">{C.qaPlan}</a>}{qaPlan&&<a href="?qa=1">{C.qaBoard}</a>}
  </footer>
 </div>;
}
export default App;
