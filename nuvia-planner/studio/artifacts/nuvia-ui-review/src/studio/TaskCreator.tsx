import {useEffect,useRef,useState} from 'react';
import type {Action,PersonalState} from './model';
import type {TaskInput,Activity} from './task-plan';
import {ACTIVITIES,activityOf,checkMinutes} from './task-plan';
import {student,localDate} from './domain';
import {taskText} from './task-copy';

type Props={state:PersonalState;act:(a:Action)=>boolean};
function read(key:string){try{return JSON.parse(sessionStorage.getItem(key)??'null');}catch{return null;}}
function erase(key:string){try{sessionStorage.removeItem(key);sessionStorage.removeItem(key+':open');}catch{/* draft stays in memory */}}
export default function TaskCreator({state,act}:Props){
 const p=student(state),key=`nuvia-task-entry:${state.workspaceId}:${state.mode}`;
 const [open,setOpen]=useState(()=>read(key+':open')===true),[seed,setSeed]=useState<TaskInput|undefined>();
 const ref=useRef<HTMLButtonElement>(null);
 const close=()=>{erase(key);setOpen(false);setSeed(undefined);requestAnimationFrame(()=>ref.current?.focus());};
 const show=(input?:TaskInput)=>{setSeed(input);setOpen(true);try{sessionStorage.setItem(key+':open','true');}catch{/* memory only */}};
 const recent=[...new Map(p.cards.filter(c=>c.status==='done'||c.date&&c.date<localDate()).slice().reverse().map(c=>[`${c.domain}|${c.subject}|${c.title}`,c])).values()].slice(0,6);
 return <section className="st-task-entry" data-testid="task-entry">
  {!open&&<button ref={ref} className="pm-primary" data-testid="button-open-task" onClick={()=>show()}>{taskText(state.lab.language,'add')}</button>}
  {open&&<TaskForm key={seed?.requestId??'new'} state={state} draftKey={key} initial={seed} onCancel={close} onSave={input=>{if(!act({type:'create',...input}))return false;close();return true;}}/>}
  {!open&&recent.length>0&&<details className="pm-fold"><summary>최근 과제 다시 쓰기</summary><p className="st-note">원본은 그대로 두고, 복사한 설정을 저장하기 전에 확인할 수 있어요. 복사만으로 연습 수행을 인정하지 않아요.</p><div className="pm-chips">{recent.map(c=><button key={c.id} data-testid={`button-reuse-${c.id}`} onClick={()=>show({title:c.title,activity:activityOf(state,c),subject:c.subject,minutes:c.minutes||null,scope:c.scope,firstAction:c.firstAction,materials:state.meta[c.id]?.materials??'',steps:c.steps.map(s=>s.title),requestId:crypto.randomUUID()})}>{c.subject?c.subject+' · ':''}{c.title}</button>)}</div></details>}
 </section>;
}
export function TaskForm({state,draftKey,initial,onSave,onCancel,stage}:{state:PersonalState;draftKey:string;initial?:TaskInput;onSave:(input:TaskInput)=>boolean;onCancel:()=>void;stage?:string}){
 const age=stage??student(state).stage,t=(key:Parameters<typeof taskText>[1])=>taskText(state.lab.language,key);
 const [v,setV]=useState(()=>{
  const cached=initial?null:read(draftKey);
  const saved=cached&&typeof cached==='object'&&['title','activity','choice','custom','subject','scope','first','date','start','materials','steps','requestId'].every(k=>typeof cached[k]==='string')?cached:null;
  return saved??{title:initial?.title??'',activity:initial?.activity??(age==='adult'?state.studio?.lastActivity??'학습':'학습'),activityExplicit:false,
   choice:initial?.minutes?( [10,25,45].includes(initial.minutes)?String(initial.minutes):'custom'):'unknown',custom:initial?.minutes?String(initial.minutes):'',
   timeChosen:false,scopeChosen:false,reviewed:false,subject:initial?.subject??'',scope:initial?.scope??'',first:initial?.firstAction??'',
   date:localDate(),start:'',materials:initial?.materials??'',steps:initial?.steps?.join('\n')??'',requestId:initial?.requestId??crypto.randomUUID(),copied:!!initial};
 });
 const [error,setError]=useState(''),titleRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{titleRef.current?.focus();},[]);
 useEffect(()=>{try{sessionStorage.setItem(draftKey,JSON.stringify(v));}catch{/* typing remains in memory */}},[v,draftKey]);
 const set=(key:string,value:unknown)=>setV((old:typeof v)=>({...old,[key]:value}));
 const submit=()=>{setError('');if(!v.title.trim()){setError(t('required'));titleRef.current?.focus();return;}
  const minutes=v.choice==='unknown'?null:v.choice==='custom'?Number(v.custom):Number(v.choice);
  try{checkMinutes(minutes);}catch{setError(t('invalid'));return;}
  if(onSave({title:v.title,activity:v.activity as Activity,activityExplicit:v.activityExplicit,subject:v.subject,minutes,timeChosen:v.timeChosen,scopeChosen:v.scopeChosen,
   planReviewed:v.reviewed,scope:v.scope,firstAction:v.first,date:v.date,startTime:v.start,materials:v.materials,steps:v.steps.split('\n').filter((s:string)=>s.trim()),requestId:v.requestId}))erase(draftKey);
 };
 const labels=['learning','life','work','other'] as const;
 return <form className="st-block st-add-form" data-testid="task-form" onSubmit={e=>{e.preventDefault();submit();}}>
  <h3>{t('add')}</h3>
  <label>{t('title')}<input ref={titleRef} data-testid="task-title" value={v.title} onChange={e=>set('title',e.target.value)} required/></label>
  <fieldset><legend>{t('activity')}</legend><div className="pm-chips">{ACTIVITIES.map((a,i)=><button type="button" key={a} data-testid={`task-area-${i}`} aria-pressed={v.activity===a} onClick={()=>setV({...v,activity:a,activityExplicit:true})}>{t(labels[i])}</button>)}</div><p className="st-note">{age==='adult'&&state.studio?.lastActivity?t('recent'):t('recommended')}</p></fieldset>
  {v.activity==='학습'&&<label>{t('subject')}<input data-testid="task-subject" list={`subjects-${v.requestId}`} value={v.subject} onChange={e=>set('subject',e.target.value)}/><datalist id={`subjects-${v.requestId}`}>{(age==='adult'?['전공','교양','자격 학습','기타']:['국어','영어','수학','사회','과학','기타']).map(x=><option key={x} value={x}/>)}</datalist></label>}
  <fieldset><legend>{t('estimate')}</legend><div className="pm-chips">{['10','25','45','custom','unknown'].map(x=><button type="button" key={x} data-testid={`task-time-${x}`} aria-pressed={v.choice===x} onClick={()=>setV({...v,choice:x,timeChosen:true})}>{x==='custom'?t('custom'):x==='unknown'?t('unknown'):`${x}${t('minutes')}`}</button>)}</div>
   {v.choice==='custom'&&<label>{t('minutes')}<input data-testid="task-custom" type="number" min={1} max={1440} step={1} value={v.custom} onChange={e=>setV({...v,custom:e.target.value,timeChosen:true})}/></label>}
   {v.choice==='unknown'&&<p className="st-note">{t('untimed')}</p>}
  </fieldset>
  <details className="pm-fold" data-testid="task-details"><summary>{t('details')}</summary><div className="pm-grid2">
   <label>{t('date')}<input data-testid="task-date" type="date" value={v.date} onChange={e=>set('date',e.target.value)}/></label>
   <label>{t('start')}<input data-testid="task-start" type="time" value={v.start} onChange={e=>set('start',e.target.value)}/></label>
   <label>{t('scope')}<input data-testid="task-scope" value={v.scope} onChange={e=>setV({...v,scope:e.target.value,scopeChosen:true})}/></label>
   <label>{t('first')}<input data-testid="task-first" value={v.first} onChange={e=>set('first',e.target.value)}/></label>
   <label>{t('materials')}<input data-testid="task-materials" value={v.materials} onChange={e=>set('materials',e.target.value)}/></label>
   <label>{t('steps')}<textarea data-testid="task-steps" value={v.steps} onChange={e=>set('steps',e.target.value)}/></label>
  </div></details>
  {v.copied&&<label className="pm-check"><input type="checkbox" data-testid="task-review" checked={v.reviewed} onChange={e=>set('reviewed',e.target.checked)}/>{t('review')}</label>}
  {error&&<p role="alert" data-testid="task-error">{error}</p>}
  <div className="st-row"><button className="pm-primary" type="submit" data-testid="task-save">{t('save')}</button><button type="button" data-testid="task-cancel" onClick={()=>{erase(draftKey);onCancel();}}>{t('cancel')}</button></div>
 </form>;
}
