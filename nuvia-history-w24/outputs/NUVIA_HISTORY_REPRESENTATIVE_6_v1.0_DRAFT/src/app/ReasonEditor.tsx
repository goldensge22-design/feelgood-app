import React,{useEffect,useRef,useState} from 'react';
import type {ActionInput,ReasonInput,Run} from '../core/types';
import {BrowserRepository} from '../core/storage';
import {ExpressionView,DrawingInput,audioBlob} from './ExpressionEditor';
import {VoiceRecorder} from '../canvas/VoiceRecorder';
import {ui} from './text';
import {retainLocalImages} from './assets';

export function ReasonEditor({run,value,repository,busy,onCommit,onBack}:{run:Run;value:ActionInput;repository:BrowserRepository;busy:boolean;onCommit:(reason:ReasonInput)=>Promise<void>;onBack?:()=>void}){
 const preschool=run.profile.ageBand==='preschool',low=['preschool','elementary-low'].includes(run.profile.ageBand),drawAllowed=low||run.profile.ageBand==='elementary-high';
 const key=['nuvia.reasonDraft.v1',run.profile.learnerId,run.resultId,run.conditionId,run.missionVersion,run.contentVersion].join(':');
 const [draft,setDraft]=useState(()=>{try{const saved=localStorage.getItem(key);if(saved)return JSON.parse(saved) as {mode:string;text:string;audio:string;drawing:string};}catch{}return {mode:low?'voice':'text',text:'',audio:'',drawing:''};});
 const [recording,setRecording]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false),[assetsReady,setAssetsReady]=useState(false);const live=useRef(true);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{let active=true;void retainLocalImages().then(()=>{if(active)setAssetsReady(true);}).catch(e=>{if(active)setError(String(e));});return()=>{active=false;};},[]);
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(draft));setSaved(true);}catch{setError(ui('reasonDraftError'));setSaved(false);}},[key,draft]);
 const set=(field:string,v:string)=>setDraft(x=>({...x,[field]:v}));
 const valid=draft.mode==='text'?!!draft.text.trim():draft.mode==='voice'?!!draft.audio:!!draft.drawing;
 async function commit(deferred=false){setSaving(true);setError('');try{
  let reason:ReasonInput={source:'deferred'};
  if(!deferred){
   if(draft.mode==='text'){if(!draft.text.trim())throw Error('EMPTY_REASON');reason={source:'typed',reasonText:draft.text};}
   else if(draft.mode==='voice'){
    const blob=audioBlob(draft.audio),ctx=new AudioContext();let duration=0;try{const decoded=await ctx.decodeAudioData(await blob.arrayBuffer());duration=decoded.duration*1000;}finally{await ctx.close();}
    if(!Number.isFinite(duration)||duration<=0)throw Error(ui('reasonRecordingInvalid'));
    reason={source:'recorded',voiceRef:await repository.saveAudio(run.resultId,run.profile.learnerId,blob,{durationMs:duration})};
   }else{if(!draft.drawing)throw Error('EMPTY_REASON_DRAWING');reason={source:'drawn',drawingRef:await repository.saveReasonDrawing(run,draft.drawing)};}
  }
  await onCommit(reason);
 }catch(e){if(live.current)setError(e instanceof Error?e.message:String(e));}finally{if(live.current)setSaving(false);}}
 const c=run.contentSnapshot.conditions.find(x=>x.id===run.conditionId)!;
 const selected=Object.entries(value).filter(([k])=>!['actionKind','reasonRef','decision'].includes(k)).flatMap(([,v])=>Array.isArray(v)?v:[v]).filter((v):v is string=>typeof v==='string'&&c.activity.materials.some(m=>m.id===v));
 return <section className="reason-editor" data-reason-source={draft.mode}>
  <section className="reason-context" aria-label={ui('predictionSaved')}><h2>{ui('predictionSaved')}</h2>{run.prediction.status==='recorded'&&<ExpressionView expression={run.prediction.value.expression} run={run} repository={repository}/>}</section>
  <section className="reason-context" aria-label={ui('reasonSelected')}><h2>{ui('reasonSelected')}</h2><ol>{selected.map((id,i)=><li key={i}>{run.localeSnapshot[c.activity.materials.find(m=>m.id===id)!.labelKey]}</li>)}</ol></section>
  <h2>{ui(low?'reasonQuestionLow':'reasonQuestionHigh')}</h2><p>{ui(preschool?'reasonInstructionPreschool':low?'reasonInstructionLow':'reasonInstructionHigh')}</p>
  <nav aria-label={ui('mode')}>{(preschool?['voice','draw']:low?['voice','draw','text']:drawAllowed?['text','voice','draw']:['text','voice']).map(mode=><button type="button" key={mode} disabled={busy||saving||recording} aria-pressed={draft.mode===mode} onClick={()=>set('mode',mode)}>{ui(mode==='voice'?'reasonVoice':mode==='draw'?'reasonDrawing':'reasonWriting')}</button>)}</nav>
  {preschool&&<details className="reason-other-methods" open={draft.mode==='text'||undefined}><summary>{ui('reasonOtherMethods')}</summary><button type="button" disabled={busy||saving||recording} aria-pressed={draft.mode==='text'} onClick={()=>set('mode','text')}>{ui('reasonWriting')}</button></details>}
  {draft.mode==='text'&&<label>{ui('reasonRecorded')}<textarea data-reason-text value={draft.text} disabled={busy||saving} onChange={e=>set('text',e.target.value)}/></label>}
  {draft.mode==='voice'&&<VoiceRecorder value={draft.audio} onChange={v=>set('audio',v)} onBusy={setRecording} allowImport={false} helpKey="canvas.voiceHelp"/>}
  {draft.mode==='draw'&&drawAllowed&&<DrawingInput strict initialValue={draft.drawing} onChange={v=>set('drawing',v)}/>}
  {error&&<p role="alert">{error}</p>}{saved&&<p className="reason-draft-status" role="status">{ui('reasonDraftSaved')}</p>}<p className="reason-completion-note">{ui('reasonCompletionNote')}</p>
  <div className="actions"><button disabled={busy||saving||recording||!valid||!saved||!assetsReady} className="primary" onClick={()=>void commit()}>{ui(draft.mode==='voice'?'reasonSaveVoice':draft.mode==='draw'?'reasonSaveDrawing':low?'reasonSaveThought':'reasonSave')}</button>{onBack&&<button disabled={busy||saving||recording} onClick={onBack}>{ui('previous')}</button>}</div>
  <button className="reason-skip" disabled={busy||saving||recording||!assetsReady} onClick={()=>void commit(true)}>{ui('reasonSkip')}</button>
 </section>;
}

export function ReasonView({run,repository}:{run:Run;repository:BrowserRepository}){
 const reason=run.reasonExpressions?.[0];const [url,setUrl]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let active=true,objectUrl='';setUrl('');setError('');async function load(){if(!reason||reason.source==='typed')return;try{const media=await repository.loadReasonMedia((reason.voiceRef??reason.drawingRef)!,run,reason.source==='recorded'?'audio':'drawing');if(media.blob)objectUrl=URL.createObjectURL(media.blob);if(active)setUrl(objectUrl||media.png||'');}catch(e){if(active)setError(String(e));}}void load();return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};},[reason,run.resultId,repository]);
 if(error)return <p role="alert">{error}</p>;
 return <section data-reason-report><h4>{ui('reasonRecorded')}</h4>{!reason?<p>{ui(run.action.status==='notProvided'?'reasonActivityDeferred':'reasonMissing')}</p>:<>{reason.source==='typed'?<p className="user-expression" data-reason-value>{reason.reasonText}</p>:reason.source==='recorded'?<><p>{ui('audioSaved')}</p>{url&&<audio controls src={url}/>}</>:url&&<img className="user-art reason-art" src={url} alt={ui('drawingSaved')}/>}</>}</section>;
}
