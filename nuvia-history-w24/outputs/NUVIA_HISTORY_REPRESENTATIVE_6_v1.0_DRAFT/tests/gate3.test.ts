import test from 'node:test';
import assert from 'node:assert/strict';
import {loadContent} from '../src/core/content';
import {AGE_BANDS,type Profile} from '../src/core/types';
import {presentation} from '../src/core/profile';
import {newRun,transition,assertRun} from '../src/core/engine';
import {bookModel,reportModel} from '../src/core/artifacts';
import {actionInput,deterministic} from './helpers';
const b=await loadContent();const mission=b.missions.find(m=>m.week===24)!;
for(const c of mission.conditions)for(const ageBand of AGE_BANDS)for(const support of [1,2,3] as const)test(`${c.shortId} ${ageBand} support ${support}`,()=>{
 const d=deterministic(),profile:Profile={learnerId:'support-test',alias:'탐험가',ageBand,attentionSupport:support,source:'explicit-test'};let r=newRun(b,mission.id,profile,d);
 for(const x of mission.conditions)r=transition(r,{type:'historyViewed',conditionId:x.id},d);
 r=transition(r,{type:'continueHistory'},d);r=transition(r,{type:'selectCondition',conditionId:c.id},d);
 assert.deepEqual(r.contentSnapshot,mission);const supportView=presentation(c,profile);assert.equal(supportView.highlight,true);assert.equal(supportView.automaticSupport.length,support===1?1:support===2?2:4);assert.equal(supportView.readAloud.status,'notProvided');
 r=transition(r,{type:'prediction',expression:{method:'unknown',text:''}},d);const prediction=JSON.stringify(r.prediction);r=transition(r,{type:'reveal',possibility:'B'},d);r=transition(r,{type:'action',value:actionInput(c.activity)},d);r=transition(r,{type:'story',expression:{method:'text',text:'내 말 그대로'}},d);r=transition(r,{type:'comparison',kind:'history',expression:{method:'text',text:'내가 눈여겨본 점'}},d);r=transition(r,{type:'comparison',kind:'prediction',expression:{method:'unknown',text:''}},d);
 assertRun(r);assert.equal(JSON.stringify(r.prediction),prediction);assert.equal(bookModel(r).pages.length,8);assert.equal(reportModel(r).resultId,r.resultId);assert.equal(reportModel(r).details.hintCount,0);assert.equal(reportModel(r).details.automaticSupports.length,supportView.automaticSupport.length);assert.throws(()=>transition(r,{type:'prediction',expression:{method:'text',text:'고친 예측'}},d));
});
