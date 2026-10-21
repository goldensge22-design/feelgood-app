import {useState} from 'react';
import {AXES} from '../official/adaptive/engine';
import type {Stage,Target} from './model';
import {STAGE_NAMES,AXIS_NAMES} from './model';
import {STAGE_HELP,C} from './copy';
import {newCard} from './domain';
import type {Lab} from './lab';
import Profile from './Profile';
import {TargetPanel} from './TargetPanels';

export default function QABoard({lab,compare=false}:{lab:Lab;compare?:boolean}){
 const s=lab.student;
 const [stage,setStage]=useState<Stage>(s?.stage??'middle');
 const [axes,setAxes]=useState<Record<string,'high'|'mid'|'low'>>({planning:'mid',attention:'mid',simultaneous:'mid',successive:'mid'});
 const [noA,setNoA]=useState(false);
 const [card]=useState(()=>newCard(0,{id:'qa-common',scope:'슬라이드 1~3장',firstAction:'첫 장 제목 쓰기',deadline:'2025-06-20',steps:[{id:'q1',title:'핵심 문장 고르기',done:false},{id:'q2',title:'자료 붙이기',done:false}]}));
 return <div className="nx-page">
  {!compare&&<section className="nx-card nx-qa"><h2>QA 프로필 (합성 표본, ?qa=1 전용)</h2>
   {!s?<p>학생 보기로 바꿔 주세요.</p>:<>
   <label>단계<select value={stage} onChange={e=>setStage(e.target.value as Stage)}>{Object.entries(STAGE_NAMES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
   <div className="nx-row">{AXES.map(a=><label key={a} className="nx-inline">{AXIS_NAMES[a]}<select value={axes[a]} onChange={e=>setAxes({...axes,[a]:e.target.value as 'high'})}><option value="high">상</option><option value="mid">중</option><option value="low">하</option></select></label>)}</div>
   <label className="nx-checkline"><input type="checkbox" checked={noA} onChange={e=>setNoA(e.target.checked)}/>결과지 없이</label>
   <button className="nx-primary" onClick={()=>lab.act({type:'qa.profile',stage,axes,withoutAssessment:noA})}>표본 적용</button>
   <p className="nx-note">{STAGE_HELP[stage]}</p></>}</section>}
  {s&&<Profile student={s}/>}
  <section><h2>같은 과제, 네 가지 도움 {compare?'· 확장본 비교 보드':''}</h2>
   {!s?<p className="nx-empty">학생 보기로 바꿔 주세요.</p>:
   <div className="nx-qa-grid">{(AXES as readonly Target[]).map(a=><div key={a} className="nx-card"><p className="nx-eyebrow">{AXIS_NAMES[a]}</p><h3>{C.commonTask}</h3><TargetPanel target={a} card={card} student={s} act={lab.act} readOnly support={a as 'planning'} reduce={false}/></div>)}</div>}
  </section>
 </div>;
}
