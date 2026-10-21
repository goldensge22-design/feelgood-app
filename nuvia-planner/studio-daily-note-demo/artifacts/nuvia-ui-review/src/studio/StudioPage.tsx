import {useState,type ReactNode} from 'react';
import type {Card,Student} from '../enhancement/model';
import type {Action,PersonalState} from './model';
import TaskCreator from './TaskCreator';
import {activityOf,timeLabel} from './task-plan';
import type {Tone} from './studio-model';
import {localDate} from './domain';
import {studioOf,placement,studioCapacity,scheduleProposal} from './studio-logic';
import CardDetail from './CardDetail';
import RunPanel from './RunPanel';
import SubjectSymbol,{subjectVisual} from './SubjectSymbol';
import DailyNote from './DailyNote';
import {label} from './i18n/runtime';

type Act=(a:Action)=>boolean;
const TONES:[Tone,string][]=[['blue','파랑'],['purple','보라'],['orange','주황'],['sky','하늘']];
const PLACE_NAMES={shelf:'선반',desk:'작업대',archive:'보관함',collection:'완료',excluded:'제외'} as const;

export default function StudioPage({view,state,student,act}:{view:'now'|'plan'|'reflect';state:PersonalState;student:Student;act:Act}){
 const today=localDate();
 const studio=studioOf(state);
 const run=student.runs.find(r=>r.phase!=='closed');
 const of=(c:Card)=>placement(state,c.id);
 const desk=student.cards.find(c=>c.id===studio.deskId&&of(c).place==='desk');
 const by=(pl:string)=>student.cards.filter(c=>of(c).place===pl);
 const shelf=by('shelf');
 const status=(c:Card)=>{if(run?.cardId===c.id)return run.phase==='running'?'실행 중':run.phase==='paused'?'멈춤':'돌아보기';const pl=of(c);if(c.status==='done')return '완료';if(pl.place==='archive')return pl.nextDate?`보관 · ${pl.nextDate}에 다시`:'보관';if(pl.place==='excluded')return '제외';if(c.waiting)return '기다리는 중';return pl.place==='desk'?'작업대':'할 일';};
 const dupe=(c:Card)=>student.cards.filter(x=>x.title===c.title).length>1;
 const tag=(c:Card,i?:number)=>{const pl=of(c);return <li key={c.id} className="st-tag" data-sel={studio.selectedId===c.id} data-testid={`tag-${c.id}`}>
  <span className={`bar ${pl.tone}`} aria-hidden="true"><span className="ico"><SubjectSymbol subject={c.subject} domain={c.domain}/></span></span>
  <button aria-pressed={studio.selectedId===c.id} data-testid={`button-select-${c.id}`} onClick={()=>act({type:'studio.select',cardId:c.id})}>
   <span className="ttl">{i!==undefined?`${i+1}. `:''}{c.subject?`${c.subject} · `:''}{c.title}</span>
   <span className="sub"><span className="st-status" data-testid={`status-${c.id}`}>{status(c)}</span>{activityOf(state,c)}{c.subject?` · ${c.subject}`:''} · {timeLabel(c.minutes)}{of(c).timeSet!==false&&c.startTime?` · ${c.startTime}`:' · 시각 미정'} · {c.date||'날짜 없음'}{dupe(c)?` · #${c.id.slice(-4)}`:''}{c.repeat!=='none'?` · ${c.repeat==='daily'?'매일':'평일'} 반복`:''}</span>
  </button></li>;};
 const sel=student.cards.find(c=>c.id===studio.selectedId);

 if(view==='plan')return <PlanView state={state} student={student} act={act} today={today} tag={tag}/>;
 if(view==='reflect'){const col=by('collection');return <div className="pm-page">
  <DailyNote state={state} act={act} history/>
  <section className="st-block" aria-label="완료 모음" data-testid="section-collection">
   <p className="st-eye">완료 모음 · {col.length}개</p><h2>마친 과제</h2>
   {col.length?<ul className="st-tags">{col.slice().reverse().map(c=>tag(c))}</ul>:<p className="pm-empty">아직 마친 과제가 없어요. 작업대에서 실행을 마치고 '마쳤어요'를 고르면 여기에 모여요.</p>}
  </section>
  {sel&&of(sel).place==='collection'&&<History card={sel}/>}
 </div>;}

 const today_=shelf.filter(c=>!c.date||c.date<=today),later=shelf.filter(c=>c.date&&c.date>today);
 const col=by('collection'),arc=by('archive'),exc=by('excluded');
 const cap=studioCapacity(state,today);
 const ownRun=desk&&run?.cardId===desk.id?run:undefined;
 const otherRun=run&&run.cardId!==desk?.id?student.cards.find(c=>c.id===run.cardId):undefined;
 const icon=(c:Card)=><span className={`st-ico3 ${subjectVisual(c.subject,c.domain).tone}`} aria-hidden="true"><SubjectSymbol subject={c.subject} domain={c.domain}/></span>;
 return <div className="pm-page st-now">
  {otherRun&&<aside className="st-warn" role="status" data-testid="text-other-run">
   <p>{desk&&desk.id!==otherRun.id?'다른 과제':placement(state,otherRun.id).place==='archive'?'보관된 과제':'잠시 멈춘 과제'} '{otherRun.title}'의 실행이 있어요. 작업대로 꺼내 이어갈 수 있어요.</p>
   <button data-testid="button-return-open-run" onClick={()=>act({type:'studio.take',cardId:otherRun.id})}>{otherRun.title} · 작업대로 꺼내기</button>
  </aside>}
  {otherRun&&<RunPanel student={student} act={act} recovery={state.recovery}/>}
  <div className="st-zones">
   <section className="st-block st-desk desk" aria-label="작업대" data-testid="section-desk">
    <header className="st-desk-head"><p className="st-eye">지금 하는 작업대</p>{desk&&<span className="st-status">{status(desk)}</span>}</header>
    <div className="st-desk-body">
     {desk?<article className="st-curfile" data-tone={of(desk).tone} data-run={ownRun?.phase??'none'}>
      <div className="st-cur-top">{icon(desk)}<div>
       <h2 data-testid="text-desk-title" tabIndex={-1}>{desk.subject&&<span className="st-subj">{desk.subject}</span>}{desk.title}</h2>
       <p className="st-desk-meta">{activityOf(state,desk)} · {timeLabel(desk.minutes)}{of(desk).timeSet!==false&&desk.startTime?` · ${desk.startTime} 시작 예정`:' · 시각 미정'}{desk.scope?` · ${desk.scope}`:''}</p></div></div>
      <RunPanel student={student} act={act} recovery={state.recovery} cardId={desk.id}/>
      {!ownRun&&<p className="st-note">작업대에 올려도 타이머는 '바로 시작'을 눌러야 움직여요.</p>}
      <CardDetail key={desk.id} state={state} student={student} card={desk} act={act}/>
      <TagActions card={desk} state={state} act={act} running={!!run}/>
     </article>:<div className="st-curfile empty" data-testid="desk-empty"><p className="st-note">선반에서 네임택을 하나 골라 '작업대에 올리기'를 누르세요. 한 번에 하나만 올라가요. 올려도 자동으로 시작하지 않아요.</p></div>}
    </div>
   </section>
   <div className="st-left">
    <section className="st-block st-shelf" aria-label="선반" data-testid="section-shelf">
     <details className="st-zone" open><summary><span className="st-eye">할 일 선반 · 오늘까지 {today_.length}개</span></summary>
      {today_.length?<ul className="st-tags st-stack">{today_.map((c,i)=>tag(c,i))}</ul>:<p className="pm-empty">선반이 비어 있어요. 아래에서 할 일을 추가해 보세요.</p>}
      {later.length>0&&<details className="pm-fold" data-testid="details-later"><summary>다른 날 {later.length}개 전체 보기</summary><ul className="st-tags">{later.map(c=>tag(c))}</ul></details>}
     </details>
     <TaskCreator state={state} act={act}/>
    </section>
    {sel&&sel.id!==desk?.id&&<section className="st-block st-picked" aria-label="고른 네임택" data-testid="section-selected">
     <p className="st-eye">고른 네임택 · {PLACE_NAMES[of(sel).place]}</p>
     <h3>{sel.subject?`${sel.subject} · `:''}{sel.title}</h3>
     <TagActions card={sel} state={state} act={act} running={!!run}/>
     {of(sel).place!=='excluded'&&<details className="pm-fold"><summary>목표·분량·기본 정보 고치기</summary><CardDetail key={sel.id} state={state} student={student} card={sel} act={act}/></details>}
    </section>}
    <details className="st-drawer st-excl" data-testid="drawer-excluded"><summary>이번 계획에서 뺀 일 · {exc.length}개</summary>
     <p className="st-note">제외한 과제는 오늘 분량에서 빠지고, 언제든 되돌릴 수 있어요.</p>
     {exc.length?<ul className="st-tags">{exc.map(c=>tag(c))}</ul>:<p className="st-note">제외한 과제가 없어요.</p>}
    </details>
   </div>
   <div className="st-right">
    <section className="st-block st-col" aria-label="완료 모음" data-testid="section-collection-compact">
     <details className="st-zone" open><summary><span className="st-eye">해낸 일 · 내 컬렉션 · {col.length}개</span></summary>
      <div className="st-bin">{col.length?<ul className="st-tags st-stack">{col.slice(-5).reverse().map(c=>tag(c))}</ul>:<p className="st-note">실행을 마치고 '마쳤어요'를 고르면 여기에 모여요.</p>}</div>
      {col.length>5&&<p className="st-note">전체는 돌아보기 화면에서 볼 수 있어요.</p>}
     </details>
    </section>
    <details className="st-drawer st-archive" data-testid="drawer-archive" open={arc.length>0||undefined}><summary>보관함 · 다음에 이어가기 · {arc.length}개</summary>
     <p className="st-note">보관해도 목표·범위·단계·타이머 기록은 그대로 남아요.</p>
     {arc.length?<ul className="st-tags st-stack">{arc.map(c=>tag(c))}</ul>:<p className="st-note">보관한 과제가 없어요.</p>}
    </details>
   </div>
  </div>
  <section className="st-capshelf" aria-label="오늘의 시간 선반" data-testid="section-capacity-shelf">
   <p className="st-eye">오늘의 시간 선반 · 사용 가능 {cap.available}분</p>
   <div className="st-cap" role="img" aria-label={`완료 ${cap.done}분, 예정 ${cap.pending}분, 빈 시간 ${cap.free}분`}><span className="d" style={{flex:cap.done}}/><span className="p" style={{flex:cap.pending}}/><span style={{flex:cap.free}}/>{cap.over>0&&<span className="o" style={{flex:cap.over}}/>}</div>
   <p className="st-note" data-testid="text-capacity-shelf">완료 {cap.done}분 · 예정 {cap.pending}분 · 빈 시간 {cap.free}분{cap.over?` · ${cap.over}분 넘침`:''}{cap.unknown?` · 예상 미정 ${cap.unknown}개(합계 제외)`:''} · 기록은 나를 평가하지 않아요.</p>
  </section>
  <DailyNote state={state} act={act}/>
 </div>;
}

function TagActions({card,state,act,running}:{card:Card;state:PersonalState;act:Act;running:boolean}){
 const pl=placement(state,card.id);
 const [arch,setArch]=useState(false);
 const [f,setF]=useState({flag:'',nextDate:''});
 const doArchive=()=>{if(act({type:'studio.archive',cardId:card.id,...(f.flag.trim()&&{flag:f.flag.trim()}),...(f.nextDate&&{nextDate:f.nextDate})})){setArch(false);setF({flag:'',nextDate:''});}};
 return <div data-testid={`actions-${card.id}`}>
  <div className="st-row st-acts">
   {pl.place==='shelf'&&<button className="pm-primary" data-testid={`button-place-${card.id}`} onClick={()=>act({type:'studio.place',cardId:card.id})}>작업대에 올리기</button>}
   {pl.place==='archive'&&<><button className="pm-primary" data-testid={`button-take-${card.id}`} onClick={()=>act({type:'studio.take',cardId:card.id})}>작업대로 꺼내기</button><button data-testid={`button-keep-${card.id}`} onClick={()=>act({type:'studio.keep',cardId:card.id})}>계속 보관</button></>}
   {pl.place==='excluded'&&<button className="pm-primary" data-testid={`button-restore-${card.id}`} onClick={()=>act({type:'studio.restore',cardId:card.id})}>되돌리기</button>}
   {(pl.place==='shelf'||pl.place==='desk')&&<button aria-expanded={arch} data-testid={`button-archive-open-${card.id}`} onClick={()=>setArch(!arch)}>보관하기</button>}
  </div>
  {arch&&<div className="st-src" data-testid={`form-archive-${card.id}`}>
   {running&&pl.place==='desk'&&<p className="st-note">실행 중이면 잠시 멈춘 뒤 보관해요.</p>}
   <div className="st-row">
    <label>이어서 볼 자리 (선택)<input data-testid={`input-archive-flag-${card.id}`} value={f.flag} onChange={e=>setF({...f,flag:e.target.value})} placeholder="예: 3번 문제부터"/></label>
    <label>다시 볼 날 (선택)<input type="date" data-testid={`input-archive-date-${card.id}`} value={f.nextDate} onChange={e=>setF({...f,nextDate:e.target.value})}/></label>
   </div>
   <div className="st-row"><button className="pm-primary" data-testid={`button-archive-${card.id}`} onClick={doArchive}>보관함에 넣기</button><button data-testid={`button-archive-cancel-${card.id}`} onClick={()=>setArch(false)}>취소</button></div>
  </div>}
  <details className="pm-fold st-moreactions" data-testid={`more-actions-${card.id}`}><summary>더 보기</summary>
   {(pl.place==='shelf'||pl.place==='desk'||pl.place==='archive')&&<button data-testid={`button-exclude-${card.id}`} disabled={running&&pl.place==='desk'} title={running&&pl.place==='desk'?'실행을 먼저 마쳐 주세요':undefined} onClick={()=>act({type:'studio.exclude',cardId:card.id})}>제외 서랍으로</button>}
   <p className="st-note">네임택 색 바꾸기</p><div className="pm-chips" aria-label={`${card.title} 네임택 색`}>{TONES.map(([t,l])=><button key={t} aria-label={`${card.title} ${label(l)} 네임택`} aria-pressed={pl.tone===t} data-testid={`button-tone-${t}-${card.id}`} onClick={()=>act({type:'studio.color',cardId:card.id,tone:t})}><span className="st-tag" style={{display:'inline-block',width:10,height:14,border:0,marginRight:6,background:`var(--t-${t})`,verticalAlign:'middle'}} aria-hidden="true"/>{label(l)}</button>)}</div></details>
 </div>;
}

function History({card}:{card:Card}){
 return <section className="st-block" aria-label="기록" data-testid={`history-${card.id}`}>
  <h3>{card.title} 변경 기록</h3>
  {card.history.length?<ul>{card.history.slice().reverse().map((h,i)=><li key={i}>{h.at.slice(0,10)} · {h.reason}</li>)}</ul>:<p className="st-note">남은 변경 기록이 없어요.</p>}
 </section>;
}

function PlanView({state,student,act,today,tag}:{state:PersonalState;student:Student;act:Act;today:string;tag:(c:Card,i?:number)=>ReactNode}){
 const [day,setDay]=useState(today);
 const [start,setStart]=useState('16:00');
 const cap=studioCapacity(state,day);
 const proposal=scheduleProposal(state,day,start);
 const week=Array.from({length:7},(_,i)=>{const d=new Date(today+'T12:00:00');d.setDate(d.getDate()+i);return localDate(d);});
 const dayName=(d:string)=>['일','월','화','수','목','금','토'][new Date(d+'T12:00:00').getDay()];
 const dayCards=student.cards.filter(c=>(c.date||today)===day&&placement(state,c.id).place!=='excluded');
 return <div className="pm-page">
  <section className="st-block" aria-label="할 일 추가" data-testid="section-add">
   <p className="st-eye">계획 · {today}</p><h2>선반에 올릴 할 일</h2>
   <TaskCreator state={state} act={act}/>
  </section>
  <section className="st-block" aria-label="하루 분량" data-testid="section-capacity">
   <div className="st-row" style={{justifyContent:'space-between'}}>
    <label style={{maxWidth:200}}>날짜<input type="date" data-testid="input-plan-day" value={day} onChange={e=>setDay(e.target.value||today)}/></label>
    <label style={{maxWidth:200}}>하루 가능 시간(분)<input type="number" min={10} data-testid="input-daily-capacity" value={student.dailyCapacity} onChange={e=>act({type:'legacy',command:{type:'student.settings',changes:{dailyCapacity:Number(e.target.value)||0}}} as Action)}/></label>
   </div>
   <div className="st-cap" role="img" aria-label={`한 일 ${cap.done}분, 할 일 ${cap.pending}분, 빈 시간 ${cap.free}분`}><span className="d" style={{flex:cap.done}}/><span className="p" style={{flex:cap.pending}}/><span style={{flex:cap.free}}/>{cap.over>0&&<span className="o" style={{flex:cap.over}}/>}</div>
   <p className="st-note" data-testid="text-capacity">한 일 {cap.done}분 · 할 일 {cap.pending}분 · 빈 시간 {cap.free}분{cap.over?` · ${cap.over}분 넘침`:''} (가능 {cap.available}분) · 예상 미정 {cap.unknown}개{cap.unknown?' (시간 합계 제외, 시각 자동 제안 보류)':''}</p>
   {dayCards.length?<ul className="st-tags">{dayCards.map((c,i)=><li key={c.id} style={{display:'grid',gap:4}}><ul className="st-tags">{tag(c,i)}</ul>
    <div className="st-row"><button aria-label={`${c.title} 앞으로`} data-testid={`button-up-${c.id}`} onClick={()=>act({type:'legacy',command:{type:'card.move',cardId:c.id,direction:-1}} as Action)}>앞으로</button><button aria-label={`${c.title} 뒤로`} data-testid={`button-down-${c.id}`} onClick={()=>act({type:'legacy',command:{type:'card.move',cardId:c.id,direction:1}} as Action)}>뒤로</button>
     <label style={{maxWidth:150,margin:0}}>시작 시각 (선택)<input type="time" data-testid={`input-time-${c.id}`} value={placement(state,c.id).timeSet===false?'':c.startTime} onChange={e=>act({type:'legacy',command:{type:'card.update',cardId:c.id,changes:{startTime:e.target.value}}} as Action)}/></label>
     <label style={{maxWidth:150,margin:0}}>반복<select data-testid={`select-repeat-${c.id}`} value={c.repeat} onChange={e=>act({type:'legacy',command:{type:'card.repeat',cardId:c.id,repeat:e.target.value}} as Action)}><option value="none">반복 없음</option><option value="daily">매일</option><option value="weekdays">평일</option></select></label></div></li>)}</ul>:<p className="pm-empty">이 날에 잡힌 할 일이 없어요.</p>}
  </section>
  <section className="st-block" aria-label="시간 제안" data-testid="section-schedule">
   <h2>시간 제안</h2>
   <p className="st-note">시작 시각부터 순서대로 시간을 나눠 본 제안이에요. 적용을 눌러야 저장되고, 이미 정한 시각은 바뀌지 않아요.</p>
   <label style={{maxWidth:200}}>시작 시각<input type="time" data-testid="input-schedule-start" value={start} onChange={e=>setStart(e.target.value)}/></label>
   {proposal.length?<><ol data-testid="list-schedule">{proposal.map(x=><li key={x.cardId}>{x.startTime} · {x.title} ({x.minutes}분){x.fixed?' · 정한 시각 유지':''}</li>)}</ol>
    <button className="pm-primary" data-testid="button-schedule-apply" disabled={!start} onClick={()=>act({type:'studio.schedule',day,start})}>이 제안 적용</button></>:<p className="st-note">{cap.unknown?'시간 미정 과제의 길이를 알 수 없어 자동 시각 배치는 보류해요. 시작 시각은 직접 정할 수 있어요.':'제안할 할 일이 없어요.'}</p>}
  </section>
  <section className="st-block" aria-label="앞으로 7일" data-testid="section-week">
   <h2>앞으로 7일</h2>
   <div className="st-week" tabIndex={0}>{week.map(d=>{const cs=student.cards.filter(c=>c.date===d&&placement(state,c.id).place!=='excluded');return <div key={d} className={`st-day${d===today?' today':''}`} data-testid={`day-${d}`}><b>{d.slice(5)} ({dayName(d)})</b><div className="st-note">{cs.length}개 · {cs.reduce((n,c)=>n+c.minutes,0)}분 · 미정 {cs.filter(c=>c.minutes===0).length}개</div>{cs.length?<ul>{cs.slice(0,4).map(c=><li key={c.id}>{c.title}{c.status==='done'?' (완료)':''}</li>)}{cs.length>4&&<li>외 {cs.length-4}개</li>}</ul>:<div className="st-note">비어 있음</div>}
    <button data-testid={`button-day-${d}`} onClick={()=>setDay(d)}>이 날 보기</button></div>;})}</div>
  </section>
 </div>;
}

