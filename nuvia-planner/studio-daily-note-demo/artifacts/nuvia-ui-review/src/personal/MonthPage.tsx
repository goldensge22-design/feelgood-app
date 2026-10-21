import {useState} from 'react';
import type {Target} from '../enhancement/model';
import type {Action,Draft,PersonalState,Entry} from './model';
import {areas,stats,suggest,nextMonth,targetNames,supportNames} from './domain';
const HELP_CODES=['planning','attention','simultaneous','successive','universal','none'] as const;

const STATUS:Record<string,string>={performed:'수행',skipped:'건너뜀',unobserved:'확인 안 됨'};

function AreaGoal({state,month,axis,act}:{state:PersonalState;month:string;axis:Target;act:(a:Action)=>boolean}){
 const versions=state.agreements.filter(a=>a.month===month&&a.axis===axis);
 const [view,setView]=useState('');
 const s=stats(state,month,axis,view||undefined);
 const [count,setCount]=useState('');
 const [reason,setReason]=useState('');
 const first=!versions.length;
 return <div className={`pm-stat b${s.band??''}`} data-testid={`area-${axis}`}>
  <h3>{targetNames[axis]}</h3>
  <big>{s.performed} / {s.denominator||'-'}</big>
  <span>{s.label} · {s.displayRate}{s.provisional?' · 잠정':''}{s.conservative?' · 보수적으로 셈':''}</span>
  <p className="pm-note">건너뜀 {s.skipped} · 확인 안 됨 {s.unobserved} · 해당 없음 {s.notApplicable} · 목표 밖 추가 {s.extra} · 관찰 기간 {s.observedDays}일(첫 기록부터 마지막 기록까지)</p>
  {versions.length>1&&<label>어느 약속 기준으로 볼까요<select value={view} onChange={e=>setView(e.target.value)}><option value="">처음 약속</option>{versions.slice(1).map(v=><option key={v.id} value={v.id}>{v.at.slice(0,10)} 수정 ({v.count}회, 이후 기록만)</option>)}</select></label>}
  <div className="pm-row">
   <input type="number" min={0} aria-label={`${targetNames[axis]} 목표 횟수`} data-testid="goal-count" value={count} onChange={e=>setCount(e.target.value)} placeholder={first?'이번 달 몇 번':'남은 기간 새 횟수'}/>
   {!first&&<input aria-label="수정 이유" value={reason} onChange={e=>setReason(e.target.value)} placeholder="수정 이유 (필수)"/>}
   <button data-testid="goal-save" disabled={count===''||Number(count)<0||(!first&&!reason.trim())} onClick={()=>{if(act({type:'agreement',month,axis,count:Number(count),reason})){setCount('');setReason('');}}}>{first?'목표 정하기':'남은 기간 수정'}</button>
  </div>
  {versions.length>0&&<ul className="pm-note">{versions.map((v,i)=><li key={v.id}>{v.at.slice(0,16).replace('T',' ')} · {i===0?'처음 약속':'수정'} {v.count}회{v.reason?` · 이유: ${v.reason}`:''}</li>)}</ul>}
  {!first&&<p className="pm-note">처음 약속 {versions[0].count}회는 그대로 두고, 수정은 앞으로 남은 연습에만 셉니다.</p>}
  {s.evidence.length>0&&<details className="pm-fold"><summary>근거 {s.evidence.length}건 · 날짜 고치기</summary><ul className="pm-list">{s.evidence.map(e=><EvidenceRow key={e.id} e={e} act={act}/>)}</ul></details>}
 </div>;
}
function EvidenceRow({e,act}:{e:Entry;act:(a:Action)=>boolean}){
 const [d,setD]=useState(e.localDate);const [r,setR]=useState('');
 return <li><b>{e.localDate}</b> · {e.cardTitle} · {STATUS[e.status]}{e.proof.length?` · ${e.proof.join(', ')}`:''}
  {e.corrections.map((c,i)=><div key={i} className="pm-note">{c.from}에서 {c.to}로 고침: {c.reason}</div>)}
  <div className="pm-row"><input type="date" aria-label="바른 날짜" value={d} onChange={x=>setD(x.target.value)}/><input aria-label="고치는 이유" value={r} onChange={x=>setR(x.target.value)} placeholder="이유 (필수)"/><button disabled={!r.trim()||d===e.localDate} onClick={()=>{if(act({type:'correct',entryId:e.id,date:d,reason:r}))setR('');}}>날짜 고치기</button></div>
 </li>;
}
function DraftCard({d,state,act}:{d:Draft;state:PersonalState;act:(a:Action)=>boolean}){
 const [f,setF]=useState({count:String(d.count),chunk:d.chunk,method:d.method,help:d.help,date:d.date});
 const [conflict,setConflict]=useState<''|'keep'|'separate'|'none'>('');
 const cardsClash=state.lab.students['student-a'].cards.filter(c=>c.date===f.date&&c.status!=='done');
 const goalClash=state.agreements.filter(g=>g.month===d.toMonth&&g.axis===d.axis);
 const clash=[...cardsClash.map(c=>`그날 할 일 '${c.title}'`),...goalClash.map(g=>`${d.toMonth} ${targetNames[g.axis]} 목표 ${g.count}회`)];
 const outside=!f.date.startsWith(d.toMonth);
 const changed=Number(f.count)!==d.count||f.chunk!==d.chunk||f.method!==d.method||f.help!==d.help||f.date!==d.date;
 return <li className="pm-block p" data-testid={`draft-${d.id}`}>
  <p className="pm-eye">{d.toMonth} 초안 · {targetNames[d.axis]} · {d.status==='accepted'?'받아들임':d.status==='deferred'?'미룸':'검토 중'}</p>
  <table className="pm-table"><thead><tr><th></th><th>지난 달</th><th>제안</th></tr></thead><tbody>
   <tr><td>횟수</td><td>{d.baseline.count}</td><td><input type="number" min={0} aria-label="횟수" value={f.count} disabled={d.status==='accepted'} onChange={e=>setF({...f,count:e.target.value})}/></td></tr>
   <tr><td>한 번 분량</td><td>{d.baseline.chunk||'-'}</td><td><input aria-label="분량" value={f.chunk} disabled={d.status==='accepted'} onChange={e=>setF({...f,chunk:e.target.value})}/></td></tr>
   <tr><td>방법</td><td>{d.baseline.method||'-'}</td><td><input aria-label="방법" value={f.method} disabled={d.status==='accepted'} onChange={e=>setF({...f,method:e.target.value})}/></td></tr>
   <tr><td>도움</td><td>{supportNames[d.baseline.help as 'none']??d.baseline.help??'-'}</td><td><select aria-label="도움" value={f.help} disabled={d.status==='accepted'} onChange={e=>setF({...f,help:e.target.value})}>{!HELP_CODES.includes(f.help as never)&&<option value={f.help}>{f.help}</option>}{HELP_CODES.map(h=><option key={h} value={h}>{supportNames[h]}</option>)}</select></td></tr>
   <tr><td>첫 날짜</td><td>-</td><td><input type="date" aria-label="첫 날짜" value={f.date} disabled={d.status==='accepted'} onChange={e=>setF({...f,date:e.target.value})}/></td></tr>
  </tbody></table>
  {d.reasons.length>0&&<ul className="pm-note">{d.reasons.map((r,i)=><li key={i}>{r}</li>)}</ul>}
  {d.status!=='accepted'&&<>
   {changed&&<button onClick={()=>act({type:'draft.edit',id:d.id,changes:{...f,count:Number(f.count)}})}>고친 내용 저장</button>}
   {outside&&<p className="pm-banner warn">첫 날짜가 {d.toMonth} 밖이에요. 다음 달 안의 날짜로 고쳐 주세요.</p>}
   {clash.length>0&&<fieldset className="pm-panel attention"><legend>이미 {clash.join(', ')} 있어요. 어떻게 할까요</legend>
    {([['keep','목표만 두고 할 일은 만들지 않기'],['separate','같은 날 따로 하나 더 추가'],['none','달력에 넣지 않기']] as const).map(([v,l])=><label key={v} className="pm-check"><input type="radio" name={`c-${d.id}`} checked={conflict===v} onChange={()=>setConflict(v)}/>{l}</label>)}
   </fieldset>}
   <div className="pm-row">
    <button className="pm-primary" data-testid="accept-draft" disabled={changed||(clash.length>0&&!conflict)} onClick={()=>act({type:'draft.accept',id:d.id,...(conflict&&{conflict})})}>받아들이기</button>
    {d.status!=='deferred'&&<button onClick={()=>act({type:'draft.defer',id:d.id})}>나중에</button>}
   </div>
   {changed&&<p className="pm-note">고친 내용을 먼저 저장한 뒤 받아들일 수 있어요.</p>}
  </>}
  {d.status==='accepted'&&<p className="pm-ok">목표 {d.count}회 저장{d.cardIds.length?` · 시작 카드 ${d.cardIds.length}개`:' · 할 일은 만들지 않음'}</p>}
 </li>;
}
export default function MonthPage({state,month,act}:{state:PersonalState;month:string;act:(a:Action)=>boolean}){
 const list=areas(state);
 const drafts=state.drafts.filter(d=>d.fromMonth===month);
 return <div className="pm-page">
  <section className="pm-block" aria-label="월간 목표">
   <p className="pm-eye">{month} 월간 약속</p><h2>이번 달 몇 번 해 볼까요</h2>
   <p className="pm-note">실제로 실행을 마친 기록만 셉니다. 기록이 일부만 있어도 괜찮아요. 확인 안 된 날은 실패로 자동 처리하지 않고 따로 셉니다. 목표 0회도 정할 수 있어요.</p>
   {list.length?<div className="pm-grid2">{list.map(a=><AreaGoal key={`${month}-${a}`} state={state} month={month} axis={a} act={act}/>)}</div>:<p className="pm-empty">아직 연습 영역이 없어요.</p>}
   {state.entries.flatMap(e=>e.corrections.filter(c=>c.from.startsWith(month)||c.to.startsWith(month)).map((c,i)=><p className="pm-note" key={e.id+i}>보고서 변경: {c.from} → {c.to} · {c.reason} · 입력 시각 {c.at}. 원래 목표영역·수행 근거는 바꾸지 않았습니다.</p>))}
  </section>
  <section className="pm-block o" aria-label="다음 달 초안">
   <p className="pm-eye">{nextMonth(month)} 준비</p><h2>다음 달 초안</h2>
   <div className="pm-chips">{list.map(a=>{const s=suggest(state,month,a);return <button key={a} data-testid="make-draft" onClick={()=>act({type:'draft.make',month,axis:a})}>{targetNames[a]} 초안 만들기 ({s.count}회 제안)</button>;})}</div>
   {drafts.length?<ul className="pm-list">{drafts.map(d=><DraftCard key={d.id+d.status} d={d} state={state} act={act}/>)}</ul>:<p className="pm-empty">초안을 만들면 지난 달과 나란히 비교할 수 있어요. 일정은 받아들일 때만 바뀝니다.</p>}
  </section>
 </div>;
}
