import {createRequire} from 'node:module';
import path from 'node:path';
import fs from 'node:fs/promises';
const root=path.resolve(import.meta.dirname,'../../..');
// Reuse existing installed workspace packages; no download or product source edits.
const dependencies=path.resolve(process.env.BRIDGE_QA_DEPENDENCIES??path.join(root,'student-lab'));
const require=createRequire(path.join(dependencies,'package.json'));
const ts=require('typescript'),esbuild=require('esbuild');
const source=path.resolve(import.meta.dirname,'../payload/artifacts/nuvia-ui-review/src/planner-lab/PlannerLabRecommendations.tsx');
const options={strict:true,noEmit:true,skipLibCheck:true,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,allowSyntheticDefaultImports:true,types:[],baseUrl:root,
 paths:{react:[path.join(dependencies,'node_modules/@types/react/index.d.ts')],'react/jsx-runtime':[path.join(dependencies,'node_modules/@types/react/jsx-runtime.d.ts')]}};
const diagnostics=ts.getPreEmitDiagnostics(ts.createProgram([source],options));
if(diagnostics.length){console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:f=>f,getNewLine:()=> '\n'}));process.exitCode=1;}
else{
 await fs.mkdir(path.resolve(import.meta.dirname,'preview'),{recursive:true});
 await esbuild.build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import Panel from ${JSON.stringify(source.replaceAll('\\','/'))};createRoot(document.getElementById('root')).render(<Panel sessionKey="synthetic-browser-qa"/>);`,resolveDir:root,loader:'tsx'},
  bundle:true,outfile:path.resolve(import.meta.dirname,'preview/app.js'),format:'esm',jsx:'automatic',plugins:[{name:'existing-react',setup(build){build.onResolve({filter:/^react(?:-dom)?(?:\/.*)?$/},args=>({path:require.resolve(args.path)}));}}]});
 console.log(JSON.stringify({typecheck:'passed',bundle:'passed',scope:'new component only; existing full app not rebuilt',node:process.version}));
}
