import React,{useEffect,useRef,useState} from 'react';
import type {ConditionDefinition,Expression,Profile,Run} from '../core/types';
import type {Command} from '../core/engine';
import type {BrowserRepository} from '../core/storage';
import {DrawingInput,ExpressionView,audioBlob} from './ExpressionEditor';
import {saveDrawing} from './localArtifacts';
import {PictureArt} from './PictureArt';
import {PicturePlanning} from './PicturePlanning';
import {PlayGuard} from './PlayGuard';
import {QAInspector} from './QAInspector';
import {ResultViews} from './ResultViews';
import './preschool.css';

export function Speak({text}:{text:string}){
 const [voice,setVoice]=useState<SpeechSynthesisVoice>();
 useEffect(()=>{if(!('speechSynthesis' in window))return;const find=()=>setVoice(speechSynthesis.getVoices().find(v=>v.localService&&v.lang.startsWith('ko')));find();speechSynthesis.addEventListener('voiceschanged',find);return()=>{speechSynthesis.removeEventListener('voiceschanged',find);speechSynthesis.cancel();};},[]);
 if(!voice)return null;
 return <button className="kid-speak" aria-label="듣기" onClick={()=>{speechSynthesis.cancel();const speech=new SpeechSynthesisUtterance(text);speech.voice=voice;speech.lang='ko-KR';speech.rate=.85;speechSynthesis.speak(speech);}}>♪</button>;
}
export function KidExpression({run,repository,prompt,onSave,reason=false,reference}:{run:Run;repository:BrowserRepository;prompt:string;onSave:(value:Expression)=>Promise<void>;reason?:boolean;reference?:React.ReactNode}){
 const key=['nuvia.kidDraft.v1',run.resultId,run.stage,reason?'reason':'expression'].join(':');
 const [draft,setDraft]=useState(()=>{try{return JSON.parse(localStorage.getItem(key)??'null')??{mode:'draw',drawing:'',text:''};}catch{return {mode:'draw',drawing:'',text:''};}});
 const [busy,setBusy]=useState(false),[error,setError]=useState(false),[recording,setRecording]=useState(false),[audio,setAudio]=useState<Blob|undefined>(()=>draft.audio?audioBlob(draft.audio):undefined),[audioUrl,setAudioUrl]=useState('');const recorder=useRef<MediaRecorder|undefined>(undefined),stream=useRef<MediaStream|undefined>(undefined),started=useRef(0),duration=useRef(draft.duration??0),mounted=useRef(true);
 useEffect(()=>{if(!recording)return;const timer=setTimeout(()=>{if(recorder.current?.state==='recording')recorder.current.stop();},60000);return()=>clearTimeout(timer);},[recording]);
 const canRecord=!!navigator.mediaDevices?.getUserMedia&&typeof MediaRecorder!=='undefined';
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(draft));}catch{setError(true);}},[draft,key]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(t=>t.stop());};},[]);
 useEffect(()=>{if(!audio)return;const url=URL.createObjectURL(audio);setAudioUrl(url);return()=>URL.revokeObjectURL(url);},[audio]);
 async function record(){if(recording){recorder.current?.stop();return;}try{setError(false);const media=await navigator.mediaDevices.getUserMedia({audio:true});if(!mounted.current){media.getTracks().forEach(t=>t.stop());return;}stream.current=media;const rec=new MediaRecorder(media),parts:BlobPart[]=[];recorder.current=rec;rec.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};rec.onstop=()=>{duration.current=Date.now()-started.current;media.getTracks().forEach(t=>t.stop());if(mounted.current){setRecording(false);const blob=new Blob(parts,{type:rec.mimeType});if(!blob.size||blob.size>750000){setError(true);return;}setAudio(blob);const reader=new FileReader();reader.onload=()=>{if(mounted.current)setDraft((d:typeof draft)=>({...d,audio:String(reader.result),duration:duration.current}));};reader.readAsDataURL(blob);}};rec.onerror=()=>{media.getTracks().forEach(t=>t.stop());if(mounted.current){setError(true);setRecording(false);}};started.current=Date.now();rec.start();setRecording(true);}catch{setError(true);}}
 async function save(skip=false){setBusy(true);setError(false);try{let expression:Expression={method:'skip',text:''};if(!skip){if(draft.mode==='draw')expression={method:'drawing',text:'',canvasRef:reason?await repository.saveReasonDrawing(run,draft.drawing):await saveDrawing(run,draft.drawing)};else if(draft.mode==='voice')expression={method:'audio',text:'',audioRef:await repository.saveAudio(run.resultId,run.profile.learnerId,audio!,{durationMs:duration.current})};else expression={method:'text',text:draft.text};}await onSave(expression);}catch{setError(true);}finally{if(mounted.current)setBusy(false);}}
 const valid=draft.mode==='draw'?!!draft.drawing:draft.mode==='voice'?!!audio:!!draft.text.trim();
 return <section className="kid-expression"><h1 data-play-prompt>{prompt}</h1><Speak text={prompt}/>{reference}
 <nav className="kid-modes">{canRecord&&<button disabled={recording||busy} aria-pressed={draft.mode==='voice'} onClick={()=>setDraft({...draft,mode:'voice'})}>말</button>}<button disabled={recording||busy} aria-pressed={draft.mode==='draw'} onClick={()=>setDraft({...draft,mode:'draw'})}>그림</button><details><summary>다른 방법</summary><button disabled={recording||busy} onClick={()=>setDraft({...draft,mode:'text'})}>짧게 쓰기</button></details></nav>
 {draft.mode==='draw'?<div data-play-visual><DrawingInput strict height={800} initialValue={draft.drawing} onChange={drawing=>setDraft((d:typeof draft)=>({...d,drawing}))}/></div>:draft.mode==='voice'?<><PictureArt kind="ask" active={recording}/>{canRecord?<button disabled={busy} onClick={()=>void record()}>{recording?'멈춤':'녹음'}</button>:<button onClick={()=>setDraft({...draft,mode:'draw'})}>그림</button>}{audioUrl&&<audio controls src={audioUrl}/>}</>:<div className="kid-writing"><textarea aria-label="짧게 쓰기" data-user-content value={draft.text} onChange={e=>setDraft({...draft,text:e.target.value})}/></div>}
 {error&&<p role="alert">다시 눌러요</p>}<nav><button disabled={!valid||busy||recording} onClick={()=>void save()}>저장</button><button disabled={busy||recording} onClick={()=>void save(true)}>나중에</button></nav></section>;
}

export function PreschoolPlay({run,profile,definition,existing,busy,repository,start,resume,viewed,send,error}:{run?:Run;profile:Profile;definition:ConditionDefinition;existing:Run|null;busy:boolean;repository:BrowserRepository;start:()=>Promise<void>;resume:()=>void;viewed:()=>Promise<void>;send:(command:Command)=>Promise<void>;error:string}){
 const [localError,setLocalError]=useState(false);const act=(promise:Promise<void>)=>{setLocalError(false);void promise.catch(()=>setLocalError(true));};
 const c=definition,stage=run?.stage??'intro',paper=c.id.endsWith('.c1');
 const prompt=stage==='intro'?'책을 만나러 가요!':stage==='history'?(paper?'구텐베르크가 책을 찍어요':'사람들이 책을 함께 봐요'):stage==='condition'?'어느 이야기를 바꿀까?':stage==='prediction'?'어떻게 될까?':stage==='alternate'?'이럴 수도 있어!':stage==='complete'?'내 이야기가 완성됐어!':'';
 const art=stage==='alternate'?(paper?'fewer':'share'):paper?'press':'share';
 const reference=(kind:'history'|'prediction')=><div className="kid-comparison"><figure><PictureArt kind="press"/><figcaption>옛날</figcaption></figure><figure data-user-content>{run&&(kind==='history'?run.story.status==='recorded'&&<ExpressionView expression={run.story.value} run={run} repository={repository}/>:run.prediction.status==='recorded'&&(run.prediction.value.expression.method==='choice'?<PictureArt kind={run.prediction.value.expression.choiceId?.includes('essential')?'content':run.prediction.value.expression.choiceId?.includes('reduce')?'fewer':run.prediction.value.expression.choiceId?.includes('take-turns')?'time':'ask'}/>:<ExpressionView expression={run.prediction.value.expression} run={run} repository={repository}/>))}<figcaption>{kind==='history'?'내 이야기':'처음 생각'}</figcaption></figure></div>;
 return <div className="preschool-shell" data-stage={stage}><main><PlayGuard><div className="kid-stage" key={stage+c.id}>
 {prompt&&<><h1 data-play-prompt>{prompt}</h1><Speak text={stage==='prediction'?(paper?'종이가 적어졌어. 어떻게 될까?':'책을 못 보는 친구가 있어. 어떻게 될까?'):prompt}/></>}
 {(stage==='intro'||stage==='history'||stage==='alternate')&&<div className="kid-hero"><PictureArt kind={art} active={stage==='alternate'} portrait/>{stage==='history'&&<span className="kid-badge">옛날</span>}{stage==='alternate'&&<span className="kid-badge">상상</span>}</div>}
 {stage==='intro'&&<nav><button onClick={()=>act(start())}>시작</button>{existing&&<button onClick={resume}>이어서</button>}</nav>}
 {stage==='history'&&<button disabled={busy} onClick={()=>act(viewed())}>다음</button>}
 {stage==='condition'&&<div className="kid-choices">{run!.contentSnapshot.conditions.map(x=><button key={x.id} data-condition={x.id} disabled={busy} onClick={()=>act(send({type:'selectCondition',conditionId:x.id}))}><PictureArt kind={x.id.endsWith('.c1')?'paper':'share'}/><span>{x.id.endsWith('.c1')?'종이':'친구'}</span></button>)}</div>}
 {stage==='prediction'&&<><div className="kid-hero"><PictureArt kind={paper?'paper':'access'} active portrait/></div><div className="kid-choices">{c.semantic!.predictionOptions.map((o,i)=><button key={o.id} disabled={busy} data-prediction={o.id} onClick={()=>act(send({type:'prediction',expression:{method:'choice',choiceId:o.id,text:run!.localeSnapshot[o.textKey]}}))}><PictureArt kind={paper?['content','fewer'][i]:['time','ask'][i]}/><span>{paper?['고르기','조금'][i]:['차례','함께'][i]}</span></button>)}</div><button disabled={busy} onClick={()=>act(send({type:'prediction',expression:{method:'unknown',text:''}}))}>모르겠어</button></>}
 {stage==='activity'&&(c.passDomain==='계획'&&['revisePlan','chooseGoalAndSteps'].includes(c.activity.actionKind)?<PicturePlanning run={run!} busy={busy} repository={repository} send={send}/>:<><h1 data-play-prompt>잠깐 쉬어요</h1><PictureArt/></>)}
 {stage==='alternate'&&<button disabled={busy} onClick={()=>act(send({type:'reveal',possibility:'A'}))}>다음</button>}
 {stage==='creation'&&<KidExpression run={run!} repository={repository} prompt="내 이야기를 그려 봐!" onSave={expression=>send({type:'story',expression})}/>}
 {(stage==='historyComparison'||stage==='predictionComparison')&&<KidExpression key={stage} run={run!} repository={repository} prompt="무엇이 달라 보일까?" reference={reference(stage==='historyComparison'?'history':'prediction')} onSave={expression=>send({type:'comparison',kind:stage==='historyComparison'?'history':'prediction',expression})}/>}
 {stage==='complete'&&<><div className="kid-hero"><PictureArt kind="book" portrait/></div><div data-user-content>{run!.story.status==='recorded'&&<ExpressionView expression={run!.story.value} run={run!} repository={repository}/>}</div></>}
 {(localError||error)&&<p role="alert">다시 눌러요</p>}
 </div></PlayGuard></main>{stage==='complete'&&<details className="adult-records" data-adult-records><summary>보호자 기록</summary><ResultViews run={run!} repository={repository}/></details>}<QAInspector profile={profile} definition={definition} run={run} error={error}/></div>;
}
