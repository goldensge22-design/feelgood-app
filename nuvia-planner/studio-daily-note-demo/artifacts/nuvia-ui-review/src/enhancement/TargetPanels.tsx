import {useEffect,useState} from 'react';
import type {Axis,Card,Student,Target,Command} from './model';
import {AXIS_NAMES} from './model';
import {C,LINK_NAMES} from './copy';

type Support=Axis|'universal'|'none';
type P={card:Card;student:Student;act:(c:Command)=>boolean;readOnly?:boolean;support:Support;reduce:boolean};

/* Same target information, presented according to the chosen support. */
function Presentation({card,support,reduce}:{card:Card;support:Support;reduce:boolean}){
 if(support==='none')return null;
 const cur=card.steps.find(s=>!s.done);const nxt=cur?card.steps[card.steps.indexOf(cur)+1]:undefined;
 let body;
 if(support==='planning')body=<dl className="pr-goal"><div><dt>{C.goal}</dt><dd>{card.goal||C.blank}</dd></div><div><dt>{C.doneWhen}</dt><dd>{card.scope||C.blank}</dd></div><div><dt>{C.minutes}</dt><dd>{card.minutes}</dd></div></dl>;
 else if(support==='attention')body=<p className="pr-essential"><mark>{card.firstAction||card.scope||card.title}</mark></p>;
 else if(support==='simultaneous')body=<div className="pr-map"><span className="hub">{card.title}</span>{[card.goal,card.scope,...card.links.map(k=>card.linkItems[k]),...card.steps.map(s=>s.title)].filter(Boolean).map((x,i)=><span key={i}>{x}</span>)}</div>;
 else if(support==='successive')body=<ol className="pr-seq"><li className="cur"><b>{C.current}</b> {cur?.title||card.firstAction||C.blank}</li><li><b>{C.next}</b> {nxt?.title||C.blank}</li></ol>;
 else body=<p className="pr-uni">{C.universalHint}</p>;
 return reduce?<details className="pr-box"><summary>{C.showHelp}</summary>{body}</details>:<div className={'pr-box pr-'+support}>{body}</div>;
}

function PlanForm({card,act,readOnly,confirmType}:{card:Card;act:P['act'];readOnly?:boolean;confirmType:'planning'|'integrated'}){
 const [scope,setScope]=useState(card.scope);const [min,setMin]=useState(String(card.minutes));const [first,setFirst]=useState(card.firstAction);
 useEffect(()=>setScope(card.scope),[card.scope]);useEffect(()=>setMin(String(card.minutes)),[card.minutes]);useEffect(()=>setFirst(card.firstAction),[card.firstAction]);
 const ok=scope.trim()&&first.trim()&&Number(min)>0;
 return <>
  <label>{C.scopeQ}<input value={scope} disabled={readOnly} onChange={e=>setScope(e.target.value)} placeholder={C.scopePh}/></label>
  <div className="nx-row">{[10,15,25,40].map(m=><button key={m} aria-pressed={min===String(m)} disabled={readOnly} onClick={()=>setMin(String(m))}>{m}{C.minutes}</button>)}<label className="nx-inline">{C.custom}<input inputMode="numeric" value={min} disabled={readOnly} onChange={e=>setMin(e.target.value.replace(/\D/g,''))}/></label></div>
  <label>{C.firstQ}<input value={first} disabled={readOnly} onChange={e=>setFirst(e.target.value)} placeholder={C.firstPh}/></label>
  <button className="nx-primary" disabled={readOnly||!ok} data-testid={'button-'+confirmType+'-confirm'} onClick={()=>{if(act({type:'card.update',cardId:card.id,changes:{scope:scope.trim(),minutes:Number(min),firstAction:first.trim()}}))act({type:'card.plan',cardId:card.id});}}>{card.evidence.planConfirmed?C.reconfirm:C.planConfirm}</button>
  {card.evidence.planConfirmed&&<p className="nx-ok">{C.confirmed}: {card.scope} · {card.minutes}{C.minutes} · {card.firstAction}</p>}
 </>;
}
function Planning(p:P){return <div className="nx-panel pn-planning" data-testid="panel-planning"><h4>{AXIS_NAMES.planning} · {C.planningSub}</h4><Presentation {...p}/><PlanForm card={p.card} act={p.act} readOnly={p.readOnly} confirmType="planning"/></div>;}
function Integrated(p:P){const e=p.card.evidence;return <div className="nx-panel pn-integrated" data-testid="panel-integrated"><h4>{AXIS_NAMES.integrated}</h4><Presentation {...p}/>
 <ul className="nx-checks"><li className={e.planConfirmed?'on':''}>{C.int1}</li><li>{C.int2}</li><li>{C.int3}</li></ul><PlanForm card={p.card} act={p.act} readOnly={p.readOnly} confirmType="integrated"/></div>;}
function Attention(p:P){
 const {card,act,readOnly}=p;
 const opts=[card.firstAction,...card.steps.map(s=>s.title),card.scope].filter((x,i,a)=>x&&a.indexOf(x)===i);
 const [own,setOwn]=useState('');
 return <div className="nx-panel pn-attention" data-testid="panel-attention"><h4>{AXIS_NAMES.attention}</h4><Presentation {...p}/>
  <p>{C.attentionHint}</p>
  <div className="nx-stack">{opts.map(o=><button key={o} aria-pressed={card.firstAction===o&&card.evidence.actionSelected} disabled={readOnly} onClick={()=>act({type:'card.action',cardId:card.id,action:o})}>{o}</button>)}</div>
  <div className="nx-row"><input aria-label={C.otherAction} value={own} disabled={readOnly} onChange={e=>setOwn(e.target.value)} placeholder={C.otherAction}/><button disabled={readOnly||!own.trim()} onClick={()=>{if(act({type:'card.action',cardId:card.id,action:own.trim()}))setOwn('');}}>{C.chooseThis}</button></div>
  {card.evidence.actionSelected&&<p className="nx-ok">{C.current}: {card.firstAction}</p>}
 </div>;
}
function Simultaneous(p:P){
 const {card,act,readOnly}=p;
 const [items,setItems]=useState<Record<string,string>>(()=>{const o:Record<string,string>={};LINK_NAMES.forEach(n=>o[n]=card.linkItems?.[n]??'');if(!o['목표'])o['목표']=card.goal;if(!o['마감'])o['마감']=card.deadline;return o;});
 const [rel,setRel]=useState(card.relationship);
 const filled=LINK_NAMES.filter(n=>items[n]?.trim());
 return <div className="nx-panel pn-simultaneous" data-testid="panel-simultaneous"><h4>{AXIS_NAMES.simultaneous}</h4><Presentation {...p}/>
  <p>{C.simHint}</p>
  <div className="nx-linkgrid">{LINK_NAMES.map(n=><label key={n}>{n}<input value={items[n]} disabled={readOnly} data-testid={'input-link-'+n} onChange={e=>setItems({...items,[n]:e.target.value})}/></label>)}</div>
  <label>{C.relQ}<input value={rel} disabled={readOnly} onChange={e=>setRel(e.target.value)} placeholder={C.relPh}/></label>
  {filled.length>=2&&<div className="nx-map">{filled.map(n=><span key={n}><small>{n}</small> {items[n]}</span>)}<p>{rel||C.relMissing}</p></div>}
  <button className="nx-primary" disabled={readOnly||filled.length<2||!rel.trim()} data-testid="button-links-confirm" onClick={()=>act({type:'card.links',cardId:card.id,links:filled,items:Object.fromEntries(filled.map(n=>[n,items[n].trim()])),relationship:rel.trim()})}>{C.linkConfirm}</button>
  {card.evidence.linksConfirmed&&<p className="nx-ok">{C.confirmed} ({card.links.length})</p>}
 </div>;
}
function Successive(p:P){
 const {card,act,readOnly}=p;
 const [steps,setSteps]=useState(card.steps.length?card.steps:[{id:'s1',title:'',done:false},{id:'s2',title:'',done:false}]);
 const move=(i:number,d:number)=>{const j=i+d;if(j<0||j>=steps.length)return;const n=[...steps];[n[i],n[j]]=[n[j],n[i]];setSteps(n);};
 const valid=steps.filter(s=>s.title.trim()).length>=2;
 return <div className="nx-panel pn-successive" data-testid="panel-successive"><h4>{AXIS_NAMES.successive}</h4><Presentation {...p}/>
  <ol className="nx-steps">{steps.map((s,i)=><li key={s.id}>
   <input aria-label={(i+1)+C.stepN} value={s.title} disabled={readOnly} onChange={e=>setSteps(steps.map(x=>x.id===s.id?{...x,title:e.target.value}:x))}/>
   <button aria-label={C.up} disabled={readOnly||i===0} onClick={()=>move(i,-1)}>↑</button><button aria-label={C.down} disabled={readOnly||i===steps.length-1} onClick={()=>move(i,1)}>↓</button>
   <button aria-label={C.remove} disabled={readOnly||steps.length<=2} onClick={()=>setSteps(steps.filter(x=>x.id!==s.id))}>×</button></li>)}</ol>
  <div className="nx-row"><button disabled={readOnly} onClick={()=>setSteps([...steps,{id:'s'+Date.now(),title:'',done:false}])}>{C.addStep}</button>
  <button className="nx-primary" disabled={readOnly||!valid} data-testid="button-steps-confirm" onClick={()=>act({type:'card.steps',cardId:card.id,steps:steps.filter(s=>s.title.trim()).map(s=>({...s,title:s.title.trim()}))})}>{C.stepsConfirm}</button></div>
  {card.evidence.stepsConfirmed&&<div className="nx-progress"><p>{C.stepDoneHint}</p>{card.steps.map((s,i)=><button key={s.id} aria-pressed={s.done} disabled={readOnly||s.done||card.steps.slice(0,i).some(x=>!x.done)} onClick={()=>act({type:'card.progress',cardId:card.id,stepId:s.id})}>{i+1}. {s.title}{s.done?' · '+C.did:''}</button>)}</div>}
 </div>;
}
export const PANELS:Record<Target,(p:P)=>React.ReactElement>={planning:Planning,attention:Attention,simultaneous:Simultaneous,successive:Successive,integrated:Integrated};
export function TargetPanel(p:P&{target:Target}){const Comp=PANELS[p.target];return <Comp key={p.card.id+p.target} {...p}/>;}
