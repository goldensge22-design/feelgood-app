import {cp,rm,mkdir} from 'node:fs/promises';
import {validateSceneAssets} from './validate-scenes.mjs';
await validateSceneAssets();
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const p of ['index.html','styles.css','styles-extra.css','planning-writing.css','src','art','fonts'])await cp(p,`dist/${p}`,{recursive:true});
await import('./export-review.mjs');
console.log('Built dist/');
