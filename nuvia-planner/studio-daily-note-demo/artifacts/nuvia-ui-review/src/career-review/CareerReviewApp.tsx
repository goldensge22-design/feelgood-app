import {useEffect,useRef,useState,type ReactNode} from 'react';
import {locales,localeNames,isLocale,type Locale} from '../studio/i18n/config';
import {feelgoodLogo} from '../official/adaptive/brandAssets';
import {
 FIELD_IDS,ReviewError,STORAGE_KEY,OWNER_KEY,activeReport,blankPlan,canExport,choose,clock,confirmExperience,currentPlan,
 editTask,exportMaterial,fresh,installReport,openExperience,parseBackup,parseReport,savePlan,sameRef,start,updateExperience,
 type ErrorCode,type Experience,type Field,type Plan,type Report,type State,
} from './model';
import {t,display,choiceLabel,getFixtureReport,type CopyKey} from './copy';
import './review.css';

type Page=State['page'];
const PAGES:Page[]=['result','plan','run','experience','export'];
const uuid=()=>crypto.randomUUID();
const iso=()=>new Date().toISOString();
const STUDIO_KEYS=['nuvia:studio:v1:personal','nuvia:studio:v1:review'];

function initialLocale():Locale{
 for(const k of STUDIO_KEYS){try{const raw=localStorage.getItem(k);if(raw){const l=JSON.parse(raw)?.studio?.locale;if(isLocale(l))return l;}}catch{/* read-only probe */}}
 try{
  for(const n of navigator.languages??[navigator.language]){
   const lower=n.toLowerCase();
   if(lower.startsWith('zh'))return /tw|hk|mo|hant/.test(lower)?'zh-TW':'zh-CN';
   const base=lower.split('-')[0];if(isLocale(base))return base;
  }
 }catch{/* ignore */}
 return 'ko';
}
type Boot={state:State;owner:string;blocked:ErrorCode|null};
function boot():Boot{
 let owner='';
 try{owner=localStorage.getItem(OWNER_KEY)??'';if(!owner){owner=uuid();localStorage.setItem(OWNER_KEY,owner);}}catch{owner=owner||uuid();}
 let raw:string|null=null;
 try{raw=localStorage.getItem(STORAGE_KEY);}catch{return {state:fresh(owner,initialLocale()),owner,blocked:'storageError'};}
 if(raw===null)return {state:fresh(owner,initialLocale()),owner,blocked:null};
 try{return {state:parseBackup(raw,owner),owner,blocked:null};}
 catch(e){return {state:fresh(owner,initialLocale()),owner,blocked:e instanceof ReviewError?e.code:'invalidBackup'};}
}
const fmt=(ms:number)=>{const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return `${h}:${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`;};
function download(name:string,data:unknown){
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const readFile=(f:File)=>f.text();

export default function CareerReviewApp(){
 const bootRef=useRef<Boot|null>(null);if(!bootRef.current)bootRef.current=boot();
 const owner=bootRef.current.owner;
 const ref=useRef<State>(bootRef.current.state);
 const [s,setS]=useState<State>(ref.current);
 const [blocked,setBlocked]=useState<ErrorCode|null>(bootRef.current.blocked);
 const blockedRef=useRef(blocked);blockedRef.current=blocked;
 const [saveErr,setSaveErr]=useState(false);
 const [err,setErr]=useState<ErrorCode|null>(null);
 const [pending,setPending]=useState<State|null>(null);
 const [previewId,setPreviewId]=useState<string|null>(null);
 const inflight=useRef(new Set<string>());
 const L=s.locale,T=(k:CopyKey)=>t(L,k);

 const persist=(n:State)=>{
  if(blockedRef.current)return;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(n));setSaveErr(false);}catch{setSaveErr(true);setErr('storageError');}
 };
 const commit=(fn:(x:State)=>State,quiet=false)=>{
  try{const n=fn(ref.current);if(n===ref.current)return true;if(!quiet)setErr(null);ref.current=n;setS(n);persist(n);return true;}
  catch(e){setErr(e instanceof ReviewError?e.code:'invalidAction');return false;}
 };
 const guard=(intent:string,fn:(x:State)=>State)=>{
  if(inflight.current.has(intent))return;
  inflight.current.add(intent);
  try{commit(fn);}finally{setTimeout(()=>inflight.current.delete(intent),400);}
 };

 useEffect(()=>{document.documentElement.lang=L;document.documentElement.dir=L==='ar'?'rtl':'ltr';document.title=`NUVIA PLANNER · ${t(L,'appTitle')}`;},[L]);
 const openRun=s.runs.find(r=>r.phase!=='ended');
 const ticking=openRun?.phase==='running'?openRun.id:null;
 useEffect(()=>{
  if(!ticking)return;
  const h=setInterval(()=>commit(x=>clock(x,ticking,'tick',Date.now()),true),1000);
  return ()=>clearInterval(h);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[ticking]);

 const go=(p:Page)=>commit(x=>({...x,page:p}));
 const report=activeReport(s);
 const writable=!blocked&&!saveErr;

 const onRestoreFile=async(f:File|undefined)=>{
  if(!f)return;
  try{setPending(parseBackup(await readFile(f),owner));setErr(null);}
  catch(e){setPending(null);setErr(e instanceof ReviewError?e.code:'invalidBackup');}
 };
 const applyRestore=()=>{
  if(!pending)return;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(pending));}catch{setErr('storageError');return;}
  ref.current=pending;setS(pending);setBlocked(null);setSaveErr(false);setPending(null);setErr(null);setPreviewId(null);
 };

 return <div className="cr-root" lang={L} dir={L==='ar'?'rtl':'ltr'} data-testid="career-review-root">
  <header className="cr-head">
   <label className="cr-lang" data-testid="locale-selector">
    <span>{T('language')}</span>
    <select value={L} onChange={e=>{const v=e.target.value;if(isLocale(v))commit(x=>({...x,locale:v}));}} data-testid="select-locale" aria-label={T('language')}>
     {locales.map(l=><option key={l} value={l} lang={l}>{localeNames[l]}</option>)}
    </select>
   </label>
   <div className="cr-brand"><img src={feelgoodLogo} alt=""/><small>FeelGood</small><b>NUVIA PLANNER</b></div>
   <div className="cr-titles"><h1 data-testid="text-title">{T('appTitle')}</h1><p>{T('appSub')}</p></div>
  </header>
  <p className="cr-local" data-testid="text-local-only">{T('localOnly')}</p>

  <nav className="cr-tabs" aria-label={T('appTitle')}>
   {PAGES.map((p,i)=><button key={p} type="button" aria-current={s.page===p?'page':undefined} onClick={()=>go(p)} data-testid={`tab-${p}`}>
    <span className="cr-step">{i+1}</span>{T(`tab_${p}` as CopyKey)}</button>)}
  </nav>

  <div aria-live="polite" data-testid="status-region">
   {blocked&&<p className="cr-alert" role="alert" data-testid="status-writes-blocked">{T(`e_${blocked}` as CopyKey)} {T('writesOff')}</p>}
   {err&&<p className="cr-alert" role="alert" data-testid="status-error" data-code={err}>{T(`e_${err}` as CopyKey)}</p>}
   {!blocked&&!saveErr&&<p className="cr-saved" data-testid="status-saved">{T('saved')}</p>}
  </div>

  <main className="cr-main">
   {s.page==='result'&&<ResultPage {...{s,L,T,report,commit,setErr}}/>}
   {s.page==='plan'&&<PlanPage {...{s,L,T,report,commit,guard}}/>}
   {s.page==='run'&&<RunPage {...{s,L,T,commit,guard}}/>}
   {s.page==='experience'&&<ExperiencePage {...{s,L,T,commit,guard}}/>}
   {s.page==='export'&&<ExportPage {...{s,L,T,writable,previewId,setPreviewId,setErr}}/>}
  </main>

  <section className="cr-card cr-backup" data-testid="section-backup" aria-labelledby="cr-backup-h">
   <h2 id="cr-backup-h">{T('backup')} / {T('restore')}</h2>
   <p className="cr-note">{T('ownerNote')} {T('privacy')}</p>
   <div className="cr-row">
    <button type="button" disabled={!writable} onClick={()=>download(`nuvia-career-review-backup-${iso().slice(0,10)}.json`,ref.current)} data-testid="button-backup">{T('backup')}</button>
    <label className="cr-file"><span>{T('restore')}</span>
     <input type="file" accept="application/json,.json" onChange={e=>{onRestoreFile(e.target.files?.[0]);e.target.value='';}} data-testid="input-restore-file"/></label>
   </div>
   {pending&&<div className="cr-preview" role="region" aria-label={T('restore')} data-testid="restore-preview">
    <p>{T('restoreAsk')}</p>
    <dl className="cr-counts">
     <div><dt>{T('reports')}</dt><dd data-testid="restore-count-reports">{pending.reports.length}</dd></div>
     <div><dt>{T('tasks')}</dt><dd data-testid="restore-count-tasks">{pending.tasks.length}</dd></div>
     <div><dt>{T('runs')}</dt><dd data-testid="restore-count-runs">{pending.runs.length}</dd></div>
     <div><dt>{T('experiences')}</dt><dd data-testid="restore-count-experiences">{pending.experiences.length}</dd></div>
    </dl>
    <div className="cr-row">
     <button type="button" className="cr-primary" onClick={applyRestore} data-testid="button-restore-confirm">{T('replace')}</button>
     <button type="button" onClick={()=>setPending(null)} data-testid="button-restore-cancel">{T('cancel')}</button>
    </div>
   </div>}
  </section>
  <footer className="cr-foot"><a href="./studio.html" data-testid="link-studio-footer">{T('studioLink')}</a></footer>
 </div>;
}

type Ctx={s:State;L:Locale;T:(k:CopyKey)=>string};
type Commit=(fn:(x:State)=>State,quiet?:boolean)=>boolean;
type Guard=(intent:string,fn:(x:State)=>State)=>void;

function Card({title,children,testid}:{title?:string;children:ReactNode;testid?:string}){
 return <section className="cr-card" data-testid={testid}>{title&&<h2>{title}</h2>}{children}</section>;
}

function ResultPage({s,L,T,report,commit,setErr}:Ctx&{report:Report|undefined;commit:Commit;setErr:(c:ErrorCode|null)=>void}){
 const load=(r:Report)=>commit(x=>installReport(x,r));
 const onFile=async(f:File|undefined)=>{
  if(!f)return;
  try{const r=parseReport(await readFile(f));load(r);}catch(e){setErr(e instanceof ReviewError?e.code:'invalidReport');}
 };
 const d=report?display(L,report):null;
 return <>
  <Card testid="section-load">
   <p className="cr-warn" data-testid="text-privacy">{T('privacy')}</p>
   <p className="cr-note" data-testid="text-adapter">{T('adapter')}</p>
   <div className="cr-row">
    <button type="button" className="cr-primary" onClick={()=>load(getFixtureReport())} data-testid="button-load-sample">{T('loadSample')}</button>
    <label className="cr-file"><span>{T('loadFile')}</span>
     <input type="file" accept="application/json,.json" onChange={e=>{onFile(e.target.files?.[0]);e.target.value='';}} data-testid="input-report-file"/></label>
   </div>
  </Card>
  {!report||!d?<Card testid="empty-report">
   <p>{T('noReport')}</p>
   <div className="cr-row">
    <button type="button" className="cr-primary" onClick={()=>commit(x=>({...x,page:'plan'}))} data-testid="button-own-career">{T('ownCareer')}</button>
    <a className="cr-link" href="./studio.html" data-testid="link-studio">{T('studioLink')}</a>
    <a className="cr-link" href="./studio.html?demo=school" data-testid="link-school-demo">{T('schoolLink')}</a>
   </div>
  </Card>:<Card testid="section-report">
   <p className="cr-eye">{T('readOnly')}</p>
   <dl className="cr-meta">
    <div><dt>ID</dt><dd data-testid="text-report-id" data-user>{report.id}</dd></div>
    <div><dt>{T('version')}</dt><dd data-testid="text-report-version" data-user>{report.version}</dd></div>
    <div><dt>{T('source')}</dt><dd data-testid="text-report-source" data-user>{d.source}</dd></div>
    <div><dt>{report.source.issuedAt}</dt><dd>{report.synthetic&&<span className="cr-badge" data-testid="badge-synthetic">{T('synthetic')}</span>}</dd></div>
   </dl>
   <div className="cr-pass" role="list">
    {report.pass.map((p,i)=><div role="listitem" key={p.id} className="cr-domain" data-testid={`row-pass-${p.id}`}>
     <b>{T(`d_${p.id}` as CopyKey)}</b>
     <span className="cr-score"><small>{T('score')}</small><span data-testid={`text-score-${p.id}`}>{p.score}</span><small data-user>{p.unit}</small></span>
     <span><small>{T('level')}</small> <span data-testid={`text-level-${p.id}`} data-user>{p.level}</span></span>
     <p data-user data-testid={`text-interp-${p.id}`}>{d.interp(i)}</p>
    </div>)}
   </div>
   {d.fixture&&<p className="cr-warn" data-testid="text-fixture-note">{T('fixtureNote')}</p>}
   <ol className="cr-jobs">
    {report.occupations.map((o,i)=><li key={o.id} data-testid={`row-occupation-${o.id}`}>
     <span className="cr-rank"><small>{T('rank')}</small>{o.rank}</span>
     <span className="cr-job"><b data-user data-testid={`text-occupation-${o.id}`}>{d.job(i)}</b><small data-user>{o.id} · {T('source')}: {o.source}</small></span>
     <button type="button" onClick={()=>commit(x=>({...choose(x,{kind:'recommended',id:o.id,label:o.label}),page:'plan'}))} data-testid={`button-plan-occupation-${o.id}`}>{T('tab_plan')}</button>
    </li>)}
   </ol>
   <div className="cr-row">
    <button type="button" onClick={()=>commit(x=>({...x,page:'plan'}))} data-testid="button-own-career">{T('ownCareer')}</button>
    <a className="cr-link" href="./studio.html" data-testid="link-studio">{T('studioLink')}</a>
   </div>
  </Card>}
  {s.reports.length>1&&<p className="cr-note">{T('reports')}: {s.reports.length}</p>}
 </>;
}

function PlanView({plan,s,L,T,testid}:Ctx&{plan:Plan;testid:string}){
 const r=s.reports.find(x=>sameRef({id:x.id,version:x.version},plan.report));
 return <dl className="cr-plan" data-testid={testid}>
  <div><dt>{T('f_title')}</dt><dd data-user>{plan.title}</dd></div>
  <div><dt>{T('f_method')}</dt><dd data-user>{plan.method}</dd></div>
  <div><dt>{T('f_criteria')}</dt><dd data-user>{plan.criteria}</dd></div>
  <div><dt>{T('f_evidence')}</dt><dd data-user>{plan.evidence}</dd></div>
  <div><dt>{T('choice')}</dt><dd data-user>{choiceLabel(L,r,plan.choice)}{plan.choice.kind==='recommended'&&` (${plan.choice.id})`}</dd></div>
  {plan.report&&<div><dt>{T('source')}</dt><dd data-user>{plan.report.id} · {T('version')} {plan.report.version}</dd></div>}
 </dl>;
}

function PlanPage({s,L,T,report,commit,guard}:Ctx&{report:Report|undefined;commit:Commit;guard:Guard}){
 const p=s.draft,set=(k:'title'|'method'|'criteria'|'evidence',v:string)=>commit(x=>({...x,draft:{...x.draft,[k]:v}}),true);
 const editing=s.tasks.find(x=>x.id===s.editingTaskId);
 const d=report?display(L,report):null;
 const fields:['title'|'method'|'criteria'|'evidence',CopyKey,boolean][]=[['title','f_title',false],['method','f_method',true],['criteria','f_criteria',true],['evidence','f_evidence',true]];
 return <Card testid="section-plan">
  <div className="cr-row cr-between">
   <h2>{editing?`${T('editTask')} · ${T('revision')} ${currentPlan(editing).version}`:T('newTask')}</h2>
   <button type="button" onClick={()=>commit(x=>({...x,draft:{...blankPlan(),report:x.activeReport},editingTaskId:null}))} data-testid="button-new-task">{T('newTask')}</button>
  </div>
  <form className="cr-form" onSubmit={e=>{e.preventDefault();guard('save-plan',x=>savePlan(x,uuid(),iso()));}}>
   <fieldset data-testid="fieldset-choice"><legend>{T('choice')}</legend>
    {report&&d&&report.occupations.map((o,i)=><label key={o.id} className="cr-radio">
     <input type="radio" name="cr-choice" checked={p.choice.kind==='recommended'&&p.choice.id===o.id} onChange={()=>commit(x=>choose(x,{kind:'recommended',id:o.id,label:o.label}))} data-testid={`radio-occupation-${o.id}`}/>
     <span><small>{T('rank')} {o.rank}</small> <span data-user>{d.job(i)}</span></span></label>)}
    <label className="cr-radio"><input type="radio" name="cr-choice" checked={p.choice.kind==='custom'} onChange={()=>commit(x=>choose(x,{kind:'custom',id:'',label:x.draft.choice.kind==='custom'?x.draft.choice.label:''}))} data-testid="radio-custom"/>
     <span>{T('custom')}</span></label>
    {p.choice.kind==='custom'&&<label className="cr-field"><span>{T('customName')} *</span>
     <input value={p.choice.label} required onChange={e=>{const v=e.target.value;commit(x=>choose(x,{kind:'custom',id:'',label:v}),true);}} placeholder={T('customName')} data-testid="input-custom-name"/></label>}
   </fieldset>
   {fields.map(([k,label,area])=><label key={k} className="cr-field"><span>{T(label)} *</span>
    {area?<textarea rows={3} required value={p[k]} onChange={e=>set(k,e.target.value)} placeholder={T(label)} data-testid={`input-plan-${k}`}/>
     :<input required value={p[k]} onChange={e=>set(k,e.target.value)} placeholder={T(label)} data-testid={`input-plan-${k}`}/>}</label>)}
   <button type="submit" className="cr-primary" data-testid="button-save-plan">{T('save')}</button>
  </form>
 </Card>;
}

function TaskSelect({s,T,commit}:Ctx&{commit:Commit}){
 if(!s.tasks.length)return <p className="cr-note" data-testid="empty-tasks">{T('noTask')}</p>;
 return <label className="cr-field"><span>{T('task')}</span>
  <select value={s.selectedTaskId??''} onChange={e=>{const v=e.target.value;commit(x=>({...x,selectedTaskId:v||null}));}} data-testid="select-task">
   <option value="">-</option>
   {s.tasks.map(x=><option key={x.id} value={x.id}>{currentPlan(x).plan.title} · {T('revision')} {currentPlan(x).version}</option>)}
  </select></label>;
}

function RunPage({s,L,T,commit,guard}:Ctx&{commit:Commit;guard:Guard}){
 const task=s.tasks.find(x=>x.id===s.selectedTaskId);
 const open=s.runs.find(r=>r.phase!=='ended');
 const openTask=open&&s.tasks.find(x=>x.id===open.taskId);
 const ended=s.runs.filter(r=>r.phase==='ended'&&(!task||r.taskId===task.id));
 return <>
  {open&&openTask&&<Card testid="section-open-run">
   <p className="cr-eye" data-testid="status-run-phase" data-phase={open.phase}>{T(open.phase)}</p>
   <h2 data-user>{currentPlan(openTask).plan.title} · {T('revision')} {open.taskVersion}</h2>
   <p className="cr-timer" aria-label={T('elapsed')} data-testid="text-elapsed">{fmt(open.elapsedMs)}</p>
   <div className="cr-row">
    {open.phase==='running'?<button type="button" onClick={()=>guard('pause',x=>clock(x,open.id,'pause',Date.now()))} data-testid="button-pause">{T('pause')}</button>
     :<button type="button" className="cr-primary" onClick={()=>guard('resume',x=>clock(x,open.id,'resume',Date.now()))} data-testid="button-resume">{T('resume')}</button>}
    <button type="button" onClick={()=>guard('end',x=>clock(x,open.id,'end',Date.now()))} data-testid="button-end-run">{T('end')}</button>
   </div>
   <p className="cr-note">{T('endNote')}</p>
  </Card>}
  <Card testid="section-run">
   <TaskSelect {...{s,L,T,commit}}/>
   {task&&<>
    <PlanView {...{s,L,T}} plan={currentPlan(task).plan} testid="view-current-plan"/>
    <details className="cr-history" data-testid="details-history"><summary>{T('history')} ({task.revisions.length})</summary>
     {task.revisions.map(v=><div key={v.version} className="cr-rev" data-testid={`history-revision-${v.version}`}>
      <p className="cr-eye">{T('revision')} {v.version} · {v.at}</p><PlanView {...{s,L,T}} plan={v.plan} testid={`view-revision-${v.version}`}/></div>)}
    </details>
    <div className="cr-row">
     <button type="button" onClick={()=>commit(x=>editTask(x,task.id))} data-testid="button-edit-task">{T('editTask')}</button>
     <button type="button" className="cr-primary" disabled={!!open} onClick={()=>guard('start',x=>start(x,task.id,uuid(),Date.now()))} data-testid="button-start-run">{T('start')}</button>
    </div>
    <p className="cr-note">{T('endNote')}</p>
   </>}
  </Card>
  {ended.length>0&&<Card title={T('runs')} testid="section-ended-runs">
   <ul className="cr-list">{ended.map(r=><li key={r.id} data-testid={`row-run-${r.id}`}>
    <span><b>{T('ended')}</b> · {T('revision')} {r.taskVersion} · {fmt(r.elapsedMs)}<small data-user> {r.endedAt}</small></span>
    <button type="button" onClick={()=>guard(`exp-${r.id}`,x=>openExperience(x,r.id,uuid()))} data-testid={`button-open-experience-${r.id}`}>{T('openExp')}</button>
   </li>)}</ul>
  </Card>}
 </>;
}

function ExperiencePage({s,L,T,commit,guard}:Ctx&{commit:Commit;guard:Guard}){
 const e=s.experiences.find(x=>x.id===s.selectedExperienceId);
 const pick=<label className="cr-field"><span>{T('tab_experience')}</span>
  <select value={s.selectedExperienceId??''} onChange={ev=>{const v=ev.target.value;commit(x=>({...x,selectedExperienceId:v||null}));}} data-testid="select-experience">
   <option value="">-</option>
   {s.experiences.map(x=>{const r=s.runs.find(y=>y.id===x.runId),tk=s.tasks.find(y=>y.id===r?.taskId);
    return <option key={x.id} value={x.id}>{tk?currentPlan(tk).plan.title:x.id} · {T('revision')} {r?.taskVersion}{x.confirmedAt?` · ${T('confirmed')}`:''}</option>;})}
  </select></label>;
 if(!e)return <Card testid="section-experience">{pick}<p className="cr-note" data-testid="empty-experience">{T('openExp')}: {T('tab_run')}</p></Card>;
 const run=s.runs.find(r=>r.id===e.runId)!,task=s.tasks.find(x=>x.id===run.taskId)!;
 const executed=task.revisions.find(v=>v.version===run.taskVersion)!,cur=currentPlan(task);
 const changed=cur.version!==run.taskVersion||!sameRef(executed.plan.report,s.activeReport);
 const stale=!!e.confirmedAt&&!canExport(s,e);
 const upd=(fields:Experience['fields'],sel:Field[])=>commit(x=>updateExperience(x,e.id,fields,sel),true);
 return <>
  <Card testid="section-experience">
   {pick}
   {(stale||(changed&&!e.confirmedAt))&&<p className="cr-warn" role="status" data-testid="status-stale">{T('stale')}</p>}
   <p>{T('version')}: <span data-testid="text-experience-version">{e.version}</span></p>
   <details className="cr-history" data-testid="experience-history"><summary>{T('history')} ({e.history.length})</summary>
    {e.history.map(h=><div key={h.version} className="cr-rev">
     <p>{T('version')} {h.version} · {h.at} · {T('revision')} {h.ackTaskVersion}</p>
     {h.selected.map(k=><p key={k}><b>{T(`x_${k}` as CopyKey)}</b>: <span data-user>{h.fields[k]}</span></p>)}
    </div>)}
   </details>
   <div className="cr-compare">
    <div><h3>{T('executed')} · {T('revision')} {run.taskVersion}</h3><PlanView {...{s,L,T}} plan={executed.plan} testid="view-executed-plan"/></div>
    {changed&&<div><h3>{T('current')} · {T('revision')} {cur.version}</h3><PlanView {...{s,L,T}} plan={cur.plan} testid="view-current-plan-compare"/>
     {s.activeReport&&<p className="cr-note" data-testid="text-active-report">{T('source')}: {s.activeReport.id} · {T('version')} {s.activeReport.version}</p>}</div>}
   </div>
  </Card>
  <Card testid="section-experience-fields">
   <p className="cr-note">{T('expHint')}</p>
   {FIELD_IDS.map(k=><div key={k} className="cr-xfield">
    <label className="cr-field"><span>{T(`x_${k}` as CopyKey)}</span>
     <textarea rows={3} value={e.fields[k]} placeholder={T(`x_${k}` as CopyKey)} onChange={ev=>upd({...e.fields,[k]:ev.target.value},e.selected)} data-testid={`input-experience-${k}`}/></label>
    <label className="cr-check"><input type="checkbox" checked={e.selected.includes(k)} disabled={!e.fields[k].trim()&&!e.selected.includes(k)}
     onChange={ev=>upd(e.fields,ev.target.checked?[...e.selected,k]:e.selected.filter(x=>x!==k))} data-testid={`checkbox-include-${k}`}/><span>{T('include')}</span></label>
   </div>)}
   <div className="cr-row">
    <button type="button" className="cr-primary" disabled={!!e.confirmedAt&&!stale} onClick={()=>guard('confirm',x=>confirmExperience(x,e.id,iso()))} data-testid="button-confirm-experience">{T('confirm')}</button>
    {e.confirmedAt&&!stale&&<span className="cr-badge" data-testid="status-confirmed">{T('confirmed')}</span>}
   </div>
  </Card>
 </>;
}

function ExportPage({s,L,T,writable,previewId,setPreviewId,setErr}:Ctx&{writable:boolean;previewId:string|null;setPreviewId:(x:string|null)=>void;setErr:(c:ErrorCode|null)=>void}){
 const ready=s.experiences.filter(e=>canExport(s,e));
 const e=ready.find(x=>x.id===previewId);
 let material:ReturnType<typeof exportMaterial>|null=null;
 if(e){try{material=exportMaterial(s,e.id);}catch{material=null;}}
 return <Card testid="section-export">
  <p className="cr-note">{T('localOnly')}</p>
  {!ready.length?<p className="cr-warn" data-testid="empty-export">{T('notReady')}</p>:
  <ul className="cr-list">{ready.map(x=>{const r=s.runs.find(y=>y.id===x.runId)!,tk=s.tasks.find(y=>y.id===r.taskId)!;
   return <li key={x.id}><span data-user>{tk.revisions.find(v=>v.version===r.taskVersion)!.plan.title} · {T('revision')} {r.taskVersion}</span>
    <button type="button" aria-pressed={previewId===x.id} onClick={()=>setPreviewId(x.id)} data-testid={`button-preview-${x.id}`}>{T('preview')}</button></li>;})}</ul>}
  {material&&<div className="cr-preview" data-testid="export-preview">
   <h3>{T('preview')}</h3>
   <ul className="cr-statements">{material.statements.map(st=><li key={st.field} data-testid={`export-statement-${st.field}`}>
    <b>{T(`x_${st.field}` as CopyKey)}</b><p data-user>{st.text}</p>
    <small data-user>{T('runs')}: {st.basis.runId} · {T('revision')} {st.basis.taskVersion} · {T('source')}: {material!.source.originalReport?`${material!.source.originalReport.id} v${material!.source.originalReport.version}`:'-'}</small></li>)}</ul>
   <details><summary>JSON</summary><pre className="cr-json" data-testid="text-export-json">{JSON.stringify(material,null,2)}</pre></details>
   <button type="button" className="cr-primary" disabled={!writable} onClick={()=>{
    try{download(`nuvia-experience-${material!.source.runId.slice(0,8)}.json`,exportMaterial(s,e!.id));}catch(er){setErr(er instanceof ReviewError?er.code:'stale');}
   }} data-testid="button-download-export">{T('download')}</button>
  </div>}
 </Card>;
}
