import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {transformStudio} from '../../artifacts/nuvia-ui-review/src/studio/i18n/compiler.mjs';
const appRequire=createRequire(new URL('../../artifacts/nuvia-ui-review/package.json',import.meta.url));
const {build}=createRequire(appRequire.resolve('vite'))('esbuild');
fs.mkdirSync('generated-artifacts/studio-i18n',{recursive:true});
await build({entryPoints:['tools/nuvia-studio/i18n-check.ts'],bundle:true,platform:'node',format:'esm',outfile:'generated-artifacts/studio-i18n/check.mjs',plugins:[{name:'studio-source-macro',setup(b){b.onLoad({filter:/\/src\/studio\/.*\.tsx?$/},a=>a.path.includes('/i18n/')||a.path.endsWith('/task-copy.ts')?undefined:{contents:transformStudio(fs.readFileSync(a.path,'utf8'),a.path),loader:a.path.endsWith('.tsx')?'tsx':'ts'});}}]});
const r=spawnSync(process.execPath,['generated-artifacts/studio-i18n/check.mjs'],{stdio:'inherit'});process.exitCode=r.status??1;
