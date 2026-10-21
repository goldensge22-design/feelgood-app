import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {transformStudio} from '../../artifacts/nuvia-ui-review/src/studio/i18n/compiler.mjs';
// See RUN_AND_APPLY: uses the esbuild already required by Vite, no new dependency.
fs.mkdirSync('generated-artifacts/nuvia-final',{recursive:true});
const appRequire=createRequire(new URL('../../artifacts/nuvia-ui-review/package.json',import.meta.url));
const {build}=createRequire(appRequire.resolve('vite'))('esbuild');
await build({entryPoints:['tools/nuvia-studio/check.ts'],bundle:true,platform:'node',format:'esm',outfile:'generated-artifacts/nuvia-final/core.mjs',plugins:process.argv.includes('--i18n')?[{name:'studio-i18n-core',setup(b){b.onLoad({filter:/[\\/]src[\\/]studio[\\/].*\.tsx?$/},args=>{const path=args.path.replace(/\\/g,'/');return path.includes('/i18n/')||path.endsWith('/task-copy.ts')?undefined:{contents:transformStudio(fs.readFileSync(args.path,'utf8'),path),loader:path.endsWith('.tsx')?'tsx':'ts'};});}}]:[]});
const r=spawnSync(process.execPath,['generated-artifacts/nuvia-final/core.mjs'],{stdio:'inherit'});
process.exitCode=r.status??1;
