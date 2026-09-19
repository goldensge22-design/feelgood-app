import type {ArtifactLink,Run} from '../core/types';
import {artifactLink,assertLink} from '../core/engine';
import type {CanvasStory} from '../canvas/canvasModel';
type LocalArtifact={id:string;link:ArtifactLink;kind:'canvasDraft'|'drawing';value:CanvasStory|string;events?:{type:string;payload:Record<string,unknown>}[]};
const DB='nuviaRepresentative6.artifacts.v1';
export async function artifactStore(itemOrId:LocalArtifact|string,run:Run):Promise<LocalArtifact|null>{
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>q.result.createObjectStore('artifacts',{keyPath:'id'});q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('artifacts',typeof itemOrId==='string'?'readonly':'readwrite'),store=tx.objectStore('artifacts');const id=typeof itemOrId==='string'?itemOrId:itemOrId.id;const q=store.get(id);let result:LocalArtifact|null=null;let error:unknown;q.onsuccess=()=>{try{const existing=q.result as LocalArtifact|undefined;if(existing)assertLink(run,existing.link);if(typeof itemOrId!=='string'){if(existing?.kind==='drawing')throw Error('DRAWING_IMMUTABLE');assertLink(run,itemOrId.link);store.put({...structuredClone(itemOrId),appVersion:run.appVersion,ageBandRuleId:run.ageBandRuleId,createdAt:new Date().toISOString()});result=itemOrId;}else result=existing??null;}catch(e){error=e;tx.abort();}};tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(error??tx.error);tx.onerror=()=>reject(error??tx.error);});}finally{db.close();}
}
export async function saveDrawing(run:Run,png:string){if(!png.startsWith('data:image/png;base64,'))throw Error('LOCAL_DRAWING_REQUIRED');const id='drawing:'+crypto.randomUUID();await artifactStore({id,link:artifactLink(run),kind:'drawing',value:png},run);return id;}
