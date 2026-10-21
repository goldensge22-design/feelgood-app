import {useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import './entry.css';
import {feelgoodLogo} from '../official/adaptive/brandAssets';
import {AUDIENCES,AUDIENCE_KEYS,audienceFrom,type Audience} from './audiences';
import {demoAssessmentEnvelope} from './assessment';

function readAudience():Audience|null{
 try{const v=new URLSearchParams(location.search).get('audience');return audienceFrom(v?'?demo='+encodeURIComponent(v):'');}catch{return null;}
}

function Common(){
 return <>
  <section className="dm-block dm-warn" aria-labelledby="dm-limits">
   <h2 id="dm-limits">이 데모에 없는 것</h2>
   <ul>
    <li>실제 D-CAS 결과와 연결되지 않습니다. 로그인·서버 저장·기기 간 동기화도 없습니다.</li>
    <li>실제 학생·직원의 개인정보나 검사 결과 입력 금지. 제공하는 예시는 가상이며, 사용자가 적은 내용이 자동으로 가상화되지는 않습니다.</li>
    <li>입력한 내용은 이 브라우저에 남을 수 있습니다. JSON 백업 파일은 평문이므로 직접 보관해 주세요.</li>
    <li>화면에 점수가 보인다면 합성된 예시 값입니다. 인지 능력 향상이나 효과를 검증한 도구가 아닙니다.</li>
   </ul>
  </section>
  <section className="dm-block" aria-labelledby="dm-lang">
   <h2 id="dm-lang">화면 언어 안내</h2>
   <p>작업대는 15개 언어로 볼 수 있지만, 한국어 외 번역은 AI가 만든 초안이며 원어민 검수를 거치지 않았습니다. 이 안내 페이지는 한국어로만 제공됩니다.</p>
  </section>
 </>;
}

function Entry(){
 const key=readAudience();
 const a=key?AUDIENCES[key]:null;
 useEffect(()=>{
  document.title=a?`NUVIA PLANNER · ${a.label} 가상 데이터 데모`:'NUVIA PLANNER · 가상 데이터 데모 고르기';
  const m=document.querySelector('meta[name="description"]');
  m?.setAttribute('content',a?a.description:'기업·대학·학교 중 살펴볼 가상 데이터 데모를 고르세요.');
 },[a]);
 return <main className="dm-root" lang="ko">
  <header className="dm-head"><img src={feelgoodLogo} alt=""/><small>FeelGood</small><b>NUVIA PLANNER</b></header>
  <nav className="dm-nav" aria-label="데모 대상">{AUDIENCE_KEYS.map(k=><a key={k} href={`./demo.html?audience=${k}`} aria-current={k===key?'page':undefined}>{AUDIENCES[k].label}</a>)}</nav>
  <span className="dm-badge">가상 데이터 데모</span>
  {a&&key?<>
   <h1>{a.title}</h1>
   <p className="dm-lead">NUVIA PLANNER는 한 사람이 자기 하루를 스스로 정리하는 개인 작업대입니다. 기관이 개인을 지켜보는 도구가 아닙니다.</p>
   <p>{demoAssessmentEnvelope(key).testKind} · {a.stage==='adult'?'대학생·성인':'중고등학생(청소년)'} · 네 영역 정답률(%)을 사용하는 가상 예시입니다. 실제 검사·규준 검증이 아닙니다.</p>
   <section className="dm-block" aria-labelledby="dm-sc"><h2 id="dm-sc">사용 장면</h2><p>{a.scenario}</p>
    <ol>{a.steps.map(s=><li key={s}>{s}</li>)}</ol></section>
   <div className="dm-desk"><p>할 일 선반에서 시작할 가상 과제</p><b>{a.taskTitle}</b><p>{a.subject} · {a.activity}</p></div>
   <section className="dm-block dm-warn" aria-labelledby="dm-use"><h2 id="dm-use">쓰지 않는 용도</h2><p>{a.limits}</p></section>
   <Common/>
   <a className="dm-cta" href={`./studio.html?demo=${key}`}>{a.label} 가상 데이터로 작업대 열기</a>
  </>:<>
   <h1>살펴볼 데모를 골라 주세요</h1>
   <p className="dm-lead">기관 유형에 따라 개인이 작업대를 쓰는 장면이 다릅니다. 위에서 기업·대학·학교 중 하나를 고르세요.</p>
   <Common/>
  </>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<Entry/>);
