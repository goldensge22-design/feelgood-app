import {useState} from 'react';
import type {Lesson} from './model';
import type {Lab} from './lab';
import {FIELD_LABEL} from './copy';

const NAMES:Record<string,string>={'student-a':'학생 A','student-b':'학생 B'};
function LessonEdit({lesson,lab}:{lesson:Lesson;lab:Lab}){
 const [f,setF]=useState({title:lesson.title,minutes:String(lesson.minutes),activities:lesson.activities,startDate:lesson.startDate,endDate:lesson.endDate});
 const shared=lab.state.shared.filter(s=>s.classId===lesson.id);const reqs=lab.state.requests.filter(r=>r.classId===lesson.id);
 return <article className="nx-card" data-testid={'teacher-lesson-'+lesson.id}>
  <p className="nx-eyebrow">{lesson.template==='overnight'?'하룻밤':lesson.template+'분'} · {lesson.published?'공개됨':'준비 중'}{lesson.ended?' · 끝남':''} · 참여 {lesson.members.length}명</p>
  <h3>{lesson.title}</h3>{lesson.published&&<p className="nx-code" data-testid={'text-code-'+lesson.id}>수업 코드 <b>{lesson.code}</b></p>}
  <p>기간 {lesson.startDate} ~ {lesson.endDate} · 활동 시간 {lesson.minutes}분</p>
  {!lesson.ended&&<details><summary>수업 고치기</summary><form className="nx-form" onSubmit={e=>{e.preventDefault();lab.act({type:'lesson.update',lessonId:lesson.id,changes:{title:f.title,minutes:Number(f.minutes)||lesson.minutes,activities:f.activities,startDate:f.startDate,endDate:f.endDate}});}}>
   <label>시작 날짜<input type="date" value={f.startDate} onChange={e=>setF({...f,startDate:e.target.value})}/></label><label>마지막 날짜<input type="date" value={f.endDate} onChange={e=>setF({...f,endDate:e.target.value})}/></label>
   <label>제목<input value={f.title} onChange={e=>setF({...f,title:e.target.value})}/></label><label>시간(분)<input inputMode="numeric" value={f.minutes} onChange={e=>setF({...f,minutes:e.target.value.replace(/\D/g,'')})}/></label>
   <label>활동<textarea value={f.activities} onChange={e=>setF({...f,activities:e.target.value})}/></label><button className="nx-primary" type="submit">저장</button></form></details>}
  <div className="nx-row">{!lesson.published&&<button className="nx-primary" onClick={()=>lab.act({type:'lesson.publish',lessonId:lesson.id})}>공개하고 코드 만들기</button>}
   {lesson.published&&!lesson.ended&&<button onClick={()=>window.confirm('수업을 끝내면 학생 공유가 수업에서 사라져요. 학생 개인 계획은 남아요.')&&lab.act({type:'lesson.end',lessonId:lesson.id})}>수업 끝내기</button>}</div>
  <h4>학생이 보낸 공유 ({shared.length})</h4>{shared.length===0&&<p className="nx-empty">학생이 고른 항목만 여기에 보여요.</p>}
  {shared.map(s=><Share key={s.id} id={s.id} lab={lab}/>)}
  <h4>도움 요청 ({reqs.length})</h4>{reqs.map(r=><Req key={r.id} id={r.id} lab={lab}/>)}
 </article>;
}
function Share({id,lab}:{id:string;lab:Lab}){const s=lab.state.shared.find(x=>x.id===id)!;const [text,setText]=useState('');const [d,setD]=useState('');
 return <div className="nx-shared"><b>{NAMES[s.studentId]??'학생'} · {s.title}</b><dl>{Object.entries(s.fields).map(([k,v])=><div key={k}><dt>{FIELD_LABEL[k]??k}</dt><dd>{v}</dd></div>)}</dl>
  {s.feedback.map(f=><p key={f.id} className="nx-fb">보낸 피드백: {f.text} · {f.nextDate}</p>)}
  <div className="nx-row"><input aria-label="피드백" value={text} onChange={e=>setText(e.target.value)} placeholder="관찰한 행동 중심으로"/><input aria-label="다음 날짜" type="date" value={d} onChange={e=>setD(e.target.value)}/><button className="nx-primary" disabled={!text.trim()} onClick={()=>{if(lab.act({type:'feedback.save',shareId:s.id,text,nextDate:d}))setText('');}}>피드백 보내기</button></div></div>;}
function Req({id,lab}:{id:string;lab:Lab}){const r=lab.state.requests.find(x=>x.id===id)!;const [a,setA]=useState('');const [d,setD]=useState('');
 return <div className="nx-shared"><b>{NAMES[r.studentId]??'학생'} · {r.point}</b><p>필요: {r.need}</p>{r.status==='answered'?<p className="nx-fb">답: {r.answer} · {r.nextDate}</p>:
 <div className="nx-row"><input aria-label="답" value={a} onChange={e=>setA(e.target.value)}/><input aria-label="다음 날짜" type="date" value={d} onChange={e=>setD(e.target.value)}/><button className="nx-primary" disabled={!a.trim()} onClick={()=>lab.act({type:'help.answer',requestId:r.id,answer:a,nextDate:d})}>답하기</button></div>}</div>;}

export default function TeacherPage({lab}:{lab:Lab}){
 const [title,setTitle]=useState('');const [tpl,setTpl]=useState<'45'|'90'|'overnight'>('45');const [act,setAct]=useState('');
 return <div className="nx-page">
  <section className="nx-card nx-action"><h2>새 수업 만들기</h2><p className="nx-note">선생님 화면에는 학생이 공유한 항목과 요청만 보여요. 개인 계획·점수는 보이지 않아요.</p>
   <form className="nx-form" onSubmit={e=>{e.preventDefault();if(lab.act({type:'lesson.create',title:title.trim(),template:tpl,activities:act}))setTitle('');}}>
    <label>수업 이름<input value={title} onChange={e=>setTitle(e.target.value)} data-testid="input-lesson-title"/></label>
    <div className="nx-row">{(['45','90','overnight'] as const).map(x=><button type="button" key={x} aria-pressed={tpl===x} onClick={()=>setTpl(x)}>{x==='overnight'?'1박2일 캠프':x+'분 수업'}</button>)}</div>
    <label>활동 흐름<textarea value={act} onChange={e=>setAct(e.target.value)}/></label>
    <button className="nx-primary" type="submit" disabled={!title.trim()} data-testid="button-create-lesson">만들기</button></form></section>
  {lab.state.lessons.length===0?<p className="nx-empty">아직 만든 수업이 없어요.</p>:[...lab.state.lessons].reverse().map(l=><LessonEdit key={l.id} lesson={l} lab={lab}/>)}
 </div>;
}
