import {useState} from 'react';
import type {PersonalState,Action} from './model';
import {assessmentView,exampleEnvelope} from './insights';

type Act=(a:Action)=>boolean;
const AX=[['planning','계획'],['attention','주의'],['simultaneous','동시'],['successive','순차']] as const;
const LV:Record<string,string>={low:'하',mid:'중',high:'상'};
const MODE:Record<string,string>={none:'결과 없음',example:'합성 예시(검토용)',input:'로컬 계약 입력 · 서버 검증 아님',unverified:'확인되지 않은 기록'};

export default function AssessmentPanel({state,act,review,running}:{state:PersonalState;act:Act;review:boolean;running:boolean}){
 const v=assessmentView(state);
 const [open,setOpen]=useState(false);
 const [text,setText]=useState('');
 const [err,setErr]=useState('');
 const run=(a:Action,fail:string)=>{setErr('');if(running){setErr('진행 중인 실행이 있어요. 먼저 끝내거나 멈춘 뒤 바꿀 수 있어요.');return false;}const ok=act(a);if(!ok)setErr(fail);return ok;};
 const importJSON=()=>{let payload:unknown;try{payload=JSON.parse(text);}catch{setErr('JSON 형식이 아니에요.');return;}if(run({type:'assessment.input',payload},'입력을 받지 않았어요. 검사 종류, 날짜(YYYY-MM-DD), 점수 단위를 확인하세요.'))setText('');};
 return <section className="pm-banner" data-testid="assessment-status" aria-label="검사 결과 상태">
  <b>검사 결과 · {MODE[v.mode]??v.mode}</b>
  {v.mode!=='none'&&<span> · {v.kind||'종류 미기재'} · {v.date||'날짜 미기재'}</span>}
  {v.mode==='none'&&<span> · 검사 종류·검사일 미연결</span>}
  {!v.assessment&&<div className="pm-chips" data-testid="assessment-empty-values">{AX.map(([k,l])=><span key={k} className="pm-tag">{l} — <small>값·단위 미연결</small></span>)}</div>}
  {v.assessment&&<div className="pm-chips" data-testid="assessment-values">{AX.map(([k,l])=>{const x=v.assessment!.axes[k];return <span key={k} className="pm-tag" style={{fontSize:13,padding:'6px 10px'}}>{l} {x?.value??'값 없음'}{x?.unit?` ${x.unit}`:''} · {LV[x?.level]??x?.level}</span>;})}{v.assessment.scoreSystem&&<span className="pm-note">{v.assessment.scoreSystem.label} · {{standard_score:'표준점수',accuracy_rate:'정답률',percentile:'백분위'}[v.assessment.scoreSystem.metric]}</span>}</div>}
  <details className="st-source-details"><summary>검사 출처·연결 안내</summary>
  <div className="pm-note">{v.notice||'실제 결과지 서버 연결은 없어요. 여기 보이는 내용은 실시간 검증된 점수가 아니에요.'}</div>
  {review&&v.assessment!=null&&<details className="pm-fold"><summary>검토용 원본 계약 보기</summary><pre style={{whiteSpace:'pre-wrap',fontSize:12,overflowX:'auto'}}>{JSON.stringify(v.assessment,null,1)}</pre></details>}
  {review&&<div>
   <button type="button" aria-expanded={open} onClick={()=>setOpen(!open)} data-testid="assessment-review-toggle">{open?'검토 도구 닫기':'검토 도구 열기'}</button>
   {open&&<div>
    {running&&<p className="pm-note" role="status">진행 중인 실행이 있어 예시·입력·지우기를 할 수 없어요.</p>}
    <div className="pm-row">
     <button type="button" disabled={running} onClick={()=>run({type:'assessment.example'},'예시를 불러오지 못했어요.')} data-testid="assessment-example">합성 예시 불러오기</button>
     <button type="button" disabled={running} onClick={()=>setText(JSON.stringify(exampleEnvelope(),null,1))}>예시 형식을 입력칸에 넣기</button>
     <button type="button" disabled={running||v.mode==='none'} onClick={()=>run({type:'assessment.clear'},'지우지 못했어요.')} data-testid="assessment-clear">현재 표시 지우기(기록은 남음)</button>
    </div>
    <p className="pm-note">합성 데이터의 계약 검토 전용입니다. 실제 학생의 이름·학번·검사 파일은 넣지 마세요. 입력해도 실제 결과지 서버에 연결되지 않습니다.</p>
    <label>로컬 계약 입력(서버 검증 아님) JSON (testKind, testDate, assessment)<textarea value={text} onChange={e=>setText(e.target.value)} data-testid="assessment-json"/></label>
    <button type="button" disabled={running||!text.trim()} onClick={importJSON} data-testid="assessment-import">입력 확인</button>
    <p className="pm-note">서버 미연결 로컬 입력이에요. 인증된 실제 결과가 아니며 점수를 새로 계산하지 않아요.</p>
   </div>}
  </div>}
  {err&&<p role="alert" className="pm-note" style={{color:'#8a3a10',fontWeight:700}}>{err}</p>}
  </details>
 </section>;
}
