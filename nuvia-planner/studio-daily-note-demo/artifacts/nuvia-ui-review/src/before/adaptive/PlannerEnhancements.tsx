import React,{useState} from 'react';
import {localDate,uid,weekDates,type PlannerTask,type Workspace} from './workspace';

export type TimeAdjustment='reduce'|'split'|'same';
export type RescheduleChoice='today'|'tomorrow'|'week';

const DOMAIN_META={
 '학습':{icon:'▤',label:'학습'},
 '생활':{icon:'⌂',label:'생활'},
 '업무':{icon:'◆',label:'업무'},
 '미지정':{icon:'●',label:'영역 미정'}
} as const;

export function domainKey(domain:PlannerTask['domain']){return domain??'미지정';}
export function DomainMark({domain,compact=false}:{domain:PlannerTask['domain'];compact?:boolean}){const key=domainKey(domain),meta=DOMAIN_META[key];return <span className={`np-domain np-domain-${key}`} aria-label={meta.label}><i aria-hidden="true">{meta.icon}</i>{!compact&&meta.label}</span>;}

export function timeDifferenceText(predicted:number,actual:number|null){if(actual===null)return '실제 시간을 아직 확인하지 않았어요.';const delta=actual-predicted;if(delta===0)return `예상과 실제가 모두 ${actual}분이었어요.`;return `실제 시간이 예상보다 ${Math.abs(delta)}분 ${delta>0?'길었어요':'짧았어요'}.`;}
export function timeAdjustmentLabel(value:TimeAdjustment|undefined){return value==='reduce'?'시간을 줄여 보기':value==='split'?'일을 나누어 보기':value==='same'?'다음에도 같은 시간으로 하기':'';}

export function CapacityShelf({tasks,capacity,onCapacity}:{tasks:PlannerTask[];capacity:number;onCapacity?:(n:number)=>void}){
 const activeTasks=tasks.filter(t=>t.status!=='done'),total=activeTasks.reduce((n,t)=>n+t.minutes,0),over=total>capacity;
 return <section className={`np-capacity-shelf ${over?'is-full':''}`} aria-label={`오늘 계획 ${total}분, 사용 가능 ${capacity}분`}>
  <div className="np-shelf-head"><div><span>오늘 시간 선반</span><b>{total} / {capacity}분</b></div>{onCapacity&&<label>쓸 수 있는 시간<input aria-label="오늘 사용 가능 시간" type="number" min={1} max={1440} value={capacity} onChange={e=>{const n=Number(e.target.value);if(n>=1&&n<=1440)onCapacity(n);}}/>분</label>}</div>
  <div className="np-time-shelf" role="img" aria-label={activeTasks.length?'영역과 예상 시간으로 나눈 오늘의 시간 블록':'비어 있는 오늘 시간 선반'}>{activeTasks.length?activeTasks.map(t=><div key={t.id} className={`np-time-block np-domain-block-${domainKey(t.domain)}`} style={{flexGrow:Math.max(1,Math.min(t.minutes,120))}} title={`${t.title} · ${t.minutes}분`}><DomainMark domain={t.domain} compact/><span>{t.title}</span><b>{t.minutes}분</b></div>):<div className="np-time-empty">오늘 할 일 한 가지를 놓아 보세요</div>}</div>
  <p>{over?'오늘 공간이 거의 찼어요. 하나를 다른 날로 옮길까요?':`${capacity-total}분의 빈 공간이 있어요.`}</p>
 </section>;
}

export function TimeAdjustmentPrompt({task,data,commit}:{task:PlannerTask;data:Workspace;commit:(w:Workspace)=>void}){
 if(task.status!=='done'||task.actualMinutes===null||task.timeAdjustment)return null;
 function choose(value:TimeAdjustment){commit({...data,tasks:data.tasks.map(t=>t.id===task.id?{...t,timeAdjustment:value}:t.repeatOf===task.id?{...t,planningReference:value}:t)});}
 return <section className="np-adjust-card" data-testid="time-adjustment"><span className="np-eyebrow">CHECK · 다음 계획 참고</span><h3>{timeDifferenceText(task.minutes,task.actualMinutes)}</h3><p>점수나 평가가 아니라, 다음 계획을 정할 때 참고하는 기록이에요.</p><div className="np-choice-row" role="group" aria-label="다음 계획 조정 선택"><button onClick={()=>choose('reduce')}>↘ 시간을 줄이기</button><button onClick={()=>choose('split')}>▦ 일을 나누기</button><button onClick={()=>choose('same')}>＝ 같은 시간으로 하기</button></div></section>;
}

export function LatestAdjustment({tasks}:{tasks:PlannerTask[]}){const latest=[...tasks].filter(t=>t.status==='done'&&t.timeAdjustment).sort((a,b)=>b.completedAt.localeCompare(a.completedAt))[0];return latest?<p className="np-plan-reference"><b>최근 조정 참고</b> · {timeAdjustmentLabel(latest.timeAdjustment)} <small>“{latest.title}”에서 선택</small></p>:null;}

export function dateForReschedule(choice:RescheduleChoice,today=localDate(),weekTarget?:string){if(choice==='today')return today;const d=new Date(today+'T12:00:00');if(choice==='tomorrow'){d.setDate(d.getDate()+1);return localDate(d);}const sunday=new Date(d);sunday.setDate(sunday.getDate()+((7-sunday.getDay())%7));const allowed:string[]=[];for(const cursor=new Date(d);cursor<=sunday;cursor.setDate(cursor.getDate()+1))allowed.push(localDate(cursor));return allowed.includes(weekTarget||'')?weekTarget!:allowed.at(-1)??today;}

export function ReplanBoard({data,commit}:{data:Workspace;commit:(w:Workspace)=>void}){
 const today=localDate(),candidates=data.tasks.filter(t=>t.status!=='done'&&(t.status==='paused'||(t.date&&t.date<today)));
 const [open,setOpen]=useState(''),[choice,setChoice]=useState<RescheduleChoice>('today'),[weekTarget,setWeekTarget]=useState(''),[reduce,setReduce]=useState(false),[minutes,setMinutes]=useState(''),[split,setSplit]=useState(false),[part1,setPart1]=useState(''),[part2,setPart2]=useState('');
 if(!candidates.length)return null;
 const task=candidates.find(t=>t.id===open),allowedWeek=weekDates().filter(x=>x>=today);
 function reset(){setOpen('');setChoice('today');setWeekTarget('');setReduce(false);setMinutes('');setSplit(false);setPart1('');setPart2('');}
 function save(){if(!task)return;const nextMinutes=reduce?Number(minutes):task.minutes;if(reduce&&(!Number.isFinite(nextMinutes)||nextMinutes<1||nextMinutes>1440))return;if(split&&(!part1.trim()||!part2.trim()))return;const newSteps=split?[...task.steps,{id:uid(),title:part1.trim(),done:false,date:''},{id:uid(),title:part2.trim(),done:false,date:''}]:task.steps;commit({...data,tasks:data.tasks.map(t=>t.id===task.id?{...t,date:dateForReschedule(choice,today,weekTarget),minutes:nextMinutes,status:'planned',steps:newSteps,rescheduleChoice:choice,rescheduledAt:new Date().toISOString()}:t)});reset();}
 return <section className="np-replan" data-testid="replan-board"><span className="np-eyebrow">다시 놓을 수 있는 카드</span><h3>멈춘 일도, 날짜가 지난 일도 다시 배치할 수 있어요</h3>{candidates.map(t=><div className="np-replan-row" key={t.id}><div><DomainMark domain={t.domain}/><b>{t.title}</b><small>{t.status==='paused'?'잠시 멈춘 일':`${t.date}에 두었던 일`}</small></div><button aria-expanded={open===t.id} onClick={()=>{setOpen(open===t.id?'':t.id);setMinutes(String(t.minutes));setPart1(t.steps.find(s=>!s.done)?.title||'첫 부분');setPart2('마무리 부분');}}>다시 배치하기</button></div>)}{task&&<div className="np-replan-editor"><h4>“{task.title}”을 어디에 둘까요?</h4><div className="np-choice-row" role="group" aria-label="다시 배치할 시점">{([['today','오늘'],['tomorrow','내일'],['week','이번 주']] as const).map(([v,label])=><button aria-pressed={choice===v} key={v} onClick={()=>setChoice(v)}>{label}</button>)}</div>{choice==='week'&&<label>이번 주 날짜<select value={weekTarget} onChange={e=>setWeekTarget(e.target.value)}><option value="">가능한 마지막 날</option>{allowedWeek.map(d=><option key={d} value={d}>{d}</option>)}</select></label>}<label className="np-check"><input type="checkbox" checked={reduce} onChange={e=>setReduce(e.target.checked)}/>예상 시간을 줄여서 놓기</label>{reduce&&<label>새 예상 시간<input aria-label="줄인 예상 시간" type="number" min={1} max={1440} value={minutes} onChange={e=>setMinutes(e.target.value)}/>분</label>}<label className="np-check"><input type="checkbox" checked={split} onChange={e=>setSplit(e.target.checked)}/>남은 일을 두 단계로 나누기</label>{split&&<div className="np-replan-parts"><input aria-label="나눈 첫 단계" maxLength={160} value={part1} onChange={e=>setPart1(e.target.value)}/><input aria-label="나눈 둘째 단계" maxLength={160} value={part2} onChange={e=>setPart2(e.target.value)}/></div>}<div className="np-actions"><button className="np-primary" disabled={(reduce&&(!minutes||Number(minutes)<1||Number(minutes)>1440))||(split&&(!part1.trim()||!part2.trim()))} onClick={save}>이대로 다시 배치</button><button onClick={reset}>취소</button></div><small>버튼을 누르기 전에는 날짜나 완료 상태가 바뀌지 않아요.</small></div>}</section>;
}
