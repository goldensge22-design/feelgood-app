import {useState} from 'react';
import type {Lesson,Student} from './model';
import {AXIS_NAMES} from './model';
import {routeFor} from './domain';
import {t,C,FIELD_LABEL} from './copy';
import type {Lab} from './lab';
import Profile from './Profile';

function LessonBox({lesson,lab,student,go}:{lesson:Lesson;lab:Lab;student:Student;go:Go}){
 const lang=lab.state.language;
 const card=student.cards.find(c=>c.sourceClassId===lesson.id);
 const [f,setF]=useState<{goal:boolean;method:boolean;reflection:boolean;experience:string}>({goal:false,method:false,reflection:false,experience:''});
 const [point,setPoint]=useState('');const [need,setNeed]=useState('');
 const [linkId,setLinkId]=useState('');
 const mine=lab.state.shared.filter(s=>s.classId===lesson.id&&s.studentId===student.id);
 const reqs=lab.state.requests.filter(r=>r.classId===lesson.id&&r.studentId===student.id);
 const expText=(id:string)=>{const e=student.experiences.find(x=>x.id===id);return e?[e.situation,e.role,e.action,e.result].filter(v=>v&&v.trim()).join(' · '):'';};
 const preview:[string,string][]=card?[
  ...(f.goal?[[FIELD_LABEL.goal,card.goal||C.blank] as [string,string]]:[]),
  ...(f.method?[[FIELD_LABEL.method,card.method||C.blank] as [string,string]]:[]),
  ...(f.reflection?[[FIELD_LABEL.reflection,card.reflection||C.blank] as [string,string]]:[]),
  ...(f.experience?[[FIELD_LABEL.experience,expText(f.experience)] as [string,string]]:[])]:[];
 const paused=card?student.runs.find(r=>r.cardId===card.id&&r.phase!=='closed'):undefined;
 const closedRuns=card?student.runs.filter(r=>r.cardId===card.id&&r.phase==='closed').length:0;
 return <article className="nx-card" data-testid={'lesson-'+lesson.id}>
  <p className="nx-eyebrow">{lesson.template==='overnight'?'하룻밤 과제':lesson.template+'분 수업'} · 코드 {lesson.code}{lesson.ended?' · 끝난 수업':''}</p>
   <h3>{lesson.title}</h3>{lesson.activities&&<p style={{whiteSpace:'pre-line'}}>{lesson.activities}</p>}
   <p>기간 {lesson.startDate} ~ {lesson.endDate} · 활동 시간 {lesson.minutes}분</p>
   {lesson.template==='overnight'&&!lesson.ended&&<section className="nx-panel" aria-label="1박2일 캠프의 내 진행">
    <div className="nx-row">{([1,2] as const).map(day=><button key={day} aria-pressed={(student.campDays[lesson.id]??1)===day} onClick={()=>lab.act({type:'lesson.day',lessonId:lesson.id,day})}>{day}일차</button>)}</div>
    {(student.campDays[lesson.id]??1)===1?<><h4>결과와 내 경험 → 내 카드 → 짧게 해보기</h4><p>위에서 내 경험을 비교하고 아래에서 카드를 내 계획에 넣어요. 실행을 잠시 멈춘 뒤 필요한 경우 다음 위치를 남겨요.</p></>:<><h4>돌아온 자리 → 고쳐서 다시 실행 → 다음 주 한 걸음</h4><p>저장한 깃발과 원래 카드를 이어 쓰세요. 범위·단계를 고쳐 다시 실행한 뒤 이번 주 행동을 1~2개만 고릅니다.</p><button onClick={()=>go('everyday')}>다음 주 행동 1~2개 고르기</button></>}
   </section>}
   {!card?<><label>이미 있는 내 과제에 연결(선택)<select value={linkId} onChange={e=>setLinkId(e.target.value)}><option value="">새 수업 카드 하나 만들기</option>{student.cards.filter(c=>c.status==='planned'&&!c.sourceClassId).map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label><button className="nx-primary" disabled={lesson.ended} onClick={()=>lab.act({type:'lesson.card',lessonId:lesson.id,cardId:linkId||undefined})}>이 수업 블록을 내 계획에 넣기</button></>
  :<div className="nx-day"><p className="nx-ok">{C.inPlan}: {card.title}</p>
   {paused&&<p className="nx-hold">{C.returnSpot}: {card.firstAction||card.title}{paused.flag?' · '+paused.flag:''}</p>}
   <div className="nx-row"><button className="nx-primary" onClick={()=>go(paused?'now':'plan')}>{paused?C.goNow:C.goPlan}</button>{closedRuns>0&&<button onClick={()=>go('everyday')}>{C.nextWeek}</button>}</div>
   <small>{closedRuns>0?C.day2:C.day1}</small></div>}
  {card&&!lesson.ended&&<>
   <details><summary>선생님에게 공유하기</summary>
    <p className="nx-note">고른 항목만 복사돼요. 일정, 메모, 생각, 결과지 점수는 보내지 않아요.</p>
    <label className="nx-checkline"><input type="checkbox" checked={f.goal} onChange={e=>setF({...f,goal:e.target.checked})}/>목표</label>
    <label className="nx-checkline"><input type="checkbox" checked={f.method} onChange={e=>setF({...f,method:e.target.checked})}/>방법</label>
    <label className="nx-checkline"><input type="checkbox" checked={f.reflection} onChange={e=>setF({...f,reflection:e.target.checked})}/>돌아보기</label>
    <label>경험(선택)<select value={f.experience} onChange={e=>setF({...f,experience:e.target.value})}><option value="">보내지 않음</option>{student.experiences.filter(e=>e.cardId===card.id).map(e=><option key={e.id} value={e.id}>{e.situation}</option>)}</select></label>
    <div className="nx-preview" data-testid="preview-share"><b>{t(lang,'preview')}</b>{preview.length===0?<p>고른 항목이 없어요.</p>:<dl>{preview.map(([k,v])=><div key={k}><dt>{FIELD_LABEL[k]??k}</dt><dd>{v}</dd></div>)}</dl>}</div>
    <button className="nx-primary" disabled={preview.length===0} data-testid="button-share" onClick={()=>lab.act({type:'share.save',lessonId:lesson.id,cardId:card.id,fields:{...(f.goal?{goal:true}:{}),...(f.method?{method:true}:{}),...(f.reflection?{reflection:true}:{}),...(f.experience?{experience:f.experience}:{})}})}>이 내용 그대로 보내기</button>
   </details>
   <details><summary>{t(lang,'help')}</summary>
    <label>어디에서 막혔나요?<input value={point} onChange={e=>setPoint(e.target.value)}/></label>
    <label>어떤 도움이 필요해요?<input value={need} onChange={e=>setNeed(e.target.value)}/></label>
    <div className="nx-row">{['설명 한 번 듣기','다음 행동 같이 고르기','자료 함께 확인하기'].map(v=><button key={v} aria-pressed={need===v} onClick={()=>setNeed(v)}>{v}</button>)}</div>
    <button className="nx-primary" disabled={!point.trim()||!need.trim()} onClick={()=>{if(lab.act({type:'help.create',lessonId:lesson.id,cardId:card.id,point,need})){setPoint('');setNeed('');}}}>요청 보내기</button>
   </details></>}
  {mine.map(s=><div key={s.id} className="nx-shared"><b>보낸 공유 · {s.at.slice(0,16).replace('T',' ')}</b><dl>{Object.entries(s.fields).map(([k,v])=><div key={k}><dt>{FIELD_LABEL[k]??k}</dt><dd>{v}</dd></div>)}</dl>
   {s.feedback.map(fb=><p key={fb.id} className="nx-fb">{t(lang,'feedback')}: {fb.text} · 다음 {fb.nextDate}</p>)}
   <button onClick={()=>lab.act({type:'share.withdraw',shareId:s.id})}>{t(lang,'withdraw')}</button></div>)}
  {reqs.map(r=><p key={r.id} className="nx-fb">요청: {r.point} · {r.status==='answered'?'답: '+r.answer+' · '+r.nextDate:'기다리는 중'}</p>)}
  <button onClick={()=>lab.act({type:'lesson.leave',lessonId:lesson.id})}>{t(lang,'leave')}</button>
 </article>;
}
type Go=(p:'plan'|'now'|'everyday')=>void;
export default function ClassPage({lab,student,go}:{lab:Lab;student:Student;go:Go}){
 const lang=lab.state.language;const [code,setCode]=useState('');const [note,setNote]=useState(student.comparisonNote);
 const lessons=lab.state.lessons.filter(l=>student.joined.includes(l.id));
 const r=routeFor(student);
 return <div className="nx-page">
  <section className="nx-card"><h2>{C.selfTitle}</h2>
   {!student.assessment&&<><p>{C.noAssessment}</p><div className="nx-row">{(['planning','attention','simultaneous','successive'] as const).map(x=><button key={x} aria-pressed={student.difficulty===x} onClick={()=>lab.act({type:'student.settings',changes:{difficulty:x}})}>{AXIS_NAMES[x]}</button>)}</div><button onClick={()=>lab.act({type:'student.general'})}>{C.general}</button></>}
   <p>{C.compareQ}</p>
   <div className="nx-row">{(['agree','different','unsure'] as const).map(v=><button key={v} aria-pressed={student.comparison===v} onClick={()=>lab.act({type:'student.comparison',value:v,note})}>{C['cmp_'+v as 'cmp_agree']}</button>)}</div>
   <label>{C.whyOptional}<input value={note} onChange={e=>setNote(e.target.value)} onBlur={()=>student.comparison&&lab.act({type:'student.comparison',value:student.comparison,note})}/></label></section>
  <section className="nx-card nx-action"><h2>{t(lang,'join')}</h2><form className="nx-row" onSubmit={e=>{e.preventDefault();if(lab.act({type:'lesson.join',code:code.trim()}))setCode('');}}><input aria-label={t(lang,'code')} value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder={t(lang,'code')} data-testid="input-join-code"/><button className="nx-primary" type="submit" disabled={!code.trim()}>참여</button></form></section>
  {lessons.length===0?<p className="nx-empty">참여한 수업이 없어요. 선생님이 알려준 코드를 넣어 보세요.</p>:lessons.map(l=><LessonBox key={l.id} lesson={l} lab={lab} student={student} go={go}/>)}
  <section className="nx-card"><h2>{C.profileTitle}</h2><Profile student={student} compact/>{!r.warning&&<p>요즘 연습하는 방식: <b>{AXIS_NAMES[r.target]}</b>. 수업 블록에서도 같은 도움을 고를 수 있고, 끌 수도 있어요. 이 화면은 선생님에게 보이지 않아요.</p>}</section>
 </div>;
}
