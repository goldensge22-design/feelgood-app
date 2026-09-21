import {cp,mkdir} from 'node:fs/promises';
import {validateSceneAssets} from './validate-scenes.mjs';
await validateSceneAssets();
await mkdir('dist-reconsider',{recursive:true});
for(const p of ['reconsider.html','styles.css','styles-extra.css','planning-writing.css','reconsider.css','src','art','fonts'])await cp(p,`dist-reconsider/${p}`,{recursive:true});
await cp('reconsider.html','dist-reconsider/index.html');
await import('./export-reconsider.mjs');
console.log('Built isolated dist-reconsider/; existing dist/ untouched');
