import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isPublicDemoPath,isReviewDemoPath,localWorkspaceMode,DEMO_SESSION_PREFIX,REVIEW_SESSION_PREFIX} from './public-demo';
test('public path is explicit and preserves other product routes',()=>{
 assert(isPublicDemoPath('/demo'));assert(isPublicDemoPath('/demo/write'));
 assert(isPublicDemoPath('/career/demo/export','/career/'));
 assert(!isPublicDemoPath('/demography'));assert(!isPublicDemoPath('/experiences'));
});
test('review routes and storage namespace do not replace the older demo or the workspace',()=>{
 assert(isReviewDemoPath('/demo/review')); assert(isReviewDemoPath('/career/demo/review/storyboard','/career/'));
 for (const path of ['/demo','/demo/write','/demo/reviews','/storyboard','/write']) assert(!isReviewDemoPath(path));
 assert.notEqual(REVIEW_SESSION_PREFIX,DEMO_SESSION_PREFIX);
});
test('synthetic client demo cannot become an account workspace; normal auth remains unchanged',()=>{
 assert.equal(localWorkspaceMode(true,true,'guest'),'demo');
 assert.equal(localWorkspaceMode(true,false,'guest'),'demo');
 assert.equal(localWorkspaceMode(false,true,'demo'),'account');
 assert.equal(localWorkspaceMode(false,false,'guest'),'guest');
});
