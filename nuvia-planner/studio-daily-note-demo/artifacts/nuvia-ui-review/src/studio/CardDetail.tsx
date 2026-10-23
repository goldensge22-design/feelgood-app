import {useEffect,useRef,useState} from 'react';
import type {Card,Student} from '../enhancement/model';
import type {Action,PersonalState,Meta} from './model';
import {placement} from './studio-logic';
import {ACTIVITIES,activityOf} from './task-plan';
import {routeFor} from './domain';
import HelpView from './HelpView';
import Activity from './Activity';
import SplitPlanner from './SplitPlanner';
import {demoCardLabels} from './i18n/demo-copy';
import {LibraryAttachmentPanel} from '../planner-library/LibraryUI';

const KINDS:Record<string,string[]>={middle:['숙제','복습','시험 준비','수행평가'],high:['내신 시험','수행평가','모의고사','복습'],adult:['과제','프로젝트','진로','업무','생활']};
const PREP:Record<string,string[]>={middle:['수학 문제 10개','영어 단어 한 묶음','국어 교과서 2쪽','내일 준비물 챙기기']};

export default function CardDetail({state,student,card,act}:{state:PersonalState;student:Student;card:Card;act:(a:Action)=>boolean}){
 const cmd=(command:Record<string,unknown>)=>act({type:'legacy',command:command as never});
 const route=routeFor(student);
 const meta:Partial<Meta>=state.meta[card.id]??{};
 const open=student.runs.find(r=>r.phase!=='closed');
 const busy=!!open,own=open?.cardId===card.id;
 const [fa,setFa]=useState(card.firstAction);
 const [scope,setScope]=useState(card.scope);
 const [base,setBase]=useState({title:card.title,subject:card.subject,minutes:card.minutes?String(card.minutes):'',date:card.date,startTime:placement(state,card.id).timeSet===false?'':card.startTime,middleDeadline:card.middleDeadline,deadline:card.deadline});
 const [area,setArea]=useState(activityOf(state,card));
 const [m,setM]=useState({examDate:meta.examDate??'',weeklyScope:meta.weeklyScope??'',materials:meta.materials??'',nextPosition:meta.nextPosition??'',output:meta.output??'',difficulty:meta.difficulty??''});
 const [adult,setAdult]=useState({owner:card.owner,dependency:card.dependency,waiting:card.waiting,handoff:card.handoff});
 const stage=student.stage;
 // Sync saved values into local inputs only when the saved field itself changes and the user has no unsaved edit.
 const savedFa=useRef(card.firstAction),savedScope=useRef(card.scope);
 useEffect(()=>{setFa(v=>v===savedFa.current?card.firstAction:v);savedFa.current=card.firstAction;},[card.firstAction]);
 useEffect(()=>{setScope(v=>v===savedScope.current?card.scope:v);savedScope.current=card.scope;},[card.scope]);
 const [prepNote,setPrepNote]=useState('');
 const fillScope=(t:string)=>{if(scope.trim()&&scope!==t){setPrepNote(`이미 적은 분량이 있어요. 바꾸려면 지우고 다시 눌러 주세요: ${t}`);return;}setScope(t);setPrepNote('');};
 const dirtyCore=fa!==card.firstAction||scope!==card.scope;
 return <div className="pm-detail" data-testid={`detail-${card.id}`}>
  <LibraryAttachmentPanel key={card.id} state={state} cardId={card.id} act={act}/>
  {!own&&<div className="st-current-action"><small>지금 할 한 가지</small><p>{card.firstAction||'시작하면서 할 행동을 정해도 괜찮아요.'}</p></div>}
  <button className="pm-primary pm-big st-start" data-testid="start" disabled={busy||card.status==='done'} onClick={()=>{if(dirtyCore&&!cmd({type:'card.update',cardId:card.id,changes:{firstAction:fa,scope}}))return;cmd({type:'run.start',cardId:card.id});}}>{card.status==='done'?'완료한 과제':own?(open!.phase==='paused'?'멈춘 실행 · 위에서 이어가기':open!.phase==='review'?'돌아보기 작성 중':'이 과제 실행 중'):busy?'다른 과제 실행 중':'바로 시작'}</button>
  <details className="pm-fold st-editor" data-testid={`edit-panel-${card.id}`}><summary aria-label={demoCardLabels(state,card).edit}>수정</summary>
  <div className="pm-grid2">
   <label>첫 행동<input data-testid="first-action" value={fa} onChange={e=>setFa(e.target.value)} placeholder="예: 교과서 54쪽 펴기"/></label>
   <details className="pm-fold"><summary>분량 수정 (선택) · {scope||'아직 미입력'}</summary><label>오늘 분량<input data-testid="scope" value={scope} onChange={e=>setScope(e.target.value)} placeholder="예: 문제 10개"/></label></details>
  </div>
  {PREP[stage]&&<div className="pm-chips" aria-label="분량 예시">{PREP[stage].map(t=><button key={t} className="pm-chip" onClick={()=>fillScope(t)}>{t}</button>)}</div>}
  {prepNote&&<p className="pm-note" role="status">{prepNote}</p>}
  <button data-testid="core-save" disabled={!dirtyCore} onClick={()=>cmd({type:'card.update',cardId:card.id,changes:{firstAction:fa,scope}})}>첫 행동·분량 저장</button>
  {dirtyCore&&<span className="pm-note"> 저장하지 않은 변경이 있어요.</span>}

  <details className="pm-fold st-help"><summary>활동·도움·종류 (필요할 때)</summary>
  <Activity key={`${card.id}-${route.target}`} card={card} target={route.target} round={student.round} act={act}/>

  <HelpView student={student} card={card} meta={meta} act={act}/>

  {KINDS[stage]&&card.domain==='학습'&&<><h4>어떤 종류인가요 (선택)</h4><div className="pm-chips">{KINDS[stage].map(k=><button key={k} className="pm-chip" aria-pressed={meta.kind===k} onClick={()=>act({type:'meta',cardId:card.id,changes:{kind:meta.kind===k?'':k}})}>{k}</button>)}</div></>}

  </details>

  <details className="pm-fold"><summary>기본 정보 고치기</summary>
   <div className="pm-grid2">
    <label>제목<input value={base.title} onChange={e=>setBase({...base,title:e.target.value})}/></label>
    <label>과목<input value={base.subject} onChange={e=>setBase({...base,subject:e.target.value})}/></label>
    <label>활동 영역<select data-testid="detail-area" value={area} onChange={e=>setArea(e.target.value as typeof area)}>{ACTIVITIES.map(a=><option key={a}>{a}</option>)}</select></label>
    <label>예상 시간(분, 비우면 미정)<input data-testid="detail-minutes" type="number" min={1} max={1440} value={base.minutes} onChange={e=>setBase({...base,minutes:e.target.value})}/></label>
    <label>날짜<input type="date" value={base.date} onChange={e=>setBase({...base,date:e.target.value})}/></label>
    <label>시작 시각<input type="time" data-testid="detail-start-time" value={base.startTime} onChange={e=>setBase({...base,startTime:e.target.value})}/></label>
    {stage!=='middle'&&<label>중간 마감<input type="date" value={base.middleDeadline} onChange={e=>setBase({...base,middleDeadline:e.target.value})}/></label>}
    <label>최종 마감<input type="date" value={base.deadline} onChange={e=>setBase({...base,deadline:e.target.value})}/></label>
   </div>
   <button data-testid="base-save" onClick={()=>act({type:'studio.editPlan',cardId:card.id,minutes:base.minutes.trim()===''?null:Number(base.minutes),activity:area,changes:{...base,minutes:undefined}})}>저장</button>
   <div className="pm-row"><button onClick={()=>cmd({type:'card.move',cardId:card.id,direction:-1})}>앞으로</button><button onClick={()=>cmd({type:'card.move',cardId:card.id,direction:1})}>뒤로</button>
    <select aria-label="반복" value={card.repeat} onChange={e=>cmd({type:'card.repeat',cardId:card.id,repeat:e.target.value})}><option value="none">반복 없음</option><option value="daily">매일</option><option value="weekdays">평일</option></select></div>
  </details>

  <details className="pm-fold"><summary>자세히 (선택)</summary>
   <div className="pm-grid2">
    {stage!=='adult'&&<label>시험일<input type="date" value={m.examDate} onChange={e=>setM({...m,examDate:e.target.value})}/></label>}
    <label>이번 주 범위<input value={m.weeklyScope} onChange={e=>setM({...m,weeklyScope:e.target.value})}/></label>
    <label>준비물·자료<input value={m.materials} onChange={e=>setM({...m,materials:e.target.value})}/></label>
    <label>다음에 이어갈 자리<input value={m.nextPosition} onChange={e=>setM({...m,nextPosition:e.target.value})}/></label>
    <label>만든 결과물<input value={m.output} onChange={e=>setM({...m,output:e.target.value})}/></label>
    <label>어려웠던 점<input value={m.difficulty} onChange={e=>setM({...m,difficulty:e.target.value})}/></label>
   </div>
   <button data-testid="meta-save" onClick={()=>act({type:'meta',cardId:card.id,changes:m})}>자세히 저장</button>
  </details>

  {stage==='adult'&&<details className="pm-fold"><summary>맡은 일과 기다림 (선택)</summary>
   <div className="pm-grid2">
    <label>책임자<input value={adult.owner} onChange={e=>setAdult({...adult,owner:e.target.value})}/></label>
    <label>먼저 끝나야 하는 일<input value={adult.dependency} onChange={e=>setAdult({...adult,dependency:e.target.value})}/></label>
    <label>넘겨줄 곳<input value={adult.handoff} onChange={e=>setAdult({...adult,handoff:e.target.value})}/></label>
    <label className="pm-check"><input type="checkbox" checked={adult.waiting} onChange={e=>setAdult({...adult,waiting:e.target.checked})}/>다른 사람을 기다리는 중</label>
   </div>
   <button data-testid="adult-save" onClick={()=>cmd({type:'card.update',cardId:card.id,changes:adult})}>저장</button>
  </details>}

  {stage==='high'&&<SplitPlanner state={state} card={card} cards={student.cards} capacity={student.dailyCapacity} act={act}/>}

  {student.methods.length>0&&<details className="pm-fold"><summary>내 방법 붙이기</summary>
   <div className="pm-chips">{student.methods.map(x=><button key={x.id} className="pm-chip" aria-pressed={card.method===x.name} onClick={()=>cmd({type:'method.choose',methodId:x.id,cardId:card.id})}>{x.name}</button>)}</div></details>}
  </details>
 </div>;
}
