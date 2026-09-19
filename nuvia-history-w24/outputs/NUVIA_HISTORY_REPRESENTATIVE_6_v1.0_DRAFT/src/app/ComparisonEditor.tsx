import React,{useState} from 'react';
import type {ComparisonRecord,Run} from '../core/types';
import {validateComparison,condition} from '../core/engine';
import type {BrowserRepository} from '../core/storage';
import {DrawingInput,ExpressionView,audioBlob} from './ExpressionEditor';
import {VoiceRecorder} from '../canvas/VoiceRecorder';
import {saveDrawing} from './localArtifacts';
import {ui} from './text';

export function ComparisonEditor({kind,run,repository,onCommit,busy=false}:{kind:ComparisonRecord['comparisonKind'];run:Run;repository:BrowserRepository;onCommit:(value:ComparisonRecord)=>Promise<void>;busy?:boolean}){
 const age=run.profile.ageBand,young=age==='preschool',low=age==='elementary-low',early=young||low,older=!early&&age!=='elementary-high';
 const semantic=condition(run).semantic?.stages[age][kind==='history'?'historyComparison':'predictionComparison'];
 const [discovery,setDiscovery]=useState(''),[evidence,setEvidence]=useState(''),[audio,setAudio]=useState(''),[drawing,setDrawing]=useState('');
 const [showVoice,setShowVoice]=useState(false),[showDrawing,setShowDrawing]=useState(false),[showText,setShowText]=useState(!early),[recording,setRecording]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const disabled=busy||saving||recording,valid=!!(discovery.trim()||audio||drawing);
 async function save(deferred=false){
  if(disabled)return;setSaving(true);setError('');
  try{
   const value:ComparisonRecord={comparisonKind:kind,expressionMode:'deferred',discoveryText:deferred?'':discovery,evidenceText:deferred?'':evidence,resultId:run.resultId,missionId:run.missionId,conditionId:run.conditionId!,missionVersion:run.missionVersion,contentVersion:run.contentVersion};
   if(!deferred){
    if(audio)value.voiceRef=await repository.saveAudio(run.resultId,run.profile.learnerId,audioBlob(audio));
    if(drawing)value.drawingRef=await saveDrawing(run,drawing);
    const count=Number(!!(discovery.trim()||evidence.trim()))+Number(!!audio)+Number(!!drawing);
    value.expressionMode=count>1?'mixed':audio?'voice':drawing?'drawing':'writing';
   }
   validateComparison(run,value,kind);await onCommit(value);
  }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setSaving(false);}
 }
 return <section className="comparison-editor" data-comparison-kind={kind}>
  <h2>{semantic?run.localeSnapshot[semantic.promptKey]:ui(young?(kind==='history'?'historyYoungQuestion':'predictionYoungQuestion'):(kind==='history'?'compareHistoryPrompt':'comparePredictionPrompt'))}</h2>
  <p>{ui(young?'compareYoung':low?'compareLow':older?'compareOlder':'compareHigh')}</p>
  {showText&&<label>{ui('discoveryLabel')}<textarea data-discovery value={discovery} disabled={disabled} onChange={e=>setDiscovery(e.target.value)}/></label>}
  {older&&<label>{ui('evidenceLabel')}<textarea data-evidence value={evidence} disabled={disabled} onChange={e=>setEvidence(e.target.value)}/><small>{ui('optionalEvidence')}</small></label>}
  {low&&showText&&<details><summary>{ui('sentenceHelp')}</summary><p>{ui('sentenceStarter')}</p></details>}
  <nav aria-label={ui('mode')}>
   <button disabled={disabled} aria-expanded={showVoice} onClick={()=>setShowVoice(!showVoice)}>{ui('voice')}</button>
   <button disabled={disabled} aria-expanded={showDrawing} onClick={()=>setShowDrawing(!showDrawing)}>{ui(early?'drawDiscovery':'drawSupplement')}</button>
   {low&&!showText&&<button disabled={disabled} onClick={()=>setShowText(true)}>{ui('text')}</button>}
  </nav>
  <div hidden={!showVoice}><VoiceRecorder value={audio} onChange={setAudio} onBusy={setRecording} helpKey="canvas.voiceHelp"/></div>
  <div hidden={!showDrawing}><DrawingInput onChange={setDrawing}/></div>
  {error&&<p role="alert">{error}</p>}
  <div className="actions"><button className="primary" disabled={disabled||!valid} onClick={()=>void save()}>{ui('save')}</button><button disabled={disabled} onClick={()=>void save(true)}>{ui('unknown')}</button></div>
 </section>;
}

export function ComparisonView({value,run,repository}:{value:ComparisonRecord;run:Run;repository:BrowserRepository}){
 validateComparison(run,value,value.comparisonKind);
 if(value.expressionMode==='deferred')return <p>{ui('deferred')}</p>;
 return <div className="comparison-value">
  {value.discoveryText&&<><h3>{ui('discoveryLabel')}</h3><p className="user-expression" data-discovery-value>{value.discoveryText}</p></>}
  {value.evidenceText&&<><h3>{ui('evidenceLabel')}</h3><p className="user-expression" data-evidence-value>{value.evidenceText}</p></>}
  {value.voiceRef&&<ExpressionView expression={{method:'audio',text:'',audioRef:value.voiceRef}} run={run} repository={repository}/>}
  {value.drawingRef&&<ExpressionView expression={{method:'drawing',text:'',canvasRef:value.drawingRef}} run={run} repository={repository}/>}
 </div>;
}
