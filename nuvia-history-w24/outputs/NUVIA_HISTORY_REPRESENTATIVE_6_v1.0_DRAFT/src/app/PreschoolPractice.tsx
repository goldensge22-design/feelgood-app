import React,{useEffect,useState} from 'react';
import type {Run,PracticeStep,ReasonInput} from '../core/types';
import type {Command} from '../core/engine';
import type {BrowserRepository} from '../core/storage';
import {phases,practiceSteps,practiceMethods,practiceGoals,sequenceCards,practiceValue,validatePracticeSteps,shuffled,isPaper,practiceOutcome,type KidOption} from '../core/preschoolPractice';
import {kidText as k,type KidKey} from '../content/preschool.ko';
import {KidExpression,Speak} from './PreschoolPlay';
import {PictureArt} from './PictureArt';

export function OutcomeScene({method,compact=false}:{method:string;compact?:boolean}){return <figure className={compact?'practice-result compact':'practice-result'} data-result-scene={method}><PictureArt kind={method} active portrait={!compact}/><figcaption>{k(practiceOutcome(method))}</figcaption></figure>;}
export function PreschoolPractice(props:{run:Run;busy:boolean;send:(c:Command)=>Promise<void>;repository:BrowserRepository}){
 const {run}=props,steps=practiceSteps(run),domain=run.profile.practiceDomain!,phase=phases(domain)[steps.length]??'reason';
 return <PracticeStage key={phase} {...props} steps={steps} phase={phase}/>;
}
function PracticeStage({run,busy,send,repository,steps,phase}:{run:Run;busy:boolean;send:(c:Command)=>Promise<void>;repository:BrowserRepository;steps:PracticeStep[];phase:string}){
 const domain=run.profile.practiceDomain!,cid=run.conditionId!,paper=isPaper(cid),methods=practiceMethods(cid),method=steps.find(s=>s.phase==='method')?.ids[0]??methods[0].id,finalMethod=steps.find(s=>s.phase==='revise')?.ids[0]??method;
 const draftKey=['nuvia.practiceDraft.v1',run.resultId,cid,phase].join(':');
 const [selected,setSelected]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem(draftKey)??'[]');}catch{return [];}}),[help,setHelp]=useState(false),[failed,setFailed]=useState(false),[changing,setChanging]=useState(false);
 useEffect(()=>{try{localStorage.setItem(draftKey,JSON.stringify(selected));}catch{setFailed(true);}},[selected,draftKey]);
 async function commit(ids:string[]){try{validatePracticeSteps(domain,cid,[...steps,{phase,ids}]);await send({type:'practiceStep',step:{phase,ids}});}catch{setFailed(true);}}
 const fullOrder=phase==='sequence'&&selected.length===3;
 const goal=practiceGoals(cid).find(x=>x.id===steps.find(s=>s.phase==='goal')?.ids[0]);
 const action=practiceValue.bind(null,domain,cid);
 const saveReason=(reason:ReasonInput)=>send({type:'action',value:action(steps),reason});
 if(phase==='reason')return <KidExpression run={run} repository={repository} prompt={k('reason')} reason reference={<div className="kid-reason-choice"><PictureArt kind={finalMethod}/></div>} onSave={e=>saveReason(e.method==='drawing'?{source:'drawn',drawingRef:e.canvasRef!}:e.method==='audio'?{source:'recorded',voiceRef:e.audioRef!}:e.method==='text'?{source:'typed',reasonText:e.text}:{source:'deferred'})}/>;
 const promptKey:KidKey=phase==='linkPlace'&&paper?'makePlace':phase==='linkMethod'&&paper?'makeMethod':phase==='linkPerson'&&!paper?'findReader':phase==='context'?(paper?'contextPaper':'contextFriends'):phase==='method'?(paper?'methodPaper':'methodFriends'):phase==='findResource'?(paper?'findPaper':'findTime'):phase==='apply'?(paper?'applyPaper':'applyTime'):phase==='observe'?'outcome':(phase==='linkPerson'||phase==='findPerson')&&paper?'maker':phase as KidKey;
 const helpKey:KidKey=phase==='sequence'?'helpSequence':phase.startsWith('link')||phase==='scene'?'helpLink':domain==='attention'?'helpAttention':phase==='goal'?'helpGoal':'helpMethod';
 const prompt=failed?k('tryAgain'):help?k(helpKey):k(promptKey);
 function cards(options:KidOption[],handler:(id:string)=>void,sequence=false){return <div className="kid-choices">{shuffled(options,run.resultId+phase).map(o=><button key={o.id} data-practice-choice={o.id} disabled={busy||(sequence&&selected.includes(o.id))} aria-pressed={sequence?selected.includes(o.id):undefined} onClick={()=>{setFailed(false);handler(o.id);}}><PictureArt kind={o.art}/><span>{k(o.key)}</span></button>)}</div>;}
 const clueOptions:KidOption[]=paper?[{id:'oneSheet',key:'oneSheet',art:'oneSheet'},{id:'threeSheets',key:'threeSheets',art:'threeSheets'}]:[{id:'day',key:phase==='apply'?'day':'sun',art:'day'},{id:'night',key:phase==='apply'?'night':'moon',art:'night'}];
 return <section className={'preschool-practice phase-'+phase} data-practice-domain={domain} data-practice-phase={phase}>
 <h1 data-play-prompt>{prompt}</h1><Speak text={prompt}/>
 {phase==='context'?<><div className="kid-hero"><PictureArt kind={paper?'paper':'access'} active portrait/><span className="kid-badge">{k('imagine')}</span></div><button className="primary" disabled={busy} onClick={()=>void commit([])}>{k('next')}</button></>:phase==='observe'?<>{goal&&<div className="practice-goal-reminder" aria-label={k(goal.key)} data-goal-id={goal.id}><PictureArt kind={goal.art}/></div>}<OutcomeScene method={method}/><button className="primary" disabled={busy} onClick={()=>void commit([method])}>{k('observe')}</button></>:phase==='revise'?<>{goal&&<div className="practice-goal-reminder" aria-label={k(goal.key)} data-goal-id={goal.id}><PictureArt kind={goal.art}/></div>}<OutcomeScene method={method} compact/>{changing?cards(methods,id=>void commit([id])):<nav><button className="primary" disabled={busy} onClick={()=>void commit([method])}>{k('keep')}</button><button disabled={busy} onClick={()=>setChanging(true)}>{k('change')}</button></nav>}</>:<>
 {domain==='simultaneous'&&steps.some(s=>s.phase==='linkPerson')&&<div className="practice-links" aria-label="내가 이은 그림" data-play-visual><PictureArt kind="book"/><span aria-hidden="true">↔</span><PictureArt kind={paper?'printer':'fewer'}/>{steps.some(s=>s.phase==='linkPlace')&&<><span aria-hidden="true">↔</span><PictureArt kind={paper?'press':'place'}/></>}{steps.some(s=>s.phase==='linkMethod')&&<><span aria-hidden="true">↔</span><PictureArt kind={method}/></>}</div>}
 {!fullOrder&&phase!=='sequence'&&<div className="practice-context" data-context-scene={phase}>
 {domain==='attention'?<div className="practice-clue-board" data-play-visual><PictureArt kind={paper?'printer':'fewer'}/><PictureArt kind={paper?'oneSheet':'day'}/></div>:<PictureArt kind={phase==='linkPerson'?'book':phase==='linkPlace'?'share':phase==='linkMethod'||phase==='sequence'||phase==='scene'?method:goal?.art??(paper?'press':'share')} portrait/>}
 </div>}
 {phase==='goal'&&cards(practiceGoals(cid),id=>void commit([id]))}
 {phase==='method'&&cards(methods,id=>void commit([id]))}
 {phase==='sequence'&&<><div className={'practice-order '+(fullOrder?'is-ready':'')} data-play-visual={fullOrder||undefined} aria-label="내가 놓은 차례">{selected.map(id=>{const item=sequenceCards(cid,method).find(o=>o.id===id)!;return <button key={id} aria-label={k(item.key)+' 빼기'} onClick={()=>setSelected(selected.filter(x=>x!==id))}><PictureArt kind={item.art} portrait={false}/>{fullOrder&&<span>{k(item.key)}</span>}</button>;})}</div>{!fullOrder&&cards(sequenceCards(cid,method),id=>setSelected([...selected,id]),true)}{selected.length>0&&<nav><button className="primary" disabled={busy||selected.length!==3} onClick={()=>void commit(selected)}>{k('try')}</button><button disabled={!selected.length||busy} onClick={()=>setSelected([])}>{k('back')}</button></nav>}</>}
 {(phase==='linkPerson'||phase==='findPerson')&&cards(paper?[{id:'printer',key:'printer',art:'printer'},{id:'listener',key:'listener',art:'tell'}]:[{id:'reader',key:'reader',art:'fewer'},{id:'listener',key:'listener',art:'tell'}],id=>void commit([id]))}
 {phase==='linkPlace'&&cards([{id:'press',key:'press',art:'press'},{id:'place',key:'place',art:'place'}],id=>void commit([id]))}
 {(phase==='linkMethod'||phase==='scene')&&cards(methods,id=>void commit([id]))}
 {(phase==='findResource'||phase==='apply')&&cards(clueOptions,id=>void commit([id]))}
 {!fullOrder&&<button className="kid-help" disabled={busy} onClick={()=>{setFailed(false);setHelp(!help);if(!help)void send({type:'hint',hintType:phase==='sequence'?'sequenceHelp':'visualGuide',level:1});}}>{help?k('backToQuestion'):k('help')}</button>}
 </>}
 </section>;
}
