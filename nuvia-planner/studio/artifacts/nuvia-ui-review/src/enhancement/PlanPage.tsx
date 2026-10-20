import {useState} from 'react';
import Glyph from './Glyph';
import type {Card,Student,Stage} from './model';
import {SUPPORT_NAMES,STAGE_NAMES} from './model';
import {routeFor,capacity} from './domain';
import {t,C} from './copy';
import {today,type Lab} from './lab';
import Profile from './Profile';
import {TargetPanel} from './TargetPanels';

function Capacity({student,lab,date}:{student:Student;lab:Lab;date:string}){
 const c=capacity(student,date);const tot=Math.max(c.capacity,c.done+c.pending,1);
 return <section className="nx-cap" data-testid="section-capacity"><div className="nx-cap-head"><b>오늘 쓸 수 있는 시간 {c.capacity}분</b>
  <label>하루 시간<input inputMode="numeric" defaultValue={student.dailyCapacity} onBlur={e=>lab.act({type:'student.settings',changes:{dailyCapacity:Number(e.target.value)||student.dailyCapacity}})}/></label></div>
  <div className="nx-strip"><span className="d" style={{flex:c.done/tot}}/><span className="p" style={{flex:c.pending/tot}}/><span className="f" style={{flex:Math.max(c.free,0)/tot}}/></div>
  <small>끝냄 {c.done}분 · 남음 {c.pending}분 · 빈 시간 {Math.max(c.free,0)}분{c.over?' · 계획이 시간을 넘어요. 하나를 내일로 옮겨볼까요?':''}</small></section>;
}

function Detail({card,student,lab,goNow}:{card:Card;student:Student;lab:Lab;goNow:()=>void}){
 const r=routeFor(student);const lang=lab.state.language;
 const [small,setSmall]=useState('');const [feel,setFeel]=useState('');
 const active=student.runs.find(x=>x.phase!=='closed');
 return <div className="nx-detail" data-testid={'detail-'+card.id}>
  <p className="nx-eyebrow">{card.subject} · {card.startTime||'--:--'}</p>
  <h3>{card.title}</h3>
  {card.scope&&<p className="nx-scope">{card.scope}</p>}
  <div className="nx-startbox">
   <input aria-label="first" value={small} onChange={e=>setSmall(e.target.value)} placeholder={card.firstAction||C.firstQ}/>
   <select aria-label="feeling" value={feel} onChange={e=>setFeel(e.target.value)}><option value="">-</option><option>괜찮아요</option><option>조금 무거워요</option><option>하기 싫어요</option></select>
   <button className="nx-primary nx-big" data-testid="button-start" disabled={card.status==='done'||!!active&&active.cardId!==card.id} onClick={()=>{if(lab.act({type:'run.start',cardId:card.id,smallAction:small||undefined,feelingBefore:feel||undefined}))goNow();}}>{card.status==='done'?'완료한 블록':active?.cardId===card.id?'현재 실행 열기':t(lang,'start')}</button>
   <small>{t(lang,'startHint')}</small>
   <details><summary>작게 시작하기 · 첫 행동 후보 고르기</summary><div className="nx-row">{['자료 하나 펴기','제목 한 줄 적기','준비할 것 하나 고르기'].map(v=><button key={v} aria-pressed={small===v} onClick={()=>setSmall(v)}>{v}</button>)}</div></details>
  </div>
  <section className="nx-assist" aria-label={t(lang,'assist')}>
   <p className="nx-eyebrow">{t(lang,'assist')}</p>
   <div className="nx-row nx-seg2">{(['official','none','planning','attention','simultaneous','successive'] as const).map(x=><button key={x} aria-pressed={student.supportChoice===x} data-testid={'button-support-'+x} onClick={()=>lab.act({type:'student.settings',changes:{supportChoice:x}})}>{x==='official'?t(lang,'official'):x==='none'?t(lang,'none'):SUPPORT_NAMES[x]}</button>)}</div>
   <label className="nx-checkline"><input type="checkbox" checked={student.reduceHelp} onChange={e=>lab.act({type:'student.settings',changes:{reduceHelp:e.target.checked}})}/>{t(lang,'reduce')}</label>
  </section>
  <TargetPanel target={r.target} card={card} student={student} act={lab.act} support={r.support} reduce={student.reduceHelp}/>
  <div className="nx-row">
   <button data-testid="button-skip" disabled={card.evidence.skipped} onClick={()=>lab.act({type:'card.skip',cardId:card.id})}>{t(lang,'skip')}</button>
   <select aria-label="repeat" value={card.repeat} onChange={e=>lab.act({type:'card.repeat',cardId:card.id,repeat:e.target.value})}><option value="none">반복 없음</option><option value="daily">매일</option><option value="weekdays">평일</option></select>
  </div>
  <AgeFields key={card.id+student.stage} card={card} stage={student.stage} lab={lab} reduce={student.reduceHelp}/>
 </div>;
}
const PICTOS=[{kind:'book' as const,label:'읽기'},{kind:'paper' as const,label:'쓰기'},{kind:'block' as const,label:'셈하기'},{kind:'flag' as const,label:'챙기기'}];
function AgeFields({card,stage,lab,reduce}:{card:Card;stage:Stage;lab:Lab;reduce:boolean}){
 const [f,setF]=useState({title:card.title,subject:card.subject,goal:card.goal,date:card.date,firstAction:card.firstAction,condition:card.condition,startTime:card.startTime,scope:card.scope,deadline:card.deadline,middleDeadline:card.middleDeadline,owner:card.owner,dependency:card.dependency,waiting:card.waiting,handoff:card.handoff,alternative:card.alternative,method:card.method,reflection:card.reflection});
 const save=(changes:Partial<Card>)=>lab.act({type:'card.update',cardId:card.id,changes});
 const inp=(k:keyof typeof f,label:string,type='text')=><label key={k}>{label}<input type={type} data-testid={'input-'+k} value={String(f[k])} onChange={e=>setF({...f,[k]:e.target.value})}/></label>;
 let main:Partial<typeof f>={};let body;
 if(stage==='elementary_1_3'){body=<div><p>{C.pickOne}</p><div className="nx-picto">{PICTOS.map(({kind,label})=><button key={label} aria-pressed={card.firstAction===label} onClick={()=>save({firstAction:label})}><Glyph kind={kind}/>{label}</button>)}</div></div>;}
 else if(stage==='elementary_4_6'){main={condition:f.condition,startTime:f.startTime};body=<>{inp('condition',C.prep)}{inp('startTime',C.order,'time')}</>;}
 else if(stage==='middle'){main={scope:f.scope,deadline:f.deadline};body=<>{inp('scope',C.scopeQ)}{inp('deadline',C.deadline,'date')}</>;}
 else if(stage==='high'){main={middleDeadline:f.middleDeadline,deadline:f.deadline};const days=f.deadline?Math.round((new Date(f.deadline).getTime()-Date.now())/86400000):null;
  body=<>{inp('deadline',C.deadline,'date')}{inp('middleDeadline',C.middleDeadline,'date')}{days!==null&&<p className="nx-backplan">{C.backplan}: D-{days}{f.middleDeadline?' · '+C.middleDeadline+' '+f.middleDeadline:''}</p>}</>;}
 else{main={owner:f.owner,dependency:f.dependency,waiting:f.waiting,handoff:f.handoff};body=<>{inp('owner',C.owner)}{inp('dependency',C.dependency)}<label className="nx-checkline"><input type="checkbox" checked={f.waiting} onChange={e=>setF({...f,waiting:e.target.checked})}/>{C.waiting}</label>{inp('handoff',C.handoff)}</>;}
 const more={...(stage==='elementary_4_6'?{}:{condition:f.condition,startTime:f.startTime}),alternative:f.alternative,method:f.method,reflection:f.reflection,title:f.title,subject:f.subject,goal:f.goal,date:f.date};
 return <section className="nx-agefields" data-testid={'age-'+stage}>
  <p className="nx-eyebrow">{STAGE_NAMES[stage]}</p>{body}
  {Object.keys(main).length>0&&<button className="nx-primary" onClick={()=>save(main as Partial<Card>)}>{C.save}</button>}
  <details open={!reduce&&false}><summary>{C.more}</summary>
   {inp('title',t(lab.state.language,'title'))}{inp('subject','과목·프로젝트')}{inp('goal','내 목표')}{inp('date','실행할 날짜','date')}{stage!=='elementary_4_6'&&<>{inp('startTime','시작 시각','time')}{inp('condition',C.condition)}</>}{inp('alternative',C.alternative)}{inp('method',C.method)}{inp('reflection',C.reflection)}
   <button className="nx-primary" onClick={()=>save(more as Partial<Card>)}>{C.save}</button></details>
 </section>;
}

export default function PlanPage({lab,student,goNow,selectedId}:{lab:Lab;student:Student;goNow:()=>void;selectedId?:string}){
 const lang=lab.state.language;
 const [sel,setSel]=useState<string|null>(student.cards.find(c=>c.id===selectedId)?.id??student.cards.find(c=>c.status==='planned')?.id??null);
 const [nt,setNt]=useState('');const [ns,setNs]=useState('');const [nm,setNm]=useState('20');
 const [date,setDate]=useState(student.cards.find(c=>c.id===selectedId)?.date??today());
 const cards=student.cards.filter(c=>c.date===date);
 return <div className="nx-page">
  <details className="nx-profile-fold"><summary>내 도움 기준 살펴보기 · {SUPPORT_NAMES[routeFor(student).support]}</summary><Profile student={student}/></details>
   <label className="nx-plan-date">계획 날짜<input type="date" value={date} onChange={e=>{setDate(e.target.value);setSel(student.cards.find(c=>c.date===e.target.value&&c.status==='planned')?.id??null);}}/></label>
   <Capacity student={student} lab={lab} date={date}/>
  <section className="nx-board">
   <h2>{t(lang,'timeline')} <small>{cards.length}개</small></h2>
   {cards.length===0&&<p className="nx-empty">{t(lang,'empty')}</p>}
   <ol className="nx-list">{cards.map((c,i)=>{const run=student.runs.find(r=>r.cardId===c.id&&r.phase!=='closed');const st=run?run.phase:c.status;
    return <li key={c.id} className={'nx-block st-'+st+(sel===c.id?' sel':'')} data-testid={'card-block-'+c.id}>
     <div className="nx-face" style={{minHeight:Math.min(160,64+c.minutes*1.2)}}>
      <button className="nx-open" aria-expanded={sel===c.id} onClick={()=>setSel(sel===c.id?null:c.id)}><span className="nx-pos">{i+1}</span><span className="nx-subj">{c.subject||c.domain}</span><b><Glyph kind={i%2?'block':'book'}/>{c.title}</b><span className="nx-meta">{c.startTime||'--:--'} · {c.minutes}분 · {t(lang,(st==='closed'?'done':st) as 'done')}</span></button>
      <span className="nx-order"><button aria-label={c.title+' '+t(lang,'up')} disabled={i===0} onClick={()=>lab.act({type:'card.move',cardId:c.id,direction:-1})}>↑</button><button aria-label={c.title+' '+t(lang,'down')} disabled={i===cards.length-1} onClick={()=>lab.act({type:'card.move',cardId:c.id,direction:1})}>↓</button></span>
     </div>
     {sel===c.id&&<Detail key={c.id} card={c} student={student} lab={lab} goNow={goNow}/>}
    </li>;})}</ol>
   <form className="nx-create" onSubmit={e=>{e.preventDefault();if(lab.act({type:'card.create',title:nt.trim()||undefined,subject:ns.trim()||undefined,minutes:Number(nm)||undefined,date})){setNt('');setNs('');}}}>
    <h3>{t(lang,'add')}</h3>
    <label>{t(lang,'title')}<input value={nt} onChange={e=>setNt(e.target.value)} data-testid="input-new-title"/></label>
    <label>{t(lang,'subject')}<input value={ns} onChange={e=>setNs(e.target.value)}/></label>
    <label>{t(lang,'minutes')}<input inputMode="numeric" value={nm} onChange={e=>setNm(e.target.value.replace(/\D/g,''))}/></label>
    <button className="nx-primary" type="submit" data-testid="button-create-card">추가</button>
   </form>
  </section>
 </div>;
}
