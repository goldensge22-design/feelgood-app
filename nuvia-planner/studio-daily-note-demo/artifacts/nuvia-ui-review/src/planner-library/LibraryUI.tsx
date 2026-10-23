import {useState} from 'react';
import type {Action,PersonalState} from '../studio/model';
import {TaskForm} from '../studio/TaskCreator';
import {localeOf} from '../studio/i18n/config';
import {bindings,selectableTemplates,sourceMessages,attachmentOf,templateOf} from './domain';
import catalog from './catalog/expansion/catalog.json';
import {libText} from './i18n';
import './library.css';
type Props={state:PersonalState;act:(a:Action)=>boolean};
const tx=(s:PersonalState)=>((k:Parameters<typeof libText>[1])=>libText(localeOf(s),k));
export function LibraryPage({state,act,review,onOpen}:{review:boolean;onOpen:(id:string)=>void}&Props){
 const t=tx(state),p=state.lab.students[state.studentId],population=p.stage==='adult'?'adult':'teen';
 const choices=bindings.filter(b=>b.population===population);
 const [binding,setBinding]=useState(choices[0]?.id??''),[kind,setKind]=useState('daily'),[template,setTemplate]=useState(''),[task,setTask]=useState(''),[create,setCreate]=useState(false);
 if(!review||state.mode!=='review')return <section className="st-block library"><h2>{t('nav')}</h2><p data-testid="library-unavailable">{t('unavailable')}</p></section>;
 if(localeOf(state)!=='ko')return <section className="st-block library"><h2>{t('nav')}</h2><p data-testid="library-language">{t('language')}</p></section>;
 const selectedBinding=choices.find(b=>b.id===binding)??choices[0];
 const cards=selectableTemplates(state,selectedBinding.id,review).filter(c=>c.kind===kind);
 const selected=cards.find(c=>c.id===template)??cards[0];
 const eligible=p.cards.filter(c=>c.status!=='done'&&!p.runs.some(r=>r.cardId===c.id)&&!attachmentOf(state,c.id));
 const taskId=eligible.find(c=>c.id===task)?.id??eligible[0]?.id;
 const names=new Map((population==='adult'?catalog.adult.jobs:catalog.teen.jobs).map(j=>[j.id,j.label]));
 return <section className="st-block library" data-testid="library-page"><h2>{t('nav')}</h2><p>{t('review')}</p><p>{t(p.stage==='middle'?'middleHelp':p.stage==='high'?'highHelp':'adultHelp')}</p>
  <label>{t('occupation')}<select data-testid="library-job" value={selectedBinding.id} onChange={e=>{setBinding(e.target.value);setTemplate('');setCreate(false);}}>{choices.map(b=><option key={b.id} value={b.id}>{names.get(b.sourceRef.id)??b.sourceRef.id}</option>)}</select></label>
  <label>{t('kind')}<select data-testid="library-kind" value={kind} onChange={e=>{setKind(e.target.value);setTemplate('');setCreate(false);}}><option value="daily">{t('daily')}</option><option value="job-simulation">{t('simulation')}</option></select></label>
  <div className="library-options">{cards.map(c=><button key={c.id} data-testid={`library-template-${c.id}`} aria-pressed={selected?.id===c.id} onClick={()=>{setTemplate(c.id);setCreate(false);}}>{sourceMessages[c.text.titleKey]}</button>)}</div>
  {selected&&<article><h3>{sourceMessages[selected.text.titleKey]}</h3><p>{sourceMessages[selected.text.scenarioKey]}</p><p>{sourceMessages[selected.text.goalKey]}</p><ol>{selected.text.promptKeys.map(k=><li key={k}>{sourceMessages[k]}</li>)}</ol><p>{sourceMessages[selected.text.completionKey]}</p><p>{sourceMessages[selected.text.noticeKey]}</p>
   <label>{t('task')}<select data-testid="library-task" value={taskId??''} onChange={e=>setTask(e.target.value)}>{!taskId&&<option value="">—</option>}{eligible.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
   <button data-testid="library-attach" disabled={!taskId} onClick={()=>taskId&&act({type:'library.attach',cardId:taskId,bindingId:selectedBinding.id,templateId:selected.id})}>{t('attach')}</button>
   <button data-testid="library-new" onClick={()=>setCreate(!create)} aria-expanded={create}>{t('newTask')}</button>
   {create&&<TaskForm key={selected.id} state={state} draftKey={`library-create:${state.workspaceId}:${selected.id}`} onCancel={()=>setCreate(false)} onSave={task=>{const ok=act({type:'library.create',task,bindingId:selectedBinding.id,templateId:selected.id});if(ok)setCreate(false);return ok;}}/>}
  </article>}
  <p>{t('personal')}</p><LibraryReport state={state} onOpen={onOpen}/>
 </section>;
}
export function LibraryAttachmentPanel({state,act,cardId}:Props&{cardId:string}){
 const a=attachmentOf(state,cardId),t=tx(state),key=`library-answer:${state.workspaceId}:${cardId}`;
 const [answers,setAnswers]=useState<string[]>(()=>{try{const d=JSON.parse(sessionStorage.getItem(key)??'null');if(Array.isArray(d)&&d.length===3&&d.every(x=>typeof x==='string'))return d;}catch{}return a?.answers??['','',''];});
 const [saved,setSaved]=useState(false);
 if(!a)return null;
 if(localeOf(state)!=='ko')return <p className="library" data-testid="library-language">{t('language')}</p>;
 const c=templateOf(a.templateId)!;
 const dirty=JSON.stringify(answers)!==JSON.stringify(a.answers);
 const closed=state.lab.students[state.studentId].runs.some(r=>r.cardId===cardId&&r.phase==='closed');
 return <details className="pm-fold library" data-testid="library-attached"><summary>{t('linked')} · {t(a.kind==='daily'?'daily':'simulation')}</summary><h3>{sourceMessages[c.text.titleKey]}</h3><p>{sourceMessages[c.text.scenarioKey]}</p>
  {c.text.promptKeys.map((k,i)=><label key={k}>{sourceMessages[k]}<textarea data-testid={`library-answer-${i}`} value={answers[i]} maxLength={3000} onChange={e=>{const next=answers.map((v,j)=>j===i?e.target.value:v);setAnswers(next);setSaved(false);try{sessionStorage.setItem(key,JSON.stringify(next));}catch{}}}/></label>)}
  <p>{sourceMessages[c.text.completionKey]}</p><button data-testid="library-save" disabled={!dirty} onClick={()=>{if(act({type:'library.answers',cardId,answers})){setSaved(true);try{sessionStorage.removeItem(key);}catch{}}}}>{t('save')}</button>
  {saved&&<p role="status">{t('saved')}</p>}
  <p>{t(a.confirmedRunId?'reported':'pending')}</p>
  <button data-testid="library-confirm" disabled={!closed||dirty||answers.some(x=>!x.trim())||!!a.confirmedRunId} onClick={()=>act({type:'library.confirm',cardId})}>{t('confirm')}</button><p>{t('personal')}</p>
 </details>;
}
export function LibraryReport({state,onOpen,month}:{state:PersonalState;onOpen:(id:string)=>void;month?:string}){
 const t=tx(state),items=Object.values(state.studio?.libraryAttachments??{}).filter(a=>!month||a.updatedAt.slice(0,7)===month||a.confirmedAt.slice(0,7)===month);
 if(!items.length)return null;
 return <section className="library" data-testid="library-report"><h3>{t('reportTitle')}</h3>{items.map(a=><article key={a.taskId}><strong>{state.lab.students[state.studentId].cards.find(c=>c.id===a.taskId)?.title}</strong><p>{t(a.kind==='daily'?'daily':'simulation')}</p><p>{t(a.confirmedRunId?'reported':'pending')}</p><button onClick={()=>onOpen(a.taskId)}>{t('viewTask')}</button></article>)}</section>;
}
export function PracticeContext({state,kind}:{state:PersonalState;kind?:string}){return kind?<p className="library-context">{tx(state)(kind==='simulation'?'simulation':'daily')}</p>:null;}
