import React,{useEffect,useRef,useState} from 'react';
import {t} from './i18n';
import {AudioPlayback} from './AudioPlayback';
import {microphoneError,requestMicrophone} from './voiceSupport';
export function VoiceRecorder({value,onChange,onBusy,helpKey='ui.audioHelp',allowImport=true}:{value:string;onChange:(audio:string)=>void;onBusy:(busy:boolean)=>void;helpKey?:string;allowImport?:boolean}){
 const [phase,setPhase]=useState<'idle'|'waiting'|'recording'|'encoding'>('idle'),[error,setError]=useState(''),[seconds,setSeconds]=useState(0);
 const run=useRef(0),mounted=useRef(true),rec=useRef<MediaRecorder|null>(null),media=useRef<MediaStream|null>(null),tick=useRef<ReturnType<typeof setInterval>|null>(null);
 const callbacks=useRef({onChange,onBusy});callbacks.current={onChange,onBusy};
 function cleanup(){if(tick.current)clearInterval(tick.current);tick.current=null;media.current?.getTracks().forEach(x=>x.stop());media.current=null;}
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;run.current++;if(rec.current?.state==='recording')rec.current.stop();cleanup();callbacks.current.onBusy(false);};},[]);
 function idle(){if(mounted.current){setPhase('idle');callbacks.current.onBusy(false);}}
 function cancel(){run.current++;if(rec.current?.state==='recording')rec.current.stop();cleanup();idle();}
 function encode(blob:Blob,id:number){if(!blob.size||blob.size>750000){setError(blob.size?'voice.large':'voice.empty');idle();return;}setPhase('encoding');const reader=new FileReader();reader.onerror=()=>{if(id===run.current&&mounted.current){setError('voice.failed');idle();}};reader.onload=()=>{if(id===run.current&&mounted.current){callbacks.current.onChange(String(reader.result));idle();}};reader.readAsDataURL(blob);}
 async function start(){const id=++run.current;setError('');setSeconds(0);setPhase('waiting');callbacks.current.onBusy(true);
  try{if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error('unsupported');
   const stream=await requestMicrophone(()=>navigator.mediaDevices.getUserMedia({audio:true}));
   if(!mounted.current||id!==run.current){stream.getTracks().forEach(x=>x.stop());return;}media.current=stream;
   const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(x=>MediaRecorder.isTypeSupported(x));
   const recorder=new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),audioBitsPerSecond:24000});rec.current=recorder;const chunks:BlobPart[]=[];let failed=false;
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onerror=()=>{failed=true;cleanup();if(id===run.current){setError('voice.failed');idle();}};
   recorder.onstop=()=>{cleanup();if(mounted.current&&id===run.current&&!failed)encode(new Blob(chunks,{type:recorder.mimeType}),id);};
   recorder.start(250);setPhase('recording');const started=Date.now();tick.current=setInterval(()=>{const elapsed=Math.floor((Date.now()-started)/1000);setSeconds(elapsed);if(elapsed>=60&&recorder.state==='recording')recorder.stop();},250);
  }catch(e){if(mounted.current&&id===run.current){cleanup();setError(e instanceof Error&&e.message==='unsupported'?'voice.unsupported':microphoneError(e));idle();}}
 }
 function importAudio(file?:File){if(!file)return;setError('');if(!file.type.startsWith('audio/')){setError('voice.fileType');return;}callbacks.current.onBusy(true);encode(file,++run.current);}
 return <div className="voice"><p>{t(helpKey)}</p>{phase==='idle'?<button type="button" onClick={()=>void start()}>{t('ui.record')}</button>:phase==='recording'?<button type="button" onClick={()=>{setPhase('encoding');rec.current?.stop();}}>{t('ui.stop')}</button>:null}
 {phase==='waiting'&&<><p role="status">{t('voice.waiting')}</p><button type="button" onClick={cancel}>{t('voice.cancel')}</button></>}
 {phase==='recording'&&<p role="status">{t('ui.recording')} · {seconds}s</p>}{phase==='encoding'&&<p role="status">{t('voice.encoding')}</p>}
 {error&&<div role="alert"><p>{t(error)}</p><p>{t('voice.browserHelp')}</p></div>}
 {allowImport&&<><label>{t('voice.import')}<input type="file" accept="audio/*" disabled={phase!=='idle'} onChange={e=>{importAudio(e.target.files?.[0]);e.target.value='';}}/></label><small>{t('voice.importHelp')}</small></>}
 {value&&<><p>{t('ui.audioReady')}</p><AudioPlayback src={value}/></>}</div>;
}
