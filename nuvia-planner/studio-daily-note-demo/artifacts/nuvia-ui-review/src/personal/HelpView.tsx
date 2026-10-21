import type {Axis,Card,Student} from '../enhancement/model';
import type {Action,Meta} from './model';
import {routeFor,supportNames} from './domain';

type Help=Axis|'none'|'official';
const CHOICES:Help[]=['official','none','planning','attention','simultaneous','successive'];

/** Presentation of the one recommended help, built only from this card's real data. */
function Presentation({support,card,meta}:{support:Axis|'universal'|'none';card:Card;meta:Partial<Meta>}){
 const miss='아직 비어 있어요';
 if(support==='none')return <p className="pm-note">도움 없이 바로 시작해요.</p>;
 if(support==='planning')return <dl className="pm-help-goal"><div><dt>목표</dt><dd>{card.goal||card.title}</dd></div><div><dt>오늘 분량</dt><dd>{card.scope||miss}</dd></div><div><dt>끝났다는 기준</dt><dd>{card.scope?`${card.scope}를 마치면 끝`:'분량을 적으면 기준이 됩니다'}</dd></div><div><dt>시간</dt><dd>{card.minutes}분</dd></div></dl>;
 if(support==='attention')return <p className="pm-help-mark"><span>지금 이것만</span><mark>{card.firstAction||card.title}</mark></p>;
 if(support==='simultaneous'){
  const nodes=([['목표',card.goal],['마감',card.deadline],['중간 마감',card.middleDeadline],['자료',meta.materials],['시험일',meta.examDate],['이번 주 범위',meta.weeklyScope],...card.links.map(k=>[k,card.linkItems[k]])] as [string,string|undefined][]).filter(([,v])=>v);
  return <div className="pm-help-map"><span className="hub">{card.title}</span>{nodes.length?nodes.map(([k,v])=><span key={k}>{k}: {v}</span>):<span>목표·마감·자료를 적으면 여기 연결돼요</span>}{card.relationship&&<p>{card.relationship}</p>}</div>;
 }
 if(support==='successive'){
  const i=card.steps.findIndex(s=>!s.done);
  return <ol className="pm-help-seq">{card.steps.length?card.steps.map((s,j)=><li key={s.id} className={j===i?'cur':''}>{j===i?'지금: ':j===i+1?'다음: ':''}{s.title}{s.done?' (함)':''}</li>):<><li className="cur">지금: {card.firstAction||miss}</li><li>다음: {card.scope||miss}</li></>}</ol>;
 }
 return <p>짧게: {card.firstAction||'첫 행동 하나'}부터 {card.minutes}분.</p>;
}

export default function HelpView({student,card,meta,act}:{student:Student;card:Card;meta:Partial<Meta>;act:(a:Action)=>boolean}){
 const route=routeFor(student);
 const planned=meta.helpPreference;
 const support=student.supportChoice==='official'&&planned&&planned!=='official'?planned as Axis|'universal'|'none':route.support;
 const set=(changes:Record<string,unknown>)=>act({type:'legacy',command:{type:'student.settings',changes} as never});
 const source=planned&&student.supportChoice==='official'?'본인이 수락한 다음 달 도움':student.assessment?'합성 검사 입력 예시':student.supportChoice==='official'?'검사 미연결 · 일반 연습 예시':'직접 고른 도움';
 return <div className="pm-panel integrated" data-testid="help-view">
  <p className="pm-eye">추천 도움 · {supportNames[support]} · {source}</p>
  {student.reduceHelp?<details className="pm-fold"><summary>도움 줄이는 중 · 펼쳐 보기</summary><Presentation support={support} card={card} meta={meta}/></details>:<Presentation support={support} card={card} meta={meta}/>}
  {route.warning&&<p className="pm-note">{route.warning}</p>}
  <details className="pm-fold"><summary>다른 도움</summary>
   <div className="pm-chips">{CHOICES.map(h=><button key={h} className="pm-chip" aria-pressed={student.supportChoice===h} onClick={()=>set({supportChoice:h})}>{h==='official'?'추천':supportNames[h]}</button>)}</div>
   <p className="pm-note">공통 안내는 추천을 정할 수 없을 때 자동으로 쓰여요.</p>
   <label className="pm-check"><input type="checkbox" checked={student.reduceHelp} onChange={e=>set({reduceHelp:e.target.checked})}/>도움 줄이기 (안내를 접어 둠)</label>
  </details>
 </div>;
}
