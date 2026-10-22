import {useEffect,useState} from 'react';
import {elapsed,remaining} from '../enhancement/domain';
import type {Run,Student} from '../enhancement/model';
import type {Action,PersonalState} from './model';
import {demoCardText} from './i18n/demo-copy';

const fmt=(sec:number)=>`${Math.floor(sec/60)}분 ${String(sec%60).padStart(2,'0')}초`;

export default function RunPanel({student,act,recovery,cardId,state}:{student:Student;act:(a:Action)=>boolean;recovery:boolean;cardId?:string;state?:PersonalState}){
 const run=student.runs.find(r=>r.phase!=='closed');
 const [,tick]=useState(0);
 useEffect(()=>{const t=setInterval(()=>tick(n=>n+1),1000);return()=>clearInterval(t);},[]);
 if(!run)return null;
 // Embedded in the desk card: only render when the open run belongs to this exact card.
 if(cardId!==undefined&&run.cardId!==cardId)return null;
 const card=student.cards.find(c=>c.id===run.cardId);
 const cmd=(command:Record<string,unknown>)=>act({type:'legacy',command:command as never});
 const sec=Math.floor(elapsed(run)/1000);
 return <section className={`pm-now ${run.phase}${cardId?' st-run-in':''}`} aria-label="지금 실행" data-testid="run-panel">
  <p className="pm-eye">{run.phase==='running'?'지금 하는 중':run.phase==='paused'?'이 과제를 잠시 멈췄어요':'실행 돌아보기'}</p>
  <div className="pm-now-title">{card?.firstAction||(card&&state?demoCardText(state,card,'title'):card?.title)||'지금 할 행동'}</div>
  {card?.firstAction&&<p className="st-run-task">과제: {state?demoCardText(state,card,'title'):card.title}</p>}
  {run.flag&&<p>이어서 볼 자리: <b>{run.flag}</b></p>}
  {run.budgetMinutes>0&&run.phase==='running'&&remaining(run)===0&&<p className="pm-banner warn">예정한 시간이 지났어요. 계속하거나 끝내고 돌아볼 수 있어요. 자동으로 완료 처리하지 않습니다.</p>}
  {recovery&&run.phase!=='review'&&<p className="pm-banner warn" role="status">다시 돌아왔어요. 자리를 비운 시간은 실행 시간으로 넣지 않아요. 지금 시간을 확인하고 이어가거나 돌아보기로 넘어가세요.</p>}
  <p className="pm-timer" data-testid="timer" aria-live="off">{fmt(sec)} <span className="pm-note" style={{color:'inherit'}}>· {run.budgetMinutes>0?`남은 시간 ${fmt(remaining(run))}`:'예상 미정 · 경과 시간'}</span></p>
  {run.phase!=='review'?<>
   <div className="pm-ctrl">
    {run.phase==='running'
     ?<button data-testid="pause" onClick={()=>cmd({type:'run.pause',runId:run.id})}>잠시 멈추기</button>
     :<button className="pm-primary" data-testid="resume" onClick={()=>cmd({type:'run.resume',runId:run.id})}>이어가기</button>}
    <button data-testid="review-run" onClick={()=>cmd({type:'run.review',runId:run.id})}>끝내고 돌아보기</button>
   </div>
   <Flag run={run} cmd={cmd}/>
  </>:<CloseForm run={run} cmd={cmd} student={student} recovery={recovery}/>}
 </section>;
}
function Flag({run,cmd}:{run:Run;cmd:(c:Record<string,unknown>)=>boolean}){
 const [v,setV]=useState(run.flag);
 return <details className="pm-fold" style={{color:'var(--navy)'}}><summary>멈춘 자리 표시 (선택)</summary>
  <div className="pm-row"><input aria-label="멈춘 자리" value={v} onChange={e=>setV(e.target.value)} placeholder="예: 3번 문제 풀이 중간"/><button data-testid="flag-save" onClick={()=>cmd({type:'run.flag',runId:run.id,flag:v})}>표시</button></div></details>;
}
function CloseForm({run,cmd,student,recovery}:{run:Run;cmd:(c:Record<string,unknown>)=>boolean;student:Student;recovery:boolean}){
 const [f,setF]=useState({completion:'' as ''|'yes'|'no',next:'' as ''|'five'|'next'|'today',reflection:'',actual:String(Math.round(elapsed(run)/600)/100),attention:'',nextMethod:'',feeling:'',nextPosition:run.flag});
 const set=(k:keyof typeof f,v:string)=>setF({...f,[k]:v});
 const close=()=>cmd({type:'run.close',runId:run.id,completion:f.completion,next:f.completion==='no'?f.next:'today',reflection:f.reflection,actualMinutes:Number(f.actual),optionalAttention:f.attention||undefined,nextMethod:f.nextMethod,feelingAfter:f.feeling,nextPosition:f.nextPosition});
 return <div>
  <h3>과제를 마쳤나요?</h3>
  <div className="pm-chips">{(['yes','no'] as const).map(v=><button key={v} aria-pressed={f.completion===v} onClick={()=>set('completion',v)}>{v==='yes'?'마쳤어요':'아직 남았어요'}</button>)}</div>
  {f.completion==='no'&&<><h4>남은 일은</h4><div className="pm-chips">{([['five','5분 더 하기'],['next','다음 블록으로 만들기'],['today','오늘은 여기까지']] as const).map(([v,l])=><button key={v} aria-pressed={f.next===v} onClick={()=>set('next',v)}>{l}</button>)}</div></>}
  {recovery&&<p className="pm-banner warn">자리를 비운 시간은 빠져 있어요. 실제로 한 시간이 다르면 아래에서 직접 고쳐 주세요.</p>}
  <label>실제 시간(분)<input type="number" min={0} step="0.1" value={f.actual} onChange={e=>set('actual',e.target.value)}/></label>
  <details className="pm-fold"><summary>돌아보기 메모 (선택)</summary>
   <label>다음에 이어갈 자리 (선택)<input value={f.nextPosition} onChange={e=>set('nextPosition',e.target.value)}/></label>
   <label>해 보니 어땠나요<textarea value={f.reflection} onChange={e=>set('reflection',e.target.value)}/></label>
   <label>다음에 써 볼 방법<input value={f.nextMethod} onChange={e=>set('nextMethod',e.target.value)}/></label>
   <label>끝난 뒤 기분<input value={f.feeling} onChange={e=>set('feeling',e.target.value)}/></label>
   {run.target==='attention'&&<label>한 가지에 머무르기 (선택)<select value={f.attention} onChange={e=>set('attention',e.target.value)}><option value="">고르지 않음</option><option value="used">써 봤어요</option><option value="not_applicable">해당 없음</option><option value="unobserved">잘 모르겠어요</option></select></label>}
  </details>
  <button className="pm-primary pm-big" data-testid="close-run" disabled={!f.completion||(f.completion==='no'&&!f.next)} onClick={close}>기록 남기기</button>
  <p className="pm-note">월간 수행 기록은 이 버튼으로 실제 실행을 마칠 때만 남습니다. {student.reduceHelp?'도움 줄이기 사용 중.':''}</p>
 </div>;
}
