import test from 'node:test';
import assert from 'node:assert/strict';
import {SaveCareerWorkspaceBody} from '@workspace/api-zod';
import {validateCareerState} from './career-validation';
import {emptyCareerState} from './career-data';

const studio={schema:'nuvia-personal-monthly-1',mode:'personal',studentId:'student-a',workspaceId:'synthetic-account-qa',
  lab:{students:{'student-a':{assessment:null}}},assessmentHistory:[]};
test('existing account payloads and unlinked personal planner round-trip through the workspace contract',()=>{
  const old=SaveCareerWorkspaceBody.parse({revision:1,state:emptyCareerState()});
  assert.equal(old.state.integrated,undefined);
  validateCareerState(old.state);
  const raw=JSON.stringify(studio);
  const next=SaveCareerWorkspaceBody.parse({revision:2,state:{...old.state,integrated:{audience:'youth',planner:raw}}});
  validateCareerState(next.state);
  assert.equal(next.state.integrated?.planner,raw);
});
test('review data and unverified external assessment stay rejected',()=>{
  for(const planner of [{...studio,mode:'review'},{...studio,assessmentHistory:[{}]},
    {...studio,lab:{students:{'student-a':{assessment:{fictional:true}}}}}]){
    assert.throws(()=>validateCareerState({...emptyCareerState(),integrated:{planner:JSON.stringify(planner)}}),/INVALID_ACCOUNT_PLANNER/);
  }
  assert.throws(()=>validateCareerState({...emptyCareerState(),report:{isExample:true}}),/REPORT_CONNECTOR_REQUIRED/);
});
