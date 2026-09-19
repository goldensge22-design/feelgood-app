import React from 'react';
import type {PlannerTask} from './workspace';
export interface CognitivePractice {firstId:string;reason:string;focusAction:string;parked:string;returns:number;}
export const emptyPractice: CognitivePractice={firstId:'',reason:'',focusAction:'',parked:'',returns:0};
export function practiceReady(task:PlannerTask,focused:boolean){const p=task.practice;return focused?!!p?.focusAction:!!p?.reason&&p.firstId===task.steps[0].id;}
export function CognitiveActivity({task,focused,patch}:{task:PlannerTask;focused:boolean;patch:(changes:Partial<PlannerTask>)=>void}){
 const p={...emptyPractice,...task.practice},done=task.status==='done',active=task.status==='active';
 const update=(next:Partial<CognitivePractice>)=>patch({practice:{...p,...next}});
 return <section className={`np-cognitive ${focused?'attention':'planning'}`} data-testid={focused?'attention-activity':'planning-activity'}>
 <span className="np-eyebrow">{focused?'주의 훈련 · 지금 할 일로 돌아오기':'계획 훈련 · 내가 시작 순서 정하기'}</span>
 <h3>{focused?'딴생각이 나도, 이 행동으로 돌아와요':'무엇부터 해야 뒤의 일이 쉬워질까요?'}</h3>
 {focused?<>
 <div className="np-cognitive-target"><small>돌아올 행동</small><b>{task.steps.find(s=>!s.done)?.title||'마무리 확인하기'}</b></div>
 {!active&&(!p.focusAction||task.status!=='paused')&&<label>시작 전에 방해를 하나 줄여요<select aria-label="집중 준비 행동" value={p.focusAction} disabled={done} onChange={e=>update({focusAction:e.target.value})}><option value="">지금 할 행동 선택</option><option value="notifications">알림을 끄고 시작하기</option><option value="materials">필요한 자료만 꺼내기</option><option value="park">다른 할 일은 메모에 맡기기</option></select></label>}
 {active&&<><label>다른 할 일이 떠올랐나요? 여기에 맡겨요<input aria-label="나중에 할 일 메모" maxLength={500} value={p.parked} onChange={e=>update({parked:e.target.value})} placeholder="예: 친구에게 답장하기"/></label><button data-testid="park-and-return" disabled={!p.parked.trim()} onClick={()=>{patch({status:'paused',resumeNote:task.steps.find(s=>!s.done)?.title||'마무리 확인하기'});}}>메모해 두고, 원래 일로 돌아가기 →</button></>}
 {task.status==='paused'&&<><p>메모는 남겨 두었어요. 위의 ‘돌아올 행동’을 확인한 뒤 이어가요.</p>{p.parked&&<p>나중에: {p.parked}</p>}</>}
 <small>이번 할 일의 복귀 실행 {p.returns}회 · 집중력이 향상됐다는 점수는 아니에요.</small>
 </>:<>
 <p>단계를 나눈 뒤, 먼저 할 행동을 직접 골라 맨 앞으로 보내요.</p>
 <div className="np-first-choices">{task.steps.map(s=><button key={s.id} disabled={done||active} aria-pressed={p.firstId===s.id} onClick={()=>patch({steps:[s,...task.steps.filter(x=>x.id!==s.id)],practice:{...p,firstId:s.id}})}>{p.firstId===s.id?'✓ ':''}{s.title}</button>)}</div>
 <label>이 행동을 먼저 하는 이유<select aria-label="먼저 하는 이유" disabled={done||active} value={p.reason} onChange={e=>update({reason:e.target.value})}><option value="">이유 하나 선택</option><option value="dependency">이걸 해야 다음 일을 할 수 있어요</option><option value="deadline">먼저 끝내야 하는 일이에요</option><option value="startable">지금 바로 시작할 수 있어요</option></select></label>
 {p.firstId&&p.firstId!==task.steps[0].id&&<p>순서가 바뀌었어요. 첫 행동을 다시 골라 주세요.</p>}
 </>}
 </section>;
}
