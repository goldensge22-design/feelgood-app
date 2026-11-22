import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmLabMaterial,revokeLabMaterial,currentLabMaterial,latestLabMaterial,attachPlannerReceipt,type LabMaterial} from './account-lab-handoff';
import {emptyState,mergeAsDraft} from './career';

const plan:LabMaterial={audience:'adult',sourceId:'scenario:demo',sourceVersion:'1',title:'학교 행사 모의 정리',keyword:'자료 비교',excerpt:'두 안내문을 읽어 보세요.',purpose:'simulation'};
test('an approved selection is idempotent; a renewed approval keeps the withdrawal history',()=>{
  const saved=confirmLabMaterial(emptyState(),plan);
  assert.equal(confirmLabMaterial(saved,plan),saved);
  const source=latestLabMaterial(saved,'adult')!;
  assert.equal(source.purpose,'simulation');
  assert.equal(latestLabMaterial(saved,'youth'),undefined);
  const withdrawn=revokeLabMaterial(saved,source.id);
  assert.equal(latestLabMaterial(withdrawn,'adult'),undefined);
  const restored=confirmLabMaterial(withdrawn,plan);
  assert.notEqual(latestLabMaterial(restored,'adult')?.id,source.id);
  assert.equal(restored.integrated?.labHandoffs?.length,2);
  assert.ok(restored.integrated?.labHandoffs?.[0].revokedAt);
});
test('the native planner create request is the receipt; the source and independent old state stay intact',()=>{
  const saved=confirmLabMaterial(emptyState(),plan);
  const source=latestLabMaterial(saved,'adult')!;
  const raw=JSON.stringify({studio:{creations:{[source.id]:'card-1'},dailyNotes:{today:'원문'}}});
  const next=attachPlannerReceipt(saved,raw);
  assert.equal(next.integrated?.planner,raw);
  assert.equal(latestLabMaterial(next,'adult')?.plannerCardId,'card-1');
  assert.equal(latestLabMaterial(saved,'adult')?.plannerCardId,undefined);
  assert.equal(latestLabMaterial(next,'adult')?.purpose,'simulation');
});
test('an older youth practice approval does not become active after the original was edited',()=>{
  const first={...emptyState(),integrated:{youthLab:JSON.stringify({activities:[{id:'a',updatedAt:'first'}]})}};
  const approved=confirmLabMaterial(first,{...plan,audience:'youth',sourceId:'activity:a',sourceVersion:'original/first'});
  const source=latestLabMaterial(approved,'youth')!;
  const edited={...approved,integrated:{...approved.integrated,youthLab:JSON.stringify({activities:[{id:'a',updatedAt:'edit'}]})}};
  assert.equal(currentLabMaterial(edited,source),false);
  assert.equal(edited.integrated?.labHandoffs?.length,1);
});
test('a stale tab cannot erase a withdrawal, and its distinct native LAB draft survives conflict',()=>{
  const saved=confirmLabMaterial(emptyState(),plan);
  const source=latestLabMaterial(saved,'adult')!;
  const server=revokeLabMaterial({...saved,integrated:{...saved.integrated,youthLab:'server-lab'}},source.id);
  const local={...saved,integrated:{...saved.integrated,youthLab:'local-lab'}};
  const {state}=mergeAsDraft(server,local);
  assert.equal(state.integrated?.youthLab,'server-lab');
  assert.equal(state.integrated?.youthLabRecovery,'local-lab');
  assert.equal(latestLabMaterial(state,'adult'),undefined);
});
