import {useState} from 'react';
import type {PersonalState,Action} from './model';
import {statements,insightsOf,usedMethods,assessmentView} from './insights';
import {supportNames} from './domain';

type Act=(a:Action)=>boolean;
const ANS=[['agree','맞아요'],['different','달라요'],['unsure','모르겠어요']] as const;
const MANS=[['yes','도움 됨'],['neutral','중립'],['no','도움되지 않음'],['unsure','모르겠어요']] as const;
const lab=(l:readonly (readonly [string,string])[],v:string)=>l.find(x=>x[0]===v)?.[1]??v;

function Statement({s,state,cards,act}:{s:{id:string;text:string;kind:string};state:PersonalState;cards:{id:string;title:string}[];act:Act}){
 const hist=insightsOf(state).comparisons.filter(c=>c.statementId===s.id);
 const [ex,setEx]=useState('');const [card,setCard]=useState('');const [err,setErr]=useState('');
 const send=(answer:'agree'|'different'|'unsure')=>{setErr('');const ok=act({type:'comparison.respond',statementId:s.id,text:s.text,answer,cardId:card||null,example:ex});if(ok)setEx('');else setErr('저장하지 못했어요. 다시 시도해 주세요.');};
 const view=assessmentView(state),source=insightsOf(state).source;
 const last=hist.filter(h=>h.cardId===(card||null)&&((view.mode==='example'||view.mode==='input')?h.assessmentKey===source?.id:view.mode==='none'?h.assessmentKey===null:true)).at(-1);
 return <li className="pm-panel simultaneous" data-testid={`statement-${s.id}`}>
  <p style={{margin:'0 0 6px',fontWeight:700}}>{s.text}</p>
  <div className="pm-chips">{ANS.map(([v,l])=><button key={v} aria-pressed={last?.answer===v} onClick={()=>send(v)} data-testid={`comparison-answer-${s.id}-${v}`}>{l}</button>)}</div>
  <div className="pm-grid2"><label>떠오르는 실제 예(선택)<input value={ex} onChange={e=>setEx(e.target.value)} data-testid={`comparison-example-${s.id}`}/></label>
   <label>관련 할 일(선택, 실행 전이어도 괜찮아요)<select data-testid={`comparison-card-${s.id}`} value={card} onChange={e=>setCard(e.target.value)}><option value="">없음</option>{cards.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label></div>
  <p className="pm-note" data-testid={`comparison-save-${s.id}`}>답하지 않아도 괜찮아요. 고를 때마다 새 기록으로 쌓이고 이전 답은 지워지지 않아요.</p>
  {err&&<p role="alert" className="pm-note" style={{color:'#8a3a10',fontWeight:700}}>{err}</p>}
  {hist.length>0&&<details className="pm-fold"><summary>내 답 기록 {hist.length}개</summary><ol>{hist.map(h=>{const src=insightsOf(state).sources.find(s=>s.id===h.assessmentKey);return <li key={h.id}>{new Date(h.at).toLocaleString('ko-KR')} · {h.previousId?'응답 변경':'이 맥락의 첫 응답'} · {lab(ANS,h.answer)} · {h.cardTitle}{h.example?` · ${h.example}`:''} · {src?`${src.kind} / ${src.date||'검사일 미확인'}`:h.assessmentKey?'보관 입력 기준':'검사 미연결 일반 연습'}</li>;})}</ol></details>}
 </li>;
}

export default function ExperienceReview({state,cards,act}:{state:PersonalState;cards:{id:string;title:string}[];act:Act}){
 const list=statements(state);
 const used=usedMethods(state);
 const [err,setErr]=useState('');
 const fb=insightsOf(state).feedback;
 return <>
  <section className="pm-block" aria-label="설명과 내 경험 비교"><p className="pm-eye">설명 하나씩</p><h2>설명과 내 경험 비교</h2>
   {list.length?<ul className="pm-list">{list.map(s=><Statement key={s.id} s={s} state={state} cards={cards} act={act}/>)}</ul>:<p className="pm-empty">비교할 설명이 아직 없어요.</p>}
  </section>
  <section className="pm-block p" aria-label="써 본 도움 방식 돌아보기"><p className="pm-eye">선택</p><h2>써 본 도움 방식이 맞았나요</h2>
   {err&&<p role="alert" className="pm-note" style={{color:'#8a3a10',fontWeight:700}}>{err}</p>}
   {used.length?<ul className="pm-list">{used.map(u=>{const h=fb.filter(f=>f.runId===u.runId&&f.support===u.support);return <li key={`${u.runId}-${u.support}`} className="pm-panel" data-testid={`method-fb-${u.runId}-${u.support}`}>
    <b>{u.cardTitle}</b> <span className="pm-note">{u.month} · {u.subject} · {u.scope||'범위 미입력'} · {supportNames[u.support as keyof typeof supportNames]??u.support}</span>
    <div className="pm-chips">{MANS.map(([v,l])=><button key={v} aria-pressed={u.feedback?.answer===v} onClick={()=>{setErr('');if(!act({type:'method.respond',runId:u.runId,support:u.support,answer:v}))setErr('저장하지 못했어요.');}}>{l}</button>)}</div>
    {h.length>0&&<details className="pm-fold"><summary>답 기록 {h.length}개</summary><ol>{h.map(x=><li key={x.id}>{x.at.slice(0,10)} · {lab(MANS,x.answer)}</li>)}</ol></details>}
   </li>;})}</ul>:<p className="pm-empty">실제로 시간을 써서 마친 실행이 생기면 여기서 돌아볼 수 있어요. 답하지 않아도 괜찮아요.</p>}
  </section>
 </>;
}
