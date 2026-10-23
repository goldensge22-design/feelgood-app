import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const appRequire=createRequire(new URL('../../artifacts/nuvia-ui-review/package.json',import.meta.url));
const {build}=createRequire(appRequire.resolve('vite'))('esbuild');
fs.mkdirSync('generated-artifacts/studio-career-review',{recursive:true});
await build({entryPoints:['tools/nuvia-studio/career-review-check.ts'],bundle:true,platform:'node',format:'esm',outfile:'generated-artifacts/studio-career-review/check.mjs'});
const result=spawnSync(process.execPath,['generated-artifacts/studio-career-review/check.mjs'],{stdio:'inherit'});
process.exitCode=result.status??1;
