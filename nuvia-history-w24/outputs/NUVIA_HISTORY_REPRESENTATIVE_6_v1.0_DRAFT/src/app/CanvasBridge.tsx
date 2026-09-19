import React,{useMemo,useRef,useState} from 'react';
import {StoryCanvas} from '../canvas/StoryCanvas';
import type {CanvasRepository,CanvasStory,Condition} from '../canvas/canvasModel';
import {artifactStore} from './localArtifacts';
import {artifactLink,type Command} from '../core/engine';
import type {Run,CanvasArtifact} from '../core/types';
import {BrowserRepository} from '../core/storage';
import {audioBlob} from './ExpressionEditor';
import {gutenbergCanvasConfig} from '../canvas/canvasArt';
export function CanvasBridge({run,variant,prompt,onSave,onClose}:{run:Run;variant:Condition;prompt:string;onSave:(command:Command)=>Promise<void>;onClose:()=>void}){
 const latest=useRef(run);latest.current=run;const [error,setError]=useState('');
 const pending=useRef<{type:string;payload:Record<string,unknown>}[]>([]);
 const id=run.resultId+':canvas-draft';
 const repo=useMemo<CanvasRepository>(()=>({async load(key){const item=await artifactStore(key,latest.current);pending.current=item?.events??[];return item?.value as CanvasStory??null;},async save(value){await artifactStore({id:value.id,kind:'canvasDraft',link:artifactLink(latest.current),value,events:pending.current},latest.current);},async remove(){throw Error('REMOVAL_NOT_ALLOWED');}}),[id]);
 const age=run.profile.ageBand==='preschool'?'early':run.profile.ageBand==='elementary-low'?'primary12':'older';
 const config=useMemo(()=>({...gutenbergCanvasConfig,eventId:run.missionId}),[run.missionId]);
 async function saved(s:CanvasStory){try{const link=artifactLink(latest.current);const scenes=await Promise.all(s.scenes.map(async x=>({...link,id:x.id,backgroundId:x.background,stickers:x.stickers,strokes:x.strokes,text:x.text,preview:x.preview,...(x.audio?{audioRef:await new BrowserRepository().saveAudio(run.resultId,run.profile.learnerId,audioBlob(x.audio))}:{})})));const canvas:CanvasArtifact={...link,id:run.resultId+':canvas',completed:true,scenes};
 const events=pending.current.filter(e=>['canvasObjectAdded','canvasObjectMoved','drawingAdded','sceneCompleted'].includes(e.type)).map(e=>{const index=Number(e.payload.sceneIndex??0),scene=s.scenes[index],base={sceneId:scene.id};if(e.type==='canvasObjectAdded')return {type:e.type,payload:{...base,stickerId:e.payload.stickerId}};if(e.type==='canvasObjectMoved'){const obj=scene.stickers.find(x=>x.id===e.payload.stickerId);return {type:e.type,payload:{...base,stickerId:e.payload.stickerId,x:e.payload.x??obj?.x??0,y:e.payload.y??obj?.y??0}};}if(e.type==='drawingAdded')return {type:e.type,payload:{...base,lineCount:e.payload.lineCount,tool:e.payload.tool,width:e.payload.width}};return {type:e.type,payload:{...base,lineCount:scene.strokes.length,stickerCount:scene.stickers.length}};});
 await onSave({type:'canvas',canvas,events:events as Extract<Command,{type:'canvas'}>['events']});pending.current=[];onClose();}catch(e){setError(e instanceof Error?e.message:String(e));}}
 return <>{error&&<p role="alert">{error}</p>}<StoryCanvas id={id} resultId={run.resultId} condition={variant} age={age} prompt={prompt} config={config} repository={repo} onSaved={s=>void saved(s)} onClose={onClose} onPerformanceEvent={(type,payload={})=>{if(type==='hintRequested'){void onSave({type:'hint',hintType:'canvasHelp',level:1});return;}pending.current.push({type,payload});}}/></>;
}
