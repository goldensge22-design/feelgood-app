import {useState} from 'react';
import type {Card,Target} from '../enhancement/model';
import type {Action} from './model';
import {targetNames} from './domain';

const LINKS=['목표','마감','자료','준비물','결과물','관련 과제'];
const QUICK=['자료 펼치기','첫 문장 쓰기','1번 문제 보기','필요한 것 꺼내기'];

/** Target-specific practice. Reads the ONE firstAction/scope from the card; never duplicates those inputs. */
export default function Activity({card,target,act,round}:{card:Card;target:Target;act:(a:Action)=>boolean;round?:number}){
 const cmd=(command:Record<string,unknown>)=>act({type:'legacy',command:command as never});
 const ev=card.evidence;
 const hasPlan=ev.round===(round??ev.round)&&(ev.planConfirmed||ev.planChanged);
 const [links,setLinks]=useState<string[]>(card.links);
 const [items,setItems]=useState<Record<string,string>>(card.linkItems);
 const [rel,setRel]=useState(card.relationship);
 const [steps,setSteps]=useState<string[]>(card.steps.length?card.steps.map(s=>s.title):['','']);
 return <div className={`pm-panel ${target}`} data-testid="activity-panel">
  <p className="pm-eye">이번 연습 · {targetNames[target]}</p>
  {(target==='planning'||target==='integrated')&&<>
   <p>{hasPlan?'추가·수정할 때 정한 계획을 가져왔어요. 같은 설정을 다시 입력하거나 확정할 필요는 없어요.':'오늘 분량과 첫 행동을 정했다면 계획을 확인할 수 있어요. 바로 시작도 가능해요.'}</p>
   <p className="pm-note">분량: {card.scope||'아직 없음'} · 첫 행동: {card.firstAction||'아직 없음'}</p>
   {!hasPlan&&<button data-testid="plan-confirm" onClick={()=>cmd({type:'card.plan',cardId:card.id})}>이 계획으로 확정</button>}
   {hasPlan&&<span className="pm-ok"> 계획 결정 저장됨 · 목표 수행은 필수 행동·실행 종료 후 확인</span>}
  </>}
  {target==='attention'&&<>
   <p>지금 할 행동 하나를 직접 고르세요. 고른 내용은 첫 행동에 저장됩니다.</p>
   <div className="pm-chips">{QUICK.map(q=><button key={q} className="pm-chip" aria-pressed={card.firstAction===q&&ev.actionSelected} onClick={()=>cmd({type:'card.action',cardId:card.id,action:q})}>{q}</button>)}</div>
   <button data-testid="action-confirm" disabled={!card.firstAction.trim()} onClick={()=>cmd({type:'card.action',cardId:card.id,action:card.firstAction})}>적어 둔 첫 행동으로 고르기</button>
   {ev.actionSelected&&<span className="pm-ok"> 행동 선택됨: {card.firstAction}</span>}
  </>}
  {target==='simultaneous'&&<>
   <p>실제 항목 두 개 이상을 고르고 내용을 적은 뒤 관계를 한 줄로 이어 주세요.</p>
   {LINKS.map(k=><div key={k} className="pm-row">
    <label className="pm-check"><input type="checkbox" checked={links.includes(k)} onChange={e=>setLinks(e.target.checked?[...links,k]:links.filter(x=>x!==k))}/>{k}</label>
    {links.includes(k)&&<input aria-label={`${k} 내용`} value={items[k]??''} onChange={e=>setItems({...items,[k]:e.target.value})}/>}
   </div>)}
   <label>두 항목의 관계<input value={rel} onChange={e=>setRel(e.target.value)} placeholder="예: 마감이 금요일이라 자료를 오늘 고른다"/></label>
   <button data-testid="links-confirm" onClick={()=>cmd({type:'card.links',cardId:card.id,links,items,relationship:rel})}>관계 확인</button>
   {ev.linksConfirmed&&<span className="pm-ok"> 관계 확인됨</span>}
  </>}
  {target==='successive'&&<>
   <p>과제 안의 실제 단계를 두 개 이상 적고 확정한 뒤, 한 단계씩 표시하세요.</p>
   <ol>{steps.map((s,i)=><li key={i} className="pm-row"><input aria-label={`단계 ${i+1}`} value={s} onChange={e=>setSteps(steps.map((x,j)=>j===i?e.target.value:x))}/><button aria-label={`단계 ${i+1} 위로`} disabled={i===0} onClick={()=>{const n=[...steps];[n[i-1],n[i]]=[n[i],n[i-1]];setSteps(n);}}>위</button><button aria-label={`단계 ${i+1} 아래로`} disabled={i===steps.length-1} onClick={()=>{const n=[...steps];[n[i+1],n[i]]=[n[i],n[i+1]];setSteps(n);}}>아래</button>{steps.length>2&&<button aria-label={`단계 ${i+1} 빼기`} onClick={()=>setSteps(steps.filter((_,j)=>j!==i))}>빼기</button>}</li>)}</ol>
   <div className="pm-row"><button onClick={()=>setSteps([...steps,''])}>단계 추가</button><button data-testid="steps-confirm" onClick={()=>cmd({type:'card.steps',cardId:card.id,steps:steps.map(title=>({title}))})}>단계 확정</button></div>
   {ev.stepsConfirmed&&<div className="pm-chips">{card.steps.map(s=><button key={s.id} aria-pressed={s.done} onClick={()=>cmd({type:'card.progress',cardId:card.id,stepId:s.id})}>{s.done?'한 단계: ':''}{s.title}</button>)}</div>}
  </>}
  <p className="pm-note">연습을 안 해도 바로 시작할 수 있어요.</p>
  <details className="pm-fold"><summary>이번엔 연습 건너뛰기 (선택)</summary>
   <p className="pm-note">실행을 마치면 이번 기록은 '건너뜀'으로 남아요. 실패로 세지 않아요.</p>
   <button data-testid="skip-practice" aria-pressed={ev.skipped} onClick={()=>cmd({type:'card.skip',cardId:card.id})}>{ev.skipped?'건너뛰기로 표시됨':'건너뛰기로 표시'}</button>
  </details>
 </div>;
}
