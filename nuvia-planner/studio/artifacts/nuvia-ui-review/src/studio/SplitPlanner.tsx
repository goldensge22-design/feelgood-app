import {useState} from 'react';
import type {Card} from '../enhancement/model';
import type {PersonalState,Action} from './model';
import {splitProposal,localDate} from './domain';

export default function SplitPlanner({state,card,cards,capacity,act}:{state:PersonalState;card:Card;cards:Card[];capacity:number;act:(a:Action)=>boolean}){
 const [parts,setParts]=useState<{date:string;scope:string;minutes:number}[]|null>(null);
 const [reason,setReason]=useState('');
 const today=localDate();
 const others=cards.filter(c=>c.id!==card.id&&c.status!=='done'&&c.date>=today).sort((a,b)=>a.date.localeCompare(b.date));
 const used=(d:string)=>cards.filter(c=>c.date===d&&c.status!=='done'&&c.id!==card.id).reduce((n,c)=>n+c.minutes,0);
 const meta=state.meta[card.id];
 const edit=(i:number,k:'date'|'scope'|'minutes',v:string)=>setParts(parts!.map((p,j)=>j===i?{...p,[k]:k==='minutes'?Number(v):v}:p));
 return <details className="pm-fold" data-testid="split-planner"><summary>남은 날에 나눠 보기 (제안)</summary>
  <p className="pm-note">시험일 {meta?.examDate||'미정'} · 중간 마감 {card.middleDeadline||'미정'} · 하루 가능 시간 {capacity}분. 제안일 뿐 자동으로 일정에 넣지 않아요.</p>
  <h4>지금 잡힌 다른 과목·시험</h4>
  {others.length?<ul>{others.slice(0,8).map(c=><li key={c.id}>{c.date} · {c.subject||'과목 없음'} · {c.title} · {c.minutes}분 · 범위 {c.scope||'미정'}{state.meta[c.id]?.examDate?` · 시험 ${state.meta[c.id].examDate}`:''}{c.middleDeadline?` · 중간 마감 ${c.middleDeadline}`:''}{c.deadline?` · 마감 ${c.deadline}`:''}</li>)}</ul>:<p className="pm-note">다른 예정 과제가 없어요.</p>}
  <button data-testid="split-make" onClick={()=>{try{setParts(splitProposal(state,card.id));}catch(e){alert((e as Error).message);}}}>나누기 제안 만들기</button>
  {parts&&(parts.length?<>
   <table className="pm-table"><thead><tr><th>날짜</th><th>분량</th><th>분</th><th>그날 남은 시간</th><th></th></tr></thead><tbody>
    {parts.map((p,i)=><tr key={i}><td><input type="date" aria-label={`${i+1}번 날짜`} value={p.date} onChange={e=>edit(i,'date',e.target.value)}/></td><td><input aria-label={`${i+1}번 분량`} value={p.scope} onChange={e=>edit(i,'scope',e.target.value)}/></td><td><input type="number" min={5} aria-label={`${i+1}번 분`} value={p.minutes} onChange={e=>edit(i,'minutes',e.target.value)}/></td><td>{Math.max(0,capacity-used(p.date))}분</td><td><button aria-label={`${i+1}번 빼기`} onClick={()=>setParts(parts.filter((_,j)=>j!==i))}>빼기</button></td></tr>)}
   </tbody></table>
   <label>나누는 이유<input value={reason} onChange={e=>setReason(e.target.value)} placeholder="예: 시험 전 세 번 나눠 복습"/></label>
   <div className="pm-row"><button className="pm-primary" data-testid="split-accept" disabled={!reason.trim()||parts.length<1} onClick={()=>{if(act({type:'split.accept',cardId:card.id,parts,reason}))setParts(null);}}>이대로 나누기</button><button onClick={()=>setParts(null)}>취소</button></div>
   <p className="pm-note">원래 카드는 그대로 남아요.</p>
  </>:<p className="pm-empty">남은 날이나 시간이 부족해 제안을 만들지 못했어요. 날짜나 하루 가능 시간을 바꿔 보세요.</p>)}
 </details>;
}
