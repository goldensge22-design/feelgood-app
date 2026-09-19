import React from 'react';
import type { DailyPhase, AgeBand } from '../domain/types';

export function ToolIcon({kind, size=28}: {kind:string; size?:number}) {
 const paths:Record<string,React.ReactNode>={
 start:<><path d="M9 5l12 7-12 7z"/><path d="M4 6v12"/></>,
 plan:<><rect x="5" y="5" width="16" height="17" rx="3"/><path d="M9 3v4m8-4v4M9 12h8m-8 5h5"/></>,
 focus:<><circle cx="13" cy="13" r="8"/><circle cx="13" cy="13" r="3"/><path d="M13 2v3m0 16v3M2 13h3m16 0h3"/></>,
 time:<><circle cx="13" cy="13" r="9"/><path d="M13 7v6l4 3"/></>,
 recover:<><path d="M5 10a8 8 0 1 1 0 7M5 4v6h6"/></>,
 check:<><path d="M5 13l5 5L22 6"/><path d="M20 15v6H4V5h10"/></>,
 gem:<><path d="M6 5h14l5 8-12 12L1 13zM1 13h24M6 5l7 20 7-20"/></>,
 flag:<><path d="M6 24V3m0 1h15l-3 5 3 5H6"/></>
 };
 return <svg width={size} height={size} viewBox="0 0 26 28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]||paths.gem}</svg>;
}
const stages=[['목표','plan'],['훈련','gem'],['행동','start'],['돌아보기','check']];
export function phaseStep(phase:DailyPhase){
 if(['IDLE','CHECKED_IN'].includes(phase))return 0;
 if(phase==='CHOSEN')return 1;
 if(['PLANNED','IN_PROGRESS','INTERRUPTED','ABANDONED','RESET_OFFERED','RESET_CREATED'].includes(phase))return 2;
 return 3;
}
export function MissionWorld({phase,band,onEnter}: {phase:DailyPhase;band:AgeBand;onEnter?:()=>void}) {
 const step=phaseStep(phase);
 const active=phase==='IN_PROGRESS';
 const rescue=['INTERRUPTED','ABANDONED','RESET_OFFERED','RESET_CREATED'].includes(phase);
 const copy= rescue ? ['다시 시작하는 것도 전략','잠깐 쉬어도 괜찮아요. 다음 한 걸음부터.'] : [
 ['오늘의 훈련 캠퍼스','강점을 발판으로 연습하고, 실제 하루로 연결해요.'],
 ['배정된 전략으로 연습해요','도움을 받아 직접 판단하고, 다음 상황에 적용해요.'],
 [active?'이제, 현실에서 한 걸음':'준비됐나요? 시작해볼까요?','선택한 과제의 첫 단계를 실제로 해보세요.'],
 ['내가 해본 방법을 돌아봐요','결과를 살펴보고, 다음 시도를 준비해요.']
 ][step];
 return <section className={`mission-world ${active?'is-running':''} ${rescue?'is-rescue':''}`} aria-label="오늘의 미션 경로">
  <div className="world-heading"><span className="world-eyebrow">TRAINING / {band==='D'?'SELF MANAGEMENT':'MISSION 01'}</span><h2>{band==='D'&&!rescue?['오늘의 실행을 훈련하세요','배정된 전략을 연습하세요','선택한 행동에 집중하세요','예상과 실제를 돌아보세요'][step]:copy[0]}</h2><p>{copy[1]}</p>{onEnter && <button className="world-enter" onClick={onEnter}>미션 시작 <span aria-hidden="true">→</span></button>}</div>
  <svg className="island-scene" viewBox="0 0 850 380" role="img" aria-label="계획 보드와 집중 책상이 놓인 입체적인 시작의 섬">
   <defs>
    <linearGradient id="top" x2="0" y2="1"><stop stopColor="#eef1fd"/><stop offset="1" stopColor="#b1c9ee"/></linearGradient>
    <linearGradient id="side" x2="0" y2="1"><stop stopColor="#789bd2"/><stop offset="1" stopColor="#4f77af"/></linearGradient>
    <linearGradient id="portal" x2="1" y2="1"><stop stopColor="#baa2e1"/><stop offset="1" stopColor="#8964bd"/></linearGradient>
    <filter id="shadow"><feGaussianBlur stdDeviation="12"/></filter>
   </defs>
   <ellipse cx="442" cy="326" rx="271" ry="24" fill="#7690ab" opacity=".18" filter="url(#shadow)"/>
   <g className="island-base">
    <path d="M133 220L415 87 724 226 438 368 133 246Z" fill="url(#side)"/>
    <path d="M133 220L415 87 724 226 438 341Z" fill="url(#top)" stroke="#edf4ff" strokeWidth="2"/>
    <path d="M438 341v27M724 226v26" stroke="#577793"/>
    <path d="M205 229L413 129 652 233 440 310Z" fill="none" stroke="#f7fbff" strokeDasharray="7 9" strokeWidth="3"/>
    <path d="M252 218l144 67 138-62" stroke="#718fad" strokeWidth="20" fill="none" opacity=".22"/>
    <path d="M252 208l144 67 138-62" stroke="#edf4ff" strokeWidth="13" fill="none"/>
   </g>
   <g className="world-object object-board">
    <path d="M252 157v79m70-46v79" stroke="#607994" strokeWidth="8"/>
    <path d="M238 85l111 50v93l-111-50z" fill="#7a91ac"/>
    <path d="M245 78l111 50v93l-111-50z" fill="#f3f5fa" stroke="#bcccdc" strokeWidth="3"/>
    <path d="M261 109l69 31m-69-15l51 23m-51-7l59 26" stroke="#c8d4e1" strokeWidth="5"/>
    <path d="M263 151l9 13 16-6" fill="none" stroke="#468678" strokeWidth="4"/>
    <path d="M283 88v-18l35 16v18" fill="#f5a51b"/>
   </g>
   <g className="world-object object-desk">
    <path d="M400 210v58m114-67v58m59-89v59" stroke="#617b94" strokeWidth="9"/>
    <path d="M386 193l78-40 126 55-79 41-125-46z" fill="#8c9fae"/>
    <path d="M386 184l78-40 126 55-79 41z" fill="#f9cf8d" stroke="#ffe9c6" strokeWidth="2"/>
    <path d="M439 181l-5-65 71 31 5 65z" fill="#356daf"/>
    <path d="M440 124l4 51 59 26-4-51z" fill="#c3daf5"/>
    <path d="M445 176l58 27-27 13-54-26z" fill="#91a8bc"/>
    <path d="M455 148l10 12 20-8" stroke="#fff" fill="none" strokeWidth="4"/>
    <path d="M526 191l20-9 24 11-19 10z" fill="#9370bd"/>
    <path d="M526 191v6l25 12 19-10v-6l-19 10z" fill="#fff"/>
   </g>
   <g className="world-object object-portal">
    <path d="M590 178v-77q0-24 21-14l40 18q21 10 21 33v74l-13 7v-76q0-14-13-20l-29-13q-14-7-14 8v70z" fill="url(#portal)"/>
    <path d="M603 178v-60q0-15 14-8l29 13q13 6 13 20v65z" fill="#dae4ef" opacity=".65"/>
    <path d="M623 138l17 20-17 6z" fill="#8a86a8"/>
   </g>
   <g className="world-object object-tree">
    <path d="M207 221v-42" stroke="#8b8066" strokeWidth="8"/>
    <ellipse cx="208" cy="161" rx="25" ry="32" fill="#6d9b91"/>
    <ellipse cx="198" cy="151" rx="16" ry="23" fill="#8bb4a6"/>
    <path d="M646 266v-25" stroke="#8b8066" strokeWidth="6"/>
    <ellipse cx="646" cy="227" rx="20" ry="25" fill="#7fa79d"/>
   </g>
   <g className="world-beacon" transform={`translate(${[338,391,554,596][step]} ${[224,253,241,257][step]})`}>
    <ellipse cy="12" rx="21" ry="10" fill="#6d85a1" opacity=".24"/>
    <path d="M0-30l16 10L0 2l-16-22z" fill="#ffb536" stroke="#ffe1a2" strokeWidth="2"/>
    <path d="M0-30v32l16-22z" fill="#e28c14"/>
   </g>
  </svg>
  <div className="world-status"><span className="status-dot"/>{rescue?'복귀 경로':active?'실행 중':'오늘의 경로'}<strong>{stages[step][0]}</strong></div>
  <ol className="mission-route">{stages.map(([label,icon],i)=><li key={label} className={`${i===step?'current':''} ${i<step?'passed':''}`} aria-current={i===step?'step':undefined}><span className="route-icon"><ToolIcon kind={i<step?'check':icon} size={22}/></span><span><small>0{i+1}</small><strong>{label}</strong></span></li>)}</ol>
 </section>;
}
export function FocusBeacon({paused,title}: {paused:boolean;title:string}) {
 return <div className={`focus-beacon ${paused?'paused':''}`}><div className="beacon-ring"><ToolIcon kind={paused?'recover':'focus'} size={45}/></div><div><span>{paused?'잠깐 쉬는 중':'실제 과제 진행 중'}</span><strong>{title}</strong><p>{paused?'돌아왔을 때 이어서 해도 괜찮아요.':'화면 밖에서 해본 뒤, 실제 걸린 시간을 남겨주세요.'}</p></div></div>;
}

/** Optional rehearsal: presentation-only, no events, scores or Growth evidence. */
export function StartRehearsal({band}:{band:AgeBand}) {
 const [choice,setChoice]=React.useState<number|null>(null);
 const young=band==='A';
 return <section className="mini-challenge"><span className="world-eyebrow">MINI CHALLENGE · 시작 연습</span><h3>{young?'과제가 커 보여요. 첫 행동으로 무엇을 고를까요?':'막연한 과제를 바로 착수할 수 있는 행동으로 바꿔보세요.'}</h3><div className="mini-choices">{(young?['문제집을 펼치고 첫 문제 읽기','오늘 공부를 모두 완벽하게 끝내기']:['자료를 열고 첫 문단의 제목 적기','전체 과제를 완벽하게 마무리하기']).map((x,i)=><button key={x} aria-pressed={choice===i} onClick={()=>setChoice(i)}><ToolIcon kind={i===0?'start':'plan'} size={22}/><br/>{x}</button>)}</div><div className="mini-feedback" role="status">{choice===null?'지금 손을 움직일 수 있는 행동을 골라보세요.':choice===0?'첫 행동이 구체적이네요. 이처럼 내 과제의 첫 단계를 작게 적어보세요.':'전체 목표가 커 보일 수 있어요. 그중 지금 바로 할 수 있는 첫 행동 하나로 줄여볼까요?'}</div><div className="rehearsal-note">전략을 이해하는 연습입니다. 실제 수행 기록에는 포함되지 않습니다.</div></section>;
}
