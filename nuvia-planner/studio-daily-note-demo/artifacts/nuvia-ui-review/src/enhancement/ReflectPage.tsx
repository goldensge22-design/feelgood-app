import {useState} from 'react';
import type {Run,Student} from './model';
import {SUPPORT_NAMES,AXIS_NAMES} from './model';
import {t} from './copy';
import type {Lab} from './lab';

function SaveMethod({run,lab,title}:{run:Run;lab:Lab;title:string}){
 const lang=lab.state.language;
 const [name,setName]=useState(run.nextMethod||SUPPORT_NAMES[run.support]);const [h,setH]=useState<'yes'|'no'|'unsure'>('unsure');const [note,setNote]=useState('');
 const saved=lab.student?.methods.some(m=>m.runId===run.id);
 return <li className="nx-card nx-run" data-testid={'run-'+run.id}>
  <p className="nx-eyebrow">{title} · {AXIS_NAMES[run.target]} · {run.completion==='yes'?'할 일 끝냄':'이어가기'}{run.evidenceStatus==='performed'?' · 연습 해봄':run.evidenceStatus==='skipped'?' · 연습 건너뜀':''}</p>
  {run.reflection&&<p>“{run.reflection}”</p>}
  {saved?<p className="nx-ok">방법으로 저장했어요</p>:<div className="nx-form">
   <label>방법 이름<input value={name} onChange={e=>setName(e.target.value)}/></label>
   <div className="nx-row" role="group" aria-label={t(lang,'helpful')}>{(['yes','no','unsure'] as const).map(v=><button key={v} aria-pressed={h===v} onClick={()=>setH(v)}>{v==='yes'?'도움 됐어요':v==='no'?'별로였어요':t(lang,'unsure')}</button>)}</div>
   <label>메모<input value={note} onChange={e=>setNote(e.target.value)}/></label>
   <button className="nx-primary" disabled={!name.trim()} data-testid={'button-save-method-'+run.id} onClick={()=>lab.act({type:'method.save',runId:run.id,name:name.trim(),helpful:h,note})}>{t(lang,'saveMethod')}</button></div>}
 </li>;
}

export default function ReflectPage({lab,student}:{lab:Lab;student:Student}){
 const lang=lab.state.language;
 const closed=student.runs.filter(r=>r.phase==='closed').reverse();
 const unsaved=closed.filter(r=>!student.methods.some(m=>m.runId===r.id));
 const planned=student.cards.filter(c=>c.status==='planned');
 const [target,setTarget]=useState(planned[0]?.id??'');
 const [note,setNote]=useState(student.comparisonNote);
 return <div className="nx-page">
  <section><h2>지금 할 수 있는 것</h2>
   {unsaved.length===0&&<p className="nx-empty">저장할 새 실험이 없어요. 블록 하나를 해보고 돌아오세요.</p>}
   <ul className="nx-ul">{unsaved.map(r=><SaveMethod key={r.id} run={r} lab={lab} title={student.cards.find(c=>c.id===r.cardId)?.title??''}/>)}</ul></section>
  <section className="nx-card"><h2>{t(lang,'methods')}</h2>
   {student.methods.length===0?<p className="nx-empty">아직 저장한 방법이 없어요.</p>:<>
   <label>다음에 적용할 블록<select value={target} onChange={e=>setTarget(e.target.value)}><option value="">블록 고르기</option>{planned.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
   <ul className="nx-ul">{student.methods.map(m=><li key={m.id} className="nx-method"><b>{m.name}</b><span>{m.helpful==='yes'?'도움 됨':m.helpful==='no'?'별로':'모르겠음'} · {SUPPORT_NAMES[m.support]}</span>{m.note&&<small>{m.note}</small>}<button disabled={!target} onClick={()=>lab.act({type:'method.choose',methodId:m.id,cardId:target})}>이 블록에 쓰기</button></li>)}</ul></>}
  </section>
  <section className="nx-card"><h2>결과지 설명과 내 경험 비교</h2><p>결과지가 말하는 도움이 실제로 해본 느낌과 맞았나요? 다르다고 답해도 점수는 바뀌지 않아요.</p>
   <div className="nx-row">{(['agree','different','unsure'] as const).map(v=><button key={v} aria-pressed={student.comparison===v} onClick={()=>lab.act({type:'student.comparison',value:v,note})}>{v==='agree'?'비슷해요':v==='different'?'달랐어요':'아직 모르겠어요'}</button>)}</div>
   <label>이유(선택)<input value={note} onChange={e=>setNote(e.target.value)} onBlur={()=>student.comparison&&lab.act({type:'student.comparison',value:student.comparison,note})}/></label></section>
 </div>;
}
