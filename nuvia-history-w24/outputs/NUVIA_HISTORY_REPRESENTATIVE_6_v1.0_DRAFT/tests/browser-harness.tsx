// Test-only entry. Excluded from the library's production bundle.
import React from 'react';import {createRoot} from 'react-dom/client';
import {loadContent,translator} from '../src/core/content';import {ActivityRenderer} from '../src/ui/ActivityRenderer';import labels from '../src/content/locales/ui.ko.json';import '../src/ui/activity.css';
import {BrowserRepository} from '../src/core/storage';import {newRun,transition} from '../src/core/engine';import {profile,actionInput,deterministic} from './helpers';import {presentation} from '../src/core/profile';
const b=await loadContent(),all=b.missions.flatMap(m=>m.conditions),index=Number(new URL(location.href).searchParams.get('index')??0),c=all[index];const root=createRoot(document.getElementById('root')!);
const results:unknown[]=[];
(window as any).harness={bundle:b,condition:c,results,presentation,async storageCheck(){const db=new BrowserRepository(),d=deterministic(),p={...profile,learnerId:'browser-test-'+crypto.randomUUID()},m=b.missions[0];let r=newRun(b,m.id,p);await db.create(r);const original=r;const next=transition(r,{type:'historyViewed',conditionId:m.conditions[0].id});await db.save(next,0);let conflict=false,owner=false;try{await db.save(next,0);}catch{conflict=true;}try{await db.load(r.resultId,'other');}catch{owner=true;}const loaded=await db.load(r.resultId,p.learnerId);localStorage.setItem('gate2-test-result',JSON.stringify({id:r.resultId,owner:p.learnerId}));return {conflict,owner,revision:loaded?.revision,id:r.resultId};},async restoreCheck(){const ref=JSON.parse(localStorage.getItem('gate2-test-result')!);return new BrowserRepository().load(ref.id,ref.owner);}};
(window as any).harness.audioOwnershipCheck=async()=>{
 const db=new BrowserRepository(),m=b.missions[0],p={...profile,learnerId:'audio-test-'+crypto.randomUUID()};let first=newRun(b,m.id,p),second=newRun(b,m.id,p);await db.create(first);await db.create(second);
 const ref=await db.saveAudio(first.resultId,p.learnerId,new Blob(['local-test-bytes'],{type:'audio/webm'}));const blob=await db.loadAudio(ref,first.resultId,p.learnerId);let crossResult=false;try{await db.loadAudio(ref,second.resultId,p.learnerId);}catch{crossResult=true;}
 for(const con of m.conditions){const next=transition(second,{type:'historyViewed',conditionId:con.id});await db.save(next,second.revision);second=next;}
 for(const cmd of [{type:'continueHistory'} as const,{type:'selectCondition',conditionId:m.conditions[0].id} as const]){const next=transition(second,cmd);await db.save(next,second.revision);second=next;}
 const forged=transition(second,{type:'prediction',expression:{method:'audio',text:'',audioRef:ref}});let crossRecord=false;try{await db.save(forged,second.revision);}catch{crossRecord=true;}
 return {bytes:blob.size,crossResult,crossRecord};
};
root.render(<ActivityRenderer definition={c.activity} t={translator(b.strings)} labels={labels} pageSize={2} highlight onCommit={v=>{results.push(v);root.render(<p role="status">선택이 기록되었습니다.</p>);}} onDefer={()=>{results.push({deferred:true});root.render(<p role="status">생각을 남겨두었습니다.</p>);}} onRetry={()=>results.push({retried:true})}/>);
