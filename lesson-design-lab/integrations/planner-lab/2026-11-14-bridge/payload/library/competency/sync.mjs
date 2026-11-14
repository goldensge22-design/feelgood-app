import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const catalog=JSON.parse(await fs.readFile(path.join(root,'catalog.json'),'utf8'));
await fs.mkdir(path.join(root,'runtime'),{recursive:true});
await fs.writeFile(path.join(root,'runtime/catalog.mjs'),'export default '+JSON.stringify(catalog)+';\n');
// Explicit destinations only. Run verification first; no network or automatic deployment.
for(const dest of process.argv.slice(2)){
 const target=path.resolve(dest);await fs.mkdir(target,{recursive:true});
 // Private timed cases are deliberately not copied to generic runtime destinations.
 // Package runtime/timed-decision*.mjs only into an explicitly server-only application path.
 for(const file of ['catalog.mjs','practice.mjs','cases.mjs','major-resolver.mjs'])await fs.copyFile(path.join(root,'runtime',file),path.join(target,file));
}
console.log(JSON.stringify({version:catalog.version,profiles:catalog.profiles.length,destinations:process.argv.length-2}));
