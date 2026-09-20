import React,{useState} from 'react';
import type {ActionInput,Run,ReasonInput} from '../core/types';
import type {Command} from '../core/engine';
import {planningLength,planningProgress} from '../core/preschoolPolicy';
import {PictureArt} from './PictureArt';
import {KidExpression,Speak} from './PreschoolPlay';
import type {BrowserRepository} from '../core/storage';
import {ReasonEditor} from './ReasonEditor';

export const pictureActions=(run:Run)=>{
 const c=run.contentSnapshot.conditions.find(c=>c.id===run.conditionId)!;
 const names=c.shortId==='C1'||c.id.endsWith('.c1')?[['내용','content'],['종이','paper'],['차례','order']]:[['물어봐요','ask'],['시간','time'],['자리','place']];
 return c.activity.materials.filter(m=>m.role==='response').map((m,i)=>({id:m.id,label:names[i][0],art:names[i][1]}));
};
export function PicturePlanning({run,busy,send,repository}:{run:Run;busy:boolean;send:(command:Command)=>Promise<void>;repository:BrowserRepository}){
 const progress=planningProgress(run),phase=progress.length,young=run.profile.ageBand==='preschool',count=planningLength(run.profile),items=pictureActions(run);
 const [choice,setChoice]=useState<string[]>([]),[error,setError]=useState('');
 const c=run.contentSnapshot.conditions.find(c=>c.id===run.conditionId)!,first=(progress[0]?.payload.responseIds??[]) as string[],last=(progress.at(-1)?.payload.responseIds??[]) as string[];
 const chosen=phase===1?first:choice;
 const prompt=phase===0?(young?'먼저 뭐 할까?':count===1?'먼저 할 일을 골라요.':count===2?'먼저 할 두 일을 차례로 골라요.':'세 일을 차례로 놓아 보세요.'):phase===1?(young?'이렇게 해 봤어!':'내가 고른 일을 그림으로 살펴봐요.'):phase===2?(young?'다시 골라 볼까?':count<3?'그림을 보고 다시 골라요.':'앞의 그림을 보고 차례를 유지하거나 바꿔 보세요.'):'왜 골랐을까?';
 async function advance(ids:string[]){try{await send({type:'planningStep',phase:phase===0?'choose':phase===1?'observe':'revise',responseIds:ids});setChoice([]);}catch(e){setError(String(e));}}
 function choose(id:string){if(count===1){void advance([id]);return;}setChoice(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length<count?[...prev,id]:prev);}
 function value():ActionInput{
  const goal=c.activity.materials.find(m=>m.role==='goal')!.id,constraint=c.activity.materials.find(m=>m.role==='constraint')?.id??'';
  if(c.activity.actionKind==='revisePlan')return {actionKind:'revisePlan',goalId:goal,beforeResponseId:first[0],afterResponseId:last[0],decision:first[0]===last[0]?'keep':'change'};
  if(c.activity.actionKind==='prioritizeActions')return {actionKind:'prioritizeActions',goalId:goal,constraintId:constraint,orderedResponseIds:[...last,...items.map(x=>x.id).filter(id=>!last.includes(id))]};
  return {actionKind:'chooseGoalAndSteps',goalId:goal,responseId:last[0],constraintId:constraint};
 }
 const commit=(reason:ReasonInput)=>send({type:'action',value:value(),reason});
 if(phase===3)return young?<KidExpression key="reason" run={run} repository={repository} prompt={prompt} reason reference={<div className="kid-reason-choice"><PictureArt kind={items.find(x=>x.id===last[0])?.art}/></div>} onSave={async e=>commit(e.method==='drawing'?{source:'drawn',drawingRef:e.canvasRef!}:e.method==='audio'?{source:'recorded',voiceRef:e.audioRef!}:e.method==='text'?{source:'typed',reasonText:e.text}:{source:'deferred'})}/>:<ReasonEditor run={run} value={value()} repository={repository} busy={busy} onCommit={commit}/>;
 const selected=items.find(x=>x.id===first[0]);
 return <section className={`picture-planning ${young?'kid-planning':'school-planning'}`} data-planning-phase={phase} data-planning-length={count}>
 <h1 data-play-prompt>{prompt}</h1>{young&&<Speak text={prompt}/>}
 {!young&&<p>{c.id.endsWith('.c1')?'종이가 적어도 책을 만들고 싶어요.':'친구들이 책 한 권을 함께 보려고 해요.'}</p>}
 {phase===1?<div className="kid-outcome" key={first.join()}><PictureArt kind={selected?.art} active portrait={young}/><button disabled={busy} onClick={()=>void advance(first)}>다음</button></div>:<>
 <div className="kid-goal" aria-label={c.id.endsWith('.c1')?'책 만들기':'함께 책 보기'}><PictureArt portrait={young} active={phase===2} kind={phase===2?(c.id.endsWith('.c1')?'paper':'share'):(c.id.endsWith('.c1')?'press':'share')}/></div>
 {count>1&&<div className="picture-plan-tray" aria-label="내가 고른 차례">{chosen.map(id=><PictureArt key={id} kind={items.find(x=>x.id===id)?.art}/>)}</div>}
 <div className="kid-choices">{items.map(item=><button key={item.id} data-picture-choice={item.id} disabled={busy} aria-pressed={chosen.includes(item.id)} onClick={()=>choose(item.id)}><PictureArt kind={item.art}/><span>{count>=3?run.localeSnapshot[c.activity.materials.find(m=>m.id===item.id)!.labelKey]:item.label}</span></button>)}</div>
 {count>1&&<button disabled={busy||choice.length!==count} onClick={()=>void advance(choice)}>다음</button>}
 </>}{error&&<p role="alert">다시 눌러요</p>}
 </section>;
}
