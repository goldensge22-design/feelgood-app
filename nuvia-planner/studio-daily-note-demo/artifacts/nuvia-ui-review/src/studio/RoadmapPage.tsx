import {useEffect,useState} from 'react';
import {PracticeContext} from '../planner-library/LibraryUI';
import type {Action,PersonalState} from './model';
import type {RoadExperience,RoadSource,Sentence,ExperienceField} from './studio-model';
import {experienceFields} from './studio-model';
import {studioOf} from './studio-logic';
import {roadSources,experienceState,sourceFacts,roadmapExport,fieldNames} from './roadmap';

type Act=(a:Action)=>boolean;
const STATE_TEXT={ready:'확인됨',unconfirmed:'확인 전',changed:'원본이 바뀜',missing:'원본 연결 끊김'} as const;

export default function RoadmapPage({state,month,act,onMonth,onOpenCard}:{state:PersonalState;month:string;act:Act;onMonth?:(month:string)=>void;onOpenCard?:(id:string)=>void}){
 const studio=studioOf(state);
 const sources=roadSources(state,month);
 const [open,setOpen]=useState<string|null>(null);
 const sig=JSON.stringify([studio.sources,studio.experiences,studio.draft??null]);
 const [cache,setCache]=useState<{sig:string;text:string}|null>(null);
 const out=cache&&cache.sig===sig?cache:null;
 const [outErr,setOutErr]=useState('');
 const [copied,setCopied]=useState('');
 const [focusSource,setFocusSource]=useState('');
 const focusFacts=(id:string)=>{const el=document.getElementById(`source-${id}`);if(!el)return;const facts=el.querySelector('details');if(facts)facts.open=true;el.scrollIntoView({block:'center',behavior:'instant'});el.focus({preventScroll:true});};
 useEffect(()=>{if(focusSource)focusFacts(focusSource);},[focusSource,month]);
 const viewSource=(src:RoadSource)=>{setFocusSource(src.id);if(src.month!==month)onMonth?.(src.month);else focusFacts(src.id);};
 const exps=studio.experiences;
 const srcOf=(id:string):RoadSource|undefined=>studio.sources[id];
 const blocked=exps.some(e=>e.selected&&experienceState(state,e)!=='ready');
 const fresh=()=>{try{const r=roadmapExport(state);setCache({sig,text:r.text});setOutErr('');return r;}catch(e){setCache(null);setCopied('');setOutErr((e as Error).message||'내보낼 문장이 없어요.');return null;}};
 const preview=()=>{setCopied('');fresh();};
 const copy=async()=>{const r=fresh();if(!r)return;try{await navigator.clipboard.writeText(r.text);setCopied('복사했어요.');}catch{setCopied('복사하지 못했어요. 미리보기 글을 직접 선택해 복사하세요.');}};
 const html=()=>{const r=fresh();if(!r)return;const url=URL.createObjectURL(new Blob([r.html],{type:'text/html'})),a=document.createElement('a');a.href=url;a.download=`NUVIA_roadmap_${month}.html`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};
 return <div className="pm-page" data-testid="page-roadmap">
  <section className="st-block" aria-label="나의 로드맵 안내">
   <p className="st-eye">나의 로드맵 · {month}</p><h2>한 달의 과제를 경험으로 정리하기</h2>
   <p className="st-note">이 달의 과제 기록을 모아요. 계획만 한 과제, 마치지 못한 과제, 조정한 과제도 함께 들어가요. 생각 메모와 개인 메모는 가져오지 않아요. 문장 초안은 적은 내용을 그대로 정리한 것이며 점수나 능력 판정을 하지 않아요. 확인은 본인 확인이며 외부 검증이 아니에요.</p>
  </section>

  <section className="st-block" aria-label="월별 파일철" data-testid="section-sources">
   <h2>이번 달 파일철 · {sources.length}개</h2>
   {sources.length===0&&<p className="pm-empty">이 달에 정리할 과제 기록이 아직 없어요. 계획에 과제를 추가하거나 작업대에서 진행하면 여기에 쌓여요.</p>}
   {sources.map(s=>{const exp=exps.find(e=>e.sourceId===s.id);const st=exp?experienceState(state,exp):null;return <div key={s.id} id={`source-${s.id}`} tabIndex={-1} className="st-src st-file" data-testid={`source-${s.id}`}>
    <span className="st-filetab" data-testid={`tab-source-${s.id}`}>{s.snapshot.subject||'과목 없음'} · {s.snapshot.title}</span>
    <div className="st-row" style={{justifyContent:'space-between'}}>
      <b>{s.snapshot.subject?`${s.snapshot.subject} · `:''}{s.snapshot.title}</b><PracticeContext state={state} kind={s.snapshot.practiceContext}/>
     <span className="st-status" data-testid={`status-source-${s.id}`}>{!s.available?'원본 연결 끊김':st?STATE_TEXT[st]:'경험카드 없음'}</span>
    </div>
    <details className="pm-fold" data-testid={`details-facts-${s.id}`}><summary>근거 사실 보기</summary><ul>{sourceFacts(s).map((f,i)=><li key={i}>{f}</li>)}</ul></details>
    {onOpenCard&&s.available&&<button data-testid={`button-source-task-${s.id}`} onClick={()=>onOpenCard(s.cardId)}>원본 과제 열기</button>}
    {exp?<button aria-expanded={open===exp.id} data-testid={`button-open-exp-${exp.id}`} onClick={()=>setOpen(open===exp.id?null:exp.id)}>{open===exp.id?'경험카드 접기':'경험카드 열기'}</button>
     :<button className="pm-primary" data-testid={`button-create-exp-${s.id}`} disabled={!s.available} onClick={()=>act({type:'roadmap.create',sourceId:s.id})}>경험카드 만들기</button>}
    {exp&&open===exp.id&&<ExperienceEditor key={`${exp.id}-${exp.updatedAt}`} exp={exp} st={st!} act={act}/>}
   </div>;})}
   {exps.some(e=>!srcOf(e.sourceId)||experienceState(state,e)==='missing')&&<p className="st-warn" data-testid="warn-orphan">원본을 찾을 수 없는 경험카드가 있어요. 초안과 내보내기에서 빠지며, 원본을 복원하면 다시 쓸 수 있어요.</p>}
  </section>

  <section className="st-block" aria-label="문장 초안" data-testid="section-draft">
   <h2>문장 초안</h2>
   <p className="st-note">확인하고 고른 경험카드의 내용만 문장으로 옮겨요. 고친 문장은 다시 확인해야 내보낼 수 있어요.</p>
   {blocked&&<p className="st-warn" data-testid="warn-stale">고른 경험 중 원본이 바뀌었거나 연결이 끊긴 것이 있어요. 경험카드에서 다시 확인해 주세요.</p>}
   <button className="pm-primary" data-testid="button-draft" disabled={!exps.some(e=>e.selected&&e.confirmed)} onClick={()=>act({type:'roadmap.draft'})}>{studio.draft?'초안 다시 만들기':'초안 만들기'}</button>
   {studio.draft?.sentences.length===0&&<p className="st-note">초안에 넣을 내용이 없어요. 경험카드 칸을 채워 주세요.</p>}
    {studio.draft?.sentences.map(s=><SentenceRow key={`${s.id}-${s.text}`} s={s} src={srcOf(s.sourceId)} act={act} onSource={viewSource}/>)}
  </section>

  <section className="st-block" aria-label="공유 전 미리보기" data-testid="section-export">
   <h2>공유 전 미리보기</h2>
   <p className="st-note">고르고 확인한 문장만 들어가요. 원본이 바뀌거나 끊긴 문장은 내보낼 수 없어요.</p>
   <button data-testid="button-preview" onClick={preview}>미리보기 만들기</button>
   {cache&&!out&&<p className="st-warn" data-testid="warn-preview-outdated">경험·문장·원본이 바뀌어 이전 미리보기를 지웠어요. 다시 만들어 확인해 주세요.</p>}
   {outErr&&<p className="st-warn" role="alert" data-testid="text-export-error">{outErr}</p>}
   {out&&<><div className="st-preview" data-testid="text-preview">{out.text}</div>
    <div className="st-row"><button className="pm-primary" data-testid="button-copy" onClick={copy}>글 복사</button><button data-testid="button-export-html" onClick={html}>HTML 파일 저장</button></div>
    {copied&&<p className="st-note" role="status" data-testid="text-copied">{copied}</p>}</>}
  </section>
 </div>;
}

function ExperienceEditor({exp,st,act}:{exp:RoadExperience;st:'ready'|'unconfirmed'|'changed'|'missing';act:Act}){
 const [f,setF]=useState<Record<ExperienceField,string>>({...exp.fields});
 const dirty=experienceFields.some(k=>f[k]!==exp.fields[k]);
 return <div className="st-src" data-testid={`editor-${exp.id}`}>
  {st==='changed'&&<div className="st-warn" data-testid={`warn-changed-${exp.id}`}>원본 과제 기록이 바뀌었어요. 내가 쓴 내용은 그대로 두고 근거만 새로 맞춘 뒤 다시 확인해 주세요.
   <div><button data-testid={`button-refresh-${exp.id}`} onClick={()=>act({type:'roadmap.refresh',id:exp.id})}>바뀐 원본 반영</button></div></div>}
  {st==='missing'&&<p className="st-warn" data-testid={`warn-missing-${exp.id}`}>원본 과제와 연결이 끊겼어요. 이 경험은 내보낼 수 없어요.</p>}
  <div className="st-fields">{experienceFields.map(k=><label key={k}>{fieldNames[k]}<textarea data-testid={`input-exp-${k}-${exp.id}`} value={f[k]} placeholder="추가할 내용" onChange={e=>setF({...f,[k]:e.target.value})}/></label>)}</div>
  <div className="st-row">
   <button data-testid={`button-save-exp-${exp.id}`} disabled={!dirty} onClick={()=>act({type:'roadmap.edit',id:exp.id,fields:f})}>저장</button>
   <button className="pm-primary" data-testid={`button-confirm-exp-${exp.id}`} disabled={dirty||st!=='unconfirmed'} onClick={()=>act({type:'roadmap.confirm',id:exp.id})}>{st==='ready'?'확인됨':'내용 확인'}</button>
   <label className="pm-check" style={{margin:0}}><input type="checkbox" data-testid={`checkbox-select-exp-${exp.id}`} checked={exp.selected} disabled={!exp.confirmed&&!exp.selected} onChange={e=>act({type:'roadmap.select',id:exp.id,selected:e.target.checked})}/>초안에 쓰기</label>
  </div>
  {dirty&&<p className="st-note">저장하지 않은 변경이 있어요. 저장하면 다시 확인해야 해요.</p>}
 </div>;
}

function SentenceRow({s,src,act,onSource}:{s:Sentence;src?:RoadSource;act:Act;onSource:(src:RoadSource)=>void}){
 const [t,setT]=useState(s.text);
 const stale=!src||!src.available||src.version!==s.sourceVersion;
 return <div className="st-sent" data-testid={`sentence-${s.id}`}>
  <p className="st-note" data-testid={`link-sentence-${s.id}`}>근거: {src?`${src.snapshot.subject?src.snapshot.subject+' · ':''}${src.snapshot.title} · ${src.month}`:'원본 없음'} · {fieldNames[s.field]}{s.edited?' · 고친 문장':''}</p>
  {src?.available&&<button data-testid={`button-sentence-source-${s.id}`} onClick={()=>onSource(src)}>이 문장의 근거 활동 보기</button>}
  {stale&&<p className="st-warn">원본이 바뀌었거나 끊겨서 이 문장은 내보낼 수 없어요.</p>}
  <label>문장<textarea data-testid={`input-sentence-${s.id}`} value={t} onChange={e=>setT(e.target.value)}/></label>
  <div className="st-row">
   <button data-testid={`button-save-sentence-${s.id}`} disabled={t===s.text||!t.trim()} onClick={()=>act({type:'roadmap.sentence',id:s.id,text:t})}>문장 저장</button>
   <label className="pm-check" style={{margin:0}}><input type="checkbox" data-testid={`checkbox-confirm-sentence-${s.id}`} checked={s.confirmed} disabled={t!==s.text} onChange={e=>act({type:'roadmap.sentence',id:s.id,confirmed:e.target.checked})}/>내용 확인</label>
   <label className="pm-check" style={{margin:0}}><input type="checkbox" data-testid={`checkbox-select-sentence-${s.id}`} checked={s.selected} onChange={e=>act({type:'roadmap.sentence',id:s.id,selected:e.target.checked})}/>내보내기에 넣기</label>
  </div>
 </div>;
}
