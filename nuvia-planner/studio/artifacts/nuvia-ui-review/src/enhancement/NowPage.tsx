import {useEffect,useState} from 'react';
import type {Run,Student} from './model';
import {elapsed,remaining} from './domain';
import {t,C} from './copy';
import {fmt,type Lab} from './lab';

function Review({run,lab}:{run:Run;lab:Lab}){
 const lang=lab.state.language;
 const [completion,setC]=useState<'yes'|'no'|''>('');const [next,setN]=useState<'five'|'next'|'today'|''>('');
 const [reflection,setR]=useState('');const [nextMethod,setM]=useState('');const [att,setA]=useState('');const isAtt=run.target==='attention';const [feel,setF]=useState('');
 const [mins,setMins]=useState(String(Math.round(elapsed(run)/6000)/10));
 const ok=completion==='yes'||(completion==='no'&&next);
 return <section className="nx-review" data-testid="section-review"><h3>{t(lang,'completed')}</h3>
  <p className="nx-note">할 일을 끝냈는지와 연습을 해봤는지는 따로 기록돼요.</p>
  <div className="nx-row">{(['yes','no'] as const).map(v=><button key={v} aria-pressed={completion===v} data-testid={'button-completion-'+v} onClick={()=>setC(v)}>{t(lang,v)}</button>)}</div>
  <div className="nx-row">{(['five','next','today'] as const).map(v=><button key={v} aria-pressed={next===v} data-testid={'button-next-'+v} onClick={()=>setN(v)}>{t(lang,v)}</button>)}</div>
  <label>실제로 쓴 시간(분)<input type="number" min="0" step="0.1" value={mins} onChange={e=>setMins(e.target.value)}/></label>
  <label>한 줄 돌아보기(선택)<input value={reflection} onChange={e=>setR(e.target.value)}/></label>
  <label>다음엔 이렇게(선택)<input value={nextMethod} onChange={e=>setM(e.target.value)}/></label>
  {isAtt&&<details><summary>{C.attOptional}</summary><label>{C.attQ}<select value={att} onChange={e=>setA(e.target.value)}><option value="">{C.attNone}</option><option value="used">{C.attUsed}</option><option value="not_applicable">{C.attNA}</option><option value="unobserved">{C.attUnknown}</option></select></label></details>}
  <label>끝난 뒤 기분(선택)<input value={feel} onChange={e=>setF(e.target.value)}/></label>
  <div className="nx-row"><button onClick={()=>lab.act({type:'run.resume',runId:run.id})}>{t(lang,'resume')}</button>
  <button className="nx-primary" disabled={!ok} data-testid="button-close-run" onClick={()=>lab.act({type:'run.close',runId:run.id,completion,next:next||'today',reflection,nextMethod,actualMinutes:mins.trim()===''||isNaN(Number(mins))?undefined:Number(mins),optionalAttention:isAtt&&att?att:undefined,feelingAfter:feel})}>{t(lang,'close')}</button></div>
 </section>;
}

export default function NowPage({lab,student,goPlan}:{lab:Lab;student:Student;goPlan:()=>void}){
 const lang=lab.state.language;
 const run=student.runs.find(r=>r.phase!=='closed');
 const [,tick]=useState(0);
 useEffect(()=>{if(run?.phase!=='running')return;const id=setInterval(()=>tick(x=>x+1),1000);return()=>clearInterval(id);},[run?.phase]);
 const [flag,setFlag]=useState('');const [thought,setThought]=useState('');
 if(!run){const last=[...student.runs].reverse().find(r=>r.phase==='closed');
  return <div className="nx-page"><section className="nx-card nx-empty-state"><h2>{t(lang,'noRun')}</h2>{last&&<p>마지막 기록: {student.cards.find(c=>c.id===last.cardId)?.title} · {last.completion==='yes'?'끝냄':'이어가기'}</p>}<button className="nx-primary" onClick={goPlan}>{t(lang,'plan')}</button></section></div>;}
 const card=student.cards.find(c=>c.id===run.cardId);
 const rem=remaining(run);
 const stepCur=run.target==='successive'?card?.steps.find(s=>!s.done)?.title:undefined;const cur=stepCur||card?.firstAction||card?.title||'';
 return <div className="nx-page"><section className={'nx-now ph-'+run.phase} data-testid="section-now">
  <p className="nx-eyebrow">{t(lang,run.phase as 'running')} · {card?.title}</p>
  <h2 className="nx-current" data-testid="text-current-action">{cur}</h2>
  <p className="nx-timer" role="timer" aria-live="off">{rem>0?C.remaining+' '+fmt(rem):C.overtime} <small>/ {run.budgetMinutes}{C.minutes}</small></p>
  {card&&card.steps.length>0&&<ol className="nx-mini-steps">{card.steps.map(s=><li key={s.id} className={s.done?'on':''}>{s.title}</li>)}</ol>}
  {run.phase==='review'? <Review run={run} lab={lab}/> : <>
   <div className="nx-controls">
    {run.phase==='running'?<button className="nx-primary nx-big" data-testid="button-pause" onClick={()=>lab.act({type:'run.pause',runId:run.id})}>{t(lang,'pause')}</button>
     :<button className="nx-primary nx-big" data-testid="button-resume" onClick={()=>lab.act({type:'run.resume',runId:run.id})}>{t(lang,'resume')}</button>}
    <button data-testid="button-review" onClick={()=>lab.act({type:'run.review',runId:run.id})}>{t(lang,'toReview')}</button>
   </div>
   {run.phase==='paused'&&<div className="nx-hold"><p>돌아올 자리: <b>{cur}</b>{run.flag?' · 걸린 점: '+run.flag:''}</p></div>}
   <details><summary>{t(lang,'flag')} · {t(lang,'thought')}</summary>
    <div className="nx-row"><input aria-label="걸린 점" value={flag} onChange={e=>setFlag(e.target.value)} placeholder="예: 3번 문제 뜻을 모르겠어요"/><button disabled={!flag.trim()} onClick={()=>{if(lab.act({type:'run.flag',runId:run.id,flag:flag.trim()}))setFlag('');}}>표시</button></div>
    <div className="nx-row"><input aria-label="떠오른 생각" value={thought} onChange={e=>setThought(e.target.value)} placeholder="나중에 볼 생각"/><button disabled={!thought.trim()} onClick={()=>{if(lab.act({type:'run.thought',runId:run.id,thought:thought.trim()}))setThought('');}}>적어두기</button></div>
    {run.thoughts&&<p className="nx-note">적어둔 생각: {run.thoughts}</p>}
   </details></>}
 </section></div>;
}
