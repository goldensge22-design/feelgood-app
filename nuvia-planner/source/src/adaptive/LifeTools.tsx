import React,{useEffect,useRef,useState} from 'react';
import {createTask,localDate,uid,type PlannerTask} from './workspace';
export function nextRepeat(t:PlannerTask,today=localDate()):PlannerTask|null{
 if(!t.repeat||t.repeat==='none')return null;
 const d=new Date((t.date>today?t.date:today)+'T12:00:00');do{d.setDate(d.getDate()+1);}while(t.repeat==='weekdays'&&(d.getDay()===0||d.getDay()===6));
 return {...createTask(t.title,t.steps[0].title),subject:t.subject,date:localDate(d),minutes:t.minutes,owner:t.owner,repeat:t.repeat,repeatOf:t.id,steps:t.steps.map(s=>({id:uid(),title:s.title,done:false,date:''})),materials:t.materials.map(m=>({id:uid(),title:m.title,done:false}))};
}
export function recentStreak(tasks:PlannerTask[],today=localDate()){
 const dates=new Set(tasks.filter(t=>t.status==='done'&&t.completedAt).map(t=>localDate(new Date(t.completedAt))));
 const d=new Date(today+'T12:00:00');if(!dates.has(localDate(d)))d.setDate(d.getDate()-1);let n=0;while(dates.has(localDate(d))){n++;d.setDate(d.getDate()-1);}return n;
}
export function FocusTimer({active,minutes}:{active:boolean;minutes:number}){
 const [remaining,setRemaining]=useState(minutes*60),[hidden,setHidden]=useState(false);const time=useRef(Date.now());
 useEffect(()=>{time.current=Date.now();if(!active)return;const id=setInterval(()=>{const now=Date.now(),delta=(now-time.current)/1000;time.current=now;setRemaining(n=>Math.max(0,n-delta));},500);return()=>clearInterval(id);},[active]);
 return <div className="np-timer" data-testid="focus-timer"><button onClick={()=>setHidden(v=>!v)}>{hidden?'타이머 보기':'타이머 접기'}</button>{!hidden&&<>{remaining>0?<span role="timer">{Math.floor(Math.ceil(remaining)/60)}:{String(Math.ceil(remaining)%60).padStart(2,'0')} <small>{active?'진행 중':'잠시 멈춤'}</small></span>:<div><p>시간이 다 됐어요. 계속할까요?</p><button onClick={()=>{time.current=Date.now();setRemaining(5*60);}}>5분 더 보기</button></div>}<small>완료는 직접 정해요. 타이머는 저장하지 않으며, 화면을 다시 열면 새로 시작해요.</small></>}</div>;
}
