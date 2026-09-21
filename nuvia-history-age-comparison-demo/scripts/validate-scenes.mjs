import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assets,scenes,resolveScene} from '../src/sceneRegistry.mjs';

const SOURCE_REGISTRY=resolve('../nuvia-history-w24/outputs/NUVIA_HISTORY_REPRESENTATIVE_6_v1.0_DRAFT/src/content/assets.json');
const digest=value=>createHash('sha256').update(value).digest('hex');

export async function validateSceneAssets(){
 const source=JSON.parse(await readFile(SOURCE_REGISTRY,'utf8'));
 for(const [assetId,asset] of Object.entries(assets)){
  const original=source.find(item=>item.id===assetId);
  if(!original)throw Error(`SCENE_SOURCE_ASSET_NOT_REGISTERED:${assetId}`);
  if(original.path!==asset.path||original.kind!==asset.kind)throw Error(`SCENE_SOURCE_CONTRACT_MISMATCH:${assetId}`);
  const target=resolve(asset.path),bytes=await readFile(target),info=await stat(target);
  if(info.size!==original.bytes||digest(bytes)!==original.sha256)throw Error(`SCENE_ASSET_INTEGRITY_FAILED:${assetId}`);
 }
 for(const [sceneId,scene] of Object.entries(scenes)){
  if(scene.factMode==='history'&&(!scene.sourceRefs?.length||scene.alteredConditionId))throw Error(`HISTORY_SCENE_CONTRACT_INVALID:${sceneId}`);
  if(scene.factMode==='altered'&&(!scene.baselineSceneId||!scene.alteredConditionId||!scene.modeLabelKey))throw Error(`ALTERED_SCENE_CONTRACT_INVALID:${sceneId}`);
  if(scene.factMode==='user_imagined'&&(!scene.modeLabelKey||scene.sourceRefs?.length))throw Error(`IMAGINED_SCENE_CONTRACT_INVALID:${sceneId}`);
  for(const role of scene.roles){const result=resolveScene(sceneId,role);if(result.status!=='eligible')throw Error(`SCENE_NOT_ELIGIBLE:${sceneId}:${role}:${result.reasons.join(',')}`)}
 }
 return true;
}

if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){await validateSceneAssets();console.log('Scene assets validated against W24 registry.');}
