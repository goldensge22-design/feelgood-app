import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isPublicDemoPath,localWorkspaceMode} from './public-demo';
test('public path is explicit and preserves other product routes',()=>{
 assert(isPublicDemoPath('/demo'));assert(isPublicDemoPath('/demo/write'));
 assert(isPublicDemoPath('/career/demo/export','/career/'));
 assert(!isPublicDemoPath('/demography'));assert(!isPublicDemoPath('/experiences'));
});
test('synthetic client demo cannot become an account workspace; normal auth remains unchanged',()=>{
 assert.equal(localWorkspaceMode(true,true,'guest'),'demo');
 assert.equal(localWorkspaceMode(true,false,'guest'),'demo');
 assert.equal(localWorkspaceMode(false,true,'demo'),'account');
 assert.equal(localWorkspaceMode(false,false,'guest'),'guest');
});
