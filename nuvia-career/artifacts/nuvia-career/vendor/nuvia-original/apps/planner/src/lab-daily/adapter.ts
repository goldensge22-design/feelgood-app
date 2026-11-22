import type {ExternalDirection} from './contract';
export class HandoffError extends Error{}
/** Receiving adapter, kept apart from the policy and the external contract. The server implementation verifies the sender against the authenticated user; client-sent user ids are never read. */
export interface HandoffReceiver{kind:'virtual'|'server';receive():Promise<unknown>}
/** Synthetic data using the reported sender layout; NOT a live sender or auth proof. */
export const virtualYouthContract=(change:'add'|'switch',seq:number,at:string,dir:'a'|'b'|'c'):ExternalDirection=>{
 const names={a:'@sample:dirA',b:'@sample:dirB',c:'@sample:dirC'};
 return {schemaVersion:'daily-exploration-direction/1',sourceLab:'youth-career',requestId:`virtual-${change}-${seq}`,
  direction:{id:'virtual-dir-'+dir,revision:1,action:change,educationStage:'unspecified',focus:{id:'virtual-focus-'+dir,text:names[dir],kind:'student-confirmed-direction'},
  strengths:[{id:'s1',text:'@sample:s1'},{id:'s2',text:'@sample:s2'}],interests:[{id:'i1',text:'@sample:i1'},{id:'i2',text:'@sample:i2'}],
  sourceRefs:[{kind:'youth-career-result',id:'virtual-result',revision:'1'}],locale:'ko',confirmedAt:at,
  consent:{purpose:'planner-daily-suggestions',confirmedAt:at}}};
};
export const serverReceiver:HandoffReceiver={kind:'server',receive:async()=>{throw new HandoffError('not connected');}};
