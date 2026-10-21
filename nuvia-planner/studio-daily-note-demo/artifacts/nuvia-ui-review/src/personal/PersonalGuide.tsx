import {useState} from 'react';
import type {PersonalState} from './model';
import {guideFor} from './insights';

export default function PersonalGuide({state,done}:{state:PersonalState;done:(v:boolean)=>void}){
 const g=guideFor(state);
 const [open,setOpen]=useState(false);
 return <section className="pm-block o pm-guide" aria-label="나에게 맞춘 안내">
  <div className="pm-row" style={{justifyContent:'space-between',margin:0}}>
   <div><p className="pm-eye">나에게 맞춘 안내</p><b>{g.target}</b></div>
   <div className="pm-row" style={{margin:0}}><button onClick={()=>done(true)} data-testid="guide-skip">건너뛰기</button><button type="button" aria-expanded={open} onClick={()=>setOpen(!open)} data-testid="guide-toggle">{open?'접기':'펼쳐 보기'}</button></div>
  </div>
  {open&&<div>
   <dl className="pm-help-goal">
    <div><dt>이유</dt><dd>{g.reason}</dd></div>
    <div><dt>실제로 할 행동</dt><dd>{g.required}</dd></div>
    <div><dt>도움 방식</dt><dd>{g.support}</dd></div>
    <div><dt>현재 기준</dt><dd>{g.mode}</dd></div>
   </dl>
   <p className="pm-note">도움 방식은 할 일마다 직접 바꿀 수 있어요. 순서는 자유이고 아무것도 잠겨 있지 않아요.</p>
  </div>}
 </section>;
}
