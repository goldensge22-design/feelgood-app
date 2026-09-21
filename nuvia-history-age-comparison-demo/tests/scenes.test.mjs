import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENE_POLICY_ID,rolePolicies,scenes,resolveScene} from '../src/sceneRegistry.mjs';

test('HISTORY demo uses the scoped scene policy',()=>{assert.equal(SCENE_POLICY_ID,'nuvia.history.scene-render-policy.demo.v1')});
test('storybook meanings remain distinct while sharing one rendering policy',()=>{assert.equal(rolePolicies['storybook-history'],'book-4x3-contain');assert.equal(rolePolicies['storybook-condition'],'book-4x3-contain');assert.equal(rolePolicies['storybook-result'],'book-4x3-contain')});
test('declared scene roles are eligible or explicitly pending',()=>{for(const [sceneId,scene] of Object.entries(scenes))for(const role of scene.roles){const result=resolveScene(sceneId,role);assert.ok(result.status==='eligible'||result.reasons.includes('SCENE_APPROVED_ASSET_UNAVAILABLE'))}});
test('fact modes keep their required provenance boundaries',()=>{const history=scenes['gutenberg.history.workshop'],altered=scenes['gutenberg.c2.altered-access'],imagined=scenes['gutenberg.c2.planning.tell'];assert.ok(history.sourceRefs.length);assert.equal(history.alteredConditionId,undefined);assert.ok(altered.baselineSceneId&&altered.alteredConditionId&&altered.modeLabelKey);assert.equal(imagined.sourceRefs,undefined);assert.ok(imagined.modeLabelKey)});
test('consequence scenes are derived from structured action ids',()=>{assert.deepEqual(scenes['gutenberg.c2.planning.tell'].derivedFromActionIds,['method:tell']);assert.equal(resolveScene('gutenberg.c2.planning.time','storybook-result').status,'blocked')});
test('undeclared role is blocked',()=>{assert.equal(resolveScene('gutenberg.history.workshop','condition-stage').status,'blocked')});
