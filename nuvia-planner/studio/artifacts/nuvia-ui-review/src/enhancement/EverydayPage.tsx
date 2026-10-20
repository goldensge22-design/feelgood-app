import {useState} from 'react';
import type {Experience,Goal,Student} from './model';
import {today,type Lab} from './lab';
import {C} from './copy';

function GoalForm({lab,goal,onDone}:{lab:Lab;goal?:Goal;onDone?:()=>void}){
 const [f,setF]=useState({far:goal?.far??'',middle:goal?.middle??'',weekly:goal?.weekly??'',date:goal?.date??today(),status:goal?.status??'active'});
 return <form className="nx-form nx-goalform" onSubmit={e=>{e.preventDefault();if(lab.act({type:'goal.save',id:goal?.id,...f})){if(!goal)setF({...f,far:'',middle:'',weekly:''});onDone?.();}}}>
  <label>멀리 있는 목표<input value={f.far} onChange={e=>setF({...f,far:e.target.value})}/></label>
  <label>중간 목표<input value={f.middle} onChange={e=>setF({...f,middle:e.target.value})}/></label>
  <label>이번 주 할 일<input value={f.weekly} onChange={e=>setF({...f,weekly:e.target.value})}/></label>
  <label>날짜<input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></label>
  <label>상태<select value={f.status} onChange={e=>setF({...f,status:e.target.value as Goal['status']})}><option value="active">진행</option><option value="paused">잠시 쉼</option></select></label>
  <button className="nx-primary" type="submit">{goal?'목표 저장':'목표 추가'}</button></form>;
}
function ExpForm({lab,student,exp,onDone}:{lab:Lab;student:Student;exp?:Experience;onDone?:()=>void}){
 const closed=student.runs.filter(r=>r.phase==='closed');
 const [f,setF]=useState({runId:exp?.runId??closed[closed.length-1]?.id??'',situation:exp?.situation??'',role:exp?.role??'',action:exp?.action??'',result:exp?.result??'',selected:exp?.selected??false});
 if(!exp&&closed.length===0)return <p className="nx-empty">경험은 실제로 마친 블록에서 시작해요. 먼저 하나를 해보고 닫아 주세요.</p>;
 return <form className="nx-form" onSubmit={e=>{e.preventDefault();if(lab.act({type:'experience.save',id:exp?.id,...f})){onDone?.();}}}>
  {!exp&&<label>어떤 기록에서?<select value={f.runId} onChange={e=>setF({...f,runId:e.target.value})}>{closed.map(r=><option key={r.id} value={r.id}>{student.cards.find(c=>c.id===r.cardId)?.title} · {r.startedAt.slice(0,10)}</option>)}</select></label>}
  <label>상황<input value={f.situation} onChange={e=>setF({...f,situation:e.target.value})}/></label>
  <label>내 역할<input value={f.role} onChange={e=>setF({...f,role:e.target.value})}/></label>
  <label>내가 한 행동<input value={f.action} onChange={e=>setF({...f,action:e.target.value})}/></label>
  <label>결과<input value={f.result} onChange={e=>setF({...f,result:e.target.value})}/></label>
  <label className="nx-checkline"><input type="checkbox" checked={f.selected} onChange={e=>setF({...f,selected:e.target.checked})}/>대표 경험으로 고르기</label>
  <button className="nx-primary" type="submit">경험 저장</button></form>;
}
export default function EverydayPage({lab,student,openCard}:{lab:Lab;student:Student;openCard:(id:string)=>void}){
 const [editG,setEditG]=useState<string|null>(null);const [editE,setEditE]=useState<string|null>(null);
 const [x,setX]=useState(student.exploration);
 const unscheduled=student.goals.filter(g=>!g.cardId&&g.status==='active');
 return <div className="nx-page">
   <section className="nx-card"><h2>내 행동카드 · 일상으로 이어가기</h2><p>이미 내 계획에 있는 같은 과제를 엽니다. 다시 입력하거나 과제를 복제하지 않아요.</p><ul className="nx-ul">{student.cards.filter(c=>c.status==='planned'||student.runs.some(r=>r.cardId===c.id)).map(c=><li className="nx-method" key={c.id}><b>{c.title}</b><span>목표: {c.goal}</span><span>방법: {c.method||'필요할 때 고르기'} · 첫 행동: {c.firstAction||'시작할 때 고르기'}</span>{c.condition&&<small>조건: {c.condition}</small>}{c.alternative&&<small>막히면: {c.alternative}</small>}{c.reflection&&<small>돌아보기: {c.reflection}</small>}<button onClick={()=>openCard(c.id)}>플래너에서 실행하기</button></li>)}</ul></section>
  {unscheduled.length>0&&<section className="nx-card nx-action"><h2>시간표에 넣을 목표</h2><ul className="nx-ul">{unscheduled.map(g=><li key={g.id} className="nx-method"><b>{g.weekly||g.middle}</b><span>{g.date}</span><button className="nx-primary" onClick={()=>lab.act({type:'goal.schedule',goalId:g.id})}>오늘 블록으로 넣기</button></li>)}</ul></section>}
  <section className="nx-card"><h2>목표 지도</h2>
   {student.goals.length===0&&<p className="nx-empty">멀리 있는 목표 하나부터 이번 주 할 일까지 이어 보세요.</p>}
   <ul className="nx-ul">{student.goals.map(g=><li key={g.id} className="nx-goalmap"><div className="nx-gm"><span>{g.far}</span><span>{g.middle}</span><span>{g.weekly}</span></div><small>{g.date} · {g.status==='active'?'진행':'쉼'} · {g.cardId?'시간표에 있음':'아직 시간표 밖'}</small>
    <span className="nx-row"><button onClick={()=>lab.act({type:'goal.save',id:g.id,far:g.far,middle:g.middle,weekly:g.weekly,date:g.date,status:g.status==='active'?'paused':'active'})}>{g.status==='active'?C.pause:C.resumeGoal}</button>{!g.cardId&&g.status==='active'&&<button onClick={()=>lab.act({type:'goal.schedule',goalId:g.id})}>{C.schedule}</button>}<button onClick={()=>setEditG(editG===g.id?null:g.id)}>{editG===g.id?'닫기':'고치기'}</button></span>{editG===g.id&&<GoalForm lab={lab} goal={g} onDone={()=>setEditG(null)}/>}</li>)}</ul>
   <details><summary>목표 추가</summary><GoalForm lab={lab}/></details></section>
  <section className="nx-card"><h2>경험 기록</h2>
   <ul className="nx-ul">{student.experiences.map(e=><li key={e.id} className="nx-method"><b>{e.situation||'상황 미기록'}{e.selected?' · 대표':''}</b><span>{e.role} → {e.action} → {e.result}</span><small>{e.fact}</small><span className="nx-row"><button aria-pressed={e.selected} onClick={()=>lab.act({type:'experience.save',id:e.id,runId:e.runId,situation:e.situation,role:e.role,action:e.action,result:e.result,selected:!e.selected})}>{e.selected?C.unMain:C.makeMain}</button><button onClick={()=>setEditE(editE===e.id?null:e.id)}>{editE===e.id?'닫기':'고치기'}</button></span>{editE===e.id&&<ExpForm lab={lab} student={student} exp={e} onDone={()=>setEditE(null)}/>}</li>)}</ul>
   <details open={student.experiences.length===0}><summary>새 경험 쓰기</summary><ExpForm lab={lab} student={student}/></details></section>
  <section className="nx-card"><h2>두 가지 길 견주어 보기</h2><p>관심 있는 진로·활동 두 개를 나란히 놓고 공통점과 차이를 적어요. 정답은 없어요.</p>
   <div className="nx-two"><label>후보 1<input value={x.first} onChange={e=>setX({...x,first:e.target.value})}/></label><label>후보 2<input value={x.second} onChange={e=>setX({...x,second:e.target.value})}/></label></div>
   <label>공통점<input value={x.common} onChange={e=>setX({...x,common:e.target.value})}/></label>
   <label>다른 점<input value={x.different} onChange={e=>setX({...x,different:e.target.value})}/></label>
   <label>더 알고 싶은 질문<input value={x.question} onChange={e=>setX({...x,question:e.target.value})}/></label>
   <label>이번 주 해볼 행동<input value={x.action} onChange={e=>setX({...x,action:e.target.value})}/></label>
   <button className="nx-primary" disabled={!x.first.trim()||!x.second.trim()} onClick={()=>lab.act({type:'student.exploration',changes:x})}>탐색 저장</button></section>
 </div>;
}
