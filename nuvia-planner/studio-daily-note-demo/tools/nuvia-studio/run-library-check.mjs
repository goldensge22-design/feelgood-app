import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const require=createRequire(new URL('../../artifacts/nuvia-ui-review/package.json',import.meta.url));
const {build}=createRequire(require.resolve('vite'))('esbuild');
fs.mkdirSync('generated-artifacts/library-qa',{recursive:true});
await build({entryPoints:['tools/nuvia-studio/library-check.ts'],bundle:true,platform:'node',format:'esm',outfile:'generated-artifacts/library-qa/check.mjs'});
process.exitCode=spawnSync(process.execPath,['generated-artifacts/library-qa/check.mjs'],{stdio:'inherit'}).status??1;
