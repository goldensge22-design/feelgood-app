import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const req=createRequire(new URL('../../artifacts/nuvia-ui-review/package.json',import.meta.url));
const {build}=createRequire(req.resolve('vite'))('esbuild');
fs.mkdirSync('generated-artifacts/studio-external-demo',{recursive:true});
const outfile='generated-artifacts/studio-external-demo/check.mjs';
await build({entryPoints:['tools/nuvia-studio/external-demo-check.ts'],bundle:true,platform:'node',format:'esm',outfile});
const result=spawnSync(process.execPath,[outfile],{stdio:'inherit'});process.exitCode=result.status??1;
