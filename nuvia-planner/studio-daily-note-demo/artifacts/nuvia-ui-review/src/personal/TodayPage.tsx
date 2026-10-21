import {useState} from 'react';
import Glyph from '../enhancement/Glyph';
import type {Student} from '../enhancement/model';
import type {Action,PersonalState} from './model';
import {localDate} from './domain';
import {capacity} from '../enhancement/domain';
import CardDetail from './CardDetail';
import RunPanel from './RunPanel';

export default function TodayPage({state,student,act}:{state:PersonalState;student:Student;act:(a:Action)=>boolean}){
 const today=localDate();
 const [title,setTitle]=useState('');
 const [more,setMore]=useState({subject:'',minutes:'',date:''});
 const [sel,setSel]=useState<string|null>(null);
 const [showAll,setShowAll]=useState(false);
 const add=()=>{const ok=act({type:'create',title,...(more.subject&&{subject:more.subject}),...(more.minutes&&{minutes:Number(more.minutes)}),...(more.date&&{date:more.date})});if(ok){setTitle('');setMore({subject:'',minutes:'',date:''});}};
 const todays=student.cards.filter(c=>c.date===today||!c.date);
 const others=student.cards.filter(c=>c.date&&c.date!==today).sort((a,b)=>a.date.localeCompare(b.date));
 const cap=capacity(student,today);
 const week=Array.from({length:7},(_,i)=>{const d=new Date(today+'T12:00:00');d.setDate(d.getDate()+i);return localDate(d);});
 const reuse=[...new Map(student.cards.filter(c=>c.status==='done'||c.date<today).reverse().map(c=>[c.title,c])).values()].slice(0,6);
 const dayName=(d:string)=>['일','월','화','수','목','금','토'][new Date(d+'T12:00:00').getDay()];
 const list=(cards:typeof todays)=><ul className="pm-list">{cards.map((c,i)=>{const meta=state.meta[c.id];return <li key={c.id} className={`pm-item${sel===c.id?' sel':''}${c.status==='done'?' done':''}`} data-testid={`card-${c.id}`}>
  <div className="pm-face"><button className="pm-open" aria-expanded={sel===c.id} onClick={()=>setSel(sel===c.id?null:c.id)}>
   <b><span style={{display:'inline-block',width:24,height:24,verticalAlign:'middle',marginInlineEnd:6}}><Glyph kind={student.stage==='adult'?'block':'book'}/></span>{i+1}. {c.title}</b>
   <span>{c.subject&&<span className="pm-tag">{c.subject}</span>}{meta?.kind&&<span className="pm-tag">{meta.kind}</span>}{c.minutes}분 · {c.date||'날짜 없음'}{c.status==='done'?' · 완료':''}{c.waiting?' · 기다리는 중':''}</span>
  </button></div>
  {sel===c.id&&<CardDetail key={c.id} state={state} student={student} card={c} act={act}/>}
 </li>;})}</ul>;
 return <div className="pm-page">
  <RunPanel student={student} act={act} recovery={state.recovery}/>
  <section className="pm-block o" aria-label="오늘 할 일 추가">
   <p className="pm-eye">오늘 · {today}</p>
   <h2>무엇을 할까요</h2>
   <form className="pm-add" onSubmit={e=>{e.preventDefault();add();}}>
    <label style={{margin:0}}>할 일 제목<input data-testid="new-title" value={title} onChange={e=>setTitle(e.target.value)} placeholder="제목만 적어도 돼요"/></label>
    <button className="pm-primary" data-testid="add-task" type="submit" disabled={!title.trim()}>추가</button>
   </form>
   <details className="pm-fold"><summary>과목·시간·날짜 (선택)</summary>
    <div className="pm-grid3">
     <label>과목<input value={more.subject} onChange={e=>setMore({...more,subject:e.target.value})}/></label>
     <label>분<input type="number" min={1} value={more.minutes} onChange={e=>setMore({...more,minutes:e.target.value})}/></label>
     <label>날짜<input type="date" value={more.date} onChange={e=>setMore({...more,date:e.target.value})}/></label>
    </div></details>
  </section>
  <section className="pm-block" aria-label="오늘 블록">
   <div className="pm-row" style={{justifyContent:'space-between'}}><h2 style={{margin:0}}>오늘 블록</h2>
    <label className="pm-row" style={{margin:0}}>하루 가능 시간<input type="number" min={10} style={{width:90}} aria-label="하루 가능 시간(분)" value={student.dailyCapacity} onChange={e=>act({type:'legacy',command:{type:'student.settings',changes:{dailyCapacity:Number(e.target.value)||0}}})}/>분</label></div>
   <div className="pm-shelf" role="img" aria-label={`한 일 ${cap.done}분, 할 일 ${cap.pending}분, 빈 시간 ${cap.free}분`}><span className="d" style={{flex:cap.done}}/><span className="p" style={{flex:cap.pending}}/><span style={{flex:cap.free}}/></div>
   <p className="pm-note" data-testid="shelf">한 일 {cap.done}분 · 할 일 {cap.pending}분 · 빈 시간 {cap.free}분{cap.over?` · ${cap.over}분 넘침`:''}</p>
   {todays.length?list(todays):<p className="pm-empty">아직 오늘 할 일이 없어요. 위에 제목 하나만 적어 추가해 보세요.</p>}
  </section>
  <section className="pm-block" aria-label="이번 주">
   <h2>앞으로 7일</h2>
   <div className="pm-week" tabIndex={0}>{week.map(d=>{const cs=student.cards.filter(c=>c.date===d);const m=cs.reduce((n,c)=>n+c.minutes,0);return <div key={d} className={`pm-day${d===today?' today':''}`}><b>{d.slice(5)} ({dayName(d)})</b><div className="pm-note">{cs.length}개 · {m}분</div>{cs.length?<ul>{cs.slice(0,4).map(c=><li key={c.id}>{c.title}{c.status==='done'?' (함)':''}</li>)}{cs.length>4&&<li>외 {cs.length-4}개</li>}</ul>:<div className="pm-note">비어 있음</div>}</div>;})}</div>
  </section>
  {reuse.length>0&&<section className="pm-block" aria-label="다시 쓰기"><details className="pm-fold"><summary>전에 한 일 다시 쓰기</summary>
   <p className="pm-note">제목·과목·시간만 오늘 새 할 일로 복사해요. 기록은 새로 실행해야 남아요.</p>
   <div className="pm-chips">{reuse.map(c=><button key={c.id} className="pm-chip" onClick={()=>act({type:'create',title:c.title,...(c.subject&&{subject:c.subject}),minutes:c.minutes,date:today})}>{c.title}</button>)}</div>
  </details></section>}
  {others.length>0&&<section className="pm-block p" aria-label="다른 날">
   <button onClick={()=>setShowAll(!showAll)} aria-expanded={showAll}>다른 날 블록 {others.length}개 {showAll?'접기':'보기'}</button>
   {showAll&&<div style={{marginTop:12}}>{list(others)}</div>}
  </section>}
 </div>;
}
