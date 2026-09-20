import test from 'node:test';
import assert from 'node:assert/strict';
import {readEntryQuery} from '../src/core/entryQuery';

test('explicit Gutenberg QA entry resolves the supported mission and fresh flag',()=>{
 assert.deepEqual(readEntryQuery('?qa=1&age=preschool&mission=gutenberg&new=1','gutenberg'),{missionId:'gutenberg',fresh:true});
});
test('legacy links retain default mission and resume behavior',()=>{
 assert.deepEqual(readEntryQuery('?qa=1&age=preschool','gutenberg'),{missionId:'gutenberg',fresh:false});
 assert.equal(readEntryQuery('?new=0','gutenberg').fresh,false);
});
test('unsupported or empty mission is rejected instead of silently running Gutenberg',()=>{
 for(const mission of ['w01','unknown',''])assert.throws(()=>readEntryQuery('?mission='+mission,'gutenberg'),/MISSION_NOT_SUPPORTED/);
});
