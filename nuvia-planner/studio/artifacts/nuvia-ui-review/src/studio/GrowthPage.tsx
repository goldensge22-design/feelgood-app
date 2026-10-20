import {useState} from 'react';
import type {Experience,Goal,Run,Student} from '../enhancement/model';
import type {Action,PersonalState} from './model';
import ExperienceReview from './ExperienceReview';
import {localDate,supportNames} from './domain';

type Act=(a:Action)=>boolean;
const L=(act:Act)=>(command:Record<string,unknown>)=>act({type:'legacy',command:command as never});

function MethodForm({run,student,act}:{run:Run;student:Student;act:Act}){
 const prev=student.methods.find(m=>m.runId===run.id);
 const [f,setF]=useState({name:prev?.name??run.nextMethod??'',helpful:prev?.helpful??'',note:prev?.note??''});
 const card=student.cards.find(c=>c.id===run.cardId);
 return <li className="pm-panel"><b>{card?.title??'과제'}</b> <span className="pm-note">{run.startedAt.slice(0,10)} · {supportNames[run.support]}</span>
  <div className="pm-grid3"><label>방법 이름<input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></label>
   <label>도움이 됐나요<select value={f.helpful} onChange={e=>setF({...f,helpful:e.target.value as never})}><option value="">고르기</option><option value="yes">됐어요</option><option value="no">아니요</option><option value="unsure">모르겠어요</option></select></label>
   <label>메모<input value={f.note} onChange={e=>setF({...f,note:e.target.value})}/></label></div>
  <button onClick={()=>L(act)({type:'method.save',runId:run.id,...f})}>{prev?'방법 고치기':'방법 남기기'}</button></li>;
}
function GoalForm({goal,act}:{goal?:Goal;act:Act}){
 const [f,setF]=useState({far:goal?.far??'',middle:goal?.middle??'',weekly:goal?.weekly??'',date:goal?.date??localDate(),status:goal?.status??'active'});
 return <form className="pm-panel successive" onSubmit={e=>{e.preventDefault();if(L(act)({type:'goal.save',id:goal?.id,...f})&&!goal)setF({...f,far:'',middle:'',weekly:''});}}>
  <div className="pm-grid3"><label>먼 목표<input value={f.far} onChange={e=>setF({...f,far:e.target.value})}/></label><label>중간 목표<input value={f.middle} onChange={e=>setF({...f,middle:e.target.value})}/></label><label>이번 주 한 걸음<input value={f.weekly} onChange={e=>setF({...f,weekly:e.target.value})}/></label>
   <label>날짜<input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></label>
   <label>상태<select value={f.status} onChange={e=>setF({...f,status:e.target.value as Goal['status']})}><option value="active">진행</option><option value="paused">잠시 쉼</option></select></label></div>
  <div className="pm-row"><button type="submit">{goal?'목표 저장':'목표 추가'}</button>
   {goal&&<button type="button" disabled={!!goal.cardId&&false} onClick={()=>L(act)({type:'goal.schedule',goalId:goal.id})}>{goal.cardId?'할 일로 만듦':'이번 주 할 일로 만들기'}</button>}</div>
 </form>;
}
function ExpRow({e,act}:{e:Experience;act:Act}){
 const [f,setF]=useState({situation:e.situation,role:e.role,action:e.action,result:e.result,selected:e.selected});
 return <li className="pm-panel simultaneous"><b>{e.fact}</b> <span className="pm-note">{e.createdAt.slice(0,10)}</span>
  <div className="pm-grid2">{(['situation','role','action','result'] as const).map(k=><label key={k}>{({situation:'상황',role:'내 역할',action:'한 일',result:'결과'})[k]}<input value={f[k]} onChange={x=>setF({...f,[k]:x.target.value})}/></label>)}</div>
  <label className="pm-check"><input type="checkbox" checked={f.selected} onChange={x=>setF({...f,selected:x.target.checked})}/>대표 경험으로 고르기</label>
  <button onClick={()=>L(act)({type:'experience.save',id:e.id,...f})}>경험 저장</button></li>;
}
export default function GrowthPage({state,student,act}:{state:PersonalState;student:Student;act:Act}){
 const closed=student.runs.filter(r=>r.phase==='closed').slice(-10).reverse();
 const [x,setX]=useState(student.exploration);
 return <div className="pm-page">
  <section className="pm-block"><p className="pm-eye">내 방법</p><h2>써 본 방법</h2>
   {student.methods.length>0&&<div className="pm-chips">{student.methods.map(m=><span key={m.id} className="pm-tag" style={{fontSize:13,padding:'6px 10px',background:'#eef3f9'}}>{m.name} · {m.helpful==='yes'?'도움 됨':m.helpful==='no'?'안 맞음':'모름'}</span>)}</div>}
   <details className="pm-fold"><summary>기존 개인 방법 메모 (선택)</summary>{closed.length?<ul className="pm-list">{closed.map(r=><MethodForm key={r.id} run={r} student={student} act={act}/>)}</ul>:<p className="pm-empty">실행을 한 번 마치면 그때 쓴 방법을 남길 수 있어요.</p>}</details>
  </section>
  <section className="pm-block p"><p className="pm-eye">목표 잇기</p><h2>먼 목표에서 이번 주까지</h2>
   {student.goals.map(g=><GoalForm key={g.id+(g.cardId??'')} goal={g} act={act}/>)}<GoalForm act={act}/></section>
  <section className="pm-block o"><p className="pm-eye">경험</p><h2>실제로 한 일</h2>
   {student.experiences.length?<ul className="pm-list">{student.experiences.slice(-12).reverse().map(e=><ExpRow key={e.id} e={e} act={act}/>)}</ul>:<p className="pm-empty">실행을 마치면 사실만 담긴 경험이 쌓여요.</p>}</section>
  <section className="pm-block"><p className="pm-eye">두 후보 비교</p><h2>두 가지 길을 나란히</h2>
   <div className="pm-grid2">{(['first','second','common','different','question','action'] as const).map(k=><label key={k}>{({first:'첫째 후보',second:'둘째 후보',common:'같은 점',different:'다른 점',question:'더 알아볼 것',action:'다음 행동 하나'})[k]}<input value={x[k]} onChange={e=>setX({...x,[k]:e.target.value})}/></label>)}</div>
   <button onClick={()=>L(act)({type:'student.exploration',changes:x})}>비교 저장</button>
   {(student.comparison||student.comparisonNote)&&<div className="pm-panel" data-testid="legacy-comparison"><b>이전 전체 비교(읽기 전용)</b> <span className="pm-note">{({agree:'비슷해요',different:'달라요',unsure:'모르겠어요'} as Record<string,string>)[student.comparison]??student.comparison}{student.comparisonNote?` · ${student.comparisonNote}`:''}</span></div>}
  </section>
  <ExperienceReview state={state} cards={student.cards.map(c=>({id:c.id,title:c.title}))} act={act}/>
 </div>;
}
