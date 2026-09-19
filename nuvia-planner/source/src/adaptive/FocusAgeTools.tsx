import React,{useState} from 'react';
import {uid,type PlannerTask} from './workspace';
import type {Band} from './engine';

type Props={band:Band;lower:boolean;t:PlannerTask;tasks:PlannerTask[];patch:(p:Partial<PlannerTask>)=>void;patchTask:(id:string,p:Partial<PlannerTask>)=>void;choose:(id:string)=>void;active:boolean};

/** Profile B persists a different task structure for every age route. */
export function FocusAgeTools({band,lower,t,tasks,patch,patchTask,choose,active}:Props){
 const [entry,setEntry]=useState(''),[remainder,setRemainder]=useState(''),[material,setMaterial]=useState('');
 const current=t.steps.find(x=>!x.done);
 if(band==='A'&&lower)return <div className="age-focus-tools" data-testid="focus-route-picture-routine">
  <h4>그림으로 준비 → 시작 → 확인</h4><p>할 일 하나를 고르고, 챙길 것과 첫 행동을 확인한 뒤 돌아와요.</p>
  <div className="age-materials">{t.materials.map(m=><button key={m.id} aria-pressed={m.done} onClick={()=>patch({focusRoute:'picture_routine',routeConfirmed:false,materials:t.materials.map(x=>x.id===m.id?{...x,done:!x.done}:x)})}>{m.done?'✓':'□'} {m.title}</button>)}</div>
  <form className="np-add-row" onSubmit={e=>{e.preventDefault();if(!material.trim()||t.materials.length>=100)return;patch({focusRoute:'picture_routine',routeConfirmed:false,materials:[...t.materials,{id:uid(),title:material.trim(),done:false}]});setMaterial('');}}><input aria-label="집중 준비물 직접 추가" value={material} maxLength={160} onChange={e=>setMaterial(e.target.value)} placeholder="예: 필통, 책, 색연필"/><button disabled={!material.trim()||t.materials.length>=100}>챙길 것 추가</button></form>
  <label>처음 할 짧은 말<input aria-label="그림 루틴 첫 행동" maxLength={160} value={current?.title||''} onChange={e=>current&&e.target.value.trim()&&patch({focusRoute:'picture_routine',routeConfirmed:false,steps:t.steps.map(x=>x.id===current.id?{...x,title:e.target.value}:x)})}/></label>
  <button disabled={!current||t.materials.some(m=>!m.done)} onClick={()=>current&&patch({focusRoute:'picture_routine',routeConfirmed:true,resumeNote:`그림 루틴 확인: ${current.title}`})}>{t.materials.length?'준비물·첫 행동 확인 ✓':'준비물 없음·첫 행동 확인 ✓'}</button>
  {t.routeConfirmed&&<small role="status">준비됐어요. 이제 첫 행동으로 시작해요.</small>}
 </div>;
 if(band==='A')return <div className="age-focus-tools" data-testid="focus-route-step-card">
  <h4>숙제 단계 카드 · 지금 할 한 장</h4><p>지금 할 단계와 돌아올 위치를 내가 정해요.</p>
  <div className="age-materials">{t.steps.map(s=><button key={s.id} aria-pressed={s.id===current?.id} onClick={()=>patch({focusRoute:'step_card',routeConfirmed:false,steps:[s,...t.steps.filter(x=>x.id!==s.id)],resumeNote:`단계 카드: ${s.title}`})}>{s.done?'✓':'→'} {s.title}</button>)}</div>
  <label>돌아올 위치<input aria-label="단계 카드 돌아올 위치" maxLength={500} value={t.resumeNote} onChange={e=>patch({focusRoute:'step_card',routeConfirmed:false,resumeNote:e.target.value})}/></label>
  <button disabled={!current||!t.resumeNote.trim()} onClick={()=>patch({focusRoute:'step_card',routeConfirmed:true})}>이 단계·복귀 위치로 시작</button>
 </div>;
 if(band==='B')return <div className="age-focus-tools" data-testid="focus-route-subject-scope">
  <h4>과목 · 범위 · 오늘 분량</h4>
  <label>과목<input aria-label="집중 과목" maxLength={80} value={t.subject} onChange={e=>patch({focusRoute:'subject_scope',subject:e.target.value})}/></label>
  <label>오늘 할 범위<input aria-label="오늘 학습 범위" maxLength={160} value={t.learningScope||current?.title||''} onChange={e=>patch({focusRoute:'subject_scope',learningScope:e.target.value,steps:current&&e.target.value.trim()?t.steps.map(x=>x.id===current.id?{...x,title:e.target.value}:x):t.steps})}/></label>
  <label>오늘 분량(분)<input aria-label="오늘 집중 분량" type="number" min={10} max={1440} value={t.minutes} onChange={e=>{const n=Number(e.target.value);if(n>=10&&n<=1440)patch({focusRoute:'subject_scope',minutes:n});}}/></label>
  {active&&<><label>중단 뒤 남은 범위<input aria-label="남은 학습 범위" maxLength={500} value={t.remainingScope||''} onChange={e=>patch({remainingScope:e.target.value})}/></label><label>다음 10분 행동<input aria-label="다음 10분 행동" maxLength={160} value={t.nextTenAction||''} onChange={e=>patch({nextTenAction:e.target.value,resumeNote:`남은 범위: ${t.remainingScope||'미정'} / 다음 10분: ${e.target.value}`})}/></label></>}
 </div>;
 if(band==='C')return <div className="age-focus-tools" data-testid="focus-route-deadline-triage">
  <h4>마감별 학습 과제 판단</h4><p>지금 계속할 일, 더 작게 나눌 일, 다른 날로 옮길 일을 나눠요.</p>
  <div className="np-plan-lanes">{tasks.filter(x=>x.status!=='done').map(x=><article key={x.id}><b>{x.title}</b><label>마감<input aria-label={`${x.title} 판단 마감`} type="date" value={x.deadline||''} onChange={e=>patchTask(x.id,{deadline:e.target.value})}/></label><div className="np-actions"><button onClick={()=>{choose(x.id);patchTask(x.id,{focusRoute:'deadline_triage',deadlineDecision:'continue'});}}>지금 계속</button><button onClick={()=>{choose(x.id);patchTask(x.id,{focusRoute:'deadline_triage',deadlineDecision:'split'});}}>작게 나누기</button><button onClick={()=>patchTask(x.id,{focusRoute:'deadline_triage',date:new Date(Date.now()+86400000).toISOString().slice(0,10),deadlineDecision:'defer'})}>다른 날로</button></div></article>)}</div>
  {current&&<details><summary>선택한 행동을 둘로 나누기</summary><label>지금 할 작은 행동<input aria-label="고등 작은 첫 행동" value={entry} maxLength={160} onChange={e=>setEntry(e.target.value)}/></label><label>그 뒤 행동<input aria-label="고등 나머지 행동" value={remainder} maxLength={160} onChange={e=>setRemainder(e.target.value)}/></label><button disabled={!entry.trim()||!remainder.trim()||t.steps.length>=50} onClick={()=>{if(!entry.trim()||!remainder.trim())return;patch({focusRoute:'deadline_triage',steps:t.steps.flatMap(x=>x.id===current.id?[{...x,title:entry.trim()},{id:uid(),title:remainder.trim(),done:false,date:x.date}]:[x]),resumeNote:entry.trim()});setEntry('');setRemainder('');}}>나누고 이 행동으로 복귀</button></details>}
 </div>;
 return <div className="age-focus-tools" data-testid="focus-route-handoff">
  <h4>업무·과제 인계와 후속 확인</h4><p>즉시 할 다음 행동, 답변 대기, 다른 사람에게 확인할 일을 구분해요.</p>
  <label>지금 상태<select aria-label="업무 다음 상태" value={t.handoffState||''} onChange={e=>{const state=e.target.value as NonNullable<PlannerTask['handoffState']>;patch({focusRoute:'handoff',handoffState:state,waiting:state==='waiting',status:state==='waiting'&&active?'paused':t.status});}}><option value="">구분해 주세요</option><option value="now">즉시 다음 행동</option><option value="waiting">답변 대기</option><option value="check">다른 사람에게 확인</option></select></label>
  <label>인계·후속 확인 메모<textarea aria-label="인계 후속 확인 메모" maxLength={500} value={t.adjustment} onChange={e=>patch({focusRoute:'handoff',adjustment:e.target.value,resumeNote:e.target.value})}/></label>
  <label>다음 행동<input aria-label="업무 즉시 다음 행동" maxLength={160} value={current?.title||''} onChange={e=>current&&e.target.value.trim()&&patch({focusRoute:'handoff',steps:t.steps.map(x=>x.id===current.id?{...x,title:e.target.value}:x)})}/></label>
  <small>여기에 기록만 남기며 상대방에게 자동 전송하지 않아요.</small>
 </div>;
}
