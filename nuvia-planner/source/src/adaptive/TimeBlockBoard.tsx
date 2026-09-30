import React,{useEffect,useRef,useState} from 'react';
import {type Band} from './engine';
import {createTask,localDate,uid,type PlannerTask,type Workspace} from './workspace';
import {stepForBlockStart,blockActivityReady,extendFiveMinutes,actualBlockMinutes,elapsedMilliseconds,closeTimeBlock,continueTimeBlock,newTimeBlock,remainingSeconds,startTimeBlock,stopTimeBlock,type TimeBlock} from './timeBlocks';
import {timeAdjustmentLabel,TimeAdjustmentPrompt,dateForReschedule} from './PlannerEnhancements';
import {emptyPractice} from './CognitiveActivity';
import './time-blocks.css';

type Props={data:Workspace;band:Band;lower:boolean;focused:boolean;selected:string;select:(id:string)=>void;commit:(w:Workspace)=>void;complete:(t:PlannerTask,a:number,h:'none'|'some',n:string)=>void};
const phaseText:Record<TimeBlock['phase'],string>={ready:'시작 전',running:'실행 중',paused:'잠시 보관',review:'10초 기록',closed:'이어갈 카드'};
const subjectTone=(t:PlannerTask)=>t.domain==='생활'?'life':t.domain==='업무'?'work':/수학/.test(t.subject)?'math':/국어/.test(t.subject)?'korean':/영어/.test(t.subject)?'english':/과학/.test(t.subject)?'science':'study';
export function SubjectMark({task:t,compact=false}:{task:PlannerTask;compact?:boolean}){return <span title={t.subject||t.domain||'학습'} className={'tb-subject tb-'+subjectTone(t)}><span aria-hidden="true">{t.domain==='생활'?'⌂':t.domain==='업무'?'▣':/수학/.test(t.subject)?'∑':/과학/.test(t.subject)?'◇':'▤'}</span>{!compact&&<span className="tb-subject-label">{t.subject||t.domain||'학습'}{t.subject&&t.subject!==t.domain?' · '+(t.domain||'학습'):''}</span>}</span>;}
export default function TimeBlockBoard({data,band,lower,focused,selected,select,commit,complete}:Props){
  const [message,setMessage]=useState(''),[editing,setEditing]=useState(false),[clock,setClock]=useState(Date.now()),[timerHidden,setTimerHidden]=useState(false),[drafts,setDrafts]=useState<Record<string,{completion:string;action:string}>>({}),[title,setTitle]=useState(''),[subject,setSubject]=useState(''),[scope,setScope]=useState(''),[domain,setDomain]=useState<PlannerTask['domain']>('학습'),[minutes,setMinutes]=useState('25'),[date,setDate]=useState(localDate()),[start,setStart]=useState(()=>new Date().toTimeString().slice(0,5)),[thought,setThought]=useState(''),[dragging,setDragging]=useState('');
  const drag=useRef<{id:string;fromY:number;target:string}|null>(null);
  const helpRef=useRef<HTMLDetailsElement>(null),editRef=useRef<HTMLDetailsElement>(null);
 const [creating,setCreating]=useState(()=>!data.tasks.some(t=>t.timeBlock));
 const blocks=data.tasks.filter(t=>t.timeBlock),unfinished=blocks.filter(t=>t.status!=='done');
 const running=blocks.find(t=>t.timeBlock?.phase==='running'),review=blocks.find(t=>t.timeBlock?.phase==='review');
  const next=unfinished[0];
   const task=blocks.find(t=>t.id===selected)||running||review||next;
 const b=task?.timeBlock,nowSeconds=task?remainingSeconds(task,clock):0;
  const completion=drafts[task?.id||'']?.completion||'',action=drafts[task?.id||'']?.action||'';
  const setCompletion=(value:string)=>task&&setDrafts(v=>({...v,[task.id]:{completion:value,action:v[task.id]?.action||''}}));
  const setAction=(value:string)=>task&&setDrafts(v=>({...v,[task.id]:{completion:v[task.id]?.completion||'',action:value}}));
 useEffect(()=>{if(!running)return;const id=setInterval(()=>setClock(Date.now()),500);return()=>clearInterval(id);},[running?.id]);
  useEffect(()=>{setEditing(false);},[task?.id]);
 const change=(t:PlannerTask)=>commit({...data,tasks:data.tasks.map(x=>x.id===t.id?t:x)});
 const patch=(p:Partial<PlannerTask>)=>task&&change({...task,...p});
 const patchBlock=(p:Partial<TimeBlock>)=>task&&b&&patch({timeBlock:{...b,...p}});
 const safely=(fn:()=>void)=>{try{fn();setMessage('');}catch(e){setMessage((e as Error).message);}};
 function add(){if(!title.trim()||!date||!start||Number(minutes)<1||Number(minutes)>1440||data.tasks.length>=500)return;const t={...createTask(title,scope.trim()||title),subject:subject.trim()||domain||'활동',domain,date,focusRoute:(band==='A'?(lower?'picture_routine':'step_card'):band==='B'?'subject_scope':band==='C'?'deadline_triage':'handoff') as PlannerTask['focusRoute'],minutes:Number(minutes),learningScope:scope.trim()||title.trim(),timeBlock:newTimeBlock(start,Number(minutes))};commit({...data,tasks:[...data.tasks,t]});select(t.id);setCreating(false);setTitle('');setScope('');setMessage('할 일을 추가했어요. 시간을 확인하고 시작을 눌러요.');}
 function launch(t:PlannerTask){safely(()=>{change(startTimeBlock({...t,routeConfirmed:true,timeBlock:{...t.timeBlock!,chosenStepId:band==='A'&&!lower?stepForBlockStart(t):t.timeBlock!.chosenStepId}},data.tasks));setClock(Date.now());select(t.id);});}
  function moveTo(t:PlannerTask,target:PlannerTask){
  if(running||review)return;
   if(t.date!==target.date||t.id===target.id)return;
   const sameDay=blocks.filter(x=>x.date===t.date),ordered=[...sameDay];
   const from=ordered.findIndex(x=>x.id===t.id),to=ordered.findIndex(x=>x.id===target.id);
   ordered.splice(from,1);ordered.splice(to,0,t);
   const first=sameDay[0].timeBlock!.startTime;
   const list=[...data.tasks],positions=list.map((x,i)=>x.timeBlock&&x.date===t.date?i:-1).filter(i=>i>=0);
   positions.forEach((position,i)=>{list[position]=ordered[i];});
   let at=Number(first.slice(0,2))*60+Number(first.slice(3));
  const updates=new Map<string,string>();
   for(const x of ordered){
    if(at>=1440||at+x.minutes>1440){setMessage('오늘 자정을 넘는 순서는 놓을 수 없어요. 시간을 줄이거나 날짜를 선택해 주세요.');return;}
   updates.set(x.id,`${String(Math.floor(at/60)).padStart(2,'0')}:${String(at%60).padStart(2,'0')}`);
   at+=x.minutes;
  }
  commit({...data,tasks:list.map(x=>updates.has(x.id)?{...x,timeBlock:{...x.timeBlock!,startTime:updates.get(x.id)!}}:x)});
  setMessage('같은 날의 첫 시작 시각부터 순서와 예상 시간을 다시 계산했어요. 휴식 시간은 추가하지 않았어요.');
 }
  function move(t:PlannerTask,d:number){const day=blocks.filter(x=>x.date===t.date),target=day[day.findIndex(x=>x.id===t.id)+d];if(target)moveTo(t,target);}
  function pointerEnd(e:React.PointerEvent){if(!drag.current)return;const item=drag.current;drag.current=null;setDragging('');try{e.currentTarget.releasePointerCapture(e.pointerId);}catch{/* Capture may already be released. */}const target=blocks.find(x=>x.id===item.target);const source=blocks.find(x=>x.id===item.id);if(source&&target&&Math.abs(e.clientY-item.fromY)>12)moveTo(source,target);}
 function reschedule(choice:'today'|'tomorrow'|'week'){if(!task||!b||b.phase==='running'||b.phase==='review')return;patch({date:dateForReschedule(choice),rescheduleChoice:choice,rescheduledAt:new Date().toISOString()});setMessage('내가 고른 날짜로 옮겼어요. 완료 여부는 바꾸지 않았어요.');}
 function saveReview(){if(!task||!b||!completion||(completion==='no'&&!action))return;safely(()=>{
  const closed=closeTimeBlock(task,completion==='yes');
  if(completion==='yes'){change(closed);complete(closed,actualBlockMinutes(closed),'none','');return;}
  if(action==='five'){change(extendFiveMinutes(task,data.tasks));setClock(Date.now());}
  else if(action==='next'){if(data.tasks.length>=500)throw new Error('할 일이 500개예요. 먼저 목록을 정리해 주세요.');const following=continueTimeBlock(closed);commit({...data,tasks:[...data.tasks.map(x=>x.id===task.id?closed:x),following]});select(following.id);}
  else change(closed);
 });}
  const otherInProgress=!!((running&&running.id!==task?.id)||(review&&review.id!==task?.id));
   const canStart=!!task&&!otherInProgress;
    const station=task&&b?<article className={'tb-station tb-phase-'+b.phase+(task.status==='done'?' tb-phase-done':'')} data-testid="block-station">
   <div className="tb-station-head"><SubjectMark task={task}/><span>{task.status==='done'?'직접 완료 확인':phaseText[b.phase]}</span></div>
      <small>순서 {blocks.findIndex(x=>x.id===task.id)+1} / {blocks.length} · {task.date} · {b.startTime} · 계획 {task.minutes}분</small><h3>{task.title}</h3>{(task.learningScope||task.steps[0].title)!==task.title&&<p className="tb-scope">{task.learningScope||task.steps[0].title}</p>}{b.phase==='ready'&&<button className="np-primary tb-immediate-start" disabled={!canStart} onClick={()=>launch(task)}>{task.minutes}분 시작</button>}{b.phase==='ready'&&<div className="tb-station-shortcuts"><button onClick={()=>{setEditing(true);requestAnimationFrame(()=>editRef.current?.scrollIntoView({block:'nearest'}));}}>계획 수정</button><button onClick={()=>{if(helpRef.current){helpRef.current.open=true;helpRef.current.scrollIntoView({block:'nearest'});}}}>더 보기</button></div>}{b.phase==='ready'&&!running&&!review&&<div className="tb-order" aria-label="선택한 할 일 순서"><button disabled={blocks.filter(x=>x.date===task.date).findIndex(x=>x.id===task.id)===0} onClick={()=>move(task,-1)}>위로 옮기기</button><button disabled={blocks.filter(x=>x.date===task.date).findIndex(x=>x.id===task.id)===blocks.filter(x=>x.date===task.date).length-1} onClick={()=>move(task,1)}>아래로 옮기기</button></div>}
   {(task.planningReference||task.timeAdjustment)&&<p className="tb-return">다음 계획 참고: {timeAdjustmentLabel(task.timeAdjustment||task.planningReference)}</p>}
   {b.nextStart&&task.status!=='done'&&<p className="tb-return">↪ 다음 시작 위치: <strong>{b.nextStart}</strong></p>}
     {b.phase==='running'?<><p className="tb-scope">지금: {task.steps.find(s=>s.id===b.chosenStepId)?.title||task.nextTenAction||task.steps.find(s=>!s.done)?.title}</p><div className="tb-clock"><button onClick={()=>setTimerHidden(v=>!v)}>{timerHidden?'시간 보기':'시간 숨기기'}</button>{!timerHidden&&(nowSeconds>0?<span role="timer">{Math.floor(nowSeconds/60)}:{String(nowSeconds%60).padStart(2,'0')} <small>남음</small></span>:<p role="status">시간이 지났어요. 계속하거나 끝낼 수 있어요.</p>)}</div><div className="tb-controls"><button onClick={()=>safely(()=>change(stopTimeBlock(task,'paused')))}>잠깐 멈추기</button><button className="np-primary" onClick={()=>safely(()=>change(stopTimeBlock(task,'review')))}>끝내고 기록</button></div><small>시간이 끝나도 자동 완료되지 않아요.</small><details><summary>다른 생각 잠깐 보관하기 · 선택</summary><label>나중에 볼 메모<input maxLength={500} value={thought} onChange={e=>setThought(e.target.value)} placeholder="지금 일은 그대로 두고 적어요"/></label><button disabled={!thought.trim()} onClick={()=>{patch({practice:{...emptyPractice,...task.practice,parked:[task.practice?.parked,thought.trim()].filter(Boolean).join(' · ').slice(0,500)}});setThought('');}}>생각 보관</button>{task.practice?.parked&&<p className="tb-parked">보관한 생각: {task.practice.parked}</p>}</details></>:
   b.phase==='review'?<div className="tb-review">
     <h4>끝난 뒤 10초 기록</h4>
     <p>계획 {task.minutes}분 · 시계 경과 {Math.round(elapsedMilliseconds(task)/600)/100}분 (중단 구간 제외)</p>
     <label>실제 사용한 시간 직접 확인 · 분
       <input aria-label="실제 사용 시간 직접 수정" type="number" min={0} max={100000} step="0.01" value={task.actualMinutes??0}
         onChange={e=>{const n=Number(e.target.value);if(e.target.value!==''&&Number.isFinite(n)&&n>=0&&n<=100000)patch({actualMinutes:n,timeBlock:{...b,confirmedActualMinutes:n}});}}/>
     </label>
     <small>화면 밖에서 쉬었다면 실제 사용 시간으로 고쳐 주세요. 원래 시계 경과와 구간은 별도로 남아요.</small>
     <label>어디까지 했나요?<input aria-label="어디까지 했나요" maxLength={500} value={b.covered} onChange={e=>patchBlock({covered:e.target.value})} placeholder="예: 12번까지"/></label>
     <label>다음에는 어디서 시작할까요?<input aria-label="종료 다음 시작 위치" maxLength={500} value={b.nextStart} onChange={e=>patchBlock({nextStart:e.target.value})} placeholder="예: 13번부터"/></label>
     <label>시간 느낌 · 선택<select aria-label="시간 느낌" value={b.comparison} onChange={e=>patchBlock({comparison:e.target.value as TimeBlock['comparison']})}><option value="">선택 안 함</option><option value="longer">예상보다 길었음</option><option value="similar">비슷했음</option><option value="shorter">짧았음</option></select></label>
     <label>완료 여부 · 직접 선택<select aria-label="블록 완료 여부" value={completion} onChange={e=>setCompletion(e.target.value)}><option value="">직접 선택해 주세요</option><option value="yes">할 일·단계·준비물을 모두 마쳤어요</option><option value="no">이어서 할 일이 있어요</option></select></label>
     {completion==='no'&&<div role="group" aria-label="미완료 다음 선택" className="tb-presets">{[['five','5분 더 하기'],['next','다음 시간 블록 만들기'],['today','오늘 마치기']].map(([v,l])=><button key={v} aria-pressed={action===v} onClick={()=>setAction(v)}>{l}</button>)}</div>}
     <button className="np-primary" disabled={!completion||(completion==='no'&&!action)} onClick={saveReview}>짧은 기록 저장</button>
     <small>완료는 자기보고예요. 외부 확인·교육 효과의 증명이 아니에요.</small>
   </div>:
   task.status==='done'?<><p>계획 {task.minutes}분 · 실제 경과 {task.actualMinutes}분</p><p>한 곳: {b.covered||'따로 적지 않았어요'}</p>{!task.timeAdjustment&&<TimeAdjustmentPrompt task={task} data={data} commit={commit}/>}</>:
   <>
     {b.phase==='paused'&&<div className="tb-pause"><h4>잠시 보관함 · 돌아올 자리</h4><p>복귀 깃발: <strong>{b.nextStart||task.resumeNote||task.steps.find(s=>!s.done)?.title||'이어서 할 행동을 정해요'}</strong></p><p>남은 시간 {Math.floor(nowSeconds/60)}분 {nowSeconds%60}초 · 다시 시작해도 그대로 이어져요.</p><p className="np-activity-prompt">이 자리에서 다시 할까요? 남은 시간과 지금까지 한 기록은 그대로예요.</p><div className="tb-controls"><button className="np-primary" disabled={!canStart} onClick={()=>launch(task)}>이어서 시작</button><button onClick={()=>safely(()=>change(stopTimeBlock(task,'review')))}>종료</button></div><details><summary>돌아올 자리 고치기</summary><label>{band==='B'?'남은 범위 · 다음 시작 위치':'다음에 어디서 이어할까요? (선택)'}<input aria-label="중단 다음 시작 위치" placeholder="예: 13번부터" maxLength={500} value={b.nextStart} onChange={e=>patch({resumeNote:e.target.value,timeBlock:{...b,nextStart:e.target.value},...(band==='B'?{remainingScope:e.target.value}:{})})}/></label>{band==='B'&&<label>다음 10분 행동<input aria-label="다음 10분 행동" maxLength={160} value={task.nextTenAction||''} onChange={e=>patch({nextTenAction:e.target.value})}/></label>}{band==='D'&&<label>인계·후속 확인 메모<input aria-label="인계 메모" maxLength={500} value={b.handoffNote} onChange={e=>patchBlock({handoffNote:e.target.value})}/></label>}</details></div>}
     <details ref={helpRef} className="tb-age-tools" open={!canStart||undefined} data-testid={'block-age-'+(band==='A'?(lower?'lower':'upper'):band)}><summary>준비·단계 도움{!canStart?' · 시작 전 확인':''}</summary>
      {band==='A'&&lower?<><p className="tb-picture">준비 → 시작 → 끝</p><p>한 가지: {task.steps[0].title}</p><label className="np-check"><input type="checkbox" checked={b.prepared} onChange={e=>patchBlock({prepared:e.target.checked})}/>준비물과 첫 행동을 확인했어요</label></>:
      band==='A'?task.steps.filter(s=>!s.done).length<=1?<p>할 일이 한 단계라 바로 시작할 수 있어요.</p>:<label>지금 할 단계 카드<select aria-label="지금 할 단계 카드" value={stepForBlockStart(task)} onChange={e=>patchBlock({chosenStepId:e.target.value})}><option value="">단계를 골라요</option>{task.steps.filter(s=>!s.done).map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>:
      band==='B'?<><label>이 과목의 오늘 분량<input aria-label="오늘 분량" maxLength={160} value={task.learningScope||''} onChange={e=>patch({learningScope:e.target.value})}/></label><p>오늘 {task.subject}: {blocks.filter(x=>x.subject===task.subject&&x.date===task.date).reduce((sum,x)=>sum+x.minutes,0)}분 배치</p></>:
      band==='C'?<><label>시험·마감 날짜<input aria-label="시험 날짜" type="date" value={task.deadline||''} onChange={e=>patch({deadline:e.target.value})}/></label>{task.deadline&&<p>{Math.ceil((new Date(task.deadline+'T00:00:00').getTime()-new Date(localDate()+'T00:00:00').getTime())/86400000)>=0?'D−':'D+'}{Math.abs(Math.ceil((new Date(task.deadline+'T00:00:00').getTime()-new Date(localDate()+'T00:00:00').getTime())/86400000))} · 여러 과목 중 지금 할 일을 판단해요</p>}<div className="tb-presets"><button aria-pressed={task.deadlineDecision==='continue'} onClick={()=>patch({deadlineDecision:'continue'})}>계속하기</button><button aria-pressed={task.deadlineDecision==='split'} onClick={()=>{patch({deadlineDecision:'split'});setEditing(true);}}>나누기 · 단계 편집</button><button aria-pressed={task.deadlineDecision==='defer'} onClick={()=>{patch({deadlineDecision:'defer',date:dateForReschedule('tomorrow')});setMessage('내일로 옮겼어요. 다른 블록을 고르거나 이 블록을 다시 선택해 시작할 수 있어요.');}}>다른 날 · 내일로</button></div></>:
      <><label>수업·업무·회의 전 가용 시간의 끝<input aria-label="가용 시간 끝" type="time" value={b.availableUntil} onChange={e=>patchBlock({availableUntil:e.target.value})}/></label>{b.availableUntil&&<p>시작 {b.startTime} → 다음 일정 {b.availableUntil} · 같은 날 기준 {Math.max(0,(Number(b.availableUntil.slice(0,2))*60+Number(b.availableUntil.slice(3)))-(Number(b.startTime.slice(0,2))*60+Number(b.startTime.slice(3))))}분 공간 / 계획 {task.minutes}분</p>}<label>다음 행동 상태<select aria-label="다음 행동 상태" value={task.handoffState||''} onChange={e=>patch({handoffState:e.target.value as PlannerTask['handoffState'],waiting:e.target.value==='waiting'})}><option value="">구분해 주세요</option><option value="now">즉시 할 다음 행동</option><option value="waiting">답변 대기</option><option value="check">다른 사람에게 확인 요청</option></select></label><label>인계·후속 확인 메모<input aria-label="후속 확인 메모" maxLength={500} value={b.handoffNote} onChange={e=>patchBlock({handoffNote:e.target.value})}/></label></>}
    </details>
    {b.phase==='ready'&&<label className="tb-quick-time">몇 분 할까요?<input aria-label="시작 전 시간" type="number" min={1} max={1440} value={task.minutes} onChange={e=>{const m=Number(e.target.value);if(m>=1&&m<=1440)patch({minutes:m,timeBlock:{...b,budgetMinutes:m}});}}/>분</label>}
     {b.phase!=='paused'&&!blockActivityReady(task,band,lower)&&canStart&&<p className="np-activity-prompt">오늘 할 분량이나 첫 행동을 정해도 좋고, 바로 시작해도 돼요.</p>}
     {b.phase==='closed'&&<div className="tb-controls"><button className="np-primary" disabled={!canStart} onClick={()=>launch(task)}>이어서 시작</button></div>}
      {!canStart&&<small>실행 중이거나 종료 기록 중인 블록을 먼저 열어 마쳐 주세요.</small>}
     <details ref={editRef} open={editing||undefined}><summary>계획 수정 · 단계·준비물·반복</summary><BlockFields key={task.id} task={task} change={change}/><div className="tb-presets">{(['today','tomorrow','week'] as const).map((c,i)=><button key={c} onClick={()=>reschedule(c)}>{['오늘로','내일로','이번 주로'][i]}</button>)}</div></details>
   </>}
   </article>:null;
   const todayTotal=data.tasks.filter(t=>t.date===localDate()).reduce((sum,t)=>sum+t.minutes,0);
   const todayDone=data.tasks.filter(t=>t.date===localDate()&&t.status==='done').reduce((sum,t)=>sum+t.minutes,0);
   const todayPending=todayTotal-todayDone,free=Math.max(0,data.dailyCapacity-todayTotal);
    return <section className={'np-card tb-board '+(blocks.length?'tb-has-blocks ':'tb-no-blocks ')+(running?'tb-has-running ':'')+(focused?'tb-execution':'tb-assembly')} data-testid="time-block-board">
    <div className="tb-board-heading"><div><span className="np-eyebrow">오늘의 시간 계획</span><h2>{focused?'지금 할 한 가지':'시간이 보이는 내 계획'}</h2><p>{focused?'지금 할 행동 하나를 고르고, 멈춰도 돌아와요.':'오늘 할 만큼 정하고 한 가지만 시작해요.'}</p></div>{blocks.length>0&&!running&&!review&&<button className="tb-quick-add" onClick={()=>{setCreating(true);requestAnimationFrame(()=>document.querySelector('.tb-create')?.scrollIntoView({block:'center'}));}}>할 일 추가</button>}</div>
    {message&&<p role="status" className="np-notice">{message}</p>}
    {(running||review)&&<div className="tb-live-banner" role="status"><strong>{running?'실행 중':'종료 기록 중'} · {(running||review)?.title}</strong><button onClick={()=>select((running||review)!.id)}>현재 블록 열기</button></div>}
    <details><summary>이 계획이 나를 돕는 방식</summary><p>{focused?'현재 행동과 돌아올 자리를 가까이 두어요.':'여러 과목의 시간·순서를 직접 배치하고 시작할 일을 골라요.'} 실제 시간은 다음 계획의 참고 자료예요. 점수·집중력·인지능력을 측정하지 않아요. 중단을 누르기 전까지의 시계 경과 시간을 기록하므로 화면 밖에서 쉬었다면 참고해서 해석해 주세요.</p></details>
    {!running&&!review&&<section className="tb-capacity" aria-label="오늘 시간 선반"><div className="tb-capacity-head"><div><span className="np-eyebrow">오늘 시간 선반</span><b>계획 {todayTotal} / 가능 {data.dailyCapacity}분</b></div><label>쓸 수 있는 시간 <input aria-label="오늘 사용 가능 시간" type="number" min={1} max={1440} value={data.dailyCapacity} onChange={e=>{const n=Number(e.target.value);if(n>=1&&n<=1440)commit({...data,dailyCapacity:n});}}/>분</label></div><div className="tb-capacity-strip" role="img" aria-label={`완료한 계획 ${todayDone}분, 남은 계획 ${todayPending}분, 비워 둔 시간 ${free}분`}>{todayDone>0&&<span className="tb-strip-done" style={{flex:todayDone}}/>}{todayPending>0&&<span className="tb-strip-pending" style={{flex:todayPending}}/>}{free>0&&<span className="tb-strip-free" style={{flex:free}}/>}{todayTotal===0&&<span className="tb-strip-free" style={{flex:1}}/>}</div><div className="tb-capacity-legend"><span>완료한 계획 <b>{todayDone}분</b></span><span>남은 계획 <b>{todayPending}분</b></span><span>빈 시간 <b>{free}분</b></span></div></section>}
    {!running&&!review&&todayTotal>data.dailyCapacity&&<div className="tb-capacity-options" role="status">가능 시간보다 {todayTotal-data.dailyCapacity}분 많아요. 날짜를 자동으로 바꾸지 않아요. <button onClick={()=>setMessage('아래에서 옮길 일을 고른 다음 계획 수정에서 날짜나 시간을 바꿔 주세요.')}>할 일 조정하기</button><button onClick={()=>setMessage('선반의 쓸 수 있는 시간을 직접 바꿀 수 있어요.')}>가능 시간 바꾸기</button></div>}
    {!running&&!review&&<details className="tb-create" open={creating} onToggle={e=>setCreating(e.currentTarget.open)}><summary>{blocks.length?'새 시간 블록 만들기':'오늘 할 일 한 가지 적기'}</summary><form onSubmit={e=>{e.preventDefault();add();}}>
    <label>할 일<input aria-label="블록 할 일" required maxLength={160} placeholder="예: 수학 문제 풀기" value={title} onChange={e=>setTitle(e.target.value)}/></label>
    <label>몇 분 할까요?<input aria-label="블록 예상 시간" type="number" required min={1} max={1440} value={minutes} onChange={e=>setMinutes(e.target.value)}/></label>
    <div className="tb-presets" aria-label="추천 시간">{[10,25,35,45].map(n=><button type="button" key={n} aria-pressed={Number(minutes)===n} onClick={()=>setMinutes(String(n))}>{n}분</button>)}</div>
    {blocks.length>0&&<div className="tb-recent" aria-label="최근 과제 다시 입력"><small>최근 과제 다시 쓰기</small>{[...blocks].reverse().slice(0,3).map(t=><button type="button" key={t.id} onClick={()=>{setTitle(t.title);setSubject(t.subject);setScope(t.learningScope||'');setDomain(t.domain||'학습');setMinutes(String(t.minutes));}}>{t.title}</button>)}</div>}
    <details><summary>과목·범위·날짜 정하기 (선택)</summary><div className="tb-fields"><label>영역<select aria-label="블록 영역" value={domain} onChange={e=>setDomain(e.target.value as PlannerTask['domain'])}><option>학습</option><option>생활</option><option>업무</option></select></label><label>과목·활동<input aria-label="블록 과목" maxLength={80} value={subject} placeholder="예: 수학" onChange={e=>setSubject(e.target.value)}/></label></div><label>범위 · 오늘 할 분량<input aria-label="블록 범위" maxLength={160} value={scope} onChange={e=>setScope(e.target.value)} placeholder="예: 문제집 1~20번"/></label><div className="tb-fields"><label>날짜<input aria-label="블록 날짜" type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label><label>시작 시각<input aria-label="블록 시작 시각" type="time" required value={start} onChange={e=>setStart(e.target.value)}/></label></div></details><button className="np-primary" disabled={data.tasks.length>=500}>할 일 추가</button>
   </form></details>}
    <section className="tb-queue" aria-label="시간순 할 일 목록">
     <h3>할 일 흐름 <small>{unfinished.length}개 남음</small></h3>
     <div className="tb-block-list">
      {blocks.map((t,i)=>{
       const day=blocks.filter(x=>x.date===t.date),position=day.findIndex(x=>x.id===t.id);
        return <article key={t.id} className={'tb-mini subject-'+subjectTone(t)+' '+(task?.id===t.id?'selected ':'')+(dragging===t.id?'is-dragging ':'')+(t.status==='done'?'is-done':t.timeBlock?.phase==='running'?'is-running':t.timeBlock?.phase==='paused'?'is-paused':'')}>
          <div className="tb-mini-face" style={{'--block-height':`${Math.min(280,105+Math.max(0,t.minutes)*1.6)}px`,'--mobile-block-height':`${Math.min(230,78+Math.max(0,t.minutes)*1.4)}px`} as React.CSSProperties} data-block-id={t.id}>
         <button className="tb-drag" title="누른 채 끌어서 순서 바꾸기" aria-label={`${t.title} 끌어서 순서 바꾸기`} disabled={!!running||!!review||t.status==='done'}
          onPointerDown={e=>{if(e.button!==0&&e.pointerType==='mouse')return;drag.current={id:t.id,fromY:e.clientY,target:t.id};setDragging(t.id);e.currentTarget.setPointerCapture(e.pointerId);}}
          onPointerMove={e=>{if(!drag.current)return;const el=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-block-id]');if(el)drag.current.target=el.getAttribute('data-block-id')||t.id;}}
          onPointerUp={pointerEnd} onPointerCancel={()=>{drag.current=null;setDragging('');}}>⋮⋮</button>
          <button className="tb-open" aria-current={task?.id===t.id?'true':undefined} onClick={()=>select(t.id)}><span className="tb-position">{i+1}</span><SubjectMark task={t} compact/><span className="tb-status">{t.status==='done'?'완료':phaseText[t.timeBlock!.phase]}{task?.id===t.id&&' · 선택됨'}</span><b>{t.title}</b><span className="tb-time">{t.timeBlock!.startTime}</span><span className="tb-duration">{t.minutes}분</span></button>
         <div className="tb-order" aria-label={`${t.title} 순서 조정`}><button aria-label={`${t.title} 위로`} disabled={!!running||!!review||position===0||t.status==='done'} onClick={()=>move(t,-1)}>↑</button><button aria-label={`${t.title} 아래로`} disabled={!!running||!!review||position===day.length-1||t.status==='done'} onClick={()=>move(t,1)}>↓</button></div>
        </div>
        {task?.id===t.id&&station&&<div className="tb-detail-slot" style={{gridRow:`1 / span ${Math.max(1,blocks.length)}`}}>{station}</div>}
       </article>;
      })}
      {!blocks.length&&<div className="tb-list-empty"><b>아직 놓인 할 일이 없어요.</b><p>위에서 한 가지를 적고 시간을 정해 보세요.</p><button className="np-primary" onClick={()=>{setCreating(true);document.querySelector('.tb-create')?.scrollIntoView({block:'center'});}}>첫 할 일 추가하기</button></div>}
     </div>
     {blocks.length>0&&<div className="tb-list-end"><span>{todayTotal<=data.dailyCapacity?`오늘 남은 시간 ${data.dailyCapacity-todayTotal}분 · 비워 둬도 괜찮아요`:`오늘 계획이 ${todayTotal-data.dailyCapacity}분 넘었어요`}</span><button disabled={!!running||!!review} onClick={()=>{setCreating(true);document.querySelector('.tb-create')?.scrollIntoView({block:'center'});}}>할 일 추가</button></div>}
    </section>
 </section>;
}

function BlockFields({task:t,change}:{task:PlannerTask;change:(t:PlannerTask)=>void}){
 const [step,setStep]=useState(''),[material,setMaterial]=useState('');const b=t.timeBlock!;const patch=(p:Partial<PlannerTask>)=>change({...t,...p});
 return <div className="tb-edit">
  <label>할 일 이름<input aria-label="블록 이름 수정" maxLength={160} value={t.title} onChange={e=>{if(e.target.value.trim())patch({title:e.target.value});}}/></label>
  <div className="tb-fields"><label>과목·활동<input aria-label="블록 과목 수정" maxLength={80} value={t.subject} onChange={e=>patch({subject:e.target.value})}/></label><label>영역<select value={t.domain} onChange={e=>patch({domain:e.target.value as PlannerTask['domain']})}><option>학습</option><option>생활</option><option>업무</option></select></label></div>
  <label>범위<input aria-label="블록 범위 수정" maxLength={160} value={t.learningScope||''} onChange={e=>patch({learningScope:e.target.value})}/></label>
  <div className="tb-fields"><label>날짜<input aria-label="블록 날짜 수정" type="date" required value={t.date} onChange={e=>{if(e.target.value)patch({date:e.target.value});}}/></label><label>시작 시각<input aria-label="블록 시작 시각 수정" type="time" value={b.startTime} onChange={e=>{if(e.target.value)patch({timeBlock:{...b,startTime:e.target.value}});}}/></label><label>예상 시간(분)<input aria-label="블록 시간 수정" type="number" min={1} max={1440} value={t.minutes} onChange={e=>{const n=Number(e.target.value);if(n>=1&&n<=1440)patch({minutes:n,timeBlock:{...b,budgetMinutes:n}});}}/></label><label>반복<select aria-label="블록 반복" value={t.repeat||'none'} onChange={e=>patch({repeat:e.target.value as PlannerTask['repeat']})}><option value="none">반복 없음</option><option value="daily">매일</option><option value="weekdays">평일</option></select></label></div>
  <h4>단계 카드</h4>{t.steps.map((s,i)=><div className="tb-child" key={s.id}><input type="checkbox" aria-label={s.title+' 단계 완료'} checked={s.done} onChange={e=>patch({steps:t.steps.map(x=>x.id===s.id?{...x,done:e.target.checked}:x)})}/><input aria-label={(i+1)+'번째 블록 단계'} maxLength={160} value={s.title} onChange={e=>{if(e.target.value.trim())patch({steps:t.steps.map(x=>x.id===s.id?{...x,title:e.target.value}:x)});}}/></div>)}
  <div className="tb-fields"><input aria-label="블록 새 단계" maxLength={160} value={step} onChange={e=>setStep(e.target.value)} placeholder="나눌 다음 행동"/><button disabled={!step.trim()||t.steps.length>=50} onClick={()=>{patch({steps:[...t.steps,{id:uid(),title:step.trim(),done:false,date:''}]});setStep('');}}>단계 추가</button></div>
  <h4>준비물</h4>{t.materials.map((m,i)=><div className="tb-child" key={m.id}><input aria-label={m.title+' 준비 완료'} type="checkbox" checked={m.done} onChange={e=>patch({materials:t.materials.map(x=>x.id===m.id?{...x,done:e.target.checked}:x)})}/><input aria-label={(i+1)+'번째 블록 준비물'} maxLength={160} value={m.title} onChange={e=>{if(e.target.value.trim())patch({materials:t.materials.map(x=>x.id===m.id?{...x,title:e.target.value}:x)});}}/></div>)}
  <div className="tb-fields"><input aria-label="블록 새 준비물" maxLength={160} value={material} onChange={e=>setMaterial(e.target.value)} placeholder="챙길 준비물"/><button disabled={!material.trim()||t.materials.length>=100} onClick={()=>{patch({materials:[...t.materials,{id:uid(),title:material.trim(),done:false}]});setMaterial('');}}>준비물 추가</button></div>
 </div>;
}
