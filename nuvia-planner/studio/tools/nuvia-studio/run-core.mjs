import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
// See RUN_AND_APPLY: uses the esbuild already required by Vite, no new dependency.
fs.mkdirSync('generated-artifacts/nuvia-final',{recursive:true});
const appRequire=createRequire(new URL('../../artifacts/nuvia-ui-review/package.json',import.meta.url));
const {build}=createRequire(appRequire.resolve('vite'))('esbuild');
await build({entryPoints:['tools/nuvia-studio/check.ts'],bundle:true,platform:'node',format:'esm',outfile:'generated-artifacts/nuvia-final/core.mjs'});
const r=spawnSync(process.execPath,['generated-artifacts/nuvia-final/core.mjs'],{stdio:'inherit'});
if (r.status !== 0) process.exit(r.status ?? 1);
await build({entryPoints:['tools/nuvia-studio/task-add-check.ts'],bundle:true,platform:'node',format:'esm',outfile:'generated-artifacts/nuvia-final/task-add.mjs'});
const taskResult=spawnSync(process.execPath,['generated-artifacts/nuvia-final/task-add.mjs'],{stdio:'inherit'});
process.exitCode=taskResult.status??1;
