import React,{useEffect,useRef,useState} from 'react';
import {ui} from './text';
import type {ConditionDefinition,Expression,Profile,Run} from '../core/types';
import type {Command} from '../core/engine';
import type {BrowserRepository} from '../core/storage';
import {DrawingInput,ExpressionView,audioBlob} from './ExpressionEditor';
import {saveDrawing} from './localArtifacts';
import {W24Illustration as PictureArt} from './W24Illustration';
import {HistoryShell,HistoryHeader,PrimaryButton,SecondaryButton,ChoiceCard,HistoryComparisonSpread,PredictionComparisonTimeline} from '../ui/history/HistoryUI';
import {kidText as k} from '../content/preschool.ko';
import {PreschoolPractice,OutcomeScene} from './PreschoolPractice';
import {PicturePlanning} from './PicturePlanning';
import {PlayGuard} from './PlayGuard';
import {QAInspector} from './QAInspector';
import {ResultViews} from './ResultViews';
import './preschool.css';
import './preschool-revision.css';

export function Speak({text}:{text:string}){
 const [voice,setVoice]=useState<SpeechSynthesisVoice>();
 useEffect(()=>{if(!('speechSynthesis' in window))return;const find=()=>setVoice(speechSynthesis.getVoices().find(v=>v.localService&&v.lang.startsWith('ko')));find();speechSynthesis.addEventListener('voiceschanged',find);return()=>{speechSynthesis.removeEventListener('voiceschanged',find);speechSynthesis.cancel();};},[]);
 if(!voice)return null;
 return <SecondaryButton className="kid-speak" aria-label={k('listen')} onClick={()=>{speechSynthesis.cancel();const speech=new SpeechSynthesisUtterance(text);speech.voice=voice;speech.lang='ko-KR';speech.rate=.85;speechSynthesis.speak(speech);}}>♪</SecondaryButton>;
}
export function KidExpression({run,repository,prompt,onSave,reason=false,reference,allowSkip=true}:{run:Run;allowSkip?:boolean;repository:BrowserRepository;prompt:string;onSave:(value:Expression)=>Promise<void>;reason?:boolean;reference?:React.ReactNode}){
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
 return <section className={"kid-expression mode-"+draft.mode}><h1 data-play-prompt>{prompt}</h1><Speak text={prompt}/>{reference}
 <nav className="kid-modes">{canRecord&&<SecondaryButton disabled={recording||busy} aria-pressed={draft.mode==='voice'} onClick={()=>setDraft({...draft,mode:'voice'})}>{k('voice')}</SecondaryButton>}<SecondaryButton disabled={recording||busy} aria-pressed={draft.mode==='draw'} onClick={()=>setDraft({...draft,mode:'draw'})}>{k('draw')}</SecondaryButton><details open={draft.mode==='text'||undefined}><summary>{k('other')}</summary><SecondaryButton disabled={recording||busy} onClick={()=>setDraft({...draft,mode:'text'})}>{k('write')}</SecondaryButton></details></nav>
 {draft.mode==='draw'?<div data-play-visual><DrawingInput strict height={800} initialValue={draft.drawing} onChange={drawing=>setDraft((d:typeof draft)=>({...d,drawing}))}/></div>:draft.mode==='voice'?<><PictureArt kind="ask" active={recording}/>{canRecord?<SecondaryButton disabled={busy} onClick={()=>void record()}>{recording?k('stop'):k('record')}</SecondaryButton>:<SecondaryButton onClick={()=>setDraft({...draft,mode:'draw'})}>{k('draw')}</SecondaryButton>}{audioUrl&&<audio controls src={audioUrl}/>}</>:<div className="kid-writing"><textarea autoFocus aria-label={k('write')} data-user-content value={draft.text} onChange={e=>setDraft({...draft,text:e.target.value})}/></div>}
 {error&&<p role="alert">{k('retry')}</p>}<nav><PrimaryButton disabled={!valid||busy||recording} onClick={()=>void save()}>{k('save')}</PrimaryButton>{allowSkip&&<SecondaryButton disabled={busy||recording} onClick={()=>void save(true)}>{k('later')}</SecondaryButton>}</nav></section>;
}

export function PreschoolPlay({run,profile,definition,existing,busy,repository,start,resume,viewed,send,error}:{run?:Run;profile:Profile;definition:ConditionDefinition;existing:Run|null;busy:boolean;repository:BrowserRepository;start:()=>Promise<void>;resume:()=>void;viewed:()=>Promise<void>;send:(command:Command)=>Promise<void>;error:string}){
 const [localError,setLocalError]=useState(false);const act=(promise:Promise<void>)=>{setLocalError(false);void promise.catch(()=>setLocalError(true));};
 const c=definition,stage=run?.stage??'intro',paper=c.id.endsWith('.c1');
 const prompt=stage==='intro'?k('intro'):stage==='history'?(paper?k('historyPaper'):k('historyFriends')):stage==='condition'?k('condition'):stage==='prediction'?k('prediction'):stage==='alternate'?k('outcome'):stage==='complete'?k('complete'):'';
 const art=stage==='alternate'?(paper?'fewer':'share'):paper?'press':'share';
 const reference=(kind:'history'|'prediction')=>{
  const actual=<><PictureArt kind="press" clue={false}/><span>{k('past')}</span></>;
  const value=run&&(kind==='history'?run.story.status==='recorded'&&<ExpressionView expression={run.story.value} run={run} repository={repository}/>:run.prediction.status==='recorded'&&(run.prediction.value.expression.method==='choice'?<PictureArt kind={run.prediction.value.expression.choiceId?.includes('essential')?'content':run.prediction.value.expression.choiceId?.includes('reduce')?'fewer':run.prediction.value.expression.choiceId?.includes('take-turns')?'time':'ask'}/>:<ExpressionView expression={run.prediction.value.expression} run={run} repository={repository}/>));
  const authored=<div data-user-content>{value}<span>{k(kind==='history'?'myStory':'myPrediction')}</span></div>;
  return <div className="kid-comparison">{kind==='history'?<HistoryComparisonSpread actual={actual} story={authored}/>:<PredictionComparisonTimeline prediction={authored} actual={actual}/>}</div>;
 };
 return <HistoryShell className="preschool-shell" data-stage={stage}><HistoryHeader brand={ui('brand')} wordmark={ui('feelgood')}/><main><PlayGuard><div className="kid-stage" key={stage+c.id}>
 {prompt&&<><h1 data-play-prompt>{prompt}</h1><Speak text={stage==='prediction'?(paper?ui('kid.predictionPaperVoice'):ui('kid.predictionFriendsVoice')):prompt}/></>}
 {(stage==='intro'||stage==='history'||stage==='alternate'&&!(run?.action.status==='recorded'&&run.action.value.actionKind==='preschoolActivity'))&&<div className="kid-hero"><PictureArt kind={art} active={stage==='alternate'} portrait/>{stage==='history'&&<span className="kid-badge">{k('past')}</span>}{stage==='alternate'&&<span className="kid-badge">{k('imagine')}</span>}</div>}
 {stage==='intro'&&<nav><SecondaryButton onClick={()=>act(start())}>{k('start')}</SecondaryButton>{existing&&<SecondaryButton onClick={resume}>{k('resume')}</SecondaryButton>}</nav>}
 {stage==='history'&&<SecondaryButton disabled={busy} onClick={()=>act(viewed())}>{k('next')}</SecondaryButton>}
 {stage==='condition'&&<div className="kid-choices">{run!.contentSnapshot.conditions.map(x=><ChoiceCard key={x.id} data-condition={x.id} disabled={busy} onClick={()=>act(send({type:'selectCondition',conditionId:x.id}))}><PictureArt kind={x.id.endsWith('.c1')?'paper':'share'}/><span>{x.id.endsWith('.c1')?k('paper'):k('friends')}</span></ChoiceCard>)}</div>}
 {stage==='prediction'&&<><div className="kid-hero"><PictureArt kind={paper?'paper':'access'} active portrait/></div><div className="kid-choices">{c.semantic!.predictionOptions.map((o,i)=><ChoiceCard key={o.id} disabled={busy} data-prediction={o.id} onClick={()=>act(send({type:'prediction',expression:{method:'choice',choiceId:o.id,text:run!.localeSnapshot[o.textKey]}}))}><PictureArt kind={paper?['content','fewer'][i]:['time','ask'][i]}/><span>{paper?[k('predictContent'),k('predictFewer')][i]:[k('predictTurns'),k('predictShare')][i]}</span></ChoiceCard>)}</div><SecondaryButton disabled={busy} onClick={()=>act(send({type:'prediction',expression:{method:'unknown',text:''}}))}>{k('unknown')}</SecondaryButton></>}
 {stage==='activity'&&(c.activity.actionKind==='preschoolActivity'?<PreschoolPractice run={run!} busy={busy} repository={repository} send={send}/>:c.passDomain==='계획'&&['revisePlan','chooseGoalAndSteps'].includes(c.activity.actionKind)?<PicturePlanning run={run!} busy={busy} repository={repository} send={send}/>:<><h1 data-play-prompt>잠깐 쉬어요</h1><PictureArt/></>)}
 {stage==='alternate'&&run?.action.status==='recorded'&&run.action.value.actionKind==='preschoolActivity'&&<OutcomeScene method={run.action.value.methodId}/>}
 {stage==='alternate'&&<SecondaryButton disabled={busy} onClick={()=>act(send({type:'reveal',possibility:'A'}))}>{k('next')}</SecondaryButton>}
 {stage==='creation'&&<KidExpression run={run!} repository={repository} allowSkip={false} prompt={k('story')} onSave={expression=>send({type:'story',expression})}/>}
 {(stage==='historyComparison'||stage==='predictionComparison')&&<KidExpression key={stage} run={run!} repository={repository} prompt={k('compare')} reference={reference(stage==='historyComparison'?'history':'prediction')} onSave={expression=>send({type:'comparison',kind:stage==='historyComparison'?'history':'prediction',expression})}/>}
 {stage==='complete'&&<><div className="kid-hero"><PictureArt kind="book" portrait/></div><div data-user-content>{run!.story.status==='recorded'&&<ExpressionView expression={run!.story.value} run={run!} repository={repository}/>}</div></>}
 {(localError||error)&&<p role="alert">{k('retry')}</p>}
 </div></PlayGuard></main>{stage==='complete'&&<details className="adult-records" data-adult-records><summary>{k('adult')}</summary><ResultViews run={run!} repository={repository}/></details>}<QAInspector profile={profile} definition={definition} run={run} error={error}/></HistoryShell>;
}
