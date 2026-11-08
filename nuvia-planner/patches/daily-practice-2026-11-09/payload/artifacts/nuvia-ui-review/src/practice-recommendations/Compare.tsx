/** DEV ONLY: no localStorage, no real-result intake, not a production input. */
import React,{useState} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {createStudio,updateStudio} from '../studio/studio-logic';
import StudioPage from '../studio/StudioPage';
import {DEMOS,AXES} from '../official/adaptive/engine';
import type {Stage,Action,Axis} from '../studio/model';
import {stages} from './model';
import {localeOf,locales} from '../studio/i18n/config';
import {setLocale} from '../studio/i18n/runtime';
import {text,ageContent} from './i18n';
import '../studio/personal.css';
import '../studio/studio.css';
function fixture(stage:Stage,target:Axis='planning',strength:Axis|'universal'='simultaneous'){
 const s=createStudio();s.mode='review';s.studio!.stageChosen=true;
 const p=s.lab.students[s.studentId];p.stage=stage;
 p.assessment=structuredClone(DEMOS[0]);p.assessment.educationStage=stage;
 p.assessment.subjectId=p.id;p.assessment.assessmentId='synthetic-'+p.id;
 for(const axis of AXES)p.assessment.axes[axis].level=axis===target?'low':axis===strength?'high':'mid';
 p.assessment.supportOrder=[target];p.assessment.strengthOrder=strength==='universal'||strength===target?[]:[strength];
 return s;
}
function Compare(){
 const [state,setState]=useState(()=>fixture('adult')),[target,setTarget]=useState<Axis>('planning'),[strength,setStrength]=useState<Axis|'universal'>('simultaneous'),[error,setError]=useState('');
 const locale=localeOf(state),p=state.lab.students[state.studentId];setLocale(locale);
 document.documentElement.lang=locale;document.documentElement.dir=locale==='ar'?'rtl':'ltr';
 function reset(stage:Stage,t=target,h=strength){const n=fixture(stage,t,h);n.studio!.locale=locale;setState(n);}
 function changeStrength(h:Axis|'universal'){
  setStrength(h);
  setState(previous=>{
   const n=structuredClone(previous),fresh=fixture(p.stage,target,h);
   n.lab.students[n.studentId].assessment=fresh.lab.students[fresh.studentId].assessment;
   return n;
  });
 }
 function act(a:Action){try{setState(updateStudio(state,a,new Date().toISOString(),true));setError('');return true;}catch(e){setError(String(e));return false;}}
 return <main className="pm-root st-root"><header className="st-head">
  <h1>NUVIA PLANNER · QA</h1><div className="st-language"><select aria-label="Language" data-testid="compare-locale" value={locale} onChange={e=>act({type:'studio.locale',locale:e.target.value as typeof locale})}>{locales.map(l=><option key={l} value={l}>{l}</option>)}</select></div>
 </header><p>{text(locale,'reviewOnly')} · DEV ONLY · temporary synthetic data</p>
 <div className="pm-grid2">
 <label>{text(locale,'context')}<select data-testid="compare-stage" value={p.stage} onChange={e=>reset(e.target.value as Stage)}>{stages.map(stage=><option key={stage} value={stage}>{ageContent(locale,stage,'scope')}</option>)}</select></label>
 <label>{text(locale,'practiceReason')}<select data-testid="compare-target" value={target} onChange={e=>{const t=e.target.value as Axis;setTarget(t);reset(p.stage,t);}}>{AXES.map(a=><option key={a} value={a}>{text(locale,a)}</option>)}</select></label>
 <label>{text(locale,'strengthReason')}<select data-testid="compare-strength" value={strength} onChange={e=>changeStrength(e.target.value as Axis|'universal')}>{[...AXES,'universal'].map(a=><option key={a} value={a}>{text(locale,a==='universal'?'helpUniversal':'help'+a[0].toUpperCase()+a.slice(1))}</option>)}</select></label>
 </div>{error&&<p role="alert">{error}</p>}<StudioPage key={p.stage+target} view="plan" state={state} student={p} act={act}/></main>;
}
const mount=document.getElementById('root') as HTMLElement&{__practiceRoot?:Root};
(mount.__practiceRoot??=createRoot(mount)).render(<React.StrictMode><Compare/></React.StrictMode>);
