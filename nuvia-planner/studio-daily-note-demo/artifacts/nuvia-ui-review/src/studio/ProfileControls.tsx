import {useState} from 'react';
import type {Axis} from '../enhancement/model';
import type {Action} from './model';
import {targetNames} from './domain';

const AXES:Axis[]=['planning','attention','simultaneous','successive'];
type Lv='high'|'mid'|'low';
const LV:[Lv,string][]=[['high','높음'],['mid','보통'],['low','낮음']];

/** Review-only synthetic profile. Orders are only what the reviewer explicitly clicks; nothing is invented. */
export default function ProfileControls({act}:{act:(a:Action)=>boolean}){
 const [axes,setAxes]=useState<Record<Axis,Lv>>({planning:'mid',attention:'mid',simultaneous:'mid',successive:'mid'});
 const [supportOrder,setSupport]=useState<Axis[]>([]);
 const [strengthOrder,setStrength]=useState<Axis[]>([]);
 const lows=AXES.filter(a=>axes[a]==='low'),highs=AXES.filter(a=>axes[a]==='high');
 const toggle=(list:Axis[],set:(x:Axis[])=>void,a:Axis)=>set(list.includes(a)?list.filter(x=>x!==a):[...list,a]);
 const send=(withoutAssessment:boolean)=>act({type:'legacy',command:{type:'qa.profile',withoutAssessment,axes,
  ...(supportOrder.length&&{supportOrder:supportOrder.filter(a=>lows.includes(a))}),
  ...(strengthOrder.length&&{strengthOrder:strengthOrder.filter(a=>highs.includes(a))})}});
 return <details className="pm-fold" data-testid="profile-controls"><summary>합성 프로필 (네 영역)</summary>
  {AXES.map(a=><div key={a} className="pm-row"><b style={{minWidth:130}}>{targetNames[a]}</b>{LV.map(([v,l])=><button key={v} aria-pressed={axes[a]===v} onClick={()=>{setAxes({...axes,[a]:v});setSupport(supportOrder.filter(x=>x!==a));setStrength(strengthOrder.filter(x=>x!==a));}}>{l}</button>)}</div>)}
  {lows.length>1&&<><h4>지원 순서 (누른 순서대로, 비워 두면 순서 없음)</h4><div className="pm-chips">{lows.map(a=><button key={a} aria-pressed={supportOrder.includes(a)} onClick={()=>toggle(supportOrder,setSupport,a)}>{supportOrder.includes(a)?`${supportOrder.indexOf(a)+1}. `:''}{targetNames[a]}</button>)}</div></>}
  {highs.length>1&&<><h4>강점 순서 (누른 순서대로, 비워 두면 순서 없음)</h4><div className="pm-chips">{highs.map(a=><button key={a} aria-pressed={strengthOrder.includes(a)} onClick={()=>toggle(strengthOrder,setStrength,a)}>{strengthOrder.includes(a)?`${strengthOrder.indexOf(a)+1}. `:''}{targetNames[a]}</button>)}</div></>}
  <div className="pm-row"><button className="pm-primary" onClick={()=>send(false)}>이 프로필 적용</button><button onClick={()=>send(true)}>검사 없음으로</button></div>
  <p className="pm-note">실행 중에는 바꿀 수 없어요. 실제 검사 결과가 아닌 합성 비교용입니다.</p>
 </details>;
}
